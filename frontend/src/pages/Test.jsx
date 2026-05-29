// ReportPage.jsx
// Architecture:
//   • "Generate Report"  → POST /agricultural/report        → JSON preview data
//   • "Download PDF"     → POST /agricultural/report/pdf    → streams real A4 PDF from backend
//   • Frontend NEVER generates PDF itself (no jsPDF / html2canvas)
import React, { useState, useEffect, useCallback, useRef } from 'react';

const API_BASE = 'http://localhost:8070';

// ─── API Layer ────────────────────────────────────────────────────────────────
const api = {
  /** Fetch all field records for the table */
  listAgriculturalData: (filters = {}) => {
    const params = new URLSearchParams();
    params.append('limit', filters.limit || 10000);
    return fetch(`${API_BASE}/api/combined/all-data?${params}`)
      .then(r => r.json())
      .then(res => ({
        success: res.success,
        data: res.data || [],
      }));
  },

  /** POST /agricultural/report  → JSON preview (no PDF generated) */
  generateReportPreview: async (payload) => {
    const body = {
      report_type:             String(payload.report_type || 'comprehensive'),
      analysis_ids:            (payload.analysis_ids || []).map(String),
      include_charts:          payload.include_charts !== false,
      include_recommendations: payload.include_recommendations !== false,
      format:                  'json',
      date_range:              String(payload.date_range || 'all'),
    };
    const res = await fetch(`${API_BASE}/agricultural/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `HTTP ${res.status}`);
    }
    return res.json();   // { success, report }
  },

  /**
   * POST /agricultural/report/pdf → streams binary PDF.
   * Triggers a browser download using a hidden <a> element.
   */
  downloadPDF: async (payload, onProgress) => {
    const body = {
      report_type:             String(payload.report_type || 'comprehensive'),
      analysis_ids:            (payload.analysis_ids || []).map(String),
      include_charts:          payload.include_charts !== false,
      include_recommendations: payload.include_recommendations !== false,
      format:                  'pdf',
      date_range:              String(payload.date_range || 'all'),
    };
    onProgress?.('Generating PDF on server…');
    const res = await fetch(`${API_BASE}/agricultural/report/pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `HTTP ${res.status}: PDF generation failed`);
    }
    onProgress?.('Downloading PDF…');
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    const cd   = res.headers.get('content-disposition') || '';
    const match = cd.match(/filename="?([^"]+)"?/);
    a.download = match ? match[1] : `agricultural_report_${new Date().toISOString().slice(0,10)}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  },

  /** POST /agricultural/report/csv */
  downloadCSV: async (payload) => {
    const body = {
      report_type:  String(payload.report_type || 'comprehensive'),
      analysis_ids: (payload.analysis_ids || []).map(String),
      format:       'csv',
      date_range:   String(payload.date_range || 'all'),
    };
    const res = await fetch(`${API_BASE}/agricultural/report/csv`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`CSV export failed: HTTP ${res.status}`);
    const data = await res.json();
    if (data.csv_data) {
      const blob = new Blob([data.csv_data], { type: 'text/csv' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `agricultural_data_${new Date().toISOString().slice(0,10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  },
};

// ─── Icon ─────────────────────────────────────────────────────────────────────
const Icon = ({ d, size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {Array.isArray(d) ? d.map((p, i) => <path key={i} d={p} />) : <path d={d} />}
  </svg>
);

const icons = {
  db:       ['M4 6a8 3 0 1 0 16 0 8 3 0 1 0-16 0','M4 6v6a8 3 0 0 0 16 0V6','M4 12v6a8 3 0 0 0 16 0v-6'],
  refresh:  'M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15',
  check:    'M20 6L9 17l-5-5',
  x:        'M18 6L6 18M6 6l12 12',
  leaf:     'M2 22s4-10 12-10 8 10 8 10M6 10C6 6 9 2 12 2c3 0 6 4 6 8',
  report:   ['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z','M14 2v6h6','M16 13H8','M16 17H8','M10 9H8'],
  download: ['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4','M7 10l5 5 5-5','M12 15V3'],
  filter:   'M22 3H2l8 9.46V19l4 2v-12.46z',
  search:   ['M11 17.5a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13z','M22 22l-4-4'],
  chart:    ['M18 20V10','M12 20V4','M6 20v-6'],
  eye:      ['M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z','M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z'],
  water:    'M12 2.69l.42.37c2.52 2.26 4.58 4.5 4.58 7.44 0 2.5-2 4.5-4.5 4.5s-4.5-2-4.5-4.5c0-2.94 2.06-5.18 4.58-7.44L12 2.69z',
  info:     ['M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z','M12 16v-4M12 8h.01'],
  loading:  'M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83',
  close:    'M18 6L6 18M6 6l12 12',
  arrowUp:  'M18 15l-6-6-6 6',
  arrowDown:'M6 9l6 6 6-6',
  trendUp:  'M23 6l-9.5 9.5-5-5L1 18',
  layers:   ['M12 2L2 7l10 5 10-5-10-5z','M2 17l10 5 10-5','M2 12l10 5 10-5'],
  star:     'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
  csv:      ['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z','M14 2v6h6','M8 13h2','M8 17h8','M16 13h-2'],
  pdf:      ['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z','M14 2v6h6','M9 15h6','M9 11h6','M9 18h4'],
};

// ─── Typing Dots ───────────────────────────────────────────────────────────────
const TypingDots = () => (
  <div style={{ display: 'flex', gap: 5, alignItems: 'center', padding: '4px 0' }}>
    {[0,1,2].map(i => (
      <div key={i} style={{
        width: 7, height: 7, borderRadius: '50%',
        background: 'var(--chat-green-accent)',
        animation: `chat-bounce 1.2s ${i*0.2}s ease-in-out infinite`,
      }} />
    ))}
  </div>
);

// ─── Image Modal ──────────────────────────────────────────────────────────────
const ImageModal = ({ src, label, onClose }) => (
  <div onClick={onClose} style={{
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)',
    zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center',
  }}>
    <div onClick={e => e.stopPropagation()} style={{
      background: '#1a2b1b', borderRadius: 16, overflow: 'hidden',
      maxWidth: '90vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--chat-green)' }}>
        <span style={{ fontWeight: 600, fontSize: 14, color: '#fff' }}>{label}</span>
        <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', borderRadius: 8, width: 28, height: 28, cursor: 'pointer' }}>
          <Icon d={icons.close} size={14} />
        </button>
      </div>
      <div style={{ overflow: 'auto', padding: 16, flexGrow: 1 }}>
        <img src={src} alt={label} style={{ maxWidth: '100%', height: 'auto', borderRadius: 8, display: 'block' }} />
      </div>
    </div>
  </div>
);

