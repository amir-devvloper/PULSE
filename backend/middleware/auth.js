import jwt from 'jsonwebtoken';
import { db } from '../database/db.js';

const JWT_SECRET = process.env.JWT_SECRET;
export const COOKIE_NAME = 'pulse_token';

// `tv` is the user's token_version. Changing or resetting the password bumps it,
// which instantly invalidates every token issued before.
export function signToken(user) {
    return jwt.sign(
        { sub: user.id, email: user.email, name: user.name, tv: user.token_version ?? 0 },
        JWT_SECRET,
        { expiresIn: '7d' }
    );
}

export function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch {
        return null;
    }
}

export function setAuthCookie(res, token) {
    res.cookie(COOKIE_NAME, token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days, matches JWT expiry
    });
}

export function clearAuthCookie(res) {
    res.clearCookie(COOKIE_NAME);
}

// Valid signature AND the user still exists AND the token isn't from before a password change.
function sessionFrom(req) {
    const token = req.cookies?.[COOKIE_NAME];
    const payload = token && verifyToken(token);
    if (!payload) return null;
    const row = db.prepare('SELECT token_version FROM users WHERE id = ?').get(payload.sub);
    if (!row || row.token_version !== (payload.tv ?? 0)) return null;
    return payload;
}

// For API routes: rejects with 401 JSON if there's no valid session.
export function requireAuth(req, res, next) {
    const payload = sessionFrom(req);
    if (!payload) {
        return res.status(401).json({ error: 'Not signed in.' });
    }
    req.user = payload;
    next();
}

// For the static HTML app pages: redirects to the login page instead
// of returning JSON, since a browser navigation expects a page back.
export function requirePageAuth(req, res, next) {
    const payload = sessionFrom(req);
    if (!payload) {
        return res.redirect('/login.html');
    }
    req.user = payload;
    next();
}
