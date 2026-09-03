<script setup lang="ts">
import { categoryPalette, type PaletteItem } from '~/data/categoryPalette';
import { type ReflectionItem, type TopicVerseItem, useBible } from '~/composables/useBible';
import { bibleBooks } from '~/data/bibleTable';

const { listTopicVerses, listReflections, viewReflection } = useBible();
const auth = useAuth();

const selectedTopicId = ref(categoryPalette.find((item) => item.category === '사랑')?.category ?? categoryPalette[0]?.category ?? '');
const selectedVerseId = ref('');
const selectedReflectionRid = ref('');
const loading = ref(false);
const loadingMore = ref(false);
const reflectionLoading = ref(false);
const topicVerseMap = ref<Record<string, TopicVerseItem[]>>({});
const topicAllLoadedMap = ref<Record<string, boolean>>({});
const reflectionItems = ref<ReflectionItem[]>([]);

const topicSidebarItems = computed(() =>
  categoryPalette.map((item) => ({
    id: item.category,
    label: item.category,
    description: item.description,
    color: item.color,
  })),
);

const selectedTopicMeta = computed<PaletteItem | null>(() =>
  categoryPalette.find((item) => item.category === selectedTopicId.value) ?? categoryPalette[0] ?? null,
);

const activeTopicData = computed(() => topicVerseMap.value[selectedTopicId.value] ?? []);
const isAllLoaded = computed(() => topicAllLoadedMap.value[selectedTopicId.value] === true);
const selectedReflection = computed(() =>
  reflectionItems.value.find((item) => item.rid === selectedReflectionRid.value) ?? null,
);

const selectedReflectionMainVerseText = computed(() => {
  if (!selectedReflection.value) {
    return '';
  }

  const mainVerseNo = selectedReflection.value.mainVerseNo || selectedReflection.value.verseIDs[0]?.verseNo || 1;
  const mainVerse = selectedReflection.value.verseIDs.find((item) => item.verseNo === mainVerseNo);

  return formatVerseLine(
    selectedReflection.value.bookNo,
    selectedReflection.value.chapterNo,
    mainVerseNo,
    mainVerse?.verse || '',
  );
});


function normalizeTopicVerses(items: TopicVerseItem[] = []) {
  return items.map((data) => {
    const book = bibleBooks.find((item) => item.bookNo === data.bookNo);
    return {
      ...data,
      book: book?.church || data.book,
    };
  });
}

function getReflectionAuthor(item: ReflectionItem) {
  const nickname = String(item.nickname || '').trim();
  if (nickname) {
    return nickname;
  }

  return `#${item.userNo}`;
}

function formatVerseLine(bookNo: number, chapterNo: number, verseNo: number, verse: string) {
  const book = bibleBooks.find((item) => item.bookNo === bookNo);
  const label = `${book?.churchKor || book?.church || bookNo}${chapterNo}:${verseNo}`;
  return `${label} ${verse}`;
}

async function loadTopic(category: string, mode: 'initial' | 'more' | 'all') {
  if (!category) {
    return;
  }

  const shownIds = mode === 'more' ? activeTopicData.value.map((item) => item.verseId) : [];
  const isIncremental = mode === 'more';

  if (isIncremental) {
    loadingMore.value = true;
  } else {
    loading.value = true;
  }

  try {
    const response = await listTopicVerses({ category, mode, shownIds });
    const verses = normalizeTopicVerses(response.data ?? []);

    topicVerseMap.value = {
      ...topicVerseMap.value,
      [category]: isIncremental ? [...activeTopicData.value, ...verses] : verses,
    };
    topicAllLoadedMap.value = {
      ...topicAllLoadedMap.value,
      [category]: mode === 'all',
    };

    if (selectedTopicId.value === category && selectedVerseId.value) {
      const nextList = topicVerseMap.value[category] ?? [];
      selectedVerseId.value = nextList.find((item) => item.verseId === selectedVerseId.value)?.verseId ?? '';
    }
  } finally {
    if (isIncremental) {
      loadingMore.value = false;
    } else {
      loading.value = false;
    }
  }
}

async function loadReflectionsForVerse(verse: TopicVerseItem | null) {
  if (!verse) {
    reflectionItems.value = [];
    selectedReflectionRid.value = '';
    return;
  }

  reflectionLoading.value = true;

  try {
    const response = await listReflections({
      bookNo: verse.bookNo,
      chapterNo: verse.chapterNo,
      verseNo: verse.verseNo,
    });

    reflectionItems.value = response.data ?? [];
    selectedReflectionRid.value = '';
  } finally {
    reflectionLoading.value = false;
  }
}

watch(selectedTopicId, async (category) => {
  selectedVerseId.value = '';
  selectedReflectionRid.value = '';
  reflectionItems.value = [];
  await loadTopic(category, 'initial');
}, { immediate: true });

watch(selectedVerseId, async (verseId) => {
  const verse = activeTopicData.value.find((item) => item.verseId === verseId) ?? null;
  await loadReflectionsForVerse(verse);
}, { immediate: true });

function selectTopic(topicId: string) {
  selectedTopicId.value = topicId;
}

function selectVerse(verseId: string) {
  selectedVerseId.value = verseId;
}

async function handleMore() {
  if (!selectedTopicId.value || loadingMore.value || isAllLoaded.value) {
    return;
  }

  await loadTopic(selectedTopicId.value, 'more');
}

