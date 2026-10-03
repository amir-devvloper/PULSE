import { motion } from 'motion/react';
import { fmtDur, fmtTime } from '../api.js';
import { Badge, Card, Empty, list, useLoad } from '../ui.jsx';
const Group = ({ title, items, empty }) => (<><h2>{title}</h2>{!items.length && <Empty>{empty}</Empty>}
  <motion.div className="stack" variants={list} initial="hidden" animate="show">{items.map(i => { const on = i.status === 'ongoing'; return (
    <Card key={i.id} className="row between"><div><b>{i.monitor_name}{on ? ' is down' : ' went down'}</b><br /><span className="muted small">{fmtTime(i.started_at)} · {on ? 'ongoing ' : ''}{fmtDur(i.started_at, i.resolved_at)}{i.cause ? ' · ' + i.cause : ''}</span></div><Badge kind={on ? 'bad' : 'ok'}>{on ? 'Active' : 'Resolved'}</Badge></Card>); })}</motion.div></>);
export default function Incidents() {
  const [d] = useLoad('/incidents', 30000), all = d?.incidents || [];
  return (<><h1>Incidents</h1><Group title="Active" items={all.filter(i => i.status === 'ongoing')} empty="No active incidents." /><Group title="Resolved" items={all.filter(i => i.status !== 'ongoing')} empty="No resolved incidents yet." /></>);
}
