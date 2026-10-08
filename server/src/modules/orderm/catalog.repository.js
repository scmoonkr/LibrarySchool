import { ObjectId } from 'mongodb';
import { getReadingDatabase } from '../../config/db.js';
import { env } from '../../config/env.js';

// 도서검색(Reading.books) CRUD. KRIN manager/books drawer 복제용.
const LIMIT = 100;
const MAX_TIME_MS = 5000;

function col() {
  return getReadingDatabase().collection(env.booksCollection);
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function toOid(id) {
  try {
    return new ObjectId(String(id));
  } catch {
    return null;
  }
}

// 목록 row 로 내려줄 필드.
const LIST_PROJECTION = {
  item_id: 1,
  isbn: 1,
  title: 1,
  author: 1,
  publisher: 1,
  price: 1,
  pub_date: 1,
  categories: 1,
  book_review: 1,
  index: 1,
};

function toRow(b) {
  const first = Array.isArray(b.categories) ? b.categories[0] : '';
  const cat = first ? String(first).split('>').pop().trim() : '';
  return {
    id: b._id ? String(b._id) : '',
    item_id: b.item_id ?? '',
    isbn: b.isbn ?? '',
    title: b.title ?? '',
    author: b.author ?? '',
    publisher: b.publisher ?? '',
    price: b.price ?? null,
    pub_date: b.pub_date ?? '',
    category: cat,
    // 수집정보: R=book_review, I=index
    info: `${b.book_review ? 'R' : ''}${b.index ? 'I' : ''}`,
  };
}

// 검색: q 를 title/author/isbn/publisher 부분일치(AND 토큰)로.
export async function listBooks({ q = '', page = 1, limit = LIMIT } = {}) {
  const c = col();
  const query = {};
  const text = String(q || '').trim();
  if (text) {
    const tokens = text.split(/\s+/).filter(Boolean).slice(0, 6);
    query.$and = tokens.map((tok) => {
      const rx = { $regex: escapeRegex(tok), $options: 'i' };
      return { $or: [{ title: rx }, { author: rx }, { isbn: rx }, { publisher: rx }] };
    });
  }
  const p = Math.max(1, Number(page) || 1);
  const lim = Math.max(1, Math.min(300, Number(limit) || LIMIT));
  const [docs, total] = await Promise.all([
    c
      .find(query, { projection: { ...LIST_PROJECTION }, sort: { _id: -1 } })
      .skip((p - 1) * lim)
      .limit(lim)
      .maxTimeMS(MAX_TIME_MS)
      .toArray(),
    c.countDocuments(query, { maxTimeMS: MAX_TIME_MS }),
  ]);
  return { data: docs.map(toRow), total, page: p, limit: lim };
}

export async function findBookById(id) {
  const oid = toOid(id);
  if (!oid) return null;
  const b = await col().findOne({ _id: oid });
  if (!b) return null;
  return { ...b, id: String(b._id), _id: undefined };
}

export async function insertBook(doc) {
  const now = new Date();
  const res = await col().insertOne({ ...doc, created_at: now, source: 'orderm' });
  return findBookById(res.insertedId);
}

export async function updateBook(id, fields) {
  const oid = toOid(id);
  if (!oid) return null;
  await col().updateOne({ _id: oid }, { $set: { ...fields, updated_at: new Date() } });
  return findBookById(id);
}

export async function deleteBook(id) {
  const oid = toOid(id);
  if (!oid) return false;
  const res = await col().deleteOne({ _id: oid });
  return res.deletedCount > 0;
}
