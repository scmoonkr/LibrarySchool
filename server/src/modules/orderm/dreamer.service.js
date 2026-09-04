import { findOrderName, upsertCybOrder } from './dreamer.repository.js';

function appError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function str(value) {
  return String(value ?? '').trim();
}
function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

// 정가조회 한 행 → cybOrder.Original 항목.
function toOriginal(row, index) {
  const title = str(row.title);
  const subtitle = str(row.subtitle);
  const fullTitle = subtitle ? `${title}. ${subtitle}` : title;
  const seq = num(row.no) || (index + 1) * 10;
  const price = num(row.price);

  return {
    Author: str(row.author),
    BookCount: num(row.qty),
    ISBN: str(row.isbn),
    OrderPrice: price,
    OrderSeq: seq,
    Price: price,
    Pub_name: '',
    Publisher: str(row.publisher),
    Rate: 0,
    Remarks: '',
    Seller_no: '',
    Status: 'OK',
    Title: fullTitle, // `${title}. ${subtitle}`
    WorkSeq: seq,
  };
}

export async function sendToDreamer({ orderNo, rows } = {}) {
  const on = Number(orderNo);
  if (!Number.isFinite(on) || on <= 0) {
    throw appError('주문번호(orderNo)가 필요합니다.', 400);
  }

  const list = Array.isArray(rows) ? rows : [];
  const name = await findOrderName(on);

  const doc = {
    OrderNo: on,
    name,
    OrderList: [],
    Original: list.map(toOriginal),
  };

  await upsertCybOrder(doc);
  return { ok: true, count: doc.Original.length };
}
