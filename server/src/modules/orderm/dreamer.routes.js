import { Router } from 'express';
import { pushDreamer } from './dreamer.controller.js';

// 주문관리 - Dreamer 연동(Dreamer.cybOrder). 정가조회 결과 전송.
const router = Router();

router.post('/', pushDreamer);

export default router;
