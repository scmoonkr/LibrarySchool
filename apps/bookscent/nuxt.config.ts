import { fileURLToPath } from 'node:url';

export default defineNuxtConfig({
  alias: {
    // 블록 레지스트리 등 웹/서버 공용 코드는 저장소 루트 shared/ 에 둔다.
    // Nuxt 내장 '~~'(= apps/web)를 덮을 수 없으므로 별도 이름을 쓴다.
    '@shared': fileURLToPath(new URL('../../shared', import.meta.url)),
  },
  devtools: { enabled: true },
  css: ['~/assets/main.css'],
  runtimeConfig: {
    public: {
      // 성경/묵상 API (server/ 의 Express). 비워두면 same-origin + Nitro 프록시를 탄다.
      apiBase: process.env.NUXT_PUBLIC_API_BASE || '',
      // 백엔드(CMS) API. 이제 이 저장소의 server/ 안(modules/cms)에 있으므로
      // 성경 API 와 같은 오리진을 쓴다. 비워두면 same-origin + Nitro 프록시.
      cmsApiBase: process.env.NUXT_PUBLIC_CMS_API_BASE || '',
      // CMS 콘텐츠 페이지의 사이트명/설명 폴백. DB(site-config)에 값이 있으면 그쪽이 우선.
      siteName: process.env.SITE_NAME || '',
      siteDescription: process.env.SITE_DESCRIPTION || '',
    },
  },
  vite: {
    server: {
      // 저장소 루트의 shared/ 를 dev 서버가 읽을 수 있게 한다.
      fs: {
        allow: [fileURLToPath(new URL('../..', import.meta.url))],
      },
      proxy: {
        '/api': {
          target: process.env.NUXT_API_PROXY_TARGET || 'http://127.0.0.1:8800',
          changeOrigin: true,
        },
        // CMS 미디어 파일. DB 에 '/uploads/...' 로 저장돼 있어 same-origin 으로 들어온다.
        '/uploads': {
          target: process.env.NUXT_API_PROXY_TARGET || 'http://127.0.0.1:8800',
          changeOrigin: true,
        },
      },
    },
  },
  app: {
    head: {
      title: '모줄성 - 1분 성경',
      meta: [
        {
          name: 'viewport',
          content: 'width=device-width, initial-scale=1',
        },
        {
          name: 'description',
          content: '말씀을 읽고, 구절을 선택하고, 한 줄 묵상으로 나누는 모줄성 성경 읽기 서비스입니다.',
        },
        {
          property: 'og:type',
          content: 'website',
        },
        {
          property: 'og:title',
          content: '모줄성 - 1분 성경',
        },
        {
          property: 'og:description',
          content: '말씀을 읽고, 구절을 선택하고, 한 줄 묵상으로 나누는 모줄성 성경 읽기 서비스입니다.',
        },
        {
          property: 'og:image',
          content: '/Images/mojulseong.png',
        },
        {
          name: 'twitter:card',
          content: 'summary_large_image',
        },
        {
          name: 'twitter:title',
          content: '모줄성 - 1분 성경',
        },
        {
          name: 'twitter:description',
          content: '말씀을 읽고, 구절을 선택하고, 한 줄 묵상으로 나누는 모줄성 성경 읽기 서비스입니다.',
        },
        {
          name: 'twitter:image',
          content: '/Images/mojulseong.png',
        },
      ],
      link: [
        {
          rel: 'icon',
          type: 'image/png',
          href: '/Images/mojulseong_logo_only.png',
        },
        {
          rel: 'apple-touch-icon',
          href: '/Images/mojulseong_logo_only.png',
        },
        {
          rel: 'stylesheet',
          href: 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css',
        },
      ],
    },
  },
  compatibilityDate: '2026-04-03',
});
