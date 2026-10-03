const id = new URLSearchParams(location.search).get('id');

function fmtInterval(sec) {
    return sec < 60 ? sec + 's' : sec < 3600 ? sec / 60 + ' min' : sec / 3600 + ' h';
}

function checksTable(checks) {
    if (!checks.length) return el('p', '', 'No checks yet. The first one runs within a few seconds of the interval.');
    const table = el('table', 'check-table');
    const head = el('tr');
    ['Time', 'Result', 'Status code', 'Response', 'Error'].forEach(h => head.append(el('th', '', h)));
    const thead = el('thead');
    thead.append(head);
    table.append(thead);
    const body = el('tbody');
    checks.forEach(c => {
        const tr = el('tr');
        tr.append(
            el('td', '', fmtTime(c.checked_at)),
            el('td', c.is_success ? 'ok' : 'bad', c.is_success ? 'Up' : 'Down'),
            el('td', '', c.status_code ?? '—'),
            el('td', '', c.response_time == null ? '—' : c.response_time + 'ms'),
            el('td', '', c.error_message || '')
        );
        body.append(tr);
    });
    table.append(body);
    return table;
}

async function load() {
    try {
        const [{ monitors }, { checks }, { incidents }] = await Promise.all([
            api('/monitors'),
            api(`/checks/monitor/${encodeURIComponent(id)}?limit=50`),
            api(`/incidents/monitor/${encodeURIComponent(id)}`)
        ]);
        const m = monitors.find(x => String(x.id) === String(id));
        if (!m) throw new Error('Monitor not found');

        document.title = m.name + ' — PULSE';
        document.getElementById('m-name').textContent = m.name;
        document.getElementById('m-url').textContent = `${m.method} ${m.url}`;
        const st = statusOf(m);
        const vals = document.querySelectorAll('.metric-value');
        vals[0].textContent = st.text;
        vals[0].className = 'metric-value ' + (st.text === 'Operational' ? 'is-success' : st.text === 'Down' ? 'is-danger' : '');
        vals[1].textContent = m.uptime_24h == null ? '—' : m.uptime_24h + '%';
        vals[2].textContent = m.last_response_time == null ? '—' : m.last_response_time + 'ms';
        vals[3].textContent = fmtInterval(m.interval_seconds);
        document.getElementById('m-expect').textContent = `Expects HTTP ${m.expected_status}, timeout ${m.timeout_ms / 1000}s`;

        const incBox = document.getElementById('m-incidents');
        incBox.replaceChildren();
        if (!incidents.length) incBox.append(el('p', '', 'No incidents for this monitor.'));
        incidents.slice(0, 10).forEach(i => incBox.append(incidentCard({ ...i, monitor_name: m.name, monitor_url: m.url })));

        document.getElementById('m-checks').replaceChildren(checksTable(checks));
    } catch (e) {
        if (e.message === 'Unauthorized') return;
        document.getElementById('m-name').textContent = 'Monitor not found';
        document.getElementById('m-url').textContent = '';
    }
}

load();
setInterval(load, 30000);
