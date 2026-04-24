#!/bin/bash
# run-api-tests.sh — запуск Postman-колекції через Newman у CI/CD

set -e

BASE_URL="${BASE_URL:-http://localhost:3000}"
REPORTS_DIR="api-tests/reports"

echo "========================================="
echo "Blog App — API Tests via Newman"
echo "Base URL: $BASE_URL"
echo "========================================="

mkdir -p "$REPORTS_DIR"

# Встановлення Newman якщо відсутній
if ! command -v newman &> /dev/null; then
  echo "Installing Newman..."
  npm install -g newman newman-reporter-htmlextra
fi

# Запуск колекції
newman run api-tests/blog-app-postman-collection.json \
  --environment api-tests/blog-app-local-environment.json \
  --env-var "base_url=$BASE_URL" \
  --reporters cli,json,htmlextra \
  --reporter-json-export "$REPORTS_DIR/newman-report.json" \
  --reporter-htmlextra-export "$REPORTS_DIR/newman-report.html" \
  --reporter-htmlextra-title "Blog App API Test Report" \
  --reporter-htmlextra-browserTitle "API Tests" \
  --delay-request 300 \
  --timeout-request 10000 \
  --bail

echo "========================================="
echo "Reports saved to: $REPORTS_DIR/"
echo "========================================="
