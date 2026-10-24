import { Router } from 'express';
import { crawlDetail } from './crawl.controller.js';

// POST /api/crawl/detail — 알라딘 상세를 (재)수집해 Reading.books 에 저장한다.
const router = Router();

router.post('/detail', crawlDetail);

export default router;
