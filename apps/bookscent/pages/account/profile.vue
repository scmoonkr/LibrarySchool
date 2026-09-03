<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
});

const auth = useAuth();
const identity = useReaderIdentity();

await callOnce(async () => {
  await auth.fetchMe().catch(() => null);
});

const user = computed(() => auth.currentUser.value);
const joinedAt = computed(() => {
  if (!user.value?.createdAt) {
    return '기록 없음';
  }

  return new Date(user.value.createdAt).toLocaleDateString('ko-KR');
});
</script>

<template>
  <section class="page-stack">
    <section class="panel-card">
      <div class="mvp-section-header">
        <div>
          <h1>현재 읽기 계정을 확인합니다</h1>
        </div>
        <NuxtLink class="mvp-chip-button" to="/account">계정 홈</NuxtLink>
      </div>

      <p class="muted">
        아직 프로필 수정 기능은 없어서 이 페이지는 읽기 전용입니다. 로그인한 사용자 정보와 현재 읽기 식별 정보를
        한곳에서 보여줍니다.
      </p>

      <div class="info-grid">
        <article class="info-card">
          <h2>기본 프로필</h2>
          <div class="detail-list">
            <div class="detail-row">
              <span>닉네임</span>
              <strong>{{ user?.nickname || '-' }}</strong>
            </div>
            <div class="detail-row">
              <span>이메일</span>
              <strong>{{ user?.email || '-' }}</strong>
            </div>
            <div class="detail-row">
              <span>가입일</span>
              <strong>{{ joinedAt }}</strong>
            </div>
          </div>
        </article>

        <article class="info-card">
          <h2>세션 정보</h2>
          <div class="detail-list">
            <div class="detail-row">
              <span>리더 ID</span>
              <strong>{{ identity.readerId }}</strong>
            </div>
            <div class="detail-row">
              <span>세션 상태</span>
              <strong>{{ identity.isAuthenticated ? '로그인됨' : '게스트' }}</strong>
            </div>
            <div class="detail-row">
              <span>권한</span>
              <strong>{{ user?.roles?.join(', ') || 'user' }}</strong>
            </div>
          </div>
        </article>
      </div>
    </section>

    <section class="two-column">
      <article class="panel-card">
        <h2>바로가기</h2>
        <div class="badge-row">
          <NuxtLink class="badge badge-link" to="/account/security">비밀번호 변경</NuxtLink>
          <NuxtLink class="badge badge-link" to="/review">돌아보기 열기</NuxtLink>
          <NuxtLink class="badge badge-link" to="/read/1/1">읽기 계속하기</NuxtLink>
        </div>
      </article>

      <article class="panel-card">
        <h2>추후 지원 예정</h2>
        <ul class="flat-list">
          <li>프로필 수정</li>
          <li>프로필 이미지 업로드</li>
          <li>공개 프로필 페이지</li>
        </ul>
      </article>
    </section>
  </section>
</template>
