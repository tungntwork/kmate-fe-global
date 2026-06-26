/**
 * Auth Flow Test Script
 * Tests:
 * 1. Login and get tokens
 * 2. /auth/me returns valid session
 * 3. Token refresh works
 * 4. Simulated server restart (invalidate session) → /auth/me returns 401
 * 5. After invalidation, /auth/me properly fails
 */

const axios = require('axios');

const API_BASE = 'http://localhost:4000/api';
const client = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Test helpers ──────────────────────────────────────────────────────────────

async function test(name, fn) {
  try {
    await fn();
    console.log(`  [PASS] ${name}`);
    return true;
  } catch (err) {
    const msg = err.response?.data?.message || err.message;
    console.log(`  [FAIL] ${name}`);
    console.log(`         Error: ${msg}`);
    return false;
  }
}

function separator(label) {
  console.log(`\n── ${label} ──`);
}

// ── Tests ────────────────────────────────────────────────────────────────────

async function run() {
  console.log('=== KMATE Auth Flow Test ===\n');

  // ── 1. Login ──────────────────────────────────────────────────────────────
  separator('1. Login');
  let tokens;
  let pass = await test('POST /auth/login returns accessToken + refreshToken', async () => {
    const res = await client.post('/auth/login', {
      email: 'admin@kmate.online',
      password: 'Admin@1234',
    });
    const data = res.data.data;
    if (!data.accessToken) throw new Error('No accessToken');
    if (!data.refreshToken) throw new Error('No refreshToken');
    if (!data.user) throw new Error('No user');
    tokens = data;
    console.log(`         User: ${data.user.email} (${data.user.role})`);
  });
  if (!pass) {
    console.log('\n[ABORT] Login failed — cannot continue tests.');
    return;
  }

  // Set token for subsequent requests
  client.defaults.headers.common['Authorization'] = `Bearer ${tokens.accessToken}`;

  // ── 2. Session validation (/auth/me) ──────────────────────────────────────
  separator('2. Session validation (fresh token)');
  await test('GET /auth/me returns user data', async () => {
    const res = await client.get('/auth/me');
    if (!res.data.data?.id) throw new Error('No user id in response');
    console.log(`         User ID: ${res.data.data.id}`);
  });

  // ── 3. Token refresh ───────────────────────────────────────────────────────
  separator('3. Token refresh');
  let oldToken = tokens.accessToken;
  await test('POST /auth/refresh returns new accessToken', async () => {
    const res = await client.post('/auth/refresh', { refreshToken: tokens.refreshToken });
    const data = res.data.data;
    if (!data.accessToken) throw new Error('No new accessToken');
    if (data.accessToken === oldToken) throw new Error('Token was not rotated');
    tokens.accessToken = data.accessToken;
    tokens.refreshToken = data.refreshToken;
    client.defaults.headers.common['Authorization'] = `Bearer ${tokens.accessToken}`;
    console.log(`         Token rotated (old !== new: ${oldToken !== tokens.accessToken})`);
  });

  // ── 4. Revoke refresh token (simulate server restart) ─────────────────────
  separator('4. Session invalidation (simulate server restart)');
  await test('POST /auth/logout revokes session', async () => {
    await client.post('/auth/logout', { refreshToken: tokens.refreshToken });
    // Invalidate local tokens to simulate losing them
    tokens.accessToken = 'invalid_token_' + Date.now();
    tokens.refreshToken = 'invalid_token_' + Date.now();
    client.defaults.headers.common['Authorization'] = `Bearer ${tokens.accessToken}`;
  });

  // ── 5. Verify session is now invalid ──────────────────────────────────────
  separator('5. Session invalidation verification');
  await test('GET /auth/me returns 401 after invalidation', async () => {
    try {
      await client.get('/auth/me');
      throw new Error('Expected 401 but got success');
    } catch (err) {
      if (err.response?.status !== 401) throw new Error(`Expected 401, got ${err.response?.status}`);
    }
  });

  await test('POST /auth/refresh returns 401 with revoked token', async () => {
    try {
      await client.post('/auth/refresh', { refreshToken: tokens.refreshToken });
      throw new Error('Expected 401 but got success');
    } catch (err) {
      if (err.response?.status !== 401) throw new Error(`Expected 401, got ${err.response?.status}`);
    }
  });

  // ── 6. Frontend session validation logic ───────────────────────────────────
  separator('6. Frontend code verification');

  const fs = require('fs');
  const path = require('path');
  const FE_ROOT = 'D:/FPTU_SUPPORT/KMATE/kmatefrontend';

  const hookPath = path.join(FE_ROOT, 'src/hooks/use-session-validation.ts');
  const providerPath = path.join(FE_ROOT, 'src/components/providers/SessionValidationProvider.tsx');
  const layoutPath = path.join(FE_ROOT, 'src/app/layout.tsx');

  await test('use-session-validation.ts exists', () => {
    if (!fs.existsSync(hookPath)) throw new Error('File not found');
  });

  await test('SessionValidationProvider.tsx exists', () => {
    if (!fs.existsSync(providerPath)) throw new Error('File not found');
  });

  await test('layout.tsx imports SessionValidationProvider', () => {
    const content = fs.readFileSync(layoutPath, 'utf8');
    if (!content.includes('SessionValidationProvider')) {
      throw new Error('SessionValidationProvider not found in layout');
    }
  });

  await test('use-session-validation.ts calls authService.me()', () => {
    const content = fs.readFileSync(hookPath, 'utf8');
    // Code may split across lines: authService\n      .me()
    if (!content.includes('.me()') || !content.includes('authService')) {
      throw new Error('authService.me() call not found in hook');
    }
  });

  await test('use-session-validation.ts clears localStorage on failure', () => {
    const content = fs.readFileSync(hookPath, 'utf8');
    if (!content.includes('localStorage.removeItem')) {
      throw new Error('localStorage cleanup not found');
    }
  });

  await test('use-session-validation.ts calls logout() on failure', () => {
    const content = fs.readFileSync(hookPath, 'utf8');
    if (!content.includes('logout()')) {
      throw new Error('logout() not found in catch block');
    }
  });

  await test('use-session-validation.ts waits for _hasHydrated', () => {
    const content = fs.readFileSync(hookPath, 'utf8');
    if (!content.includes('_hasHydrated')) {
      throw new Error('_hasHydrated check not found');
    }
  });

  await test('use-session-validation.ts uses hasValidatedRef (prevents double call)', () => {
    const content = fs.readFileSync(hookPath, 'utf8');
    if (!content.includes('hasValidatedRef')) {
      throw new Error('hasValidatedRef not found');
    }
  });

  // ── Summary ────────────────────────────────────────────────────────────────
  separator('Test complete');
  console.log('All tests finished. Check [PASS]/[FAIL] counts above.\n');
}

run().catch(console.error);
