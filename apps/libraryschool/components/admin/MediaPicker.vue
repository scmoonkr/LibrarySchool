<template>
  <div class="theme-backend-user-modal" @click="$emit('close')">
    <div class="theme-backend-media-picker" @click.stop>
      <header class="theme-backend-user-drawer-head">
        <strong>
          이미지 선택
          <span class="theme-meta" style="margin-left:8px">
            {{ multiple ? `${selected.length} / ${items.length}` : `${items.length}개` }}
          </span>
        </strong>
        <button type="button" class="theme-backend-close" aria-label="Close" @click="$emit('close')">×</button>
      </header>

      <div class="theme-backend-media-picker-toolbar">
        <input v-model.trim="query" type="search" placeholder="파일명 검색" />
        <span v-if="multiple" class="theme-meta">여러 개 선택 가능</span>
      </div>

      <div v-if="pending" class="theme-backend-state">Loading...</div>
      <div v-else-if="!filtered.length" class="theme-backend-state">이미지가 없습니다.</div>
      <section v-else class="theme-backend-media-picker-grid">
        <button
          v-for="m in filtered"
          :key="m.id"
          type="button"
          :class="['theme-backend-media-picker-cell', { selected: selected.includes(m.id) }]"
          @click="toggle(m.id)"
        >
          <img :src="m.paths.original" :alt="m.title || m.originalName" loading="lazy" />
          <div class="theme-backend-media-picker-meta">
            <strong>{{ m.title || m.originalName }}</strong>
          </div>
          <span v-if="selected.includes(m.id)" class="theme-backend-media-picker-check">✓</span>
        </button>
      </section>

      <footer class="theme-backend-media-picker-foot">
        <!-- 라이브러리에 없는 이미지를 여기서 바로 올리고 그대로 고를 수 있다. -->
        <label :class="['theme-form-submit', 'theme-form-submit-secondary-soft', 'media-picker-upload', { disabled: isUploading }]">
          <input
            type="file"
            accept="image/*"
            :multiple="multiple"
            :disabled="isUploading"
            hidden
            @change="onFilesSelected"
          />
          {{ isUploading ? '업로드 중...' : '+ 파일 업로드' }}
        </label>

        <span v-if="uploadError" class="theme-form-status error">{{ uploadError }}</span>
        <span v-else-if="multiple" class="theme-meta">{{ selected.length }}개 선택됨</span>
        <span v-else class="theme-meta"></span>
        <button type="button" class="theme-form-submit theme-form-submit-secondary-soft" @click="$emit('close')">취소</button>
        <button
          type="button"
          class="theme-form-submit"
          :disabled="!selected.length"
          @click="confirm"
        >선택 완료</button>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
type MediaItem = {
  id: string
  title?: string
  originalName: string
  mimeType: string
  paths: { original: string }
}

const props = defineProps<{
  open: boolean
  multiple?: boolean
}>()

const emit = defineEmits<{
  close: []
  pick: [ids: string[]]
}>()

const apiBase = useApiBase()

const query = ref('')
const selected = ref<string[]>([])

const isUploading = ref(false)
const uploadError = ref('')

const { data, pending, refresh } = useFetch<{ items: MediaItem[] }>(
  `${apiBase}/api/admin/media`,
  {
    key: 'media-picker',
    credentials: 'include',
    server: false,
    default: () => ({ items: [] }),
  },
)

const items = computed<MediaItem[]>(() => (data.value?.items ?? []).filter(m => m.mimeType?.startsWith('image/')))

const filtered = computed(() => {
  if (!query.value) return items.value
  const q = query.value.toLowerCase()
  return items.value.filter(m =>
    (m.title || '').toLowerCase().includes(q) || m.originalName.toLowerCase().includes(q),
  )
})

watch(() => props.open, (o) => {
  if (o) {
    selected.value = []
    uploadError.value = ''
  }
})

// 업로드한 이미지는 목록을 새로고침한 뒤 곧바로 선택 상태로 만들어 준다.
// (단일 선택 모드면 마지막 한 장으로 교체, 다중이면 기존 선택에 더한다)
async function uploadFiles(files: File[]) {
  if (!files.length || isUploading.value) return

  isUploading.value = true
  uploadError.value = ''

  try {
    const formData = new FormData()
    for (const file of files) formData.append('files', file)

    const result = await $fetch<{ items: MediaItem[] }>(
      `${apiBase}/api/admin/media/upload`,
      { method: 'POST', credentials: 'include', body: formData },
    )

    // 서버가 허용하지 않는 형식은 조용히 건너뛰므로 결과가 비어 있을 수 있다.
    if (!result.items?.length) {
      uploadError.value = '업로드된 이미지가 없습니다. 지원 형식을 확인해 주세요.'
      return
    }

    await refresh()

    const uploadedIds = result.items.map((item) => item.id)
    selected.value = props.multiple
      ? [...new Set([...selected.value, ...uploadedIds])]
      : [uploadedIds[uploadedIds.length - 1]]
  } catch (err: unknown) {
    const e = err as { data?: { error?: string }, message?: string }
    uploadError.value = e?.data?.error || e?.message || '업로드에 실패했습니다.'
  } finally {
    isUploading.value = false
  }
}

function onFilesSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files || [])
  input.value = ''
  uploadFiles(files)
}

function toggle(id: string) {
  if (props.multiple) {
    const i = selected.value.indexOf(id)
    if (i >= 0) selected.value.splice(i, 1)
    else selected.value.push(id)
  } else {
    selected.value = [id]
  }
}

function confirm() {
  if (!selected.value.length) return
  emit('pick', [...selected.value])
}
</script>

<style scoped>
/* 파일 input 을 감싼 label 이라 버튼처럼 보이게만 맞춰 준다.
   (배경/테두리는 theme-form-submit 계열 클래스가 담당) */
.media-picker-upload {
  display: inline-flex;
  align-items: center;
  cursor: pointer;
}

.media-picker-upload.disabled {
  opacity: 0.6;
  cursor: progress;
}
</style>
