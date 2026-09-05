<template>
  <div class="os-modal" @click="emit('close')">
    <div class="os-panel" @click.stop>
      <div class="os-head">
        <strong>처리현황 · 주문 #{{ orderNo }}</strong>
        <button type="button" class="theme-backend-close" aria-label="닫기" @click="emit('close')">×</button>
      </div>

      <div v-if="loading" class="os-state">불러오는 중...</div>
      <div v-else-if="!items.length" class="os-state">이 주문에 등록된 도서가 없습니다.</div>

      <template v-else>
        <div class="os-totals">
          <div class="os-total"><span>주문수량</span><strong>{{ totals.qty }}</strong></div>
          <div class="os-total">
            <span>입고수량 (입고 / 미입고)</span>
            <strong>{{ totals.warehousing }} <em class="os-total-pending">/ {{ totals.pendingIn }}</em></strong>
          </div>
          <div class="os-total">
            <span>출고수량 (출고 / 미출고)</span>
            <strong>{{ totals.delivery }} <em class="os-total-pending">/ {{ totals.pendingOut }}</em></strong>
          </div>
        </div>

        <div class="os-body">
          <!-- 미입고: 주문수량보다 입고가 덜 된 도서 -->
          <section class="os-section">
            <h3 class="os-section-head">
              미입고 <span class="os-count">{{ pendingIn.length }}건</span>
            </h3>
            <p v-if="!pendingIn.length" class="os-empty">미입고 도서가 없습니다.</p>
            <table v-else class="os-table">
              <thead>
                <tr>
                  <th class="os-col-no">No</th>
                  <th>서명</th>
                  <th class="os-col-supplier">발주처</th>
                  <th class="os-col-num">주문</th>
                  <th class="os-col-num">입고</th>
                  <th class="os-col-num">미입고</th>
                  <th class="os-col-num">출고</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="it in pendingIn" :key="`in-${it.no}`">
                  <td class="os-col-no mono">{{ it.no }}</td>
                  <td>
                    <strong>{{ it.title }}</strong>
                    <div v-if="it.publisher" class="os-sub">{{ it.publisher }}</div>
                  </td>
                  <td class="os-col-supplier">{{ it.supplier || '-' }}</td>
                  <td class="os-col-num mono">{{ it.qty }}</td>
                  <td class="os-col-num mono">{{ it.warehousing_count }}</td>
                  <td class="os-col-num mono os-short">{{ it.shortage }}</td>
                  <td class="os-col-num mono">{{ it.delivery_count }}</td>
                </tr>
              </tbody>
            </table>
          </section>

          <!-- 미출고: 입고는 됐지만 아직 나가지 않은 수량이 남은 도서 -->
          <section class="os-section">
            <h3 class="os-section-head">
              미출고 <span class="os-count">{{ pendingOut.length }}건</span>
            </h3>
            <p v-if="!pendingOut.length" class="os-empty">미출고 도서가 없습니다.</p>
            <table v-else class="os-table">
              <thead>
                <tr>
                  <th class="os-col-no">No</th>
                  <th>서명</th>
                  <th class="os-col-supplier">발주처</th>
                  <th class="os-col-num">입고</th>
                  <th class="os-col-num">출고</th>
                  <th class="os-col-num">미출고</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="it in pendingOut" :key="`out-${it.no}`">
                  <td class="os-col-no mono">{{ it.no }}</td>
                  <td>
                    <strong>{{ it.title }}</strong>
                    <div v-if="it.publisher" class="os-sub">{{ it.publisher }}</div>
                  </td>
                  <td class="os-col-supplier">{{ it.supplier || '-' }}</td>
                  <td class="os-col-num mono">{{ it.warehousing_count }}</td>
                  <td class="os-col-num mono">{{ it.delivery_count }}</td>
                  <td class="os-col-num mono os-short">{{ it.shortage }}</td>
                </tr>
              </tbody>
            </table>
          </section>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
// 주문 하나의 처리현황. 주문(order) 화면과 주문도서(orderList) 화면이 함께 쓴다.
// 주문도서(order_list)를 주문번호로 받아 수량 기준으로 두 목록으로 나눈다.
//   미입고 = 주문수량 - 입고수량 > 0
//   미출고 = 입고수량 - 출고수량 > 0   (입고됐지만 아직 안 나간 분)
// 두 목록은 겹칠 수 있다. 일부만 입고되고 그 입고분도 아직 출고 전인 경우다.
type ProgressItem = {
  no: number
  title: string
  publisher: string
  supplier: string
  qty: number
  warehousing_count: number
  delivery_count: number
}

