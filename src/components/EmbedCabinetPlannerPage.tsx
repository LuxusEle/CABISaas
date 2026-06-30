import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { LandingHeader } from './LandingHeader';
import { Link } from 'react-router-dom';
import { ManualCabinetScene } from './ManualCabinetScene';
import { DEFAULT_SETTINGS, TestingSettings } from './CabinetTestingUtils';

interface EmbedCabinetPlannerPageProps {
  onSignIn: () => void;
  onGetStarted: () => void;
  onQuickStart?: () => void;
  isDark: boolean;
  setIsDark: (isDark: boolean) => void;
}

const INITIAL_SETTINGS: TestingSettings = {
  ...DEFAULT_SETTINGS, width: 900, height: 720, selectedPart: 'all', cabinetType: 'base',
};

const features = [
  { icon: '<>', title: 'Simple iframe embed', desc: 'Copy one HTML snippet and add the cabinet designer to any website builder, CMS, ecommerce store, or custom framework.' },
  { icon: 'shield', title: 'Domain whitelisting', desc: 'Lock your API key to approved domains to prevent unauthorized embedding, token theft, and accidental public exposure.' },
  { icon: 'zap', title: 'Event-driven API', desc: 'Listen for design changes, quote requests, project saves, material choices, and output exports via secure postMessage events.' },
  { icon: 'smartphone', title: 'Responsive and mobile', desc: 'The configurator adapts to desktop, tablet, and mobile containers without breaking your page layout or checkout flow.' },
  { icon: 'check', title: 'White-label ready', desc: 'Remove CabEngine branding, apply your logo and colors, and keep the customer experience inside your own domain.' },
  { icon: 'arrow', title: 'Quote and BOM output', desc: 'Capture customer designs with instant quotes, cut lists, DXF exports, and material reports ready for production review.' },
];

const personas = [
  { title: 'E-commerce stores', desc: 'Let customers design kitchen cabinets before purchasing, while capturing leads, dimensions, and project specs directly.' },
  { title: 'Builder portals', desc: 'Give home builders, remodelers, and dealers a controlled cabinet configurator inside their project management platform.' },
  { title: 'Manufacturer websites', desc: 'Offer a branded cabinet design tool to dealer networks and direct customers while keeping output aligned with your production rules.' },
];

