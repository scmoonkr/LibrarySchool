// CMS 서비스들이 쓰는 DB 핸들.
//
// 원본(OneMinuteBible api-server)은 자체 MongoClient 를 열었지만, 여기서는
// 이 프로젝트가 이미 열어둔 커넥션(config/db.js)을 그대로 재사용한다.
// 따라서 CMS 컬렉션도 .env 의 MONGODB_DB(기본 LibrarySchool) 안에 들어간다.
import { getDatabase } from '../../config/db.js';

export async function getMongoDb() {
  return getDatabase();
}
