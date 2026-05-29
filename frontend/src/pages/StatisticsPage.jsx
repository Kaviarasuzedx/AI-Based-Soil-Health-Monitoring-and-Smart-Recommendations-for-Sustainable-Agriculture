import React, { useState, useEffect, useCallback } from 'react';

const API_BASE = 'http://localhost:8000';

// ─── CSS injected once ───────────────────────────────────────────────────────
const STYLES = `
  :root {
    --green:        #2d6a2f;
    --green-mid:    #3a7d3c;
    --green-light:  #eaf4ea;
    --green-pale:   #f3faf3;
    --green-border: #b8ddb9;
    --green-accent: #4caf50;
    --amber:        #b8860b;
    --amber-light:  #fdf8ec;
    --terra-border: #e8d5a3;
    --ink:          #1a1f1a;
    --ink-mid:      #2d3a2d;
    --body:         #3d4d3d;
    --muted:        #7a9a7a;
    --hint:         #a8c0a8;
    --border:       #e0ece0;
    --white:        #ffffff;
    --ivory:        #f8faf8;
    --cream:        #f2f7f2;
    --shadow-sm:    0 1px 4px rgba(45,106,47,0.07);
    --shadow-md:    0 4px 20px rgba(45,106,47,0.12);
    --shadow-lg:    0 8px 40px rgba(45,106,47,0.16);
    --sans:         'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    --mono:         'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;
    --serif:        'Playfair Display', Georgia, serif;
    --radius:       14px;
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body { font-family: var(--sans); background: var(--ivory); color: var(--ink); }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes pulse-dot {
    0%, 100% { opacity: 1; transform: scale(1); }
    50%       { opacity: 0.5; transform: scale(0.8); }
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  @keyframes shimmer {
    0%   { background-position: -400px 0; }
    100% { background-position: 400px 0; }
  }
  @keyframes barGrow {
    from { width: 0; }
  }
  @keyframes countUp {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .stat-card {
    background: var(--white);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 22px 24px;
    box-shadow: var(--shadow-sm);
    animation: fadeUp 0.4s cubic-bezier(0.16,1,0.3,1) both;
    transition: box-shadow 0.2s, border-color 0.2s, transform 0.2s;
  }
  .stat-card:hover {
    box-shadow: var(--shadow-md);
    border-color: var(--green-border);
    transform: translateY(-1px);
  }

  .health-row {
    display: flex; align-items: center; gap: 14px;
    padding: 13px 16px;
    border-radius: 10px;
    border: 1px solid var(--border);
    background: var(--ivory);
    transition: background 0.15s;
    animation: fadeUp 0.35s cubic-bezier(0.16,1,0.3,1) both;
  }
  .health-row:hover { background: var(--green-pale); }

  .skeleton {
    background: linear-gradient(90deg, var(--cream) 25%, var(--ivory) 50%, var(--cream) 75%);
    background-size: 400px 100%;
    animation: shimmer 1.4s infinite;
    border-radius: 6px;
  }

  .bar-fill {
    height: 100%;
    border-radius: 4px;
    animation: barGrow 0.8s cubic-bezier(0.16,1,0.3,1) both;
    transition: width 0.5s cubic-bezier(0.16,1,0.3,1);
  }

  .tab-btn {
    padding: 7px 18px; border-radius: 9px; border: none;
    font-family: var(--sans); font-size: 13px; font-weight: 500;
    cursor: pointer; transition: all 0.18s;
  }

  .refresh-btn {
    display: flex; align-items: center; gap: 7px;
    padding: 8px 16px; border-radius: 10px; border: 1px solid var(--border);
    background: var(--white); color: var(--body); font-size: 13px;
    font-family: var(--sans); font-weight: 500; cursor: pointer;
    transition: all 0.18s; box-shadow: var(--shadow-sm);
  }
  .refresh-btn:hover { border-color: var(--green-border); color: var(--green); background: var(--green-pale); }

  .spinning { animation: spin 1s linear infinite; }

  scrollbar-width: thin;
  scrollbar-color: var(--green-border) transparent;
`;

