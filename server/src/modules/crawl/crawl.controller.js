import { crawlDetailByItemId } from './crawl.service.js';

// POST /api/crawl/detail  body: { itemId }
// 주문도서 drawer 의 "crawling" 버튼이 호출한다. CrawlingBooks 프로젝트에서
// detailByItemid 를 실행해 해당 상품의 상세를 다시 수집·저장한다.
export async function crawlDetail(req, res, next) {
  try {
    const { itemId } = req.body || {};
    const data = await crawlDetailByItemId(itemId);
    return res.json(data);
  } catch (error) {
    return next(error);
  }
}
