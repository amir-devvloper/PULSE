// Tiny in-memory limiter (per IP). Fine for a single-process app.
export function rateLimit({ windowMs = 60_000, max = 20 } = {}) {
    const hits = new Map();
    setInterval(() => hits.clear(), windowMs).unref();
    return (req, res, next) => {
        const n = (hits.get(req.ip) || 0) + 1;
        hits.set(req.ip, n);
        if (n > max) return res.status(429).json({ error: 'Too many requests, try again shortly.' });
        next();
    };
}
