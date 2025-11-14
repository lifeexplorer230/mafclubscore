/**
 * k6 Load Testing Script for MafClubScore
 *
 * Usage:
 *   k6 run tests/load/k6-load-test.js
 *
 * Options:
 *   - BASE_URL: Set via environment variable
 *   - Test stages: Ramp up, sustain, ramp down
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const apiResponseTime = new Trend('api_response_time');

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 10 },  // Ramp up to 10 users
    { duration: '1m', target: 50 },   // Ramp up to 50 users
    { duration: '2m', target: 50 },   // Stay at 50 users for 2 minutes
    { duration: '30s', target: 0 },   // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests must complete below 2s
    http_req_failed: ['rate<0.05'],    // Error rate must be below 5%
    errors: ['rate<0.1'],              // Custom error rate below 10%
  },
};

const BASE_URL = __ENV.BASE_URL || 'https://mafclubscore.vercel.app';

// Test scenarios
export default function () {
  // Scenario 1: Check version endpoint (lightest)
  testVersionEndpoint();
  sleep(1);

  // Scenario 2: Load rating page
  testRatingEndpoint();
  sleep(1);

  // Scenario 3: Load players list
  testPlayersEndpoint();
  sleep(1);

  // Scenario 4: Load day stats
  testDayStatsEndpoint();
  sleep(2);

  // Scenario 5: Load games list
  testGamesEndpoint();
  sleep(1);
}

function testVersionEndpoint() {
  const response = http.get(`${BASE_URL}/api/version`);

  const success = check(response, {
    'version status is 200': (r) => r.status === 200,
    'version has correct format': (r) => {
      const body = JSON.parse(r.body);
      return body.version && body.version.match(/^v\d+\.\d+\.\d+$/);
    },
    'version responds quickly': (r) => r.timings.duration < 500,
  });

  errorRate.add(!success);
  apiResponseTime.add(response.timings.duration);
}

function testRatingEndpoint() {
  const response = http.get(`${BASE_URL}/api/rating`);

  const success = check(response, {
    'rating status is 200': (r) => r.status === 200,
    'rating returns array': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body);
      } catch {
        return false;
      }
    },
    'rating responds in time': (r) => r.timings.duration < 3000,
  });

  errorRate.add(!success);
  apiResponseTime.add(response.timings.duration);
}

function testPlayersEndpoint() {
  const response = http.get(`${BASE_URL}/api/players`);

  const success = check(response, {
    'players status is 200': (r) => r.status === 200,
    'players returns array': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body);
      } catch {
        return false;
      }
    },
    'players data has id and name': (r) => {
      try {
        const body = JSON.parse(r.body);
        if (body.length === 0) return true;
        return body[0].id !== undefined && body[0].name !== undefined;
      } catch {
        return false;
      }
    },
  });

  errorRate.add(!success);
  apiResponseTime.add(response.timings.duration);
}

function testDayStatsEndpoint() {
  const today = new Date().toISOString().split('T')[0];
  const response = http.get(`${BASE_URL}/api/day-stats?date=${today}`);

  const success = check(response, {
    'day-stats status is 200': (r) => r.status === 200,
    'day-stats has required fields': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.date !== undefined &&
               body.total_games !== undefined &&
               body.mafia_wins !== undefined &&
               body.citizen_wins !== undefined;
      } catch {
        return false;
      }
    },
  });

  errorRate.add(!success);
  apiResponseTime.add(response.timings.duration);
}

function testGamesEndpoint() {
  const response = http.get(`${BASE_URL}/api/games`);

  const success = check(response, {
    'games status is 200': (r) => r.status === 200,
    'games returns array': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body);
      } catch {
        return false;
      }
    },
    'games have required fields': (r) => {
      try {
        const body = JSON.parse(r.body);
        if (body.length === 0) return true;
        const game = body[0];
        return game.game_id !== undefined &&
               game.game_date !== undefined;
      } catch {
        return false;
      }
    },
  });

  errorRate.add(!success);
  apiResponseTime.add(response.timings.duration);
}

// Teardown function - runs once after all iterations
export function teardown(data) {
  console.log('Load test completed');
}
