import { db } from '../database/db.js';
import { logger } from '../utils/logger.js';
import { getSummary } from './checkService.js';
import { isMailConfigured, sendMail, appUrl } from './mailService.js';

const APP_URL = appUrl;

// ---------- settings ----------

export function getSettings(userId) {
    const row = db.prepare('SELECT email_alerts, weekly_digest FROM notification_settings WHERE user_id = ?').get(userId);
    return {
        emailAlerts: Boolean(row?.email_alerts),
        weeklyDigest: Boolean(row?.weekly_digest),
        emailConfigured: isMailConfigured()
    };
}

export function updateSettings(userId, { emailAlerts, weeklyDigest }) {
    const cur = getSettings(userId);
    const ea = emailAlerts === undefined ? cur.emailAlerts : Boolean(emailAlerts);
    const wd = weeklyDigest === undefined ? cur.weeklyDigest : Boolean(weeklyDigest);
    // Enabling the digest starts its 7-day clock now, so nobody gets one instantly.
    db.prepare(
        `INSERT INTO notification_settings (user_id, email_alerts, weekly_digest, last_digest_at)
         VALUES (?, ?, ?, CASE WHEN ? = 1 THEN CURRENT_TIMESTAMP END)
         ON CONFLICT(user_id) DO UPDATE SET
            email_alerts = excluded.email_alerts,
            weekly_digest = excluded.weekly_digest,
            last_digest_at = CASE
                WHEN excluded.weekly_digest = 1 AND notification_settings.weekly_digest = 0 THEN CURRENT_TIMESTAMP
                ELSE notification_settings.last_digest_at END`
    ).run(userId, ea ? 1 : 0, wd ? 1 : 0, wd ? 1 : 0);
    return getSettings(userId);
}

export function listNotifications(userId, limit = 20) {
    return db.prepare(
        `SELECT n.id, n.type, n.subject, n.status, n.error_message, n.created_at, n.monitor_id
         FROM notifications n WHERE n.user_id = ? ORDER BY n.id DESC LIMIT ?`
    ).all(userId, limit);
}

// ---------- sending ----------

function record(userId, monitorId, type, subject, status, error) {
    db.prepare(
        'INSERT INTO notifications (user_id, monitor_id, type, subject, status, error_message) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(userId, monitorId ?? null, type, subject, status, error || null);
}

async function deliver(user, monitorId, type, subject, text) {
    if (!isMailConfigured()) {
        record(user.id, monitorId, type, subject, 'skipped', 'SMTP is not configured');
        return 'skipped';
    }
    try {
        await sendMail({ to: user.email, subject, text });
        record(user.id, monitorId, type, subject, 'sent');
        return 'sent';
    } catch (e) {
        logger.error('Email failed:', e.message);
        record(user.id, monitorId, type, subject, 'failed', e.message);
        return 'failed';
    }
}

function alertRecipient(monitorId) {
    return db.prepare(
        `SELECT u.id, u.email, u.name, m.name AS monitor_name, m.url AS monitor_url
         FROM monitors m
         JOIN users u ON u.id = m.user_id
         JOIN notification_settings s ON s.user_id = u.id AND s.email_alerts = 1
         WHERE m.id = ?`
    ).get(monitorId);
}

export async function notifyDown(monitorId, cause) {
    const r = alertRecipient(monitorId);
    if (!r) return null;
    const subject = `[PULSE] ${r.monitor_name} is down`;
    const text = `Hi ${r.name},\n\n${r.monitor_name} (${r.monitor_url}) is down.\nCause: ${cause || 'unknown'}\n\nDetails: ${APP_URL()}/monitor-detail.html?id=${monitorId}\n`;
    return deliver(r, monitorId, 'down', subject, text);
}

export async function notifyRecovered(monitorId, startedAt) {
    const r = alertRecipient(monitorId);
    if (!r) return null;
    const subject = `[PULSE] ${r.monitor_name} is back up`;
    const text = `Hi ${r.name},\n\n${r.monitor_name} (${r.monitor_url}) has recovered.${startedAt ? `\nThe incident started at ${startedAt} UTC.` : ''}\n\nDetails: ${APP_URL()}/monitor-detail.html?id=${monitorId}\n`;
    return deliver(r, monitorId, 'recovered', subject, text);
}

// ---------- weekly digest ----------

export function buildDigest(user) {
    const s = getSummary(user.id, 168);
    const lines = [
        `Hi ${user.name},`,
        '',
        'Your PULSE summary for the last 7 days:',
        `- Monitors: ${s.monitors.total} (${s.monitors.active} active)`,
        `- Uptime: ${s.uptimePercent === null ? 'no checks yet' : s.uptimePercent + '%'}`,
        `- Average response: ${s.avgResponseMs === null ? '—' : s.avgResponseMs + ' ms'}`,
        `- Checks run: ${s.checks}`,
        `- Incidents: ${s.incidents}${s.ongoingIncidents ? ` (${s.ongoingIncidents} still ongoing)` : ''}`,
        '',
        `Dashboard: ${APP_URL()}/dashboard.html`
    ];
    return { subject: '[PULSE] Your weekly summary', text: lines.join('\n') + '\n' };
}

// Called hourly by the worker. Sends to everyone whose last digest is 7+ days old.
export async function sendDueDigests() {
    const due = db.prepare(
        `SELECT u.id, u.email, u.name FROM notification_settings s
         JOIN users u ON u.id = s.user_id
         WHERE s.weekly_digest = 1 AND (s.last_digest_at IS NULL OR s.last_digest_at <= datetime('now', '-7 days'))`
    ).all();
    for (const user of due) {
        const { subject, text } = buildDigest(user);
        await deliver(user, null, 'digest', subject, text);
        db.prepare('UPDATE notification_settings SET last_digest_at = CURRENT_TIMESTAMP WHERE user_id = ?').run(user.id);
    }
    return due.length;
}
