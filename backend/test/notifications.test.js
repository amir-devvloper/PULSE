import test from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';

process.env.DB_PATH = ':memory:';
process.env.JWT_SECRET = 'test';
delete process.env.SMTP_HOST;

const { db, initDb } = await import('../database/db.js');
initDb();
const svc = await import('../services/notificationService.js');
const { saveCheckResult } = await import('../services/checkService.js');

const user = db.prepare("INSERT INTO users (name, email, password_hash) VALUES ('Ada', 'ada@example.com', 'x')").run().lastInsertRowid;
const monitor = db.prepare("INSERT INTO monitors (user_id, name, url) VALUES (?, 'API', 'https://example.com')").run(user).lastInsertRowid;

// Minimal SMTP server that accepts one message and keeps what it received.
function fakeSmtp() {
    const received = [];
    const server = net.createServer(sock => {
        let data = '', inData = false;
        sock.write('220 fake ESMTP\r\n');
        sock.on('data', chunk => {
            const text = chunk.toString();
            if (inData) {
                data += text;
                if (data.endsWith('\r\n.\r\n')) { inData = false; received.push(data); data = ''; sock.write('250 OK\r\n'); }
                return;
            }
            for (const line of text.split('\r\n').filter(Boolean)) {
                const cmd = line.slice(0, 4).toUpperCase();
                if (cmd === 'EHLO') sock.write('250 fake\r\n');
                else if (cmd === 'DATA') { inData = true; sock.write('354 go\r\n'); }
                else if (cmd === 'QUIT') { sock.write('221 bye\r\n'); sock.end(); }
                else sock.write('250 OK\r\n');
            }
        });
    });
    return new Promise(r => server.listen(0, '127.0.0.1', () => r({ server, received, port: server.address().port })));
}

test('settings default to off and can be toggled', () => {
    assert.deepEqual(svc.getSettings(user), { emailAlerts: false, weeklyDigest: false, emailConfigured: false });
    const s = svc.updateSettings(user, { emailAlerts: true });
    assert.equal(s.emailAlerts, true);
    assert.equal(s.weeklyDigest, false);
});

test('without SMTP the alert is recorded as skipped', async () => {
    assert.equal(await svc.notifyDown(monitor, 'Timed out'), 'skipped');
    const [n] = svc.listNotifications(user);
    assert.equal(n.type, 'down');
    assert.equal(n.status, 'skipped');
});

test('no alert when the user has alerts turned off', async () => {
    svc.updateSettings(user, { emailAlerts: false });
    assert.equal(await svc.notifyDown(monitor, 'x'), null);
    svc.updateSettings(user, { emailAlerts: true });
});

test('alerts are emailed through SMTP when configured', async () => {
    const { server, received, port } = await fakeSmtp();
    process.env.SMTP_HOST = '127.0.0.1';
    process.env.SMTP_PORT = String(port);
    process.env.SMTP_FROM = 'pulse@example.com';
    try {
        assert.equal(await svc.notifyDown(monitor, 'Timed out after 5000ms'), 'sent');
        assert.equal(await svc.notifyRecovered(monitor, '2026-10-01 10:00:00'), 'sent');
        assert.equal(received.length, 2);
        assert.match(received[0], /Subject: \[PULSE\] API is down/);
        assert.match(received[0], /Timed out after 5000ms/);
        assert.match(received[1], /is back up/);
    } finally {
        delete process.env.SMTP_HOST;
        server.close();
    }
});

test('enabling the digest does not send one immediately; an old one is sent', async () => {
    svc.updateSettings(user, { weeklyDigest: true });
    assert.equal(await svc.sendDueDigests(), 0);

    saveCheckResult(monitor, { success: true, statusCode: 200, responseTime: 120 });
    db.prepare("UPDATE notification_settings SET last_digest_at = datetime('now', '-8 days') WHERE user_id = ?").run(user);
    assert.equal(await svc.sendDueDigests(), 1);
    assert.equal(await svc.sendDueDigests(), 0); // clock restarted

    const { text } = svc.buildDigest({ id: user, name: 'Ada' });
    assert.match(text, /Uptime: 100%/);
});

test('deleting the user removes their notifications', () => {
    db.prepare('DELETE FROM users WHERE id = ?').run(user);
    assert.equal(db.prepare('SELECT COUNT(*) n FROM notifications').get().n, 0);
    assert.equal(db.prepare('SELECT COUNT(*) n FROM notification_settings').get().n, 0);
});
