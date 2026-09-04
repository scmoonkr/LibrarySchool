import { getDatabase } from '../../config/db.js';

const COLLECTION_NAME = 'orders';

export async function listOrders() {
  const database = getDatabase();
  return database
    .collection(COLLECTION_NAME)
    .find({}, { sort: { orderno: -1 }, projection: { _id: 0 } })
    .toArray();
}

// 정수 자동증가 orderno: 현재 최대 orderno + 1 (없으면 1).
export async function getNextOrderno() {
  const database = getDatabase();
  const latest = await database
    .collection(COLLECTION_NAME)
    .find({}, { sort: { orderno: -1 }, projection: { _id: 0, orderno: 1 }, limit: 1 })
    .next();
  return Number(latest?.orderno || 0) + 1;
}

export async function findOrderByNo(orderno) {
  const database = getDatabase();
  return database.collection(COLLECTION_NAME).findOne(
    { orderno: Number(orderno) },
    { projection: { _id: 0 } },
  );
}

export async function insertOrder(document) {
  const database = getDatabase();
  await database.collection(COLLECTION_NAME).insertOne(document);
  const { _id, ...rest } = document;
  return rest;
}

export async function updateOrderByNo(orderno, fields) {
  const database = getDatabase();
  const result = await database.collection(COLLECTION_NAME).findOneAndUpdate(
    { orderno: Number(orderno) },
    { $set: fields },
    { returnDocument: 'after', projection: { _id: 0 } },
  );
  return result?.value ?? result ?? null;
}

export async function deleteOrderByNo(orderno) {
  const database = getDatabase();
  const result = await database.collection(COLLECTION_NAME).deleteOne({ orderno: Number(orderno) });
  return result.deletedCount > 0;
}
