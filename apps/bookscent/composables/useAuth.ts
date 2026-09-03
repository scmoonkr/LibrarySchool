export type AuthUser = {
  userNo: number;
  email: string;
  nickname: string;
  profileImage?: string;
  roles?: string[];
  status?: string;
  createdAt?: string;
  updatedAt?: string;
};

type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

type AuthPayload = {
  user: AuthUser;
  tokens: AuthTokens;
};

export function useAuth() {
  const config = useRuntimeConfig();
  const tokenCookie = useCookie<string>('omb-access-token', {
    sameSite: 'lax',
    default: () => '',
  });
  const refreshTokenCookie = useCookie<string>('omb-refresh-token', {
    sameSite: 'lax',
    default: () => '',
  });
  const userCookie = useCookie<AuthUser | null>('omb-auth-user', {
    sameSite: 'lax',
    default: () => null,
  });
  const token = useState<string>('auth-token', () => tokenCookie.value || '');
  const refreshToken = useState<string>('auth-refresh-token', () => refreshTokenCookie.value || '');
  const currentUser = useState<AuthUser | null>('auth-user', () => userCookie.value || null);

  function syncSession() {
    token.value = tokenCookie.value || '';
    refreshToken.value = refreshTokenCookie.value || '';
    currentUser.value = userCookie.value || null;
  }

  function setSession(payload: AuthPayload) {
    token.value = payload.tokens.accessToken;
    refreshToken.value = payload.tokens.refreshToken;
    currentUser.value = payload.user;
    tokenCookie.value = payload.tokens.accessToken;
    refreshTokenCookie.value = payload.tokens.refreshToken;
    userCookie.value = payload.user;
  }

  async function clearSession() {
    const snapshotRefreshToken = refreshToken.value;

    token.value = '';
    refreshToken.value = '';
    currentUser.value = null;
    tokenCookie.value = '';
    refreshTokenCookie.value = '';
    userCookie.value = null;

    if (snapshotRefreshToken) {
      await $fetch(`${config.public.apiBase}/api/auth/logout`, {
        method: 'POST',
        body: {
          refreshToken: snapshotRefreshToken,
        },
      }).catch(() => null);
    }
  }

  async function checkNickname(nickname: string) {
    return await $fetch<{ ok: boolean; data: { nickname: string; available: boolean } }>(
      `${config.public.apiBase}/api/auth/nickname-check`,
      {
        query: { nickname },
      },
    );
  }

  async function signup(body: { email: string; password: string; nickname: string; nicknameChecked: boolean }) {
    const response = await $fetch<{ ok: boolean; data: AuthPayload }>(
      `${config.public.apiBase}/api/auth/signup`,
      {
        method: 'POST',
        body,
      },
    );

    setSession(response.data);
    return response.data;
  }

  async function login(body: { email: string; password: string }) {
    const response = await $fetch<{ ok: boolean; data: AuthPayload }>(
      `${config.public.apiBase}/api/auth/login`,
      {
        method: 'POST',
        body,
      },
    );

    setSession(response.data);
    return response.data;
  }

  async function loginWithKakaoCode(code: string) {
    const response = await $fetch<{ ok: boolean; data: AuthPayload }>(
      `${config.public.apiBase}/api/auth/kakao/callback`,
      {
        query: { code },
      },
    );

    setSession(response.data);
    return response.data;
  }

  async function refreshSession() {
    if (!refreshToken.value) {
      return null;
    }

    try {
      const response = await $fetch<{ ok: boolean; data: AuthPayload }>(
        `${config.public.apiBase}/api/auth/refresh`,
        {
          method: 'POST',
          body: {
            refreshToken: refreshToken.value,
          },
        },
      );

      setSession(response.data);
      return response.data;
    } catch (error) {
      token.value = '';
      refreshToken.value = '';
      currentUser.value = null;
      tokenCookie.value = '';
      refreshTokenCookie.value = '';
      userCookie.value = null;
      throw error;
    }
  }

  async function fetchMe() {
    if (!token.value) {
      return null;
    }

    try {
      const response = await $fetch<{ ok: boolean; data: AuthUser }>(
        `${config.public.apiBase}/api/auth/me`,
        {
          headers: {
            Authorization: `Bearer ${token.value}`,
          },
        },
      );

      currentUser.value = response.data;
      userCookie.value = response.data;
      return response.data;
    } catch (error) {
      if (refreshToken.value) {
        await refreshSession();
        const retried = await $fetch<{ ok: boolean; data: AuthUser }>(
          `${config.public.apiBase}/api/auth/me`,
          {
            headers: {
              Authorization: `Bearer ${token.value}`,
            },
          },
        );
        currentUser.value = retried.data;
        userCookie.value = retried.data;
        return retried.data;
      }

      token.value = '';
      refreshToken.value = '';
      currentUser.value = null;
      tokenCookie.value = '';
      refreshTokenCookie.value = '';
      userCookie.value = null;
      throw error;
    }
  }

  async function changePassword(body: { currentPassword: string; nextPassword: string }) {
    return await $fetch<{ ok: boolean; data: { ok: boolean } }>(
      `${config.public.apiBase}/api/auth/change-password`,
      {
        method: 'POST',
        body,
        headers: {
          Authorization: `Bearer ${token.value}`,
        },
      },
    );
  }

  async function forgotPassword(body: { email: string }) {
    return await $fetch<{ ok: boolean; data: { message: string; debugResetToken?: string } }>(
      `${config.public.apiBase}/api/auth/forgot-password`,
      {
        method: 'POST',
        body,
      },
    );
  }

  async function resetPassword(body: { resetToken: string; nextPassword: string }) {
    return await $fetch<{ ok: boolean; data: { ok: boolean } }>(
      `${config.public.apiBase}/api/auth/reset-password`,
      {
        method: 'POST',
        body,
      },
    );
  }

  async function getKakaoAuthorizeUrl() {
    return await $fetch<{ ok: boolean; url: string; message?: string }>(
      `${config.public.apiBase}/api/auth/kakao/authorize`,
    );
  }

  return {
    token,
    refreshToken,
    currentUser,
    syncSession,
    checkNickname,
    signup,
    login,
    loginWithKakaoCode,
    refreshSession,
    fetchMe,
    changePassword,
    forgotPassword,
    resetPassword,
    getKakaoAuthorizeUrl,
    clearSession,
  };
}
