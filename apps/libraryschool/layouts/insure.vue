<script setup lang="ts">
// OneMinuteBible 에서 가져온 화면 전용 레이아웃.
//
// 백엔드(/backend/**)와 공개 콘텐츠 페이지(/post/:slug, /categories/:slug 등)는
// 자체 상단바(DefaultThemeTopbar)와 푸터(DefaultThemeFooter)를 직접 렌더링하므로
// 사이트 공용 헤더(default.vue)를 씌우지 않는다.
//
// insure-theme.css 도 이 레이아웃에서만 불러와 성경 쪽 페이지에 실리지 않게 한다.
import '~/assets/insure-theme.css';
</script>

<template>
  <slot />
</template>