// ─── Tiny icon ───────────────────────────────────────────────────────────────
const Icon = ({ d, size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {Array.isArray(d) ? d.map((p, i) => <path key={i} d={p} />) : <path d={d} />}
  </svg>
);

const icons = {
  refresh:  'M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15',
  check:    'M20 6L9 17l-5-5',
  x:        'M18 6L6 18M6 6l12 12',
  db:      ['M4 6a8 3 0 1 0 16 0 8 3 0 1 0-16 0','M4 6v6a8 3 0 0 0 16 0V6','M4 12v6a8 3 0 0 0 16 0v-6'],
  cpu:     ['M9 3H5a2 2 0 0 0-2 2v4','M9 3h6','M15 3h4a2 2 0 0 1 2 2v4','M21 9v6','M21 15v4a2 2 0 0 1-2 2h-4','M15 21H9','M3 15v4a2 2 0 0 0 2 2h4','M3 15V9','M9 9h6v6H9z'],
  globe:   ['M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z','M2 12h20','M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10A15.3 15.3 0 0 1 12 2z'],
  leaf:    'M2 22s4-10 12-10 8 10 8 10M6 10C6 6 9 2 12 2c3 0 6 4 6 8',
  image:   ['M21 15l-5-5L5 21','M3 3h18v18H3z','M9 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4'],
  chart:   ['M18 20V10','M12 20V4','M6 20v-6'],
  pin:     ['M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 1 1 18 0z','M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6'],
  clock:  ['M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z','M12 6v6l4 2'],
  server: ['M2 8h20v8H2z','M6 8V4h12v4','M6 16v4h12v-4','M6 12h.01','M10 12h.01'],
  wifi:   ['M5 12.55a11 11 0 0 1 14.08 0','M1.42 9a16 16 0 0 1 21.16 0','M8.53 16.11a6 6 0 0 1 6.95 0','M12 20h.01'],
  spark:  ['M12 2L15 9H22L16.5 13.5L18.5 21L12 17L5.5 21L7.5 13.5L2 9H9L12 2Z'],
  trend:  'M23 6l-9.5 9.5-5-5L1 18',
  warning:'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01',
};

// ─── API ─────────────────────────────────────────────────────────────────────
const api = {
  dashboard:    () => fetch(`${API_BASE}/api/statistics/dashboard`).then(r => r.json()),
  systemHealth: () => fetch(`${API_BASE}/api/statistics/system_health`).then(r => r.json()),
  byDate:       (period) => fetch(`${API_BASE}/api/statistics/analyses_by_date?period=${period}`).then(r => r.json()),
  locationDist: () => fetch(`${API_BASE}/api/statistics/location_distribution`).then(r => r.json()),
  healthCheck:  () => fetch(`${API_BASE}/health_check`).then(r => r.json()),
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmtBytes = (b) => {
  if (!b) return '0 B';
  const k = 1024;
  const sizes = ['B','KB','MB','GB'];
  const i = Math.floor(Math.log(b) / Math.log(k));
  return `${(b / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
};

const StatusDot = ({ ok, pulse = true }) => (
  <span style={{
    width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
    background: ok ? 'var(--green-accent)' : '#e74c3c',
    display: 'inline-block',
    animation: pulse && ok ? 'pulse-dot 2s ease-in-out infinite' : 'none',
    boxShadow: ok ? '0 0 0 3px rgba(76,175,80,0.2)' : '0 0 0 3px rgba(231,76,60,0.2)',
  }} />
);

const Badge = ({ children, color = 'green' }) => {
  const colors = {
    green: { bg: 'var(--green-light)', text: 'var(--green)', border: 'var(--green-border)' },
    amber: { bg: 'var(--amber-light)', text: 'var(--amber)', border: 'var(--terra-border)' },
    red:   { bg: '#fdf0f0', text: '#c0392b', border: '#f5b7b1' },
    gray:  { bg: 'var(--cream)', text: 'var(--muted)', border: 'var(--border)' },
  }[color];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      background: colors.bg, color: colors.text, border: `1px solid ${colors.border}`,
      borderRadius: 20, padding: '2px 10px', fontSize: 11.5, fontFamily: 'var(--mono)',
      fontWeight: 500, letterSpacing: '0.3px',
    }}>{children}</span>
  );
};

const Skeleton = ({ w = '100%', h = 18, style = {} }) => (
  <div className="skeleton" style={{ width: w, height: h, ...style }} />
);

// ─── Mini bar chart (no lib) ─────────────────────────────────────────────────
const SparkBar = ({ data, valueKey = 'count', labelKey = 'date' }) => {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data.map(d => d[valueKey]), 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 64 }}>
      {data.map((d, i) => {
        const pct = (d[valueKey] / max) * 100;
        const label = d[labelKey] || d.period || '';
        const shortLabel = label.length === 10 ? label.slice(5) : label.slice(-5);
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}
            title={`${label}: ${d[valueKey]}`}>
            <div style={{ width: '100%', background: 'var(--cream)', borderRadius: '4px 4px 0 0', height: '100%', display: 'flex', alignItems: 'flex-end', overflow: 'hidden' }}>
              <div className="bar-fill" style={{
                width: '100%', height: `${Math.max(pct, 4)}%`,
                background: `linear-gradient(180deg, var(--green-accent), var(--green))`,
                animationDelay: `${i * 0.04}s`,
                opacity: d[valueKey] === 0 ? 0.25 : 1,
              }} />
            </div>
            <span style={{ fontSize: 9, fontFamily: 'var(--mono)', color: 'var(--hint)', whiteSpace: 'nowrap' }}>
              {shortLabel}
            </span>
          </div>
        );
      })}
    </div>
  );
};

// ─── Horizontal bar ──────────────────────────────────────────────────────────
const HBar = ({ label, count, max, rank, delay = 0 }) => {
  const pct = max > 0 ? (count / max) * 100 : 0;
  const rankColors = ['var(--green)', '#3a7d3c', '#52a055', '#6db870', '#8fcc90'];
  return (
    <div style={{ animation: `fadeUp 0.35s ${delay}s cubic-bezier(0.16,1,0.3,1) both` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--white)', background: rankColors[rank] || 'var(--muted)', borderRadius: 4, width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 700 }}>
            {rank + 1}
          </span>
          <span style={{ fontSize: 12.5, color: 'var(--ink)', fontWeight: 500, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {label}
          </span>
        </div>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 11.5, color: 'var(--muted)', flexShrink: 0 }}>{count}</span>
      </div>
      <div style={{ height: 7, background: 'var(--cream)', borderRadius: 4, overflow: 'hidden' }}>
        <div className="bar-fill" style={{
          width: `${pct}%`, height: '100%',
          background: `linear-gradient(90deg, ${rankColors[rank] || 'var(--green)'}, ${rankColors[rank] || 'var(--green)'}aa)`,
          animationDelay: `${delay}s`,
        }} />
      </div>
    </div>
  );
};

// ─── Stat card ───────────────────────────────────────────────────────────────
const StatCard = ({ label, value, icon, sub, color = 'green', delay = 0 }) => {
  const palette = {
    green: { bg: 'var(--green-light)', icon: 'var(--green)', border: 'var(--green-border)', accent: 'var(--green)' },
    amber: { bg: 'var(--amber-light)', icon: 'var(--amber)', border: 'var(--terra-border)', accent: 'var(--amber)' },
    blue:  { bg: '#eff6ff', icon: '#3b82f6', border: '#bfdbfe', accent: '#3b82f6' },
    teal:  { bg: '#f0fdfa', icon: '#0d9488', border: '#99f6e4', accent: '#0d9488' },
  }[color];
  return (
    <div className="stat-card" style={{ animationDelay: `${delay}s` }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ width: 42, height: 42, borderRadius: 12, background: palette.bg, border: `1px solid ${palette.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: palette.icon }}>
          <Icon d={icon} size={19} />
        </div>
      </div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 30, fontWeight: 700, color: palette.accent, letterSpacing: '-1px', lineHeight: 1, animation: 'countUp 0.5s ease both' }}>
        {value ?? <Skeleton w={80} h={30} />}
      </div>
      <div style={{ marginTop: 6, fontSize: 13, fontWeight: 500, color: 'var(--body)' }}>{label}</div>
      {sub && <div style={{ marginTop: 4, fontSize: 11.5, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>{sub}</div>}
    </div>
  );
};

