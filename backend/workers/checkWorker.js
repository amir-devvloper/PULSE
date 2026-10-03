import { checkMonitor } from '../services/monitorService.js';
import { saveCheckResult, lastChecksAllFailed } from '../services/checkService.js';
import { DEFAULT_FAILURE_THRESHOLD } from '../shared/constants.js';
import { getOngoingIncident, createIncident, resolveIncident } from '../services/incidentService.js';
import { notifyDown, notifyRecovered } from '../services/notificationService.js';
import { logger } from '../utils/logger.js';

export async function runCheck(monitor) {
    const result = await checkMonitor({
        url: monitor.url,
        method: monitor.method,
        expectedStatus: monitor.expected_status,
        timeout: monitor.timeout_ms
    });

    try {
        saveCheckResult(monitor.id, result);
        const ongoing = getOngoingIncident(monitor.id);
        const threshold = Math.max(1, Number(process.env.FAILURE_THRESHOLD) || DEFAULT_FAILURE_THRESHOLD);
        // One failed check can be a blip; only open an incident after `threshold` in a row.
        if (!result.success && !ongoing && lastChecksAllFailed(monitor.id, threshold)) {
            const cause = result.error || `Expected status ${monitor.expected_status}, got ${result.statusCode}`;
            createIncident(monitor.id, cause);
            notifyDown(monitor.id, cause).catch(e => logger.error('Down alert failed:', e.message));
        } else if (result.success && ongoing) {
            resolveIncident(ongoing.id);
            notifyRecovered(monitor.id, ongoing.started_at).catch(e => logger.error('Recovery alert failed:', e.message));
        }
    } catch (error) {
        logger.error(`Check bookkeeping failed for monitor ${monitor.id}:`, error.message);
    }
    return result;
}
