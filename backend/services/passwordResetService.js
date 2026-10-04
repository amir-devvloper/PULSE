import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { db } from '../database/db.js';
import { logger } from '../utils/logger.js';
import { isMailConfigured, sendMail, appUrl } from './mailService.js';

const TOKEN_TTL = '+1 hour';
const sha256 = v => crypto.createHash('sha256').update(v).digest('hex');

// Creates a single-use token (any older ones for the user are dropped) and
// returns the raw value, which only ever exists in the email.
export function createResetToken(userId) {
    const token = crypto.randomBytes(32).toString('hex');
    db.prepare('DELETE FROM password_resets WHERE user_id = ?').run(userId);
    db.prepare(
        `INSERT INTO password_resets (user_id, token_hash, expires_at)
         VALUES (?, ?, datetime('now', ?))`
    ).run(userId, sha256(token), TOKEN_TTL);
    return token;
}

export async function sendResetEmail(user) {
    const token = createResetToken(user.id);
    const link = `${appUrl()}/reset-password?token=${encodeURIComponent(token)}`;
    if (!isMailConfigured()) {
        // No way to email it. In development print the link so the flow can still be tried.
        if (process.env.NODE_ENV !== 'production') logger.warn(`SMTP not configured. Reset link for ${user.email}: ${link}`);
        else logger.warn('Password reset requested but SMTP is not configured; nothing was sent.');
        return false;
    }
    await sendMail({
        to: user.email,
        subject: '[PULSE] Reset your password',
        text: `Hi ${user.name},\n\nUse this link to choose a new password. It works once and expires in 1 hour:\n\n${link}\n\nIf you didn't ask for this, you can ignore this email.\n`
    });
        logger.info(`Reset email sent to ${user.email}`);
    return true;
}

// Returns true if the token was valid and the password was changed.
export function resetPassword(token, newPassword) {
    const row = db.prepare(
        `SELECT user_id FROM password_resets WHERE token_hash = ? AND expires_at > datetime('now')`
    ).get(sha256(String(token)));
    if (!row) return false;

    const apply = db.transaction(() => {
        db.prepare('UPDATE users SET password_hash = ?, token_version = token_version + 1 WHERE id = ?')
            .run(bcrypt.hashSync(newPassword, 10), row.user_id);
        db.prepare('DELETE FROM password_resets WHERE user_id = ?').run(row.user_id);
    });
    apply();
    return true;
}
