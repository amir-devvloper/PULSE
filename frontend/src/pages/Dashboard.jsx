import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Badge, Card, CountUp, Empty, list, useLoad } from '../ui.jsx';
import { statusOf } from '../api.js';
export default function Dashboard() {
  const [d] = useLoad('/monitors', 30000), [a] = useLoad('/analytics/summary?hours=24');
  const ms = d?.monitors || [], s = a?.summary;
  const stats = [['Uptime 24h', s?.uptimePercent, '%', 2], ['Avg response', s?.avgResponseMs, 'ms', 0], ['Incidents', s?.incidents, '', 0], ['Monitors', ms.length, '', 0]];
  return (<><h1>Dashboard</h1>
    <motion.div className="grid4" variants={list} initial="hidden" animate="show">
      {stats.map(([l, v, u, dp]) => <Card key={l}><span className="label">{l}</span><b className="big-n"><CountUp value={v} suffix={u} decimals={dp} /></b></Card>)}
    </motion.div>
    <h2>Monitors</h2>
    {d && !ms.length && <Empty>No monitors yet. <Link to="/monitors">Add your first one.</Link></Empty>}
    <motion.div className="stack" variants={list} initial="hidden" animate="show">
      {ms.map(m => { const [k, t] = statusOf(m); return <Card key={m.id} className="row between"><Link to={'/monitors/' + m.id}><b>{m.name}</b><span className="muted small mono"> {m.url}</span></Link><Badge kind={k}>{t}</Badge></Card>; })}
    </motion.div></>);
}
