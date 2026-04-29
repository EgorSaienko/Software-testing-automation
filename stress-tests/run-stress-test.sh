#!/bin/bash
# run-stress-test.sh — повний запуск стрес-тесту
#
# Використання:
#   # На APP-сервері (машина 1):
#   node src/app.js &
#   node stress-tests/seed-database.js
#   node stress-tests/monitor-server.js > /dev/null &
#
#   # На ТЕСТ-сервері (машина 2, окремий комп'ютер!):
#   bash stress-tests/run-stress-test.sh http://<APP_SERVER_IP>:3000

set -e

APP_URL="${1:-http://localhost:3000}"
RESULTS_DIR="stress-tests/results"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "================================================"
echo "Blog App — Stress Test"
echo "App URL: $APP_URL"
echo "Results: $RESULTS_DIR"
echo "================================================"
echo ""

mkdir -p "$RESULTS_DIR"

# Перевірка доступності додатку
echo "Checking app availability..."
if ! curl -sf "$APP_URL/posts" -o /dev/null; then
  echo "ERROR: App is not responding at $APP_URL"
  exit 1
fi
echo "App is up!"
echo ""

# Smoke test спочатку
echo "Running smoke test..."
k6 run \
  --env BASE_URL="$APP_URL" \
  --quiet \
  stress-tests/blog-smoke-test.js || echo "Smoke test warnings (continuing)"
echo ""

# Основний стрес-тест
echo "Running stress test (11 minutes)..."
echo "Watching: VU ramp-up | Auth | View | Post | Comment"
echo ""

k6 run \
  --env BASE_URL="$APP_URL" \
  --env STRESS_EMAIL="stress_test@example.com" \
  --env STRESS_PASS="SeedPass123!" \
  --out "json=${RESULTS_DIR}/stress-${TIMESTAMP}.json" \
  --summary-export="${RESULTS_DIR}/summary-${TIMESTAMP}.json" \
  stress-tests/blog-stress-test-v2.js

echo ""
echo "================================================"
echo "Stress test complete!"
echo "Results: ${RESULTS_DIR}/stress-${TIMESTAMP}.json"
echo "Summary: ${RESULTS_DIR}/summary-${TIMESTAMP}.json"
echo "================================================"

# Показуємо ключові метрики
echo ""
echo "Key metrics from summary:"
cat "${RESULTS_DIR}/summary-${TIMESTAMP}.json" | \
  node -e "
    const fs = require('fs');
    const d = JSON.parse(fs.readFileSync('/dev/stdin','utf8'));
    const m = d.metrics;
    const fmt = (v) => v ? v.toFixed(0)+'ms' : 'N/A';
    console.log('');
    console.log('  login_duration:   avg=' + fmt(m.login_duration_ms?.avg) + ' p(95)=' + fmt(m.login_duration_ms?.['p(95)']));
    console.log('  view_duration:    avg=' + fmt(m.view_duration_ms?.avg) + ' p(95)=' + fmt(m.view_duration_ms?.['p(95)']));
    console.log('  post_duration:    avg=' + fmt(m.post_duration_ms?.avg) + ' p(95)=' + fmt(m.post_duration_ms?.['p(95)']));
    console.log('  comment_duration: avg=' + fmt(m.comment_duration_ms?.avg) + ' p(95)=' + fmt(m.comment_duration_ms?.['p(95)']));
    console.log('');
    console.log('  login_ops_total:   ' + (m.login_operations_total?.count || 0));
    console.log('  view_ops_total:    ' + (m.view_operations_total?.count || 0));
    console.log('  post_ops_total:    ' + (m.post_operations_total?.count || 0));
    console.log('  comment_ops_total: ' + (m.comment_operations_total?.count || 0));
  " 2>/dev/null || echo "(run manually to see summary)"
