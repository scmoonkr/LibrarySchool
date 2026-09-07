import path from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import { getConfig } from '../cms/config.mjs';

// 사업자등록증 업로드 허용 타입: 이미지 + PDF.
const ALLOWED_MIME = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
};

const MAX_BYTES = 20 * 1024 * 1024; // 20MB

function appError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

async function readRawBody(req, maxBytes) {
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > maxBytes) {
      throw appError('파일이 너무 큽니다. (최대 20MB)', 413);
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

function getBoundary(contentType) {
  if (!contentType) return null;
  const m = contentType.match(/;\s*boundary=(?:"([^"]*)"|([^\s;]*))/i);
  return m?.[1] || m?.[2] || null;
}

// 첫 번째 파일 파트만 뽑는다(단일 업로드).
function parseFirstFilePart(body, boundary) {
  const boundaryBuf = Buffer.from(`\r\n--${boundary}`);
  const startBuf = Buffer.from(`--${boundary}\r\n`);

  let pos = body.indexOf(startBuf);
  if (pos === -1) return null;
  pos += startBuf.length;

  while (pos < body.length) {
    const headerEnd = body.indexOf(Buffer.from('\r\n\r\n'), pos);
    if (headerEnd === -1) break;

    const headerText = body.slice(pos, headerEnd).toString('utf8');
    pos = headerEnd + 4;

    const next = body.indexOf(boundaryBuf, pos);
    if (next === -1) break;

    const data = body.slice(pos, next);
    pos = next + boundaryBuf.length;

    const headers = {};
    for (const line of headerText.split('\r\n')) {
      const ci = line.indexOf(':');
      if (ci === -1) continue;
      headers[line.slice(0, ci).trim().toLowerCase()] = line.slice(ci + 1).trim();
    }

    const disp = headers['content-disposition'] || '';
    const filenameM = disp.match(/;\s*filename="([^"]*)"/);
    if (filenameM && data.length > 0) {
      return {
        filename: filenameM[1],
        contentType: (headers['content-type'] || '').split(';')[0].trim(),
        data,
      };
    }

    if (body[pos] === 0x2d && body[pos + 1] === 0x2d) break;
    if (body[pos] === 0x0d && body[pos + 1] === 0x0a) pos += 2;
    else break;
  }

  return null;
}

// Express req(멀티파트)를 받아 파일을 저장하고 { url, filename, mimeType, size } 를 돌려준다.
export async function saveUploadedFile(req) {
  const boundary = getBoundary(req.headers['content-type'] || '');
  if (!boundary) {
    throw appError('multipart/form-data 형식이 아닙니다.', 400);
  }

  const body = await readRawBody(req, MAX_BYTES);
  const part = parseFirstFilePart(body, boundary);
  if (!part) {
    throw appError('업로드할 파일이 없습니다.', 400);
  }

  const ext = ALLOWED_MIME[part.contentType];
  if (!ext) {
    throw appError('이미지(JPG/PNG/GIF/WEBP) 또는 PDF 파일만 업로드할 수 있습니다.', 415);
  }

  const { uploadDir } = getConfig();
  const dir = path.resolve(uploadDir, 'orderm');
  await mkdir(dir, { recursive: true });

  const uid = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const filename = `${uid}${ext}`;
  await writeFile(path.resolve(dir, filename), part.data);

  // DB 에는 uploadDir 기준 상대경로(orderm/<파일명>)만 저장한다.
  // 실제 서빙 URL('/uploads/orderm/...')은 화면에서 붙인다.
  const relPath = `orderm/${filename}`;
  return {
    url: relPath,
    filename: part.filename,
    mimeType: part.contentType,
    size: part.data.length,
  };
}
