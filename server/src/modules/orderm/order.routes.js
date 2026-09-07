import { Router } from 'express';
import {
  createOrderItem,
  deleteOrderItem,
  generateQuote,
  generateStatement,
  listOrderItems,
  updateOrderItem,
} from './order.controller.js';

// 주문관리 - 주문(orders) API.
// TODO(auth): 현재는 공개 라우트. 로그인/권한(backend 미들웨어)이 준비되면
// 관리자 세션 검사를 추가한다.
const router = Router();

router.get('/', listOrderItems);
router.post('/', createOrderItem);
router.post('/:orderno/quote-pdf', generateQuote);
router.post('/:orderno/statement-pdf', generateStatement);
router.put('/:orderno', updateOrderItem);
router.delete('/:orderno', deleteOrderItem);

export default router;
