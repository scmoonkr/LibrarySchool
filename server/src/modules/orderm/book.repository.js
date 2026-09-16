import { getReadingDatabase } from '../../config/db.js';
import { env } from '../../config/env.js';

const LIMIT = 20;
const MAX_TIME_MS = 3000; // 미인덱스 필드 스캔이 오래 걸리면 잘라낸다.

// 결과로 내려줄 필드만.
const PROJECTION = {
  _id: 0,
  item_id: 1,
  isbn: 1,
  title: 1,
  subtitle: 1,
  title_original: 1,
  series_name: 1,
  author: 1,
  publisher: 1,
  price: 1,
  sale_price: 1,
};

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function booksCollection() {
  return getReadingDatabase().collection(env.booksCollection);
}

// item_id 정확 검색 (item_id 유니크 인덱스 사용 → 최대 1건).
// 대부분 문자열로 저장되지만, 혹시 숫자로 저장된 레거시 문서도 잡히도록
// 문자열/숫자 양쪽으로 매칭한다.
export async function searchByItemId(itemId) {
  const q = String(itemId || '').trim();
  if (!q) return [];
  const values = Number.isFinite(Number(q)) ? [q, Number(q)] : [q];
  return booksCollection()
    .find({ item_id: { $in: values } }, { projection: PROJECTION })
    .limit(1)
    .maxTimeMS(MAX_TIME_MS)
    .toArray();
}

// ISBN 접두 검색 (isbn 인덱스 사용).
export async function searchByIsbn(isbn) {
  const q = String(isbn || '').trim();
  if (!q) return [];
  return booksCollection()
    .find({ isbn: { $regex: `^${escapeRegex(q)}` } }, { projection: PROJECTION })
    .limit(LIMIT)
    .maxTimeMS(MAX_TIME_MS)
    .toArray();
}

// 공백으로 나눈 각 토큰이 ISBN·제목·출판사 중 하나에 포함(AND)되는 도서 검색.
// 예: "갈림길 포레스트북스" → (제목/출판사/ISBN에 '갈림길') AND (… '포레스트북스').
// (contains 검색이라 인덱스를 못 타므로 limit/maxTimeMS 로 제한한다.)
export async function searchByTitlePublisher(text) {
  // 특수문자(구두점·기호 등)는 공백으로 치환해 단어 토큰으로 나눈다.
  // 예: "부동산(교과서)" / "부동산-교과서" → "부동산" AND "교과서".
  const cleaned = String(text || '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  if (!cleaned) return [];
  const tokens = cleaned.split(/\s+/).filter(Boolean).slice(0, 6);
  if (!tokens.length) return [];

  const and = tokens.map((tok) => {
    const rx = { $regex: escapeRegex(tok) };
    return { $or: [{ isbn: rx }, { title: rx }, { publisher: rx }] };
  });

  return booksCollection()
    .find({ $and: and }, { projection: PROJECTION })
    .limit(LIMIT)
    .maxTimeMS(MAX_TIME_MS)
    .toArray();
}

// 한 행에 대한 최적 매칭 1건.
// 우선순위: ISBN(정확) → (모드) 제목 정확 → 제목 접두. title_publisher 모드는 출판사도 함께.
export async function findOneMatch({ title, isbn, publisher } = {}, mode = 'title') {
  const col = booksCollection();
  const t = String(title || '').trim();
  const i = String(isbn || '').trim();
  const p = String(publisher || '').trim();

  if (i) {
    const byIsbn = await col.findOne({ isbn: i }, { projection: PROJECTION });
    if (byIsbn) return byIsbn;
  }
  if (!t) return null;

  if (mode === 'title_publisher' && p) {
    const pub = { $regex: escapeRegex(p) };
    let m = await col.findOne({ title: t, publisher: pub }, { projection: PROJECTION });
    if (m) return m;
    m = await col
      .findOne({ title: { $regex: `^${escapeRegex(t)}` }, publisher: pub }, { projection: PROJECTION })
      .catch(() => null);
    return m;
  }

  let m = await col.findOne({ title: t }, { projection: PROJECTION });
  if (m) return m;
  m = await col.findOne({ title: { $regex: `^${escapeRegex(t)}` } }, { projection: PROJECTION });
  return m;
}

// 여러 행 배치 매칭. 결과는 입력 순서와 1:1(없으면 null).
export async function batchLookup(rows, mode = 'title') {
  const list = Array.isArray(rows) ? rows.slice(0, 500) : [];
  return Promise.all(list.map((r) => findOneMatch(r, mode).catch(() => null)));
}

// 제목류 접두 검색: title(인덱스) + subtitle / title_original / series_name.
export async function searchByTitle(text) {
  const q = String(text || '').trim();
  if (!q) return [];
  const rx = { $regex: `^${escapeRegex(q)}` };
  return booksCollection()
    .find(
      { $or: [{ title: rx }, { subtitle: rx }, { title_original: rx }, { series_name: rx }] },
      { projection: PROJECTION },
    )
    .limit(LIMIT)
    .maxTimeMS(MAX_TIME_MS)
    .toArray();
}
