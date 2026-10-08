<template>
  <div class="theme-backend">
    <DefaultThemeTopbar
      :items="navItems"
      full-width
      backend-mode
      backend-menu-button
      hide-nav
      toolbar-title="도서검색."
      @backend-menu-toggle="isSidebarOpen = !isSidebarOpen"
    />
    <div v-if="isSidebarOpen" class="theme-backend-menu-backdrop" @click="isSidebarOpen = false"></div>

    <div class="theme-backend-shell">
      <OrderSidebar :open="isSidebarOpen" current-key="books" @close="isSidebarOpen = false" />

      <main class="theme-backend-main">
        <div class="theme-backend-head theme-backend-contents-head">
          <div class="theme-backend-contents-head-left">
            <h1>도서검색.</h1>
            <div class="theme-backend-contents-filters">
              <input
                v-model="q"
                type="search"
                name="q"
                class="bk-search"
                placeholder="제목 · 저자 · ISBN · 출판사 검색"
                @keyup.enter="applyFilters"
                @search="applyFilters"
              />
              <button type="button" class="theme-form-submit theme-form-submit-secondary-soft ol-filter-btn" @click="applyFilters">검색</button>
            </div>
          </div>
          <div class="theme-backend-head-right">
            <span class="theme-meta">{{ total }} 건</span>
            <button type="button" class="theme-form-submit" @click="openNew">＋ 추가</button>
          </div>
        </div>

        <div v-if="loading" class="theme-backend-state">불러오는 중...</div>
        <div v-else-if="!rows.length" class="theme-backend-state">{{ error || '표시할 도서가 없습니다.' }}</div>

        <section v-else class="theme-backend-table-wrap">
          <table class="theme-backend-table">
            <thead>
              <tr>
                <th class="bk-c-cat">분류</th>
                <th class="bk-c-title">제목</th>
                <th>저자</th>
                <th>출판사</th>
                <th class="col-num">정가</th>
                <th>출판일</th>
                <th class="bk-c-info">info</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in rows" :key="row.id" @click="openDetail(row)">
                <td class="bk-c-cat">{{ row.category || '—' }}</td>
                <td class="bk-c-title"><strong>{{ row.title }}</strong></td>
                <td>{{ row.author || '—' }}</td>
                <td>{{ row.publisher || '—' }}</td>
                <td class="col-num mono">{{ row.price != null ? row.price.toLocaleString() : '—' }}</td>
                <td class="mono">{{ row.pub_date || '—' }}</td>
                <td class="bk-c-info mono">{{ row.info || '—' }}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <div v-if="totalPages > 1" class="theme-backend-pagination">
          <button type="button" :disabled="page === 1" @click="goPage(page - 1)">←</button>
          <span>{{ page }} / {{ totalPages }}</span>
          <button type="button" :disabled="page >= totalPages" @click="goPage(page + 1)">→</button>
        </div>
      </main>
    </div>

    <!-- 편집 drawer (KRIN manager/books 복제) -->
    <Transition name="bk-drawer">
      <div v-if="drawerOpen" class="bk-drawer-root">
        <div class="bk-drawer-backdrop" @click="closeDetail"></div>
        <div class="bk-drawer-panel">
          <div class="bk-drawer-head">
            <span>{{ isNew ? '도서 추가' : '도서 편집' }}</span>
            <div class="bk-head-right">
              <button v-if="aladinUrl" type="button" class="bk-outline-btn" :disabled="crawling" @click="crawlAladin">
                {{ crawling ? 'Crawling…' : 'Crawling' }}
              </button>
              <a v-if="aladinUrl" :href="aladinUrl" target="_blank" rel="noopener" class="bk-outline-btn">알라딘 페이지 ↗</a>
              <button type="button" class="theme-backend-close" aria-label="닫기" @click="closeDetail">×</button>
            </div>
          </div>

          <div class="bk-grid">
            <label class="bk-field s3">
              <span>item_id</span>
              <input v-model="form.item_id" class="bk-input mono" :readonly="!isNew" placeholder="알라딘 상품 ID" />
            </label>
            <label class="bk-field s3">
              <span>size</span>
              <input v-model="form.size" class="bk-input" />
            </label>
            <label class="bk-field s3">
              <span>price</span>
              <input v-model="form.price" class="bk-input mono" inputmode="numeric" />
            </label>
            <label class="bk-field s3">
              <span>page</span>
              <input v-model="form.page" class="bk-input mono" inputmode="numeric" />
            </label>

            <label class="bk-field s9">
              <span>title</span>
              <input v-model="form.title" class="bk-input" />
            </label>
            <label class="bk-field s3">
              <span>isbn</span>
              <input v-model="form.isbn" class="bk-input mono" />
            </label>

            <label class="bk-field s6">
              <span>subtitle</span>
              <input v-model="form.subtitle" class="bk-input" />
            </label>
            <label class="bk-field s6">
              <span>author</span>
              <input v-model="form.author" class="bk-input" />
            </label>

            <label class="bk-field s6">
              <span>series_name</span>
              <input v-model="form.series_name" class="bk-input" />
            </label>
            <label class="bk-field s6">
              <span>title_original</span>
              <input v-model="form.title_original" class="bk-input" />
            </label>

            <label class="bk-field s6">
              <span>publisher</span>
              <input v-model="form.publisher" class="bk-input" />
            </label>
            <label class="bk-field s3">
              <span>pub_date</span>
              <input v-model="form.pub_date" class="bk-input mono" placeholder="2021-05-01" />
            </label>
            <label class="bk-field s3">
              <span>weight</span>
              <input v-model="form.weight" class="bk-input" />
            </label>

            <label class="bk-field s9">
              <span>image_url</span>
              <div class="bk-imgrow">
                <img v-if="form.image_url" :src="form.image_url" alt="" class="bk-thumb" />
                <input v-model="form.image_url" class="bk-input mono" />
              </div>
            </label>
            <label class="bk-field s3">
              <span>KDC</span>
              <input v-model="form.kdc" class="bk-input mono" placeholder="813.7" />
            </label>

            <label class="bk-field s6">
              <span>categories (줄바꿈 구분)</span>
              <textarea v-model="form.categories" class="bk-input bk-textarea" rows="6"></textarea>
            </label>
            <label class="bk-field s6">
              <span>publisher_review</span>
              <textarea v-model="form.publisher_review" class="bk-input bk-textarea" rows="6"></textarea>
            </label>

            <label class="bk-field s6">
              <span>book_review</span>
              <textarea v-model="form.book_review" class="bk-input bk-textarea" rows="8"></textarea>
            </label>
            <label class="bk-field s6">
              <span>index</span>
              <textarea v-model="form.index" class="bk-input bk-textarea" rows="8"></textarea>
            </label>

            <label class="bk-field s6">
              <span>inside</span>
              <textarea v-model="form.inside" class="bk-input bk-textarea" rows="8"></textarea>
            </label>
            <label class="bk-field s6">
              <span>author_detail (JSON)</span>
              <textarea v-model="form.author_detail" class="bk-input bk-textarea mono" rows="8"></textarea>
            </label>
          </div>

          <div class="bk-drawer-actions">
            <button v-if="!isNew" type="button" class="theme-form-submit theme-form-submit-warning" @click="remove">삭제</button>
            <span v-else></span>
            <button type="button" class="theme-form-submit" :disabled="saving" @click="save()">{{ saving ? '저장 중…' : '저장' }}</button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import DefaultThemeTopbar from '~/components/public/DefaultThemeTopbar.vue'
