<script setup lang="ts">
import { bibleExplorer, findBibleBookMeta } from '~/data/bibleExplorer';
import { useBible } from '~/composables/useBible';

const route = useRoute();
const router = useRouter();
const bible = useBible();

const testamentType = computed(() => {
  const value = route.query.testament;
  return typeof value === 'string' ? value : '';
});

const groupLabel = computed(() => {
  const value = route.query.group;
  return typeof value === 'string' ? value : '';
});

const bookName = computed(() => {
  const value = route.query.book;
  return typeof value === 'string' ? value : '';
});

const selectedTestament = computed(() =>
  bibleExplorer.find((item) => item.type === testamentType.value) ?? null,
);

const selectedGroup = computed(() =>
  selectedTestament.value?.groups.find((item) => item.label === groupLabel.value) ?? null,
);

const selectedBook = computed(() =>
  selectedGroup.value?.books.find((item) => item.book === bookName.value) ?? null,
);

const selectedBookMeta = computed(() =>
  selectedBook.value ? findBibleBookMeta(selectedBook.value.book) : null,
);

const { data: chapterData } = await useAsyncData(
  () => `bible-chapters-${selectedBookMeta.value?.bookNo || 0}`,
  async () => {
    if (!selectedBookMeta.value) return [];
    const response = await bible.listBookChapters({ bookNo: selectedBookMeta.value.bookNo });
    return response.data;
  },
  {
    watch: [selectedBookMeta],
    default: () => [],
  },
);

const breadcrumb = computed(() => [
  { label: '말씀 펼쳐보기', step: 'root' as const, active: !selectedTestament.value },
  ...(selectedTestament.value ? [{ label: selectedTestament.value.label, step: 'testament' as const, active: !selectedGroup.value }] : []),
  ...(selectedGroup.value ? [{ label: selectedGroup.value.label, step: 'group' as const, active: !selectedBook.value }] : []),
  ...(selectedBook.value ? [{ label: selectedBook.value.book, step: 'book' as const, active: true }] : []),
]);

const sectionTitle = computed(() => {
  if (!selectedTestament.value) return '구약과 신약 중 어디에서 시작할지 골라보세요';
  if (!selectedGroup.value) return `${selectedTestament.value.label}의 흐름을 펼쳐봅니다`;
  if (!selectedBook.value) return `${selectedGroup.value.label}에서 읽고 싶은 책을 골라보세요`;
  return `${selectedBook.value.book}에서 읽고 싶은 장을 골라보세요`;
});

const sectionCopy = computed(() => {
  if (!selectedTestament.value) {
    return '성경을 목차보다 흐름으로 펼쳐 읽을 수 있도록 큰 묶음부터 책, 그리고 장까지 자연스럽게 따라가도록 구성했습니다.';
  }

  if (!selectedGroup.value) return selectedTestament.value.description;
  if (!selectedBook.value) return selectedGroup.value.description;
  return selectedBook.value.description;
});

const currentItems = computed(() => {
  if (!selectedTestament.value) {
    return bibleExplorer.map((item) => ({
      key: item.type,
      title: item.label,
      description: item.description,
      level: 'testament' as const,
    }));
  }

  if (!selectedGroup.value) {
    return selectedTestament.value.groups.map((item) => ({
      key: `${selectedTestament.value?.type}-${item.label}`,
      title: item.label,
      description: item.description,
      level: 'group' as const,
    }));
  }

  if (!selectedBook.value) {
    return selectedGroup.value.books.map((item) => ({
      key: `${selectedGroup.value?.label}-${item.book}`,
      title: item.book,
      description: item.description,
      level: 'book' as const,
    }));
  }

  return chapterData.value.map((item) => ({
    key: `${item.bookNo}-${item.chapterNo}`,
    title: `${item.chapterNo}장`,
    description: item.subject || '장 주제가 아직 없습니다.',
    chapterNo: item.chapterNo,
    level: 'chapter' as const,
  }));
});

function updateQuery(next: { testament?: string; group?: string; book?: string }) {
  return router.push({
    path: '/bible',
    query: {
      testament: next.testament,
      group: next.group,
      book: next.book,
    },
  });
}

function selectItem(item: { title: string; level: 'testament' | 'group' | 'book' | 'chapter'; chapterNo?: number }) {
  if (item.level === 'testament') {
    const next = bibleExplorer.find((entry) => entry.label === item.title);
    return updateQuery({ testament: next?.type, group: undefined, book: undefined });
  }

  if (item.level === 'group') {
    return updateQuery({ testament: testamentType.value, group: item.title, book: undefined });
  }

  if (item.level === 'book') {
    return updateQuery({ testament: testamentType.value, group: groupLabel.value, book: item.title });
  }

  if (!selectedBookMeta.value || !item.chapterNo) return null;
  return navigateTo(`/read/${selectedBookMeta.value.bookNo}/${item.chapterNo}`);
}

function moveTo(step: 'root' | 'testament' | 'group' | 'book') {
  if (step === 'root') {
    return updateQuery({ testament: undefined, group: undefined, book: undefined });
  }

  if (step === 'testament') {
    return updateQuery({ testament: testamentType.value, group: undefined, book: undefined });
  }

  if (step === 'group') {
    return updateQuery({ testament: testamentType.value, group: groupLabel.value, book: undefined });
  }

  return null;
}
</script>

<template>
  <section class="bible-explorer page-stack">
    <div class="bible-explorer-hero">
      <p class="bible-explorer-kicker">말씀 펼쳐보기</p>
      <h1 class="bible-explorer-title">성경읽으려는데, 어디에서 시작할지 고민되나요</h1>
      <p class="bible-explorer-copy">
        책을 고르고<br />
        지금 멈출 장을 선택해 보세요.
      </p>
    </div>

    <div class="bible-explorer-breadcrumb">
      <button
        v-for="item in breadcrumb"
        :key="`${item.step}-${item.label}`"
        type="button"
        class="bible-explorer-crumb"
        :class="{ active: item.active }"
        @click="moveTo(item.step)"
      >
        {{ item.label }}
      </button>
    </div>

    <div class="bible-explorer-panel">
      <div class="bible-explorer-panel-head">
        <div>
          <h2>{{ sectionTitle }}</h2>
          <p>{{ sectionCopy }}</p>
        </div>

        <NuxtLink class="bible-explorer-read-link" to="/read/1/1">
          바로 읽기
        </NuxtLink>
      </div>

      <div class="bible-explorer-grid">
        <button
          v-for="item in currentItems"
          :key="item.key"
          type="button"
          class="bible-explorer-card"
          @click="selectItem(item)"
        >
          <strong>{{ item.title }}</strong>
          <span>{{ item.description }}</span>
        </button>
      </div>
    </div>
  </section>
</template>
