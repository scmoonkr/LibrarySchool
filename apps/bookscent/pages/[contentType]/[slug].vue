<template>
  <div class="theme-default">
    <!-- 맨 위가 대표 이미지(hero)이거나 배너면 shell 상단 패딩을 없애
         헤더 바로 아래에 붙인다. -->
    <main :class="['public-content-shell', `tpl-${template}`, {
      'public-content-shell-flush': (useBanner && showEyebrow) || (heroUrl && !useBanner),
    }]">
      <template v-if="content">
        <!-- Hero (basic/card layout only — banner templates use the title banner instead) -->
        <section v-if="heroUrl && !useBanner" class="public-content-hero">
          <img :src="heroUrl" :alt="content.title" />
        </section>

        <div class="public-content-main">
        <article :class="['public-content', { 'with-hero': heroUrl && !useBanner, 'is-page': useBanner }]">
          <!-- Banner templates: render meta as a Title Banner block (title + excerpt).
               When the author disables the eyebrow toggle, hide the whole banner section. -->
          <section
            v-if="useBanner && showEyebrow"
            :class="[
              'block-title',
              'public-content-page-banner',
              'block-title-align-center',
              'block-title-height-medium',
              `block-title-tc-${bannerTextColor}`,
            ]"
            :style="pageBannerStyle"
          >
            <div class="block-title-inner">
              <h1 class="block-title-title">{{ content.title }}</h1>
              <p v-if="content.summary" class="block-title-subtitle">{{ content.summary }}</p>
            </div>
          </section>

          <!-- Non-pages: magazine-style meta card with eyebrow + title + byline.
               When the author disables the eyebrow toggle, hide the whole header
               (and the summary line below it) so only the body blocks render —
               useful for "homepage"-style posts where the body provides its own title. -->
          <header v-else-if="showEyebrow" class="public-content-card">
            <!-- 제목 위에는 카테고리만 보여 준다. 카테고리가 없으면 줄 자체를 비운다.
                 (예전에는 POST / PAGE 같은 콘텐츠 타입을 대신 보여 줬다) -->
            <p v-if="categoryLabels.length" class="public-content-eyebrow">
              <template v-for="(c, i) in categoryLabels" :key="c.id">
                <NuxtLink :to="`/categories/${c.slug}`" class="public-content-eyebrow-link">{{ c.name }}</NuxtLink>
                <span v-if="i < categoryLabels.length - 1" class="public-content-eyebrow-sep">·</span>
              </template>
            </p>
            <h1>{{ content.title }}</h1>
            <p class="public-content-byline">
              <img v-if="author?.avatarUrl" :src="author.avatarUrl" :alt="author.name" class="public-content-avatar" />
              <span v-if="author?.name">{{ author.name }}</span>
              <span v-if="content.publishedAt">{{ formatRelativeDate(content.publishedAt) }}</span>
            </p>
          </header>

          <!-- summary is shown only for non-pages with eyebrow enabled
               (pages already have it as subtitle in the banner) -->
          <p v-if="!useBanner && showEyebrow && content.summary" class="public-content-summary">{{ content.summary }}</p>

          <BlockRenderer :blocks="content.blocks || []" :media-map="mediaMap" />

          <footer v-if="tagLabels.length" class="public-content-tags">
            <span class="public-content-tags-label">Tags</span>
            <ul>
              <li v-for="t in tagLabels" :key="t.id">
                <NuxtLink :to="`/tags/${t.slug}`">#{{ t.name }}</NuxtLink>
              </li>
            </ul>
          </footer>
        </article>

        <!-- Sidebar template: 카테고리 + 최근 글 위젯 -->
        <aside v-if="hasSidebar" class="public-content-sidebar">
          <div class="pcs-widget">
            <h3>카테고리</h3>
            <ul>
              <li v-for="c in sidebarCategories" :key="c.id">
                <NuxtLink :to="`/categories/${c.slug}`">{{ c.name }}</NuxtLink>
              </li>
            </ul>
          </div>
          <div class="pcs-widget">
            <h3>최근 글</h3>
            <ul>
              <li v-for="p in sidebarPosts" :key="p.id">
                <NuxtLink :to="`/post/${p.slug}`">{{ p.title }}</NuxtLink>
              </li>
            </ul>
          </div>
        </aside>
        </div>
      </template>

      <section v-else-if="locked" class="public-content-error">
        <h1>🔒</h1>
        <p v-if="lockedRequiresLogin">로그인이 필요한 콘텐츠입니다.</p>
        <p v-else>이 콘텐츠를 볼 권한이 없습니다.</p>
        <NuxtLink v-if="lockedRequiresLogin" to="/login">로그인 →</NuxtLink>
        <NuxtLink v-else to="/">← 홈으로</NuxtLink>
      </section>

      <section v-else-if="error" class="public-content-error">
        <h1>404</h1>
        <p>요청하신 콘텐츠를 찾을 수 없습니다.</p>
        <NuxtLink to="/">← 홈으로</NuxtLink>
      </section>
    </main>

    <DefaultThemeFooter :columns="footerColumns" :imprint="footerImprint" />
  </div>
