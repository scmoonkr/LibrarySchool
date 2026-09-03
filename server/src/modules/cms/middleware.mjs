import { getAuthSession } from './auth-session.mjs'
import { getUserById } from './auth-service.mjs'
import { getConfig } from './config.mjs'

// 역할 등급표는 웹과 공유하는 shared/roles.js 가 단일 원본이다.
// 기존 import 경로를 유지하기 위해 여기서 그대로 다시 내보낸다.
import { hasRole } from '../../../../shared/roles.js'
export { ROLE_LEVELS, USER_ROLES, hasRole, isSuperUser } from '../../../../shared/roles.js'

// TEMP(dev): synthetic super-user used when AUTH_BYPASS=true so the backend is
// reachable without login. Remove the bypass branches once login is restored.
const BYPASS_SESSION = {
  id: '000000000000000000000000',
  provider: 'dev',
  providerId: 'dev-bypass',
  name: '개발자(임시)',
  email: 'dev@local',
  avatarUrl: '',
}
const BYPASS_USER = { _id: BYPASS_SESSION.id, status: 'active', roles: [{ role: 'super' }], ...BYPASS_SESSION }

// Session-only check. Returns { ok, session } or { ok: false, status, message }.
export function checkSession(req) {
  const session = getAuthSession(req)
  if (session) return { ok: true, session }
  if (getConfig().authBypass) return { ok: true, session: BYPASS_SESSION }
  return { ok: false, status: 401, message: 'Unauthorized' }
}

// Full admin check: session + active status + role.
// Returns { ok, session, user } or { ok: false, status, message }.
export async function checkAdmin(req, minRole = 'viewer') {
  const session = getAuthSession(req)

  // TEMP(dev): with AUTH_BYPASS on, allow access — use the real user if logged
  // in, otherwise fall back to a synthetic super-user.
  if (getConfig().authBypass) {
    if (session) {
      const u = await getUserById(session.id)
      if (u && u.status === 'active') return { ok: true, session, user: u }
    }
    return { ok: true, session: BYPASS_SESSION, user: BYPASS_USER }
  }

  if (!session) return { ok: false, status: 401, message: 'Unauthorized' }

  const user = await getUserById(session.id)
  if (!user || user.status !== 'active') {
    return { ok: false, status: 401, message: 'Unauthorized' }
  }

  if (!hasRole(user.roles || [], minRole)) {
    return { ok: false, status: 403, message: 'Forbidden' }
  }

  return { ok: true, session, user }
}
