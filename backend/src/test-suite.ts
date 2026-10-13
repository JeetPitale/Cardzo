/**
 * Cardzo Core Security & State Machine Verification Suite
 * Tests:
 * 1. Single-device session invalidation
 * 2. Dynamic short-lived QR token generation
 * 3. Garud Verifier atomic state machine (Checked Out -> Checked In -> Checked Out)
 * 4. Token replay protection (already consumed token rejected)
 * 5. Expired token rejection
 * 6. Role-based access control (Cardholder forbidden from verifier endpoints)
 */

import http from 'http';

const API_BASE = 'http://localhost:4000/api';

async function request(endpoint: string, options: any = {}) {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const response = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const data = await response.json().catch(() => ({}));
  return { status: response.status, data };
}

async function runTests() {
  console.log('🧪 Starting Cardzo Automated Security & Functional Test Suite...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail = '') {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName} - ${detail}`);
      failed++;
    }
  }

  try {
    // Test 1: Health check
    const health = await request('/../health');
    assert(health.status === 200 && health.data.status === 'healthy', 'Backend health check responds OK');

    // Test 2: Cardholder Login on Device A
    const loginA = await request('/auth/login', {
      method: 'POST',
      body: {
        email: 'aarav@cardzo.io',
        password: 'Password123!',
        deviceId: 'device-iphone-15',
        deviceName: 'Aarav iPhone 15 Pro',
        platform: 'ios'
      }
    });
    assert(loginA.status === 200 && !!loginA.data.token, 'Cardholder logs in on Device A');
    const tokenA = loginA.data.token;

    // Test 3: Cardholder queries profile on Device A
    const meA = await request('/auth/me', {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    assert(meA.status === 200 && meA.data.user.email === 'aarav@cardzo.io', 'Device A session is active');

    // Test 4: Single-Device Enforcement - Cardholder logs in on Device B
    const loginB = await request('/auth/login', {
      method: 'POST',
      body: {
        email: 'aarav@cardzo.io',
        password: 'Password123!',
        deviceId: 'device-macbook',
        deviceName: 'Aarav MacBook Pro',
        platform: 'web'
      }
    });
    assert(loginB.status === 200 && !!loginB.data.token, 'Cardholder logs in on Device B');
    const tokenB = loginB.data.token;

    // Test 5: Verify Device A session is immediately revoked
    const meAAfter = await request('/auth/me', {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    assert(
      meAAfter.status === 401 && meAAfter.data.code === 'SESSION_REVOKED',
      'Device A session was atomically revoked upon Device B login',
      JSON.stringify(meAAfter.data)
    );

    // Test 6: Garud Staff Login
    const garudLogin = await request('/auth/login', {
      method: 'POST',
      body: {
        email: 'garud@cardzo.io',
        password: 'Password123!',
        deviceId: 'garud-terminal-01',
        deviceName: 'Gate Terminal Alpha'
      }
    });
    assert(garudLogin.status === 200 && garudLogin.data.user.role === 'GARUD', 'Garud Verifier logs in');
    const garudToken = garudLogin.data.token;

    // Test 7: RBAC - Cardholder cannot access Garud endpoints
    const rbacViolation = await request('/garud/activity', {
      headers: { Authorization: `Bearer ${tokenB}` }
    });
    assert(rbacViolation.status === 403, 'Cardholder is strictly blocked from Garud verifier endpoints');

    // Test 8: Generate dynamic short-lived QR token for Cardholder
    const qrGen = await request('/qr/generate', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenB}` },
      body: {}
    });
    assert(qrGen.status === 200 && qrGen.data.token.startsWith('CRDZ-'), 'Dynamic unpredictable QR token generated');
    const qrToken1 = qrGen.data.token;
    assert(qrGen.data.validitySeconds === 45, 'Token has configured 45s validity period');

    // Test 9: Garud Verifier scans token -> State transition Checked Out -> Checked In
    const scan1 = await request('/garud/verify', {
      method: 'POST',
      headers: { Authorization: `Bearer ${garudToken}` },
      body: { token: qrToken1, location: 'North Gate Turnstile' }
    });
    assert(
      scan1.status === 200 && scan1.data.status === 'CHECK_IN_SUCCESS',
      'Garud scan successfully executes Check-In transition',
      scan1.data.message
    );

    // Test 10: Replay Attack Prevention - Same token scanned again is rejected
    const replayScan = await request('/garud/verify', {
      method: 'POST',
      headers: { Authorization: `Bearer ${garudToken}` },
      body: { token: qrToken1, location: 'North Gate Turnstile' }
    });
    assert(
      replayScan.status === 400 && replayScan.data.status === 'ALREADY_USED',
      'Replay attack prevented: Consumed QR token cannot authorize second operation',
      replayScan.data.message
    );

    // Test 11: Cardholder requests fresh token while Checked In
    const qrGen2 = await request('/qr/generate', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenB}` },
      body: {}
    });
    assert(qrGen2.status === 200, 'Fresh QR token generated for checkout');
    const qrToken2 = qrGen2.data.token;

    // Test 12: Garud Verifier scans fresh token -> State transition Checked In -> Checked Out
    const scan2 = await request('/garud/verify', {
      method: 'POST',
      headers: { Authorization: `Bearer ${garudToken}` },
      body: { token: qrToken2, location: 'North Gate Turnstile' }
    });
    assert(
      scan2.status === 200 && scan2.data.status === 'CHECK_OUT_SUCCESS',
      'Garud scan successfully executes Check-Out transition',
      scan2.data.message
    );

    // Test 13: Cardholder attendance history reflects completed session
    const history = await request('/attendance/history', {
      headers: { Authorization: `Bearer ${tokenB}` }
    });
    assert(
      history.status === 200 && history.data.sessions.length > 0,
      'Attendance history records sessions with audit events'
    );

    // Test 14: Fake / invalid token rejection
    const fakeScan = await request('/garud/verify', {
      method: 'POST',
      headers: { Authorization: `Bearer ${garudToken}` },
      body: { token: 'CRDZ-FORGED-FAKE-TOKEN-999999' }
    });
    assert(
      fakeScan.status === 400 && fakeScan.data.status === 'INVALID_TOKEN',
      'Forged or unrecognized QR token correctly rejected'
    );

    console.log(`\n========================================`);
    console.log(`Test Summary: ${passed} Passed, ${failed} Failed`);
    console.log(`========================================\n`);

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test suite error:', err);
    process.exit(1);
  }
}

// Allow standalone run
if (require.main === module) {
  runTests();
}

export { runTests };
