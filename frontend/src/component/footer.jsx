// VegAnalyseFooter.jsx
import React from 'react';

const VegAnalyseFooter = () => {
  const productLinks = [
    { label: 'Analysis Map', href: '#' },
    { label: 'History', href: '#' },
    { label: 'Statistics', href: '#' },
    { label: 'Health Check', href: '#' },
    { label: 'Changelog', href: '#' },
  ];

  const developerLinks = [
    { label: 'API Docs', href: '#' },
    { label: 'RAG Endpoints', href: '#' },
    { label: 'Swagger UI', href: '#' },
    { label: 'Postman Collection', href: '#' },
    { label: 'GitHub', href: '#' },
  ];

  const companyLinks = [
    { label: 'About', href: '#' },
    { label: 'Blog', href: '#' },
    { label: 'Pricing', href: '#' },
    { label: 'Contact', href: '#' },
    { label: 'Privacy Policy', href: '#' },
  ];

  const bottomLinks = [
    { label: 'Privacy', href: '#' },
    { label: 'Terms', href: '#' },
    { label: 'Cookies', href: '#' },
  ];

  return (
    <footer className="va-footer">
      <div className="footer-top">
        {/* Brand Section */}
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
          <div className="ft-desc">
            Satellite-powered vegetation intelligence for agronomists, researchers, and precision agriculture teams.
          </div>
          <div className="ft-badges">
            <div className="ft-badge">Sentinel-2</div>
            <div className="ft-badge">Earth Engine</div>
            <div className="ft-badge">FastAPI</div>
            <div className="ft-badge">asyncio</div>
          </div>
        </div>

        {/* Product Column */}
        <div>
          <span className="ft-col-h">Product</span>
          <div className="ft-links">
            {productLinks.map((link, index) => (
              <a key={index} className="ft-link" href={link.href}>
                {link.label}
              </a>
            ))}
          </div>
        </div>

        {/* Developers Column */}
        <div>
          <span className="ft-col-h">Developers</span>
          <div className="ft-links">
            {developerLinks.map((link, index) => (
              <a key={index} className="ft-link" href={link.href}>
                {link.label}
              </a>
            ))}
          </div>
        </div>

        {/* Company Column */}
        <div>
          <span className="ft-col-h">Company</span>
          <div className="ft-links">
            {companyLinks.map((link, index) => (
              <a key={index} className="ft-link" href={link.href}>
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Footer Bottom */}
      <div className="footer-bottom">
        <div className="fb-copy">© 2025 VegAnalyse. Built in Erode, Tamil Nadu 🌱</div>
        <div className="fb-links">
          {bottomLinks.map((link, index) => (
            <a key={index} className="fb-link" href={link.href}>
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
};

export default VegAnalyseFooter;