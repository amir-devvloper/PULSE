import { getActiveMonitors } from '../services/monitorService.js';
import { runCheck } from './checkWorker.js';
import { pruneOldChecks } from '../services/checkService.js';
import { TICK_INTERVAL_MS, CHECK_RETENTION_DAYS } from '../shared/constants.js';
import { sendDueDigests } from '../services/notificationService.js';
import { logger } from '../utils/logger.js';

const lastCheckedAt = new Map();
const inFlight = new Set();

export function startMonitorWorker() {
    logger.info('Monitor worker started');
    tick();
    setInterval(tick, TICK_INTERVAL_MS).unref();
    prune();
    setInterval(prune, 60 * 60 * 1000).unref();
    digests();
    setInterval(digests, 60 * 60 * 1000).unref();
}

function digests() {
    sendDueDigests().catch(error => logger.error('Weekly digest failed:', error.message));
}

function prune() {
    try {
        const n = pruneOldChecks(CHECK_RETENTION_DAYS);
        if (n) logger.info(`Pruned ${n} checks older than ${CHECK_RETENTION_DAYS} days`);
    } catch (error) {
        logger.error('Pruning failed:', error.message);
    }
}

function tick() {
    let monitors;
    try {
        monitors = getActiveMonitors();
    } catch (error) {
        return logger.error('Failed to load monitors:', error.message);
    }

    const now = Date.now();
    for (const monitor of monitors) {
        if (inFlight.has(monitor.id)) continue;
        const last = lastCheckedAt.get(monitor.id) || 0;
        if (now - last < monitor.interval_seconds * 1000) continue;

        lastCheckedAt.set(monitor.id, now);
        inFlight.add(monitor.id);
        runCheck(monitor)
            .catch(e => logger.error(`Check crashed for monitor ${monitor.id}:`, e.message))
            .finally(() => inFlight.delete(monitor.id));
    }
}
