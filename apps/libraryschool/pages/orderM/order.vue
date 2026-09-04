<template>
  <div class="theme-backend">
    <DefaultThemeTopbar
      :items="navItems"
      full-width
      backend-mode
      backend-menu-button
      hide-nav
      toolbar-title="주문."
      @backend-menu-toggle="isSidebarOpen = !isSidebarOpen"
    />
    <div v-if="isSidebarOpen" class="theme-backend-menu-backdrop" @click="isSidebarOpen = false"></div>

    <div class="theme-backend-shell">
      <OrderSidebar :open="isSidebarOpen" current-key="order" @close="isSidebarOpen = false" />

      <main class="theme-backend-main">
        <div class="theme-backend-head theme-backend-contents-head">
          <div class="theme-backend-contents-head-left">
            <h1>주문.</h1>
            <div class="theme-backend-contents-filters">
              <input v-model="dateFrom" type="date" name="dateFrom" aria-label="주문일자 시작" />
              <span class="filter-tilde">~</span>
              <input v-model="dateTo" type="date" name="dateTo" aria-label="주문일자 종료" />
              <select v-model="statusFilter" name="statusFilter">
                <option value="">전체 상태</option>
                <option v-for="s in STATUSES" :key="s" :value="s">{{ s }}</option>
              </select>
              <input v-model="keyword" type="search" name="keyword" placeholder="고객명 · 지점 · 주문명 검색" />
            </div>
          </div>
          <div class="theme-backend-head-right">
            <span class="theme-meta">{{ filtered.length }} 건</span>
            <button type="button" class="theme-form-submit" @click="openCreate">+ 신규 주문</button>
          </div>
        </div>

        <div v-if="pending" class="theme-backend-state">불러오는 중...</div>
        <div v-else-if="!filtered.length" class="theme-backend-state">주문이 없습니다.</div>

        <section v-else class="theme-backend-table-wrap">
          <table class="theme-backend-table">
            <thead>
              <tr>
                <th class="col-num">주문번호</th>
                <th>고객명</th>
                <th>지점</th>
                <th>주문명</th>
                <th>상태</th>
                <th>주문일자</th>
                <th class="col-num">주문금액</th>
                <th>출고일자</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in paged" :key="item.orderno" @click="openEdit(item)">
                <td class="col-num mono">{{ item.orderno }}</td>
                <td><strong>{{ item.customer }}</strong></td>
                <td>{{ item.branch || '-' }}</td>
                <td>{{ item.ordername || '-' }}</td>
                <td><span :class="['order-status', statusClass(item.status)]">{{ item.status }}</span></td>
                <td class="mono">{{ item.order_date || '-' }}</td>
                <td class="col-num mono">{{ formatPrice(item.order_price) }}</td>
                <td class="mono">{{ item.delivery_date || '-' }}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <div v-if="totalPages > 1" class="theme-backend-pagination">
          <button type="button" :disabled="page === 1" @click="page = Math.max(1, page - 1)">←</button>
          <span>{{ page }} / {{ totalPages }}</span>
          <button type="button" :disabled="page >= totalPages" @click="page = Math.min(totalPages, page + 1)">→</button>
        </div>
      </main>
    </div>

    <!-- 신규/수정 모달 -->
    <div v-if="isEditorOpen" class="theme-backend-user-modal" @click="closeEditor">
      <div class="theme-backend-user-drawer" @click.stop>
        <div class="theme-backend-user-drawer-head">
          <strong>{{ isNew ? '신규 주문' : `주문 #${editingNo}` }}</strong>
          <button type="button" class="theme-backend-close" aria-label="닫기" @click="closeEditor">×</button>
        </div>

        <form class="theme-backend-form" @submit.prevent="save">
          <div class="theme-backend-form-grid">
            <label class="theme-form-field">
              <span>고객명 *</span>
              <div class="customer-pick">
                <input v-model="form.customer" name="customer" maxlength="120" required />
                <button type="button" class="customer-pick-btn" aria-label="거래처 검색" @click="openCustomerSearch">
                  <i class="fa-solid fa-magnifying-glass"></i>
                </button>
              </div>
            </label>

            <label class="theme-form-field">
              <span>지점명</span>
              <input v-model="form.branch" name="branch" maxlength="120" />
            </label>

            <label class="theme-form-field order-field-wide">
              <span>주문명</span>
              <input v-model="form.ordername" name="ordername" maxlength="200" />
            </label>

            <label class="theme-form-field">
              <span>주문금액</span>
              <input v-model.number="form.order_price" name="order_price" type="number" min="0" step="1" />
            </label>

            <label class="theme-form-field">
              <span>주문상태</span>
              <select v-model="form.status" name="status">
                <option v-for="s in STATUSES" :key="s" :value="s">{{ s }}</option>
              </select>
            </label>

            <label class="theme-form-field">
              <span>주문일자</span>
              <input v-model="form.order_date" name="order_date" type="date" />
            </label>

            <label class="theme-form-field">
              <span>출고일자</span>
              <input v-model="form.delivery_date" name="delivery_date" type="date" />
            </label>
          </div>

          <label class="theme-form-field">
            <span>비고</span>
            <textarea v-model="form.note" name="note" rows="3" maxlength="2000"></textarea>
          </label>

          <p v-if="message" :class="['theme-form-status', { error: isError }]">{{ message }}</p>

          <div class="order-actions">
            <button
              v-if="!isNew"
              type="button"
              class="theme-form-submit theme-form-submit-warning"
              :disabled="isSaving"
              @click="remove"
            >삭제</button>
            <div class="order-actions-right">
              <button type="button" class="theme-form-submit theme-form-submit-secondary-soft" @click="closeEditor">취소</button>
              <button type="submit" class="theme-form-submit" :disabled="isSaving">{{ isSaving ? '저장 중...' : '저장' }}</button>
              <button v-if="!isNew" type="button" class="theme-form-submit theme-form-submit-secondary" @click="goToOrderList">주문도서</button>
            </div>
          </div>
        </form>
      </div>
    </div>

    <!-- 거래처 검색 모달 (주문 drawer 위에 겹쳐 뜬다) -->
    <div v-if="isCustomerSearchOpen" class="customer-search-modal" @click="closeCustomerSearch">
      <div class="customer-search-panel" @click.stop>
        <div class="customer-search-head">
          <strong>거래처 검색</strong>
          <button type="button" class="theme-backend-close" aria-label="닫기" @click="closeCustomerSearch">×</button>
        </div>
        <input
          v-model="custKeyword"
          type="search"
          class="customer-search-input"
          placeholder="법인명 · 사업자번호 · 담당자 검색"
        />
        <div class="customer-search-list">
          <div v-if="custLoading" class="customer-search-state">불러오는 중...</div>
          <div v-else-if="!custFiltered.length" class="customer-search-state">검색 결과가 없습니다.</div>
          <button
            v-for="c in custFiltered"
            v-else
            :key="c.id"
            type="button"
            class="customer-search-row"
            @click="pickCustomer(c)"
          >
            <span class="customer-search-row-top">
              <strong>{{ c.name }}</strong>
              <span v-if="c.branch" class="customer-search-branch">{{ c.branch }}</span>
            </span>
            <span class="customer-search-meta">{{ c.bizno || '사업자번호 없음' }}</span>
          </button>
        </div>
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