</template>

<script setup lang="ts">
import DefaultThemeFooter from '~/components/public/DefaultThemeFooter.vue'
import BlockRenderer from '~/components/blocks/BlockRenderer.vue'

type Content = {
  id: string
  contentType: string
  title: string
  slug: string
  summary?: string
  blocks?: Array<{ type: string; props: Record<string, unknown> }>
  html?: string
  publishedAt?: string
  thumbnailImageId?: string | null
  meta?: Record<string, unknown> & { showEyebrow?: boolean }
}
type MediaInfo = { paths?: { original?: string }; title?: string; alt?: string }
type LabelRef = { id: string; name: string; slug: string }
type Author = { id: string; name: string; avatarUrl?: string } | null
type PublicResponse = {
  content?: Content
  mediaMap?: Record<string, MediaInfo>
  categoryLabels?: LabelRef[]
  tagLabels?: LabelRef[]
  author?: Author
  // Role-gated page/post the requester may not view.
  locked?: boolean
  accessLevel?: string
  requiresLogin?: boolean
}

definePageMeta({
  layout: 'content',
  validate(route) {
    return ['post', 'page', 'notice', 'gallery'].includes(String(route.params.contentType))
  },
})

const route = useRoute()
const apiBase = useApiBase()

const contentType = computed(() => String(route.params.contentType || ''))
const slug = computed(() => String(route.params.slug || ''))
const isPage = computed(() => contentType.value === 'page')

// ── Template layout (basic·narrow·wide·sidebar·backend) ──────────────────────
const VALID_TPL = ['basic', 'narrow', 'wide', 'sidebar', 'backend']
const template = computed(() => {
  const c = content.value as unknown as { template?: string; meta?: { template?: string } } | null
  const t = c?.template || c?.meta?.template
  if (t && VALID_TPL.includes(t)) return t
  return isPage.value ? 'narrow' : 'basic' // 미설정/구값 폴백
})
const useBanner = computed(() => template.value !== 'basic') // basic=카드 헤더, 그 외=배너
const hasSidebar = computed(() => template.value === 'sidebar')

const sidebarCategories = ref<{ id: string; name: string; slug: string }[]>([])
const sidebarPosts = ref<{ id: string; title: string; slug: string }[]>([])
onMounted(async () => {
  if (!hasSidebar.value) return
  try {
    const [cats, posts] = await Promise.all([
      $fetch<{ items: { id: string; name: string; slug: string }[] }>(`${apiBase}/api/public/categories`),
      $fetch<{ items: { id: string; title: string; slug: string }[] }>(`${apiBase}/api/public/post-cards?limit=5`),
    ])
    sidebarCategories.value = cats.items || []
    sidebarPosts.value = posts.items || []
  } catch { /* sidebar is decorative — ignore failures */ }
})

const url = computed(
  () => `${apiBase}/api/public/contents/${encodeURIComponent(slug.value)}?type=${encodeURIComponent(contentType.value)}`,
)

const { data, error } = await useFetch<PublicResponse>(url, {
  key: () => `public:${contentType.value}:${slug.value}`,
})

