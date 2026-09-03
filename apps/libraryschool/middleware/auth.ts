export default defineNuxtRouteMiddleware(async () => {
  const auth = useAuth();

  auth.syncSession();

  if (!auth.token.value && auth.refreshToken.value) {
    try {
      await auth.refreshSession();
    } catch (error) {
      return navigateTo('/login');
    }
  }

  if (!auth.token.value) {
    return navigateTo('/login');
  }

  if (!auth.currentUser.value) {
    try {
      await auth.fetchMe();
    } catch (error) {
      return navigateTo('/login');
    }
  }
});
