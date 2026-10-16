import { getReadingDatabase } from '../../config/db.js';
import { env } from '../../config/env.js';

// CrawlingBooks store.js 의 저장 로직을 서버(Reading.books)용으로 옮긴 것.
// 알라딘 상세(fetchBookDetail 결과)를 item_id(없으면 isbn/url) 기준으로 upsert 한다.

function booksCollection() {
  return getReadingDatabase().collection(env.booksCollection);
}

function extractItemId(url) {
  return String(url ?? '').match(/[?&]ItemId=(\d+)/)?.[1] ?? null;
}

function buildFilter(book) {
  const itemId = book.item_id ?? extractItemId(book.url);
  if (itemId) return { item_id: String(itemId) };
  if (book.isbn) return { isbn: book.isbn };
  return { url: book.url };
}

function compactObject(value) {
  return Object.fromEntries(
    Object.entries(value).filter(([, v]) => v !== undefined),
  );
}

function buildDetailFields(book) {
  return compactObject({
    item_id: book.item_id ?? extractItemId(book.url),
    isbn: book.isbn ?? null,
    url: book.url,
    title: book.title,
    subtitle: book.subtitle ?? '',
    author: book.author,
    publisher: book.publisher,
    pub_date: book.pub_date,
    image_url: book.image_url ?? '',
    price: book.price ?? null,
    sale_price: book.sale_price ?? null,
    linkClass: book.linkClass ?? null,
    series_name: book.series_name ?? null,
    title_original: book.title_original ?? null,
    page: book.page ?? null,
    size: book.size ?? '',
    weight: book.weight ?? '',
    categories: Array.isArray(book.categories) ? book.categories : [],
    book_review: book.book_review ?? '',
    index: book.index ?? '',
    inside: book.inside ?? '',
    author_detail: Array.isArray(book.author_detail) ? book.author_detail : [],
    publisher_review: book.publisher_review ?? { images: [], review: '' },
  });
}

export async function saveBookDetail(book) {
  const collection = booksCollection();
  const now = new Date();
  return collection.updateOne(
    buildFilter(book),
    {
      $set: { ...buildDetailFields(book), updated_at: now, detail_updated_at: now },
      $unset: { booklist: '', book_detail: '' },
      $setOnInsert: { created_at: now },
    },
    { upsert: true },
  );
}
