import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import {
  createAuthAccount,
  createUser,
  findAuthAccountByEmail,
  findAuthAccountByProvider,
  findPasswordResetToken,
  findRefreshToken,
  findUserByEmail,
  findUserById,
  findUserByNickname,
  getNextUserNo,
  markPasswordResetTokenUsed,
  revokeRefreshToken,
  savePasswordResetToken,
  saveRefreshToken,
  updateAuthPassword,
  updateLastLogin,
  upsertAuthAccountByProvider,
} from './auth.repository.js';

function appError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function buildUserId() {
  return `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function buildTokenId() {
  return crypto.randomUUID();
}

function sanitizeUser(user) {
  return {
    userNo: user.userNo,
    email: user.email,
    nickname: user.nickname,
    profileImage: user.profileImage || '',
    roles: user.roles || ['user'],
    status: user.status || 'active',
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

async function issueTokens(user) {
  const tokenId = buildTokenId();
  const accessToken = jwt.sign(
    {
      userId: user.userId,
      userNo: user.userNo,
      email: user.email,
      nickname: user.nickname,
    },
    env.jwtAccessSecret,
    { expiresIn: '7d' },
  );

  const refreshToken = jwt.sign(
    {
      userId: user.userId,
      userNo: user.userNo,
      tokenId,
    },
    env.jwtRefreshSecret,
    { expiresIn: '30d' },
  );

  const now = new Date().toISOString();
  await saveRefreshToken({
    tokenId,
    userId: user.userId,
    userNo: user.userNo,
    email: user.email,
    createdAt: now,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    revokedAt: null,
  });

  return {
    accessToken,
    refreshToken,
  };
}

async function buildAuthResult(user) {
  return {
    user: sanitizeUser(user),
    tokens: await issueTokens(user),
  };
}

function requireConfiguredKakao() {
  if (!env.kakaoClientId) {
    throw appError('Kakao client id is not configured.', 400);
  }
}

export async function checkNicknameAvailability(nicknameValue = '') {
  const nickname = String(nicknameValue || '').trim();
  if (!nickname) {
    throw appError('Nickname is required.', 400);
  }

  const existingUser = await findUserByNickname(nickname);
  return {
    nickname,
    available: !existingUser,
  };
}

export async function signUp(body = {}) {
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  const nickname = String(body.nickname || '').trim();
  const nicknameChecked = body.nicknameChecked === true;

  if (!email || !password || !nickname) {
    throw appError('Email, password, and nickname are required.', 400);
  }

  if (!nicknameChecked) {
    throw appError('Nickname duplicate check is required.', 400);
  }

  const existingUser = await findUserByEmail(email);
  if (existingUser) {
    throw appError('This email is already registered.', 409);
  }

  const existingNickname = await findUserByNickname(nickname);
  if (existingNickname) {
    throw appError('This nickname is already in use.', 409);
  }

  const now = new Date().toISOString();
  const userId = buildUserId();
  const userNo = await getNextUserNo();
  const passwordHash = await bcrypt.hash(password, 10);

  const user = {
    userId,
    userNo,
    email,
    nickname,
    profileImage: '',
    roles: ['user'],
    status: 'active',
    createdAt: now,
    updatedAt: now,
  };

  const account = {
    userId,
    userNo,
    provider: 'local',
    providerUserId: email,
    email,
    passwordHash,
    lastLoginAt: now,
    createdAt: now,
    updatedAt: now,
  };

  await createUser(user);
  await createAuthAccount(account);

  return buildAuthResult(user);
}

export async function login(body = {}) {
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');

  if (!email || !password) {
    throw appError('Email and password are required.', 400);
  }

  const account = await findAuthAccountByEmail(email);
  if (!account) {
    throw appError('No account found for this email.', 404);
  }

  const isValid = await bcrypt.compare(password, account.passwordHash);
  if (!isValid) {
    throw appError('Password does not match.', 401);
  }

  const user = await findUserById(account.userId);
  if (!user) {
    throw appError('User profile is missing.', 404);
  }

  await updateLastLogin(user.userId);

  return buildAuthResult(user);
}

export async function refreshSession(body = {}) {
  const refreshToken = String(body.refreshToken || '');
  if (!refreshToken) {
    throw appError('Refresh token is required.', 400);
  }

  let payload;
  try {
    payload = jwt.verify(refreshToken, env.jwtRefreshSecret);
  } catch (error) {
    throw appError('Refresh token is invalid.', 401);
  }

  const session = await findRefreshToken(payload.tokenId);
  if (!session || session.revokedAt) {
    throw appError('Refresh session is invalid.', 401);
  }

  const user = await findUserById(payload.userId);
  if (!user) {
    throw appError('User not found.', 404);
  }

  await revokeRefreshToken(payload.tokenId);

  return buildAuthResult(user);
}

export async function logout(body = {}) {
  const refreshToken = String(body.refreshToken || '');
  if (!refreshToken) {
    return { ok: true };
  }

  try {
    const payload = jwt.verify(refreshToken, env.jwtRefreshSecret);
    await revokeRefreshToken(payload.tokenId);
  } catch (error) {
    return { ok: true };
  }

  return { ok: true };
}

export async function getMyProfile(userId) {
  const user = await findUserById(userId);
  if (!user) {
    throw appError('User not found.', 404);
  }

  return sanitizeUser(user);
}

export async function changePassword(userId, body = {}) {
  const currentPassword = String(body.currentPassword || '');
  const nextPassword = String(body.nextPassword || '');

  if (!currentPassword || !nextPassword) {
    throw appError('Current password and next password are required.', 400);
  }

  const user = await findUserById(userId);
  if (!user) {
    throw appError('User not found.', 404);
  }

  const account = await findAuthAccountByEmail(user.email);
  if (!account) {
    throw appError('Auth account not found.', 404);
  }

  const isValid = await bcrypt.compare(currentPassword, account.passwordHash);
  if (!isValid) {
    throw appError('Current password does not match.', 401);
  }

  const passwordHash = await bcrypt.hash(nextPassword, 10);
  await updateAuthPassword(userId, passwordHash);

  return {
    ok: true,
  };
}

export async function requestPasswordReset(body = {}) {
  const email = String(body.email || '').trim().toLowerCase();
  if (!email) {
    throw appError('Email is required.', 400);
  }

  const user = await findUserByEmail(email);
  if (!user) {
    return {
      ok: true,
      email,
      message: 'If the account exists, a reset token has been prepared.',
    };
  }

  const tokenId = buildTokenId();
  const resetToken = jwt.sign(
    {
      userId: user.userId,
      tokenId,
      email,
      purpose: 'password-reset',
    },
    env.jwtRefreshSecret,
    { expiresIn: '30m' },
  );

  await savePasswordResetToken({
    tokenId,
    userId: user.userId,
    email,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    usedAt: null,
  });

  return {
    ok: true,
    email,
    message: 'Password reset token generated.',
    debugResetToken: resetToken,
  };
}

export async function resetPassword(body = {}) {
  const resetToken = String(body.resetToken || '');
  const nextPassword = String(body.nextPassword || '');

  if (!resetToken || !nextPassword) {
    throw appError('Reset token and next password are required.', 400);
  }

  let payload;
  try {
    payload = jwt.verify(resetToken, env.jwtRefreshSecret);
  } catch (error) {
    throw appError('Reset token is invalid or expired.', 401);
  }

  if (payload.purpose !== 'password-reset') {
    throw appError('Invalid reset token.', 401);
  }

  const tokenRecord = await findPasswordResetToken(payload.tokenId);
  if (!tokenRecord || tokenRecord.usedAt) {
    throw appError('Reset token is invalid or already used.', 401);
  }

  const passwordHash = await bcrypt.hash(nextPassword, 10);
  await updateAuthPassword(payload.userId, passwordHash);
  await markPasswordResetTokenUsed(payload.tokenId);

  return {
    ok: true,
  };
}

export function getKakaoAuthorizationUrl() {
  requireConfiguredKakao();

  const params = new URLSearchParams({
    client_id: env.kakaoClientId,
    redirect_uri: env.kakaoRedirectUri,
    response_type: 'code',
  });

  return {
    ok: true,
    url: `https://kauth.kakao.com/oauth/authorize?${params.toString()}`,
  };
}

