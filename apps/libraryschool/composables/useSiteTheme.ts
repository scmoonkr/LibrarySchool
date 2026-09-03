import { themesMeta } from '~/themes/meta';

// 현재 사이트 테마 이름을 공유 상태로 들고 있는다.
// themes/meta.ts 는 Vue 컴포넌트를 import 하지 않으므로 백엔드 화면에서 안전하다.
export function useSiteTheme() {
  const themeName = useState<string>('siteTheme', () => 'default');
  const theme = computed(
    () => themesMeta.find((item) => item.value === themeName.value) ?? themesMeta[0],
  );
  return { themeName, theme };
}
