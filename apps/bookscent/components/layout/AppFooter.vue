<script setup lang="ts">
// 헤더와 같은 메뉴를 쓴다(useSiteMenus).
const { mainMenus } = useSiteMenus();

const year = new Date().getFullYear();
</script>

<template>
  <footer class="site-footer">
    <!-- 바깥은 배경/구분선용 전체 폭, 안쪽만 본문과 같은 폭으로 맞춘다. -->
    <div class="site-footer-inner">
      <div class="site-footer-brand">
        <NuxtLink to="/" aria-label="모줄성 홈">
          <img src="/Images/mojulseong_logo.png" alt="모줄성" />
        </NuxtLink>
      </div>

      <nav class="site-footer-nav">
        <NuxtLink v-for="menu in mainMenus" :key="menu.label" class="site-footer-link" :to="menu.to">
          {{ menu.label }}
        </NuxtLink>
      </nav>

      <p class="site-footer-copy">© {{ year }} 모줄성 · 1분 성경</p>
    </div>
  </footer>
</template>
