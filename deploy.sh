#!/usr/bin/env bash
# 배포 스크립트: 최신 코드 pull → 의존성 설치 → 빌드 → pm2 재시작
#
# 사용법: 서버에서 저장소 루트에서 실행
#   ./deploy.sh
#
# pm2 프로세스: libraryschool-api / libraryschool-client / bookscent-client
set -euo pipefail

# 저장소 루트 (이 스크립트 위치)
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

echo "=== [1/5] git pull origin main ==="
git pull origin main

echo "=== [2/5] install:all ==="
pnpm run install:all

echo "=== [3/5] build:all (server + libraryschool + bookscent) ==="
pnpm run build:all

echo "=== [4/5] restart PM2 ==="
# libraryschool-api (Express, 루트 .env 의 PORT=8800)
pm2 describe libraryschool-api >/dev/null 2>&1 \
  && pm2 restart libraryschool-api --update-env \
  || pm2 start "$PROJECT_DIR/server/dist/index.js" \
       --name libraryschool-api \
       --cwd "$PROJECT_DIR" \
       --update-env

# libraryschool-client (Nuxt, 8801)
pm2 describe libraryschool-client >/dev/null 2>&1 \
  && PORT=8801 pm2 restart libraryschool-client --update-env \
  || PORT=8801 pm2 start "$PROJECT_DIR/apps/libraryschool/.output/server/index.mjs" \
       --name libraryschool-client \
       --cwd "$PROJECT_DIR/apps/libraryschool" \
       --update-env

# bookscent-client (Nuxt, 8802)
pm2 describe bookscent-client >/dev/null 2>&1 \
  && PORT=8802 pm2 restart bookscent-client --update-env \
  || PORT=8802 pm2 start "$PROJECT_DIR/apps/bookscent/.output/server/index.mjs" \
       --name bookscent-client \
       --cwd "$PROJECT_DIR/apps/bookscent" \
       --update-env

echo "=== [5/5] pm2 save & status ==="
pm2 save
pm2 status

echo "✔ 배포 완료"
