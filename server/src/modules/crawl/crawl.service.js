import { execFile } from 'child_process';
import fs from 'fs';
import { env } from '../../config/env.js';

function appError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

// stdout 문자열에서 payload JSON 을 추출한다.
// index.js 는 `console.log(JSON.stringify(payload, null, 2))` 로 출력하고,
// 스크레이퍼의 잡음은 console.warn(=stderr) 이라 stdout 은 보통 순수 JSON 이다.
// 혹시 앞뒤에 다른 로그가 섞여도 처음 '{' ~ 마지막 '}' 구간을 파싱한다.
function parsePayload(stdout) {
  const text = String(stdout || '').trim();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(text.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

// CrawlingBooks 프로젝트에서 `node src/index.js detailByItemid <itemId>` 를 실행해
// 알라딘 상세를 (재)수집하고 Reading.books 에 저장한 뒤 결과 payload 를 돌려준다.
export async function crawlDetailByItemId(itemId) {
  const id = String(itemId || '').trim();
  if (!/^\d+$/.test(id)) {
    throw appError('유효한 itemId(숫자)가 필요합니다.', 400);
  }

  const cwd = env.crawlingBooksDir;
  if (!fs.existsSync(cwd)) {
    throw appError(`크롤러 경로를 찾을 수 없습니다: ${cwd}`, 500);
  }

  // 크롤러는 playwright 로 페이지를 여므로 시간이 걸린다. 넉넉히 대기한다.
  const { stdout } = await new Promise((resolve, reject) => {
    execFile(
      process.execPath,
      ['src/index.js', 'detailByItemid', id],
      { cwd, timeout: 120000, maxBuffer: 1024 * 1024 * 20, windowsHide: true },
      (error, stdout, stderr) => {
        if (error) {
          const detail = (stderr || error.message || '').toString().trim().slice(-500);
          reject(appError(`크롤링 실행 실패: ${detail}`, 500));
          return;
        }
        resolve({ stdout, stderr });
      },
    );
  });

  const payload = parsePayload(stdout);
  return { ok: true, itemId: id, ...(payload ? { result: payload } : { raw: String(stdout).slice(-2000) }) };
}
