<template>
  <section class="block-dtc">
    <div class="dtc-head">
      <h2 class="dtc-title">{{ title }}</h2>
      <p v-if="subtitle" class="dtc-subtitle">{{ subtitle }}</p>
    </div>

    <div class="dtc-body">
      <!-- 입력 -->
      <div class="dtc-form">
        <label class="dtc-field">
          <span class="dtc-label">근로소득금액</span>
          <span class="dtc-input-wrap">
            <input
              v-model="incomeText"
              type="text"
              inputmode="numeric"
              class="dtc-input"
              placeholder="0"
              @input="onIncome"
            />
            <span class="dtc-unit">원</span>
          </span>
          <span v-if="income > 0" class="dtc-hint">{{ eokMan(income) }}</span>
        </label>

        <label class="dtc-field">
          <span class="dtc-label">기부금액</span>
          <span class="dtc-input-wrap">
            <input
              v-model="donationText"
              type="text"
              inputmode="numeric"
              class="dtc-input"
              placeholder="0"
              @input="onDonation"
            />
            <span class="dtc-unit">원</span>
          </span>
          <span v-if="donation > 0" class="dtc-hint">{{ eokMan(donation) }}</span>
        </label>
      </div>

      <!-- 결과 -->
      <div class="dtc-result">
        <div class="dtc-row">
          <span class="dtc-row-label">세액공제 대상금액 한도 <small>(근로소득의 {{ limitRate }}%)</small></span>
          <span class="dtc-row-value">{{ won(limit) }}</span>
        </div>
        <div class="dtc-row">
          <span class="dtc-row-label">세액공제 대상금액 <small>(기부금·한도 중 작은 값)</small></span>
          <span class="dtc-row-value">{{ won(eligible) }}</span>
        </div>
        <div v-if="overLimit > 0" class="dtc-row dtc-row-warn">
          <span class="dtc-row-label">한도 초과 기부금 <small>(공제 대상 아님)</small></span>
          <span class="dtc-row-value">{{ won(overLimit) }}</span>
        </div>

        <div class="dtc-breakdown">
          <div class="dtc-brk">
            <span>{{ won(lowBase) }} × {{ rateLow }}%</span>
            <span>{{ won(lowCredit) }}</span>
          </div>
          <div v-if="highBase > 0" class="dtc-brk">
            <span>{{ won(highBase) }} × {{ rateHigh }}%</span>
            <span>{{ won(highCredit) }}</span>
          </div>
        </div>

        <div class="dtc-total">
          <span class="dtc-total-label">예상 세액공제액</span>
          <strong class="dtc-total-value">{{ won(credit) }}</strong>
        </div>
      </div>
    </div>

    <p class="dtc-note">
      ※ 세액공제 대상금액은 근로소득금액의 {{ limitRate }}% 한도 내에서 인정되며,
      {{ won(threshold) }} 이하는 {{ rateLow }}%, 초과분은 {{ rateHigh }}% 로 계산한 추정치입니다.
      실제 공제액은 개인 상황·관련 법령에 따라 달라질 수 있습니다.
    </p>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

const props = defineProps<{
  block: {
    props: {
      title?: string
      subtitle?: string
      limitRate?: number
      threshold?: number
      rateLow?: number
      rateHigh?: number
    }
  }
}>()

const title = computed(() => props.block.props?.title || '기부금 세액공제 계산기')
const subtitle = computed(() => props.block.props?.subtitle ?? '근로소득금액과 기부금액을 입력하면 예상 세액공제액을 계산합니다.')

// 설정값(레지스트리 기본값: 30 / 10,000,000 / 15 / 30)
const limitRate = computed(() => num(props.block.props?.limitRate, 30))
const threshold = computed(() => num(props.block.props?.threshold, 10000000))
const rateLow = computed(() => num(props.block.props?.rateLow, 15))
const rateHigh = computed(() => num(props.block.props?.rateHigh, 30))

function num(v: unknown, fallback: number): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

// ── 입력(천단위 콤마 표시) ──
const income = ref(0)
const donation = ref(0)
const incomeText = ref('')
const donationText = ref('')

function parseNum(s: string): number {
  const n = Number(String(s).replace(/[^0-9]/g, ''))
  return Number.isFinite(n) ? n : 0
}
function onIncome() {
  income.value = parseNum(incomeText.value)
  incomeText.value = income.value ? income.value.toLocaleString('ko-KR') : ''
}
function onDonation() {
  donation.value = parseNum(donationText.value)
  donationText.value = donation.value ? donation.value.toLocaleString('ko-KR') : ''
}

