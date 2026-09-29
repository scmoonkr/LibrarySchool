import { Router } from 'express';
import { contentsCid, contentsPreview, createContents, pushDreamer } from './dreamer.controller.js';

// 주문관리 - Dreamer 연동(Dreamer.cybOrder). 정가조회 결과 전송.
const router = Router();

router.post('/', pushDreamer);
router.post('/contents-cid', contentsCid);
router.post('/contents-preview', contentsPreview);
router.post('/contents', createContents);

export default router;
