<template>
  <div class="block-board">
    <p v-if="loading" class="block-board-loading">Loading posts…</p>
    <p v-else-if="!posts.length" class="block-board-empty">표시할 글이 없습니다.</p>
    <table v-else class="block-board-table">
      <thead>
        <tr>
          <th class="block-board-col-num">#</th>
          <th v-if="showFeatured" class="block-board-col-featured">Featured</th>
          <th>제목</th>
          <th v-if="showAuthor" class="block-board-col-author">작성자</th>
          <th v-if="showCategories" class="block-board-col-terms">카테고리</th>
          <th v-if="showTags" class="block-board-col-terms">태그</th>
          <th v-if="showDate" class="block-board-col-date">발행일</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(post, i) in posts"
          :key="post.id"
          :class="{ 'block-board-row-featured': post.featured }"
        >
          <td class="block-board-col-num">{{ i + 1 }}</td>
          <td v-if="showFeatured" class="block-board-col-featured">
            <span v-if="post.featured" class="block-board-star" title="Featured">★</span>
          </td>
          <td class="block-board-title">
            <NuxtLink :to="`/post/${post.slug}`">{{ post.title }}</NuxtLink>
          </td>
          <td v-if="showAuthor" class="block-board-col-author">
            <span v-if="post.author?.name" class="block-board-author">
              <img
                v-if="post.author.avatarUrl"
                :src="post.author.avatarUrl"
                :alt="post.author.name"
                class="block-board-avatar"
              />
              {{ post.author.name }}
            </span>
            <span v-else>-</span>
          </td>
          <td v-if="showCategories" class="block-board-col-terms">
            <span v-if="!post.categories?.length">-</span>
            <span v-else class="block-board-terms">
              <NuxtLink
                v-for="c in post.categories"
                :key="c.slug"
                :to="`/categories/${c.slug}`"
                class="block-board-term"
              >{{ c.name }}</NuxtLink>
            </span>
          </td>
          <td v-if="showTags" class="block-board-col-terms">
            <span v-if="!post.tags?.length">-</span>
            <span v-else class="block-board-terms">
              <NuxtLink
                v-for="t in post.tags"
                :key="t.slug"
                :to="`/tags/${t.slug}`"
                class="block-board-term"
              >#{{ t.name }}</NuxtLink>
            </span>
          </td>
          <td v-if="showDate" class="block-board-col-date">{{ formatDate(post.publishedAt) || '-' }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

// Board — postList 와 같은 데이터(/api/public/post-cards)를 카드 대신 표로 보여 준다.
// 필터(categories/tags/limit)도 postList 와 같다. 다른 건 표현 형식뿐이다.
type Term = { name: string; slug: string }
type Post = {
  id: string
  title: string
  slug: string
  publishedAt: string | null
  featured: boolean
  author: { id: string; name: string; avatarUrl: string } | null
  categories?: Term[]
  tags?: Term[]
}

const props = defineProps<{
  block: {
    props: {
      categories?: string
      tags?: string
      limit?: number | string
      showFeatured?: 'on' | 'off'
      showAuthor?: 'on' | 'off'
      showCategories?: 'on' | 'off'
      showTags?: 'on' | 'off'
      showDate?: 'on' | 'off'
    }
  }
}>()

const limit = computed(() => {
  const n = Number(props.block.props?.limit)
  return Number.isFinite(n) && n > 0 ? Math.min(n, 24) : 10
})
const categories = computed(() => String(props.block.props?.categories || '').trim())
const tags = computed(() => String(props.block.props?.tags || '').trim())

const showFeatured = computed(() => props.block.props?.showFeatured !== 'off')
const showAuthor = computed(() => props.block.props?.showAuthor !== 'off')
const showCategories = computed(() => props.block.props?.showCategories !== 'off')
const showTags = computed(() => props.block.props?.showTags !== 'off')
const showDate = computed(() => props.block.props?.showDate !== 'off')

const apiBase = useApiBase()

const url = computed(() => {
  const p = new URLSearchParams()
  if (categories.value) p.set('categories', categories.value)
  if (tags.value) p.set('tags', tags.value)
  p.set('limit', String(limit.value))
  return `${apiBase}/api/public/post-cards?${p}`
})

// PostListBlock 과 같은 이유로 key 에 apiBase 를 넣지 않는다. 서버는 내부
// localhost 오리진, 브라우저는 same-origin("")이라 key 가 어긋나면 SSR 페이로드를
// 버리고 빈 상태가 깜빡인다. watch 도 url 이 아니라 블록 파라미터를 본다.
const { data, pending } = useFetch<{ items: Post[] }>(url, {
  key: () => `board:${categories.value}|${tags.value}|${limit.value}`,
  default: () => ({ items: [] }),
  watch: [categories, tags, limit],
})

const posts = computed<Post[]>(() => data.value?.items ?? [])
const loading = computed(() => pending.value)

function formatDate(d: string | null) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })
}
</script>
