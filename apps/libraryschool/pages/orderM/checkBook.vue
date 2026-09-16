<template>
  <div class="theme-backend">
    <DefaultThemeTopbar
      :items="navItems"
      full-width
      backend-mode
      backend-menu-button
      hide-nav
      toolbar-title="입고검수."
      @backend-menu-toggle="isSidebarOpen = !isSidebarOpen"
    />
    <div v-if="isSidebarOpen" class="theme-backend-menu-backdrop" @click="isSidebarOpen = false"></div>

    <div class="theme-backend-shell">
      <OrderSidebar :open="isSidebarOpen" current-key="checkBook" @close="isSidebarOpen = false" />

      <main class="theme-backend-main">
        <div class="theme-backend-head cb-head">
          <div class="cb-head-left">
            <h1>입고검수.</h1>
            <label class="cb-orderno">
              <span>주문번호</span>
              <input
                v-model="orderNo"
                type="text"
                name="orderNo"
                placeholder="예: 2"
                @keyup.enter="loadOrder"
              />
            </label>
            <label class="cb-order-select-field">
              <span>주문</span>
              <select v-model="orderNo" name="orderSelect" class="cb-order-select" @change="loadOrder">
                <option value="">주문 선택</option>
                <option v-for="o in orderOptions" :key="o.orderno" :value="String(o.orderno)">
                  #{{ o.orderno }} · {{ o.customer }}{{ o.ordername ? ' · ' + o.ordername : '' }} ({{ o.status }})
                </option>
              </select>
            </label>
            <button type="button" class="theme-form-submit theme-form-submit-secondary-soft" @click="loadOrder">불러오기</button>
          </div>
          <div class="cb-actions">
            <button type="button" class="theme-form-submit theme-form-submit-secondary-soft" :disabled="!items.length" @click="openBasketModal">Basket</button>
            <button type="button" class="theme-form-submit" :disabled="!items.length || busy" @click="save">저장</button>
            <button type="button" class="theme-form-submit theme-form-submit-warning" :disabled="!items.length" @click="reinspect">입고내역 Clear</button>
            <button type="button" class="theme-form-submit theme-form-submit-secondary-soft" :disabled="!items.length" @click="exportExcel">엑셀저장</button>
          </div>
        </div>

        <p v-if="notice && !noticeError" class="cb-notice">{{ notice }}</p>

        <div class="cb-body">
          <!-- 좌 1/4: 스캔 패널 -->
          <aside class="cb-panel">
            <div class="cb-totals">
              <div class="cb-total">
                <span class="cb-total-label">주문수량</span>
                <strong>{{ totalQty }}</strong>
              </div>
              <div class="cb-total">
                <span class="cb-total-label">입고수량</span>
                <strong>{{ totalReceived }}</strong>
              </div>
            </div>

            <label class="cb-isbn">
              <span>ISBN</span>
              <input
                ref="isbnInput"
                v-model="isbn"
                type="text"
                inputmode="numeric"
                placeholder="바코드를 찍으세요"
                @keyup.enter="onScan"
              />
            </label>

            <div v-if="curTitle" class="cb-prev-book">
              <span class="cb-prev-book-label">입고 도서</span>
              <strong class="cb-prev-book-title">{{ curTitle }}</strong>
              <span class="cb-prev-book-sub">basket {{ curBasketNo }} · no {{ curNo }} · 주문수량 {{ curQty }} · 입고수량 {{ curReceived }}</span>
            </div>

            <div class="cb-basket">
              <div class="cb-basket-head">
                <span>basketNo</span>
                <span class="cb-basket-ratio">{{ curReceived }}/{{ curQty }} <small>(입고/주문)</small></span>
              </div>
              <strong class="cb-basket-no">{{ curBasketNo || '-' }}</strong>
            </div>

            <div v-if="noticeError && notice" class="cb-error-big">{{ notice }}</div>

            <div class="cb-prev">
              <div class="cb-prev-cell">
                <span>이전 basketNo</span>
                <strong>{{ prevBasketNo || '-' }}</strong>
              </div>
              <div class="cb-prev-cell">
                <span>no</span>
                <strong>{{ curNo || '-' }}</strong>
              </div>
            </div>

            <div v-if="prevTitle" class="cb-prev-book">
              <span class="cb-prev-book-label">이전에 입고된 도서</span>
              <strong class="cb-prev-book-title">{{ prevTitle }}</strong>
              <span class="cb-prev-book-sub">basket {{ prevBasketNo }} · no {{ prevNo }} · 주문수량 {{ prevQty }} · 입고수량 {{ prevReceived }}</span>
            </div>

            <div v-if="dup" class="cb-dupmsg">
              <span class="cb-prev-book-label">이미 입고 완료</span>
              <strong class="cb-prev-book-title">{{ dup.title }}</strong>
              <span class="cb-prev-book-sub">basket {{ dup.basketNo }} · no {{ dup.no }} · 주문수량 {{ dup.qty }} · 입고수량 {{ dup.received }}</span>
            </div>
          </aside>

          <!-- 우 3/4: 입고 테이블 -->
          <section class="cb-table-wrap">
            <div v-if="!items.length" class="theme-backend-state">
              주문번호를 입력하고 "불러오기" 하세요.
            </div>
            <table v-else class="theme-backend-table cb-table">
              <thead>
                <tr>
                  <th class="col-num cb-bsk-col">bsk#</th>
                  <th class="col-num">no</th>
                  <th>isbn</th>
                  <th>title</th>
                  <th>publisher</th>
                  <th class="col-num">price</th>
                  <th class="col-num">qty</th>
                  <th class="col-num">입고수량</th>
                  <th class="col-num">입고일자</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="item in items"
                  :key="item.no"
                  :class="{ 'cb-done': item.received >= item.qty && item.qty > 0, 'cb-partial': item.received > 0 && item.received < item.qty, 'cb-sel': item.no === selectedNo }"
                  @click="selectedNo = item.no"
                >
                  <td class="col-num mono">{{ item.basketNo }}</td>
                  <td class="col-num mono">{{ item.no }}</td>
                  <td class="mono">{{ item.isbn || '-' }}</td>
                  <td><strong>{{ item.title }}</strong></td>
                  <td>{{ item.publisher || '-' }}</td>
                  <td class="col-num mono">{{ formatPrice(item.price) }}</td>
                  <td class="col-num mono">{{ item.qty }}</td>
                  <td class="col-num mono">{{ item.received }}</td>
                  <td class="col-num mono">{{ item.warehousing_date ? item.warehousing_date.slice(5) : '-' }}</td>
                </tr>
              </tbody>
            </table>
          </section>
        </div>

        <!-- Basket 설정 모달 -->
        <div v-if="isBasketModalOpen" class="cb-modal" @click="isBasketModalOpen = false">
          <div class="cb-modal-panel" @click.stop>
            <div class="cb-modal-head">
              <strong>Basket 설정</strong>
              <button type="button" class="theme-backend-close" aria-label="닫기" @click="isBasketModalOpen = false">×</button>
            </div>
            <div class="cb-modal-body">
              <label class="cb-modal-field">
                <span>basket당 권수</span>
                <input v-model.number="basketSizeInput" type="number" min="1" />
              </label>
              <p class="cb-modal-hint">한 도서의 수량이 설정값보다 많아도 basket은 나누지 않고 같은 basket에 담습니다.</p>
            </div>
            <div class="cb-modal-actions">
              <button type="button" class="theme-form-submit theme-form-submit-secondary-soft" @click="isBasketModalOpen = false">취소</button>
              <button type="button" class="theme-form-submit" @click="applyBasketSize">설정</button>
            </div>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import DefaultThemeTopbar from '~/components/public/DefaultThemeTopbar.vue'
