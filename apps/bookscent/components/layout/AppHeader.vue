<script setup lang="ts">
const route = useRoute();
const auth = useAuth();

const { mainMenus } = useSiteMenus();

const isAuthenticated = computed(() => Boolean(auth.currentUser.value?.userNo || auth.token.value));
const profileImage = computed(() => auth.currentUser.value?.profileImage?.trim() || '');

const accountMenuOpen = ref(false);
const mobileMenuOpen = ref(false);
// 현재 펼쳐진 하위 메뉴의 label. 빈 문자열이면 닫힌 상태.
const openSubmenu = ref('');
const navRef = ref<HTMLElement | null>(null);

function toggleSubmenu(label: string) {
  openSubmenu.value = openSubmenu.value === label ? '' : label;
}

// 상위 메뉴 자신이든 하위 메뉴든 하나라도 현재 경로면 활성 표시.
function isBranchActive(menu: SiteMenu) {
  return isMenuActive(menu.to) || (menu.children || []).some((child) => isMenuActive(child.to));
}

function handleDocumentClick(event: MouseEvent) {
  if (!openSubmenu.value) return;
  const target = event.target as Node | null;
  if (target && navRef.value?.contains(target)) return;
  openSubmenu.value = '';
}

onMounted(() => document.addEventListener('click', handleDocumentClick));
onBeforeUnmount(() => document.removeEventListener('click', handleDocumentClick));

function isMenuActive(path: string) {
  // 하위 메뉴만 가진 상위 항목은 자기 경로가 없다(to: '').
  // 이걸 걸러 두지 않으면 startsWith('/') 가 모든 경로에 걸려
  // 드롭다운 메뉴가 항상 선택된 것으로 보인다.
  if (!path) {
    return false;
  }

  if (path === '/') {
    return route.path === '/';
  }

  return route.path === path || route.path.startsWith(`${path}/`);
}

watch(
  () => route.fullPath,
  () => {
    accountMenuOpen.value = false;
    mobileMenuOpen.value = false;
    openSubmenu.value = '';
  },
);

async function handleLogout() {
  await auth.clearSession();
  accountMenuOpen.value = false;
  mobileMenuOpen.value = false;
  await navigateTo('/');
}
</script>

<template>
  <header class="site-header" :class="{ 'is-mobile-open': mobileMenuOpen }">
    <div class="site-header-inner">
      <div class="site-brand">
        <NuxtLink to="/" aria-label="모줄성 홈">
          <img src="/Images/mojulseong_logo.png" alt="모줄성" />
        </NuxtLink>
      </div>

      <button
        type="button"
        class="site-mobile-toggle"
        :aria-label="mobileMenuOpen ? '메뉴 닫기' : '메뉴 열기'"
        @click="mobileMenuOpen = !mobileMenuOpen"
      >
        <span v-if="!mobileMenuOpen">☰</span>
        <span v-else>✕</span>
      </button>

      <nav ref="navRef" class="site-nav">
        <template v-for="menu in mainMenus" :key="menu.label">
          <!-- 하위 메뉴가 있으면 버튼 + 드롭다운, 없으면 그냥 링크 -->
          <div v-if="menu.children?.length" class="site-nav-item">
            <button
              type="button"
              :class="['nav-link', 'nav-link-parent', { active: isBranchActive(menu), open: openSubmenu === menu.label }]"
              :aria-expanded="openSubmenu === menu.label"
              aria-haspopup="true"
              @click="toggleSubmenu(menu.label)"
            >
              {{ menu.label }}
              <i class="fa-solid fa-chevron-down site-nav-caret" aria-hidden="true"></i>
            </button>

            <div v-if="openSubmenu === menu.label" class="site-submenu">
              <NuxtLink
                v-for="child in menu.children"
                :key="child.label"
                :to="child.to"
                :class="['site-submenu-link', { active: isMenuActive(child.to) }]"
              >
                {{ child.label }}
              </NuxtLink>
            </div>
          </div>

          <NuxtLink
            v-else
            :to="menu.to"
            :class="['nav-link', { active: isMenuActive(menu.to) }]"
          >
            {{ menu.label }}
          </NuxtLink>
        </template>
      </nav>

      <nav class="site-account">
        <template v-if="isAuthenticated">
          <div class="site-account-menu">
            <button
              type="button"
              class="account-link account-trigger"
              aria-label="계정 메뉴"
              @click="accountMenuOpen = !accountMenuOpen"
            >
              <span class="account-link-avatar" aria-hidden="true">
                <img v-if="profileImage" :src="profileImage" alt="" />
                <i v-else class="fa-regular fa-user"></i>
              </span>
            </button>

            <div v-if="accountMenuOpen" class="account-dropdown">
              <NuxtLink class="account-dropdown-link" to="/account/profile">회원정보 수정</NuxtLink>
              <NuxtLink class="account-dropdown-link" to="/account">마이 페이지</NuxtLink>
              <button type="button" class="account-dropdown-link" @click="handleLogout">로그아웃</button>
            </div>
          </div>
        </template>

        <template v-else>
          <NuxtLink class="account-link" to="/login">로그인</NuxtLink>
        </template>
      </nav>

      <div v-if="mobileMenuOpen" class="site-mobile-panel">
        <nav class="site-mobile-nav">
          <template v-for="menu in mainMenus" :key="`mobile-${menu.label}`">
            <NuxtLink :to="menu.to" :class="['nav-link', { active: isMenuActive(menu.to) }]">
              {{ menu.label }}
            </NuxtLink>
            <!-- 좁은 화면에서는 드롭다운 대신 들여쓴 목록으로 바로 보여 준다. -->
            <NuxtLink
              v-for="child in menu.children || []"
              :key="`mobile-${menu.label}-${child.label}`"
              :to="child.to"
              :class="['nav-link', 'site-mobile-subnav-link', { active: isMenuActive(child.to) }]"
            >
              {{ child.label }}
            </NuxtLink>
          </template>
        </nav>

        <div class="site-mobile-account">
          <template v-if="isAuthenticated">
            <button
              type="button"
              class="account-link account-trigger"
              aria-label="계정 메뉴"
              @click="accountMenuOpen = !accountMenuOpen"
            >
              <span class="account-link-avatar" aria-hidden="true">
                <img v-if="profileImage" :src="profileImage" alt="" />
                <i v-else class="fa-regular fa-user"></i>
              </span>
            </button>

            <div v-if="accountMenuOpen" class="account-dropdown account-dropdown--mobile">
              <NuxtLink class="account-dropdown-link" to="/account/profile">회원정보 수정</NuxtLink>
              <NuxtLink class="account-dropdown-link" to="/account">마이 페이지</NuxtLink>
              <button type="button" class="account-dropdown-link" @click="handleLogout">로그아웃</button>
            </div>
          </template>

          <template v-else>
            <NuxtLink class="account-link" to="/login">로그인</NuxtLink>
          </template>
        </div>
      </div>
    </div>
  </header>
</template>
