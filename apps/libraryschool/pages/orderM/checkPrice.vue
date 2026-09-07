<template>
  <div class="theme-backend">
    <DefaultThemeTopbar
      :items="navItems"
      full-width
      backend-mode
      backend-menu-button
      hide-nav
      toolbar-title="정가조회."
      @backend-menu-toggle="isSidebarOpen = !isSidebarOpen"
    />
    <div v-if="isSidebarOpen" class="theme-backend-menu-backdrop" @click="isSidebarOpen = false"></div>

    <div class="theme-backend-shell">
      <OrderSidebar :open="isSidebarOpen" current-key="checkPrice" @close="isSidebarOpen = false" />

      <main class="theme-backend-main">
        <div class="theme-backend-head cp-head">
          <h1>정가조회.</h1>
          <label class="cp-orderno">
            <span>주문번호</span>
            <input v-model="orderNo" type="text" name="orderNo" placeholder="예: 2" />
          </label>
          <span class="theme-meta cp-count">{{ rows.length }} 건</span>
          <div class="cp-filter-actions">
            <button type="button" class="theme-form-submit" :disabled="busy || !rows.length" @click="lookupTitlePublisher">정가조회</button>
            <button type="button" class="theme-form-submit theme-form-submit-secondary-soft" :disabled="busy" @click="triggerImport">엑셀읽기</button>
            <button type="button" class="theme-form-submit theme-form-submit-secondary-soft" :disabled="!rows.length" @click="exportExcel">엑셀저장</button>
            <button type="button" class="theme-form-submit theme-form-submit-secondary-soft" :disabled="busy || !rows.length" @click="saveToOrderList">주문저장</button>
            <button type="button" class="theme-form-submit theme-form-submit-secondary-soft" :disabled="!rows.length" @click="dupCheck">중복체크</button>
            <button type="button" class="theme-form-submit theme-form-submit-warning" :disabled="!rows.length" @click="dupDelete">중복삭제</button>
            <button type="button" class="theme-form-submit theme-form-submit-secondary-soft" :disabled="busy || !rows.length" @click="dreamer">Dreamer</button>
            <button type="button" class="theme-form-submit theme-form-submit-secondary-soft" @click="addRow">도서추가</button>
            <button
              type="button"
              class="cp-copy-btn"
              :disabled="!nonTenPercentRows.length"
              :title="`할인율 10%가 아닌 도서 ${nonTenPercentRows.length}건의 detailByIsbn 명령 복사`"
              aria-label="할인율 10% 아닌 도서 명령 복사"
              @click="copyNonTenPercentCmds"
            >
              <i class="fa-solid fa-copy"></i>
            </button>
            <input ref="fileInput" type="file" accept=".xlsx,.xls,.csv" class="cp-file" @change="onImport" />
            </div>
        </div>

        <p v-if="notice" class="cp-notice">{{ notice }}</p>
        <div v-if="busy" class="theme-backend-state">조회 중...</div>

        <div v-if="!rows.length && !busy" class="theme-backend-state">
          "엑셀읽기" 로 도서 목록을 불러오세요.
        </div>

        <section v-else-if="rows.length" class="theme-backend-table-wrap">
          <table class="theme-backend-table cp-table">
            <thead>
              <tr>
                <th class="col-num">No</th>
                <th>ISBN</th>
                <th>서명</th>
                <th>출판사</th>
                <th>저자</th>
                <th class="col-num">수량</th>
                <th class="col-num">정가</th>
                <th class="cp-edit-col"></th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(item, idx) in rows"
                :key="idx"
                class="cp-row"
                :class="{ 'cp-dup': item._dup, 'cp-nomatch': item._nomatch }"
                @click="openRowSearch(idx)"
              >
                <td class="col-num mono">{{ item.no }}</td>
                <td class="mono">{{ item.isbn || '-' }}</td>
                <td>
                  <strong>{{ item.title }}</strong>
                  <div v-if="item.m_title" class="cp-sub">{{ item.m_title }}</div>
                </td>
                <td>
                  {{ item.publisher || '-' }}
                  <div v-if="item.m_publisher" class="cp-sub">{{ item.m_publisher }}</div>
                </td>
                <td>
                  {{ item.author || '-' }}
                  <div v-if="item.m_author" class="cp-sub">{{ item.m_author }}</div>
                </td>
                <td class="col-num mono">{{ item.qty ?? 0 }}</td>
                <td class="col-num mono">
                  {{ formatPrice(item.price) }}
                  <div v-if="item.sale_price" class="cp-sub" :class="{ 'cp-dc-warn': discountRate(item) !== 10 }">{{ formatPrice(item.sale_price) }} ({{ discountRate(item) }}%)</div>
                </td>
                <td class="cp-edit-col">
                  <button
                    type="button"
                    class="cp-edit-btn"
                    :disabled="!item.isbn"
                    :aria-label="`detailByIsbn 명령 복사`"
                    title="node src\index.js detailByIsbn {isbn} 복사"
                    @click.stop="copyDetailCmd(item.isbn)"
                  >
                    <i class="fa-solid fa-copy"></i>
                  </button>
                  <button type="button" class="cp-edit-btn" aria-label="수정" @click.stop="openEdit(idx)">
                    <i class="fa-solid fa-pen"></i>
                  </button>
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td colspan="5" class="cp-foot-label">합계</td>
                <td class="col-num mono">{{ totalQty }}</td>
                <td class="col-num mono">{{ formatPrice(totalAmount) }}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </section>
      </main>
    </div>

    <!-- 행 클릭: 서명 검색 (여러 결과 중 선택) -->
    <div v-if="isBookSearchOpen" class="cp-modal" @click="closeBookSearch">
      <div class="cp-search-panel" @click.stop>
        <div class="cp-modal-head">
          <strong>도서 검색 (ISBN·서명·출판사)</strong>
          <button type="button" class="theme-backend-close" aria-label="닫기" @click="closeBookSearch">×</button>
        </div>
        <input
          ref="bookInput"
          v-model="bookKeyword"
          type="search"
          class="cp-modal-input"
          placeholder="ISBN 서명 출판사 (띄어쓰기 AND)  예: 부동산 교과서"
        />
        <div class="cp-search-list">
          <div v-if="bookLoading" class="cp-modal-state">검색 중...</div>
          <div v-else-if="!bookKeyword.trim()" class="cp-modal-state">검색어를 입력하세요.</div>
          <div v-else-if="!bookResults.length" class="cp-modal-state">검색 결과가 없습니다.</div>
          <button
            v-for="b in bookResults"
            v-else
            :key="b.isbn"
            type="button"
            class="cp-search-row"
            @click="pickBook(b)"
          >
            <span class="cp-search-row-top">
              <strong>{{ b.title }}</strong>
              <span v-if="b.series_name" class="cp-search-series">{{ b.series_name }}</span>
            </span>
            <span class="cp-search-meta">
              {{ b.author || '저자 미상' }} · {{ b.publisher || '-' }} · {{ formatPrice(b.price) }} · <span class="mono">{{ b.isbn || '-' }}</span>
            </span>
          </button>
        </div>
      </div>
    </div>

    <!-- 편집: 서명 / 출판사 / 수량 / 정가 / ISBN -->
    <div v-if="isEditOpen" class="cp-modal" @click="closeEdit">
      <div class="cp-edit-panel" @click.stop>
        <div class="cp-modal-head">
          <strong>행 수정</strong>
          <button type="button" class="theme-backend-close" aria-label="닫기" @click="closeEdit">×</button>
        </div>
        <form class="cp-edit-form" @submit.prevent="saveEdit">
          <label class="theme-form-field">
            <span>서명</span>
            <input v-model="editForm.title" maxlength="300" />
          </label>
          <label class="theme-form-field">
            <span>출판사</span>
            <input v-model="editForm.publisher" maxlength="120" />
          </label>
          <label class="theme-form-field">
            <span>저자</span>
            <input v-model="editForm.author" maxlength="120" />
          </label>
          <div class="cp-edit-row2">
            <label class="theme-form-field">
              <span>수량</span>
              <input v-model.number="editForm.qty" type="number" min="0" />
            </label>
            <label class="theme-form-field">
              <span>정가(금액)</span>
              <input v-model.number="editForm.price" type="number" min="0" />
            </label>
          </div>
          <label class="theme-form-field">
            <span>ISBN</span>
            <input v-model="editForm.isbn" maxlength="40" />
          </label>
          <div class="cp-edit-actions">
            <button type="button" class="theme-form-submit theme-form-submit-warning cp-edit-del" @click="deleteEditRow">삭제</button>
            <button type="button" class="theme-form-submit theme-form-submit-secondary-soft" @click="closeEdit">취소</button>
            <button type="submit" class="theme-form-submit">저장</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import DefaultThemeTopbar from '~/components/public/DefaultThemeTopbar.vue'
