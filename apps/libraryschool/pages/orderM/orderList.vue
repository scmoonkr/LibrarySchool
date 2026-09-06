<template>
  <div class="theme-backend">
    <DefaultThemeTopbar
      :items="navItems"
      full-width
      backend-mode
      backend-menu-button
      hide-nav
      toolbar-title="주문도서."
      @backend-menu-toggle="isSidebarOpen = !isSidebarOpen"
    />
    <div v-if="isSidebarOpen" class="theme-backend-menu-backdrop" @click="isSidebarOpen = false"></div>

    <div class="theme-backend-shell">
      <OrderSidebar :open="isSidebarOpen" current-key="orderList" @close="isSidebarOpen = false" />

      <main class="theme-backend-main">
        <div class="theme-backend-head theme-backend-contents-head">
          <div class="theme-backend-contents-head-left">
            <h1>주문도서.</h1>
            <div class="theme-backend-contents-filters">
              <input
                v-model="ordernoFilter"
                type="search"
                name="ordernoFilter"
                inputmode="numeric"
                placeholder="주문번호"
                @keyup.enter="applyOrderNo"
                @search="applyOrderNo"
              />
              <button type="button" class="theme-form-submit theme-form-submit-secondary-soft ol-filter-btn" @click="applyOrderNo">조회</button>
              <select v-model="statusFilter" name="statusFilter">
                <option value="">전체 상태</option>
                <option v-for="s in STATUSES" :key="s" :value="s">{{ s }}</option>
              </select>
              <span v-if="contextOrderNo" class="ol-filter-sum" title="주문수량 / 입고수량 / 출고수량">
                ({{ totals.qty }} / {{ totals.warehousing }} / {{ totals.delivery }})
              </span>
            </div>
          </div>
          <div class="theme-backend-head-right">
            <span class="theme-meta">{{ filtered.length }} 건</span>
            <button
              type="button"
              class="theme-form-submit theme-form-submit-secondary-soft"
              :disabled="renumbering"
              @click="renumber"
            >{{ renumbering ? '설정 중...' : '번호설정' }}</button>
            <button type="button" class="theme-form-submit theme-form-submit-secondary-soft" :disabled="!selectedKeys.size" @click="openPurchase">발주</button>
            <button type="button" class="theme-form-submit theme-form-submit-secondary-soft" :disabled="!contextOrderNo" @click="isProgressOpen = true">처리현황</button>
            <button type="button" class="theme-form-submit theme-form-submit-secondary-soft" :disabled="!selectedKeys.size" @click="openShip">출고</button>
            <button type="button" class="theme-form-submit" :disabled="!contextOrderNo" @click="openCreate">+ 도서 추가</button>
          </div>
        </div>

        <div v-if="!contextOrderNo" class="theme-backend-state">주문번호를 입력하고 조회하세요.</div>
        <div v-else-if="pending" class="theme-backend-state">불러오는 중...</div>
        <div v-else-if="!filtered.length" class="theme-backend-state">주문도서가 없습니다.</div>

        <section v-else class="theme-backend-table-wrap">
          <table class="theme-backend-table">
            <thead>
              <tr>
                <th class="ol-check-col">
                  <input type="checkbox" :checked="allChecked" @change="toggleAll" @click.stop />
                </th>
                <th class="col-num">No</th>
                <th>ISBN</th>
                <th>서명</th>
                <th>출판사</th>
                <th class="col-num">주문/입고/출고</th>
                <th class="col-num">정가</th>
                <th>상태</th>
                <th>발주처/발주일</th>
                <th>입고일/출고일</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in filtered" :key="`${item.orderNo}-${item.no}`" @click="openEdit(item)">
                <td class="ol-check-col" @click.stop>
                  <input type="checkbox" :checked="isChecked(item)" @change="toggleOne(item)" />
                </td>
                <td class="col-num mono">{{ item.no }}</td>
                <td class="mono">{{ item.isbn || '-' }}</td>
                <td>
                  <strong>{{ item.title }}</strong>
                  <div v-if="item.subtitle" class="ol-subtitle">{{ item.subtitle }}</div>
                </td>
                <td>{{ item.publisher || '-' }}</td>
                <td class="col-num mono">{{ item.qty ?? 0 }} / {{ item.warehousing_count ?? 0 }} / {{ item.delivery_count ?? 0 }}</td>
                <td class="col-num mono">{{ formatPrice(item.price) }}</td>
                <td><span :class="['book-status', statusClass(item.status)]">{{ item.status }}</span></td>
                <td>
                  {{ item.supplier || '-' }}
                  <div v-if="item.order_date" class="ol-subtitle">{{ item.order_date }}</div>
                </td>
                <td class="mono">
                  {{ item.warehousing_date || '-' }}
                  <div v-if="item.delivery_date" class="ol-subtitle">{{ item.delivery_date }}</div>
                </td>
              </tr>
            </tbody>
          </table>
        </section>
      </main>
    </div>

    <!-- 신규/수정 모달 -->
    <div v-if="isEditorOpen" class="theme-backend-user-modal" @click="closeEditor">
      <div class="theme-backend-user-drawer" @click.stop>
        <div class="theme-backend-user-drawer-head">
          <strong>{{ isNew ? '주문도서 추가' : `주문도서 #${editing?.orderNo}-${editing?.no}` }}</strong>
          <div class="ol-drawer-search">
            <input
              v-model="headerSearch"
              type="search"
              placeholder="ISBN 제목 출판사 (띄어쓰기 AND)"
              @keyup.enter="runHeaderSearch"
            />
            <button type="button" class="ol-drawer-search-btn" aria-label="도서 검색" @click="runHeaderSearch">
              <i class="fa-solid fa-magnifying-glass"></i>
            </button>
          </div>
          <button type="button" class="theme-backend-close" aria-label="닫기" @click="closeEditor">×</button>
        </div>

        <form class="theme-backend-form" @submit.prevent="save">
          <div class="ol-grid">
            <!-- 일련번호 / 상태 / ISBN (1/3, 1/3, 1/3) -->
            <label class="theme-form-field c2">
              <span>일련번호 (No)</span>
              <input :value="isNew ? '주문 내 자동증가' : editing?.no" disabled />
            </label>
            <label class="theme-form-field c2">
              <span>상태</span>
              <select v-model="form.status" name="status">
                <option v-for="s in STATUSES" :key="s" :value="s">{{ s }}</option>
              </select>
            </label>
            <label class="theme-form-field c2">
              <span>ISBN</span>
              <div class="book-pick">
                <input v-model="form.isbn" name="isbn" maxlength="40" />
                <button type="button" class="book-pick-btn" aria-label="ISBN 검색" @click="pickIsbnDirect">
                  <i class="fa-solid fa-magnifying-glass"></i>
                </button>
              </div>
            </label>

            <!-- 서명 / 저자 (2/3, 1/3) -->
            <label class="theme-form-field c4">
              <span>서명 *</span>
              <div class="book-pick">
                <input v-model="form.title" name="title" maxlength="300" required />
                <button type="button" class="book-pick-btn" aria-label="서명 검색" @click="openBookSearch('title')">
                  <i class="fa-solid fa-magnifying-glass"></i>
                </button>
              </div>
            </label>
            <label class="theme-form-field c2">
              <span>저자</span>
              <input v-model="form.author" name="author" maxlength="120" />
            </label>

            <!-- 부제 / 출판사 (2/3, 1/3) -->
            <label class="theme-form-field c4">
              <span>부제</span>
              <input v-model="form.subtitle" name="subtitle" maxlength="300" />
            </label>
            <label class="theme-form-field c2">
              <span>출판사</span>
              <input v-model="form.publisher" name="publisher" maxlength="120" />
            </label>

            <!-- 발주처 / 수량 / 입고수량 / 출고수량 (각 1/4) -->
            <label class="theme-form-field c-quarter">
              <span>발주처</span>
              <input v-model="form.supplier" name="supplier" maxlength="120" />
            </label>
            <label class="theme-form-field c-quarter">
              <span>수량</span>
              <input v-model.number="form.qty" name="qty" type="number" min="0" />
            </label>
            <label class="theme-form-field c-quarter">
              <span>입고수량</span>
              <input v-model.number="form.warehousing_count" name="warehousing_count" type="number" min="0" />
            </label>
            <label class="theme-form-field c-quarter">
              <span>출고수량</span>
              <div class="book-pick ol-ship-count">
                <input v-model.number="form.delivery_count" name="delivery_count" type="number" min="0" />
                <button
                  type="button"
                  class="book-pick-btn ol-ship-btn"
                  title="출고 처리 — 주문수량과 같으면 '출고', 적으면 '입고' 로 상태를 바꿉니다"
                  aria-label="출고 처리"
                  @click="applyShipStatus"
                >
                  <i class="fa-solid fa-check"></i>
                </button>
              </div>
            </label>

            <!-- 정가 / 할인가 / 매입가격 (1/3, 1/3, 1/3) -->
            <label class="theme-form-field c2">
              <span>정가</span>
              <input v-model.number="form.price" name="price" type="number" min="0" />
            </label>
            <label class="theme-form-field c2">
              <span>할인가</span>
              <input v-model.number="form.dc_price" name="dc_price" type="number" min="0" />
            </label>
            <label class="theme-form-field c2">
              <span>매입가격</span>
              <input v-model.number="form.order_price" name="order_price" type="number" min="0" />
            </label>

            <!-- 발주일 / 입고일 / 출고일 (1/3, 1/3, 1/3) -->
            <label class="theme-form-field c2">
              <span>발주일</span>
              <input v-model="form.order_date" name="order_date" type="date" />
            </label>
            <label class="theme-form-field c2">
              <span>입고일</span>
              <input v-model="form.warehousing_date" name="warehousing_date" type="date" />
            </label>
            <label class="theme-form-field c2">
              <span>출고일</span>
              <input v-model="form.delivery_date" name="delivery_date" type="date" />
            </label>
          </div>

          <label class="theme-form-field">
            <span>비고</span>
            <textarea v-model="form.note" name="note" rows="3" maxlength="2000"></textarea>
          </label>

          <p v-if="message" :class="['theme-form-status', { error: isError }]">{{ message }}</p>

          <div class="ol-actions">
            <span v-if="isbnError" class="ol-isbn-error">{{ isbnError }}</span>
            <button
              v-if="!isNew"
              type="button"
              class="theme-form-submit theme-form-submit-warning"
              :disabled="isSaving"
              @click="remove"
            >삭제</button>
            <div class="ol-actions-right">
              <button type="button" class="theme-form-submit theme-form-submit-secondary-soft" @click="clearForm">지우기</button>
              <button type="submit" class="theme-form-submit" :disabled="isSaving">{{ isSaving ? '저장 중...' : '저장' }}</button>
            </div>
          </div>
        </form>
      </div>
    </div>

    <!-- 발주 모달 -->
    <div v-if="isPurchaseOpen" class="ol-purchase-modal" @click="isPurchaseOpen = false">
      <div class="ol-purchase-panel" @click.stop>
        <div class="ol-purchase-head">
          <strong>발주 ({{ selectedKeys.size }}건)</strong>
          <button type="button" class="theme-backend-close" aria-label="닫기" @click="isPurchaseOpen = false">×</button>
        </div>
        <div class="ol-purchase-body">
          <label class="theme-form-field">
            <span>발주처</span>
            <select v-model="purchaseSupplier">
              <option v-for="s in SUPPLIERS" :key="s" :value="s">{{ s }}</option>
            </select>
          </label>
          <label class="theme-form-field">
            <span>발주일자</span>
            <input v-model="purchaseDate" type="date" />
          </label>
        </div>
        <div class="ol-purchase-actions">
          <button type="button" class="theme-form-submit theme-form-submit-secondary-soft" @click="isPurchaseOpen = false">취소</button>
          <button type="button" class="theme-form-submit" :disabled="purchasing" @click="doPurchase">{{ purchasing ? '발주 중...' : '발주' }}</button>
        </div>
      </div>
    </div>

    <!-- 출고 모달 -->
    <div v-if="isShipOpen" class="ol-purchase-modal" @click="isShipOpen = false">
      <div class="ol-purchase-panel" @click.stop>
        <div class="ol-purchase-head">
          <strong>출고 ({{ selectedKeys.size }}건)</strong>
          <button type="button" class="theme-backend-close" aria-label="닫기" @click="isShipOpen = false">×</button>
        </div>
        <div class="ol-purchase-body">
          <label class="theme-form-field">
            <span>출고일자</span>
            <input v-model="shipDate" type="date" />
          </label>
          <p class="ol-ship-hint">입고수량을 출고수량으로 저장합니다. 주문수량을 다 채운 도서는 '출고', 덜 들어온 도서는 '입고' 상태가 됩니다.</p>
        </div>
        <div class="ol-purchase-actions">
          <button type="button" class="theme-form-submit theme-form-submit-secondary-soft" @click="isShipOpen = false">취소</button>
          <button type="button" class="theme-form-submit" :disabled="shipping" @click="doShip">{{ shipping ? '출고 중...' : '출고' }}</button>
        </div>
      </div>
    </div>

    <!-- 도서 검색 모달 (Reading.books) -->
    <div v-if="isBookSearchOpen" class="book-search-modal" @click="closeBookSearch">
      <div class="book-search-panel" @click.stop>
        <div class="book-search-head">
          <strong>{{ bookMode === 'isbn' ? 'ISBN 검색' : bookMode === 'tp' ? '도서 검색 (ISBN·제목·출판사)' : '서명 검색' }}</strong>
          <button type="button" class="theme-backend-close" aria-label="닫기" @click="closeBookSearch">×</button>
        </div>
        <input
          ref="bookInput"
          v-model="bookKeyword"
          type="search"
          class="book-search-input"
          :placeholder="bookMode === 'isbn' ? 'ISBN 앞자리부터 입력' : '서명 · 부제 · 원제 · 시리즈명 앞부분 입력'"
        />
        <div class="book-search-list">
          <div v-if="bookLoading" class="book-search-state">검색 중...</div>
          <div v-else-if="!bookKeyword.trim()" class="book-search-state">검색어를 입력하세요.</div>
          <div v-else-if="!bookResults.length" class="book-search-state">검색 결과가 없습니다.</div>
          <button
            v-for="b in bookResults"
            v-else
            :key="b.isbn"
            type="button"
            class="book-search-row"
            @click="pickBook(b)"
          >
            <span class="book-search-row-top">
              <strong>{{ b.title }}</strong>
              <span v-if="b.series_name" class="book-search-series">{{ b.series_name }}</span>
            </span>
            <span class="book-search-meta">
              {{ b.author || '저자 미상' }} · {{ b.publisher || '-' }} · {{ formatPrice(b.price) }} · <span class="mono">{{ b.isbn || '-' }}</span>
            </span>
          </button>
        </div>
      </div>
    </div>

    <!-- 처리현황 — 주문(order) 화면과 같은 컴포넌트를 쓴다. -->
    <OrderProgressModal
      v-if="isProgressOpen"
      :order-no="contextOrderNo"
      @close="isProgressOpen = false"
    />
  </div>
