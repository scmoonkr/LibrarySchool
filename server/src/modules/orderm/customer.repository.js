import { getDatabase } from '../../config/db.js';

const COLLECTION_NAME = 'customers';

// 검색어를 정규식으로 안전하게 escape 한다.
function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function listCustomers({ q } = {}) {
  const database = getDatabase();
  const filter = {};

  const keyword = String(q || '').trim();
  if (keyword) {
    const rx = new RegExp(escapeRegex(keyword), 'i');
    filter.$or = [
      { name: rx },
      { bizno: rx },
      { 'incharge.name': rx },
    ];
  }

  return database
    .collection(COLLECTION_NAME)
    .find(filter, { sort: { updatedAt: -1 }, projection: { _id: 0 } })
    .toArray();
}

// 정수 자동증가 id: 현재 최대 id + 1 (없으면 1).
export async function getNextCustomerId() {
  const database = getDatabase();
  const latest = await database
    .collection(COLLECTION_NAME)
    .find({}, { sort: { id: -1 }, projection: { _id: 0, id: 1 }, limit: 1 })
    .next();
  return Number(latest?.id || 0) + 1;
}

export async function findCustomerById(id) {
  const database = getDatabase();
  return database.collection(COLLECTION_NAME).findOne(
    { id: Number(id) },
    { projection: { _id: 0 } },
  );
}

export async function insertCustomer(document) {
  const database = getDatabase();
  await database.collection(COLLECTION_NAME).insertOne(document);
  const { _id, ...rest } = document;
  return rest;
}

export async function updateCustomerById(id, fields) {
  const database = getDatabase();
  const result = await database.collection(COLLECTION_NAME).findOneAndUpdate(
    { id: Number(id) },
    { $set: fields },
    { returnDocument: 'after', projection: { _id: 0 } },
  );

  // 드라이버 버전에 따라 result 또는 result.value 로 문서가 온다.
  return result?.value ?? result ?? null;
}

export async function deleteCustomerById(id) {
  const database = getDatabase();
  const result = await database.collection(COLLECTION_NAME).deleteOne({ id: Number(id) });
  return result.deletedCount > 0;
}
