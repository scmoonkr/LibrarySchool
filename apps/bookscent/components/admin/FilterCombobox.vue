<script setup lang="ts">
// 목록 화면 필터용 검색 가능한 select.
//
// 카테고리/태그처럼 항목이 수십 개인 필터는 <select> 를 훑기 어려워서,
// 입력창에 글자를 치면 좁혀지는 콤보박스로 쓴다.
//
// 값은 항상 option 의 id 이고, 빈 문자열이 "전체"다.
type Option = { id: string; label: string; depth?: number }

const props = withDefaults(defineProps<{
  modelValue: string
  options: Option[]
  placeholder?: string
  name?: string
}>(), {
  placeholder: '전체',
  name: undefined,
})

const emit = defineEmits<{ 'update:modelValue': [string] }>()

const rootEl = ref<HTMLElement | null>(null)
const inputEl = ref<HTMLInputElement | null>(null)
const open = ref(false)
const query = ref('')
const activeIndex = ref(0)

const selectedLabel = computed(
  () => props.options.find(o => o.id === props.modelValue)?.label ?? '',
)

// 닫혀 있으면 고른 항목을, 열려 있으면 입력 중인 글자를 보여준다.
const displayValue = computed(() => (open.value ? query.value : selectedLabel.value))

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return props.options
  return props.options.filter(o => o.label.toLowerCase().includes(q))
})

watch(filtered, () => { activeIndex.value = 0 })

function openList() {
  open.value = true
  query.value = ''
  activeIndex.value = 0
}

function closeList() {
  open.value = false
  query.value = ''
}

function pick(option: Option) {
  emit('update:modelValue', option.id)
  closeList()
  inputEl.value?.blur()
}

function clear() {
  emit('update:modelValue', '')
  closeList()
  inputEl.value?.blur()
}

function onInput(event: Event) {
  query.value = (event.target as HTMLInputElement).value
  open.value = true
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') { closeList(); inputEl.value?.blur(); return }

  if (!open.value && (event.key === 'ArrowDown' || event.key === 'Enter')) {
    openList()
    event.preventDefault()
    return
  }

  if (event.key === 'ArrowDown') {
    activeIndex.value = Math.min(activeIndex.value + 1, filtered.value.length - 1)
    event.preventDefault()
  } else if (event.key === 'ArrowUp') {
    activeIndex.value = Math.max(activeIndex.value - 1, 0)
    event.preventDefault()
  } else if (event.key === 'Enter') {
    const hit = filtered.value[activeIndex.value]
    if (hit) pick(hit)
    event.preventDefault()
  }
}

// 바깥을 누르면 닫는다.
function onDocumentPointerDown(event: PointerEvent) {
  if (!open.value) return
  if (rootEl.value && !rootEl.value.contains(event.target as Node)) closeList()
}

onMounted(() => document.addEventListener('pointerdown', onDocumentPointerDown))
onBeforeUnmount(() => document.removeEventListener('pointerdown', onDocumentPointerDown))
</script>

<template>
  <div ref="rootEl" class="theme-filter-combo" :class="{ open }">
    <input
      ref="inputEl"
      type="text"
      autocomplete="off"
      :name="name"
      :value="displayValue"
      :placeholder="selectedLabel || placeholder"
      :class="{ picked: !!modelValue }"
      @focus="openList"
      @input="onInput"
      @keydown="onKeydown"
    />

    <button
      v-if="modelValue"
      type="button"
      class="theme-filter-combo-clear"
      aria-label="지우기"
      @click="clear"
    >×</button>
    <span v-else class="theme-filter-combo-caret" aria-hidden="true">▾</span>

    <ul v-if="open" class="theme-filter-combo-list">
      <li v-if="!filtered.length" class="theme-filter-combo-empty">결과 없음</li>
      <li
        v-for="(option, i) in filtered"
        :key="option.id"
        :class="{ active: i === activeIndex, current: option.id === modelValue }"
        @mouseenter="activeIndex = i"
        @click="pick(option)"
      >
        <span v-if="option.depth" class="theme-filter-combo-indent">{{ '— '.repeat(option.depth) }}</span>{{ option.label }}
      </li>
    </ul>
  </div>
</template>

<style scoped>
.theme-filter-combo {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.theme-filter-combo input {
  width: 150px;
  padding: 6px 24px 6px 10px;
  font-size: 13px;
  font-family: var(--theme-sans);
  border: 1px solid var(--theme-line);
  border-radius: 4px;
  background: var(--theme-bg);
  color: var(--theme-fg);
  outline: none;
}

.theme-filter-combo input::placeholder {
  color: var(--theme-fg-faint);
}

/* 고른 값이 있으면 placeholder 로 보여주더라도 본문색으로 읽히게 한다. */
.theme-filter-combo input.picked::placeholder {
  color: var(--theme-fg);
}

.theme-filter-combo input:focus {
  border-color: var(--theme-accent);
}

.theme-filter-combo-clear,
.theme-filter-combo-caret {
  position: absolute;
  right: 6px;
  border: 0;
  background: none;
  padding: 0;
  font-size: 13px;
  line-height: 1;
  color: var(--theme-fg-faint);
}

.theme-filter-combo-clear {
  cursor: pointer;
  font-size: 15px;
}

.theme-filter-combo-clear:hover {
  color: var(--theme-fg);
}

.theme-filter-combo-caret {
  pointer-events: none;
  font-size: 10px;
}

.theme-filter-combo-list {
  position: absolute;
  z-index: 40;
  top: calc(100% + 4px);
  left: 0;
  min-width: 100%;
  max-width: 280px;
  max-height: 260px;
  overflow-y: auto;
  margin: 0;
  padding: 4px 0;
  list-style: none;
  background: var(--theme-bg);
  border: 1px solid var(--theme-line);
  border-radius: 4px;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.08);
}

.theme-filter-combo-list li {
  padding: 5px 10px;
  font-size: 13px;
  color: var(--theme-fg);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
}

.theme-filter-combo-list li.active {
  background: var(--theme-bg-soft);
}

.theme-filter-combo-list li.current {
  font-weight: 600;
}

.theme-filter-combo-list li.theme-filter-combo-empty {
  color: var(--theme-fg-faint);
  cursor: default;
}

.theme-filter-combo-indent {
  color: var(--theme-fg-faint);
}
</style>
