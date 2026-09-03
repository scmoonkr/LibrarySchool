<template>
  <div class="theme-backend">
    <DefaultThemeTopbar
      :items="navItems"
      full-width
      backend-mode
      backend-menu-button
      hide-nav
      toolbar-title="Topical."
      @backend-menu-toggle="isSidebarOpen = !isSidebarOpen"
    />
    <div v-if="isSidebarOpen" class="theme-backend-menu-backdrop" @click="isSidebarOpen = false"></div>

    <div class="theme-backend-shell">
      <BackendSidebar :open="isSidebarOpen" current-key="topical" @close="isSidebarOpen = false" />

      <main class="theme-backend-main">
        <div class="theme-backend-head theme-backend-contents-head">
          <h1>BibleHub Topical.</h1>
          <div class="theme-backend-head-right">
            <input
              v-model.trim="query"
              type="search"
              class="topical-filter"
              placeholder="title 검색 (예: God)"
            />
          </div>
        </div>

        <!-- 첫 글자로 추리기. 수집된 글자만 버튼으로 만든다. -->
        <div class="topical-chars">
          <button
            type="button"
            :class="['topical-char', { active: !char }]"
            @click="char = ''"
          >All</button>
          <button
            v-for="c in chars"
            :key="c.char"
            type="button"
            :class="['topical-char', { active: char === c.char }]"
            :title="`${c.count.toLocaleString()}건`"
            @click="char = c.char"
          >{{ c.char.toUpperCase() }}</button>
        </div>

        <div v-if="pending" class="theme-backend-state">Loading...</div>

        <section v-else-if="!items.length" class="theme-backend-state">
          결과가 없습니다.
        </section>

        <section v-else class="theme-backend-table-wrap">
          <table class="theme-backend-table">
            <thead>
              <tr>
                <th>tid</th>
                <th>title</th>
                <th class="topical-num">contents</th>
                <th class="topical-num">subtopics</th>
                <th class="topical-num">related</th>
                <th class="topical-num">concordance</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in items"
                :key="row.tid"
                :class="{ current: drawerOpen && drawerTid === row.tid }"
                @click="openDetail(row)"
              >
                <td class="theme-meta">{{ row.tid }}</td>
                <td><strong>{{ row.title }}</strong></td>
                <td class="topical-num">{{ row.contentsCount }}</td>
                <td class="topical-num">{{ row.subtopicCount }}</td>
                <td class="topical-num">{{ row.relatedCount }}</td>
                <td class="topical-num">{{ row.concordanceCount }}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <div v-if="total > pageSize" class="topical-pager">
          <button type="button" class="pg-btn" :disabled="currentPage === 1" aria-label="처음" @click="goPage(1)">«</button>
          <button type="button" class="pg-btn" :disabled="currentPage === 1" aria-label="이전" @click="goPage(currentPage - 1)">‹</button>
          <span v-if="pageWindow.hasLeft" class="pg-ellipsis">…</span>
          <button
            v-for="p in pageWindow.pages"
            :key="p"
            type="button"
            class="pg-btn"
            :class="{ active: p === currentPage }"
            @click="goPage(p)"
          >{{ p }}</button>
          <span v-if="pageWindow.hasRight" class="pg-ellipsis">…</span>
          <button type="button" class="pg-btn" :disabled="currentPage === totalPages" aria-label="다음" @click="goPage(currentPage + 1)">›</button>
          <button type="button" class="pg-btn" :disabled="currentPage === totalPages" aria-label="마지막" @click="goPage(totalPages)">»</button>
        </div>
      </main>
    </div>

    <!-- ── Drawer: biblehub.com/topical 과 같은 형식으로 상세 ── -->
    <div v-if="drawerOpen" class="theme-backend-user-modal" @click="closeDrawer">
      <div class="theme-backend-user-drawer topical-drawer" @click.stop>
        <div class="theme-backend-user-drawer-head">
          <strong>{{ detail?.title || '…' }}</strong>
          <button
            v-if="detail"
            type="button"
            class="topical-copy"
            :title="copied ? '복사됨' : 'title + Topical Encyclopedia 를 JSON 으로 복사'"
            :aria-label="copied ? '복사됨' : 'JSON 복사'"
            @click="copyTopical"
          >
            <i :class="copied ? 'fa-solid fa-check' : 'fa-regular fa-copy'" aria-hidden="true"></i>
          </button>
          <button type="button" class="theme-backend-close" aria-label="Close" @click="closeDrawer">×</button>
        </div>

        <div v-if="detailPending" class="theme-backend-state">Loading...</div>
        <p v-else-if="!detail" class="theme-backend-state">주제를 불러오지 못했습니다.</p>

        <div v-else class="topical-doc">
          <a :href="sourceUrl" target="_blank" rel="noopener" class="topical-source">{{ sourceUrl }}</a>

          <div class="topical-doc-body">
            <!-- 본문 (3/4): 사전별 섹션 -->
            <div class="topical-main">
              <section v-for="(entries, dict) in detail.contents || {}" :key="dict" class="topical-dict">
                <h3>{{ dict }}</h3>
                <div v-for="(e, i) in entries" :key="i" class="topical-entry">
                  <h4 v-if="e.subject">{{ e.subject }}</h4>
                  <!-- content 안의 [본문](/genesis/1.htm) 을 biblehub 링크로 바꿔 렌더링 -->
                  <p v-html="renderContent(e.content)"></p>
                </div>
              </section>
            </div>

            <!-- 사이드바 (1/4): concordance · subtopics · related -->
            <aside class="topical-aside">
              <section v-if="detail.concordance?.length" class="topical-links">
                <h3>Concordance <span class="theme-meta">{{ detail.concordance.length }}</span></h3>
                <ul>
                  <li v-for="(c, i) in detail.concordance" :key="i">{{ typeof c === 'string' ? c : c.title || JSON.stringify(c) }}</li>
                </ul>
              </section>

              <section v-if="detail.subtopic?.length" class="topical-links">
                <h3>Subtopics <span class="theme-meta">{{ detail.subtopic.length }}</span></h3>
                <ul>
                  <li v-for="s in detail.subtopic" :key="s.link">
                    <a href="#" @click.prevent="openByLink(s.link)">{{ s.title }}</a>
                  </li>
                </ul>
              </section>

              <section v-if="detail.related?.length" class="topical-links">
                <h3>Related <span class="theme-meta">{{ detail.related.length }}</span></h3>
                <ul>
                  <li v-for="r in detail.related" :key="r.link">
                    <a href="#" @click.prevent="openByLink(r.link)">{{ r.title }}</a>
                  </li>
                </ul>
              </section>
            </aside>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import DefaultThemeTopbar from '~/components/public/DefaultThemeTopbar.vue'
