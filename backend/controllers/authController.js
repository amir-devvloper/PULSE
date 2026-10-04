import bcrypt from 'bcryptjs';
import { db } from '../database/db.js';
import { signToken, setAuthCookie, clearAuthCookie } from '../middleware/auth.js';
import { sendResetEmail, resetPassword } from '../services/passwordResetService.js';
import { logger } from '../utils/logger.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;
const MAX_PASSWORD = 72; // bcrypt ignores everything past 72 bytes

const publicUser = row => ({ id: row.id, name: row.name, email: row.email });
const passwordError = pw =>
    !pw || String(pw).length < MIN_PASSWORD ? `Password must be at least ${MIN_PASSWORD} characters.`
    : String(pw).length > MAX_PASSWORD ? `Password must be at most ${MAX_PASSWORD} characters.`
    : null;

export function signupHandler(req, res) {
    const { name, email, password } = req.body || {};
    if (!name || !String(name).trim()) return res.status(400).json({ error: 'Name is required.' });
    if (!email || !EMAIL_RE.test(email)) return res.status(400).json({ error: 'Enter a valid email address.' });
    const pwErr = passwordError(password);
    if (pwErr) return res.status(400).json({ error: pwErr });

    const normalizedEmail = String(email).trim().toLowerCase();
    if (db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail)) {
        return res.status(409).json({ error: 'An account with that email already exists.' });
    }

    const result = db
        .prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)')
        .run(String(name).trim(), normalizedEmail, bcrypt.hashSync(password, 10));

    const user = { id: result.lastInsertRowid, name: String(name).trim(), email: normalizedEmail };
    setAuthCookie(res, signToken(user));
    res.status(201).json({ user: publicUser(user) });
}

export function loginHandler(req, res) {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(String(email).trim().toLowerCase());
    // Same message either way so we don't reveal whether the email exists.
    if (!user || !bcrypt.compareSync(String(password), user.password_hash)) {
        return res.status(401).json({ error: 'Incorrect email or password.' });
    }
    setAuthCookie(res, signToken(user));
    res.json({ user: publicUser(user) });
}

export function logoutHandler(req, res) {
    clearAuthCookie(res);
    res.status(204).end();
}

export function meHandler(req, res) {
    const user = db.prepare('SELECT id, name, email FROM users WHERE id = ?').get(req.user.sub);
    if (!user) return res.status(401).json({ error: 'Not signed in.' });
    res.json({ user });
}

export function updateMeHandler(req, res) {
    const { name, email } = req.body || {};
    const current = db.prepare('SELECT id, name, email FROM users WHERE id = ?').get(req.user.sub);
    if (!current) return res.status(401).json({ error: 'Not signed in.' });

    const newName = name === undefined ? current.name : String(name).trim();
    const newEmail = email === undefined ? current.email : String(email).trim().toLowerCase();
    if (!newName) return res.status(400).json({ error: 'Name is required.' });
    if (!EMAIL_RE.test(newEmail)) return res.status(400).json({ error: 'Enter a valid email address.' });
    if (db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(newEmail, current.id)) {
        return res.status(409).json({ error: 'An account with that email already exists.' });
    }

    db.prepare('UPDATE users SET name = ?, email = ? WHERE id = ?').run(newName, newEmail, current.id);
    const tv = db.prepare('SELECT token_version FROM users WHERE id = ?').get(current.id).token_version;
    const user = { id: current.id, name: newName, email: newEmail, token_version: tv };
    setAuthCookie(res, signToken(user)); // token carries name/email, so refresh it
    res.json({ user: publicUser(user) });
}

export function changePasswordHandler(req, res) {
    const { currentPassword, newPassword } = req.body || {};
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.sub);
    if (!user) return res.status(401).json({ error: 'Not signed in.' });
    if (!currentPassword || !bcrypt.compareSync(String(currentPassword), user.password_hash)) {
        return res.status(400).json({ error: 'Current password is incorrect.' });
    }
    const pwErr = passwordError(newPassword);
    if (pwErr) return res.status(400).json({ error: pwErr });
    if (newPassword === currentPassword) return res.status(400).json({ error: 'New password must be different.' });

    // Bumping token_version signs out every other device; this session gets a fresh token.
    db.prepare('UPDATE users SET password_hash = ?, token_version = token_version + 1 WHERE id = ?')
        .run(bcrypt.hashSync(newPassword, 10), user.id);
    const fresh = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
    setAuthCookie(res, signToken(fresh));
    res.json({ message: 'Password updated.' });
}

export function deleteAccountHandler(req, res) {
    const { password } = req.body || {};
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.sub);
    if (!user) return res.status(401).json({ error: 'Not signed in.' });
    if (!password || !bcrypt.compareSync(String(password), user.password_hash)) {
        return res.status(400).json({ error: 'Password is incorrect.' });
    }
    db.prepare('DELETE FROM users WHERE id = ?').run(user.id); // cascades to monitors, checks, incidents, notifications
    clearAuthCookie(res);
    res.status(204).end();
}

const GENERIC_FORGOT = { message: 'If that email has an account, a reset link is on its way.' };

export function forgotPasswordHandler(req, res) {
    const { email } = req.body || {};
    if (!email || !EMAIL_RE.test(String(email).trim())) {
        return res.status(400).json({ error: 'Enter a valid email address.' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = db.prepare('SELECT id, name, email FROM users WHERE email = ?').get(normalizedEmail);

    // Keep the response generic to avoid leaking whether an account exists.
    // Log enough server-side detail to diagnose delivery problems in production.
    logger.info(`Password reset requested for ${normalizedEmail}; accountFound=${Boolean(user)}`);

    if (user) {
        sendResetEmail(user)
            .then(sent => logger.info(`Password reset delivery result for ${user.email}: ${sent ? 'sent' : 'skipped'}`))
            .catch(e => logger.error(`Reset email failed for ${user.email}: ${e.message}`));
    }

    res.json(GENERIC_FORGOT);
}

export function resetPasswordHandler(req, res) {
    const { token, password } = req.body || {};
    const pwErr = passwordError(password);
    if (pwErr) return res.status(400).json({ error: pwErr });
    if (!token || !resetPassword(token, String(password))) {
        return res.status(400).json({ error: 'This reset link is invalid or has expired.' });
    }
    res.json({ message: 'Password updated. You can sign in now.' });
}
