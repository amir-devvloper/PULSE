import { useState } from 'react';
import { motion } from 'motion/react';
import { api } from '../api.js';
import { Card, list, useLoad } from '../ui.jsx';
const Toggle = ({ on, set, label }) => (<label className="row between"><span>{label}</span>
  <button type="button" role="switch" aria-checked={on} onClick={() => set(!on)} className={'sw' + (on ? ' on' : '')}><motion.i layout transition={{ type: 'spring', stiffness: 600, damping: 32 }} /></button></label>);
export default function Settings() {
  const [n, , reload] = useLoad('/notifications/settings'), [u] = useLoad('/auth/me'), [msg, setMsg] = useState('');
  const save = patch => api('/notifications/settings', { method: 'PUT', body: { emailAlerts: n.emailAlerts, weeklyDigest: n.weeklyDigest, ...patch } }).then(() => { reload(); setMsg('Saved'); setTimeout(() => setMsg(''), 1500); });
  return (<><h1>Settings</h1><motion.div className="stack" variants={list} initial="hidden" animate="show">
    <Card><h3>Account</h3><p className="muted">{u?.user?.name} · {u?.user?.email}</p></Card>
    {n && <Card><h3>Notifications</h3><Toggle label="Email alerts" on={n.emailAlerts} set={v => save({ emailAlerts: v })} /><Toggle label="Weekly digest" on={n.weeklyDigest} set={v => save({ weeklyDigest: v })} />
      {!n.emailConfigured && <p className="muted small">SMTP isn't configured, so emails are skipped.</p>}{msg && <p className="ok-t small">{msg}</p>}</Card>}
  </motion.div></>);
}