const content = computed(() => data.value?.content ?? null)
const locked = computed(() => data.value?.locked === true)
const lockedRequiresLogin = computed(() => data.value?.requiresLogin === true)
const mediaMap = computed(() => data.value?.mediaMap ?? {})
const categoryLabels = computed(() => data.value?.categoryLabels ?? [])
const tagLabels = computed(() => data.value?.tagLabels ?? [])
const author = computed(() => data.value?.author ?? null)

// Show the eyebrow unless the author explicitly turned it off; missing meta
// defaults to true so existing posts keep their eyebrow.
const showEyebrow = computed(() => content.value?.meta?.showEyebrow !== false)

const heroUrl = computed(() => {
  const id = content.value?.thumbnailImageId
  if (!id) return ''
  return mediaMap.value[String(id)]?.paths?.original || ''
})

const pageBannerStyle = computed(() => {
  const s: Record<string, string> = {}
  if (heroUrl.value) s.backgroundImage = `url(${heroUrl.value})`
  return s
})

// Banner title/subtitle color from the themed palette (meta.bannerTextColor):
//   primary | primary-soft | secondary | secondary-soft | white | success | warning | error
// Legacy values map on: light→white, dark→primary, auto/missing→white-on-image else primary.
const BANNER_TC = ['primary', 'primary-soft', 'secondary', 'secondary-soft', 'white', 'success', 'warning', 'error']
const bannerTextColor = computed<string>(() => {
  const c = content.value?.meta?.bannerTextColor
  if (typeof c === 'string' && BANNER_TC.includes(c)) return c
  if (c === 'light') return 'white'
  if (c === 'dark') return 'primary'
  return heroUrl.value ? 'white' : 'primary'
})


// ── SEO (page/post) ──────────────────────────────────────────────────────────
const siteName = useSiteName()
const siteDesc = useSiteDescription()
const _runtime = useRuntimeConfig()
const siteUrl = computed(() => String(_runtime.public.siteUrl || '').replace(/\/$/, ''))

// Rewrite media/localhost origins onto the public site URL so crawlers get a
// reachable absolute image. External (cloud) URLs are kept as-is.
function toPublicUrl(raw: string): string {
  if (!raw) return ''
  if (raw.startsWith('/')) return `${siteUrl.value}${raw}`
  try {
    const u = new URL(raw)
    if (/^(localhost|127\.0\.0\.1)$/.test(u.hostname)) return `${siteUrl.value}${u.pathname}${u.search}`
    return raw
  } catch {
    return `${siteUrl.value}/${raw}`
  }
}

const seoDescription = computed(() =>
  (content.value?.summary || siteDesc.value || '').replace(/\s+/g, ' ').trim().slice(0, 200),
)
const canonicalUrl = computed(() =>
  content.value ? `${siteUrl.value}/${contentType.value}/${slug.value}` : siteUrl.value,
)
const ogImage = computed(() =>
  heroUrl.value ? toPublicUrl(heroUrl.value) : `${siteUrl.value}/default_logo.png`,
)
const seoKeywords = computed(() =>
  [...categoryLabels.value.map(c => c.name), ...tagLabels.value.map(t => t.name)].join(', '),
)

useHead(() => {
  const c = content.value
  if (!c) return { title: '404' }
  return {
    title: c.title,
    link: [{ rel: 'canonical', href: canonicalUrl.value }],
    meta: [
      { name: 'description', content: seoDescription.value },
      ...(seoKeywords.value ? [{ name: 'keywords', content: seoKeywords.value }] : []),
      { property: 'og:type', content: 'article' },
      { property: 'og:title', content: c.title },
      { property: 'og:description', content: seoDescription.value },
      { property: 'og:image', content: ogImage.value },
      { property: 'og:url', content: canonicalUrl.value },
      { property: 'og:site_name', content: siteName.value },
      ...(c.publishedAt ? [{ property: 'article:published_time', content: new Date(c.publishedAt).toISOString() }] : []),
      ...categoryLabels.value.map(cat => ({ property: 'article:section', content: cat.name })),
      ...tagLabels.value.map(t => ({ property: 'article:tag', content: t.name })),
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: c.title },
      { name: 'twitter:description', content: seoDescription.value },
      { name: 'twitter:image', content: ogImage.value },
    ],
  }
})


