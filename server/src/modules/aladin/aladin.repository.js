import { getReadingDatabase } from '../../config/db.js';
import { env } from '../../config/env.js';

// 외부 도서 DB(Reading.books)에서 ISBN 정확일치 1건 조회. 전체 문서를 돌려준다.
export async function findBookByIsbn(isbn) {
  const code = String(isbn || '').trim();
  if (!code) return null;
  return getReadingDatabase()
    .collection(env.booksCollection)
    .findOne({ isbn: code });
}
