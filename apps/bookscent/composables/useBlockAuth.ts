// 역할 등급표는 서버(CMS)와 공유하는 shared/roles.js 가 단일 원본이다.
// 'public' 은 등급표에 없고, 아래에서 `?? 0` 으로 0(비로그인)이 된다.
import { ROLE_LEVELS } from '@shared/roles.js'

type Role    = { role: string }
type MeUser  = { id: string; name?: string; roles?: Role[] } | null

export function useBlockAuth() {
  const apiBase = useApiBase()

  // 페이지 내 여러 블록이 각자 fetch하지 않도록 useState로 공유
  const user    = useState<MeUser>('block-auth-user',    () => null)
  const fetched = useState<boolean>('block-auth-fetched', () => false)
  const loading = useState<boolean>('block-auth-loading', () => false)

  async function fetchUser() {
    if (fetched.value || loading.value || import.meta.server) return
    loading.value = true
    try {
      const res = await $fetch<{ user: MeUser }>(`${apiBase}/api/cms/auth/me`, {
        credentials: 'include',
      })
      user.value = res.user ?? null
    } catch {
      user.value = null
    } finally {
      fetched.value = true
      loading.value = false
    }
  }

  const isLoggedIn = computed(() => !!user.value)

  // 보유한 가장 높은 역할 레벨
  const userLevel = computed((): number => {
    if (!user.value?.roles?.length) return 0
    return Math.max(...user.value.roles.map(r => ROLE_LEVELS[r.role] ?? 0))
  })

  function hasAccess(required?: string): boolean {
    if (!required || required === 'public') return true
    const need = ROLE_LEVELS[required] ?? 0
    if (need === 0) return true
    return userLevel.value >= need
  }

  return { user, isLoggedIn, userLevel, hasAccess, fetchUser, fetched, loading }
}
