import { getDatabase, getDreamerDatabase } from '../../config/db.js';
import { env } from '../../config/env.js';

// 주문명(order.name)을 LibrarySchool.orders 에서 orderno 로 찾는다.
export async function findOrderName(orderNo) {
  const order = await getDatabase().collection('orders').findOne(
    { orderno: Number(orderNo) },
    { projection: { _id: 0, ordername: 1 } },
  );
  return order?.ordername || '';
}

// Dreamer.contents 에서 ISBN 배열로 cid 를 찾아 { [isbn]: cid } 맵으로 반환.
export async function findContentsCidByIsbns(isbns) {
  const list = [
    ...new Set(
      (Array.isArray(isbns) ? isbns : [])
        .map((s) => String(s ?? '').trim())
        .filter(Boolean),
    ),
  ];
  if (!list.length) return {};
  const col = getDreamerDatabase().collection('contents');
  const rows = await col
    .find({ isbn: { $in: list } }, { projection: { _id: 0, isbn: 1, cid: 1 } })
    .toArray();
  const map = {};
  for (const r of rows) {
    const key = String(r.isbn ?? '').trim();
    if (key && map[key] == null) map[key] = r.cid;
  }
  return map;
}

// Dreamer.contents 에서 ISBN 1건 조회(중복 확인용).
export async function findContentByIsbn(isbn) {
  const code = String(isbn ?? '').trim();
  if (!code) return null;
  return getDreamerDatabase()
    .collection('contents')
    .findOne({ isbn: code }, { projection: { _id: 0, cid: 1, isbn: 1 } });
}

// Dreamer.contents 에 신규 문서 삽입.
export async function insertContent(doc) {
  await getDreamerDatabase().collection('contents').insertOne(doc);
  return doc;
}

// Dreamer.contents 의 최대 cid. 신규 등록 시 cid = max + 1 에 쓴다.
export async function getMaxContentsCid() {
  const col = getDreamerDatabase().collection('contents');
  const top = await col
    .find({}, { projection: { _id: 0, cid: 1 }, sort: { cid: -1 }, limit: 1 })
    .next();
  return Number(top?.cid) || 0;
}

// Dreamer.cybOrder 에 OrderNo 기준으로 upsert.
export async function upsertCybOrder(doc) {
  const col = getDreamerDatabase().collection(env.cybOrderCollection);
  await col.updateOne({ OrderNo: doc.OrderNo }, { $set: doc }, { upsert: true });
  return doc;
}
