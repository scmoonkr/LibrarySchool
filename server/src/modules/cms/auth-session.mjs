// CMS 세션 조회.
//
// 이 프로젝트에서는 사용자 시스템이 성경 앱과 통합돼 있다.
// CMS 는 더 이상 자체 소셜 로그인이나 세션 쿠키를 발급하지 않는다.
// session-bridge.js 미들웨어가 성경 앱 access token 을 검증해 req.cmsSession 을
// 채워두고, 여기서는 그 값을 읽기만 한다.
//
// 로그인/로그아웃은 성경 앱의 /api/auth/* 가 담당한다.
export function getAuthSession(req) {
  return req.cmsSession || null
}
