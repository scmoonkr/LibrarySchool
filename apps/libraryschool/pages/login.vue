<script setup lang="ts">
definePageMeta({
  middleware: 'guest',
});

const auth = useAuth();
const router = useRouter();
const route = useRoute();

// 가드(middleware/backend.ts 등)가 붙여준 복귀 경로.
// 오픈 리다이렉트를 막기 위해 같은 오리진의 절대경로만 허용한다.
const redirectTo = computed(() => {
  const raw = route.query.redirect;
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== 'string') return '/account';
  return value.startsWith('/') && !value.startsWith('//') ? value : '/account';
});

const form = reactive({
  email: '',
  password: '',
});
const errorMessage = ref('');
const loading = ref(false);
const kakaoMessage = ref('');
const keepSignedIn = ref(true);
const showPassword = ref(false);

async function submit() {
  loading.value = true;
  errorMessage.value = '';

  try {
    await auth.login(form);
    await router.push(redirectTo.value);
  } catch (error: any) {
    errorMessage.value = error?.data?.message || error?.message || '로그인 중 오류가 발생했습니다.';
  } finally {
    loading.value = false;
  }
}

async function openKakao() {
  try {
    const result = await auth.getKakaoAuthorizeUrl();
    if (result.ok && result.url) {
      await navigateTo(result.url, { external: true });
      return;
    }
    kakaoMessage.value = result.message || '카카오 설정이 비어 있습니다.';
  } catch (error: any) {
    kakaoMessage.value = error?.data?.message || error?.message || '카카오 로그인 준비 중 오류가 발생했습니다.';
  }
}
</script>

<template>
  <section class="login-page">
    <article class="login-card">
      <div class="login-brand">
        <h1>OneMinuteBible</h1>
        <p>말씀을 읽고, 멈추고, 다시 돌아보는 시간</p>
      </div>

      <div class="login-head">
        <h2>로그인</h2>
        <p>계정에 로그인하고 말씀 읽기를 이어가세요.</p>
      </div>

      <button class="login-kakao" type="button" @click="openKakao()">
        <span class="login-kakao-icon" aria-hidden="true">●</span>
        카카오 계정으로 로그인
      </button>

      <div class="login-divider">
        <span>또는 이메일로 로그인</span>
      </div>

      <form class="login-form" @submit.prevent="submit()">
        <label class="login-field">
          <span>이메일</span>
          <input v-model="form.email" type="email" placeholder="example@email.com" />
        </label>

        <label class="login-field">
          <span>비밀번호</span>
          <div class="login-password-wrap">
            <input
              v-model="form.password"
              :type="showPassword ? 'text' : 'password'"
              placeholder="비밀번호 입력"
            />
            <button type="button" class="login-password-toggle" @click="showPassword = !showPassword">
              {{ showPassword ? '숨기기' : '보기' }}
            </button>
          </div>
        </label>

        <label class="login-check">
          <input v-model="keepSignedIn" type="checkbox" />
          <span>로그인 상태 유지</span>
        </label>

        <button class="login-submit" type="submit" :disabled="loading">
          {{ loading ? '로그인 중' : '로그인' }}
        </button>
      </form>

      <div class="login-links">
        <NuxtLink to="/forgot-password">비밀번호를 잊으셨나요?</NuxtLink>
        <span>|</span>
        <NuxtLink to="/signup">회원가입</NuxtLink>
      </div>

      <p v-if="errorMessage" class="login-message muted">{{ errorMessage }}</p>
      <p v-if="kakaoMessage" class="login-message muted">{{ kakaoMessage }}</p>
    </article>
  </section>
</template>

<style scoped>
.login-page {
  width: min(760px, calc(100vw - 2rem));
  margin: 0 auto;
  padding: 2rem 0 3rem;
}

.login-card {
  padding: 3.25rem 3.35rem 2.8rem;
  border: 1px solid var(--line);
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.86);
  box-shadow: 0 18px 50px rgba(66, 42, 22, 0.08);
}

.login-brand {
  text-align: center;
}

.login-brand h1 {
  margin: 0;
  color: #0b7a78;
  font-size: clamp(2.2rem, 4vw, 3rem);
  font-weight: 800;
  letter-spacing: -0.03em;
}

.login-brand p {
  margin: 0.65rem 0 0;
  color: #7f6b5d;
  font-size: 1rem;
}

.login-head {
  margin-top: 3rem;
}

.login-head h2 {
  margin: 0;
  color: #2e241d;
  font-size: clamp(2rem, 3.6vw, 2.9rem);
}

.login-head p {
  margin: 0.9rem 0 0;
  color: #7f6b5d;
  font-size: 1rem;
  line-height: 1.7;
}

.login-kakao {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.8rem;
  width: 100%;
  margin-top: 2rem;
  padding: 1.35rem 1.2rem;
  border: 0;
  border-radius: 5px;
  background: #ffe000;
  color: #1f1711;
  font-size: 1.05rem;
  font-weight: 800;
  cursor: pointer;
}

.login-kakao-icon {
  font-size: 1rem;
  line-height: 1;
}

.login-divider {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin: 2rem 0 1.6rem;
  color: #9b8a7d;
}

.login-divider::before,
.login-divider::after {
  content: "";
  flex: 1 1 auto;
  height: 1px;
  background: rgba(46, 36, 29, 0.16);
}

.login-divider span {
  white-space: nowrap;
}

.login-form {
  display: grid;
  gap: 1.5rem;
}

.login-field {
  display: grid;
  gap: 0.65rem;
}

.login-field > span {
  color: #2e241d;
  font-size: 0.98rem;
  font-weight: 700;
}

.login-field input {
  width: 100%;
  height: 64px;
  padding: 0 1.25rem;
  border: 1px solid rgba(46, 36, 29, 0.18);
  border-radius: 5px;
  background: #fffefb;
  font-size: 1rem;
}

.login-field input::placeholder {
  color: #c7b9ab;
}

.login-password-wrap {
  position: relative;
}

.login-password-wrap input {
  padding-right: 5rem;
}

.login-password-toggle {
  position: absolute;
  top: 50%;
  right: 1rem;
  transform: translateY(-50%);
  border: 0;
  background: transparent;
  color: #7f6b5d;
  cursor: pointer;
}

.login-check {
  display: inline-flex;
  align-items: center;
  gap: 0.7rem;
  color: #6f5e51;
}

.login-check input {
  width: 24px;
  height: 24px;
  margin: 0;
}

.login-submit {
  width: 100%;
  height: 74px;
  border: 0;
  border-radius: 5px;
  background: #6b4c36;
  color: #ffffff;
  font-size: 1.15rem;
  font-weight: 800;
  cursor: pointer;
}

.login-submit:disabled {
  opacity: 0.7;
  cursor: default;
}

.login-links {
  display: flex;
  justify-content: center;
  gap: 0.9rem;
  margin-top: 1.8rem;
  color: #8a7768;
}

.login-links a:last-child {
  color: #0f9b83;
  font-weight: 700;
}

.login-message {
  margin: 1rem 0 0;
  text-align: center;
}

@media (max-width: 760px) {
  .login-page {
    width: min(100vw - 1rem, 760px);
    padding: 1rem 0 2rem;
  }

  .login-card {
    padding: 2rem 1.35rem 1.8rem;
    border-radius: 5px;
  }

  .login-head {
    margin-top: 2rem;
  }

  .login-kakao,
  .login-submit,
  .login-field input {
    height: 58px;
  }

  .login-links {
    flex-wrap: wrap;
  }
}
</style>
