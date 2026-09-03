import { bibleBooks } from '~/data/bibleTable';

export type BibleExplorerBook = {
  book: string
  description: string
}

export type BibleExplorerGroup = {
  label: string
  description: string
  books: BibleExplorerBook[]
}

export type BibleExplorerTestament = {
  type: 'old' | 'new'
  label: string
  description: string
  groups: BibleExplorerGroup[]
}

export const bibleExplorer: BibleExplorerTestament[] = [
  {
    type: 'old',
    label: '구약',
    description: '시작과 약속, 역사와 기다림',
    groups: [
      {
        label: '모세오경',
        description: '하나님과 시작되는 이야기',
        books: [
          { book: '창세기', description: '시작과 창조의 이야기' },
          { book: '출애굽기', description: '구원과 해방의 이야기' },
          { book: '레위기', description: '거룩함과 예배의 기준' },
          { book: '민수기', description: '광야에서의 여정과 훈련' },
          { book: '신명기', description: '약속을 향한 준비와 선택' },
        ],
      },
      {
        label: '역사서',
        description: '약속의 땅과 반복되는 선택의 이야기',
        books: [
          { book: '여호수아', description: '약속의 땅으로 들어감' },
          { book: '사사기', description: '반복되는 실패와 회복' },
          { book: '룻기', description: '작은 믿음의 큰 이야기' },
          { book: '사무엘상', description: '왕이 시작되는 이야기' },
          { book: '사무엘하', description: '다윗과 하나님 관계' },
          { book: '열왕기상', description: '왕국의 번성과 분열' },
          { book: '열왕기하', description: '무너지는 왕국의 이야기' },
          { book: '역대상', description: '다시 보는 왕의 역사' },
          { book: '역대하', description: '성전 중심의 역사' },
          { book: '에스라', description: '돌아옴과 회복' },
          { book: '느헤미야', description: '무너진 것을 다시 세움' },
          { book: '에스더', description: '보이지 않는 섭리의 이야기' },
        ],
      },
      {
        label: '시가서',
        description: '삶 속에서 드러나는 감정과 지혜',
        books: [
          { book: '욥기', description: '고난 속 질문' },
          { book: '시편', description: '마음의 고백과 기도' },
          { book: '잠언', description: '삶의 지혜' },
          { book: '전도서', description: '삶의 의미를 묻다' },
          { book: '아가', description: '사랑의 이야기' },
        ],
      },
      {
        label: '예언서',
        description: '경고와 회복, 그리고 기다림',
        books: [
          { book: '이사야', description: '구원과 메시아의 약속' },
          { book: '예레미야', description: '무너짐 속 경고' },
          { book: '예레미야애가', description: '슬픔의 기록' },
          { book: '에스겔', description: '회복의 환상' },
          { book: '다니엘', description: '믿음과 미래의 이야기' },
          { book: '호세아', description: '사랑과 회복' },
          { book: '요엘', description: '회개의 부르심' },
          { book: '아모스', description: '정의에 대한 외침' },
          { book: '오바댜', description: '심판의 선언' },
          { book: '요나', description: '도망과 순종' },
          { book: '미가', description: '심판과 회복' },
          { book: '나훔', description: '하나님의 심판' },
          { book: '하박국', description: '질문과 믿음' },
          { book: '스바냐', description: '날의 경고' },
          { book: '학개', description: '다시 시작하라' },
          { book: '스가랴', description: '회복과 소망' },
          { book: '말라기', description: '마지막 외침' },
        ],
      },
    ],
  },
  {
    type: 'new',
    label: '신약',
    description: '예수와 복음, 그리고 삶의 변화',
    groups: [
      {
        label: '사복음서',
        description: '예수의 삶과 메시지',
        books: [
          { book: '마태복음', description: '왕으로 오신 예수' },
          { book: '마가복음', description: '행동하시는 예수' },
          { book: '누가복음', description: '사람과 함께하신 예수' },
          { book: '요한복음', description: '하나님의 아들 예수' },
        ],
      },
      {
        label: '역사서',
        description: '교회의 시작',
        books: [
          { book: '사도행전', description: '복음이 퍼져가는 이야기' },
        ],
      },
      {
        label: '서신서',
        description: '믿음의 삶을 설명하다',
        books: [
          { book: '로마서', description: '복음의 핵심' },
          { book: '고린도전서', description: '교회 문제와 해결' },
          { book: '고린도후서', description: '회복과 위로' },
          { book: '갈라디아서', description: '자유의 복음' },
          { book: '에베소서', description: '교회의 정체성' },
          { book: '빌립보서', description: '기쁨의 삶' },
          { book: '골로새서', description: '그리스도의 중심성' },
          { book: '데살로니가전서', description: '기다림의 삶' },
          { book: '데살로니가후서', description: '끝에 대한 이해' },
          { book: '디모데전서', description: '교회와 리더' },
          { book: '디모데후서', description: '끝까지 믿음' },
          { book: '디도서', description: '삶의 질서' },
          { book: '빌레몬서', description: '용서와 관계' },
          { book: '히브리서', description: '예수의 완성' },
          { book: '야고보서', description: '행동하는 믿음' },
          { book: '베드로전서', description: '고난 속 믿음' },
          { book: '베드로후서', description: '진리의 경고' },
          { book: '요한일서', description: '사랑과 진리' },
          { book: '요한이서', description: '진리 안의 삶' },
          { book: '요한삼서', description: '환대와 공동체' },
          { book: '유다서', description: '믿음을 지켜라' },
        ],
      },
      {
        label: '예언서',
        description: '마지막과 새 시작',
        books: [
          { book: '요한계시록', description: '마침과 새로운 시작' },
        ],
      },
    ],
  },
];

export function findBibleBookMeta(bookName: string) {
  return bibleBooks.find((item) => item.church === bookName) || null;
}