// 주문상태: 견적요청 → 주문 → 발주 → 입고 → 출고
const STATUSES = ['견적요청', '주문', '발주', '입고', '출고'] as const
type OrderStatus = typeof STATUSES[number]

type Order = {
  orderno: number       // 정수 자동증가
  customer: string      // 고객명
  branch: string        // 지점명
  ordername: string     // 주문명
  order_price: number   // 주문금액
  order_date: string    // 주문일자 (YYYY-MM-DD)
  delivery_date: string // 출고일자
  status: OrderStatus
  note: string
  createdAt?: string
  updatedAt?: string
}

const { navItems } = useOrderMenu()
const apiBase = useApiBase()
const API = `${apiBase}/api/orderm/orders`

const PAGE_SIZE = 10
const isSidebarOpen = ref(false)
const dateFrom = ref('')
const dateTo = ref('')
const statusFilter = ref<'' | OrderStatus>('')
const keyword = ref('')
const page = ref(1)

// 주문 목록 (DB) — 클라이언트에서만 조회.
const { data, pending, refresh } = await useFetch<{ ok: boolean; data: Order[] }>(API, {
  key: 'orderm-orders',
  credentials: 'include',
  server: false,
  default: () => ({ ok: true, data: [] }),
})
const orders = computed<Order[]>(() => data.value?.data ?? [])

