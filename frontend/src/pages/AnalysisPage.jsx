import { useState, useEffect, useLayoutEffect, useRef, useCallback } from "react";

const API_BASE = 'http://localhost:8000';
// ── CSS injected once ──────────────────────────────────────────────────────
let CSS = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700;1,900&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&family=DM+Mono:wght@400;500&display=swap');
*{
  margin:0px;
  // padding:0px;
}
:root {
  --ivory:#FAFAF7; --cream:#F3F1EA; --white:#FFFFFF;
  --green:#2D6A2F; --green-mid:#3B7D3E; --green-light:#EAF3DE;
  --green-pale:#F2F8EC; --green-accent:#4E9A52; --green-border:#B8D4B9;
  --sage:#7A9E7E; --sage-light:#C8DDC9;
  --terra:#A8622A; --terra-light:#F5E6D3; --terra-border:#DEC4A8;
  --amber:#BA7517; --amber-light:#FDF3E0;
  --ink:#1A2B1B; --ink-mid:#2E4330; --body:#4A5E4B; --muted:#7A8E7B; --hint:#A8BCAA;
  --border:#DDE8DC; --border-strong:#B8CEB9; --border-hover:#9AB89C;
  --red:#C0392B; --red-light:#FDECEA;
  --serif:'Playfair Display',Georgia,serif;
  --sans:'DM Sans',sans-serif;
  --mono:'DM Mono',monospace;
  --shadow-sm:0 1px 3px rgba(26,43,27,0.06),0 1px 2px rgba(26,43,27,0.04);
  --shadow-md:0 4px 16px rgba(26,43,27,0.08),0 2px 6px rgba(26,43,27,0.05);
  --shadow-lg:0 12px 40px rgba(26,43,27,0.1),0 4px 12px rgba(26,43,27,0.06);
}
.va-root *{margin:0;padding:0;box-sizing:border-box}
.va-root{background:var(--ivory);color:var(--ink);font-family:var(--sans);overflow-x:hidden;line-height:1.6;-webkit-font-smoothing:antialiased}

// /* NAV */
// .va-nav{position:sticky;top:0;z-index:500;display:flex;align-items:center;justify-content:space-between;padding:0 5%;height:66px;background:rgba(250,250,247,0.96);backdrop-filter:blur(20px);border-bottom:1px solid var(--border)}
// .va-logo-wrap{display:flex;align-items:center;gap:11px;text-decoration:none;cursor:pointer}
// .va-logo-mark{width:36px;height:36px;background:var(--green);border-radius:9px;display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 2px 8px rgba(45,106,47,0.25)}
// .va-logo-name{font-family:var(--sans);font-weight:600;font-size:17px;color:var(--ink);letter-spacing:-.3px;display:block}
// .va-logo-sub{font-size:10px;color:var(--muted);letter-spacing:1.4px;text-transform:uppercase;font-family:var(--mono);display:block;margin-top:-1px}
// .va-nav-links{display:flex;align-items:center;gap:6px}
// .va-nav-link{color:var(--body);font-size:13.5px;text-decoration:none;padding:7px 14px;border-radius:8px;cursor:pointer;font-weight:400;border:none;background:transparent;font-family:var(--sans);transition:all .18s}
// .va-nav-link:hover{color:var(--green);background:var(--green-pale)}
// .va-nav-link.active{color:var(--green);background:var(--green-light);font-weight:500}
// .va-nav-divider{width:1px;height:20px;background:var(--border);margin:0 8px}
// .va-nav-cta{display:flex;align-items:center;gap:6px;background:var(--green);color:#fff;border:none;border-radius:9px;padding:9px 20px;font-size:13.5px;font-weight:600;cursor:pointer;font-family:var(--sans);transition:all .18s;box-shadow:0 1px 4px rgba(45,106,47,0.25)}
// .va-nav-cta:hover{background:var(--green-mid)}

/* PAGE HEADER */
// .va-page-header{padding:28px 5% 22px;border-bottom:1px solid var(--border);background:var(--white)}
// .va-ph-breadcrumb{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--muted);font-family:var(--mono);margin-bottom:10px}
// .va-ph-breadcrumb span{color:var(--green);cursor:pointer}
// .va-ph-row{display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:12px}
// .va-ph-title{font-family:var(--serif);font-size:30px;font-weight:900;color:var(--ink);letter-spacing:-1px;margin-bottom:4px}
// .va-ph-sub{font-size:13.5px;color:var(--body);font-weight:300}
// .va-place-badge{display:inline-flex;align-items:center;gap:6px;background:var(--green-pale);border:1px solid var(--green-border);border-radius:100px;padding:5px 14px;font-size:12px;color:var(--green);font-weight:500;font-family:var(--mono)}

/* LAYOUT */
.va-layout{display:grid;grid-template-columns:360px 1fr;min-height:calc(100vh - 66px - 84px);align-items:start}

/* LEFT PANEL */
.va-left-panel{background:var(--white);border-right:1px solid var(--border);padding:22px;display:flex;flex-direction:column;gap:18px;position:sticky;top:66px;max-height:calc(100vh - 66px);overflow-y:auto}
.va-panel-label{font-size:10.5px;font-weight:600;letter-spacing:1.3px;text-transform:uppercase;color:var(--muted);font-family:var(--mono);margin-bottom:8px;display:block}
.va-panel-section{display:flex;flex-direction:column}
.va-divider{height:1px;background:var(--border);margin:4px 0}

/* Draw tools */
.va-tool-btn{display:flex;align-items:center;gap:10px;padding:11px 13px;border-radius:10px;border:1.5px solid var(--border);background:var(--white);cursor:pointer;font-family:var(--sans);font-size:13.5px;font-weight:500;color:var(--body);transition:all .18s;text-align:left;width:100%;margin-bottom:6px}
.va-tool-btn:hover{border-color:var(--border-hover);background:var(--ivory);color:var(--ink)}
.va-tool-btn.active{border-color:var(--green);background:var(--green-pale);color:var(--green)}
.va-tool-btn svg{flex-shrink:0;opacity:.65}
.va-tool-btn.active svg{opacity:1}
.va-tool-btn-sub{font-size:11px;color:var(--muted);font-weight:400;display:block;margin-top:1px;font-family:var(--mono)}

