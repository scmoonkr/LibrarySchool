// 사이트 공용 메뉴. 헤더(AppHeader)와 푸터(AppFooter)가 같은 목록을 쓴다.
// 한쪽만 고쳐서 어긋나는 일이 없도록 여기 한 곳에서만 정의한다.
export type SiteMenu = {
  label: string;
  to: string;
  /** 하위 메뉴. 있으면 헤더에서 드롭다운으로 펼쳐진다. */
  children?: SiteMenu[];
};

export function useSiteMenus() {
  const mainMenus: SiteMenu[] = [
    { label: '말씀으로', to: '/read' },
    { label: '말씀 더보기', to: '',
      children: [
        { label: '말씀 펼쳐보기', to: '/bible' },
        { label: '주제별 보기', to: '/topics' },
        { label: '돌아보기', to: '/review' },
      ]
     },
    { label: '성경이야기', to: '',
      children: [
        { label: '인물이야기', to: '/categories/인물이야기' },
        { label: '사건이야기', to: '/categories/사건이야기' },
        { label: '지명이야기', to: '/categories/지명이야기' },
        { label: '성경이야기', to: '/categories/성경이야기' },
      ]
     },
    { label: '커뮤니티', to: '',
      children: [
        { label: '공지사항', to: '/categories/notice' },
        { label: 'News', to: '/categories/news' },
        { label: '이벤트', to: '/categories/events' },
      ]
     },
  ];

  return { mainMenus };
}
