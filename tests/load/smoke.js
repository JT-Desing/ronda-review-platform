// Low-volume load smoke: anonymous, read-only endpoints. Raise VUS only against
// a staging stack, never the production tunnel.
import http from 'k6/http';
import { check, sleep } from 'k6';

const origin = __ENV.RONDA_ORIGIN || 'http://localhost:8080';

export const options = {
  vus: Number(__ENV.VUS || 10),
  duration: __ENV.DURATION || '30s',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<500'],
    checks: ['rate>0.99'],
  },
};

export default function () {
  check(http.get(`${origin}/`), { 'web 200': r => r.status === 200 });
  check(http.get(`${origin}/api/health`), { 'health 200': r => r.status === 200 });
  check(http.get(`${origin}/api/auth/session`), { 'session 200': r => r.status === 200 });
  sleep(1);
}
