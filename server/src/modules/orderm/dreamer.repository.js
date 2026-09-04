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

// Dreamer.cybOrder 에 OrderNo 기준으로 upsert.
export async function upsertCybOrder(doc) {
  const col = getDreamerDatabase().collection(env.cybOrderCollection);
  await col.updateOne({ OrderNo: doc.OrderNo }, { $set: doc }, { upsert: true });
  return doc;
}
