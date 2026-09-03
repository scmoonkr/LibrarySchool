import {
  appendResponseHeader,
  getRequestHeaders,
  getRequestURL,
  readRawBody,
  setResponseStatus,
} from 'h3';

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
  const method = event.method || 'GET';
  const incomingHeaders = getRequestHeaders(event);
  const headers = Object.fromEntries(
    Object.entries(incomingHeaders).filter(
      (entry): entry is [string, string] => (
        typeof entry[1] === 'string'
        && !HOP_BY_HOP_HEADERS.has(entry[0].toLowerCase())
      ),
    ),
  );
  const body = method === 'GET' || method === 'HEAD' ? undefined : await readRawBody(event, false);

  const response = await $fetch.raw(targetUrl.toString(), {
    method,
    headers,
    body,
    redirect: 'manual',
  });

  setResponseStatus(event, response.status, response.statusText);

  for (const [key, value] of response.headers.entries()) {
    if (HOP_BY_HOP_HEADERS.has(key.toLowerCase())) continue;
    appendResponseHeader(event, key, value);
  }

  return response._data;
});
