import 'dotenv/config';

if (!process.env.JWT_SECRET) {
    console.error('Missing JWT_SECRET in .env — copy .env.example to .env and set one.');
    process.exit(1);
}

// Loaded after the check above because the auth middleware reads JWT_SECRET when it is imported.
const { initDb } = await import('./database/db.js');
const { createApp } = await import('./app.js');
const { startMonitorWorker } = await import('./workers/monitorWorker.js');
const { verifyMailTransport, isMailConfigured } = await import('./services/mailService.js');

initDb();

const PORT = process.env.PORT || 3000;

createApp().listen(PORT, '0.0.0.0', () => {
    console.log(`PULSE running at http://localhost:${PORT}`);
    if (!isMailConfigured()) {
        console.warn('SMTP status: NOT CONFIGURED');
    } else {
        verifyMailTransport()
            .then(() => console.log('SMTP status: VERIFIED'))
            .catch(error => console.error(`SMTP status: FAILED — ${error.message}`));
    }
    startMonitorWorker();
});