</template>

<script setup lang="ts">
import DefaultThemeTopbar from '~/components/public/DefaultThemeTopbar.vue'
import OrderSidebar from '~/components/orderM/OrderSidebar.vue'
import OrderProgressModal from '~/components/orderM/OrderProgressModal.vue'

// 화면 구성은 backend 와 동일(insure 레이아웃 + theme-backend). 인증 가드는
// 로그인/권한이 준비되면 middleware: 'backend' 를 추가한다.
definePageMeta({ layout: 'insure' })

// 도서 상태
// 주문상태: 견적요청(기본) → 주문 → 발주 → 입고 → 출고
const STATUSES = ['견적요청', '주문', '발주', '입고', '출고'] as const
type BookStatus = typeof STATUSES[number]

type OrderListItem = {
  orderNo: number
  no: number
  isbn: string
  title: string
  subtitle: string
  publisher: string
  author: string
  qty: number
  warehousing_count: number
  delivery_count: number
  price: number
  dc_price: number
  status: BookStatus
  supplier: string
  order_price: number
  order_date: string
  warehousing_date: string
  delivery_date: string
  note: string
  createdAt?: string
  updatedAt?: string
}

const { navItems } = useOrderMenu()
const apiBase = useApiBase()
const API = `${apiBase}/api/orderm/order-list`

