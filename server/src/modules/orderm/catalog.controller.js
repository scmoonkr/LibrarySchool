import {
  deleteBook,
  findBookById,
  insertBook,
  listBooks,
  updateBook,
} from './catalog.repository.js';

function appError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function str(value) {
  return String(value ?? '').trim();
}

// 요청 body → Reading.books 저장 필드로 정규화.
function normalize(body = {}) {
  const doc = {
    item_id: str(body.item_id),
    isbn: str(body.isbn),
    title: str(body.title),
    subtitle: str(body.subtitle),
    author: str(body.author),
    series_name: str(body.series_name),
    title_original: str(body.title_original),
    publisher: str(body.publisher),
    pub_date: str(body.pub_date),
    price: body.price === '' || body.price == null ? null : Number(body.price),
    page: body.page === '' || body.page == null ? null : Number(body.page),
    size: str(body.size),
    weight: str(body.weight),
    image_url: str(body.image_url),
    kdc: str(body.kdc),
    categories: Array.isArray(body.categories)
      ? body.categories.map((c) => str(c)).filter(Boolean)
      : [],
    book_review: str(body.book_review),
    index: str(body.index),
    inside: str(body.inside),
  };
  // publisher_review: 객체 또는 문자열
  if (body.publisher_review !== undefined) doc.publisher_review = body.publisher_review;
  // author_detail: 배열일 때만
  if (Array.isArray(body.author_detail)) doc.author_detail = body.author_detail;
  return doc;
}

// GET /api/orderm/catalog?q=&page=&limit=
export async function listCatalog(req, res, next) {
  try {
    const result = await listBooks({ q: req.query.q, page: req.query.page, limit: req.query.limit });
    return res.json({ ok: true, ...result });
  } catch (error) {
    return next(error);
  }
}

// GET /api/orderm/catalog/:id
export async function getCatalog(req, res, next) {
  try {
    const book = await findBookById(req.params.id);
    if (!book) throw appError('도서를 찾을 수 없습니다.', 404);
    return res.json({ ok: true, data: book });
  } catch (error) {
    return next(error);
  }
}

// POST /api/orderm/catalog
export async function createCatalog(req, res, next) {
  try {
    const book = await insertBook(normalize(req.body));
    return res.status(201).json({ ok: true, data: book });
  } catch (error) {
    return next(error);
  }
}

// PATCH /api/orderm/catalog/:id
export async function updateCatalog(req, res, next) {
  try {
    const book = await updateBook(req.params.id, normalize(req.body));
    if (!book) throw appError('도서를 찾을 수 없습니다.', 404);
    return res.json({ ok: true, data: book });
  } catch (error) {
    return next(error);
  }
}

// DELETE /api/orderm/catalog/:id
export async function removeCatalog(req, res, next) {
  try {
    const ok = await deleteBook(req.params.id);
    if (!ok) throw appError('도서를 찾을 수 없습니다.', 404);
    return res.json({ ok: true });
  } catch (error) {
    return next(error);
  }
}