/* Status */
.va-poly-status{background:var(--cream);border:1px solid var(--border);border-radius:10px;padding:11px 13px;margin-bottom:6px}
.va-poly-status.has-polygon{background:var(--green-pale);border-color:var(--green-border)}
.va-ps-row{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--body)}
.va-ps-dot{width:8px;height:8px;border-radius:50%;background:var(--hint);flex-shrink:0}
.va-ps-dot.active{background:var(--green-accent);animation:va-pulse 2s ease-in-out infinite}
@keyframes va-pulse{0%,100%{opacity:1}50%{opacity:.4}}
.va-ps-coords{font-family:var(--mono);font-size:10.5px;color:var(--muted);margin-top:6px;line-height:1.7}

/* Buttons */
.va-btn-analyse{display:flex;align-items:center;justify-content:center;gap:8px;background:var(--green);color:#fff;border:none;border-radius:11px;padding:13px 20px;font-size:14px;font-weight:600;cursor:pointer;font-family:var(--sans);transition:all .2s;box-shadow:0 2px 12px rgba(45,106,47,0.25);width:100%;margin-bottom:7px}
.va-btn-analyse:hover:not(:disabled){background:var(--green-mid);transform:translateY(-1px);box-shadow:0 6px 20px rgba(45,106,47,0.3)}
.va-btn-analyse:disabled{opacity:.4;cursor:not-allowed;transform:none}
.va-btn-clear-poly{display:flex;align-items:center;justify-content:center;gap:6px;background:transparent;color:var(--muted);border:1.5px dashed var(--border);border-radius:9px;padding:8px 14px;font-size:12.5px;font-weight:400;cursor:pointer;font-family:var(--sans);transition:all .18s;width:100%;margin-bottom:6px}
.va-btn-clear-poly:hover:not(:disabled){border-color:var(--terra);color:var(--terra)}
.va-btn-clear-poly:disabled{opacity:.3;cursor:not-allowed}
.va-btn-clear{display:flex;align-items:center;justify-content:center;gap:7px;background:transparent;color:var(--body);border:1.5px solid var(--border);border-radius:9px;padding:10px 14px;font-size:13px;font-weight:500;cursor:pointer;font-family:var(--sans);transition:all .18s;width:100%}
.va-btn-clear:hover:not(:disabled){border-color:var(--red);color:var(--red);background:var(--red-light)}
.va-btn-clear:disabled{opacity:.3;cursor:not-allowed}

/* History */
.va-hist-item{padding:9px 11px;border-radius:8px;border:1px solid var(--border);background:var(--ivory);cursor:pointer;transition:all .15s;margin-bottom:5px}
.va-hist-item:hover{border-color:var(--green-border);background:var(--green-pale)}
.va-hist-place{font-size:12.5px;font-weight:500;color:var(--ink-mid)}
.va-hist-time{font-size:10.5px;color:var(--muted);font-family:var(--mono);margin-top:1px}
.va-hist-empty{font-size:12px;color:var(--hint);font-style:italic;text-align:center;padding:10px 0}

/* MAP AREA */
.va-map-area{display:flex;flex-direction:column}
.va-map-container{width:100%;height:500px;z-index:1}
.va-map-tip{display:flex;align-items:center;gap:8px;padding:9px 16px;background:var(--white);border-top:1px solid var(--border);font-size:12.5px;color:var(--muted)}

/* PROGRESS */
.va-progress-wrap{display:none;padding:14px 20px;background:var(--white);border-top:1px solid var(--border)}
.va-progress-wrap.active{display:block}
.va-pb-label{font-size:12px;font-family:var(--mono);color:var(--muted);margin-bottom:7px;display:flex;justify-content:space-between}
.va-pb-track{background:var(--cream);border-radius:100px;height:6px;overflow:hidden}
.va-pb-fill{height:100%;background:linear-gradient(90deg,var(--green),var(--green-accent));border-radius:100px;transition:width .5s ease}
.va-pb-steps{display:flex;gap:14px;margin-top:9px;flex-wrap:wrap}
.va-pb-step{display:flex;align-items:center;gap:4px;font-size:11px;color:var(--hint);font-family:var(--mono);transition:color .3s}
.va-pb-step.done{color:var(--green)}
.va-pb-step.active-step{color:var(--ink-mid)}

/* RESULTS */
.va-results-section{padding:28px 28px 40px;background:var(--ivory)}
.va-results-header{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:24px;flex-wrap:wrap;gap:12px}
.va-rh-tag{font-size:10.5px;color:var(--green-accent);letter-spacing:2px;text-transform:uppercase;font-family:var(--mono);margin-bottom:5px;display:block}
.va-rh-title{font-family:var(--serif);font-size:26px;font-weight:900;color:var(--ink);letter-spacing:-.8px}
.va-rh-meta{font-size:12.5px;color:var(--muted);margin-top:4px;font-family:var(--mono)}
.va-rh-actions{display:flex;gap:8px;flex-wrap:wrap}
.va-rh-btn{display:flex;align-items:center;gap:6px;padding:8px 14px;border-radius:9px;font-size:12.5px;font-weight:500;cursor:pointer;font-family:var(--sans);transition:all .15s;border:1.5px solid var(--border);background:var(--white);color:var(--body)}
.va-rh-btn:hover{border-color:var(--border-hover);color:var(--ink)}
.va-rh-btn.danger{border-color:var(--red);color:var(--red)}
.va-rh-btn.danger:hover{background:var(--red);color:#fff}

/* SCORE CARDS */
.va-score-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:14px;margin-bottom:28px}
.va-score-card{background:var(--white);border:1px solid var(--border);border-radius:14px;padding:18px;box-shadow:var(--shadow-sm);transition:box-shadow .2s,transform .2s}
.va-score-card:hover{box-shadow:var(--shadow-md);transform:translateY(-2px)}
.va-sc-label{font-size:10px;color:var(--muted);letter-spacing:1.2px;text-transform:uppercase;font-family:var(--mono);margin-bottom:8px}
.va-sc-val{font-family:var(--serif);font-size:38px;font-weight:900;letter-spacing:-2px;line-height:1;margin-bottom:6px}
.va-sc-bar{height:4px;border-radius:100px;background:var(--cream);overflow:hidden;margin-bottom:7px}
.va-sc-bar-fill{height:100%;border-radius:100px;transition:width 1.2s cubic-bezier(.16,1,.3,1)}
.va-sc-status{font-size:11px;font-weight:600;display:inline-flex;align-items:center;gap:4px;padding:2px 9px;border-radius:100px}

/* GALLERY */
.va-gallery-section{margin-bottom:28px}
.va-section-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}
.va-section-title{font-size:15px;font-weight:600;color:var(--ink);letter-spacing:-.2px}
.va-gallery-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:14px}
.va-gallery-item{background:var(--white);border:1px solid var(--border);border-radius:12px;overflow:hidden;box-shadow:var(--shadow-sm);transition:box-shadow .2s,transform .2s;cursor:pointer}
.va-gallery-item:hover{box-shadow:var(--shadow-md);transform:translateY(-2px)}
.va-gi-img{width:100%;height:160px;object-fit:cover;display:block;background:var(--green-pale)}
.va-gi-placeholder{width:100%;height:160px;background:linear-gradient(135deg,var(--green-pale),var(--cream));display:flex;align-items:center;justify-content:center;font-size:28px}
.va-gi-footer{padding:10px 13px;display:flex;align-items:center;justify-content:space-between}
.va-gi-name{font-size:13px;font-weight:600;color:var(--ink-mid)}
.va-gi-sub{font-size:10.5px;color:var(--muted);font-family:var(--mono)}
.va-gi-dl{padding:4px 10px;border-radius:6px;border:1px solid var(--border);background:transparent;font-size:11px;color:var(--body);cursor:pointer;font-family:var(--sans);transition:all .15s}
.va-gi-dl:hover{background:var(--green);color:#fff;border-color:var(--green)}

/* METRICS */
.va-metrics-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-bottom:28px}
.va-metrics-card{background:var(--white);border:1px solid var(--border);border-radius:14px;padding:20px;box-shadow:var(--shadow-sm)}
.va-mc-title{font-size:14px;font-weight:600;color:var(--ink);margin-bottom:3px}
.va-mc-sub{font-size:12px;color:var(--muted);margin-bottom:16px}
.va-metric-row{display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)}
.va-metric-row:last-child{border-bottom:none;padding-bottom:0}
.va-mr-label{font-size:12.5px;color:var(--body);flex:1}
.va-mr-bar-wrap{flex:2;display:flex;align-items:center;gap:8px}
.va-mr-bar{flex:1;height:4px;background:var(--cream);border-radius:100px;overflow:hidden}
.va-mr-fill{height:100%;border-radius:100px;transition:width 1.4s cubic-bezier(.16,1,.3,1)}
.va-mr-val{font-family:var(--mono);font-size:12px;color:var(--ink-mid);font-weight:500;width:48px;text-align:right;flex-shrink:0}