async function handleShowAll() {
  if (!selectedTopicId.value || loadingMore.value || isAllLoaded.value) {
    return;
  }

  await loadTopic(selectedTopicId.value, 'all');
}

function startWriting() {
  const verse = activeTopicData.value.find((item) => item.verseId === selectedVerseId.value);
  if (!verse?.readTarget) {
    return;
  }

  navigateTo(`/read/${verse.readTarget.bookNo}/${verse.readTarget.chapterNo}`);
}

async function handleReflectionClick(item: ReflectionItem) {
  selectedReflectionRid.value = item.rid || '';

  if (!item.rid) {
    return;
  }

  await viewReflection({
    rid: item.rid,
    userNo: auth.currentUser.value?.userNo,
  });
}
</script>

<template>
  <section class="topics-page page-stack">
    <div class="topics-hero">
      <p class="topics-kicker">주제별 보기</p>
      <h1 class="topics-title">어디서 시작할까요</h1>
      <p class="topics-copy">
        주제 하나로 지금 마음에 닿는 말씀을 펼쳐보세요.
      </p>
    </div>

    <div class="topics-layout">
      <aside class="topics-sidebar">
        <h2>주제 선택</h2>
        <div class="topics-topic-list">
          <button
            v-for="topic in topicSidebarItems"
            :key="topic.id"
            type="button"
            class="topics-topic-button"
            :class="{ active: selectedTopicId === topic.id }"
            @click="selectTopic(topic.id)"
          >
            <strong class="topics-topic-title" :style="{ color: topic.color }">
              <span class="topics-topic-dot" :style="{ backgroundColor: topic.color }" />
              {{ topic.label }}
            </strong>
            <span>{{ topic.description }}</span>
          </button>
        </div>
      </aside>

      <div class="topics-main">
        <section class="topics-panel topics-panel--compact">
          <div class="topics-panel-head">
            <div>
              <h2>{{ selectedTopicMeta?.category }}</h2>
              <p>{{ selectedTopicMeta?.description }}</p>
            </div>

            <div class="topics-actions">
              <button type="button" class="topics-chip" :disabled="!activeTopicData.length || loadingMore || isAllLoaded" @click="handleMore">더 보기</button>
              <button type="button" class="topics-chip" :disabled="!activeTopicData.length || loadingMore || isAllLoaded" @click="handleShowAll">전체보기</button>
              <button type="button" class="topics-chip topics-chip--dark" :disabled="!selectedVerseId" @click="startWriting">묵상 시작</button>
            </div>
          </div>

          <div v-if="loading" class="topics-verse-list topics-verse-list--limited">
            <p class="topics-empty">불러오는 중입니다.</p>
          </div>
          <div v-else-if="activeTopicData.length" class="topics-verse-list topics-verse-list--limited">
            <button
              v-for="verse in activeTopicData"
              :key="verse.verseId"
              type="button"
              class="topics-verse-item"
              :class="{ active: selectedVerseId === verse.verseId }"
              @click="selectVerse(verse.verseId)"
            >
              <strong>{{ verse.book }} {{ verse.chapterNo }}:{{ verse.verseNo }}</strong>
              <span>{{ verse.text }}</span>
            </button>
          </div>

          <div v-else class="topics-verse-list topics-verse-list--limited">
            <p class="topics-empty">이 주제의 본문은 아직 준비 중입니다.</p>
          </div>
        </section>

        <section class="topics-detail topics-reflections">
          <div class="topics-detail-head">
            <div>
              <h3>한 구절 나눔</h3>
            </div>
          </div>

          <div v-if="reflectionLoading" class="topics-reflection-list">
            <p class="topics-empty">묵상을 불러오는 중입니다.</p>
          </div>
          <div v-else-if="reflectionItems.length" class="topics-reflection-list">
            <article
              v-for="item in reflectionItems"
              :key="item.rid || `${item.userNo}-${item.updatedAt}`"
              class="topics-reflection-card"
              :class="{ active: selectedReflectionRid === item.rid }"
              @click="handleReflectionClick(item)"
            >
              <div class="topics-reflection-head">
                <strong>{{ getReflectionAuthor(item) }}</strong>
                <span>{{ item.verseRange }}</span>
              </div>
              <p>{{ item.text }}</p>
            </article>
          </div>
          <div v-else class="topics-reflection-list">
            <p class="topics-empty">아직 이 구절에 남겨진 묵상이 없습니다.</p>
          </div>

          <div v-if="selectedReflection" class="topics-reflection-focus">
            <div class="topics-reflection-block">
              <strong>대표 구절</strong>
              <span>{{ selectedReflectionMainVerseText }}</span>
            </div>

            <div class="topics-reflection-block">
              <strong>함께 선택된 구절</strong>
              <div class="topics-reflection-lines">
                <span
                  v-for="verse in selectedReflection.verseIDs"
                  :key="`${selectedReflection.rid}-${verse.verseNo}-${verse.verse}`"
                >
                  {{ formatVerseLine(selectedReflection.bookNo, selectedReflection.chapterNo, verse.verseNo, verse.verse) }}
                </span>
              </div>
            </div>

            <div class="topics-reflection-block">
              <strong>묵상</strong>
              <p class="topics-reflection-body">{{ selectedReflection.text }}</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  </section>
</template>

<style scoped>
.topics-reflection-card p,
.topics-reflection-body {
  white-space: pre-line;
}
</style>



