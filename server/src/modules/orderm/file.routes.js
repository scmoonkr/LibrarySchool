import { Router } from 'express';
import { serveUploadFile } from './file.controller.js';

// 업로드 파일 서빙: GET /api/file/<상대경로>
// 예: /api/file/orderm/mtm9avyz-b07e9u.pdf → UPLOAD_DIR/orderm/mtm9avyz-b07e9u.pdf
const router = Router();

router.get('/*', serveUploadFile);

export default router;
