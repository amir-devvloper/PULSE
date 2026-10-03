// Shape reference for the JSON the API returns (JSDoc only, no runtime code).

/** @typedef {{ id: number, name: string, email: string }} User */

/**
 * @typedef {Object} Monitor
 * @property {number} id
 * @property {string} name
 * @property {string} url
 * @property {'GET'|'POST'|'HEAD'} method
 * @property {number} interval_seconds
 * @property {number} expected_status
 * @property {number} timeout_ms
 * @property {0|1} is_active
 * @property {0|1|null} [last_success]
 * @property {number|null} [last_response_time]
 * @property {number|null} [uptime_24h]
 */

/** @typedef {{ id: number, monitor_id: number, status_code: number|null, response_time: number|null, is_success: 0|1, error_message: string|null, checked_at: string }} Check */

/** @typedef {{ id: number, monitor_id: number, status: 'ongoing'|'resolved', cause: string|null, started_at: string, resolved_at: string|null }} Incident */

/** @typedef {{ emailAlerts: boolean, weeklyDigest: boolean, emailConfigured: boolean }} NotificationSettings */

/** @typedef {{ id: number, type: 'down'|'recovered'|'digest', subject: string, status: 'sent'|'failed'|'skipped', error_message: string|null, created_at: string }} Notification */

export {};
