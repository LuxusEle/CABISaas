import React, { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { LandingHeader } from './LandingHeader';
import { Link } from 'react-router-dom';

interface CutListGeneratorPageProps {
  onSignIn: () => void;
  onGetStarted: () => void;
  onQuickStart?: () => void;
  isDark: boolean;
  setIsDark: (isDark: boolean) => void;
}

export const CutListGeneratorPage: React.FC<CutListGeneratorPageProps> = ({
  onSignIn,
  onGetStarted,
  onQuickStart,
  isDark,
  setIsDark
}) => {
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  return (
    <>
      <Helmet>
        <title>Cabinet Cut List Generator & Sheet Nesting Tool | CabEngine Pro</title>
        <link rel="canonical" href="https://www.protradee.com/cut-list-generator" />
        <meta name="description" content="Online plywood sheet nesting and cabinet cut list generator. Optimize panel layouts to minimize waste, reduce material costs, and generate professional cut sheets." />
      </Helmet>
      <div className={`clg-page ${isDark ? 'lp-dark-theme' : 'lp-light-theme'}`}>
        <LandingHeader onSignIn={onSignIn} onGetStarted={onGetStarted} isDark={isDark} setIsDark={setIsDark} />

        <main id="top">
          <header className="clg-hero">
            <div className="container clg-hero-grid">
              <div>
                <div className="clg-eyebrow">
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" width="15" height="15"><path d="M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="2"/><path d="M8 7h8M8 11h8M8 15h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                  Panel Optimization Engine
                </div>
                <h1>Reduce Sheet Waste by Up to <span className="clg-gradient-text">30%</span></h1>
                <p className="clg-hero-copy">Automated plywood sheet nesting and cabinet cut list generation for cabinet makers. Optimize panel layouts across multiple sheet sizes, thicknesses, and material types without slowing down production.</p>
                <div className="clg-hero-actions">
                  <button className="clg-btn clg-btn-primary" onClick={onGetStarted}>Start Optimizing Free →</button>
                  <button className="clg-btn clg-btn-ghost" onClick={onQuickStart}>Try Live Demo</button>
                </div>
                <div className="clg-trust-row">
                  <span className="clg-trust-pill"><span className="clg-trust-dot"></span> DXF and CNC-ready exports</span>
                  <span>•</span>
                  <span>Quote-ready reporting for workshops</span>
                </div>
              </div>

              <div className="clg-hero-visual" aria-label="Sheet nesting optimizer interface preview">
                <div className="clg-orb"></div>
                <div className="clg-floating-note clg-note-a"><strong>30% less waste</strong><small>Yield improved after nesting pass</small></div>
                <div className="clg-floating-note clg-note-b"><strong>DXF ready</strong><small>Cut sheets and CNC output prepared</small></div>
                <div className="clg-optimizer-window">
                  <div className="clg-window-top">
                    <div className="clg-dots"><span className="clg-dot"></span><span className="clg-dot"></span><span className="clg-dot"></span></div>
                    <div className="clg-window-title">CabEngine Nesting / Sheet 01</div>
                    <div className="clg-live-chip">LIVE</div>
                  </div>
                  <div className="clg-optimizer-body">
                    <div className="clg-sheet-canvas">
                      <div className="clg-scan-line"></div>
                      <div className="clg-sheet">
                        <div className="clg-part clg-p1" data-label="SIDE A"></div>
                        <div className="clg-part clg-p2" data-label="BACK"></div>
                        <div className="clg-part clg-p3" data-label="DOOR"></div>
                        <div className="clg-part clg-p4" data-label="RAIL"></div>
                        <div className="clg-part clg-p5" data-label="SHELF"></div>
                        <div className="clg-part clg-p6" data-label="SIDE B"></div>
                        <div className="clg-part clg-p7" data-label="TOP"></div>
                        <div className="clg-part clg-p8" data-label="REMNANT"></div>
                      </div>
                      <div className="clg-canvas-badge"><strong>18mm Birch Ply · 2440 × 1220</strong>Kerf applied · grain locked · remnants tracked</div>
                    </div>
                    <aside className="clg-side-panel">
                      <div className="clg-panel-heading"><span>Optimization</span><span className="clg-live-chip">Done</span></div>
                      <div className="clg-stat-list">
                        <div className="clg-stat-row"><span>Yield</span><strong>91.8%</strong></div>
                        <div className="clg-stat-row"><span>Waste</span><strong>8.2%</strong></div>
                        <div className="clg-stat-row"><span>Sheets</span><strong>6 → 4</strong></div>
                        <div className="clg-stat-row"><span>Saving</span><strong>£142.50</strong></div>
                      </div>
                      <div className="clg-export-box">
                        <strong>Export package</strong>
                        <div className="clg-chips"><span className="clg-chip">PDF</span><span className="clg-chip">DXF</span><span className="clg-chip">CSV</span><span className="clg-chip">CNC</span></div>
                      </div>
                    </aside>
                  </div>
                </div>
              </div>
            </div>
          </header>

          <div className="clg-metric-strip">
            <div className="container clg-metrics">
              <article className="clg-metric-card">
                <div className="clg-metric-value">30%</div>
                <h3>Average Waste Reduction</h3>
                <p>Compared to manual layout estimation and rough workshop planning.</p>
              </article>
              <article className="clg-metric-card">
                <div className="clg-metric-value">500+</div>
                <h3>Sheet Sizes Supported</h3>
                <p>Use custom dimensions, standard plywood boards, MDF, particle board, and melamine.</p>
              </article>
              <article className="clg-metric-card">
                <div className="clg-metric-value">1-Click</div>
                <h3>Export Ready</h3>
                <p>Generate cut sheets, DXF files, CNC-ready output, and professional reports.</p>
              </article>
            </div>
          </div>

          <section id="workflow">
            <div className="container">
              <div className="clg-section-heading">
                <h2>How the <span className="clg-gradient-text">Nesting Engine</span> Works</h2>
                <p>From part list to optimized sheet layout in a clean four-step production flow.</p>
              </div>
              <div className="clg-steps-grid">
                <article className="clg-step-card"><div className="clg-step-number">1</div><h3>Input Parts</h3><p>Your cabinet design generates a complete part list — panels, doors, shelves, rails, and internal components.</p></article>
                <article className="clg-step-card"><div className="clg-step-number">2</div><h3>Select Materials</h3><p>Choose sheet sizes, thicknesses, materials, and grain rules. Mix material types in the same project.</p></article>
                <article className="clg-step-card"><div className="clg-step-number">3</div><h3>Optimize Layout</h3><p>The engine arranges parts across sheets to maximize yield, reduce scrap, and keep production practical.</p></article>
                <article className="clg-step-card"><div className="clg-step-number">4</div><h3>Generate Output</h3><p>Export optimized cut sheets, material reports, DXF files, and CNC-ready nesting packages.</p></article>
              </div>
            </div>
          </section>

          <section id="features">
            <div className="container">
              <div className="clg-section-heading">
                <h2>Built for <span className="clg-gradient-text">Cabinet Workshops</span></h2>
                <p>Practical features that connect design, costing, cutting, and production output.</p>
              </div>
              <div className="clg-feature-grid">
                <article className="clg-feature-card">
                  <div className="clg-icon-box"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true" width="22" height="22"><path d="M4 7h6v10H4V7Zm10-3h6v13h-6V4ZM8 20h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></div>
                  <div><h3>Multi-Sheet Optimization</h3><p>Process multiple sheet thicknesses and material types in a single layout pass. The engine handles plywood, MDF, particle board, and melamine simultaneously.</p></div>
                </article>
                <article className="clg-feature-card">
                  <div className="clg-icon-box"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true" width="22" height="22"><path d="M12 3 4 7l8 4 8-4-8-4Zm-8 8 8 4 8-4M4 15l8 4 8-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></div>
                  <div><h3>Grain Direction Awareness</h3><p>Respect wood grain orientation for visible panels. The nesting engine intelligently aligns parts for consistent grain flow.</p></div>
                </article>
                <article className="clg-feature-card">
                  <div className="clg-icon-box"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true" width="22" height="22"><path d="M7 3h8l4 4v14H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="2"/><path d="M14 3v5h5M8 13h8M8 17h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg></div>
                  <div><h3>Financial Reporting</h3><p>Get a complete cost breakdown: raw sheet totals, hardware unit costs, estimated assembly time, and final quote matrix for client proposals.</p></div>
                </article>
                <article className="clg-feature-card">
                  <div className="clg-icon-box"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true" width="22" height="22"><path d="M19 5 5 19M7.5 8.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm9 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg></div>
                  <div><h3>Waste Tracking</h3><p>Every layout includes detailed scrap metrics. Track yield percentages, remnant management, and cost impact of waste across your projects.</p></div>
                </article>
              </div>
            </div>
          </section>

          <div className="container" id="start">
            <div className="clg-cta-panel">
              <h2>Start Saving on Material Costs Today</h2>
              <p>Free tier includes full nesting optimization. See how much you can save on your next cabinet project before committing to production.</p>
              <button className="clg-btn clg-btn-cta" onClick={onGetStarted}>Try the Optimizer Free →</button>
            </div>
          </div>
        </main>

        <footer className="clg-footer">
          <div className="container clg-footer-inner">
            <Link to="/" className="clg-brand">
              <svg viewBox="0 0 42 42" width="28" height="28" aria-hidden="true"><path d="M21 4 35 12v7.5L21 11.4 7 19.5V12L21 4Z" fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" opacity=".88"/><path d="M35 22.5 21 30.6 7 22.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" opacity=".88"/><path d="M35 14.5 21 22.6 7 14.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" opacity=".5"/></svg>
              CabEngine
            </Link>
            <div className="clg-footer-links">
              <Link to="/docs">Docs</Link>
              <Link to="/terms">Terms</Link>
              <Link to="/pricing">Pricing</Link>
            </div>
            <span>&copy; {new Date().getFullYear()} CabEngine. Cabinet design, cut lists, and sheet optimization.</span>
          </div>
        </footer>

        <a className="clg-help-btn" href="/docs"><span>Need help?</span><span className="clg-help-q">?</span></a>

        <style>{`
          .clg-page {
            font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            background:
              radial-gradient(circle at 12% 6%, rgba(var(--wood-walnut-rgb), 0.24), transparent 30%),
              radial-gradient(circle at 84% 12%, rgba(var(--brass-rgb), 0.16), transparent 25%),
              radial-gradient(circle at 52% -4%, rgba(var(--sage-rgb), 0.10), transparent 30%),
              linear-gradient(180deg, var(--bg-950), var(--bg-900) 42%, var(--bg-950) 100%);
            color: var(--text);
            min-height: 100vh;
          }
          .clg-page::before {
            content: "";
            position: fixed;
            inset: 0;
            pointer-events: none;
            z-index: -2;
            background-image: linear-gradient(var(--grid-line) 1px, transparent 1px), linear-gradient(90deg, var(--grid-line) 1px, transparent 1px);
            background-size: 72px 72px;
            mask-image: linear-gradient(to bottom, rgba(0,0,0,.9), transparent 78%);
          }
          .clg-page::after {
            content: "";
            position: fixed;
            inset: auto -10% -22% -10%;
            height: 420px;
            z-index: -1;
            pointer-events: none;
            background: radial-gradient(circle, rgba(var(--brass-rgb), 0.12), transparent 68%);
            filter: blur(24px);
          }
          .clg-page a { color: inherit; text-decoration: none; }
          .container { width: min(var(--max), calc(100% - 40px)); margin-inline: auto; }

          .clg-hero { position: relative; padding: 88px 0 62px; }
          .clg-hero-grid { display: grid; grid-template-columns: minmax(0, 0.95fr) minmax(420px, 1.05fr); gap: 54px; align-items: center; }
          .clg-eyebrow {
            width: fit-content; display: inline-flex; align-items: center; gap: 9px;
            padding: 8px 13px; border-radius: 999px;
            border: 1px solid rgba(var(--brass-rgb), 0.40);
            background: rgba(var(--wood-walnut-rgb), 0.16);
            color: var(--amber-light); font-weight: 900; font-size: 12px; letter-spacing: 0.02em;
            margin-bottom: 24px;
          }
          .clg-hero h1 { font-size: clamp(44px, 6.8vw, 78px); line-height: 0.94; letter-spacing: -0.075em; margin-bottom: 24px; max-width: 780px; }
          .clg-gradient-text { background: linear-gradient(135deg, var(--amber-light), var(--brass) 52%, var(--wood-oak)); -webkit-background-clip: text; background-clip: text; color: transparent; }
          .clg-hero-copy { color: var(--soft); font-size: 18px; line-height: 1.75; max-width: 610px; margin-bottom: 30px; }
          .clg-hero-actions { display: flex; flex-wrap: wrap; gap: 14px; margin-bottom: 22px; }
          .clg-btn {
            display: inline-flex; align-items: center; justify-content: center; gap: 10px;
            min-height: 46px; padding: 0 20px; border-radius: 13px; border: 1px solid transparent;
            font-weight: 900; font-size: 14px; cursor: pointer;
            transition: transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease, border-color 0.18s ease;
            white-space: nowrap; font-family: inherit;
          }
          .clg-btn:hover { transform: translateY(-2px); }
          .clg-btn-primary { color: var(--ink); background: linear-gradient(135deg, var(--brass), var(--amber) 72%); box-shadow: 0 16px 36px rgba(var(--amber-rgb), 0.30); }
          .clg-btn-primary:hover { box-shadow: 0 20px 48px rgba(var(--amber-rgb), 0.40); }
          .clg-btn-ghost { background: rgba(var(--slate-400-rgb), 0.08); border-color: rgba(var(--slate-400-rgb), 0.13); color: var(--soft); }
          .clg-btn-ghost:hover { background: rgba(var(--slate-400-rgb), 0.13); color: var(--text); }
          .clg-trust-row { display: flex; flex-wrap: wrap; gap: 13px; align-items: center; color: var(--muted); font-size: 13px; }
          .clg-trust-pill { display: inline-flex; align-items: center; gap: 8px; }
          .clg-trust-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--sage); box-shadow: 0 0 0 rgba(var(--sage-rgb), 0.55); animation: clgPulse 1.8s infinite; }
          @keyframes clgPulse { 0%{box-shadow:0 0 0 0 rgba(var(--sage-rgb), 0.55)} 70%{box-shadow:0 0 0 10px rgba(var(--sage-rgb),0)} 100%{box-shadow:0 0 0 0 rgba(var(--sage-rgb),0)} }

          .clg-hero-visual { position: relative; min-height: 560px; display: grid; place-items: center; }
          .clg-orb { position: absolute; width: 460px; height: 460px; border-radius: 50%; background: radial-gradient(circle, rgba(var(--brass-rgb), 0.22), transparent 66%); filter: blur(10px); animation: clgFloat 7s ease-in-out infinite; }
          @keyframes clgFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-16px)} }
          .clg-optimizer-window {
            position: relative; width: min(100%, 660px);
            border-radius: 26px; overflow: hidden;
            background: rgba(var(--slate-950-rgb), 0.72);
            border: 1px solid rgba(var(--slate-400-rgb), 0.18);
            box-shadow: var(--shadow), 0 0 0 1px rgba(var(--white-rgb), 0.03) inset;
            transform: perspective(1100px) rotateY(-6deg) rotateX(3deg);
          }
          .clg-window-top { height: 48px; display: flex; align-items: center; justify-content: space-between; padding: 0 16px; border-bottom: 1px solid rgba(var(--slate-400-rgb), 0.12); background: rgba(var(--slate-950-rgb), 0.42); }
          .clg-dots { display: flex; gap: 7px; }
          .clg-dot { width: 10px; height: 10px; border-radius: 999px; background: var(--slate-600); }
          .clg-dot:nth-child(1){background:var(--pink)} .clg-dot:nth-child(2){background:var(--yellow)} .clg-dot:nth-child(3){background:var(--sage)}
          .clg-window-title { color: var(--muted); font-size: 12px; font-weight: 900; letter-spacing: 0.05em; text-transform: uppercase; }
          .clg-live-chip { padding: 5px 8px; border-radius: 999px; background: rgba(var(--sage-rgb), 0.12); color: var(--sage); border: 1px solid rgba(var(--sage-rgb), 0.28); font-size: 10px; font-weight: 950; }
          .clg-optimizer-body { display: grid; grid-template-columns: 1fr 214px; min-height: 430px; }
          .clg-sheet-canvas { position: relative; padding: 24px; overflow: hidden; background: radial-gradient(circle at 50% 42%, rgba(var(--wood-oak-rgb), 0.13), transparent 38%), linear-gradient(135deg, rgba(var(--slate-900-rgb), 0.88), rgba(var(--bg-950), 0.98)); }
          .clg-sheet-canvas::before { content: ""; position: absolute; inset: 0; background-image: linear-gradient(rgba(var(--slate-400-rgb), 0.055) 1px, transparent 1px), linear-gradient(90deg, rgba(var(--slate-400-rgb), 0.055) 1px, transparent 1px); background-size: 28px 28px; opacity: 0.8; }
          .clg-sheet { position: relative; z-index: 1; height: 360px; border-radius: 20px; padding: 16px; background: linear-gradient(135deg, rgba(var(--wood-oak-rgb), 0.24), rgba(var(--wood-walnut-rgb), 0.09)); border: 1px solid rgba(var(--brass-rgb), 0.36); box-shadow: 0 20px 54px rgba(0,0,0,0.28), inset 0 0 0 1px rgba(var(--white-rgb), 0.05); display: grid; grid-template-columns: 1.1fr 0.76fr 0.6fr; grid-template-rows: repeat(5, 1fr); gap: 9px; }
          .clg-part { border-radius: 10px; border: 1px solid rgba(var(--brass-rgb), 0.26); background: linear-gradient(135deg, rgba(var(--wood-oak-rgb), 0.34), rgba(var(--wood-walnut-rgb), 0.64)), repeating-linear-gradient(90deg, transparent 0 8px, rgba(var(--white-rgb), 0.035) 8px 9px); box-shadow: inset 0 0 0 1px rgba(var(--white-rgb), 0.04); position: relative; overflow: hidden; }
          .clg-part::after { content: attr(data-label); position: absolute; left: 10px; top: 8px; color: rgba(var(--cream-rgb), 0.78); font-size: 10px; font-weight: 900; }
          .clg-p1 { grid-row: span 2; } .clg-p2 { grid-row: span 3; } .clg-p3 { grid-row: span 2; } .clg-p4 { grid-column: span 1; } .clg-p5 { grid-column: span 2; } .clg-p6 { grid-row: span 2; } .clg-p8 { background: rgba(var(--sage-rgb), 0.14); border-style: dashed; }
          .clg-scan-line { position: absolute; z-index: 3; left: 22px; right: 22px; height: 2px; top: 32%; background: linear-gradient(90deg, transparent, rgba(var(--brass-rgb), 0.98), transparent); filter: drop-shadow(0 0 12px rgba(var(--brass-rgb), 0.68)); animation: clgScan 3.4s ease-in-out infinite; }
          @keyframes clgScan { 0%,100%{top:18%;opacity:.25} 45%{opacity:1} 72%{top:82%;opacity:.55} }
          .clg-canvas-badge { position: absolute; z-index: 4; left: 36px; bottom: 34px; padding: 11px 13px; border-radius: 14px; background: rgba(var(--slate-950-rgb), 0.72); border: 1px solid rgba(var(--slate-400-rgb), 0.16); backdrop-filter: blur(14px); font-size: 12px; color: var(--soft); box-shadow: 0 18px 40px rgba(0,0,0,0.28); }
          .clg-canvas-badge strong { display: block; color: var(--text); margin-bottom: 3px; }
          .clg-side-panel { border-left: 1px solid rgba(var(--slate-400-rgb), 0.12); background: rgba(var(--slate-950-rgb), 0.30); padding: 17px; }
          .clg-panel-heading { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; font-size: 13px; font-weight: 950; }
          .clg-stat-list { display: grid; gap: 9px; margin-bottom: 16px; }
          .clg-stat-row { padding: 11px; border-radius: 12px; background: rgba(var(--slate-400-rgb), 0.07); border: 1px solid rgba(var(--slate-400-rgb), 0.09); }
          .clg-stat-row span { display: block; color: var(--muted); font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 5px; }
          .clg-stat-row strong { color: var(--text); font-size: 16px; }
          .clg-export-box { padding: 14px; border-radius: 16px; background: linear-gradient(135deg, rgba(var(--wood-walnut-rgb), 0.26), rgba(var(--brass-rgb), 0.11)); border: 1px solid rgba(var(--brass-rgb), 0.32); }
          .clg-export-box strong { display: block; font-size: 13px; margin-bottom: 10px; }
          .clg-chips { display: flex; flex-wrap: wrap; gap: 7px; }
          .clg-chip { font-size: 10px; font-weight: 950; padding: 6px 8px; border-radius: 8px; background: rgba(var(--white-rgb), 0.08); color: var(--amber-light); border: 1px solid rgba(var(--white-rgb), 0.10); }

          .clg-floating-note { position: absolute; z-index: 5; padding: 13px 14px; border-radius: 16px; background: rgba(var(--bg-850), 0.78); backdrop-filter: blur(14px); border: 1px solid rgba(var(--slate-400-rgb), 0.17); box-shadow: 0 18px 46px rgba(0,0,0,0.30); animation: clgFloat 6s ease-in-out infinite; }
          .clg-floating-note strong { display: block; font-size: 13px; }
          .clg-floating-note small { display: block; color: var(--muted); margin-top: 4px; font-size: 11px; }
          .clg-note-a { top: 86px; left: -12px; }
          .clg-note-b { right: -14px; bottom: 74px; animation-delay: -2s; }

          .clg-metric-strip { padding: 28px 0; border-top: 1px solid rgba(var(--slate-400-rgb), 0.08); border-bottom: 1px solid rgba(var(--slate-400-rgb), 0.08); background: rgba(var(--bg-850), 0.32); backdrop-filter: blur(18px); }
          .clg-metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }
          .clg-metric-card, .clg-step-card, .clg-feature-card { position: relative; border: 1px solid var(--border); background: var(--card); border-radius: var(--radius-md); box-shadow: 0 20px 60px rgba(0,0,0,0.18); overflow: hidden; }
          .clg-metric-card::before, .clg-step-card::before, .clg-feature-card::before { content: ""; position: absolute; inset: -1px; background: radial-gradient(circle at 18% 0%, rgba(var(--brass-rgb), 0.20), transparent 36%); opacity: 0; transition: opacity 0.2s ease; pointer-events: none; }
          .clg-metric-card:hover::before, .clg-step-card:hover::before, .clg-feature-card:hover::before { opacity: 1; }
          .clg-metric-card { padding: 25px; text-align: center; transition: transform 0.22s ease, border-color 0.22s ease, background 0.22s ease; }
          .clg-metric-card:hover { transform: translateY(-6px); border-color: rgba(var(--brass-rgb), 0.34); background: var(--card-strong); }
          .clg-metric-value { color: var(--amber); font-size: 40px; line-height: 1; font-weight: 950; letter-spacing: -0.045em; margin-bottom: 9px; }
          .clg-metric-card h3 { font-size: 14px; margin-bottom: 5px; }
          .clg-metric-card p { color: var(--muted); font-size: 12px; line-height: 1.55; }

          .clg-page section { padding: 88px 0; }
          .clg-section-heading { text-align: center; max-width: 750px; margin: 0 auto 46px; }
          .clg-section-heading h2 { font-size: clamp(30px, 4vw, 48px); line-height: 1.05; letter-spacing: -0.045em; margin-bottom: 14px; }
          .clg-section-heading p { color: var(--muted); font-size: 16px; line-height: 1.7; }
          .clg-steps-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px; }
          .clg-step-card { min-height: 210px; padding: 24px; transition: transform 0.22s ease, border-color 0.22s ease; }
          .clg-step-card:hover { transform: translateY(-7px); border-color: rgba(var(--brass-rgb), 0.34); }
          .clg-step-number { width: 42px; height: 42px; display: grid; place-items: center; border-radius: 14px; background: linear-gradient(135deg, var(--brass), var(--wood-walnut)); color: var(--ink); font-weight: 950; box-shadow: 0 14px 28px rgba(var(--brass-rgb), 0.22); margin-bottom: 20px; }
          .clg-step-card h3 { font-size: 17px; margin-bottom: 10px; }
          .clg-step-card p { color: var(--muted); font-size: 13px; line-height: 1.65; }

          .clg-feature-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
          .clg-feature-card { padding: 26px; display: flex; gap: 18px; transition: transform 0.22s ease, border-color 0.22s ease, background 0.22s ease; }
          .clg-feature-card:hover { transform: translateY(-7px); border-color: rgba(var(--brass-rgb), 0.34); background: var(--card-strong); }
          .clg-icon-box { width: 48px; height: 48px; flex: 0 0 auto; display: grid; place-items: center; border-radius: 15px; background: rgba(var(--brass-rgb), 0.14); border: 1px solid rgba(var(--brass-rgb), 0.24); color: var(--amber-light); }
          .clg-feature-card h3 { font-size: 17px; margin-bottom: 8px; }
          .clg-feature-card p { color: var(--muted); font-size: 13px; line-height: 1.7; }

          .clg-cta-panel {
            position: relative; margin: 0 auto 86px; padding: 48px;
            border-radius: var(--radius-lg); text-align: center;
            overflow: hidden; border: 1px solid rgba(var(--brass-rgb), 0.24);
            background: radial-gradient(circle at 50% 0%, rgba(var(--white-rgb), 0.18), transparent 33%), linear-gradient(135deg, rgba(var(--sage-rgb), 0.98), rgba(var(--olive-rgb), 0.90) 48%, rgba(var(--wood-dark-rgb), 0.92));
            box-shadow: var(--shadow);
          }
          .clg-cta-panel::after { content: ""; position: absolute; inset: 0; background-image: linear-gradient(rgba(var(--white-rgb), 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(var(--white-rgb), 0.05) 1px, transparent 1px); background-size: 40px 40px; opacity: 0.26; pointer-events: none; }
          .clg-cta-panel > * { position: relative; z-index: 1; }
          .clg-cta-panel h2 { font-size: clamp(30px, 4vw, 44px); line-height: 1.05; letter-spacing: -0.045em; margin-bottom: 14px; color: var(--white); }
          .clg-cta-panel p { max-width: 660px; margin: 0 auto 26px; color: rgba(255,255,255,0.82); line-height: 1.7; }
          .clg-btn-cta { background: var(--white); color: #0f5138; box-shadow: 0 16px 36px rgba(0,0,0,0.18); }

          .clg-footer { border-top: 1px solid rgba(var(--slate-400-rgb), 0.08); background: rgba(var(--bg-950), 0.72); padding: 28px 0; }
          .clg-footer-inner { display: flex; justify-content: space-between; align-items: center; gap: 18px; color: var(--muted); font-size: 13px; }
          .clg-brand { display: flex; align-items: center; gap: 8px; font-weight: 900; font-size: 15px; color: var(--text); }
          .clg-footer-links { display: flex; gap: 20px; color: var(--soft); font-weight: 700; }
          .clg-footer-links a { transition: color 0.18s ease; }
          .clg-footer-links a:hover { color: var(--text); }

          .clg-help-btn { position: fixed; right: 22px; bottom: 22px; z-index: 70; display: inline-flex; align-items: center; gap: 10px; height: 48px; padding: 0 15px 0 17px; border-radius: 999px; background: rgba(var(--amber-rgb), 0.96); color: var(--ink); font-weight: 950; font-size: 12px; box-shadow: 0 16px 42px rgba(var(--amber-rgb), 0.32); border: 1px solid rgba(var(--white-rgb), 0.22); }
          .clg-help-btn .clg-help-q { width: 28px; height: 28px; border-radius: 50%; display: grid; place-items: center; background: rgba(var(--white-rgb), 0.18); }

          .lp-light-theme .clg-page {
            background:
              radial-gradient(circle at 12% 6%, rgba(var(--wood-walnut-rgb), 0.16), transparent 30%),
              radial-gradient(circle at 84% 12%, rgba(var(--brass-rgb), 0.12), transparent 25%),
              radial-gradient(circle at 52% -4%, rgba(var(--sage-rgb), 0.07), transparent 30%),
              linear-gradient(180deg, var(--bg-950), var(--bg-900) 42%, var(--bg-950) 100%);
          }
          .lp-light-theme .clg-eyebrow { color: #7A4E16; background: rgba(var(--off-white-rgb), 0.82); border: 1px solid rgba(var(--brass-rgb), 0.32); }
          .lp-light-theme .clg-gradient-text { background: linear-gradient(135deg, #9B641E, #C7821C 52%, var(--wood-walnut)); -webkit-background-clip: text; background-clip: text; color: transparent; }
          .lp-light-theme .clg-btn-primary { color: var(--ink); }
          .lp-light-theme .clg-btn-ghost { background: rgba(92, 61, 37, 0.08); border-color: rgba(92, 61, 37, 0.13); color: var(--soft); }
          .lp-light-theme .clg-btn-ghost:hover { background: rgba(92, 61, 37, 0.13); color: var(--text); }
          .lp-light-theme .clg-optimizer-window { background: rgba(var(--off-white-rgb), 0.88); border: 1px solid rgba(92, 61, 37, 0.16); }
          .lp-light-theme .clg-window-top { background: rgba(255, 249, 240, 0.82); border-bottom: 1px solid rgba(92, 61, 37, 0.12); }
          .lp-light-theme .clg-window-title { color: var(--muted); }
          .lp-light-theme .clg-live-chip { background: rgba(var(--sage-rgb), 0.12); color: var(--sage); border: 1px solid rgba(var(--sage-rgb), 0.28); }
          .lp-light-theme .clg-chip { background: rgba(92, 61, 37, 0.10); color: #7A4E16; border: 1px solid rgba(92, 61, 37, 0.18); }
          .lp-light-theme .clg-sheet-canvas { background: radial-gradient(circle at 50% 42%, rgba(var(--wood-oak-rgb), 0.10), transparent 38%), linear-gradient(135deg, rgba(var(--off-white-rgb), 0.88), rgba(var(--bg-900), 0.96)); }
          .lp-light-theme .clg-sheet { background: linear-gradient(135deg, rgba(var(--wood-oak-rgb), 0.18), rgba(var(--wood-walnut-rgb), 0.06)); border: 1px solid rgba(var(--brass-rgb), 0.28); }
          .lp-light-theme .clg-part { background: linear-gradient(135deg, rgba(var(--wood-oak-rgb), 0.28), rgba(var(--wood-walnut-rgb), 0.52)), repeating-linear-gradient(90deg, transparent 0 8px, rgba(0,0,0,0.025) 8px 9px); }
          .lp-light-theme .clg-part::after { color: rgba(64, 43, 25, 0.70); }
          .lp-light-theme .clg-canvas-badge { background: rgba(var(--off-white-rgb), 0.82); border: 1px solid rgba(92, 61, 37, 0.14); color: var(--soft); }
          .lp-light-theme .clg-side-panel { border-left: 1px solid rgba(92, 61, 37, 0.10); background: rgba(var(--off-white-rgb), 0.30); }
          .lp-light-theme .clg-stat-row { background: rgba(92, 61, 37, 0.06); border: 1px solid rgba(92, 61, 37, 0.08); }
          .lp-light-theme .clg-export-box { background: linear-gradient(135deg, rgba(var(--wood-walnut-rgb), 0.18), rgba(var(--brass-rgb), 0.08)); border: 1px solid rgba(var(--brass-rgb), 0.24); }
          .lp-light-theme .clg-floating-note { background: rgba(var(--off-white-rgb), 0.88); border: 1px solid rgba(92, 61, 37, 0.14); }
          .lp-light-theme .clg-metric-strip { background: rgba(var(--bg-800), 0.40); border-top: 1px solid rgba(92, 61, 37, 0.10); border-bottom: 1px solid rgba(92, 61, 37, 0.10); }
          .lp-light-theme .clg-metric-card, .lp-light-theme .clg-step-card, .lp-light-theme .clg-feature-card { background: var(--card-strong); border: 1px solid var(--border); box-shadow: 0 18px 50px rgba(64, 43, 25, 0.10), inset 0 1px 0 rgba(var(--white-rgb), 0.72); }
          .lp-light-theme .clg-step-number { color: #1B1207; }
          .lp-light-theme .clg-icon-box { background: rgba(var(--brass-rgb), 0.11); border: 1px solid rgba(var(--brass-rgb), 0.20); color: #9B641E; }
          .lp-light-theme .clg-cta-panel { background: radial-gradient(circle at 50% 0%, rgba(255, 255, 255, 0.22), transparent 36%), linear-gradient(135deg, rgba(var(--sage-rgb), 0.98), rgba(var(--olive-rgb), 0.90) 48%, rgba(var(--wood-dark-rgb), 0.92)); }
          .lp-light-theme .clg-footer { background: rgba(var(--off-white-rgb), 0.82); }
          .lp-light-theme .clg-help-btn { background: rgba(var(--amber-rgb), 0.96); }

          @media (max-width: 1060px) {
            .clg-hero-grid { grid-template-columns: 1fr; }
            .clg-hero-visual { min-height: 520px; }
            .clg-optimizer-window { transform: none; }
            .clg-steps-grid { grid-template-columns: repeat(2, 1fr); }
          }
          @media (max-width: 820px) {
            .container { width: min(100% - 28px, var(--max)); }
            .clg-hero { padding-top: 56px; }
            .clg-hero-actions { flex-direction: column; align-items: stretch; }
            .clg-btn { width: 100%; }
            .clg-metrics, .clg-feature-grid { grid-template-columns: 1fr; }
            .clg-optimizer-body { grid-template-columns: 1fr; }
            .clg-side-panel { display: none; }
            .clg-floating-note { display: none; }
            .clg-footer-inner { flex-direction: column; align-items: flex-start; }
            .clg-help-btn span { display: none; }
            .clg-help-btn { width: 48px; justify-content: center; padding: 0; }
          }
          @media (max-width: 560px) {
            .clg-steps-grid { grid-template-columns: 1fr; }
            .clg-hero-visual { min-height: 420px; }
            .clg-sheet { height: 300px; }
            .clg-cta-panel { padding: 34px 22px; }
          }
          @media (prefers-reduced-motion: reduce) {
            .clg-page *, .clg-page *::before, .clg-page *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; scroll-behavior: auto !important; transition-duration: 0.01ms !important; }
          }
        `}</style>
      </div>
    </>
  );
};
