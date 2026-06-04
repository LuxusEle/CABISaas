import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Sun, Moon, Menu, X } from 'lucide-react';

interface LandingHeaderProps {
  onSignIn: () => void;
  onGetStarted: () => void;
  isDark: boolean;
  setIsDark: (isDark: boolean) => void;
}

export const LandingHeader: React.FC<LandingHeaderProps> = ({
  onSignIn,
  onGetStarted,
  isDark,
  setIsDark
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    if (location.pathname !== '/') {
      navigate('/#' + id);
    } else {
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  useEffect(() => {
    if (location.pathname === '/' && location.hash) {
      const id = location.hash.replace('#', '');
      const element = document.getElementById(id);
      if (element) {
        const timer = setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth' });
          window.history.replaceState(null, '', '/');
        }, 100);
        return () => clearTimeout(timer);
      }
    }
  }, [location.pathname, location.hash]);

  const navLinks = [
    { label: 'Features', id: 'features' },
    { label: 'How it works', id: 'workflow' },
    { label: 'Pricing', id: 'pricing' },
    { label: 'Contact', id: 'contact' },
  ];

  return (
    <nav className={`nav ${scrolled ? 'nav-scrolled' : ''}`}>
      <div className="container nav-inner">
        <Link to="/" className="brand" aria-label="Cabinetrix Pro home">
          <span className="brand-mark">C</span>
          <span className="brand-text">Cabinetrix<small>Pro</small></span>
        </Link>
        <div className="nav-links" aria-label="Main navigation">
          {navLinks.map((link) => (
            <button
              key={link.id}
              onClick={() => scrollToSection(link.id)}
              className="nav-link"
            >
              {link.label}
            </button>
          ))}
          <Link to="/docs" className="nav-link">Docs</Link>
        </div>
        <div className="nav-actions">
          <button
            onClick={() => setIsDark(!isDark)}
            className="nav-theme-btn"
            aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button onClick={onSignIn} className="btn btn-ghost nav-action-btn">
            Sign in
          </button>
          <button onClick={onGetStarted} className="btn btn-primary nav-action-btn">
            Get Started Free
          </button>
          <div className="mobile-controls">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="nav-mobile-btn"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="mobile-menu">
          <div className="mobile-menu-inner">
            {navLinks.map((link) => (
              <button
                key={link.id}
                onClick={() => scrollToSection(link.id)}
                className="mobile-link"
              >
                {link.label}
              </button>
            ))}
            <Link
              to="/docs"
              onClick={() => setMobileMenuOpen(false)}
              className="mobile-link"
            >
              Docs
            </Link>
            <button
              onClick={() => setIsDark(!isDark)}
              className="mobile-theme-toggle"
              aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
            >
              <span className="mobile-theme-icon">
                {isDark ? <Sun size={16} /> : <Moon size={16} />}
              </span>
              <span>{isDark ? 'Light mode' : 'Dark mode'}</span>
            </button>
            <div className="mobile-divider" />
            <button
              onClick={() => { onSignIn(); setMobileMenuOpen(false); }}
              className="mobile-link"
            >
              Sign in
            </button>
            <button
              onClick={() => { onGetStarted(); setMobileMenuOpen(false); }}
              className="mobile-cta"
            >
              Get Started Free
            </button>
          </div>
        </div>
      )}

      <style>{`
        .nav {
          position: sticky;
          top: 0;
          z-index: 50;
          backdrop-filter: blur(22px);
          -webkit-backdrop-filter: blur(22px);
          background: rgba(5, 8, 21, 0.72);
          border-bottom: 1px solid rgba(148, 163, 184, 0.1);
        }
        .nav-inner {
          height: 74px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
        }
        .nav-scrolled {
          box-shadow: 0 24px 80px rgba(0, 0, 0, 0.16);
        }
        .container {
          width: min(var(--max, 1180px), calc(100% - 40px));
          margin-inline: auto;
        }
        .nav-inner {
          height: 74px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
        }
        .brand {
          display: flex;
          align-items: center;
          gap: 12px;
          font-weight: 800;
          letter-spacing: -0.03em;
          color: var(--text, var(--slate-50));
          text-decoration: none;
        }
        .brand-mark {
          width: 34px;
          height: 34px;
          border-radius: 10px;
          display: grid;
          place-items: center;
          background: linear-gradient(135deg, var(--brass, var(--brass)), var(--wood-walnut, var(--wood-walnut)));
          box-shadow: 0 12px 32px rgba(var(--brass-rgb), 0.28);
          font-size: 14px;
          color: var(--ink);
          flex-shrink: 0;
        }
        .brand-text {
          font-size: 16px;
          line-height: 1;
        }
        .brand-text small {
          display: block;
          color: var(--muted, var(--slate-400));
          font-size: 11px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          margin-top: -2px;
        }
        .nav-links {
          display: flex;
          align-items: center;
          gap: 26px;
        }
        .nav-link {
          background: none;
          border: none;
          cursor: pointer;
          color: var(--soft, #cbd5e1);
          font-size: 14px;
          font-weight: 600;
          opacity: 0.86;
          transition: color 180ms ease, opacity 180ms ease, transform 180ms ease;
          text-decoration: none;
          font-family: inherit;
          padding: 0;
        }
        .nav-link:hover {
          color: var(--text, var(--white));
          opacity: 1;
          transform: translateY(-1px);
        }
        .nav-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .nav-theme-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: 10px;
          border: 1px solid var(--border, rgba(var(--slate-400-rgb), 0.12));
          background: color-mix(in srgb, var(--card-strong, rgba(var(--slate-400-rgb), 0.08)) 70%, transparent);
          color: var(--muted, var(--slate-400));
          cursor: pointer;
          transition: background 180ms ease, color 180ms ease;
        }
        .nav-theme-btn:hover {
          background: color-mix(in srgb, var(--card-strong, rgba(var(--slate-400-rgb), 0.16)) 92%, transparent);
          color: var(--text, var(--white));
        }
        .nav-action-btn {
          display: none;
        }
        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          height: 44px;
          padding: 0 18px;
          border-radius: 12px;
          border: 1px solid transparent;
          font-weight: 800;
          font-size: 14px;
          cursor: pointer;
          transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease, background 180ms ease;
          white-space: nowrap;
          font-family: inherit;
        }
        .btn:hover {
          transform: translateY(-2px);
        }
        .btn-primary {
          color: var(--ink);
          background: linear-gradient(135deg, var(--brass, var(--brass)), var(--amber, var(--amber)) 70%);
          box-shadow: 0 14px 34px rgba(var(--brass-rgb), 0.3);
        }
        .btn-primary:hover {
          box-shadow: 0 18px 44px rgba(var(--amber-rgb), 0.34);
        }
        .btn-ghost {
          background: color-mix(in srgb, var(--card-strong, rgba(var(--slate-400-rgb), 0.08)) 70%, transparent);
          border-color: var(--border, rgba(var(--slate-400-rgb), 0.12));
          color: var(--soft, #cbd5e1);
        }
        .btn-ghost:hover {
          background: color-mix(in srgb, var(--card-strong, rgba(var(--slate-400-rgb), 0.13)) 88%, transparent);
          color: var(--text, var(--white));
        }
        .mobile-controls {
          display: none;
        }
        .nav-mobile-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: 10px;
          border: 1px solid var(--border, rgba(var(--slate-400-rgb), 0.12));
          background: color-mix(in srgb, var(--card-strong, rgba(var(--slate-400-rgb), 0.08)) 70%, transparent);
          color: var(--soft, #cbd5e1);
          cursor: pointer;
        }
        .nav-mobile-btn:hover {
          background: color-mix(in srgb, var(--card-strong, rgba(var(--slate-400-rgb), 0.16)) 92%, transparent);
          color: var(--text, var(--white));
        }
        .mobile-menu {
          background: color-mix(in srgb, var(--bg-950, var(--nav-bg-rgb)) 96%, transparent);
          border-bottom: 1px solid var(--border, rgba(var(--slate-400-rgb), 0.1));
        }
        .mobile-menu-inner {
          padding: 12px 20px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          max-width: var(--max, 1180px);
          margin: 0 auto;
        }
        .mobile-link {
          display: block;
          width: 100%;
          text-align: left;
          padding: 12px 16px;
          background: none;
          border: none;
          cursor: pointer;
          color: var(--soft, #cbd5e1);
          font-size: 15px;
          font-weight: 600;
          border-radius: 10px;
          transition: background 180ms ease;
          font-family: inherit;
          text-decoration: none;
        }
        .mobile-link:hover {
          background: color-mix(in srgb, var(--card-strong, rgba(var(--slate-400-rgb), 0.1)) 78%, transparent);
          color: var(--text, var(--white));
        }

        .mobile-theme-toggle {
          display: flex;
          width: 100%;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          background: color-mix(in srgb, var(--card-strong, rgba(var(--slate-400-rgb), 0.08)) 74%, transparent);
          border: 1px solid var(--border, rgba(var(--slate-400-rgb), 0.12));
          color: var(--soft, #cbd5e1);
          font-size: 15px;
          font-weight: 700;
          border-radius: 10px;
          cursor: pointer;
          transition: background 180ms ease, color 180ms ease, transform 180ms ease;
          font-family: inherit;
        }
        .mobile-theme-toggle:hover {
          background: color-mix(in srgb, var(--card-strong, rgba(var(--slate-400-rgb), 0.16)) 94%, transparent);
          color: var(--text, var(--white));
          transform: translateY(-1px);
        }
        .mobile-theme-icon {
          display: inline-flex;
          width: 26px;
          height: 26px;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          background: linear-gradient(135deg, var(--brass, var(--brass)), var(--amber, var(--amber)));
          color: var(--ink);
        }

        .mobile-divider {
          height: 1px;
          background: var(--border, rgba(var(--slate-400-rgb), 0.12));
          margin: 8px 0;
        }
        .mobile-cta {
          display: block;
          width: 100%;
          text-align: center;
          padding: 14px;
          background: linear-gradient(135deg, var(--brass, var(--brass)), var(--amber, var(--amber)) 70%);
          color: var(--ink);
          font-weight: 800;
          font-size: 15px;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          box-shadow: 0 14px 34px rgba(var(--brass-rgb), 0.3);
          font-family: inherit;
        }
        @media (min-width: 781px) {
          .nav-action-btn {
            display: inline-flex;
          }
          .mobile-controls {
            display: none;
          }
        }
        @media (max-width: 780px) {
          .nav-links {
            display: none;
          }
          .btn-ghost.nav-action-btn {
            display: none;
          }
          .btn-primary.nav-action-btn {
            display: none;
          }
          .mobile-controls {
            display: flex;
          }
        }
      `}</style>
    </nav>
  );
};
