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
        <div class="theme-backend-head theme-backend-contents-head">
          <div class="theme-backend-contents-head-left">
            <h1>정가조회.</h1>
            <div class="theme-backend-contents-filters">
              <input v-model="keyword" type="search" name="keyword" placeholder="ISBN · 서명 · 저자 검색" />
            </div>
          </div>
          <div class="theme-backend-head-right">
            <span class="theme-meta">{{ filtered.length }} 건</span>
          </div>
        </div>

        <div v-if="!filtered.length" class="theme-backend-state">검색 결과가 없습니다.</div>

        <section v-else class="theme-backend-table-wrap">
          <table class="theme-backend-table">
            <thead>
              <tr>
                <th class="col-num">No</th>
                <th>ISBN</th>
                <th>서명</th>
                <th>출판사</th>
                <th>저자</th>
                <th class="col-num">정가</th>
                <th class="col-num">수량</th>
                <th class="col-num">금액</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, idx) in filtered" :key="item.isbn">
                <td class="col-num mono">{{ idx + 1 }}</td>
                <td class="mono">{{ item.isbn || '-' }}</td>
                <td><strong>{{ item.title }}</strong></td>
                <td>{{ item.publisher || '-' }}</td>
                <td>{{ item.author || '-' }}</td>
                <td class="col-num mono">{{ formatPrice(item.price) }}</td>
                <td class="col-num mono">{{ item.qty ?? 0 }}</td>
                <td class="col-num mono">{{ formatPrice(item.price * (item.qty ?? 0)) }}</td>
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

type PriceRow = {
  isbn: string
  title: string       // 서명
  publisher?: string  // 출판사
  author?: string     // 저자
  price: number       // 정가
  qty: number         // 수량
}

const { navItems } = useOrderMenu()

const isSidebarOpen = ref(false)
const keyword = ref('')

// TODO: 정가조회 API 연결 시 아래 샘플을 서버 목록으로 교체.
// 예) const { data } = useFetch(`${useApiBase()}/api/orderm/books?q=...`, ...)
const rows = ref<PriceRow[]>([
  { isbn: '9788968480000', title: '모던 자바스크립트 Deep Dive', publisher: '위키북스', author: '이웅모', price: 45000, qty: 10 },
  { isbn: '9791162244000', title: 'Clean Code 클린 코드', publisher: '인사이트', author: '로버트 마틴', price: 33000, qty: 5 },
  { isbn: '9788937460000', title: '수학의 정석 실력편', publisher: '성지출판', author: '홍성대', price: 18000, qty: 30 },
  { isbn: '9788954699000', title: '아동문학 전집 1권', publisher: '문학동네', author: '김작가', price: 12000, qty: 20 },
])

const filtered = computed(() => {
  const q = keyword.value.trim().toLowerCase()
  if (!q) return rows.value
  return rows.value.filter((r) =>
    r.isbn.toLowerCase().includes(q)
    || r.title.toLowerCase().includes(q)
    || (r.author ?? '').toLowerCase().includes(q),
  )
})

function formatPrice(v: number) {
  return `${(v ?? 0).toLocaleString('ko-KR')}원`
}
</script>

<style scoped>
.col-num {
  text-align: right;
}
</style>
