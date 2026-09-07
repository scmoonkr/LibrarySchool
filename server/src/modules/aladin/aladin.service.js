import { findBookByIsbn } from './aladin.repository.js';

function appError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function str(value) {
  return value == null ? '' : String(value);
}

// BSON Date / ISO 문자열 → ISO 문자열(없으면 '').
function isoDate(value) {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString();
}

// 저자 상세 URL(…AuthorSearch=@810236)에서 저자 id 추출.
function pickAuthorId(url) {
  const m = String(url || '').match(/@(\d+)/);
  return m ? m[1] : '';
}

// Reading.books 문서 → BookInfo(C# 클래스) 형식으로 매핑.
// 원본에 없는 필드(site/cid/status/booklogList 등)는 기본값으로 채운다.
export function toBookInfo(b) {
  const authorDetail = Array.isArray(b.author_detail) ? b.author_detail : [];
  const firstAuthor = authorDetail[0] || {};
  const pubReview = b.publisher_review && typeof b.publisher_review === 'object' ? b.publisher_review : {};

  return {
    _id: b._id ? String(b._id) : '',
    site: str(b.site),
    itemID: str(b.item_id),
    cid: Number.isFinite(Number(b.cid)) ? Number(b.cid) : 0,
    status: str(b.status),
    isbn: str(b.isbn),
    title: str(b.title),
    subTitle: str(b.subtitle),
    series: str(b.series_name),
    language: str(b.language),
    nationality: str(b.nationality),
    originalTitle: str(b.title_original),
    originalAuthor: str(b.original_author),
    author: str(b.author),
    publisher: str(b.publisher),
    pub_date: str(b.pub_date),
    price: str(b.price),
    dcPrice: str(b.sale_price),
    size: str(b.size),
    shape: {
      page: str(b.page),
      shape: '',
      size: str(b.size),
      weight: str(b.weight),
      thick: '',
    },
    category: Array.isArray(b.categories) ? b.categories.map(String) : [],
    created: isoDate(b.created_at),
    authorReview: authorDetail.map((a) => ({
      name: str(a && a.name),
      role: '',
      note: str(a && a.detail),
    })),
    booklogList: [],
    review: {
      review: str(b.book_review),   // 책 소개/서평
      contents: str(b.index),       // 목차
      publisher: str(pubReview.review), // 출판사 리뷰
      recommand: '',
      textbook: '',
      award: str(firstAuthor.award),
      bookin: str(b.inside),        // 책 속으로
      author: '',
      booklog: '',
      bookTrailer: '',
    },
    image: {
      cover: str(b.image_url),
      back: '',
    },
    url: str(b.url),
    authorname: str(firstAuthor.name),
    authorid: pickAuthorId(firstAuthor.url),
  };
}

// ISBN 으로 Reading.books 조회 후 BookInfo 형식으로 반환. 없으면 404.
export async function getBookInfoByIsbn(isbn) {
  const code = String(isbn || '').trim();
  if (!code) {
    throw appError('ISBN 이 필요합니다.', 400);
  }
  const book = await findBookByIsbn(code);
  if (!book) {
    throw appError('해당 ISBN 도서를 찾을 수 없습니다.', 404);
  }
  return toBookInfo(book);
}
