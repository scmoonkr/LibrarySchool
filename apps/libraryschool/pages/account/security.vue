<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
});

const auth = useAuth();

const form = reactive({
  currentPassword: '',
  nextPassword: '',
});
const message = ref('');
const loading = ref(false);

async function submit() {
  loading.value = true;
  message.value = '';

  try {
    await auth.changePassword(form);
    message.value = '비밀번호를 변경했습니다.';
    form.currentPassword = '';
    form.nextPassword = '';
  } catch (error: any) {
    message.value = error?.data?.message || error?.message || '비밀번호 변경 중 오류가 발생했습니다.';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <section class="two-column">
    <article class="panel-card">
      <div class="mvp-section-header">
        <div>
          <p class="mvp-eyebrow">Security</p>
          <h1>보안 설정</h1>
        </div>
      </div>

      <p class="muted">
        현재는 비밀번호 변경이 핵심 보안 기능입니다. 이후에는 소셜 로그인 상태, 최근 로그인 기록, 기기 관리 같은
        보강 항목을 확장할 수 있습니다.
      </p>

      <div class="auth-form" style="margin-top: 1rem;">
        <label>
          현재 비밀번호
          <input v-model="form.currentPassword" type="password" autocomplete="current-password" />
        </label>
        <label>
          새 비밀번호
          <input v-model="form.nextPassword" type="password" autocomplete="new-password" />
        </label>
        <div class="badge-row">
          <button class="primary-button" type="button" :disabled="loading" @click="submit()">
            {{ loading ? '변경 중' : '비밀번호 변경' }}
          </button>
          <NuxtLink class="ghost-button" to="/forgot-password">재설정 흐름 보기</NuxtLink>
        </div>
        <p v-if="message" class="muted">{{ message }}</p>
      </div>
    </article>

    <article class="panel-card">
      <h2>보안 메모</h2>
      <div class="step-list">
        <div class="step-item">
          <strong>정기 변경</strong>
          <span>공유된 환경에서 사용한다면 비밀번호를 주기적으로 바꾸는 것이 좋습니다.</span>
        </div>
        <div class="step-item">
          <strong>소셜 로그인</strong>
          <span>카카오 로그인을 함께 쓴다면 같은 계정으로 연결되고 있는지 확인하세요.</span>
        </div>
        <div class="step-item">
          <strong>기록 보호</strong>
          <span>로그아웃 전에 브라우저를 공유하는지, guest 기록과 혼동되지 않는지 점검하세요.</span>
        </div>
      </div>
    </article>
  </section>
</template>
