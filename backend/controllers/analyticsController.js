import { getSummary, getSeries } from '../services/checkService.js';
import { ok, fail } from '../utils/response.js';
import { logger } from '../utils/logger.js';
import { ALLOWED_RANGE_HOURS } from '../shared/constants.js';

function parseHours(req) {
    const h = Number(req.query.hours ?? 24);
    return ALLOWED_RANGE_HOURS.includes(h) ? h : null;
}

export function getSummaryHandler(req, res) {
    const hours = parseHours(req);
    if (!hours) return fail(res, `hours must be one of ${ALLOWED_RANGE_HOURS.join(', ')}`, 400);
    try { ok(res, { summary: getSummary(req.user.sub, hours) }); }
    catch (e) { logger.error(e); fail(res, 'Failed to build summary', 500); }
}

export function getSeriesHandler(req, res) {
    const hours = parseHours(req);
    if (!hours) return fail(res, `hours must be one of ${ALLOWED_RANGE_HOURS.join(', ')}`, 400);
    try { ok(res, { hours, series: getSeries(req.user.sub, hours) }); }
    catch (e) { logger.error(e); fail(res, 'Failed to build series', 500); }
}
