// 사이트 공용 메뉴(useSiteMenus)를 DefaultThemeTopbar(InsureDesign top-header)의
// items prop 형태로 변환한다. 메인/콘텐츠 레이아웃이 AppHeader 대신 이 상단바를
// 쓰면서 같은 메뉴 목록을 공유하도록 한 곳에서만 매핑한다.
import type { SiteMenu } from './useSiteMenus';

export type ThemeNavItem = {
  label: string;
  to: string;
  current?: boolean;
  target?: 'self' | 'blank';
  isHeader?: boolean;
  children?: Array<{ label: string; to: string; current?: boolean; target?: 'self' | 'blank' }>;
};

export function useThemeNavItems() {
  const route = useRoute();
  const { mainMenus } = useSiteMenus();

  // AppHeader 와 동일한 활성 판정 규칙.
  function isActive(path: string) {
    if (!path) return false;
    if (path === '/') return route.path === '/';
    return route.path === path || route.path.startsWith(`${path}/`);
  }

  const navItems = computed<ThemeNavItem[]>(() =>
    mainMenus.map((menu: SiteMenu) => {
      const children = menu.children ?? [];
      const hasChildren = children.length > 0;

      return {
        label: menu.label,
        to: menu.to,
        // 자기 링크가 없는 상위 항목(to: '')은 클릭 불가 헤더로 렌더하고
        // 하위 항목은 hover 드롭다운으로 펼친다.
        isHeader: hasChildren && !menu.to,
        current: isActive(menu.to) || children.some((child) => isActive(child.to)),
        children: hasChildren
          ? children.map((child) => ({ label: child.label, to: child.to, current: isActive(child.to) }))
          : undefined,
      };
    }),
  );

  return { navItems };
}
