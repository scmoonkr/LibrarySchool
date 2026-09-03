export type BibleVerse = {
  verse: string;
  verseNo: number;
  category?: string;
  categoryOriginal?: string;
  say?: boolean;
  godSay?: boolean;
};

export type BibleParagraph = {
  paragraphNo: number;
  verseNo: number;
  startVerse: number;
  endVerse: number;
  subject: string;
  title: string;
  summary: string;
  excerpt?: string;
  verses: BibleVerse[];
};

export type BibleChapter = {
  book: string;
  bookNo: number;
  chapterNo: number;
  title?: string;
  subject: string;
  excerpt: string;
  audio?: string;
  paragraphs: BibleParagraph[];
};

export type BibleReadResponse = {
  ok: boolean;
  count: number;
  data: BibleChapter;
};

export type BibleChapterSummary = {
  bookNo: number;
  chapterNo: number;
  subject: string;
};

export type TopicVerseItem = {
  verseId: string;
  bookNo: number;
  chapterNo: number;
  verseNo: number;
  book: string;
  text: string;
  mainCategory: string;
  subCategories: string[];
  baseWeight: number;
  score: number;
  recentScore: number;
  isAnchor: boolean;
  finalWeight?: number;
  readTarget?: {
    bookNo: number;
    chapterNo: number;
  };
};

export type SelectedVerseItem = {
  verseNo: number;
  category: string;
  verse: string;
  godSay?: boolean;
};

export type ReadingPaint = {
  userId: string;
  bookNo: number;
  chapterNo: number;
  verseRange: string;
  verseIDs: SelectedVerseItem[];
  updatedAt: string;
};

export type ReflectionItem = {
  rid?: string;
  userNo: number;
  nickname?: string;
  bookNo: number;
  chapterNo: number;
  paragraphNo: number;
  mainVerseNo?: number;
  verseRange: string;
  verseIDs: SelectedVerseItem[];
  text: string;
  updatedAt: string;
  createdAt: string;
  mine?: boolean;
};

type ReadChapterParams = {
  bookNo: number;
  chapterNo: number;
};

// 장별 인물·장소·사건에 연결된 "글". 서버가 biblehub 항목의 slug 와
// contents.biblehubSlug 를 맞춰 공개된 글만 추려서 내려준다.
export type BiblehubRef = {
  title: string;
  /** 연결된 글이 있을 때만 있다. 없으면 biblehub 항목 제목만 표시한다. */
  slug?: string;
};

export type BiblehubChapter = {
  bookNo: number | null;
  chapterNo: number | null;
  people: BiblehubRef[];
  place: BiblehubRef[];
  events: BiblehubRef[];
};

export function useBible() {
  const config = useRuntimeConfig();

  async function readChapter(params: ReadChapterParams) {
    return await $fetch<BibleReadResponse>(`${config.public.apiBase}/api/bible/read`, {
      query: params,
    });
  }

  async function listBookChapters(query: { bookNo: number }) {
    return await $fetch<{ ok: boolean; data: BibleChapterSummary[] }>(
      `${config.public.apiBase}/api/bible/chapters`,
      { query },
    );
  }

  // biblehub 장별 부가정보. 아직 수집되지 않은 장은 빈 배열로 돌아온다.
  async function readBiblehubChapter(query: { bookNo: number; chapterNo: number }) {
    return await $fetch<{ ok: boolean; data: BiblehubChapter }>(
      `${config.public.apiBase}/api/bible/biblehub`,
      { query },
    );
  }

  async function listTopicVerses(query: {
    category: string;
    mode?: 'initial' | 'more' | 'all';
    shownIds?: string[];
  }) {
    return await $fetch<{ ok: boolean; data: TopicVerseItem[] }>(
      `${config.public.apiBase}/api/bible/topics`,
      { query },
    );
  }

  async function recordTopicVerseAction(body: {
    userNo: number;
    verseId: string;
    bookNo: number;
    chapterNo: number;
    verseNo: number;
    mainCategory: string;
    actionType: 'read' | 'view_reflection' | 'write_reflection';
  }) {
    return await $fetch<{ ok: boolean; data: { ok: boolean; skipped?: boolean } }>(
      `${config.public.apiBase}/api/bible/topics/action`,
      {
        method: 'POST',
        body,
      },
    );
  }

  async function listReflections(query: {
    userNo?: number;
    bookNo?: number;
    chapterNo?: number;
    verseNo?: number;
    paragraphNo?: number;
    mine?: boolean;
  }) {
    return await $fetch<{ ok: boolean; data: ReflectionItem[] }>(
      `${config.public.apiBase}/api/reflections`,
      { query },
    );
  }

  async function viewReflection(body: { rid: string; userNo?: number }) {
    return await $fetch<{ ok: boolean; data: { skipped?: boolean; updated?: boolean; verseId?: string; reflection?: ReflectionItem } }>(
      `${config.public.apiBase}/api/reflections/${body.rid}/view`,
      {
        method: 'POST',
        body: {
          userNo: body.userNo,
        },
      },
    );
  }

  async function saveReflection(body: ReflectionItem) {
    return await $fetch<{ ok: boolean; data: ReflectionItem }>(
      `${config.public.apiBase}/api/reflections`,
      {
        method: 'POST',
        body,
      },
    );
  }

  async function listReadingPaints(query: { userId: string; bookNo: number; chapterNo: number }) {
    return await $fetch<{ ok: boolean; data: ReadingPaint[] }>(
      `${config.public.apiBase}/api/reading`,
      { query },
    );
  }

  async function saveReadingPaint(body: {
    userId: string;
    bookNo: number;
    chapterNo: number;
    verseRange: string;
    verseIDs: SelectedVerseItem[];
  }) {
    return await $fetch<{ ok: boolean; data: ReadingPaint }>(
      `${config.public.apiBase}/api/reading`,
      {
        method: 'POST',
        body,
      },
    );
  }

  async function clearReadingPaints(query: { userId: string; bookNo: number; chapterNo: number }) {
    return await $fetch<{ ok: boolean; data: { deletedCount: number } }>(
      `${config.public.apiBase}/api/reading`,
      {
        method: 'DELETE',
        query,
      },
    );
  }

  return {
    readChapter,
    listBookChapters,
    readBiblehubChapter,
    listTopicVerses,
    recordTopicVerseAction,
    listReflections,
    viewReflection,
    saveReflection,
    listReadingPaints,
    saveReadingPaint,
    clearReadingPaints,
  };
}
