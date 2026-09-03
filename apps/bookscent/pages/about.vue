<script setup lang="ts">
import { mvpGenesisChapters, sharingGuide, workbookSteps } from '~/composables/useMvpContent';
</script>

<template>
  <section class="panel-card page-stack">
    <div class="mvp-section-header">
      <div>
        <p class="mvp-eyebrow">About</p>
        <h1>One Minute Bible is a color-based reading practice</h1>
      </div>
      <NuxtLink class="mvp-chip-button" to="/read">Start reading</NuxtLink>
    </div>

    <p class="muted">
      The current product focuses on a simple loop: read a passage, choose a theme, leave one short reflection, and
      return to review it. The MVP stays intentionally narrow and centers on Genesis chapters 1 through 3.
    </p>

    <section class="info-grid">
      <article class="info-card">
        <h2>Core loop</h2>
        <div class="step-list">
          <div class="step-item">
            <strong>1. Read</strong>
            <span>Read one chapter and notice the first verse that catches you.</span>
          </div>
          <div class="step-item">
            <strong>2. Mark</strong>
            <span>Choose one of the twelve themes and mark the verse.</span>
          </div>
          <div class="step-item">
            <strong>3. Reflect</strong>
            <span>Write one short line about why it stood out.</span>
          </div>
          <div class="step-item">
            <strong>4. Review</strong>
            <span>Return to saved notes and look for reading patterns.</span>
          </div>
        </div>
      </article>

      <article class="info-card">
        <h2>Current chapter set</h2>
        <div class="step-list">
          <div v-for="chapter in mvpGenesisChapters" :key="chapter.chapterNo" class="step-item">
            <strong>Genesis {{ chapter.chapterNo }} - {{ chapter.title }}</strong>
            <span>{{ chapter.focus }}</span>
          </div>
        </div>
      </article>
    </section>

    <section class="two-column">
      <article class="panel-card">
        <h2>Workbook flow</h2>
        <div class="step-list">
          <div v-for="step in workbookSteps" :key="step" class="step-item">
            <span>{{ step }}</span>
          </div>
        </div>
      </article>

      <article class="panel-card">
        <h2>Sharing principles</h2>
        <div class="step-list">
          <div v-for="item in sharingGuide" :key="item" class="step-item">
            <span>{{ item }}</span>
          </div>
        </div>
      </article>
    </section>

    <div class="badge-row">
      <NuxtLink class="badge badge-link" to="/themes">View the 12 themes</NuxtLink>
      <NuxtLink class="badge badge-link" to="/sharing">Open sharing</NuxtLink>
      <NuxtLink class="badge badge-link" to="/workbook">Open workbook flow</NuxtLink>
    </div>
  </section>
</template>