const filtered = computed(() => {
  const q = keyword.value.trim().toLowerCase()
  const from = dateFrom.value
  const to = dateTo.value

  return orders.value.filter((o) => {
    if (from && o.order_date < from) return false
    if (to && o.order_date > to) return false
    if (statusFilter.value && o.status !== statusFilter.value) return false
    if (q && !(`${o.customer} ${o.branch} ${o.ordername}`.toLowerCase().includes(q))) return false
    return true
  })
})

const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / PAGE_SIZE)))
const paged = computed(() => filtered.value.slice((page.value - 1) * PAGE_SIZE, page.value * PAGE_SIZE))
watch([dateFrom, dateTo, statusFilter, keyword], () => { page.value = 1 })

const STATUS_CLASS: Record<OrderStatus, string> = {
  견적요청: 'is-quote',
  주문: 'is-order',
  발주: 'is-purchase',
  입고: 'is-instock',
  출고: 'is-shipped',
}
function statusClass(s: OrderStatus) {
  return STATUS_CLASS[s] ?? ''
}
function formatPrice(v: number) {
  return `${(v ?? 0).toLocaleString('ko-KR')}원`
}

// ── 모달/폼 상태 ──────────────────────────────────────────────
const isEditorOpen = ref(false)
const editingNo = ref<number | null>(null)
const isNew = computed(() => editingNo.value === null)
const isSaving = ref(false)
const message = ref('')
const isError = ref(false)

const form = reactive<Omit<Order, 'orderno' | 'createdAt' | 'updatedAt'>>({
  customer: '', branch: '', ordername: '', order_price: 0, order_date: '', delivery_date: '', status: '견적요청', note: '',
})

function resetForm(src?: Order) {
  form.customer = src?.customer ?? ''
  form.branch = src?.branch ?? ''
  form.ordername = src?.ordername ?? ''
  form.order_price = src?.order_price ?? 0
  form.order_date = src?.order_date ?? ''
  form.delivery_date = src?.delivery_date ?? ''
  form.status = src?.status ?? '견적요청'
  form.note = src?.note ?? ''
  message.value = ''
  isError.value = false
}

function openCreate() {
  editingNo.value = null
  resetForm()
  isEditorOpen.value = true
}
function openEdit(item: Order) {
  editingNo.value = item.orderno
  resetForm(item)
  isEditorOpen.value = true
}
function closeEditor() {
  isEditorOpen.value = false
}

// 이 주문의 주문번호를 가지고 주문도서 페이지로 이동.
function goToOrderList() {
  if (editingNo.value == null) return
  navigateTo(`/orderM/orderList?orderNo=${editingNo.value}`)
}

// ── 거래처 검색/선택 ─────────────────────────────────────────
type CustomerLite = {
  id: number
  name: string
  branch?: string
  bizno?: string
  incharge?: { name?: string }[]
}
const isCustomerSearchOpen = ref(false)
const custKeyword = ref('')
const custLoading = ref(false)
const customerList = ref<CustomerLite[]>([])

async function openCustomerSearch() {
  isCustomerSearchOpen.value = true
  custKeyword.value = ''
  // 최초 1회만 목록을 불러온다. (검색은 클라이언트에서)
  if (!customerList.value.length) {
    custLoading.value = true
    try {
      const res = await $fetch<{ ok: boolean; data: CustomerLite[] }>(`${apiBase}/api/orderm/customers`, {
        credentials: 'include',
      })
      customerList.value = res.data ?? []
    } catch {
      customerList.value = []
    } finally {
      custLoading.value = false
    }
  }
}
function closeCustomerSearch() {
  isCustomerSearchOpen.value = false
}
const custFiltered = computed(() => {
  const q = custKeyword.value.trim().toLowerCase()
  if (!q) return customerList.value
  return customerList.value.filter((c) =>
    `${c.name} ${c.branch ?? ''} ${c.bizno ?? ''}`.toLowerCase().includes(q)
    || (c.incharge ?? []).some((p) => (p.name ?? '').toLowerCase().includes(q)),
  )
})
function pickCustomer(c: CustomerLite) {
  form.customer = c.name
  form.branch = c.branch ?? ''
  closeCustomerSearch()
}

