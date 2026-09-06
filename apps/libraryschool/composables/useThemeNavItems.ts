// DefaultThemeTopbar(InsureDesign top-header)의 items prop 을 만든다.
//
// 1순위는 백엔드에서 관리하는 사이트 메뉴(/backend/menus 의 header 메뉴)다.
//   InsureDesign 과 같은 방식으로 useSiteNav('header') 가 가져온다.
// 2순위는 코드에 박아 둔 useSiteMenus 목록이다. 백엔드에 header 메뉴가 아직
//   없거나 항목이 모두 비공개면 헤더가 통째로 비어 버리므로 폴백으로 남긴다.
import type { SiteMenu } from './useSiteMenus';
import type { NavItem } from './useSiteNav';

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
  const cmsNav = useSiteNav('header');

  // AppHeader 와 동일한 활성 판정 규칙.
  function isActive(path: string) {
    if (!path || path === '#') return false;
    if (path === '/') return route.path === '/';
    return route.path === path || route.path.startsWith(`${path}/`);
  }

  // 백엔드 메뉴(NavItem) → 상단바 아이템.
  function fromCms(item: NavItem): ThemeNavItem {
    const children = item.children ?? [];
    return {
      label: item.label,
      to: item.to,
      target: item.target,
      // URL 이 없는 항목은 클릭 불가 대표메뉴로 렌더하고 하위만 드롭다운으로 펼친다.
      isHeader: item.isHeader,
      current: isActive(item.to) || children.some((c) => isActive(c.to)),
      children: children.length
        ? children.map((c) => ({
            label: c.label,
            to: c.to,
            target: c.target,
            current: isActive(c.to),
          }))
        : undefined,
    };
  }

  // 폴백(코드 정의) → 상단바 아이템.
  function fromCode(menu: SiteMenu): ThemeNavItem {
    const children = menu.children ?? [];
    const hasChildren = children.length > 0;
    return {
      label: menu.label,
      to: menu.to,
      isHeader: hasChildren && !menu.to,
      current: isActive(menu.to) || children.some((child) => isActive(child.to)),
      children: hasChildren
        ? children.map((child) => ({ label: child.label, to: child.to, current: isActive(child.to) }))
        : undefined,
    };
  }

  const navItems = computed<ThemeNavItem[]>(() => {
    const cms = cmsNav.value;
    if (cms.length) return cms.map(fromCms);
    return mainMenus.map(fromCode);
  });

  return { navItems };
}
