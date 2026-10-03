import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../api.js';
import { Btn } from '../ui.jsx';
const cfg = {
  login: ['Welcome back', 'Log in', '/auth/login', ['email', 'password']],
  signup: ['Create account', 'Sign up', '/auth/signup', ['name', 'email', 'password']],
  'forgot-password': ['Reset password', 'Send link', '/auth/forgot', ['email']],
  'reset-password': ['New password', 'Save password', '/auth/reset', ['password']]
};
export default function Auth({ mode }) {
  const [title, cta, path, fields] = cfg[mode], nav = useNavigate(), [q] = useSearchParams();
  const [f, setF] = useState({}), [err, setErr] = useState(''), [msg, setMsg] = useState(''), [busy, setBusy] = useState(false);
  const submit = async e => {
    e.preventDefault(); setErr(''); setBusy(true);
    try {
      await api(path, { method: 'POST', body: mode === 'reset-password' ? { ...f, token: q.get('token') } : f });
      if (mode === 'forgot-password') setMsg('If the account exists, a reset link is on its way.');
      else nav(mode === 'reset-password' ? '/login' : '/dashboard');
    } catch (x) { setErr(x.message); } finally { setBusy(false); }
  };
  return (<motion.div className="auth" exit={{ opacity: 0 }}>
    <motion.form className="card auth-card" onSubmit={submit} initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}>
      <Link to="/" className="brand">PULSE</Link><h2>{title}</h2>
      {fields.map(k => <label key={k}><span>{k}</span><input required type={k === 'password' ? 'password' : k === 'email' ? 'email' : 'text'} onChange={e => setF({ ...f, [k]: e.target.value })} /></label>)}
      <AnimatePresence>{(err || msg) && <motion.p key="m" className={err ? 'err' : 'ok-t'} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>{err || msg}</motion.p>}</AnimatePresence>
      <Btn variant="primary" disabled={busy}>{busy ? '…' : cta}</Btn>
      <p className="muted small">{mode === 'login' ? <><Link to="/signup">Create account</Link> · <Link to="/forgot-password">Forgot password?</Link></> : <Link to="/login">Back to log in</Link>}</p>
    </motion.form></motion.div>);
}
