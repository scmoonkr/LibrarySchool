<script setup lang="ts">
import heroImage from '~/assets/images/main.png';
import genesisImageA from '~/assets/images/genesis_1_1_2.png';
import genesisImageB from '~/assets/images/genesis_1_20_23.png';
import genesisImageC from '~/assets/images/genesis_1_26_28.png';
import cardImage1 from '~/assets/images/card1.png';
import cardImage2 from '~/assets/images/card2.png';
import infographImage from '~/assets/images/infograph.png';

const shareCards = [
  {
    id: 'genesis-1-1-2',
    image: genesisImageA,
    nickname: 'rit**',
    reference: '창1:1-2',
    message: [
      '혼돈 속에서도',
      '하나님의 말씀 한마디로',
      '빛이 시작됩니다.',
      '내 삶도 그 말씀으로 다시 밝아집니다.',
    ],
  },
  {
    id: 'genesis-1-20-23',
    image: genesisImageB,
    nickname: 'chance****',
    reference: '창1:20-23',
    message: [
      '시작은 이미 하나님 안에서',
      '준비되어 있었습니다.',
      '내가 보지 못한 시간에도',
      '하나님은 일하고 계셨습니다.',
    ],
  },
  {
    id: 'genesis-1-26-28',
    image: genesisImageC,
    nickname: 'moon**',
    reference: '창1:26-28',
    message: [
      '하나님은 사람을 자신의 형상으로 지으시고',
      '세상을 맡기셨습니다.',
      '내 삶도 맡겨진 자리에서',
      '하나님의 뜻을 드러내는 삶입니다.',
    ],
  },
];

const storySlides2 = [
  {
    "id": "slide-1",
    "chapter": "쉼",
    "title": ["모든 것이", "멈추는 순간이 있습니다"]
  },
  {
    "id": "slide-2",
    "chapter": "관계",
    "title": ["사람은", "혼자 두지 않았습니다"]
  },
  {
    "id": "slide-3",
    "chapter": "호흡",
    "title": ["생명은", "불어넣어집니다"]
  },
  {
    "id": "slide-4",
    "chapter": "자리",
    "title": ["머무를 곳이", "주어집니다"]
  },
  {
    "id": "slide-5",
    "chapter": "선택",
    "title": ["모든 것이 가능하지만", "하나를 묻습니다"]
  },
  {
    "id": "slide-6",
    "chapter": "동행",
    "title": ["함께하는 존재가", "곁에 놓입니다"]
  },
  {
    "id": "slide-7",
    "chapter": "하나",
    "title": ["둘이 아니라", "하나가 됩니다"]
  },
  {
    "id": "slide-8",
    "chapter": "질문",
    "title": ["지금 나는", "어디에 머물고 있나요"],
    "footer": ["함께 성경을 읽는 시온입니다 😊", "시온은 기준을 함께 찾습니다"]
  }
];

const storySlides1 = [
  {
    id: 'slide-1',
    chapter: '시작',
    title: ['처음은', '누가 시작했을까요'],
  },
  {
    id: 'slide-2',
    chapter: '혼돈',
    title: ['아무것도 없던 곳에서', '무엇이 시작되었습니다'],
  },
  {
    id: 'slide-3',
    chapter: '빛',
    title: ['빛이 생기고', '어둠이 나뉘고'],
  },
  {
    id: 'slide-4',
    chapter: '나눔',
    title: ['하늘과 땅이', '자리를 잡고'],
  },
  {
    id: 'slide-5',
    chapter: '질서',
    title: ['생명이', '하나씩 채워집니다'],
  },
  {
    id: 'slide-6',
    chapter: '채움',
    title: ['질서가', '조금씩 만들어집니다'],
  },
  {
    id: 'slide-7',
    chapter: '사람',
    title: ['그 마지막에', '사람이 놓입니다'],
  },
  {
    id: 'slide-8',
    chapter: '질문',
    title: ['지금 내 삶은', '누가 시작하고 있나요'],
    footer: ['함께 성경을 읽는 시온입니다 😊', '시온은 말씀으로 시작합니다'],
  },
];

const leftStorySlides = storySlides1;
const rightStorySlides = storySlides2;

function goRead() {
  return navigateTo('/read');
}

function goToVerse(reference: string) {
  const match = reference.match(/^창(\d+):/);
  const chapterNo = match?.[1] ?? '1';
  return navigateTo(`/read/1/${chapterNo}`);
}
</script>

<template>
  <div class="home-page">
    <section class="home-hero">
      <img
        :src="heroImage"
        alt="Bible reading"
        class="home-hero-image"
      >
      <div class="home-hero-overlay" />

      <div class="home-hero-content">
        <h1 class="home-hero-title">
          읽고, 멈추고, 남겨보세요
        </h1>

        <p class="home-hero-copy">
          성경을 색으로 읽어보세요
        </p>

        <button
          type="button"
          class="home-hero-button"
          @click="goRead"
        >
          말씀 시작하기
        </button>
      </div>
    </section>

    <section class="home-flow">
      <div class="home-flow-board">
        <div class="home-flow-steps">
          <span class="home-flow-step home-flow-step--read">읽기</span>
          <span class="home-flow-step home-flow-step--pause">멈춤</span>
          <span class="home-flow-step home-flow-step--share">나눔</span>
        </div>

        <div class="home-flow-body">
          <p class="home-flow-copy">
            한 구절에서 멈추고<br>
            지금 떠오른 것을 남겨보세요
          </p>
        </div>
      </div>
    </section>
    
    <section class="home-hero home-hero--plain">
      <img
        :src="infographImage"
        alt="Bible reading"
        class="home-hero-image"
      >

      <!-- <div class="home-hero-content">
        <h1 class="home-hero-title">
          읽고, 멈추고, 남겨보세요
        </h1>

        <p class="home-hero-copy">
          성경을 색으로 읽어보세요
        </p>

        <button
          type="button"
          class="home-hero-button"
          @click="goRead"
        >
          말씀 시작하기
        </button>
      </div> -->
    </section>
    
    <!-- ###################### 나눔 카드 ########################### -->
    <section class="home-preview">
      <div class="home-preview-list home-preview-list--shares">
        <div class="home-preview-heading">
          잠시 멈춤. 나눔
        </div>

        <button
          v-for="card in shareCards"
          :key="card.id"
          type="button"
          class="home-share-card"
          @click="goToVerse(card.reference)"
        >
          <img
            :src="card.image"
            :alt="card.reference"
            class="home-share-card-image"
          >

          <div class="home-share-card-meta">
            <strong>{{ card.nickname }}</strong>
            <span>{{ card.reference }}</span>
          </div>

          <div class="home-share-card-message">
            <p
              v-for="line in card.message"
              :key="`${card.id}-${line}`"
            >
              {{ line }}
            </p>
          </div>
        </button>
      </div>
    </section>

    <!-- ###################### card slider ########################### -->
    <section class="home-story">
      <h2 class="home-story-heading">한 구절 묵상</h2>

      <div class="home-story-grid">
        <HomeStorySlider book="창세기1장" :image="cardImage1" :slides="leftStorySlides" :interval-ms="4500" />
        <HomeStorySlider book="창세기2장" :image="cardImage2" :slides="rightStorySlides" :interval-ms="5000" />
      </div>
    </section>
    <section class="home-bottom-cta">
      <p class="home-bottom-cta-copy">말씀으로 나누기</p>
      <button
        type="button"
        class="home-bottom-cta-button"
        @click="goRead"
      >
        말씀 시작하기
      </button>
    </section>
  </div>
</template>
