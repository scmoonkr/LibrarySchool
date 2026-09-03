import { WEIGHT_CONFIG } from '../../config/weight.config.js';

export function calcWeight(item, mode = 'initial') {
  const weights = WEIGHT_CONFIG[mode] || WEIGHT_CONFIG.initial;

  return (
    Number(item.baseWeight || 0) * weights.baseWeight +
    Number(item.score || 0) * weights.score +
    Number(item.recentScore || 0) * weights.recentScore
  );
}

export function sortByWeight(items = [], mode = 'initial') {
  return [...items].sort((left, right) => {
    const weightDiff = calcWeight(right, mode) - calcWeight(left, mode);
    if (weightDiff !== 0) {
      return weightDiff;
    }

    if (left.isAnchor !== right.isAnchor) {
      return left.isAnchor ? -1 : 1;
    }

    return Number(left.bookNo || 0) - Number(right.bookNo || 0)
      || Number(left.chapterNo || 0) - Number(right.chapterNo || 0)
      || Number(left.verseNo || 0) - Number(right.verseNo || 0);
  });
}

export function weightedPick(items = [], count = 1, mode = 'initial') {
  const result = [];
  const pool = [...items];

  while (result.length < count && pool.length) {
    const total = pool.reduce((sum, item) => sum + Math.max(calcWeight(item, mode), 0), 0);

    if (total <= 0) {
      result.push(...shuffle(pool).slice(0, count - result.length));
      break;
    }

    let cursor = Math.random() * total;
    let selectedIndex = 0;

    for (let index = 0; index < pool.length; index += 1) {
      cursor -= Math.max(calcWeight(pool[index], mode), 0);
      if (cursor <= 0) {
        selectedIndex = index;
        break;
      }
    }

    result.push(pool[selectedIndex]);
    pool.splice(selectedIndex, 1);
  }

  return result;
}

export function shuffle(items = []) {
  const cloned = [...items];

  for (let index = cloned.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [cloned[index], cloned[randomIndex]] = [cloned[randomIndex], cloned[index]];
  }

  return cloned;
}
