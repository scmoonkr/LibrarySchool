<script setup lang="ts">
definePageMeta({
  middleware: 'guest',
});

const auth = useAuth();
const router = useRouter();

const form = reactive({
  nickname: '',
  email: '',
  password: '',
});
const errorMessage = ref('');
const nicknameMessage = ref('');
const loading = ref(false);
const checkingNickname = ref(false);
const nicknameChecked = ref(false);
const checkedNickname = ref('');

watch(() => form.nickname, () => {
  nicknameChecked.value = false;
  checkedNickname.value = '';
  nicknameMessage.value = '';
});

async function verifyNickname() {
  checkingNickname.value = true;
  errorMessage.value = '';
  nicknameMessage.value = '';

  try {
    const response = await auth.checkNickname(form.nickname);
    if (!response.data.available) {
      nicknameChecked.value = false;
      checkedNickname.value = '';
      nicknameMessage.value = '이미 사용 중인 닉네임입니다.';
      return;
    }

    nicknameChecked.value = true;
    checkedNickname.value = form.nickname.trim();
    nicknameMessage.value = '사용 가능한 닉네임입니다.';
  } catch (error: any) {
    nicknameChecked.value = false;
    checkedNickname.value = '';
    nicknameMessage.value = error?.data?.message || error?.message || '닉네임 확인 중 오류가 발생했습니다.';
  } finally {
    checkingNickname.value = false;
  }
}

async function submit() {
  loading.value = true;
  errorMessage.value = '';

  try {
    if (!nicknameChecked.value || checkedNickname.value !== form.nickname.trim()) {
      throw new Error('닉네임 중복확인을 먼저 해주세요.');
    }

    await auth.signup({
      ...form,
      nicknameChecked: true,
    });
    await router.push('/account');
  } catch (error: any) {
    errorMessage.value = error?.data?.message || error?.message || '회원가입 중 오류가 발생했습니다.';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <section class="panel-card">
    <h1>회원가입</h1>
    <p class="muted">닉네임 중복확인 후 이메일과 비밀번호로 가입합니다.</p>

    <div class="auth-form">
      <label>
        닉네임
        <div style="display: flex; gap: 0.6rem;">
          <input v-model="form.nickname" type="text" />
          <button class="ghost-button" type="button" :disabled="checkingNickname" @click="verifyNickname()">
            {{ checkingNickname ? '확인 중' : '중복확인' }}
          </button>
        </div>
      </label>
      <p v-if="nicknameMessage" class="muted">{{ nicknameMessage }}</p>
      <label>
        이메일
        <input v-model="form.email" type="email" />
      </label>
      <label>
        비밀번호
        <input v-model="form.password" type="password" />
      </label>
      <div class="badge-row">
        <button class="primary-button" type="button" :disabled="loading" @click="submit()">
          {{ loading ? '가입 중' : '회원가입' }}
        </button>
      </div>
      <p v-if="errorMessage" class="muted">{{ errorMessage }}</p>
    </div>
  </section>
</template>

<style scoped>
.panel-card,
.auth-form input,
.auth-form button,
.ghost-button,
.primary-button {
  border-radius: 5px;
}
</style>
