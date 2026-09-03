import { getDatabase } from '../../config/db.js';

const COLLECTION_NAME = 'reflections';

export async function listReflections(query = {}) {
  const database = getDatabase();

  return database
    .collection(COLLECTION_NAME)
    .find(query, {
      sort: { updatedAt: -1 },
      projection: { _id: 0 },
    })
    .toArray();
}

export async function findReflectionByRid(rid) {
  const database = getDatabase();

  return database.collection(COLLECTION_NAME).findOne(
    { rid: String(rid) },
    { projection: { _id: 0 } },
  );
}

export async function upsertReflection(document) {
  const database = getDatabase();
  const filter = {
    userNo: document.userNo,
    bookNo: document.bookNo,
    chapterNo: document.chapterNo,
    verseRange: document.verseRange,
  };

  const { createdAt, ...updatable } = document;

  await database.collection(COLLECTION_NAME).updateOne(
    filter,
    {
      $set: updatable,
      $setOnInsert: {
        createdAt,
      },
    },
    { upsert: true },
  );

  return document;
}