import OrderSidebar from '~/components/orderM/OrderSidebar.vue'

// 화면 구성은 backend 와 동일(insure 레이아웃 + theme-backend). 인증 가드는
// 로그인/권한이 준비되면 middleware: 'backend' 를 추가한다.
definePageMeta({ layout: 'insure' })

type Row = {
  no: number
  isbn: string
  title: string
  subtitle: string
  publisher: string
  author: string
  qty: number
  price: number
  sale_price: number
  // 검색으로 매칭된 값(흐리게 비교 표시용)
  m_title?: string
  m_publisher?: string
  m_author?: string
  _dup?: boolean
  _nomatch?: boolean
}
type BookHit = {
  isbn: string
  title: string
  subtitle?: string
  series_name?: string
  author: string
  publisher: string
  price: number
  dc_price?: number
}

const { navItems } = useOrderMenu()
const apiBase = useApiBase()

const isSidebarOpen = ref(false)
const orderNo = ref('')
const rows = ref<Row[]>([])
const busy = ref(false)
const notice = ref('')
const fileInput = ref<HTMLInputElement | null>(null)

const totalQty = computed(() => rows.value.reduce((s, r) => s + (r.qty || 0), 0))
const totalAmount = computed(() => rows.value.reduce((s, r) => s + (r.price || 0) * (r.qty || 0), 0))

