<script setup lang="ts">
// CMS 공개 콘텐츠(/post/:slug, /page/:slug, /categories/:slug) 레이아웃.
//
// 상단바는 사이트 나머지와 같은 InsureDesign top-header(DefaultThemeTopbar)를 쓰고,
// 본문 스타일에 필요한 insure-theme.css 는 여기서만 불러온다.
//
// 본문 폭은 각 페이지가 자체 컨테이너(.public-content-shell / .category-shell)로
// 잡으므로 default.vue 와 달리 .page-shell 로 감싸지 않는다.
import DefaultThemeTopbar from '~/components/public/DefaultThemeTopbar.vue';
import '~/assets/insure-theme.css';

const { navItems } = useThemeNavItems();
</script>

<template>
  <div class="app-shell">
    <DefaultThemeTopbar :items="navItems" />
    <slot />
  </div>
</template>

<style>
/* 콘텐츠 페이지 루트(.theme-default)는 테마 기본값으로 상단바 높이(68px)만큼
   padding-top 을 가져, position:fixed 인 DefaultThemeTopbar 아래로 본문이 내려온다.
   그대로 두면 된다. */

/* insure-theme.css(원본 default-theme.css)는 원 프로젝트의 main.css 에 있던
   전역 리셋을 전제로 작성돼 있다. 그 main.css 는 이 저장소용이 아니라 가져오지
   않았는데, 아래 리셋이 빠지면 제목·문단마다 브라우저 기본 여백이 끼어들어
   본문 간격이 어긋난다. 사이트 나머지에 영향이 가지 않도록 .theme-default 안으로
   범위를 좁혀 되살린다. */
.theme-default h1,
.theme-default h2,
.theme-default p {
  margin: 0;
}

.theme-default h1 {
  font-size: clamp(30px, 4vw, 46px);
  line-height: 1.12;
}
</style>