import OrderSidebar from '~/components/orderM/OrderSidebar.vue'

// 화면 구성은 backend 와 동일(insure 레이아웃 + theme-backend). 인증 가드는
// 로그인/권한이 준비되면 middleware: 'backend' 를 추가한다.
definePageMeta({ layout: 'insure' })

const DEFAULT_BASKET_SIZE = 10 // basketNo 기본: 10권 기준

type Item = {
  no: number
  basketNo: number
  lineNo: number      // 입고번호(줄 번호)
  isbn: string
  title: string
  publisher: string
  price: number
  qty: number
  received: number         // 입고수량
  warehousing_date: string // 입고일자 (yyyy-MM-dd)
}

// 오늘 날짜 yyyy-MM-dd (브라우저 로컬).
function today() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const { navItems } = useOrderMenu()
const apiBase = useApiBase()

const isSidebarOpen = ref(false)
const orderNo = ref('')

// 주문 선택 드롭다운 — 주문(orders)을 orderNo 큰 순서로 나열한다.
// (서버가 orderno 내림차순으로 내려준다.) 고르면 그 주문을 바로 불러온다.
type OrderOption = {
  orderno: number
  customer: string
  ordername: string
  status: string
}
const { data: ordersData } = await useAsyncData(
  'checkbook-orders-filter',
  () => $fetch<{ ok: boolean; data: OrderOption[] }>(`${apiBase}/api/orderm/orders`, {
    credentials: 'include',
  }),
  { server: false, default: () => ({ ok: true, data: [] as OrderOption[] }) },
)
const orderOptions = computed<OrderOption[]>(() => ordersData.value?.data ?? [])