/* RECS */
.va-rec-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px}
.va-rec-card{background:var(--white);border:1px solid var(--border);border-radius:12px;padding:16px;box-shadow:var(--shadow-sm);display:flex;gap:12px}
.va-rec-icon{width:38px;height:38px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:17px;flex-shrink:0}
.va-rec-title{font-size:13px;font-weight:600;color:var(--ink);margin-bottom:3px}
.va-rec-text{font-size:12px;color:var(--body);line-height:1.6;font-weight:300}
.va-rec-priority{display:inline-block;padding:2px 8px;border-radius:100px;font-size:10px;font-weight:600;font-family:var(--mono);margin-top:7px}

/* MODAL */
.va-modal-overlay{display:none;position:fixed;inset:0;background:rgba(26,43,27,.8);backdrop-filter:blur(10px);z-index:9999;align-items:center;justify-content:center;padding:20px}
.va-modal-overlay.open{display:flex}
.va-modal-box{background:var(--white);border-radius:18px;max-width:880px;width:100%;max-height:90vh;overflow:hidden;box-shadow:0 32px 80px rgba(26,43,27,0.35);display:flex;flex-direction:column}
.va-modal-header{padding:16px 22px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between}
.va-modal-title{font-size:15px;font-weight:600;color:var(--ink)}
.va-modal-close{width:30px;height:30px;border-radius:7px;border:1px solid var(--border);background:transparent;display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--muted);transition:all .15s;font-size:15px}
.va-modal-close:hover{background:var(--cream);color:var(--ink)}
.va-modal-img-wrap{flex:1;overflow:auto;padding:20px;display:flex;align-items:center;justify-content:center;background:var(--cream)}
.va-modal-img{max-width:100%;max-height:70vh;border-radius:10px;box-shadow:var(--shadow-lg)}