const _fallbackFooter = [
  { title: 'Template', body: '코드로 정의된 Template 안에서만 레이아웃이 결정됩니다.' },
  { title: 'StyleFamily', body: '색·타이포·여백은 미리 정의된 family 중에서 선택됩니다.' },
  { title: 'Blocks', body: 'Markdown 안의 허용된 Block 만으로 표현이 확장됩니다.' },
]
const _dynamicFooter = useSiteFooterColumns()
const footerColumns = computed(() => _dynamicFooter.value.length ? _dynamicFooter.value : _fallbackFooter)
const footerImprint = computed(() => `© 2026 ${siteName.value} · Template controlled · StyleFamily based`)

if (error.value) {
  throw createError({ statusCode: 404, statusMessage: 'Not found' })
}

</script>

<style scoped>
.public-content-shell {
  padding: 40px 24px 80px;
  max-width: 1200px;
  margin: 0 auto;
}

/* Pages: top banner sits flush against the topbar (no shell padding / no banner margin). */
.public-content-shell-flush {
  padding-top: 0;
}
.public-content-shell-flush .public-content {
  margin-top: 0;
}
.public-content-shell-flush .public-content > .block-title:first-child {
  margin-top: 0;
}

/* ── Template layouts (basic·narrow·wide·sidebar·backend) ──────────────
   모든 템플릿이 기본 shell 폭(1200px / 좌우 24px)을 그대로 쓴다.
   -> page(주로 wide) 와 post 의 본문 폭이 같아진다.
   wide/sidebar 는 아래에서 안쪽 읽기 칼럼(.public-content)의 폭 제한만 푼다. */
.tpl-backend {
  max-width: none;
  padding-left: var(--theme-pad-x);
  padding-right: var(--theme-pad-x);
}
/* wide/sidebar/backend: content fills instead of the narrow reading column */
.tpl-wide .public-content,
.tpl-sidebar .public-content,
.tpl-backend .public-content {
  max-width: none;
}
/* sidebar: article + right column */
.tpl-sidebar .public-content-main {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  gap: 48px;
  align-items: start;
}
.public-content-sidebar {
  display: flex;
  flex-direction: column;
  gap: 28px;
  position: sticky;
  top: calc(var(--theme-topbar-h, 64px) + 24px);
}
.pcs-widget h3 {
  margin: 0 0 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--theme-line);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--theme-fg-dim);
}
.pcs-widget ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.pcs-widget a { color: var(--theme-fg); text-decoration: none; font-size: 14px; line-height: 1.4; }
.pcs-widget a:hover { text-decoration: underline; }
@media (max-width: 900px) {
  .tpl-sidebar .public-content-main { grid-template-columns: 1fr; }
  .public-content-sidebar { position: static; }
}

/* ── Hero ── */
/* 대표 이미지(featured image)는 본문 폭이 아니라 화면 전체 폭으로 깐다.
   가운데 정렬된 부모(.public-content-shell / .public-content) 안에서
   좌우로 빠져나오게 하는 방법이다. .theme-default 에 overflow-x: hidden 이
   걸려 있어 스크롤바 폭으로 가로 스크롤이 생기지 않는다. */
.public-content-hero {
  position: relative;
  width: 100vw;
  margin-left: calc(50% - 50vw);
  margin-right: calc(50% - 50vw);
}
.public-content-hero img {
  display: block;
  width: 100%;
  height: 340px;
  object-fit: cover;
}

/* 배너 템플릿 page 는 대표 이미지가 배너 배경으로 들어간다. 같은 규격으로 맞춘다. */
.public-content-page-banner {
  width: 100vw;
  margin-left: calc(50% - 50vw);
  margin-right: calc(50% - 50vw);
}
.public-content-page-banner :deep(.block-title-inner) {
  min-height: 340px;
}

/* ── Article + meta card ── */
.public-content {
  max-width: 880px;
  margin: 0 auto;
}

