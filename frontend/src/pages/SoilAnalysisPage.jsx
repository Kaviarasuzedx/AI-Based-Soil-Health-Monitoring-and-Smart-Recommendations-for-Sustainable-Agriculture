import { useState, useEffect, useCallback } from "react";

// ─── API Config ───────────────────────────────────────────────────────────────
const API_BASE = "http://localhost:8000/soil"; 


// ─── Icon Component ───────────────────────────────────────────────────────────
const Icon = ({ d, size = 16, style = {} }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={style}
  >
    {Array.isArray(d) ? d.map((p, i) => <path key={i} d={p} />) : <path d={d} />}
  </svg>
);

const icons = {
  leaf: "M2 22s4-10 12-10 8 10 8 10M6 10C6 6 9 2 12 2c3 0 6 4 6 8",
  seedling: ["M12 22V12", "M12 12C12 12 7 9 5 5c2 1 5 1 7 7z", "M12 12c0 0 5-3 7-7-2 1-5 1-7 7z"],
  flask: ["M9 3h6", "M5 21h14", "M9 3v6l-4 12h14L15 9V3"],
  atom: ["M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0", "M12 2C6 2 2 6.5 2 12s4 10 10 10 10-4.5 10-10S18 2 12 2", "M2 12h4m12 0h4"],
  droplet: "M12 2.69l.42.37c2.52 2.26 4.58 4.5 4.58 7.44 0 2.5-2 4.5-4.5 4.5s-4.5-2-4.5-4.5c0-2.94 2.06-5.18 4.58-7.44L12 2.69z",
  chartBar: ["M12 20V10", "M18 20V4", "M6 20v-4"],
  tractor: ["M3 9a4 4 0 0 0 4 4h2", "M7 2h10l2 7H5L7 2z", "M5 13v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4", "M9 17a2 2 0 1 0 0 4 2 2 0 0 0 0-4", "M18 17a2 2 0 1 0 0 4 2 2 0 0 0 0-4"],
  microscope: ["M6 18h8", "M3 22h18", "M14 22a7 7 0 1 0 0-14h-1", "M9 14h2", "M9 12a2 2 0 0 1 2-2V6l3 3-3 3v-2a2 2 0 0 1-2 2z"],
  alertTriangle: ["M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z", "M12 9v4", "M12 17h.01"],
  checkCircle: ["M22 11.08V12a10 10 0 1 1-5.93-9.14", "M22 4L12 14.01l-3-3"],
  xCircle: ["M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z", "M15 9l-6 6M9 9l6 6"],
  activity: "M22 12h-4l-3 9L9 3l-3 9H2",
  refresh: "M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15",
  calendar: ["M3 4h18a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z", "M16 2v4M8 2v4M1 10h22"],
  water: ["M3 12h18", "M3 6h18", "M3 18h18"],
  spinner: "M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83",
  seedCircle: ["M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z", "M8 12c0-2.21 1.79-4 4-4s4 1.79 4 4-1.79 4-4 4-4-1.79-4-4z"],
  info: ["M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z", "M12 8h.01", "M11 12h1v4h1"],
  arrowDown: "M12 5v14M5 12l7 7 7-7",
};

// ─── Utility Functions ────────────────────────────────────────────────────────
const getSuitabilityColor = (pct) => {
  if (pct >= 70) return { color: "var(--soil-green)", bg: "var(--soil-green-light)", border: "var(--soil-green-border)" };
  if (pct >= 50) return { color: "var(--soil-amber)", bg: "var(--soil-amber-light)", border: "#f0d9a0" };
  return { color: "#b84040", bg: "#fceaea", border: "#e8b4b4" };
};

const getLevelStyle = (level) => {
  const map = {
    critical: { color: "#b84040", bg: "#fceaea", border: "#e8b4b4" },
    low:      { color: "var(--soil-amber)", bg: "var(--soil-amber-light)", border: "#f0d9a0" },
    adequate: { color: "#2D7A8A", bg: "#e0f4f7", border: "#a4d8e0" },
    good:     { color: "var(--soil-green)", bg: "var(--soil-green-light)", border: "var(--soil-green-border)" },
    excess:   { color: "#BA6020", bg: "#fdebd4", border: "#e8c8a0" },
    optimal:  { color: "var(--soil-green)", bg: "var(--soil-green-light)", border: "var(--soil-green-border)" },
  };
  return map[(level || "").toLowerCase()] || { color: "var(--soil-muted)", bg: "var(--soil-cream)", border: "var(--soil-border)" };
};