function formatPrice(v: number) {
  return (v ?? 0).toLocaleString('ko-KR')
}
// 정가 대비 할인가 할인율(%)
function discountRate(item: { price?: number; sale_price?: number }) {
  const p = Number(item.price) || 0
  const d = Number(item.sale_price) || 0
  if (p <= 0) return 0
  return Math.round((1 - d / p) * 100)
}

// ── 엑셀 읽기 ────────────────────────────────────────────────
const HEADER_MAP: Record<string, string[]> = {
  no: ['#', 'no', 'seq', '순번', '번호'],
  isbn: ['isbn'],
  title: ['title', '서명', '제목', '도서명'],
  publisher: ['출판사', 'publisher', '발행처'],
  author: ['저자', 'author', '지은이'],
  qty: ['qty', '수량', '부수'],
  price: ['정가', '가격', 'price'],
}
function pick(obj: Record<string, any>, cands: string[]): any {
  const keys = Object.keys(obj)
  for (const c of cands) {
    const k = keys.find((kk) => kk.trim().toLowerCase() === c.toLowerCase())
    if (k != null) return obj[k]
  }
  return ''
}

function triggerImport() {
  fileInput.value?.click()
}

async function onImport(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  notice.value = ''
  try {
    const XLSX = await import('xlsx')
    const buf = await file.arrayBuffer()
    const wb = XLSX.read(buf, { type: 'array' })
    const ws = wb.Sheets[wb.SheetNames[0]]
    const json = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: '' })

    const mapped: Row[] = json.map((o) => ({
      no: 0,
      isbn: String(pick(o, HEADER_MAP.isbn) ?? '').trim(),
      title: String(pick(o, HEADER_MAP.title) ?? '').trim(),
      subtitle: '',
      publisher: String(pick(o, HEADER_MAP.publisher) ?? '').trim(),
      author: String(pick(o, HEADER_MAP.author) ?? '').trim(),
      qty: Number(pick(o, HEADER_MAP.qty)) || 0,
      price: Number(pick(o, HEADER_MAP.price)) || 0,
      sale_price: 0,
    })).filter((r) => r.title || r.isbn)

    mapped.forEach((r, i) => { r.no = (i + 1) * 10 })
    rows.value = mapped
    notice.value = `${mapped.length}건 불러왔습니다.`
  } catch {
    notice.value = '엑셀을 읽지 못했습니다. 파일 형식을 확인하세요.'
  } finally {
    input.value = ''
  }
}

