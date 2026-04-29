/**
 * k6 Load Testing — Blog App
 *
 * Сценарії:
 *   S1 — Авторизація + перегляд допису + вихід
 *   S2 — Авторизація + перегляд допису + коментар + вихід
 *   S3 — Авторизація + створення допису + вихід
 *   S4 — Авторизація + перегляд і оновлення профілю + вихід
 *
 * Нормальне навантаження: 5 VU (Virtual Users) — еквівалент 10 req/s
 *
 * Запуск:
 *   k6 run load-tests/blog-load-test.js
 *   k6 run --out json=load-tests/results/report.json load-tests/blog-load-test.js
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// ── Кастомні метрики ──────────────────────────────────────────────────────────
const loginDuration       = new Trend('login_duration',       true);
const pageLoadDuration    = new Trend('page_load_duration',   true);
const postCreateDuration  = new Trend('post_create_duration', true);
const commentDuration     = new Trend('comment_duration',     true);
const profileDuration     = new Trend('profile_duration',     true);
const failedRequests      = new Counter('failed_requests');
const successRate         = new Rate('success_rate');

// ── Конфігурація ──────────────────────────────────────────────────────────────
const BASE_URL   = __ENV.BASE_URL   || 'http://localhost:3000';
const TEST_EMAIL = __ENV.TEST_EMAIL || 'k6_load_test@example.com';
const TEST_PASS  = __ENV.TEST_PASS  || 'K6LoadPass123!';
const TEST_USER  = __ENV.TEST_USER  || 'k6_load_user';

// ── Налаштування навантаження ─────────────────────────────────────────────────
export const options = {
  scenarios: {
    scenario_1_browse: {
      executor:    'constant-vus',
      vus:         2,
      duration:    '1m',
      exec:        'scenario1',
      startTime:   '0s',
    },
    scenario_2_comment: {
      executor:    'constant-vus',
      vus:         1,
      duration:    '1m',
      exec:        'scenario2',
      startTime:   '5s',
    },
    scenario_3_create_post: {
      executor:    'constant-vus',
      vus:         1,
      duration:    '1m',
      exec:        'scenario3',
      startTime:   '10s',
    },
    scenario_4_profile: {
      executor:    'constant-vus',
      vus:         1,
      duration:    '1m',
      exec:        'scenario4',
      startTime:   '15s',
    },
  },

  thresholds: {
    // 95% всіх відповідей мають завершитись за 2с
    http_req_duration:    ['p(95)<2000'],
    // Не більше 5% відмов
    http_req_failed:      ['rate<0.05'],
    // 95% завантажень сторінок — до 2с
    page_load_duration:   ['p(95)<2000'],
    // 95% входів — до 1.5с
    login_duration:       ['p(95)<1500'],
    // Загальний рівень успішності
    success_rate:         ['rate>0.95'],
  },
};

// ── Допоміжні функції ─────────────────────────────────────────────────────────

/**
 * Повертає загальні параметри для POST-запитів.
 * Content-Type: application/x-www-form-urlencoded
 */
function postParams(jar) {
  return {
    cookieJar:  jar,
    redirects:  5,
    tags:       { type: 'post' },
    headers:    { 'Content-Type': 'application/x-www-form-urlencoded' },
  };
}

/**
 * Повертає параметри для GET-запитів.
 */
function getParams(jar) {
  return {
    cookieJar: jar,
    redirects: 5,
    tags:      { type: 'get' },
  };
}

/**
 * Реєстрація тестового користувача (виконується один раз у setup).
 * k6 setup() не підтримує паузи — виконується до початку тесту.
 */
export function setup() {
  const jar = http.cookieJar();

  // Реєструємо тестового користувача
  const regRes = http.post(
    `${BASE_URL}/auth/register`,
    `username=${TEST_USER}&email=${TEST_EMAIL}&password=${TEST_PASS}&confirmPassword=${TEST_PASS}`,
    {
      cookieJar: jar,
      redirects: 5,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    }
  );

  // Якщо реєстрація вдалась — створюємо тестовий пост
  if (regRes.status === 200 || regRes.status === 302) {
    // Логін після реєстрації
    const loginRes = http.post(
      `${BASE_URL}/auth/login`,
      `email=${TEST_EMAIL}&password=${TEST_PASS}`,
      {
        cookieJar: jar,
        redirects: 5,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }
    );

    if (loginRes.status === 200) {
      // Створюємо хоча б один пост якщо немає
      http.post(
        `${BASE_URL}/posts`,
        'title=k6+Load+Test+Post&content=This+post+was+created+for+k6+load+testing+purposes.',
        {
          cookieJar: jar,
          redirects: 5,
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }
      );
    }
  }

  return { testEmail: TEST_EMAIL, testPass: TEST_PASS };
}

