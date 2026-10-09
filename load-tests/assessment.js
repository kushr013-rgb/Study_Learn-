import http from 'k6/http';
import { check, sleep } from 'k6';

const baseUrl = __ENV.API_URL || 'http://localhost:4000/api/v1';
export const options = {
  scenarios: {
    concurrent_students: {
      executor: 'constant-vus',
      vus: Number(__ENV.VUS || 10),
      duration: __ENV.DURATION || '30s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<500'],
  },
};

export default function () {
  const health = http.get(`${baseUrl}/health/ready`);
  check(health, { 'readiness responds': (response) => response.status === 200 || response.status === 503 });

  const questions = http.get(`${baseUrl}/questions?status=Published&page=1&pageSize=20`);
  check(questions, { 'question list responds': (response) => response.status === 200 });
  sleep(1);
}
