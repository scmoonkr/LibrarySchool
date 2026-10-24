<template>
  <div class="theme-default">
    <main class="board-shell">
      <header class="board-head">
        <p class="board-eyebrow">BOARD</p>
        <h1>{{ heading }}</h1>
        <p class="board-meta">
          {{ total }}개의 글
          <NuxtLink v-if="category || tag" to="/board" class="board-clear">· 전체 보기</NuxtLink>
        </p>
      </header>

      <p v-if="pending" class="board-state">불러오는 중...</p>
      <p v-else-if="!items.length" class="board-state">글이 없습니다.</p>

      <template v-else>
        <div class="board-table-wrap">
          <table class="board-table">
            <thead>
              <tr>
                <th class="bd-thumb">썸네일</th>
                <th>제목</th>
                <th class="bd-author">작성자</th>
                <th class="bd-terms">카테고리</th>
                <th class="bd-terms bd-tags">태그</th>
                <th class="bd-date">게시일</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in items" :key="item.id">
                <td class="bd-thumb">
                  <NuxtLink :to="`/post/${item.slug}`" class="bd-thumb-link">
                    <img v-if="item.thumbnailUrl" :src="item.thumbnailUrl" :alt="item.title" loading="lazy" />
                    <span v-else class="bd-thumb-empty">NO IMAGE</span>
                  </NuxtLink>
                </td>
                <td class="bd-title">
                  <NuxtLink :to="`/post/${item.slug}`">{{ item.title }}</NuxtLink>
                </td>
                <td class="bd-author">{{ item.author?.name || '-' }}</td>
                <td class="bd-terms">
                  <span v-if="!item.categories?.length">-</span>
                  <span v-else class="bd-chips">
                    <NuxtLink
                      v-for="c in item.categories"
                      :key="c.slug"
                      :to="`/board?category=${encodeURIComponent(c.slug)}`"
                      class="bd-chip"
                    >{{ c.name }}</NuxtLink>
                  </span>
                </td>
                <td class="bd-terms bd-tags">
                  <span v-if="!item.tags?.length">-</span>
                  <span v-else class="bd-chips">
                    <NuxtLink
                      v-for="t in item.tags"
                      :key="t.slug"
                      :to="`/board?tag=${encodeURIComponent(t.slug)}`"
                      class="bd-chip"
                    >#{{ t.name }}</NuxtLink>
                  </span>
                </td>
                <td class="bd-date mono">{{ formatDate(item.publishedAt) || '-' }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <nav v-if="totalPages > 1" class="board-pager">
          <NuxtLink :to="pageLink(page - 1)" :class="['board-pager-btn', { disabled: page <= 1 }]">←</NuxtLink>
          <span class="board-pager-now">{{ page }} / {{ totalPages }}</span>
          <NuxtLink :to="pageLink(page + 1)" :class="['board-pager-btn', { disabled: page >= totalPages }]">→</NuxtLink>
        </nav>
      </template>
    </main>
  </div>
</template>

<script setup lang="ts">
// 게시판 목록. 공개 글(post)을 표로 보여 준다.
//   /board                  전체
//   /board?category=<slug>  카테고리로 거르기
//   /board?tag=<slug>       태그로 거르기
//   /board?page=2           페이지 이동
// 데이터는 postList/board 블록과 같은 /api/public/post-cards 를 쓴다.
type Term = { name: string; slug: string }
type Post = {
  id: string
  title: string
  slug: string
  publishedAt: string | null
  thumbnailUrl: string
  author: { id: string; name: string; avatarUrl: string } | null
  categories?: Term[]
  tags?: Term[]
}

definePageMeta({ layout: 'content' })

const PAGE_SIZE = 20

const route = useRoute()
const apiBase = useApiBase()

const category = computed(() => String(route.query.category || '').trim())
const tag = computed(() => String(route.query.tag || '').trim())
const page = computed(() => Math.max(Number(route.query.page) || 1, 1))

const url = computed(() => {
  const p = new URLSearchParams()
  if (category.value) p.set('categories', category.value)
  if (tag.value) p.set('tags', tag.value)
  p.set('limit', String(PAGE_SIZE))
  p.set('skip', String((page.value - 1) * PAGE_SIZE))
  return `${apiBase}/api/public/post-cards?${p}`
})

// key 에 apiBase 를 넣지 않는다. 서버는 내부 오리진, 브라우저는 same-origin('')이라
// 값이 달라 hydration 때 SSR 페이로드를 버리고 빈 화면이 깜빡인다.
const { data, pending } = await useFetch<{ items: Post[]; total: number }>(url, {
  key: () => `board:${category.value}|${tag.value}|${page.value}`,
  default: () => ({ items: [], total: 0 }),
  watch: [category, tag, page],
})

const items = computed<Post[]>(() => data.value?.items ?? [])
const total = computed(() => data.value?.total ?? 0)
const totalPages = computed(() => Math.max(Math.ceil(total.value / PAGE_SIZE), 1))

// 거르고 있는 값은 목록에서 이름을 찾아 보여 준다. (슬러그만으로는 읽기 어렵다)
const heading = computed(() => {
  if (category.value) {
    const hit = items.value.flatMap(i => i.categories ?? []).find(c => c.slug === category.value)
    return hit?.name || decodeURIComponent(category.value)
  }
  if (tag.value) {
    const hit = items.value.flatMap(i => i.tags ?? []).find(t => t.slug === tag.value)
    return `#${hit?.name || decodeURIComponent(tag.value)}`
  }
  return '게시판'
})

function pageLink(n: number) {
  const q: Record<string, string> = {}
  if (category.value) q.category = category.value
  if (tag.value) q.tag = tag.value
  if (n > 1) q.page = String(n)
  return { path: '/board', query: q }
}

function formatDate(d: string | null) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

useHead(() => ({ title: `${heading.value} — 게시판` }))
</script>

<style scoped>
.board-shell {
  /* 카테고리/태그 목록과 같은 본문 폭 */
  width: min(1180px, calc(100vw - 2rem));
  margin: 0 auto;
  padding: 40px 0 80px;
}

.board-head {
  margin-bottom: 28px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--theme-line);
}
.board-eyebrow {
  margin: 0 0 6px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.16em;
  color: var(--theme-fg-faint);
}
.board-head h1 {
  margin: 0 0 8px;
}
.board-meta {
  margin: 0;
  font-size: 13px;
  color: var(--theme-fg-dim);
}
.board-clear {
  color: var(--theme-fg-dim);
  text-decoration: none;
}
.board-clear:hover {
  color: var(--theme-fg);
}

