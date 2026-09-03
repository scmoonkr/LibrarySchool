# OneMinuteBible Server

## Start

```bash
cd server
pnpm install
pnpm run dev
```

## Endpoints

- `GET /health`
- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `POST /api/auth/change-password`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `GET /api/auth/kakao/authorize`
- `GET /api/auth/kakao/callback?code=...`
- `GET /api/bible/read?bookNo=1&chapterNo=1`
- `GET /api/reading-paints?userId=user_1&bookNo=1&chapterNo=1`
- `POST /api/reading-paints`
- `GET /api/reflections?bookNo=1&chapterNo=1`
- `POST /api/reflections`

## Environment

The server reads the root `.env` file and supports these keys:

- `PORT` or `APP_PORT`
- `MONGODB_URI`
- `MONGODB_DB`
- `MONGODB_COLLECTION_BIBLE_EDIT`
- `MONGODB_ADDR`
- `MONGO_USERNAME`
- `MONGO_PWD`
- `MONGODB_AUTH_SOURCE`
- `MONGODB_DIRECT_CONNECTION`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `KAKAO_ID`
- `KAKAO_SECURITY` or `KAKAO_CLIENT_SECRET`
- `KAKAO_REDIRECT_URI`
