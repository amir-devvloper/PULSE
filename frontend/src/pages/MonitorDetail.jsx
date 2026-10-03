import { useParams, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { fmtDur, fmtTime } from '../api.js';
import { Card, Empty, list, useLoad } from '../ui.jsx';
export default function MonitorDetail() {
  const { id } = useParams(), [c] = useLoad(`/checks/monitor/${id}?limit=50`, 15000), [i] = useLoad(`/incidents/monitor/${id}`);
  return (<><Link to="/monitors" className="muted small">← Monitors</Link><h1>Monitor #{id}</h1>
    <h2>Recent checks</h2>{c && !c.checks.length && <Empty>No checks yet.</Empty>}
    <motion.div className="stack tight" variants={list} initial="hidden" animate="show">
      {c?.checks.map(k => <Card key={k.id ?? k.checked_at} className="row between"><span className={k.is_success ? 'ok-t' : 'err'}>{k.is_success ? 'Success' : 'Failed'} {k.status_code ?? ''}</span><span className="muted small">{k.response_time ?? '—'}ms · {fmtTime(k.checked_at)}</span></Card>)}
    </motion.div>
    <h2>Incidents</h2>{i && !i.incidents.length && <Empty>No incidents.</Empty>}
    <motion.div className="stack" variants={list} initial="hidden" animate="show">
      {i?.incidents.map(x => <Card key={x.id}>{fmtTime(x.started_at)} · {x.status === 'ongoing' ? 'ongoing' : fmtDur(x.started_at, x.resolved_at)}</Card>)}
    </motion.div></>);
}
