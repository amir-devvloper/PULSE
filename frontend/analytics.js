const SVG_NS = 'http://www.w3.org/2000/svg';
let hours = 24;

function svg(tag, attrs = {}, text) {
    const n = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
    if (text !== undefined) n.textContent = text;
    return n;
}

function fmtBucket(t) {
    const d = new Date(t * 1000);
    return hours <= 24
        ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

// Line chart: points = [{ t, v }], fixedMax keeps uptime on a 0–100 scale.
// The draw-in plays on first render and when the range changes, never on the 30s refresh.
function drawChart(box, points, unit, fixedMax) {
    box.replaceChildren();
    if (!points.length) return box.append(el('div', 'chart-empty', 'No check data in this range yet.'));

    const W = 800, H = 230, L = 46, R = 12, T = 10, B = 26;
    const max = fixedMax ?? Math.max(...points.map(p => p.v), 1) * 1.15;
    const x = i => L + (points.length === 1 ? (W - L - R) / 2 : (i * (W - L - R)) / (points.length - 1));
    const y = v => T + (1 - v / max) * (H - T - B);

    const animate = box.dataset.range !== String(hours);
    box.dataset.range = hours;

    const stage = el('div', 'chart-stage' + (animate ? ' chart-draw' : ''));
    const root = svg('svg', { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: 'none' });

    const gid = 'area-' + box.id;
    const grad = svg('linearGradient', { id: gid, x1: 0, y1: 0, x2: 0, y2: 1 });
    grad.append(
        svg('stop', { offset: '0%', 'stop-color': '#34f0b0', 'stop-opacity': 0.3 }),
        svg('stop', { offset: '100%', 'stop-color': '#34f0b0', 'stop-opacity': 0 })
    );
    const defs = svg('defs');
    defs.append(grad);
    root.append(defs);

    for (let g = 0; g <= 4; g++) {
        const gy = T + (g / 4) * (H - T - B);
        root.append(svg('line', { x1: L, x2: W - R, y1: gy, y2: gy, stroke: 'var(--border)' }));
        const label = Math.round(max * (1 - g / 4));
        root.append(svg('text', { x: L - 8, y: gy + 4, 'text-anchor': 'end', fill: 'var(--text-muted)', 'font-size': 11 }, label + unit));
    }
    const step = Math.max(1, Math.ceil(points.length / 6));
    points.forEach((p, i) => {
        if (i % step === 0)
            root.append(svg('text', { x: x(i), y: H - 6, 'text-anchor': 'middle', fill: 'var(--text-muted)', 'font-size': 11 }, fmtBucket(p.t)));
    });

    const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ');
    const base = H - B;
    root.append(
        svg('path', { d: `${line} L${x(points.length - 1).toFixed(1)},${base} L${x(0).toFixed(1)},${base} Z`, fill: `url(#${gid})`, class: 'chart-area' }),
        svg('path', { d: line, class: 'chart-line', pathLength: 1 })
    );

    const guide = el('div', 'chart-guide');
    const dot = el('div', 'chart-dot');
    const tip = el('div', 'chart-tip');
    stage.append(root, guide, dot, tip);

    stage.addEventListener('pointermove', e => {
        const r = stage.getBoundingClientRect();
        const vx = ((e.clientX - r.left) / r.width) * W;
        let i = points.length === 1 ? 0 : Math.round(((vx - L) / (W - L - R)) * (points.length - 1));
        i = Math.max(0, Math.min(points.length - 1, i));
        const px = (x(i) / W) * r.width, py = (y(points[i].v) / H) * r.height;
        guide.style.transform = `translateX(${px}px)`;
        dot.style.transform = `translate(${px}px, ${py}px)`;
        tip.replaceChildren(el('strong', '', points[i].v + unit), el('span', '', fmtBucket(points[i].t)));
        const left = Math.min(Math.max(px - tip.offsetWidth / 2, 0), r.width - tip.offsetWidth);
        tip.style.transform = `translate(${left}px, ${Math.max(py - tip.offsetHeight - 14, 0)}px)`;
        stage.classList.add('is-hover');
    });
    stage.addEventListener('pointerleave', () => stage.classList.remove('is-hover'));

    box.append(stage);
}

async function load() {
    const vals = document.querySelectorAll('.metric-value');
    const subs = document.querySelectorAll('.metric-sub');
    const label = { 24: 'Last 24 hours', 168: 'Last 7 days', 720: 'Last 30 days' }[hours];
    try {
        const [{ summary: s }, { series }] = await Promise.all([
            api('/analytics/summary?hours=' + hours),
            api('/analytics/series?hours=' + hours)
        ]);
        vals[0].textContent = s.uptimePercent == null ? '—' : s.uptimePercent + '%';
        vals[1].textContent = s.avgResponseMs == null ? '—' : s.avgResponseMs + 'ms';
        vals[2].textContent = s.incidents;
        vals[3].textContent = s.checks.toLocaleString();
        subs[0].textContent = 'Across ' + s.monitors.total + ' monitor' + (s.monitors.total === 1 ? '' : 's');
        subs[1].textContent = subs[2].textContent = subs[3].textContent = label;

        drawChart(document.getElementById('chart-response'),
            series.filter(p => p.avgResponseMs != null).map(p => ({ t: p.t, v: p.avgResponseMs })), 'ms');
        drawChart(document.getElementById('chart-uptime'),
            series.map(p => ({ t: p.t, v: p.uptimePercent })), '%', 100);
    } catch (e) {
        if (e.message === 'Unauthorized') return;
        for (const id of ['chart-response', 'chart-uptime'])
            showError(document.getElementById(id), 'Could not load analytics.');
    }
}

document.querySelectorAll('.time-range button').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.time-range button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        hours = Number(btn.dataset.hours);
        load();
    });
});

load();
setInterval(load, 30000);
