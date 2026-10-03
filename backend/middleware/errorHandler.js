import { logger } from '../utils/logger.js';

export function notFoundApi(req, res) {
    res.status(404).json({ success: false, message: 'Not found' });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
    logger.error(err);
    res.status(err.status || 500).json({ success: false, message: 'Internal server error' });
}
