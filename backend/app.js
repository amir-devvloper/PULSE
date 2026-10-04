import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { authRouter } from './routes/auth.js';
import monitorsRouter from './routes/monitors.js';
import incidentsRouter from './routes/incidents.js';
import checksRouter from './routes/checks.js';
import analyticsRouter from './routes/analytics.js';
import notificationsRouter from './routes/notifications.js';
import { requireAuth, requirePageAuth } from './middleware/auth.js';
import { rateLimit } from './middleware/rateLimit.js';
import { notFoundApi, errorHandler } from './middleware/errorHandler.js';
import { isMailConfigured } from './services/mailService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND_DIR = path.join(__dirname, '../frontend');

// "true" -> trust all proxies, "2" -> trust 2 hops, anything else is passed through (e.g. "loopback").
function parseTrustProxy(v) {
    if (v === 'true') return true;
    if (/^\d+$/.test(v)) return Number(v);
    return v;
}

export function createApp() {
    const app = express();

    // Behind Cloudflare / Nginx set TRUST_PROXY (e.g. 1) so req.ip is the real client for rate limiting.
    if (process.env.TRUST_PROXY) app.set('trust proxy', parseTrustProxy(process.env.TRUST_PROXY));

    // The frontend is served by this same server, so no CORS is needed by default.
    // CORS_ORIGINS="https://a.com,https://b.com" allows other origins to call the API with cookies.
    app.use(helmet({
        contentSecurityPolicy: {
            useDefaults: true,
            // Don't force https: the app is also served over plain http in development.
            directives: { 'upgrade-insecure-requests': null }
        }
    }));
    const origins = (process.env.CORS_ORIGINS || '').split(',').map(o => o.trim()).filter(Boolean);
    if (origins.length) app.use(cors({ origin: origins, credentials: true }));

    app.use(express.json());
    app.use(cookieParser());

    app.get('/health', (req, res) => {
        res.json({
            ok: true,
            smtp: {
                configured: isMailConfigured(),
                host: Boolean(process.env.SMTP_HOST),
                port: Boolean(process.env.SMTP_PORT),
                secure: Boolean(process.env.SMTP_SECURE),
                user: Boolean(process.env.SMTP_USER),
                pass: Boolean(process.env.SMTP_PASS),
                from: Boolean(process.env.SMTP_FROM)
            }
        });
    });

    app.use('/api/auth', rateLimit({ max: 30 }), authRouter);
    app.use('/api/monitors', requireAuth, monitorsRouter);
    app.use('/api/incidents', requireAuth, incidentsRouter);
    app.use('/api/checks', requireAuth, checksRouter);
    app.use('/api/analytics', requireAuth, analyticsRouter);
    app.use('/api/notifications', requireAuth, notificationsRouter);
    app.use('/api', notFoundApi);

    // Pages that require a signed-in session. Anything not listed here
    // (index.html, login.html, signup.html, styles.css, etc.) stays public.
    const PROTECTED_PAGES = [
        '/dashboard.html', '/monitors.html', '/monitor.html',
        '/analytics.html', '/settings.html', '/incidents.html', '/monitor-detail.html'
    ];
    app.get(PROTECTED_PAGES, requirePageAuth, (req, res) => {
        res.sendFile(path.join(FRONTEND_DIR, req.path));
    });
    app.use(express.static(FRONTEND_DIR));

    app.use(errorHandler);
    return app;
}
