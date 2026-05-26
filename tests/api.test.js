import { describe, it } from 'node:test';
import assert from 'node:assert';

const BASE = 'http://localhost:8080';

describe('SafeFlow API', () => {
  it('GET /api/stadium-state returns sectors', async () => {
    const r = await fetch(`${BASE}/api/stadium-state`);
    assert.strictEqual(r.status, 200);
    const data = await r.json();
    assert.ok(data.sectors);
    assert.ok(data.sectors.A);
    assert.ok(data.sectors.D);
  });

  it('POST /api/incident validates input', async () => {
    const r = await fetch(`${BASE}/api/incident`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'invalid_type', sector: 'Z' })
    });
    assert.strictEqual(r.status, 400);
  });

  it('POST /api/incident accepts valid input', async () => {
    const r = await fetch(`${BASE}/api/incident`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'crowd_surge', sector: 'D' })
    });
    assert.strictEqual(r.status, 200);
    const data = await r.json();
    assert.ok(data.incident);
    assert.strictEqual(data.incident.type, 'crowd_surge');
  });

  it('POST /api/incident accepts valid input with custom description', async () => {
    const r = await fetch(`${BASE}/api/incident`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'lost_child', sector: 'F', description: 'Test custom description for lost child' })
    });
    assert.strictEqual(r.status, 200);
    const data = await r.json();
    assert.ok(data.incident);
    assert.strictEqual(data.incident.description, 'Test custom description for lost child');
  });

  it('GET /api/predict returns forecast data', async () => {
    const r = await fetch(`${BASE}/api/predict`);
    assert.strictEqual(r.status, 200);
    const data = await r.json();
    assert.ok(data.predictions);
    assert.ok(data.matchContext);
  });
});