// ─── Health row ───────────────────────────────────────────────────────────────
const HealthRow = ({ label, value, ok, sub, delay = 0 }) => (
  <div className="health-row" style={{ animationDelay: `${delay}s` }}>
    <StatusDot ok={ok} />
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>{label}</div>
      {sub && <div style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--muted)', marginTop: 2 }}>{sub}</div>}
    </div>
    <Badge color={ok ? 'green' : 'red'}>{value}</Badge>
  </div>
);

// ─── Section heading ──────────────────────────────────────────────────────────
const SectionHead = ({ icon, title, right }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
      <div style={{ color: 'var(--green)' }}><Icon d={icon} size={17} /></div>
      <span style={{ fontFamily: 'var(--serif)', fontSize: 17, fontWeight: 700, color: 'var(--ink)' }}>{title}</span>
    </div>
    {right}
  </div>
);

// ─── File stats pill ─────────────────────────────────────────────────────────
const FilePill = ({ label, count, delay = 0 }) => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '10px 14px', background: 'var(--ivory)', border: '1px solid var(--border)',
    borderRadius: 10, animation: `fadeUp 0.35s ${delay}s cubic-bezier(0.16,1,0.3,1) both`,
    transition: 'all 0.15s',
  }}
    onMouseEnter={e => { e.currentTarget.style.background = 'var(--green-pale)'; e.currentTarget.style.borderColor = 'var(--green-border)'; }}
    onMouseLeave={e => { e.currentTarget.style.background = 'var(--ivory)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
  >
    <span style={{ fontSize: 12.5, color: 'var(--body)', fontFamily: 'var(--mono)' }}>{label}</span>
    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--green)', fontFamily: 'var(--mono)' }}>{count ?? '—'}</span>
  </div>
);

