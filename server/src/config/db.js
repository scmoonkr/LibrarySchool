import { MongoClient } from 'mongodb';
import { env } from './env.js';

let client;
let db;

async function ensureCoreIndexes(database) {
  await Promise.all([
    database.collection('users').createIndexes([
      { key: { userId: 1 }, name: 'users_userId' },
      { key: { userNo: 1 }, name: 'users_userNo' },
      { key: { email: 1 }, name: 'users_email' },
      { key: { nickname: 1 }, name: 'users_nickname' },
      // CMS 소셜 로그인 조회 (users 컬렉션을 CMS 와 공유한다)
      { key: { provider: 1, providerId: 1 }, name: 'users_provider_providerId' },
    ]),
    database.collection('auth_accounts').createIndexes([
      { key: { provider: 1, providerUserId: 1 }, name: 'auth_accounts_provider_user' },
      { key: { email: 1, provider: 1 }, name: 'auth_accounts_email_provider' },
      { key: { userId: 1 }, name: 'auth_accounts_userId' },
      { key: { userNo: 1 }, name: 'auth_accounts_userNo' },
    ]),
    database.collection('auth_refresh_tokens').createIndexes([
      { key: { tokenId: 1 }, name: 'auth_refresh_tokens_tokenId' },
      { key: { userId: 1 }, name: 'auth_refresh_tokens_userId' },
      { key: { userNo: 1 }, name: 'auth_refresh_tokens_userNo' },
    ]),
    database.collection('password_reset_tokens').createIndexes([
      { key: { tokenId: 1 }, name: 'password_reset_tokens_tokenId' },
      { key: { userId: 1 }, name: 'password_reset_tokens_userId' },
    ]),
    database.collection(env.mongoCollectionBibleEdit).createIndexes([
      { key: { bookNo: 1, chapterNo: 1, verseNo: 1 }, name: 'bible_edit_lookup' },
    ]),
    database.collection(env.mongoCollectionVerseTopics).createIndexes([
      { key: { mainCategory: 1, baseWeight: -1, score: -1, recentScore: -1 }, name: 'verse_topics_mainCategory' },
      { key: { verseId: 1 }, name: 'verse_topics_verseId' },
    ]),
    database.collection('reflections').createIndexes([
      { key: { userNo: 1, bookNo: 1, chapterNo: 1, verseRange: 1 }, name: 'reflections_unique_userNo' },
      { key: { bookNo: 1, chapterNo: 1, updatedAt: -1 }, name: 'reflections_recent_userNo' },
    ]),
    database.collection('reading_paints').createIndexes([
      { key: { userId: 1, bookNo: 1, chapterNo: 1 }, name: 'reading_paints_unique_user_chapter', unique: true },
    ]),
    // ── CMS (OneMinuteBible 에서 이식) ─────────────────────────────────────
    database.collection('contents').createIndexes([
      { key: { slug: 1 }, name: 'contents_slug' },
      { key: { contentType: 1, status: 1, publishedAt: -1 }, name: 'contents_type_status' },
      { key: { authorId: 1 }, name: 'contents_authorId' },
    ]),
    database.collection('contentRevisions').createIndexes([
      { key: { contentId: 1, createdAt: -1 }, name: 'contentRevisions_content' },
    ]),
    database.collection('categories').createIndexes([
      { key: { slug: 1 }, name: 'categories_slug' },
      { key: { parentId: 1 }, name: 'categories_parentId' },
    ]),
    database.collection('tags').createIndexes([
      { key: { slug: 1 }, name: 'tags_slug' },
    ]),
    database.collection('menus').createIndexes([
      { key: { location: 1 }, name: 'menus_location' },
    ]),
    // BibleHub Topical (10만 건). 목록 검색·상세 조회용.
    database.collection('biblehub_topical').createIndexes([
      { key: { tid: 1 }, name: 'biblehub_topical_tid' },
      { key: { link: 1 }, name: 'biblehub_topical_link' },
      { key: { char: 1, title: 1 }, name: 'biblehub_topical_char_title' },
    ]),
    database.collection('media').createIndexes([
      { key: { createdAt: -1 }, name: 'media_createdAt' },
      { key: { ownerId: 1 }, name: 'media_ownerId' },
    ]),
    database.collection('action_log').createIndexes([
      {
        key: { userNo: 1, actionType: 1, bookNo: 1, chapterNo: 1, verseNo: 1, mainCategory: 1, createdAt: -1 },
        name: 'action_log_recent_lookup',
      },
    ]),
  ]);
}

export async function connectToDatabase() {
  if (db) {
    return db;
  }
console.log("env.mongoDbName=", env.mongoDbName);
  client = new MongoClient(env.mongoUri);
  await client.connect();
  db = client.db(env.mongoDbName);
  await ensureCoreIndexes(db);
  return db;
}

export function getDatabase() {
  if (!db) {
    throw new Error('Database connection has not been initialized.');
  }

  return db;
}

export async function closeDatabase() {
  if (client) {
    await client.close();
    client = undefined;
    db = undefined;
  }
}

