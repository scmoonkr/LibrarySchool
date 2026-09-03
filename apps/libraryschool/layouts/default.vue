<script setup lang="ts">
// 사이트 공용 상단바를 InsureDesign top-header(DefaultThemeTopbar)로 통일한다.
// 메뉴 목록은 useThemeNavItems 로 사이트 공용 메뉴에서 변환해 넘긴다.
import DefaultThemeTopbar from '~/components/public/DefaultThemeTopbar.vue';
import AppFooter from '~/components/layout/AppFooter.vue';
import '~/assets/insure-theme.css';

const { navItems } = useThemeNavItems();
</script>

<template>
  <div class="app-shell">
    <DefaultThemeTopbar :items="navItems" />
    <main class="page-shell">
      <slot />
    </main>
    <AppFooter />
  </div>
</template>

<style>
/* DefaultThemeTopbar 는 position:fixed 라 문서 흐름에서 높이를 차지하지 않는다.
   본문이 상단바 아래에서 시작하도록 상단바 높이만큼 셸에 여백을 준다.
   (--theme-topbar-h 는 insure-theme.css 의 :root 에 정의돼 있다.) */
.app-shell {
  padding-top: var(--theme-topbar-h);
}
</style>
