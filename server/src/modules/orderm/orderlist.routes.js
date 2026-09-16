import { Router } from 'express';
import {
  createItem,
  deleteItem,
  listItems,
  listPendingItems,
  renumberItems,
  saveBulkItems,
  savePurchaseItems,
  saveShippingItems,
  saveWarehousingItems,
  setStatusItems,
  updateItem,
} from './orderlist.controller.js';

// 주문관리 - 주문도서(order_list) API.
// PK 는 (orderNo, no) 복합키. no 는 같은 주문 내에서 증가한다.
// TODO(auth): 현재는 공개 라우트. 로그인/권한이 준비되면 세션 검사를 추가한다.
const router = Router();

router.get('/', listItems);
router.get('/pending', listPendingItems);
router.post('/', createItem);
router.post('/renumber', renumberItems);
router.post('/warehousing', saveWarehousingItems);
router.post('/purchase', savePurchaseItems);
router.post('/set-status', setStatusItems);
router.post('/shipping', saveShippingItems);
router.post('/bulk', saveBulkItems);
router.put('/:orderNo/:no', updateItem);
router.delete('/:orderNo/:no', deleteItem);

export default router;
