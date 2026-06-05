import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { LandingHeader } from './LandingHeader';

interface LandingPageProps {
  onGetStarted: () => void;
  onSignIn: () => void;
  onQuickStart?: () => void;
  isDark: boolean;
  setIsDark: (isDark: boolean) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted, onSignIn, onQuickStart, isDark, setIsDark }) => {
  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });

    const el = pageRef.current;
    if (el) {
      el.querySelectorAll('.reveal').forEach((r) => observer.observe(r));
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const [cursorPos, setCursorPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [showTooltip, setShowTooltip] = useState(false);
  const videoRef = useRef<HTMLDivElement>(null);

  const phrases = ['Design Kitchens', 'Build Cabinets', 'Grow Your Shop'];
  const [phraseIndex, setPhraseIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setPhraseIndex(prev => (prev + 1) % phrases.length);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  const handleVideoMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = videoRef.current?.getBoundingClientRect();
    if (rect) {
      setCursorPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }
  };

  return (
    <>
      <Helmet>
        <title>Cabinetrix Pro — Cabinet Design & Manufacturing SaaS</title>
        <link rel="canonical" href="https://www.protradee.com/" />
        <meta name="description" content="Cloud-based cabinet engineering platform with 3D design, BOM generation, DXF/CNC export, and quote-ready PDF reports." />
      </Helmet>

      <div ref={pageRef} className={`lp-landing ${isDark ? 'lp-dark-theme' : 'lp-light-theme'}`} style={{ position: 'relative', minHeight: '100vh' }}>
        <LandingHeader
          onSignIn={onSignIn}
          onGetStarted={onGetStarted}
          isDark={isDark}
          setIsDark={setIsDark}
        />

        <main id="top" style={{ overflowX: 'hidden' }}>
          <header className="hero">
            <div className="container hero-grid">
              <div className="hero-content reveal">
                <div className="eyebrow"><span className="pulse-dot"></span> 3D cabinet design software — professional grade</div>
                <h1>Design Kitchens<br /><span className="gradient-text">Build Cabinets</span><br />Grow Your Shop</h1>
                <p className="hero-copy">Cloud-based cabinet engineering for workshops that need 3D design, instant BOM generation, cut lists, DXF/CNC exports, and quote-ready PDF reports — all in your browser.</p>
                <div className="hero-actions">
                  <button className="btn btn-primary" onClick={onGetStarted}>Start Designing Free →</button>
                  <button className="btn btn-secondary" onClick={onQuickStart}>Try Live Demo</button>
                </div>
                <div className="micro-trust">
                  <div className="avatars" aria-hidden="true">
                    <span className="avatar">A</span><span className="avatar">J</span><span className="avatar">M</span><span className="avatar">K</span>
                  </div>
                  <span><span className="stars">★★★★★</span> Trusted by cabinet engineering professionals</span>
                </div>
              </div>

               <div className="hero-visual reveal">
                 <div className="glow-orb"></div>
                                   <div className="eyebrow eyebrow-mobile"><span className="pulse-dot"></span> 3D cabinet design software — professional grade</div>
                 <div className="mobile-phrase-rotator"><span key={phraseIndex} className="gradient-text">{phrases[phraseIndex]}</span></div>
                 <div className="floating-card float-a"><strong>BOM generated</strong><small>42 panels · 18mm MDF · hardware counted</small></div>
                 <div className="floating-card float-b"><strong>DXF ready</strong><small>CNC export prepared for workshop</small></div>
                 <div className="app-window" aria-label="Cabinetrix product interface mockup">
                  <div className="window-top">
                    <div className="dots"><span className="dot"></span><span className="dot"></span><span className="dot"></span></div>
                    <div className="window-title">Cabinetrix Studio / Kitchen Project</div>
                    <div className="chip">LIVE</div>
                  </div>
                  <div className="hero-media-shell">
                    <div
                      className="hero-video-clickable"
                      ref={videoRef}
                      onClick={() => onQuickStart?.()}
                      role="button"
                      tabIndex={0}
                      onMouseMove={handleVideoMove}
                      onMouseEnter={(e) => { setShowTooltip(true); handleVideoMove(e); }}
                      onMouseLeave={() => setShowTooltip(false)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onQuickStart?.(); }}
                    >
                      <video className="hero-product-video" autoPlay muted loop playsInline preload="metadata" poster="/hero.mp4">
                        <source src="/hero.mp4" type="video/mp4" />
                      </video>
                      <div
                        className={`hero-video-tooltip${showTooltip ? ' visible' : ''}`}
                        style={{ left: cursorPos.x + 14, top: cursorPos.y - 36 }}
                      >Try Live Demo</div>
                    </div>
                    <div className="scan-line"></div>
                    <div className="media-caption-bar"><span>Live 3D cabinet preview</span><span className="chip">REAL APP VIDEO</span></div>
                  </div>
                </div>
              </div>
            </div>
          </header>

          <div className="proof-strip" id="features-strip" style={{ scrollMarginTop: '80px' }}>
            <div className="container proof-grid">
              <div className="proof-item"><strong>3D</strong><span>Real-time design</span><small>Interactive preview</small></div>
              <div className="proof-item"><strong>BOM</strong><span>Instant reports</span><small>Materials & hardware</small></div>
              <div className="proof-item"><strong>DXF</strong><span>CNC exports</span><small>Workshop-ready files</small></div>
              <div className="proof-item"><strong>PDF</strong><span>Quote packs</span><small>Client-ready output</small></div>
              <div className="proof-item"><strong>CUT</strong><span>Panel lists</span><small>Faster production</small></div>
            </div>
          </div>

          <section id="showcase" style={{ scrollMarginTop: '80px' }}>
            <div className="container">
              <div className="section-heading reveal">
                <h2>See Cabinetrix <span className="gradient-text">in Action</span></h2>
                <p>A product-first layout makes the landing page feel like real software, not just a generic kitchen website.</p>
              </div>
              <div className="product-showcase reveal">
                <div className="showcase-main">
                  <div className="showcase-header">
                    <h3>3D room layout and cabinet placement</h3>
                    <span className="chip">Auto-save cloud project</span>
                  </div>
                  <div className="showcase-preview">
                    <div className="real-media-card" aria-label="Real Cabinetrix 3D cabinet design screenshot">
                      <img className="real-product-image" src="/3d-design.png" alt="3D cabinet design" />
                      <div className="media-caption-bar"><span>Design walls, cabinets, sink, hob and finishes in 3D</span><span className="chip">3D DESIGN</span></div>
                    </div>
                  </div>
                </div>
                <div className="showcase-side">
                  <div className="mini-card">
                    <h4>Design in 3D</h4>
                    <p>Drag cabinets onto multiple walls and preview the kitchen layout before manufacturing.</p>
                    <div className="progress"><span></span></div>
                  </div>
                  <div className="mini-card">
                    <h4>Generate BOM</h4>
                    <p>Convert project geometry into panels, material counts, hardware, and cost estimates.</p>
                    <div className="visual-chip-row"><span className="chip">Panels</span><span className="chip">Hardware</span><span className="chip">Costs</span></div>
                  </div>
                  <div className="mini-card">
                    <h4>Export for workshop</h4>
                    <p>Download DXF, PDF quote packs, cut lists, and CNC-ready production files.</p>
                    <div className="visual-chip-row"><span className="chip">DXF</span><span className="chip">PDF</span><span className="chip">CNC</span></div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section id="features">
            <div className="container">
              <div className="section-heading reveal">
                <h2>Everything You Need. <span className="gradient-text">Nothing You Don't.</span></h2>
                <p>Cloud-based cabinet engineering tools for professional woodworkers, joinery shops, and kitchen manufacturers.</p>
              </div>
              <div className="features-grid">
                <article className="feature-card reveal">
                  <div className="icon-box">▧</div>
                  <h3>3D Design Studio</h3>
                  <p>Plan rooms, place cabinets, edit dimensions, and preview the full layout in real time.</p>
                  <ul className="tick-list">
                    <li>Real-time 3D rendering</li>
                    <li>Multi-wall layouts</li>
                    <li>Cabinet library presets</li>
                  </ul>
                  <div className="visual-chip-row"><span className="chip">Wall units</span><span className="chip">Base units</span><span className="chip">Island</span></div>
                </article>

                <article className="feature-card reveal">
                  <div className="icon-box">▤</div>
                  <h3>Instant BOM Engine</h3>
                  <p>Automatically calculate panel dimensions, hardware counts, quantities, and material costs.</p>
                  <ul className="tick-list">
                    <li>Panel dimensioning</li>
                    <li>Hardware counts</li>
                    <li>Cost estimation</li>
                  </ul>
                  <div className="visual-chip-row"><span className="chip">18mm MDF</span><span className="chip">Hinges</span><span className="chip">Drawer runners</span></div>
                </article>

                <article className="feature-card reveal">
                  <div className="icon-box">⇩</div>
                  <h3>Manufacturing Exports</h3>
                  <p>Export CNC-ready DXF files, quote-ready PDFs, cut lists, and SketchUp-compatible assets.</p>
                  <ul className="tick-list">
                    <li>DXF cutting files</li>
                    <li>PDF quote reports</li>
                    <li>Cut-list optimisation</li>
                  </ul>
                  <div className="visual-chip-row"><span className="chip">DXF</span><span className="chip">PDF</span><span className="chip">SKP</span><span className="chip">CSV</span></div>
                </article>
              </div>
            </div>
          </section>

          <section className="workflow" id="workflow" style={{ scrollMarginTop: '80px' }}>
            <div className="container">
              <div className="section-heading reveal">
                <h2>From Design to <span className="gradient-text">Manufacturing</span></h2>
                <p>Four simple stages from concept to production-ready cabinet files.</p>
              </div>
              <div className="workflow-grid">
                <div className="workflow-step reveal"><div className="step-number">01</div><h3>Set up</h3><p>Define room walls, materials, panel thickness, margins, and workshop preferences.</p></div>
                <div className="workflow-step reveal"><div className="step-number">02</div><h3>Design</h3><p>Place cabinets with drag-and-drop controls and preview the kitchen in real-time 3D.</p></div>
                <div className="workflow-step reveal"><div className="step-number">03</div><h3>Review</h3><p>Check BOM, cut plans, material usage, hardware counts, and quote estimates.</p></div>
                <div className="workflow-step reveal"><div className="step-number">04</div><h3>Export</h3><p>Download DXF, quote PDFs, cut lists, and CNC-ready files for the workshop.</p></div>
              </div>
              <div className="workflow-media-grid reveal">
                <div className="workflow-media-card">
                  <img src="/bom.png" alt="BOM export" />
                  <div className="workflow-media-copy">
                    <h3>Quote-ready costing</h3>
                    <p>Show material, hardware, labour, transport and margin in one clear estimate.</p>
                  </div>
                </div>
                <div className="workflow-media-card">
                  <img src="/cut-list.png" alt="Cut list export" />
                  <div className="workflow-media-copy">
                    <h3>Cut optimisation and DXF export</h3>
                    <p>Turn project parts into sheet layouts and workshop-ready manufacturing exports.</p>
                  </div>
                </div>
              </div>
              <div className="stats-grid reveal">
                <div className="stat-card"><strong>Fast</strong><span>Move from layout to quote-ready output without rebuilding spreadsheets.</span></div>
                <div className="stat-card"><strong>Accurate</strong><span>Reduce manual counting errors across panels, hardware, and materials.</span></div>
                <div className="stat-card"><strong>Ready</strong><span>Produce export files your workshop can actually use.</span></div>
              </div>
            </div>
          </section>

          <section id="pricing" style={{ scrollMarginTop: '80px' }}>
            <div className="container">
              <div className="section-heading reveal">
                <h2>Simple <span className="gradient-text">Pricing</span></h2>
                <p>Start free. No credit card required. Upgrade when you need full manufacturing exports.</p>
              </div>
              <div className="pricing-grid">
                <article className="pricing-card reveal">
                  <div className="icon-box">♙</div>
                  <div className="plan-name">Free</div>
                  <div className="price"><strong>$0</strong><span>/month</span></div>
                  <p className="plan-copy">Best for testing the workflow and preparing your first cabinet projects.</p>
                  <button className="btn btn-ghost pricing-btn" onClick={onGetStarted}>Get Started Free</button>
                  <ul className="tick-list">
                    <li>Up to 3 projects</li>
                    <li>Basic cabinet presets</li>
                    <li>3D visualization</li>
                    <li>Browser reports, no download</li>
                  </ul>
                </article>

                <article className="pricing-card featured reveal">
                  <span className="popular">POPULAR</span>
                  <div className="icon-box">✦</div>
                  <div className="plan-name">Pro</div>
                  <div className="price"><strong>$29</strong><span>/month</span></div>
                  <p className="plan-copy">For workshops that need manufacturing-ready outputs and full project control.</p>
                  <button className="btn btn-primary pricing-btn" onClick={onGetStarted}>Start Pro Trial</button>
                  <ul className="tick-list">
                    <li>Unlimited projects</li>
                    <li>Custom cabinet library</li>
                    <li>BOM and PDF export</li>
                    <li>DXF and CNC export</li>
                    <li>Cut-list optimisation</li>
                    <li>Priority email support</li>
                  </ul>
                </article>
              </div>

              <div className="comparison-card reveal">
                <table className="comparison-table" aria-label="Free versus Pro comparison">
                  <thead><tr><th>Feature</th><th>Free</th><th>Pro</th></tr></thead>
                  <tbody>
                    <tr><td>3D cabinet design</td><td className="yes">✓</td><td className="yes">✓</td></tr>
                    <tr><td>Projects</td><td>3</td><td>Unlimited</td></tr>
                    <tr><td>BOM reports</td><td>Basic</td><td>Full</td></tr>
                    <tr><td>DXF export</td><td className="no">—</td><td className="yes">✓</td></tr>
                    <tr><td>CNC-ready files</td><td className="no">—</td><td className="yes">✓</td></tr>
                    <tr><td>PDF quote packs</td><td className="no">—</td><td className="yes">✓</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section id="contact" style={{ scrollMarginTop: '80px' }}>
            <div className="container">
              <div className="section-heading reveal">
                <h2>Need Cabinetrix for <span className="gradient-text">Your Workshop?</span></h2>
                <p>Book a demo, ask about CNC/export support, or request onboarding help for your team.</p>
              </div>
              <div className="contact-grid">
                <div className="contact-card reveal"><h3>Contact Info</h3><p>Email<br /><strong>support@cabinetrixpro.com</strong><br /><br />Response time<br /><strong>Within 24–48 business hours</strong></p></div>
                <div className="contact-card reveal"><h3>Software Details</h3><p>Platform<br /><strong>Cabinetrix Pro</strong><br /><br />Type<br /><strong>Cloud-based SaaS — browser only</strong></p></div>
                <div className="contact-card reveal"><h3>Best For</h3><p>Kitchen designers, cabinet makers, joinery shops, and workshops needing faster quotes and production files.</p></div>
              </div>
            </div>
          </section>

          <section className="final-cta" id="signup">
            <div className="container reveal">
              <h2>Ready to Design, Quote, and Export Cabinets Faster?</h2>
              <p>Start free and generate your first cabinet project in minutes. Upgrade only when you need full manufacturing exports.</p>
              <button className="btn btn-primary" onClick={onGetStarted}>Start Designing Free →</button>
            </div>
          </section>
        </main>

        <footer id="docs">
          <div className="container footer-inner">
            <Link to="/" className="brand">
              <span className="brand-mark">C</span>
              <span className="brand-text">Cabinetrix<small>Pro</small></span>
            </Link>
            <div className="footer-links">
              <Link to="/docs">Docs</Link>
              <Link to="/terms">Terms</Link>
              <Link to="/pricing">Pricing</Link>
            </div>
            <span>&copy; {new Date().getFullYear()} Cabinetrix Pro. All rights reserved.</span>
          </div>
        </footer>

        <style>{`
          .lp-landing {
            font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            background:
              radial-gradient(circle at 18% 6%, rgba(var(--wood-walnut-rgb), 0.28), transparent 28%),
              radial-gradient(circle at 82% 16%, rgba(var(--brass-rgb), 0.15), transparent 24%),
              radial-gradient(circle at 56% 0%, rgba(var(--sage-rgb), 0.08), transparent 30%),
              linear-gradient(180deg, var(--bg-950), var(--bg-900) 38%, #06080D 100%);
            color: var(--text);
            -webkit-font-smoothing: antialiased;
          }
          .lp-landing::before {
            content: "";
            position: fixed;
            inset: 0;
            pointer-events: none;
            background-image:
              linear-gradient(var(--grid-line) 1px, transparent 1px),
              linear-gradient(90deg, var(--grid-line) 1px, transparent 1px);
            background-size: 72px 72px;
            mask-image: linear-gradient(to bottom, rgba(var(--black-rgb), 0.8), transparent 78%);
            z-index: -1;
          }
          .lp-landing a { color: inherit; text-decoration: none; }
          .lp-landing .container {
            width: min(var(--max), calc(100% - 40px));
            margin-inline: auto;
          }
           .lp-landing .hero {
             position: relative;
             padding: 8vh 0 6vh;
           }
            .lp-landing .hero-grid {
              display: grid;
              grid-template-columns: 1fr 1.05fr;
              align-items: center;
              gap: 5vw;
            }
           .lp-landing .eyebrow {
             width: fit-content;
             display: inline-flex;
             align-items: center;
            gap: 9px;
            padding: 7px 12px;
            border-radius: 999px;
            border: 1px solid rgba(var(--brass-rgb), 0.4);
            background: rgba(var(--wood-walnut-rgb), 0.16);
            color: var(--amber-light);
            font-weight: 800;
            font-size: 12px;
            letter-spacing: 0.02em;
             margin-bottom: 22px;
           }
            .lp-landing .eyebrow-mobile {
              display: none;
            }
            .lp-landing .mobile-phrase-rotator {
              display: none;
            }
            @keyframes slideUp {
              from { transform: translateY(36px); opacity: 0; }
              to { transform: translateY(0); opacity: 1; }
            }
             .lp-landing .mobile-phrase-rotator .gradient-text {
               display: block;
               animation: slideUp 420ms cubic-bezier(0.22, 1, 0.36, 1);
               font-size: clamp(46px, 11vw, 68px);
               line-height: 1.1;
               letter-spacing: -0.04em;
             }
           .lp-landing .pulse-dot {
            width: 7px;
            height: 7px;
            border-radius: 50%;
            background: var(--sage);
            box-shadow: 0 0 0 rgba(var(--sage-rgb), 0.7);
            animation: pulse 1.8s infinite;
          }
          @keyframes pulse {
            0% { box-shadow: 0 0 0 0 rgba(var(--sage-rgb), 0.5); }
            70% { box-shadow: 0 0 0 9px rgba(var(--sage-rgb), 0); }
            100% { box-shadow: 0 0 0 0 rgba(var(--sage-rgb), 0); }
          }
          .lp-landing h1 {
            font-size: clamp(44px, 7vw, 82px);
            line-height: 0.94;
            letter-spacing: -0.075em;
            margin-bottom: 24px;
          }
            .lp-landing .gradient-text {
              background: linear-gradient(135deg, var(--amber-light), var(--brass) 50%, var(--wood-oak));
              -webkit-background-clip: text;
              background-clip: text;
              color: transparent;
              font-weight: 900;
              padding-right: 0.05em;
            }
          .lp-landing .hero-copy {
            color: var(--soft);
            font-size: 18px;
            line-height: 1.7;
            max-width: 620px;
            margin-bottom: 30px;
          }
          .lp-landing .hero-actions {
            display: flex;
            flex-wrap: wrap;
            gap: 14px;
            margin-bottom: 24px;
          }
          .lp-landing .btn {
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
            text-decoration: none;
          }
          .lp-landing .btn:hover {
            transform: translateY(-2px);
          }
          .lp-landing .btn-primary {
            color: white;
            color: var(--ink);
            background: linear-gradient(135deg, var(--brass), var(--amber) 70%);
            box-shadow: 0 14px 34px rgba(var(--brass-rgb), 0.3);
          }
          .lp-landing .btn-primary:hover {
            box-shadow: 0 18px 44px rgba(var(--amber-rgb), 0.34);
          }
          .lp-landing .btn-secondary {
            color: var(--cream);
            background: rgba(var(--amber-rgb), 0.08);
            border-color: rgba(var(--amber-rgb), 0.42);
          }
          .lp-landing .btn-secondary:hover {
            background: rgba(var(--amber-rgb), 0.14);
            box-shadow: 0 14px 34px rgba(var(--amber-rgb), 0.12);
          }
          .lp-landing .btn-ghost {
            background: rgba(var(--slate-400-rgb), 0.08);
            border-color: rgba(var(--slate-400-rgb), 0.12);
            color: var(--soft);
          }
          .lp-landing .btn-ghost:hover {
            background: rgba(var(--slate-400-rgb), 0.13);
            color: white;
          }
          .lp-landing .micro-trust {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 16px;
            color: var(--muted);
            font-size: 13px;
          }
          .lp-landing .avatars {
            display: flex;
            align-items: center;
          }
          .lp-landing .avatar {
            width: 31px;
            height: 31px;
            border-radius: 50%;
            display: grid;
            place-items: center;
            background: linear-gradient(135deg, var(--slate-700), var(--slate-500));
            border: 2px solid var(--bg-950);
            margin-left: -8px;
            font-size: 11px;
            font-weight: 800;
          }
          .lp-landing .avatar:first-child { margin-left: 0; }
          .lp-landing .stars {
            color: var(--yellow);
            letter-spacing: 1px;
          }
           .lp-landing .hero-visual {
             position: relative;
             min-height: 55vh;
             display: flex;
             align-items: center;
             justify-content: center;
           }
          .lp-landing .glow-orb {
            position: absolute;
            width: 420px;
            height: 420px;
            border-radius: 50%;
            background: radial-gradient(circle, rgba(var(--brass-rgb), 0.22), transparent 67%);
            filter: blur(8px);
            animation: float 7s ease-in-out infinite;
          }
          @keyframes float {
            0%,100% { transform: translateY(0); }
            50% { transform: translateY(-18px); }
          }
          .lp-landing .floating-card {
            position: absolute;
            z-index: 6;
            padding: 13px 14px;
            border-radius: 16px;
            background: rgba(var(--slate-900-rgb), 0.86);
            backdrop-filter: blur(14px);
            border: 1px solid rgba(var(--slate-400-rgb), 0.17);
            box-shadow: 0 18px 46px rgba(var(--black-rgb), 0.32);
            color: white;
            animation: float 6s ease-in-out infinite;
          }
          .lp-landing .floating-card small {
            display: block;
            color: var(--muted);
            margin-top: 4px;
            font-size: 11px;
          }
          .lp-landing .float-a { left: -14px; top: 88px; }
          .lp-landing .float-b { right: -8px; bottom: 70px; animation-delay: -2s; }
          .lp-landing .app-window {
            position: relative;
            width: min(100%, 720px);
            border-radius: 24px;
            overflow: hidden;
            background: rgba(var(--slate-900-rgb), 0.94);
            border: 1px solid rgba(var(--slate-400-rgb), 0.18);
            box-shadow: var(--shadow), 0 0 0 1px rgba(var(--white-rgb), 0.03) inset;
            transform: perspective(1100px) rotateY(-6deg) rotateX(3deg);
            animation: windowIn 700ms ease both;
          }
          @keyframes windowIn {
            from { opacity: 0; transform: perspective(1100px) rotateY(-10deg) rotateX(5deg) translateY(18px); }
            to { opacity: 1; transform: perspective(1100px) rotateY(-6deg) rotateX(3deg) translateY(0); }
          }
          .lp-landing .window-top {
            height: 46px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 16px;
            border-bottom: 1px solid rgba(var(--slate-400-rgb), 0.14);
            background: rgba(var(--slate-950-rgb), 0.48);
          }
          .lp-landing .dots { display: flex; gap: 7px; }
          .lp-landing .dot { width: 10px; height: 10px; border-radius: 50%; }
          .lp-landing .dot:nth-child(1) { background: var(--pink); }
          .lp-landing .dot:nth-child(2) { background: var(--yellow); }
          .lp-landing .dot:nth-child(3) { background: var(--sage); }
          .lp-landing .window-title {
            color: var(--muted);
            font-size: 12px;
            font-weight: 800;
            letter-spacing: 0.04em;
          }
          .lp-landing .chip {
            font-size: 10px;
            font-weight: 900;
            padding: 5px 7px;
            border-radius: 8px;
            background: rgba(var(--white-rgb), 0.08);
            color: var(--amber-light);
            border: 1px solid rgba(var(--white-rgb), 0.1);
          }
          .lp-landing .scan-line {
            position: absolute;
            z-index: 3;
            left: 26px;
            right: 26px;
            height: 2px;
            background: linear-gradient(90deg, transparent, rgba(var(--brass-rgb), 0.9), transparent);
            filter: drop-shadow(0 0 12px rgba(var(--brass-rgb), 0.68));
            animation: scan 3.4s ease-in-out infinite;
          }
          @keyframes scan {
            0%, 100% { top: 18%; opacity: 0.2; }
            45% { opacity: 1; }
            70% { top: 78%; opacity: 0.5; }
          }

            .lp-landing .hero-media-shell {
             position: relative;
             aspect-ratio: 640 / 520;
             background: var(--bg-hero);
             overflow: hidden;
             display: flex;
             flex-direction: column;
            }
           .lp-landing .hero-video-clickable {
             cursor: pointer;
             position: relative;
             height: 100%;
           }
          .lp-landing .hero-video-tooltip {
            position: absolute;
            z-index: 10;
            white-space: nowrap;
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 9px 18px 9px 20px;
            border-radius: 999px;
            background: rgba(var(--slate-900-rgb), 0.55);
            backdrop-filter: blur(18px) saturate(1.4);
            -webkit-backdrop-filter: blur(18px) saturate(1.4);
            border: 1px solid rgba(var(--brass-rgb), 0.35);
            box-shadow: 0 8px 32px rgba(var(--black-rgb), 0.35), 0 0 0 1px rgba(var(--brass-rgb), 0.1) inset;
            color: var(--cream);
            font-weight: 900;
            font-size: 12px;
            letter-spacing: 0.02em;
            pointer-events: none;
            opacity: 0;
            transform: translateY(4px);
            transition: opacity 160ms ease, transform 240ms cubic-bezier(0.22, 1, 0.36, 1);
          }
          .lp-landing .hero-video-tooltip.visible {
            opacity: 1;
            transform: translateY(0);
          }
          .lp-landing .hero-video-tooltip::after {
            content: "→";
            font-size: 14px;
            color: var(--brass);
            font-weight: 900;
            transition: transform 180ms ease;
          }
          .lp-landing .hero-video-clickable:hover .hero-video-tooltip::after {
            transform: translateX(4px);
          }
          .lp-landing .hero-product-video,
          .lp-landing .real-product-image {
            width: 100%;
            height: 100%;
            display: block;
            object-fit: cover;
          }
           .lp-landing .hero-product-video {
             width: 100%;
             height: 100%;
             object-fit: cover;
           }
          .lp-landing .hero-media-shell::after,
          .lp-landing .real-media-card::after {
            content: "";
            position: absolute;
            inset: 0;
            pointer-events: none;
            background:
              radial-gradient(circle at 20% 0%, rgba(var(--brass-rgb), 0.13), transparent 34%),
              linear-gradient(180deg, rgba(var(--slate-950-rgb), 0.05), rgba(var(--slate-950-rgb), 0.22));
          }
          .lp-landing .media-caption-bar {
            position: absolute;
            left: 16px;
            right: 16px;
            bottom: 16px;
            z-index: 4;
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 12px;
            padding: 12px 14px;
            border-radius: 14px;
            background: rgba(var(--slate-950-rgb), 0.68);
            border: 1px solid rgba(var(--slate-400-rgb), 0.16);
            backdrop-filter: blur(14px);
            color: var(--soft);
            font-size: 12px;
            font-weight: 800;
          }
           .lp-landing .real-media-card {
             position: relative;
             width: 100%;
             height: 100%;
             aspect-ratio: 4 / 3;
             border-radius: 18px;
            overflow: hidden;
            border: 1px solid rgba(var(--slate-400-rgb), 0.14);
            background: rgba(var(--slate-950-rgb), 0.42);
            box-shadow: 0 18px 46px rgba(var(--black-rgb), 0.22);
          }
           .lp-landing .real-media-card .real-product-image {
           }
          .lp-landing .workflow-media-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-top: 24px;
          }
          .lp-landing .workflow-media-card {
            border-radius: 20px;
            overflow: hidden;
            border: 1px solid rgba(var(--brass-rgb), 0.18);
            background: var(--card);
            box-shadow: 0 20px 60px rgba(var(--black-rgb), 0.2);
          }
          .lp-landing .workflow-media-card img {
            width: 100%;
            display: block;
            aspect-ratio: 16 / 8.2;
            object-fit: cover;
          }
          .lp-landing .workflow-media-copy {
            padding: 18px 20px;
            border-top: 1px solid rgba(var(--slate-400-rgb), 0.1);
          }
          .lp-landing .workflow-media-copy h3 {
            font-size: 17px;
            margin-bottom: 8px;
          }
          .lp-landing .workflow-media-copy p {
            color: var(--muted);
            line-height: 1.6;
            font-size: 13px;
          }
          .lp-landing .proof-strip {
            border-top: 1px solid rgba(var(--slate-400-rgb), 0.1);
            border-bottom: 1px solid rgba(var(--slate-400-rgb), 0.1);
            background: rgba(var(--slate-900-rgb), 0.32);
            backdrop-filter: blur(18px);
          }
          .lp-landing .proof-grid {
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 18px;
            padding: 30px 0;
          }
          .lp-landing .proof-item {
            text-align: center;
            padding: 14px 10px;
            border-radius: 16px;
            transition: background 180ms ease, transform 180ms ease;
          }
          .lp-landing .proof-item:hover {
            background: rgba(var(--brass-rgb), 0.09);
            transform: translateY(-3px);
          }
          .lp-landing .proof-item strong {
            display: block;
            color: var(--brass);
            font-size: 23px;
            margin-bottom: 4px;
          }
          .lp-landing .proof-item span {
            display: block;
            color: white;
            font-weight: 850;
            font-size: 13px;
          }
          .lp-landing .proof-item small {
            color: var(--muted);
            font-size: 11px;
          }
           .lp-landing section {
             padding: 8vh 0;
             position: relative;
           }
          .lp-landing .section-heading {
            text-align: center;
            max-width: 720px;
            margin: 0 auto 46px;
          }
          .lp-landing .section-heading h2 {
            font-size: clamp(30px, 4vw, 48px);
            line-height: 1.05;
            letter-spacing: -0.045em;
            margin-bottom: 14px;
            color: var(--text);
          }
          .lp-landing .section-heading p {
            color: var(--muted);
            font-size: 16px;
            line-height: 1.7;
          }
          .lp-landing .product-showcase {
            display: grid;
            grid-template-columns: 1.35fr 0.85fr;
            gap: 24px;
            align-items: stretch;
          }
          .lp-landing .showcase-main, .lp-landing .showcase-side {
            border: 1px solid var(--border);
            background: var(--card);
            box-shadow: 0 20px 60px rgba(var(--black-rgb), 0.2);
          }
          .lp-landing .showcase-main {
            border-radius: var(--radius-lg);
            padding: 26px;
            overflow: hidden;
          }
          .lp-landing .showcase-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 16px;
            margin-bottom: 22px;
          }
          .lp-landing .showcase-header h3 {
            font-size: 20px;
            letter-spacing: -0.02em;
          }
           .lp-landing .showcase-preview {
             min-height: 40vh;
             border-radius: 22px;
            background:
              linear-gradient(135deg, rgba(var(--slate-950-rgb), 0.65), rgba(var(--slate-900-rgb), 0.92)),
              radial-gradient(circle at 72% 32%, rgba(var(--wood-walnut-rgb), 0.26), transparent 28%);
            border: 1px solid rgba(var(--slate-400-rgb), 0.13);
            position: relative;
            overflow: hidden;
            padding: 28px;
            display: grid;
            place-items: center;
          }

          .lp-landing .showcase-side {
            border-radius: var(--radius-lg);
            padding: 22px;
            display: grid;
            gap: 16px;
          }
          .lp-landing .mini-card {
            padding: 18px;
            border-radius: 18px;
            background: rgba(var(--slate-950-rgb), 0.3);
            border: 1px solid rgba(var(--slate-400-rgb), 0.12);
          }
          .lp-landing .mini-card h4 {
            margin-bottom: 8px;
            font-size: 15px;
          }
          .lp-landing .mini-card p {
            color: var(--muted);
            font-size: 13px;
            line-height: 1.6;
          }
          .lp-landing .progress {
            height: 8px;
            border-radius: 999px;
            background: rgba(var(--slate-400-rgb), 0.12);
            overflow: hidden;
            margin-top: 12px;
          }
          .lp-landing .progress span {
            display: block;
            height: 100%;
            width: 76%;
            border-radius: inherit;
            background: linear-gradient(90deg, var(--wood-walnut), var(--brass));
            animation: progressLoad 2.6s ease-in-out infinite alternate;
          }
          @keyframes progressLoad {
            from { width: 42%; }
            to { width: 92%; }
          }
          .lp-landing .visual-chip-row {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-top: 18px;
          }
          .lp-landing .features-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 22px;
          }
          .lp-landing .feature-card {
            position: relative;
            border-radius: var(--radius-md);
            padding: 28px;
            overflow: hidden;
            border: 1px solid var(--border);
            background: var(--card);
            box-shadow: 0 20px 60px rgba(var(--black-rgb), 0.2);
            transition: transform 220ms ease, border-color 220ms ease, background 220ms ease;
          }
          .lp-landing .feature-card::before {
            content: "";
            position: absolute;
            inset: -1px;
            background: radial-gradient(circle at 20% 0%, rgba(var(--brass-rgb), 0.2), transparent 34%);
            opacity: 0;
            transition: opacity 220ms ease;
            pointer-events: none;
          }
          .lp-landing .feature-card:hover {
            transform: translateY(-8px);
            border-color: rgba(var(--brass-rgb), 0.36);
            background: var(--card-strong);
          }
          .lp-landing .feature-card:hover::before { opacity: 1; }
          .lp-landing .icon-box {
            width: 48px;
            height: 48px;
            border-radius: 14px;
            display: grid;
            place-items: center;
            background: rgba(var(--brass-rgb), 0.15);
            border: 1px solid rgba(var(--brass-rgb), 0.24);
            color: var(--amber-light);
            font-size: 22px;
            margin-bottom: 22px;
          }
          .lp-landing .feature-card h3 {
            font-size: 20px;
            margin-bottom: 12px;
            letter-spacing: -0.02em;
          }
          .lp-landing .feature-card p {
            color: var(--muted);
            line-height: 1.7;
            font-size: 14px;
            margin-bottom: 18px;
          }
          .lp-landing .tick-list {
            list-style: none;
            display: grid;
            gap: 11px;
            color: var(--soft);
            font-size: 13px;
          }
          .lp-landing .tick-list li::before {
            content: "✓";
            color: var(--brass);
            margin-right: 8px;
            font-weight: 900;
          }
          .lp-landing .workflow {
            background: rgba(var(--slate-900-rgb), 0.34);
            border-top: 1px solid rgba(var(--slate-400-rgb), 0.08);
            border-bottom: 1px solid rgba(var(--slate-400-rgb), 0.08);
          }
          .lp-landing .workflow-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 18px;
            position: relative;
          }
          .lp-landing .workflow-step {
            padding: 24px;
            border-radius: 20px;
            background: rgba(var(--slate-900-rgb), 0.68);
            border: 1px solid rgba(var(--slate-400-rgb), 0.13);
            position: relative;
             min-height: 25vh;
            box-shadow: 0 20px 60px rgba(var(--black-rgb), 0.2);
          }
          .lp-landing .step-number {
            width: 40px;
            height: 40px;
            border-radius: 13px;
            background: linear-gradient(135deg, var(--brass), var(--wood-walnut));
            display: grid;
            place-items: center;
            font-weight: 900;
            margin-bottom: 18px;
            box-shadow: 0 12px 28px rgba(var(--brass-rgb), 0.22);
          }
          .lp-landing .workflow-step h3 {
            font-size: 17px;
            margin-bottom: 9px;
          }
          .lp-landing .workflow-step p {
            color: var(--muted);
            line-height: 1.6;
            font-size: 13px;
          }
          .lp-landing .stats-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
            margin-top: 24px;
          }
          .lp-landing .stat-card {
            border: 1px solid var(--border);
            background: var(--card);
            box-shadow: 0 20px 60px rgba(var(--black-rgb), 0.2);
            border-radius: 20px;
            padding: 24px;
            text-align: center;
          }
          .lp-landing .stat-card strong {
            display: block;
            font-size: 31px;
            letter-spacing: -0.04em;
            color: var(--amber-light);
            margin-bottom: 6px;
          }
          .lp-landing .stat-card span {
            color: var(--muted);
            font-size: 13px;
            line-height: 1.5;
          }
          .lp-landing .pricing-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 360px));
            gap: 24px;
            justify-content: center;
            align-items: stretch;
          }
          .lp-landing .pricing-card {
            position: relative;
            border-radius: 22px;
            padding: 30px;
            border: 1px solid var(--border);
            background: var(--card);
            box-shadow: 0 20px 60px rgba(var(--black-rgb), 0.2);
          }
          .lp-landing .pricing-card.featured {
            border-color: var(--border-strong);
            box-shadow: 0 24px 80px rgba(var(--brass-rgb), 0.18);
            transform: scale(1.025);
          }
          .lp-landing .popular {
            position: absolute;
            top: -13px;
            right: 22px;
            padding: 6px 12px;
            border-radius: 999px;
            background: linear-gradient(135deg, var(--amber-light), var(--brass));
            color: var(--ink);
            font-size: 11px;
            font-weight: 950;
          }
          .lp-landing .plan-name {
            font-size: 18px;
            font-weight: 900;
            margin: 16px 0 8px;
          }
          .lp-landing .price {
            display: flex;
            align-items: end;
            gap: 5px;
            margin-bottom: 12px;
          }
          .lp-landing .price strong {
            font-size: 46px;
            letter-spacing: -0.06em;
          }
          .lp-landing .price span {
            color: var(--muted);
            padding-bottom: 8px;
          }
          .lp-landing .plan-copy {
            color: var(--muted);
            line-height: 1.6;
            font-size: 14px;
            min-height: 46px;
            margin-bottom: 22px;
          }
          .lp-landing .pricing-btn {
            width: 100%;
            margin-bottom: 22px;
          }
          .lp-landing .comparison-card {
            margin: 42px auto 0;
            max-width: 850px;
            border: 1px solid var(--border);
            background: var(--card);
            box-shadow: 0 20px 60px rgba(var(--black-rgb), 0.2);
            border-radius: 24px;
            padding: 12px;
            overflow: hidden;
          }
          .lp-landing .comparison-table {
            width: 100%;
            border-collapse: collapse;
            overflow: hidden;
            border-radius: 18px;
          }
          .lp-landing .comparison-table th,
          .lp-landing .comparison-table td {
            padding: 16px;
            border-bottom: 1px solid rgba(var(--slate-400-rgb), 0.1);
            color: var(--soft);
            text-align: center;
            font-size: 14px;
          }
          .lp-landing .comparison-table th:first-child,
          .lp-landing .comparison-table td:first-child {
            text-align: left;
          }
          .lp-landing .comparison-table th {
            color: white;
            background: rgba(var(--slate-950-rgb), 0.28);
            font-weight: 900;
          }
          .lp-landing .comparison-table tr:last-child td { border-bottom: 0; }
          .lp-landing .yes { color: var(--sage); font-weight: 900; }
          .lp-landing .no { color: var(--terracotta); font-weight: 900; }
          .lp-landing .contact-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
          }
          .lp-landing .contact-card {
            border: 1px solid var(--border);
            background: var(--card);
            box-shadow: 0 20px 60px rgba(var(--black-rgb), 0.2);
            border-radius: 20px;
            padding: 24px;
          }
          .lp-landing .contact-card h3 {
            font-size: 15px;
            color: var(--amber-light);
            text-transform: uppercase;
            letter-spacing: 0.09em;
            margin-bottom: 16px;
          }
          .lp-landing .contact-card p {
            color: var(--soft);
            line-height: 1.8;
            font-size: 14px;
          }
           .lp-landing .final-cta {
             padding: 8vh 0;
            background:
              radial-gradient(circle at 50% 0%, rgba(var(--white-rgb), 0.18), transparent 30%),
              linear-gradient(135deg, var(--wood-dark), var(--wood-walnut) 52%, var(--bg-900));
            text-align: center;
          }
          .lp-landing .final-cta h2 {
            font-size: clamp(34px, 5vw, 58px);
            line-height: 1.02;
            letter-spacing: -0.055em;
            margin-bottom: 16px;
            color: var(--text);
          }
          .lp-landing .final-cta p {
            color: var(--amber-light);
            max-width: 620px;
            margin: 0 auto 28px;
            line-height: 1.7;
          }
           .lp-landing footer {
             padding: 3vh 0;
            background: var(--bg-hero);
            border-top: 1px solid rgba(var(--slate-400-rgb), 0.08);
          }
          .lp-landing .footer-inner {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 18px;
            color: var(--muted);
            font-size: 13px;
          }
          .lp-landing .footer-inner .brand {
            display: flex;
            align-items: center;
            gap: 12px;
            font-weight: 800;
            letter-spacing: -0.03em;
            color: var(--slate-50);
          }
          .lp-landing .footer-inner .brand-mark {
            width: 34px;
            height: 34px;
            border-radius: 10px;
            display: grid;
            place-items: center;
            background: linear-gradient(135deg, var(--brass), var(--wood-walnut));
            box-shadow: 0 12px 32px rgba(var(--brass-rgb), 0.28);
            font-size: 14px;
            color: white;
          }
          .lp-landing .footer-inner .brand-text {
            font-size: 14px;
          }
          .lp-landing .footer-inner .brand-text small {
            display: block;
            color: var(--slate-400);
            font-size: 10px;
            letter-spacing: 0.06em;
            text-transform: uppercase;
            margin-top: -2px;
          }
          .lp-landing .footer-links {
            display: flex;
            gap: 20px;
          }
          .lp-landing .footer-links a {
            color: var(--muted);
            transition: color 180ms ease;
          }
          .lp-landing .footer-links a:hover {
            color: white;
          }
          .lp-light-theme .eyebrow {
            background: rgba(var(--off-white-rgb), 0.74);
            color: var(--wood-dark);
            border-color: rgba(var(--light-brass-rgb), 0.34);
            box-shadow: 0 10px 30px rgba(var(--wood-dark-rgb), 0.08);
          }
          .lp-light-theme .btn-secondary {
            color: var(--wood-dark);
            background: rgba(var(--off-white-rgb), 0.72);
            border-color: rgba(var(--light-brass-rgb), 0.38);
          }
          .lp-light-theme .btn-secondary:hover {
            background: rgba(var(--cream-rgb), 0.94);
          }
          .lp-light-theme .btn-ghost {
            background: rgba(var(--wood-walnut-rgb), 0.06);
            border-color: rgba(var(--wood-walnut-rgb), 0.14);
            color: var(--wood-dark);
          }
          .lp-light-theme .btn-ghost:hover {
            background: rgba(var(--wood-walnut-rgb), 0.1);
            color: var(--wood-dark);
          }
          .lp-light-theme .avatar {
            background: linear-gradient(135deg, var(--beige), var(--wood-oak));
            border-color: var(--off-white);
            color: var(--wood-dark);
          }
          .lp-light-theme .floating-card,
          .lp-light-theme .app-window,
          .lp-light-theme .showcase-main,
          .lp-light-theme .showcase-side,
          .lp-light-theme .mini-card,
          .lp-light-theme .feature-card,
          .lp-light-theme .workflow-step,
          .lp-light-theme .stat-card,
          .lp-light-theme .pricing-card,
          .lp-light-theme .comparison-card,
          .lp-light-theme .contact-card,
          .lp-light-theme .proof-item {
            background: var(--card-strong);
            border-color: var(--border);
            box-shadow: var(--shadow);
          }
          .lp-light-theme .app-window {
            background: linear-gradient(180deg, rgba(var(--off-white-rgb), 0.96), rgba(var(--bg-light-900-rgb), 0.94));
          }
          .lp-light-theme .window-top {
            background: rgba(var(--off-white-rgb), 0.72);
            border-color: rgba(var(--wood-walnut-rgb), 0.14);
          }
          .lp-light-theme .showcase-preview {
            background: linear-gradient(180deg, rgba(var(--off-white-rgb), 0.84), rgba(var(--beige-rgb), 0.92));
            border-color: rgba(var(--wood-walnut-rgb), 0.13);
          }
          .lp-light-theme .chip,
          .lp-light-theme .progress {
            background: rgba(var(--wood-walnut-rgb), 0.055);
            border-color: rgba(var(--wood-walnut-rgb), 0.13);
            color: var(--wood-dark);
          }
          .lp-light-theme .proof-strip {
            border-color: rgba(var(--wood-walnut-rgb), 0.12);
            background: rgba(var(--off-white-rgb), 0.46);
          }
          .lp-light-theme .pricing-card.featured {
            background: linear-gradient(180deg, rgba(var(--off-white-rgb), 0.98), rgba(var(--bg-light-900-rgb), 0.98));
            border-color: rgba(var(--light-brass-rgb), 0.48);
          }
          .lp-light-theme .final-cta,
          .lp-light-theme footer {
            background: linear-gradient(135deg, var(--wood-dark), var(--wood-walnut) 58%, var(--bg-900));
            color: var(--text);
          }
          .lp-light-theme .final-cta p,
          .lp-light-theme footer,
          .lp-light-theme .footer-links a {
            color: rgba(var(--text-rgb), 0.76);
          }
          .lp-light-theme .brand-mark,
          .lp-light-theme .footer-inner .brand-mark {
            color: var(--wood-dark);
          }
          .lp-landing .reveal {
            opacity: 0;
            transform: translateY(18px);
            transition: opacity 600ms ease, transform 600ms ease;
          }
          .lp-landing .reveal.visible {
            opacity: 1;
            transform: translateY(0);
          }
          @media (max-width: 1040px) {
            .lp-landing .hero-grid, .lp-landing .product-showcase {
              grid-template-columns: 1fr;
            }
            .lp-landing .hero-visual { min-height: 50vh; }
            .lp-landing .app-window { transform: none; }
            .lp-landing .proof-grid { grid-template-columns: repeat(3, 1fr); }
            .lp-landing .features-grid, .lp-landing .workflow-grid, .lp-landing .stats-grid, .lp-landing .contact-grid { grid-template-columns: 1fr 1fr; }
          }
          @media (max-width: 780px) {
            .lp-landing .container { width: min(100% - 28px, var(--max)); }
            .lp-landing .hero { padding-top: 2vh; }
            .lp-landing .hero-actions { flex-direction: column; align-items: stretch; }
             .lp-landing .hero-visual { min-height: 40vh; order: -1; flex-direction: column; }
             .lp-landing .hero-media-shell { aspect-ratio: 640 / 360; }
            .lp-landing .hero-content { order: 1; }
             .lp-landing .eyebrow-mobile { display: inline-flex; margin-bottom: 14px; padding: 5px 10px; }
            .lp-landing .hero-content .eyebrow { display: none; }
            .lp-landing .mobile-phrase-rotator { display: block; text-align: center; margin-bottom: 10px; }
            .lp-landing .hero-content h1 { display: none; }
            .lp-landing .showcase-preview { min-height: 30vh; }
             .lp-landing .btn { width: 100%; }
             .lp-landing .hero-copy { font-size: 15px; text-align: justify; }
            .lp-landing .floating-card { display: none; }
            .lp-landing .proof-grid { grid-template-columns: repeat(2, 1fr); }
            .lp-landing .features-grid, .lp-landing .workflow-grid, .lp-landing .workflow-media-grid, .lp-landing .stats-grid, .lp-landing .pricing-grid, .lp-landing .contact-grid { grid-template-columns: 1fr; }
            .lp-landing .pricing-card.featured { transform: none; }
            .lp-landing .comparison-card { overflow-x: auto; }
            .lp-landing .comparison-table { min-width: 620px; }
            .lp-landing .footer-inner { flex-direction: column; align-items: flex-start; }
          }
          @media (prefers-reduced-motion: reduce) {
            .lp-landing *, .lp-landing *::before, .lp-landing *::after {
              animation-duration: 0.01ms !important;
              animation-iteration-count: 1 !important;
              scroll-behavior: auto !important;
              transition-duration: 0.01ms !important;
            }
          }
        `}</style>
      </div>
    </>
  );
};
