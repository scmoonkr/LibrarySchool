import { findReflectionByRid, listReflections, upsertReflection } from './reflection.repository.js';
import { env } from '../../config/env.js';
import { getDatabase } from '../../config/db.js';
import {
  createAppError,
  normalizeSelectedVerseItems,
  parsePositiveInteger,
  requireTrimmedString,
} from '../../utils/validation.js';
import { formatChurchKorVerseId } from '../../utils/bible-book-meta.js';

function parseReflectionQuery(params = {}) {
  const query = {};

  const bookNo = parsePositiveInteger(params.bookNo, 'bookNo', {
    required: false,
  });
  const chapterNo = parsePositiveInteger(params.chapterNo, 'chapterNo', {
    required: false,
  });

  const paragraphNo = parsePositiveInteger(params.paragraphNo, 'paragraphNo', {
    required: false,
  });
  const userNo = parsePositiveInteger(params.userNo, 'userNo', {
    required: false,
  });
  const verseNo = parsePositiveInteger(params.verseNo, 'verseNo', {
    required: false,
  });

  if (bookNo !== undefined) {
    query.bookNo = bookNo;
  }

  if (chapterNo !== undefined) {
    query.chapterNo = chapterNo;
  }

  if (paragraphNo !== undefined) {
    query.paragraphNo = paragraphNo;
  }

  if (userNo !== undefined) {
    query.userNo = userNo;
  }

  if (verseNo !== undefined) {
    query['verseIDs.verseNo'] = verseNo;
  }

  return query;
}

export async function getReflections(params = {}) {
  const query = parseReflectionQuery(params);
  return listReflections(query);
}

async function resolveNickname(userNo, fallbackNickname = '') {
  const nickname = String(fallbackNickname || '').trim();
  if (nickname) return nickname;

  const database = getDatabase();
  const user = await database.collection('users').findOne(
    { userNo },
    { projection: { _id: 0, nickname: 1 } },
  );

  return String(user?.nickname || '').trim();
}

const ACTION_LOG_COLLECTION = 'action_log';
const WRITE_REFLECTION_SCORE = 3;
const DUPLICATE_WINDOW_MS = 10 * 60 * 1000;

function formatVerseId(row, fallback) {
  if (row?.index) return String(row.index);

  const abbr = String(row?.abbr || '').trim();
  if (abbr) return `${abbr}${row.chapterNo}:${row.verseNo}`;

  return formatChurchKorVerseId({
    bookNo: row?.bookNo,
    book: row?.book,
    chapterNo: row?.chapterNo,
    verseNo: row?.verseNo,
  }) || fallback;
}

async function canUpdate(userNo, verseId, actionType) {
  const database = getDatabase();
  const cutoffIso = new Date(Date.now() - DUPLICATE_WINDOW_MS).toISOString();
  const recent = await database.collection(ACTION_LOG_COLLECTION).findOne(
    {
      userNo,
      verseId,
      actionType,
      createdAt: { $gte: cutoffIso },
    },
    { projection: { _id: 1 } },
  );

  return !recent;
}

async function applyWriteReflectionScores(document) {
  if (!document.verseIDs.length) {
    return;
  }

  const database = getDatabase();
  const now = new Date();
  const perScore = WRITE_REFLECTION_SCORE / document.verseIDs.length;
  const actionType = 'write_reflection';
  const verseRows = await database.collection(env.mongoCollectionBibleEdit)
    .find(
      {
        bookNo: document.bookNo,
        chapterNo: document.chapterNo,
        verseNo: { $in: [...new Set(document.verseIDs.map((item) => item.verseNo))] },
      },
      {
        projection: { _id: 0, bookNo: 1, book: 1, verseNo: 1, chapterNo: 1, abbr: 1, index: 1 },
      },
    )
    .toArray();

  const verseIdMap = new Map(
    verseRows.map((row) => [
      Number(row.verseNo),
      formatVerseId(row, `${document.bookNo}:${document.chapterNo}:${row.verseNo}`),
    ]),
  );

  for (const item of document.verseIDs) {
    const verseId = verseIdMap.get(item.verseNo)
      || formatChurchKorVerseId({ bookNo: document.bookNo, chapterNo: document.chapterNo, verseNo: item.verseNo });
    if (!(await canUpdate(document.userNo, verseId, actionType))) {
      continue;
    }

    await database.collection(env.mongoCollectionVerseTopics).updateOne(
      {
        bookNo: document.bookNo,
        chapterNo: document.chapterNo,
        verseNo: item.verseNo,
        mainCategory: item.category,
      },
      {
        $set: {
          verseId,
          updatedAt: now.toISOString(),
        },
        $setOnInsert: {
          bookNo: document.bookNo,
          chapterNo: document.chapterNo,
          verseNo: item.verseNo,
          mainCategory: item.category,
          baseWeight: 0,
          isAnchor: false,
          subCategories: [],
        },
        $inc: {
          score: perScore,
          recentScore: perScore,
        },
      },
      { upsert: true },
    );

    await database.collection(ACTION_LOG_COLLECTION).insertOne({
      userNo: document.userNo,
      verseId,
      actionType,
      bookNo: document.bookNo,
      chapterNo: document.chapterNo,
      verseNo: item.verseNo,
      mainCategory: item.category,
      createdAt: now.toISOString(),
    });
  }
}

