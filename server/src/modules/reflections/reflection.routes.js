import { Router } from 'express';
import { createReflection, listReflectionItems, viewReflection } from './reflection.controller.js';

const router = Router();

router.get('/', listReflectionItems);
router.post('/', createReflection);
router.post('/:rid/view', viewReflection);

export default router;
