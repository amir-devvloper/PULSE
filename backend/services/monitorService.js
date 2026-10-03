import { db } from '../database/db.js';
import { isSafeUrl } from '../utils/urlGuard.js';

export function createMonitor(userId, d) {
    const r = db.prepare(
        `INSERT INTO monitors (user_id, name, url, method, interval_seconds, expected_status, timeout_ms)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(userId, d.monitorName, d.url, d.method, d.interval, d.expectedStatus, d.timeout);
    return getMonitorById(userId, r.lastInsertRowid);
}

export function getMonitors(userId) {
    return db.prepare(
        `SELECT m.*,
            (SELECT is_success FROM checks WHERE monitor_id = m.id ORDER BY id DESC LIMIT 1) AS last_success,
            (SELECT response_time FROM checks WHERE monitor_id = m.id ORDER BY id DESC LIMIT 1) AS last_response_time,
            (SELECT ROUND(100.0 * SUM(is_success) / COUNT(*), 2) FROM checks
                WHERE monitor_id = m.id AND checked_at >= datetime('now', '-24 hours')) AS uptime_24h
         FROM monitors m WHERE m.user_id = ? ORDER BY m.created_at DESC, m.id DESC`
    ).all(userId);
}

export function getMonitorById(userId, id) {
    return db.prepare('SELECT * FROM monitors WHERE id = ? AND user_id = ?').get(id, userId) || null;
}

export function updateMonitor(userId, id, d) {
    const map = {
        monitorName: 'name', url: 'url', method: 'method', interval: 'interval_seconds',
        expectedStatus: 'expected_status', timeout: 'timeout_ms', isActive: 'is_active'
    };
    const sets = [], vals = [];
    for (const [key, col] of Object.entries(map)) {
        if (d[key] !== undefined) {
            sets.push(`${col} = ?`);
            vals.push(key === 'isActive' ? (d[key] ? 1 : 0) : d[key]);
        }
    }
    if (!sets.length) return getMonitorById(userId, id);
    sets.push("updated_at = CURRENT_TIMESTAMP");
    db.prepare(`UPDATE monitors SET ${sets.join(', ')} WHERE id = ? AND user_id = ?`).run(...vals, id, userId);
    return getMonitorById(userId, id);
}

export function deleteMonitor(userId, id) {
    return db.prepare('DELETE FROM monitors WHERE id = ? AND user_id = ?').run(id, userId).changes > 0;
}

// Used by the worker (all users).
export function getActiveMonitors() {
    return db.prepare('SELECT * FROM monitors WHERE is_active = 1').all();
}

export async function checkMonitor(monitor) {
    const start = Date.now();
    if (!(await isSafeUrl(monitor.url))) {
        return { success: false, statusCode: null, responseTime: 0, error: 'Blocked: private or unresolvable host' };
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), monitor.timeout);
    try {
        const response = await fetch(monitor.url, {
            method: monitor.method,
            signal: controller.signal,
            redirect: 'manual'
        });
        // We only need the status; drop the body so the socket is freed.
        response.body?.cancel().catch(() => {});
        return {
            success: response.status === monitor.expectedStatus,
            statusCode: response.status,
            responseTime: Date.now() - start
        };
    } catch (error) {
        return {
            success: false,
            statusCode: null,
            responseTime: Date.now() - start,
            error: error.name === 'AbortError' ? `Timed out after ${monitor.timeout}ms` : error.message
        };
    } finally {
        clearTimeout(timer);
    }
}
