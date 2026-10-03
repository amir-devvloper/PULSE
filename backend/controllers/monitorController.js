import * as svc from '../services/monitorService.js';
import { ok, fail } from '../utils/response.js';
import { logger } from '../utils/logger.js';
import { isSafeUrl } from '../utils/urlGuard.js';
import { ALLOWED_METHODS, MIN_INTERVAL_SECONDS, MIN_TIMEOUT_MS, MAX_TIMEOUT_MS } from '../shared/constants.js';

function validate(b, partial = false) {
    const out = {};
    const has = k => b[k] !== undefined;

    if (!partial || has('monitorName')) {
        const name = String(b.monitorName ?? '').trim();
        if (!name) return { error: 'Monitor name is required.' };
        out.monitorName = name;
    }
    if (!partial || has('url')) {
        try {
            const u = new URL(String(b.url ?? '').trim());
            if (!['http:', 'https:'].includes(u.protocol)) throw new Error();
            out.url = u.toString();
        } catch {
            return { error: 'Enter a valid http(s) URL.' };
        }
    }
    if (!partial || has('method')) {
        const m = String(b.method ?? 'GET').toUpperCase();
        if (!ALLOWED_METHODS.includes(m)) return { error: 'Method must be GET, POST or HEAD.' };
        out.method = m;
    }
    if (!partial || has('interval')) {
        const n = Number(b.interval ?? 60);
        if (!Number.isInteger(n) || n < MIN_INTERVAL_SECONDS) return { error: `Interval must be at least ${MIN_INTERVAL_SECONDS} seconds.` };
        out.interval = n;
    }
    if (!partial || has('expectedStatus')) {
        const n = Number(b.expectedStatus ?? 200);
        if (!Number.isInteger(n) || n < 100 || n > 599) return { error: 'Expected status must be between 100 and 599.' };
        out.expectedStatus = n;
    }
    if (!partial || has('timeout')) {
        const n = Number(b.timeout ?? 5000);
        if (!Number.isInteger(n) || n < MIN_TIMEOUT_MS || n > MAX_TIMEOUT_MS) return { error: 'Timeout must be between 1000 and 60000 ms.' };
        out.timeout = n;
    }
    if (has('isActive')) out.isActive = Boolean(b.isActive);
    return { value: out };
}

const parseId = req => {
    const id = Number(req.params.id);
    return Number.isInteger(id) && id > 0 ? id : null;
};

export async function createMonitorHandler(req, res) {
    const { value, error } = validate(req.body || {});
    if (error) return fail(res, error, 400);
    if (!(await isSafeUrl(value.url))) return fail(res, 'This address is not allowed (private or unresolvable host).', 400);
    try {
        ok(res, { message: 'Monitor created successfully', monitor: svc.createMonitor(req.user.sub, value) }, 201);
    } catch (e) { logger.error(e); fail(res, 'Failed to create monitor', 500); }
}

export function getMonitorsHandler(req, res) {
    try { ok(res, { monitors: svc.getMonitors(req.user.sub) }); }
    catch (e) { logger.error(e); fail(res, 'Failed to fetch monitors', 500); }
}

export function getMonitorHandler(req, res) {
    const id = parseId(req);
    const monitor = id && svc.getMonitorById(req.user.sub, id);
    if (!monitor) return fail(res, 'Monitor not found', 404);
    ok(res, { monitor });
}

export async function updateMonitorHandler(req, res) {
    const id = parseId(req);
    if (!id || !svc.getMonitorById(req.user.sub, id)) return fail(res, 'Monitor not found', 404);
    const { value, error } = validate(req.body || {}, true);
    if (error) return fail(res, error, 400);
    if (value.url && !(await isSafeUrl(value.url))) return fail(res, 'This address is not allowed (private or unresolvable host).', 400);
    try { ok(res, { message: 'Monitor updated successfully', monitor: svc.updateMonitor(req.user.sub, id, value) }); }
    catch (e) { logger.error(e); fail(res, 'Failed to update monitor', 500); }
}

export function deleteMonitorHandler(req, res) {
    const id = parseId(req);
    if (!id || !svc.deleteMonitor(req.user.sub, id)) return fail(res, 'Monitor not found', 404);
    ok(res, { message: 'Monitor deleted successfully' });
}
