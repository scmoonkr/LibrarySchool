<script setup lang="ts">
import { mvpGenesisChapters, mvpThemes } from '~/composables/useMvpContent';
</script>

<template>
  <section class="panel-card page-stack">
    <div class="mvp-section-header">
      <div>
        <p class="mvp-eyebrow">Themes</p>
        <h1>Use twelve themes as a repeatable reading lens</h1>
      </div>
      <NuxtLink class="mvp-chip-button" to="/read/1/1">Apply to Genesis 1</NuxtLink>
    </div>

    <p class="muted">
      The goal is not to define a perfect taxonomy yet. The goal is to give the reader a stable set of categories that
      can be used repeatedly while reading.
    </p>

    <section class="theme-grid">
      <article
        v-for="theme in mvpThemes"
        :key="theme.category"
        class="theme-card"
        :style="{ background: theme.soft, borderColor: theme.color }"
      >
        <span class="theme-dot" :style="{ background: theme.color }" />
        <strong>{{ theme.label }}</strong>
        <p>{{ theme.description }}</p>
      </article>
    </section>

    <section class="info-grid">
      <article class="info-card">
        <h2>How to use them</h2>
        <div class="step-list">
          <div class="step-item">
            <strong>Read first</strong>
            <span>Notice the verse before you look for explanations.</span>
          </div>
          <div class="step-item">
            <strong>Pick one</strong>
            <span>Choose the first theme that feels defensible.</span>
          </div>
          <div class="step-item">
            <strong>Leave one line</strong>
            <span>Record why that theme stood out.</span>
          </div>
        </div>
      </article>

      <article class="info-card">
        <h2>Suggested starting chapters</h2>
        <div class="badge-row">
          <NuxtLink
            v-for="chapter in mvpGenesisChapters"
            :key="chapter.chapterNo"
            class="badge badge-link"
            :to="`/read/1/${chapter.chapterNo}`"
          >
            Genesis {{ chapter.chapterNo }}
          </NuxtLink>
        </div>
      </article>
    </section>
  </section>
</template>
