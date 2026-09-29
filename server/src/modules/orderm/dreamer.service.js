import {
  findContentByIsbn,
  findContentsCidByIsbns,
  findOrderName,
  getMaxContentsCid,
  insertContent,
  upsertCybOrder,
} from './dreamer.repository.js';
import { findBookByIsbn } from '../aladin/aladin.repository.js';

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

// ISBN 목록으로 Dreamer.contents 의 cid 를 { [isbn]: cid } 로 조회.
export async function getContentsCidByIsbns(isbns) {
  return findContentsCidByIsbns(isbns);
}

// yyyyMMddHHmmss (MARC 005 용, 로컬 시간).
function nowStamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

// Reading.books 문서 → Dreamer.contents 등록용 문서(MARC 태그 포함) 로 변환.
function toContentsDoc(book, cid) {
  const b = book || {};
  const price = num(b.price);
  const pubDate = str(b.pub_date);
  const year = pubDate.slice(0, 4);
  const pad10 = String(cid).padStart(10, '0');
  // 저자는 콤마로 나눈다. 예: "홍길동, 김철수 옮김" → ["홍길동", "김철수 옮김"]
  const authors = str(b.author).split(',').map((s) => s.trim()).filter(Boolean);
  // MARC 008: [0-5]=pub_date yymmdd, [6]='s', [7-10]=발행연도(yyyy), 이후는 고정.
  const pdDigits = pubDate.replace(/\D/g, '');
  const yymmdd = pdDigits.slice(2, 8).padEnd(6, ' ');
  const pubYear = pdDigits.slice(0, 4) || year;
  const data008 = `${yymmdd}s${pubYear}    ggk           000a`;

  // 카테고리: "국내도서 >" 접두를 지우고 ", " 로 연결.
  const categoryCode = (Array.isArray(b.categories) ? b.categories : [])
    .join(', ')
    .split('국내도서 >')
    .join('')
    .trim();

  // review: 원본 필드가 있을 때만 넣는다.
  const review = [];
  if (b.book_review) review.push({ type: 'review', review: str(b.book_review) });
  if (b.index) review.push({ type: 'contents', review: str(b.index) });
  if (b.publisher_review && b.publisher_review.review) {
    review.push({ type: 'publisher', review: str(b.publisher_review.review) });
  }
  const authorDetail = Array.isArray(b.author_detail) ? b.author_detail : [];
  const authorDetailText = authorDetail.map((a) => str(a && a.detail)).filter(Boolean).join('\n');
  if (authorDetailText) review.push({ type: 'author', review: authorDetailText });
  if (b.inside) review.push({ type: 'inside', review: str(b.inside) });

  // tags(MARC). 조건부 태그(246/440/520)는 원본 필드가 있을 때만 넣는다.
  const tags = [
    { tagno: '001', ind1: '', ind2: '', subfield: [{ sfld: '', data: pad10 }] },
    { tagno: '004', ind1: '', ind2: '', subfield: [{ sfld: '', data: '012006015091' }] },
    { tagno: '005', ind1: '', ind2: '', subfield: [{ sfld: '', data: nowStamp() }] },
    { tagno: '007', ind1: '', ind2: '', subfield: [{ sfld: '', data: 'ta' }] },
    { tagno: '008', ind1: ' ', ind2: ' ', subfield: [{ sfld: '', data: data008 }] },
    { tagno: '020', ind1: ' ', ind2: ' ', subfield: [{ sfld: 'a', data: str(b.isbn) }, { sfld: 'c', data: `\\${price}` }] },
  ];
  // 100(주저자): 저자가 2명 이상일 때 첫 번째 저자를 넣는다.
  if (authors.length > 1) {
    tags.push({ tagno: '100', ind1: '1', ind2: ' ', subfield: [{ sfld: 'a', data: authors[0] }, { sfld: 'e', data: '' }] });
  }
  if (b.title_original) {
    tags.push({ tagno: '246', ind1: '1', ind2: '9', subfield: [{ sfld: 'a', data: str(b.title_original) }] });
  }
  // 245: a=서명. authors[0]→d, 그 이후 저자는 모두 e(증가시키지 않음).
  const sub245 = [{ sfld: 'a', data: str(b.title) }];
  authors.forEach((a, i) => {
    sub245.push({ sfld: i === 0 ? 'd' : 'e', data: a });
  });
  tags.push({ tagno: '245', ind1: '1', ind2: '0', subfield: sub245 });
  tags.push({ tagno: '260', ind1: '3', ind2: ' ', subfield: [{ sfld: 'a', data: '경기' }, { sfld: 'b', data: str(b.publisher) }, { sfld: 'c', data: year }] });
  tags.push({ tagno: '300', ind1: ' ', ind2: ' ', subfield: [{ sfld: 'a', data: str(b.page) }, { sfld: 'c', data: str(b.size) }] });
  if (b.series_name) {
    tags.push({ tagno: '440', ind1: '0', ind2: '0', subfield: [{ sfld: 'a', data: str(b.series_name) }] });
  }
  if (b.book_review) {
    tags.push({ tagno: '520', ind1: ' ', ind2: ' ', subfield: [{ sfld: 'a', data: str(b.book_review) }] });
  }
  // 700(부출표목): 하나의 태그 안에 저자 각각을 { sfld:'a', data } 로 반복한다.
  tags.push({
    tagno: '700',
    ind1: '1',
    ind2: ' ',
    subfield: authors.map((a) => ({ sfld: 'a', data: a })),
  });
  tags.push({ tagno: '950', ind1: '1', ind2: ' ', subfield: [{ sfld: 'b', data: `\\${price}` }] });

  return {
    cid,
    isbn: str(b.isbn),
    record_state: 'u',
    type: '',
    setisbn: '',
    title: str(b.title),
    series: str(b.series_name),
    author: str(b.author),
    publisher: str(b.publisher),
    pub_date: pubDate ? new Date(pubDate) : null,
    price,
    user: '',
    format: '',
    status: 'OK',
    blind: false,
    category: [{ type: 'aladin', edition: null, tag: null, code: categoryCode }],
    review,
    leader: '00000cam a2200000 k 4500',
    tags,
    image: b.image_url ? [{ type: 'cover', filename: str(b.image_url) }] : [],
  };
}

