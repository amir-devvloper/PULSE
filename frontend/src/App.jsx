import { Routes, Route, NavLink, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { api } from './api.js';
import { Btn } from './ui.jsx';
import Landing from './pages/Landing.jsx';
import Auth from './pages/Auth.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Monitors from './pages/Monitors.jsx';
import MonitorDetail from './pages/MonitorDetail.jsx';
import Incidents from './pages/Incidents.jsx';
import Analytics from './pages/Analytics.jsx';
import Settings from './pages/Settings.jsx';

const links = [['dashboard', 'Dashboard'], ['monitors', 'Monitors'], ['incidents', 'Incidents'], ['analytics', 'Analytics'], ['settings', 'Settings']];

function Shell({ children }) {
  const nav = useNavigate(), { pathname } = useLocation();
  const out = async () => { await api('/auth/logout', { method: 'POST' }); nav('/'); };
  return (<>
    <header className="nav"><div className="nav-in">
      <NavLink to="/dashboard" className="brand">PULSE</NavLink>
      <nav>{links.map(([to, label]) => (
        <NavLink key={to} to={'/' + to} className="link">
          {pathname.startsWith('/' + to) && <motion.span layoutId="pill" className="pill" transition={{ type: 'spring', stiffness: 500, damping: 36 }} />}
          <span>{label}</span>
        </NavLink>))}</nav>
      <Btn variant="ghost" onClick={out}>Log out</Btn>
    </div></header>
    <main className="wrap">{children}</main>
  </>);
}
const page = el => <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>{el}</motion.div>;
const app = el => <Shell>{page(el)}</Shell>;

export default function App() {
  const loc = useLocation();
  return (<>
    <div className="bg" />
    <AnimatePresence mode="wait">
      <Routes location={loc} key={loc.pathname.split('/')[1]}>
        <Route path="/" element={<Landing />} />
        {['login', 'signup', 'forgot-password', 'reset-password'].map(m => <Route key={m} path={'/' + m} element={<Auth mode={m} />} />)}
        <Route path="/dashboard" element={app(<Dashboard />)} />
        <Route path="/monitors" element={app(<Monitors />)} />
        <Route path="/monitors/:id" element={app(<MonitorDetail />)} />
        <Route path="/incidents" element={app(<Incidents />)} />
        <Route path="/analytics" element={app(<Analytics />)} />
        <Route path="/settings" element={app(<Settings />)} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </AnimatePresence>
  </>);
}