// ── 정가 조회 (서명+출판사) — 매칭값은 흐리게 비교 표시 ──
async function lookupTitlePublisher() {
  await runLookup('title_publisher')
}
async function runLookup(mode: 'title' | 'title_publisher') {
  if (!rows.value.length || busy.value) return
  busy.value = true
  notice.value = ''
  try {
    const payload = rows.value.map((r) => ({ title: r.title, isbn: r.isbn, publisher: r.publisher }))
    const res = await $fetch<{ ok: boolean; data: (BookHit | null)[] }>(`${apiBase}/api/orderm/books/lookup`, {
      method: 'POST',
      credentials: 'include',
      body: { mode, rows: payload },
    })
    const matches = res.data ?? []
    let hit = 0
    rows.value = rows.value.map((r, i) => {
      const m = matches[i]
      if (!m) return { ...r, m_title: '', m_publisher: '', m_author: '', _nomatch: true }
      hit += 1
      return {
        ...r,
        isbn: m.isbn || r.isbn,
        subtitle: m.subtitle || r.subtitle,
        price: Number(m.price) || r.price,
        sale_price: Number(m.dc_price) || 0,
        m_title: m.title || '',
        m_publisher: m.publisher || '',
        m_author: m.author || '',
        _nomatch: false,
      }
    })
    notice.value = `${hit}/${rows.value.length}건 매칭` + (hit < rows.value.length ? ' (미매칭 행은 붉게 표시)' : '')
  } catch {
    notice.value = '정가 조회에 실패했습니다.'
  } finally {
    busy.value = false
  }
}

// ── 행 클릭: 서명 검색 후 선택 → 해당 행에 매칭값 반영 ──────────
const isBookSearchOpen = ref(false)
const activeRow = ref<number | null>(null)
const bookKeyword = ref('')
const bookLoading = ref(false)
const bookResults = ref<BookHit[]>([])
const bookInput = ref<HTMLInputElement | null>(null)
let bookTimer: ReturnType<typeof setTimeout> | null = null

function openRowSearch(idx: number) {
  activeRow.value = idx
  bookKeyword.value = rows.value[idx].title
  bookResults.value = []
  isBookSearchOpen.value = true
  nextTick(() => bookInput.value?.focus())
  runBookSearch()
}
function closeBookSearch() {
  isBookSearchOpen.value = false
}
watch(bookKeyword, () => {
  if (bookTimer) clearTimeout(bookTimer)
  bookTimer = setTimeout(runBookSearch, 250)
})
async function runBookSearch() {
  const q = bookKeyword.value.trim()
  if (!q) {
    bookResults.value = []
    return
  }
  bookLoading.value = true
  try {
    // 서명+출판사+ISBN 방식(띄어쓰기 AND). 예: "부동산 교과서" → "부동산" AND "교과서".
    const res = await $fetch<{ ok: boolean; data: BookHit[] }>(`${apiBase}/api/orderm/books?tp=${encodeURIComponent(q)}`, {
      credentials: 'include',
    })
    bookResults.value = res.data ?? []
  } catch {
    bookResults.value = []
  } finally {
    bookLoading.value = false
  }
}
function pickBook(b: BookHit) {
  const i = activeRow.value
  if (i == null) return
  rows.value[i] = {
    ...rows.value[i],
    isbn: b.isbn || rows.value[i].isbn,
    subtitle: b.subtitle || rows.value[i].subtitle,
    price: Number(b.price) || rows.value[i].price,
    sale_price: Number(b.dc_price) || 0,
    m_title: b.title || '',
    m_publisher: b.publisher || '',
    m_author: b.author || '',
    _nomatch: false,
  }
  closeBookSearch()
}

// ISBN 상세조회 명령을 클립보드로 복사. (크롤러 detailByIsbn 실행용)
function detailCmd(isbn: string) {
  return `node src\\index.js detailByIsbn ${String(isbn || '').trim()}`
}
async function copyDetailCmd(isbn: string) {
  const code = String(isbn || '').trim()
  if (!code) return
  const cmd = detailCmd(code)
  try {
    await navigator.clipboard.writeText(cmd)
    notice.value = `복사됨: ${cmd}`
  } catch {
    notice.value = '클립보드 복사에 실패했습니다.'
  }
}

