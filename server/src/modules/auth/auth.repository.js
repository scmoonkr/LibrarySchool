import { getDatabase } from '../../config/db.js';

const USERS_COLLECTION = 'users';
const AUTH_ACCOUNTS_COLLECTION = 'auth_accounts';
const REFRESH_TOKENS_COLLECTION = 'auth_refresh_tokens';
const PASSWORD_RESET_TOKENS_COLLECTION = 'password_reset_tokens';

export async function findUserByEmail(email) {
  const database = getDatabase();

  return database.collection(USERS_COLLECTION).findOne(
    { email },
    { projection: { _id: 0 } },
  );
}

export async function findUserByNickname(nickname) {
  const database = getDatabase();

  return database.collection(USERS_COLLECTION).findOne(
    { nickname },
    { projection: { _id: 0 } },
  );
}

export async function findUserById(userId) {
  const database = getDatabase();

  return database.collection(USERS_COLLECTION).findOne(
    { userId },
    { projection: { _id: 0 } },
  );
}

export async function getNextUserNo() {
  const database = getDatabase();
  const latestUser = await database.collection(USERS_COLLECTION).find(
    {},
    {
      sort: { userNo: -1 },
      projection: { _id: 0, userNo: 1 },
      limit: 1,
    },
  ).next();

  return Number(latestUser?.userNo || 0) + 1;
}

export async function findAuthAccountByEmail(email) {
  const database = getDatabase();

  return database.collection(AUTH_ACCOUNTS_COLLECTION).findOne(
    { email, provider: 'local' },
    { projection: { _id: 0 } },
  );
}

export async function findAuthAccountByProvider(provider, providerUserId) {
  const database = getDatabase();

  return database.collection(AUTH_ACCOUNTS_COLLECTION).findOne(
    { provider, providerUserId },
    { projection: { _id: 0 } },
  );
}

export async function createUser(user) {
  const database = getDatabase();
  await database.collection(USERS_COLLECTION).insertOne(user);
  return user;
}

export async function createAuthAccount(account) {
  const database = getDatabase();
  await database.collection(AUTH_ACCOUNTS_COLLECTION).insertOne(account);
  return account;
}

export async function upsertAuthAccountByProvider(account) {
  const database = getDatabase();
  await database.collection(AUTH_ACCOUNTS_COLLECTION).updateOne(
    {
      provider: account.provider,
      providerUserId: account.providerUserId,
    },
    {
      $set: account,
    },
    {
      upsert: true,
    },
  );

  return account;
}

export async function updateAuthPassword(userId, passwordHash) {
  const database = getDatabase();
  await database.collection(AUTH_ACCOUNTS_COLLECTION).updateOne(
    { userId, provider: 'local' },
    {
      $set: {
        passwordHash,
        updatedAt: new Date().toISOString(),
      },
    },
  );
}

export async function updateLastLogin(userId, provider = 'local') {
  const database = getDatabase();
  await database.collection(AUTH_ACCOUNTS_COLLECTION).updateOne(
    { userId, provider },
    {
      $set: {
        lastLoginAt: new Date().toISOString(),
      },
    },
  );
}

export async function saveRefreshToken(session) {
  const database = getDatabase();
  await database.collection(REFRESH_TOKENS_COLLECTION).updateOne(
    { tokenId: session.tokenId },
    {
      $set: session,
    },
    { upsert: true },
  );
  return session;
}

export async function findRefreshToken(tokenId) {
  const database = getDatabase();
  return database.collection(REFRESH_TOKENS_COLLECTION).findOne(
    { tokenId },
    { projection: { _id: 0 } },
  );
}

export async function revokeRefreshToken(tokenId) {
  const database = getDatabase();
  await database.collection(REFRESH_TOKENS_COLLECTION).updateOne(
    { tokenId },
    {
      $set: {
        revokedAt: new Date().toISOString(),
      },
    },
  );
}

export async function savePasswordResetToken(record) {
  const database = getDatabase();
  await database.collection(PASSWORD_RESET_TOKENS_COLLECTION).updateOne(
    { tokenId: record.tokenId },
    {
      $set: record,
    },
    { upsert: true },
  );

  return record;
}

export async function findPasswordResetToken(tokenId) {
  const database = getDatabase();
  return database.collection(PASSWORD_RESET_TOKENS_COLLECTION).findOne(
    { tokenId },
    { projection: { _id: 0 } },
  );
}

export async function markPasswordResetTokenUsed(tokenId) {
  const database = getDatabase();
  await database.collection(PASSWORD_RESET_TOKENS_COLLECTION).updateOne(
    { tokenId },
    {
      $set: {
        usedAt: new Date().toISOString(),
      },
    },
  );
}
