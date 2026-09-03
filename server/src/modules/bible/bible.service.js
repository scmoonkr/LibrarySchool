import {
  findBiblehubChapter,
  findPostsByBiblehubSlugs, findBibleChaptersByBookNo, findBibleRows, findRecentVerseTopicAction, findVerseTopicsByCategory, incrementVerseTopicScore, saveVerseTopicAction } from './bible.repository.js';
import { calcWeight, sortByWeight, weightedPick } from './verse-topics.util.js';
import { normalizeVerseId } from '../../utils/bible-book-meta.js';
import { createAppError, parsePositiveInteger, requireTrimmedString } from '../../utils/validation.js';

const TOPIC_INITIAL_COUNT = 3;
const TOPIC_MORE_COUNT = 5;
const TOPIC_CANDIDATE_LIMIT = 120;
const TOPIC_ACTION_SCORES = {
  read: 1,
  view_reflection: 2,
  write_reflection: 3,
};
const TOPIC_DUPLICATE_WINDOW_MS = 10 * 60 * 1000;

export function convertToBibleChapter(rows = []) {
  if (!rows.length) {
    return null;
  }

  const chapterMeta = rows.find((row) => row.verseNo === 0);
  const chapter = {
    book: chapterMeta?.book || rows[0].book || '',
    bookNo: rows[0].bookNo,
    chapterNo: rows[0].chapterNo,
    title: chapterMeta?.title || chapterMeta?.subject || '',
    subject: chapterMeta?.subject || '',
    excerpt: chapterMeta?.excerpt || '',
    audio: chapterMeta?.audio || '',
    paragraphs: [],
  };

  let paragraphNo = 0;
  let currentParagraph = null;

  for (const row of rows) {
    if (row.verseNo === 0) {
      continue;
    }

    if (!currentParagraph || row.subject) {
      if (currentParagraph?.verses?.length) {
        chapter.paragraphs.push(currentParagraph);
      }

      paragraphNo += 1;
      currentParagraph = {
        paragraphNo,
        verseNo: row.verseNo,
        startVerse: row.verseNo,
        endVerse: row.verseNo,
        title: row.title || '',
        subject: row.subject || '',
        excerpt: row.excerpt || '',
        summary: row.summary || row.excerpt || '',
        verses: [],
      };
    }

    const normalizedVerses = (row.verses || []).map((verse) => ({
      category: verse.category || '',
      categoryOriginal: verse.category || '',
      verse: verse.verse || '',
      godSay: verse.godSay === true || verse.say === true,
      verseNo: row.verseNo,
    }));

    currentParagraph.verses.push(...normalizedVerses);
    currentParagraph.endVerse = row.verseNo;
  }

  if (currentParagraph?.verses?.length) {
    chapter.paragraphs.push(currentParagraph);
  }

  return chapter;
}

function normalizeTopicMode(value) {
  const mode = String(value || 'initial').trim().toLowerCase();
  if (mode === 'more' || mode === 'all') {
    return mode;
  }
  return 'initial';
}

function normalizeShownIds(value) {
  if (Array.isArray(value)) {
    return Array.from(new Set(value.map((item) => String(item).trim()).filter(Boolean)));
  }

  const source = String(value || '').trim();
  if (!source) {
    return [];
  }

  return Array.from(new Set(source.split(',').map((item) => item.trim()).filter(Boolean)));
}

async function attachTopicVerseContent(rows = [], category) {
  if (!rows.length) {
    return [];
  }

  const queryRows = await Promise.all(
    rows.map((row) => findBibleRows({
      bookNo: Number(row.bookNo),
      chapterNo: Number(row.chapterNo),
      verseNo: Number(row.verseNo),
    })),
  );

  const verseLookup = new Map();

  queryRows.flat().forEach((row) => {
    const key = `${row.bookNo}:${row.chapterNo}:${row.verseNo}`;
    const verseText = Array.isArray(row.verses) && row.verses.length
      ? row.verses.map((item) => item.verse || '').filter(Boolean).join(' ')
      : (row.verse || row.content || '');

    verseLookup.set(key, {
      book: row.book || '',
      text: verseText,
    });
  });

  return rows.map((row) => {
    const lookupKey = `${row.bookNo}:${row.chapterNo}:${row.verseNo}`;
    const matched = verseLookup.get(lookupKey) || { book: '', text: '' };

    return {
      verseId: normalizeVerseId({
        verseId: row.verseId,
        bookNo: row.bookNo,
        book: matched.book,
        chapterNo: row.chapterNo,
        verseNo: row.verseNo,
      }),
      bookNo: Number(row.bookNo),
      chapterNo: Number(row.chapterNo),
      verseNo: Number(row.verseNo),
      book: matched.book,
      text: matched.text,
      mainCategory: row.mainCategory || category,
      subCategories: Array.isArray(row.subCategories) ? row.subCategories : [],
      baseWeight: Number(row.baseWeight || 0),
      score: Number(row.score || 0),
      recentScore: Number(row.recentScore || 0),
      isAnchor: row.isAnchor === true,
      finalWeight: calcWeight(row, 'all'),
      readTarget: {
        bookNo: Number(row.bookNo),
        chapterNo: Number(row.chapterNo),
      },
    };
  });
}