import OrderSidebar from '~/components/orderM/OrderSidebar.vue'

definePageMeta({ layout: 'insure' })

const { navItems } = useOrderMenu()
const apiBase = useApiBase()
const API = `${apiBase}/api/orderm/catalog`

const isSidebarOpen = ref(false)

type BookRow = {
  id: string
  item_id: string
  isbn: string
  title: string
  author: string
  publisher: string
  price: number | null
  pub_date: string
  category: string
  info: string
}

// ── 목록 ──
const q = ref('')
const rows = ref<BookRow[]>([])
const total = ref(0)
const page = ref(1)
const limit = 100
const loading = ref(false)
const error = ref('')
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / limit)))

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await $fetch<{ ok: boolean; data: BookRow[]; total: number }>(API, {
      credentials: 'include',
      query: { q: q.value.trim(), page: page.value, limit },
    })
    rows.value = res.data ?? []
    total.value = res.total ?? 0
  } catch {
    error.value = '도서 목록을 불러오지 못했습니다.'
    rows.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}
function applyFilters() {
  page.value = 1
  load()
}
function goPage(p: number) {
  if (p < 1 || p > totalPages.value || p === page.value) return
  page.value = p
  load()
}
onMounted(load)

// ── drawer ──
type EditForm = {
  id: string
  item_id: string
  isbn: string
  title: string
  subtitle: string
  author: string
  series_name: string
  title_original: string
  publisher: string
  pub_date: string
  price: string
  page: string
  size: string
  weight: string
  image_url: string
  categories: string
  kdc: string
  publisher_review: string
  book_review: string
  index: string
  inside: string
  author_detail: string
}
function emptyForm(): EditForm {
  return {
    id: '', item_id: '', isbn: '', title: '', subtitle: '', author: '',
    series_name: '', title_original: '', publisher: '', pub_date: '',
    price: '', page: '', size: '', weight: '', image_url: '',
    categories: '', kdc: '', publisher_review: '', book_review: '',
    index: '', inside: '', author_detail: '',
  }
}
const open = ref(false)
const form = reactive<EditForm>(emptyForm())
const saving = ref(false)
const drawerOpen = computed(() => open.value)
const isNew = computed(() => open.value && !form.id)

