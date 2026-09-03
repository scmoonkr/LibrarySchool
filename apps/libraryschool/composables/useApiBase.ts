// 백엔드(CMS) API의 base origin.
//
// /backend/** 페이지와 거기서 쓰는 컴포넌트 전용이다.
// 호출부는 항상 `${apiBase}/api/...` 형태로 URL을 만들므로
// 이 값은 "/api" 같은 경로 prefix 가 아니라 서버 ORIGIN 이어야 한다.
//
// CMS API는 OneMinuteBible 의 api-server(기본 http://localhost:9010)가 담당하고,
// 성경/묵상 API는 이 저장소의 Express 서버(runtimeConfig.public.apiBase)가 담당한다.
// 둘은 별개이므로 여기서 성경 쪽 apiBase 를 돌려주면 안 된다.
//
// 교차 오리진 호출이라 api-server 의 ALLOWED_ORIGINS 에 이 웹의 오리진이
// 들어 있어야 한다. (OneMinuteBible/.env 참조)
export function useApiBase(): string {
  const config = useRuntimeConfig();
  return String(config.public.cmsApiBase ?? '').replace(/\/$/, '');
}