// ── 계산 ──
const limit = computed(() => Math.floor(income.value * (limitRate.value / 100)))
const eligible = computed(() => Math.min(donation.value, limit.value))
const overLimit = computed(() => Math.max(0, donation.value - limit.value))

const lowBase = computed(() => Math.min(eligible.value, threshold.value))
const highBase = computed(() => Math.max(0, eligible.value - threshold.value))
const lowCredit = computed(() => Math.floor(lowBase.value * (rateLow.value / 100)))
const highCredit = computed(() => Math.floor(highBase.value * (rateHigh.value / 100)))
const credit = computed(() => lowCredit.value + highCredit.value)

// ── 포맷 ──
function won(v: number): string {
  return `${(v || 0).toLocaleString('ko-KR')}원`
}
// 억/만원 보조 표기 (예: 1억 2,340만원)
function eokMan(v: number): string {
  const n = Math.floor(v || 0)
  if (n < 10000) return ''
  const eok = Math.floor(n / 100000000)
  const man = Math.floor((n % 100000000) / 10000)
  const parts: string[] = []
  if (eok) parts.push(`${eok.toLocaleString('ko-KR')}억`)
  if (man) parts.push(`${man.toLocaleString('ko-KR')}만원`)
  else if (eok) parts.push('원')
  return parts.join(' ')
}
</script>

<style scoped>
.block-dtc {
  max-width: 720px;
  margin: 24px auto;
  padding: 24px;
  border: 1px solid var(--theme-line, #e5e7eb);
  border-radius: 14px;
  background: var(--theme-bg, #fff);
  color: var(--theme-fg, #111827);
}
.dtc-head { margin-bottom: 18px; text-align: center; }
.dtc-title { margin: 0; font-size: 22px; font-weight: 800; }
.dtc-subtitle { margin: 6px 0 0; font-size: 14px; color: var(--theme-fg-dim, #6b7280); }

.dtc-form { display: grid; gap: 14px; margin-bottom: 18px; }
.dtc-field { display: flex; flex-direction: column; gap: 6px; }
.dtc-label { font-size: 14px; font-weight: 700; }
.dtc-input-wrap { display: flex; align-items: center; gap: 8px; }
.dtc-input {
  flex: 1; min-width: 0;
  padding: 11px 14px;
  border: 1px solid var(--theme-line, #d1d5db);
  border-radius: 10px;
  background: var(--theme-bg, #fff);
  color: var(--theme-fg, #111827);
  font-size: 18px;
  font-variant-numeric: tabular-nums;
  text-align: right;
  outline: none;
}
.dtc-input:focus { border-color: var(--theme-accent, #2563eb); }
.dtc-unit { font-size: 14px; color: var(--theme-fg-dim, #6b7280); flex-shrink: 0; }
.dtc-hint { font-size: 12px; color: var(--theme-fg-faint, #9ca3af); text-align: right; }

.dtc-result {
  border-top: 1px dashed var(--theme-line, #e5e7eb);
  padding-top: 16px;
  display: grid;
  gap: 10px;
}
.dtc-row { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; font-size: 14px; }
.dtc-row-label { color: var(--theme-fg-dim, #6b7280); }
.dtc-row-label small { color: var(--theme-fg-faint, #9ca3af); font-weight: 400; }
.dtc-row-value { font-variant-numeric: tabular-nums; font-weight: 600; }
.dtc-row-warn .dtc-row-value { color: var(--theme-error, #dc2626); }

.dtc-breakdown {
  margin-top: 4px;
  padding: 10px 12px;
  background: var(--theme-bg-soft, #f9fafb);
  border-radius: 10px;
  display: grid;
  gap: 6px;
}
.dtc-brk { display: flex; justify-content: space-between; font-size: 13px; color: var(--theme-fg-dim, #6b7280); font-variant-numeric: tabular-nums; }

.dtc-total {
  margin-top: 6px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  background: var(--theme-accent-soft, #eff6ff);
  border-radius: 12px;
}
.dtc-total-label { font-size: 15px; font-weight: 700; }
.dtc-total-value { font-size: 24px; font-weight: 800; color: var(--theme-accent, #2563eb); font-variant-numeric: tabular-nums; }

.dtc-note { margin: 14px 0 0; font-size: 12px; line-height: 1.6; color: var(--theme-fg-faint, #9ca3af); }

@media (max-width: 560px) {
  .block-dtc { padding: 18px; }
  .dtc-total-value { font-size: 20px; }
}
</style>
