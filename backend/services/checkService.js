import { db } from '../database/db.js';

export function saveCheckResult(monitorId, r) {
    return db.prepare(
        `INSERT INTO checks (monitor_id, status_code, response_time, is_success, error_message)
         VALUES (?, ?, ?, ?, ?)`
    ).run(monitorId, r.statusCode, r.responseTime, r.success ? 1 : 0, r.error || null);
}

export function getChecksByMonitor(monitorId, limit = 50) {
    return db.prepare('SELECT * FROM checks WHERE monitor_id = ? ORDER BY id DESC LIMIT ?').all(monitorId, limit);
}

// Old checks are useless after a while and the table grows every few seconds.
export function pruneOldChecks(days) {
    return db.prepare(`DELETE FROM checks WHERE checked_at < datetime('now', ?)`).run(`-${days} days`).changes;
}

export function getSummary(userId, hours = 24) {
    const since = `-${hours} hours`;
    const monitors = db.prepare(
        'SELECT COUNT(*) total, SUM(is_active) active FROM monitors WHERE user_id = ?'
    ).get(userId);
    const checks = db.prepare(
        `SELECT COUNT(*) total, SUM(c.is_success) ok, ROUND(AVG(c.response_time)) avg_ms
         FROM checks c JOIN monitors m ON m.id = c.monitor_id
         WHERE m.user_id = ? AND c.checked_at >= datetime('now', ?)`
    ).get(userId, since);
    const ongoing = db.prepare(
        `SELECT COUNT(*) n FROM incidents i JOIN monitors m ON m.id = i.monitor_id
         WHERE m.user_id = ? AND i.status = 'ongoing'`
    ).get(userId).n;
    const incidents = db.prepare(
        `SELECT COUNT(*) n FROM incidents i JOIN monitors m ON m.id = i.monitor_id
         WHERE m.user_id = ? AND i.started_at >= datetime('now', ?)`
    ).get(userId, since).n;
    return {
        hours,
        monitors: { total: monitors.total, active: monitors.active || 0 },
        checks: checks.total,
        uptimePercent: checks.total ? Math.round((checks.ok / checks.total) * 1000) / 10 : null,
        avgResponseMs: checks.avg_ms,
        incidents,
        ongoingIncidents: ongoing
    };
}

// 24 evenly sized buckets across the range, oldest first. Empty buckets are omitted.
export function getSeries(userId, hours = 24) {
    const bucketSec = Math.round((hours * 3600) / 24);
    return db.prepare(
        `SELECT CAST(CAST(strftime('%s', c.checked_at) AS INTEGER) / ? AS INTEGER) * ? AS t,
                COUNT(*) AS checks,
                SUM(c.is_success) AS ok,
                ROUND(AVG(c.response_time)) AS avg_ms
         FROM checks c JOIN monitors m ON m.id = c.monitor_id
         WHERE m.user_id = ? AND c.checked_at >= datetime('now', ?)
         GROUP BY t ORDER BY t`
    ).all(bucketSec, bucketSec, userId, `-${hours} hours`).map(r => ({
        t: r.t,
        checks: r.checks,
        uptimePercent: Math.round((r.ok / r.checks) * 1000) / 10,
        avgResponseMs: r.avg_ms
    }));
}

// True when the last `n` checks of the monitor all failed (and at least n exist).
export function lastChecksAllFailed(monitorId, n) {
    const rows = db.prepare('SELECT is_success FROM checks WHERE monitor_id = ? ORDER BY id DESC LIMIT ?').all(monitorId, n);
    return rows.length === n && rows.every(r => r.is_success === 0);
}
