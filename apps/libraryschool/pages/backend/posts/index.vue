<template>
  <div class="theme-backend">
    <DefaultThemeTopbar
      :items="navItems"
      full-width
      backend-mode
      backend-menu-button
      hide-nav
      toolbar-title="Posts."
      @backend-menu-toggle="isSidebarOpen = !isSidebarOpen"
    />
    <div v-if="isSidebarOpen" class="theme-backend-menu-backdrop" @click="isSidebarOpen = false"></div>

    <div class="theme-backend-shell">
      <BackendSidebar :open="isSidebarOpen" current-key="posts" @close="isSidebarOpen = false" />

      <main class="theme-backend-main">
        <div class="theme-backend-head theme-backend-contents-head">
          <div class="theme-backend-contents-head-left">
            <h1>Posts.</h1>
            <div class="theme-backend-contents-filters">
              <select v-model="statusFilter" name="statusFilter">
                <option value="">All status</option>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="hidden">Hidden</option>
                <option value="deleted">Deleted (휴지통)</option>
              </select>
              <FilterCombobox
                v-model="categoryFilter"
                name="categoryFilter"
                placeholder="All categories"
                :options="categoryComboOptions"
              />
              <FilterCombobox
                v-model="tagFilter"
                name="tagFilter"
                placeholder="All tags"
                :options="tagComboOptions"
              />
              <select v-model="sortBy" name="sortBy">
                <option value="title">제목순</option>
                <option value="updated">최근 수정순</option>
              </select>
              <button
                v-if="statusFilter || categoryFilter || tagFilter"
                type="button"
                class="theme-backend-filter-reset"
                @click="resetFilters"
              >
                초기화
              </button>
            </div>
          </div>
          <div class="theme-backend-head-right">
            <span class="theme-meta">{{ total }} posts</span>
            <NuxtLink to="/backend/posts/new" class="theme-form-submit">+ New Post</NuxtLink>
          </div>
        </div>

        <div v-if="pending" class="theme-backend-state">Loading posts...</div>
        <div v-else-if="!items.length" class="theme-backend-state">등록된 글이 없습니다.</div>

        <section v-else class="theme-backend-contents-list">
          <NuxtLink
            v-for="item in items"
            :key="item.id"
            :to="`/backend/posts/${item.id}`"
            class="theme-backend-content-row"
          >
            <div class="theme-backend-content-info">
              <span class="theme-backend-content-title">
                {{ item.title }}
                <span v-if="item.meta?.featured" class="theme-backend-badge badge-type-post" style="font-size:10px;margin-left:6px">★ Featured</span>
              </span>
              <code class="theme-backend-content-slug">{{ item.slug }}</code>
            </div>
            <div class="theme-backend-content-taxonomy">
              <div class="theme-backend-chip-row">
                <span
                  v-for="name in categoryNamesOf(item)"
                  :key="`c-${name}`"
                  class="theme-backend-chip chip-category"
                >{{ name }}</span>
                <span v-if="!categoryNamesOf(item).length" class="theme-backend-chip-empty">—</span>
              </div>
              <div class="theme-backend-chip-row">
                <span
                  v-for="name in tagNamesOf(item)"
                  :key="`t-${name}`"
                  class="theme-backend-chip chip-tag"
                >#{{ name }}</span>
              </div>
            </div>
            <div class="theme-backend-content-meta">
              <span :class="['theme-backend-badge', `badge-status-${item.status}`]">{{ item.status }}</span>
              <span class="theme-meta">{{ formatDate(item.updatedAt) }}</span>
            </div>
          </NuxtLink>
        </section>

        <div v-if="total > LIMIT" class="theme-backend-pagination">
          <button type="button" :disabled="skip === 0" @click="skip = Math.max(0, skip - LIMIT)">←</button>
          <span>{{ Math.floor(skip / LIMIT) + 1 }} / {{ Math.ceil(total / LIMIT) }}</span>
          <button type="button" :disabled="skip + LIMIT >= total" @click="skip += LIMIT">→</button>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import DefaultThemeTopbar from '~/components/public/DefaultThemeTopbar.vue'
import BackendSidebar from '~/components/admin/BackendSidebar.vue'
import FilterCombobox from '~/components/admin/FilterCombobox.vue'

definePageMeta({ layout: 'insure', middleware: 'backend' })

type PostListItem = {
  id: string
  title: string
  slug: string
  status: string
  updatedAt: string
  categoryIds?: string[]
  tagIds?: string[]
  meta?: { featured?: boolean }
}

type Category = { id: string; name: string; parentId: string | null; order?: number }
type Tag = { id: string; name: string }

const LIMIT = 20

const { navItems } = useBackendMenu()
const apiBase = useApiBase()

const isSidebarOpen = ref(false)
const statusFilter = ref('')
const categoryFilter = ref('')
const tagFilter = ref('')
const sortBy = ref<'title' | 'updated'>('title')
const skip = ref(0)