const isSidebarOpen = ref(false)
// 주문 페이지에서 "주문도서" 로 넘어오면 ?orderNo=.. 로 해당 주문이 필터된다.
const route = useRoute()
const ordernoFilter = ref(String(route.query.orderNo ?? '').replace(/[^0-9]/g, ''))
// 실제로 서버에 질의된 주문번호. 타이핑만으로는 바뀌지 않고 Enter/조회 버튼에서 반영된다.
const appliedOrderNo = ref(ordernoFilter.value)
function applyOrderNo() {
  // 숫자만 남긴다. 빈 값이면 전체 목록.
  ordernoFilter.value = ordernoFilter.value.replace(/[^0-9]/g, '')
  appliedOrderNo.value = ordernoFilter.value
}
const statusFilter = ref<'' | BookStatus>('')
const headerSearch = ref('')

// 현재 주문 컨텍스트. 신규 도서는 이 주문번호에 속한다(drawer 에는 표시만).
const contextOrderNo = computed(() => {
  const n = Number(appliedOrderNo.value)
  return Number.isFinite(n) && n > 0 ? n : null
})
const renumbering = ref(false)
const isProgressOpen = ref(false)

// ── 체크박스 선택 & 발주 ─────────────────────────────────────
const SUPPLIERS = ['교보도매', '교보매장', '알라딘도매', '알라딘', '교보', 'Amazon', '기타'] as const
const selectedKeys = ref<Set<string>>(new Set())
const isPurchaseOpen = ref(false)
const purchaseSupplier = ref<string>(SUPPLIERS[0])
const purchaseDate = ref('')
const purchasing = ref(false)

