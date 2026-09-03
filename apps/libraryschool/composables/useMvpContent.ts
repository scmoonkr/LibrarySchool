export type MvpTheme = {
  category: string;
  label: string;
  description: string;
  color: string;
  soft: string;
};

export type MvpChapter = {
  chapterNo: number;
  title: string;
  focus: string;
};

export const mvpThemes: MvpTheme[] = [
  { category: 'family', label: 'Family', description: 'Relationships, belonging, and entrusted life.', color: '#d3b94f', soft: '#fff6c8' },
  { category: 'evil', label: 'Evil', description: 'Where order breaks and resistance appears.', color: '#c85b4c', soft: '#f7d4cf' },
  { category: 'salvation', label: 'Salvation', description: 'Rescue, restoration, and renewed life.', color: '#4f81bd', soft: '#d7e8fa' },
  { category: 'command', label: 'Command', description: 'Moments where God speaks direction clearly.', color: '#7f9f46', soft: '#e8f2cf' },
  { category: 'mission', label: 'Mission', description: 'Calling, responsibility, and sending.', color: '#d07ab8', soft: '#f6d9ef' },
  { category: 'sin', label: 'Sin', description: 'Choices that bend away from what is right.', color: '#4e5c7a', soft: '#d7deea' },
  { category: 'love', label: 'Love', description: 'Care, connection, and faithful presence.', color: '#358d55', soft: '#d8f0df' },
  { category: 'god', label: 'God', description: 'Identity, authority, and character of God.', color: '#7d63a8', soft: '#e5dbf5' },
  { category: 'history', label: 'History', description: 'What happens in time and should be remembered.', color: '#8f8f8f', soft: '#ececec' },
  { category: 'discipleship', label: 'Disciple', description: 'Learning, following, and formation.', color: '#df6d55', soft: '#f8ded7' },
  { category: 'prophecy', label: 'Prophecy', description: 'Promise, warning, and future-facing words.', color: '#c79a1f', soft: '#f6e7bf' },
  { category: 'faith', label: 'Faith', description: 'Trusting and responding beyond what is visible.', color: '#f08a4b', soft: '#fde1c9' },
];

export const mvpGenesisChapters: MvpChapter[] = [
  { chapterNo: 1, title: 'Order and beginning', focus: 'Read how order is spoken into being.' },
  { chapterNo: 2, title: 'Relationship and trust', focus: 'Notice people, Eden, and entrusted responsibility.' },
  { chapterNo: 3, title: 'Choice and fracture', focus: 'Follow temptation, response, and relational damage.' },
];

export const workbookSteps = [
  'Read the passage slowly and pick the first section that catches your attention.',
  'Choose one of the twelve themes and underline or color it.',
  'Write one short reflection about why that theme stood out.',
  'Compare it with the review page and notice your reading pattern.',
];

export const sharingGuide = [
  'Sharing is not a final answer. It is a short record of what you saw.',
  'The app prepares copy text, but the user posts it manually.',
  'Start by collecting one-line reflections from Genesis 1.',
];
