export const ALLOWED_METHODS = ['GET', 'POST', 'HEAD'];
export const MIN_INTERVAL_SECONDS = 10;
export const MIN_TIMEOUT_MS = 1000;
export const MAX_TIMEOUT_MS = 60000;
export const TICK_INTERVAL_MS = 10000;
export const INCIDENT_ONGOING = 'ongoing';
export const INCIDENT_RESOLVED = 'resolved';
export const CHECK_RETENTION_DAYS = 30;
export const ALLOWED_RANGE_HOURS = [24, 168, 720];
// Consecutive failed checks needed before an incident opens (override with FAILURE_THRESHOLD in .env).
export const DEFAULT_FAILURE_THRESHOLD = 2;