export async function loginWithKakaoCode(code) {
  requireConfiguredKakao();

  if (!code) {
    throw appError('Kakao authorization code is required.', 400);
  }

  const tokenParams = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: env.kakaoClientId,
    redirect_uri: env.kakaoRedirectUri,
    code,
  });

  if (process.env.KAKAO_SECURITY || process.env.KAKAO_CLIENT_SECRET) {
    tokenParams.set('client_secret', process.env.KAKAO_SECURITY || process.env.KAKAO_CLIENT_SECRET);
  }

  const tokenResponse = await fetch('https://kauth.kakao.com/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
    },
    body: tokenParams.toString(),
  });

  if (!tokenResponse.ok) {
    throw appError('Failed to exchange Kakao authorization code.', 401);
  }

  const tokenResult = await tokenResponse.json();
  const profileResponse = await fetch('https://kapi.kakao.com/v2/user/me', {
    headers: {
      Authorization: `Bearer ${tokenResult.access_token}`,
      'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
    },
  });

  if (!profileResponse.ok) {
    throw appError('Failed to fetch Kakao profile.', 401);
  }

  const profile = await profileResponse.json();
  const kakaoId = String(profile.id);
  const kakaoEmail = String(profile.kakao_account?.email || `kakao_${kakaoId}@nomail.local`);
  const nickname = String(profile.properties?.nickname || profile.kakao_account?.profile?.nickname || 'kakao-user');
  const profileImage = String(profile.properties?.profile_image || '');

  let account = await findAuthAccountByProvider('kakao', kakaoId);
  let user = account ? await findUserById(account.userId) : await findUserByEmail(kakaoEmail);

  if (!user) {
    const now = new Date().toISOString();
    user = {
      userId: buildUserId(),
      userNo: await getNextUserNo(),
      email: kakaoEmail,
      nickname,
      profileImage,
      roles: ['user'],
      status: 'active',
      createdAt: now,
      updatedAt: now,
    };
    await createUser(user);
  }

  account = {
    userId: user.userId,
    userNo: user.userNo,
    provider: 'kakao',
    providerUserId: kakaoId,
    email: kakaoEmail,
    passwordHash: '',
    lastLoginAt: new Date().toISOString(),
    createdAt: account?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await upsertAuthAccountByProvider(account);
  await updateLastLogin(user.userId, 'kakao');

  return buildAuthResult({
    ...user,
    nickname: user.nickname || nickname,
    profileImage: user.profileImage || profileImage,
  });
}
