/**
 * k6 Smoke Test — Blog App
 *
 * Мета: швидка перевірка що додаток взагалі відповідає.
 * 1 VU, 30 секунд. Запускається перед основним тестом.
 *
 * Запуск:
 *   k6 run load-tests/blog-smoke-test.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export const options = {
  vus:      1,
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(99)<3000'],
    http_req_failed:   ['rate<0.01'],
  },
};

export default function () {
  // Перевіряємо ключові сторінки
  const pages = [
    { url: `${BASE_URL}/posts`,             name: 'posts list'   },
    { url: `${BASE_URL}/auth/login`,        name: 'login page'   },
    { url: `${BASE_URL}/auth/register`,     name: 'register page'},
    { url: `${BASE_URL}/auth/forgot-password`, name: 'forgot pw' },
  ];

  for (const page of pages) {
    const res = http.get(page.url, { redirects: 5 });
    check(res, {
      [`${page.name} status 200`]: r => r.status === 200,
      [`${page.name} has content`]: r => r.body.length > 500,
    });
    sleep(0.5);
  }
}