const items = ref<Item[]>([])
const basketSize = ref(DEFAULT_BASKET_SIZE)
const isBasketModalOpen = ref(false)
const basketSizeInput = ref(DEFAULT_BASKET_SIZE)
const isbn = ref('')
const busy = ref(false)
const notice = ref('')
const noticeError = ref(false)
const selectedNo = ref<number | null>(null)
const isbnInput = ref<HTMLInputElement | null>(null)

const curBasketNo = ref<number | null>(null)
const curNo = ref<number | null>(null)
const curReceived = ref(0)
const curQty = ref(0)
const curTitle = ref('')
const prevBasketNo = ref<number | null>(null)
const prevNo = ref<number | null>(null)
const prevTitle = ref('')
const prevReceived = ref(0)
const prevQty = ref(0)
// 이미 입고 완료 안내(이전에 입고된 도서와 같은 형식)
const dup = ref<{ title: string; basketNo: number | null; no: number | null; qty: number; received: number } | null>(null)

const totalQty = computed(() => items.value.reduce((s, r) => s + (r.qty || 0), 0))
const totalReceived = computed(() => items.value.reduce((s, r) => s + (r.received || 0), 0))

function formatPrice(v: number) {
  return (v ?? 0).toLocaleString('ko-KR')
}
function setNotice(msg: string, isErr = false) {
  notice.value = msg
  noticeError.value = isErr
}

// basketNo 배정: no 순으로 basket당 size 권까지 채운다.
// 단, 한 도서(qty)는 basket 을 나누지 않는다 — 담으면 초과해도 같은 basket.
function assignBaskets(list: Item[], size: number) {
  const s = Math.max(1, Number(size) || DEFAULT_BASKET_SIZE)
  let basketNo = 1
  let acc = 0
  for (const it of list) {
    const q = it.qty || 0
    // 현재 basket 에 이미 담긴 게 있고, 이 도서를 더하면 초과하면 다음 basket 으로.
    if (acc > 0 && acc + q > s) {
      basketNo += 1
      acc = 0
    }
    it.basketNo = basketNo
    acc += q
  }
}

function computeBaskets(list: any[]): Item[] {
  const items: Item[] = [...list]
    .sort((a, b) => Number(a.no) - Number(b.no))
    .map((it, idx) => ({
      no: Number(it.no),
      basketNo: 1,
      lineNo: idx + 1,
      isbn: String(it.isbn || ''),
      title: String(it.title || ''),
      publisher: String(it.publisher || ''),
      price: Number(it.price) || 0,
      qty: Number(it.qty) || 0,
      received: Number(it.warehousing_count) || 0,
      warehousing_date: String(it.warehousing_date || ''),
    }))
  assignBaskets(items, basketSize.value)
  return items
}

