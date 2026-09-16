import { getDatabase } from '../../config/db.js';

const COLLECTION_NAME = 'order_list';

// PK 는 (orderNo, no) 복합키. no 는 같은 orderNo 안에서 1부터 증가한다.

export async function listOrderList(filter = {}) {
  const database = getDatabase();
  const query = {};
  if (filter.orderNo != null && String(filter.orderNo).trim() !== '') {
    const n = Number(filter.orderNo);
    if (Number.isFinite(n)) query.orderNo = n;
  }
  return database
    .collection(COLLECTION_NAME)
    .find(query, { sort: { orderNo: -1, no: 1 }, projection: { _id: 0 } })
    .toArray();
}

// 처리현황: 상태가 '발주'(거래중)이면서 아직 입고되지 않은 도서 목록.
// 주문(orders)과 조인해 주문기관/주문명/주문일을 함께 내려준다.
export async function listPendingPurchase() {
  const col = getDatabase().collection(COLLECTION_NAME);
  return col
    .aggregate([
      // 발주(거래중) 상태 & 입고수량이 주문수량에 못 미치는(=미입고) 도서.
      {
        $match: {
          status: '발주',
          $expr: {
            $lt: [{ $ifNull: ['$warehousing_count', 0] }, { $ifNull: ['$qty', 0] }],
          },
        },
      },
      {
        $lookup: {
          from: 'orders',
          localField: 'orderNo',
          foreignField: 'orderno',
          as: 'order',
        },
      },
      { $unwind: { path: '$order', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          orderNo: 1,
          no: 1,
          title: 1,
          supplier: 1,
          order_date: 1, // 발주일 (order_list)
          customer: '$order.customer',
          ordername: '$order.ordername',
          orderDate: '$order.order_date', // 주문일 (orders)
        },
      },
      { $sort: { order_date: -1, orderNo: -1, no: 1 } },
    ])
    .toArray();
}

// 주문별 할인가(dc_price) 합계. 주문(order) 화면의 '주문금액' 계산에 쓴다.
// { [orderNo]: 합계 } 형태로 반환한다.
export async function sumDcPriceByOrder() {
  const col = getDatabase().collection(COLLECTION_NAME);
  const rows = await col
    .aggregate([
      { $group: { _id: '$orderNo', total: { $sum: { $ifNull: ['$dc_price', 0] } } } },
    ])
    .toArray();
  const map = {};
  for (const r of rows) map[Number(r._id)] = Number(r.total) || 0;
  return map;
}

// 주문도서 교체 저장: 해당 주문(orderNo)의 기존 order_list 를 전부 삭제하고 새로 삽입.
// 정가조회 → 주문저장에서 사용.
export async function replaceOrderListByOrderNo(orderNo, docs) {
  const col = getDatabase().collection(COLLECTION_NAME);
  const on = Number(orderNo);
  const now = new Date().toISOString();

  await col.deleteMany({ orderNo: on });

  const list = Array.isArray(docs) ? docs : [];
  if (!list.length) return 0;

  const toInsert = list.map((d) => {
    const { _id, ...rest } = d;
    return { ...rest, orderNo: on, no: Number(d.no), createdAt: now, updatedAt: now };
  });
  const result = await col.insertMany(toInsert);
  return result.insertedCount ?? 0;
}

// 출고: 선택한 (orderNo, no) 들에 status='출고', 출고일자(delivery_date),
// 그리고 입고수량(warehousing_count)을 출고수량(delivery_count)으로 저장.
// 출고 처리 시 적용하는 $set 스테이지. 선택 목록 출고와 주문 단위 출고가 공유한다.
function shippingSetStage(deliveryDate, now) {
  return {
    $set: {
      delivery_count: { $ifNull: ['$warehousing_count', 0] },
      status: {
        $cond: [
          {
            $gte: [
              { $ifNull: ['$warehousing_count', 0] },
              { $ifNull: ['$qty', 0] },
            ],
          },
          '출고',
          '입고',
        ],
      },
      delivery_date: String(deliveryDate || ''),
      updatedAt: now,
    },
  };
}

// 주문번호 하나에 속한 모든 도서를 출고 처리한다. (주문 화면의 '출고' 버튼)
export async function bulkSetShippingByOrderNo(orderNo, deliveryDate) {
  const col = getDatabase().collection(COLLECTION_NAME);
  const now = new Date().toISOString();
  const result = await col.updateMany(
    { orderNo: Number(orderNo) },
    [shippingSetStage(deliveryDate, now)],
  );
  return result.modifiedCount ?? 0;
}

// 주문번호 하나에 속한 모든 도서의 상태(와 필요하면 발주처)를 통째로 바꾼다.
// 주문 화면의 '주문' / '발주' 버튼이 쓴다. 조건 없이 전부 덮어쓴다.
export async function bulkSetStatusByOrderNo(orderNo, status, supplier) {
  const col = getDatabase().collection(COLLECTION_NAME);
  const set = { status, updatedAt: new Date().toISOString() };
  if (supplier != null) set.supplier = String(supplier);
  const result = await col.updateMany({ orderNo: Number(orderNo) }, { $set: set });
  return result.modifiedCount ?? 0;
}

