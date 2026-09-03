export default defineNuxtPlugin(async () => {
  const auth = useAuth();

  auth.syncSession();

  if (!auth.token.value && auth.refreshToken.value) {
    await auth.refreshSession().catch(() => null);
  }

  if (auth.token.value && !auth.currentUser.value) {
    await auth.fetchMe().catch(() => null);
  }
});
