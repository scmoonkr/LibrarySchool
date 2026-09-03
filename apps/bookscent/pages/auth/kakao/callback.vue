<script setup lang="ts">
definePageMeta({
  middleware: 'guest',
});

const auth = useAuth();
const route = useRoute();
const router = useRouter();
const message = ref('카카오 로그인 처리 중입니다.');

onMounted(async () => {
  const code = String(route.query.code || '');

  if (!code) {
    message.value = '카카오 인증 코드가 없습니다.';
    return;
  }

  try {
    await auth.loginWithKakaoCode(code);
    message.value = '카카오 로그인이 완료되었습니다.';
    await router.push('/account');
  } catch (error: any) {
    message.value = error?.data?.message || error?.message || '카카오 로그인 처리 중 오류가 발생했습니다.';
  }
});
</script>

<template>
  <section class="panel-card">
    <div class="mvp-section-header">
      <div>
        <p class="mvp-eyebrow">Kakao</p>
        <h1>카카오 로그인 연결</h1>
      </div>
    </div>
    <p class="muted">카카오 인증 서버에서 돌아온 코드를 처리하고 있습니다. 완료되면 계정 허브로 이동합니다.</p>
    <div class="paragraph-card" style="margin-top: 1rem;">
      <p>{{ message }}</p>
    </div>
  </section>
</template>
