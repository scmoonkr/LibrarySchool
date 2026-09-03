<script setup lang="ts">
import type { ReflectionItem } from '~/composables/useBible';
import { sharingGuide } from '~/composables/useMvpContent';

const bible = useBible();
const auth = useAuth();

const curatedSharing = [
  {
    author: 'Sample share',
    verseRange: 'Genesis 1:3',
    text: 'The line about light made me think my day also needs order before activity.',
  },
  {
    author: 'Sample share',
    verseRange: 'Genesis 1:26-28',
    text: 'This section reads like identity and responsibility are given together.',
  },
];

const { data, pending, error, refresh } = await useAsyncData(
  'sharing-mine',
  async () => {
    if (!auth.currentUser.value?.userNo) {
      return { ok: true, data: [] };
    }

    return await bible.listReflections({
      userNo: auth.currentUser.value.userNo,
      bookNo: 1,
      chapterNo: 1,
    });
  },
  {
    default: () => null as { ok: boolean; data: ReflectionItem[] } | null,
  },
);

const myReflections = computed(() => data.value?.data || []);
const latestReflection = computed(() => myReflections.value[0] || null);
const sharePreview = computed(() => {
  if (!latestReflection.value) {
    return 'No saved reflection yet. Leave one short note on the reading page and it will appear here.';
  }

  return [
    `One line from ${latestReflection.value.verseRange}`,
    latestReflection.value.text,
    '#oneminutebible #genesis1 #reflection',
  ].join('\n');
});
</script>

<template>
  <section class="page-stack">
    <section class="panel-card">
      <div class="mvp-section-header">
        <div>
          <p class="mvp-eyebrow">Sharing</p>
          <h1>Return to short reflections and prepare share copy</h1>
        </div>
        <NuxtLink class="mvp-chip-button" to="/read/1/1">Back to reading</NuxtLink>
      </div>

      <p class="muted">
        For now this page focuses on your saved Genesis 1 reflections. It does not try to be a public community feed
        yet. The priority is making sure your own notes can be reviewed and reused.
      </p>

      <div class="two-column">
        <article class="panel-card">
          <h2>My reflections</h2>
          <p v-if="pending" class="muted">Loading saved reflections.</p>
          <p v-else-if="error" class="muted">{{ error.message }}</p>
          <div v-else class="reflection-list">
            <article
              v-for="item in myReflections"
              :key="`${item.verseRange}-${item.updatedAt}`"
              class="reflection-card"
            >
              <div class="reflection-head">
                <strong>{{ item.verseRange }}</strong>
                <span>{{ new Date(item.updatedAt).toLocaleString('ko-KR') }}</span>
              </div>
              <p>{{ item.text }}</p>
            </article>
            <p v-if="!myReflections.length" class="muted">No saved reflections yet.</p>
          </div>
        </article>

        <article class="panel-card">
          <h2>Share preview</h2>
          <pre class="mvp-share-preview">{{ sharePreview }}</pre>
          <div class="badge-row">
            <button class="ghost-button" type="button" @click="refresh()">Refresh</button>
            <NuxtLink class="ghost-button" to="/review">Open review</NuxtLink>
          </div>
        </article>
      </div>
    </section>

    <section class="two-column">
      <article class="panel-card">
        <h2>Sharing rules</h2>
        <div class="step-list">
          <div v-for="item in sharingGuide" :key="item" class="step-item">
            <span>{{ item }}</span>
          </div>
        </div>
      </article>

      <article class="panel-card">
        <h2>Sample copy</h2>
        <div class="reflection-list">
          <article v-for="item in curatedSharing" :key="`${item.author}-${item.verseRange}`" class="reflection-card">
            <div class="reflection-head">
              <strong>{{ item.author }}</strong>
              <span>{{ item.verseRange }}</span>
            </div>
            <p>{{ item.text }}</p>
          </article>
        </div>
      </article>
    </section>
  </section>
</template>
