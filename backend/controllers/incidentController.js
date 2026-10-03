import { getAllIncidents, getIncidentsByMonitor } from '../services/incidentService.js';
import { ok, fail } from '../utils/response.js';
import { logger } from '../utils/logger.js';

export function getIncidentsHandler(req, res) {
    try { ok(res, { incidents: getAllIncidents(req.user.sub) }); }
    catch (e) { logger.error(e); fail(res, 'Failed to fetch incidents', 500); }
}

export function getIncidentsByMonitorHandler(req, res) {
    const id = Number(req.params.monitorId);
    if (!Number.isInteger(id)) return fail(res, 'Invalid monitor id', 400);
    try { ok(res, { incidents: getIncidentsByMonitor(req.user.sub, id) }); }
    catch (e) { logger.error(e); fail(res, 'Failed to fetch incidents for monitor', 500); }
}
