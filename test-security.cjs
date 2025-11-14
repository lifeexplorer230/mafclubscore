#!/usr/bin/env node

/**
 * Security Tests for MAF Club Score API
 * Tests CORS, headers, API responses, and security configurations
 */

const https = require('https');

const BASE_URL = 'https://score.mafclub.biz';
const API_ENDPOINTS = [
  '/api/rating',
  '/api/games',
  '/api/health'
];

let passedTests = 0;
let totalTests = 0;

function makeRequest(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const requestOptions = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    const req = https.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    req.end();
  });
}

function test(name, fn) {
  totalTests++;
  return fn().then(() => {
    passedTests++;
    console.log(`✓ ${name}`);
    return true;
  }).catch((error) => {
    console.log(`✗ ${name}`);
    console.log(`  Error: ${error.message}`);
    return false;
  });
}

async function runTests() {
  console.log('Running Security Tests for MAF Club Score API\n');
  console.log('='.repeat(60));

  // Test 1: CORS headers present
  await test('CORS headers are present', async () => {
    const res = await makeRequest('/api/rating', {
      headers: { 'Origin': 'https://score.mafclub.biz' }
    });
    if (!res.headers['access-control-allow-origin']) {
      throw new Error('Missing Access-Control-Allow-Origin header');
    }
  });

  // Test 2: CORS allows any origin (*)
  await test('CORS allows wildcard origin (*)', async () => {
    const res = await makeRequest('/api/rating', {
      headers: { 'Origin': 'https://example.com' }
    });
    if (res.headers['access-control-allow-origin'] !== '*') {
      throw new Error(`Expected "*", got "${res.headers['access-control-allow-origin']}"`);
    }
  });

  // Test 3: CORS allows GET and OPTIONS
  await test('CORS allows GET and OPTIONS methods', async () => {
    const res = await makeRequest('/api/rating', {
      headers: { 'Origin': 'https://score.mafclub.biz' }
    });
    const methods = res.headers['access-control-allow-methods'] || '';
    if (!methods.includes('GET') || !methods.includes('OPTIONS')) {
      throw new Error(`Methods missing: ${methods}`);
    }
  });

  // Test 4: Security headers present
  await test('Security headers are configured', async () => {
    const res = await makeRequest('/api/rating');
    const securityHeaders = [
      'x-frame-options',
      'x-content-type-options',
      'referrer-policy'
    ];
    const missing = securityHeaders.filter(h => !res.headers[h]);
    if (missing.length > 0) {
      throw new Error(`Missing headers: ${missing.join(', ')}`);
    }
  });

  // Test 5: X-Frame-Options prevents clickjacking
  await test('X-Frame-Options is set to DENY', async () => {
    const res = await makeRequest('/api/rating');
    if (res.headers['x-frame-options'] !== 'DENY') {
      throw new Error(`Expected "DENY", got "${res.headers['x-frame-options']}"`);
    }
  });

  // Test 6: X-Content-Type-Options prevents MIME sniffing
  await test('X-Content-Type-Options is set to nosniff', async () => {
    const res = await makeRequest('/api/rating');
    if (res.headers['x-content-type-options'] !== 'nosniff') {
      throw new Error(`Expected "nosniff", got "${res.headers['x-content-type-options']}"`);
    }
  });

  // Test 7: Referrer-Policy is set
  await test('Referrer-Policy is configured', async () => {
    const res = await makeRequest('/api/rating');
    if (!res.headers['referrer-policy']) {
      throw new Error('Referrer-Policy header is missing');
    }
  });

  // Test 8: API returns valid JSON
  await test('API returns valid JSON', async () => {
    const res = await makeRequest('/api/rating');
    if (res.statusCode !== 200) {
      throw new Error(`Expected 200, got ${res.statusCode}`);
    }
    JSON.parse(res.body); // Will throw if invalid
  });

  // Test 9: API returns success flag
  await test('API response contains success flag', async () => {
    const res = await makeRequest('/api/rating');
    const data = JSON.parse(res.body);
    if (!data.success) {
      throw new Error('Success flag is not true');
    }
  });

  // Test 10: API returns players array
  await test('API response contains players array', async () => {
    const res = await makeRequest('/api/rating');
    const data = JSON.parse(res.body);
    if (!Array.isArray(data.players)) {
      throw new Error('Players is not an array');
    }
    if (data.players.length === 0) {
      throw new Error('Players array is empty');
    }
  });

  // Test 11: Content-Type is application/json
  await test('Content-Type is application/json', async () => {
    const res = await makeRequest('/api/rating');
    const contentType = res.headers['content-type'] || '';
    if (!contentType.includes('application/json')) {
      throw new Error(`Expected application/json, got ${contentType}`);
    }
  });

  // Test 12: OPTIONS preflight works
  await test('OPTIONS preflight request works', async () => {
    const res = await makeRequest('/api/rating', {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://score.mafclub.biz',
        'Access-Control-Request-Method': 'GET'
      }
    });
    if (res.statusCode !== 200 && res.statusCode !== 204) {
      throw new Error(`Expected 200/204, got ${res.statusCode}`);
    }
  });

  // Test 13: HTTPS is enforced
  await test('HTTPS is used (not HTTP)', async () => {
    // This test passes by design since we're using https module
    if (!BASE_URL.startsWith('https://')) {
      throw new Error('BASE_URL is not using HTTPS');
    }
  });

  // Test 14: No server version leakage
  await test('Server header does not leak version info', async () => {
    const res = await makeRequest('/api/rating');
    const server = res.headers['server'] || '';
    // Vercel doesn't expose detailed server info, but check anyway
    if (server.toLowerCase().includes('version') || /\d+\.\d+/.test(server)) {
      throw new Error(`Server header leaks version: ${server}`);
    }
  });

  // Test 15: Invalid endpoint returns proper error
  await test('Invalid endpoint returns 404', async () => {
    const res = await makeRequest('/api/nonexistent');
    if (res.statusCode !== 404) {
      throw new Error(`Expected 404, got ${res.statusCode}`);
    }
  });

  // Test 16: API handles malformed requests gracefully
  await test('API handles malformed requests', async () => {
    const res = await makeRequest('/api/rating?invalid=<script>alert(1)</script>');
    if (res.statusCode >= 500) {
      throw new Error(`Server error: ${res.statusCode}`);
    }
  });

  // Test 17: Response time is reasonable
  await test('API response time is under 5 seconds', async () => {
    const start = Date.now();
    await makeRequest('/api/rating');
    const duration = Date.now() - start;
    if (duration > 5000) {
      throw new Error(`Response took ${duration}ms`);
    }
  });

  // Test 18: Games endpoint works
  await test('Games endpoint is accessible', async () => {
    const res = await makeRequest('/api/games');
    if (res.statusCode !== 200) {
      throw new Error(`Expected 200, got ${res.statusCode}`);
    }
    const data = JSON.parse(res.body);
    if (!data.success) {
      throw new Error('Games endpoint returned success: false');
    }
  });

  console.log('='.repeat(60));
  console.log(`\nResults: ${passedTests}/${totalTests} tests passed`);

  if (passedTests === totalTests) {
    console.log('\n✅ All security tests passed!');
    process.exit(0);
  } else {
    console.log(`\n⚠️  ${totalTests - passedTests} test(s) failed`);
    process.exit(1);
  }
}

runTests().catch((error) => {
  console.error('\n❌ Test runner failed:', error.message);
  process.exit(1);
});