import BackendSidebar from '~/components/admin/BackendSidebar.vue'

definePageMeta({ layout: 'insure', middleware: 'backend' })

type TopicalRow = {
  tid: number
  title: string
  link: string
  char: string
  root?: boolean
  contentsCount: number
  subtopicCount: number
  relatedCount: number
  concordanceCount: number
}
type TopicalEntry = { subject?: string; content?: string }
type LinkRef = { title: string; link: string; key: string }
type TopicalDoc = {
  tid: number
  title: string
  link: string
  contents?: Record<string, TopicalEntry[]>
  related?: LinkRef[]
  subtopic?: LinkRef[]
  concordance?: unknown[]
}

const { navItems } = useBackendMenu()
const apiBase = useApiBase()

const isSidebarOpen = ref(false)
const query = ref('')
const char = ref('')
const skip = ref(0)
const pageSize = 50

const drawerOpen = ref(false)
const drawerTid = ref<number | null>(null)

// ── 첫 글자 목록 ──
const { data: charData } = useFetch<{ items: { char: string; count: number }[] }>(
  `${apiBase}/api/admin/topical/chars`,
  { key: 'topical-chars', credentials: 'include', server: false, default: () => ({ items: [] }) },
)
const chars = computed(() => charData.value?.items ?? [])

// ── 목록 ──
const listUrl = computed(() => {
  const p = new URLSearchParams()
  if (query.value) p.set('q', query.value)
  if (char.value) p.set('char', char.value)
  p.set('limit', String(pageSize))
  p.set('skip', String(skip.value))
  return `${apiBase}/api/admin/topical?${p}`
})

const { data, pending } = useFetch<{ items: TopicalRow[]; total: number }>(
  listUrl,
  {
    key: 'topical-list',
    credentials: 'include',
    server: false,
    watch: [listUrl],
    default: () => ({ items: [], total: 0 }),
  },
)
const items = computed(() => data.value?.items ?? [])
const total = computed(() => data.value?.total ?? 0)

