const grid = document.getElementById('monitor-grid');

async function act(fn) {
    try { await fn(); } catch (e) { if (e.message !== 'Unauthorized') PulseFX.toast(e.message); }
    load();
}

function card(m) {
    const article = el('article', 'card card-hover monitor-card monitor-card--grid');
    const main = el('div', 'monitor-main');
    main.append(monitorLink(m), el('span', 'monitor-url', m.url));

    const st = statusOf(m);
    const pause = el('button', 'btn btn-ghost', m.is_active ? 'Pause' : 'Resume');
    pause.addEventListener('click', () => act(() =>
        api('/monitors/' + m.id, { method: 'PUT', body: { isActive: !m.is_active } })));
    const del = el('button', 'btn btn-ghost', 'Delete');
    del.addEventListener('click', async () => {
        if (!await PulseFX.confirm('Delete "' + m.name + '" and its history?')) return;
        act(() => api('/monitors/' + m.id, { method: 'DELETE' }));
    });

    const meta = el('div', 'monitor-meta');
    meta.append(
        el('span', st.cls, st.text),
        metric(m.uptime_24h == null ? '—' : m.uptime_24h + '%', 'Uptime 24h'),
        metric(m.last_response_time == null ? '—' : m.last_response_time + 'ms', 'Response')
    );
    const actions = el('div', 'monitor-actions');
    actions.append(pause, del);
    meta.append(actions);
    article.append(main, meta);
    return article;
}

async function load() {
    try {
        const { monitors } = await api('/monitors');
        grid.replaceChildren();
        if (!monitors.length) return grid.append(el('p', '', 'No monitors yet. Click "+ Add Monitor" to create one.'));
        monitors.forEach(m => grid.append(card(m)));
    } catch (e) {
        if (e.message !== 'Unauthorized') showError(grid, 'Could not load monitors.');
    }
}

load();
setInterval(load, 30000);