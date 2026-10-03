import test from 'node:test';
import assert from 'node:assert/strict';

process.env.DB_PATH = ':memory:';
process.env.JWT_SECRET = 'test-secret';
process.env.ALLOW_PRIVATE_TARGETS = 'true';
delete process.env.SMTP_HOST;
delete process.env.CORS_ORIGINS;
delete process.env.FAILURE_THRESHOLD;

const { db, initDb } = await import('../database/db.js');
initDb();
const { createApp } = await import('../app.js');
const { createResetToken } = await import('../services/passwordResetService.js');
const { runCheck } = await import('../workers/checkWorker.js');

const server = createApp().listen(0);
const base = `http://127.0.0.1:${server.address().port}`;
test.after(() => server.close());

// Tiny client that keeps the auth cookie between calls.
function client() {
    let cookie = '';
    return {
        get cookie() { return cookie; },
        set cookie(v) { cookie = v; },
        async call(method, path, body) {
            const res = await fetch(base + path, {
                method,
                headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
                body: body ? JSON.stringify(body) : undefined
            });
            const set = res.headers.getSetCookie().find(c => c.startsWith('pulse_token='));
            if (set) cookie = set.split(';')[0];
            return { status: res.status, headers: res.headers, data: await res.json().catch(() => ({})) };
        }
    };
}

const A = { name: 'Ada', email: 'ada@example.com', password: 'password123' };

test('security headers are set and CORS is closed by default', async () => {
    const res = await fetch(base + '/login.html', { headers: { Origin: 'https://evil.example' } });
    assert.match(res.headers.get('content-security-policy'), /script-src 'self'/);
    assert.equal(res.headers.get('access-control-allow-origin'), null);
});

test('signup, session and protected routes', async () => {
    const c = client();
    assert.equal((await c.call('GET', '/api/monitors')).status, 401);
    assert.equal((await c.call('POST', '/api/auth/signup', A)).status, 201);
    assert.equal((await c.call('GET', '/api/auth/me')).data.user.email, A.email);
    assert.equal((await c.call('GET', '/api/monitors')).status, 200);
    assert.equal((await c.call('POST', '/api/auth/signup', A)).status, 409);
});

test('changing the password signs out other sessions but not this one', async () => {
    const other = client();
    assert.equal((await other.call('POST', '/api/auth/login', A)).status, 200);
    const me = client();
    await me.call('POST', '/api/auth/login', A);

    const r = await me.call('PUT', '/api/auth/password', { currentPassword: A.password, newPassword: 'brandnew456' });
    assert.equal(r.status, 200);
    assert.equal((await me.call('GET', '/api/auth/me')).status, 200);
    assert.equal((await other.call('GET', '/api/auth/me')).status, 401);

    A.password = 'brandnew456';
});

test('forgot password: same answer for unknown emails, reset works once', async () => {
    const c = client();
    const known = await c.call('POST', '/api/auth/forgot', { email: A.email });
    const unknown = await c.call('POST', '/api/auth/forgot', { email: 'nobody@example.com' });
    assert.equal(known.status, 200);
    assert.deepEqual(known.data, unknown.data);

    const userId = db.prepare('SELECT id FROM users WHERE email = ?').get(A.email).id;
    const session = client();
    await session.call('POST', '/api/auth/login', A);

    const token = createResetToken(userId);
    assert.equal((await c.call('POST', '/api/auth/reset', { token, password: 'short' })).status, 400);
    assert.equal((await c.call('POST', '/api/auth/reset', { token: 'wrong', password: 'resetpass789' })).status, 400);
    assert.equal((await c.call('POST', '/api/auth/reset', { token, password: 'resetpass789' })).status, 200);
    assert.equal((await c.call('POST', '/api/auth/reset', { token, password: 'another12345' })).status, 400); // single use

    assert.equal((await session.call('GET', '/api/auth/me')).status, 401); // old session is gone
    assert.equal((await client().call('POST', '/api/auth/login', { ...A, password: 'resetpass789' })).status, 200);
    A.password = 'resetpass789';
});

test('expired reset tokens are rejected', async () => {
    const userId = db.prepare('SELECT id FROM users WHERE email = ?').get(A.email).id;
    const token = createResetToken(userId);
    db.prepare("UPDATE password_resets SET expires_at = datetime('now', '-1 minute') WHERE user_id = ?").run(userId);
    const r = await client().call('POST', '/api/auth/reset', { token, password: 'doesntmatter1' });
    assert.equal(r.status, 400);
});

test('a deleted account can no longer use its old cookie', async () => {
    const c = client();
    await c.call('POST', '/api/auth/signup', { name: 'Tmp', email: 'tmp@example.com', password: 'password123' });
    assert.equal((await c.call('DELETE', '/api/auth/me', { password: 'password123' })).status, 204);
    const stale = client();
    stale.cookie = c.cookie;
    assert.equal((await stale.call('GET', '/api/auth/me')).status, 401);
});

test('an incident opens only after consecutive failures, and resolves on recovery', async () => {
    const userId = db.prepare('SELECT id FROM users WHERE email = ?').get(A.email).id;
    const dead = db.prepare("INSERT INTO monitors (user_id, name, url, timeout_ms) VALUES (?, 'Dead', 'http://127.0.0.1:9/', 1000)").run(userId).lastInsertRowid;
    const monitor = db.prepare('SELECT * FROM monitors WHERE id = ?').get(dead);
    const incidents = () => db.prepare('SELECT * FROM incidents WHERE monitor_id = ?').all(dead);

    await runCheck(monitor);
    assert.equal(incidents().length, 0, 'one failure is not an incident');
    await runCheck(monitor);
    assert.equal(incidents().length, 1);
    assert.equal(incidents()[0].status, 'ongoing');
    await runCheck(monitor);
    assert.equal(incidents().length, 1, 'no duplicate incident');

    // bring it back: point at the app itself, expecting a 200
    db.prepare('UPDATE monitors SET url = ?, expected_status = 200 WHERE id = ?').run(base + '/login.html', dead);
    await runCheck(db.prepare('SELECT * FROM monitors WHERE id = ?').get(dead));
    assert.equal(incidents()[0].status, 'resolved');
});
