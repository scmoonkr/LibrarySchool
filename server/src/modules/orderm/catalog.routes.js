import { Router } from 'express';
import {
  createCatalog,
  getCatalog,
  listCatalog,
  removeCatalog,
  updateCatalog,
} from './catalog.controller.js';

// 도서검색(Reading.books) 관리 API. (KRIN manager/books drawer 복제)
const router = Router();

router.get('/', listCatalog);
router.post('/', createCatalog);
router.get('/:id', getCatalog);
router.patch('/:id', updateCatalog);
router.delete('/:id', removeCatalog);

export default router;