// ── Сценарій 1: Авторизація → перегляд допису → вихід ────────────────────────

/**
 * S1: Користувач авторизується, переглядає список та один допис, виходить.
 *
 * Метрика: page_load_duration (час від запиту до отримання повного HTML-відповіді)
 * Успішний результат: HTTP 200 + наявність ключових HTML-елементів у відповіді
 */
export function scenario1(data) {
  const jar = http.cookieJar();

  group('S1: Login → Browse → Logout', () => {

    // Крок 1: Відкрити сторінку входу
    group('Step 1: Open login page', () => {
      const start = Date.now();
      const res = http.get(`${BASE_URL}/auth/login`, getParams(jar));
      pageLoadDuration.add(Date.now() - start);

      const ok = check(res, {
        'S1.1 login page status 200': r => r.status === 200,
        'S1.1 login page has form':   r => r.body.includes('Вхід'),
      });
      if (!ok) { failedRequests.add(1); successRate.add(false); }
      else { successRate.add(true); }
    });

    sleep(0.5); // Імітація "читання" форми

    // Крок 2: Авторизація
    group('Step 2: Login', () => {
      const start = Date.now();
      const res = http.post(
        `${BASE_URL}/auth/login`,
        `email=${data.testEmail}&password=${data.testPass}`,
        postParams(jar)
      );
      loginDuration.add(Date.now() - start);

      const ok = check(res, {
        'S1.2 login success (200)':         r => r.status === 200,
        'S1.2 has posts or user element':    r => r.body.includes('posts-grid') || r.body.includes('nav-avatar-link'),
      });
      if (!ok) { failedRequests.add(1); successRate.add(false); return; }
      successRate.add(true);
    });

    sleep(1); // Пауза перед наступною дією

    // Крок 3: Переглянути список постів
    group('Step 3: Browse posts list', () => {
      const start = Date.now();
      const res = http.get(`${BASE_URL}/posts`, getParams(jar));
      pageLoadDuration.add(Date.now() - start);

      const ok = check(res, {
        'S1.3 posts list status 200':      r => r.status === 200,
        'S1.3 posts list has post-cards':  r => r.body.includes('post-card'),
      });
      if (!ok) { failedRequests.add(1); successRate.add(false); return; }
      successRate.add(true);

      // Крок 4: Клікнути на перший пост
      sleep(1);
      group('Step 4: Open first post', () => {
        const startPost = Date.now();
        const postRes = http.get(`${BASE_URL}/posts`, getParams(jar));
        pageLoadDuration.add(Date.now() - startPost);

        // Витягуємо slug першого поста з HTML
        const slugMatch = postRes.body.match(/href="\/posts\/([^"]+?)"/);
        if (slugMatch) {
          const slug = slugMatch[1];
          const startRead = Date.now();
          const readRes = http.get(`${BASE_URL}/posts/${slug}`, getParams(jar));
          pageLoadDuration.add(Date.now() - startRead);

          const okRead = check(readRes, {
            'S1.4 post page status 200':     r => r.status === 200,
            'S1.4 post page has title':      r => r.body.includes('post-title'),
            'S1.4 post page has content':    r => r.body.includes('post-content'),
          });
          if (!okRead) { failedRequests.add(1); successRate.add(false); }
          else { successRate.add(true); }
        }
      });
    });

    sleep(2); // Імітація читання

    // Крок 5: Вихід
    group('Step 5: Logout', () => {
      const res = http.post(`${BASE_URL}/auth/logout`, '', postParams(jar));
      const ok = check(res, {
        'S1.5 logout status 200 or 302': r => r.status === 200 || r.status === 302,
      });
      if (!ok) { failedRequests.add(1); successRate.add(false); }
      else { successRate.add(true); }
    });

  });

  sleep(1);
}

// ── Сценарій 2: Авторизація → перегляд → перехід → коментар → вихід ───────────

/**
 * S2: Перегляд 2 постів, залишення коментаря до другого.
 *
 * Метрика: comment_duration (час від відправки коментаря до redirect-відповіді)
 */
