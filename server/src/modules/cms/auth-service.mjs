import { CMS_USERS_COLLECTION } from './config.mjs'
import { getMongoDb } from './mongo.mjs'
import { ObjectId } from 'mongodb'

// 사용자 시스템을 통합하면서 두 가지 roles 형식이 공존한다.
//   성경 앱: ['user', 'admin']        CMS: [{ role: 'admin' }]
// CMS 쪽 권한 판정(middleware.mjs)은 {role} 형태를 기대하므로 여기서 맞춘다.
// 성경 앱의 'user' 는 CMS 의 최소 등급 'member' 에 대응시킨다.
const BIBLE_ROLE_ALIASES = { user: 'member' }

export function normalizeRoles(roles) {
  if (!Array.isArray(roles)) return []
  return roles
    .map((entry) => {
      const name = typeof entry === 'string' ? entry : entry?.role
      if (!name) return null
      return { role: BIBLE_ROLE_ALIASES[name] || name }
    })
    .filter(Boolean)
}

function toPublicUser(user) {
  if (!user) {
    return null
  }

  return {
    id: String(user._id),
    provider: user.provider,
    providerId: user.providerId,
    name: user.name,
    nickname: user.nickname,
    email: user.email,
    avatarUrl: user.avatarUrl,
    gender: user.gender,
    dob: user.dob,
    status: user.status,
    roles: normalizeRoles(user.roles),
  }
}

export async function getUserById(userId) {
  if (!ObjectId.isValid(userId)) {
    return null
  }

  const db = await getMongoDb()
  const user = await db.collection(CMS_USERS_COLLECTION).findOne({
    _id: new ObjectId(userId),
    isDeleted: { $ne: true },
  })

  return toPublicUser(user)
}

export async function listUsers({ limit = 100 } = {}) {
  const db = await getMongoDb()
  const users = await db.collection(CMS_USERS_COLLECTION)
    .find({ isDeleted: { $ne: true } })
    .sort({ updatedAt: -1, createdAt: -1 })
    .limit(limit)
    .toArray()

  return users.map(toPublicUser)
}

export async function updateUserProfile(userId, input) {
  if (!ObjectId.isValid(userId)) {
    return null
  }

  const db = await getMongoDb()
  const now = new Date()
  const setFields = {
    name: input.name,
    nickname: input.nickname || null,
    gender: input.gender || null,
    updatedAt: now,
  }

  if ('status' in input) {
    setFields.status = input.status || 'pending'
  }

  if ('dob' in input) {
    setFields.dob = input.dob || null
  }

  if ('avatarUrl' in input) {
    setFields.avatarUrl = input.avatarUrl || null
  }

  const user = await db.collection(CMS_USERS_COLLECTION).findOneAndUpdate(
    {
      _id: new ObjectId(userId),
      isDeleted: { $ne: true },
    },
    { $set: setFields },
    { returnDocument: 'after' },
  )

  return toPublicUser(user)
}

// Set a user's role (single-role model: roles = [{ role }]). Admin-gated by caller.
export async function setUserRole(userId, role) {
  if (!ObjectId.isValid(userId)) {
    return null
  }

  const db = await getMongoDb()
  const user = await db.collection(CMS_USERS_COLLECTION).findOneAndUpdate(
    { _id: new ObjectId(userId), isDeleted: { $ne: true } },
    { $set: { roles: [{ role }], updatedAt: new Date() } },
    { returnDocument: 'after' },
  )

  return toPublicUser(user)
}

export async function deleteUserById(userId) {
  if (!ObjectId.isValid(userId)) {
    return false
  }

  const db = await getMongoDb()
  const now = new Date()
  const result = await db.collection(CMS_USERS_COLLECTION).updateOne(
    {
      _id: new ObjectId(userId),
      isDeleted: { $ne: true },
    },
    {
      $set: {
        isDeleted: true,
        deletedAt: now,
        updatedAt: now,
      },
    },
  )

  return result.modifiedCount > 0
}