async function getTopicCandidates(category, mode) {
  const limit = mode === 'all' ? undefined : TOPIC_CANDIDATE_LIMIT;
  const rows = await findVerseTopicsByCategory([category], {
    sort: { bookNo: 1, chapterNo: 1, verseNo: 1 },
    limit,
  });

  return attachTopicVerseContent(rows, category);
}

function buildInitialTopicVerses(candidates = []) {
  if (!candidates.length) {
    return [];
  }

  const rankedAnchors = sortByWeight(candidates.filter((item) => item.isAnchor), 'initial');
  const rankedCandidates = sortByWeight(candidates, 'initial');
  const first = rankedAnchors[0] || rankedCandidates[0];
  const pool = candidates.filter((item) => item.verseId !== first.verseId);
  const rest = weightedPick(pool, TOPIC_INITIAL_COUNT - 1, 'initial');

  return [first, ...rest];
}

function buildMoreTopicVerses(candidates = [], shownIds = []) {
  const shownIdSet = new Set(shownIds);
  const pool = candidates.filter((item) => !shownIdSet.has(item.verseId));
  return weightedPick(pool, TOPIC_MORE_COUNT, 'more');
}

function buildAllTopicVerses(candidates = []) {
  return sortByWeight(candidates, 'all');
}

export async function getBibleChapter(params = {}) {
  const bookNo = parsePositiveInteger(params.bookNo, 'bookNo');
  const chapterNo = parsePositiveInteger(params.chapterNo, 'chapterNo');
  const verseNo = parsePositiveInteger(params.verseNo, 'verseNo', { required: false });
  const content = String(params.content || '').trim();

  const rows = await findBibleRows({
    bookNo,
    chapterNo,
    verseNo,
    content,
  });

  return {
    rows,
    chapter: convertToBibleChapter(rows),
  };
}

export async function listBibleChapters(params = {}) {
  const bookNo = parsePositiveInteger(params.bookNo, 'bookNo');
  const rows = await findBibleChaptersByBookNo(bookNo);

  return rows.map((row) => ({
    bookNo: row.bookNo,
    chapterNo: row.chapterNo,
    subject: row.subject || '',
  }));
}

export async function listTopicVerses(params = {}) {
  const category = String(params.category || '').trim();

  if (!category) {
    throw new Error('category is required.');
  }

  const mode = normalizeTopicMode(params.mode);
  const shownIds = normalizeShownIds(params.shownIds);
  const candidates = await getTopicCandidates(category, mode);

  if (mode === 'all') {
    return buildAllTopicVerses(candidates);
  }

  if (mode === 'more') {
    return buildMoreTopicVerses(candidates, shownIds);
  }

  return buildInitialTopicVerses(candidates);
}

