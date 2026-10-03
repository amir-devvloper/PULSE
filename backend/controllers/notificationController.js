import * as svc from '../services/notificationService.js';
import { ok, fail } from '../utils/response.js';
import { logger } from '../utils/logger.js';

export function getSettingsHandler(req, res) {
    try { ok(res, { settings: svc.getSettings(req.user.sub) }); }
    catch (e) { logger.error(e); fail(res, 'Failed to load notification settings', 500); }
}

export function updateSettingsHandler(req, res) {
    const { emailAlerts, weeklyDigest } = req.body || {};
    for (const v of [emailAlerts, weeklyDigest]) {
        if (v !== undefined && typeof v !== 'boolean') return fail(res, 'Settings must be true or false.', 400);
    }
    try { ok(res, { settings: svc.updateSettings(req.user.sub, { emailAlerts, weeklyDigest }) }); }
    catch (e) { logger.error(e); fail(res, 'Failed to save notification settings', 500); }
}

export function listNotificationsHandler(req, res) {
    try { ok(res, { notifications: svc.listNotifications(req.user.sub) }); }
    catch (e) { logger.error(e); fail(res, 'Failed to load notifications', 500); }
}
