import { describe, it } from 'node:test';
import assert from 'node:assert';

const BASE = 'http://127.0.0.1:8080';

// Retrieve auth token for test runner
async function getAuthToken(email, password) {
  const r = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await r.json();
  return data.token;
}

describe('SafeFlow API Security & Operations', () => {
  it('GET /api/stadium-state without auth returns 401', async () => {
    const r = await fetch(`${BASE}/api/stadium-state`);
    assert.strictEqual(r.status, 401);
  });

  it('POST /api/auth/login verifies correct credentials', async () => {
    const r = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'fan@safeflow.com', password: 'fan' })
    });
    assert.strictEqual(r.status, 200);
    const data = await r.json();
    assert.ok(data.token);
    assert.strictEqual(data.user.role, 'Fan');
  });

  it('POST /api/auth/register validates inputs and normalizes roles', async () => {
    // 1. Invalid email
    let r = await fetch(`${BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'invalid', password: 'pass', name: 'User' })
    });
    assert.strictEqual(r.status, 400);

    // 2. Short password
    r = await fetch(`${BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'valid@example.com', password: '123', name: 'User' })
    });
    assert.strictEqual(r.status, 400);

    const rand = Math.floor(Math.random() * 1000000);

    // 3. Successful Fan registration
    r = await fetch(`${BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: `newfan_${rand}@safeflow.com`, password: 'pass', name: 'New Fan', role: 'Fan' })
    });
    assert.strictEqual(r.status, 200);
    let data = await r.json();
    assert.ok(data.token);
    assert.strictEqual(data.user.role, 'Fan');

    // 4. Successful Officer registration (should normalize to Staff)
    r = await fetch(`${BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: `newofficer_${rand}@safeflow.com`, password: 'pass', name: 'New Officer', role: 'Officer' })
    });
    assert.strictEqual(r.status, 200);
    data = await r.json();
    assert.ok(data.token);
    assert.strictEqual(data.user.role, 'Staff');
  });

  it('GET /api/stadium-state with auth token succeeds', async () => {
    const token = await getAuthToken('fan@safeflow.com', 'fan');
    const r = await fetch(`${BASE}/api/stadium-state`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    assert.strictEqual(r.status, 200);
    const data = await r.json();
    assert.ok(data.sectors);
  });

  it('POST /api/incident validates malformed input', async () => {
    const token = await getAuthToken('staff@safeflow.com', 'staff');
    const r = await fetch(`${BASE}/api/incident`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ type: 'invalid_type', sector: 'Z' })
    });
    assert.strictEqual(r.status, 400);
  });

  it('POST /api/incident allows Fan to report women_sos', async () => {
    const token = await getAuthToken('fan@safeflow.com', 'fan');
    const r = await fetch(`${BASE}/api/incident`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ type: 'women_sos', sector: 'E' })
    });
    assert.strictEqual(r.status, 200);
    const data = await r.json();
    assert.strictEqual(data.incident.type, 'women_sos');
  });

  it('POST /api/incident blocks Fan from simulating crowd_surge', async () => {
    const token = await getAuthToken('fan@safeflow.com', 'fan');
    const r = await fetch(`${BASE}/api/incident`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ type: 'crowd_surge', sector: 'D' })
    });
    assert.strictEqual(r.status, 403);
  });

  it('GET /api/predict returns forecast data', async () => {
    const token = await getAuthToken('fan@safeflow.com', 'fan');
    const r = await fetch(`${BASE}/api/predict`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    assert.strictEqual(r.status, 200);
    const data = await r.json();
    assert.ok(data.predictions);
  });

  it('Verify two-phase incident propagation and overrides', async () => {
    const staffToken = await getAuthToken('staff@safeflow.com', 'staff');
    
    // Clear state first
    await fetch(`${BASE}/api/incident`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${staffToken}`
      },
      body: JSON.stringify({ type: 'clear' })
    });

    // 1. Simulate medical emergency in B. Sector B status should remain "Normal"
    let r = await fetch(`${BASE}/api/incident`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${staffToken}`
      },
      body: JSON.stringify({ type: 'medical_emergency', sector: 'B' })
    });
    assert.strictEqual(r.status, 200);
    
    // Query state immediately. Sector status should be Normal (not Medical Alert)
    r = await fetch(`${BASE}/api/stadium-state`, {
      headers: { 'Authorization': `Bearer ${staffToken}` }
    });
    let state = await r.json();
    assert.strictEqual(state.sectors.B.status, 'Normal');

    // 2. Trigger analysis to generate pending approval
    await fetch(`${BASE}/api/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${staffToken}`
      },
      body: JSON.stringify({ startSector: 'B', destSector: 'A', userType: 'general' })
    });

    // Verify pending safety action is stored
    r = await fetch(`${BASE}/api/pending-approval`, {
      headers: { 'Authorization': `Bearer ${staffToken}` }
    });
    let pending = await r.json();
    assert.ok(pending.pending);
    assert.strictEqual(pending.action.location, 'B');

    // 3. Authorize with overrides (e.g. priority: 'Critical', stewards: 42)
    r = await fetch(`${BASE}/api/approve-action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${staffToken}`
      },
      body: JSON.stringify({ 
        approved: true,
        stewards: 42,
        priority: 'Critical',
        responseNotes: 'Overriding to Critical'
      })
    });
    assert.strictEqual(r.status, 200);
    let approvedResult = await r.json();
    assert.strictEqual(approvedResult.resourcesRequired.stewards, 42);
    assert.strictEqual(approvedResult.severity, 'Critical');

    // Verify Sector B is now highlighted as "Medical Alert"
    r = await fetch(`${BASE}/api/stadium-state`, {
      headers: { 'Authorization': `Bearer ${staffToken}` }
    });
    state = await r.json();
    assert.strictEqual(state.sectors.B.status, 'Medical Alert');
  });
});