export async function bulkSetShipping(keys, deliveryDate) {
  const col = getDatabase().collection(COLLECTION_NAME);
  const now = new Date().toISOString();
  const ops = (Array.isArray(keys) ? keys : [])
    .filter((k) => Number.isFinite(Number(k?.orderNo)) && Number.isFinite(Number(k?.no)))
    .map((k) => ({
      updateOne: {
        filter: { orderNo: Number(k.orderNo), no: Number(k.no) },
        // 입고수량을 출고수량으로 복사하고, 주문수량을 다 채웠을 때만 '출고'로
        // 넘긴다. 덜 들어온 건 '입고'에 머문다. (drawer 의 체크 버튼과 같은 규칙)
        update: [shippingSetStage(deliveryDate, now)],
      },
    }));
  if (!ops.length) return 0;
  const result = await col.bulkWrite(ops);
  return result.modifiedCount ?? 0;
}

// 발주: 선택한 (orderNo, no) 들에 발주일자(order_date)·발주처(supplier) 저장.
export async function bulkSetPurchase(keys, orderDate, supplier) {
  const col = getDatabase().collection(COLLECTION_NAME);
  const now = new Date().toISOString();
  const ops = (Array.isArray(keys) ? keys : [])
    .filter((k) => Number.isFinite(Number(k?.orderNo)) && Number.isFinite(Number(k?.no)))
    .map((k) => ({
      updateOne: {
        filter: { orderNo: Number(k.orderNo), no: Number(k.no) },
        update: [
          {
            $set: {
              order_date: String(orderDate || ''),
              supplier: String(supplier || ''),
              // 견적요청만 '발주' 로 올린다. 이미 발주/입고/출고 인 건 그대로 둔다.
              status: {
                $cond: [{ $eq: ['$status', '견적요청'] }, '발주', '$status'],
              },
              updatedAt: now,
            },
          },
        ],
      },
    }));
  if (!ops.length) return 0;
  const result = await col.bulkWrite(ops);
  return result.modifiedCount ?? 0;
}

// 입고수량(warehousing_count) 일괄 저장.
export async function bulkSetWarehousing(orderNo, items) {
  const col = getDatabase().collection(COLLECTION_NAME);
  const now = new Date().toISOString();
  const ops = (Array.isArray(items) ? items : [])
    .filter((it) => Number.isFinite(Number(it?.no)))
    .map((it) => {
      const set = { warehousing_count: Number(it.warehousing_count) || 0, updatedAt: now };
      // basketNo 가 오면 함께 저장(입고검수에서 배정한 바구니 번호).
      if (it.basketNo != null && Number.isFinite(Number(it.basketNo))) {
        set.basketNo = Number(it.basketNo);
      }
      // 입고일자(yyyy-MM-dd) 저장.
      if (it.warehousing_date != null) {
        set.warehousing_date = String(it.warehousing_date).trim();
      }
      // 입고수량이 있으면 주문상태를 '입고'로.
      if (Number(it.warehousing_count) > 0) {
        set.status = '입고';
      }
      return {
        updateOne: {
          filter: { orderNo: Number(orderNo), no: Number(it.no) },
          update: { $set: set },
        },
      };
    });
  if (!ops.length) return 0;
  const result = await col.bulkWrite(ops);
  return result.modifiedCount ?? 0;
}

// 같은 주문(orderNo) 내 다음 일련번호 no: 해당 주문의 최대 no + 10 (없으면 10).
// +10 씩 띄우는 이유는 나중에 중간(예: 10과 20 사이 15)에 끼워 넣기 위함이다.
export async function getNextNo(orderNo) {
  const database = getDatabase();
  const latest = await database
    .collection(COLLECTION_NAME)
    .find({ orderNo: Number(orderNo) }, { sort: { no: -1 }, projection: { _id: 0, no: 1 }, limit: 1 })
    .next();
  return Number(latest?.no || 0) + 10;
}

export async function findByKey(orderNo, no) {
  const database = getDatabase();
  return database.collection(COLLECTION_NAME).findOne(
    { orderNo: Number(orderNo), no: Number(no) },
    { projection: { _id: 0 } },
  );
}

export async function insertOrderListItem(document) {
  const database = getDatabase();
  await database.collection(COLLECTION_NAME).insertOne(document);
  const { _id, ...rest } = document;
  return rest;
}

export async function updateByKey(orderNo, no, fields) {
  const database = getDatabase();
  const result = await database.collection(COLLECTION_NAME).findOneAndUpdate(
    { orderNo: Number(orderNo), no: Number(no) },
    { $set: fields },
    { returnDocument: 'after', projection: { _id: 0 } },
  );
  return result?.value ?? result ?? null;
}

export async function deleteByKey(orderNo, no) {
  const database = getDatabase();
  const result = await database.collection(COLLECTION_NAME).deleteOne({
    orderNo: Number(orderNo),
    no: Number(no),
  });
  return result.deletedCount > 0;
}

// 같은 주문의 도서를 현재 순서(no 오름차순)대로 10, 20, 30 … 으로 재설정한다.
// (orderNo, no)가 아닌 문서 _id 로 갱신하므로 중간 단계의 no 중복 걱정이 없다.
export async function renumberByOrderNo(orderNo) {
  const database = getDatabase();
  const col = database.collection(COLLECTION_NAME);
  const docs = await col
    .find({ orderNo: Number(orderNo) }, { projection: { _id: 1, no: 1, createdAt: 1 } })
    .sort({ no: 1, createdAt: 1 })
    .toArray();
  if (!docs.length) return 0;

  const now = new Date().toISOString();
  const ops = docs.map((doc, index) => ({
    updateOne: {
      filter: { _id: doc._id },
      update: { $set: { no: (index + 1) * 10, updatedAt: now } },
    },
  }));
  await col.bulkWrite(ops);
  return docs.length;
}