// 정가 대비 할인가가 10% 할인이 아닌(ISBN 있는) 도서들.
const nonTenPercentRows = computed(() =>
  rows.value.filter((r) => r.isbn && discountRate(r) !== 10),
)
// 위 도서들의 detailByIsbn 명령을 줄바꿈으로 이어 클립보드에 복사.
async function copyNonTenPercentCmds() {
  const list = nonTenPercentRows.value
  if (!list.length) return
  const text = list.map((r) => detailCmd(r.isbn)).join('\n')
  try {
    await navigator.clipboard.writeText(text)
    notice.value = `할인율 10% 아닌 ${list.length}건 명령 복사됨`
  } catch {
    notice.value = '클립보드 복사에 실패했습니다.'
  }
}

// ── 편집 (서명 / 출판사 / 수량 / 정가 / ISBN) ─────────────────
const isEditOpen = ref(false)
const editRow = ref<number | null>(null)
const editForm = reactive({ title: '', publisher: '', author: '', qty: 0, price: 0, isbn: '' })

function openEdit(idx: number) {
  editRow.value = idx
  const r = rows.value[idx]
  editForm.title = r.title
  editForm.publisher = r.publisher
  editForm.author = r.author
  editForm.qty = r.qty
  editForm.price = r.price
  editForm.isbn = r.isbn
  isEditOpen.value = true
}
function closeEdit() {
  isEditOpen.value = false
}
function saveEdit() {
  const i = editRow.value
  if (i == null) return
  rows.value[i] = {
    ...rows.value[i],
    title: editForm.title.trim(),
    publisher: editForm.publisher.trim(),
    author: editForm.author.trim(),
    qty: Number(editForm.qty) || 0,
    price: Number(editForm.price) || 0,
    isbn: editForm.isbn.trim(),
  }
  isEditOpen.value = false
}
function deleteEditRow() {
  const i = editRow.value
  if (i == null) return
  if (!window.confirm('이 행을 삭제할까요?')) return
  rows.value.splice(i, 1)
  isEditOpen.value = false
}

// 새 빈 행 추가(수량 기본 1) 후 편집 모달을 연다.
function addRow() {
  const nextNo = rows.value.length ? Math.max(...rows.value.map((r) => r.no || 0)) + 10 : 10
  rows.value.push({ no: nextNo, isbn: '', title: '', subtitle: '', publisher: '', author: '', qty: 1, price: 0, sale_price: 0 })
  openEdit(rows.value.length - 1)
}

// ── 중복 (ISBN 기준) ─────────────────────────────────────────
function dupCheck() {
  const count = new Map<string, number>()
  for (const r of rows.value) {
    if (r.isbn) count.set(r.isbn, (count.get(r.isbn) || 0) + 1)
  }
  let dups = 0
  rows.value = rows.value.map((r) => {
    const isDup = !!r.isbn && (count.get(r.isbn) || 0) > 1
    if (isDup) dups += 1
    return { ...r, _dup: isDup }
  })
  notice.value = dups ? `중복(ISBN) ${dups}건을 표시했습니다.` : '중복(ISBN)이 없습니다.'
}
function dupDelete() {
  const seen = new Set<string>()
  const before = rows.value.length
  const out: Row[] = []
  for (const r of rows.value) {
    if (r.isbn && seen.has(r.isbn)) continue
    if (r.isbn) seen.add(r.isbn)
    out.push({ ...r, _dup: false })
  }
  rows.value = out
  notice.value = `중복(ISBN) ${before - out.length}건을 삭제했습니다.`
}

