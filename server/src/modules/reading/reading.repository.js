import { getDatabase } from '../../config/db.js';

const COLLECTION_NAME = 'reading_paints';

export async function listReadingPaints(query = {}) {
  const database = getDatabase();

  return database
    .collection(COLLECTION_NAME)
    .find(query, {
      sort: { updatedAt: -1 },
      projection: { _id: 0 },
    })
    .toArray();
}

export async function upsertReadingPaint(document) {
  const database = getDatabase();
  const filter = {
    userId: document.userId,
    bookNo: document.bookNo,
    chapterNo: document.chapterNo,
  };

  await database.collection(COLLECTION_NAME).updateOne(
    filter,
    {
      $set: document,
    },
    { upsert: true },
  );

  return document;
}

export async function deleteReadingPaints(query = {}) {
  const database = getDatabase();
  const result = await database.collection(COLLECTION_NAME).deleteMany(query);

  return {
    deletedCount: result.deletedCount || 0,
  };
}
