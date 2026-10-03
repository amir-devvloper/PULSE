import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { api, statusOf } from '../api.js';
import { Badge, Btn, Card, Empty, list, useLoad } from '../ui.jsx';
const blank = { monitorName: '', url: '', method: 'GET', interval: 60, expectedStatus: 200, timeout: 10000 };
export default function Monitors() {
  const [d, , reload] = useLoad('/monitors'), [open, setOpen] = useState(false), [f, setF] = useState(blank), [err, setErr] = useState('');
  const act = fn => fn().then(reload).catch(e => setErr(e.message));
  const add = e => { e.preventDefault(); act(async () => { await api('/monitors', { method: 'POST', body: { ...f, interval: +f.interval, expectedStatus: +f.expectedStatus, timeout: +f.timeout } }); setOpen(false); setF(blank); setErr(''); }); };
  return (<><div className="row between"><h1>Monitors</h1><Btn variant="primary" onClick={() => setOpen(!open)}>{open ? 'Cancel' : '+ Add monitor'}</Btn></div>
    <AnimatePresence initial={false}>{open && <motion.form key="f" className="card form" onSubmit={add} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
      {[['monitorName', 'Name'], ['url', 'URL'], ['interval', 'Interval (s)'], ['expectedStatus', 'Expected status'], ['timeout', 'Timeout (ms)']].map(([k, l]) => <label key={k}><span>{l}</span><input required value={f[k]} onChange={e => setF({ ...f, [k]: e.target.value })} /></label>)}
      {err && <p className="err">{err}</p>}<Btn variant="primary">Create</Btn></motion.form>}</AnimatePresence>
    {d && !d.monitors.length && <Empty>No monitors yet.</Empty>}
    <motion.div className="stack" variants={list} initial="hidden" animate="show"><AnimatePresence>
      {d?.monitors.map(m => { const [k, t] = statusOf(m); return (
        <Card key={m.id} layout exit={{ opacity: 0, x: -20 }} className="row between">
          <Link to={'/monitors/' + m.id}><b>{m.name}</b><br /><span className="muted small mono">{m.url}</span></Link>
          <div className="row"><span className="muted small">{m.uptime_24h ?? '—'}% · {m.last_response_time ?? '—'}ms</span><Badge kind={k}>{t}</Badge>
            <Btn variant="ghost" onClick={() => act(() => api('/monitors/' + m.id, { method: 'PUT', body: { isActive: !m.is_active } }))}>{m.is_active ? 'Pause' : 'Resume'}</Btn>
            <Btn variant="ghost" onClick={() => confirm(`Delete "${m.name}"?`) && act(() => api('/monitors/' + m.id, { method: 'DELETE' }))}>Delete</Btn></div>
        </Card>); })}</AnimatePresence></motion.div></>);
}
