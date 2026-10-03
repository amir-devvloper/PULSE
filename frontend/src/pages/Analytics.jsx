import { useState } from 'react';
import { motion } from 'motion/react';
import { Card, CountUp, list, useLoad } from '../ui.jsx';
const ranges = [[24, '24h'], [168, '7d'], [720, '30d']];
function Chart({ pts }) {
  if (!pts.length) return <p className="muted">No data in this range yet.</p>;
  const W = 600, H = 160, max = Math.max(...pts.map(p => p.v), 1) * 1.15;
  const x = i => (pts.length === 1 ? W / 2 : (i * W) / (pts.length - 1)), y = v => H - (v / max) * H;
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p.v)}`).join(' ');
  return (<svg viewBox={`0 0 ${W} ${H}`} className="chart"><defs><linearGradient id="g" x1="0" x2="1"><stop offset="0" stopColor="#34f0b0" /><stop offset="1" stopColor="#38bdf8" /></linearGradient></defs>
    <motion.path d={d} fill="none" stroke="url(#g)" strokeWidth="2.5" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1, ease: 'easeOut' }} key={d} /></svg>);
}
export default function Analytics() {
  const [h, setH] = useState(24), [a] = useLoad('/analytics/summary?hours=' + h), [s] = useLoad('/analytics/series?hours=' + h), sm = a?.summary;
  const pts = (s?.series || []).filter(p => p.avgResponseMs != null).map(p => ({ v: p.avgResponseMs }));
  return (<><div className="row between"><h1>Analytics</h1><div className="seg">{ranges.map(([v, l]) => <button key={v} onClick={() => setH(v)} className={h === v ? 'on' : ''}>{h === v && <motion.span layoutId="seg" className="pill" />}<span>{l}</span></button>)}</div></div>
    <motion.div className="grid4" variants={list} initial="hidden" animate="show" key={h}>
      {[['Uptime', sm?.uptimePercent, '%', 2], ['Avg response', sm?.avgResponseMs, 'ms', 0], ['Incidents', sm?.incidents, '', 0], ['Checks', sm?.checks, '', 0]].map(([l, v, u, dp]) => <Card key={l}><span className="label">{l}</span><b className="big-n"><CountUp value={v} suffix={u} decimals={dp} /></b></Card>)}
    </motion.div><h2>Response time</h2><Card><Chart pts={pts} /></Card></>);
}