function rowKey(item: { orderNo: number; no: number }) {
  return `${item.orderNo}-${item.no}`
}
function isChecked(item: { orderNo: number; no: number }) {
  return selectedKeys.value.has(rowKey(item))
}
function toggleOne(item: { orderNo: number; no: number }) {
  const k = rowKey(item)
  const next = new Set(selectedKeys.value)
  if (next.has(k)) next.delete(k)
  else next.add(k)
  selectedKeys.value = next
}
const allChecked = computed(() => filtered.value.length > 0 && filtered.value.every((it) => selectedKeys.value.has(rowKey(it))))
function toggleAll() {
  if (allChecked.value) {
    selectedKeys.value = new Set()
  } else {
    selectedKeys.value = new Set(filtered.value.map((it) => rowKey(it)))
  }
}

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function openPurchase() {
  if (!selectedKeys.value.size) return
  purchaseSupplier.value = SUPPLIERS[0]
  purchaseDate.value = todayStr()
  isPurchaseOpen.value = true
}
function selectedKeyList() {
  return [...selectedKeys.value].map((k) => {
    const [o, n] = k.split('-')
    return { orderNo: Number(o), no: Number(n) }
  })
}

async function doPurchase() {
  if (purchasing.value || !selectedKeys.value.size) return
  purchasing.value = true
  try {
    await $fetch(`${apiBase}/api/orderm/order-list/purchase`, {
      method: 'POST',
      credentials: 'include',
      body: { keys: selectedKeyList(), order_date: purchaseDate.value, supplier: purchaseSupplier.value },
    })
    await refresh()
    selectedKeys.value = new Set()
    isPurchaseOpen.value = false
  } catch (err: any) {
    window.alert(err?.data?.message || '발주에 실패했습니다.')
  } finally {
    purchasing.value = false
  }
}

