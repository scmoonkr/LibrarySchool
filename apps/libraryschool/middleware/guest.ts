export default defineNuxtRouteMiddleware(async () => {
  const auth = useAuth();

  auth.syncSession();

  if (!auth.token.value && auth.refreshToken.value) {
    try {
      await auth.refreshSession();
    } catch (error) {
      return;
    }
  }

  if (!auth.token.value) {
    return;
  }

  if (!auth.currentUser.value) {
    try {
      await auth.fetchMe();
    } catch (error) {
      return;
    }
  }

  return navigateTo('/account');
});
