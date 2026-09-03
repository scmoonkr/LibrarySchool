import { Router } from 'express';
import { createPaint, listPaints, removePaints } from './reading.controller.js';

const router = Router();

router.get('/', listPaints);
router.post('/', createPaint);
router.delete('/', removePaints);

export default router;
