import { Router } from 'express';
import { fetchBookInfo } from './aladin.controller.js';

// GET /api/aladin/:isbn — Reading.books 를 ISBN 으로 조회해 BookInfo JSON 반환.
const router = Router();

router.get('/:isbn', fetchBookInfo);

export default router;
