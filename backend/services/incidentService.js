import { db } from '../database/db.js';

export function getOngoingIncident(monitorId) {
    return db.prepare("SELECT * FROM incidents WHERE monitor_id = ? AND status = 'ongoing'").get(monitorId) || null;
}

export function createIncident(monitorId, cause) {
    return db.prepare("INSERT INTO incidents (monitor_id, status, cause) VALUES (?, 'ongoing', ?)")
        .run(monitorId, cause || null);
}

export function resolveIncident(id) {
    return db.prepare("UPDATE incidents SET status = 'resolved', resolved_at = CURRENT_TIMESTAMP WHERE id = ?").run(id);
}

export function getAllIncidents(userId, limit = 100) {
    return db.prepare(
        `SELECT i.*, m.name AS monitor_name, m.url AS monitor_url
         FROM incidents i JOIN monitors m ON m.id = i.monitor_id
         WHERE m.user_id = ? ORDER BY i.id DESC LIMIT ?`
    ).all(userId, limit);
}

export function getIncidentsByMonitor(userId, monitorId, limit = 50) {
    return db.prepare(
        `SELECT i.* FROM incidents i JOIN monitors m ON m.id = i.monitor_id
         WHERE m.user_id = ? AND i.monitor_id = ? ORDER BY i.id DESC LIMIT ?`
    ).all(userId, monitorId, limit);
}
