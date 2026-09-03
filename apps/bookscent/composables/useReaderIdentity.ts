export function useReaderIdentity() {
  const auth = useAuth();
  const isAuthenticated = computed(() => Boolean(auth.currentUser.value?.userNo && auth.token.value));
  const readerNo = computed(() => auth.currentUser.value?.userNo || 0);
  const readerId = computed(() => (readerNo.value ? String(readerNo.value) : 'guest'));

  return {
    readerNo,
    readerId,
    isAuthenticated,
  };
}
