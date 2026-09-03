// 사용자 역할 등급. 서버(CMS)와 웹이 함께 쓰는 단일 원본이다.
//
// member < employee < manager < admin < super
//   super  : 부트스트랩/시스템용 우회 역할. 역할 UI 에는 노출하지 않는다.
//   admin  : 사용자 역할 관리까지 가능
//   manager: 백엔드(/backend/**) 접근 하한선
//   employee: 사내용 콘텐츠 열람 등급. 백엔드 관리 권한은 없다.
//   member : 소셜 로그인 기본 등급
//
// 'public' 은 로그인 없이 접근 가능하다는 뜻이라 등급표에 넣지 않는다.
// 조회 시 `ROLE_LEVELS[x] ?? 0` 로 다루면 0(비로그인)이 된다.
export const ROLE_LEVELS = { member: 1, employee: 2, manager: 3, admin: 4, super: 5 };

// 역할 관리 UI 에 노출하는 값들.
export const USER_ROLES = ['member', 'employee', 'manager', 'admin'];

// 백엔드 접근 하한선.
export const BACKEND_MIN_ROLE = 'manager';

// roles 는 [{ role: 'admin' }] 형태. 보유한 가장 높은 등급을 돌려준다.
export function roleLevel(roles = []) {
  if (!Array.isArray(roles) || roles.length === 0) return 0;
  return Math.max(0, ...roles.map((r) => ROLE_LEVELS[r?.role] ?? 0));
}

// 최소 등급 충족 여부. super 는 모든 검사를 통과한다.
export function hasRole(roles = [], minRole = 'member') {
  const minLevel = ROLE_LEVELS[minRole] || 1;
  return roles.some((r) => {
    if (r?.role === 'super') return true;
    return (ROLE_LEVELS[r?.role] || 0) >= minLevel;
  });
}

export function isSuperUser(roles = []) {
  return roles.some((r) => r?.role === 'super');
}
