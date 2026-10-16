import { execFile } from 'child_process';
import fs from 'fs';
import { env } from '../../config/env.js';

function appError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

// stdout 문자열에서 payload JSON 을 추출한다.
// index.js 는 `console.log(JSON.stringify(payload, null, 2))` 로 payload 를 출력하는데,
// dotenv v17 배너([dotenv@..] injecting env … tip: …{ debug: true })가 stdout 에 섞이고
// 그 tip 에 중괄호가 들어가 단순 '{'~'}' 추출이 깨질 수 있다.
// payload 는 줄 맨 앞에서 '{' 로 시작하므로, 줄 시작 '{' 부터 마지막 '}' 까지를 파싱한다.
function parsePayload(stdout) {
  const text = String(stdout || '').trim();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    // 줄 맨 앞의 '{' (= pretty-print payload 시작) 들을 뒤에서부터 시도.
    const starts = [];
    const re = /^\{/gm;
    let m;
    while ((m = re.exec(text)) !== null) starts.push(m.index);
    const end = text.lastIndexOf('}');
    for (let i = starts.length - 1; i >= 0; i -= 1) {
      const s = starts[i];
      if (end <= s) continue;
      try {
        return JSON.parse(text.slice(s, end + 1));
      } catch {
        /* 다음 후보 시도 */
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
  // DOTENV_CONFIG_QUIET: 자식 프로세스의 dotenv 배너를 꺼 stdout 을 순수 JSON 으로 유지.
  const { stdout } = await new Promise((resolve, reject) => {
    execFile(
      process.execPath,
      ['src/index.js', 'detailByItemid', id],
      {
        cwd,
        timeout: 240000,
        maxBuffer: 1024 * 1024 * 20,
        windowsHide: true,
        env: { ...process.env, DOTENV_CONFIG_QUIET: 'true' },
      },
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