const aladinUrl = computed(() =>
  /^\d+$/.test(form.item_id.trim())
    ? `https://www.aladin.co.kr/shop/wproduct.aspx?ItemId=${form.item_id.trim()}`
    : null,
)

function fillForm(d: any) {
  Object.assign(form, emptyForm(), {
    id: d.id ?? '',
    item_id: d.item_id ?? '',
    isbn: d.isbn ?? '',
    title: d.title ?? '',
    subtitle: d.subtitle ?? '',
    author: d.author ?? '',
    series_name: d.series_name ?? '',
    title_original: d.title_original ?? '',
    publisher: d.publisher ?? '',
    pub_date: d.pub_date ?? '',
    price: d.price != null ? String(d.price) : '',
    page: d.page != null ? String(d.page) : '',
    size: d.size ?? '',
    weight: d.weight ?? '',
    image_url: d.image_url ?? '',
    categories: Array.isArray(d.categories) ? d.categories.join('\n') : '',
    kdc: d.kdc ?? '',
    publisher_review: typeof d.publisher_review === 'string'
      ? d.publisher_review
      : (d.publisher_review ? JSON.stringify(d.publisher_review, null, 2) : ''),
    book_review: d.book_review ?? '',
    index: d.index ?? '',
    inside: d.inside ?? '',
    author_detail: (Array.isArray(d.author_detail) && d.author_detail.length)
      ? JSON.stringify(d.author_detail, null, 2) : '',
  })
}

function openNew() {
  Object.assign(form, emptyForm())
  open.value = true
}
async function openDetail(row: BookRow) {
  fillForm(row)
  open.value = true
  try {
    const res = await $fetch<{ ok: boolean; data: any }>(`${API}/${row.id}`, { credentials: 'include' })
    if (res.data) fillForm(res.data)
  } catch {
    /* 상세 로드 실패 시 목록 값 유지 */
  }
}
function closeDetail() {
  open.value = false
}

// item_id 로 알라딘 상세를 크롤링(Reading.books 에 저장) → 폼 갱신.
const crawling = ref(false)
async function crawlAladin() {
  const itemId = form.item_id.trim()
  if (crawling.value || !itemId) return
  crawling.value = true
  try {
    const res = await $fetch<{ ok: boolean; result?: { item?: any } }>(`${apiBase}/api/crawl/detail`, {
      method: 'POST',
      credentials: 'include',
      body: { itemId },
    })
    const item = res?.result?.item
    if (item) {
      // 크롤링에서 비어 온 항목은 기존 값을 지우지 않는다.
      const keepId = form.id
      const merged: any = { ...item, id: keepId }
      // 빈 문자열/누락은 기존 폼 값으로 보존
      for (const k of Object.keys(item)) {
        if (item[k] === '' || item[k] == null) delete merged[k]
      }
      fillForm({ ...formToDoc(), ...merged, id: keepId })
    }
  } catch (err: any) {
    window.alert(err?.data?.message || '알라딘 크롤링에 실패했습니다.')
  } finally {
    crawling.value = false
  }
}

// 폼 → 저장 body (categories/JSON 파싱 포함)
function formToDoc() {
  let authorDetail: unknown
  const rawAD = form.author_detail.trim()
  if (rawAD) {
    try { authorDetail = JSON.parse(rawAD) } catch { authorDetail = undefined }
  } else authorDetail = []
  let publisherReview: unknown = ''
  const rawPR = form.publisher_review.trim()
  if (rawPR) {
    try { publisherReview = JSON.parse(rawPR) } catch { publisherReview = rawPR }
  }
  return {
    item_id: form.item_id.trim(),
    isbn: form.isbn.trim(),
    title: form.title.trim(),
    subtitle: form.subtitle.trim(),
    author: form.author.trim(),
    series_name: form.series_name.trim(),
    title_original: form.title_original.trim(),
    publisher: form.publisher.trim(),
    pub_date: form.pub_date.trim(),
    price: form.price.trim(),
    page: form.page.trim(),
    size: form.size.trim(),
    weight: form.weight.trim(),
    image_url: form.image_url.trim(),
    kdc: form.kdc.trim(),
    categories: form.categories.split('\n').map((c) => c.trim()).filter(Boolean),
    book_review: form.book_review,
    index: form.index,
    inside: form.inside,
    publisher_review: publisherReview,
    ...(Array.isArray(authorDetail) ? { author_detail: authorDetail } : {}),
  }
}