// ── 엑셀 저장 ({orderNo}.xlsx) ───────────────────────────────
async function exportExcel() {
  if (!rows.value.length) return
  const XLSX = await import('xlsx')
  const data = rows.value.map((r) => ({
    no: r.no,
    title: r.title,
    // 출판사·저자가 비어 있으면 검색으로 매칭된 값으로 저장.
    publisher: r.publisher || r.m_publisher || '',
    qty: r.qty,
    price: r.price,
    sale_price: r.sale_price,
    author: r.author || r.m_author || '',
    isbn: r.isbn,
  }))
  const ws = XLSX.utils.json_to_sheet(data, {
    header: ['no', 'title', 'publisher', 'qty', 'price', 'sale_price', 'author', 'isbn'],
  })
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'orderList')
  const base = (orderNo.value || '').trim() || 'order'
  XLSX.writeFile(wb, `${base}.xlsx`)
}

// 주문저장: 현재 목록을 order_list 로 저장(upsert). 주문번호(orderNo) 필수.
async function saveToOrderList() {
  if (busy.value) return
  const on = (orderNo.value || '').trim()
  if (!(Number(on) > 0)) {
    notice.value = '주문번호를 입력하세요.'
    return
  }
  const list = rows.value.filter((r) => r.title.trim() || r.isbn.trim())
  if (!list.length) {
    notice.value = '저장할 도서가 없습니다.'
    return
  }
  if (!window.confirm(`주문 #${on} 의 주문도서로 ${list.length}건을 저장할까요?`)) return

  busy.value = true
  notice.value = ''
  try {
    const items = list.map((r) => ({
      no: r.no,
      isbn: r.isbn,
      title: r.title,
      subtitle: r.subtitle,
      publisher: r.publisher || r.m_publisher || '',
      author: r.author || r.m_author || '',
      qty: r.qty,
      price: r.price,
      // dc_price = 정가 * 0.9, 10의 자리 절사 (예: 12585 → 12580)
      dc_price: Math.floor((Number(r.price) || 0) * 0.9 / 10) * 10,
    }))
    const res = await $fetch<{ ok: boolean; data: { count: number } }>(`${apiBase}/api/orderm/order-list/bulk`, {
      method: 'POST',
      credentials: 'include',
      body: { orderNo: Number(on), items },
    })
    notice.value = `주문도서 저장 완료 (${res.data?.count ?? 0}건)`
  } catch (err: any) {
    notice.value = err?.data?.message || '주문저장에 실패했습니다.'
  } finally {
    busy.value = false
  }
}

// 현재 목록을 Dreamer(cybOrder)로 전송. 주문번호(orderNo) 필수.
async function dreamer() {
  if (busy.value) return
  const on = (orderNo.value || '').trim()
  if (!(Number(on) > 0)) {
    notice.value = '주문번호를 입력하세요.'
    return
  }
  if (!rows.value.length) {
    notice.value = '전송할 도서가 없습니다.'
    return
  }
  if (!window.confirm(`주문 #${on} (${rows.value.length}건)을 Dreamer(cybOrder)로 전송할까요?`)) return

  busy.value = true
  notice.value = ''
  try {
    const payload = rows.value.map((r) => ({
      no: r.no,
      isbn: r.isbn,
      title: r.title,
      subtitle: r.subtitle,
      // 출판사·저자가 비면 검색된 값 사용.
      publisher: r.publisher || r.m_publisher || '',
      author: r.author || r.m_author || '',
      qty: r.qty,
      price: r.price,
    }))
    const res = await $fetch<{ ok: boolean; data: { count: number } }>(`${apiBase}/api/orderm/dreamer`, {
      method: 'POST',
      credentials: 'include',
      body: { orderNo: Number(on), rows: payload },
    })
    notice.value = `Dreamer 전송 완료 (${res.data?.count ?? 0}건)`
  } catch (err: any) {
    notice.value = err?.data?.message || 'Dreamer 전송에 실패했습니다.'
  } finally {
    busy.value = false
  }
}
</script>

<style scoped>
.col-num {
  text-align: right;
}

