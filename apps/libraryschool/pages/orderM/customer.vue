<template>
  <div class="theme-backend">
    <DefaultThemeTopbar
      :items="navItems"
      full-width
      backend-mode
      backend-menu-button
      hide-nav
      toolbar-title="거래처."
      @backend-menu-toggle="isSidebarOpen = !isSidebarOpen"
    />
    <div v-if="isSidebarOpen" class="theme-backend-menu-backdrop" @click="isSidebarOpen = false"></div>

    <div class="theme-backend-shell">
      <OrderSidebar :open="isSidebarOpen" current-key="customer" @close="isSidebarOpen = false" />

      <main class="theme-backend-main">
        <div class="theme-backend-head theme-backend-contents-head">
          <div class="theme-backend-contents-head-left">
            <h1>거래처.</h1>
            <div class="theme-backend-contents-filters">
              <input
                v-model="keyword"
                type="search"
                name="keyword"
                placeholder="법인명 · 사업자번호 · 담당자 검색"
              />
            </div>
          </div>
          <div class="theme-backend-head-right">
            <span class="theme-meta">{{ filtered.length }} 거래처</span>
            <button type="button" class="theme-form-submit" @click="openCreate">+ 신규 거래처</button>
          </div>
        </div>

        <div v-if="pending" class="theme-backend-state">불러오는 중...</div>
        <div v-else-if="!filtered.length" class="theme-backend-state">거래처가 없습니다.</div>

        <section v-else class="theme-backend-table-wrap">
          <table class="theme-backend-table">
            <thead>
              <tr>
                <th>법인명</th>
                <th>지점</th>
                <th>사업자등록번호</th>
                <th>담당자</th>
                <th>전화</th>
                <th>이메일</th>
                <th>주소</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in paged" :key="item.id" @click="openEdit(item)">
                <td><strong>{{ item.name }}</strong></td>
                <td>{{ item.branch || '-' }}</td>
                <td class="mono"><span v-if="item.image" class="customer-has-file" title="사업자등록증 파일 있음">*</span>{{ item.bizno || '-' }}</td>
                <td>{{ inchargeLabel(item) }}</td>
                <td class="mono">{{ item.phone || '-' }}</td>
                <td>{{ item.email || '-' }}</td>
                <td>{{ addressLabel(item) }}</td>
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
          <strong>{{ isNew ? '신규 거래처' : '거래처 수정' }}</strong>
          <button type="button" class="theme-backend-close" aria-label="닫기" @click="closeEditor">×</button>
        </div>

        <form class="theme-backend-form" @submit.prevent="save">
          <div class="theme-backend-form-grid">
            <label class="theme-form-field">
              <span>법인명 *</span>
              <input v-model="form.name" name="name" maxlength="120" required />
            </label>

            <label class="theme-form-field">
              <span>지점</span>
              <input v-model="form.branch" name="branch" maxlength="120" />
            </label>

            <label class="theme-form-field">
              <span>사업자등록번호</span>
              <input v-model="form.bizno" name="bizno" maxlength="40" placeholder="000-00-00000" />
            </label>

            <label class="theme-form-field">
              <span>대표 전화</span>
              <input v-model="form.phone" name="phone" maxlength="40" />
            </label>

            <label class="theme-form-field">
              <span>우편번호</span>
              <input v-model="form.zipcode" name="zipcode" maxlength="20" />
            </label>

            <label class="theme-form-field">
              <span>대표 이메일</span>
              <input v-model="form.email" name="email" type="email" maxlength="120" />
            </label>

            <label class="theme-form-field customer-field-wide">
              <span>주소</span>
              <input v-model="form.address" name="address" maxlength="300" />
            </label>
          </div>

          <!-- 담당자 목록 -->
          <div class="customer-incharge">
            <div class="customer-incharge-head">
              <span>담당자</span>
              <button type="button" class="theme-form-submit theme-form-submit-secondary-soft" @click="addIncharge">+ 담당자 추가</button>
            </div>
            <div v-if="!form.incharge.length" class="customer-incharge-empty">등록된 담당자가 없습니다.</div>
            <div v-else class="customer-incharge-row customer-incharge-labels">
              <span>이름</span>
              <span>전화</span>
              <span>이메일</span>
              <span>부서명</span>
              <span></span>
            </div>
            <div v-for="(person, idx) in form.incharge" :key="idx" class="customer-incharge-row">
              <input v-model="person.name" placeholder="이름" maxlength="80" />
              <input v-model="person.phone" placeholder="전화" maxlength="40" />
              <input v-model="person.email" placeholder="이메일" maxlength="120" />
              <input v-model="person.dept" placeholder="부서명" maxlength="80" />
              <button type="button" class="customer-incharge-remove" aria-label="담당자 삭제" @click="removeIncharge(idx)">×</button>
            </div>
          </div>

          <!-- 사업자등록증 파일(이미지/PDF) -->
          <div class="customer-file">
            <span class="customer-file-label">사업자등록증 (이미지/PDF)</span>
            <div class="customer-file-body">
              <input ref="fileInput" type="file" accept="image/*,application/pdf" @change="onFilePick" />
              <span v-if="isUploading" class="theme-meta">업로드 중...</span>
              <template v-else-if="form.image">
                <a :href="fileHref(form.image)" target="_blank" rel="noopener" class="customer-file-link">파일 보기</a>
                <button type="button" class="customer-file-remove" @click="clearFile">제거</button>
              </template>
            </div>
          </div>

          <label class="theme-form-field">
            <span>비고</span>
            <textarea v-model="form.note" name="note" rows="3" maxlength="2000"></textarea>
          </label>

          <p v-if="message" :class="['theme-form-status', { error: isError }]">{{ message }}</p>

          <div class="customer-actions">
            <button
              v-if="!isNew"
              type="button"
              class="theme-form-submit theme-form-submit-warning"
              :disabled="isSaving"
              @click="remove"
            >삭제</button>
            <div class="customer-actions-right">
              <button type="button" class="theme-form-submit theme-form-submit-secondary-soft" @click="closeEditor">취소</button>
              <button type="submit" class="theme-form-submit" :disabled="isSaving">{{ isSaving ? '저장 중...' : '저장' }}</button>
            </div>
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

