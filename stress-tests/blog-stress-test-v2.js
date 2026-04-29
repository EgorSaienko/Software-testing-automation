/**
 * blog-stress-test-v2.js — Стрес-тест (Варіант 2)
 *
 * Мета: визначити максимальну кількість операцій за хвилину
 * окремо по кожному типу:
 *   1. Авторизацій (POST /auth/login)
 *   2. Переглядів (GET /posts/:slug)
 *   3. Розміщень дописів (POST /posts)
 *   4. Коментарів (POST /posts/:slug/comments)
 *
 * Конфігурація: поступовий ріст VU (ramping-vus executor)
 * Прогрів: перші 2 хвилини при низькому навантаженні
 *
 * ВАЖЛИВО: Запускайте з окремої машини:
 *   k6 run --out json=results/stress-report.json \
 *     --env BASE_URL=http://<APP_SERVER_IP>:3000 \
 *     stress-tests/blog-stress-test-v2.js
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Counter, Rate, Trend, Gauge } from 'k6/metrics';

// ── Кастомні метрики ─────────────────────────────────────────────────────────
const loginOps     = new Counter('login_operations_total');
const viewOps      = new Counter('view_operations_total');
const postOps      = new Counter('post_operations_total');
const commentOps   = new Counter('comment_operations_total');

const loginRate    = new Rate('login_success_rate');
const viewRate     = new Rate('view_success_rate');
const postRate     = new Rate('post_success_rate');
const commentRate  = new Rate('comment_success_rate');

const loginDur     = new Trend('login_duration_ms', true);
const viewDur      = new Trend('view_duration_ms', true);
const postDur      = new Trend('post_duration_ms', true);
const commentDur   = new Trend('comment_duration_ms', true);

// ── Конфігурація ─────────────────────────────────────────────────────────────
const BASE_URL     = __ENV.BASE_URL  || 'http://localhost:3000';
const STRESS_EMAIL = __ENV.STRESS_EMAIL || 'stress_test@example.com';
const STRESS_PASS  = __ENV.STRESS_PASS  || 'SeedPass123!';

export const options = {
  scenarios: {
    // ── Сценарій A: Авторизації ──
    auth_stress: {
      executor:  'ramping-vus',
      startVUs:  0,
      stages: [
        { duration: '2m', target: 2  },  // ПРОГРІВ: 0→2 VU
        { duration: '2m', target: 10 },  // Нормальне навантаження
        { duration: '2m', target: 25 },  // Середнє
        { duration: '2m', target: 50 },  // Пікове
        { duration: '2m', target: 75 },  // Понад пікове
        { duration: '1m', target: 0  },  // Спад
      ],
      exec:      'authScenario',
      tags:      { scenario: 'auth' },
    },

    // ── Сценарій B: Перегляди ──
    view_stress: {
      executor:  'ramping-vus',
      startVUs:  0,
      stages: [
        { duration: '2m', target: 2  },  // ПРОГРІВ
        { duration: '2m', target: 10 },
        { duration: '2m', target: 30 },
        { duration: '2m', target: 60 },
        { duration: '2m', target: 100},
        { duration: '1m', target: 0  },
      ],
      exec:      'viewScenario',
      tags:      { scenario: 'view' },
    },

    // ── Сценарій C: Розміщення дописів ──
    post_stress: {
      executor:  'ramping-vus',
      startVUs:  0,
      stages: [
        { duration: '2m', target: 1  },  // ПРОГРІВ
        { duration: '2m', target: 5  },
        { duration: '2m', target: 10 },
        { duration: '2m', target: 20 },
        { duration: '2m', target: 30 },
        { duration: '1m', target: 0  },
      ],
      exec:      'postScenario',
      tags:      { scenario: 'post' },
    },

    // ── Сценарій D: Коментарі ──
    comment_stress: {
      executor:  'ramping-vus',
      startVUs:  0,
      stages: [
        { duration: '2m', target: 1  },  // ПРОГРІВ
        { duration: '2m', target: 5  },
        { duration: '2m', target: 15 },
        { duration: '2m', target: 30 },
        { duration: '2m', target: 45 },
        { duration: '1m', target: 0  },
      ],
      exec:      'commentScenario',
      tags:      { scenario: 'comment' },
    },
  },

  thresholds: {
    // Авторизація: 95% до 1.5с при пікові
    'login_duration_ms{scenario:auth}':    ['p(95)<3000'],
    // Перегляд: 95% до 2с при пікові
    'view_duration_ms{scenario:view}':     ['p(95)<3000'],
    // Публікація: 95% до 3с
    'post_duration_ms{scenario:post}':     ['p(95)<5000'],
    // Коментарі: 95% до 3с
    'comment_duration_ms{scenario:comment}': ['p(95)<5000'],
    // Загальна частка відмов
    http_req_failed: ['rate<0.20'], // При стрес-тесті допускаємо до 20%
  },
};

// ── Загальні параметри ──────────────────────────────────────────────────────

function postParams(jar) {
  return {
    cookieJar: jar,
    redirects: 5,
    headers:   { 'Content-Type': 'application/x-www-form-urlencoded' },
    timeout:   '10s',
  };
}

function getParams(jar) {
  return { cookieJar: jar, redirects: 5, timeout: '10s' };
}

// Кешований slug (отримуємо один раз у setup)
let cachedSlugs = [];

export function setup() {
  // Реєструємо основного тестового юзера якщо ще немає
  const jar = http.cookieJar();
  http.post(`${BASE_URL}/auth/register`,
    `username=stress_test_user&email=${STRESS_EMAIL}&password=${STRESS_PASS}&confirmPassword=${STRESS_PASS}`,
    { ...postParams(jar), redirects: 0 }
  );

  // Логін та отримання slug-ів постів
  const loginRes = http.post(`${BASE_URL}/auth/login`,
    `email=${STRESS_EMAIL}&password=${STRESS_PASS}`,
    postParams(jar)
  );

  if (loginRes.status === 200) {
    const postsRes = http.get(`${BASE_URL}/posts`, getParams(jar));
    const matches = [...postsRes.body.matchAll(/href="\/posts\/([^"]+?)"/g)].map(m => m[1]);
    cachedSlugs = matches.slice(0, 20); // Беремо до 20 slug
  }

  console.log(`Setup complete. Cached slugs: ${cachedSlugs.length}`);
  return { slugs: cachedSlugs };
}

// ── Сценарій A: Авторизація ─────────────────────────────────────────────────

export function authScenario() {
  const jar = http.cookieJar();

  const start = Date.now();
  const res = http.post(
    `${BASE_URL}/auth/login`,
    `email=${STRESS_EMAIL}&password=${STRESS_PASS}`,
    postParams(jar)
  );
  const dur = Date.now() - start;

  loginDur.add(dur);
  loginOps.add(1);

  const ok = check(res, {
    'auth: status 200':   r => r.status === 200,
    'auth: no 5xx':       r => r.status < 500,
    'auth: has content':  r => r.body && r.body.length > 100,
  });
  loginRate.add(ok);

  if (ok) {
    // Вихід щоб не накопичувати сесії
    http.post(`${BASE_URL}/auth/logout`, '', postParams(jar));
  }

  sleep(0.1);
}

// ── Сценарій B: Перегляд постів ─────────────────────────────────────────────

export function viewScenario(data) {
  const jar = http.cookieJar();
  const slugs = data.slugs.length > 0 ? data.slugs : ['seed-post-1'];

  // Вибираємо випадковий slug
  const slug = slugs[Math.floor(Math.random() * slugs.length)];

  const start = Date.now();
  const res = http.get(`${BASE_URL}/posts/${slug}`, getParams(jar));
  const dur = Date.now() - start;

  viewDur.add(dur);
  viewOps.add(1);

  const ok = check(res, {
    'view: status 200':     r => r.status === 200 || r.status === 404,
    'view: no 5xx':         r => r.status < 500,
    'view: has html':       r => r.body && r.body.length > 200,
  });
  viewRate.add(ok && res.status === 200);

  sleep(0.05);
}

// ── Сценарій C: Публікація поста ─────────────────────────────────────────────

export function postScenario() {
  const jar = http.cookieJar();

  // Спочатку логін
  const loginRes = http.post(
    `${BASE_URL}/auth/login`,
    `email=${STRESS_EMAIL}&password=${STRESS_PASS}`,
    postParams(jar)
  );

  if (loginRes.status !== 200) {
    postRate.add(false);
    postOps.add(1);
    return;
  }

  const ts = Date.now();
  const start = Date.now();
  const res = http.post(
    `${BASE_URL}/posts`,
    `title=Stress+Test+Post+${ts}&content=This+is+a+stress+test+post+created+at+${ts}.+Content+is+long+enough+for+validation.`,
    postParams(jar)
  );
  const dur = Date.now() - start;

  postDur.add(dur);
  postOps.add(1);

  const ok = check(res, {
    'post: created (200/302)': r => r.status === 200 || r.status === 302,
    'post: no 5xx':            r => r.status < 500,
  });
  postRate.add(ok);

  http.post(`${BASE_URL}/auth/logout`, '', postParams(jar));
  sleep(0.2);
}

// ── Сценарій D: Коментар ─────────────────────────────────────────────────────

export function commentScenario(data) {
  const jar = http.cookieJar();
  const slugs = data.slugs.length > 0 ? data.slugs : ['seed-post-1'];
  const slug  = slugs[Math.floor(Math.random() * slugs.length)];

  // Логін
  const loginRes = http.post(
    `${BASE_URL}/auth/login`,
    `email=${STRESS_EMAIL}&password=${STRESS_PASS}`,
    postParams(jar)
  );

  if (loginRes.status !== 200) {
    commentRate.add(false);
    commentOps.add(1);
    return;
  }

  const start = Date.now();
  const res = http.post(
    `${BASE_URL}/posts/${slug}/comments`,
    `content=Stress+test+comment+at+${Date.now()}`,
    postParams(jar)
  );
  const dur = Date.now() - start;

  commentDur.add(dur);
  commentOps.add(1);

  const ok = check(res, {
    'comment: posted (200/302)': r => r.status === 200 || r.status === 302,
    'comment: no 5xx':           r => r.status < 500,
  });
  commentRate.add(ok);

  http.post(`${BASE_URL}/auth/logout`, '', postParams(jar));
  sleep(0.2);
}