// ── 페이지네이션 ──
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))
const currentPage = computed(() => Math.floor(skip.value / pageSize) + 1)

// 현재 페이지를 가운데 두고 최대 5개 번호를 보여준다. 앞/뒤로 더 있으면 … 로 표시.
const pageWindow = computed(() => {
  const tp = totalPages.value
  const cur = currentPage.value
  const size = 5
  let start = Math.max(1, cur - Math.floor(size / 2))
  const end = Math.min(tp, start + size - 1)
  start = Math.max(1, end - size + 1)
  const pages: number[] = []
  for (let i = start; i <= end; i += 1) pages.push(i)
  return { pages, hasLeft: start > 1, hasRight: end < tp }
})

function goPage(n: number) {
  const clamped = Math.min(Math.max(1, n), totalPages.value)
  skip.value = (clamped - 1) * pageSize
}

// 검색어나 첫 글자가 바뀌면 첫 페이지로
watch([query, char], () => { skip.value = 0 })

// ── 상세 (드로어) ──
const detail = ref<TopicalDoc | null>(null)
const detailPending = ref(false)

const sourceUrl = computed(() =>
  detail.value?.link ? `https://biblehub.com/topical/${detail.value.link}` : '',
)

async function loadDetail(tid: number) {
  detailPending.value = true
  detail.value = null
  try {
    const res = await $fetch<{ item: TopicalDoc }>(
      `${apiBase}/api/admin/topical/${tid}`,
      { credentials: 'include' },
    )
    detail.value = res.item
    drawerTid.value = res.item?.tid ?? tid
  } catch {
    detail.value = null
  } finally {
    detailPending.value = false
  }
}

function openDetail(row: TopicalRow) {
  drawerTid.value = row.tid
  drawerOpen.value = true
  loadDetail(row.tid)
}

function closeDrawer() {
  drawerOpen.value = false
}

// subtopic / related 의 link 는 "/topical/g/god.htm" 형태.
// 드로어를 닫지 않고 해당 주제로 갈아 끼운다.
async function openByLink(link: string) {
  const path = link.replace(/^\/topical\//, '').replace(/\.htm$/, '')
  const [c, name] = path.split('/')
  if (!c || !name) return

  detailPending.value = true
  try {
    const res = await $fetch<{ item: TopicalDoc }>(
      `${apiBase}/api/admin/topical/${c}/${encodeURIComponent(name)}`,
      { credentials: 'include' },
    )
    detail.value = res.item
    drawerTid.value = res.item?.tid ?? null
  } catch {
    // 수집되지 않은 주제일 수 있다. 기존 화면을 유지한다.
  } finally {
    detailPending.value = false
  }
}

// ── 클립보드 복사 ──
// title 과 contents 의 "Topical Encyclopedia" 섹션만 뽑아 JSON 문자열로 복사한다.
const copied = ref(false)
let copiedTimer: ReturnType<typeof setTimeout> | null = null

async function copyTopical() {
  if (!detail.value) return

  const payload = {
    title: detail.value.title,
    'contents.Topical Encyclopedia': detail.value.contents?.['Topical Encyclopedia'] ?? [],
  }
  const text = JSON.stringify(payload)

  try {
    await navigator.clipboard.writeText(text)
  } catch {
    // clipboard API 를 못 쓰는 환경(비보안 컨텍스트 등) 대비
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    try { document.execCommand('copy') } finally { document.body.removeChild(ta) }
  }

  copied.value = true
  if (copiedTimer) clearTimeout(copiedTimer)
  copiedTimer = setTimeout(() => { copied.value = false }, 1500)
}

// 다른 주제를 열면 복사 표시는 초기화한다.
watch(detail, () => { copied.value = false })

// content 는 마크다운 링크가 섞인 평문이다.
// v-html 로 넣기 전에 HTML 특수문자를 escape 해서 원문 태그가 실행되지 않게 한다.
function renderContent(raw?: string) {
  if (!raw) return ''
  const escaped = raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  return escaped.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    (_m, text: string, href: string) => {
      const url = href.startsWith('http') ? href : `https://biblehub.com${href}`
      return `<a href="${url}" target="_blank" rel="noopener">${text}</a>`
    },
  )
}
</script>

