import nodemailer from 'nodemailer';

let cached = { key: null, transport: null };

export function isMailConfigured() {
    return Boolean(process.env.SMTP_HOST);
}

function transport() {
    const cfg = {
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined
    };
    const key = JSON.stringify(cfg);
    if (cached.key !== key) cached = { key, transport: nodemailer.createTransport(cfg) };
    return cached.transport;
}

// Throws if SMTP isn't configured or the server rejects the message.
export async function sendMail({ to, subject, text }) {
    if (!isMailConfigured()) throw new Error('SMTP is not configured');
    await transport().sendMail({ from: process.env.SMTP_FROM || process.env.SMTP_USER, to, subject, text });
}

export const appUrl = () => (process.env.APP_URL || `http://localhost:${process.env.PORT || 3000}`).replace(/\/$/, '');