// ── 출고 ─────────────────────────────────────────────────────
const isShipOpen = ref(false)
const shipDate = ref('')
const shipping = ref(false)

function openShip() {
  if (!selectedKeys.value.size) return
  shipDate.value = todayStr()
  isShipOpen.value = true
}
async function doShip() {
  if (shipping.value || !selectedKeys.value.size) return
  shipping.value = true
  try {
    await $fetch(`${apiBase}/api/orderm/order-list/shipping`, {
      method: 'POST',
      credentials: 'include',
      body: { keys: selectedKeyList(), delivery_date: shipDate.value },
    })
    await refresh()
    selectedKeys.value = new Set()
    isShipOpen.value = false
  } catch (err: any) {
    window.alert(err?.data?.message || '출고에 실패했습니다.')
  } finally {
    shipping.value = false
  }
}

// 목록 (DB) — 클라이언트에서만 조회.
// 조회된 주문번호가 있을 때만 서버를 부른다. 없으면 빈 목록이라 화면은 blank 상태가 된다.
// contextOrderNo 가 바뀌면(=조회하면) 자동으로 다시 받아온다.
const EMPTY_LIST = { ok: true, data: [] as OrderListItem[] }
const { data, pending, refresh } = await useAsyncData(
  'orderm-order-list',
  () => {
    const on = contextOrderNo.value
    if (!on) return Promise.resolve(EMPTY_LIST)
    return $fetch<{ ok: boolean; data: OrderListItem[] }>(`${API}?orderNo=${on}`, {
      credentials: 'include',
    })
  },
  {
    server: false,
    default: () => EMPTY_LIST,
    watch: [contextOrderNo],
  },
)
const items = computed<OrderListItem[]>(() => data.value?.data ?? [])

const filtered = computed(() => {
  const st = statusFilter.value
  if (!st) return items.value
  return items.value.filter((it) => it.status === st)
})

// 필터 줄에 표기하는 수량 합계. 목록에 보이는 것(=상태 필터 적용 후) 기준이다.
const totals = computed(() => filtered.value.reduce(
  (acc, it) => ({
    qty: acc.qty + (Number(it.qty) || 0),
    warehousing: acc.warehousing + (Number(it.warehousing_count) || 0),
    delivery: acc.delivery + (Number(it.delivery_count) || 0),
  }),
  { qty: 0, warehousing: 0, delivery: 0 },
))

const STATUS_CLASS: Record<BookStatus, string> = {
  견적요청: 'is-quote',
  주문: 'is-order',
  발주: 'is-purchase',
  입고: 'is-instock',
  출고: 'is-shipped',
}
function statusClass(s: BookStatus) {
  return STATUS_CLASS[s] ?? ''
}
function formatPrice(v: number) {
  return `${(v ?? 0).toLocaleString('ko-KR')}원`
}

// ── 모달/폼 상태 ──────────────────────────────────────────────
const isEditorOpen = ref(false)
const editing = ref<{ orderNo: number; no: number } | null>(null)
const isNew = computed(() => editing.value === null)
const isSaving = ref(false)
const message = ref('')
const isError = ref(false)

type FormShape = Omit<OrderListItem, 'no' | 'createdAt' | 'updatedAt'>
function blankForm(): FormShape {
  return {
    orderNo: 0, isbn: '', title: '', subtitle: '', publisher: '', author: '',
    qty: 1, warehousing_count: 0, delivery_count: 0, price: 0, dc_price: 0,
    status: '견적요청', supplier: '', order_price: 0,
    order_date: '', warehousing_date: '', delivery_date: '', note: '',
  }
}
const form = reactive<FormShape>(blankForm())

function resetForm(src?: OrderListItem) {
  Object.assign(form, blankForm(), src ? {
    orderNo: src.orderNo, isbn: src.isbn, title: src.title, subtitle: src.subtitle, publisher: src.publisher, author: src.author,
    qty: src.qty, warehousing_count: src.warehousing_count, delivery_count: src.delivery_count ?? 0,
    price: src.price, dc_price: src.dc_price,
    status: src.status, supplier: src.supplier, order_price: src.order_price,
    order_date: src.order_date, warehousing_date: src.warehousing_date, delivery_date: src.delivery_date, note: src.note,
  } : {})
  message.value = ''
  isError.value = false
  isbnError.value = ''
}