function openBasketModal() {
  basketSizeInput.value = basketSize.value
  isBasketModalOpen.value = true
}

// 설정: basket당 권수로 basketNo 재배정.
function applyBasketSize() {
  const s = Math.max(1, Number(basketSizeInput.value) || DEFAULT_BASKET_SIZE)
  basketSize.value = s
  const sorted = [...items.value].sort((a, b) => a.no - b.no)
  assignBaskets(sorted, s)
  items.value = sorted
  isBasketModalOpen.value = false
  setNotice(`basket당 ${s}권 기준으로 basketNo를 재설정했습니다.`)
}

async function loadOrder() {
  const on = Number(orderNo.value)
  if (!(on > 0)) {
    setNotice('주문번호를 입력하세요.', true)
    return
  }
  busy.value = true
  try {
    const res = await $fetch<{ ok: boolean; data: any[] }>(`${apiBase}/api/orderm/order-list?orderNo=${on}`, {
      credentials: 'include',
    })
    const list = res.data ?? []
    items.value = computeBaskets(list)
    curBasketNo.value = null; curNo.value = null; curReceived.value = 0; curQty.value = 0; curTitle.value = ''
    prevBasketNo.value = null; prevNo.value = null; prevTitle.value = ''; prevReceived.value = 0; prevQty.value = 0
    dup.value = null
    selectedNo.value = null
    setNotice(items.value.length ? `${items.value.length}개 도서를 불러왔습니다. ISBN을 찍으세요.` : '해당 주문의 도서가 없습니다.', !items.value.length)
    nextTick(() => isbnInput.value?.focus())
  } catch {
    setNotice('주문도서를 불러오지 못했습니다.', true)
  } finally {
    busy.value = false
  }
}

function onScan() {
  const code = isbn.value.trim()
  if (!code) return
  dup.value = null // 스캔할 때마다 안내 초기화
  const it = items.value.find((x) => x.isbn === code)
  if (!it) {
    setNotice(`주문에 없는 ISBN 입니다: ${code}`, true)
    isbn.value = ''
    return
  }
  if (it.received >= it.qty) {
    // 이미 완료: 이전에 입고된 도서와 같은 형식으로 안내.
    setNotice('')
    dup.value = { title: it.title, basketNo: it.basketNo, no: it.no, qty: it.qty, received: it.received }
    isbn.value = ''
    nextTick(() => isbnInput.value?.focus())
    return
  }
  // 현재 → 이전 이동 (이전에 입고된 도서)
  prevBasketNo.value = curBasketNo.value
  prevNo.value = curNo.value
  prevTitle.value = curTitle.value
  prevReceived.value = curReceived.value
  prevQty.value = curQty.value

  it.received += 1
  it.warehousing_date = today() // 입고일자 = 오늘
  curBasketNo.value = it.basketNo
  curNo.value = it.no
  curReceived.value = it.received
  curQty.value = it.qty
  curTitle.value = it.title
  selectedNo.value = it.no
  setNotice(`입고: basket ${it.basketNo} · ${it.title} (${it.received}/${it.qty})`)
  isbn.value = ''
  nextTick(() => isbnInput.value?.focus())
}

// 저장: 입고수량을 order_list.warehousing_count 로 저장.
async function save() {
  const on = Number(orderNo.value)
  if (!(on > 0) || !items.value.length || busy.value) return
  busy.value = true
  try {
    const payload = items.value.map((i) => ({ no: i.no, warehousing_count: i.received, basketNo: i.basketNo, warehousing_date: i.warehousing_date }))
    const res = await $fetch<{ ok: boolean; data: { modified: number } }>(`${apiBase}/api/orderm/order-list/warehousing`, {
      method: 'POST',
      credentials: 'include',
      body: { orderNo: on, items: payload },
    })
    setNotice(`저장 완료 (${res.data?.modified ?? 0}건 반영)`)
  } catch {
    setNotice('저장에 실패했습니다.', true)
  } finally {
    busy.value = false
  }
}