export async function recordTopicVerseAction(body = {}) {
  const actionType = requireTrimmedString(body.actionType, 'actionType');
  const scoreDelta = TOPIC_ACTION_SCORES[actionType];

  if (!scoreDelta) {
    throw createAppError('actionType is invalid.', 400);
  }

  const userNo = parsePositiveInteger(body.userNo, 'userNo');
  const rawVerseId = requireTrimmedString(body.verseId, 'verseId');
  const bookNo = parsePositiveInteger(body.bookNo, 'bookNo');
  const chapterNo = parsePositiveInteger(body.chapterNo, 'chapterNo');
  const verseNo = parsePositiveInteger(body.verseNo, 'verseNo');
  const verseId = normalizeVerseId({ verseId: rawVerseId, bookNo, chapterNo, verseNo });
  const mainCategory = requireTrimmedString(body.mainCategory, 'mainCategory');
  const now = new Date();
  const cutoffIso = new Date(now.getTime() - TOPIC_DUPLICATE_WINDOW_MS).toISOString();

  const recentAction = await findRecentVerseTopicAction({
    userNo,
    verseId,
    mainCategory,
    actionType,
    cutoffIso,
  });

  if (recentAction) {
    return { ok: true, skipped: true };
  }

  await incrementVerseTopicScore({
    verseId,
    bookNo,
    chapterNo,
    verseNo,
    mainCategory,
    scoreDelta,
  });

  await saveVerseTopicAction({
    userNo,
    verseId,
    actionType,
    bookNo,
    chapterNo,
    verseNo,
    mainCategory,
    createdAt: now.toISOString(),
  });

  return { ok: true, skipped: false };
}

// 한글이 하나라도 들어 있으면 한글 제목으로 본다.
const HANGUL = /[가-힣]/;

// biblehub 항목의 연결 키. key 가 있으면 그대로 쓰고,
// 없으면 link("/topical/a/adam.htm")에서 파일명만 뽑아 쓴다.
function toBiblehubSlug(item) {
  if (item?.key) return String(item.key);
  if (!item?.link) return '';

  const file = String(item.link).split('/').pop() || '';
  return file.replace(/\.htm$/i, '');
}

// 읽기 화면 사이드바에 쓰는 장별 인물·장소·사건.
//
// biblehub 항목 자체를 보여 주는 게 아니라, 그 항목의 slug 와
// contents.biblehubSlug 가 맞는 "공개된 글"을 찾아 글 제목으로 보여 준다.
// 한 항목에 글이 여럿이면 모두 나열하고, 맞는 글이 없으면 목록에서 빠진다.
export async function getBiblehubChapter(params = {}) {
  const bookNo = Number(params.bookNo);
  const chapterNo = Number(params.chapterNo);
  const empty = { bookNo: null, chapterNo: null, people: [], place: [], events: [] };

  if (!Number.isInteger(bookNo) || !Number.isInteger(chapterNo)) return empty;

  const doc = await findBiblehubChapter(bookNo, chapterNo);
  if (!doc) return { ...empty, bookNo, chapterNo };

  const groups = {
    people: doc.people ?? [],
    place: doc.place ?? [],
    events: doc.events ?? [],
  };

  // 세 그룹의 slug 를 한 번에 모아 글을 한 번만 조회한다.
  const slugs = [...new Set(
    Object.values(groups).flat().map(toBiblehubSlug).filter(Boolean),
  )];
  const posts = await findPostsByBiblehubSlugs(slugs);

  const bySlug = new Map();
  for (const post of posts) {
    const key = post.biblehubSlug;
    if (!bySlug.has(key)) bySlug.set(key, []);
    bySlug.get(key).push({ title: post.title, slug: post.slug });
  }

  // 맞는 글이 있으면 글 제목(+ slug), 없으면 biblehub 항목 제목만 내려준다.
  // slug 가 없는 항목은 화면에서 링크가 아니라 텍스트로 표시된다.
  // 서로 다른 항목이 같은 글을 가리킬 수 있어 그룹 안에서 중복을 제거한다.
  const resolve = (items) => {
    const seen = new Set();
    const out = [];

    for (const item of items) {
      const posts = bySlug.get(toBiblehubSlug(item)) ?? [];

      if (posts.length) {
        for (const post of posts) {
          if (seen.has(`post:${post.slug}`)) continue;
          seen.add(`post:${post.slug}`);
          out.push(post);
        }
        continue;
      }

      const title = item?.title?.trim();
      if (!title || seen.has(`title:${title}`)) continue;
      seen.add(`title:${title}`);
      out.push({ title });
    }

    // 한글 제목을 앞으로 뺀다. 연결된 글은 대개 한글이라 먼저 눈에 들어온다.
    // 같은 부류 안에서는 원래 순서를 지킨다 — 사건(events)은 이야기 순서라
    // 가나다순으로 다시 정렬하면 흐름이 깨진다.
    return [
      ...out.filter((x) => HANGUL.test(x.title)),
      ...out.filter((x) => !HANGUL.test(x.title)),
    ];
  };

  return {
    bookNo,
    chapterNo,
    people: resolve(groups.people),
    place: resolve(groups.place),
    events: resolve(groups.events),
  };
}