// 입력값만 비운다(주문번호는 유지). drawer 는 닫지 않는다.
function clearForm() {
  const keepOrderNo = form.orderNo
  Object.assign(form, blankForm())
  form.orderNo = keepOrderNo
  message.value = ''
  isError.value = false
  isbnError.value = ''
}

// 출고수량 옆 체크. 주문수량과 같으면(또는 넘으면) '출고', 적으면 '입고'.
function applyShipStatus() {
  const ordered = Number(form.qty) || 0
  const shipped = Number(form.delivery_count) || 0
  form.status = shipped >= ordered ? '출고' : '입고'
}

function openCreate() {
  editing.value = null
  resetForm()
  form.orderNo = contextOrderNo.value ?? 0 // 주문 컨텍스트에서 자동 설정
  isEditorOpen.value = true
}
function openEdit(item: OrderListItem) {
  editing.value = { orderNo: item.orderNo, no: item.no }
  resetForm(item)
  isEditorOpen.value = true
}
function closeEditor() {
  isEditorOpen.value = false
}

// ── 도서 검색 (Reading.books) ─────────────────────────────────
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
const isBookSearchOpen = ref(false)
const bookMode = ref<'isbn' | 'title' | 'tp'>('title')
const isbnError = ref('')
const bookKeyword = ref('')
const bookLoading = ref(false)
const bookResults = ref<BookHit[]>([])
const bookInput = ref<HTMLInputElement | null>(null)
let bookTimer: ReturnType<typeof setTimeout> | null = null

function openBookSearch(mode: 'isbn' | 'title' | 'tp', initial?: string) {
  bookMode.value = mode
  bookKeyword.value = initial ?? (mode === 'isbn' ? form.isbn : form.title)
  bookResults.value = []
  isBookSearchOpen.value = true
  nextTick(() => bookInput.value?.focus())
  runBookSearch()
}

// 헤더 검색: 제목+출판사 AND 검색. 결과에서 고르면 신규 도서로 채워진다.
function runHeaderSearch() {
  const q = headerSearch.value.trim()
  if (!q) return
  openBookSearch('tp', q)
}
function closeBookSearch() {
  isBookSearchOpen.value = false
}

