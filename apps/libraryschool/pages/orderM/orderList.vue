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
              <input v-model="ordernoFilter" type="search" name="ordernoFilter" placeholder="주문번호 검색" />
              <input v-model="customerFilter" type="search" name="customerFilter" placeholder="고객명 검색" />
            </div>
          </div>
          <div class="theme-backend-head-right">
            <span class="theme-meta">{{ filtered.length }} 건</span>
            <button type="button" class="theme-form-submit" @click="onCreate">+ 도서 추가</button>
          </div>
        </div>

        <div v-if="!filtered.length" class="theme-backend-state">주문도서가 없습니다.</div>

        <section v-else class="theme-backend-table-wrap">
          <table class="theme-backend-table">
            <thead>
              <tr>
                <th class="col-num">No</th>
                <th>서명</th>
                <th>출판사</th>
                <th class="col-num">정가</th>
                <th class="col-num">할인가</th>
                <th class="col-num">수량</th>
                <th>발주처</th>
                <th>발주일</th>
                <th>입고일</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in filtered" :key="`${item.orderNo}-${item.no}`" @click="onEdit(item)">
                <td class="col-num mono">{{ item.no }}</td>
                <td><strong>{{ item.title }}</strong></td>
                <td>{{ item.publisher || '-' }}</td>
                <td class="col-num mono">{{ formatPrice(item.price) }}</td>
                <td class="col-num mono">{{ formatPrice(item.dc_price) }}</td>
                <td class="col-num mono">{{ item.qty ?? 0 }}</td>
                <td>{{ item.supplier || '-' }}</td>
                <td class="mono">{{ item.order_date || '-' }}</td>
                <td class="mono">{{ item.warehousing_date || '-' }}</td>
              </tr>
            </tbody>
          </table>
        </section>
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

type OrderListItem = {
  orderNo: string       // 소속 주문번호
  customer: string      // 고객명(필터용, 주문에서 내려온 값)
  no: number            // 일련번호
  isbn?: string
  title: string         // 서명
  publisher?: string    // 출판사
  author?: string       // 저자
  qty: number           // 수량
  warehousing_count?: number
  price: number         // 정가
  dc_price: number      // 할인가
  status?: string       // 정상/품절/절판/일시품절
  supplier?: string     // 발주처
  order_price?: number  // 매입가격
  order_date?: string   // 발주일
  warehousing_date?: string // 입고일
  delivery_date?: string
  note?: string
}

const { navItems } = useOrderMenu()

const isSidebarOpen = ref(false)
const ordernoFilter = ref('')
const customerFilter = ref('')

// TODO: 주문도서 API 연결 시 아래 샘플을 서버 목록으로 교체.
// 예) const { data } = useFetch(`${useApiBase()}/api/orderm/order-items`, ...)
const items = ref<OrderListItem[]>([
  { orderNo: 'ORD-20260901-001', customer: '도서출판 한빛', no: 1, isbn: '9788968480000', title: '모던 자바스크립트 Deep Dive', publisher: '위키북스', author: '이웅모', qty: 10, price: 45000, dc_price: 40500, status: '정상', supplier: '북센', order_date: '2026-09-01', warehousing_date: '2026-09-03' },
  { orderNo: 'ORD-20260901-001', customer: '도서출판 한빛', no: 2, isbn: '9791162244000', title: 'Clean Code 클린 코드', publisher: '인사이트', author: '로버트 마틴', qty: 5, price: 33000, dc_price: 29700, status: '정상', supplier: '북센', order_date: '2026-09-01', warehousing_date: '' },
  { orderNo: 'ORD-20260830-014', customer: '대한교과서', no: 1, isbn: '9788937460000', title: '수학의 정석 실력편', publisher: '성지출판', author: '홍성대', qty: 30, price: 18000, dc_price: 16200, status: '일시품절', supplier: '교보문고', order_date: '2026-08-30', warehousing_date: '2026-09-02' },
  { orderNo: 'ORD-20260828-009', customer: '미래북스', no: 1, isbn: '9788954699000', title: '아동문학 전집 1권', publisher: '문학동네', qty: 20, price: 12000, dc_price: 10800, status: '정상', supplier: '웅진북센', order_date: '2026-08-28', warehousing_date: '2026-08-31' },
])

const filtered = computed(() => {
  const ono = ordernoFilter.value.trim().toLowerCase()
  const cus = customerFilter.value.trim().toLowerCase()
  return items.value.filter((it) => {
    if (ono && !it.orderNo.toLowerCase().includes(ono)) return false
    if (cus && !it.customer.toLowerCase().includes(cus)) return false
    return true
  })
})

function formatPrice(v: number) {
  return `${(v ?? 0).toLocaleString('ko-KR')}원`
}

function onCreate() {
  // TODO: 주문도서 추가 폼/모달 연결.
}

function onEdit(_item: OrderListItem) {
  // TODO: 주문도서 상세/수정 폼/모달 연결.
}
</script>

<style scoped>
.col-num {
  text-align: right;
}
</style>
