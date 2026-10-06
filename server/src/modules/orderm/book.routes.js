import { Router } from 'express';
import { createBook, lookupBooks, searchBooks } from './book.controller.js';

// 주문관리 - 외부 도서(Reading.books) 검색 API. (검색은 읽기 전용, POST / 는 없을 때만 등록)
const router = Router();

router.get('/', searchBooks);
router.post('/', createBook);
router.post('/lookup', lookupBooks);

export default router;
