<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
});

const auth = useAuth();
const identity = useReaderIdentity();
const router = useRouter();

await callOnce(async () => {
  await auth.fetchMe().catch(() => null);
});

const user = computed(() => auth.currentUser.value);

async function logout() {
  await auth.clearSession();
  await router.push('/login');
}
</script>

<template>
  <section class="hero-grid">
    <article class="hero-card">
      <p class="muted">계정 홈</p>
      <h1>{{ user?.nickname || '사용자' }}님, 읽기와 기록을 여기서 이어가세요.</h1>
      <p>
        계정 허브에서는 현재 로그인 상태, 읽기 기록으로 이동하는 빠른 링크, 보안 설정과 프로필 요약을 한 번에
        확인할 수 있습니다.
      </p>
      <div class="badge-row">
        <NuxtLink class="badge badge-link" to="/read/1/1">읽기 계속</NuxtLink>
        <NuxtLink class="badge badge-link" to="/review">묵상 돌아보기</NuxtLink>
        <NuxtLink class="badge badge-link" to="/sharing">공유 화면</NuxtLink>
      </div>
    </article>

    <article class="panel-card">
      <h2>현재 세션</h2>
      <div class="info-grid account-session-grid">
        <div class="info-card">
          <span>닉네임</span>
          <div class="account-session-identity">
            <span class="account-session-avatar" aria-hidden="true">
              <img v-if="user?.profileImage" :src="user.profileImage" alt="" />
              <i v-else class="fa-regular fa-user"></i>
            </span>
            <strong>{{ user?.nickname || '-' }}</strong>
          </div>
        </div>
        <div class="info-card">
          <span>리더 ID</span>
          <strong>{{ identity.readerId }}</strong>
        </div>
        <div class="info-card account-info-card--wide">
          <span>이메일</span>
          <strong class="account-info-value--email">{{ user?.email || '-' }}</strong>
        </div>
      </div>
      <div class="badge-row">
        <NuxtLink class="ghost-button" to="/account/profile">프로필 보기</NuxtLink>
        <NuxtLink class="ghost-button" to="/account/security">보안 설정</NuxtLink>
        <button class="ghost-button" type="button" @click="logout()">로그아웃</button>
      </div>
    </article>
  </section>

  <section class="panel-card" style="margin-top: 1rem;">
    <div class="mvp-section-header">
      <div>
        <p class="mvp-eyebrow">Quick Route</p>
        <h2>다음 행동</h2>
      </div>
    </div>
    <div class="feature-grid">
      <article class="feature-card">
        <h3>읽기</h3>
        <p>창세기 1장으로 돌아가 색칠과 묵상을 이어갑니다.</p>
        <NuxtLink class="badge badge-link" to="/read/1/1">읽기 계속</NuxtLink>
      </article>
      <article class="feature-card">
        <h3>리뷰</h3>
        <p>지금까지 저장한 묵상을 한 번에 다시 봅니다.</p>
        <NuxtLink class="badge badge-link" to="/review">리뷰 보기</NuxtLink>
      </article>
      <article class="feature-card">
        <h3>보안</h3>
        <p>비밀번호를 바꾸고 로그인 방식을 점검합니다.</p>
        <NuxtLink class="badge badge-link" to="/account/security">보안 설정</NuxtLink>
      </article>
    </div>
  </section>
</template>
