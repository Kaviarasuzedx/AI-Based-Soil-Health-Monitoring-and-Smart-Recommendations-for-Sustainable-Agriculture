// ChatPage.jsx - Fixed version with proper history loading
import React, { useState, useEffect, useRef, useCallback } from 'react';

const API_BASE = 'http://localhost:8080';

const api = {
  ask: (query, session_id) =>
    fetch(`${API_BASE}/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, session_id }),
    }).then(r => r.json()),

  getHistory: (session_id) =>
    fetch(`${API_BASE}/history/${session_id}`).then(r => r.json()),

  clearHistory: (session_id) =>
    fetch(`${API_BASE}/history/${session_id}`, { method: 'DELETE' }).then(r => r.json()),

  listSessions: () =>
    fetch(`${API_BASE}/sessions`).then(r => r.json()),

  listDocuments: () =>
    fetch(`${API_BASE}/documents`).then(r => r.json()),

  uploadPDF: (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return fetch(`${API_BASE}/upload`, { method: 'POST', body: fd }).then(r => r.json());
  },

  health: () =>
    fetch(`${API_BASE}/health`).then(r => r.json()),

  listAgriculturalData: () =>
    fetch(`${API_BASE}/agricultural/data`).then(r => r.json()),

  embedSelective: (analysisIds) =>
    fetch(`${API_BASE}/agricultural/embed-selective`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ analysis_ids: analysisIds }),
    }).then(r => r.json()),

  embedSingle: (analysisId) =>
    fetch(`${API_BASE}/agricultural/embed/${analysisId}`, { method: 'POST' }).then(r => r.json()),

  removeEmbedding: (analysisId) =>
    fetch(`${API_BASE}/agricultural/embed/${analysisId}`, { method: 'DELETE' }).then(r => r.json()),

  getEmbeddedIds: () =>
    fetch(`${API_BASE}/agricultural/embedded-ids`).then(r => r.json()),
  
  getEmbeddingStatus: () =>
    fetch(`${API_BASE}/agricultural/embedding-status`).then(r => r.json()),
};

// ─── Icon components ─────────────────────────────────────────────────────────
const Icon = ({ d, size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {Array.isArray(d) ? d.map((p, i) => <path key={i} d={p} />) : <path d={d} />}
  </svg>
);

const icons = {
  send: 'M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z',
  user: ['M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2', 'M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z'],
  trash: ['M3 6h18', 'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2'],
  db: ['M4 6a8 3 0 1 0 16 0 8 3 0 1 0-16 0', 'M4 6v6a8 3 0 0 0 16 0V6', 'M4 12v6a8 3 0 0 0 16 0v-6'],
  upload: ['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'M17 8l-5-5-5 5', 'M12 3v12'],
  file: ['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', 'M14 2v6h6'],
  leaf: 'M2 22s4-10 12-10 8 10 8 10M6 10C6 6 9 2 12 2c3 0 6 4 6 8',
  refresh: 'M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15',
  plus: 'M12 5v14M5 12h14',
  check: 'M20 6L9 17l-5-5',
  x: 'M18 6L6 18M6 6l12 12',
  history: ['M12 8v4l3 3', 'M3.05 11a9 9 0 1 1 .5 4'],
  database: 'M4 7c0 2.21 3.58 4 8 4s8-1.79 8-4M4 7v10c0 2.21 3.58 4 8 4s8-1.79 8-4V7M4 12c0 2.21 3.58 4 8 4s8-1.79 8-4',
  brain: 'M12 4a4 4 0 0 1 4 4c0 1.5-.8 2.8-2 3.5V14a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-2.5c-1.2-.7-2-2-2-3.5a4 4 0 0 1 4-4z',
  globe: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z',
  water: 'M12 2.69l.42.37c2.52 2.26 4.58 4.5 4.58 7.44 0 2.5-2 4.5-4.5 4.5s-4.5-2-4.5-4.5c0-2.94 2.06-5.18 4.58-7.44L12 2.69z',
};

// ─── Typing indicator ────────────────────────────────────────────────────────
const TypingDots = () => (
  <div style={{ display: 'flex', gap: 5, alignItems: 'center', padding: '4px 0' }}>
    {[0, 1, 2].map(i => (
      <div key={i} style={{
        width: 7, height: 7, borderRadius: '50%',
        background: 'var(--chat-green-accent)',
        animation: `chat-bounce 1.2s ${i * 0.2}s ease-in-out infinite`,
      }} />
    ))}
  </div>
);

// ─── Message bubble with source indicator ───────────────────────────────────
const MessageBubble = ({ msg, isLast }) => {
  const isUser = msg.role === 'user';
  const isWebSource = msg.source === 'web_search';
  
  return (
    <div style={{
      display: 'flex',
      flexDirection: isUser ? 'row-reverse' : 'row',
      gap: 12,
      alignItems: 'flex-start',
      animation: isLast ? 'chat-fadeUp 0.35s cubic-bezier(0.16,1,0.3,1)' : 'none',
    }}>
      <div style={{
        width: 34, height: 34, borderRadius: 10, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: isUser ? 'var(--chat-green)' : (isWebSource ? 'var(--chat-terra)' : 'var(--chat-green-light)'),
        color: isUser ? '#fff' : (isWebSource ? '#fff' : 'var(--chat-green)'),
        boxShadow: isUser ? '0 2px 8px rgba(45,106,47,0.25)' : 'none',
        border: isUser ? 'none' : (isWebSource ? 'none' : '1px solid var(--chat-green-border)'),
      }}>
        <Icon d={isUser ? icons.user : (isWebSource ? icons.globe : icons.leaf)} size={16} />
      </div>

      <div style={{ maxWidth: '72%', display: 'flex', flexDirection: 'column', gap: 6, alignItems: isUser ? 'flex-end' : 'flex-start' }}>
        <div style={{ fontSize: 11, fontFamily: 'var(--chat-mono)', color: 'var(--chat-muted)', letterSpacing: '0.8px', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span>{isUser ? 'YOU' : (isWebSource ? 'VEGANALYSE (WEB)' : 'VEGANALYSE (FIELD DATA)')}</span>
          {!isUser && msg.source && (
            <span style={{
              background: isWebSource ? 'var(--chat-terra-light)' : 'var(--chat-green-light)',
              color: isWebSource ? 'var(--chat-terra)' : 'var(--chat-green)',
              padding: '2px 8px',
              borderRadius: 12,
              fontSize: 9,
              fontWeight: 600,
            }}>
              {isWebSource ? '🌐 WEB SEARCH' : '📊 YOUR FIELDS'}
            </span>
          )}
          {msg.relevance_score !== undefined && !isUser && (
            <span style={{
              background: 'var(--chat-cream)',
              padding: '2px 8px',
              borderRadius: 12,
              fontSize: 9,
              color: 'var(--chat-muted)',
            }}>
              Relevance: {(msg.relevance_score * 100).toFixed(0)}%
            </span>
          )}
          {msg.timestamp && (
            <span style={{ marginLeft: 'auto', opacity: 0.6 }}>
              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>

        <div style={{
          background: isUser ? 'var(--chat-green)' : (isWebSource ? 'var(--chat-terra-light)' : 'var(--chat-white)'),
          color: isUser ? '#fff' : (isWebSource ? 'var(--chat-terra)' : 'var(--chat-ink)'),
          borderRadius: isUser ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
          padding: '13px 17px',
          fontSize: 14,
          lineHeight: 1.7,
          border: isUser ? 'none' : (isWebSource ? '1px solid var(--chat-terra-border)' : '1px solid var(--chat-border)'),
          boxShadow: isUser ? '0 2px 12px rgba(45,106,47,0.2)' : 'var(--chat-shadow-sm)',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}>
          {msg.content}
        </div>

        {!isUser && msg.retrieved_ids && msg.retrieved_ids.length > 0 && (
          <div style={{
            fontSize: 10,
            color: 'var(--chat-sage)',
            fontFamily: 'var(--chat-mono)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            flexWrap: 'wrap',
          }}>
            <span>📊 Based on field data IDs: {msg.retrieved_ids.join(', ')}</span>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Agricultural Data Viewer with checkboxes ─────────────────────────────────
const AgriculturalDataViewer = ({ data, embeddedIds, onEmbedSelected, onEmbedSingle, onRemoveEmbedding, loading, onRefresh }) => {
  const [expandedRow, setExpandedRow] = useState(null);
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [loadingIds, setLoadingIds] = useState(new Set());

  const handleSelectAll = () => {
    if (selectedRows.size === data.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(data.map(row => row.analysis_id)));
    }
  };

  const handleSelectRow = (analysisId) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(analysisId)) {
      newSelected.delete(analysisId);
    } else {
      newSelected.add(analysisId);
    }
    setSelectedRows(newSelected);
  };

  const handleEmbedSelected = async () => {
    if (selectedRows.size === 0) {
      alert('Please select records to embed');
      return;
    }
    await onEmbedSelected(Array.from(selectedRows));
    setSelectedRows(new Set());
  };

  const handleEmbedSingle = async (analysisId) => {
    setLoadingIds(prev => new Set(prev).add(analysisId));
    await onEmbedSingle(analysisId);
    setLoadingIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(analysisId);
      return newSet;
    });
  };

  const thStyle = {
    padding: '10px 12px',
    textAlign: 'left',
    fontSize: 11,
    fontFamily: 'var(--chat-mono)',
    color: 'var(--chat-muted)',
    letterSpacing: '0.8px',
    textTransform: 'uppercase',
    borderBottom: '1px solid var(--chat-border)',
    background: 'var(--chat-cream)',
    position: 'sticky',
    top: 0,
    zIndex: 10,
  };

  const tdStyle = {
    padding: '10px 12px',
    fontSize: 12.5,
    color: 'var(--chat-ink)',
    borderBottom: '1px solid var(--chat-border)',
    verticalAlign: 'middle',
  };

  const getHealthColor = (value) => {
    if (!value) return 'var(--chat-muted)';
    if (value >= 0.7) return 'var(--chat-green)';
    if (value >= 0.4) return 'var(--chat-amber)';
    return '#c0392b';
  };

  return (
    <div style={{
      background: 'var(--chat-white)',
      border: '1px solid var(--chat-border)',
      borderRadius: 14,
      overflow: 'hidden',
      boxShadow: 'var(--chat-shadow-md)',
    }}>
      <div style={{
        padding: '14px 18px',
        borderBottom: '1px solid var(--chat-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'var(--chat-ivory)',
        flexWrap: 'wrap',
        gap: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon d={icons.database} size={16} />
            <span style={{ fontFamily: 'var(--chat-mono)', fontSize: 12.5, fontWeight: 500, color: 'var(--chat-ink)' }}>
              Agricultural Field Data
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <span style={{
              background: 'var(--chat-green-light)',
              color: 'var(--chat-green)',
              borderRadius: 20,
              padding: '2px 10px',
              fontSize: 11,
              fontWeight: 500,
            }}>
              📊 Total: {data.length} fields
            </span>
            <span style={{
              background: embeddedIds.length > 0 ? 'var(--chat-green-light)' : 'var(--chat-amber-light)',
              color: embeddedIds.length > 0 ? 'var(--chat-green)' : 'var(--chat-amber)',
              borderRadius: 20,
              padding: '2px 10px',
              fontSize: 11,
              fontWeight: 500,
            }}>
              🧠 Embedded: {embeddedIds.length} fields
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleEmbedSelected}
            disabled={loading || selectedRows.size === 0}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: selectedRows.size > 0 ? 'var(--chat-green)' : 'var(--chat-border)',
              color: selectedRows.size > 0 ? '#fff' : 'var(--chat-muted)',
              border: 'none',
              borderRadius: 9,
              padding: '6px 16px',
              fontSize: 12,
              fontWeight: 600,
              cursor: selectedRows.size > 0 && !loading ? 'pointer' : 'not-allowed',
              opacity: loading ? 0.6 : 1,
            }}
          >
            <Icon d={icons.brain} size={14} />
            Embed Selected ({selectedRows.size})
          </button>
          <button
            onClick={onRefresh}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '5px 12px',
              background: 'transparent',
              border: '1px solid var(--chat-border)',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 12,
              color: 'var(--chat-muted)',
              transition: 'all 0.18s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--chat-green)'; e.currentTarget.style.color = 'var(--chat-green)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--chat-border)'; e.currentTarget.style.color = 'var(--chat-muted)'; }}
          >
            <Icon d={icons.refresh} size={13} /> Refresh
          </button>
        </div>
      </div>

      <div style={{ overflowX: 'auto', maxHeight: 400 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ position: 'sticky', top: 0, background: 'var(--chat-cream)' }}>
              <th style={{ ...thStyle, width: 35 }}>
                <input
                  type="checkbox"
                  checked={selectedRows.size === data.length && data.length > 0}
                  onChange={handleSelectAll}
                  style={{ cursor: 'pointer' }}
                />
              </th>
              <th style={thStyle}>ID</th>
              <th style={thStyle}>Location</th>
              <th style={thStyle}>Date</th>
              <th style={thStyle}>NDVI</th>
              <th style={thStyle}>Soil Health</th>
              <th style={thStyle}>Moisture</th>
              <th style={thStyle}>Yield Potential</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Action</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ ...tdStyle, textAlign: 'center', color: 'var(--chat-muted)', padding: '60px' }}>
                  <Icon d={icons.db} size={32} />
                  <div style={{ marginTop: 12 }}>No agricultural data found in NeonDB</div>
                  <div style={{ fontSize: 11, marginTop: 6 }}>Add data to start analyzing your fields</div>
                </td>
              </tr>
            ) : data.map(row => {
              const isEmbedded = embeddedIds.includes(row.analysis_id);
              return (
                <React.Fragment key={row.id}>
                  <tr
                    onClick={() => setExpandedRow(expandedRow === row.id ? null : row.id)}
                    style={{
                      cursor: 'pointer',
                      transition: 'background 0.15s',
                      background: expandedRow === row.id ? 'var(--chat-green-pale)' : '',
                    }}
                    onMouseEnter={e => { if (expandedRow !== row.id) e.currentTarget.style.background = 'var(--chat-green-pale)'; }}
                    onMouseLeave={e => { if (expandedRow !== row.id) e.currentTarget.style.background = ''; }}
                  >
                    <td style={tdStyle} onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedRows.has(row.analysis_id)}
                        onChange={() => handleSelectRow(row.analysis_id)}
                        style={{ cursor: 'pointer' }}
                      />
                    </td>
                    <td style={{ ...tdStyle, fontFamily: 'var(--chat-mono)', fontSize: 11 }}>
                      #{row.analysis_id}
                    </td>
                    <td style={{ ...tdStyle, fontWeight: 500 }}>
                      {row.place_name || '—'}
                    </td>
                    <td style={{ ...tdStyle, fontFamily: 'var(--chat-mono)', fontSize: 11, color: 'var(--chat-muted)' }}>
                      {row.datetime ? new Date(row.datetime).toLocaleDateString() : '—'}
                    </td>
                    <td style={tdStyle}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        background: row.mean_ndvi >= 0.3 ? 'var(--chat-green-light)' : 'var(--chat-amber-light)',
                        padding: '3px 10px',
                        borderRadius: 20,
                        fontSize: 12,
                        fontWeight: 500,
                        color: row.mean_ndvi >= 0.3 ? 'var(--chat-green)' : 'var(--chat-amber)',
                      }}>
                        {row.mean_ndvi?.toFixed(3) || '—'}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <span style={{
                        color: getHealthColor(row.soil_health_score / 100),
                        fontWeight: 500,
                      }}>
                        {row.soil_health_score?.toFixed(0) || '—'}%
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <span style={{
                        color: getHealthColor(row.moisture_index),
                        fontWeight: 500,
                      }}>
                        {row.moisture_index?.toFixed(2) || '—'}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      {row.yield_potential?.toFixed(1) || '—'} t/ha
                    </td>
                    <td style={tdStyle}>
                      {isEmbedded ? (
                        <span style={{
                          background: 'var(--chat-green-light)',
                          color: 'var(--chat-green)',
                          padding: '3px 8px',
                          borderRadius: 20,
                          fontSize: 10,
                          fontWeight: 500,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                        }}>
                          <Icon d={icons.check} size={10} /> Embedded
                        </span>
                      ) : (
                        <span style={{
                          background: 'var(--chat-cream)',
                          color: 'var(--chat-muted)',
                          padding: '3px 8px',
                          borderRadius: 20,
                          fontSize: 10,
                        }}>
                          Not embedded
                        </span>
                      )}
                    </td>
                    <td style={tdStyle} onClick={(e) => e.stopPropagation()}>
                      {!isEmbedded ? (
                        <button
                          onClick={() => handleEmbedSingle(row.analysis_id)}
                          disabled={loadingIds.has(row.analysis_id)}
                          style={{
                            background: 'var(--chat-green)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 6,
                            padding: '4px 12px',
                            fontSize: 11,
                            cursor: loadingIds.has(row.analysis_id) ? 'not-allowed' : 'pointer',
                            opacity: loadingIds.has(row.analysis_id) ? 0.6 : 1,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          <Icon d={icons.brain} size={11} />
                          {loadingIds.has(row.analysis_id) ? '...' : 'Embed'}
                        </button>
                      ) : (
                        <button
                          onClick={() => onRemoveEmbedding(row.analysis_id)}
                          style={{
                            background: 'transparent',
                            border: '1px solid var(--chat-border)',
                            borderRadius: 6,
                            padding: '4px 10px',
                            fontSize: 11,
                            cursor: 'pointer',
                            color: 'var(--chat-muted)',
                            transition: 'all 0.15s',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = '#c0392b'; e.currentTarget.style.color = '#c0392b'; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--chat-border)'; e.currentTarget.style.color = 'var(--chat-muted)'; }}
                        >
                          <Icon d={icons.trash} size={11} /> Remove
                        </button>
                      )}
                    </td>
                  </tr>
                  {expandedRow === row.id && (
                    <tr>
                      <td colSpan={10} style={{ padding: '16px 20px', background: 'var(--chat-green-pale)', borderBottom: '1px solid var(--chat-green-border)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                          <div>
                            <div style={{ fontFamily: 'var(--chat-mono)', fontSize: 10, color: 'var(--chat-muted)', marginBottom: 8 }}>🌿 VEGETATION HEALTH</div>
                            <div style={{ fontSize: 12, lineHeight: 1.8 }}>
                              <div><strong>NDVI:</strong> {row.mean_ndvi?.toFixed(4)} (σ: {row.std_ndvi?.toFixed(4)})</div>
                              <div><strong>SAVI:</strong> {row.mean_savi?.toFixed(4)}</div>
                              <div><strong>EVI:</strong> {row.mean_evi?.toFixed(4)}</div>
                              <div><strong>GNDVI:</strong> {row.mean_gndvi?.toFixed(4)}</div>
                            </div>
                          </div>
                          <div>
                            <div style={{ fontFamily: 'var(--chat-mono)', fontSize: 10, color: 'var(--chat-muted)', marginBottom: 8 }}>🌱 SOIL HEALTH</div>
                            <div style={{ fontSize: 12, lineHeight: 1.8 }}>
                              <div><strong>Health Score:</strong> {row.soil_health_score?.toFixed(1)}%</div>
                              <div><strong>Moisture Index:</strong> {row.moisture_index?.toFixed(3)}</div>
                              <div><strong>Organic Matter:</strong> {row.organic_matter?.toFixed(2)}%</div>
                              <div><strong>pH Level:</strong> {row.ph_level?.toFixed(1)}</div>
                              <div><strong>Texture Score:</strong> {row.texture_score?.toFixed(2)}</div>
                            </div>
                          </div>
                          <div>
                            <div style={{ fontFamily: 'var(--chat-mono)', fontSize: 10, color: 'var(--chat-muted)', marginBottom: 8 }}>🌾 CROP HEALTH</div>
                            <div style={{ fontSize: 12, lineHeight: 1.8 }}>
                              <div><strong>Crop Health:</strong> {row.crop_health_score?.toFixed(1)}%</div>
                              <div><strong>Vigor Index:</strong> {row.vigor_index?.toFixed(3)}</div>
                              <div><strong>Stress Level:</strong> {row.stress_level?.toFixed(3)}</div>
                              <div><strong>Chlorophyll:</strong> {row.chlorophyll_content?.toFixed(2)} µg/cm²</div>
                              <div><strong>Yield Potential:</strong> {row.yield_potential?.toFixed(2)} t/ha</div>
                            </div>
                          </div>
                          <div>
                            <div style={{ fontFamily: 'var(--chat-mono)', fontSize: 10, color: 'var(--chat-muted)', marginBottom: 8 }}>💡 AI RECOMMENDATION</div>
                            <div style={{ fontSize: 12, lineHeight: 1.6, background: 'var(--chat-white)', padding: 8, borderRadius: 8 }}>
                              {row.moisture_index < 0.3 ? (
                                <span style={{ color: '#c0392b' }}>⚠️ <strong>Low moisture detected!</strong> Immediate irrigation recommended. Consider drip irrigation to improve water efficiency.</span>
                              ) : row.moisture_index < 0.5 ? (
                                <span style={{ color: 'var(--chat-amber)' }}>💧 <strong>Moderate moisture levels.</strong> Schedule irrigation soon. Monitor soil moisture daily.</span>
                              ) : row.vigor_index < 0.4 ? (
                                <span style={{ color: 'var(--chat-amber)' }}>🌿 <strong>Poor crop vigor.</strong> Check nutrient levels and consider organic fertilizer application.</span>
                              ) : (
                                <span style={{ color: 'var(--chat-green)' }}>✅ <strong>Good crop health!</strong> Continue current management practices. Monitor regularly.</span>
                              )}
                            </div>
                          </div>
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
    </div>
  );
};

// ─── Session list item ───────────────────────────────────────────────────────
const SessionItem = ({ session, isActive, onClick, onDelete }) => (
  <div
    onClick={onClick}
    style={{
      padding: '10px 14px', borderRadius: 10, cursor: 'pointer',
      background: isActive ? 'var(--chat-green-light)' : 'transparent',
      border: isActive ? '1px solid var(--chat-green-border)' : '1px solid transparent',
      transition: 'all 0.18s',
      display: 'flex', alignItems: 'center', gap: 10,
    }}
    onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--chat-cream)'; }}
    onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
  >
    <div style={{ color: isActive ? 'var(--chat-green)' : 'var(--chat-muted)', flexShrink: 0 }}>
      <Icon d={icons.history} size={15} />
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 12, fontWeight: 500, color: isActive ? 'var(--chat-green)' : 'var(--chat-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {session.session_id?.slice(0, 22) || 'Unknown'}…
      </div>
      <div style={{ fontSize: 10.5, color: 'var(--chat-muted)', fontFamily: 'var(--chat-mono)', marginTop: 2 }}>
        {session.message_count || 0} messages • {session.created_at ? new Date(session.created_at).toLocaleDateString() : 'New'}
      </div>
    </div>
    <button
      onClick={e => { e.stopPropagation(); onDelete(session.session_id); }}
      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--chat-muted)', padding: 4, borderRadius: 6, display: 'flex', alignItems: 'center', opacity: 0, transition: 'opacity 0.15s' }}
      onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = '#c0392b'; }}
      onMouseLeave={e => { e.currentTarget.style.opacity = '0'; e.currentTarget.style.color = 'var(--chat-muted)'; }}
    >
      <Icon d={icons.trash} size={13} />
    </button>
  </div>
);

// ─── Main ChatPage ───────────────────────────────────────────────────────────
const ChatPage = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [sidebarTab, setSidebarTab] = useState('history');
  const [healthStatus, setHealthStatus] = useState(null);
  const [showDataPanel, setShowDataPanel] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);
  
  const [agriculturalData, setAgriculturalData] = useState([]);
  const [loadingAgriData, setLoadingAgriData] = useState(false);
  const [embeddingLoading, setEmbeddingLoading] = useState(false);
  const [embeddedIds, setEmbeddedIds] = useState([]);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const chatScrollRef = useRef(null);

  const toast = (msg, type = 'success') => {
    setToastMsg({ msg, type });
    setTimeout(() => setToastMsg(null), 3000);
  };

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.documentElement.style.height = '100%';
    document.body.style.overflow = 'hidden';
    document.body.style.height = '100%';
    return () => {
      document.documentElement.style.overflow = prev;
      document.body.style.overflow = prev;
    };
  }, []);

  const prevMessageCountRef = useRef(0);
  useEffect(() => {
    const container = chatScrollRef.current;
    if (!container) return;
    const isNewMessage = messages.length > prevMessageCountRef.current;
    prevMessageCountRef.current = messages.length;
    if (isNewMessage) {
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  // Load initial data
  useEffect(() => {
    loadSessions();
    loadDocuments();
    loadHealth();
    loadAgriculturalData();
    loadEmbeddedIds();
  }, []);

  // Auto-load last session or create new one
  useEffect(() => {
    const loadLastSession = async () => {
      if (sessions.length > 0 && !sessionId) {
        // Load the most recent session
        const lastSession = sessions[0];
        await loadSession(lastSession.session_id);
      } else if (sessions.length === 0 && !sessionId) {
        // Create new session if none exist
        const newSessionId = `session_${Date.now()}`;
        setSessionId(newSessionId);
      }
    };
    loadLastSession();
  }, [sessions]);

  const loadHealth = async () => {
    try { 
      const data = await api.health();
      setHealthStatus(data);
    } catch { 
      console.error('Health check failed');
    }
  };

  const loadSessions = async () => {
    try {
      const data = await api.listSessions();
      console.log('Loaded sessions:', data);
      setSessions(data.sessions || []);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    }
  };

  const loadDocuments = async () => {
    try {
      const data = await api.listDocuments();
      setDocuments(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load documents:', error);
    }
  };

  const loadAgriculturalData = async () => {
    setLoadingAgriData(true);
    try {
      const data = await api.listAgriculturalData();
      setAgriculturalData(data.data || []);
      toast(`📊 Loaded ${data.data?.length || 0} field records from database`);
    } catch (err) {
      console.error('Failed to load agricultural data:', err);
      toast('Failed to load field data', 'error');
    } finally {
      setLoadingAgriData(false);
    }
  };

  const loadEmbeddedIds = async () => {
    try {
      const data = await api.getEmbeddedIds();
      setEmbeddedIds(data.embedded_ids || []);
    } catch (error) {
      console.error('Failed to load embedded IDs:', error);
    }
  };

  const embedSelectedRecords = async (analysisIds) => {
    setEmbeddingLoading(true);
    try {
      const result = await api.embedSelective(analysisIds);
      toast(result.message || `✅ Embedded ${analysisIds.length} records`);
      await loadEmbeddedIds();
      await loadAgriculturalData();
    } catch (error) {
      toast('Failed to embed records', 'error');
    } finally {
      setEmbeddingLoading(false);
    }
  };

  const embedSingleRecord = async (analysisId) => {
    try {
      const result = await api.embedSingle(analysisId);
      toast(result.message || `✅ Record ${analysisId} embedded`);
      await loadEmbeddedIds();
      await loadAgriculturalData();
    } catch (error) {
      toast('Failed to embed record', 'error');
    }
  };

  const removeEmbedding = async (analysisId) => {
    try {
      await api.removeEmbedding(analysisId);
      toast(`🗑️ Record ${analysisId} removed from AI memory`);
      await loadEmbeddedIds();
      await loadAgriculturalData();
    } catch (error) {
      toast('Failed to remove embedding', 'error');
    }
  };

  const loadSession = async (sid) => {
    setLoadingHistory(true);
    try {
      const data = await api.getHistory(sid);
      console.log('Loaded history data:', data);
      
      // Handle the response format from your backend
      let formattedMessages = [];
      
      if (data.messages && Array.isArray(data.messages)) {
        formattedMessages = data.messages.map(msg => ({
          role: msg.role,
          content: msg.content,
          source: msg.source,
          relevance_score: msg.relevance_score,
          retrieved_ids: msg.retrieved_ids,
          timestamp: msg.timestamp || msg.created_at
        }));
      }
      
      setMessages(formattedMessages);
      setSessionId(sid);
      toast(`Loaded session: ${sid.slice(0, 16)}... (${formattedMessages.length} messages)`);
    } catch (error) { 
      console.error('Failed to load session:', error);
      toast('Failed to load session', 'error'); 
      // If loading fails, create a new session
      const newSessionId = `session_${Date.now()}`;
      setSessionId(newSessionId);
      setMessages([]);
    } finally { 
      setLoadingHistory(false); 
    }
  };

  const deleteSession = async (sid) => {
    try {
      await api.clearHistory(sid);
      if (sid === sessionId) { 
        setMessages([]); 
        const newSessionId = `session_${Date.now()}`;
        setSessionId(newSessionId);
      }
      await loadSessions();
      toast('Session cleared');
    } catch (error) { 
      console.error('Failed to clear session:', error);
      toast('Failed to clear session', 'error'); 
    }
  };

  const newSession = async () => {
    const newSessionId = `session_${Date.now()}`;
    setSessionId(newSessionId);
    setMessages([]);
    await loadSessions(); // Refresh session list
    toast('New session started');
  };

  const sendMessage = async () => {
    const q = input.trim();
    if (!q || loading || !sessionId) return;
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.focus();
    }

    const userMsg = { 
      role: 'user', 
      content: q, 
      timestamp: new Date().toISOString() 
    };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const data = await api.ask(q, sessionId);
      console.log('API response:', data);
      
      const botMsg = {
        role: 'assistant',
        content: data.answer || data.detail || 'No response received.',
        source: data.source || 'database',
        relevance_score: data.relevance_score,
        retrieved_ids: data.retrieved_ids || [],
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, botMsg]);
      await loadSessions(); // Refresh session list to show updated message count
    } catch (error) {
      console.error('API Error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '⚠️ Unable to reach the API server. Please check that the backend is running.',
        source: 'error',
        timestamp: new Date().toISOString(),
      }]);
    } finally { 
      setLoading(false); 
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { 
      e.preventDefault(); 
      sendMessage(); 
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await api.uploadPDF(file);
      toast(`📄 Uploaded ${file.name} · ${res.chunks_created || 0} chunks embedded`);
      await loadDocuments();
    } catch (error) { 
      console.error('Upload failed:', error);
      toast('Upload failed', 'error'); 
    } finally { 
      setUploading(false); 
      e.target.value = ''; 
    }
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 140) + 'px';
  };

  const suggestedQueries = [
    'How can I reduce water scarcity in my fields?',
    'Which fields have the lowest moisture levels and need irrigation?',
    'What irrigation methods work best for areas with low NDVI?',
    'Show me fields with soil health below 60%',
  ];

  return (
    <div className="chat-page" style={{ fontFamily: 'var(--chat-sans)', height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--chat-ivory)', overflow: 'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&family=DM+Mono:wght@400;500&display=swap');
        .chat-page *, .chat-page *::before, .chat-page *::after { box-sizing: border-box; }
        .chat-page {
          --chat-ivory: #FAFAF7;
          --chat-cream: #F3F1EA;
          --chat-white: #FFFFFF;
          --chat-green: #2D6A2F;
          --chat-green-mid: #3B7D3E;
          --chat-green-light: #EAF3DE;
          --chat-green-pale: #F2F8EC;
          --chat-green-accent: #4E9A52;
          --chat-green-border: #B8D4B9;
          --chat-sage: #7A9E7E;
          --chat-terra: #A8622A;
          --chat-terra-light: #F5E6D3;
          --chat-terra-border: #DEC4A8;
          --chat-amber: #BA7517;
          --chat-amber-light: #FDF3E0;
          --chat-ink: #1A2B1B;
          --chat-body: #4A5E4B;
          --chat-muted: #7A8E7B;
          --chat-hint: #A8BCAA;
          --chat-border: #DDE8DC;
          --chat-border-strong: #B8CEB9;
          --chat-serif: 'Playfair Display', Georgia, serif;
          --chat-sans: 'DM Sans', sans-serif;
          --chat-mono: 'DM Mono', monospace;
          --chat-shadow-sm: 0 1px 3px rgba(26,43,27,0.06), 0 1px 2px rgba(26,43,27,0.04);
          --chat-shadow-md: 0 4px 16px rgba(26,43,27,0.08), 0 2px 6px rgba(26,43,27,0.05);
        }
        @keyframes chat-bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-5px); }
        }
        @keyframes chat-fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes chat-slideIn {
          from { opacity: 0; transform: translateX(-10px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes chat-toastIn {
          from { opacity: 0; transform: translateY(16px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .chat-page .chat-input:focus { outline: none; }
        .chat-page .chat-input::placeholder { color: var(--chat-hint); }
        .chat-page ::-webkit-scrollbar { width: 5px; height: 5px; }
        .chat-page ::-webkit-scrollbar-track { background: transparent; }
        .chat-page ::-webkit-scrollbar-thumb { background: var(--chat-border-strong); border-radius: 4px; }
        .chat-page ::-webkit-scrollbar-thumb:hover { background: var(--chat-sage); }
      `}</style>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Sidebar */}
        <div style={{
          width: sidebarOpen ? 280 : 0, flexShrink: 0,
          borderRight: sidebarOpen ? '1px solid var(--chat-border)' : 'none',
          background: 'var(--chat-white)', overflow: 'hidden',
          transition: 'width 0.28s cubic-bezier(0.16,1,0.3,1)',
          display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid var(--chat-border)', flexShrink: 0 }}>
            <div style={{ display: 'flex', gap: 4, background: 'var(--chat-cream)', borderRadius: 10, padding: 3 }}>
              {[['history', 'Chat History', icons.history], ['upload', 'Documents', icons.upload]].map(([id, label, icon]) => (
                <button key={id} onClick={() => setSidebarTab(id)} style={{
                  flex: 1, padding: '7px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: sidebarTab === id ? 'var(--chat-white)' : 'transparent',
                  color: sidebarTab === id ? 'var(--chat-green)' : 'var(--chat-muted)',
                  fontSize: 11.5, fontWeight: sidebarTab === id ? 600 : 400,
                  transition: 'all 0.18s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                }}>
                  <Icon d={icon} size={13} /> {label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '10px 10px' }}>
            {sidebarTab === 'history' ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 4px 10px', marginBottom: 4 }}>
                  <span style={{ fontSize: 10, fontFamily: 'var(--chat-mono)', color: 'var(--chat-muted)', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                    {sessions.length} sessions
                  </span>
                  <button onClick={loadSessions} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--chat-muted)', padding: 3, borderRadius: 5, display: 'flex' }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--chat-green)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--chat-muted)'}
                  >
                    <Icon d={icons.refresh} size={13} />
                  </button>
                </div>
                {sessions.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--chat-muted)', fontSize: 13 }}>
                    <Icon d={icons.history} size={28} />
                    <div style={{ marginTop: 10 }}>No sessions yet</div>
                    <div style={{ fontSize: 11, marginTop: 6 }}>Start a conversation to save history to NeonDB</div>
                  </div>
                ) : sessions.map(s => (
                  <SessionItem key={s.session_id} session={s}
                    isActive={s.session_id === sessionId}
                    onClick={() => loadSession(s.session_id)}
                    onDelete={deleteSession} />
                ))}
              </>
            ) : (
              <div style={{ animation: 'chat-slideIn 0.25s ease' }}>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: '2px dashed var(--chat-green-border)', borderRadius: 12, padding: '24px 16px',
                    textAlign: 'center', cursor: 'pointer', background: 'var(--chat-green-pale)',
                    transition: 'all 0.18s', marginBottom: 14,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--chat-green)'; e.currentTarget.style.background = 'var(--chat-green-light)'; }}
                >
                  <input ref={fileInputRef} type="file" accept=".pdf" onChange={handleUpload} style={{ display: 'none' }} />
                  <div style={{ color: 'var(--chat-green)', marginBottom: 8 }}><Icon d={icons.upload} size={24} /></div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--chat-green)', marginBottom: 4 }}>
                    {uploading ? 'Uploading…' : 'Upload PDF Document'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--chat-muted)' }}>Add agricultural guides or research papers</div>
                </div>

                <div style={{ fontSize: 10, fontFamily: 'var(--chat-mono)', color: 'var(--chat-muted)', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: 8, padding: '0 4px' }}>
                  {documents.length} embedded documents
                </div>
                {documents.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px', color: 'var(--chat-muted)', fontSize: 12 }}>
                    No documents yet. Upload a PDF to get started.
                  </div>
                ) : documents.map((doc, idx) => (
                  <div key={idx} style={{
                    display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px',
                    borderRadius: 8, border: '1px solid var(--chat-border)', marginBottom: 6,
                    background: 'var(--chat-white)',
                  }}>
                    <div style={{ color: 'var(--chat-terra)', flexShrink: 0 }}><Icon d={icons.file} size={14} /></div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11.5, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.filename}</div>
                      <div style={{ fontSize: 10, color: 'var(--chat-muted)' }}>{doc.chunks || 1} chunks</div>
                    </div>
                    <span style={{ fontSize: 9, background: 'var(--chat-green-light)', color: 'var(--chat-green)', borderRadius: 20, padding: '2px 8px' }}>
                      ✓ RAG
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Main Area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
          {/* Top Bar */}
          <div style={{
            padding: '8px 20px', background: 'var(--chat-white)', borderBottom: '1px solid var(--chat-border)',
            display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, flexWrap: 'nowrap', minHeight: 58,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 8, height: 8, background: 'var(--chat-green-accent)', borderRadius: '50%', boxShadow: '0 0 0 2px rgba(78,154,82,0.2)' }} />
              <span style={{ fontFamily: 'var(--chat-mono)', fontSize: 11, color: 'var(--chat-muted)' }}>Session:</span>
              <span style={{ fontFamily: 'var(--chat-mono)', fontSize: 11, color: 'var(--chat-ink)', fontWeight: 500 }}>{sessionId?.slice(0, 24) || 'Loading...'}…</span>
            </div>
            
            {healthStatus && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6, background: 'var(--chat-green-light)',
                border: '1px solid var(--chat-green-border)', borderRadius: 20, padding: '3px 12px',
              }}>
                <div style={{ width: 6, height: 6, background: 'var(--chat-green-accent)', borderRadius: '50%', animation: 'chat-bounce 2s infinite' }} />
                <span style={{ fontSize: 11, fontFamily: 'var(--chat-mono)', color: 'var(--chat-green)' }}>
                  {embeddedIds.length} fields embedded
                </span>
              </div>
            )}

            <div style={{ flex: 1 }} />
            
            <button onClick={() => setSidebarOpen(p => !p)} style={{
              background: 'transparent', border: '1px solid var(--chat-border)', borderRadius: 8,
              padding: '5px 10px', cursor: 'pointer', color: 'var(--chat-muted)',
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
            
            <button onClick={() => { loadAgriculturalData(); loadEmbeddedIds(); }} style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '4px 12px',
              background: 'transparent', border: '1px solid var(--chat-border)', borderRadius: 8,
              cursor: 'pointer', fontSize: 11.5, color: 'var(--chat-muted)',
            }}>
              <Icon d={icons.refresh} size={12} /> Refresh
            </button>
            
            <button onClick={() => setShowDataPanel(p => !p)} style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '4px 12px',
              background: showDataPanel ? 'var(--chat-green-light)' : 'transparent',
              border: '1px solid ' + (showDataPanel ? 'var(--chat-green-border)' : 'var(--chat-border)'),
              borderRadius: 8, cursor: 'pointer', fontSize: 11.5,
              color: showDataPanel ? 'var(--chat-green)' : 'var(--chat-muted)',
            }}>
              <Icon d={icons.database} size={12} /> Field Data
            </button>
            
            {messages.length > 0 && (
              <button onClick={() => deleteSession(sessionId)} style={{
                display: 'flex', alignItems: 'center', gap: 5, padding: '4px 12px',
                background: 'transparent', border: '1px solid var(--chat-border)', borderRadius: 8,
                cursor: 'pointer', fontSize: 11.5, color: 'var(--chat-muted)',
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#c0392b'; e.currentTarget.style.color = '#c0392b'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--chat-border)'; e.currentTarget.style.color = 'var(--chat-muted)'; }}
              >
                <Icon d={icons.trash} size={11} /> Clear
              </button>
            )}
            
            <button onClick={newSession} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'var(--chat-green)', color: '#fff', border: 'none',
              borderRadius: 8, padding: '5px 14px', fontSize: 12, fontWeight: 600,
              cursor: 'pointer',
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--chat-green-mid)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--chat-green)'}
            >
              <Icon d={icons.plus} size={12} /> New Chat
            </button>
          </div>

          {/* Agricultural Data Panel */}
          {showDataPanel && (
            <div style={{ padding: '14px 20px', background: 'var(--chat-ivory)', borderBottom: '1px solid var(--chat-border)', flexShrink: 0, maxHeight: '320px', overflowY: 'auto', animation: 'chat-fadeUp 0.25s ease' }}>
              {loadingAgriData ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
                  <TypingDots />
                  <span style={{ marginLeft: 12, color: 'var(--chat-muted)' }}>Loading field data from NeonDB...</span>
                </div>
              ) : (
                <AgriculturalDataViewer
                  data={agriculturalData}
                  embeddedIds={embeddedIds}
                  onEmbedSelected={embedSelectedRecords}
                  onEmbedSingle={embedSingleRecord}
                  onRemoveEmbedding={removeEmbedding}
                  onRefresh={() => { loadAgriculturalData(); loadEmbeddedIds(); }}
                  loading={embeddingLoading}
                />
              )}
            </div>
          )}

          {/* Messages Area */}
          <div
            ref={chatScrollRef}
            onWheel={e => e.stopPropagation()}
            style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '24px 24px 12px' }}
          >
            {loadingHistory ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12, color: 'var(--chat-muted)' }}>
                <TypingDots /> <span>Loading history from NeonDB...</span>
              </div>
            ) : messages.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 20 }}>
                <div style={{ width: 70, height: 70, background: 'var(--chat-green-light)', borderRadius: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--chat-green-border)' }}>
                  <Icon d={icons.water} size={32} />
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--chat-serif)', fontSize: 26, fontWeight: 700, color: 'var(--chat-ink)', marginBottom: 8 }}>
                    Smart Agriculture Assistant
                  </div>
                  <div style={{ color: 'var(--chat-muted)', fontSize: 14, maxWidth: 420, lineHeight: 1.6 }}>
                    1️⃣ Select fields from the table above<br/>
                    2️⃣ Click "Embed" to load field data into AI memory<br/>
                    3️⃣ Ask questions about water management and crop health
                  </div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', maxWidth: 560 }}>
                  {suggestedQueries.map((q, i) => (
                    <button key={i}
                      onClick={() => { setInput(q); textareaRef.current?.focus(); }}
                      style={{
                        background: 'var(--chat-white)', border: '1px solid var(--chat-border)', borderRadius: 20,
                        padding: '8px 16px', fontSize: 12.5, color: 'var(--chat-body)', cursor: 'pointer',
                        transition: 'all 0.18s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--chat-green)'; e.currentTarget.style.color = 'var(--chat-green)'; e.currentTarget.style.background = 'var(--chat-green-pale)'; }}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 800, margin: '0 auto' }}>
                {messages.map((msg, i) => (
                  <MessageBubble key={i} msg={msg} isLast={i === messages.length - 1} />
                ))}
                {loading && (
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', animation: 'chat-fadeUp 0.3s ease' }}>
                    <div style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--chat-green-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--chat-green)', border: '1px solid var(--chat-green-border)' }}>
                      <Icon d={icons.leaf} size={16} />
                    </div>
                    <div style={{ background: 'var(--chat-white)', border: '1px solid var(--chat-border)', borderRadius: '4px 16px 16px 16px', padding: '13px 17px' }}>
                      <TypingDots />
                      <span style={{ fontSize: 11, marginLeft: 8, color: 'var(--chat-muted)' }}>Analyzing your field data...</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input Area */}
          <div style={{ padding: '12px 24px 65px', background: 'var(--chat-white)', borderTop: '1px solid var(--chat-border)', flexShrink: 0 }}>
            <div style={{ maxWidth: 800, margin: '0 auto' }}>
              <div style={{
                display: 'flex', gap: 10, alignItems: 'flex-end',
                background: 'var(--chat-ivory)', border: '1.5px solid var(--chat-border)',
                borderRadius: 16, padding: '10px 10px 10px 16px',
              }}>
                <textarea
                  ref={textareaRef}
                  className="chat-input"
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about water management, irrigation, or crop health... (Enter to send)"
                  rows={1}
                  style={{
                    flex: 1, background: 'transparent', border: 'none', resize: 'none',
                    fontFamily: 'var(--chat-sans)', fontSize: 14, color: 'var(--chat-ink)', lineHeight: 1.5,
                    maxHeight: 120, overflowY: 'auto', padding: '10px 0',
                  }}
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || loading}
                  style={{
                    width: 42, height: 42, borderRadius: 12, border: 'none', cursor: 'pointer',
                    background: input.trim() && !loading ? 'var(--chat-green)' : 'var(--chat-border)',
                    color: input.trim() && !loading ? '#fff' : 'var(--chat-muted)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.18s',
                  }}
                >
                  <Icon d={icons.send} size={18} />
                </button>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, padding: '0 4px' }}>
                <span style={{ fontSize: 10, color: 'var(--chat-hint)' }}>
                  💡 Ask about fields you've embedded
                </span>
                <span style={{ fontSize: 10, color: 'var(--chat-hint)' }}>
                  Shift+Enter for new line • Sessions saved to NeonDB
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {toastMsg && (
        <div style={{
          position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
          background: toastMsg.type === 'error' ? '#c0392b' : 'var(--chat-ink)',
          color: '#fff', borderRadius: 12, padding: '10px 20px', fontSize: 13,
          fontWeight: 500, boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
          animation: 'chat-toastIn 0.3s cubic-bezier(0.16,1,0.3,1)',
          zIndex: 9999, display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <Icon d={toastMsg.type === 'error' ? icons.x : icons.check} size={14} />
          {toastMsg.msg}
        </div>
      )}
    </div>
  );
};

export default ChatPage;