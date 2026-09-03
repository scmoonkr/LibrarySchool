<script setup lang="ts">
definePageMeta({
  middleware: 'guest',
});

const auth = useAuth();
const debugResetToken = ref('');
const form = reactive({
  email: '',
});
const message = ref('');
const loading = ref(false);
const isDev = import.meta.dev;

async function submit() {
  loading.value = true;
  message.value = '';
  debugResetToken.value = '';

  try {
    const result = await auth.forgotPassword(form);
    message.value = result.data.message;
    debugResetToken.value = result.data.debugResetToken || '';
  } catch (error: any) {
    message.value = error?.data?.message || error?.message || '비밀번호 찾기 요청 중 오류가 발생했습니다.';
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
          <p class="mvp-eyebrow">Password Reset</p>
          <h1>비밀번호 찾기</h1>
        </div>
      </div>

      <p class="muted">
        이메일을 입력하면 비밀번호 재설정 단계를 시작할 수 있습니다. 현재 개발 단계에서는 메일 발송 대신 reset token을
        직접 확인할 수 있게 해 두었습니다.
      </p>

      <div class="auth-form" style="margin-top: 1rem;">
        <label>
          이메일
          <input v-model="form.email" type="email" autocomplete="email" />
        </label>
        <div class="badge-row">
          <button class="primary-button" type="button" :disabled="loading" @click="submit()">
            {{ loading ? '요청 중' : '재설정 링크 준비' }}
          </button>
          <NuxtLink class="ghost-button" to="/login">로그인으로 돌아가기</NuxtLink>
        </div>
        <p v-if="message" class="muted">{{ message }}</p>
      </div>
    </article>

    <article class="panel-card">
      <h2>다음 단계</h2>
      <div class="step-list">
        <div class="step-item">
          <strong>1. 이메일 확인</strong>
          <span>가입한 이메일 주소를 정확히 입력합니다.</span>
        </div>
        <div class="step-item">
          <strong>2. 토큰 확인</strong>
          <span>개발 환경에서는 바로 reset token을 받아 다음 단계로 이동할 수 있습니다.</span>
        </div>
        <div class="step-item">
          <strong>3. 새 비밀번호 설정</strong>
          <span>재설정 화면에서 새 비밀번호를 입력하고 다시 로그인합니다.</span>
        </div>
      </div>

      <div v-if="debugResetToken && isDev" class="paragraph-card" style="margin-top: 1rem;">
        <p class="muted">개발용 reset token</p>
        <p style="word-break: break-all;">{{ debugResetToken }}</p>
        <NuxtLink class="ghost-button" :to="`/reset-password?token=${encodeURIComponent(debugResetToken)}`">
          이 토큰으로 비밀번호 재설정
        </NuxtLink>
      </div>
    </article>
  </section>
</template>

<style scoped>
.panel-card,
.paragraph-card,
.auth-form input,
.auth-form button,
.ghost-button,
.primary-button {
  border-radius: 5px;
}
</style>
