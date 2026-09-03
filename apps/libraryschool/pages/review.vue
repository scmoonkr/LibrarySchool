<script setup lang="ts">
import type { ReflectionItem } from '~/composables/useBible';
import { categoryPalette } from '~/data/categoryPalette';
import { bibleBooks } from '~/data/bibleTable';

const bible = useBible();
const auth = useAuth();

const allReflections = ref<ReflectionItem[]>([]);
const loading = ref(false);
const errorMessage = ref('');
const selectedBookNo = ref<number | null>(null);
const selectedChapterNo = ref<number | null>(null);

type TopicFlowItem = {
  category: string;
  count: number;
  width: string;
  color: string;
  soft: string;
};

const orderedReflections = computed(() =>
  [...allReflections.value].sort((a, b) => (
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  ))
);

const readBookItems = computed(() => {
  const map = new Map<number, { bookNo: number; latestAt: number }>();

  orderedReflections.value.forEach((item) => {
    const latestAt = new Date(item.updatedAt).getTime() || 0;
    const current = map.get(item.bookNo);

    if (!current || latestAt > current.latestAt) {
      map.set(item.bookNo, { bookNo: item.bookNo, latestAt });
    }
  });

  return [...map.values()]
    .sort((left, right) => right.latestAt - left.latestAt)
    .map(({ bookNo }) => bibleBooks.find((item) => item.bookNo === bookNo))
    .filter((item): item is (typeof bibleBooks)[number] => Boolean(item));
});

const selectedBook = computed(() =>
  bibleBooks.find((item) => item.bookNo === selectedBookNo.value) ?? readBookItems.value[0] ?? null
);

const selectedBookReflections = computed(() => {
  if (!selectedBook.value) return [];
  return orderedReflections.value.filter((item) => item.bookNo === selectedBook.value?.bookNo);
});

const readChapterItems = computed(() => {
  const map = new Map<number, { chapterNo: number; latestAt: number }>();

  selectedBookReflections.value.forEach((item) => {
    const latestAt = new Date(item.updatedAt).getTime() || 0;
    const current = map.get(item.chapterNo);

    if (!current || latestAt > current.latestAt) {
      map.set(item.chapterNo, { chapterNo: item.chapterNo, latestAt });
    }
  });

  return [...map.values()].sort((left, right) => left.chapterNo - right.chapterNo);
});

const selectedChapterReflections = computed(() => {
  if (!selectedBook.value || !selectedChapterNo.value) return [];
  return selectedBookReflections.value.filter((item) => item.chapterNo === selectedChapterNo.value);
});

const selectedChapterTitle = computed(() => {
  if (!selectedBook.value || !selectedChapterNo.value) return '';
  return `${selectedBook.value.church} ${selectedChapterNo.value}장`;
});

const overallTopicFlow = computed(() => buildTopicFlow(orderedReflections.value));
const selectedBookTopicFlow = computed(() => buildTopicFlow(selectedBookReflections.value));

const pausedVerses = computed(() => {
  const source = selectedChapterReflections.value.length
    ? selectedChapterReflections.value
    : selectedBookReflections.value;

  const seen = new Set<string>();
  const items: Array<{ key: string; label: string; verse: string }> = [];

  source.forEach((item) => {
    const mainVerseNo = item.mainVerseNo || item.verseIDs[0]?.verseNo || 1;
    const verse = item.verseIDs.find((entry) => entry.verseNo === mainVerseNo) || item.verseIDs[0];
    if (!verse) return;

    const book = bibleBooks.find((entry) => entry.bookNo === item.bookNo);
    const label = `${book?.churchKor || book?.church || item.bookNo}${item.chapterNo}:${mainVerseNo}`;
    const key = `${label}-${verse.verse}`;
    if (seen.has(key)) return;
    seen.add(key);

    items.push({
      key,
      label,
      verse: verse.verse,
    });
  });

  return items.slice(0, 6);
});

const reflectionLines = computed(() => {
  const source = selectedChapterReflections.value.length
    ? selectedChapterReflections.value
    : selectedBookReflections.value;

  return source
    .filter((item) => String(item.text || '').trim())
    .slice(0, 8);
});

