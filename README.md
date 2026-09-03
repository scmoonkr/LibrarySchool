# 모줄성 (One Minute Bible)

말씀을 읽고, 구절을 선택하고, 한 줄 묵상으로 나누는 성경 읽기 서비스입니다.

pnpm 워크스페이스 모노레포로 구성되어 있습니다.

```
.
├─ apps/libraryschool  # Nuxt 3 프론트엔드 (LibrarySchool)
├─ apps/bookscent      # Nuxt 3 프론트엔드 (BookScent)
├─ server      # Express API 서버 (성경/묵상/CMS)
└─ shared      # 웹/서버 공용 코드
```

## 저장소 (GitHub)

- 원격: https://github.com/scmoonkr/LibrarySchool

```bash
# 최초 클론
git clone https://github.com/scmoonkr/LibrarySchool.git
cd LibrarySchool

# 최신 변경 내려받기 (pull)
git pull origin main

# 변경 사항 올리기 (push)
git add .
git commit -m "메시지"
git push origin main
```

> 로컬에서 처음 시작하는 경우:
> ```bash
> git init
> git remote add origin https://github.com/scmoonkr/LibrarySchool.git
> git branch -M main
> git add .
> git commit -m "initial commit"
> git push -u origin main
> ```

## 요구 사항

- Node.js 18+ (권장 20+)
- [pnpm](https://pnpm.io/)
- MongoDB (성경/묵상 데이터 저장)

## 설치

루트에서 워크스페이스 전체 의존성을 설치합니다.

```bash
pnpm run install:all
```

## 환경 변수

서버는 저장소 **루트의 `.env`** 파일을 읽습니다. 주요 키:

```bash
# 서버
PORT=8800                 # 미지정 시 8800
MONGODB_URI=mongodb://127.0.0.1:27017/LibrarySchool
MONGODB_DB=LibrarySchool
JWT_ACCESS_SECRET=change-me
JWT_REFRESH_SECRET=change-me

# 카카오 로그인 (선택)
KAKAO_ID=
KAKAO_SECURITY=
KAKAO_REDIRECT_URI=http://localhost:8801/auth/kakao/callback
```

전체 키 목록은 [server/README.md](server/README.md)를 참고하세요.

웹은 기본적으로 같은 오리진 + Nitro/Vite 프록시로 서버 API를 호출하므로 별도 설정 없이 동작합니다. 다른 서버 주소를 쓰려면:

```bash
NUXT_PUBLIC_API_BASE=http://localhost:8800
NUXT_API_PROXY_TARGET=http://127.0.0.1:8800
```

## 개발 서버 실행

서버와 웹을 **각각 다른 터미널**에서 실행합니다.

```bash
# 1) API 서버        →  http://localhost:8800
pnpm run dev:server

# 2) libraryschool  →  http://localhost:8801
pnpm run dev:libraryschool

# 3) bookscent      →  http://localhost:8802
pnpm run dev:bookscent
```

웹의 `/api`, `/uploads` 요청은 프록시로 API 서버(`127.0.0.1:8800`)에 전달됩니다.

## 프로덕션 빌드 & 실행

```bash
# 빌드 (서버 + 웹)
pnpm run build:all
# 개별 빌드
pnpm run build:server
pnpm run build:libraryschool
pnpm run build:bookscent

# 실행
pnpm run start:server         # dist/index.js
pnpm run start:libraryschool  # .output/server/index.mjs
pnpm run start:bookscent      # .output/server/index.mjs
```

## 주요 스크립트 (루트 package.json)

| 스크립트 | 설명 |
| --- | --- |
| `pnpm run install:all` | server / 두 웹 앱 의존성 설치 |
| `pnpm run dev:server` | API 서버 개발 모드 (8800) |
| `pnpm run dev:libraryschool` | libraryschool 웹 개발 모드 (8801) |
| `pnpm run dev:bookscent` | bookscent 웹 개발 모드 (8802) |
| `pnpm run build:all` | 서버 + 두 웹 앱 빌드 |
| `pnpm run start:server` | 빌드된 서버 실행 |
| `pnpm run start:libraryschool` | 빌드된 libraryschool 실행 |
| `pnpm run start:bookscent` | 빌드된 bookscent 실행 |

## API 개요

- `GET /health` — 헬스 체크
- `POST /api/auth/signup`, `/api/auth/login`, `/api/auth/refresh`, `/api/auth/logout`
- `GET /api/bible/read?bookNo=1&chapterNo=1` — 성경 본문
- `GET /api/reflections`, `POST /api/reflections` — 묵상

전체 엔드포인트는 [server/README.md](server/README.md)를 참고하세요.
