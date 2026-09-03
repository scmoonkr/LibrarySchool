export type PaletteItem = {
  category: string;
  categories: string[];
  color: string;
  soft: string;
  description: string;
};

export const categoryPalette: PaletteItem[] = [
  {
    category: '가족',
    categories: ['가족', '우정'],
    color: '#CCCC00',
    soft: '#ffffba',
    description: '가족과 우정 속에서 관계가 이어지는 장면을 모읍니다.',
  },
  {
    category: '거짓',
    categories: ['거짓', '악행'],
    color: '#C0504D',
    soft: '#cab6a6',
    description: '거짓과 악행으로 흐름이 흔들리는 장면을 모읍니다.',
  },
  {
    category: '구원',
    categories: ['구원', '축복'],
    color: '#4F81BD',
    soft: '#cde3f7',
    description: '건지심과 회복, 다시 살리시는 은혜의 장면을 모읍니다.',
  },
  {
    category: '계명',
    categories: ['계명', '순종', '말씀'],
    color: '#9BBB59',
    soft: '#f5fcd1',
    description: '말씀을 받고 따르며 선택하는 순간을 모읍니다.',
  },
  {
    category: '모범',
    categories: ['모범', '증거'],
    color: '#FF99CC',
    soft: '#ffd8eb',
    description: '삶으로 드러나는 믿음과 증거의 장면을 모읍니다.',
  },
  {
    category: '범죄',
    categories: ['범죄', '위선'],
    color: '#3333FF',
    soft: '#babfc0',
    description: '죄와 위선으로 관계가 깨지는 장면을 모읍니다.',
  },
  {
    category: '사랑',
    categories: ['사랑', '친절'],
    color: '#008000',
    soft: '#d2e4bc',
    description: '하나님의 사랑과 사람을 향한 사랑의 장면을 모읍니다.',
  },
  {
    category: '삼위',
    categories: ['삼위', '임재'],
    color: '#8064A2',
    soft: '#B6A6CA',
    description: '하나님의 임재와 함께하심이 드러나는 순간을 모읍니다.',
  },
  {
    category: '서술',
    categories: ['서술', '역사'],
    color: '#8C8C8C',
    soft: '#EEEEEE',
    description: '흐름을 이해하도록 이어지는 이야기의 장면을 모읍니다.',
  },
  {
    category: '섬김',
    categories: ['섬김', '제자'],
    color: '#FF5050',
    soft: '#f5c0ab',
    description: '섬기고 따르며 살아가는 제자의 장면을 모읍니다.',
  },
  {
    category: '예언',
    categories: ['성약', '예언'],
    color: '#CC9900',
    soft: '#cfad71',
    description: '약속과 미래를 향한 하나님의 말씀을 모읍니다.',
  },
  {
    category: '신앙',
    categories: ['신앙', '회개', '믿음'],
    color: '#FF9966',
    soft: '#ffeac0',
    description: '믿고 돌아서며 다시 시작하는 순간을 모읍니다.',
  },
];

export function findPaletteItem(value?: string | null) {
  if (!value) return null;
  return categoryPalette.find((item) => item.category === value || item.categories.includes(value)) || null;
}