type Incharge = { name: string; phone: string; email: string; dept: string }
type Customer = {
  id: number         // 정수 자동증가
  name: string       // 법인명
  branch: string     // 지점
  bizno: string      // 사업자등록번호
  incharge: Incharge[]
  email: string
  phone: string
  zipcode: string
  address: string
  image: string      // 사업자등록증 파일 URL
  note: string
  createdAt?: string
  updatedAt?: string
}

const { navItems } = useOrderMenu()
const apiBase = useApiBase()
const API = `${apiBase}/api/orderm/customers`

const PAGE_SIZE = 10
const isSidebarOpen = ref(false)
const keyword = ref('')
const page = ref(1)

// 거래처 목록 (DB) — 클라이언트에서만 조회.
const { data, pending, refresh } = await useFetch<{ ok: boolean; data: Customer[] }>(API, {
  key: 'orderm-customers',
  credentials: 'include',
  server: false,
  default: () => ({ ok: true, data: [] }),
})
const customers = computed<Customer[]>(() => data.value?.data ?? [])

const filtered = computed(() => {
  const q = keyword.value.trim().toLowerCase()
  if (!q) return customers.value
  return customers.value.filter((c) =>
    c.name.toLowerCase().includes(q)
    || (c.bizno || '').toLowerCase().includes(q)
    || (c.incharge || []).some((p) => (p.name || '').toLowerCase().includes(q)),
  )
})

const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / PAGE_SIZE)))
const paged = computed(() => filtered.value.slice((page.value - 1) * PAGE_SIZE, page.value * PAGE_SIZE))
watch(keyword, () => { page.value = 1 })