const getPriorityStyle = (priority) => {
  const map = {
    high:   { color: "#b84040", bg: "#fceaea", border: "#e8b4b4" },
    medium: { color: "var(--soil-amber)", bg: "var(--soil-amber-light)", border: "#f0d9a0" },
    low:    { color: "var(--soil-green)", bg: "var(--soil-green-light)", border: "var(--soil-green-border)" },
  };
  return map[(priority || "").toLowerCase()] || { color: "var(--soil-muted)", bg: "var(--soil-cream)", border: "var(--soil-border)" };
};

// ─── Badge ────────────────────────────────────────────────────────────────────
const Badge = ({ label, level }) => {
  const s = getLevelStyle(level || label);
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "3px 10px", borderRadius: 20,
      fontSize: 11, fontWeight: 600, letterSpacing: "0.4px",
      color: s.color, background: s.bg, border: `1px solid ${s.border}`,
      fontFamily: "var(--soil-mono)",
      textTransform: "uppercase",
    }}>
      {label}
    </span>
  );
};

// ─── Section Card ─────────────────────────────────────────────────────────────
const SectionCard = ({ icon, title, children, accent = false }) => (
  <div style={{
    background: "var(--soil-white)",
    borderRadius: 16,
    border: "1px solid var(--soil-border)",
    boxShadow: "var(--soil-shadow-md)",
    overflow: "hidden",
    animation: "soil-fadeUp 0.4s cubic-bezier(0.16,1,0.3,1)",
  }}>
    <div style={{
      padding: "16px 22px",
      borderBottom: "1px solid var(--soil-border)",
      background: accent ? "var(--soil-green-pale)" : "var(--soil-ivory)",
      display: "flex", alignItems: "center", gap: 10,
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 10,
        background: "var(--soil-green-light)",
        border: "1px solid var(--soil-green-border)",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "var(--soil-green)", flexShrink: 0,
      }}>
        <Icon d={icon} size={15} />
      </div>
      <span style={{
        fontFamily: "var(--soil-serif)", fontSize: 16, fontWeight: 700,
        color: "var(--soil-ink)",
      }}>{title}</span>
    </div>
    <div style={{ padding: "20px 22px" }}>{children}</div>
  </div>
);