watch(
  () => auth.currentUser.value?.userNo,
  async () => {
    await loadReview();
  },
  { immediate: true },
);

watch(readBookItems, (books) => {
  if (!books.length) {
    selectedBookNo.value = null;
    return;
  }

  if (!selectedBookNo.value || !books.some((item) => item?.bookNo === selectedBookNo.value)) {
    selectedBookNo.value = books[0]?.bookNo ?? null;
  }
}, { immediate: true });

watch(readChapterItems, (chapters) => {
  if (!chapters.length) {
    selectedChapterNo.value = null;
    return;
  }

  if (!selectedChapterNo.value || !chapters.some((item) => item.chapterNo === selectedChapterNo.value)) {
    selectedChapterNo.value = chapters[chapters.length - 1]?.chapterNo ?? null;
  }
}, { immediate: true });

async function loadReview() {
  if (!auth.currentUser.value?.userNo) {
    allReflections.value = [];
    errorMessage.value = '로그인하면 내가 머문 말씀을 조용히 돌아볼 수 있습니다.';
    return;
  }

  loading.value = true;
  errorMessage.value = '';

  try {
    const response = await bible.listReflections({
      userNo: auth.currentUser.value.userNo,
    });

    allReflections.value = response.data ?? [];
  } catch (error) {
    allReflections.value = [];
    errorMessage.value = error instanceof Error ? error.message : '돌아보기 데이터를 불러오지 못했습니다.';
  } finally {
    loading.value = false;
  }
}

function buildTopicFlow(items: ReflectionItem[]): TopicFlowItem[] {
  const countMap = new Map<string, number>();

  items.forEach((item) => {
    item.verseIDs.forEach((verse) => {
      const key = String(verse.category || '').trim();
      if (!key) return;
      countMap.set(key, (countMap.get(key) ?? 0) + 1);
    });
  });

  if (!countMap.size) return [];

  const max = Math.max(...countMap.values(), 1);

  return [...countMap.entries()]
    .map(([category, count]) => {
      const palette = categoryPalette.find((item) => item.category === category);
      return {
        category,
        count,
        width: `${Math.max(16, Math.round((count / max) * 100))}%`,
        color: palette?.color ?? '#8c7a6b',
        soft: palette?.soft ?? '#f3ece5',
      };
    })
    .sort((left, right) => right.count - left.count)
    .slice(0, 6);
}

function openSelectedRead() {
  if (!selectedBookNo.value || !selectedChapterNo.value) return;
  return navigateTo(`/read/${selectedBookNo.value}/${selectedChapterNo.value}`);
}

function formatReflectionDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat('ko-KR', {
    month: 'short',
    day: 'numeric',
  }).format(date);
}

function getReflectionAuthor(item: ReflectionItem) {
  const nickname = String(item.nickname || '').trim();
  return nickname || `#${item.userNo}`;
}
</script>

