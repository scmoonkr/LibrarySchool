import { batchLookup, searchByIsbn, searchByItemId, searchByTitle, searchByTitlePublisher } from './book.repository.js';

// 결과를 주문도서 폼이 쓰는 형태로 정리.
function toResult(b) {
  return {
    isbn: b.isbn || '',
    item_id: b.item_id || '',
    title: b.title || '',
    subtitle: b.subtitle || '',
    series_name: b.series_name || '',
    author: b.author || '',
    publisher: b.publisher || '',
    price: Number(b.price) || 0,
    dc_price: Number(b.sale_price) || 0, // 할인가(정가할인, sale_price)
  };
}

// GET /api/orderm/books?item_id=... | ?isbn=... | ?tp=... | ?q=...
export async function searchBooks(req, res, next) {
  try {
    const itemId = String(req.query.item_id || '').trim();
    const isbn = String(req.query.isbn || '').trim();
    const tp = String(req.query.tp || '').trim();
    const q = String(req.query.q || '').trim();

    let rows = [];
    if (itemId) {
      rows = await searchByItemId(itemId);
    } else if (isbn) {
      rows = await searchByIsbn(isbn);
    } else if (tp) {
      rows = await searchByTitlePublisher(tp);
    } else if (q) {
      rows = await searchByTitle(q);
    }

    return res.json({ ok: true, data: rows.map(toResult) });
  } catch (error) {
    return next(error);
  }
}

// POST /api/orderm/books/lookup  { mode: 'title'|'title_publisher', rows: [{title,isbn,publisher}] }
// 각 행에 대한 매칭 도서를 입력 순서대로 돌려준다(없으면 null).
export async function lookupBooks(req, res, next) {
  try {
    const mode = req.body?.mode === 'title_publisher' ? 'title_publisher' : 'title';
    const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
    const matches = await batchLookup(rows, mode);
    const data = matches.map((b) => (b ? toResult(b) : null));
    return res.json({ ok: true, data });
  } catch (error) {
    return next(error);
  }
}
