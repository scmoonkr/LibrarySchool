<template>
  <div class="theme-default">
    <main class="category-shell">
      <template v-if="category">
        <header class="category-head">
          <h1>{{ category.name }}</h1>
          <div class="category-meta-row">
            <p class="category-meta">{{ total }}개의 글</p>
            <NuxtLink v-if="isAdmin" to="/backend/posts/new" class="category-new">등록</NuxtLink>
          </div>
        </header>

        <section v-if="items.length" class="category-grid">
          <NuxtLink
            v-for="item in items"
            :key="item.id"
            :to="`/${item.contentType}/${item.slug}`"
            class="category-card"
          >
            <div class="category-card-image">
              <img
                v-if="thumbUrl(item)"
                :src="thumbUrl(item)"
                :alt="item.title"
                loading="lazy"
              />
              <div v-else class="category-card-image-placeholder">
                <span>NO IMAGE</span>
              </div>
            </div>
            <div class="category-card-body">
              <!-- Categories above title -->
              <p v-if="item.categoryLabels?.length" class="category-card-cats">
                <NuxtLink
                  v-for="c in item.categoryLabels"
                  :key="c.id"
                  :to="`/categories/${c.slug}`"
                  class="category-card-label"
                  @click.prevent.stop="navigateTo(`/categories/${c.slug}`)"
                >{{ c.name }}</NuxtLink>
              </p>
              <h2 class="category-card-title">{{ item.title }}</h2>
              <p class="category-card-meta">
                <img
                  v-if="author(item)?.avatarUrl"
                  :src="author(item).avatarUrl"
                  :alt="author(item).name"
                  class="category-card-avatar"
                />
                <span v-if="author(item)?.name">{{ author(item).name }}</span>
                <span v-if="item.publishedAt">{{ formatRelativeDate(item.publishedAt) }}</span>
              </p>
              <p v-if="item.summary" class="category-card-excerpt">{{ item.summary }}</p>
              <!-- Tags below excerpt -->
              <div v-if="item.tagLabels?.length" class="category-card-tags">
                <NuxtLink
                  v-for="t in item.tagLabels"
                  :key="t.id"
                  :to="`/tags/${t.slug}`"
                  class="category-card-tag"
                  @click.prevent.stop="navigateTo(`/tags/${t.slug}`)"
                >#{{ t.name }}</NuxtLink>
              </div>
            </div>
          </NuxtLink>
        </section>

        <section v-else class="category-empty">
          <p>이 카테고리에 등록된 글이 없습니다.</p>
          <NuxtLink to="/">← 홈으로</NuxtLink>
        </section>
      </template>

      <section v-else-if="error" class="category-empty">
        <h1>404</h1>
        <p>요청하신 카테고리를 찾을 수 없습니다.</p>
        <NuxtLink to="/">← 홈으로</NuxtLink>
      </section>
    </main>

    <!-- 백엔드 footer 메뉴도 없고 코드 폴백(_fallbackFooter)도 비어 있으면
         빈 푸터 틀만 남으므로 아예 렌더하지 않는다. -->
    <DefaultThemeFooter
      v-if="footerColumns.length"
      :columns="footerColumns"
      :imprint="footerImprint"
    />
  </div>
</template>

<script setup lang="ts">
import DefaultThemeFooter from '~/components/public/DefaultThemeFooter.vue'

type Category = { id: string; name: string; slug: string }
type LabelRef = { id: string; name: string; slug: string }
type MediaInfo = { paths?: { original?: string }; title?: string; alt?: string }
type AuthorInfo = { id: string; name: string; avatarUrl?: string }
type Item = {
  id: string
  title: string
  slug: string
  summary: string
  contentType: string
  publishedAt?: string
  thumbnailImageId?: string | null
  authorId?: string | null
  meta?: { featured?: boolean }
  categoryLabels?: LabelRef[]
  tagLabels?: LabelRef[]
}
type Response = {
  category: Category
  items: Item[]
  total: number
  mediaMap: Record<string, MediaInfo>
  authorMap: Record<string, AuthorInfo>
}

definePageMeta({
  layout: 'content',
  // 메뉴가 /categories?category=<슬러그> 로도 보내므로 그 경로도 이 페이지가 받는다.
  // alias 로 들어오면 params 가 비어서 아래 slug 가 query 로 폴백한다.
  alias: ['/categories'],
})

const route = useRoute()
const apiBase = useApiBase()

// 등록 버튼은 admin 이상에게만 보인다. (super 도 통과)
// 로그인 정보는 클라이언트에서만 받아오므로 버튼도 hydration 뒤에 나타난다.
const { hasAccess, fetchUser } = useBlockAuth()
const isAdmin = computed(() => hasAccess('admin'))
onMounted(fetchUser)

const slug = computed(() => String(route.params.slug || route.query.category || ''))
const url = computed(
  () => `${apiBase}/api/public/categories/${encodeURIComponent(slug.value)}?type=post`,
)

const { data, error } = await useFetch<Response>(url, {
  key: () => `category:${slug.value}`,
})

