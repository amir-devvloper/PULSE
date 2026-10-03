export async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch('/api' + path, { method, credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && !path.startsWith('/auth/')) { location.href = '/login'; throw new Error('Unauthorized'); }
  if (!res.ok) throw new Error(data.message || data.error || 'Request failed');
  return data;
}
const ts = t => new Date(String(t).replace(' ', 'T') + 'Z');
export const fmtTime = t => ts(t).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
export const fmtDur = (a, b) => { const s = Math.max(0, Math.round(((b ? ts(b) : new Date()) - ts(a)) / 1000)); return s < 60 ? s + 's' : s < 3600 ? Math.round(s / 60) + 'm' : s < 86400 ? (s / 3600).toFixed(1) + 'h' : Math.round(s / 86400) + 'd'; };
export const statusOf = m => !m.is_active ? ['warn', 'Paused'] : m.last_success === 1 ? ['ok', 'Operational'] : m.last_success === 0 ? ['bad', 'Down'] : ['warn', 'Pending'];