/* 제목 + 주문번호 + 건수 + 버튼들을 한 줄로 */
.cp-head {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: nowrap;
}
/* 건수는 오른쪽 버튼 묶음 바로 앞에 붙인다. */
.cp-count {
  margin-left: auto;
}
/* 버튼 묶음은 한 줄 유지. */
.cp-filter-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: nowrap;
}
.cp-filter-actions .theme-form-submit {
  min-width: 70px;
  padding: 0 10px;
}
/* 할인율 10% 아닌 도서 명령 일괄 복사 아이콘 버튼 */
.cp-copy-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 33px;
  padding: 0 10px;
  border: 1px solid var(--theme-line);
  border-radius: 0;
  background: var(--theme-bg);
  color: var(--theme-fg-dim);
  cursor: pointer;
}
.cp-copy-btn:hover:not(:disabled) {
  border-color: var(--theme-fg-dim);
  color: var(--theme-fg);
}
.cp-copy-btn:disabled {
  opacity: 0.35;
  cursor: default;
}
.cp-orderno {
  display: inline-flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  color: var(--theme-fg-dim);
}
.cp-orderno > span {
  font-size: 11px;
}
.cp-orderno input {
  width: 120px;
  padding: 7px 10px;
  border: 1px solid var(--theme-line);
  border-radius: 0;
  font-size: 13px;
}
.cp-file {
  display: none;
}
.cp-notice {
  margin: 8px 0 0;
  font-size: 13px;
  color: var(--theme-fg-dim);
}

/* 매칭된 값 흐리게 (서명/출판사/저자 아래줄) */
.cp-sub {
  margin-top: 2px;
  font-size: 12px;
  color: var(--theme-fg-faint);
}
/* 할인율이 10%가 아니면 할인가를 빨갛게 */
.cp-sub.cp-dc-warn {
  color: var(--theme-error);
}

.cp-row {
  cursor: pointer;
}
.cp-table tbody tr.cp-dup td {
  background: var(--theme-bg-warning-soft);
}
.cp-table tbody tr.cp-nomatch td {
  background: var(--theme-bg-error-soft);
}
.cp-foot-label {
  text-align: right;
  font-weight: 600;
  color: var(--theme-fg-dim);
}
.cp-table tfoot td {
  border-top: 2px solid var(--theme-line);
  font-weight: 600;
}

.cp-edit-col {
  width: 76px;
  text-align: center;
  white-space: nowrap;
}
.cp-edit-btn {
  border: none;
  background: transparent;
  color: var(--theme-fg-faint);
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 6px;
}
.cp-edit-btn:hover:not(:disabled) {
  background: var(--theme-bg-sunken);
  color: var(--theme-fg);
}
.cp-edit-btn:disabled {
  opacity: 0.35;
  cursor: default;
}

/* 공통 모달 */
.cp-modal {
  position: fixed;
  inset: var(--theme-topbar-h) 0 0 0;
  z-index: 160;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 8vh;
  background: rgba(10, 12, 16, 0.32);
}
.cp-search-panel,
.cp-edit-panel {
  width: min(100%, 560px);
  max-height: 74vh;
  display: flex;
  flex-direction: column;
  background: var(--theme-bg);
  border: 1px solid var(--theme-line);
  border-radius: 12px;
  box-shadow: 0 24px 48px rgba(18, 24, 32, 0.24);
  overflow: hidden;
}
.cp-modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid var(--theme-line);
  font-size: 15px;
}
.cp-modal-input {
  margin: 12px 16px;
  padding: 9px 12px;
  border: 1px solid var(--theme-line);
  border-radius: 8px;
  font-size: 14px;
}
.cp-search-list {
  overflow-y: auto;
  padding: 0 8px 12px;
}
.cp-modal-state {
  padding: 24px;
  text-align: center;
  color: var(--theme-fg-faint);
  font-size: 13px;
}
.cp-search-row {
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 100%;
  text-align: left;
  padding: 10px 12px;
  border: none;
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
}
.cp-search-row:hover {
  background: var(--theme-bg-soft);
}
.cp-search-row-top {
  display: flex;
  align-items: center;
  gap: 8px;
}
.cp-search-row-top strong {
  font-size: 14px;
}
.cp-search-series {
  display: inline-block;
  padding: 1px 8px;
  border-radius: 999px;
  background: var(--theme-bg-sunken);
  color: var(--theme-fg-dim);
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}
.cp-search-meta {
  font-size: 12px;
  color: var(--theme-fg-faint);
}

/* 편집 폼 */
.cp-edit-form {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.cp-edit-row2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.cp-edit-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 4px;
}
.cp-edit-del {
  margin-right: auto;
}
</style>
