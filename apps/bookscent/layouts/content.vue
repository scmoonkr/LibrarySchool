<script setup lang="ts">
// CMS 공개 콘텐츠(/post/:slug, /page/:slug, /categories/:slug) 레이아웃.
//
// 상단바는 /read 등 사이트 나머지와 같은 AppHeader 를 쓰고,
// 본문 스타일에 필요한 insure-theme.css 는 여기서만 불러온다.
//
// 본문 폭은 각 페이지가 자체 컨테이너(.public-content-shell / .category-shell)로
// 잡으므로 default.vue 와 달리 .page-shell 로 감싸지 않는다.
import AppHeader from '~/components/layout/AppHeader.vue';
import '~/assets/insure-theme.css';
</script>

<template>
  <div class="app-shell">
    <AppHeader />
    <slot />
  </div>
</template>

<style>
/* 테마는 상단바가 position:fixed 인 것을 전제로 .theme-default 에
   padding-top: var(--theme-topbar-h)(68px) 을 넣어 자리를 비워 둔다.
   이 저장소의 AppHeader 는 sticky 라 이미 문서 흐름에서 자기 높이를 차지하므로,
   그대로 두면 헤더 아래에 68px 짜리 빈 띠가 생긴다. */
/* .theme-default 한 개짜리 선택자로는 테마 규칙과 특이도가 같아
   CSS 로드 순서에 따라 적용 여부가 갈린다. 부모를 함께 지정해 확정한다. */
.app-shell > .theme-default {
  padding-top: 0;
}

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
