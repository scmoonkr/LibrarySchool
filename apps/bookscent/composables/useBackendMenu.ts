// 백엔드(관리자) 화면의 상단 네비게이션 / 좌측 사이드바 메뉴 정의.
// 상단 navItems 는 프론트 사이트(AppHeader.vue)의 mainMenus 와 맞춰 둔다.
export function useBackendMenu() {
  const navItems = [
    { label: 'Home', to: '/' },
    { label: '말씀으로', to: '/read' },
    { label: '말씀 펼쳐보기', to: '/bible' },
    { label: '주제별 보기', to: '/topics' },
    { label: '돌아보기', to: '/review' },
    { label: 'Backend', to: '/backend', current: true },
  ];

  const menuItems = [
    { key: 'posts', label: 'Posts', to: '/backend/posts' },
    { key: 'pages', label: 'Pages', to: '/backend/pages' },
    { key: 'categories', label: 'Categories', to: '/backend/categories' },
    { key: 'menus', label: 'Menus', to: '/backend/menus' },
    { key: 'media', label: 'Media', to: '/backend/media' },
    { key: 'users', label: 'Users', to: '/backend/users' },
    { key: 'theme', label: 'Theme', to: '/backend/theme' },
    { key: 'topical', label: 'BibleHub Topical', to: '/backend/topical' },
    { key: 'foundation', label: 'Foundation', to: '/backend/foundation' },
    { key: 'analysis', label: 'Insurance Analysis', to: '/backend/analysis' },
  ];

  return { navItems, menuItems };
}
