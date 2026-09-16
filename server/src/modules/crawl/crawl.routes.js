import { Router } from 'express';
import { crawlDetail } from './crawl.controller.js';

// POST /api/crawl/detail — CrawlingBooks 로 알라딘 상세를 (재)수집한다.
const router = Router();

router.post('/detail', crawlDetail);

export default router;
