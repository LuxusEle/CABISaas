import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { LandingHeader } from './LandingHeader';
import { Link } from 'react-router-dom';
import { ManualCabinetScene } from './ManualCabinetScene';
import { TestingSettings, DEFAULT_SETTINGS } from './CabinetTestingUtils';

const INITIAL_SETTINGS: TestingSettings = {
  ...DEFAULT_SETTINGS,
  showDifferentPanelColors: true,
};

interface ManualCabinetSoftwarePageProps {
  onSignIn: () => void;
  onGetStarted: () => void;
  onQuickStart?: () => void;
  isDark: boolean;
  setIsDark: (isDark: boolean) => void;
}

export const ManualCabinetSoftwarePage: React.FC<ManualCabinetSoftwarePageProps> = ({
  onSignIn,
  onGetStarted,
  onQuickStart,
  isDark,
  setIsDark
}) => {
  const [interactiveSettings, setInteractiveSettings] = useState<TestingSettings>(INITIAL_SETTINGS);
  const [slidersUnused, setSlidersUnused] = useState(true);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  useEffect(() => {
    const els = document.querySelectorAll('.mcs-reveal');
    if (!els.length) return;
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('mcs-visible'); obs.unobserve(e.target); } });
    }, { threshold: 0.12 });
    els.forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  const updateSetting = <K extends keyof TestingSettings>(key: K, value: TestingSettings[K]) => {
    setSlidersUnused(false);
    setInteractiveSettings(prev => {
      const next = { ...prev, [key]: value };
      if (key === 'depth') next.shelfDepth = (value as number) - prev.panelThickness - prev.backPanelThickness;
      return next;
    });
  };

  const { width, height, depth, panelThickness, doorOpenAngle, skeletonView, opacity } = interactiveSettings;

  return (
    <>
      <Helmet>
        <title>Manual Cabinet Layout Software | Full Control Cabinet Design | CabEngine Pro</title>
        <link rel="canonical" href="https://www.protradee.com/manual-cabinet-software" />
        <meta name="description" content="Manual cabinet layout software with full geometric override. No auto-solver lock-in. Design custom cabinet boxes, set exact dimensions, and generate cut lists on your terms." />
      </Helmet>
      <div className={`mcs-page ${isDark ? 'lp-dark-theme' : 'lp-light-theme'}`}>
        <LandingHeader onSignIn={onSignIn} onGetStarted={onGetStarted} isDark={isDark} setIsDark={setIsDark} />

        <main id="top">
          <header className="mcs-hero mcs-reveal">
            <div className="container">
              <div className="mcs-eyebrow">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" width="14" height="14"><path d="M12 3 4.5 7.2v8.6L12 20l7.5-4.2V7.2L12 3Z" stroke="currentColor" strokeWidth="1.7" /><path d="M12 7v10M8 9.5l8 5M16 9.5l-8 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
                Advanced Direct Entry Mode
              </div>
              <h1>Full Control Cabinet Design — <span className="mcs-gradient-text">No Auto-Layout Lock-In</span></h1>
              <p className="mcs-hero-copy">Veteran woodworkers and custom cabinet builders deserve complete control. Set every dimension manually. Override any parameter. Your design, your rules.</p>
              <div className="mcs-hero-actions">
                <button className="mcs-btn mcs-btn-primary" onClick={onGetStarted}>Start Building Free</button>
                <button className="mcs-btn mcs-btn-ghost" onClick={onQuickStart}>Try Live Demo</button>
              </div>
            </div>
          </header>

          <div className="container">
            <div className="mcs-mockup-panel mcs-reveal" aria-label="Cabinet direct entry interface mockup">
              <div className="mcs-mockup-top">
                <div className="mcs-dots"><span className="mcs-dot"></span><span className="mcs-dot"></span><span className="mcs-dot"></span></div>
                <span className="mcs-mode-pill">Direct Entry Active</span>
              </div>
              <div className="mcs-mockup-body">
                <div className="mcs-cabinet-preview">
                  <span className="mcs-dimension-tag mcs-tag-a">W {width} × H {height}</span>
                  <span className="mcs-dimension-tag mcs-tag-b">Side {panelThickness}mm · Door {doorOpenAngle}°</span>
                  <ManualCabinetScene settings={interactiveSettings} />
                </div>
                <div className="mcs-side-form">
                    <div className="mcs-slider-field">
                    <span>Width</span>
                    <strong>{width} mm</strong>
                    <div className="mcs-slider-track-wrap">
                      <input type="range" min="300" max="1200" value={width} onChange={e => updateSetting('width', Number(e.target.value))} className="mcs-slider" />
                      {slidersUnused && (
                        <svg className="mcs-hand-anim" viewBox="0 0 32 32" width="22" height="22" fill="none" aria-hidden="true" style={{ '--hand-start': `${((width - 300) / 900) * 100}%` } as React.CSSProperties}>
                          <path d="M8 20V6a2 2 0 0 1 4 0v10m0-10V4a2 2 0 0 1 4 0v10m0-10V6a2 2 0 0 1 4 0v12l2-2a4 4 0 0 1 6 6l-4 6a8 8 0 0 1-6.5 3.5H18a6 6 0 0 1-4.5-2L8 24" stroke="var(--hand-stroke, var(--amber))" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="var(--hand-fill, rgba(var(--amber-rgb), 0.15))"/>
                        </svg>
                      )}
                    </div>
                  </div>
                  <div className="mcs-slider-field">
                    <span>Height</span>
                    <strong>{height} mm</strong>
                    <input type="range" min="400" max="1500" value={height} onChange={e => updateSetting('height', Number(e.target.value))} className="mcs-slider" />
                  </div>
                  <div className="mcs-slider-field">
                    <span>Depth</span>
                    <strong>{depth} mm</strong>
                    <input type="range" min="200" max="800" value={depth} onChange={e => updateSetting('depth', Number(e.target.value))} className="mcs-slider" />
                  </div>
                  <div className="mcs-slider-field">
                    <span>Door Open</span>
                    <strong>{doorOpenAngle}°</strong>
                    <input type="range" min="0" max="90" value={doorOpenAngle} onChange={e => updateSetting('doorOpenAngle', Number(e.target.value))} className="mcs-slider" />
                  </div>
                  <label className="mcs-toggle-field">
                    <span>Skeleton View</span>
                    <div className="mcs-toggle-track">
                      <input type="checkbox" checked={skeletonView} onChange={e => updateSetting('skeletonView', e.target.checked)} />
                      <span className="mcs-toggle-thumb"></span>
                    </div>
                  </label>
                  <label className="mcs-toggle-field">
                    <span>Transparent</span>
                    <div className="mcs-toggle-track">
                      <input type="checkbox" checked={opacity < 1} onChange={e => updateSetting('opacity', e.target.checked ? 0.5 : 1)} />
                      <span className="mcs-toggle-thumb"></span>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <section className="mcs-comparison-section mcs-reveal">
            <div className="container">
              <div className="mcs-comparison-shell">
                <div className="mcs-table-head">
                  <div>
                    <h2>Auto Mode vs Advanced Direct Entry</h2>
                    <span>Use Auto Mode for speed. Use Direct Entry when every millimetre matters.</span>
                  </div>
                  <span className="mcs-mode-pill">Professional manual control</span>
                </div>
                <div className="mcs-table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Feature</th>
                        <th>Auto Mode Standard</th>
                        <th className="mcs-th-highlight">Advanced Direct Entry</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr><td>Cabinet Dimensions</td><td>Auto-calculated from room size</td><td className="mcs-td-highlight">Full manual override per cabinet</td></tr>
                      <tr><td>Carcass Side Thickness</td><td>Standard preset only</td><td className="mcs-td-highlight">Any thickness, any material</td></tr>
                      <tr><td>Door Overlay Tolerance</td><td>Fixed values</td><td className="mcs-td-highlight">Custom overlay and reveal settings</td></tr>
                      <tr><td>Drawer Box Depths</td><td>Predefined options</td><td className="mcs-td-highlight">Any depth, any configuration</td></tr>
                      <tr><td>Back Panel Channel</td><td>Default channel size</td><td className="mcs-td-highlight">Custom groove depth and position</td></tr>
                      <tr><td>Toe Kick Height</td><td>Standard 4" default</td><td className="mcs-td-highlight">Any height, any offset</td></tr>
                      <tr><td>Corner Cabinet Geometry</td><td>Auto-generated</td><td className="mcs-td-highlight">Custom angled and blind corner specs</td></tr>
                      <tr><td>Cut List Generation</td><td>Standard layout</td><td className="mcs-td-highlight">Custom cut list with full part control</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </section>

          <section className="mcs-cards-section" id="features">
            <div className="container">
              <div className="mcs-feature-grid mcs-reveal">
                <article className="mcs-feature-card mcs-reveal mcs-reveal-delay-1">
                  <div className="mcs-icon-box"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true" width="22" height="22"><path d="M4 17 17 4l3 3L7 20H4v-3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /><path d="m14 7 3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg></div>
                  <h3>Precise Dimensional Input</h3>
                  <p>Enter exact values for width, height, depth, and material thickness. Down to the millimetre.</p>
                </article>
                <article className="mcs-feature-card mcs-reveal mcs-reveal-delay-2">
                  <div className="mcs-icon-box"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true" width="22" height="22"><path d="M7 4v16M17 4v16M4 8h6M14 8h6M4 16h6M14 16h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg></div>
                  <h3>Complete Geometric Override</h3>
                  <p>Override any automatic calculation. Perfect for complex blind panels, service voids, and custom joinery.</p>
                </article>
                <article className="mcs-feature-card mcs-reveal mcs-reveal-delay-3">
                  <div className="mcs-icon-box"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true" width="22" height="22"><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L4 17v3h3l5.3-5.3a4 4 0 0 0 5.4-5.4l-3 3-3-3 3-3Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /></svg></div>
                  <h3>Custom Hardware Integration</h3>
                  <p>Fine-tune hardware placement, hinge boring, and drawer slide mounting for any system.</p>
                </article>
                <article className="mcs-feature-card mcs-reveal mcs-reveal-delay-4">
                  <div className="mcs-icon-box"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true" width="22" height="22"><path d="m5 12 4 4L19 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
                  <h3>No Auto-Solver Required</h3>
                  <p>Work entirely in manual mode. The auto-layout is optional — you stay in complete control.</p>
                </article>
              </div>
            </div>
          </section>

          <section className="mcs-visual-section">
            <div className="container mcs-visual-grid mcs-reveal">
              <div className="mcs-control-panel">
                <div className="mcs-eyebrow" style={{ marginBottom: '18px' }}>Builder-first workflow</div>
                <h2>Manual controls for cabinet makers who demand control.</h2>
                <p>Advanced Direct Entry Mode is built for real workshop decisions: unusual site measurements, non-standard panels, edge cases, angled units, and client-specific construction methods.</p>
                <ul className="mcs-check-list">
                  <li>Input non-standard measurements without fighting the auto-layout engine.</li>
                  <li>Control construction parameters cabinet-by-cabinet instead of globally.</li>
                  <li>Generate cut lists from your chosen values, not guessed defaults.</li>
                  <li>Keep Auto Mode available when speed matters, then switch to manual when precision matters.</li>
                </ul>
              </div>

              <div className="mcs-workflow-panel">
                <div className="mcs-mockup-top">
                  <div className="mcs-dots"><span className="mcs-dot"></span><span className="mcs-dot"></span><span className="mcs-dot"></span></div>
                  <span className="mcs-workflow-badge">Direct Entry Workflow</span>
                </div>
                <div className="mcs-workflow-body">
                  <div className="mcs-workflow-step mcs-step-done">
                    <span className="mcs-step-icon"><svg viewBox="0 0 20 20" width="16" height="16" fill="none"><circle cx="10" cy="10" r="8" stroke="var(--sage)" strokeWidth="1.5"/><path d="m6.5 10 2.5 2.5 4.5-4.5" stroke="var(--sage)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg></span>
                    <div className="mcs-step-info">
                      <span className="mcs-step-label">Cabinet Dimensions</span>
                      <span className="mcs-step-value">{width} × {height} × {depth} mm</span>
                    </div>
                    <span className="mcs-step-status mcs-status-complete">Complete</span>
                  </div>
                  <div className="mcs-workflow-step mcs-step-done">
                    <span className="mcs-step-icon"><svg viewBox="0 0 20 20" width="16" height="16" fill="none"><circle cx="10" cy="10" r="8" stroke="var(--sage)" strokeWidth="1.5"/><path d="m6.5 10 2.5 2.5 4.5-4.5" stroke="var(--sage)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg></span>
                    <div className="mcs-step-info">
                      <span className="mcs-step-label">Construction Rules</span>
                      <span className="mcs-step-value">Panel {panelThickness}mm · Toe 4"</span>
                    </div>
                    <span className="mcs-step-status mcs-status-complete">Complete</span>
                  </div>
                  <div className="mcs-workflow-step mcs-step-active">
                    <span className="mcs-step-icon mcs-icon-pulse"><svg viewBox="0 0 20 20" width="16" height="16" fill="none"><circle cx="10" cy="10" r="8" stroke="var(--amber)" strokeWidth="1.5"/><circle cx="10" cy="10" r="2" fill="var(--amber)"/></svg></span>
                    <div className="mcs-step-info">
                      <span className="mcs-step-label">Door Overlay</span>
                      <span className="mcs-step-value">{doorOpenAngle}° door open angle</span>
                    </div>
                    <span className="mcs-step-status mcs-status-editing">Editing</span>
                  </div>
                  <div className="mcs-workflow-step mcs-step-ready">
                    <span className="mcs-step-icon"><svg viewBox="0 0 20 20" width="16" height="16" fill="none"><circle cx="10" cy="10" r="8" stroke="var(--sage)" strokeWidth="1.5"/><path d="M14 8 9 13l-3-3" stroke="var(--sage)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg></span>
                    <div className="mcs-step-info">
                      <span className="mcs-step-label">Cut List Output</span>
                      <span className="mcs-step-value">7 parts · 2 sheets</span>
                    </div>
                    <span className="mcs-step-status mcs-status-ready">Ready</span>
                  </div>
                  <div className="mcs-workflow-step mcs-step-ready">
                    <span className="mcs-step-icon"><svg viewBox="0 0 20 20" width="16" height="16" fill="none"><circle cx="10" cy="10" r="8" stroke="var(--sage)" strokeWidth="1.5"/><path d="M14 8 9 13l-3-3" stroke="var(--sage)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg></span>
                    <div className="mcs-step-info">
                      <span className="mcs-step-label">Bill Of Materials</span>
                      <span className="mcs-step-value">32 line items</span>
                    </div>
                    <span className="mcs-step-status mcs-status-ready">Ready</span>
                  </div>
                  <div className="mcs-workflow-step mcs-step-ready">
                    <span className="mcs-step-icon"><svg viewBox="0 0 20 20" width="16" height="16" fill="none"><circle cx="10" cy="10" r="8" stroke="var(--sage)" strokeWidth="1.5"/><path d="M14 8 9 13l-3-3" stroke="var(--sage)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg></span>
                    <div className="mcs-step-info">
                      <span className="mcs-step-label">Quotation</span>
                      <span className="mcs-step-value">$1,280.00 estimate</span>
                    </div>
                    <span className="mcs-step-status mcs-status-ready">Ready</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="mcs-cta-section mcs-reveal" id="start">
            <div className="container">
              <div className="mcs-cta">
                <h2>Built for Cabinet Makers Who Demand Control</h2>
                <p>Stop fighting rigid auto-layout tools. Advanced Direct Entry Mode gives you the freedom to build exactly what your client needs.</p>
                <button className="mcs-btn mcs-btn-primary" onClick={onGetStarted}>Try Advanced Mode Free →</button>
              </div>
            </div>
          </section>
        </main>

        <footer className="mcs-footer mcs-reveal">
          <div className="container mcs-footer-inner">
            <Link to="/" className="mcs-brand">
              <svg viewBox="0 0 42 42" width="28" height="28" aria-hidden="true"><path d="M21 4 35 12v7.5L21 11.4 7 19.5V12L21 4Z" fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" opacity=".88" /><path d="M35 22.5 21 30.6 7 22.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" opacity=".88" /><path d="M35 14.5 21 22.6 7 14.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" opacity=".5" /></svg>
              CabEngine
            </Link>
            <div className="mcs-footer-links">
              <Link to="/docs">Docs</Link>
              <Link to="/terms">Terms</Link>
              <Link to="/pricing">Pricing</Link>
            </div>
            <span>&copy; {new Date().getFullYear()} CabEngine. Cabinet design, cut lists, and sheet optimization.</span>
          </div>
        </footer>

        <style>{`
          .mcs-page {
            font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            background:
              radial-gradient(circle at 16% 8%, rgba(var(--wood-walnut-rgb), 0.28), transparent 30%),
              radial-gradient(circle at 88% 18%, rgba(var(--brass-rgb), 0.15), transparent 28%),
              radial-gradient(circle at 50% 0%, rgba(var(--sage-rgb), 0.08), transparent 32%),
              linear-gradient(180deg, var(--bg-950), var(--bg-900) 42%, var(--bg-950) 100%);
            color: var(--text);
            min-height: 100vh;
          }
          .mcs-page::before {
            content: "";
            position: fixed;
            inset: 0;
            pointer-events: none;
            z-index: -2;
            background-image: linear-gradient(var(--grid-line) 1px, transparent 1px), linear-gradient(90deg, var(--grid-line) 1px, transparent 1px);
            background-size: 72px 72px;
            mask-image: linear-gradient(to bottom, rgba(0,0,0,.8), transparent 78%);
          }
          .mcs-page a { color: inherit; text-decoration: none; }
          .container { width: min(var(--max), calc(100% - 3.2vw)); margin-inline: auto; }

          .mcs-hero { padding: clamp(28px, 3.6vh, 50px) 0 clamp(32px, 4.2vh, 56px); text-align: center; position: relative; }
          .mcs-eyebrow {
            display: inline-flex; align-items: center; gap: 8px;
            padding: clamp(6px, 0.7vh, 12px) clamp(10px, 1vw, 18px); border-radius: 999px;
            background: rgba(var(--wood-walnut-rgb), 0.20);
            border: 1px solid rgba(var(--brass-rgb), 0.35);
            color: var(--amber-light); font-size: clamp(10px, 0.82vw, 14px); font-weight: 950;
            margin-bottom: clamp(16px, 1.8vh, 28px);
          }
          .mcs-hero h1 { max-width: 72vw; margin: 0 auto clamp(14px, 1.6vh, 26px); font-size: clamp(42px, 6.8vw, 76px); line-height: .96; letter-spacing: -0.07em; }
          .mcs-gradient-text { background: linear-gradient(135deg, var(--amber-light), var(--brass) 45%, var(--wood-oak)); -webkit-background-clip: text; background-clip: text; color: transparent; }
          .mcs-hero-copy { max-width: 58vw; margin: 0 auto clamp(20px, 2.6vh, 38px); color: var(--muted); font-size: clamp(15px, 1.25vw, 22px); line-height: 1.7; }
          .mcs-hero-actions { display: flex; justify-content: center; gap: clamp(10px, 1vw, 20px); flex-wrap: wrap; }
          .mcs-btn {
            display: inline-flex; align-items: center; justify-content: center; gap: 9px;
            min-height: clamp(40px, 3.8vh, 54px); padding: 0 clamp(14px, 1.5vw, 26px); border-radius: 13px; border: 1px solid transparent;
            font-weight: 900; font-size: clamp(12px, 0.9vw, 16px); cursor: pointer;
            transition: transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease, border-color 0.18s ease;
            white-space: nowrap; font-family: inherit;
          }
          .mcs-btn:hover { transform: translateY(-2px); }
          .mcs-btn-primary { color: var(--ink); background: linear-gradient(135deg, var(--brass), var(--amber) 72%); box-shadow: 0 16px 38px rgba(var(--amber-rgb), 0.28); }
          .mcs-btn-primary:hover { box-shadow: 0 20px 48px rgba(var(--amber-rgb), 0.38); }
          .mcs-btn-ghost { background: rgba(var(--slate-400-rgb), 0.08); border-color: rgba(var(--slate-400-rgb), 0.14); color: var(--soft); }
          .mcs-btn-ghost:hover { background: rgba(var(--slate-400-rgb), 0.13); color: var(--text); }

          .mcs-comparison-section { padding: clamp(24px, 3.2vh, 48px) 0 clamp(32px, 4.2vh, 58px); }
          .mcs-comparison-shell {
            border: 1px solid var(--border);
            background: linear-gradient(180deg, var(--card-strong), var(--card));
            border-radius: 22px;
            box-shadow: var(--shadow), inset 0 1px 0 rgba(var(--white-rgb), 0.04);
            overflow: hidden;
            position: relative;
          }
          .mcs-comparison-shell::before { content: ""; position: absolute; inset: -1px; background: radial-gradient(circle at 72% 0%, rgba(var(--brass-rgb), 0.16), transparent 30%); pointer-events: none; }
          .mcs-table-head { position: relative; z-index: 1; display: flex; align-items: center; justify-content: space-between; gap: clamp(12px, 1.4vw, 24px); padding: clamp(16px, 1.8vh, 28px) clamp(16px, 1.8vw, 32px); border-bottom: 1px solid rgba(var(--slate-400-rgb), 0.12); background: rgba(var(--slate-400-rgb), 0.06); }
          .mcs-table-head h2 { font-size: clamp(17px, 1.5vw, 26px); letter-spacing: -0.03em; }
          .mcs-table-head span { color: var(--muted); font-size: clamp(11px, 0.85vw, 15px); font-weight: 700; }
          .mcs-table-wrap { position: relative; z-index: 1; }
          .mcs-table-wrap table { width: 100%; border-collapse: collapse; }
          .mcs-table-wrap th, .mcs-table-wrap td { padding: clamp(12px, 1.4vh, 24px) clamp(16px, 1.8vw, 32px); border-bottom: 1px solid rgba(var(--slate-400-rgb), 0.10); text-align: left; vertical-align: top; font-size: clamp(12px, 0.9vw, 16px); }
          .mcs-table-wrap th { color: var(--text); font-weight: 950; background: rgba(var(--slate-400-rgb), 0.035); }
          .mcs-table-wrap td:first-child, .mcs-table-wrap th:first-child { width: 28%; color: var(--text); font-weight: 850; }
          .mcs-table-wrap td:nth-child(2) { color: var(--muted); }
          .mcs-th-highlight, .mcs-td-highlight { color: var(--yellow) !important; font-weight: 850; }
          .mcs-table-wrap tr:last-child td { border-bottom: 0; }
          .mcs-mode-pill { display: inline-flex; align-items: center; gap: 7px; padding: clamp(5px, 0.5vh, 9px) clamp(8px, 0.7vw, 14px); border-radius: 999px; background: rgba(var(--brass-rgb), 0.11); border: 1px solid rgba(var(--brass-rgb), 0.22); color: var(--amber-light); font-size: clamp(9px, 0.72vw, 13px); font-weight: 950; }

          .mcs-cards-section { padding: clamp(24px, 3.2vh, 48px) 0 clamp(32px, 4.2vh, 58px); }
          .mcs-feature-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: clamp(14px, 1.6vw, 30px); }
          .mcs-feature-card {
            position: relative; min-height: 24vh;
            border-radius: var(--radius-md); padding: clamp(18px, 2.2vh, 34px);
            background: var(--card); border: 1px solid var(--border);
            box-shadow: 0 20px 54px rgba(0,0,0,.18);
            overflow: hidden;
            transition: transform 0.22s ease, border-color 0.22s ease, background 0.22s ease;
          }
          .mcs-feature-card::before { content: ""; position: absolute; inset: -1px; background: radial-gradient(circle at 20% 0%, rgba(var(--brass-rgb), 0.19), transparent 34%); opacity: 0; pointer-events: none; transition: opacity 0.22s ease; }
          .mcs-feature-card:hover { transform: translateY(-7px); border-color: rgba(var(--brass-rgb), 0.38); background: var(--card-strong); }
          .mcs-feature-card:hover::before { opacity: 1; }
          .mcs-icon-box { position: relative; width: clamp(40px, 3.8vh, 56px); height: clamp(40px, 3.8vh, 56px); border-radius: clamp(12px, 1.2vh, 18px); display: grid; place-items: center; margin-bottom: clamp(16px, 1.8vh, 28px); color: var(--amber-light); background: rgba(var(--brass-rgb), 0.13); border: 1px solid rgba(var(--brass-rgb), 0.24); box-shadow: 0 12px 28px rgba(var(--brass-rgb), 0.12); }
          .mcs-icon-box svg { width: clamp(18px, 1.6vh, 26px); height: clamp(18px, 1.6vh, 26px); }
          .mcs-feature-card h3 { position: relative; font-size: clamp(16px, 1.3vw, 24px); line-height: 1.24; margin-bottom: clamp(10px, 1vh, 16px); letter-spacing: -0.025em; }
          .mcs-feature-card p { position: relative; color: var(--muted); font-size: clamp(12px, 0.9vw, 16px); line-height: 1.65; }

          .mcs-visual-section { padding: clamp(32px, 4.2vh, 60px) 0 clamp(44px, 6vh, 80px); }
          .mcs-visual-grid { display: grid; grid-template-columns: 1.05fr 0.95fr; gap: clamp(16px, 1.8vw, 32px); align-items: stretch; }
          .mcs-control-panel, .mcs-mockup-panel { border-radius: var(--radius-lg); border: 1px solid var(--border); background: var(--card); box-shadow: 0 24px 64px rgba(0,0,0,.18); }
          .mcs-control-panel { overflow: hidden; padding: clamp(20px, 2.4vh, 36px); }
          .mcs-control-panel h2 { font-size: clamp(28px, 3.4vw, 44px); letter-spacing: -0.055em; line-height: 1.05; margin-bottom: clamp(10px, 1.2vh, 18px); }
          .mcs-control-panel p { color: var(--muted); line-height: 1.7; margin-bottom: clamp(16px, 1.8vh, 28px); }
          .mcs-check-list { list-style: none; display: grid; gap: clamp(10px, 1.2vh, 18px); }
          .mcs-check-list li { display: flex; align-items: flex-start; gap: clamp(10px, 0.9vw, 16px); color: var(--soft); font-size: clamp(12px, 0.9vw, 16px); line-height: 1.55; }
          .mcs-check-list li::before { content: "\\2713"; flex: 0 0 clamp(20px, 2vh, 28px); width: clamp(20px, 2vh, 28px); height: clamp(20px, 2vh, 28px); border-radius: 8px; display: grid; place-items: center; color: var(--ink); background: linear-gradient(135deg, var(--brass), var(--amber)); font-weight: 950; font-size: clamp(11px, 0.9vw, 15px); }

          .mcs-workflow-panel {
            border-radius: var(--radius-lg);
            border: 1px solid var(--border);
            background: var(--card);
            box-shadow: 0 24px 64px rgba(0,0,0,.18);
            overflow: hidden;
            display: flex; flex-direction: column;
          }
          .mcs-workflow-panel .mcs-mockup-top {
            padding: clamp(8px, 0.8vh, 14px) clamp(10px, 1vw, 18px);
            display: flex; align-items: center; gap: clamp(8px, 0.9vw, 16px);
            background: rgba(var(--slate-400-rgb), .04);
            border-bottom: 1px solid var(--border);
          }
          .mcs-workflow-badge {
            font-size: clamp(8px, 0.7vw, 12px); font-weight: 700; text-transform: uppercase;
            letter-spacing: .06em;
            color: var(--brass);
            background: rgba(var(--brass-rgb), .12);
            padding: clamp(2px, 0.3vh, 5px) clamp(8px, 0.7vw, 12px); border-radius: 999px;
          }
          .mcs-workflow-body {
            padding: clamp(12px, 1.4vh, 22px);
            display: flex; flex-direction: column; gap: 6px;
            flex: 1;
          }
          .mcs-workflow-step {
            display: flex; align-items: center; gap: clamp(8px, 0.8vw, 14px);
            padding: clamp(8px, 0.8vh, 14px) clamp(8px, 0.9vw, 16px); border-radius: 10px;
            background: rgba(var(--slate-400-rgb), .04);
            border: 1px solid transparent;
            transition: border-color .2s, background .2s;
          }
          .mcs-step-done { border-color: rgba(var(--sage-rgb), .12); }
          .mcs-step-active { border-color: rgba(var(--amber-rgb), .25); background: rgba(var(--amber-rgb), .06); }
          .mcs-step-ready { border-color: rgba(var(--sage-rgb), .12); }
          .mcs-step-icon { flex-shrink: 0; display: flex; align-items: center; }
          .mcs-icon-pulse { animation: mcsStepPulse 2s ease-in-out infinite; }
          @keyframes mcsStepPulse {
            0%, 100% { opacity: 1; }
            50% { opacity: .5; }
          }
          .mcs-step-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
          .mcs-step-label { font-size: clamp(10px, 0.8vw, 14px); font-weight: 700; color: var(--text); }
          .mcs-step-value { font-size: clamp(8px, 0.7vw, 12px); color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .mcs-step-status {
            font-size: clamp(8px, 0.6vw, 11px); font-weight: 800; text-transform: uppercase;
            letter-spacing: .06em; padding: clamp(2px, 0.3vh, 5px) clamp(6px, 0.6vw, 10px); border-radius: 999px;
            flex-shrink: 0;
          }
          .mcs-status-complete { background: rgba(var(--sage-rgb), .12); color: var(--sage); }
          .mcs-status-editing { background: rgba(var(--amber-rgb), .15); color: var(--amber); }
          .mcs-status-ready   { background: rgba(var(--sage-rgb), .12);  color: var(--sage); }

          .mcs-mockup-panel { position: relative; min-height: 72vh; background: linear-gradient(135deg, rgba(var(--slate-950-rgb), 0.72), rgba(var(--slate-900-rgb), 0.32)); }
          .mcs-mockup-top { height: clamp(42px, 4.6vh, 60px); display: flex; align-items: center; justify-content: space-between; padding: 0 clamp(10px, 1.2vw, 22px); border-bottom: 1px solid rgba(var(--slate-400-rgb), 0.12); background: rgba(var(--slate-950-rgb), 0.32); }
          .mcs-dots { display: flex; gap: 7px; }
          .mcs-dot { width: 10px; height: 10px; border-radius: 999px; background: var(--slate-500); }
          .mcs-dot:nth-child(1) { background: var(--pink); }
          .mcs-dot:nth-child(2) { background: var(--yellow); }
          .mcs-dot:nth-child(3) { background: var(--sage); }
          .mcs-mockup-body { display: grid; grid-template-columns: 1fr 16vw; gap: clamp(10px, 1.2vw, 22px); padding: clamp(14px, 1.6vw, 28px); }
          .mcs-cabinet-preview { min-height: 62vh; border-radius: 20px; border: 1px solid rgba(var(--slate-400-rgb), .13); background: radial-gradient(circle at 55% 38%, rgba(var(--brass-rgb), .14), transparent 32%), linear-gradient(135deg, rgba(var(--slate-950-rgb), .58), rgba(var(--slate-900-rgb), .34)); position: relative; overflow: hidden; }
          .mcs-cabinet-preview::before { content: ""; position: absolute; inset: 0; background-image: linear-gradient(rgba(var(--white-rgb), .045) 1px, transparent 1px), linear-gradient(90deg, rgba(var(--white-rgb), .045) 1px, transparent 1px); background-size: 28px 28px; opacity: .65; pointer-events: none; }
          .mcs-dimension-tag { position: absolute; z-index: 3; padding: clamp(6px, 0.6vh, 10px) clamp(8px, 0.7vw, 14px); border-radius: 999px; color: var(--amber-light); background: rgba(var(--slate-950-rgb), .68); border: 1px solid rgba(var(--brass-rgb), .28); font-size: clamp(9px, 0.72vw, 13px); font-weight: 950; backdrop-filter: blur(12px); }
          .mcs-tag-a { left: clamp(16px, 1.8vw, 32px); top: clamp(20px, 2.4vh, 36px); }
          .mcs-tag-b { right: clamp(16px, 1.8vw, 32px); bottom: clamp(22px, 2.6vh, 38px); }
          .mcs-side-form { display: grid; gap: clamp(8px, 0.8vw, 14px); }

          .mcs-slider-field {
            padding: clamp(10px, 1vh, 16px); border-radius: 13px;
            background: rgba(var(--slate-400-rgb), .07);
            border: 1px solid rgba(var(--slate-400-rgb), .10);
          }
          .mcs-slider-field span { display: block; color: var(--muted); font-size: clamp(8px, 0.7vw, 12px); font-weight: 800; text-transform: uppercase; letter-spacing: .07em; margin-bottom: 4px; }
          .mcs-slider-field strong { display: block; font-size: clamp(12px, 0.9vw, 16px); color: var(--text); margin-bottom: 6px; }
          .mcs-slider-track-wrap { position: relative; overflow: visible; }
          .mcs-hand-anim {
            position: absolute; bottom: -10px; left: var(--hand-start, 0%); z-index: 10;
            pointer-events: none; opacity: 0.85;
            animation: mcsHandSlide 2.8s ease-in-out infinite;
            filter: drop-shadow(0 2px 6px rgba(var(--amber-rgb), 0.35));
            --hand-stroke: #fff; --hand-fill: rgba(255,255,255,0.15);
          }
          @keyframes mcsHandSlide {
            0%   { left: var(--hand-start); transform: translateX(-50%) translateY(0); }
            60%  { left: 100%; transform: translateX(-100%) translateY(-4px); }
            72%  { left: 100%; transform: translateX(-100%) translateY(0); }
            72.001% { left: var(--hand-start); transform: translateX(-50%) translateY(0); }
            100% { left: var(--hand-start); transform: translateX(-50%) translateY(0); }
          }
          .mcs-slider {
            -webkit-appearance: none; appearance: none;
            width: 100%; height: 4px; border-radius: 999px;
            background: rgba(var(--slate-400-rgb), .20);
            outline: none; cursor: pointer;
          }
          .mcs-slider::-webkit-slider-thumb {
            -webkit-appearance: none; appearance: none;
            width: 16px; height: 16px; border-radius: 50%;
            background: linear-gradient(135deg, var(--brass), var(--amber));
            border: 2px solid rgba(var(--white-rgb), .25);
            cursor: pointer;
            transition: transform 0.15s ease;
          }
          .mcs-slider::-webkit-slider-thumb:hover { transform: scale(1.15); }
          .mcs-slider::-moz-range-thumb {
            width: 16px; height: 16px; border-radius: 50%;
            background: linear-gradient(135deg, var(--brass), var(--amber));
            border: 2px solid rgba(var(--white-rgb), .25);
            cursor: pointer;
          }
          .mcs-toggle-field {
            display: flex; align-items: center; justify-content: space-between;
            padding: clamp(10px, 1vh, 16px); border-radius: 13px;
            background: rgba(var(--slate-400-rgb), .07);
            border: 1px solid rgba(var(--slate-400-rgb), .10);
            cursor: pointer;
          }
          .mcs-toggle-field span { color: var(--muted); font-size: clamp(8px, 0.7vw, 12px); font-weight: 800; text-transform: uppercase; letter-spacing: .07em; }
          .mcs-toggle-track {
            position: relative; width: 38px; height: 22px; flex: 0 0 38px;
            border-radius: 999px; background: rgba(var(--slate-400-rgb), .25);
            transition: background 0.2s ease;
          }
          .mcs-toggle-track input { position: absolute; opacity: 0; width: 100%; height: 100%; cursor: pointer; z-index: 1; }
          .mcs-toggle-thumb {
            position: absolute; top: 2px; left: 2px;
            width: 18px; height: 18px; border-radius: 50%;
            background: var(--text); transition: transform 0.2s ease, background 0.2s ease;
          }
          .mcs-toggle-track input:checked + .mcs-toggle-thumb { transform: translateX(16px); background: linear-gradient(135deg, var(--brass), var(--amber)); }
          .mcs-toggle-track:has(input:checked) { background: rgba(var(--brass-rgb), .40); }
          .mcs-cta-section { padding: clamp(20px, 2.4vh, 40px) 0 clamp(60px, 8vh, 110px); }
          .mcs-cta { position: relative; overflow: hidden; border-radius: var(--radius-lg); border: 1px solid rgba(var(--brass-rgb), .22); background: radial-gradient(circle at 50% 0%, rgba(var(--white-rgb), .16), transparent 28%), linear-gradient(135deg, rgba(var(--wood-dark-rgb), .88), rgba(var(--wood-walnut-rgb), .68) 46%, rgba(var(--slate-950-rgb), .88)); box-shadow: var(--shadow); padding: clamp(36px, 5vh, 72px) clamp(20px, 2.2vw, 40px); text-align: center; }
          .mcs-cta h2 { font-size: clamp(28px, 4vw, 44px); line-height: 1.08; letter-spacing: -0.045em; margin-bottom: clamp(10px, 1.2vh, 18px); }
          .mcs-cta p { color: var(--soft); max-width: 54vw; margin: 0 auto clamp(18px, 2.2vh, 34px); line-height: 1.7; }

          .mcs-footer { border-top: 1px solid rgba(var(--slate-400-rgb), 0.08); background: rgba(var(--bg-950), 0.72); padding: clamp(20px, 2.4vh, 36px) 0; }
          .mcs-footer-inner { display: flex; justify-content: space-between; align-items: center; gap: clamp(12px, 1.2vw, 24px); color: var(--muted); font-size: clamp(11px, 0.85vw, 15px); }
          .mcs-brand { display: flex; align-items: center; gap: 8px; font-weight: 900; font-size: clamp(13px, 1vw, 18px); color: var(--text); }
          .mcs-footer-links { display: flex; gap: clamp(14px, 1.4vw, 26px); color: var(--soft); font-weight: 700; }
          .mcs-footer-links a { transition: color 0.18s ease; }
          .mcs-footer-links a:hover { color: var(--text); }

          .lp-light-theme .mcs-page {
            background:
              radial-gradient(circle at 16% 8%, rgba(var(--wood-walnut-rgb), 0.16), transparent 30%),
              radial-gradient(circle at 88% 18%, rgba(var(--brass-rgb), 0.12), transparent 28%),
              radial-gradient(circle at 50% 0%, rgba(var(--sage-rgb), 0.06), transparent 32%),
              linear-gradient(180deg, var(--bg-950), var(--bg-900) 42%, var(--bg-950) 100%);
          }
          .lp-light-theme .mcs-eyebrow { color: #7A4E16; background: rgba(var(--off-white-rgb), 0.82); border: 1px solid rgba(var(--brass-rgb), 0.32); }
          .lp-light-theme .mcs-gradient-text { background: linear-gradient(135deg, #9B641E, #C7821C 52%, var(--wood-walnut)); -webkit-background-clip: text; background-clip: text; color: transparent; }
          .lp-light-theme .mcs-btn-primary { color: #111827; }
          .lp-light-theme .mcs-btn-ghost { background: rgba(92, 61, 37, 0.08); border-color: rgba(92, 61, 37, 0.14); color: var(--soft); }
          .lp-light-theme .mcs-btn-ghost:hover { background: rgba(92, 61, 37, 0.13); color: var(--text); }
          .lp-light-theme .mcs-comparison-shell { background: linear-gradient(180deg, var(--card-strong), var(--card)); }
          .lp-light-theme .mcs-table-head { background: rgba(92, 61, 37, 0.06); border-bottom: 1px solid rgba(92, 61, 37, 0.10); }
          .lp-light-theme .mcs-mode-pill { background: rgba(var(--brass-rgb), 0.11); border: 1px solid rgba(var(--brass-rgb), 0.22); color: #7A4E16; }
          .lp-light-theme .mcs-feature-card { background: var(--card-strong); box-shadow: 0 18px 50px rgba(64, 43, 25, 0.10), inset 0 1px 0 rgba(var(--white-rgb), 0.72); }
          .lp-light-theme .mcs-icon-box { background: rgba(var(--brass-rgb), 0.11); border: 1px solid rgba(var(--brass-rgb), 0.20); color: #9B641E; }
          .lp-light-theme .mcs-control-panel, .lp-light-theme .mcs-mockup-panel, .lp-light-theme .mcs-workflow-panel { background: var(--card-strong); }
          .lp-light-theme .mcs-check-list li { color: var(--soft); }
          .lp-light-theme .mcs-mockup-panel { background: linear-gradient(135deg, rgba(var(--off-white-rgb), .72), rgba(var(--bg-900), .32)); }
          .lp-light-theme .mcs-cabinet-preview { border: 1px solid rgba(92, 61, 37, .13); background: radial-gradient(circle at 55% 38%, rgba(var(--brass-rgb), .10), transparent 32%), linear-gradient(135deg, rgba(var(--off-white-rgb), .58), rgba(var(--bg-900), .34)); }
          .lp-light-theme .mcs-dimension-tag { background: rgba(var(--off-white-rgb), .68); color: #7A4E16; border: 1px solid rgba(var(--brass-rgb), .28); }
          .lp-light-theme .mcs-slider-field { background: rgba(92, 61, 37, 0.06); border: 1px solid rgba(92, 61, 37, 0.08); }
          .lp-light-theme .mcs-slider-field strong { color: var(--text); }
          .lp-light-theme .mcs-slider-field span { color: var(--muted); }
          .lp-light-theme .mcs-toggle-field { background: rgba(92, 61, 37, 0.06); border: 1px solid rgba(92, 61, 37, 0.08); }
          .lp-light-theme .mcs-hand-anim { --hand-stroke: #000; --hand-fill: rgba(0,0,0,0.12); }
          .lp-light-theme .mcs-cta { background: radial-gradient(circle at 50% 0%, rgba(255,255,255,.18), transparent 30%), linear-gradient(135deg, rgba(var(--wood-dark-rgb), .88), rgba(var(--wood-walnut-rgb), .68) 46%, rgba(var(--slate-950-rgb), .88)); }
          .lp-light-theme .mcs-footer { background: rgba(var(--off-white-rgb), 0.82); }

          .mcs-reveal {
            opacity: 0; transform: translateY(32px);
            transition: opacity 0.72s cubic-bezier(.18,.89,.32,1.25), transform 0.72s cubic-bezier(.18,.89,.32,1.25);
          }
          .mcs-reveal.mcs-visible { opacity: 1; transform: translateY(0); }
          .mcs-reveal-delay-1 { transition-delay: 0.08s; }
          .mcs-reveal-delay-2 { transition-delay: 0.16s; }
          .mcs-reveal-delay-3 { transition-delay: 0.24s; }
          .mcs-reveal-delay-4 { transition-delay: 0.32s; }
          .mcs-reveal-delay-5 { transition-delay: 0.40s; }
          .mcs-reveal-delay-6 { transition-delay: 0.48s; }

          .mcs-feature-card { transition: transform 0.35s cubic-bezier(.18,.89,.32,1.25), box-shadow 0.35s ease; }
          .mcs-feature-card:hover { transform: translateY(-4px); box-shadow: 0 20px 48px rgba(0,0,0,.18); }
          .mcs-control-panel, .mcs-workflow-panel { transition: transform 0.35s cubic-bezier(.18,.89,.32,1.25), box-shadow 0.35s ease; }

          @media (max-width: 1040px) {
            .mcs-feature-grid { grid-template-columns: repeat(2, 1fr); }
            .mcs-visual-grid { grid-template-columns: 1fr; }
            .mcs-mockup-body { grid-template-columns: 1fr; }
            .mcs-side-form { grid-template-columns: repeat(3, 1fr); }
          }
          @media (max-width: 780px) {
            .container { width: min(100% - 3.2vw, var(--max)); }
            .mcs-hero { padding-top: 20px; }
            .mcs-hero-actions { flex-direction: column; align-items: stretch; }
            .mcs-btn { width: 100%; }
            .mcs-mockup-panel { min-height: 50vh; }
            .mcs-cabinet-preview { min-height: 32vh; }
            .mcs-slider-field, .mcs-toggle-field { padding: 2px 8px; }
            .mcs-feature-grid, .mcs-side-form { grid-template-columns: 1fr; }
            .mcs-table-head { flex-direction: column; align-items: flex-start; }
            .mcs-footer-inner { flex-direction: column; align-items: flex-start; }
          }
          @media (prefers-reduced-motion: reduce) {
            .mcs-page *, .mcs-page *::before, .mcs-page *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; scroll-behavior: auto !important; transition-duration: 0.01ms !important; }
          }
        `}</style>
      </div>
    </>
  );
};
