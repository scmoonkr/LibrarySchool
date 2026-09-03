import {
  getBiblehubChapter, getBibleChapter, listBibleChapters, listTopicVerses, recordTopicVerseAction } from './bible.service.js';

export async function readChapter(req, res, next) {
  try {
    const { chapter, rows } = await getBibleChapter(req.query);

    if (!chapter) {
      return res.status(404).json({
        ok: false,
        message: 'Chapter not found.',
      });
    }

    return res.json({
      ok: true,
      count: rows.length,
      data: chapter,
    });
  } catch (error) {
    return next(error);
  }
}


export async function readBookChapters(req, res, next) {
  try {
    const chapters = await listBibleChapters(req.query);

    return res.json({
      ok: true,
      count: chapters.length,
      data: chapters,
    });
  } catch (error) {
    return next(error);
  }
}

export async function readTopicVerses(req, res, next) {
  try {
    const verses = await listTopicVerses(req.query);

    return res.json({
      ok: true,
      count: verses.length,
      data: verses,
    });
  } catch (error) {
    return next(error);
  }
}

export async function updateTopicVerseAction(req, res, next) {
  try {
    const result = await recordTopicVerseAction(req.body);

    return res.json({
      ok: true,
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

export async function readBiblehubChapter(req, res, next) {
  try {
    return res.json({ ok: true, data: await getBiblehubChapter(req.query) });
  } catch (error) {
    return next(error);
  }
}
