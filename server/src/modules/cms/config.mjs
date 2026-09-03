// CMS 설정.
//
// 원본(InsureDesign api-server)은 독립 프로세스라 자체적으로 .env 를 파싱하고
// 포트·CORS·소셜 로그인 키를 들고 있었다. 이 프로젝트에서는 CMS 가 성경 앱 서버
// 안에 함께 올라가므로, 루트 .env 를 이미 읽어둔 config/env.js 를 그대로 쓴다.
//
// 소셜 로그인 관련 설정은 없다. 사용자 인증은 성경 앱(/api/auth/*)이 담당하고
// CMS 는 session-bridge.js 를 통해 그 세션을 넘겨받는다.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
// side-effect import: config/env.js 가 루트 .env 를 dotenv 로 읽어 process.env 를
// 채운다. 아래에서 process.env 를 참조하므로 로드 순서를 보장하려면 필요하다.
import '../../config/env.js';

// server/src/modules/cms -> server
const SERVER_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

// CMS 사용자 컬렉션.
//
// 성경 앱과 사용자 시스템을 통합했으므로 같은 'users' 컬렉션을 쓴다.
// roles 형식이 두 가지(['user'] / [{role:'admin'}])라 auth-service 의
// normalizeRoles() 가 CMS 쪽 형식으로 맞춰준다.
export const CMS_USERS_COLLECTION = 'users';

export function getConfig() {
  return {
    // 미디어 URL 앞에 붙는 오리진.
    // 웹과 API 가 같은 오리진(운영) 또는 프록시(개발)로 묶여 있으므로 기본은 빈 값이다.
    // 그래야 '/uploads/...' 상대경로가 그대로 유지된다.
    apiBase: (process.env.CMS_API_BASE_URL || '').replace(/\/$/, ''),

    // 업로드 파일 저장 위치 (.env 의 UPLOAD_DIR).
    // DB 의 media.paths.original 이 '/uploads/...' 이고 app.js 가 이 디렉터리를
    // /uploads 로 정적 서빙하므로, 두 값이 같은 곳을 가리켜야 이미지가 뜬다.
    // 미설정 시 cwd 가 아니라 server/uploads 로 고정한다.
    uploadDir: process.env.UPLOAD_DIR
      ? path.resolve(process.env.UPLOAD_DIR)
      : path.resolve(SERVER_ROOT, 'uploads'),

    // 보험 설계서 분석(/api/analysis/*)에서 쓰는 LLM 키.
    anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    openaiModel: process.env.OPENAI_MODEL || 'gpt-4o',

    // 개발용: true 면 로그인 없이 백엔드 접근 허용. 운영에서는 절대 켜지 말 것.
    authBypass: process.env.AUTH_BYPASS === 'true',
  };
}