export async function saveReflection(body = {}) {
  const now = new Date().toISOString();
  const rid = typeof body.rid === 'string' && body.rid.trim()
    ? body.rid.trim()
    : `r_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  const userNo = parsePositiveInteger(body.userNo, 'userNo');
  const nickname = await resolveNickname(userNo, body.nickname);

  const document = {
    rid,
    userNo,
    nickname: nickname || undefined,
    bookNo: parsePositiveInteger(body.bookNo, 'bookNo'),
    chapterNo: parsePositiveInteger(body.chapterNo, 'chapterNo'),
    paragraphNo: parsePositiveInteger(body.paragraphNo, 'paragraphNo'),
    mainVerseNo: parsePositiveInteger(body.mainVerseNo, 'mainVerseNo'),
    verseRange: requireTrimmedString(body.verseRange, 'verseRange'),
    verseIDs: normalizeSelectedVerseItems(body.verseIDs),
    text: requireTrimmedString(body.text, 'text'),
    updatedAt: now,
    createdAt: String(body.createdAt || now),
  };

  const saved = await upsertReflection(document);
  await applyWriteReflectionScores(document);
  return saved;
}

export async function handleViewReflection(params = {}) {
  const rid = requireTrimmedString(params.rid, 'rid');
  const userNo = parsePositiveInteger(params.userNo, 'userNo', { required: false });
  const reflection = await findReflectionByRid(rid);

  if (!reflection) {
    throw createAppError('Reflection not found.', 404);
  }

  if (!userNo) {
    console.log('[view_reflection] skipped: missing userNo', { rid, userNo });
    return {
      skipped: true,
      reflection,
    };
  }

  const mainVerseNo = Number(reflection.mainVerseNo || reflection.verseIDs?.[0]?.verseNo || 1);
  const verseId = formatChurchKorVerseId({
    bookNo: reflection.bookNo,
    chapterNo: reflection.chapterNo,
    verseNo: mainVerseNo,
  });
  const actionType = 'view_reflection';
  const can = await canUpdate(userNo, verseId, actionType);

  if (!can) {
    console.log('[view_reflection] skipped: duplicate window', { rid, userNo, verseId, actionType });
    return {
      skipped: true,
      reflection,
      verseId,
    };
  }

  const database = getDatabase();
  const mainVerse = (reflection.verseIDs || []).find((item) => Number(item.verseNo) === mainVerseNo);
  const updatedAt = new Date().toISOString();

  const updateResult = await database.collection(env.mongoCollectionVerseTopics).updateMany(
    {
      verseId,
    },
    {
      $set: {
        verseId,
        updatedAt,
      },
      $inc: {
        score: 2,
        recentScore: 2,
      },
    },
  );

  if (!updateResult.matchedCount && mainVerse?.category) {
    await database.collection(env.mongoCollectionVerseTopics).updateOne(
      {
        bookNo: Number(reflection.bookNo),
        chapterNo: Number(reflection.chapterNo),
        verseNo: mainVerseNo,
        mainCategory: String(mainVerse.category),
      },
      {
        $set: {
          verseId,
          updatedAt,
        },
        $setOnInsert: {
          bookNo: Number(reflection.bookNo),
          chapterNo: Number(reflection.chapterNo),
          verseNo: mainVerseNo,
          mainCategory: String(mainVerse.category),
          baseWeight: 0,
          isAnchor: false,
          subCategories: [],
        },
        $inc: {
          score: 2,
          recentScore: 2,
        },
      },
      { upsert: true },
    );
  }

  await database.collection(ACTION_LOG_COLLECTION).insertOne({
    userNo,
    verseId,
    actionType,
    createdAt: new Date().toISOString(),
  });

  console.log('[view_reflection] updated', {
    rid,
    userNo,
    verseId,
    mainVerseNo,
    matchedCount: updateResult.matchedCount,
    modifiedCount: updateResult.modifiedCount,
  });

  return {
    skipped: false,
    updated: true,
    verseId,
    reflection,
  };
}