// ─── Report Config Panel ───────────────────────────────────────────────────────
const ReportConfigPanel = ({ selectedIds, totalRecords, onGenerate, onDownloadPDF, onDownloadCSV, generating, pdfDownloading, dateRange, onDateRangeChange, reportReady, reportPayload }) => {
  const [reportType,             setReportType]             = useState('comprehensive');
  const [includeCharts,          setIncludeCharts]          = useState(true);
  const [includeRecommendations, setIncludeRecommendations] = useState(true);

  const reportTypes = [
    { id: 'comprehensive', label: 'Comprehensive',    desc: 'Full field health, yield & water' },
    { id: 'water',         label: 'Water Management', desc: 'Irrigation & moisture metrics' },
    { id: 'yield',         label: 'Yield Forecast',   desc: 'Yield potential & NDVI trends' },
    { id: 'soil',          label: 'Soil Health',      desc: 'Soil scores & nutrient analysis' },
  ];

  const buildPayload = () => ({
    report_type:             reportType,
    analysis_ids:            selectedIds,
    include_charts:          includeCharts,
    include_recommendations: includeRecommendations,
    date_range:              dateRange,
  });

  const Toggle = ({ value, onChange }) => (
    <button onClick={() => onChange(!value)} style={{
      width: 44, height: 24, borderRadius: 12, border: 'none',
      background: value ? 'var(--chat-green)' : 'var(--chat-border)',
      cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0, padding: 0,
    }}>
      <div style={{
        position: 'absolute', top: 3, left: value ? 24 : 3,
        width: 18, height: 18, borderRadius: '50%', background: '#fff',
        transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
      }} />
    </button>
  );

  return (
    <div style={{ background: 'var(--chat-white)', border: '1px solid var(--chat-border)', borderRadius: 16, overflow: 'hidden', boxShadow: 'var(--chat-shadow-md)' }}>

      {/* Header */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--chat-border)', background: 'linear-gradient(135deg, var(--chat-green) 0%, var(--chat-green-mid) 100%)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', border: '1px solid rgba(255,255,255,0.25)' }}>
          <Icon d={icons.report} size={16} />
        </div>
        <div>
          <div style={{ fontFamily: 'var(--chat-serif)', fontSize: 15, fontWeight: 700, color: '#fff' }}>Report Configuration</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)' }}>
            {selectedIds.length > 0 ? `${selectedIds.length} fields selected` : `All ${totalRecords} fields`}
          </div>
        </div>
      </div>

      <div style={{ padding: '20px' }}>

        {/* Report Type */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 10, fontFamily: 'var(--chat-mono)', color: 'var(--chat-muted)', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: 10 }}>Report Type</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {reportTypes.map(rt => (
              <button key={rt.id} onClick={() => setReportType(rt.id)} style={{
                padding: '10px 12px', border: `1.5px solid ${reportType === rt.id ? 'var(--chat-green)' : 'var(--chat-border)'}`,
                borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                background: reportType === rt.id ? 'var(--chat-green-pale)' : 'var(--chat-white)',
                transition: 'all 0.18s',
              }}>
                <div style={{ fontSize: 11.5, fontWeight: 600, color: reportType === rt.id ? 'var(--chat-green)' : 'var(--chat-ink)', marginBottom: 3 }}>{rt.label}</div>
                <div style={{ fontSize: 10, color: 'var(--chat-muted)' }}>{rt.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Options */}
        <div style={{ marginBottom: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 10, fontFamily: 'var(--chat-mono)', color: 'var(--chat-muted)', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: 2 }}>Options</div>
          {[
            ['Include Charts & Visualizations', includeCharts, setIncludeCharts],
            ['Include AI Recommendations',      includeRecommendations, setIncludeRecommendations],
          ].map(([label, val, setter]) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12.5, color: 'var(--chat-body)' }}>{label}</span>
              <Toggle value={val} onChange={setter} />
            </div>
          ))}
        </div>

        {/* Primary: Generate Preview */}
        <button onClick={() => onGenerate(buildPayload())} disabled={generating || pdfDownloading} style={{
          width: '100%', padding: '13px 0', border: 'none', borderRadius: 12, marginBottom: 10,
          background: (generating || pdfDownloading) ? 'var(--chat-border)' : 'linear-gradient(135deg, var(--chat-green) 0%, var(--chat-green-mid) 100%)',
          color: (generating || pdfDownloading) ? 'var(--chat-muted)' : '#fff',
          fontSize: 14, fontWeight: 700, fontFamily: 'var(--chat-sans)',
          cursor: (generating || pdfDownloading) ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          transition: 'all 0.2s', boxShadow: generating ? 'none' : '0 4px 12px rgba(45,106,47,0.3)',
        }}>
          {generating
            ? <><div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'chat-spin 0.8s linear infinite' }} />Generating Preview…</>
            : <><Icon d={icons.report} size={17} />Generate Preview</>}
        </button>

        {/* Secondary: Download PDF (only once preview is ready) */}
        {reportReady && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => onDownloadPDF(buildPayload())}
              disabled={pdfDownloading || generating}
              style={{
                flex: 1, padding: '10px 0', border: 'none', borderRadius: 10,
                background: pdfDownloading ? 'var(--chat-border)' : 'var(--chat-green-dark, #1B4D1E)',
                color: pdfDownloading ? 'var(--chat-muted)' : '#fff',
                fontSize: 12.5, fontWeight: 700, fontFamily: 'var(--chat-sans)',
                cursor: pdfDownloading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                transition: 'all 0.2s', boxShadow: pdfDownloading ? 'none' : '0 2px 8px rgba(27,77,30,0.35)',
              }}>
              {pdfDownloading
                ? <><div style={{ width: 13, height: 13, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'chat-spin 0.8s linear infinite' }} />Building…</>
                : <><Icon d={icons.pdf} size={14} />Download PDF</>}
            </button>

            <button
              onClick={() => onDownloadCSV(buildPayload())}
              disabled={generating || pdfDownloading}
              style={{
                padding: '10px 14px', border: '1px solid var(--chat-border)', borderRadius: 10,
                background: 'var(--chat-white)', color: 'var(--chat-muted)',
                fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.18s',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
              <Icon d={icons.csv} size={13} />CSV
            </button>
          </div>
        )}

        {selectedIds.length === 0 && (
          <div style={{ marginTop: 10, display: 'flex', alignItems: 'flex-start', gap: 7, background: 'var(--chat-amber-light)', border: '1px solid #f5d8a0', borderRadius: 9, padding: '9px 12px' }}>
            <Icon d={icons.info} size={14} />
            <span style={{ fontSize: 11, color: 'var(--chat-amber)' }}>No rows selected — report will cover all {totalRecords} fields.</span>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Metric Badge ─────────────────────────────────────────────────────────────
const MetricBadge = ({ label, value, suffix = '' }) => {
  const num = parseFloat(value);
  const isNdvi = label.toLowerCase().includes('ndvi') || label.toLowerCase().includes('ph');
  const threshold = isNdvi ? (label.toLowerCase().includes('ndvi') ? 0.3 : 5) : 50;
  const goodThreshold = isNdvi ? (label.toLowerCase().includes('ndvi') ? 0.5 : 7) : 70;
  const color  = !num ? '#999' : num >= goodThreshold ? '#28a745' : num >= threshold ? '#e6a817' : '#dc3545';
  const bg     = !num ? '#f3f3f3' : num >= goodThreshold ? '#ecfdf5' : num >= threshold ? '#fffbeb' : '#fff1f1';
  return (
    <div style={{ background: bg, border: `1px solid ${color}30`, borderRadius: 12, padding: '8px 14px', minWidth: 88, flexShrink: 0, textAlign: 'center' }}>
      <div style={{ fontSize: 9, fontFamily: 'var(--chat-mono)', color: '#999', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 3 }}>
        {label.replace('avg_','').replace(/_/g,' ')}
      </div>
      <div style={{ fontSize: 19, fontWeight: 800, color, fontFamily: 'var(--chat-serif)', lineHeight: 1 }}>
        {typeof num === 'number' && !isNaN(num) ? num.toFixed(isNdvi && label.toLowerCase().includes('ndvi') ? 3 : 1) : '—'}{suffix}
      </div>
    </div>
  );
};

// ─── Mini inline bar chart ────────────────────────────────────────────────────
const InlineBarChart = ({ records }) => {
  const items = records.slice(0, 8).filter(r => r.mean_ndvi != null);
  if (!items.length) return null;
  const max = Math.max(...items.map(r => r.mean_ndvi), 0.01);
  return (
    <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--chat-border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <Icon d={icons.chart} size={14} />
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--chat-ink)' }}>NDVI Field Comparison</span>
        <span style={{ fontSize: 10.5, color: 'var(--chat-muted)', fontFamily: 'var(--chat-mono)' }}>top {items.length} fields</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 80 }}>
        {items.map((r, i) => {
          const h = Math.max(8, (r.mean_ndvi / max) * 56);
          const col = r.mean_ndvi >= 0.5 ? 'var(--chat-green)' : r.mean_ndvi >= 0.3 ? '#e6a817' : '#dc3545';
          return (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
              <div style={{ fontSize: 9, color: col, fontWeight: 700, fontFamily: 'var(--chat-mono)' }}>{r.mean_ndvi.toFixed(2)}</div>
              <div style={{ width: '100%', background: col, borderRadius: '4px 4px 0 0', height: `${h}px`, opacity: 0.88, transition: 'height 0.4s' }} />
              <div style={{ fontSize: 8.5, color: 'var(--chat-muted)', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>
                {(r.place_name || `F${r.analysis_id}`)?.slice(0, 9)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Enhanced Report Preview Card (Redesigned with better layout) ─────────────
const ReportPreviewCard = ({ report, onDownloadPDF, onDownloadCSV, pdfDownloading, reportPayload }) => {
  const sections        = report?.sections        || [];
  const detailedRecords = report?.detailed_records || [];
  const summaryMetrics  = report?.summary_metrics  || {};
  const [activeSection, setActiveSection] = useState(0);
  const [modalImg,   setModalImg]   = useState(null);
  const [modalLabel, setModalLabel] = useState('');

  const metricEntries = Object.entries(summaryMetrics).filter(([, v]) => v != null);

  const suffixFor = (key) => {
    if (key.includes('ndvi') || key.includes('ph')) return '';
    return '%';
  };

  return (
    <>
      {modalImg && <ImageModal src={modalImg} label={modalLabel} onClose={() => setModalImg(null)} />}

      <div style={{
        background: 'var(--chat-white)',
        border: '1px solid var(--chat-green-border)',
        borderRadius: 20,
        overflow: 'hidden',
        boxShadow: 'var(--chat-shadow-md)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
      }}>

        {/* Header - Compact but elegant */}
        <div style={{
          padding: '14px 24px',
          borderBottom: '1px solid var(--chat-border)',
          background: 'linear-gradient(135deg, var(--chat-green) 0%, var(--chat-green-mid) 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: 'rgba(255,255,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.25)'
            }}>
              <Icon d={icons.leaf} size={20} />
            </div>
            <div>
              <div style={{ fontFamily: 'var(--chat-serif)', fontSize: 16, fontWeight: 700, color: '#fff' }}>
                {report?.title || 'Agricultural Field Report'}
              </div>
              <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.75)', fontFamily: 'var(--chat-mono)', marginTop: 2 }}>
                {new Date(report?.generated_at).toLocaleString()} · {report?.field_count || '—'} fields · {report?.report_type || 'comprehensive'}
              </div>
            </div>
          </div>

          {/* Keep Download buttons exactly as required */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => onDownloadPDF(reportPayload)} disabled={pdfDownloading} style={{
              display: 'flex', alignItems: 'center', gap: 7, padding: '8px 18px',
              background: pdfDownloading ? 'rgba(255,255,255,0.5)' : '#fff',
              color: pdfDownloading ? '#888' : 'var(--chat-green)',
              border: 'none', borderRadius: 10, fontSize: 12.5, fontWeight: 700,
              cursor: pdfDownloading ? 'not-allowed' : 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)', transition: 'all 0.18s',
            }}>
              {pdfDownloading
                ? <><div style={{ width: 13, height: 13, border: '2px solid #ccc', borderTopColor: 'var(--chat-green)', borderRadius: '50%', animation: 'chat-spin 0.8s linear infinite' }} />Building PDF…</>
                : <><Icon d={icons.download} size={14} />Download PDF</>}
            </button>
            <button onClick={() => onDownloadCSV(reportPayload)} disabled={pdfDownloading} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
              background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: 10, fontSize: 11.5, fontWeight: 600, cursor: 'pointer',
            }}>
              <Icon d={icons.csv} size={12} />CSV
            </button>
          </div>
        </div>

        {/* Scrollable content area - internal scroll only */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          minHeight: 0,
          overscrollBehavior: 'contain',
        }}>

          {/* KPI Metrics strip - Sticky but scrolls with content */}
          {metricEntries.length > 0 && (
            <div style={{
              padding: '14px 24px',
              display: 'flex',
              gap: 12,
              overflowX: 'auto',
              borderBottom: '1px solid var(--chat-border)',
              background: 'var(--chat-cream)',
              position: 'sticky',
              top: 0,
              zIndex: 5,
            }}>
              {metricEntries.map(([key, val]) => (
                <MetricBadge key={key} label={key} value={val} suffix={suffixFor(key)} />
              ))}
            </div>
          )}

          {/* NDVI bar chart */}
          <InlineBarChart records={detailedRecords} />

          {/* AI Sections tabs - Compact and clean */}
          {sections.length > 0 && (
            <div style={{ borderBottom: '1px solid var(--chat-border)' }}>
              <div style={{
                display: 'flex',
                gap: 0,
                overflowX: 'auto',
                padding: '0 24px',
                borderBottom: '1px solid var(--chat-border)',
                background: 'var(--chat-ivory)',
              }}>
                {sections.map((s, i) => (
                  <button key={i} onClick={() => setActiveSection(i)} style={{
                    padding: '12px 16px',
                    border: 'none',
                    background: 'transparent',
                    color: activeSection === i ? 'var(--chat-green)' : 'var(--chat-muted)',
                    fontSize: 12.5,
                    fontWeight: activeSection === i ? 700 : 500,
                    borderBottom: activeSection === i ? '2.5px solid var(--chat-green)' : '2px solid transparent',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s',
                    fontFamily: 'var(--chat-sans)',
                  }}>{s.title}</button>
                ))}
              </div>
              <div style={{ padding: '20px 24px' }}>
                {sections[activeSection]?.items?.map((item, ii) => (
                  <div key={ii} style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12,
                    fontSize: 13,
                    color: 'var(--chat-body)',
                    lineHeight: 1.6,
                    marginBottom: 12,
                    padding: '10px 16px',
                    background: 'var(--chat-green-pale)',
                    borderRadius: 12,
                    border: '1px solid var(--chat-green-border)',
                    transition: 'transform 0.1s ease',
                  }}>
                    <span style={{ color: 'var(--chat-green)', marginTop: 2, flexShrink: 0 }}>
                      <Icon d={icons.check} size={14} />
                    </span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Field data table - Enhanced with better styling */}
          {detailedRecords.length > 0 && (
            <div style={{ padding: '20px 24px' }}>
              <div style={{
                fontSize: 13,
                fontWeight: 700,
                color: 'var(--chat-ink)',
                marginBottom: 14,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}>
                <Icon d={icons.layers} size={14} />
                Field Data — {detailedRecords.length} records
              </div>
              <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid var(--chat-border)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
                  <thead>
                    <tr style={{ background: 'var(--chat-green)' }}>
                      {['Location', 'Date', 'NDVI', 'Soil %', 'Crop %', 'Yield %'].map(h => (
                        <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: '#fff', fontSize: 10.5, fontFamily: 'var(--chat-mono)', letterSpacing: '0.4px', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {detailedRecords.slice(0, 30).map((r, i) => {
                      const ndvi = r.mean_ndvi;
                      const ndviCol = !ndvi ? '#999' : ndvi >= 0.5 ? 'var(--chat-green)' : ndvi >= 0.3 ? '#e6a817' : '#dc3545';
                      const fv = (v, d = 1) => v != null ? parseFloat(v).toFixed(d) : '—';
                      return (
                        <tr key={i} style={{ background: i % 2 ? 'var(--chat-green-pale)' : '#fff', borderBottom: '1px solid var(--chat-border)' }}>
                          <td style={{ padding: '10px 12px', color: 'var(--chat-body)', fontWeight: 600, borderRight: '1px solid rgba(0,0,0,0.04)' }}>{r.place_name || '—'}</td>
                          <td style={{ padding: '10px 12px', color: 'var(--chat-muted)', fontFamily: 'var(--chat-mono)', fontSize: 10.5, borderRight: '1px solid rgba(0,0,0,0.04)' }}>{r.datetime?.slice(0,10) || '—'}</td>
                          <td style={{ padding: '10px 12px', color: ndviCol, fontWeight: 700, fontFamily: 'var(--chat-mono)', borderRight: '1px solid rgba(0,0,0,0.04)' }}>{fv(ndvi, 3)}</td>
                          <td style={{ padding: '10px 12px', color: 'var(--chat-body)', borderRight: '1px solid rgba(0,0,0,0.04)' }}>{fv(r.soil_health_score)}</td>
                          <td style={{ padding: '10px 12px', color: 'var(--chat-body)', borderRight: '1px solid rgba(0,0,0,0.04)' }}>{fv(r.crop_health_score)}</td>
                          <td style={{ padding: '10px 12px', color: 'var(--chat-body)' }}>{fv(r.yield_potential)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {detailedRecords.length > 30 && (
                  <div style={{ textAlign: 'center', padding: '14px 0', fontSize: 11.5, color: 'var(--chat-muted)', borderTop: '1px solid var(--chat-border)', background: 'var(--chat-ivory)' }}>
                    Showing 30 of {detailedRecords.length} records — download PDF for the full report.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Satellite imagery - Grid layout for better viewing */}
          {detailedRecords.some(r => r.images && Object.values(r.images).some(Boolean)) && (
            <div style={{ padding: '20px 24px', borderTop: '1px solid var(--chat-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--chat-green-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--chat-green)' }}>
                  <Icon d={icons.eye} size={16} />
                </div>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--chat-ink)' }}>Satellite Imagery</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                {detailedRecords.filter(r => r.images).slice(0, 3).map((record, idx) => {
                  const imgs = record.images || {};
                  const items = [
                    { label: 'NDVI', key: 'ndvi_png' }, { label: 'RGB', key: 'rgb_png' },
                    { label: 'SAVI', key: 'savi_png' }, { label: 'EVI', key: 'evi_png' },
                    { label: 'GNDVI', key: 'gndvi_png' },
                  ].filter(x => imgs[x.key]);
                  if (!items.length) return null;
                  return (
                    <div key={idx} style={{
                      background: 'var(--chat-green-pale)',
                      borderRadius: 14,
                      padding: '14px',
                      border: '1px solid var(--chat-green-border)',
                    }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--chat-green)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Icon d={icons.leaf} size={12} />
                        {record.place_name || `Field ${record.analysis_id}`}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {items.map(({ label, key }) => (
                          <button key={key} onClick={() => { setModalImg(imgs[key]); setModalLabel(`${record.place_name || 'Field'} — ${label}`); }}
                            style={{
                              background: '#fff',
                              border: '1px solid var(--chat-green-border)',
                              borderRadius: 10,
                              padding: '8px 14px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 7,
                              fontSize: 11,
                              color: 'var(--chat-green)',
                              fontWeight: 600,
                              transition: 'all 0.18s',
                            }}>
                            <Icon d={icons.eye} size={12} /> {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Extra bottom padding for better scroll experience */}
          <div style={{ height: 8 }} />
        </div>

        {/* Info Footer - Sticky at bottom of card */}
        <div style={{
          padding: '10px 24px',
          borderTop: '1px solid var(--chat-border)',
          background: 'var(--chat-green-pale)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flexShrink: 0,
        }}>
          <Icon d={icons.info} size={13} />
          <span style={{ fontSize: 11, color: 'var(--chat-muted)' }}>
            The downloaded PDF is generated server-side in A4 format with professional layout, charts, and full field data.
          </span>
        </div>
      </div>
    </>
  );
};

// ─── Combined Data Table (with internal scroll) ───────────────────────────────
const CombinedDataTable = ({ data, selectedIds, onToggleSelect, onToggleAll, loading }) => {
  const [search,       setSearch]       = useState('');
  const [sortConfig,   setSortConfig]   = useState({ key: 'datetime', dir: 'desc' });
  const [expandedRow,  setExpandedRow]  = useState(null);
  const [currentPage,  setCurrentPage]  = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [modalImg,     setModalImg]     = useState(null);
  const [modalLabel,   setModalLabel]   = useState('');

  const getNDVIColor = v => {
    if (!v)   return 'var(--chat-muted)';
    if (v > 0.7) return 'var(--chat-green)';
    if (v > 0.5) return '#20c997';
    if (v > 0.3) return 'var(--chat-amber)';
    if (v > 0.1) return '#e67e22';
    return '#c0392b';
  };
  const formatDate = d => d ? new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

  const filtered = data
    .filter(r => !search || [r.place_name, r.analysis_id, r.mean_ndvi].some(v => String(v ?? '').toLowerCase().includes(search.toLowerCase())))
    .sort((a, b) => {
      let av = a[sortConfig.key], bv = b[sortConfig.key];
      if (av == null) return 1; if (bv == null) return -1;
      if (typeof av === 'string') return sortConfig.dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortConfig.dir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const pageItems  = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const allSelected = pageItems.length > 0 && pageItems.every(r => selectedIds.has(r.analysis_id));

  const handleSort = key => {
    setSortConfig(prev => ({ key, dir: prev.key === key && prev.dir === 'desc' ? 'asc' : 'desc' }));
    setCurrentPage(1);
  };

  const SortTh = ({ col, label, width }) => (
    <th onClick={() => handleSort(col)} style={{
      padding: '8px 8px', textAlign: 'left', fontSize: 9.5, whiteSpace: 'nowrap',
      fontFamily: 'var(--chat-mono)', color: sortConfig.key === col ? 'var(--chat-green)' : 'var(--chat-muted)',
      letterSpacing: '0.5px', textTransform: 'uppercase', borderBottom: '2px solid var(--chat-border)',
      background: 'var(--chat-cream)', position: 'sticky', top: 0, zIndex: 10,
      cursor: 'pointer', userSelect: 'none', width, borderRight: '1px solid var(--chat-border)',
    }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
        {label}
        {sortConfig.key === col
          ? <span style={{ fontSize: 9, background: 'var(--chat-green)', color: '#fff', borderRadius: 3, padding: '1px 3px' }}>{sortConfig.dir === 'asc' ? '↑' : '↓'}</span>
          : <span style={{ opacity: 0.25, fontSize: 9 }}>↕</span>}
      </span>
    </th>
  );

  const tdBase = { padding: '7px 8px', fontSize: 11.5, color: 'var(--chat-ink)', borderBottom: '1px solid var(--chat-border)', verticalAlign: 'middle', borderRight: '1px solid rgba(0,0,0,0.04)' };

  if (loading) return (
    <div style={{ background: 'var(--chat-white)', border: '1px solid var(--chat-border)', borderRadius: 16, padding: 60, textAlign: 'center' }}>
      <TypingDots />
      <div style={{ marginTop: 12, color: 'var(--chat-muted)', fontSize: 13 }}>Loading field data…</div>
    </div>
  );

  return (
    <>
      {modalImg && <ImageModal src={modalImg} label={modalLabel} onClose={() => setModalImg(null)} />}
      <div style={{
        background: 'var(--chat-white)', border: '1px solid var(--chat-border)', borderRadius: 16,
        overflow: 'hidden', boxShadow: 'var(--chat-shadow-md)',
        display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0,
      }}>
        {/* Table top bar */}
        <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--chat-border)', background: 'var(--chat-ivory)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ fontFamily: 'var(--chat-serif)', fontSize: 14, fontWeight: 700, color: 'var(--chat-ink)' }}>Field Data</div>
            <span style={{ background: 'var(--chat-green-light)', color: 'var(--chat-green)', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, border: '1px solid var(--chat-green-border)', fontFamily: 'var(--chat-mono)' }}>
              {filtered.length} records
            </span>
            {selectedIds.size > 0 && (
              <span style={{ background: 'var(--chat-amber-light)', color: 'var(--chat-amber)', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, border: '1px solid #f5d8a0', fontFamily: 'var(--chat-mono)' }}>
                {selectedIds.size} selected
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <Icon d={icons.search} size={13} />
              <input
                value={search} onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
                placeholder="Search fields…"
                style={{ paddingLeft: 26, paddingRight: 10, paddingTop: 6, paddingBottom: 6, border: '1px solid var(--chat-border)', borderRadius: 8, fontSize: 12, background: 'var(--chat-white)', color: 'var(--chat-ink)', width: 160 }}
              />
            </div>
            <select value={itemsPerPage} onChange={e => { setItemsPerPage(+e.target.value); setCurrentPage(1); }}
              style={{ padding: '5px 8px', border: '1px solid var(--chat-border)', borderRadius: 8, fontSize: 11, background: 'var(--chat-white)', color: 'var(--chat-muted)' }}>
              {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n}/page</option>)}
            </select>
          </div>
        </div>

        {/* Table container with internal scroll */}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto', minHeight: 0, overscrollBehavior: 'contain' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 620 }}>
            <thead>
              <tr>
                <th style={{ ...tdBase, padding: '8px 8px', background: 'var(--chat-cream)', position: 'sticky', top: 0, zIndex: 10, borderBottom: '2px solid var(--chat-border)', borderRight: '1px solid var(--chat-border)', width: 36 }}>
                  <input type="checkbox" checked={allSelected} onChange={() => onToggleAll(pageItems.map(r => r.analysis_id))} style={{ cursor: 'pointer' }} />
                </th>
                <SortTh col="place_name" label="Location" width="30%" />
                <SortTh col="datetime"   label="Date"     width="16%" />
                <SortTh col="mean_ndvi"  label="NDVI"     width="10%" />
                <SortTh col="soil_health_score" label="Soil %" width="10%" />
                <SortTh col="crop_health_score" label="Crop %" width="10%" />
                <SortTh col="yield_potential"   label="Yield %" width="10%" />
                <th style={{ padding: '8px 8px', background: 'var(--chat-cream)', position: 'sticky', top: 0, zIndex: 10, borderBottom: '2px solid var(--chat-border)', borderRight: '1px solid var(--chat-border)', width: 36 }} />
              </tr>
            </thead>
            <tbody>
              {pageItems.map((row, idx) => {
                const isSelected = selectedIds.has(row.analysis_id);
                const isExpanded = expandedRow === row.analysis_id;
                return (
                  <React.Fragment key={row.analysis_id}>
                    <tr style={{ background: isSelected ? 'var(--chat-green-pale)' : idx % 2 ? '#fafafa' : '#fff', transition: 'background 0.15s' }}>
                      <td style={{ ...tdBase, textAlign: 'center' }}>
                        <input type="checkbox" checked={isSelected} onChange={() => onToggleSelect(row.analysis_id)} style={{ cursor: 'pointer' }} />
                      </td>
                      <td style={{ ...tdBase, fontWeight: 600, cursor: 'pointer' }} onClick={() => setExpandedRow(isExpanded ? null : row.analysis_id)}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <div style={{ width: 7, height: 7, borderRadius: '50%', background: row.source === 'neon' ? 'var(--chat-green)' : '#9b59b6', flexShrink: 0 }} />
                          {row.place_name || '—'}
                        </div>
                        <div style={{ fontSize: 9.5, color: 'var(--chat-muted)', fontFamily: 'var(--chat-mono)', marginTop: 2 }}>ID: {row.analysis_id}</div>
                      </td>
                      <td style={{ ...tdBase, fontFamily: 'var(--chat-mono)', fontSize: 10.5 }}>{formatDate(row.datetime)}</td>
                      <td style={{ ...tdBase }}>
                        <span style={{ color: getNDVIColor(row.mean_ndvi), fontWeight: 700, fontFamily: 'var(--chat-mono)' }}>
                          {row.mean_ndvi != null ? row.mean_ndvi.toFixed(3) : '—'}
                        </span>
                      </td>
                      <td style={tdBase}>
                        {(() => { const v = row.soil_health_score || 0; const c = v >= 70 ? 'var(--chat-green)' : v >= 50 ? 'var(--chat-amber)' : '#c0392b'; return <span style={{ background: v >= 70 ? 'var(--chat-green-light)' : v >= 50 ? 'var(--chat-amber-light)' : '#fdecea', color: c, padding: '2px 7px', borderRadius: 20, fontSize: 10.5, fontWeight: 700, fontFamily: 'var(--chat-mono)' }}>{v.toFixed(1)}%</span>; })()}
                      </td>
                      <td style={tdBase}>
                        {(() => { const v = row.crop_health_score || 0; const c = v >= 70 ? 'var(--chat-green)' : v >= 50 ? 'var(--chat-amber)' : '#c0392b'; return <span style={{ background: v >= 70 ? 'var(--chat-green-light)' : v >= 50 ? 'var(--chat-amber-light)' : '#fdecea', color: c, padding: '2px 7px', borderRadius: 20, fontSize: 10.5, fontWeight: 700, fontFamily: 'var(--chat-mono)' }}>{v.toFixed(1)}%</span>; })()}
                      </td>
                      <td style={tdBase}>{row.yield_potential != null ? `${row.yield_potential.toFixed(1)}%` : '—'}</td>
                      <td style={tdBase} onClick={e => e.stopPropagation()}>
                        <button onClick={() => setExpandedRow(isExpanded ? null : row.analysis_id)} style={{
                          width: 28, height: 28, borderRadius: 8, border: '1px solid var(--chat-border)',
                          background: isExpanded ? 'var(--chat-green)' : 'var(--chat-white)',
                          color: isExpanded ? '#fff' : 'var(--chat-muted)',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11,
                        }}>{isExpanded ? '▲' : '▶'}</button>
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr>
                        <td colSpan={9} style={{ padding: 0, background: 'var(--chat-green-pale)', borderBottom: '2px solid var(--chat-green-border)' }}>
                          <div style={{ padding: '18px 24px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 14 }}>
                              {/* Vegetation indices */}
                              <div>
                                <div style={{ fontSize: 10, fontFamily: 'var(--chat-mono)', color: 'var(--chat-green)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8 }}>Vegetation Indices</div>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                                  <thead><tr style={{ background: 'var(--chat-green-border)' }}>{['Index','Mean','Std','Min','Max'].map(h => <th key={h} style={{ padding: '5px 8px', textAlign: 'left', fontSize: 9.5 }}>{h}</th>)}</tr></thead>
                                  <tbody>
                                    {[['NDVI', row.mean_ndvi, row.std_ndvi, row.min_ndvi, row.max_ndvi],['SAVI', row.mean_savi, row.std_savi, row.min_savi, row.max_savi],['EVI', row.mean_evi, row.std_evi, row.min_evi, row.max_evi],['GNDVI', row.mean_gndvi, row.std_gndvi, row.min_gndvi, row.max_gndvi]].map(([n,m,s,mn,mx], i) => (
                                      <tr key={n} style={{ background: i%2 ? 'rgba(255,255,255,0.5)' : 'transparent' }}>
                                        <td style={{ padding: '5px 8px', fontWeight: 700 }}>{n}</td>
                                        {[m,s,mn,mx].map((v,j) => <td key={j} style={{ padding: '5px 8px' }}>{v?.toFixed(4) ?? '—'}</td>)}
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                              {/* Health metrics */}
                              <div>
                                <div style={{ fontSize: 10, fontFamily: 'var(--chat-mono)', color: 'var(--chat-green)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8 }}>Health Metrics</div>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                                  <thead><tr style={{ background: 'var(--chat-green-border)' }}>{['Category','Metric','Value'].map(h => <th key={h} style={{ padding: '5px 8px', textAlign: 'left', fontSize: 9.5 }}>{h}</th>)}</tr></thead>
                                  <tbody>
                                    {[['Soil','Health Score',`${row.soil_health_score?.toFixed(1)??'—'}%`],['Soil','Moisture',`${row.moisture_index?.toFixed(1)??'—'}%`],['Soil','pH',row.ph_level?.toFixed(1)??'—'],['Crop','Health',`${row.crop_health_score?.toFixed(1)??'—'}%`],['Crop','Yield Potential',`${row.yield_potential?.toFixed(1)??'—'}%`]].map(([cat,metric,val],i) => (
                                      <tr key={i} style={{ background: i%2 ? 'rgba(255,255,255,0.5)' : 'transparent' }}>
                                        <td style={{ padding: '5px 8px', fontWeight: 700 }}>{cat}</td>
                                        <td style={{ padding: '5px 8px' }}>{metric}</td>
                                        <td style={{ padding: '5px 8px', fontWeight: 600 }}>{val}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>

                            {/* Images */}
                            {row.images && Object.values(row.images).some(Boolean) && (
                              <div>
                                <div style={{ fontSize: 10, fontFamily: 'var(--chat-mono)', color: 'var(--chat-green)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8 }}>Satellite Imagery</div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                  {[['NDVI','ndvi_png'],['RGB','rgb_png'],['SAVI','savi_png'],['EVI','evi_png'],['GNDVI','gndvi_png'],['Soil','soil_health_png'],['Crop','crop_health_png']].filter(([,k]) => row.images?.[k]).map(([label, key]) => (
                                    <button key={key} onClick={() => { setModalImg(row.images[key]); setModalLabel(`${row.place_name||'Field'} — ${label}`); }}
                                      style={{ background: '#fff', border: '1px solid var(--chat-green-border)', borderRadius: 10, padding: 8, cursor: 'pointer', textAlign: 'center' }}>
                                      <img src={row.images[key]} alt={label} style={{ width: 80, height: 60, objectFit: 'cover', borderRadius: 6, display: 'block', marginBottom: 4 }} onError={e => e.target.style.display='none'} />
                                      <div style={{ fontSize: 9.5, color: 'var(--chat-muted)', fontWeight: 600 }}>{label}</div>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ padding: '10px 18px', borderTop: '1px solid var(--chat-border)', background: 'var(--chat-ivory)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, flexShrink: 0 }}>
            <span style={{ fontSize: 12, color: 'var(--chat-muted)' }}>
              {((currentPage-1)*itemsPerPage)+1}–{Math.min(currentPage*itemsPerPage, filtered.length)} of {filtered.length}
            </span>
            <div style={{ display: 'flex', gap: 4 }}>
              {[['«', () => setCurrentPage(1), currentPage===1], ['‹', () => setCurrentPage(p => Math.max(1,p-1)), currentPage===1], [currentPage, null, true, true], ['›', () => setCurrentPage(p => Math.min(totalPages,p+1)), currentPage===totalPages], ['»', () => setCurrentPage(totalPages), currentPage===totalPages]].map(([label, fn, disabled, isCurrent], i) => (
                <button key={i} onClick={fn||undefined} disabled={disabled} style={{
                  padding: '4px 8px', borderRadius: 6, border: '1px solid var(--chat-border)',
                  background: isCurrent && fn===null ? 'var(--chat-green)' : 'white',
                  color: isCurrent && fn===null ? 'white' : 'inherit',
                  cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled && fn!==null ? 0.4 : 1,
                }}>{label}</button>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

// ─── Main ReportPage (no overall page scroll, internal scroll only) ──────────
const ReportPage = () => {
  const [data,          setData]          = useState([]);
  const [loading,       setLoading]       = useState(false);
  const [selectedIds,   setSelectedIds]   = useState(new Set());
  const [generating,    setGenerating]    = useState(false);
  const [pdfDownloading,setPdfDownloading]= useState(false);
  const [reportReady,   setReportReady]   = useState(false);
  const [reportData,    setReportData]    = useState(null);
  const [reportPayload, setReportPayload] = useState(null);
  const [toastMsg,      setToastMsg]      = useState(null);
  const [activeTab,     setActiveTab]     = useState('table');
  const [dateRange,     setDateRange]     = useState('all');

  const toast = (msg, type = 'success') => {
    setToastMsg({ msg, type });
    setTimeout(() => setToastMsg(null), 4000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.listAgriculturalData({ date_range: dateRange });
      if (res.success) {
        setData(res.data || []);
        toast(`📊 Loaded ${res.data?.length || 0} records`);
      } else throw new Error('Failed');
    } catch {
      toast('Failed to load data from API', 'error');
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [dateRange]); // eslint-disable-line

  const toggleSelect = useCallback(id => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(ids => {
    setSelectedIds(prev => {
      const allSelected = ids.every(id => prev.has(id));
      const next = new Set(prev);
      ids.forEach(id => allSelected ? next.delete(id) : next.add(id));
      return next;
    });
  }, []);

  /** Step 1: generate JSON preview */
  const handleGenerate = async (config) => {
    setGenerating(true);
    setReportReady(false);
    const payload = {
      ...config,
      analysis_ids: Array.from(selectedIds).map(String),
    };
    try {
      const result = await api.generateReportPreview(payload);
      if (result.success && result.report) {
        setReportData(result.report);
        setReportPayload(payload);
        setReportReady(true);
        setActiveTab('report');
        toast('✅ Preview ready — click Download PDF for the full A4 report');
      } else {
        throw new Error(result.detail || 'Report generation failed');
      }
    } catch (err) {
      toast(err.message || 'Failed to generate report', 'error');
    } finally {
      setGenerating(false);
    }
  };

  /** Step 2: stream PDF from backend */
  const handleDownloadPDF = async (payload) => {
    if (pdfDownloading) return;
    setPdfDownloading(true);
    try {
      await api.downloadPDF(payload, msg => toast(msg));
      toast('✅ PDF downloaded successfully!');
    } catch (err) {
      toast(err.message || 'PDF download failed', 'error');
    } finally {
      setPdfDownloading(false);
    }
  };

  const handleDownloadCSV = async (payload) => {
    try {
      await api.downloadCSV(payload);
      toast('📊 CSV exported!');
    } catch (err) {
      toast(err.message || 'CSV export failed', 'error');
    }
  };

  return (
    <div className="chat-page report-page" style={{
      fontFamily: 'var(--chat-sans)',
      minHeight: '100vh',
      background: 'var(--chat-ivory)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',  // No overall page scroll
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&family=DM+Mono:wght@400;500&display=swap');
        .chat-page *, .chat-page *::before, .chat-page *::after { box-sizing: border-box; }
        .chat-page {
          --chat-ivory: #FAFAF7; --chat-cream: #F3F1EA; --chat-white: #FFFFFF;
          --chat-green: #2D6A2F; --chat-green-mid: #3B7D3E; --chat-green-light: #EAF3DE;
          --chat-green-pale: #F2F8EC; --chat-green-accent: #4E9A52; --chat-green-border: #B8D4B9;
          --chat-sage: #7A9E7E; --chat-terra: #A8622A; --chat-amber: #BA7517;
          --chat-amber-light: #FDF3E0; --chat-ink: #1A2B1B; --chat-body: #4A5E4B;
          --chat-muted: #7A8E7B; --chat-hint: #A8BCAA; --chat-border: #DDE8DC;
          --chat-border-strong: #B8CEB9;
          --chat-serif: 'Playfair Display', Georgia, serif;
          --chat-sans: 'DM Sans', sans-serif; --chat-mono: 'DM Mono', monospace;
          --chat-shadow-sm: 0 1px 3px rgba(26,43,27,0.06), 0 1px 2px rgba(26,43,27,0.04);
          --chat-shadow-md: 0 4px 16px rgba(26,43,27,0.08), 0 2px 6px rgba(26,43,27,0.05);
        }
        @keyframes chat-bounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-5px)} }
        @keyframes chat-fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes chat-spin { to{transform:rotate(360deg)} }
        @keyframes chat-toastIn { from{opacity:0;transform:translateY(16px) scale(0.96)} to{opacity:1;transform:translateY(0) scale(1)} }
        .report-page input[type="checkbox"] { accent-color: var(--chat-green); width:15px; height:15px; }
        .report-page input[type="text"] { outline:none; }
        ::-webkit-scrollbar { width:6px; height:6px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:var(--chat-green-border); border-radius:3px; }
        ::-webkit-scrollbar-thumb:hover { background:var(--chat-green); }
      `}</style>

      {/* Main content container - uses flex to fill height with no overflow */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        padding: '16px 24px 20px',
        gap: 14,
        maxWidth: 1600,
        width: '100%',
        margin: '0 auto',
        minHeight: 0,  // Important for flex child overflow
      }}>

        {/* Page title - fixed, no scroll */}
        <div style={{ flexShrink: 0 }}>
          <h1 style={{ fontFamily: 'var(--chat-serif)', fontSize: 26, fontWeight: 900, color: 'var(--chat-ink)', margin: 0, marginBottom: 2 }}>
            Field Report Generator
          </h1>
          <p style={{ fontSize: 14, color: 'var(--chat-muted)', margin: 0 }}>
            Select fields, configure, preview — then download a professional A4 PDF generated on the server.
          </p>
        </div>

        {/* Tabs + sync - fixed, no scroll */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 4, background: 'var(--chat-cream)', borderRadius: 12, padding: 4, width: 'fit-content' }}>
            {[['table', icons.db, 'Field Data'], ['report', icons.report, 'Report Preview']].map(([tab, icon, label]) => (
              <button key={tab} onClick={() => setActiveTab(tab)} style={{
                display: 'flex', alignItems: 'center', gap: 7, padding: '8px 18px',
                borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: activeTab === tab ? 600 : 400,
                background: activeTab === tab ? 'var(--chat-white)' : 'transparent',
                color: activeTab === tab ? 'var(--chat-green)' : 'var(--chat-muted)',
                transition: 'all 0.18s', boxShadow: activeTab === tab ? 'var(--chat-shadow-sm)' : 'none',
              }}>
                <Icon d={icon} size={14} /> {label}
                {tab === 'report' && reportReady && (
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--chat-green-accent)' }} />
                )}
              </button>
            ))}
          </div>
          <button onClick={loadData} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', border: '1px solid var(--chat-border)', borderRadius: 9, background: 'transparent', color: 'var(--chat-muted)', fontSize: 12, cursor: 'pointer' }}>
            <Icon d={icons.refresh} size={13} /> Sync Data
          </button>
        </div>

        {/* Main content area - fills remaining space, handles internal scroll */}
        <div style={{
          flex: 1,
          display: 'flex',
          gap: 16,
          alignItems: 'stretch',
          minHeight: 0,  // Critical for flex children to respect overflow
          overflow: 'hidden',
          overscrollBehavior: 'contain',
        }}>
          {/* Dynamic content panel - scrolls internally */}
          <div style={{ flex: 1, minWidth: 0, minHeight: 0 }}>
            {activeTab === 'table' ? (
              <CombinedDataTable
                data={data} selectedIds={selectedIds}
                onToggleSelect={toggleSelect} onToggleAll={toggleAll}
                loading={loading}
              />
            ) : reportReady ? (
              <ReportPreviewCard
                report={reportData}
                reportPayload={reportPayload}
                onDownloadPDF={handleDownloadPDF}
                onDownloadCSV={handleDownloadCSV}
                pdfDownloading={pdfDownloading}
              />
            ) : (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                gap: 16,
                background: 'var(--chat-white)',
                border: '1px dashed var(--chat-border)',
                borderRadius: 16,
                minHeight: 0,
              }}>
                <div style={{ width: 60, height: 60, background: 'var(--chat-green-light)', borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--chat-green)', border: '1px solid var(--chat-green-border)' }}>
                  <Icon d={icons.report} size={28} />
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--chat-serif)', fontSize: 20, fontWeight: 700, color: 'var(--chat-ink)', marginBottom: 6 }}>No Report Yet</div>
                  <div style={{ fontSize: 13, color: 'var(--chat-muted)' }}>Configure and generate a preview using the panel →</div>
                </div>
              </div>
            )}
          </div>

          {/* Config panel - fixed width, does not scroll */}
          <div style={{ width: 300, flexShrink: 0 }}>
            <ReportConfigPanel
              selectedIds={[...selectedIds]}
              totalRecords={data.length}
              onGenerate={handleGenerate}
              onDownloadPDF={handleDownloadPDF}
              onDownloadCSV={handleDownloadCSV}
              generating={generating}
              pdfDownloading={pdfDownloading}
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
              reportReady={reportReady}
              reportPayload={reportPayload}
            />
          </div>
        </div>
      </div>

      {/* Toast */}
      {toastMsg && (
        <div style={{
          position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
          background: toastMsg.type === 'error' ? '#c0392b' : 'var(--chat-ink)',
          color: '#fff', borderRadius: 12, padding: '10px 20px', fontSize: 13, fontWeight: 500,
          boxShadow: '0 8px 32px rgba(0,0,0,0.18)', animation: 'chat-toastIn 0.3s cubic-bezier(0.16,1,0.3,1)',
          zIndex: 9999, display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap',
        }}>
          <Icon d={toastMsg.type === 'error' ? icons.x : icons.check} size={14} />
          {toastMsg.msg}
        </div>
      )}
    </div>
  );
};

export default ReportPage;