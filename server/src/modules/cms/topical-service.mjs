// BibleHub Topical(주제 사전) 조회.
//
// biblehub_topical 컬렉션은 biblehub.com/topical/* 를 수집해 둔 것으로 10만 건이 넘는다.
// 문서 한 건이 biblehub.com/topical/{char}/{name}.htm 한 페이지에 대응한다.
//
//   char        첫 글자 폴더            "g"
//   link        폴더+파일명             "g/god.htm"
//   title       주제명                  "God"
//   tid         고유 번호               27779
//   root        대표 주제 여부
//   contents    { 사전이름: [{ subject, content }] }
//   related     연관 주제 [{ title, link, key }]
//   subtopic    하위 주제 [{ title, link, key }]
//   concordance 용례
//
// link 에는 중복이 있어(예: l/laziness.htm 2건) 상세 조회는 tid 로 한다.
import { getMongoDb } from './mongo.mjs';

const COLLECTION = 'biblehub_topical';

// 목록에는 본문(contents)을 통째로 싣지 않고 개수만 계산해 보낸다.
// contents 는 { 사전이름: [...] } 객체라 $objectToArray 로 섹션 수를 센다.
const LIST_PROJECTION = {
  _id: 0,
  tid: 1,
  title: 1,
  link: 1,
  char: 1,
  root: 1,
  contentsCount: { $size: { $objectToArray: { $ifNull: ['$contents', {}] } } },
  subtopicCount: { $size: { $ifNull: ['$subtopic', []] } },
  relatedCount: { $size: { $ifNull: ['$related', []] } },
  concordanceCount: { $size: { $ifNull: ['$concordance', []] } },
};

export async function listTopical({ q = '', char = '', rootOnly = false, limit = 50, skip = 0 } = {}) {
  const db = await getMongoDb();
  const filter = {};

  if (char) filter.char = String(char).toLowerCase().slice(0, 1);
  if (rootOnly) filter.root = true;
  if (q) {
    // 정규식 특수문자를 그대로 넣으면 검색이 깨지므로 이스케이프한다.
    const escaped = String(q).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (escaped) {
      // 제목과 slug 를 함께 본다. slug 는 약 7만 건에만 있으므로,
      // 없는 문서는 제목으로만 걸린다. (예: "love" -> "A Time for Love" / "a_time_for_love")
      const rx = { $regex: escaped, $options: 'i' };
      filter.$or = [{ title: rx }, { slug: rx }];
    }
  }

  const [items, total] = await Promise.all([
    // $match -> $sort -> $skip -> $limit 를 먼저 걸어 개수 계산은 한 페이지에만 적용한다.
    db.collection(COLLECTION).aggregate([
      { $match: filter },
      { $sort: { title: 1 } },
      { $skip: Math.max(0, Number(skip) || 0) },
      { $limit: Math.min(200, Math.max(1, Number(limit) || 50)) },
      { $project: LIST_PROJECTION },
    ]).toArray(),
    db.collection(COLLECTION).countDocuments(filter),
  ]);

  return { items, total };
}

export async function getTopicalByTid(tid) {
  const n = Number(tid);
  if (!Number.isFinite(n)) return null;

  const db = await getMongoDb();
  const doc = await db.collection(COLLECTION).findOne({ tid: n }, { projection: { _id: 0 } });
  return doc || null;
}

// biblehub.com/topical/g/god.htm 형태로 들어온 요청을 위한 보조 조회.
// 중복이 있을 때는 대표 주제(root)를 우선한다.
export async function getTopicalByLink(link) {
  if (!link) return null;

  const db = await getMongoDb();
  const docs = await db.collection(COLLECTION)
    .find({ link: String(link) }, { projection: { _id: 0 } })
    .limit(5)
    .toArray();

  if (!docs.length) return null;
  return docs.find((d) => d.root) || docs[0];
}

// 첫 글자별 주제 수. 페이지의 A~Z 이동에 쓴다.
export async function listTopicalChars() {
  const db = await getMongoDb();
  const rows = await db.collection(COLLECTION).aggregate([
    // char 가 비어 있는 문서가 소수 있다. 빈 버튼이 생기지 않도록 제외한다.
    { $match: { char: { $type: 'string', $ne: '' } } },
    { $group: { _id: '$char', count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]).toArray();

  return rows.map((r) => ({ char: r._id, count: r.count }));
}
