import {
  clearReadingPaints,
  getReadingPaints,
  saveReadingPaint,
} from './reading.service.js';

export async function listPaints(req, res, next) {
  try {
    const items = await getReadingPaints(req.query);

    return res.json({
      ok: true,
      data: items,
    });
  } catch (error) {
    return next(error);
  }
}

export async function createPaint(req, res, next) {
  try {
    const saved = await saveReadingPaint(req.body);

    return res.status(201).json({
      ok: true,
      data: saved,
    });
  } catch (error) {
    return next(error);
  }
}

export async function removePaints(req, res, next) {
  try {
    const result = await clearReadingPaints(req.query);

    return res.json({
      ok: true,
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}
