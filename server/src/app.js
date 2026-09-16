import express from 'express';
import cors from 'cors';
import authRouter from './modules/auth/auth.routes.js';
import bibleRouter from './modules/bible/bible.routes.js';
import reflectionRouter from './modules/reflections/reflection.routes.js';
import readingRouter from './modules/reading/reading.routes.js';
import customerRouter from './modules/orderm/customer.routes.js';
import orderRouter from './modules/orderm/order.routes.js';
import orderListRouter from './modules/orderm/orderlist.routes.js';
import bookRouter from './modules/orderm/book.routes.js';
import dreamerRouter from './modules/orderm/dreamer.routes.js';
import fileRouter from './modules/orderm/file.routes.js';
import aladinRouter from './modules/aladin/aladin.routes.js';
import crawlRouter from './modules/crawl/crawl.routes.js';
import cmsHandler from './modules/cms/index.mjs';
import { attachCmsSession } from './modules/cms/session-bridge.js';
import { getConfig } from './modules/cms/config.mjs';

const app = express();

// app.use(cors({
//   origin: [/^http:\/\/localhost:\d+$/, /^http:\/\/127\.0\.0\.1:\d+$/],
//   credentials: true,
// }));
app.use(cors({
  origin: [
    /^http:\/\/localhost:\d+$/,
    /^http:\/\/127\.0\.0\.1:\d+$/,
    /^http:\/\/221\.143\.48\.153:\d+$/,
    /^https:\/\/oneminutebible\.co\.kr$/,
    /^https:\/\/www\.oneminutebible\.co\.kr$/,
    /^https:\/\/node\.oneminutebible\.co\.kr$/,
  ],
  credentials: true,
}));

// 성경 앱 로그인(JWT)을 CMS 세션으로 변환한다. CMS 핸들러보다 먼저 와야 한다.
app.use(attachCmsSession);

// CMS(백엔드/콘텐츠) API.
// 자체적으로 raw 요청 스트림에서 body 를 읽고 multipart 업로드도 직접 처리하므로
// 반드시 express.json() 보다 먼저 마운트해야 한다.
// 담당 경로가 아니면 next() 로 통과시킨다.
app.use(cmsHandler);

// 업로드된 미디어 파일 서빙 (/uploads/**).
app.use('/uploads', express.static(getConfig().uploadDir));

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({
    ok: true,
    message: 'OneMinuteBible server is running.',
  });
});

app.use('/api/auth', authRouter);
app.use('/api/bible', bibleRouter);
app.use('/api/reflections', reflectionRouter);
app.use('/api/reading', readingRouter);
app.use('/api/orderm/customers', customerRouter);
app.use('/api/orderm/orders', orderRouter);
app.use('/api/orderm/order-list', orderListRouter);
app.use('/api/orderm/books', bookRouter);
app.use('/api/orderm/dreamer', dreamerRouter);
app.use('/api/file', fileRouter);
app.use('/api/aladin', aladinRouter);
app.use('/api/crawl', crawlRouter);

app.use((error, req, res, next) => {
  console.error(error);
  res.status(error.statusCode || 500).json({
    ok: false,
    message: error.message || 'Internal server error',
  });
});

export default app;
