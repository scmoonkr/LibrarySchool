// 성경 앱 로그인(JWT)을 CMS 세션으로 이어주는 Express 미들웨어.
//
// 원래 CMS 는 자체 소셜 로그인으로 'cms_session' 서명 쿠키를 발급했지만,
// 이 프로젝트에서는 사용자 시스템을 하나로 쓴다. 그래서 성경 앱이 발급한
// access token 을 검증해 users 문서를 찾고, CMS 가 기대하는 세션 모양으로
// req.cmsSession 에 붙여준다. (auth-session.mjs 의 getAuthSession 이 이걸 읽는다)
//
// 토큰은 두 경로 모두 받는다.
//   - Authorization: Bearer <token>   (성경 앱 페이지들이 쓰는 방식)
//   - omb-access-token 쿠키           (백엔드/콘텐츠 페이지가 credentials:'include' 로 보냄)
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';
import { env } from '../../config/env.js';
import { getDatabase } from '../../config/db.js';
import { CMS_USERS_COLLECTION } from './config.mjs';

const ACCESS_TOKEN_COOKIE = 'omb-access-token';

function readToken(req) {
  const authorization = req.headers.authorization || '';
  const [scheme, headerToken] = authorization.split(' ');
  if (scheme === 'Bearer' && headerToken) {
    return headerToken;
  }

  const cookieHeader = req.headers.cookie || '';
  for (const part of cookieHeader.split(';')) {
    const index = part.indexOf('=');
    if (index === -1) continue;
    if (part.slice(0, index).trim() !== ACCESS_TOKEN_COOKIE) continue;
    return decodeURIComponent(part.slice(index + 1).trim());
  }

  return '';
}

// JWT 페이로드에는 _id 가 없고 userId/userNo 만 있으므로 users 에서 다시 찾는다.
async function findUser(payload) {
  const users = getDatabase().collection(CMS_USERS_COLLECTION);

  if (payload.userId) {
    const byUserId = await users.findOne({ userId: payload.userId });
    if (byUserId) return byUserId;
  }

  if (payload.userNo !== undefined && payload.userNo !== null) {
    const byUserNo = await users.findOne({ userNo: payload.userNo });
    if (byUserNo) return byUserNo;
  }

  if (payload.sub && ObjectId.isValid(payload.sub)) {
    return users.findOne({ _id: new ObjectId(payload.sub) });
  }

  return null;
}

export async function attachCmsSession(req, res, next) {
  const token = readToken(req);
  if (!token) {
    return next();
  }

  let payload;
  try {
    payload = jwt.verify(token, env.jwtAccessSecret);
  } catch {
    // 만료/위조 토큰은 그냥 비로그인으로 취급한다.
    return next();
  }

  try {
    const user = await findUser(payload);
    if (user && user.isDeleted !== true) {
      req.cmsSession = {
        id: String(user._id),
        provider: user.provider || 'omb',
        providerId: user.providerId || user.userId || String(user.userNo ?? ''),
        name: user.name || user.nickname || '',
        email: user.email || null,
        avatarUrl: user.avatarUrl || user.profileImage || '',
      };
    }
  } catch (error) {
    console.error('[cms] 세션 브리지 실패:', error);
  }

  return next();
}
