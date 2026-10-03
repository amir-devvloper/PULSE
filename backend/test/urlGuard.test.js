import test from 'node:test';
import assert from 'node:assert/strict';
import { isSafeUrl, isPrivateIp } from '../utils/urlGuard.js';

test('private and loopback IPs are detected', () => {
    for (const ip of ['127.0.0.1', '10.0.0.5', '192.168.1.1', '172.16.0.1', '169.254.169.254', '::1', '::ffff:127.0.0.1'])
        assert.equal(isPrivateIp(ip), true, ip);
    for (const ip of ['8.8.8.8', '1.1.1.1', '172.32.0.1']) assert.equal(isPrivateIp(ip), false, ip);
});

test('localhost and private URLs are rejected', async () => {
    delete process.env.ALLOW_PRIVATE_TARGETS;
    for (const u of ['http://localhost:3000', 'http://127.0.0.1', 'http://192.168.0.10/x', 'http://[::1]/'])
        assert.equal(await isSafeUrl(u), false, u);
});

test('public IP literal is allowed', async () => {
    assert.equal(await isSafeUrl('http://8.8.8.8/'), true);
});

test('override flag allows private targets', async () => {
    process.env.ALLOW_PRIVATE_TARGETS = 'true';
    assert.equal(await isSafeUrl('http://localhost:4000'), true);
    delete process.env.ALLOW_PRIVATE_TARGETS;
});