function inchargeLabel(c: Customer) {
  if (!c.incharge?.length) return '-'
  const [first, ...rest] = c.incharge
  return rest.length ? `${first.name} 외 ${rest.length}명` : first.name
}
function addressLabel(c: Customer) {
  if (!c.address) return '-'
  return c.zipcode ? `(${c.zipcode}) ${c.address}` : c.address
}
function fileHref(url: string) {
  if (!url) return ''
  if (/^https?:\/\//.test(url)) return url
  // DB 엔 'orderm/<파일명>' 상대경로로 저장. 서빙은 API(/api/file/<상대경로>)로 한다.
  // 구버전('/uploads/orderm/...')은 접두사를 떼어 같은 엔드포인트로 보낸다.
  const rel = url.replace(/^\/?uploads\//, '').replace(/^\/+/, '')
  return `${apiBase}/api/file/${rel}`
}

// ── 모달/폼 상태 ──────────────────────────────────────────────
const isEditorOpen = ref(false)
const editingId = ref<number | null>(null)
const isNew = computed(() => editingId.value === null)
const isSaving = ref(false)
const isUploading = ref(false)
const message = ref('')
const isError = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

const form = reactive<Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>>({
  name: '', branch: '', bizno: '', incharge: [], email: '', phone: '', zipcode: '', address: '', image: '', note: '',
})

function resetForm(src?: Customer) {
  form.name = src?.name ?? ''
  form.branch = src?.branch ?? ''
  form.bizno = src?.bizno ?? ''
  form.incharge = (src?.incharge ?? []).map((p) => ({ ...p }))
  form.email = src?.email ?? ''
  form.phone = src?.phone ?? ''
  form.zipcode = src?.zipcode ?? ''
  form.address = src?.address ?? ''
  form.image = src?.image ?? ''
  form.note = src?.note ?? ''
  message.value = ''
  isError.value = false
  if (fileInput.value) fileInput.value.value = ''
}

function openCreate() {
  editingId.value = null
  resetForm()
  isEditorOpen.value = true
}
function openEdit(item: Customer) {
  editingId.value = item.id
  resetForm(item)
  isEditorOpen.value = true
}
function closeEditor() {
  isEditorOpen.value = false
}

function addIncharge() {
  form.incharge.push({ name: '', phone: '', email: '', dept: '' })
}
function removeIncharge(idx: number) {
  form.incharge.splice(idx, 1)
}

async function onFilePick(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  isUploading.value = true
  message.value = ''
  isError.value = false
  try {
    const fd = new FormData()
    fd.append('file', file)
    const res = await $fetch<{ ok: boolean; data: { url: string } }>(`${API}/upload`, {
      method: 'POST',
      credentials: 'include',
      body: fd,
    })
    form.image = res.data.url
  } catch (err: any) {
    isError.value = true
    message.value = err?.data?.message || '파일 업로드에 실패했습니다.'
  } finally {
    isUploading.value = false
    if (fileInput.value) fileInput.value.value = ''
  }
}
function clearFile() {
  form.image = ''
  if (fileInput.value) fileInput.value.value = ''
}

async function save() {
  if (!form.name.trim()) {
    isError.value = true
    message.value = '법인명은 필수입니다.'
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
      await $fetch(`${API}/${editingId.value}`, { method: 'PUT', credentials: 'include', body })
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
  if (!window.confirm(`거래처 "${form.name}" 을(를) 삭제할까요?`)) return

  isSaving.value = true
  message.value = ''
  isError.value = false
  try {
    await $fetch(`${API}/${editingId.value}`, { method: 'DELETE', credentials: 'include' })
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
/* 담당자 4열 입력이 들어가므로 기본(520px)보다 넓게. */
.theme-backend-user-drawer {
  width: min(100%, 900px);
}

.customer-field-wide {
  grid-column: 1 / -1;
}

/* 담당자 목록 */
.customer-incharge {
  margin-top: 16px;
}
.customer-incharge-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--theme-fg-dim);
}
.customer-incharge-empty {
  padding: 8px 0;
  font-size: 13px;
  color: var(--theme-fg-faint);
}
.customer-incharge-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1.4fr 1fr auto;
  gap: 8px;
  margin-bottom: 8px;
}
.customer-incharge-row input {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid var(--theme-line);
  border-radius: 8px;
  font-size: 13px;
}
/* 담당자 열 라벨 헤더 줄 */
.customer-incharge-labels {
  margin-bottom: 4px;
  padding: 0 2px;
  font-size: 12px;
  font-weight: 600;
  color: var(--theme-fg-faint);
}
.customer-incharge-remove {
  border: 1px solid var(--theme-line);
  background: var(--theme-bg-soft);
  border-radius: 8px;
  width: 34px;
  cursor: pointer;
  color: var(--theme-fg-dim);
}

/* 파일 업로드 */
.customer-file {
  margin-top: 16px;
}
/* 사업자등록증 파일 있는 거래처 표시(*) */
.customer-has-file {
  margin-right: 2px;
  color: var(--theme-accent);
  font-weight: 700;
}
.customer-file-label {
  display: block;
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--theme-fg-dim);
}
.customer-file-body {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.customer-file-link {
  font-size: 13px;
  color: var(--theme-accent);
  text-decoration: underline;
}
.customer-file-remove {
  border: none;
  background: none;
  color: var(--theme-error);
  cursor: pointer;
  font-size: 13px;
}

/* 하단 액션: 삭제(좌) / 취소·저장(우) */
.customer-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 20px;
}
.customer-actions-right {
  display: flex;
  gap: 8px;
  margin-left: auto;
}
</style>
