function el(tag, className, text) {
    const e = document.createElement(tag);
    if (className) e.className = className;
    if (text !== undefined) e.textContent = text;
    return e;
}

async function api(path, options = {}) {
    const res = await fetch('/api' + path, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        ...options,
        body: options.body ? JSON.stringify(options.body) : undefined
    });
    if (res.status === 401) { window.location.href = 'login.html'; throw new Error('Unauthorized'); }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || data.error || 'Request failed');
    return data;
}

function statusOf(m) {
    if (!m.is_active) return { cls: 'badge badge-warning', text: 'Paused' };
    if (m.last_success === 1) return { cls: 'badge badge-success badge-pulse', text: 'Operational' };
    if (m.last_success === 0) return { cls: 'badge badge-danger badge-pulse', text: 'Down' };
    return { cls: 'badge badge-warning', text: 'Pending' };
}

function metric(value, label) {
    const box = el('div', 'monitor-metric');
    box.append(el('span', 'value', value), el('span', 'label', label));
    return box;
}

function parseTs(ts) {
    return new Date(String(ts).replace(' ', 'T') + 'Z');
}

function fmtDuration(from, to) {
    const s = Math.max(0, Math.round(((to ? parseTs(to) : new Date()) - parseTs(from)) / 1000));
    if (s < 60) return s + ' seconds';
    if (s < 3600) return Math.round(s / 60) + ' minutes';
    if (s < 86400) return (s / 3600).toFixed(1) + ' hours';
    return Math.round(s / 86400) + ' days';
}

function fmtTime(ts) {
    return parseTs(ts).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function showError(container, message) {
    container.replaceChildren(el('p', '', message));
}

function incidentCard(i) {
    const active = i.status === 'ongoing';
    const a = el('article', 'card incident-card ' + (active ? 'is-active' : 'is-resolved'));
    const body = el('div', 'incident-body');
    body.append(el('div', 'incident-title', i.monitor_name + (active ? ' is down' : ' went down')));
    const d = el('div', 'incident-details');
    d.append(
        el('span', 'mono', i.monitor_url),
        el('span', '', 'Started ' + fmtTime(i.started_at)),
        el('span', '', active ? 'Ongoing — ' + fmtDuration(i.started_at) : 'Duration: ' + fmtDuration(i.started_at, i.resolved_at))
    );
    if (i.cause) d.append(el('span', '', 'Cause: ' + i.cause));
    body.append(d);
    a.append(body, el('span', active ? 'badge badge-danger' : 'badge badge-success', active ? 'Active' : 'Resolved'));
    return a;
}

function monitorLink(m) {
    const a = el('a', 'monitor-name', m.name);
    a.href = 'monitor-detail.html?id=' + m.id;
    return a;
}
