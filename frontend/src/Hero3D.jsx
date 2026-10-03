// Isolated WebGL scene — plain three.js, no Motion inside this tree (the two fight over frames).
// PULSE core → check pulse → service node → response pulse back. Labels are DOM, projected from 3D each frame.
import { useEffect, useRef } from 'react';
import * as THREE from 'three';

const VERT = `uniform float uT;varying vec3 vN;varying vec3 vP;
void main(){vec3 p=position;float d=sin(p.x*2.2+uT*.8)*sin(p.y*2.4+uT*.7)*sin(p.z*2.0+uT*.9)*.16;p+=normal*d;
vN=normalize(normalMatrix*normal);vec4 mv=modelViewMatrix*vec4(p,1.);vP=-mv.xyz;gl_Position=projectionMatrix*mv;}`;
const FRAG = `uniform float uF;varying vec3 vN;varying vec3 vP;
void main(){float f=pow(1.-max(dot(normalize(vN),normalize(vP)),0.),2.4);
vec3 c=mix(vec3(.02,.09,.12),mix(vec3(.2,.94,.69),vec3(.22,.74,.97),f),f);gl_FragColor=vec4(c+f*.35+uF*vec3(.08,.2,.18),1.);}`;

const COL = { ok: 0x34f0b0, slow: 0xfbbf24, down: 0xff5d6c }, DATA = 0x38bdf8;
const SERVICES = [
  { name: 'API', pos: [-4.1, 2.1, 0.8], base: 24 }, { name: 'WEB', pos: [4.2, 2.3, -0.6], base: 38 },
  { name: 'DB', pos: [-4.2, -2.2, -0.6], base: 21 }, { name: 'AUTH', pos: [4.1, -2.3, 0.9], base: 17 },
  { name: 'CDN', pos: [0.3, 3.3, -1.8], base: 9 }
];
// scripted story, loops: DB slows, AUTH goes down, both recover
const LOOP = 36, STEPS = [[6, 'DB', 'slow'], [13, 'AUTH', 'down'], [22, 'DB', 'ok'], [28, 'AUTH', 'ok']];
const ease = u => (u < .5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2), clamp = u => Math.min(1, Math.max(0, u));

