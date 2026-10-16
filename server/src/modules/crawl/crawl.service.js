import { fetchBookDetail } from './aladin.js';
import { saveBookDetail } from './store.js';

function appError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

// 서버 안에서 직접(외부 CrawlingBooks 프로세스 없이) 알라딘 상세를 수집해
// Reading.books 에 (재)저장하고 결과를 돌려준다.
// 수집기는 fetch + cheerio 만 쓰므로 브라우저(playwright/puppeteer)가 필요 없다.
export async function crawlDetailByItemId(itemId) {
  const id = String(itemId || '').trim();
  if (!/^\d+$/.test(id)) {
    throw appError('유효한 itemId(숫자)가 필요합니다.', 400);
  }

  let item;
  try {
    item = await fetchBookDetail({ itemId: id });
  } catch (error) {
    throw appError(`크롤링 실패: ${error?.message || error}`, 502);
  }

  const db = await saveBookDetail(item);
  return {
    ok: true,
    itemId: id,
    result: {
      saved: true,
      db: {
        matchedCount: db.matchedCount ?? 0,
        modifiedCount: db.modifiedCount ?? 0,
        upsertedCount: db.upsertedCount ?? 0,
        upsertedId: db.upsertedId ?? null,
      },
      item,
    },
  };
}
