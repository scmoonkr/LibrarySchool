import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// bible_table.js 는 성경 데이터 전용 메타로, 이 저장소에는 없을 수 있다.
// 없으면 빈 배열로 폴백해 서버가 죽지 않게 한다. (성경 기능 미사용)
let bibleTable = [];
try {
  ({ bibleTable } = require('../../../docs/content/bible_table.js'));
} catch {
  bibleTable = [];
}

const bibleBooks = Array.isArray(bibleTable) ? bibleTable : [];

export function findBibleBookMeta(bookName = '') {
  const normalized = String(bookName || '').trim();
  if (!normalized) return null;
  return bibleBooks.find((item) => String(item?.church || '').trim() === normalized) || null;
}

export function findBibleBookMetaByNo(bookNo) {
  const normalized = Number(bookNo);
  if (!Number.isInteger(normalized)) return null;
  return bibleBooks.find((item) => Number(item?.bookNo) === normalized) || null;
}

export function formatChurchKorVerseId({ bookNo, book, chapterNo, verseNo }) {
  const meta = findBibleBookMeta(book) || findBibleBookMetaByNo(bookNo);
  const churchKor = String(meta?.churchKor || '').trim();

  if (churchKor) {
    return `${churchKor}${chapterNo}:${verseNo}`;
  }

  return `${bookNo}:${chapterNo}:${verseNo}`;
}

export function normalizeVerseId({ verseId, bookNo, book, chapterNo, verseNo }) {
  const normalized = String(verseId || '').trim();

  if (normalized && !/^\d+:\d+:\d+$/.test(normalized)) {
    return normalized;
  }

  return formatChurchKorVerseId({ bookNo, book, chapterNo, verseNo });
}
