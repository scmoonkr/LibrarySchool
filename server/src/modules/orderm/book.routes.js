import { Router } from 'express';
import { lookupBooks, searchBooks } from './book.controller.js';

// 주문관리 - 외부 도서(Reading.books) 검색 API. (읽기 전용)
const router = Router();

router.get('/', searchBooks);
router.post('/lookup', lookupBooks);

export default router;