export function scenario2(data) {
  const jar = http.cookieJar();

  group('S2: Login → Browse → Comment → Logout', () => {

    // Крок 1: Логін
    group('Step 1: Login', () => {
      const res = http.post(
        `${BASE_URL}/auth/login`,
        `email=${data.testEmail}&password=${data.testPass}`,
        postParams(jar)
      );
      const ok = check(res, {
        'S2.1 login ok': r => r.status === 200,
      });
      if (!ok) { failedRequests.add(1); successRate.add(false); return; }
      successRate.add(true);
    });

    sleep(1);

    // Крок 2: Список постів
    let firstSlug = '';
    let secondSlug = '';

    group('Step 2: Browse posts', () => {
      const start = Date.now();
      const res = http.get(`${BASE_URL}/posts`, getParams(jar));
      pageLoadDuration.add(Date.now() - start);

      check(res, { 'S2.2 posts list ok': r => r.status === 200 });

      // Витягуємо перші два slug
      const slugs = [...res.body.matchAll(/href="\/posts\/([^"]+?)"/g)].map(m => m[1]);
      if (slugs.length >= 1) firstSlug  = slugs[0];
      if (slugs.length >= 2) secondSlug = slugs[1];
      else if (slugs.length === 1) secondSlug = slugs[0];
    });

    sleep(1);

    // Крок 3: Перший пост
    if (firstSlug) {
      group('Step 3: Read first post', () => {
        const start = Date.now();
        const res = http.get(`${BASE_URL}/posts/${firstSlug}`, getParams(jar));
        pageLoadDuration.add(Date.now() - start);

        check(res, {
          'S2.3 first post ok': r => r.status === 200,
          'S2.3 has content':   r => r.body.includes('post-content'),
        });
      });
    }

    sleep(2); // Читання

    // Крок 4: Повернення на головну та відкриття іншого поста
    if (secondSlug) {
      group('Step 4: Open second post', () => {
        const start = Date.now();
        const res = http.get(`${BASE_URL}/posts/${secondSlug}`, getParams(jar));
        pageLoadDuration.add(Date.now() - start);

        check(res, {
          'S2.4 second post ok':    r => r.status === 200,
          'S2.4 has comments area': r => r.body.includes('comments'),
        });
      });

      sleep(1);

      // Крок 5: Залишити коментар
      group('Step 5: Post comment', () => {
        const start = Date.now();
        const res = http.post(
          `${BASE_URL}/posts/${secondSlug}/comments`,
          'content=k6+load+test+comment+%E2%80%94+automated',
          postParams(jar)
        );
        commentDuration.add(Date.now() - start);

        const ok = check(res, {
          'S2.5 comment posted (200 or 302)': r => r.status === 200 || r.status === 302,
        });
        if (!ok) { failedRequests.add(1); successRate.add(false); }
        else { successRate.add(true); }
      });
    }

    sleep(1);

    // Крок 6: Вихід
    group('Step 6: Logout', () => {
      http.post(`${BASE_URL}/auth/logout`, '', postParams(jar));
      successRate.add(true);
    });

  });

  sleep(1);
}

// ── Сценарій 3: Авторизація → Створення допису → Вихід ───────────────────────

/**
 * S3: Авторизований користувач відкриває форму, заповнює та створює новий запис.
 *
 * Метрика: post_create_duration (час від відправки форми до redirect-відповіді)
 */
