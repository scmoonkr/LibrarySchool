<script setup lang="ts">
// 1순위는 백엔드에서 관리하는 footer 메뉴(/backend/menus), 없으면 코드에 박아 둔
// useSiteMenus 목록으로 폴백한다. 헤더(useThemeNavItems)와 같은 규칙이다.
const cmsNav = useSiteNav('footer');
const { mainMenus } = useSiteMenus();

// 푸터는 한 줄짜리 링크 띠라 최상위 항목만, URL 이 있는 것만 건다.
const footerLinks = computed(() => {
  const cms = cmsNav.value;
  if (cms.length) {
    return cms
      .filter((it) => !it.isHeader && it.to && it.to !== '#')
      .map((it) => ({ label: it.label, to: it.to, target: it.target }));
  }
  // 코드 정의 폴백: 최상위 항목에 URL 이 없으면(드롭다운 전용) 그 하위를 대신 편다.
  // 그대로 두면 to='' 인 항목이 아무 데도 가지 않는 링크로 남는다.
  return mainMenus.flatMap((m) => (
    m.to
      ? [{ label: m.label, to: m.to }]
      : (m.children ?? []).map((c) => ({ label: c.label, to: c.to }))
  )).map((m) => ({ ...m, target: undefined as 'self' | 'blank' | undefined }));
});

const year = new Date().getFullYear();
</script>

<template>
  <footer class="site-footer">
    <!-- 바깥은 배경/구분선용 전체 폭, 안쪽만 본문과 같은 폭으로 맞춘다. -->
    <div class="site-footer-inner">
      <div class="site-footer-brand">
        <NuxtLink to="/" aria-label="도서관학교 홈">
          <img src="/Images/libraryschool_logo.png" alt="LibrarySchool" />
        </NuxtLink>
      </div>

      <nav class="site-footer-nav">
        <NuxtLink
          v-for="menu in footerLinks"
          :key="menu.label"
          class="site-footer-link"
          :to="menu.to"
          :target="menu.target === 'blank' ? '_blank' : undefined"
          :rel="menu.target === 'blank' ? 'noopener' : undefined"
        >
          {{ menu.label }}
        </NuxtLink>
      </nav>

      <p class="site-footer-copy">© {{ year }} 도서관학교 · 1분 성경</p>
    </div>
  </footer>
</template>
