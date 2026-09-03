import {
  changePassword,
  checkNicknameAvailability,
  getKakaoAuthorizationUrl,
  getMyProfile,
  login,
  loginWithKakaoCode,
  logout,
  refreshSession,
  requestPasswordReset,
  resetPassword,
  signUp,
} from './auth.service.js';

export async function signupLocal(req, res, next) {
  try {
    const result = await signUp(req.body);
    return res.status(201).json({ ok: true, data: result });
  } catch (error) {
    return next(error);
  }
}

export async function checkNickname(req, res, next) {
  try {
    const result = await checkNicknameAvailability(String(req.query.nickname || ''));
    return res.json({ ok: true, data: result });
  } catch (error) {
    return next(error);
  }
}

export async function loginLocal(req, res, next) {
  try {
    const result = await login(req.body);
    return res.json({ ok: true, data: result });
  } catch (error) {
    return next(error);
  }
}

export async function refreshAuth(req, res, next) {
  try {
    const result = await refreshSession(req.body);
    return res.json({ ok: true, data: result });
  } catch (error) {
    return next(error);
  }
}

export async function logoutAuth(req, res, next) {
  try {
    const result = await logout(req.body);
    return res.json({ ok: true, data: result });
  } catch (error) {
    return next(error);
  }
}

export async function me(req, res, next) {
  try {
    const profile = await getMyProfile(req.user.userId);
    return res.json({ ok: true, data: profile });
  } catch (error) {
    return next(error);
  }
}

export async function changeMyPassword(req, res, next) {
  try {
    const result = await changePassword(req.user.userId, req.body);
    return res.json({ ok: true, data: result });
  } catch (error) {
    return next(error);
  }
}

export async function forgotPassword(req, res, next) {
  try {
    const result = await requestPasswordReset(req.body);
    return res.json({ ok: true, data: result });
  } catch (error) {
    return next(error);
  }
}

export async function resetPasswordByToken(req, res, next) {
  try {
    const result = await resetPassword(req.body);
    return res.json({ ok: true, data: result });
  } catch (error) {
    return next(error);
  }
}

export async function kakaoAuthorize(req, res, next) {
  try {
    const result = getKakaoAuthorizationUrl();
    return res.json(result);
  } catch (error) {
    return next(error);
  }
}

export async function kakaoCallback(req, res, next) {
  try {
    const result = await loginWithKakaoCode(String(req.query.code || ''));
    return res.json({ ok: true, data: result });
  } catch (error) {
    return next(error);
  }
}