const listUrl = computed(() => {
  const p = new URLSearchParams()
  p.set('type', 'post')
  p.set('limit', String(LIMIT))
  p.set('skip', String(skip.value))
  if (statusFilter.value) p.set('status', statusFilter.value)
  if (categoryFilter.value) p.set('category', categoryFilter.value)
  if (tagFilter.value) p.set('tag', tagFilter.value)
  p.set('sort', sortBy.value)
  return `${apiBase}/api/admin/contents?${p}`
})

const { data, pending } = useFetch<{ items: PostListItem[]; total: number }>(
  listUrl,
  {
    key: 'admin-posts-list',
    credentials: 'include',
    server: false,
    watch: [statusFilter, categoryFilter, tagFilter, sortBy, skip],
    default: () => ({ items: [], total: 0 }),
  },
)

// 목록에는 categoryIds/tagIds 만 들어 있어서, 이름은 여기서 붙인다.
// 두 목록 모두 크지 않아 한 번만 받아 두고 화면에서 맞춘다.
const { data: categoryData } = useFetch<{ items: Category[] }>(
  `${apiBase}/api/admin/categories`,
  { key: 'admin-posts-categories', credentials: 'include', server: false, default: () => ({ items: [] }) },
)
const { data: tagData } = useFetch<{ items: Tag[] }>(
  `${apiBase}/api/admin/tags`,
  { key: 'admin-posts-tags', credentials: 'include', server: false, default: () => ({ items: [] }) },
)

const items = computed<PostListItem[]>(() => data.value?.items ?? [])
const total = computed(() => data.value?.total ?? 0)
const categoryList = computed<Category[]>(() => categoryData.value?.items ?? [])
const tagList = computed<Tag[]>(() => tagData.value?.items ?? [])

const categoryNameMap = computed<Record<string, string>>(() => {
  const map: Record<string, string> = {}
  for (const c of categoryList.value) map[c.id] = c.name
  return map
})
const tagNameMap = computed<Record<string, string>>(() => {
  const map: Record<string, string> = {}
  for (const t of tagList.value) map[t.id] = t.name
  return map
})

// 필터 select 는 categories 화면과 같게 부모 아래 자식이 오도록 펼친다.
const categoryOptions = computed(() => {
  const byParent: Record<string, Category[]> = {}
  for (const c of categoryList.value) {
    const pid = c.parentId || ''
    if (!byParent[pid]) byParent[pid] = []
    byParent[pid].push(c)
  }
  for (const pid of Object.keys(byParent)) {
    byParent[pid].sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name))
  }
  const rows: (Category & { depth: number })[] = []
  const visit = (pid: string, depth: number) => {
    for (const c of byParent[pid] || []) {
      rows.push({ ...c, depth })
      visit(c.id, depth + 1)
    }
  }
  visit('', 0)
  return rows
})

// 검색 가능한 필터에 넘길 형태. 카테고리는 계층 들여쓰기를 유지한다.
const categoryComboOptions = computed(
  () => categoryOptions.value.map(c => ({ id: c.id, label: c.name, depth: c.depth })),
)
const tagComboOptions = computed(
  () => tagList.value.map(t => ({ id: t.id, label: `#${t.name}` })),
)

// 지워진 카테고리/태그를 가리키는 id 는 이름이 없으므로 그냥 뺀다.
function categoryNamesOf(item: PostListItem) {
  return (item.categoryIds ?? []).map(id => categoryNameMap.value[id]).filter(Boolean)
}
function tagNamesOf(item: PostListItem) {
  return (item.tagIds ?? []).map(id => tagNameMap.value[id]).filter(Boolean)
}

function resetFilters() {
  statusFilter.value = ''
  categoryFilter.value = ''
  tagFilter.value = ''
}

watch([statusFilter, categoryFilter, tagFilter, sortBy], () => { skip.value = 0 })

function formatDate(d: string) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })
}
</script>

<style scoped>
/* 제목/슬러그 옆의 분류 칸. 위가 카테고리, 아래가 태그. */
.theme-backend-content-taxonomy {
  flex: 0 1 340px;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.theme-backend-chip-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
}

.theme-backend-chip-row:empty {
  display: none;
}

.theme-backend-chip-empty {
  font-size: 11px;
  color: var(--theme-fg-faint);
}

.theme-backend-chip {
  font-size: 11px;
  line-height: 1.6;
  padding: 0 7px;
  border-radius: 10px;
  border: 1px solid var(--theme-line);
  white-space: nowrap;
}

.chip-category {
  color: var(--theme-fg);
  background: var(--theme-bg-soft);
}

.chip-tag {
  color: var(--theme-fg-faint);
  background: transparent;
}

.theme-backend-filter-reset {
  padding: 6px 10px;
  font-size: 13px;
  font-family: var(--theme-sans);
  border: 1px solid var(--theme-line);
  border-radius: 4px;
  background: var(--theme-bg);
  color: var(--theme-fg-faint);
  cursor: pointer;
}

.theme-backend-filter-reset:hover {
  color: var(--theme-fg);
  border-color: var(--theme-accent);
}
</style>
