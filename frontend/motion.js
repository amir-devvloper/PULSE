/*
  PULSE motion layer — vanilla ports of React-style effects (count-up, split text,
  tilt, magnet, sliding tab thumb, toast, dialog). No build step, no dependencies.
  Rules: transform/opacity only, strong ease-out, hover gated to real pointers,
  everything gentler or off under prefers-reduced-motion.
*/
(() => {
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;

    // cubic-bezier solver so JS tweens use the same curve as --ease-out (0.23, 1, 0.32, 1)
    const bezier = (x1, y1, x2, y2) => {
        const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
        const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
        const X = t => ((ax * t + bx) * t + cx) * t;
        const Y = t => ((ay * t + by) * t + cy) * t;
        const dX = t => (3 * ax * t + 2 * bx) * t + cx;
        return x => {
            let t = x;
            for (let i = 0; i < 6; i++) {
                const e = X(t) - x, d = dX(t);
                if (Math.abs(e) < 1e-5 || Math.abs(d) < 1e-6) break;
                t -= e / d;
            }
            return Y(t);
        };
    };
    const easeOut = bezier(0.23, 1, 0.32, 1);

    // ---------- cursor spotlight (cards) ----------
    if (fine && !still) {
        document.addEventListener('pointermove', e => {
            const card = e.target.closest?.('.card, .bento-card, .metric-card, .monitor-card, .incident-card');
            if (!card) return;
            const r = card.getBoundingClientRect();
            card.style.setProperty('--mx', e.clientX - r.left + 'px');
            card.style.setProperty('--my', e.clientY - r.top + 'px');
        }, { passive: true });
    }

    // ---------- count-up for numbers ----------
    const NUM = /^(\D*?)(-?\d[\d,]*\.?\d*)(.*)$/;
    const group = s => s.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

    function tween(el, target) {
        const token = el._tk = (el._tk || 0) + 1;
        const m = NUM.exec(target);
        if (!m || still) {
            el._w = target; el._v = m ? parseFloat(m[2].replace(/,/g, '')) : null;
            if (el.textContent !== target) el.textContent = target;
            return;
        }
        const to = parseFloat(m[2].replace(/,/g, ''));
        const dec = (m[2].split('.')[1] || '').length;
        const comma = m[2].includes(',');
        const from = el._v ?? 0;
        const dur = el._seen ? 400 : 700;
        el._seen = true; el._v = to;
        if (from === to) { el._w = target; el.textContent = target; return; }
        const t0 = performance.now();
        const step = now => {
            if (el._tk !== token) return;
            const p = Math.min(1, (now - t0) / dur);
            const n = (from + (to - from) * easeOut(p)).toFixed(dec);
            const txt = p === 1 ? target : m[1] + (comma ? group(n) : n) + m[3];
            el._w = txt; el.textContent = txt;
            if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    }

    // live metrics: any change to the text (first load or 30s poll) tweens from the last value
    document.querySelectorAll('.metric-value').forEach(el => {
        new MutationObserver(() => {
            const t = el.textContent;
            if (t !== el._w) tween(el, t);
        }).observe(el, { childList: true, characterData: true, subtree: true });
    });

    // ---------- scroll reveal (landing) + count-up for the stats strip ----------
    if (!still && 'IntersectionObserver' in window) {
        const io = new IntersectionObserver(entries => {
            for (const en of entries) {
                if (!en.isIntersecting) continue;
                const el = en.target;
                el.classList.add('is-in');
                io.unobserve(el);
                const val = el.querySelector('.stat-value');
                if (val) tween(val, val.textContent);
                // hand hover transitions back to the component once the reveal has played
                setTimeout(() => {
                    el.removeAttribute('data-reveal');
                    el.classList.remove('is-in');
                    el.style.transitionDelay = '';
                }, 700 + parseFloat(el.style.transitionDelay || 0));
            }
        }, { threshold: 0.12 });
        document.querySelectorAll('.bento-card, .features > *, .stats-strip .stat').forEach((el, i) => {
            el.setAttribute('data-reveal', '');
            el.style.transitionDelay = (i % 4) * 60 + 'ms';
            io.observe(el);
        });
    }

    // ---------- split text: word-by-word entrance ----------
    document.querySelectorAll('[data-split]').forEach(h => {
        h.setAttribute('aria-label', h.textContent.replace(/\s+/g, ' ').trim());
        let i = 0;
        const walk = node => [...node.childNodes].forEach(n => {
            if (n.nodeType === 3) {
                const frag = document.createDocumentFragment();
                n.textContent.split(/(\s+)/).forEach(tok => {
                    if (!tok) return;
                    if (/^\s+$/.test(tok)) return frag.append(' ');
                    const w = document.createElement('span');
                    w.className = 'w';
                    w.setAttribute('aria-hidden', 'true');
                    w.style.setProperty('--i', i++);
                    w.textContent = tok;
                    frag.append(w);
                });
                n.replaceWith(frag);
            } else if (n.nodeType === 1) walk(n);
        });
        walk(h);
    });

    // ---------- tilt (decorative, spring-smoothed) ----------
    if (fine && !still) {
        document.querySelectorAll('.bento-card').forEach(card => {
            let rx = 0, ry = 0, tx = 0, ty = 0, raf = 0;
            const loop = () => {
                rx += (tx - rx) * 0.14; ry += (ty - ry) * 0.14;
                card.style.transform = `perspective(900px) translateY(-3px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;
                raf = Math.abs(tx - rx) > 0.01 || Math.abs(ty - ry) > 0.01 ? requestAnimationFrame(loop) : 0;
            };
            card.addEventListener('pointermove', e => {
                const r = card.getBoundingClientRect();
                ty = ((e.clientX - r.left) / r.width - 0.5) * 8;
                tx = -((e.clientY - r.top) / r.height - 0.5) * 8;
                card.style.transition = 'border-color 200ms ease, box-shadow 260ms cubic-bezier(0.23, 1, 0.32, 1)';
                if (!raf) raf = requestAnimationFrame(loop);
            });
            card.addEventListener('pointerleave', () => {
                cancelAnimationFrame(raf); raf = 0; rx = ry = tx = ty = 0;
                card.style.transition = ''; card.style.transform = '';
            });
        });

        // ---------- magnet buttons ----------
        const magnets = [...document.querySelectorAll('[data-magnet]')].map(b => ({ b, x: 0, y: 0, tx: 0, ty: 0, raf: 0 }));
        const run = m => {
            m.x += (m.tx - m.x) * 0.18; m.y += (m.ty - m.y) * 0.18;
            m.b.style.translate = `${m.x.toFixed(1)}px ${m.y.toFixed(1)}px`;
            m.raf = Math.abs(m.tx - m.x) > 0.1 || Math.abs(m.ty - m.y) > 0.1 ? requestAnimationFrame(() => run(m)) : 0;
        };
        if (magnets.length) document.addEventListener('pointermove', e => {
            for (const m of magnets) {
                const r = m.b.getBoundingClientRect();
                const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
                const near = Math.hypot(dx, dy) < Math.max(r.width, r.height) / 2 + 70;
                m.tx = near ? dx * 0.22 : 0; m.ty = near ? dy * 0.28 : 0;
                if (!m.raf) m.raf = requestAnimationFrame(() => run(m));
            }
        }, { passive: true });
    }

    // ---------- sliding thumb for segmented controls (.time-range) ----------
    document.querySelectorAll('.time-range').forEach(tr => {
        const thumb = document.createElement('span');
        thumb.className = 'tr-thumb';
        tr.prepend(thumb);
        const place = instant => {
            const a = tr.querySelector('button.active');
            if (!a) return;
            if (instant) thumb.style.transition = 'none';
            thumb.style.transform = `translateX(${a.offsetLeft}px) scaleX(${a.offsetWidth})`;
            if (instant) requestAnimationFrame(() => requestAnimationFrame(() => { thumb.style.transition = ''; }));
        };
        place(true);
        document.fonts?.ready.then(() => place(true));
        tr.addEventListener('click', () => place(false));
        addEventListener('resize', () => place(true));
    });

    // ---------- don't replay card entrances on the 30s refresh ----------
    document.querySelectorAll('.monitor-list, #monitor-grid, .incident-list, #m-incidents').forEach(c => {
        new MutationObserver(() => {
            if (c.dataset.seen) c.dataset.live = '1';
            c.dataset.seen = '1';
        }).observe(c, { childList: true });
    });

    // ---------- toast + confirm dialog (replace alert/confirm) ----------
    function toast(message, kind = 'error') {
        let box = document.getElementById('toasts');
        if (!box) {
            box = document.createElement('div');
            box.id = 'toasts';
            box.setAttribute('aria-live', 'polite');
            document.body.append(box);
        }
        const t = document.createElement('div');
        t.className = 'toast toast-' + kind;
        t.setAttribute('role', kind === 'error' ? 'alert' : 'status');
        t.textContent = message;
        box.append(t);
        const close = () => { t.dataset.out = ''; setTimeout(() => t.remove(), 220); };
        const timer = setTimeout(close, 4500);
        t.addEventListener('click', () => { clearTimeout(timer); close(); });
    }

    function confirmDialog(message, { confirmText = 'Delete', danger = true } = {}) {
        return new Promise(resolve => {
            const d = document.createElement('dialog');
            d.className = 'modal';
            const p = document.createElement('p');
            p.textContent = message;
            const row = document.createElement('div');
            row.className = 'modal-actions';
            const no = document.createElement('button');
            no.type = 'button'; no.className = 'btn btn-ghost'; no.textContent = 'Cancel';
            const yes = document.createElement('button');
            yes.type = 'button'; yes.className = 'btn ' + (danger ? 'btn-danger-solid' : 'btn-primary'); yes.textContent = confirmText;
            row.append(no, yes);
            d.append(p, row);
            document.body.append(d);
            let result = false;
            const finish = value => {
                if (d.dataset.out !== undefined) return;
                result = value; d.dataset.out = '';
                setTimeout(() => d.close(), still ? 0 : 160);
            };
            no.addEventListener('click', () => finish(false));
            yes.addEventListener('click', () => finish(true));
            d.addEventListener('cancel', e => { e.preventDefault(); finish(false); });
            d.addEventListener('pointerdown', e => { if (e.target === d) finish(false); });
            d.addEventListener('close', () => { d.remove(); resolve(result); });
            d.showModal();
            no.focus();
        });
    }

    window.PulseFX = { toast, confirm: confirmDialog, countUp: tween };
})();
