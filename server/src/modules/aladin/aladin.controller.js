import { getBookInfoByIsbn } from './aladin.service.js';

// GET /api/aladin/:isbn
// Reading.books 에서 ISBN 으로 조회해 BookInfo 형식 JSON 을 그대로 내보낸다.
// (C# BookInfo 로 역직렬화할 수 있도록 래핑 없이 객체를 반환한다.)
export async function fetchBookInfo(req, res, next) {
  try {
    const data = await getBookInfoByIsbn(req.params.isbn);
    return res.json(data);
  } catch (error) {
    return next(error);
  }
}