// ISBN 으로 Reading.books 를 찾아 Dreamer.contents 등록용 문서를 만들어 반환(미리보기).
// cid = 현재 Dreamer.contents 최대 cid + 1. 실제 저장은 하지 않는다.
export async function buildContentsDoc(isbn) {
  const code = str(isbn);
  if (!code) {
    throw appError('ISBN 이 필요합니다.', 400);
  }
  const book = await findBookByIsbn(code);
  if (!book) {
    throw appError(`Reading.books 에서 ISBN ${code} 도서를 찾을 수 없습니다.`, 404);
  }
  const cid = (await getMaxContentsCid()) + 1;
  return toContentsDoc(book, cid);
}

// ISBN 으로 Dreamer.contents 에 신규 등록. 이미 있으면 409(중복) 로 막는다.
export async function insertContents(isbn) {
  const code = str(isbn);
  if (!code) {
    throw appError('ISBN 이 필요합니다.', 400);
  }
  const existing = await findContentByIsbn(code);
  if (existing) {
    throw appError(`이미 Dreamer.contents 에 등록된 ISBN 입니다. (cid ${existing.cid})`, 409);
  }
  // Reading.books 조회 + cid(=max+1) 계산까지 buildContentsDoc 이 처리한다.
  const doc = await buildContentsDoc(code);
  await insertContent(doc);
  return { ok: true, cid: doc.cid, isbn: code };
}

export async function sendToDreamer({ orderNo, dreamerOrderNo, rows } = {}) {
  const on = Number(orderNo);
  if (!Number.isFinite(on) || on <= 0) {
    throw appError('주문번호(orderNo)가 필요합니다.', 400);
  }

  // Dreamer(cybOrder)에 기록할 주문번호(OrderNo). 지정하지 않으면 주문번호와 동일.
  const cyb = Number(dreamerOrderNo);
  const targetNo = Number.isFinite(cyb) && cyb > 0 ? cyb : on;

  const list = Array.isArray(rows) ? rows : [];
  // 주문명은 원 주문(LibrarySchool.orders)의 orderno 로 찾는다.
  const name = await findOrderName(on);

  const doc = {
    OrderNo: targetNo,
    name,
    OrderList: [],
    Original: list.map(toOriginal),
  };

  await upsertCybOrder(doc);
  return { ok: true, count: doc.Original.length, orderNo: targetNo };
}