// ─── Data Table ───────────────────────────────────────────────────────────────
const DataTable = ({ columns, rows }) => (
  <div style={{ overflowX: "auto" }}>
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr>
          {columns.map((col, i) => (
            <th key={i} style={{
              padding: "10px 14px", textAlign: "left",
              fontSize: 10, fontFamily: "var(--soil-mono)", letterSpacing: "0.8px",
              textTransform: "uppercase", color: "var(--soil-muted)",
              borderBottom: "1px solid var(--soil-border)",
              background: "var(--soil-cream)",
              whiteSpace: "nowrap",
            }}>{col}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, ri) => (
          <tr key={ri} style={{ transition: "background 0.15s" }}
            onMouseEnter={e => e.currentTarget.style.background = "var(--soil-green-pale)"}
            onMouseLeave={e => e.currentTarget.style.background = ""}
          >
            {row.map((cell, ci) => (
              <td key={ci} style={{
                padding: "11px 14px", fontSize: 13.5,
                color: "var(--soil-body)",
                borderBottom: "1px solid var(--soil-border)",
                verticalAlign: "middle",
              }}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// ─── Form Field ───────────────────────────────────────────────────────────────
const FormField = ({ label, hint, icon, children }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
    <label style={{
      display: "flex", alignItems: "center", gap: 7,
      fontSize: 12.5, fontWeight: 600, color: "var(--soil-ink)",
      fontFamily: "var(--soil-mono)", letterSpacing: "0.4px", textTransform: "uppercase",
    }}>
      <span style={{ color: "var(--soil-green)" }}><Icon d={icon} size={13} /></span>
      {label}
    </label>
    {children}
    {hint && (
      <span style={{ fontSize: 11, color: "var(--soil-hint)", lineHeight: 1.5 }}>{hint}</span>
    )}
  </div>
);

const inputStyle = {
  padding: "11px 14px",
  border: "1.5px solid var(--soil-border)",
  borderRadius: 10,
  fontSize: 14,
  background: "var(--soil-ivory)",
  color: "var(--soil-ink)",
  fontFamily: "var(--soil-sans)",
  transition: "all 0.2s",
  outline: "none",
  width: "100%",
};

// ─── Crop Card ────────────────────────────────────────────────────────────────
const CropCard = ({ crop }) => {
  const s = getSuitabilityColor(crop.suitability_pct);
  return (
    <div style={{
      background: "var(--soil-ivory)",
      border: "1px solid var(--soil-border)",
      borderRadius: 12,
      padding: "14px 16px",
      display: "flex", alignItems: "center", gap: 14,
      transition: "all 0.2s",
      cursor: "default",
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--soil-green-border)"; e.currentTarget.style.background = "var(--soil-green-pale)"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--soil-border)"; e.currentTarget.style.background = "var(--soil-ivory)"; }}
    >
      <div style={{
        width: 48, height: 48, borderRadius: 12, flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: s.bg, border: `1px solid ${s.border}`, color: s.color,
        fontSize: 22,
      }}>🌱</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, color: "var(--soil-ink)", fontSize: 14, textTransform: "capitalize", marginBottom: 3 }}>
          {crop.crop}
        </div>
        <div style={{ fontSize: 11.5, color: "var(--soil-muted)", display: "flex", gap: 10, flexWrap: "wrap" }}>
          <span>🗓 {crop.season}</span>
          <span>💧 {crop.water_need}</span>
        </div>
        {crop.notes && (
          <div style={{ fontSize: 11, color: "var(--soil-hint)", marginTop: 4, lineHeight: 1.5,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 260 }}>
            {crop.notes}
          </div>
        )}
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: s.color, fontFamily: "var(--soil-mono)" }}>
          {crop.suitability_pct}%
        </div>
        <div style={{ fontSize: 10, color: "var(--soil-muted)", fontFamily: "var(--soil-mono)" }}>MATCH</div>
      </div>
    </div>
  );
};

// ─── Amendment Card ───────────────────────────────────────────────────────────
const AmendmentCard = ({ amendment }) => {
  const ps = getPriorityStyle(amendment.priority);
  return (
    <div style={{
      background: "var(--soil-ivory)",
      border: "1px solid var(--soil-border)",
      borderLeft: `4px solid ${ps.color}`,
      borderRadius: 10,
      padding: "14px 16px",
      marginBottom: 10,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontWeight: 700, color: "var(--soil-ink)", fontSize: 14 }}>{amendment.amendment}</span>
        <span style={{
          padding: "2px 10px", borderRadius: 20, fontSize: 10, fontWeight: 600,
          color: ps.color, background: ps.bg, border: `1px solid ${ps.border}`,
          fontFamily: "var(--soil-mono)", textTransform: "uppercase", whiteSpace: "nowrap",
        }}>{amendment.priority} Priority</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 16px", fontSize: 12.5, color: "var(--soil-body)" }}>
        <span><strong>Purpose:</strong> {amendment.purpose}</span>
        <span><strong>Dose:</strong> {amendment.dose} {amendment.unit}</span>
      </div>
      {amendment.notes && (
        <div style={{ marginTop: 8, fontSize: 12, color: "var(--soil-muted)", lineHeight: 1.6 }}>
          {amendment.notes}
        </div>
      )}
      {amendment.caution && (
        <div style={{
          marginTop: 8, fontSize: 11.5,
          background: "#fef9e0", border: "1px solid #f0d060", borderRadius: 8,
          padding: "6px 10px", color: "#7a6000",
          display: "flex", alignItems: "flex-start", gap: 6,
        }}>
          <Icon d={icons.alertTriangle} size={13} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{amendment.caution}</span>
        </div>
      )}
    </div>
  );
};

// ─── pH Gauge ─────────────────────────────────────────────────────────────────
const PHGauge = ({ phStatus, ph }) => {
  if (!phStatus) return null;
  const pct = Math.min(100, Math.max(0, ((ph - 0) / 14) * 100));
  const actionColor = phStatus.action === "raise" ? "#BA7517" : phStatus.action === "lower" ? "#2D7A8A" : "var(--soil-green)";
  const actionBg = phStatus.action === "raise" ? "#fdf3e0" : phStatus.action === "lower" ? "#e0f4f7" : "var(--soil-green-light)";

  return (
    <div style={{ textAlign: "center" }}>
      <div style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: 90, height: 90, borderRadius: "50%",
        background: actionBg, border: `3px solid ${actionColor}`,
        marginBottom: 14,
      }}>
        <span style={{ fontFamily: "var(--soil-mono)", fontSize: 26, fontWeight: 700, color: actionColor }}>{ph}</span>
      </div>
      <div style={{ fontFamily: "var(--soil-serif)", fontSize: 17, fontWeight: 700, color: "var(--soil-ink)", marginBottom: 6 }}>
        {phStatus.label}
      </div>
      {/* bar */}
      <div style={{ position: "relative", height: 10, borderRadius: 20, margin: "0 auto 10px", maxWidth: 300,
        background: "linear-gradient(to right, #e84040 0%, #f0c040 30%, #40c060 50%, #f0c040 70%, #e84040 100%)" }}>
        <div style={{
          position: "absolute", top: -3, left: `${pct}%`, transform: "translateX(-50%)",
          width: 16, height: 16, borderRadius: "50%",
          background: actionColor, border: "3px solid white",
          boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
        }} />
        {["0", "7", "14"].map((v, i) => (
          <span key={i} style={{
            position: "absolute", top: 14, fontSize: 9,
            fontFamily: "var(--soil-mono)", color: "var(--soil-muted)",
            left: i === 0 ? 0 : i === 1 ? "50%" : "100%",
            transform: i === 1 ? "translateX(-50%)" : i === 2 ? "translateX(-100%)" : "none",
          }}>{v}</span>
        ))}
      </div>
      <div style={{ marginTop: 20, padding: "10px 14px", background: actionBg, borderRadius: 10, fontSize: 12.5, color: actionColor, lineHeight: 1.6 }}>
        {phStatus.action === "raise"
          ? "Consider adding lime or wood ash to increase pH"
          : phStatus.action === "lower"
          ? "Consider adding sulfur or organic matter to decrease pH"
          : "pH is in the optimal range for most crops"}
      </div>
    </div>
  );
};