<template>
  <section class="review-page">
    <div class="review-hero">
      <p class="review-kicker">돌아보기</p>
      <h1 class="review-title">오늘까지의 나</h1>
      <p class="review-copy">
        내가 어디에 머물렀는지, 어떤 색으로 말씀을 읽고 있는지 조용히 다시 봅니다.
      </p>
    </div>

    <div v-if="loading" class="review-empty">돌아보기 화면을 준비하고 있습니다.</div>
    <div v-else-if="errorMessage" class="review-empty">{{ errorMessage }}</div>
    <div v-else-if="!orderedReflections.length" class="review-empty">
      아직 남겨진 묵상이 없습니다. 읽다가 멈춘 말씀과 한 줄 묵상이 여기 쌓이기 시작합니다.
    </div>

    <div v-else class="review-stack">
      <section class="review-block">
        <div class="review-block-head">
          <h2>내가 읽은 성경</h2>
          <p>내가 실제로 머문 책과 장만 바로 고를 수 있습니다.</p>
        </div>

        <div class="review-book-buttons">
          <button
            v-for="book in readBookItems"
            :key="book?.bookNo"
            type="button"
            class="review-chip"
            :class="{ 'review-chip--dark': selectedBookNo === book?.bookNo }"
            @click="selectedBookNo = book?.bookNo ?? null"
          >
            {{ book?.church }}
          </button>
        </div>

        <div v-if="selectedBook" class="review-chapter-wrap">
          <div class="review-chapter-head">
            <strong>{{ selectedBook.church }}</strong>
            <button type="button" class="review-chip review-chip--dark" @click="openSelectedRead">다시 읽기</button>
          </div>

          <div class="review-chapter-buttons">
            <button
              v-for="item in readChapterItems"
              :key="item.chapterNo"
              type="button"
              class="review-chip"
              :class="{ 'review-chip--dark': selectedChapterNo === item.chapterNo }"
              @click="selectedChapterNo = item.chapterNo"
            >
              {{ item.chapterNo }}장
            </button>
          </div>
        </div>
      </section>

      <section class="review-block">
        <div class="review-block-head">
          <h2>주제 흐름</h2>
          <p>숫자가 아니라, 내가 어떤 색으로 읽고 있는지 느낌만 보여줍니다.</p>
        </div>

        <div class="review-flow-grid">
          <div class="review-flow-panel">
            <strong class="review-flow-title">내가 읽은 전체 흐름</strong>
            <div v-if="overallTopicFlow.length" class="review-topic-flow">
              <article
                v-for="item in overallTopicFlow"
                :key="`all-${item.category}`"
                class="review-topic-row"
              >
                <div class="review-topic-label">
                  <span class="review-topic-dot" :style="{ backgroundColor: item.color }" />
                  <strong>{{ item.category }}</strong>
                </div>
                <div class="review-topic-bar">
                  <span
                    class="review-topic-fill"
                    :style="{ width: item.width, background: `linear-gradient(90deg, ${item.color}, ${item.soft})` }"
                  />
                </div>
              </article>
            </div>
          </div>

          <div class="review-flow-panel">
            <strong class="review-flow-title">
              {{ selectedBook ? `${selectedBook.church}에서의 흐름` : '선택한 성경의 흐름' }}
            </strong>
            <div v-if="selectedBookTopicFlow.length" class="review-topic-flow">
              <article
                v-for="item in selectedBookTopicFlow"
                :key="`book-${item.category}`"
                class="review-topic-row"
              >
                <div class="review-topic-label">
                  <span class="review-topic-dot" :style="{ backgroundColor: item.color }" />
                  <strong>{{ item.category }}</strong>
                </div>
                <div class="review-topic-bar">
                  <span
                    class="review-topic-fill"
                    :style="{ width: item.width, background: `linear-gradient(90deg, ${item.color}, ${item.soft})` }"
                  />
                </div>
              </article>
            </div>
          </div>
        </div>
      </section>

      <section class="review-block">
        <div class="review-block-head">
          <h2>멈춘 구절</h2>
          <p>{{ selectedChapterTitle || selectedBook?.church || '내가 다시 떠올릴 말씀' }}</p>
        </div>

        <div class="review-verse-list">
          <article
            v-for="item in pausedVerses"
            :key="item.key"
            class="review-verse-card"
          >
            <strong>{{ item.label }}</strong>
            <p>"{{ item.verse }}"</p>
          </article>
        </div>
      </section>

      <section class="review-block">
        <div class="review-block-head">
          <h2>한 줄 묵상</h2>
          <p>평가 없이, 그때의 나를 그대로 다시 읽습니다.</p>
        </div>

        <div class="review-reflection-list">
          <article
            v-for="item in reflectionLines"
            :key="item.rid || `${item.verseRange}-${item.updatedAt}`"
            class="review-reflection-card"
          >
            <div class="review-reflection-head">
              <strong>{{ getReflectionAuthor(item) }}</strong>
              <span>{{ formatReflectionDate(item.updatedAt) }}</span>
            </div>
            <p class="review-reflection-meta">{{ item.verseRange }}</p>
            <p class="review-reflection-text">"{{ item.text }}"</p>
          </article>
        </div>
      </section>
    </div>
  </section>
</template>

