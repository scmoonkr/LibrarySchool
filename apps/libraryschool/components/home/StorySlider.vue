<script setup lang="ts">
type StorySlide = {
  id: string
  chapter: string
  title: string[]
  footer?: string[]
}

const props = withDefaults(defineProps<{
  book: string
  image: string
  slides: StorySlide[]
  intervalMs?: number
}>(), {
  intervalMs: 5000,
});

const currentIndex = ref(0);
let timer: ReturnType<typeof setInterval> | null = null;

const slideCount = computed(() => props.slides.length);

function stopAutoSlide() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

function startAutoSlide() {
  stopAutoSlide();

  if (slideCount.value <= 1) {
    return;
  }

  timer = setInterval(() => {
    goToSlide(currentIndex.value + 1);
  }, props.intervalMs);
}

function goToSlide(index: number) {
  if (slideCount.value === 0) {
    return;
  }

  currentIndex.value = (index + slideCount.value) % slideCount.value;
}

function goPrev() {
  goToSlide(currentIndex.value - 1);
  startAutoSlide();
}

function goNext() {
  goToSlide(currentIndex.value + 1);
  startAutoSlide();
}

watch(slideCount, () => {
  if (currentIndex.value >= slideCount.value) {
    currentIndex.value = 0;
  }

  startAutoSlide();
});

onMounted(() => {
  startAutoSlide();
});

onBeforeUnmount(() => {
  stopAutoSlide();
});
</script>

<template>
  <div class="story-slider">
    <div class="story-slider-viewport">
      <button
        type="button"
        class="story-slider-arrow story-slider-arrow--left"
        aria-label="이전 슬라이드"
        @click="goPrev"
      >
        <span aria-hidden="true">&lsaquo;</span>
      </button>

      <div
        class="story-slider-track"
        :style="{ transform: `translateX(-${currentIndex * 100}%)` }"
      >
        <article
          v-for="slide in slides"
          :key="slide.id"
          class="story-slider-card"
        >
          <img
            :src="image"
            alt=""
            class="story-slider-card-bg"
          >

          <div class="story-slider-card-overlay">
            <span class="story-slider-card-chapter">
              {{ book }}. {{ slide.chapter }}
            </span>

            <h2 class="story-slider-card-title">
              <span
                v-for="line in slide.title"
                :key="`${slide.id}-${line}`"
              >
                {{ line }}
              </span>
            </h2>

            <p
              v-if="slide.footer"
              class="story-slider-card-footer"
            >
              <span
                v-for="line in slide.footer"
                :key="`${slide.id}-${line}`"
              >
                {{ line }}
              </span>
            </p>
          </div>
        </article>
      </div>

      <button
        type="button"
        class="story-slider-arrow story-slider-arrow--right"
        aria-label="다음 슬라이드"
        @click="goNext"
      >
        <span aria-hidden="true">&rsaquo;</span>
      </button>
    </div>

    <div class="story-slider-dots">
      <button
        v-for="slideIndex in slideCount"
        :key="`story-dot-${slideIndex}`"
        type="button"
        class="story-slider-dot"
        :class="{ 'is-active': currentIndex === slideIndex - 1 }"
        :aria-label="`${slideIndex}번째 슬라이드로 이동`"
        @click="goToSlide(slideIndex - 1)"
      />
    </div>
  </div>
</template>