.board-state {
  padding: 60px 0;
  text-align: center;
  color: var(--theme-fg-faint);
  font-size: 14px;
}

.board-table-wrap {
  overflow-x: auto;
}
.board-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}
.board-table th,
.board-table td {
  padding: 12px 10px;
  border-bottom: 1px solid var(--theme-line);
  text-align: left;
  vertical-align: middle;
}
.board-table thead th {
  border-bottom: 1px solid var(--theme-fg-dim);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--theme-fg-dim);
  white-space: nowrap;
}

.bd-thumb {
  width: 92px;
}
.bd-thumb-link {
  display: block;
  width: 72px;
  height: 54px;
  overflow: hidden;
  background: var(--theme-bg-soft);
}
.bd-thumb-link img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.bd-thumb-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  font-size: 9px;
  letter-spacing: 0.08em;
  color: var(--theme-fg-faint);
}

.bd-title a {
  color: inherit;
  text-decoration: none;
  font-weight: 600;
}
.bd-title a:hover {
  color: var(--theme-accent, var(--theme-fg-dim));
}
.bd-author {
  width: 110px;
  white-space: nowrap;
  color: var(--theme-fg-dim);
  font-size: 13px;
}

.bd-terms {
  width: 170px;
}
.bd-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.bd-chip {
  display: inline-block;
  padding: 1px 8px;
  border-radius: 999px;
  background: var(--theme-bg-sunken);
  color: var(--theme-fg-dim);
  font-size: 12px;
  text-decoration: none;
  white-space: nowrap;
}
.bd-chip:hover {
  color: var(--theme-fg);
}

.bd-date {
  width: 110px;
  white-space: nowrap;
  color: var(--theme-fg-dim);
  font-size: 13px;
}

.board-pager {
  margin-top: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  font-size: 13px;
}
.board-pager-btn {
  padding: 6px 14px;
  border: 1px solid var(--theme-line);
  border-radius: 8px;
  color: var(--theme-fg);
  text-decoration: none;
}
.board-pager-btn.disabled {
  opacity: 0.35;
  pointer-events: none;
}
.board-pager-now {
  color: var(--theme-fg-dim);
}

@media (max-width: 720px) {
  .bd-author,
  .bd-tags {
    display: none;
  }
}
</style>