// 입력 시 250ms 디바운스 후 서버 검색.
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
    const param = bookMode.value === 'isbn'
      ? `isbn=${encodeURIComponent(q)}`
      : bookMode.value === 'tp'
        ? `tp=${encodeURIComponent(q)}`
        : `q=${encodeURIComponent(q)}`
    const res = await $fetch<{ ok: boolean; data: BookHit[] }>(`${apiBase}/api/orderm/books?${param}`, {
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
  // 헤더 검색 등 drawer 가 닫힌 상태에서 고르면 신규 도서 drawer 를 연다.
  if (!isEditorOpen.value) openCreate()
  form.isbn = b.isbn ?? ''
  form.title = b.title ?? ''
  form.subtitle = b.subtitle ?? ''
  form.author = b.author ?? ''
  form.publisher = b.publisher ?? ''
  form.price = Number(b.price) || 0
  form.dc_price = Number(b.dc_price) || 0
  isbnError.value = ''
  closeBookSearch()
}

// ISBN 검색: 결과가 유일하므로 모달 없이 바로 채운다. 없으면 에러 표시.
async function pickIsbnDirect() {
  isbnError.value = ''
  const q = form.isbn.trim()
  if (!q) {
    isbnError.value = 'ISBN을 입력하세요.'
    return
  }
  try {
    const res = await $fetch<{ ok: boolean; data: BookHit[] }>(`${apiBase}/api/orderm/books?isbn=${encodeURIComponent(q)}`, {
      credentials: 'include',
    })
    const rows = res.data ?? []
    if (!rows.length) {
      isbnError.value = '해당 ISBN의 도서를 찾을 수 없습니다.'
      return
    }
    pickBook(rows[0])
  } catch {
    isbnError.value = '검색 중 오류가 발생했습니다.'
  }
}

// 현재 주문의 도서를 순서대로 10, 20, 30 … 으로 번호 재설정.
async function renumber() {
  if (renumbering.value) return
  const orderNo = contextOrderNo.value
  if (!orderNo) {
    window.alert('주문을 먼저 선택하세요. (주문번호로 필터하거나 주문 화면의 "주문도서" 버튼으로 진입)')
    return
  }
  if (!window.confirm(`주문 #${orderNo} 의 도서 번호를 순서대로 10, 20, 30 … 으로 재설정할까요?`)) return

  renumbering.value = true
  try {
    await $fetch(`${API}/renumber`, { method: 'POST', credentials: 'include', body: { orderNo } })
    await refresh()
  } catch (err: any) {
    window.alert(err?.data?.message || '번호 재설정에 실패했습니다.')
  } finally {
    renumbering.value = false
  }
}

async function save() {
  if (isNew.value && !(Number(form.orderNo) > 0)) {
    isError.value = true
    message.value = '주문을 먼저 선택하세요. (주문 화면의 "주문도서" 버튼으로 진입하거나 주문번호로 필터)'
    return
  }
  if (!form.title.trim()) {
    isError.value = true
    message.value = '서명은 필수입니다.'
    return
  }
  isSaving.value = true
  message.value = ''
  isError.value = false
  try {
    if (isNew.value) {
      await $fetch(API, { method: 'POST', credentials: 'include', body: { ...form } })
    } else {
      await $fetch(`${API}/${editing.value!.orderNo}/${editing.value!.no}`, {
        method: 'PUT', credentials: 'include', body: { ...form },
      })
    }
    await refresh()
    isEditorOpen.value = false
  } catch (err: any) {
    isError.value = true
    message.value = err?.data?.message || '저장에 실패했습니다.'
  } finally {
    isSaving.value = false
  }
}

async function remove() {
  if (isNew.value || isSaving.value || !editing.value) return
  if (!window.confirm(`주문도서 #${editing.value.orderNo}-${editing.value.no} 을(를) 삭제할까요?`)) return

  isSaving.value = true
  message.value = ''
  isError.value = false
  try {
    await $fetch(`${API}/${editing.value.orderNo}/${editing.value.no}`, {
      method: 'DELETE', credentials: 'include',
    })
    await refresh()
    isEditorOpen.value = false
  } catch (err: any) {
    isError.value = true
    message.value = err?.data?.message || '삭제에 실패했습니다.'
  } finally {
    isSaving.value = false
  }
}
</script>

<style scoped>
/* 헤더 필터 — drawer 검색 입력(.ol-drawer-search input)과 같은 모양 */
.theme-backend-contents-filters input {
  padding: 7px 12px;
  border: 1px solid var(--theme-line);
  border-radius: 8px;
  background: var(--theme-bg);
  color: var(--theme-fg);
  font-family: var(--theme-sans);
  font-size: 13px;
  outline: none;
}
.theme-backend-contents-filters input:focus {
  border-color: var(--theme-accent);
}
.theme-backend-contents-filters input[name='ordernoFilter'] {
  width: 120px;
}
/* 상태 select 는 전역 .theme-backend-contents-filters select 스타일을 쓰되,
   주문번호 입력과 높이·모서리를 맞춘다. */
.theme-backend-contents-filters select {
  padding: 7px 12px;
  border-radius: 8px;
  font-size: 13px;
}
/* 조회 버튼. .theme-form-submit 기본값(150px/46px)은 필터 줄에 너무 커서 낮춘다. */
.theme-backend-head-right .theme-form-submit {
  min-width: 100px;
}
.ol-filter-sum {
  font-family: var(--theme-mono, monospace);
  font-size: 13px;
  color: var(--theme-fg-dim);
  white-space: nowrap;
  align-self: center;
}
.ol-filter-btn {
  min-width: 100px;
  min-height: 33px;
  border-radius: 8px;
  padding: 0 14px;
}

.col-num {
  text-align: right;
}
.ol-check-col {
  width: 36px;
  text-align: center;
}
.ol-check-col input {
  cursor: pointer;
}

/* 발주 모달 */
.ol-purchase-modal {
  position: fixed;
  inset: var(--theme-topbar-h) 0 0 0;
  z-index: 160;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 10vh;
  background: rgba(10, 12, 16, 0.32);
}
.ol-purchase-panel {
  width: min(100%, 400px);
  background: var(--theme-bg);
  border: 1px solid var(--theme-line);
  border-radius: 12px;
  box-shadow: 0 24px 48px rgba(18, 24, 32, 0.24);
  overflow: hidden;
}
.ol-purchase-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid var(--theme-line);
  font-size: 15px;
}
.ol-purchase-body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.ol-purchase-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 0 16px 16px;
}
.ol-ship-hint {
  margin: 0;
  font-size: 12px;
  color: var(--theme-fg-faint);
  line-height: 1.4;
}
.ol-subtitle {
  margin-top: 2px;
  font-size: 12px;
  color: var(--theme-fg-faint);
}

/* drawer 헤더 도서 검색 필드 (제목 옆) */
.ol-drawer-search {
  position: relative;
  display: flex;
  align-items: center;
  margin-left: auto;
  margin-right: 8px;
}
.ol-drawer-search input {
  width: 380px;
  max-width: 52vw;
  padding: 7px 34px 7px 12px;
  border: 1px solid var(--theme-line);
  border-radius: 8px;
  font-size: 13px;
}
.ol-drawer-search-btn {
  position: absolute;
  right: 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--theme-fg-faint);
  cursor: pointer;
}
.ol-drawer-search-btn:hover {
  background: var(--theme-bg-sunken);
  color: var(--theme-fg);
}

