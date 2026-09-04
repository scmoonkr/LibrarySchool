import { sendToDreamer } from './dreamer.service.js';

// POST /api/orderm/dreamer  { orderNo, rows: [...] }
export async function pushDreamer(req, res, next) {
  try {
    const result = await sendToDreamer(req.body || {});
    return res.status(201).json({ ok: true, data: result });
  } catch (error) {
    return next(error);
  }
}
