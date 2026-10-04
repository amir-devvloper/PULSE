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

// Build 24 evenly sized buckets in application code.
// This avoids relying on SQLite integer-division/grouping behavior for epoch timestamps.
export function getSeries(userId, hours = 24) {
    const seconds = hours * 3600;
    const bucketSec = seconds / 24;
    const since = `-${hours} hours`;
    const rows = db.prepare(
        `SELECT CAST(strftime('%s', c.checked_at) AS INTEGER) AS checked_ts,
                c.response_time,
                c.is_success
         FROM checks c
         JOIN monitors m ON m.id = c.monitor_id
         WHERE m.user_id = ?
           AND c.checked_at >= datetime('now', ?)
         ORDER BY checked_ts ASC`
    ).all(userId, since);

    if (!rows.length) return [];

    const endTs = Math.floor(Date.now() / 1000);
    const startTs = endTs - seconds;
    const buckets = Array.from({ length: 24 }, (_, index) => ({
        t: startTs + Math.floor(index * bucketSec),
        checks: 0,
        ok: 0,
        responseTotal: 0,
        responseCount: 0
    }));

    for (const row of rows) {
        if (!Number.isFinite(row.checked_ts)) continue;
        const index = Math.min(
            23,
            Math.max(0, Math.floor((row.checked_ts - startTs) / bucketSec))
        );
        const bucket = buckets[index];
        bucket.checks += 1;
        bucket.ok += row.is_success ? 1 : 0;
        if (Number.isFinite(row.response_time)) {
            bucket.responseTotal += row.response_time;
            bucket.responseCount += 1;
        }
    }

    return buckets
        .filter(bucket => bucket.checks > 0)
        .map(bucket => ({
            t: bucket.t,
            checks: bucket.checks,
            uptimePercent: Math.round((bucket.ok / bucket.checks) * 1000) / 10,
            avgResponseMs: bucket.responseCount
                ? Math.round(bucket.responseTotal / bucket.responseCount)
                : null
        }));
}

// True when the last `n` checks of the monitor all failed (and at least n exist).
export function lastChecksAllFailed(monitorId, n) {
    const rows = db.prepare('SELECT is_success FROM checks WHERE monitor_id = ? ORDER BY id DESC LIMIT ?').all(monitorId, n);
    return rows.length === n && rows.every(r => r.is_success === 0);
}