// ─── Main page ───────────────────────────────────────────────────────────────
const StatisticsPage = () => {
  const [dash,     setDash]     = useState(null);
  const [health,   setHealth]   = useState(null);
  const [basic,    setBasic]    = useState(null);
  const [byDate,   setByDate]   = useState(null);
  const [locDist,  setLocDist]  = useState(null);
  const [period,   setPeriod]   = useState('week');
  const [loading,  setLoading]  = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [spinning, setSpinning] = useState(false);

  const fetchAll = useCallback(async () => {
    setSpinning(true);
    try {
      const [d, h, b, ld] = await Promise.allSettled([
        api.dashboard(),
        api.systemHealth(),
        api.healthCheck(),
        api.locationDist(),
      ]);
      if (d.status === 'fulfilled' && d.value?.success) setDash(d.value.statistics);
      if (h.status === 'fulfilled' && h.value?.success) setHealth(h.value.health_check);
      if (b.status === 'fulfilled' && b.value?.success) setBasic(b.value.status);
      if (ld.status === 'fulfilled' && ld.value?.success) setLocDist(ld.value.data);
      setLastRefresh(new Date());
    } finally {
      setLoading(false);
      setSpinning(false);
    }
  }, []);

  const fetchByDate = useCallback(async (p) => {
    try {
      const r = await api.byDate(p);
      if (r?.success) setByDate(r.data);
    } catch {}
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useEffect(() => { fetchByDate(period); }, [period, fetchByDate]);

  // Auto refresh every 60s
  useEffect(() => {
    const id = setInterval(fetchAll, 60000);
    return () => clearInterval(id);
  }, [fetchAll]);

  const stats = dash;
  const sys   = health;

  return (
    <>
      <style>{STYLES}</style>
      <div style={{ minHeight: 'calc(100vh - 66px)', background: 'var(--ivory)', fontFamily: 'var(--sans)' }}>

        {/* ── TOP NAV ── */}
        <div style={{
          // position: 'sticky', top: 66, zIndex: 100,
          // background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)',
          // borderBottom: '1px solid var(--border)',
          padding: '14px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--green-light)', border: '1px solid var(--green-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--green)' }}>
              <Icon d={icons.leaf} size={18} />
            </div> */}
            <div>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>
              
              </div>
              <div style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--muted)', letterSpacing: '1px' }}>
      
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {lastRefresh && (
              <span style={{ fontSize: 11.5, fontFamily: 'var(--mono)', color: 'var(--hint)' }}>
                Updated {lastRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            {/* Live dot */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--green-light)', border: '1px solid var(--green-border)', borderRadius: 20, padding: '4px 12px' }}>
              <StatusDot ok={!loading} />
              <span style={{ fontSize: 11.5, fontFamily: 'var(--mono)', color: 'var(--green)', fontWeight: 600, letterSpacing: '0.5px' }}>
                {loading ? 'LOADING' : 'LIVE'}
              </span>
            </div>
            <button className="refresh-btn" onClick={fetchAll}>
              <span className={spinning ? 'spinning' : ''}><Icon d={icons.refresh} size={14} /></span>
              Refresh
            </button>
          </div>
        </div>

        {/* ── MAIN CONTENT ── */}
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px 64px' }}>

          {/* ── KPI CARDS ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
            <StatCard
              label="Total Analyses"
              value={stats ? stats.total_analyses.toLocaleString() : null}
              icon={icons.chart}
              sub="all time"
              color="green"
              delay={0}
            />
            <StatCard
              label="Today"
              value={stats ? stats.today_analyses : null}
              icon={icons.clock}
              sub="analyses today"
              color="teal"
              delay={0.05}
            />
            <StatCard
              label="This Week"
              value={stats ? stats.week_analyses : null}
              icon={icons.trend}
              sub="last 7 days"
              color="blue"
              delay={0.1}
            />
            <StatCard
              label="This Month"
              value={stats ? stats.month_analyses : null}
              icon={icons.leaf}
              sub="monthly total"
              color="amber"
              delay={0.15}
            />
            <StatCard
              label="Unique Locations"
              value={stats ? stats.unique_locations : null}
              icon={icons.pin}
              sub="distinct areas"
              color="green"
              delay={0.2}
            />
          </div>

          {/* ── ROW 2: Trend + System Health ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 20, marginBottom: 20 }}>

            {/* Trend chart */}
            <div className="stat-card" style={{ animationDelay: '0.25s' }}>
              <SectionHead
                icon={icons.trend}
                title="Analysis Trend"
                right={
                  <div style={{ display: 'flex', gap: 4 }}>
                    {['week','month','year'].map(p => (
                      <button key={p} className="tab-btn"
                        onClick={() => setPeriod(p)}
                        style={{
                          background: period === p ? 'var(--green)' : 'transparent',
                          color: period === p ? '#fff' : 'var(--body)',
                        }}>
                        {p.charAt(0).toUpperCase() + p.slice(1)}
                      </button>
                    ))}
                  </div>
                }
              />
              {byDate ? (
                <>
                  <SparkBar
                    data={byDate}
                    valueKey="count"
                    labelKey={period === 'week' ? 'date' : 'period'}
                  />
                  <div style={{ marginTop: 12, display: 'flex', gap: 16 }}>
                    <span style={{ fontSize: 11.5, fontFamily: 'var(--mono)', color: 'var(--muted)' }}>
                      Total: <strong style={{ color: 'var(--green)' }}>{byDate.reduce((a, d) => a + (d.count || 0), 0)}</strong>
                    </span>
                    <span style={{ fontSize: 11.5, fontFamily: 'var(--mono)', color: 'var(--muted)' }}>
                      Peak: <strong style={{ color: 'var(--green)' }}>{Math.max(...byDate.map(d => d.count || 0))}</strong>
                    </span>
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <Skeleton h={64} />
                </div>
              )}
            </div>

            {/* System Health */}
            <div className="stat-card" style={{ animationDelay: '0.28s' }}>
              <SectionHead icon={icons.cpu} title="System Health" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {sys ? (<>
                  <HealthRow label="Application" value={sys.application?.status || '—'} ok={sys.application?.status === 'running'} sub={`v${sys.application?.version}`} delay={0} />
                  <HealthRow label="Supabase DB" value={sys.database?.supabase_status || '—'} ok={sys.database?.supabase_status === 'connected'} sub={`${sys.database?.record_count ?? '?'} records`} delay={0.04} />
                  <HealthRow label="Neon DB" value={sys.database?.neon_db_status || '—'} ok={sys.database?.neon_db_status === 'connected'} sub="numerical store" delay={0.08} />
                  <HealthRow label="Earth Engine" value={sys.services?.earth_engine?.status || '—'} ok={sys.services?.earth_engine?.available} sub="satellite imagery" delay={0.12} />
                  <HealthRow label="Internet" value={sys.services?.internet?.status || '—'} ok={sys.services?.internet?.status === 'connected'} delay={0.16} />
                </>) : basic ? (<>
                  <HealthRow label="Application" value={basic.app || '—'} ok={basic.app === 'running'} sub={`v${basic.version || '?'}`} delay={0} />
                  <HealthRow label="Supabase DB" value={basic.supabase_db || '—'} ok={basic.supabase_db === 'connected'} delay={0.04} />
                  <HealthRow label="Neon DB" value={basic.neon_db || '—'} ok={basic.neon_db === 'connected'} delay={0.08} />
                  <HealthRow label="Earth Engine" value={basic.earth_engine || '—'} ok={basic.earth_engine === 'initialized'} delay={0.12} />
                  <HealthRow label="Internet" value={basic.internet ? 'connected' : 'disconnected'} ok={!!basic.internet} delay={0.16} />
                </>) : [0,1,2,3,4].map(i => <Skeleton key={i} h={52} style={{ borderRadius: 10 }} />)}
              </div>
            </div>
          </div>

          {/* ── ROW 3: Top Locations + File Stats + Storage ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 320px', gap: 20, marginBottom: 20 }}>

            {/* Top Locations */}
            <div className="stat-card" style={{ animationDelay: '0.3s' }}>
              <SectionHead icon={icons.pin} title="Top Locations" />
              {locDist ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {locDist.slice(0, 8).map((loc, i) => (
                    <HBar
                      key={loc.name}
                      label={loc.name}
                      count={loc.count}
                      max={locDist[0]?.count || 1}
                      rank={i}
                      delay={i * 0.04}
                    />
                  ))}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {[0,1,2,3,4].map(i => <Skeleton key={i} h={36} />)}
                </div>
              )}
            </div>

            {/* File Statistics */}
            <div className="stat-card" style={{ animationDelay: '0.33s' }}>
              <SectionHead icon={icons.image} title="File Statistics" />
              {stats?.file_stats ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                  <FilePill label="NDVI Images"    count={stats.file_stats.ndvi_images}    delay={0.04} />
                  <FilePill label="RGB Images"     count={stats.file_stats.rgb_images}     delay={0.07} />
                  <FilePill label="SAVI Images"    count={stats.file_stats.savi_images}    delay={0.10} />
                  <FilePill label="GNDVI Images"   count={stats.file_stats.gndvi_images}   delay={0.13} />
                  <FilePill label="EVI Images"     count={stats.file_stats.evi_images}     delay={0.16} />
                  <FilePill label="GeoTIFF Files"  count={stats.file_stats.geotiff_files}  delay={0.19} />
                  <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
                  <FilePill label="TOTAL FILES"    count={stats.file_stats.total_images}   delay={0.22} />
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                  {[0,1,2,3,4,5,6].map(i => <Skeleton key={i} h={42} style={{ borderRadius: 10 }} />)}
                </div>
              )}
            </div>

            {/* Storage + Performance */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Storage */}
              <div className="stat-card" style={{ animationDelay: '0.36s', flex: 1 }}>
                <SectionHead icon={icons.db} title="Storage" />
                {sys?.storage ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[
                      { label: 'Total size', value: sys.storage.size_human },
                      { label: 'File count', value: sys.storage.file_count },
                      { label: 'Writable', value: sys.storage.writable ? 'Yes' : 'No', ok: sys.storage.writable },
                      { label: 'Storage dir', value: sys.storage.exists ? 'Found' : 'Missing', ok: sys.storage.exists },
                    ].map(({ label, value, ok }, i) => (
                      <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', animation: `fadeUp 0.3s ${i * 0.05}s ease both` }}>
                        <span style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>{label}</span>
                        <span style={{ fontSize: 12.5, fontWeight: 600, color: ok === undefined ? 'var(--ink)' : ok ? 'var(--green)' : '#e74c3c', fontFamily: 'var(--mono)' }}>{value}</span>
                      </div>
                    ))}
                  </div>
                ) : <Skeleton h={100} />}
              </div>

              {/* Performance */}
              <div className="stat-card" style={{ animationDelay: '0.4s', flex: 1 }}>
                <SectionHead icon={icons.server} title="Performance" />
                {sys?.performance ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[
                      { label: 'Thread workers', value: sys.performance.thread_pool_workers },
                      { label: 'HTTP conn limit', value: sys.performance.http_connection_limit },
                      { label: 'Platform', value: sys.performance.platform },
                      { label: 'Uptime', value: sys.application?.uptime ?? '—' },
                    ].map(({ label, value }, i) => (
                      <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', animation: `fadeUp 0.3s ${i * 0.05}s ease both` }}>
                        <span style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>{label}</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)', fontFamily: 'var(--mono)' }}>{value}</span>
                      </div>
                    ))}
                  </div>
                ) : <Skeleton h={100} />}
              </div>
            </div>
          </div>

          {/* ── DAILY TREND table (if stats available) ── */}
          {stats?.daily_trend && (
            <div className="stat-card" style={{ animationDelay: '0.42s', marginBottom: 20 }}>
              <SectionHead icon={icons.clock} title="7-Day Activity" />
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr>
                      {['Date', 'Analyses', 'Bar'].map(h => (
                        <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--muted)', letterSpacing: '0.8px', textTransform: 'uppercase', borderBottom: '1px solid var(--border)', background: 'var(--cream)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {stats.daily_trend.map((row, i) => {
                      const max = Math.max(...stats.daily_trend.map(r => r.count), 1);
                      return (
                        <tr key={row.date}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--green-pale)'}
                          onMouseLeave={e => e.currentTarget.style.background = ''}
                          style={{ transition: 'background 0.15s', animation: `fadeUp 0.3s ${i * 0.03}s ease both` }}>
                          <td style={{ padding: '10px 12px', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--body)', borderBottom: '1px solid var(--border)' }}>{row.date}</td>
                          <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
                            <span style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700, color: row.count > 0 ? 'var(--green)' : 'var(--hint)' }}>{row.count}</span>
                          </td>
                          <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', width: '60%' }}>
                            <div style={{ height: 8, background: 'var(--cream)', borderRadius: 4, overflow: 'hidden' }}>
                              <div className="bar-fill" style={{ width: `${(row.count / max) * 100}%`, height: '100%', background: 'linear-gradient(90deg, var(--green-accent), var(--green))', animationDelay: `${i * 0.04}s`, opacity: row.count === 0 ? 0.2 : 1 }} />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── FOOTER ── */}
          <div style={{ textAlign: 'center', padding: '16px 0 0', borderTop: '1px solid var(--border)' }}>
            <span style={{ fontSize: 11.5, fontFamily: 'var(--mono)', color: 'var(--hint)', letterSpacing: '0.5px' }}>
              VEGANALYSE · RAG · llama-3.3-70b · FAISS · NeonDB · Supabase · Earth Engine
            </span>
          </div>

        </div>
      </div>
    </>
  );
};

export default StatisticsPage;