async function save() {
  if (saving.value) return
  saving.value = true
  try {
    const creating = !form.id
    const res = await $fetch<{ ok: boolean; data: any }>(`${API}${creating ? '' : `/${form.id}`}`, {
      method: creating ? 'POST' : 'PATCH',
      credentials: 'include',
      body: formToDoc(),
    })
    if (res.data) form.id = res.data.id
    closeDetail()
    load()
  } catch (err: any) {
    window.alert(err?.data?.message || '저장에 실패했습니다.')
  } finally {
    saving.value = false
  }
}

async function remove() {
  if (!form.id) return
  if (!window.confirm(`'${form.title}' 도서를 삭제할까요?`)) return
  try {
    await $fetch(`${API}/${form.id}`, { method: 'DELETE', credentials: 'include' })
    closeDetail()
    load()
  } catch (err: any) {
    window.alert(err?.data?.message || '삭제에 실패했습니다.')
  }
}
</script>

<style scoped>
.col-num { text-align: right; }
.bk-search {
  width: 320px;
  max-width: 50vw;
  padding: 7px 12px;
  border: 1px solid var(--theme-line);
  border-radius: 0;
  background: var(--theme-bg);
  color: var(--theme-fg);
  font-size: 13px;
}
.ol-filter-btn { min-width: 80px; min-height: 33px; border-radius: 0; padding: 0 14px; }

.bk-c-cat { width: 150px; color: var(--theme-fg-dim); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.bk-c-title { width: 36%; }
.bk-c-info { width: 54px; text-align: center; }
.theme-backend-table tbody tr { cursor: pointer; }

/* drawer — KRIN manager/books 복제 */
.bk-drawer-root { position: fixed; inset: 0; z-index: 180; }
.bk-drawer-backdrop { position: absolute; inset: 0; background: rgba(10, 12, 16, 0.4); }
.bk-drawer-panel {
  position: absolute; top: 0; right: 0; bottom: 0;
  width: 1100px; max-width: 94vw; background: var(--theme-bg);
  box-shadow: -8px 0 30px rgba(0, 0, 0, 0.18);
  display: flex; flex-direction: column;
}
.bk-drawer-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 20px; border-bottom: 1px solid var(--theme-line);
  font-size: 16px; font-weight: 800; color: var(--theme-accent);
}
.bk-head-right { display: flex; align-items: center; gap: 10px; }
.bk-outline-btn {
  display: inline-flex; align-items: center; height: 32px; padding: 0 12px;
  border: 1px solid var(--theme-line); border-radius: 6px;
  background: var(--theme-bg); color: var(--theme-fg-dim);
  font-size: 13px; font-weight: 600; cursor: pointer;
}
.bk-outline-btn:hover:not(:disabled) { color: var(--theme-fg); border-color: var(--theme-fg-dim); }

.bk-grid {
  flex: 1; overflow-y: auto; padding: 18px 20px;
  display: grid; grid-template-columns: repeat(12, 1fr); gap: 14px; align-items: start;
}
.bk-field { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.bk-field span { font-size: 12px; font-weight: 600; color: var(--theme-fg-dim); }
.bk-field.s3 { grid-column: span 3; }
.bk-field.s6 { grid-column: span 6; }
.bk-field.s9 { grid-column: span 9; }
.bk-input {
  width: 100%; padding: 8px 12px; border: 1px solid var(--theme-line);
  border-radius: 6px; background: var(--theme-bg); color: var(--theme-fg);
  font-size: 14px; outline: none;
}
.bk-input:focus { border-color: var(--theme-accent); }
.bk-input[readonly] { background: var(--theme-bg-soft); color: var(--theme-fg-dim); }
.bk-textarea { height: auto; line-height: 1.5; resize: vertical; font-family: inherit; }
.mono { font-family: var(--theme-mono, monospace); }
.bk-imgrow { display: flex; gap: 10px; align-items: center; }
.bk-imgrow .bk-input { flex: 1; min-width: 0; }
.bk-thumb { height: 40px; width: auto; border-radius: 4px; border: 1px solid var(--theme-line); object-fit: contain; flex-shrink: 0; }

.bk-drawer-actions {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 20px; border-top: 1px solid var(--theme-line);
}

.bk-drawer-enter-active, .bk-drawer-leave-active { transition: opacity .22s; }
.bk-drawer-enter-active .bk-drawer-panel, .bk-drawer-leave-active .bk-drawer-panel { transition: transform .26s ease; }
.bk-drawer-enter-from, .bk-drawer-leave-to { opacity: 0; }
.bk-drawer-enter-from .bk-drawer-panel, .bk-drawer-leave-to .bk-drawer-panel { transform: translateX(100%); }

@media (max-width: 900px) {
  .bk-field.s3, .bk-field.s6, .bk-field.s9 { grid-column: span 12; }
}
</style>
