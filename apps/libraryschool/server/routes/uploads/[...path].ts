import {
  appendResponseHeader,
  getRequestHeaders,
  getRequestURL,
  setResponseStatus,
} from 'h3';

// CMS 미디어 파일 프록시: /uploads/** → API 서버의 /uploads/**
//
// media.paths.original 은 '/uploads/2026/10/xx/<파일>.png' 로 저장되고 화면은
// 그 경로를 same-origin 으로 요청한다. 운영에서는 Apache 가 먼저 받아 정적으로
// 내려주지만, 로컬(Nuxt dev/프리뷰)에는 그걸 받아 줄 게 없어 404 가 났다.
// nuxt.config 의 vite.server.proxy 는 Vite 자체 요청에만 걸리므로 여기서 처리한다.
//
// /api/** 를 넘기는 server/api/[...path].ts 와 같은 방식이고, 대상 주소도
// 같은 NUXT_API_PROXY_TARGET 을 런타임에 읽는다.
const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'content-length',
  'host',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
]);

export default defineEventHandler(async (event) => {
  const targetBase = process.env.NUXT_API_PROXY_TARGET || 'http://127.0.0.1:8800';
  const requestUrl = getRequestURL(event);
  const targetUrl = new URL(requestUrl.pathname + requestUrl.search, targetBase);

  const incomingHeaders = getRequestHeaders(event);
  const headers = Object.fromEntries(
    Object.entries(incomingHeaders).filter(
      (entry): entry is [string, string] => (
        typeof entry[1] === 'string'
        && !HOP_BY_HOP_HEADERS.has(entry[0].toLowerCase())
      ),
    ),
  );

  // 이미지/PDF 가 대부분이라 본문은 바이너리 그대로 흘려보낸다.
  const response = await $fetch.raw(targetUrl.toString(), {
    method: 'GET',
    headers,
    responseType: 'arrayBuffer',
    redirect: 'manual',
  });

  setResponseStatus(event, response.status, response.statusText);

  for (const [key, value] of response.headers.entries()) {
    if (HOP_BY_HOP_HEADERS.has(key.toLowerCase())) continue;
    appendResponseHeader(event, key, value);
  }

  return response._data;
});
