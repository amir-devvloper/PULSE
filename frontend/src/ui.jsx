import { useEffect, useRef, useState } from 'react';
import { animate, motion, useInView } from 'motion/react';
import { api } from './api.js';

export const list = { show: { transition: { staggerChildren: 0.05 } } };
export const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } };

export function CountUp({ value, suffix = '', decimals = 0 }) {
  const ref = useRef(null), seen = useInView(ref, { once: true });
  useEffect(() => {
    if (!seen || value == null) return;
    const c = animate(0, Number(value), { duration: 0.9, onUpdate: v => { if (ref.current) ref.current.textContent = v.toFixed(decimals) + suffix; } });
    return () => c.stop();
  }, [seen, value]);
  return <span ref={ref}>{value == null ? '—' : '0' + suffix}</span>;
}
export const Badge = ({ kind, children }) => <span className={'badge ' + kind}><i className={kind === 'bad' || kind === 'ok' ? 'dot live' : 'dot'} />{children}</span>;
export const Card = ({ children, className = '', ...p }) => <motion.div variants={item} whileHover={{ y: -2 }} className={'card ' + className} {...p}>{children}</motion.div>;
export const Btn = ({ variant = '', ...p }) => <motion.button whileTap={{ scale: 0.97 }} whileHover={{ scale: 1.02 }} className={'btn ' + variant} {...p} />;
export const Empty = ({ children }) => <p className="muted">{children}</p>;

export function useLoad(path, every) {
  const [data, set] = useState(null), [err, setErr] = useState('');
  const load = () => api(path).then(set).catch(e => e.message !== 'Unauthorized' && setErr(e.message));
  useEffect(() => { load(); if (!every) return; const t = setInterval(load, every); return () => clearInterval(t); }, [path]);
  return [data, err, load];
}