export default function Hero3D() {
  const box = useRef(null), layer = useRef(null);
  useEffect(() => {
    const el = box.current, lay = layer.current, still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let renderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); } catch { return; }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    el.insertBefore(renderer.domElement, el.firstChild);
    const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100), root = new THREE.Group();
    camera.position.set(0, 0.4, 12); scene.add(root, new THREE.AmbientLight(0x88aaff, 0.5));
    const key = new THREE.PointLight(0x34f0b0, 60, 40); key.position.set(4, 5, 7);
    const rim = new THREE.PointLight(0x38bdf8, 45, 40); rim.position.set(-6, -3, 5); scene.add(key, rim);

    // core
    const uni = { uT: { value: 0 }, uF: { value: 0 } };
    root.add(new THREE.Mesh(new THREE.IcosahedronGeometry(1.5, 28), new THREE.ShaderMaterial({ uniforms: uni, vertexShader: VERT, fragmentShader: FRAG })));
    const rings = [[2.45, 0x34f0b0, [1.2, 0.2, 0], 0.35], [2.95, 0x38bdf8, [-0.5, 0.9, 0], -0.25], [3.45, 0xdff7ee, [0.3, -0.7, 0.8], 0.18]].map(([R, col, tilt, spd]) => {
      const wrap = new THREE.Group(), spin = new THREE.Group(); wrap.rotation.set(...tilt);
      spin.add(new THREE.Mesh(new THREE.TorusGeometry(R, 0.012, 8, 220), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.35 })));
      const sat = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 16), new THREE.MeshBasicMaterial({ color: col })); sat.position.x = R; spin.add(sat);
      wrap.add(spin); root.add(wrap); return { spin, spd };
    });

    // service nodes: icosahedron + status core, connection line to PULSE, DOM label
    const nodes = SERVICES.map((s, i) => {
      const g = new THREE.IcosahedronGeometry(0.34 + (i % 2) * 0.08, 0), grp = new THREE.Group(), p = new THREE.Vector3(...s.pos);
      const body = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0x0a1822, metalness: 0.85, roughness: 0.25, flatShading: true }));
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(g), new THREE.LineBasicMaterial({ color: COL.ok }));
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 12), new THREE.MeshBasicMaterial({ color: COL.ok }));
      grp.add(body, edges, dot); grp.position.copy(p); root.add(grp);
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), p]), new THREE.LineBasicMaterial({ color: COL.ok, transparent: true, opacity: 0.32 })); root.add(line);
      const lab = document.createElement('div'); lab.className = 'svc' + (p.x < 0 ? ' L' : '');
      lab.innerHTML = '<div class="in"><span class="n"><i></i><b></b></span><u></u></div>'; lab.querySelector('b').textContent = s.name; lay.appendChild(lab);
      return { ...s, p, grp, edges, dot, line, lab, u: lab.querySelector('u'), col: new THREE.Color(COL.ok), tgt: new THREE.Color(COL.ok), status: 'ok', ack: 0, ph: i * 1.7 };
    });
    const latency = n => (n.status === 'down' ? 'DOWN' : n.status === 'slow' ? 150 + Math.round(Math.random() * 60) + 'ms' : n.base + Math.round(Math.random() * 6 - 3) + 'ms');
    const setStatus = (n, s, snap) => { n.status = s; n.tgt.set(COL[s]); if (snap) n.col.copy(n.tgt); n.u.textContent = latency(n); };
    nodes.forEach(n => setStatus(n, 'ok', true));

    // pulse pool
    const pool = Array.from({ length: 4 }, () => {
      const g = new THREE.Group(), a = new THREE.MeshBasicMaterial({ color: DATA, transparent: true }), h = new THREE.MeshBasicMaterial({ color: DATA, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false });
      g.add(new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 12), a), new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 12), h));
      g.visible = false; root.add(g); return { g, a, h, busy: false };
    });
    const live = [];

    // dust
    const dust = new Float32Array(900); for (let i = 0; i < 900; i += 3) { dust[i] = (Math.random() - .5) * 20; dust[i + 1] = (Math.random() - .5) * 11; dust[i + 2] = (Math.random() - .5) * 10; }
    const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(dust, 3));
    root.add(new THREE.Points(dg, new THREE.PointsMaterial({ color: 0x7fe9d0, size: 0.035, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false })));

    let W = 1, H = 1;
    const size = () => { W = el.clientWidth; H = el.clientHeight; renderer.setSize(W, H, false); camera.aspect = W / H; camera.updateProjectionMatrix(); const wide = W > 900; root.position.x = wide ? 2.4 : 0; root.position.y = wide ? 0 : -1.4; root.scale.setScalar(wide ? 1 : Math.max(0.55, W / 900)); };
    const ro = new ResizeObserver(size); ro.observe(el); size();
    const v = new THREE.Vector3();
    const place = () => { root.updateMatrixWorld(true); nodes.forEach(n => { n.grp.getWorldPosition(v).project(camera); n.lab.style.transform = `translate3d(${((v.x * .5 + .5) * W).toFixed(1)}px,${((-v.y * .5 + .5) * H).toFixed(1)}px,0)`; }); };
    const tint = n => { const hex = n.col.getHex(); n.edges.material.color.setHex(hex); n.dot.material.color.setHex(hex); n.line.material.color.setHex(hex); n.lab.style.setProperty('--c', '#' + n.col.getHexString()); };

    const m = { x: 0, y: 0 }, cur = { x: 0, y: 0 };
    const move = e => { m.x = e.clientX / innerWidth - .5; m.y = e.clientY / innerHeight - .5; };
    if (!still) addEventListener('pointermove', move, { passive: true });

    let visible = true, raf = 0, prev = 0, nextPulse = 1.2, rr = 0, flash = 0; const done = STEPS.map(() => -1), t0 = performance.now();
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0 }); io.observe(el);
    const launch = t => { const p = pool.find(x => !x.busy), n = nodes[rr++ % nodes.length]; if (!p) return; p.busy = true; p.g.visible = true; p.a.color.setHex(DATA); p.h.color.setHex(DATA); p.a.opacity = 1; p.h.opacity = 0.25; live.push({ p, n, t0: t, out: 0.9, back: n.status === 'slow' ? 1.7 : 0.8, ack: false }); flash = 1; };

    const frame = () => {
      raf = requestAnimationFrame(frame); if (!visible || document.hidden) return;
      const t = (performance.now() - t0) / 1000, dt = Math.min(0.05, t - prev); prev = t;
      const cyc = Math.floor(t / LOOP), ph = t % LOOP;
      STEPS.forEach(([at, name, s], i) => { if (ph >= at && done[i] !== cyc) { done[i] = cyc; setStatus(nodes.find(n => n.name === name), s); } });
      if (t >= nextPulse) { launch(t); nextPulse = t + 1.3; }
      for (let i = live.length - 1; i >= 0; i--) {
        const L = live[i], e = t - L.t0, n = L.n;
        if (e < L.out) L.p.g.position.lerpVectors(v.set(0, 0, 0), n.p, ease(e / L.out));
        else if (n.status === 'down') { L.p.g.position.copy(n.p); const f = clamp((e - L.out) / 0.5); L.p.a.opacity = L.p.h.opacity = 1 - f; if (f >= 1) { L.p.busy = false; L.p.g.visible = false; L.p.a.opacity = 1; L.p.h.opacity = 0.25; live.splice(i, 1); } }
        else {
          if (!L.ack) { L.ack = true; n.ack = 1; L.p.a.color.copy(n.col); L.p.h.color.copy(n.col); }
          const u = (e - L.out) / L.back; L.p.g.position.lerpVectors(n.p, v.set(0, 0, 0), ease(clamp(u)));
          if (u >= 1) { n.u.textContent = latency(n); L.p.busy = false; L.p.g.visible = false; live.splice(i, 1); }
        }
      }
      nodes.forEach(n => { if (!n.col.equals(n.tgt)) { n.col.lerp(n.tgt, 0.05); tint(n); } n.ack = Math.max(0, n.ack - dt * 3); n.grp.scale.setScalar(1 + n.ack * 0.14); n.grp.rotation.x = t * 0.3 + n.ph; n.grp.rotation.y = t * 0.4; });
      flash = Math.max(0, flash - dt * 2.4); uni.uF.value = flash; uni.uT.value = t; rings.forEach(r => { r.spin.rotation.z = t * r.spd; });
      cur.x += (m.x - cur.x) * 0.05; cur.y += (m.y - cur.y) * 0.05;
      root.rotation.y = -0.2 + cur.x * 0.5 + Math.sin(t * 0.25) * 0.06; root.rotation.x = cur.y * 0.25;
      place(); renderer.render(scene, camera);
    };
    if (still) { setStatus(nodes[2], 'slow', true); setStatus(nodes[3], 'down', true); nodes.forEach(tint); root.rotation.y = -0.2; place(); renderer.render(scene, camera); } else { nodes.forEach(tint); frame(); }

    return () => {
      cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); removeEventListener('pointermove', move);
      scene.traverse(o => { o.geometry?.dispose(); o.material?.dispose?.(); });
      lay.replaceChildren(); renderer.dispose(); renderer.domElement.remove();
    };
  }, []);
  return (<div ref={box} className="hero3d" aria-hidden="true"><div ref={layer} className="svc-layer" /><div className="live"><i />LIVE MONITORING</div></div>);
}