// 입고내역 Clear: 모든 입고수량 0 으로 초기화.
function reinspect() {
  if (!window.confirm('입고내역(입고수량)을 모두 0으로 초기화할까요?')) return
  items.value.forEach((i) => { i.received = 0; i.warehousing_date = '' })
  curBasketNo.value = null; curNo.value = null; curReceived.value = 0; curQty.value = 0; curTitle.value = ''
  prevBasketNo.value = null; prevNo.value = null; prevTitle.value = ''; prevReceived.value = 0; prevQty.value = 0
  dup.value = null
  setNotice('입고내역을 모두 초기화했습니다.')
  nextTick(() => isbnInput.value?.focus())
}

// 엑셀저장: {orderNo}.xlsx
async function exportExcel() {
  if (!items.value.length) return
  const XLSX = await import('xlsx')
  const data = items.value.map((i) => ({
    basketNo: i.basketNo,
    no: i.no,
    입고번호: i.lineNo,
    isbn: i.isbn,
    title: i.title,
    publisher: i.publisher,
    price: i.price,
    qty: i.qty,
    입고수량: i.received,
  }))
  const ws = XLSX.utils.json_to_sheet(data, {
    header: ['basketNo', 'no', '입고번호', 'isbn', 'title', 'publisher', 'price', 'qty', '입고수량'],
  })
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'checkBook')
  const base = (orderNo.value || '').trim() || 'order'
  XLSX.writeFile(wb, `${base}.xlsx`)
}
</script>

<style scoped>
.col-num {
  text-align: right;
}
.cb-bsk-col {
  width: 48px;
}

.cb-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}
.cb-head-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.cb-orderno {
  display: inline-flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  color: var(--theme-fg-dim);
}
.cb-orderno > span {
  font-size: 11px;
}
.cb-orderno input {
  width: 120px;
  padding: 7px 10px;
  border: 1px solid var(--theme-line);
  border-radius: 0;
  font-size: 13px;
}
/* 주문 선택 드롭다운 — 주문번호 필드와 같은 라벨 배치 */
.cb-order-select-field {
  display: inline-flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  color: var(--theme-fg-dim);
}
.cb-order-select-field > span {
  font-size: 11px;
}
.cb-order-select {
  max-width: 240px;
  padding: 7px 10px;
  border: 1px solid var(--theme-line);
  border-radius: 0;
  font-size: 13px;
}
.cb-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.cb-head .theme-form-submit {
  min-width: 100px;
}
.cb-notice {
  margin: 8px 0 0;
  font-size: 13px;
  color: var(--theme-fg-dim);
}
.cb-notice.error {
  color: var(--theme-error);
  font-weight: 600;
}

