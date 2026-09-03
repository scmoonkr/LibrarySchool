<script setup lang="ts">
import { mvpGenesisChapters, workbookSteps } from '~/composables/useMvpContent';
</script>

<template>
  <section class="panel-card page-stack">
    <div class="mvp-section-header">
      <div>
        <p class="mvp-eyebrow">Workbook</p>
        <h1>Prepare a workbook flow that works with the web app</h1>
      </div>
      <NuxtLink class="mvp-chip-button" to="/read">Open reading</NuxtLink>
    </div>

    <p class="muted">
      The workbook is treated as a practice tool, not just a downloadable file. The current structure assumes the user
      reads in the web app first, then revisits the same chapter on paper with slower notes.
    </p>

    <section class="two-column">
      <article class="panel-card">
        <h2>Workbook sequence</h2>
        <div class="step-list">
          <div v-for="step in workbookSteps" :key="step" class="step-item">
            <span>{{ step }}</span>
          </div>
        </div>
      </article>

      <article class="panel-card">
        <h2>Suggested chapters</h2>
        <div class="step-list">
          <div v-for="chapter in mvpGenesisChapters" :key="chapter.chapterNo" class="step-item">
            <strong>Genesis {{ chapter.chapterNo }} - {{ chapter.title }}</strong>
            <span>{{ chapter.focus }}</span>
          </div>
        </div>
      </article>
    </section>

    <section class="info-grid">
      <article class="info-card">
        <h2>What happens in the app first</h2>
        <ul class="flat-list">
          <li>Read the verse and choose the first theme you can defend.</li>
          <li>Save one short reflection to capture the starting thought.</li>
          <li>Open review and then move to the paper workbook.</li>
        </ul>
      </article>

      <article class="info-card">
        <h2>What continues on paper</h2>
        <ul class="flat-list">
          <li>Read the same chapter again and mark it by hand.</li>
          <li>Use the margin for longer notes and questions.</li>
          <li>Share only a photo or a sentence if needed.</li>
        </ul>
      </article>
    </section>

    <div class="badge-row">
      <NuxtLink
        v-for="chapter in mvpGenesisChapters"
        :key="chapter.chapterNo"
        class="badge badge-link"
        :to="`/read/1/${chapter.chapterNo}`"
      >
        Read Genesis {{ chapter.chapterNo }}
      </NuxtLink>
    </div>
  </section>
</template>
