import React, { useState, useEffect, useRef } from 'react';


const VegAnalyseApp = () => {
  const [openFaqIndex, setOpenFaqIndex] = useState(null);
  const [activeVisualTab, setActiveVisualTab] = useState('Stats');

  // Intersection Observer for reveal animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08 }
    );

    const revealElements = document.querySelectorAll('.reveal');
    revealElements.forEach((el) => observer.observe(el));

    // Trigger hero animations
    const timer = setTimeout(() => {
      const heroReveals = document.querySelectorAll('.hero .reveal');
      heroReveals.forEach((el, i) => {
        setTimeout(() => el.classList.add('in'), i * 110 + 100);
      });
    }, 80);

    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, []);

  const toggleFaq = (index) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  return (
    <div className="app-container">
      {/* HERO */}
      <section className="hero">
        <div className="hero-bg-grid"></div>
        <div className="hero-bg-fade"></div>

        <div className="hero-left">
          <div className="hero-eyebrow reveal">
            <div className="live-dot"></div>
            Sentinel-2 · Earth Engine · Real-time
          </div>
          <h1 className="hero-title reveal reveal-d1">
            Read the Earth
            <span className="em">From Above.</span>
          </h1>
          <p className="hero-sub reveal reveal-d2">
            Draw any region on the map. Receive satellite-derived vegetation indices, soil health scores, and crop vitality analysis — powered by Google Earth Engine.
          </p>
          <div className="hero-btns reveal reveal-d3">
            <button className="btn-primary">
              <i className="ti ti-map-pin" style={{ fontSize: '16px' }} aria-hidden="true"></i>
              Start Analysis
            </button>
            <button className="btn-secondary">
              <i className="ti ti-player-play" style={{ fontSize: '16px' }} aria-hidden="true"></i>
              Watch demo
            </button>
          </div>
          <div className="hero-trust reveal reveal-d4">
            <div className="trust-avatars">
              <div className="trust-av">RK</div>
              <div className="trust-av">AM</div>
              <div className="trust-av">PS</div>
              <div className="trust-av">DL</div>
            </div>
            <div className="trust-text">
              <strong>240+ agronomists</strong> use VegAnalyse weekly
            </div>
          </div>
        </div>

        <div className="hero-right reveal reveal-d2">
          <div className="dashboard-card">
            <div className="dc-header">
              <div className="dc-dots">
                <div className="dc-dot" style={{ background: '#ff5f57' }}></div>
                <div className="dc-dot" style={{ background: '#ffbd2e' }}></div>
                <div className="dc-dot" style={{ background: '#28c840' }}></div>
              </div>
              <div className="dc-title">veganalyse · analysis dashboard</div>
              <div className="dc-live">
                <div className="dc-live-dot"></div>Processing
              </div>
            </div>
            <div className="dc-body">
              <div className="dc-map">
                <div className="map-grid-lines"></div>
                <div className="map-polygon">
                  <div className="map-polygon-dot" style={{ top: '-4px', left: '-4px' }}></div>
                  <div className="map-polygon-dot" style={{ top: '-4px', right: '-4px' }}></div>
                  <div className="map-polygon-dot" style={{ bottom: '-4px', left: '-4px' }}></div>
                  <div className="map-polygon-dot" style={{ bottom: '-4px', right: '-4px' }}></div>
                </div>
                <div className="map-sat-badge">S2 · 20m · 8% cloud</div>
                <div className="map-coords">11.3410°N, 77.7172°E</div>
              </div>
              <div className="dc-metrics">
                <div className="dc-metric">
                  <div className="dc-m-label">NDVI</div>
                  <div className="dc-m-val" style={{ color: '#2D6A2F' }}>0.64</div>
                  <div className="dc-m-sub">Good density</div>
                </div>
                <div className="dc-metric">
                  <div className="dc-m-label">Soil</div>
                  <div className="dc-m-val" style={{ color: '#854F0B' }}>72</div>
                  <div className="dc-m-sub">/ 100 score</div>
                </div>
                <div className="dc-metric">
                  <div className="dc-m-label">Crop</div>
                  <div className="dc-m-val" style={{ color: '#BA7517' }}>81</div>
                  <div className="dc-m-sub">/ 100 vigor</div>
                </div>
              </div>
              <div style={{ marginBottom: '14px' }}>
                <div className="dc-bar-row">
                  <div className="dc-bar-label">Moisture</div>
                  <div className="dc-bar-track">
                    <div className="dc-bar-fill" style={{ width: '68%', background: '#3B7D3E' }}></div>
                  </div>
                  <div className="dc-bar-pct">68%</div>
                </div>
                <div className="dc-bar-row">
                  <div className="dc-bar-label">Chlorophyll</div>
                  <div className="dc-bar-track">
                    <div className="dc-bar-fill" style={{ width: '74%', background: '#4E9A52' }}></div>
                  </div>
                  <div className="dc-bar-pct">74%</div>
                </div>
                <div className="dc-bar-row">
                  <div className="dc-bar-label">Yield potential</div>
                  <div className="dc-bar-track">
                    <div className="dc-bar-fill" style={{ width: '79%', background: '#639922' }}></div>
                  </div>
                  <div className="dc-bar-pct">79%</div>
                </div>
              </div>
              <div className="dc-img-row">
                <div className="dc-img-thumb" style={{ background: '#d4edda' }}>
                  <span style={{ color: '#27500A' }}>NDVI</span>
                </div>
                <div className="dc-img-thumb" style={{ background: '#dce8d0' }}>
                  <span style={{ color: '#3B6D11' }}>SAVI</span>
                </div>
                <div className="dc-img-thumb" style={{ background: '#d0e8e0' }}>
                  <span style={{ color: '#0F6E56' }}>EVI</span>
                </div>
                <div className="dc-img-thumb" style={{ background: '#f5e6d3' }}>
                  <span style={{ color: '#633806' }}>SOIL</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* LOGOS STRIP */}
      <div className="logos-strip">
        <div className="logos-label">Trusted data from</div>
        <div className="logos-items">
          <div className="logo-item">
            <div className="logo-icon" style={{ background: '#EAF3DE' }}>
              <i className="ti ti-world" style={{ fontSize: '16px', color: '#3B6D11' }} aria-hidden="true"></i>
            </div>
            Google Earth Engine
          </div>
          <div className="logo-item">
            <div className="logo-icon" style={{ background: '#E6F1FB' }}>
              <i className="ti ti-satellite" style={{ fontSize: '16px', color: '#185FA5' }} aria-hidden="true"></i>
            </div>
            Copernicus / ESA
          </div>
          <div className="logo-item">
            <div className="logo-icon" style={{ background: '#EAF3DE' }}>
              <i className="ti ti-database" style={{ fontSize: '16px', color: '#3B6D11' }} aria-hidden="true"></i>
            </div>
            Supabase
          </div>
          <div className="logo-item">
            <div className="logo-icon" style={{ background: '#F1EFE8' }}>
              <i className="ti ti-server" style={{ fontSize: '16px', color: '#5F5E5A' }} aria-hidden="true"></i>
            </div>
            Neon PostgreSQL
          </div>
          <div className="logo-item">
            <div className="logo-icon" style={{ background: '#FAEEDA' }}>
              <i className="ti ti-bolt" style={{ fontSize: '16px', color: '#854F0B' }} aria-hidden="true"></i>
            </div>
            FastAPI
          </div>
        </div>
      </div>

      {/* STAT BAR */}
      <div className="stat-bar">
        <div className="stat-cell">
          <span className="stat-num">6<span className="stat-sfx">+</span></span>
          <span className="stat-lbl">Spectral Indices</span>
          <span className="stat-desc">NDVI, SAVI, EVI, GNDVI & more</span>
        </div>
        <div className="stat-cell">
          <span className="stat-num">20<span className="stat-sfx">m</span></span>
          <span className="stat-lbl">Resolution</span>
          <span className="stat-desc">Sentinel-2 pixel accuracy</span>
        </div>
        <div className="stat-cell">
          <span className="stat-num">&lt;60<span className="stat-sfx">s</span></span>
          <span className="stat-lbl">Analysis Time</span>
          <span className="stat-desc">Full pipeline, 7 images</span>
        </div>
        <div className="stat-cell">
          <span className="stat-num">90<span className="stat-sfx">d</span></span>
          <span className="stat-lbl">Image Window</span>
          <span className="stat-desc">Cloud-filtered composites</span>
        </div>
      </div>

      {/* HOW IT WORKS */}
      <section className="section how-bg reveal" id="how">
        <span className="s-tag">Process</span>
        <h2 className="s-title">Three steps. Complete clarity.</h2>
        <p className="s-sub">From polygon to full vegetation report — one seamless pipeline powered by Google Earth Engine and async FastAPI.</p>
        <div className="steps-wrap">
          <div className="step">
            <div className="step-num-wrap">
              <div className="step-num">01</div>
              <div className="step-line"></div>
            </div>
            <div className="step-icon">🗺️</div>
            <div className="step-h">Draw your region</div>
            <div className="step-p">Use the Leaflet.js map to draw a polygon or rectangle over any farmland, forest or terrain. Supports multi-vertex polygons with automatic area validation.</div>
            <span className="step-tag">Leaflet.js · GeoJSON</span>
          </div>
          <div className="step">
            <div className="step-num-wrap">
              <div className="step-num">02</div>
              <div className="step-line"></div>
            </div>
            <div className="step-icon">🛰️</div>
            <div className="step-h">Satellite query</div>
            <div className="step-p">We query Copernicus Sentinel-2 SR Harmonized imagery, filter for cloud cover below 20%, sort by clarity, and clip to your exact polygon boundary.</div>
            <span className="step-tag">Earth Engine · Sentinel-2</span>
          </div>
          <div className="step">
            <div className="step-num-wrap">
              <div className="step-num">03</div>
              <div className="step-line" style={{ flex: 0 }}></div>
            </div>
            <div className="step-icon">📊</div>
            <div className="step-h">Instant intelligence</div>
            <div className="step-p">Receive 7 spectral maps, soil health score, moisture, pH estimate, crop vigor, chlorophyll content, yield potential — stored to Supabase and Neon DB.</div>
            <span className="step-tag">Supabase · Neon · RAG</span>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="section reveal" id="features">
        <span className="s-tag">Capabilities</span>
        <h2 className="s-title">Every tool a precision<br />agronomist needs.</h2>
        <p className="s-sub">Async parallel computation, cloud-native storage, and structured RAG endpoints built in from day one.</p>
        <div className="feat-layout">
          <div className="feat-list">
            <div className="feat-item">
              <div className="feat-item-icon" style={{ background: '#EAF3DE' }}>🛰️</div>
              <div>
                <div className="feat-item-h">Sentinel-2 SR Harmonized</div>
                <div className="feat-item-p">90-day rolling window with automatic cloud masking below 20%. Fallback to 30% if no clear imagery found. Clips exactly to your polygon.</div>
              </div>
            </div>
            <div className="feat-item">
              <div className="feat-item-icon" style={{ background: '#F2F8EC' }}>🌿</div>
              <div>
                <div className="feat-item-h">Parallel index computation</div>
                <div className="feat-item-p">NDVI, SAVI, EVI, GNDVI, Soil Health and Crop Health all computed concurrently via asyncio.gather — not sequentially. 4× faster analysis.</div>
              </div>
            </div>
            <div className="feat-item">
              <div className="feat-item-icon" style={{ background: '#F5E6D3' }}>🧪</div>
              <div>
                <div className="feat-item-h">Soil intelligence layer</div>
                <div className="feat-item-p">Moisture index, organic matter estimation, texture score and pH approximation from SWIR, NIR, and visible band combinations.</div>
              </div>
            </div>
            <div className="feat-item">
              <div className="feat-item-icon" style={{ background: '#FDF3E0' }}>🌾</div>
              <div>
                <div className="feat-item-h">Crop health scoring</div>
                <div className="feat-item-p">Vigor index, chlorophyll via GNDVI+NDRE, canopy EVI, stress-adjusted yield potential — all expressed as 0–100 scores with recommendations.</div>
              </div>
            </div>
            <div className="feat-item">
              <div className="feat-item-icon" style={{ background: '#EAF3DE' }}>☁️</div>
              <div>
                <div className="feat-item-h">Cloud-native dual storage</div>
                <div className="feat-item-p">PNG images to Supabase Storage with public CDN URLs. Numerical statistics (mean, std, min, max per index) to Neon PostgreSQL for RAG.</div>
              </div>
            </div>
          </div>
          <div className="feat-visual">
            <div className="fv-header">
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink-mid)' }}>Index summary</div>
              <div className="fv-tabs">
                <div
                  className={`fv-tab ${activeVisualTab === 'Stats' ? 'active' : ''}`}
                  onClick={() => setActiveVisualTab('Stats')}
                >
                  Stats
                </div>
                <div
                  className={`fv-tab ${activeVisualTab === 'Images' ? 'active' : ''}`}
                  onClick={() => setActiveVisualTab('Images')}
                >
                  Images
                </div>
                <div
                  className={`fv-tab ${activeVisualTab === 'History' ? 'active' : ''}`}
                  onClick={() => setActiveVisualTab('History')}
                >
                  History
                </div>
              </div>
            </div>
            <div className="fv-body">
              <div className="fv-index-row">
                <div className="fv-idx-name">
                  <div className="fv-dot" style={{ background: '#3B6D11' }}></div>NDVI
                </div>
                <div className="fv-idx-bar-wrap">
                  <div className="fv-idx-bar" style={{ width: '64%', background: '#3B6D11' }}></div>
                </div>
                <div className="fv-idx-val" style={{ color: '#3B6D11' }}>0.64</div>
              </div>
              <div className="fv-index-row">
                <div className="fv-idx-name">
                  <div className="fv-dot" style={{ background: '#639922' }}></div>SAVI
                </div>
                <div className="fv-idx-bar-wrap">
                  <div className="fv-idx-bar" style={{ width: '58%', background: '#639922' }}></div>
                </div>
                <div className="fv-idx-val" style={{ color: '#639922' }}>0.58</div>
              </div>
              <div className="fv-index-row">
                <div className="fv-idx-name">
                  <div className="fv-dot" style={{ background: '#0F6E56' }}></div>EVI
                </div>
                <div className="fv-idx-bar-wrap">
                  <div className="fv-idx-bar" style={{ width: '52%', background: '#0F6E56' }}></div>
                </div>
                <div className="fv-idx-val" style={{ color: '#0F6E56' }}>0.52</div>
              </div>
              <div className="fv-index-row">
                <div className="fv-idx-name">
                  <div className="fv-dot" style={{ background: '#1D9E75' }}></div>GNDVI
                </div>
                <div className="fv-idx-bar-wrap">
                  <div className="fv-idx-bar" style={{ width: '61%', background: '#1D9E75' }}></div>
                </div>
                <div className="fv-idx-val" style={{ color: '#1D9E75' }}>0.61</div>
              </div>
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '14px', marginTop: '6px' }}>
                <div style={{ fontSize: '11px', color: 'var(--muted)', fontFamily: 'var(--mono)', marginBottom: '10px', letterSpacing: '.5px' }}>
                  HEALTH SCORES
                </div>
                <div className="fv-index-row">
                  <div className="fv-idx-name">
                    <div className="fv-dot" style={{ background: '#854F0B' }}></div>Soil
                  </div>
                  <div className="fv-idx-bar-wrap">
                    <div className="fv-idx-bar" style={{ width: '72%', background: '#854F0B' }}></div>
                  </div>
                  <div className="fv-idx-val" style={{ color: '#854F0B' }}>72/100</div>
                </div>
                <div className="fv-index-row">
                  <div className="fv-idx-name">
                    <div className="fv-dot" style={{ background: '#BA7517' }}></div>Crop
                  </div>
                  <div className="fv-idx-bar-wrap">
                    <div className="fv-idx-bar" style={{ width: '81%', background: '#BA7517' }}></div>
                  </div>
                  <div className="fv-idx-val" style={{ color: '#BA7517' }}>81/100</div>
                </div>
              </div>
              <div style={{ marginTop: '16px', padding: '12px', background: 'var(--green-pale)', borderRadius: '10px', border: '1px solid var(--green-border)' }}>
                <div style={{ fontSize: '11px', color: 'var(--green)', fontWeight: 600, marginBottom: '5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <i className="ti ti-check" style={{ fontSize: '13px' }} aria-hidden="true"></i> 2 recommendations generated
                </div>
                <div style={{ fontSize: '12px', color: 'var(--body)' }}>Good overall conditions. Monitor moisture levels — consider targeted irrigation on the north quadrant.</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* DATA PIPELINE */}
      <section className="section pipeline-bg reveal">
        <span className="s-tag">Architecture</span>
        <h2 className="s-title">How data flows.</h2>
        <p className="s-sub">A fully async pipeline from polygon draw to cloud-stored results, designed for sub-60s end-to-end performance.</p>
        <div className="pipeline">
          <div className="pipe-step">
            <div className="pipe-icon" style={{ background: '#EAF3DE' }}>🗺️</div>
            <div className="pipe-h">Polygon draw</div>
            <div className="pipe-p">GeoJSON coordinates from Leaflet</div>
            <span className="pipe-badge">FastAPI POST</span>
          </div>
          <div className="pipe-step">
            <div className="pipe-icon" style={{ background: '#E6F1FB' }}>🛰️</div>
            <div className="pipe-h">EE query</div>
            <div className="pipe-p">Sentinel-2 collection filter</div>
            <span className="pipe-badge">Earth Engine</span>
          </div>
          <div className="pipe-step">
            <div className="pipe-icon" style={{ background: '#F2F8EC' }}>⚡</div>
            <div className="pipe-h">Parallel compute</div>
            <div className="pipe-p">7 indices × asyncio.gather</div>
            <span className="pipe-badge">asyncio</span>
          </div>
          <div className="pipe-step">
            <div className="pipe-icon" style={{ background: '#F5E6D3' }}>☁️</div>
            <div className="pipe-h">Cloud upload</div>
            <div className="pipe-p">PNGs to Supabase Storage</div>
            <span className="pipe-badge">Supabase</span>
          </div>
          <div className="pipe-step">
            <div className="pipe-icon" style={{ background: '#EAF3DE' }}>🗄️</div>
            <div className="pipe-h">RAG storage</div>
            <div className="pipe-p">Stats to Neon PostgreSQL</div>
            <span className="pipe-badge">Neon DB</span>
          </div>
        </div>
      </section>

      {/* INDICES */}
      <section className="section idx-bg reveal" id="indices">
        <span className="s-tag">Spectral Layers</span>
        <h2 className="s-title">Six indices.<br />Complete coverage.</h2>
        <p className="s-sub">Each index targets a different aspect of vegetation health — from raw greenness to soil-adjusted biomass and canopy structure.</p>
        <div className="idx-grid">
          <div className="idx-card">
            <div className="idx-accent" style={{ background: '#3B6D11' }}></div>
            <div className="idx-icon" style={{ background: '#EAF3DE' }}>🌿</div>
            <div className="idx-h" style={{ color: '#27500A' }}>NDVI</div>
            <div className="idx-full">Normalized Difference Vegetation</div>
            <div className="idx-desc">The gold standard for vegetation greenness. Uses NIR and Red bands to detect chlorophyll presence across the polygon area.</div>
            <div className="idx-range">
              <div className="idx-range-label">-1</div>
              <div className="idx-range-track" style={{ background: '#EAF3DE' }}>
                <div className="idx-range-fill" style={{ width: '82%', background: '#3B6D11' }}></div>
              </div>
              <div className="idx-range-label">+1</div>
            </div>
          </div>
          <div className="idx-card">
            <div className="idx-accent" style={{ background: '#639922' }}></div>
            <div className="idx-icon" style={{ background: '#F2F8EC' }}>🌱</div>
            <div className="idx-h" style={{ color: '#3B6D11' }}>SAVI</div>
            <div className="idx-full">Soil Adjusted Vegetation</div>
            <div className="idx-desc">Corrects NDVI for soil brightness interference. Especially accurate for sparse vegetation and semi-arid agricultural regions.</div>
            <div className="idx-range">
              <div className="idx-range-label">-1</div>
              <div className="idx-range-track" style={{ background: '#EAF3DE' }}>
                <div className="idx-range-fill" style={{ width: '71%', background: '#639922' }}></div>
              </div>
              <div className="idx-range-label">+1</div>
            </div>
          </div>
          <div className="idx-card">
            <div className="idx-accent" style={{ background: '#0F6E56' }}></div>
            <div className="idx-icon" style={{ background: '#E1F5EE' }}>🌳</div>
            <div className="idx-h" style={{ color: '#085041' }}>EVI</div>
            <div className="idx-full">Enhanced Vegetation Index</div>
            <div className="idx-desc">Reduces atmospheric and canopy background distortion. More sensitive than NDVI in dense vegetation areas with high biomass.</div>
            <div className="idx-range">
              <div className="idx-range-label">-1</div>
              <div className="idx-range-track" style={{ background: '#E1F5EE' }}>
                <div className="idx-range-fill" style={{ width: '65%', background: '#0F6E56' }}></div>
              </div>
              <div className="idx-range-label">+1</div>
            </div>
          </div>
          <div className="idx-card">
            <div className="idx-accent" style={{ background: '#1D9E75' }}></div>
            <div className="idx-icon" style={{ background: '#E1F5EE' }}>🍃</div>
            <div className="idx-h" style={{ color: '#0F6E56' }}>GNDVI</div>
            <div className="idx-full">Green Normalized Difference</div>
            <div className="idx-desc">Uses green band instead of red. Highly correlated with leaf chlorophyll concentration — a direct proxy for photosynthetic activity.</div>
            <div className="idx-range">
              <div className="idx-range-label">-1</div>
              <div className="idx-range-track" style={{ background: '#E1F5EE' }}>
                <div className="idx-range-fill" style={{ width: '76%', background: '#1D9E75' }}></div>
              </div>
              <div className="idx-range-label">+1</div>
            </div>
          </div>
          <div className="idx-card">
            <div className="idx-accent" style={{ background: '#854F0B' }}></div>
            <div className="idx-icon" style={{ background: '#F5E6D3' }}>🪨</div>
            <div className="idx-h" style={{ color: '#633806' }}>Soil Health</div>
            <div className="idx-full">Composite Soil Score (0–100)</div>
            <div className="idx-desc">Aggregates moisture index, organic matter, texture, and estimated pH into a single 0–100 health score with action thresholds.</div>
            <div className="idx-range">
              <div className="idx-range-label">0</div>
              <div className="idx-range-track" style={{ background: '#F5E6D3' }}>
                <div className="idx-range-fill" style={{ width: '72%', background: '#854F0B' }}></div>
              </div>
              <div className="idx-range-label">100</div>
            </div>
          </div>
          <div className="idx-card">
            <div className="idx-accent" style={{ background: '#BA7517' }}></div>
            <div className="idx-icon" style={{ background: '#FDF3E0' }}>🌾</div>
            <div className="idx-h" style={{ color: '#854F0B' }}>Crop Health</div>
            <div className="idx-full">Composite Crop Score (0–100)</div>
            <div className="idx-desc">Combines vigor, chlorophyll content, canopy structure, and stress level into a crop vitality score with yield potential estimation.</div>
            <div className="idx-range">
              <div className="idx-range-label">0</div>
              <div className="idx-range-track" style={{ background: '#FDF3E0' }}>
                <div className="idx-range-fill" style={{ width: '81%', background: '#BA7517' }}></div>
              </div>
              <div className="idx-range-label">100</div>
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="section testi-bg reveal">
        <span className="s-tag">Trusted by agronomists</span>
        <h2 className="s-title">What field experts say.</h2>
        <p className="s-sub">Used by agronomists, remote sensing researchers, and precision agriculture teams across India and beyond.</p>
        <div className="testi-grid">
          <div className="testi-card">
            <div className="testi-stars">★★★★★</div>
            <div className="testi-text">"VegAnalyse gives us a full vegetation report in under a minute. What used to take our GIS team a day now happens before our morning chai."</div>
            <div className="testi-author">
              <div className="testi-av" style={{ background: '#EAF3DE', color: '#27500A' }}>RK</div>
              <div>
                <div className="testi-name">Rajesh Kumar</div>
                <div className="testi-role">Senior Agronomist, TNAU</div>
              </div>
            </div>
          </div>
          <div className="testi-card">
            <div className="testi-stars">★★★★★</div>
            <div className="testi-text">"The dual storage setup — Supabase for images and Neon for numerical data — is exactly what we needed for our RAG pipeline. Clean architecture."</div>
            <div className="testi-author">
              <div className="testi-av" style={{ background: '#E6F1FB', color: '#0C447C' }}>AM</div>
              <div>
                <div className="testi-name">Ananya Mehta</div>
                <div className="testi-role">Remote Sensing Researcher, IISc</div>
              </div>
            </div>
          </div>
          <div className="testi-card">
            <div className="testi-stars">★★★★★</div>
            <div className="testi-text">"SAVI and EVI together with soil health scoring changed how we advise on fertiliser application. The recommendations are genuinely actionable."</div>
            <div className="testi-author">
              <div className="testi-av" style={{ background: '#F5E6D3', color: '#633806' }}>PS</div>
              <div>
                <div className="testi-name">Priya Sundar</div>
                <div className="testi-role">Precision Ag Lead, Erode District</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="section reveal" style={{ background: 'var(--ivory)', paddingTop: 0 }}>
        <span className="s-tag">FAQ</span>
        <h2 className="s-title">Common questions.</h2>
        <div className="faq-wrap" id="faq">
          {[
            {
              q: 'What satellite data does VegAnalyse use?',
              a: 'We use Copernicus Sentinel-2 Level-2A Surface Reflectance Harmonized (S2_SR_HARMONIZED) imagery via Google Earth Engine. This gives us cloud-corrected, atmospherically normalised reflectance at 10–20m resolution.'
            },
            {
              q: 'How accurate are the health scores?',
              a: 'The scores are derived from multi-spectral band combinations — they are relative indicators, not absolute ground-truth measurements. For best results, validate against field observations in your region.'
            },
            {
              q: 'What happens if there is heavy cloud cover?',
              a: 'We first query for imagery with less than 20% cloud cover in the 90-day window. If none is found, we fall back to 30%. If still unavailable, the API returns a no_data response with a clear message.'
            },
            {
              q: 'Can I access historical analysis data?',
              a: 'Yes. All analyses are stored in Supabase (images + metadata) and Neon DB (numerical statistics). You can query by location name, analysis ID, or date range via the RAG API endpoints.'
            },
            {
              q: 'Is there an API I can integrate with?',
              a: 'Yes — the backend is a FastAPI server with documented endpoints. Pro and Enterprise plans include access to the RAG endpoints (/rag/recent, /rag/analysis/{id}, /rag/location/{name}).'
            },
            {
              q: 'How large can my polygon be?',
              a: 'Polygons up to 0.25 square degrees are processed at full resolution. Larger areas are automatically reduced to ~0.1 sq degrees around the centroid to stay within Earth Engine compute limits.'
            }
          ].map((item, idx) => (
            <div
              key={idx}
              className={`faq-item ${openFaqIndex === idx ? 'open' : ''}`}
              onClick={() => toggleFaq(idx)}
            >
              <div className="faq-q">
                {item.q} <span className="faq-icon">+</span>
              </div>
              <div className="faq-a">{item.a}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="cta-wrap reveal">
        <div className="cta-rings"></div>
        <div className="cta-rings2"></div>
        <h2 className="cta-title">
          Analyse any land.<br /><span className="cta-em">Instantly.</span>
        </h2>
        <p className="cta-sub">Draw a polygon and receive a complete satellite vegetation report — soil, crop, and 7 spectral maps — in under 60 seconds.</p>
        <div className="cta-btns">
          <button className="btn-white">
            <i className="ti ti-map-pin" style={{ fontSize: '16px' }} aria-hidden="true"></i>
            Open Map & Analyse
          </button>
          <button className="btn-wghost">View API Docs</button>
        </div>
        <div className="cta-note">No credit card required · Free plan available · Satellite data from ESA Copernicus</div>
      </section>

      {/* FOOTER */}
      <div className="footer-top">
        <div className="ft-brand">
          <div className="ft-logo">
            <div className="ft-logo-mark">
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 2C10 2 3 6 3 12c0 4 3.5 6 7 6s7-2 7-6C17 6 10 2 10 2Z" />
                <path d="M10 18V10" />
              </svg>
            </div>
            <div className="ft-logo-name">VegAnalyse</div>
          </div>
          <div className="ft-desc">Satellite-powered vegetation intelligence for agronomists, researchers, and precision agriculture teams.</div>
          <div className="ft-badges">
            <div className="ft-badge">Sentinel-2</div>
            <div className="ft-badge">Earth Engine</div>
            <div className="ft-badge">FastAPI</div>
            <div className="ft-badge">asyncio</div>
          </div>
        </div>
        <div>
          <span className="ft-col-h">Product</span>
          <div className="ft-links">
            <a className="ft-link" href="#">Analysis Map</a>
            <a className="ft-link" href="#">History</a>
            <a className="ft-link" href="#">Statistics</a>
            <a className="ft-link" href="#">Health Check</a>
            <a className="ft-link" href="#">Changelog</a>
          </div>
        </div>
        <div>
          <span className="ft-col-h">Developers</span>
          <div className="ft-links">
            <a className="ft-link" href="#">API Docs</a>
            <a className="ft-link" href="#">RAG Endpoints</a>
            <a className="ft-link" href="#">Swagger UI</a>
            <a className="ft-link" href="#">Postman Collection</a>
            <a className="ft-link" href="#">GitHub</a>
          </div>
        </div>
        <div>
          <span className="ft-col-h">Company</span>
          <div className="ft-links">
            <a className="ft-link" href="#">About</a>
            <a className="ft-link" href="#">Blog</a>
            <a className="ft-link" href="#">Pricing</a>
            <a className="ft-link" href="#">Contact</a>
            <a className="ft-link" href="#">Privacy Policy</a>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <div className="fb-copy">© 2025 VegAnalyse. Built in Erode, Tamil Nadu 🌱</div>
        <div className="fb-links">
          <a className="fb-link" href="#">Privacy</a>
          <a className="fb-link" href="#">Terms</a>
          <a className="fb-link" href="#">Cookies</a>
        </div>
      </div>

      <style jsx>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        :root {
          --ivory: #FAFAF7;
          --cream: #F3F1EA;
          --white: #FFFFFF;
          --green: #2D6A2F;
          --green-mid: #3B7D3E;
          --green-light: #EAF3DE;
          --green-pale: #F2F8EC;
          --green-accent: #4E9A52;
          --green-border: #B8D4B9;
          --sage: #7A9E7E;
          --sage-light: #C8DDC9;
          --terra: #A8622A;
          --terra-light: #F5E6D3;
          --terra-border: #DEC4A8;
          --amber: #BA7517;
          --amber-light: #FDF3E0;
          --ink: #1A2B1B;
          --ink-mid: #2E4330;
          --body: #4A5E4B;
          --muted: #7A8E7B;
          --hint: #A8BCAA;
          --border: #DDE8DC;
          --border-strong: #B8CEB9;
          --border-hover: #9AB89C;
          --serif: 'Playfair Display', Georgia, serif;
          --sans: 'DM Sans', sans-serif;
          --mono: 'DM Mono', monospace;
          --shadow-sm: 0 1px 3px rgba(26,43,27,0.06), 0 1px 2px rgba(26,43,27,0.04);
          --shadow-md: 0 4px 16px rgba(26,43,27,0.08), 0 2px 6px rgba(26,43,27,0.05);
          --shadow-lg: 0 12px 40px rgba(26,43,27,0.1), 0 4px 12px rgba(26,43,27,0.06);
        }
        html {
          scroll-behavior: smooth;
        }
        body {
          background: var(--ivory);
          color: var(--ink);
          font-family: var(--sans);
          overflow-x: hidden;
          line-height: 1.6;
          -webkit-font-smoothing: antialiased;
        }
        .app-container {
          max-width: 100%;
          overflow-x: hidden;
        }


        /* ANNOUNCEMENT BAR */
        // .announce {
        //   background: var(--green-light);
        //   border-bottom: 1px solid var(--green-border);
        //   padding: 9px 5%;
        //   display: flex;
        //   align-items: center;
        //   justify-content: center;
        //   gap: 10px;
        //   font-size: 13px;
        //   color: var(--ink-mid);
        // }
        // .announce-badge {
        //   background: var(--green);
        //   color: #fff;
        //   border-radius: 100px;
        //   padding: 2px 10px;
        //   font-size: 11px;
        //   font-weight: 600;
        //   font-family: var(--mono);
        //   letter-spacing: 0.5px;
        // }
        // .announce-link {
        //   color: var(--green);
        //   font-weight: 600;
        //   text-decoration: none;
        //   display: flex;
        //   align-items: center;
        //   gap: 3px;
        // }

        /* HERO */
        .hero {
          min-height: 100vh;
          display: grid;
          grid-template-columns: 1fr 1fr;
          align-items: center;
          padding: 80px 5% 60px;
          gap: 60px;
          position: relative;
          overflow: hidden;
          background: var(--ivory);
        }
        .hero-bg-grid {
          position: absolute;
          inset: 0;
          background-image: linear-gradient(var(--border) 1px, transparent 1px),
            linear-gradient(90deg, var(--border) 1px, transparent 1px);
          background-size: 48px 48px;
          opacity: 0.45;
          pointer-events: none;
        }
        .hero-bg-fade {
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse 80% 80% at 30% 50%, rgba(250, 250, 247, 0) 0%, var(--ivory) 70%);
          pointer-events: none;
        }
        .hero-left {
          position: relative;
          z-index: 2;
        }
        .hero-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: var(--white);
          border: 1px solid var(--border-strong);
          border-radius: 100px;
          padding: 6px 14px 6px 10px;
          font-size: 11.5px;
          color: var(--body);
          font-family: var(--mono);
          letter-spacing: 0.6px;
          margin-bottom: 28px;
          box-shadow: var(--shadow-sm);
        }
        .live-dot {
          width: 7px;
          height: 7px;
          background: #4e9a52;
          border-radius: 50%;
          animation: pulse 2.2s ease-in-out infinite;
          flex-shrink: 0;
        }
        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.4;
            transform: scale(0.7);
          }
        }
        .hero-title {
          font-family: var(--serif);
          font-size: clamp(44px, 5.5vw, 72px);
          font-weight: 900;
          line-height: 0.97;
          letter-spacing: -2.5px;
          color: var(--ink);
          margin-bottom: 24px;
        }
        .hero-title .em {
          color: var(--green);
          font-style: italic;
          display: block;
          margin-top: 4px;
        }
        .hero-sub {
          font-size: 16.5px;
          color: var(--body);
          line-height: 1.8;
          margin-bottom: 36px;
          font-weight: 300;
          max-width: 460px;
        }
        .hero-btns {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          margin-bottom: 48px;
        }
        .btn-primary {
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--green);
          color: #fff;
          border: none;
          border-radius: 11px;
          padding: 14px 26px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          font-family: var(--sans);
          transition: all 0.2s;
          box-shadow: 0 2px 12px rgba(45, 106, 47, 0.25);
        }
        .btn-primary:hover {
          background: var(--green-mid);
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(45, 106, 47, 0.3);
        }
        .btn-secondary {
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--white);
          color: var(--ink-mid);
          border: 1px solid var(--border-strong);
          border-radius: 11px;
          padding: 14px 24px;
          font-size: 15px;
          font-weight: 500;
          cursor: pointer;
          font-family: var(--sans);
          transition: all 0.2s;
          box-shadow: var(--shadow-sm);
        }
        .btn-secondary:hover {
          border-color: var(--border-hover);
          transform: translateY(-1px);
          box-shadow: var(--shadow-md);
        }
        .hero-trust {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .trust-avatars {
          display: flex;
        }
        .trust-av {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          border: 2px solid var(--white);
          background: var(--green-light);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 600;
          color: var(--green);
          margin-left: -8px;
          font-family: var(--mono);
        }
        .trust-av:first-child {
          margin-left: 0;
        }
        .trust-text {
          font-size: 13px;
          color: var(--muted);
        }
        .trust-text strong {
          color: var(--ink-mid);
          font-weight: 600;
        }

        /* DASHBOARD MOCKUP */
        .hero-right {
          position: relative;
          z-index: 2;
        }
        .dashboard-card {
          background: var(--white);
          border: 1px solid var(--border);
          border-radius: 20px;
          box-shadow: var(--shadow-lg);
          overflow: hidden;
        }
        .dc-header {
          padding: 14px 18px;
          border-bottom: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .dc-dots {
          display: flex;
          gap: 6px;
        }
        .dc-dot {
          width: 11px;
          height: 11px;
          border-radius: 50%;
        }
        .dc-title {
          font-size: 12px;
          color: var(--muted);
          font-family: var(--mono);
        }
        .dc-live {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 11px;
          color: var(--green-accent);
          font-weight: 500;
        }
        .dc-live-dot {
          width: 5px;
          height: 5px;
          background: var(--green-accent);
          border-radius: 50%;
          animation: pulse 2s ease-in-out infinite;
        }
        .dc-body {
          padding: 16px 18px;
        }
        .dc-map {
          background: var(--green-pale);
          border-radius: 12px;
          height: 160px;
          margin-bottom: 14px;
          position: relative;
          overflow: hidden;
          border: 1px solid var(--green-border);
        }
        .map-grid-lines {
          position: absolute;
          inset: 0;
          background-image: linear-gradient(rgba(45, 106, 47, 0.08) 1px, transparent 1px),
            linear-gradient(90deg, rgba(45, 106, 47, 0.08) 1px, transparent 1px);
          background-size: 24px 24px;
        }
        .map-polygon {
          position: absolute;
          top: 30px;
          left: 40px;
          right: 50px;
          bottom: 30px;
          border: 2px solid var(--green-accent);
          border-radius: 8px;
          background: rgba(78, 154, 82, 0.12);
        }
        .map-polygon-dot {
          position: absolute;
          width: 8px;
          height: 8px;
          background: var(--green);
          border: 2px solid #fff;
          border-radius: 50%;
          box-shadow: var(--shadow-sm);
        }
        .map-sat-badge {
          position: absolute;
          top: 10px;
          right: 10px;
          background: rgba(255, 255, 255, 0.92);
          border: 1px solid var(--border);
          border-radius: 6px;
          padding: 4px 8px;
          font-size: 10px;
          font-family: var(--mono);
          color: var(--ink-mid);
        }
        .map-coords {
          position: absolute;
          bottom: 8px;
          left: 10px;
          font-size: 10px;
          color: var(--sage);
          font-family: var(--mono);
        }
        .dc-metrics {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          margin-bottom: 14px;
        }
        .dc-metric {
          background: var(--ivory);
          border-radius: 10px;
          padding: 12px;
          border: 1px solid var(--border);
        }
        .dc-m-label {
          font-size: 10px;
          color: var(--muted);
          font-family: var(--mono);
          letter-spacing: 0.8px;
          text-transform: uppercase;
          margin-bottom: 4px;
        }
        .dc-m-val {
          font-family: var(--serif);
          font-size: 22px;
          font-weight: 900;
          letter-spacing: -0.5px;
          line-height: 1;
        }
        .dc-m-sub {
          font-size: 10px;
          color: var(--muted);
          margin-top: 3px;
        }
        .dc-bar-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }
        .dc-bar-label {
          font-size: 11px;
          color: var(--body);
          width: 70px;
          flex-shrink: 0;
        }
        .dc-bar-track {
          flex: 1;
          background: var(--cream);
          border-radius: 100px;
          height: 6px;
          overflow: hidden;
        }
        .dc-bar-fill {
          height: 100%;
          border-radius: 100px;
        }
        .dc-bar-pct {
          font-size: 11px;
          color: var(--muted);
          width: 30px;
          text-align: right;
          flex-shrink: 0;
          font-family: var(--mono);
        }
        .dc-img-row {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
        }
        .dc-img-thumb {
          border-radius: 8px;
          height: 52px;
          border: 1px solid var(--border);
          display: flex;
          align-items: flex-end;
          padding: 4px 6px;
          font-size: 9px;
          font-family: var(--mono);
          font-weight: 500;
          overflow: hidden;
          position: relative;
        }
        .dc-img-thumb span {
          position: relative;
          z-index: 1;
          background: rgba(255, 255, 255, 0.85);
          padding: 1px 5px;
          border-radius: 4px;
        }

        /* LOGOS STRIP */
        .logos-strip {
          padding: 32px 5%;
          border-top: 1px solid var(--border);
          border-bottom: 1px solid var(--border);
          background: var(--white);
          display: flex;
          align-items: center;
          gap: 0;
        }
        .logos-label {
          font-size: 11px;
          color: var(--hint);
          letter-spacing: 1.5px;
          text-transform: uppercase;
          font-family: var(--mono);
          white-space: nowrap;
          padding-right: 36px;
          border-right: 1px solid var(--border);
          margin-right: 36px;
          flex-shrink: 0;
        }
        .logos-items {
          display: flex;
          align-items: center;
          gap: 40px;
          flex-wrap: wrap;
        }
        .logo-item {
          display: flex;
          align-items: center;
          gap: 9px;
          font-size: 13.5px;
          font-weight: 500;
          color: var(--muted);
        }
        .logo-icon {
          width: 28px;
          height: 28px;
          border-radius: 7px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        /* STAT BAR */
        .stat-bar {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          background: var(--green);
        }
        .stat-cell {
          padding: 36px 24px;
          text-align: center;
          border-right: 1px solid rgba(255, 255, 255, 0.12);
          position: relative;
        }
        .stat-cell:last-child {
          border-right: none;
        }
        .stat-num {
          font-family: var(--serif);
          font-size: 48px;
          font-weight: 900;
          line-height: 1;
          letter-spacing: -2px;
          color: #fff;
          display: block;
        }
        .stat-sfx {
          font-size: 24px;
          color: rgba(255, 255, 255, 0.6);
        }
        .stat-lbl {
          font-size: 10.5px;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          font-family: var(--mono);
          color: rgba(255, 255, 255, 0.6);
          margin-top: 8px;
          display: block;
        }
        .stat-desc {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.45);
          margin-top: 4px;
          display: block;
        }

        /* SECTION BASE */
        .section {
          padding: 100px 5%;
        }
        .s-tag {
          font-size: 11px;
          color: var(--green-accent);
          letter-spacing: 2px;
          text-transform: uppercase;
          font-family: var(--mono);
          font-weight: 500;
          display: block;
          margin-bottom: 12px;
        }
        .s-title {
          font-family: var(--serif);
          font-size: clamp(32px, 4vw, 52px);
          font-weight: 900;
          color: var(--ink);
          letter-spacing: -1.5px;
          margin-bottom: 14px;
          line-height: 1.06;
        }
        .s-sub {
          font-size: 16px;
          color: var(--body);
          font-weight: 300;
          line-height: 1.8;
          max-width: 500px;
        }

        /* HOW IT WORKS */
        .how-bg {
          background: var(--cream);
        }
        .steps-wrap {
          margin-top: 60px;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0;
        }
        .step {
          padding: 40px 36px 40px 0;
        }
        .step + .step {
          padding-left: 36px;
          border-left: 1px solid var(--border);
        }
        .step-num-wrap {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 22px;
        }
        .step-num {
          width: 44px;
          height: 44px;
          background: var(--white);
          border: 1.5px solid var(--border-strong);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--mono);
          font-size: 13px;
          font-weight: 500;
          color: var(--green);
          box-shadow: var(--shadow-sm);
          flex-shrink: 0;
        }
        .step-line {
          flex: 1;
          height: 1px;
          background: var(--border);
        }
        .step-icon {
          width: 42px;
          height: 42px;
          background: var(--green-light);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          margin-bottom: 16px;
        }
        .step-h {
          font-size: 18px;
          font-weight: 600;
          color: var(--ink);
          margin-bottom: 10px;
          letter-spacing: -0.3px;
        }
        .step-p {
          font-size: 13.5px;
          color: var(--body);
          line-height: 1.75;
          font-weight: 300;
        }
        .step-tag {
          display: inline-block;
          background: var(--green-light);
          color: var(--green);
          border-radius: 6px;
          padding: 3px 10px;
          font-size: 11px;
          font-weight: 500;
          font-family: var(--mono);
          margin-top: 14px;
        }

        /* FEATURES */
        .feat-layout {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 60px;
          margin-top: 60px;
          align-items: start;
        }
        .feat-list {
          display: flex;
          flex-direction: column;
          gap: 0;
        }
        .feat-item {
          display: flex;
          gap: 18px;
          padding: 22px 0;
          border-bottom: 1px solid var(--border);
          cursor: pointer;
          transition: all 0.2s;
        }
        .feat-item:first-child {
          padding-top: 0;
        }
        .feat-item:last-child {
          border-bottom: none;
        }
        .feat-item-icon {
          width: 44px;
          height: 44px;
          border-radius: 11px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          flex-shrink: 0;
          transition: transform 0.2s;
        }
        .feat-item:hover .feat-item-icon {
          transform: scale(1.08);
        }
        .feat-item-h {
          font-size: 16px;
          font-weight: 600;
          color: var(--ink);
          margin-bottom: 6px;
          letter-spacing: -0.2px;
        }
        .feat-item-p {
          font-size: 13.5px;
          color: var(--body);
          line-height: 1.7;
          font-weight: 300;
        }
        .feat-visual {
          background: var(--white);
          border: 1px solid var(--border);
          border-radius: 20px;
          box-shadow: var(--shadow-lg);
          overflow: hidden;
          position: sticky;
          top: 90px;
        }
        .fv-header {
          padding: 16px 20px;
          border-bottom: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .fv-tabs {
          display: flex;
          gap: 4px;
        }
        .fv-tab {
          padding: 5px 12px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
          font-family: var(--mono);
          cursor: pointer;
          color: var(--muted);
          transition: all 0.15s;
        }
        .fv-tab.active {
          background: var(--green-light);
          color: var(--green);
        }
        .fv-body {
          padding: 18px 20px;
        }
        .fv-index-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 11px 14px;
          border-radius: 10px;
          margin-bottom: 8px;
          border: 1px solid transparent;
          transition: all 0.2s;
        }
        .fv-index-row:hover {
          border-color: var(--border);
          background: var(--ivory);
        }
        .fv-idx-name {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 13px;
          font-weight: 500;
          color: var(--ink);
        }
        .fv-idx-bar-wrap {
          flex: 1;
          margin: 0 16px;
          height: 5px;
          background: var(--cream);
          border-radius: 100px;
          overflow: hidden;
        }
        .fv-idx-bar {
          height: 100%;
          border-radius: 100px;
        }
        .fv-idx-val {
          font-size: 12px;
          font-family: var(--mono);
          font-weight: 500;
        }
        .fv-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        /* INDICES */
        .idx-bg {
          background: var(--ivory);
        }
        .idx-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-top: 56px;
        }
        .idx-card {
          background: var(--white);
          border: 1px solid var(--border);
          border-radius: 18px;
          padding: 28px 24px;
          transition: all 0.25s;
          position: relative;
          overflow: hidden;
        }
        .idx-card:hover {
          transform: translateY(-4px);
          box-shadow: var(--shadow-lg);
          border-color: var(--border-hover);
        }
        .idx-accent {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          border-radius: 18px 18px 0 0;
        }
        .idx-icon {
          width: 46px;
          height: 46px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
          margin-bottom: 18px;
          border: 1px solid var(--border);
        }
        .idx-h {
          font-size: 18px;
          font-weight: 700;
          margin-bottom: 4px;
          letter-spacing: -0.3px;
          font-family: var(--serif);
        }
        .idx-full {
          font-size: 12px;
          color: var(--muted);
          margin-bottom: 12px;
          font-family: var(--mono);
        }
        .idx-desc {
          font-size: 13.5px;
          color: var(--body);
          line-height: 1.7;
          font-weight: 300;
          margin-bottom: 16px;
        }
        .idx-range {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .idx-range-label {
          font-size: 11px;
          color: var(--muted);
          font-family: var(--mono);
        }
        .idx-range-track {
          flex: 1;
          height: 5px;
          border-radius: 100px;
          overflow: hidden;
        }
        .idx-range-fill {
          height: 100%;
          border-radius: 100px;
        }

        /* TESTIMONIALS */
        .testi-bg {
          background: var(--cream);
        }
        .testi-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-top: 56px;
        }
        .testi-card {
          background: var(--white);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 28px 24px;
          box-shadow: var(--shadow-sm);
        }
        .testi-stars {
          display: flex;
          gap: 3px;
          margin-bottom: 16px;
          color: var(--amber);
        }
        .testi-text {
          font-size: 14px;
          color: var(--body);
          line-height: 1.75;
          font-style: italic;
          margin-bottom: 20px;
          font-weight: 300;
        }
        .testi-author {
          display: flex;
          align-items: center;
          gap: 12px;
          border-top: 1px solid var(--border);
          padding-top: 16px;
        }
        .testi-av {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 700;
          font-family: var(--mono);
          flex-shrink: 0;
        }
        .testi-name {
          font-size: 13px;
          font-weight: 600;
          color: var(--ink);
        }
        .testi-role {
          font-size: 12px;
          color: var(--muted);
        }

        /* DATA PIPELINE */
        .pipeline-bg {
          background: var(--ivory);
        }
        .pipeline {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 0;
          margin-top: 60px;
          align-items: start;
        }
        .pipe-step {
          text-align: center;
          position: relative;
          padding: 0 12px;
        }
        .pipe-step + .pipe-step::before {
          content: '→';
          position: absolute;
          left: -10px;
          top: 24px;
          font-size: 20px;
          color: var(--border-strong);
          line-height: 1;
        }
        .pipe-icon {
          width: 52px;
          height: 52px;
          border-radius: 14px;
          margin: 0 auto 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          border: 1.5px solid var(--border);
          box-shadow: var(--shadow-sm);
        }
        .pipe-h {
          font-size: 13px;
          font-weight: 600;
          color: var(--ink);
          margin-bottom: 6px;
        }
        .pipe-p {
          font-size: 12px;
          color: var(--muted);
          line-height: 1.6;
        }
        .pipe-badge {
          display: inline-block;
          background: var(--green-light);
          color: var(--green);
          border-radius: 100px;
          padding: 2px 8px;
          font-size: 10px;
          font-family: var(--mono);
          font-weight: 500;
          margin-top: 8px;
        }

        /* FAQ */
        .faq-wrap {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0;
          margin-top: 56px;
        }
        .faq-item {
          padding: 22px 28px;
          border-bottom: 1px solid var(--border);
          cursor: pointer;
        }
        .faq-item:nth-child(odd) {
          border-right: 1px solid var(--border);
        }
        .faq-q {
          font-size: 15px;
          font-weight: 600;
          color: var(--ink);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          letter-spacing: -0.2px;
        }
        .faq-icon {
          font-size: 18px;
          color: var(--sage);
          flex-shrink: 0;
          transition: transform 0.2s;
          font-weight: 300;
        }
        .faq-a {
          font-size: 13.5px;
          color: var(--body);
          margin-top: 12px;
          line-height: 1.75;
          font-weight: 300;
          display: none;
        }
        .faq-item.open .faq-a {
          display: block;
        }
        .faq-item.open .faq-icon {
          transform: rotate(45deg);
          color: var(--green);
        }

        /* CTA */
        .cta-wrap {
          background: var(--green);
          padding: 120px 5%;
          text-align: center;
          position: relative;
          overflow: hidden;
        }
        .cta-rings {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 700px;
          height: 700px;
          border: 1px solid rgba(255, 255, 255, 0.07);
          border-radius: 50%;
        }
        .cta-rings2 {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 1000px;
          height: 1000px;
          border: 1px solid rgba(255, 255, 255, 0.04);
          border-radius: 50%;
        }
        .cta-title {
          font-family: var(--serif);
          font-size: clamp(36px, 5vw, 64px);
          font-weight: 900;
          color: #fff;
          letter-spacing: -2px;
          line-height: 1.02;
          position: relative;
          z-index: 2;
          margin-bottom: 18px;
        }
        .cta-em {
          color: rgba(200, 230, 200, 0.9);
          font-style: italic;
        }
        .cta-sub {
          font-size: 17px;
          color: rgba(255, 255, 255, 0.68);
          max-width: 440px;
          margin: 0 auto 44px;
          font-weight: 300;
          line-height: 1.8;
          position: relative;
          z-index: 2;
        }
        .cta-btns {
          display: flex;
          gap: 12px;
          justify-content: center;
          flex-wrap: wrap;
          position: relative;
          z-index: 2;
        }
        .btn-white {
          background: #fff;
          color: var(--green);
          border: none;
          border-radius: 11px;
          padding: 15px 28px;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          font-family: var(--sans);
          transition: all 0.2s;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        }
        .btn-white:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 32px rgba(0, 0, 0, 0.2);
        }
        .btn-wghost {
          background: transparent;
          color: rgba(255, 255, 255, 0.85);
          border: 1.5px solid rgba(255, 255, 255, 0.28);
          border-radius: 11px;
          padding: 15px 26px;
          font-size: 15px;
          font-weight: 400;
          cursor: pointer;
          font-family: var(--sans);
          transition: all 0.2s;
        }
        .btn-wghost:hover {
          border-color: rgba(255, 255, 255, 0.6);
          background: rgba(255, 255, 255, 0.08);
        }
        .cta-note {
          font-size: 12.5px;
          color: rgba(255, 255, 255, 0.45);
          margin-top: 20px;
          position: relative;
          z-index: 2;
        }

        /* FOOTER */
        .footer-top {
          background: var(--ink);
          padding: 64px 5% 40px;
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1fr;
          gap: 48px;
        }
        .ft-brand {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .ft-logo {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .ft-logo-mark {
          width: 32px;
          height: 32px;
          background: var(--green-accent);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .ft-logo-name {
          font-weight: 600;
          font-size: 16px;
          color: #fff;
        }
        .ft-desc {
          font-size: 13.5px;
          color: rgba(255, 255, 255, 0.4);
          line-height: 1.7;
          max-width: 260px;
        }
        .ft-badges {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .ft-badge {
          background: rgba(255, 255, 255, 0.07);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 6px;
          padding: 4px 10px;
          font-size: 11px;
          color: rgba(255, 255, 255, 0.45);
          font-family: var(--mono);
        }
        .ft-col-h {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.35);
          letter-spacing: 1.5px;
          text-transform: uppercase;
          font-family: var(--mono);
          margin-bottom: 20px;
          display: block;
        }
        .ft-links {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .ft-link {
          font-size: 13.5px;
          color: rgba(255, 255, 255, 0.5);
          text-decoration: none;
          transition: color 0.18s;
        }
        .ft-link:hover {
          color: #fff;
        }
        .footer-bottom {
          background: var(--ink);
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          padding: 20px 5%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
        }
        .fb-copy {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.28);
        }
        .fb-links {
          display: flex;
          gap: 24px;
        }
        .fb-link {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.28);
          text-decoration: none;
        }
        .fb-link:hover {
          color: rgba(255, 255, 255, 0.6);
        }

        /* ANIMATIONS */
        .reveal {
          opacity: 0;
          transform: translateY(20px);
          transition: opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1), transform 0.7s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .reveal.in {
          opacity: 1;
          transform: none;
        }
        .reveal-d1 {
          transition-delay: 0.07s;
        }
        .reveal-d2 {
          transition-delay: 0.14s;
        }
        .reveal-d3 {
          transition-delay: 0.21s;
        }
        .reveal-d4 {
          transition-delay: 0.28s;
        }
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700;1,900&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&family=DM+Mono:wght@400;500&display=swap');
      `}</style>
    </div>
  );
};

export default VegAnalyseApp;