/* ERROR TOAST */
.va-error-toast{display:none;position:fixed;bottom:24px;right:24px;background:#fff;border:1.5px solid var(--red);border-radius:12px;padding:14px 16px;box-shadow:0 8px 32px rgba(192,57,43,.15);z-index:9000;max-width:340px;gap:10px;animation:va-slideUp .3s ease}
.va-error-toast.show{display:flex;align-items:flex-start}
@keyframes va-slideUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
.va-et-title{font-size:13.5px;font-weight:600;color:var(--ink);margin-bottom:2px}
.va-et-msg{font-size:12px;color:var(--body);line-height:1.5}
.va-et-close{margin-left:auto;background:none;border:none;cursor:pointer;color:var(--muted);font-size:15px;padding:0 0 0 6px;flex-shrink:0}
.va-spinner{width:17px;height:17px;border:2.5px solid rgba(255,255,255,.35);border-top-color:#fff;border-radius:50%;animation:va-spin .7s linear infinite;flex-shrink:0}
@keyframes va-spin{to{transform:rotate(360deg)}}

`;

// ── Constants ──────────────────────────────────────────────────────────────
const STEPS = [
  { id: "step1", label: "Fetching imagery", pct: 20 },
  { id: "step2", label: "Computing indices", pct: 42 },
  { id: "step3", label: "Generating images", pct: 67 },
  { id: "step4", label: "Uploading results", pct: 87 },
  { id: "step5", label: "Saving data", pct: 97 },
];

const IMAGE_ENTRIES = [
  { key: "rgb",         label: "True Colour (RGB)",    sub: "Natural satellite view",  emoji: "🛰️" },
  { key: "ndvi",        label: "NDVI",                 sub: "Vegetation density",      emoji: "🌿" },
  { key: "savi",        label: "SAVI",                 sub: "Soil-adjusted vegetation",emoji: "🏜️" },
  { key: "gndvi",       label: "GNDVI",                sub: "Chlorophyll content",     emoji: "🍃" },
  { key: "evi",         label: "EVI",                  sub: "Enhanced vegetation",     emoji: "📈" },
  { key: "soil_health", label: "Soil Health Map",      sub: "Soil condition index",    emoji: "🌱" },
  { key: "crop_health", label: "Crop Health Map",      sub: "Crop stress index",       emoji: "🌾" },
];

// ── Helpers ────────────────────────────────────────────────────────────────
function scoreColor(v) {
  if (v >= 75) return "#2D6A2F";
  if (v >= 55) return "#4E9A52";
  if (v >= 40) return "#BA7517";
  if (v >= 25) return "#A8622A";
  return "#C0392B";
}

function scoreLabel(v) {
  if (v >= 75) return { text: "Excellent", bg: "#EAF3DE", c: "#2D6A2F" };
  if (v >= 55) return { text: "Good",      bg: "#EAF3DE", c: "#4E9A52" };
  if (v >= 40) return { text: "Moderate",  bg: "#FDF3E0", c: "#BA7517" };
  if (v >= 25) return { text: "Fair",      bg: "#F5E6D3", c: "#A8622A" };
  return             { text: "Poor",       bg: "#FDECEA", c: "#C0392B" };
}

function priorityColors(p) {
  return {
    high:   { bg: "#FDECEA", c: "#C0392B" },
    medium: { bg: "#FDF3E0", c: "#BA7517" },
    low:    { bg: "#EAF3DE", c: "#2D6A2F" },
  }[p] || { bg: "#EAF3DE", c: "#2D6A2F" };
}

// ── Sub-components ─────────────────────────────────────────────────────────

function ScoreBar({ val, max, color, animated }) {
  const pct = Math.min(100, Math.max(0, (val / max) * 100));
  return (
    <div className="va-sc-bar">
      <div
        className="va-sc-bar-fill"
        style={{ width: animated ? `${pct}%` : "0%", background: color }}
      />
    </div>
  );
}

function MetricBar({ val, max, color, animated }) {
  const pct = Math.min(100, Math.max(0, (val / max) * 100));
  return (
    <div className="va-mr-bar">
      <div
        className="va-mr-fill"
        style={{ width: animated ? `${pct}%` : "0%", background: color }}
      />
    </div>
  );
}

function ScoreCard({ label, value, max, color, statusBg, statusColor, statusText, animated }) {
  return (
    <div className="va-score-card">
      <div className="va-sc-label">{label}</div>
      <div className="va-sc-val" style={{ color }}>
        {typeof value === "number" ? value.toFixed(0) : value}
        <span style={{ fontSize: 16, color: "var(--muted)" }}>/{max}</span>
      </div>
      <ScoreBar val={value ?? 0} max={max} color={color} animated={animated} />
      <span className="va-sc-status" style={{ background: statusBg, color: statusColor }}>
        ● {statusText}
      </span>
    </div>
  );
}

function MetricRow({ label, val, max, color, unit = "", animated }) {
  return (
    <div className="va-metric-row">
      <div className="va-mr-label">{label}</div>
      <div className="va-mr-bar-wrap">
        <MetricBar val={val ?? 0} max={max} color={color} animated={animated} />
        <div className="va-mr-val">{(val ?? 0).toFixed(label.includes("NDVI") || label.includes("EVI") || label.includes("SAVI") || label.includes("GNDVI") ? 3 : 1)}{unit}</div>
      </div>
    </div>
  );
}

function GalleryCard({ entry, imgUrl, onOpen, onDownload }) {
  return (
    <div className="va-gallery-item" onClick={() => imgUrl && onOpen(imgUrl, entry.label)}>
      {imgUrl
        ? <img className="va-gi-img" src={imgUrl} alt={entry.label} loading="lazy"
            onError={e => { e.target.outerHTML = `<div class="va-gi-placeholder">${entry.emoji}</div>`; }} />
        : <div className="va-gi-placeholder">{entry.emoji}</div>
      }
      <div className="va-gi-footer">
        <div>
          <div className="va-gi-name">{entry.label}</div>
          <div className="va-gi-sub">{entry.sub}</div>
        </div>
        {imgUrl && (
          <button className="va-gi-dl" onClick={e => { e.stopPropagation(); onDownload(imgUrl, entry.key); }}>
            ↓ Save
          </button>
        )}
      </div>
    </div>
  );
}

function RecCard({ rec }) {
  const p = (rec.priority || "low").toLowerCase();
  const pc = priorityColors(p);
  return (
    <div className="va-rec-card">
      <div className="va-rec-icon" style={{ background: pc.bg }}>{rec.icon || "💡"}</div>
      <div>
        <div className="va-rec-title">{rec.title || rec.recommendation || "Recommendation"}</div>
        <div className="va-rec-text">{rec.description || rec.action || ""}</div>
        <span className="va-rec-priority" style={{ background: pc.bg, color: pc.c }}>
          {p.toUpperCase()} PRIORITY
        </span>
      </div>
    </div>
  );
}

function ProgressBar({ progress, stepStates, labelText }) {
  return (
    <div className={`va-progress-wrap ${progress.active ? "active" : ""}`}>
      <div className="va-pb-label">
        <span>{labelText}</span>
        <span>{progress.pct}%</span>
      </div>
      <div className="va-pb-track">
        <div className="va-pb-fill" style={{ width: `${progress.pct}%` }} />
      </div>
      <div className="va-pb-steps">
        {STEPS.map(s => (
          <div key={s.id} className={`va-pb-step ${stepStates[s.id] || ""}`}>
            {s.id === "step1" ? "① " : s.id === "step2" ? "② " : s.id === "step3" ? "③ " : s.id === "step4" ? "④ " : "⑤ "}
            {s.label}
          </div>
        ))}
      </div>
    </div>
  );
}

function ResultsView({ data, onClear }) {
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 120);
    return () => clearTimeout(t);
  }, []);

  const soil = data.soil_metrics || {};
  const crop = data.crop_metrics || {};
  const recs = data.recommendations || [];
  const imgs = data.image_urls || {};
  const stats = data.numerical_statistics || {};

  const ss = soil.soil_health_score ?? 0;
  const cs = crop.crop_health_score ?? 0;
  const sl = scoreLabel(ss);
  const cl = scoreLabel(cs);

  function openModal(url, title) {
    // handled via parent modal state via prop callback
  }

  function dlImg(url, name) {
    const a = document.createElement("a");
    a.href = url;
    a.download = `veganalyse_${name}_${Date.now()}.png`;
    a.target = "_blank";
    a.click();
  }

  return (
    <div className="va-results-section">
      {/* Header */}
      <div className="va-results-header">
        <div>
          <span className="va-rh-tag">Analysis Complete</span>
          <h2 className="va-rh-title">{data.place || "Selected Area"}</h2>
          <p className="va-rh-meta">📅 {data.timestamp || "—"} &nbsp;·&nbsp; 🛰️ Sentinel-2 SR Harmonized</p>
        </div>
        <div className="va-rh-actions">
          <button className="va-rh-btn danger" onClick={onClear}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>
            </svg>
            Clear &amp; New
          </button>
        </div>
      </div>

      {/* Score Cards */}
      <div className="va-score-grid">
        <ScoreCard label="Soil Health Score" value={ss} max={100} color={scoreColor(ss)} statusBg={sl.bg} statusColor={sl.c} statusText={sl.text} animated={animated} />
        <ScoreCard label="Crop Health Score" value={cs} max={100} color={scoreColor(cs)} statusBg={cl.bg} statusColor={cl.c} statusText={cl.text} animated={animated} />
        <ScoreCard label="Moisture Index" value={soil.moisture_index ?? 0} max={100} color="#2D6A2F" statusBg="var(--green-light)" statusColor="var(--green)" statusText="Measured" animated={animated} />
        <ScoreCard label="Chlorophyll" value={crop.chlorophyll_content ?? 0} max={100} color="#4E9A52" statusBg="var(--green-light)" statusColor="var(--green)" statusText="Measured" animated={animated} />
        <ScoreCard label="Yield Potential" value={crop.yield_potential ?? 0} max={100} color="#BA7517" statusBg="var(--amber-light)" statusColor="var(--amber)" statusText="Estimated" animated={animated} />
        <div className="va-score-card">
          <div className="va-sc-label">pH Level</div>
          <div className="va-sc-val" style={{ color: "#7A9E7E" }}>
            {(soil.ph_level ?? 7).toFixed(1)}
            <span style={{ fontSize: 16, color: "var(--muted)" }}> pH</span>
          </div>
          <ScoreBar val={soil.ph_level ?? 7} max={14} color="#7A9E7E" animated={animated} />
          <span className="va-sc-status" style={{ background: "var(--green-light)", color: "var(--sage)" }}>
            ● {(soil.ph_level ?? 7) < 7 ? "Acidic" : (soil.ph_level ?? 7) > 7 ? "Alkaline" : "Neutral"}
          </span>
        </div>
        <ScoreCard label="Stress Level" value={crop.stress_level ?? 0} max={100} color="#C0392B" statusBg="var(--red-light)" statusColor="var(--red)" statusText="Crop Stress" animated={animated} />
        <ScoreCard label="Vigor Index" value={crop.vigor_index ?? 0} max={100} color="#3B7D3E" statusBg="var(--green-light)" statusColor="var(--green-mid)" statusText="Measured" animated={animated} />
      </div>

      {/* Satellite Images */}
      <div className="va-gallery-section">
        <div className="va-section-header">
          <h3 className="va-section-title">Satellite Image Layers</h3>
          <span style={{ fontSize: 12, color: "var(--muted)", fontFamily: "var(--mono)" }}>Click to enlarge · ↓ to download</span>
        </div>
        <div className="va-gallery-grid">
          {IMAGE_ENTRIES.map(e => (
            <GalleryCard key={e.key} entry={e} imgUrl={imgs[e.key]}
              onOpen={(url, title) => {}} // modal handled by parent
              onDownload={dlImg} />
          ))}
        </div>
      </div>

      {/* Soil & Crop Metrics */}
      <div className="va-metrics-grid">
        <div className="va-metrics-card">
          <div className="va-mc-title">🌍 Soil Health Metrics</div>
          <div className="va-mc-sub">Derived from Sentinel-2 spectral analysis</div>
          {[
            { label: "Health Score",   val: soil.soil_health_score, max: 100, color: scoreColor(ss) },
            { label: "Moisture Index", val: soil.moisture_index,    max: 100, color: "#2D6A2F" },
            { label: "Organic Matter", val: soil.organic_matter,    max: 100, color: "#7A9E7E" },
            { label: "Texture Score",  val: soil.texture_score,     max: 100, color: "#A8622A" },
            { label: "pH Level",       val: soil.ph_level ?? 7,     max: 14,  color: "#4E9A52", unit: " pH" },
          ].map(m => <MetricRow key={m.label} {...m} animated={animated} />)}
        </div>
        <div className="va-metrics-card">
          <div className="va-mc-title">🌾 Crop Health Metrics</div>
          <div className="va-mc-sub">Vegetation index-based analysis</div>
          {[
            { label: "Health Score",  val: crop.crop_health_score,  max: 100, color: scoreColor(cs) },
            { label: "Vigor Index",   val: crop.vigor_index,        max: 100, color: "#2D6A2F" },
            { label: "Stress Level",  val: crop.stress_level,       max: 100, color: "#C0392B" },
            { label: "Yield Potential",val:crop.yield_potential,    max: 100, color: "#BA7517" },
            { label: "Chlorophyll",   val: crop.chlorophyll_content,max: 100, color: "#4E9A52", unit: "%" },
          ].map(m => <MetricRow key={m.label} {...m} animated={animated} />)}
        </div>
      </div>

      {/* NDVI Stats */}
      {stats.ndvi && (
        <div className="va-metrics-grid">
          <div className="va-metrics-card">
            <div className="va-mc-title">📊 NDVI Statistics</div>
            <div className="va-mc-sub">Normalised Difference Vegetation Index — range across selected area</div>
            {[
              { label: "Mean NDVI", val: stats.ndvi.mean_ndvi ?? 0,                     max: 1, color: "#2D6A2F" },
              { label: "Min NDVI",  val: Math.max(0, stats.ndvi.min_ndvi ?? 0),          max: 1, color: "#7A9E7E" },
              { label: "Max NDVI",  val: Math.max(0, stats.ndvi.max_ndvi ?? 0),          max: 1, color: "#4E9A52" },
              { label: "Std Deviation", val: Math.max(0, stats.ndvi.std_ndvi ?? 0),      max: 1, color: "#BA7517" },
            ].map(m => <MetricRow key={m.label} {...m} animated={animated} />)}
          </div>
          <div className="va-metrics-card">
            <div className="va-mc-title">📊 EVI / SAVI / GNDVI</div>
            <div className="va-mc-sub">Enhanced vegetation indices summary</div>
            {[
              { label: "Mean EVI",   val: Math.max(0, stats.evi?.mean_evi ?? 0),    max: 1, color: "#4B0082" },
              { label: "Max EVI",    val: Math.max(0, stats.evi?.max_evi ?? 0),     max: 1, color: "#7B68EE" },
              { label: "Mean SAVI",  val: Math.max(0, stats.savi?.mean_savi ?? 0),  max: 1, color: "#8B4513" },
              { label: "Mean GNDVI", val: Math.max(0, stats.gndvi?.mean_gndvi ?? 0),max: 1, color: "#27ae60" },
            ].map(m => <MetricRow key={m.label} {...m} animated={animated} />)}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {recs.length > 0 && (
        <div className="va-gallery-section">
          <div className="va-section-header">
            <h3 className="va-section-title">Recommendations</h3>
            <span style={{ fontSize: 12, color: "var(--muted)", fontFamily: "var(--mono)" }}>
              {recs.length} action{recs.length > 1 ? "s" : ""} suggested
            </span>
          </div>
          <div className="va-rec-grid">
            {recs.map((r, i) => <RecCard key={i} rec={r} />)}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function VegAnalysis() {
  // State
  const [activeTab, setActiveTab] = useState("analysis");
  const [activeTool, setActiveTool] = useState("rect");
  const [hasPolygon, setHasPolygon] = useState(false);
  const [coords, setCoords] = useState(null);
  const [isAnalysing, setIsAnalysing] = useState(false);
  const [resultsData, setResultsData] = useState(null);
  const [sessionHistory, setSessionHistory] = useState([]);
  const [placeBadge, setPlaceBadge] = useState(null);
  const [progress, setProgress] = useState({ active: false, pct: 0 });
  const [stepStates, setStepStates] = useState({});
  const [progressLabel, setProgressLabel] = useState("Processing satellite imagery…");
  const [modal, setModal] = useState({ open: false, url: "", title: "" });
  const [error, setError] = useState({ show: false, msg: "" });

  const mapRef = useRef(null);
  const leafletMapRef = useRef(null);
  const drawnItemsRef = useRef(null);
  const drawnLayerRef = useRef(null);
  const drawControlRef = useRef(null);
  const progressIntervalRef = useRef(null);

  // Inject styles before first paint to prevent layout shift
  useLayoutEffect(() => {
    if (!document.getElementById("va-styles")) {
      const s = document.createElement("style");
      s.id = "va-styles";
      s.textContent = CSS;
      document.head.appendChild(s);
    }
  }, []);

  // Init Leaflet
  useEffect(() => {
    if (!mapRef.current || leafletMapRef.current) return;
    if (typeof window === "undefined") return;

    // Load Leaflet scripts dynamically if not present
    const initMap = () => {
      const L = window.L;
      if (!L) return;

      const map = L.map(mapRef.current, { center: [20.5937, 78.9629], zoom: 5, zoomControl: false });
      L.control.zoom({ position: "topright" }).addTo(map);

      const streets = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap", maxZoom: 19 });
      const satellite = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", { attribution: "© Esri", maxZoom: 19 });
      streets.addTo(map);
      L.control.layers({ Streets: streets, Satellite: satellite }, {}, { position: "topleft" }).addTo(map);

      const drawnItems = new L.FeatureGroup();
      map.addLayer(drawnItems);
      drawnItemsRef.current = drawnItems;
      leafletMapRef.current = map;

      initDrawControl("rect", map, drawnItems);

      map.on(L.Draw.Event.CREATED, function (e) {
        if (drawnLayerRef.current) drawnItems.removeLayer(drawnLayerRef.current);
        drawnLayerRef.current = e.layer;
        drawnItems.addLayer(drawnLayerRef.current);
        let newCoords;
        if (e.layerType === "rectangle") {
          const b = drawnLayerRef.current.getBounds();
          newCoords = [[b.getWest(),b.getSouth()],[b.getEast(),b.getSouth()],[b.getEast(),b.getNorth()],[b.getWest(),b.getNorth()],[b.getWest(),b.getSouth()]];
        } else {
          const ring = drawnLayerRef.current.getLatLngs()[0] || drawnLayerRef.current.getLatLngs();
          newCoords = ring.map(ll => [ll.lng, ll.lat]);
          if (newCoords[0][0] !== newCoords[newCoords.length - 1][0]) newCoords.push(newCoords[0]);
        }
        setCoords(newCoords);
        setHasPolygon(true);
      });
    };

    if (window.L && window.L.Control && window.L.Control.Draw) {
      initMap();
    } else {
      // Load scripts
      const leafletJs = document.createElement("script");
      leafletJs.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      leafletJs.onload = () => {
        const drawJs = document.createElement("script");
        drawJs.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet.draw/1.0.4/leaflet.draw.js";
        drawJs.onload = initMap;
        document.head.appendChild(drawJs);
      };
      document.head.appendChild(leafletJs);

      // Also load CSS if missing
      if (!document.querySelector('link[href*="leaflet.css"]')) {
        ["https://unpkg.com/leaflet@1.9.4/dist/leaflet.css",
         "https://cdnjs.cloudflare.com/ajax/libs/leaflet.draw/1.0.4/leaflet.draw.css"
        ].forEach(href => {
          const l = document.createElement("link");
          l.rel = "stylesheet"; l.href = href;
          document.head.appendChild(l);
        });
      }
    }
  }, []);

  function initDrawControl(mode, map, drawnItems) {
    const L = window.L;
    if (!L) return;
    const m = map || leafletMapRef.current;
    const di = drawnItems || drawnItemsRef.current;
    if (!m || !di) return;
    if (drawControlRef.current) m.removeControl(drawControlRef.current);
    drawControlRef.current = new L.Control.Draw({
      position: "topleft",
      draw: {
        rectangle: mode === "rect" ? { shapeOptions: { color: "#2D6A2F", fillOpacity: 0.15, weight: 2.5 } } : false,
        polygon: mode === "polygon" ? { shapeOptions: { color: "#2D6A2F", fillOpacity: 0.15, weight: 2.5 }, allowIntersection: false } : false,
        polyline: false, circle: false, circlemarker: false, marker: false,
      },
      edit: { featureGroup: di, remove: false },
    });
    m.addControl(drawControlRef.current);
  }

  function handleActivateTool(mode) {
    setActiveTool(mode);
    initDrawControl(mode);
  }

  function handleClearPolygon() {
    if (drawnLayerRef.current && drawnItemsRef.current) {
      drawnItemsRef.current.removeLayer(drawnLayerRef.current);
      drawnLayerRef.current = null;
    }
    setCoords(null);
    setHasPolygon(false);
  }

  function handleClearResults() {
    setResultsData(null);
    setPlaceBadge(null);
    handleClearPolygon();
  }

  // Progress
  function startProgress() {
    setProgress({ active: true, pct: 0 });
    setStepStates({ step1: "active-step" });
    let si = 0, val = 0;
    progressIntervalRef.current = setInterval(() => {
      if (si >= STEPS.length) return;
      const s = STEPS[si];
      if (val < s.pct) {
        val = Math.min(val + 1, s.pct);
        setProgress({ active: true, pct: val });
        setProgressLabel(s.label + "…");
        if (val === s.pct) {
          setStepStates(prev => ({ ...prev, [s.id]: "done" }));
          si++;
          if (si < STEPS.length) setStepStates(prev => ({ ...prev, [STEPS[si].id]: "active-step" }));
        }
      }
    }, 110);
  }

  function finishProgress() {
    clearInterval(progressIntervalRef.current);
    setProgress({ active: true, pct: 100 });
    setProgressLabel("Analysis complete!");
    const allDone = {};
    STEPS.forEach(s => { allDone[s.id] = "done"; });
    setStepStates(allDone);
    setTimeout(() => setProgress(p => ({ ...p, active: false })), 1600);
  }

  function stopProgress() {
    clearInterval(progressIntervalRef.current);
    setProgress({ active: false, pct: 0 });
  }

  async function runAnalysis() {
    if (!coords || isAnalysing) return;
    setIsAnalysing(true);
    startProgress();
    try {
      const res = await fetch(`${API_BASE}/get_ndvi`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ polygon: coords }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Server error ${res.status}`);
      }
      const data = await res.json();
      if (data.no_data) throw new Error(data.message || "No cloud-free imagery available for this area.");
      finishProgress();
      setResultsData(data);
      setSessionHistory(prev => [{ place: data.place || "Unknown Area", timestamp: data.timestamp || new Date().toLocaleTimeString() }, ...prev].slice(0, 6));
      if (data.place) setPlaceBadge(data.place);
    } catch (err) {
      stopProgress();
      setError({ show: true, msg: err.message || "Analysis failed. Please try again." });
      setTimeout(() => setError({ show: false, msg: "" }), 7000);
    } finally {
      setIsAnalysing(false);
    }
  }

  // Coords display
  const coordsText = (() => {
    if (!coords) return null;
    const lons = coords.map(c => c[0]), lats = coords.map(c => c[1]);
    const w = Math.min(...lons).toFixed(4), e = Math.max(...lons).toFixed(4);
    const s = Math.min(...lats).toFixed(4), n = Math.max(...lats).toFixed(4);
    return `SW ${s}°, ${w}° / NE ${n}°, ${e}°`;
  })();

  return (
    <div className="va-root">
      {/* NAV */}
      {/* <nav className="va-nav">
        <div className="va-logo-wrap">
          <div className="va-logo-mark">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a10 10 0 0 1 10 10c0 5.52-4.48 10-10 10S2 17.52 2 12 6.48 2 12 2z"/>
              <path d="M12 6v6l4 2"/>
            </svg>
          </div>
          <div>
            <span className="va-logo-name">VegAnalyse</span>
            <span className="va-logo-sub">Satellite Intelligence</span>
          </div>
        </div>
        <div className="va-nav-links">
          <button className="va-nav-link">Home</button>
          <button className="va-nav-link active">Analysis</button>
          <button className="va-nav-link">History</button>
          <button className="va-nav-link">Statistics</button>
          <div className="va-nav-divider" />
          <button className="va-nav-cta">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
            </svg>
            Health Report
          </button>
        </div>
      </nav> */}

      {/* PAGE HEADER */}
      {/* <div className="va-page-header">
        <div className="va-ph-breadcrumb">
          <span>Home</span>
          <span style={{ color: "var(--muted)" }}>›</span>
          <span style={{ color: "var(--muted)", cursor: "default" }}>Analysis</span>
        </div>
        <div className="va-ph-row">
          <div>
            <h1 className="va-ph-title">Vegetation Analysis</h1>
            <p className="va-ph-sub">Draw a bounding box on the map, then run the satellite analysis.</p>
          </div>
          {placeBadge && (
            <div className="va-place-badge">📍 {placeBadge}</div>
          )}
        </div>
      </div> */}

      {/* MAIN LAYOUT */}
      <div className="va-layout">
        {/* LEFT PANEL */}
        <aside className="va-left-panel">
          {/* Draw Tool */}
          <div className="va-panel-section">
            <span className="va-panel-label">Draw Tool</span>
            <button className={`va-tool-btn ${activeTool === "rect" ? "active" : ""}`} onClick={() => handleActivateTool("rect")}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="3"/>
              </svg>
              <div>Bounding Box<span className="va-tool-btn-sub">Rectangle selection</span></div>
            </button>
            <button className={`va-tool-btn ${activeTool === "polygon" ? "active" : ""}`} onClick={() => handleActivateTool("polygon")}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="12,2 22,9 18,21 6,21 2,9"/>
              </svg>
              <div>Polygon<span className="va-tool-btn-sub">Custom shape (double-click to finish)</span></div>
            </button>
          </div>

          <div className="va-divider" />

          {/* Selection Status */}
          <div className="va-panel-section">
            <span className="va-panel-label">Selection Status</span>
            <div className={`va-poly-status ${hasPolygon ? "has-polygon" : ""}`}>
              <div className="va-ps-row">
                <div className={`va-ps-dot ${hasPolygon ? "active" : ""}`} />
                <span>{hasPolygon ? "Area selected — ready to analyse" : "No area selected — draw on the map"}</span>
              </div>
            </div>
            {hasPolygon && coordsText && (
              <div className="va-poly-status has-polygon">
                <div className="va-ps-coords">{coordsText}</div>
              </div>
            )}
          </div>

          <div className="va-divider" />

          {/* Actions */}
          <div className="va-panel-section">
            <span className="va-panel-label">Actions</span>
            <button className="va-btn-analyse" disabled={!hasPolygon || isAnalysing} onClick={runAnalysis}>
              {isAnalysing ? (
                <><div className="va-spinner" /> Analysing…</>
              ) : (
                <>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                  </svg>
                  Run Satellite Analysis
                </>
              )}
            </button>
            <button className="va-btn-clear-poly" disabled={!hasPolygon} onClick={handleClearPolygon}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>
              </svg>
              Clear Selection
            </button>
            <button className="va-btn-clear" disabled={!resultsData} onClick={handleClearResults}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
              Clear Results &amp; New Analysis
            </button>
          </div>

          <div className="va-divider" />

          {/* History */}
          <div className="va-panel-section">
            <span className="va-panel-label">Session History</span>
            {sessionHistory.length === 0
              ? <p className="va-hist-empty">No analyses this session</p>
              : sessionHistory.map((h, i) => (
                <div key={i} className="va-hist-item">
                  <div className="va-hist-place">📍 {h.place}</div>
                  <div className="va-hist-time">{h.timestamp}</div>
                </div>
              ))
            }
          </div>
        </aside>

        {/* MAP + RESULTS */}
        <main className="va-map-area">
          <br></br><br></br>
          <div ref={mapRef} className="va-map-container" />

          <div className="va-map-tip">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            Use the draw toolbar on the top-left of the map. Click the rectangle icon, drag to select, then click "Run Analysis".
          </div>

          <ProgressBar progress={progress} stepStates={stepStates} labelText={progressLabel} />

          {resultsData && <ResultsView data={resultsData} onClear={handleClearResults} />}
        </main>
      </div>

      {/* IMAGE MODAL */}
      <div className={`va-modal-overlay ${modal.open ? "open" : ""}`} onClick={e => { if (e.target === e.currentTarget) setModal({ open: false, url: "", title: "" }); }}>
        <div className="va-modal-box">
          <div className="va-modal-header">
            <span className="va-modal-title">{modal.title || "Image Preview"}</span>
            <button className="va-modal-close" onClick={() => setModal({ open: false, url: "", title: "" })}>✕</button>
          </div>
          <div className="va-modal-img-wrap">
            {modal.url && <img className="va-modal-img" src={modal.url} alt={modal.title} />}
          </div>
        </div>
      </div>

      {/* ERROR TOAST */}
      <div className={`va-error-toast ${error.show ? "show" : ""}`}>
        <span style={{ fontSize: 18, flexShrink: 0 }}>⚠️</span>
        <div>
          <div className="va-et-title">Analysis Failed</div>
          <div className="va-et-msg">{error.msg}</div>
        </div>
        <button className="va-et-close" onClick={() => setError({ show: false, msg: "" })}>✕</button>
      </div>
    </div>
  );
}