export const EmbedCabinetPlannerPage: React.FC<EmbedCabinetPlannerPageProps> = ({
  onSignIn,
  onGetStarted,
  onQuickStart,
  isDark,
  setIsDark
}) => {
  const [settings, setSettings] = useState<TestingSettings>(INITIAL_SETTINGS);

  const updateSetting = <K extends keyof TestingSettings>(key: K, value: TestingSettings[K]) => {
    setSettings(prev => {
      const next = { ...prev, [key]: value };
      if (key === 'depth') next.shelfDepth = (value as number) - prev.panelThickness - prev.backPanelThickness;
      return next;
    });
  };

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  useEffect(() => {
    const els = document.querySelectorAll('.ecp-reveal');
    if (!els.length) return;
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('ecp-visible'); obs.unobserve(e.target); } });
    }, { threshold: 0.12 });
    els.forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  const { width, height, depth, doorOpenAngle, skeletonView, opacity } = settings;

  return (
    <>
      <Helmet>
        <title>Embeddable 3D Cabinet Configurator API | CabEngine Pro</title>
        <link rel="canonical" href="https://www.cabenginepro.com/embed-cabinet-planner" />
        <meta name="description" content="Embed a 3D kitchen cabinet configurator directly in your website. White-label cabinet design API with iframe integration. Let your customers design cabinets on your site." />
      </Helmet>
      <div className={`ecp-page ${isDark ? 'lp-dark-theme' : 'lp-light-theme'}`}>
        <LandingHeader onSignIn={onSignIn} onGetStarted={onGetStarted} isDark={isDark} setIsDark={setIsDark} />

        <main id="top">
          <header className="ecp-hero">
            <div className="container">
              <div className="ecp-eyebrow">◇ Developer API</div>
              <h1>Add a 3D Cabinet Designer to <span className="ecp-gradient-text">Your Website in Minutes</span></h1>
              <p className="ecp-hero-copy">Embed a fully functional cabinet configurator with a secure iframe. Let customers design cabinets, generate cut lists, and request quotes without leaving your website.</p>
              <div className="ecp-hero-actions">
                <button className="ecp-btn ecp-btn-primary" onClick={onGetStarted}>Get API Access</button>
                <button className="ecp-btn ecp-btn-ghost" onClick={onQuickStart}>View Embed Demo</button>
              </div>
            </div>
          </header>

          <section className="ecp-showcase" id="demo">
            <div className="container">
              <div className="ecp-browser-card">
                <div className="ecp-browser-top">
                  <div className="ecp-dots"><span className="ecp-dot"></span><span className="ecp-dot"></span><span className="ecp-dot"></span></div>
                  <div className="ecp-url-bar">yourdomain.com/design/cabinets</div>
                  <div className="ecp-status-pill">White-label</div>
                </div>
                <div className="ecp-iframe-preview">
                  <div className="ecp-customer-site">
                    <div className="ecp-fake-store-nav">
                      <strong>Oakline Kitchens</strong>
                      <div className="ecp-site-links"><span>Ranges</span><span>Design</span><span>Quote</span></div>
                    </div>
                    <div className="ecp-configurator-frame">
                      <div className="ecp-cabinet-viewport">
                        <div className="ecp-frame-badge">Embedded CabEngine configurator</div>
                        <div className="ecp-quote-badge">Quote ready · £1,840</div>
                        <ManualCabinetScene settings={settings} />
                      </div>
                      <div className="ecp-embed-controls">
                        <div className="ecp-control-row"><span>Cabinet width</span><strong>{width} mm</strong><input type="range" min="300" max="1200" value={width} onChange={e => updateSetting('width', Number(e.target.value))} className="ecp-range" /></div>
                        <div className="ecp-control-row"><span>Height</span><strong>{height} mm</strong><input type="range" min="400" max="1500" value={height} onChange={e => updateSetting('height', Number(e.target.value))} className="ecp-range" /></div>
                        <div className="ecp-control-row"><span>Depth</span><strong>{depth} mm</strong><input type="range" min="200" max="800" value={depth} onChange={e => updateSetting('depth', Number(e.target.value))} className="ecp-range" /></div>
                        <div className="ecp-control-row"><span>Door Open</span><strong>{doorOpenAngle}°</strong><input type="range" min="0" max="90" value={doorOpenAngle} onChange={e => updateSetting('doorOpenAngle', Number(e.target.value))} className="ecp-range" /></div>
                        <label className="ecp-control-row"><span>Skeleton View</span><div className="ecp-toggle-track"><input type="checkbox" checked={skeletonView} onChange={e => updateSetting('skeletonView', e.target.checked)} /><span className="ecp-toggle-thumb"></span></div></label>
                        <label className="ecp-control-row"><span>Transparent</span><div className="ecp-toggle-track"><input type="checkbox" checked={opacity < 1} onChange={e => updateSetting('opacity', e.target.checked ? 0.5 : 1)} /><span className="ecp-toggle-thumb"></span></div></label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="ecp-integration-section">
            <div className="container ecp-integration-grid">
              <div className="ecp-code-card">
                <div className="ecp-card-head">
                  <h2>Quick Integration</h2>
                  <button className="ecp-copy-btn" type="button">Copy snippet</button>
                </div>
                <div className="ecp-code-body">
                  <pre><code>{`<!-- Secure CabEngine Pro Iframe Integration -->
<div style="position:relative; width:100%; height:600px;">
  <iframe
    src="https://www.cabenginepro.com/embed/setup?apiKey=YOUR_PRODUCTION_API_KEY&theme=light"
    style="width:100%; height:100%; border:none; border-radius:12px;"
    allow="accelerometer; gyroscope; vr;">
  </iframe>
</div>`}</code></pre>
                </div>
              </div>

              <div className="ecp-timeline-card" id="how">
                <h3>From embed to quote request</h3>
                <div className="ecp-timeline">
                  <div className="ecp-timeline-step"><div className="ecp-num">1</div><div><strong>Register domain</strong><span>Whitelist approved store, portal, or manufacturer domains.</span></div></div>
                  <div className="ecp-timeline-step"><div className="ecp-num">2</div><div><strong>Paste iframe</strong><span>Drop the configurator into any CMS, builder, or custom app.</span></div></div>
                  <div className="ecp-timeline-step"><div className="ecp-num">3</div><div><strong>Receive events</strong><span>Listen for saved designs, quote requests, BOM updates, and project exports.</span></div></div>
                  <div className="ecp-timeline-step"><div className="ecp-num">4</div><div><strong>Produce faster</strong><span>Send approved designs into quoting, cut lists, and workshop workflows.</span></div></div>
                </div>
              </div>
            </div>
          </section>

          <section id="features">
            <div className="container">
              <div className="ecp-section-heading">
                <h2>Everything needed for a production-ready cabinet embed</h2>
                <p>Use the configurator as a white-label sales tool, a dealer portal feature, or a lead-generation engine for custom cabinet orders.</p>
              </div>
              <div className="ecp-features-grid">
                {features.map((f, i) => (
                  <article key={i} className="ecp-feature-card ecp-reveal" style={{ transitionDelay: `${i * 0.08}s` } as React.CSSProperties}>
                    <div className="ecp-icon-box">
                      {f.icon === '<>' ? (
                        <svg viewBox="0 0 24 24" fill="none" width="22" height="22"><path d="M7 8 3 12l4 4M17 8l4 4-4 4M14 4l-4 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      ) : f.icon === 'shield' ? (
                        <svg viewBox="0 0 24 24" fill="none" width="22" height="22"><path d="M12 2 3 7v6c0 5.25 9 9 9 9s9-3.75 9-9V7l-9-5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /><path d="M8 12 11 15 16 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      ) : f.icon === 'zap' ? (
                        <svg viewBox="0 0 24 24" fill="none" width="22" height="22"><path d="M13 2 3 14h8l-2 8 10-12h-8l2-8Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>
                      ) : f.icon === 'smartphone' ? (
                        <svg viewBox="0 0 24 24" fill="none" width="22" height="22"><path d="M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><path d="M12 17v.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                      ) : f.icon === 'check' ? (
                        <svg viewBox="0 0 24 24" fill="none" width="22" height="22"><path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      ) : (
                        <svg viewBox="0 0 24 24" fill="none" width="22" height="22"><path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      )}
                    </div>
                    <h3>{f.title}</h3>
                    <p>{f.desc}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section className="ecp-metrics">
            <div className="container ecp-metrics-grid">
              <div className="ecp-metric-card"><strong>1</strong><span>snippet to embed</span></div>
              <div className="ecp-metric-card"><strong>100%</strong><span>white-label option</span></div>
              <div className="ecp-metric-card"><strong>4</strong><span>core API events</span></div>
              <div className="ecp-metric-card"><strong>BOM</strong><span>production output</span></div>
            </div>
          </section>

          <section>
            <div className="container">
              <div className="ecp-section-heading">
                <h2>Who uses the embed configurator?</h2>
                <p>Best suited for businesses that want cabinet design inside their own sales journey instead of sending users to a separate tool.</p>
              </div>
              <div className="ecp-personas-grid">
                {personas.map((p, i) => (
                  <article key={i} className="ecp-persona-card ecp-reveal" style={{ transitionDelay: `${i * 0.1}s` } as React.CSSProperties}>
                    <h3>{p.title}</h3>
                    <p>{p.desc}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section id="cta">
            <div className="container">
              <div className="ecp-cta-panel">
                <h2>Start embedding the 3D Cabinet Planner</h2>
                <p>Get your API key, integration docs, and starter embed. Free tier available — no credit card required.</p>
                <button className="ecp-btn ecp-btn-primary" onClick={onGetStarted}>Get Started Free →</button>
              </div>
            </div>
          </section>
        </main>

        <footer className="ecp-footer">
          <div className="container ecp-footer-inner">
            <Link to="/" className="ecp-brand">
              <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true"><path d="M17 3 5 9.8v12.4L17 29l10-5.7v-5.5l-10 5.8-7-4V12l7-4 10 5.8V8.3L17 3Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /><path d="m17 11 7 4-7 4-7-4 7-4Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>
              CabEngine
            </Link>
            <div className="ecp-footer-links">
              <Link to="/docs">Docs</Link>
              <Link to="/terms">Terms</Link>
              <Link to="/pricing">Pricing</Link>
            </div>
            <span>&copy; {new Date().getFullYear()} CabEngine. Cabinet design, cut lists, and sheet optimization.</span>
          </div>
        </footer>

        <style>{`
          .ecp-page {
            font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            background:
              radial-gradient(circle at 16% 0%, rgba(var(--wood-walnut-rgb), 0.34), transparent 30%),
              radial-gradient(circle at 82% 12%, rgba(var(--brass-rgb), 0.16), transparent 26%),
              radial-gradient(circle at 50% 18%, rgba(var(--sage-rgb), 0.07), transparent 34%),
              linear-gradient(180deg, var(--bg-950), var(--bg-900) 46%, #05070B 100%);
            color: var(--text);
            min-height: 100vh;
          }
          .ecp-page::before {
            content: ""; position: fixed; inset: 0; pointer-events: none; z-index: -2;
            background-image: linear-gradient(var(--grid-line) 1px, transparent 1px), linear-gradient(90deg, var(--grid-line) 1px, transparent 1px);
            background-size: clamp(40px, 5.6vw, 72px) clamp(40px, 5.6vw, 72px);
            mask-image: linear-gradient(to bottom, rgba(0,0,0,0.95), transparent 82%);
          }
          .ecp-page::after {
            content: ""; position: fixed; inset: 0; pointer-events: none; z-index: -1;
            background: radial-gradient(circle at 50% 0%, rgba(var(--brass-rgb), 0.08), transparent 42%);
          }
          .ecp-page a { color: inherit; text-decoration: none; }
          .container { width: min(var(--max), calc(100% - clamp(20px, 3.2vw, 40px))); margin-inline: auto; }

          .ecp-hero { padding: clamp(56px, 7.4vh, 112px) 0 clamp(28px, 3.6vh, 54px); text-align: center; position: relative; }
          .ecp-eyebrow {
            display: inline-flex; align-items: center; gap: clamp(6px, 0.7vw, 10px); width: fit-content;
            margin: 0 auto clamp(14px, 1.6vh, 22px);
            padding: clamp(6px, 0.7vh, 12px) clamp(10px, 1vw, 18px); border-radius: 999px;
            color: var(--amber-light); background: rgba(var(--wood-walnut-rgb), .18);
            border: 1px solid rgba(var(--brass-rgb), .34);
            font-weight: 900; font-size: clamp(10px, 0.82vw, 14px);
          }
          .ecp-hero h1 {
            max-width: clamp(600px, 62vw, 860px);
            margin: 0 auto clamp(14px, 1.6vh, 22px);
            font-size: clamp(42px, 6vw, 76px); line-height: .94; letter-spacing: -.065em;
          }
          .ecp-gradient-text { background: linear-gradient(135deg, rgba(255,255,255,1), var(--amber-light) 42%, var(--wood-oak)); -webkit-background-clip: text; background-clip: text; color: transparent; }
          .lp-light-theme .ecp-gradient-text { background: linear-gradient(135deg, #9B641E, #C7821C 52%, var(--wood-walnut)); -webkit-background-clip: text; background-clip: text; color: transparent; }
          .ecp-hero-copy { max-width: clamp(520px, 50vw, 690px); margin: 0 auto clamp(20px, 2.6vh, 30px); color: var(--muted); font-size: clamp(14px, 1.25vw, 18px); line-height: 1.65; }
          .ecp-hero-actions { display: flex; justify-content: center; gap: clamp(10px, 1.2vw, 14px); flex-wrap: wrap; }
          .ecp-btn {
            display: inline-flex; align-items: center; justify-content: center; gap: clamp(7px, 0.8vw, 11px);
            min-height: clamp(38px, 4vh, 46px); padding: 0 clamp(14px, 1.5vw, 20px); border-radius: 13px; border: 1px solid transparent;
            font-weight: 900; font-size: clamp(12px, 0.9vw, 14px); cursor: pointer;
            transition: transform .18s ease, box-shadow .18s ease, background .18s ease, border-color .18s ease;
            white-space: nowrap; font-family: inherit;
          }
          .ecp-btn:hover { transform: translateY(-2px); }
          .ecp-btn-primary { color: var(--ink); background: linear-gradient(135deg, var(--brass), var(--amber) 78%); box-shadow: 0 18px 42px rgba(var(--amber-rgb), .28); }
          .ecp-btn-ghost { color: var(--soft); background: rgba(var(--slate-400-rgb), .10); border-color: rgba(var(--slate-400-rgb), .14); }
          .ecp-btn-ghost:hover { color: var(--text); background: rgba(var(--slate-400-rgb), .14); }

          .ecp-showcase { padding: clamp(16px, 2vh, 18px) 0; }
          .ecp-integration-section { padding: clamp(32px, 4.6vh, 58px) 0; }
          .ecp-integration-grid { display: grid; grid-template-columns: 1fr 1fr; gap: clamp(16px, 1.8vw, 22px); align-items: stretch; }
          .ecp-browser-card, .ecp-code-card, .ecp-feature-card, .ecp-persona-card, .ecp-cta-panel, .ecp-timeline-card, .ecp-metric-card {
            border: 1px solid var(--border); background: var(--card);
            box-shadow: 0 22px 64px rgba(0,0,0,.24);
            backdrop-filter: blur(18px);
          }
          .ecp-browser-card { border-radius: var(--radius-lg); overflow: hidden; min-height: clamp(440px, 52vh, 520px); }
          .ecp-browser-top {
            height: clamp(40px, 4.6vh, 50px);
            display: flex; justify-content: space-between; align-items: center;
            padding: 0 clamp(10px, 1.2vw, 16px);
            background: rgba(var(--slate-950-rgb), .48);
            border-bottom: 1px solid rgba(var(--slate-400-rgb), .11);
          }
          .ecp-dots { display: flex; gap: clamp(5px, 0.6vw, 8px); }
          .ecp-dot { width: clamp(7px, 0.8vw, 10px); height: clamp(7px, 0.8vw, 10px); border-radius: 50%; background: var(--slate-600); }
          .ecp-dot:nth-child(1) { background: var(--pink); }
          .ecp-dot:nth-child(2) { background: var(--yellow); }
          .ecp-dot:nth-child(3) { background: var(--sage); }
          .ecp-url-bar {
            width: min(56%, clamp(200px, 28vw, 360px)); border-radius: 999px;
            padding: clamp(5px, 0.7vh, 8px) clamp(8px, 0.9vw, 12px);
            color: var(--muted); background: rgba(var(--slate-400-rgb), .07);
            border: 1px solid rgba(var(--slate-400-rgb), .09);
            font-size: clamp(10px, 0.82vw, 12px); text-align: left;
          }
          .ecp-status-pill { border-radius: 999px; padding: clamp(4px, 0.5vh, 6px) clamp(7px, 0.7vw, 10px); background: rgba(var(--brass-rgb), .12); border: 1px solid rgba(var(--brass-rgb), .25); color: var(--amber-light); font-size: clamp(9px, 0.72vw, 11px); font-weight: 950; }
          .ecp-iframe-preview {
            position: relative; min-height: clamp(380px, 42vh, 470px);
            padding: clamp(14px, 1.6vw, 20px);
            background: radial-gradient(circle at 64% 18%, rgba(var(--brass-rgb), .18), transparent 26%), linear-gradient(135deg, rgba(var(--slate-950-rgb), .84), rgba(var(--slate-900-rgb), .62));
            overflow: hidden;
          }
          .ecp-iframe-preview::before {
            content: ""; position: absolute; inset: 0;
            background-image: linear-gradient(rgba(var(--white-rgb), .04) 1px, transparent 1px), linear-gradient(90deg, rgba(var(--white-rgb), .04) 1px, transparent 1px);
            background-size: clamp(18px, 2.4vw, 32px) clamp(18px, 2.4vw, 32px); opacity: .68;
          }
          .ecp-customer-site {
            position: relative; z-index: 2; height: 100%; min-height: clamp(350px, 38vh, 430px);
            border-radius: 22px; border: 1px solid rgba(var(--slate-400-rgb), .16);
            background: rgba(2, 6, 23, .55);
            overflow: hidden; display: grid; grid-template-rows: clamp(42px, 4.6vh, 56px) 1fr;
          }
          .ecp-fake-store-nav {
            display: flex; align-items: center; justify-content: space-between;
            padding: 0 clamp(12px, 1.4vw, 18px);
            border-bottom: 1px solid rgba(var(--slate-400-rgb), .12);
            background: rgba(var(--slate-950-rgb), .46);
            color: var(--soft); font-size: clamp(10px, 0.82vw, 12px); font-weight: 850;
          }
          .ecp-site-links { display: flex; gap: clamp(10px, 1.2vw, 14px); color: var(--muted); }
          .ecp-configurator-frame {
            display: grid; grid-template-columns: 1fr clamp(150px, 14vw, 190px);
            gap: clamp(10px, 1.2vw, 14px);
            padding: clamp(12px, 1.4vw, 16px);
            min-height: clamp(300px, 32vh, 370px);
          }
          .ecp-cabinet-viewport {
            position: relative;
            border-radius: 18px; border: 1px solid rgba(var(--slate-400-rgb), .12);
            background: radial-gradient(circle at 50% 32%, rgba(var(--wood-oak-rgb), .18), transparent 34%), rgba(3,7,18,.56);
            overflow: hidden;
          }
          .ecp-cabinet-viewport::before {
            content: ""; position: absolute; inset: 0; pointer-events: none; z-index: 1;
            background-image: linear-gradient(rgba(var(--slate-400-rgb), .05) 1px, transparent 1px), linear-gradient(90deg, rgba(var(--slate-400-rgb), .05) 1px, transparent 1px);
            background-size: clamp(16px, 2vw, 26px) clamp(16px, 2vw, 26px);
          }
          .ecp-cabinet-viewport > *:not(.ecp-frame-badge):not(.ecp-quote-badge) { position: absolute; inset: 0; }
          .ecp-frame-badge {
            position: absolute; z-index: 3; left: clamp(12px, 1.4vw, 18px); top: clamp(12px, 1.4vw, 18px);
            border-radius: 999px; padding: clamp(5px, 0.6vh, 7px) clamp(7px, 0.7vw, 10px);
            background: rgba(var(--slate-950-rgb), .72); color: var(--amber-light);
            border: 1px solid rgba(var(--brass-rgb), .22); font-weight: 950; font-size: clamp(9px, 0.72vw, 11px);
          }
          .ecp-quote-badge {
            position: absolute; z-index: 3; right: clamp(12px, 1.4vw, 18px); bottom: clamp(12px, 1.4vw, 18px);
            border-radius: 999px; padding: clamp(6px, 0.6vh, 8px) clamp(8px, 0.8vw, 11px);
            background: rgba(var(--sage-rgb), .12); color: var(--sage);
            border: 1px solid rgba(var(--sage-rgb), .28); font-weight: 950; font-size: clamp(9px, 0.72vw, 11px);
          }
          .ecp-embed-controls { display: grid; gap: clamp(8px, 0.8vw, 10px); }
          .ecp-control-row { padding: clamp(10px, 1vh, 13px); border-radius: 15px; background: rgba(var(--slate-400-rgb), .08); border: 1px solid rgba(var(--slate-400-rgb), .10); }
          .ecp-control-row span { display: block; color: var(--muted); font-size: clamp(8px, 0.7vw, 10px); font-weight: 950; text-transform: uppercase; letter-spacing: .07em; margin-bottom: clamp(4px, 0.4vh, 7px); }
           .ecp-control-row strong { font-size: clamp(12px, 0.9vw, 14px); }
          .ecp-range { -webkit-appearance: none; appearance: none; width: 100%; height: 5px; margin-top: clamp(6px, 0.7vh, 10px); border-radius: 999px; background: rgba(var(--slate-400-rgb), .2); outline: none; cursor: pointer; }
          .ecp-range::-webkit-slider-thumb { -webkit-appearance: none; width: 14px; height: 14px; border-radius: 50%; background: linear-gradient(135deg, var(--brass), var(--amber)); border: 2px solid rgba(var(--white-rgb), .25); cursor: pointer; }
          .ecp-range::-moz-range-thumb { width: 14px; height: 14px; border-radius: 50%; background: linear-gradient(135deg, var(--brass), var(--amber)); border: 2px solid rgba(var(--white-rgb), .25); cursor: pointer; }
          .ecp-toggle-track { position: relative; display: flex; align-items: center; justify-content: flex-end; }
          .ecp-toggle-track input { position: absolute; opacity: 0; width: 100%; height: 100%; cursor: pointer; z-index: 1; }
          .ecp-toggle-thumb { display: block; width: 32px; height: 18px; border-radius: 999px; background: rgba(var(--slate-400-rgb), .25); position: relative; transition: background 0.2s ease; }
          .ecp-toggle-thumb::after { content: ""; position: absolute; top: 2px; left: 2px; width: 14px; height: 14px; border-radius: 50%; background: var(--text); transition: transform 0.2s ease, background 0.2s ease; }
          .ecp-toggle-track input:checked + .ecp-toggle-thumb { background: rgba(var(--brass-rgb), .40); }
          .ecp-toggle-track input:checked + .ecp-toggle-thumb::after { transform: translateX(14px); background: linear-gradient(135deg, var(--brass), var(--amber)); }

          .ecp-code-card { border-radius: var(--radius-lg); overflow: hidden; }
          .ecp-card-head { padding: clamp(14px, 1.6vh, 18px) clamp(14px, 1.6vw, 20px); border-bottom: 1px solid rgba(var(--slate-400-rgb), .11); display: flex; align-items: center; justify-content: space-between; gap: clamp(10px, 1.2vw, 16px); background: rgba(var(--slate-400-rgb), .05); }
          .ecp-card-head h2, .ecp-card-head h3 { font-size: clamp(15px, 1.2vw, 18px); letter-spacing: -.025em; }
          .ecp-copy-btn { height: clamp(28px, 3vh, 34px); padding: 0 clamp(10px, 0.9vw, 12px); border-radius: 10px; border: 1px solid rgba(var(--brass-rgb), .24); background: rgba(var(--brass-rgb), .1); color: var(--amber-light); font-weight: 900; font-size: clamp(10px, 0.82vw, 12px); cursor: pointer; }
          .ecp-code-body { padding: clamp(14px, 1.6vw, 18px); }
          .ecp-code-body pre { white-space: pre-wrap; word-break: break-word; background: rgba(0,0,0,.72); border: 1px solid rgba(var(--white-rgb), .08); border-radius: 18px; padding: clamp(14px, 1.6vw, 18px); color: #D7DEE8; line-height: 1.65; font-size: clamp(11px, 0.85vw, 13px); overflow: hidden; }
          .ecp-accent { color: var(--amber); font-weight: 900; }
          .ecp-timeline-card { border-radius: var(--radius-lg); padding: clamp(16px, 1.8vh, 20px); }
          .ecp-timeline-card h3 { font-size: clamp(15px, 1.2vw, 18px); margin-bottom: clamp(10px, 1.2vh, 14px); }
          .ecp-timeline { display: grid; gap: clamp(8px, 0.9vh, 12px); }
          .ecp-timeline-step { display: grid; grid-template-columns: clamp(28px, 2.6vh, 34px) 1fr; gap: clamp(8px, 0.9vw, 12px); align-items: start; }
          .ecp-num { width: clamp(28px, 2.6vh, 34px); height: clamp(28px, 2.6vh, 34px); border-radius: 12px; display: grid; place-items: center; background: rgba(var(--brass-rgb), .12); color: var(--amber-light); border: 1px solid rgba(var(--brass-rgb), .22); font-weight: 950; font-size: clamp(11px, 0.85vw, 13px); }
          .ecp-timeline-step strong { display: block; font-size: clamp(12px, 0.9vw, 14px); margin-bottom: clamp(2px, 0.3vh, 4px); }
          .ecp-timeline-step span { color: var(--muted); font-size: clamp(11px, 0.85vw, 13px); line-height: 1.45; }

          .ecp-page section { padding: clamp(40px, 5.4vh, 70px) 0; }
          .ecp-section-heading { text-align: center; max-width: clamp(560px, 52vw, 720px); margin: 0 auto clamp(24px, 3vh, 36px); }
          .ecp-section-heading h2 { font-size: clamp(28px, 3.6vw, 46px); line-height: 1.05; letter-spacing: -.045em; margin-bottom: clamp(8px, 1vh, 12px); }
          .ecp-section-heading p { color: var(--muted); font-size: clamp(13px, 1.1vw, 16px); line-height: 1.65; }

          .ecp-features-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: clamp(14px, 1.6vw, 20px); }
          .ecp-feature-card { border-radius: var(--radius-md); padding: clamp(18px, 2.2vh, 24px); position: relative; overflow: hidden; transition: transform .2s ease, border-color .2s ease, background .2s ease; }
          .ecp-feature-card::before { content: ""; position: absolute; inset: -1px; background: radial-gradient(circle at 18% 0%, rgba(var(--brass-rgb), .18), transparent 38%); opacity: 0; transition: opacity .2s ease; pointer-events: none; }
          .ecp-feature-card:hover { transform: translateY(-6px); border-color: rgba(var(--brass-rgb), .36); background: var(--card-strong); }
          .ecp-feature-card:hover::before { opacity: 1; }
          .ecp-icon-box { width: clamp(40px, 3.6vh, 48px); height: clamp(40px, 3.6vh, 48px); border-radius: 15px; display: grid; place-items: center; margin-bottom: clamp(12px, 1.4vh, 18px); color: var(--amber-light); background: rgba(var(--wood-walnut-rgb), .28); border: 1px solid rgba(var(--brass-rgb), .22); }
          .ecp-feature-card h3 { font-size: clamp(15px, 1.2vw, 18px); letter-spacing: -.02em; margin-bottom: clamp(6px, 0.7vh, 9px); position: relative; }
          .ecp-feature-card p { color: var(--muted); line-height: 1.65; font-size: clamp(12px, 0.9vw, 14px); position: relative; }

          .ecp-metrics { padding-top: 0 !important; }
          .ecp-metrics-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: clamp(12px, 1.2vw, 16px); }
          .ecp-metric-card { border-radius: 20px; padding: clamp(14px, 1.6vh, 20px); text-align: center; }
          .ecp-metric-card strong { display: block; color: var(--amber-light); font-size: clamp(22px, 2.4vw, 28px); letter-spacing: -.04em; margin-bottom: clamp(3px, 0.4vh, 5px); }
          .ecp-metric-card span { color: var(--muted); font-weight: 750; font-size: clamp(11px, 0.85vw, 13px); }

          .ecp-personas-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: clamp(14px, 1.6vw, 20px); }
          .ecp-persona-card { border-radius: 20px; padding: clamp(18px, 2vh, 24px); }
          .ecp-persona-card h3 { font-size: clamp(15px, 1.2vw, 17px); margin-bottom: clamp(7px, 0.8vh, 10px); }
          .ecp-persona-card p { color: var(--muted); line-height: 1.65; font-size: clamp(12px, 0.9vw, 14px); }

          .ecp-cta-panel {
            overflow: hidden; border-radius: var(--radius-lg);
            padding: clamp(32px, 4.6vh, 56px) clamp(20px, 2.2vw, 26px); text-align: center;
            background: radial-gradient(circle at 50% -10%, rgba(var(--white-rgb), .18), transparent 32%), linear-gradient(135deg, var(--wood-dark), var(--wood-walnut) 48%, var(--bg-800));
            border-color: rgba(var(--brass-rgb), .28);
          }
          .ecp-cta-panel h2 { font-size: clamp(28px, 3.6vw, 46px); letter-spacing: -.045em; margin-bottom: clamp(8px, 1vh, 12px); }
          .ecp-cta-panel p { color: var(--amber-light); max-width: clamp(500px, 46vw, 620px); margin: 0 auto clamp(16px, 2vh, 24px); line-height: 1.65; }

          .ecp-footer { border-top: 1px solid rgba(var(--slate-400-rgb), .1); background: rgba(2,6,23,.42); padding: clamp(20px, 2.4vh, 30px) 0; }
          .ecp-footer-inner { display: flex; justify-content: space-between; align-items: center; gap: clamp(12px, 1.2vw, 18px); color: var(--muted); font-size: clamp(11px, 0.85vw, 13px); }
          .ecp-brand { display: flex; align-items: center; gap: clamp(8px, 0.9vw, 12px); font-weight: 850; letter-spacing: -0.03em; font-size: clamp(13px, 1vw, 15px); color: var(--text); }
          .ecp-footer-links { display: flex; gap: clamp(16px, 1.6vw, 22px); color: var(--soft); font-weight: 800; }
          .ecp-footer-links a { transition: color .18s ease; }
          .ecp-footer-links a:hover { color: var(--text); }

          .lp-light-theme .ecp-page {
            background:
              radial-gradient(circle at 16% 0%, rgba(var(--wood-walnut-rgb), 0.20), transparent 30%),
              radial-gradient(circle at 82% 12%, rgba(var(--brass-rgb), 0.10), transparent 26%),
              radial-gradient(circle at 50% 18%, rgba(var(--sage-rgb), 0.05), transparent 34%),
              linear-gradient(180deg, var(--bg-950), var(--bg-900) 46%, var(--bg-950) 100%);
          }
          .lp-light-theme .ecp-eyebrow { color: #7A4E16; background: rgba(var(--off-white-rgb), 0.82); border: 1px solid rgba(var(--brass-rgb), 0.32); }
          .lp-light-theme .ecp-btn-primary { color: #111827; }
          .lp-light-theme .ecp-btn-ghost { background: rgba(92, 61, 37, 0.08); border-color: rgba(92, 61, 37, 0.14); color: var(--soft); }
          .lp-light-theme .ecp-btn-ghost:hover { background: rgba(92, 61, 37, 0.13); color: var(--text); }
          .lp-light-theme .ecp-browser-card, .lp-light-theme .ecp-code-card, .lp-light-theme .ecp-feature-card, .lp-light-theme .ecp-persona-card, .lp-light-theme .ecp-timeline-card, .lp-light-theme .ecp-metric-card { background: var(--card-strong); }
          .lp-light-theme .ecp-card-head { background: rgba(92, 61, 37, 0.05); border-bottom: 1px solid rgba(92, 61, 37, 0.10); }
          .lp-light-theme .ecp-copy-btn { color: #7A4E16; background: rgba(var(--brass-rgb), .08); border-color: rgba(var(--brass-rgb), .20); }
          .lp-light-theme .ecp-cta-panel { background: radial-gradient(circle at 50% -10%, rgba(255,255,255,.22), transparent 34%), linear-gradient(135deg, rgba(var(--wood-dark-rgb), .88), rgba(var(--wood-walnut-rgb), .68) 48%, var(--bg-800)); }
          .lp-light-theme .ecp-footer { background: rgba(var(--off-white-rgb), 0.82); }
          .lp-light-theme .ecp-icon-box { background: rgba(var(--brass-rgb), 0.11); border: 1px solid rgba(var(--brass-rgb), 0.20); color: #9B641E; }
          .lp-light-theme .ecp-metric-card strong { color: #9B641E; }
          .lp-light-theme .ecp-customer-site { background: rgba(var(--off-white-rgb), .55); }
          .lp-light-theme .ecp-fake-store-nav { background: rgba(var(--off-white-rgb), .46); border-bottom: 1px solid rgba(92, 61, 37, .10); color: var(--text); }
          .lp-light-theme .ecp-cabinet-viewport { background: radial-gradient(circle at 50% 32%, rgba(var(--wood-oak-rgb), .12), transparent 34%), rgba(248, 243, 234, .56); }

          .ecp-reveal {
            opacity: 0; transform: translateY(clamp(16px, 2.4vw, 32px));
            transition: opacity 0.72s cubic-bezier(.18,.89,.32,1.25), transform 0.72s cubic-bezier(.18,.89,.32,1.25);
          }
          .ecp-reveal.ecp-visible { opacity: 1; transform: translateY(0); }

          @media (max-width: 1040px) {
            .ecp-integration-grid { grid-template-columns: 1fr; }
            .ecp-configurator-frame { grid-template-columns: 1fr; }
            .ecp-embed-controls { grid-template-columns: repeat(3, 1fr); }
            .ecp-features-grid, .ecp-personas-grid { grid-template-columns: repeat(2, 1fr); }
            .ecp-metrics-grid { grid-template-columns: repeat(2, 1fr); }
          }
          @media (max-width: 760px) {
            .ecp-hero { padding-top: clamp(36px, 7.6vh, 76px); }
            .ecp-btn { width: 100%; }
            .ecp-hero-actions { flex-direction: column; align-items: stretch; }
            .ecp-browser-card { min-height: auto; }
            .ecp-cabinet-viewport { min-height: 32vh; }
            .ecp-configurator-frame { min-height: auto; }
            .ecp-embed-controls { grid-template-columns: repeat(2, 1fr); }
            .ecp-control-row { padding: 2px 8px; }
            .ecp-features-grid, .ecp-personas-grid, .ecp-metrics-grid { grid-template-columns: 1fr; }
            .ecp-footer-inner { flex-direction: column; align-items: flex-start; }
          }
          @media (max-width: 480px) {
            .ecp-embed-controls { grid-template-columns: 1fr; }
          }
          @media (prefers-reduced-motion: reduce) {
            .ecp-page *, .ecp-page *::before, .ecp-page *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; scroll-behavior: auto !important; transition-duration: 0.01ms !important; }
          }
        `}</style>
      </div>
    </>
  );
};