import path from 'node:path';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { getConfig } from '../cms/config.mjs';

// 업로드 파일 서빙(스트리밍). DB 에는 uploadDir 기준 상대경로(예: 'orderm/xxx.pdf')만
// 저장하고, 화면은 '/api/file/<상대경로>' 로 요청한다. 실제 파일은 UPLOAD_DIR
// (예: /backup/imageLibrarySchool) 아래에서 읽어 내려준다. nginx 정적 서빙에
// 의존하지 않으므로 업로드 저장 위치가 바뀌어도 /api 라우팅만으로 동작한다.
const MIME_TYPES = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.pdf': 'application/pdf',
};

export async function serveUploadFile(req, res, next) {
  try {
    const { uploadDir } = getConfig();
    // '/api/file/orderm/xxx.pdf' → req.params[0] = 'orderm/xxx.pdf'
    const sub = decodeURIComponent(String(req.params[0] || '')).replace(/^\/+/, '');

    const base = path.resolve(uploadDir);
    const full = path.resolve(base, sub);
    // 경로 탈출(../) 차단: 반드시 uploadDir 하위여야 한다.
    if (full !== base && !full.startsWith(base + path.sep)) {
      return res.status(403).json({ ok: false, message: 'Forbidden' });
    }

    const info = await stat(full).catch(() => null);
    if (!info || !info.isFile()) {
      return res.status(404).json({ ok: false, message: '파일을 찾을 수 없습니다.' });
    }

    const ext = path.extname(full).toLowerCase();
    res.setHeader('Content-Type', MIME_TYPES[ext] || 'application/octet-stream');
    res.setHeader('Content-Length', info.size);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    createReadStream(full).pipe(res);
    return undefined;
  } catch (error) {
    return next(error);
  }
}
