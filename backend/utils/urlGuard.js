import dns from 'node:dns/promises';
import net from 'node:net';

function isPrivateIp(ip) {
    if (net.isIPv4(ip)) {
        const [a, b] = ip.split('.').map(Number);
        return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) ||
            (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127);
    }
    const v = ip.toLowerCase();
    if (v.startsWith('::ffff:')) return isPrivateIp(v.slice(7));
    return v === '::1' || v === '::' || v.startsWith('fc') || v.startsWith('fd') || v.startsWith('fe80');
}

// Blocks localhost / private-network targets (SSRF). Set ALLOW_PRIVATE_TARGETS=true for local dev.
export async function isSafeUrl(url) {
    if (process.env.ALLOW_PRIVATE_TARGETS === 'true') return true;
    const host = new URL(url).hostname.replace(/^\[|\]$/g, '');
    if (host === 'localhost' || host.endsWith('.localhost')) return false;
    if (net.isIP(host)) return !isPrivateIp(host);
    try {
        const addrs = await dns.lookup(host, { all: true });
        return addrs.length > 0 && addrs.every(a => !isPrivateIp(a.address));
    } catch {
        return false;
    }
}

export { isPrivateIp };
