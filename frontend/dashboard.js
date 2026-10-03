function greet(name) {
    const h = new Date().getHours();
    const part = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
    document.getElementById('greeting').textContent = name ? `${part}, ${name.split(' ')[0]}` : part;
}

async function load() {
    const list = document.querySelector('.monitor-list');
    const incList = document.querySelector('.incident-list');
    try {
        const [{ monitors }, { summary }, { incidents }] = await Promise.all([
            api('/monitors'), api('/analytics/summary?hours=24'), api('/incidents')
        ]);

        const vals = document.querySelectorAll('.metric-value');
        const down = monitors.filter(m => m.is_active && m.last_success === 0).length;
        const up = monitors.filter(m => m.is_active && m.last_success === 1).length;
        vals[0].textContent = monitors.length;
        vals[1].textContent = up;
        vals[2].textContent = down;
        vals[3].textContent = summary.uptimePercent == null ? '—' : summary.uptimePercent + '%';

        list.replaceChildren();
        if (!monitors.length) {
            const p = el('p', '', 'No monitors yet. ');
            const a = el('a', 'link', 'Add your first monitor');
            a.href = 'monitor.html';
            p.append(a);
            list.append(p);
        }
        monitors.slice(0, 6).forEach(m => {
            const st = statusOf(m);
            const a = el('article', 'card card-hover monitor-card');
            const main = el('div', 'monitor-main');
            main.append(monitorLink(m), el('span', 'monitor-url', m.url));
            const meta = el('div', 'monitor-meta');
            meta.append(el('span', st.cls, st.text), metric(m.last_response_time == null ? '—' : m.last_response_time + 'ms', 'Response'));
            a.append(main, meta);
            list.append(a);
        });

        incList.replaceChildren();
        if (!incidents.length) incList.append(el('p', '', 'No incidents. Everything looks good.'));
        incidents.slice(0, 3).forEach(i => incList.append(incidentCard(i)));
    } catch (e) {
        if (e.message === 'Unauthorized') return;
        showError(list, 'Could not load your monitors.');
        incList.replaceChildren();
    }
}

api('/auth/me').then(d => greet(d.user.name)).catch(() => greet());
load();
setInterval(load, 30000);