<style scoped>
.topical-filter {
  min-width: 220px;
}

.topical-chars {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 14px;
}
.topical-char {
  min-width: 30px;
  padding: 4px 7px;
  border: 1px solid var(--theme-line);
  border-radius: 4px;
  background: var(--theme-bg);
  color: var(--theme-fg-dim);
  font-size: 12px;
  cursor: pointer;
}
.topical-char:hover {
  border-color: var(--theme-fg);
  color: var(--theme-fg);
}
.topical-char.active {
  border-color: var(--theme-fg);
  background: var(--theme-fg);
  color: var(--theme-bg);
}

.topical-num {
  text-align: right;
  white-space: nowrap;
}

.topical-pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-top: 16px;
}
.pg-btn {
  min-width: 34px;
  height: 34px;
  padding: 0 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--theme-line);
  border-radius: 8px;
  background: var(--theme-bg);
  color: var(--theme-fg);
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
  transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}
.pg-btn:hover:not(:disabled):not(.active) {
  border-color: var(--theme-fg-faint);
  background: var(--theme-bg-soft);
}
.pg-btn.active {
  background: var(--theme-fg);
  border-color: var(--theme-fg);
  color: var(--theme-bg);
  font-weight: 700;
}
.pg-btn:disabled {
  opacity: 0.4;
  cursor: default;
}
.pg-ellipsis {
  min-width: 20px;
  text-align: center;
  color: var(--theme-fg-faint);
}

/* ── Drawer ── */
.topical-drawer {
  width: min(100%, 1280px);
  overflow-y: auto;
}

/* 본문 3 : 사이드바 1 */
.topical-doc-body {
  display: grid;
  grid-template-columns: 3fr 1fr;
  gap: 28px;
  align-items: start;
}
.topical-main {
  min-width: 0;
}
.topical-aside {
  min-width: 0;
  padding-left: 20px;
  border-left: 1px solid var(--theme-line);
  position: sticky;
  top: 0;
}

/* 제목 옆 복사 버튼. 닫기(×) 버튼보다 앞에 오도록 헤더에서 밀어 둔다. */
.topical-copy {
  margin-left: 8px;
  margin-right: auto;
  padding: 4px 8px;
  border: 1px solid var(--theme-line);
  border-radius: 4px;
  background: var(--theme-bg);
  color: var(--theme-fg-dim);
  font-size: 13px;
  line-height: 1;
  cursor: pointer;
}
.topical-copy:hover {
  border-color: var(--theme-fg);
  color: var(--theme-fg);
}

.topical-source {
  display: inline-block;
  margin-bottom: 18px;
  color: var(--theme-fg-faint);
  font-size: 12px;
  word-break: break-all;
}

.topical-dict {
  margin-bottom: 26px;
}
.topical-dict h3 {
  margin: 0 0 10px;
  padding-bottom: 5px;
  border-bottom: 1px solid var(--theme-line);
  font-size: 15px;
  font-weight: 700;
}
.topical-entry {
  margin-bottom: 14px;
}
.topical-entry h4 {
  margin: 0 0 4px;
  font-size: 13px;
  font-weight: 700;
  color: var(--theme-fg-dim);
}
.topical-entry p {
  margin: 0;
  font-size: 14px;
  line-height: 1.75;
  white-space: pre-line;
}
.topical-entry :deep(a) {
  color: var(--theme-accent);
  text-decoration: underline;
}

.topical-links {
  margin-bottom: 24px;
}
.topical-links h3 {
  margin: 0 0 8px;
  font-size: 15px;
  font-weight: 700;
}
.topical-links ul {
  display: grid;
  gap: 4px;
  margin: 0;
  padding: 0;
  max-height: 320px;
  overflow-y: auto;
  list-style: none;
}
.topical-links li {
  font-size: 13px;
  color: var(--theme-fg-dim);
}
.topical-links a {
  color: var(--theme-fg-dim);
}
.topical-links a:hover {
  color: var(--theme-accent);
  text-decoration: underline;
}

@media (max-width: 1080px) {
  .topical-doc-body {
    grid-template-columns: 1fr;
  }
  .topical-aside {
    padding-left: 0;
    border-left: 0;
    border-top: 1px solid var(--theme-line);
    padding-top: 18px;
    position: static;
  }
}
</style>