const category = computed(() => data.value?.category ?? null)
const items = computed<Item[]>(() => data.value?.items ?? [])
const total = computed(() => data.value?.total ?? 0)
const mediaMap = computed(() => data.value?.mediaMap ?? {})
const authorMap = computed(() => data.value?.authorMap ?? {})

function thumbUrl(item: Item): string {
  if (!item.thumbnailImageId) return ''
  return mediaMap.value[item.thumbnailImageId]?.paths?.original || ''
}

function author(item: Item): AuthorInfo | null {
  if (!item.authorId) return null
  return authorMap.value[item.authorId] ?? null
}

useHead(() => ({
  title: category.value ? `${category.value.name} — Category` : '404',
}))


const _fallbackFooter = [
  // { title: 'Template', body: '코드로 정의된 Template 안에서만 레이아웃이 결정됩니다.' },
  // { title: 'StyleFamily', body: '색·타이포·여백은 미리 정의된 family 중에서 선택됩니다.' },
  // { title: 'Blocks', body: 'Markdown 안의 허용된 Block 만으로 표현이 확장됩니다.' },
]
const _dynamicFooter = useSiteFooterColumns()
const footerColumns = computed(() => _dynamicFooter.value.length ? _dynamicFooter.value : _fallbackFooter)
const siteName = useSiteName()
const footerImprint = computed(() => `© 2026 ${siteName.value} · Template controlled · StyleFamily based`)

if (error.value) {
  throw createError({ statusCode: 404, statusMessage: 'Not found' })
}

</script>

<style scoped>
.category-shell {
  /* read(.page-shell)와 동일한 본문 폭으로 맞춘다. */
  width: min(1180px, calc(100vw - 2rem));
  max-width: none;
  margin: 0 auto;
  padding: 40px 0 80px;
}

/* ── Header ── */
.category-head {
  margin-bottom: 36px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--theme-line);
}
.category-meta-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.category-new {
  flex: none;
  padding: 6px 18px;
  border: 1px solid var(--theme-fg);
  background: var(--theme-fg);
  color: var(--theme-bg);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-decoration: none;
  white-space: nowrap;
}
.category-new:hover {
  opacity: 0.85;
}

.category-head h1 {
  margin: 0 0 8px;
  font-family: var(--theme-serif, var(--theme-sans));
  font-size: 40px;
  line-height: 1.15;
  letter-spacing: -0.01em;
  font-weight: 700;
}
.category-meta {
  margin: 0;
  font-size: 13px;
  color: var(--theme-fg-dim);
}

/* ── Card grid: 4 / 2 / 1 ── */
.category-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
}

@media (max-width: 1024px) {
  .category-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* ── Card ── */
.category-card {
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: var(--theme-bg);
  border: 1px solid var(--theme-line);
  text-decoration: none;
  color: inherit;
  transition: border-color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease;
  overflow: hidden;
}

.category-card:hover {
  border-color: var(--theme-fg-dim);
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(18, 24, 32, 0.08);
}

.category-card-image {
  position: relative;
  aspect-ratio: 16 / 9;
  background: var(--theme-bg-soft);
  overflow: hidden;
}
.category-card-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.category-card-image-placeholder {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  font-size: 11px;
  letter-spacing: 0.18em;
  color: var(--theme-fg-faint);
}

.category-card-body {
  padding: 14px 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
}

/* Categories above title */
.category-card-cats {
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.category-card-label {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #93b8d4;
  text-decoration: none;
  line-height: 1.4;
  transition: color 0.15s ease;
}
.category-card-label:hover {
  color: #1a6eb8;
}

.category-card-title {
  margin: 0;
  font-family: var(--theme-serif, var(--theme-sans));
  font-size: 15px;
  line-height: 1.35;
  letter-spacing: -0.005em;
  font-weight: 600;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.category-card-meta {
  display: flex;
  align-items: center;
  gap: 5px;
  margin: 0;
  font-size: 11px;
  color: var(--theme-fg-dim);
}
.category-card-meta span + span::before {
  content: '·';
  margin: 0 3px;
  color: var(--theme-fg-faint);
}
.category-card-avatar {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  object-fit: cover;
  margin-right: 3px;
  flex-shrink: 0;
}

.category-card-excerpt {
  margin: 0;
  font-size: 12px;
  line-height: 1.55;
  color: var(--theme-fg-dim);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Tags below excerpt */
.category-card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 2px;
}
.category-card-tag {
  font-size: 10px;
  color: #93b8d4;
  text-decoration: none;
  line-height: 1.5;
  transition: color 0.15s ease;
}
.category-card-tag:hover {
  color: #1a6eb8;
}

/* ── Empty / 404 ── */
.category-empty {
  max-width: 480px;
  margin: 0 auto;
  padding: 60px 24px;
  text-align: center;
  color: var(--theme-fg-dim);
}
.category-empty h1 {
  font-size: 56px;
  margin: 0 0 12px;
  color: var(--theme-fg-faint);
}
.category-empty a {
  color: var(--theme-fg);
  text-decoration: underline;
}

/* ── Mobile ── */
@media (max-width: 760px) {
  .category-shell {
    width: 100%;
    padding: 28px 0 60px;
  }
  .category-head h1 {
    font-size: 28px;
  }
  .category-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }
}
</style>