.public-content-card {
  background: var(--theme-bg);
  padding: 28px 36px 24px;
  margin-bottom: 24px;
}

/* When a hero exists, the card overlaps the bottom of the hero, magazine-style. */
.public-content.with-hero .public-content-card {
  margin-top: -120px;
  position: relative;
  z-index: 1;
  box-shadow: 0 -1px 0 var(--theme-line), 0 12px 32px rgba(18, 24, 32, 0.04);
}

/* No hero: drop the card down a touch and put a top rule for visual anchor. */
.public-content:not(.with-hero) .public-content-card {
  padding-top: 0;
  padding-left: 0;
  padding-right: 0;
  border-bottom: 1px solid var(--theme-line);
  padding-bottom: 20px;
}

.public-content-eyebrow {
  margin: 0 0 10px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.22em;
  color: var(--theme-accent, var(--theme-fg-dim));
  text-transform: uppercase;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.public-content-eyebrow-link {
  color: #93b8d4;
  text-decoration: none;
  transition: color 0.15s ease;
}

.public-content-eyebrow-link:hover {
  color: #1a6eb8;
}

.public-content-eyebrow-sep {
  color: var(--theme-fg-faint);
}

.public-content-card h1 {
  margin: 0 0 12px;
  font-family: var(--theme-serif, var(--theme-sans));
  font-size: 36px;
  line-height: 1.18;
  letter-spacing: -0.01em;
  font-weight: 700;
}

.public-content-byline {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--theme-fg-dim);
}
.public-content-avatar {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  object-fit: cover;
  margin-right: 4px;
  flex-shrink: 0;
}
.public-content-byline span + span::before {
  content: ' · ';
  margin: 0 4px;
  color: var(--theme-fg-faint);
}

/* 요약(excerpt)은 본문 블록과 같은 좌우 위치(36px)에 두되,
   인용 블록(.block-quote)과 같은 계열의 박스로 보여 준다. */
.public-content-summary {
  margin: 0 36px 28px;
  padding: 24px 32px;
  border-left: 6px solid var(--theme-fg-mute);
  background: var(--theme-bg-sunken);
  font-size: 17px;
  font-style: italic;
  line-height: 1.9;
  color: var(--theme-fg);
}

.public-content :deep(.block-renderer) {
  padding: 0 36px;
}

/* ── Tags footer ── */
.public-content-tags {
  margin: 40px 36px 0;
  padding-top: 20px;
  border-top: 1px solid var(--theme-line);
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}
.public-content-tags-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--theme-fg-faint);
}
.public-content-tags ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.public-content-tags a {
  display: inline-flex;
  align-items: center;
  font-size: 12px;
  text-decoration: none;
  color: #93b8d4;
  transition: color 0.15s ease;
}
.public-content-tags a:hover {
  color: #1a6eb8;
}

/* ── 404 ── */
.public-content-error {
  max-width: 480px;
  margin: 0 auto;
  padding: 80px 24px;
  text-align: center;
}
.public-content-error h1 {
  font-size: 64px;
  margin: 0 0 12px;
  color: var(--theme-fg-faint);
}
.public-content-error p { margin: 0 0 16px; color: var(--theme-fg-dim); }
.public-content-error a { color: var(--theme-fg); text-decoration: underline; }

/* ── Mobile ── */
@media (max-width: 720px) {
  .public-content-shell {
    padding: 0 0 60px;
  }
  .public-content-hero img {
    aspect-ratio: 4 / 3;
  }
  .public-content-card {
    padding: 22px 20px 18px;
  }
  .public-content.with-hero .public-content-card {
    margin-top: -56px;
    margin-left: 16px;
    margin-right: 16px;
  }
  .public-content:not(.with-hero) .public-content-card {
    margin-left: 18px;
    margin-right: 18px;
  }
  .public-content-card h1 {
    font-size: 26px;
  }
  .public-content-summary {
    margin: 0 22px 20px;
    padding: 16px 18px;
    font-size: 15px;
    line-height: 1.75;
  }
  .public-content :deep(.block-renderer) {
    padding: 0 22px;
  }
  .public-content-tags {
    margin: 28px 22px 0;
  }
}
</style>
