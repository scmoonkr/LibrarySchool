import { buildContentsDoc, getContentsCidByIsbns, insertContents, sendToDreamer } from './dreamer.service.js';

// POST /api/orderm/dreamer  { orderNo, dreamerOrderNo?, rows: [...] }
export async function pushDreamer(req, res, next) {
  try {
    const result = await sendToDreamer(req.body || {});
    return res.status(201).json({ ok: true, data: result });
  } catch (error) {
    return next(error);
  }
}

// POST /api/orderm/dreamer/contents-cid  { isbns: [...] } → { [isbn]: cid }
export async function contentsCid(req, res, next) {
  try {
    const data = await getContentsCidByIsbns(req.body?.isbns);
    return res.json({ ok: true, data });
  } catch (error) {
    return next(error);
  }
}

// POST /api/orderm/dreamer/contents-preview  { isbn } → Dreamer.contents 등록용 문서(미리보기)
export async function contentsPreview(req, res, next) {
  try {
    const data = await buildContentsDoc(req.body?.isbn);
    return res.json({ ok: true, data });
  } catch (error) {
    return next(error);
  }
}

// POST /api/orderm/dreamer/contents  { isbn } → Dreamer.contents 에 신규 등록(중복이면 409)
export async function createContents(req, res, next) {
  try {
    const data = await insertContents(req.body?.isbn);
    return res.status(201).json({ ok: true, data });
  } catch (error) {
    return next(error);
  }
}
