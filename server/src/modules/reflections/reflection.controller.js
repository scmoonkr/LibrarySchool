import { getReflections, handleViewReflection, saveReflection } from './reflection.service.js';

export async function listReflectionItems(req, res, next) {
  try {
    const items = await getReflections(req.query);

    return res.json({
      ok: true,
      data: items,
    });
  } catch (error) {
    return next(error);
  }
}

export async function createReflection(req, res, next) {
  try {
    const saved = await saveReflection(req.body);

    return res.status(201).json({
      ok: true,
      data: saved,
    });
  } catch (error) {
    return next(error);
  }
}

export async function viewReflection(req, res, next) {
  try {
    const result = await handleViewReflection({
      rid: req.params.rid,
      userNo: req.body?.userNo,
    });

    return res.json({
      ok: true,
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}