async function save() {
  if (!form.customer.trim()) {
    isError.value = true
    message.value = '고객명은 필수입니다.'
    return
  }
  isSaving.value = true
  message.value = ''
  isError.value = false
  try {
    const body = { ...form }
    if (isNew.value) {
      await $fetch(API, { method: 'POST', credentials: 'include', body })
    } else {
      await $fetch(`${API}/${editingNo.value}`, { method: 'PUT', credentials: 'include', body })
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
  if (isNew.value || isSaving.value) return
  if (!window.confirm(`주문 #${editingNo.value} 을(를) 삭제할까요?`)) return

  isSaving.value = true
  message.value = ''
  isError.value = false
  try {
    await $fetch(`${API}/${editingNo.value}`, { method: 'DELETE', credentials: 'include' })
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
.filter-tilde {
  color: var(--theme-fg-faint);
}
.col-num {
  text-align: right;
}

/* 주문상태 배지 — 단계별 색상. */
.order-status {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  border: 1px solid transparent;
}
.order-status.is-quote    { background: #eef2ff; color: #3730a3; border-color: #c7d2fe; }
.order-status.is-order    { background: #ecfeff; color: #155e75; border-color: #a5f3fc; }
.order-status.is-purchase { background: #fef3c7; color: #92400e; border-color: #fde68a; }
.order-status.is-instock  { background: #dcfce7; color: #166534; border-color: #bbf7d0; }
.order-status.is-shipped  { background: #f1f5f9; color: #334155; border-color: #e2e8f0; }

/* drawer */
.theme-backend-user-drawer {
  width: min(100%, 720px);
}
.order-field-wide {
  grid-column: 1 / -1;
}
.order-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 20px;
}
.order-actions-right {
  display: flex;
  gap: 8px;
  margin-left: auto;
}

/* 고객명 입력 + 검색 아이콘 */
.customer-pick {
  position: relative;
  display: flex;
  align-items: center;
}
.customer-pick input {
  width: 100%;
  padding-right: 38px;
}
.customer-pick-btn {
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
.customer-pick-btn:hover {
  background: var(--theme-bg-sunken);
  color: var(--theme-fg);
}

/* 거래처 검색 모달 */
.customer-search-modal {
  position: fixed;
  inset: var(--theme-topbar-h) 0 0 0;
  z-index: 160;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 8vh;
  background: rgba(10, 12, 16, 0.32);
}
.customer-search-panel {
  width: min(100%, 520px);
  max-height: 70vh;
  display: flex;
  flex-direction: column;
  background: var(--theme-bg);
  border: 1px solid var(--theme-line);
  border-radius: 12px;
  box-shadow: 0 24px 48px rgba(18, 24, 32, 0.24);
  overflow: hidden;
}
.customer-search-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid var(--theme-line);
  font-size: 15px;
}
.customer-search-input {
  margin: 12px 16px;
  padding: 9px 12px;
  border: 1px solid var(--theme-line);
  border-radius: 8px;
  font-size: 14px;
}
.customer-search-list {
  overflow-y: auto;
  padding: 0 8px 12px;
}
.customer-search-state {
  padding: 24px;
  text-align: center;
  color: var(--theme-fg-faint);
  font-size: 13px;
}
.customer-search-row {
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
.customer-search-row:hover {
  background: var(--theme-bg-soft);
}
.customer-search-row-top {
  display: flex;
  align-items: center;
  gap: 8px;
}
.customer-search-row-top strong {
  font-size: 14px;
}
.customer-search-branch {
  display: inline-block;
  padding: 1px 8px;
  border-radius: 999px;
  background: var(--theme-bg-sunken);
  color: var(--theme-fg-dim);
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}
.customer-search-meta {
  font-size: 12px;
  color: var(--theme-fg-faint);
}
</style>