/* 도서 상태 배지 */
.book-status {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  border: 1px solid transparent;
}
.book-status.is-quote    { background: #eef2ff; color: #3730a3; border-color: #c7d2fe; }
.book-status.is-order    { background: #ecfeff; color: #155e75; border-color: #a5f3fc; }
.book-status.is-purchase { background: #fef3c7; color: #92400e; border-color: #fde68a; }
.book-status.is-instock  { background: #dcfce7; color: #166534; border-color: #bbf7d0; }
.book-status.is-shipped  { background: #f1f5f9; color: #334155; border-color: #e2e8f0; }

/* drawer */
.theme-backend-user-drawer {
  width: min(100%, 860px);
}

/* 6열 그리드: 1/3=span2, 1/2=span3, 2/3=span4 */
.ol-grid {
  display: grid;
  /* 1/4 폭을 쓰려고 12칸으로 잡는다. c2/c3/c4 는 6칸 시절과 같은 비율을 유지한다. */
  grid-template-columns: repeat(12, 1fr);
  gap: 12px 14px;
}
.ol-grid .c2 { grid-column: span 4; }  /* 1/3 */
.ol-grid .c3 { grid-column: span 6; }  /* 1/2 */
.ol-grid .c4 { grid-column: span 8; }  /* 2/3 */
.ol-grid .c-quarter { grid-column: span 3; }
.ol-grid .theme-form-field { min-width: 0; }

/* 체크 버튼이 number 입력의 스피너와 겹치므로 이 칸에서만 스피너를 숨긴다. */
.ol-ship-count input {
  -moz-appearance: textfield;
  appearance: textfield;
}
.ol-ship-count input::-webkit-outer-spin-button,
.ol-ship-count input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

/* 출고 처리 체크 — 눌러야 하는 버튼이라 검색 아이콘보다 진하게 둔다. */
.ol-ship-btn {
  color: var(--theme-fg-dim);
}
.ol-ship-btn:hover {
  background: var(--theme-bg-sunken);
  color: var(--theme-fg);
}

@media (max-width: 640px) {
  .ol-grid { grid-template-columns: 1fr; }
  .ol-grid .c2,
  .ol-grid .c3,
  .ol-grid .c4,
  .ol-grid .c-quarter { grid-column: auto; }
}
.ol-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 20px;
}
.ol-actions-right {
  display: flex;
  gap: 8px;
  margin-left: auto;
}
.ol-isbn-error {
  align-self: center;
  font-size: 13px;
  font-weight: 600;
  color: var(--theme-error);
}

/* 입력 + 검색 아이콘 */
.book-pick {
  position: relative;
  display: flex;
  align-items: center;
}
.book-pick input {
  width: 100%;
  padding-right: 38px;
}
.book-pick-btn {
  position: absolute;
  right: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--theme-fg-faint);
  cursor: pointer;
}
.book-pick-btn:hover {
  background: var(--theme-bg-sunken);
  color: var(--theme-fg);
}

/* 도서 검색 모달 */
.book-search-modal {
  position: fixed;
  inset: var(--theme-topbar-h) 0 0 0;
  z-index: 160;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 8vh;
  background: rgba(10, 12, 16, 0.32);
}
.book-search-panel {
  width: min(100%, 640px);
  max-height: 74vh;
  display: flex;
  flex-direction: column;
  background: var(--theme-bg);
  border: 1px solid var(--theme-line);
  border-radius: 12px;
  box-shadow: 0 24px 48px rgba(18, 24, 32, 0.24);
  overflow: hidden;
}
.book-search-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid var(--theme-line);
  font-size: 15px;
}
.book-search-input {
  margin: 12px 16px;
  padding: 9px 12px;
  border: 1px solid var(--theme-line);
  border-radius: 8px;
  font-size: 14px;
}
.book-search-list {
  overflow-y: auto;
  padding: 0 8px 12px;
}
.book-search-state {
  padding: 24px;
  text-align: center;
  color: var(--theme-fg-faint);
  font-size: 13px;
}
.book-search-row {
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
.book-search-row:hover {
  background: var(--theme-bg-soft);
}
.book-search-row-top {
  display: flex;
  align-items: center;
  gap: 8px;
}
.book-search-row-top strong {
  font-size: 14px;
}
.book-search-series {
  display: inline-block;
  padding: 1px 8px;
  border-radius: 999px;
  background: var(--theme-bg-sunken);
  color: var(--theme-fg-dim);
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}
.book-search-meta {
  font-size: 12px;
  color: var(--theme-fg-faint);
}
</style>
