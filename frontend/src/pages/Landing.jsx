import { lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Btn, CountUp, item, list } from '../ui.jsx';

const Hero3D = lazy(() => import('../Hero3D.jsx'));
const features = [
  ['Uptime monitoring', 'Checks on the schedule you set, as often as every 10 seconds. An incident opens only after consecutive failures, so one blip never pages you.', 'wide'],
  ['Response time', 'Track latency trends and catch slow creep before it turns into an outage.'],
  ['Incident timeline', 'Every failure logged from the first failed check to recovery.'],
  ['Email alerts', 'Get an email when a monitor goes down and when it recovers, plus an optional weekly digest.']
];
const stats = [[10, 's', 'Fastest check interval'], [2, '', 'Failed checks to open an incident'], [30, ' days', 'Check history kept']];

export default function Landing() {
  return (<motion.div exit={{ opacity: 0 }}>
    <header className="nav"><div className="nav-in"><Link to="/" className="brand">PULSE</Link>
      <div className="row"><Link to="/login"><Btn variant="ghost">Log in</Btn></Link><Link to="/signup"><Btn variant="primary">Get started</Btn></Link></div></div></header>

    <section className="hero">
      <Suspense fallback={null}><Hero3D /></Suspense>
      <div className="hero-copy">
        <p className="eyebrow">Uptime &amp; API monitoring</p>
        <h1>Know the moment <span className="grad">something breaks.</span></h1>
        <p className="lede muted">PULSE checks your sites and APIs on the schedule you set, tracks response time, and emails you the second something goes down.</p>
        <div className="row"><Link to="/signup" className="btn primary">Start monitoring</Link><a href="#features" className="btn ghost">See how it works</a></div>
      </div>
    </section>

    <section id="features" className="sect">
      <motion.h2 className="sect-h" initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>Built for teams who can't afford blind spots</motion.h2>
      <motion.div className="bento" variants={list} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-60px' }}>
        {features.map(([t, p, w]) => <motion.article key={t} variants={item} whileHover={{ y: -3 }} className={'card ' + (w || '')}><h3>{t}</h3><p className="muted">{p}</p></motion.article>)}
      </motion.div>
    </section>

    <section className="sect strip">
      {stats.map(([v, u, l]) => <motion.div key={l} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}><b className="big-n mono"><CountUp value={v} suffix={u} /></b><span className="label">{l}</span></motion.div>)}
    </section>

    <section className="sect cta"><h2 className="sect-h">Start watching your first site in a minute.</h2><Link to="/signup"><Btn variant="primary">Create free account</Btn></Link></section>
    <footer className="foot muted small">© 2026 PULSE. Built for developers.</footer>
  </motion.div>);
}