/* 본문 1/4 : 3/4 */
.cb-body {
  display: flex;
  gap: 16px;
  margin-top: 12px;
  align-items: flex-start;
}
.cb-panel {
  flex: 0 0 25%;
  max-width: 25%;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.cb-table-wrap {
  flex: 1 1 0;
  min-width: 0;
  overflow-x: auto;
}

.cb-totals {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.cb-total {
  border: 1px solid var(--theme-line);
  border-radius: 10px;
  padding: 10px 12px;
  background: var(--theme-bg-soft);
}
.cb-total-label {
  display: block;
  font-size: 12px;
  color: var(--theme-fg-faint);
}
.cb-total strong {
  font-size: 26px;
  font-variant-numeric: tabular-nums;
}

/* ISBN 크게 */
.cb-isbn span {
  display: block;
  font-size: 13px;
  color: var(--theme-fg-dim);
  margin-bottom: 4px;
}
.cb-isbn input {
  width: 100%;
  padding: 12px 14px;
  border: 2px solid var(--theme-accent);
  border-radius: 12px;
  font-size: 28px;
  font-weight: 700;
  letter-spacing: 0.02em;
  font-variant-numeric: tabular-nums;
}

/* basketNo 크게 */
.cb-basket {
  border: 1px solid var(--theme-line);
  border-radius: 12px;
  padding: 12px 14px;
  background: var(--theme-bg-soft);
}
.cb-basket-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  font-size: 13px;
  color: var(--theme-fg-dim);
}
.cb-basket-ratio {
  font-weight: 600;
}
.cb-basket-ratio small {
  color: var(--theme-fg-faint);
  font-weight: 400;
}
.cb-basket-no {
  display: block;
  margin-top: 4px;
  font-size: 64px;
  line-height: 1.05;
  font-weight: 800;
  text-align: center;
  color: var(--theme-accent);
}

.cb-prev {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.cb-prev-cell {
  border: 1px solid var(--theme-line);
  border-radius: 10px;
  padding: 10px 12px;
  text-align: center;
}
.cb-prev-cell span {
  display: block;
  font-size: 12px;
  color: var(--theme-fg-faint);
}
.cb-prev-cell strong {
  font-size: 30px;
  font-variant-numeric: tabular-nums;
}

/* 이전에 입고된 도서 (조금 큰 폰트) */
.cb-prev-book {
  border: 1px solid var(--theme-line);
  border-radius: 10px;
  padding: 10px 12px;
  background: var(--theme-bg-soft);
}
.cb-prev-book-label {
  display: block;
  font-size: 12px;
  color: var(--theme-fg-faint);
  margin-bottom: 2px;
}
.cb-prev-book-title {
  display: block;
  font-size: 18px;
  line-height: 1.3;
}
.cb-prev-book-sub {
  display: block;
  margin-top: 2px;
  font-size: 15px;
  font-weight: 600;
  color: var(--theme-fg-dim);
}

/* 이미 입고 완료 (이전에 입고된 도서 다음). 형식은 같고 배경/글자색은 빨강 유지. */
.cb-dupmsg {
  border-radius: 12px;
  padding: 10px 12px;
  background: var(--theme-bg-error-soft);
}
.cb-dupmsg .cb-prev-book-label,
.cb-dupmsg .cb-prev-book-title,
.cb-dupmsg .cb-prev-book-sub {
  color: var(--theme-error);
}
.cb-dupmsg .cb-prev-book-sub {
  font-weight: 700;
}

/* 입고 테이블 상태색 (배경만, 테두리 없음) */
.cb-table tbody tr {
  cursor: pointer;
}
/* 행 상하 여백 축소 */
.cb-table th,
.cb-table td {
  padding-top: 4px;
  padding-bottom: 4px;
}
.cb-table tbody tr.cb-partial td {
  background: var(--theme-bg-warning-soft);
}
.cb-table tbody tr.cb-done td {
  background: var(--theme-bg-success-soft);
}

/* basketNo 하단 큰 에러 메시지 */
.cb-error-big {
  border-radius: 12px;
  padding: 12px 14px;
  background: var(--theme-bg-error-soft);
  color: var(--theme-error);
  font-size: 20px;
  font-weight: 700;
  line-height: 1.3;
  text-align: center;
}

@media (max-width: 900px) {
  .cb-body { flex-direction: column; }
  .cb-panel { flex-basis: auto; max-width: none; width: 100%; }
}

/* Basket 설정 모달 */
.cb-modal {
  position: fixed;
  inset: var(--theme-topbar-h) 0 0 0;
  z-index: 160;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 10vh;
  background: rgba(10, 12, 16, 0.32);
}
.cb-modal-panel {
  width: min(100%, 380px);
  background: var(--theme-bg);
  border: 1px solid var(--theme-line);
  border-radius: 12px;
  box-shadow: 0 24px 48px rgba(18, 24, 32, 0.24);
  overflow: hidden;
}
.cb-modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid var(--theme-line);
  font-size: 15px;
}
.cb-modal-body {
  padding: 16px;
}
.cb-modal-field {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: 14px;
}
.cb-modal-field input {
  width: 120px;
  padding: 9px 12px;
  border: 1px solid var(--theme-line);
  border-radius: 8px;
  font-size: 16px;
  text-align: right;
}
.cb-modal-hint {
  margin: 10px 0 0;
  font-size: 12px;
  color: var(--theme-fg-faint);
  line-height: 1.4;
}
.cb-modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 0 16px 16px;
}
</style>
