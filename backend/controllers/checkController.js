import { getChecksByMonitor } from '../services/checkService.js';
import { getMonitorById } from '../services/monitorService.js';
import { ok, fail } from '../utils/response.js';

export function getChecksByMonitorHandler(req, res) {
    const id = Number(req.params.monitorId);
    if (!Number.isInteger(id) || !getMonitorById(req.user.sub, id)) return fail(res, 'Monitor not found', 404);
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 500);
    ok(res, { checks: getChecksByMonitor(id, limit) });
}
