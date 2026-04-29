/**
 * k6 Stress Test — Blog App
 *
 * Мета: знайти точку відмови додатку при поступовому збільшенні навантаження.
 * Поступово збільшуємо від 5 до 50 VU.
 *
 * Запуск:
 *   k6 run load-tests/blog-stress-test.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const BASE_URL   = __ENV.BASE_URL   || 'http://localhost:3000';
const TEST_EMAIL = __ENV.TEST_EMAIL || 'k6_load_test@example.com';
const TEST_PASS  = __ENV.TEST_PASS  || 'K6LoadPass123!';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '1m',  target: 5  }, // Нормальне навантаження
    { duration: '2m',  target: 10 }, // Подвійне навантаження
    { duration: '2m',  target: 20 }, // 4x навантаження
    { duration: '2m',  target: 30 }, // Пошук точки відмови
    { duration: '1m',  target: 0  }, // Спад навантаження
  ],
  thresholds: {
    http_req_duration: ['p(95)<5000'], // При стрес-тесті допускаємо до 5с
    http_req_failed:   ['rate<0.15'],  // До 15% відмов при стресі
    errors:            ['rate<0.15'],
  },
};

export default function () {
  const jar = http.cookieJar();
  const params = {
    cookieJar: jar,
    redirects: 5,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  };

  // Спрощений сценарій: логін → список постів → вихід
  const loginRes = http.post(
    `${BASE_URL}/auth/login`,
    `email=${TEST_EMAIL}&password=${TEST_PASS}`,
    params
  );

  const loginOk = check(loginRes, {
    'login status 200': r => r.status === 200,
  });
  errorRate.add(!loginOk);

  if (loginOk) {
    sleep(0.3);

    const listRes = http.get(`${BASE_URL}/posts`, { cookieJar: jar, redirects: 5 });
    const listOk = check(listRes, {
      'posts list 200': r => r.status === 200,
    });
    errorRate.add(!listOk);

    sleep(0.3);
    http.post(`${BASE_URL}/auth/logout`, '', params);
  }

  sleep(0.5);
}