const props = defineProps<{ orderNo: number | null }>()
const emit = defineEmits<{ (e: 'close'): void }>()

const apiBase = useApiBase()
const loading = ref(false)
const rows = ref<ProgressItem[]>([])

function toNum(v: unknown) {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

async function load() {
  if (props.orderNo == null) {
    rows.value = []
    return
  }
  loading.value = true
  try {
    const res = await $fetch<{ ok: boolean; data: ProgressItem[] }>(
      `${apiBase}/api/orderm/order-list?orderNo=${props.orderNo}`,
      { credentials: 'include' },
    )
    rows.value = res.data ?? []
  } catch {
    rows.value = []
  } finally {
    loading.value = false
  }
}

onMounted(load)
watch(() => props.orderNo, load)

// delivery_count 는 출고 처리 시점에만 기록되므로 없을 수 있다 → 0 으로 본다.
const items = computed(() => rows.value.map((it) => ({
  ...it,
  qty: toNum(it.qty),
  warehousing_count: toNum(it.warehousing_count),
  delivery_count: toNum(it.delivery_count),
})))

const pendingIn = computed(() => items.value
  .map((it) => ({ ...it, shortage: it.qty - it.warehousing_count }))
  .filter((it) => it.shortage > 0))

const pendingOut = computed(() => items.value
  .map((it) => ({ ...it, shortage: it.warehousing_count - it.delivery_count }))
  .filter((it) => it.shortage > 0))

// 합계는 항목별 부족분만 더한다. 과입고(입고 > 주문)가 다른 도서의 미입고분을
// 상쇄해서 표에 뜨는 수량과 어긋나는 걸 막는다.
const totals = computed(() => items.value.reduce(
  (acc, it) => ({
    qty: acc.qty + it.qty,
    warehousing: acc.warehousing + it.warehousing_count,
    delivery: acc.delivery + it.delivery_count,
    pendingIn: acc.pendingIn + Math.max(0, it.qty - it.warehousing_count),
    pendingOut: acc.pendingOut + Math.max(0, it.warehousing_count - it.delivery_count),
  }),
  { qty: 0, warehousing: 0, delivery: 0, pendingIn: 0, pendingOut: 0 },
))
</script>

<style scoped>
.os-modal {
  position: fixed;
  inset: var(--theme-topbar-h) 0 0 0;
  z-index: 160;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 8vh;
  background: rgba(10, 12, 16, 0.32);
}
.os-panel {
  width: min(100%, 720px);
  max-height: 76vh;
  display: flex;
  flex-direction: column;
  background: var(--theme-bg);
  border: 1px solid var(--theme-line);
  border-radius: 12px;
  box-shadow: 0 24px 48px rgba(18, 24, 32, 0.24);
  overflow: hidden;
}
.os-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid var(--theme-line);
  font-size: 15px;
}
.os-totals {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--theme-line);
}
.os-total {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 12px;
  border-radius: 8px;
  background: var(--theme-bg-sunken);
}
.os-total span {
  font-size: 11px;
  color: var(--theme-fg-faint);
}
.os-total strong {
  font-size: 18px;
}
.os-total-pending {
  font-style: normal;
  font-size: 15px;
  color: #b91c1c;
}
.os-body {
  overflow-y: auto;
  padding: 4px 16px 16px;
}
.os-section + .os-section {
  margin-top: 20px;
}
.os-section-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 16px 0 8px;
  font-size: 13px;
  font-weight: 700;
}
.os-count {
  padding: 1px 8px;
  border-radius: 999px;
  background: var(--theme-bg-sunken);
  color: var(--theme-fg-dim);
  font-size: 12px;
  font-weight: 600;
}
.os-state,
.os-empty {
  padding: 20px;
  margin: 0;
  text-align: center;
  color: var(--theme-fg-faint);
  font-size: 13px;
}
.os-empty {
  padding: 12px;
  text-align: left;
}
.os-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.os-table th,
.os-table td {
  padding: 8px 10px;
  border-bottom: 1px solid var(--theme-line);
  text-align: left;
  vertical-align: top;
}
.os-table th {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: var(--theme-fg-faint);
}
.os-col-no {
  width: 48px;
}
.os-col-supplier {
  width: 96px;
}
.os-col-num {
  width: 64px;
  text-align: right;
}
.os-short {
  font-weight: 700;
  color: #b91c1c;
}
.os-sub {
  margin-top: 2px;
  font-size: 12px;
  color: var(--theme-fg-faint);
}
</style>
