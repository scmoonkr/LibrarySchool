import { BACKEND_MIN_ROLE, hasRole } from '@shared/roles.js';

type CmsUser = { id: string; name?: string; roles?: Array<{ role: string }> } | null;

// 백엔드(/backend/**) 접근 가드.
//
// 1) 성경 앱 로그인 여부 확인 (필요하면 refresh 로 갱신 시도)
// 2) CMS 역할이 manager 이상인지 확인
//
// 역할은 서버에서 판정한 값을 그대로 쓴다. /api/cms/auth/me 는 session-bridge 가
// 붙여준 세션으로 users 문서를 찾아 normalizeRoles() 를 거친 roles 를 돌려준다.
// 클라이언트 판정은 UI 를 위한 것이고, 실제 차단은 서버가 매 요청마다 한다.
export default defineNuxtRouteMiddleware(async (to) => {
  const auth = useAuth();
  auth.syncSession();

  if (!auth.token.value && auth.refreshToken.value) {
    try {
      await auth.refreshSession();
    } catch {
      return navigateTo(`/login?redirect=${encodeURIComponent(to.fullPath)}`);
    }
  }

  if (!auth.token.value) {
    return navigateTo(`/login?redirect=${encodeURIComponent(to.fullPath)}`);
  }

  const apiBase = useApiBase();
  let user: CmsUser = null;

  try {
    const res = await $fetch<{ user: CmsUser }>(`${apiBase}/api/cms/auth/me`, {
      credentials: 'include',
      headers: { Authorization: `Bearer ${auth.token.value}` },
    });
    user = res.user;
  } catch {
    return navigateTo(`/login?redirect=${encodeURIComponent(to.fullPath)}`);
  }

  // 토큰은 살아 있지만 서버가 사용자를 못 찾은 경우(탈퇴/비활성 등)
  if (!user) {
    return navigateTo(`/login?redirect=${encodeURIComponent(to.fullPath)}`);
  }

  if (!hasRole(user.roles || [], BACKEND_MIN_ROLE)) {
    return abortNavigation({
      statusCode: 403,
      statusMessage: '백엔드는 manager 이상만 접근할 수 있습니다.',
    });
  }
});
