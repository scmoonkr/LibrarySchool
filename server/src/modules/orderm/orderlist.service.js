import {
  bulkSetPurchase,
  bulkSetShipping,
  bulkSetShippingByOrderNo,
  bulkSetStatusByOrderNo,
  bulkSetWarehousing,
  listPendingPurchase,
  replaceOrderListByOrderNo,
  deleteByKey,
  findByKey,
  getNextNo,
  insertOrderListItem,
  listOrderList,
  renumberByOrderNo,
  updateByKey,
} from './orderlist.repository.js';

// 주문상태: 견적요청(기본) → 주문 → 발주 → 입고 → 출고
const STATUSES = ['견적요청', '주문', '발주', '입고', '출고', '계산서발행', '입금'];
const DEFAULT_STATUS = '견적요청';

function appError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function str(value, max = 500) {
  return String(value ?? '').trim().slice(0, max);
}

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

// orderNo/no(식별자)를 제외한 나머지 필드를 정규화한다.
function normalizeFields(body = {}) {
  const title = str(body.title, 300);
  if (!title) {
    throw appError('서명(title)은 필수입니다.', 400);
  }

  const status = STATUSES.includes(body.status) ? body.status : DEFAULT_STATUS;

  return {
    isbn: str(body.isbn, 40),
    item_id: str(body.item_id, 40),         // 알라딘 itemId (crawling 용)
    title,                                  // 서명
    subtitle: str(body.subtitle, 300),      // 부제
    publisher: str(body.publisher, 120),    // 출판사
    author: str(body.author, 120),          // 저자
    qty: num(body.qty),                     // 수량
    warehousing_count: num(body.warehousing_count), // 입고수량
    delivery_count: num(body.delivery_count),       // 출고수량
    price: num(body.price),                 // 정가
    dc_price: num(body.dc_price),           // 할인가
    status,                                 // 견적요청/주문/발주/입고/출고
    supplier: str(body.supplier, 120),      // 발주처
    order_price: num(body.order_price),     // 매입가격
    order_date: str(body.order_date, 20),   // 발주일
    warehousing_date: str(body.warehousing_date, 20), // 입고일
    delivery_date: str(body.delivery_date, 20),       // 출고일
    note: str(body.note, 2000),
  };
}

export async function getOrderList(query = {}) {
  return listOrderList({ orderNo: query.orderNo });
}

// 처리현황: 발주(거래중)·미입고 도서 목록.
export async function getPendingPurchase() {
  return listPendingPurchase();
}

// 정가조회 → 주문저장: 여러 행을 order_list 로 일괄 upsert((orderNo, no) 기준).
export async function saveOrderListBulk({ orderNo, items } = {}) {
  const on = Number(orderNo);
  if (!Number.isFinite(on) || on <= 0) {
    throw appError('주문번호(orderNo)가 필요합니다.', 400);
  }

  const now = new Date().toISOString();
  const docs = (Array.isArray(items) ? items : [])
    .filter((it) => str(it?.title) || str(it?.isbn))
    .map((it, idx) => ({
      orderNo: on,
      no: Number(it.no) || (idx + 1) * 10,
      isbn: str(it.isbn),
      item_id: str(it.item_id),
      title: str(it.title),
      subtitle: str(it.subtitle),
      publisher: str(it.publisher),
      author: str(it.author),
      qty: num(it.qty),
      warehousing_count: num(it.warehousing_count),
      price: num(it.price),
      dc_price: num(it.dc_price ?? it.sale_price),
      status: STATUSES.includes(it.status) ? it.status : DEFAULT_STATUS,
      supplier: str(it.supplier),
      order_price: num(it.order_price),
      order_date: str(it.order_date),
      warehousing_date: str(it.warehousing_date),
      delivery_date: str(it.delivery_date),
      note: str(it.note),
    }));

  if (!docs.length) {
    throw appError('저장할 도서가 없습니다.', 400);
  }

  // 기존 order_list 를 삭제하고 새로 삽입(교체).
  const count = await replaceOrderListByOrderNo(on, docs);
  return { ok: true, count: docs.length, affected: count };
}

// 출고: 선택한 도서들에 status='출고', 출고일자, 입고수량→출고수량 저장.
// keys 를 주면 선택한 도서만, orderNo 를 주면 그 주문의 도서 전체를 출고 처리한다.
export async function saveShipping({ keys, orderNo, delivery_date } = {}) {
  const on = Number(orderNo);
  if (Number.isFinite(on) && on > 0) {
    const modified = await bulkSetShippingByOrderNo(on, delivery_date);
    return { ok: true, modified };
  }

  const list = Array.isArray(keys) ? keys : [];
  if (!list.length) {
    throw appError('출고할 도서를 선택하세요.', 400);
  }
  const modified = await bulkSetShipping(list, delivery_date);
  return { ok: true, modified };
}

// 주문 화면의 '주문' / '발주' 버튼. 그 주문의 도서 전체 상태를 한 번에 바꾼다.
export async function setOrderListStatus({ orderNo, status, supplier } = {}) {
  const on = Number(orderNo);
  if (!Number.isFinite(on) || on <= 0) {
    throw appError('주문번호(orderNo)가 필요합니다.', 400);
  }
  if (!STATUSES.includes(status)) {
    throw appError(`상태는 ${STATUSES.join(' / ')} 중 하나여야 합니다.`, 400);
  }
  const modified = await bulkSetStatusByOrderNo(on, status, supplier);
  return { ok: true, modified };
}

// 발주: 선택한 도서들에 발주일자·발주처 저장.
export async function savePurchase({ keys, order_date, supplier } = {}) {
  const list = Array.isArray(keys) ? keys : [];
  if (!list.length) {
    throw appError('발주할 도서를 선택하세요.', 400);
  }
  const modified = await bulkSetPurchase(list, order_date, supplier);
  return { ok: true, modified };
}

export async function saveWarehousing({ orderNo, items } = {}) {
  const n = Number(orderNo);
  if (!Number.isFinite(n) || n <= 0) {
    throw appError('주문번호(orderNo)가 필요합니다.', 400);
  }
  const modified = await bulkSetWarehousing(n, items);
  return { ok: true, modified };
}

export async function createOrderListItem(body = {}) {
  const orderNo = Number(body.orderNo);
  if (!Number.isFinite(orderNo)) {
    throw appError('주문번호(orderNo)는 필수입니다.', 400);
  }

  const now = new Date().toISOString();
  const document = {
    orderNo,
    no: await getNextNo(orderNo), // 같은 주문 안에서 증가
    ...normalizeFields(body),
    createdAt: now,
    updatedAt: now,
  };
  return insertOrderListItem(document);
}

export async function editOrderListItem(orderNo, no, body = {}) {
  const existing = await findByKey(orderNo, no);
  if (!existing) {
    throw appError('주문도서를 찾을 수 없습니다.', 404);
  }

  // (orderNo, no)는 식별자이므로 수정 대상에서 제외하고 URL 키를 유지한다.
  const fields = {
    ...normalizeFields(body),
    updatedAt: new Date().toISOString(),
  };
  return updateByKey(orderNo, no, fields);
}

export async function renumberOrderList(orderNo) {
  const n = Number(orderNo);
  if (!Number.isFinite(n) || n <= 0) {
    throw appError('주문번호(orderNo)가 필요합니다.', 400);
  }
  const count = await renumberByOrderNo(n);
  return { ok: true, count };
}

export async function removeOrderListItem(orderNo, no) {
  const deleted = await deleteByKey(orderNo, no);
  if (!deleted) {
    throw appError('주문도서를 찾을 수 없습니다.', 404);
  }
  return { ok: true };
}
