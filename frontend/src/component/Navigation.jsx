// VegAnalyseNav.jsx
import React from 'react';
import { NavLink } from 'react-router-dom';
import './Navigation.css';

const VegAnalyseNav = () => {

  const navLinks = [
    { path: '/', label: 'Home', exact: true },
    { path: '/analysis', label: 'Analysis' },
    { path: '/soil', label: 'Soil' },
    { path: '/chat', label: 'Chat' },
    { path: '/statistics', label: 'Statistics' },
  ];

  return (

    <nav className="va-nav">

      {/* LOGO */}

      <NavLink
        to="/"
        className="va-logo"
      >

        <div className="va-logo-mark">

          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            stroke="#fff"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M10 2C10 2 3 6 3 12c0 4 3.5 6 7 6s7-2 7-6C17 6 10 2 10 2Z"/>
            <path d="M10 18V10"/>
          </svg>

        </div>

        <div className="va-logo-text-container">

          <span className="va-logo-name">
            VegAnalyse
          </span>

          <span className="va-logo-sub">
            <br></br>
            Satellite Intelligence
          </span>

        </div>

      </NavLink>

      {/* RIGHT SIDE */}

      <div className="va-nav-links">

        {navLinks.map((link, index) => (

          <NavLink
            key={link.path}
            to={link.path}
            end={link.exact}
            className={({ isActive }) =>
              `va-nav-link${isActive ? ' active' : ''}`
            }
          >
            {link.label}
          </NavLink>

        ))}

        <div className="va-nav-divider" />

        {/* HEALTH REPORT */}

        <NavLink
          to="/report"
          className="va-nav-cta"
        >

          <span>⚡</span>

          <span>
            Health Report
          </span>

        </NavLink>

      </div>

    </nav>
  );
};

export default VegAnalyseNav;