export function scenario3(data) {
  const jar = http.cookieJar();

  group('S3: Login → Create Post → Logout', () => {

    // Крок 1: Логін
    group('Step 1: Login', () => {
      const res = http.post(
        `${BASE_URL}/auth/login`,
        `email=${data.testEmail}&password=${data.testPass}`,
        postParams(jar)
      );
      const ok = check(res, {
        'S3.1 login ok': r => r.status === 200,
      });
      if (!ok) { failedRequests.add(1); successRate.add(false); return; }
      successRate.add(true);
    });

    sleep(1);

    // Крок 2: Відкрити форму нового поста
    group('Step 2: Open new post form', () => {
      const start = Date.now();
      const res = http.get(`${BASE_URL}/posts/new`, getParams(jar));
      pageLoadDuration.add(Date.now() - start);

      const ok = check(res, {
        'S3.2 new post form ok':      r => r.status === 200,
        'S3.2 form has title input':  r => r.body.includes('id="title"') || r.body.includes("id='title'"),
      });
      if (!ok) { failedRequests.add(1); successRate.add(false); }
      else { successRate.add(true); }
    });

    sleep(2); // Імітація заповнення форми

    // Крок 3: Відправити форму (створити пост)
    group('Step 3: Submit post', () => {
      const ts    = Date.now();
      const title = `k6+Test+Post+${ts}`;
      const body  = 'This+post+was+created+by+k6+load+testing+tool+for+performance+validation+of+the+blog+application.';

      const start = Date.now();
      const res = http.post(
        `${BASE_URL}/posts`,
        `title=${title}&content=${body}`,
        postParams(jar)
      );
      postCreateDuration.add(Date.now() - start);

      const ok = check(res, {
        'S3.3 post created (200 or 302)': r => r.status === 200 || r.status === 302,
        'S3.3 no server error (not 5xx)': r => r.status < 500,
      });
      if (!ok) { failedRequests.add(1); successRate.add(false); }
      else { successRate.add(true); }
    });

    sleep(1);

    // Крок 4: Вихід
    group('Step 4: Logout', () => {
      http.post(`${BASE_URL}/auth/logout`, '', postParams(jar));
      successRate.add(true);
    });

  });

  sleep(1);
}

// ── Сценарій 4: Авторизація → Профіль → Оновлення → Вихід ───────────────────

/**
 * S4: Перегляд та редагування профілю.
 *
 * Метрика: profile_duration (час завантаження профілю та збереження змін)
 */
export function scenario4(data) {
  const jar = http.cookieJar();

  group('S4: Login → View Profile → Edit Profile → Logout', () => {

    // Крок 1: Логін
    group('Step 1: Login', () => {
      const res = http.post(
        `${BASE_URL}/auth/login`,
        `email=${data.testEmail}&password=${data.testPass}`,
        postParams(jar)
      );
      const ok = check(res, {
        'S4.1 login ok': r => r.status === 200,
      });
      if (!ok) { failedRequests.add(1); successRate.add(false); return; }
      successRate.add(true);
    });

    sleep(0.5);

    // Крок 2: Переглянути профіль
    group('Step 2: View profile', () => {
      const start = Date.now();
      const res = http.get(`${BASE_URL}/profile`, getParams(jar));
      profileDuration.add(Date.now() - start);
      pageLoadDuration.add(Date.now() - start);

      const ok = check(res, {
        'S4.2 profile page ok':       r => r.status === 200,
        'S4.2 has username element':  r => r.body.includes('profile-username'),
        'S4.2 has edit button':       r => r.body.includes('profile-actions'),
      });
      if (!ok) { failedRequests.add(1); successRate.add(false); }
      else { successRate.add(true); }
    });

    sleep(1);

    // Крок 3: Відкрити форму редагування
    group('Step 3: Open edit form', () => {
      const start = Date.now();
      const res = http.get(`${BASE_URL}/profile/edit`, getParams(jar));
      pageLoadDuration.add(Date.now() - start);

      const ok = check(res, {
        'S4.3 edit form ok':      r => r.status === 200,
        'S4.3 has bio input':     r => r.body.includes('id="bio"') || r.body.includes("id='bio'"),
      });
      if (!ok) { failedRequests.add(1); successRate.add(false); }
      else { successRate.add(true); }
    });

    sleep(2); // Час "редагування" форми

    // Крок 4: Зберегти зміни
    group('Step 4: Save profile', () => {
      const start = Date.now();
      const bio = `k6+load+test+bio+updated+at+${Date.now()}`;
      const res = http.post(
        `${BASE_URL}/profile/edit`,
        `username=${TEST_USER}&bio=${bio}`,
        postParams(jar)
      );
      profileDuration.add(Date.now() - start);

      const ok = check(res, {
        'S4.4 profile saved (200 or 302)': r => r.status === 200 || r.status === 302,
        'S4.4 no server error':            r => r.status < 500,
      });
      if (!ok) { failedRequests.add(1); successRate.add(false); }
      else { successRate.add(true); }
    });

    sleep(1);

    // Крок 5: Вихід
    group('Step 5: Logout', () => {
      http.post(`${BASE_URL}/auth/logout`, '', postParams(jar));
      successRate.add(true);
    });

  });

  sleep(1);
}

// ── Teardown ──────────────────────────────────────────────────────────────────

export function teardown(data) {
  // Нічого прибирати не потрібно — тестовий користувач залишається у БД
  console.log('Load test completed. Test user:', data.testEmail);
}
