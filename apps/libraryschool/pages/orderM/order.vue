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
              <input v-model="keyword" type="search" name="keyword" placeholder="고객명 · 주문명 검색" />
            </div>
          </div>
          <div class="theme-backend-head-right">
            <span class="theme-meta">{{ filtered.length }} 건</span>
            <button type="button" class="theme-form-submit" @click="onCreate">+ 신규 주문</button>
          </div>
        </div>

        <div v-if="!filtered.length" class="theme-backend-state">주문이 없습니다.</div>

        <section v-else class="theme-backend-table-wrap">
          <table class="theme-backend-table">
            <thead>
              <tr>
                <th>주문번호</th>
                <th>상태</th>
                <th>고객명</th>
                <th>주문명</th>
                <th>주문일자</th>
                <th class="col-num">주문금액</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in paged" :key="item.orderno" @click="onEdit(item)">
                <td class="mono">{{ item.orderno }}</td>
                <td><span :class="['order-status', statusClass(item.status)]">{{ item.status }}</span></td>
                <td><strong>{{ item.customer }}</strong></td>
                <td>{{ item.ordername }}</td>
                <td class="mono">{{ item.order_date || '-' }}</td>
                <td class="col-num mono">{{ formatPrice(item.order_price) }}</td>
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
  orderno: string
  customer: string      // 고객명
  ordername: string     // 주문명
  order_date: string    // 주문일자 (YYYY-MM-DD)
  order_price: number   // 주문금액
  delivery_date?: string
  status: OrderStatus
  note?: string
}

const { navItems } = useOrderMenu()

const PAGE_SIZE = 10
const isSidebarOpen = ref(false)
const dateFrom = ref('')
const dateTo = ref('')
const statusFilter = ref<'' | OrderStatus>('')
const keyword = ref('')
const page = ref(1)

// TODO: 주문 API 연결 시 아래 샘플을 서버 목록으로 교체.
// 예) const { data } = useFetch(`${useApiBase()}/api/orderm/orders`, ...)
const orders = ref<Order[]>([
  { orderno: 'ORD-20260901-001', customer: '도서출판 한빛', ordername: '2026 신학기 도서', order_date: '2026-09-01', order_price: 1250000, status: '주문' },
  { orderno: 'ORD-20260830-014', customer: '대한교과서', ordername: '중등 참고서 세트', order_date: '2026-08-30', order_price: 3400000, status: '발주' },
  { orderno: 'ORD-20260828-009', customer: '미래북스', ordername: '아동문학 전집', order_date: '2026-08-28', order_price: 890000, status: '입고' },
  { orderno: 'ORD-20260825-003', customer: '도서출판 한빛', ordername: '전공서적 추가주문', order_date: '2026-08-25', order_price: 560000, status: '출고' },
  { orderno: 'ORD-20260902-021', customer: '미래북스', ordername: '견적 문의 - 사전류', order_date: '2026-09-02', order_price: 0, status: '견적요청' },
])

const filtered = computed(() => {
  const q = keyword.value.trim().toLowerCase()
  const from = dateFrom.value
  const to = dateTo.value

  return orders.value.filter((o) => {
    if (from && o.order_date < from) return false
    if (to && o.order_date > to) return false
    if (statusFilter.value && o.status !== statusFilter.value) return false
    if (q && !(`${o.customer} ${o.ordername}`.toLowerCase().includes(q))) return false
    return true
  })
})

const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / PAGE_SIZE)))
const paged = computed(() => filtered.value.slice((page.value - 1) * PAGE_SIZE, page.value * PAGE_SIZE))

// 필터가 바뀌면 항상 1페이지부터.
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

function onCreate() {
  // TODO: 신규 주문 작성 폼/모달 연결.
}

function onEdit(_item: Order) {
  // TODO: 주문 상세/수정 폼/모달 연결.
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
</style>
