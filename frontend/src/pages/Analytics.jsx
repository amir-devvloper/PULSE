import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Card, CountUp, list, useLoad } from '../ui.jsx';

const ranges = [[24, '24h'], [168, '7d'], [720, '30d']];

function formatPointTime(ts, hours) {
  if (!ts) return '';
  const d = new Date(Number(ts) * 1000);
  return d.toLocaleString([], hours <= 24
    ? { hour: '2-digit', minute: '2-digit' }
    : { month: 'short', day: 'numeric' });
}

function Chart({ series, hours }) {
  const points = useMemo(
    () => series.filter(p => Number.isFinite(Number(p.avgResponseMs))),
    [series]
  );

  if (!points.length) {
    return (
      <div className="analytics-empty">
        <b>No response-time data yet</b>
        <span className="muted small">Keep the monitor active for a few checks, then refresh this range.</span>
      </div>
    );
  }

  const W = 900;
  const H = 260;
  const P = { top: 20, right: 22, bottom: 38, left: 48 };
  const innerW = W - P.left - P.right;
  const innerH = H - P.top - P.bottom;
  const values = points.map(p => Number(p.avgResponseMs));
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = Math.max(max - min, 1);

  const x = i => P.left + (points.length === 1 ? innerW / 2 : (i * innerW) / (points.length - 1));
  const y = value => P.top + (1 - (value - min) / range) * innerH;
  const path = points.map((p, i) => `${i ? 'L' : 'M'} ${x(i).toFixed(2)} ${y(Number(p.avgResponseMs)).toFixed(2)}`).join(' ');
  const area = `${path} L ${x(points.length - 1).toFixed(2)} ${P.top + innerH} L ${x(0).toFixed(2)} ${P.top + innerH} Z`;

  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label="Response time history">
        <defs>
          <linearGradient id="response-area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(52,240,176,.28)" />
            <stop offset="100%" stopColor="rgba(52,240,176,0)" />
          </linearGradient>
        </defs>
        {[0, .5, 1].map(f => {
          const yy = P.top + innerH * f;
          const value = max - range * f;
          return (
            <g key={f}>
              <line x1={P.left} x2={W - P.right} y1={yy} y2={yy} stroke="rgba(255,255,255,.08)" />
              <text x={8} y={yy + 4} className="chart-axis">{Math.round(value)}ms</text>
            </g>
          );
        })}
        <path d={area} fill="url(#response-area)" stroke="none" />
        <motion.path d={path} fill="none" stroke="url(#response-line)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: .9, ease: 'easeOut' }} key={path} />
        {points.map((p, i) => (
          <g key={`${p.t}-${i}`}>
            <circle cx={x(i)} cy={y(Number(p.avgResponseMs))} r="4" className="chart-dot" />
            <title>{formatPointTime(p.t, hours)} · {Math.round(p.avgResponseMs)} ms · {p.checks} checks</title>
          </g>
        ))}
        <defs>
          <linearGradient id="response-line" x1="0" x2="1">
            <stop offset="0%" stopColor="#34f0b0" />
            <stop offset="100%" stopColor="#38bdf8" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

export default function Analytics() {
  const [h, setH] = useState(24);
  const [a, aErr] = useLoad('/analytics/summary?hours=' + h, 15000);
  const [s, sErr] = useLoad('/analytics/series?hours=' + h, 15000);
  const [m] = useLoad('/monitors', 15000);
  const sm = a?.summary;
  const series = s?.series || [];
  const monitors = m?.monitors || [];

  return (
    <>
      <div className="row between">
        <div>
          <h1>Analytics</h1>
          <p className="muted">Live monitoring performance for the selected range.</p>
        </div>
        <div className="seg">
          {ranges.map(([v, l]) => (
            <button key={v} onClick={() => setH(v)} className={h === v ? 'on' : ''}>
              {h === v && <motion.span layoutId="seg" className="pill" />}
              <span>{l}</span>
            </button>
          ))}
        </div>
      </div>

      {(aErr || sErr) && (
        <Card className="analytics-error">
          <b>Analytics request failed</b>
          <span className="muted small">{aErr || sErr}</span>
        </Card>
      )}

      <motion.div className="grid4" variants={list} initial="hidden" animate="show" key={h}>
        {[
          ['Uptime', sm?.uptimePercent, '%', 2],
          ['Avg response', sm?.avgResponseMs, 'ms', 0],
          ['Incidents', sm?.incidents, '', 0],
          ['Checks', sm?.checks, '', 0]
        ].map(([label, value, suffix, decimals]) => (
          <Card key={label}>
            <span className="label">{label}</span>
            <b className="big-n"><CountUp value={value} suffix={suffix} decimals={decimals} /></b>
          </Card>
        ))}
      </motion.div>

      <div className="row between analytics-section-title">
        <div>
          <h2>Response time</h2>
          <p className="muted small">Average response time per active bucket.</p>
        </div>
        {series.length > 0 && <span className="muted small">{series.length} data points</span>}
      </div>

      <Card><Chart series={series} hours={h} /></Card>

      <div className="row between analytics-section-title">
        <div>
          <h2>Current monitors</h2>
          <p className="muted small">Latest measured response from each monitor.</p>
        </div>
      </div>

      {!monitors.length && <p className="muted">No monitors yet.</p>}
      <motion.div className="stack" variants={list} initial="hidden" animate="show">
        {monitors.map(monitor => (
          <Card key={monitor.id} className="row between">
            <div>
              <b>{monitor.name}</b>
              <div className="muted small mono">{monitor.url}</div>
            </div>
            <div className="analytics-monitor-metrics">
              <span><b>{monitor.last_response_time ?? '—'}</b> <small>ms</small></span>
              <span className="muted small">{monitor.uptime_24h == null ? 'No 24h data' : monitor.uptime_24h + '% uptime'}</span>
            </div>
          </Card>
        ))}
      </motion.div>
    </>
  );
}