<style scoped>
.review-page {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.review-hero,
.review-block,
.review-empty,
.review-flow-panel,
.review-verse-card,
.review-reflection-card {
  border-radius: 5px;
}

.review-hero {
  padding: 1.6rem 1.8rem;
  background:
    radial-gradient(circle at top right, rgba(241, 210, 141, 0.34), transparent 34%),
    linear-gradient(135deg, #fbf6ef, #f3e7d7);
  border: 1px solid rgba(137, 101, 58, 0.14);
}

.review-kicker {
  margin: 0 0 0.45rem;
  color: #9d6a33;
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.review-title {
  margin: 0;
  color: #2d2118;
  font-size: clamp(1.7rem, 3vw, 2.5rem);
  line-height: 1.2;
}

.review-copy {
  margin: 0.8rem 0 0;
  color: #6e5847;
  font-size: 1rem;
  line-height: 1.7;
}

.review-empty {
  padding: 2rem 1.4rem;
  background: #fffaf4;
  border: 1px dashed rgba(80, 54, 29, 0.18);
  color: #7b6758;
  text-align: center;
  line-height: 1.7;
}

.review-stack {
  display: grid;
  gap: 1rem;
}

.review-block {
  padding: 1.2rem;
  background: #fffdf9;
  border: 1px solid rgba(80, 54, 29, 0.08);
}

.review-block-head {
  margin-bottom: 1rem;
}

.review-block-head h2 {
  margin: 0;
  color: #2d2118;
  font-size: 1.15rem;
}

.review-block-head p {
  margin: 0.35rem 0 0;
  color: #7b6758;
  line-height: 1.6;
}

.review-book-buttons,
.review-chapter-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
}

.review-chapter-wrap {
  margin-top: 1rem;
  display: grid;
  gap: 0.8rem;
}

.review-chapter-head {
  display: flex;
  justify-content: space-between;
  gap: 0.8rem;
  align-items: center;
}

.review-chip {
  height: 2.5rem;
  padding: 0 0.95rem;
  border: 1px solid rgba(80, 54, 29, 0.12);
  border-radius: 5px;
  background: #ffffff;
  color: #2d2118;
  font: inherit;
}

.review-chip--dark {
  background: #2f261d;
  color: #fff6ea;
}

.review-flow-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.9rem;
}

.review-flow-panel {
  padding: 1rem;
  background: #fbf6ef;
  border: 1px solid rgba(80, 54, 29, 0.08);
}

.review-flow-title {
  display: block;
  margin-bottom: 0.9rem;
  color: #2d2118;
}

.review-topic-flow {
  display: grid;
  gap: 0.8rem;
}

.review-topic-row {
  display: grid;
  grid-template-columns: minmax(7rem, 9rem) 1fr;
  gap: 0.9rem;
  align-items: center;
}

.review-topic-label {
  display: inline-flex;
  gap: 0.55rem;
  align-items: center;
  color: #3b2d22;
}

.review-topic-dot {
  width: 0.7rem;
  height: 0.7rem;
  border-radius: 5px;
}

.review-topic-bar {
  height: 0.9rem;
  border-radius: 5px;
  background: #f2e8de;
  overflow: hidden;
}

.review-topic-fill {
  display: block;
  height: 100%;
  border-radius: 5px;
}

.review-verse-list,
.review-reflection-list {
  display: grid;
  gap: 0.8rem;
}

.review-verse-card,
.review-reflection-card {
  padding: 1rem 1.05rem;
  background: #f9f3eb;
  border: 1px solid rgba(80, 54, 29, 0.08);
}

.review-verse-card strong,
.review-reflection-head strong {
  color: #2d2118;
}

.review-verse-card p,
.review-reflection-text {
  margin: 0.45rem 0 0;
  color: #554236;
  line-height: 1.8;
  white-space: pre-line;
}

.review-reflection-head {
  display: flex;
  justify-content: space-between;
  gap: 0.8rem;
  align-items: center;
}

.review-reflection-head span,
.review-reflection-meta {
  color: #8a7565;
  font-size: 0.86rem;
}

.review-reflection-meta {
  margin: 0.35rem 0 0;
}

@media (max-width: 840px) {
  .review-flow-grid {
    grid-template-columns: 1fr;
  }

  .review-topic-row {
    grid-template-columns: 1fr;
  }

  .review-chapter-head {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
