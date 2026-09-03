import { env } from '../../config/env.js';
import { getDatabase } from '../../config/db.js';
import { escapeRegExp } from '../../utils/validation.js';

const MAX_LIMIT = 500;

function buildQuery(params = {}) {
  const query = {};

  if (params.bookNo !== undefined) query.bookNo = Number(params.bookNo);
  if (params.book !== undefined) query.book = String(params.book).trim();
  if (params.bookENG) {
    const book = String(params.bookENG).trim();
    query.bookENG = book.slice(0, 1).toUpperCase() + book.slice(1).toLowerCase();
  }
  if (params.chapterNo !== undefined) query.chapterNo = Number(params.chapterNo);
  if (params.verseNo !== undefined) query.verseNo = Number(params.verseNo);
  if (params.content) {
    const content = String(params.content).trim();
    if (content) {
      query.content = new RegExp(escapeRegExp(content), 'i');
    }
  }

  return query;
}

export async function findBibleRows(params = {}) {
  const database = getDatabase();
  const query = buildQuery(params);
  
  const rows = await database
    .collection(env.mongoCollectionBibleEdit)
    .find(query, {
      projection: { _id: 0 },
      sort: { bookNo: 1, chapterNo: 1, verseNo: 1 },
      limit: MAX_LIMIT,
    })
    .toArray();

  return rows;
}

export async function findBibleChaptersByBookNo(bookNo) {
  const database = getDatabase();

  const rows = await database
    .collection(env.mongoCollectionBibleEdit)
    .find(
      {
        bookNo: Number(bookNo),
        verseNo: 1,
      },
      {
        projection: { _id: 0, bookNo: 1, chapterNo: 1, subject: 1 },
        sort: { chapterNo: 1 },
      },
    )
    .toArray();

  return rows;
}

// biblehub 컬렉션에서 장 단위 부가정보(인물·장소·사건)를 읽는다.
// 세 필드 모두 [{ title, link, key }] 형태이고 link 는 biblehub 의 /topical/... 경로다.
export async function findBiblehubChapter(bookNo, chapterNo) {
  const database = getDatabase();

  return database.collection('biblehub').findOne(
    { bookNo: Number(bookNo), chapterNo: Number(chapterNo) },
    { projection: { _id: 0, bookNo: 1, chapterNo: 1, people: 1, place: 1, events: 1 } },
  );
}

// biblehubSlug 로 공개된 글을 찾는다. 한 slug 에 글이 여럿일 수 있다.
export async function findPostsByBiblehubSlugs(slugs = []) {
  if (!slugs.length) return [];

  const database = getDatabase();

  return database.collection('contents')
    .find(
      {
        biblehubSlug: { $in: slugs },
        contentType: 'post',
        status: 'published',
        visibility: 'public',
        isDeleted: { $ne: true },
      },
      { projection: { _id: 0, slug: 1, title: 1, biblehubSlug: 1, publishedAt: 1 } },
    )
    .sort({ publishedAt: -1 })
    .toArray();
}

export async function findVerseTopicsByCategory(categoryNames = [], options = {}) {
  const database = getDatabase();
  const names = Array.from(new Set(categoryNames.filter(Boolean).map((item) => String(item).trim())));

  if (!names.length) {
    return [];
  }

  const cursor = database
    .collection(env.mongoCollectionVerseTopics)
    .find(
      {
        mainCategory: { $in: names },
      },
      {
        projection: {
          _id: 0,
          verseId: 1,
          bookNo: 1,
          chapterNo: 1,
          verseNo: 1,
          mainCategory: 1,
          subCategories: 1,
          baseWeight: 1,
          score: 1,
          recentScore: 1,
          isAnchor: 1,
        },
      },
    );

  if (options.sort) {
    cursor.sort(options.sort);
  }

  if (Number.isInteger(options.limit) && options.limit > 0) {
    cursor.limit(options.limit);
  }

  return cursor.toArray();
}

export async function findRecentVerseTopicAction({
  userNo,
  verseId,
  mainCategory,
  actionType,
  cutoffIso,
}) {
  const database = getDatabase();
  const query = {
    userNo: Number(userNo),
    verseId: String(verseId),
    actionType: String(actionType),
    createdAt: { $gte: cutoffIso },
  };

  if (mainCategory !== undefined && mainCategory !== null && String(mainCategory).trim()) {
    query.mainCategory = String(mainCategory).trim();
  }

  return database.collection('action_log').findOne(
    query,
    {
      projection: { _id: 1 },
    },
  );
}

export async function saveVerseTopicAction(document) {
  const database = getDatabase();
  await database.collection('action_log').insertOne(document);
}

export async function incrementVerseTopicScore({
  verseId,
  bookNo,
  chapterNo,
  verseNo,
  mainCategory,
  scoreDelta,
}) {
  const database = getDatabase();

  await database.collection(env.mongoCollectionVerseTopics).updateOne(
    {
      bookNo: Number(bookNo),
      chapterNo: Number(chapterNo),
      verseNo: Number(verseNo),
      mainCategory: String(mainCategory),
    },
    {
      $set: {
        verseId: String(verseId),
      },
      $setOnInsert: {
        bookNo: Number(bookNo),
        chapterNo: Number(chapterNo),
        verseNo: Number(verseNo),
        mainCategory: String(mainCategory),
        baseWeight: 0,
        isAnchor: false,
        subCategories: [],
      },
      $inc: {
        score: Number(scoreDelta),
        recentScore: Number(scoreDelta),
      },
    },
    { upsert: true },
  );
}
