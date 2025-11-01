#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-https://inmo-veo3-859994227667.us-central1.run.app}"
echo "==> Testing against: $BASE_URL"

echo -e "\n[1/4] GET /health"
curl -sS -w "\nHTTP:%{http_code}\n" "$BASE_URL/health"

echo -e "\n[2/4] POST /run (application/x-www-form-urlencoded)"
curl -sS -w "\nHTTP:%{http_code}\n" -X POST \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data "slug=demo-slug&mode=urlencoded" \
  "$BASE_URL/run"

echo -e "\n[3/4] POST /run (multipart/form-data, sin archivo)"
curl -sS -w "\nHTTP:%{http_code}\n" -X POST \
  -F "slug=demo-slug" \
  -F "mode=multipart" \
  "$BASE_URL/run"

echo "hello" > /tmp/test.txt
echo -e "\n[4/4] POST /run (multipart/form-data, con archivo)"
curl -sS -w "\nHTTP:%{http_code}\n" -X POST \
  -F "slug=demo-slug" \
  -F "mode=multipart" \
  -F "file=@/tmp/test.txt;type=text/plain" \
  "$BASE_URL/run"

echo -e "\n✅ Done"
