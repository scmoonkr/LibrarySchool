import {
  deleteOrderByNo,
  findOrderByNo,
  getNextOrderno,
  insertOrder,
  listOrders,
  updateOrderByNo,
} from './order.repository.js';
import { sumDcPriceByOrder } from './orderlist.repository.js';

const STATUSES = ['견적요청', '주문', '발주', '입고', '출고', '계산서발행', '입금'];

function appError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function str(value, max = 500) {
  return String(value ?? '').trim().slice(0, max);
}

function normalizeOrder(body = {}) {
  const customer = str(body.customer, 120);
  if (!customer) {
    throw appError('고객명(customer)은 필수입니다.', 400);
  }

  const status = STATUSES.includes(body.status) ? body.status : '견적요청';
  const priceNum = Number(body.order_price);

  return {
    customer,
    branch: str(body.branch, 120),       // 지점명
    ordername: str(body.ordername, 200),  // 주문명
    order_price: Number.isFinite(priceNum) ? priceNum : 0, // 주문금액
    quote_date: str(body.quote_date, 20), // 견적요청일자 (YYYY-MM-DD)
    order_date: str(body.order_date, 20), // 주문일자 (YYYY-MM-DD)
    purchase_date: str(body.purchase_date, 20), // 발주일자 (YYYY-MM-DD)
    delivery_date: str(body.delivery_date, 20), // 출고일자 / 납품일
    invoice_date: str(body.invoice_date, 20),   // 계산서발행일자 (YYYY-MM-DD)
    payment_date: str(body.payment_date, 20),   // 입금일자 (YYYY-MM-DD)
    status,
    note: str(body.note, 2000),
  };
}

export async function getOrders() {
  // 주문금액(order_price)은 저장값이 아니라 해당 주문 도서(order_list)의
  // 할인가(dc_price) 합계로 계산해서 내려준다.
  const [orders, dcSum] = await Promise.all([listOrders(), sumDcPriceByOrder()]);
  return orders.map((o) => ({ ...o, order_price: dcSum[Number(o.orderno)] ?? 0 }));
}

export async function createOrder(body = {}) {
  const now = new Date().toISOString();
  const document = {
    orderno: await getNextOrderno(),
    ...normalizeOrder(body),
    createdAt: now,
    updatedAt: now,
  };
  return insertOrder(document);
}

export async function editOrder(orderno, body = {}) {
  const existing = await findOrderByNo(orderno);
  if (!existing) {
    throw appError('주문을 찾을 수 없습니다.', 404);
  }
  const fields = {
    ...normalizeOrder(body),
    updatedAt: new Date().toISOString(),
  };
  return updateOrderByNo(orderno, fields);
}

export async function removeOrder(orderno) {
  const deleted = await deleteOrderByNo(orderno);
  if (!deleted) {
    throw appError('주문을 찾을 수 없습니다.', 404);
  }
  return { ok: true };
}
