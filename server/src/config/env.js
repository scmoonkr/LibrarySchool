import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootEnvPath = path.resolve(__dirname, '../../../.env');

dotenv.config({ path: rootEnvPath });


const port = Number(process.env.PORT || process.env.APP_PORT || 8800);
const mongoHost = process.env.MONGODB_ADDR || '127.0.0.1:27017';
const mongoDbName = process.env.MONGODB_DB || 'LibrarySchool';
const mongoCollectionBibleEdit =
  process.env.MONGODB_COLLECTION_BIBLE_EDIT || 'Bibles';
const mongoCollectionVerseTopics =
  process.env.MONGODB_COLLECTION_VERSE_TOPICS || 'verse_topics';

// 외부 도서 DB(Reading.books) — 주문도서 검색용. 같은 MongoDB 서버의 다른 DB.
const readingDbName = process.env.MONGODB_READING || 'Reading';
const booksCollection = process.env.MONGODB_COLLECTION_BOOKS || 'books';

// Dreamer 연동 DB(Dreamer.cybOrder) — 정가조회 결과 전송용.
const dreamerDbName = process.env.MONGODB_DREAMER || 'Dreamer';
const cybOrderCollection = process.env.MONGODB_COLLECTION_CYBORDER || 'cybOrder';

const mongoUsername = process.env.MONGO_USERNAME || '';
const mongoPassword = process.env.MONGO_PWD || '';
const mongoAuthSource = process.env.MONGODB_AUTH_SOURCE || '';
const mongoDirectConnection = process.env.MONGODB_DIRECT_CONNECTION || '';
const encodedUsername = encodeURIComponent(mongoUsername);
const encodedPassword = encodeURIComponent(mongoPassword);
const mongoAuthPart =
  encodedUsername && encodedPassword ? `${encodedUsername}:${encodedPassword}@` : '';

const mongoParams = new URLSearchParams();

if (mongoAuthSource) {
  mongoParams.set('authSource', mongoAuthSource);
}

if (mongoDirectConnection) {
  mongoParams.set('directConnection', mongoDirectConnection);
}

const mongoQueryString = mongoParams.toString();
const mongoUri =
  process.env.MONGODB_URI ||
  `mongodb://${mongoAuthPart}${mongoHost}/${mongoDbName}${
    mongoQueryString ? `?${mongoQueryString}` : ''
  }`;

// 도서 상세 크롤러(CrawlingBooks) 프로젝트 경로. 주문도서 drawer 의 "crawling" 버튼이
// 이 디렉터리에서 `node src/index.js detailByItemid <itemId>` 를 실행한다.
// 기본값은 형제 폴더(…/Contents/CrawlingBooks). 배포 환경에서는 CRAWLINGBOOKS_DIR 로 덮어쓴다.
const crawlingBooksDir =
  process.env.CRAWLINGBOOKS_DIR || path.resolve(__dirname, '../../../../CrawlingBooks');

const jwtAccessSecret = process.env.JWT_ACCESS_SECRET || 'dev-access-secret';
const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret';
const kakaoClientId = process.env.KAKAO_ID || process.env.KAKAO_CLIENT_ID || '';
const kakaoRedirectUri =
  process.env.KAKAO_REDIRECT_URI || 'http://localhost:3000/auth/kakao/callback';

export const env = {
  port,
  mongoUri,
  mongoDbName,
  readingDbName,
  booksCollection,
  dreamerDbName,
  cybOrderCollection,
  crawlingBooksDir,
  mongoCollectionBibleEdit,
  mongoCollectionVerseTopics,
  jwtAccessSecret,
  jwtRefreshSecret,
  kakaoClientId,
  kakaoRedirectUri,
};

