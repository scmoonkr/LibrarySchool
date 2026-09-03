import { Router } from 'express';
import {
  createCustomerItem,
  deleteCustomerItem,
  listCustomerItems,
  updateCustomerItem,
  uploadCustomerFile,
} from './customer.controller.js';

// 주문관리 - 거래처(customers) API.
// TODO(auth): 현재는 공개 라우트. 로그인/권한(backend 미들웨어)이 준비되면
// 관리자 세션 검사를 추가한다.
const router = Router();

// 사업자등록증 업로드(멀티파트)는 '/:id' 보다 먼저 둔다.
router.post('/upload', uploadCustomerFile);

router.get('/', listCustomerItems);
router.post('/', createCustomerItem);
router.put('/:id', updateCustomerItem);
router.delete('/:id', deleteCustomerItem);

export default router;