// ─── Toast ────────────────────────────────────────────────────────────────────
const Toast = ({ msg }) => {
  if (!msg) return null;
  const isErr = msg.type === "error";
  return (
    <div style={{
      position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)",
      background: isErr ? "#b84040" : "var(--soil-ink)",
      color: "#fff", borderRadius: 12, padding: "10px 20px", fontSize: 13,
      fontWeight: 500, boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
      animation: "soil-toastIn 0.3s cubic-bezier(0.16,1,0.3,1)",
      zIndex: 9999, display: "flex", alignItems: "center", gap: 8,
    }}>
      <Icon d={isErr ? icons.xCircle : icons.checkCircle} size={14} />
      {msg.text}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const SoilAnalysisPage = () => {
  const [form, setForm] = useState({ N: "45", P: "25", K: "120", pH: "6.5", season: "", water: "" });
  const [focusedField, setFocusedField] = useState(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState("");
  const [apiStatus, setApiStatus] = useState("checking");
  const [toast, setToast] = useState(null);

  const showToast = (text, type = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3500);
  };

  const checkHealth = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/health`);
      setApiStatus(res.ok ? "online" : "offline");
    } catch {
      setApiStatus("offline");
    }
  }, []);

  useEffect(() => {
    checkHealth();
    const id = setInterval(checkHealth, 30000);
    return () => clearInterval(id);
  }, [checkHealth]);

  const handleChange = (e) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
    if (error) setError("");
  };

  const handleSubmit = async () => {
    // Validate
    const { N, P, K, pH } = form;
    if (!N || !P || !K || !pH || isNaN(N) || isNaN(P) || isNaN(K) || isNaN(pH)) {
      setError("Please fill in all required soil parameters with valid numbers.");
      return;
    }
    const phVal = parseFloat(pH);
    if (phVal < 0 || phVal > 14) {
      setError("pH must be between 0 and 14.");
      return;
    }
    setError("");
    setLoading(true);

    const payload = { N: parseFloat(N), P: parseFloat(P), K: parseFloat(K), pH: phVal };
    if (form.season) payload.season = form.season;
    if (form.water) payload.water = form.water;

    try {
      const res = await fetch(`${API_BASE}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Analysis failed. Please try again.");
      }
      const data = await res.json();
      setResults(data);
      showToast("✅ Soil analysis complete!");
      setTimeout(() => {
        document.getElementById("soil-results")?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } catch (err) {
      setError(err.message || "Failed to reach the API. Is the server running?");
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const getInputStyle = (name) => ({
    ...inputStyle,
    borderColor: focusedField === name ? "var(--soil-green)" : "var(--soil-border)",
    boxShadow: focusedField === name ? "0 0 0 3px rgba(45,106,47,0.08)" : "none",
  });

  return (
    <div className="soil-page" style={{ fontFamily: "var(--soil-sans)", minHeight: "100vh", background: "var(--soil-ivory)" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&family=DM+Mono:wght@400;500&display=swap');
        .soil-page *, .soil-page *::before, .soil-page *::after { box-sizing: border-box; }
        .soil-page {
          --soil-ivory: #FAFAF7;
          --soil-cream: #F3F1EA;
          --soil-white: #FFFFFF;
          --soil-green: #2D6A2F;
          --soil-green-mid: #3B7D3E;
          --soil-green-light: #EAF3DE;
          --soil-green-pale: #F2F8EC;
          --soil-green-accent: #4E9A52;
          --soil-green-border: #B8D4B9;
          --soil-sage: #7A9E7E;
          --soil-amber: #BA7517;
          --soil-amber-light: #FDF3E0;
          --soil-ink: #1A2B1B;
          --soil-body: #4A5E4B;
          --soil-muted: #7A8E7B;
          --soil-hint: #A8BCAA;
          --soil-border: #DDE8DC;
          --soil-border-strong: #B8CEB9;
          --soil-serif: 'Playfair Display', Georgia, serif;
          --soil-sans: 'DM Sans', sans-serif;
          --soil-mono: 'DM Mono', monospace;
          --soil-shadow-sm: 0 1px 3px rgba(26,43,27,0.06), 0 1px 2px rgba(26,43,27,0.04);
          --soil-shadow-md: 0 4px 16px rgba(26,43,27,0.08), 0 2px 6px rgba(26,43,27,0.05);
        }
        @keyframes soil-fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes soil-toastIn {
          from { opacity: 0; transform: translateY(16px) scale(0.96) translateX(-50%); }
          to { opacity: 1; transform: translateY(0) scale(1) translateX(-50%); }
        }
        @keyframes soil-spin {
          to { transform: rotate(360deg); }
        }
        .soil-page input:focus, .soil-page select:focus { outline: none; }
        .soil-page select { appearance: none; cursor: pointer; }
        .soil-page ::-webkit-scrollbar { width: 5px; }
        .soil-page ::-webkit-scrollbar-track { background: transparent; }
        .soil-page ::-webkit-scrollbar-thumb { background: var(--soil-border-strong); border-radius: 4px; }
      `}</style>

      {/* ─── Header ──────────────────────────────────────────────────────────── */}
      {/* <header style={{
        background: "var(--soil-white)",
        borderBottom: "1px solid var(--soil-border)",
        padding: "0 40px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        height: 64, flexShrink: 0,
        boxShadow: "var(--soil-shadow-sm)",
        position: "sticky", top: 0, zIndex: 100,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: "var(--soil-green-light)", border: "1px solid var(--soil-green-border)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "var(--soil-green)",
          }}>
            <Icon d={icons.seedling} size={20} />
          </div>
          <div>
            <div style={{ fontFamily: "var(--soil-serif)", fontSize: 19, fontWeight: 700, color: "var(--soil-ink)", lineHeight: 1 }}>
              Soil Health Advisor
            </div>
            <div style={{ fontSize: 11, color: "var(--soil-muted)", fontFamily: "var(--soil-mono)", marginTop: 2 }}>
              AI-Powered Crop & Fertilizer Analysis
            </div>
          </div>
        </div>

       
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          background: "var(--soil-ivory)", border: "1px solid var(--soil-border)",
          borderRadius: 20, padding: "6px 14px", fontSize: 12,
          fontFamily: "var(--soil-mono)",
        }}>
          <div style={{
            width: 8, height: 8, borderRadius: "50%",
            background: apiStatus === "online" ? "var(--soil-green)" : apiStatus === "offline" ? "#b84040" : "#BA7517",
            boxShadow: apiStatus === "online" ? "0 0 6px rgba(45,106,47,0.4)" : "none",
          }} />
          <span style={{ color: "var(--soil-body)" }}>
            {apiStatus === "checking" ? "Checking..." : apiStatus === "online" ? "API Online" : "API Offline"}
          </span>
          <button onClick={checkHealth} style={{
            background: "none", border: "none", cursor: "pointer",
            color: "var(--soil-muted)", display: "flex", padding: 0,
          }}
            onMouseEnter={e => e.currentTarget.style.color = "var(--soil-green)"}
            onMouseLeave={e => e.currentTarget.style.color = "var(--soil-muted)"}
          >
            <Icon d={icons.refresh} size={12} />
          </button>
        </div>
      </header> */}

      {/* ─── Main Content ─────────────────────────────────────────────────────── */}
      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "36px 32px 80px" }}>

        {/* Hero line */}
        <div style={{ marginBottom: 32, animation: "soil-fadeUp 0.5s ease" }}>
          <h1 style={{
            fontFamily: "var(--soil-serif)", fontSize: 34, fontWeight: 900,
            color: "var(--soil-ink)", marginBottom: 8, lineHeight: 1.2,
          }}>
            Analyze Your Soil
          </h1>
          <p style={{ color: "var(--soil-muted)", fontSize: 15, lineHeight: 1.6 }}>
            Enter your soil's N, P, K values and pH to receive tailored crop and fertilizer recommendations.
          </p>
        </div>

        {/* ─── Input Form ─────────────────────────────────────────────────────── */}
        <div style={{
          background: "var(--soil-white)", borderRadius: 18,
          border: "1px solid var(--soil-border)", boxShadow: "var(--soil-shadow-md)",
          overflow: "hidden", marginBottom: 32,
          animation: "soil-fadeUp 0.5s 0.05s both ease",
        }}>
          <div style={{
            padding: "18px 26px", borderBottom: "1px solid var(--soil-border)",
            background: "var(--soil-ivory)", display: "flex", alignItems: "center", gap: 10,
          }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10,
              background: "var(--soil-green-light)", border: "1px solid var(--soil-green-border)",
              display: "flex", alignItems: "center", justifyContent: "center", color: "var(--soil-green)",
            }}>
              <Icon d={icons.flask} size={16} />
            </div>
            <span style={{ fontFamily: "var(--soil-serif)", fontSize: 17, fontWeight: 700, color: "var(--soil-ink)" }}>
              Soil Parameters
            </span>
          </div>

          <div style={{ padding: "26px" }}>
            {/* Error Banner */}
            {error && (
              <div style={{
                display: "flex", alignItems: "center", gap: 10, marginBottom: 20,
                background: "#fceaea", border: "1px solid #e8b4b4",
                borderRadius: 10, padding: "12px 16px",
                color: "#b84040", fontSize: 13.5,
                animation: "soil-fadeUp 0.25s ease",
              }}>
                <Icon d={icons.alertTriangle} size={16} />
                <span>{error}</span>
              </div>
            )}

            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "20px",
              marginBottom: 24,
            }}>
              {/* N */}
              <FormField label="Nitrogen (N)" hint="Optimal: 40–80 kg/ha · Critical: <20 · Excess: >200" icon={icons.atom}>
                <input
                  type="number" name="N" value={form.N} step="0.1" placeholder="e.g. 45"
                  onChange={handleChange}
                  onFocus={() => setFocusedField("N")}
                  onBlur={() => setFocusedField(null)}
                  style={getInputStyle("N")}
                />
              </FormField>
              {/* P */}
              <FormField label="Phosphorus (P)" hint="Optimal: 15–30 kg/ha · Critical: <8 · Excess: >80" icon={icons.flask}>
                <input
                  type="number" name="P" value={form.P} step="0.1" placeholder="e.g. 25"
                  onChange={handleChange}
                  onFocus={() => setFocusedField("P")}
                  onBlur={() => setFocusedField(null)}
                  style={getInputStyle("P")}
                />
              </FormField>
              {/* K */}
              <FormField label="Potassium (K)" hint="Optimal: 80–150 kg/ha · Critical: <40 · Excess: >350" icon={icons.chartBar}>
                <input
                  type="number" name="K" value={form.K} step="0.1" placeholder="e.g. 120"
                  onChange={handleChange}
                  onFocus={() => setFocusedField("K")}
                  onBlur={() => setFocusedField(null)}
                  style={getInputStyle("K")}
                />
              </FormField>
              {/* pH */}
              <FormField label="Soil pH" hint="Range: 0–14 · Optimal: 6.0–7.5 for most crops" icon={icons.droplet}>
                <input
                  type="number" name="pH" value={form.pH} step="0.1" placeholder="e.g. 6.5"
                  onChange={handleChange}
                  onFocus={() => setFocusedField("pH")}
                  onBlur={() => setFocusedField(null)}
                  style={getInputStyle("pH")}
                />
              </FormField>
              {/* Season */}
              <FormField label="Growing Season" hint="Optional — refines crop matching" icon={icons.calendar}>
                <select name="season" value={form.season} onChange={handleChange}
                  onFocus={() => setFocusedField("season")} onBlur={() => setFocusedField(null)}
                  style={getInputStyle("season")}
                >
                  <option value="">Select season…</option>
                  <option value="kharif">Kharif (Monsoon — Jun to Oct)</option>
                  <option value="rabi">Rabi (Winter — Oct to Mar)</option>
                  <option value="both">Both Seasons</option>
                  <option value="annual">Annual</option>
                </select>
              </FormField>
              {/* Water */}
              <FormField label="Water Availability" hint="Optional — filters drought-tolerant options" icon={icons.water}>
                <select name="water" value={form.water} onChange={handleChange}
                  onFocus={() => setFocusedField("water")} onBlur={() => setFocusedField(null)}
                  style={getInputStyle("water")}
                >
                  <option value="">Select availability…</option>
                  <option value="low">Low (Rainfed)</option>
                  <option value="medium">Medium (Limited Irrigation)</option>
                  <option value="high">High (Full Irrigation)</option>
                </select>
              </FormField>
            </div>

            {/* Analyze Button */}
            <button
              onClick={handleSubmit}
              disabled={loading}
              style={{
                width: "100%", padding: "14px 24px",
                background: loading ? "var(--soil-border)" : "var(--soil-green)",
                color: loading ? "var(--soil-muted)" : "#fff",
                border: "none", borderRadius: 12, cursor: loading ? "not-allowed" : "pointer",
                fontSize: 15, fontWeight: 600, fontFamily: "var(--soil-sans)",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                transition: "all 0.2s",
                boxShadow: loading ? "none" : "0 4px 14px rgba(45,106,47,0.3)",
              }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.background = "var(--soil-green-mid)"; }}
              onMouseLeave={e => { if (!loading) e.currentTarget.style.background = "var(--soil-green)"; }}
            >
              {loading ? (
                <>
                  <Icon d={icons.spinner} size={18} style={{ animation: "soil-spin 1s linear infinite" }} />
                  Analyzing soil data…
                </>
              ) : (
                <>
                  <Icon d={icons.activity} size={18} />
                  Analyze Soil &amp; Get Recommendations
                </>
              )}
            </button>
          </div>
        </div>

        {/* ─── Results ────────────────────────────────────────────────────────── */}
        {results && (
          <div id="soil-results" style={{ animation: "soil-fadeUp 0.5s ease" }}>
            {/* Divider */}
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 28 }}>
              <div style={{ flex: 1, height: 1, background: "var(--soil-border)" }} />
              <span style={{
                fontSize: 12, fontFamily: "var(--soil-mono)", letterSpacing: "1px",
                color: "var(--soil-muted)", textTransform: "uppercase",
              }}>Analysis Results</span>
              <div style={{ flex: 1, height: 1, background: "var(--soil-border)" }} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(480px, 1fr))", gap: 24 }}>

              {/* Crop Recommendations */}
              {results.crop_recs?.length > 0 && (
                <SectionCard icon={icons.leaf} title="Top Crop Recommendations">
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {results.crop_recs.map((crop, i) => <CropCard key={i} crop={crop} />)}
                  </div>
                </SectionCard>
              )}

              {/* Nutrient Status */}
              {results.nutrient_status?.length > 0 && (
                <SectionCard icon={icons.chartBar} title="Nutrient Status">
                  <DataTable
                    columns={["Nutrient", "Value (kg/ha)", "Status", "Description"]}
                    rows={results.nutrient_status.map(n => [
                      <strong style={{ color: "var(--soil-ink)" }}>{n.nutrient}</strong>,
                      <span style={{ fontFamily: "var(--soil-mono)", fontSize: 13 }}>{n.value}</span>,
                      <Badge label={n.level?.toUpperCase()} level={n.level} />,
                      <span style={{ color: "var(--soil-muted)", fontSize: 12 }}>{n.label}</span>,
                    ])}
                  />
                </SectionCard>
              )}

              {/* Fertilizer Recommendations */}
              {results.fertilizer_recs?.length > 0 && (
                <SectionCard icon={icons.tractor} title="Fertilizer Recommendations">
                  {results.fertilizer_confidence && (
                    <div style={{ marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 12.5, color: "var(--soil-muted)" }}>Confidence:</span>
                      <Badge label={results.fertilizer_confidence} level="good" />
                    </div>
                  )}
                  <DataTable
                    columns={["Nutrient", "Fertilizer", "Dose (kg/ha)", "Severity"]}
                    rows={results.fertilizer_recs.map(f => [
                      <strong style={{ color: "var(--soil-ink)" }}>{f.nutrient}</strong>,
                      f.fertilizer,
                      <span style={{ fontFamily: "var(--soil-mono)", fontSize: 13 }}>{f.dose_kg_per_ha}</span>,
                      <Badge label={f.severity} level={f.severity} />,
                    ])}
                  />
                </SectionCard>
              )}

              {/* pH Analysis */}
              <SectionCard icon={icons.microscope} title="pH Analysis">
                <PHGauge phStatus={results.ph_status} ph={parseFloat(form.pH)} />
              </SectionCard>

              {/* Amendments */}
              {results.amendment_plan?.length > 0 && (
                <SectionCard icon={icons.droplet} title="Soil Amendment Plan">
                  {results.amendment_plan.map((a, i) => <AmendmentCard key={i} amendment={a} />)}
                </SectionCard>
              )}

              {/* Warnings */}
              <SectionCard icon={icons.alertTriangle} title="Warnings & Alerts">
                {!results.warnings?.length ? (
                  <div style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "16px 0",
                    color: "var(--soil-green)",
                  }}>
                    <Icon d={icons.checkCircle} size={20} />
                    <span style={{ fontSize: 14, fontWeight: 500 }}>No warnings — soil parameters look healthy!</span>
                  </div>
                ) : results.warnings.map((w, i) => (
                  <div key={i} style={{
                    display: "flex", gap: 10, alignItems: "flex-start",
                    background: "#fef9e0", border: "1px solid #f0d060",
                    borderLeft: "4px solid #BA7517",
                    borderRadius: 10, padding: "12px 14px", marginBottom: 10,
                    color: "#7a5010", fontSize: 13.5, lineHeight: 1.5,
                  }}>
                    <Icon d={icons.alertTriangle} size={16} style={{ flexShrink: 0, marginTop: 1, color: "#BA7517" }} />
                    <div>
                      <strong style={{ textTransform: "uppercase", fontSize: 11, letterSpacing: "0.5px", fontFamily: "var(--soil-mono)" }}>
                        {w.type}:
                      </strong>{" "}
                      {w.message}
                    </div>
                  </div>
                ))}
              </SectionCard>

            </div>
          </div>
        )}
      </main>

      <Toast msg={toast} />
    </div>
  );
};

export default SoilAnalysisPage;
