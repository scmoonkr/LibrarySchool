import {
  deleteReadingPaints,
  listReadingPaints,
  upsertReadingPaint,
} from './reading.repository.js';
import {
  normalizeSelectedVerseItems,
  parsePositiveInteger,
  requireTrimmedString,
} from '../../utils/validation.js';

function parseReadingQuery(params = {}) {
  return {
    userId: requireTrimmedString(params.userId, 'userId'),
    bookNo: parsePositiveInteger(params.bookNo, 'bookNo'),
    chapterNo: parsePositiveInteger(params.chapterNo, 'chapterNo'),
  };
}

export async function getReadingPaints(params = {}) {
  const query = parseReadingQuery(params);
  return listReadingPaints(query);
}

export async function saveReadingPaint(body = {}) {
  const now = new Date().toISOString();
  const document = {
    userId: requireTrimmedString(body.userId, 'userId'),
    bookNo: parsePositiveInteger(body.bookNo, 'bookNo'),
    chapterNo: parsePositiveInteger(body.chapterNo, 'chapterNo'),
    verseRange: requireTrimmedString(body.verseRange, 'verseRange'),
    verseIDs: normalizeSelectedVerseItems(body.verseIDs),
    updatedAt: now,
  };

  return upsertReadingPaint(document);
}

export async function clearReadingPaints(params = {}) {
  const query = parseReadingQuery(params);
  return deleteReadingPaints(query);
}
