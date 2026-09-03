<script setup lang="ts">
definePageMeta({
  middleware: 'guest',
});

const auth = useAuth();
const route = useRoute();
const router = useRouter();

const form = reactive({
  resetToken: String(route.query.token || ''),
  nextPassword: '',
});
const loading = ref(false);
const message = ref('');

watch(
  () => route.query.token,
  (token) => {
    form.resetToken = String(token || '');
  },
  { immediate: true },
);

async function submit() {
  loading.value = true;
  message.value = '';

  try {
    await auth.resetPassword(form);
    message.value = '비밀번호를 재설정했습니다. 이제 로그인할 수 있습니다.';
    setTimeout(() => {
      router.push('/login');
    }, 900);
  } catch (error: any) {
    message.value = error?.data?.message || error?.message || '비밀번호 재설정 중 오류가 발생했습니다.';
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
          <p class="mvp-eyebrow">Reset Password</p>
          <h1>새 비밀번호 설정</h1>
        </div>
      </div>

      <p class="muted">토큰을 확인한 뒤 새 비밀번호를 입력하면 바로 로그인 화면으로 돌아갑니다.</p>

      <div class="auth-form" style="margin-top: 1rem;">
        <label>
          재설정 토큰
          <input v-model="form.resetToken" type="text" />
        </label>
        <label>
          새 비밀번호
          <input v-model="form.nextPassword" type="password" autocomplete="new-password" />
        </label>
        <div class="badge-row">
          <button class="primary-button" type="button" :disabled="loading" @click="submit()">
            {{ loading ? '재설정 중' : '비밀번호 재설정' }}
          </button>
          <NuxtLink class="ghost-button" to="/login">로그인으로 이동</NuxtLink>
        </div>
        <p v-if="message" class="muted">{{ message }}</p>
      </div>
    </article>

    <article class="panel-card">
      <h2>확인할 것</h2>
      <div class="step-list">
        <div class="step-item">
          <strong>토큰 유효성</strong>
          <span>토큰이 비어 있으면 재설정이 진행되지 않습니다.</span>
        </div>
        <div class="step-item">
          <strong>새 비밀번호</strong>
          <span>기존 비밀번호와 구분되는 새 비밀번호를 사용하세요.</span>
        </div>
        <div class="step-item">
          <strong>완료 후 로그인</strong>
          <span>재설정이 끝나면 로그인 페이지로 이동해 다시 세션을 시작합니다.</span>
        </div>
      </div>
    </article>
  </section>
</template>
