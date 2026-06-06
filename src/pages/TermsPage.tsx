import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { LandingHeader } from '../components/LandingHeader';

const tocSections = [
  { id: '1-terms-of-service', num: '01', title: 'Terms of Service' },
  { id: '2-privacy-policy', num: '02', title: 'Privacy Policy' },
  { id: '3-acceptable-use-policy', num: '03', title: 'Acceptable Use Policy' },
  { id: '4-cookie-policy', num: '04', title: 'Cookie Policy' },
  { id: '5-subscription-billing-policy', num: '05', title: 'Subscription & Billing Policy' },
  { id: '6-disclaimer-limitation-of-liability', num: '06', title: 'Disclaimer & Limitation of Liability' },
  { id: '7-refund-cancellation-policy', num: '07', title: 'Refund & Cancellation Policy' },
  { id: '8-data-retention-deletion-policy', num: '08', title: 'Data Retention & Deletion Policy' },
  { id: '9-contact-information', num: '09', title: 'Contact Information' },
  { id: '10-governing-law-dispute-resolution', num: '10', title: 'Governing Law & Dispute Resolution' },
  { id: '11-severability', num: '11', title: 'Severability' },
  { id: '12-entire-agreement', num: '12', title: 'Entire Agreement' },
];

interface TermsPageProps {
  onSignIn: () => void;
  onGetStarted: () => void;
  isDark: boolean;
  setIsDark: (isDark: boolean) => void;
}

export const TermsPage: React.FC<TermsPageProps> = ({
  onSignIn,
  onGetStarted,
  isDark,
  setIsDark,
}) => {
  const [activeSection, setActiveSection] = useState('1-terms-of-service');

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash) {
      setActiveSection(hash);
      setTimeout(() => {
        const el = document.getElementById(hash);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  useEffect(() => {
    const tocLinks = Array.from(document.querySelectorAll<HTMLElement>('.toc-link, .mobile-tab'));
    const sectionIds = tocLinks.map(l => l.getAttribute('href')?.replace('#', '')).filter(Boolean) as string[];
    const sectionEls = sectionIds.map(id => document.getElementById(id)).filter(Boolean) as HTMLElement[];

    const setActive = () => {
      if (!sectionEls.length) return;
      let current = sectionEls[0];
      for (const el of sectionEls) {
        const rect = el.getBoundingClientRect();
        if (rect.top <= 150) current = el;
      }
      const id = current.id;
      setActiveSection(id);
      tocLinks.forEach(l => {
        const href = l.getAttribute('href')?.replace('#', '');
        l.classList.toggle('active', href === id);
      });
    };

    setActive();
    window.addEventListener('scroll', setActive, { passive: true });
    return () => window.removeEventListener('scroll', setActive);
  }, []);

  return (
    <>
      <Helmet>
        <title>Terms of Service - CabEngine Pro</title>
        <link rel="canonical" href="https://www.protradee.com/terms" />
        <meta name="description" content="CabEngine Pro terms of service and conditions of use for our cabinet design software platform." />
      </Helmet>
      <div className={`legal-page ${isDark ? 'lp-dark-theme' : 'lp-light-theme'}`}>
        <LandingHeader
          onSignIn={onSignIn}
          onGetStarted={onGetStarted}
          isDark={isDark}
          setIsDark={setIsDark}
        />

        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }

          .legal-page {
            position: relative;
            min-height: 100vh;
            font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            color: var(--text);
            background:
              repeating-linear-gradient(0deg, var(--grid-line) 0px, transparent 1px, transparent 72px),
              repeating-linear-gradient(90deg, var(--grid-line) 0px, transparent 1px, transparent 72px),
              radial-gradient(circle at 14% 6%, rgba(var(--wood-walnut-rgb), 0.22), transparent 28%),
              radial-gradient(circle at 84% 10%, rgba(var(--brass-rgb), 0.16), transparent 24%),
              linear-gradient(180deg, var(--bg-950), var(--bg-900) 42%, var(--bg-950) 100%);
            background-blend-mode: normal, normal, normal, normal, normal;
          }
          a { color: inherit; text-decoration: none; }
          button { font: inherit; cursor: pointer; }
          .legal-container { width: min(var(--max, 1180px), calc(100% - 40px)); margin-inline: auto; }

          .page { padding-top: 50px; padding-bottom: 70px; }

          .legal-hero {
            position: relative;
            overflow: hidden;
            border: 1px solid var(--border);
            border-radius: var(--radius-lg, 28px);
            background:
              radial-gradient(circle at 18% 0%, rgba(var(--brass-rgb), 0.18), transparent 36%),
              radial-gradient(circle at 86% 12%, rgba(var(--wood-oak-rgb), 0.18), transparent 32%),
              linear-gradient(135deg, var(--card-strong), rgba(var(--slate-950-rgb), 0.62));
            box-shadow: var(--shadow);
            padding: 42px;
            margin-bottom: 28px;
          }
          .lp-light-theme .legal-hero {
            background:
              radial-gradient(circle at 18% 0%, rgba(var(--brass-rgb), 0.18), transparent 36%),
              radial-gradient(circle at 86% 12%, rgba(var(--wood-oak-rgb), 0.16), transparent 32%),
              linear-gradient(135deg, var(--card-strong), rgba(var(--beige-rgb), 0.58));
          }
          .legal-hero::before {
            content: "";
            position: absolute;
            inset: 0;
            pointer-events: none;
            background-image:
              linear-gradient(rgba(var(--white-rgb), 0.035) 1px, transparent 1px),
              linear-gradient(90deg, rgba(var(--white-rgb), 0.035) 1px, transparent 1px);
            background-size: 38px 38px;
            mask-image: radial-gradient(circle at 20% 0%, black, transparent 64%);
          }
          .lp-light-theme .legal-hero::before {
            background-image:
              linear-gradient(rgba(var(--wood-dark-rgb), 0.04) 1px, transparent 1px),
              linear-gradient(90deg, rgba(var(--wood-dark-rgb), 0.04) 1px, transparent 1px);
          }
          .hero-content { position: relative; z-index: 1; display: grid; grid-template-columns: 1fr auto; gap: 28px; align-items: end; }
          .eyebrow {
            width: fit-content;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 7px 12px;
            border-radius: 999px;
            border: 1px solid rgba(var(--brass-rgb), 0.38);
            background: rgba(var(--brass-rgb), 0.10);
            color: var(--amber-light);
            font-size: 12px;
            font-weight: 950;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            margin-bottom: 18px;
          }
          .lp-light-theme .eyebrow { color: var(--light-brass); }
          .legal-page h1 {
            max-width: 820px;
            font-size: clamp(38px, 5vw, 68px);
            line-height: 0.96;
            letter-spacing: -0.07em;
            margin-bottom: 18px;
            font-weight: 900;
          }
          .gradient-text {
            background: linear-gradient(135deg, var(--amber-light), var(--brass) 48%, var(--wood-oak));
            -webkit-background-clip: text;
            background-clip: text;
            color: transparent;
          }
          .hero-copy {
            max-width: 760px;
            color: var(--soft);
            font-size: 16px;
            line-height: 1.7;
          }
          .hero-meta {
            min-width: 260px;
            display: grid;
            gap: 12px;
          }
          .meta-card {
            border: 1px solid var(--border);
            background: rgba(var(--slate-950-rgb), 0.22);
            border-radius: 18px;
            padding: 16px;
          }
          .lp-light-theme .meta-card { background: rgba(var(--off-white-rgb), 0.58); }
          .meta-card span {
            display: block;
            color: var(--muted);
            font-size: 11px;
            font-weight: 900;
            letter-spacing: 0.10em;
            text-transform: uppercase;
            margin-bottom: 5px;
          }
          .meta-card strong { font-size: 14px; color: var(--text); }

          .layout {
            display: grid;
            grid-template-columns: 306px minmax(0, 870px);
            gap: 30px;
            align-items: start;
            justify-content: center;
          }
          .legal-sidebar {
            position: sticky;
            top: 98px;
            border: 1px solid var(--border);
            border-radius: var(--radius-md, 18px);
            background: var(--card);
            box-shadow: 0 20px 60px rgba(0,0,0,0.16);
            overflow: hidden;
          }
          .sidebar-head {
            padding: 22px 22px 18px;
            border-bottom: 1px solid var(--border);
            background: linear-gradient(180deg, rgba(var(--brass-rgb), 0.10), transparent);
          }
          .sidebar-head strong { display: block; margin-bottom: 6px; font-size: 15px; letter-spacing: -0.02em; color: var(--text); }
          .sidebar-head p { color: var(--muted); font-size: 13px; line-height: 1.55; }
          .toc {
            padding: 12px;
            display: grid;
            gap: 6px;
            max-height: calc(100vh - 160px);
            overflow: auto;
          }
          .toc::-webkit-scrollbar, .mobile-tabs::-webkit-scrollbar { width: 0; height: 0; }
          .toc-link {
            display: grid;
            grid-template-columns: 32px 1fr;
            align-items: center;
            gap: 10px;
            min-height: 46px;
            padding: 8px 10px;
            border-radius: 14px;
            color: var(--soft);
            border: 1px solid transparent;
            font-size: 13px;
            font-weight: 850;
            transition: background 180ms ease, border-color 180ms ease, transform 180ms ease, color 180ms ease;
            text-decoration: none;
            background: none;
            text-align: left;
            width: 100%;
          }
          .toc-link:hover, .toc-link.active {
            background: rgba(var(--brass-rgb), 0.10);
            border-color: rgba(var(--brass-rgb), 0.26);
            color: var(--text);
            transform: translateX(2px);
          }
          .num-badge {
            width: 30px;
            height: 30px;
            border-radius: 11px;
            display: grid;
            place-items: center;
            background: rgba(var(--brass-rgb), 0.13);
            border: 1px solid rgba(var(--brass-rgb), 0.20);
            color: var(--brass);
            font-size: 11px;
            font-weight: 950;
          }
          .toc-link.active .num-badge { background: linear-gradient(135deg, var(--brass), var(--amber)); color: #17110A; }

          .mobile-tabs-wrap { display: none; }

          .content { display: grid; gap: 22px; }

          .legal-card {
            scroll-margin-top: 110px;
            border: 1px solid var(--border);
            background: var(--card);
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.14);
            border-radius: var(--radius-md, 18px);
            overflow: hidden;
          }
          .card-title {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 18px;
            padding: 22px 26px;
            border-bottom: 1px solid var(--border);
            background: linear-gradient(180deg, rgba(var(--brass-rgb), 0.08), transparent);
          }
          .title-left { display: flex; align-items: center; gap: 14px; }
          .title-left h2 { font-size: 22px; line-height: 1.16; letter-spacing: -0.035em; color: var(--text); }
          .section-tag {
            color: var(--brass);
            font-size: 11px;
            font-weight: 950;
            text-transform: uppercase;
            letter-spacing: 0.13em;
            white-space: nowrap;
          }
          .card-body { padding: 26px; display: grid; gap: 22px; }
          .legal-page .lead { color: var(--soft); font-size: 15px; line-height: 1.8; }
          .notice {
            border: 1px solid rgba(var(--brass-rgb), 0.28);
            border-radius: 18px;
            padding: 18px 20px;
            background: linear-gradient(135deg, rgba(var(--brass-rgb), 0.12), rgba(var(--wood-walnut-rgb), 0.06));
            color: var(--soft);
            line-height: 1.7;
          }
          .notice strong { color: var(--brass); }
          .notice-caution { border-color: rgba(217, 107, 84, .42); background: rgba(217, 107, 84, .10); }
          .notice-caution strong { color: var(--terracotta, #E07A5F); }
          .subsection { display: grid; gap: 10px; }
          .legal-page h3 { font-size: 16px; letter-spacing: -0.015em; color: var(--text); margin-bottom: 8px; }
          .legal-page h4 { font-size: 15px; letter-spacing: -0.01em; margin-top: 4px; color: var(--text); }
          .legal-page p { color: var(--muted); line-height: 1.7; font-size: 14px; margin: 0; }
          .card-body ul { padding-left: 20px; color: var(--muted); line-height: 1.75; font-size: 14px; margin: 0; }
          .card-body ul li::marker { color: var(--brass); }
          .card-body ol { padding-left: 22px; color: var(--muted); line-height: 1.75; font-size: 14px; margin: 0; }
          .card-body ol li::marker { color: var(--brass); font-weight: 900; }
          .card-body strong { color: var(--text); font-weight: 900; }
          .card-body a { color: var(--brass); font-weight: 800; text-decoration: underline; text-underline-offset: 3px; }
          .split-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
          .mini-panel {
            border: 1px solid var(--border);
            border-radius: 16px;
            padding: 17px;
            background: rgba(var(--slate-950-rgb), 0.18);
          }
          .lp-light-theme .mini-panel { background: rgba(var(--off-white-rgb), 0.52); }
          .mini-panel strong { display: block; margin-bottom: 8px; font-size: 13px; }
          .mini-panel p, .mini-panel ul { font-size: 13px; }
          .table-wrap {
            overflow-x: auto;
            border: 1px solid var(--border);
            border-radius: 16px;
            background: rgba(var(--slate-950-rgb), 0.18);
          }
          .lp-light-theme .table-wrap { background: rgba(var(--off-white-rgb), 0.56); }
          .legal-page table { width: 100%; border-collapse: collapse; min-width: 620px; }
          .legal-page th, .legal-page td { padding: 14px 16px; border-bottom: 1px solid var(--border); text-align: left; color: var(--muted); font-size: 13px; vertical-align: top; }
          .legal-page th { color: var(--text); background: rgba(var(--brass-rgb), 0.08); font-weight: 950; }
          .legal-page tr:last-child td { border-bottom: 0; }
          blockquote {
            border-left: 4px solid var(--brass);
            border-radius: 14px;
            padding: 16px 18px;
            background: rgba(var(--brass-rgb), .10);
            color: var(--soft);
            font-style: italic;
            line-height: 1.7;
          }
          .contact-strip { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
          .footer-note {
            border-top: 1px solid var(--border);
            padding-top: 18px;
            color: var(--muted);
            text-align: center;
            font-size: 13px;
          }

          .floating-support {
            position: fixed;
            right: 22px;
            bottom: 22px;
            z-index: 90;
            display: inline-flex;
            align-items: center;
            gap: 10px;
            height: 46px;
            padding: 0 14px 0 16px;
            border-radius: 999px;
            color: #15110A;
            background: linear-gradient(135deg, var(--brass), var(--amber));
            box-shadow: 0 16px 42px rgba(var(--amber-rgb), 0.32);
            font-size: 12px;
            font-weight: 950;
            border: 1px solid rgba(var(--white-rgb), 0.20);
          }
          .floating-support .dot {
            width: 9px;
            height: 9px;
            border-radius: 50%;
            background: var(--sage);
            box-shadow: 0 0 0 5px rgba(var(--sage-rgb), 0.16);
          }

          .legal-footer {
            margin-top: 34px;
            border: 1px solid var(--border);
            border-radius: var(--radius-md, 18px);
            background: var(--card);
            padding: 22px;
            display: flex;
            justify-content: space-between;
            gap: 18px;
            color: var(--muted);
            font-size: 13px;
          }
          .legal-footer .footer-links { display: flex; gap: 18px; flex-wrap: wrap; }
          .legal-footer .footer-links a { color: var(--soft); font-weight: 800; }

          .strong-line { font-weight: 900; color: var(--text); margin-bottom: 4px; }

          @media (max-width: 1080px) {
            .layout { grid-template-columns: 1fr; }
            .legal-sidebar { display: none; }
            .mobile-tabs-wrap {
              display: block;
              position: sticky;
              top: 76px;
              z-index: 80;
              padding: 12px 0;
              margin: -2px 0 18px;
              background: linear-gradient(180deg, rgba(var(--slate-950-rgb), 0.92), rgba(var(--slate-950-rgb), 0.70));
              backdrop-filter: blur(18px);
              -webkit-backdrop-filter: blur(18px);
              border-bottom: 1px solid rgba(var(--brass-rgb), 0.14);
            }
            .lp-light-theme .mobile-tabs-wrap {
              background: linear-gradient(180deg, rgba(var(--off-white-rgb), 0.94), rgba(var(--bg-light-900-rgb), 0.78));
              border-bottom-color: rgba(var(--wood-walnut-rgb), 0.12);
            }
            .mobile-tabs {
              display: flex;
              gap: 10px;
              overflow-x: auto;
              padding-bottom: 2px;
            }
            .mobile-tab {
              flex: 0 0 auto;
              display: inline-flex;
              align-items: center;
              gap: 8px;
              height: 42px;
              padding: 0 14px;
              border: 1px solid var(--border);
              border-radius: 999px;
              background: var(--card);
              color: var(--soft);
              font-size: 12px;
              font-weight: 900;
              white-space: nowrap;
              text-decoration: none;
            }
            .mobile-tab.active { background: rgba(var(--brass-rgb), 0.14); border-color: rgba(var(--brass-rgb), 0.34); color: var(--text); }
            .legal-card { scroll-margin-top: 150px; }
          }

          @media (max-width: 780px) {
            .legal-container { width: min(100% - 28px, var(--max, 1180px)); }
            .page { padding-top:20px; padding-bottom: 44px; }
            .legal-hero { padding: 26px 20px; border-radius: 22px; margin-bottom: 16px; }
            .hero-content { grid-template-columns: 1fr; gap: 18px; }
            .eyebrow { font-size: 10px; padding: 6px 10px; margin-bottom: 14px; }
            .legal-page h1 { font-size: clamp(34px, 12vw, 48px); margin-bottom: 14px; }
            .hero-copy { font-size: 14px; }
            .hero-meta { min-width: 0; grid-template-columns: 1fr; }
            .mobile-tabs-wrap { top: 70px; margin-bottom: 16px; padding: 10px 0; }
            .mobile-tab { height: 40px; font-size: 11px; padding: 0 12px; }
            .content { gap: 16px; }
            .legal-card { border-radius: 20px; scroll-margin-top: 138px; }
            .card-title { padding: 18px; align-items: flex-start; flex-direction: column; gap: 10px; }
            .title-left { align-items: flex-start; }
            .title-left h2 { font-size: 19px; }
            .card-body { padding: 18px; gap: 18px; }
            .split-grid, .contact-strip { grid-template-columns: 1fr; }
            .notice, .mini-panel { border-radius: 15px; padding: 15px; }
            .legal-footer { flex-direction: column; padding: 18px; }
            .floating-support { right: 14px; bottom: 14px; height: 44px; width: 44px; padding: 0; justify-content: center; }
            .floating-support span:not(.dot) { display: none; }
          }

          @media (max-width: 440px) {
            .card-body { padding: 16px; }
            .title-left h2 { font-size: 18px; }
            .legal-page p, .legal-page ul { font-size: 13px; }
          }

          .card-body > * { min-width: 0; }
        `}</style>

        <main className="page" id="top">
          <div className="legal-container">
            <section className="legal-hero" aria-labelledby="page-title">
              <div className="hero-content">
                <div>
                  <div className="eyebrow">Policies & Legal Documentation</div>
                  <h1 id="page-title">CabEngine legal terms for a <span className="gradient-text">professional cabinet workflow.</span></h1>
                  <p className="hero-copy">CabEngine is currently in Public Beta. Features, pricing, and terms may change as the product evolves. By using this service, you acknowledge and accept that you are using pre-release software.</p>
                </div>
                <div className="hero-meta">
                  <div className="meta-card"><span>Effective date</span><strong>February 18, 2026</strong></div>
                  <div className="meta-card"><span>Last updated</span><strong>February 18, 2026</strong></div>
                  <div className="meta-card"><span>Status</span><strong>Public Beta</strong></div>
                </div>
              </div>
            </section>

            <div className="mobile-tabs-wrap" aria-label="Mobile legal navigation">
              <div className="legal-container mobile-tabs">
                {tocSections.map(s => (
                  <a key={s.id} className={`mobile-tab${activeSection === s.id ? ' active' : ''}`} href={`#${s.id}`} onClick={(e) => { e.preventDefault(); scrollToSection(s.id); }}>{s.num} {s.title}</a>
                ))}
              </div>
            </div>

            <div className="layout">
              <aside className="legal-sidebar" aria-label="Legal document sections">
                <div className="sidebar-head">
                  <strong>Legal sections</strong>
                  <p>Jump between the exact policy sections from your TermsPage.tsx content.</p>
                </div>
                <nav className="toc">
                  {tocSections.map(s => (
                    <button key={s.id} className={`toc-link${activeSection === s.id ? ' active' : ''}`} onClick={() => scrollToSection(s.id)}>
                      <span className="num-badge">{s.num}</span>
                      <span>{s.title}</span>
                    </button>
                  ))}
                </nav>
              </aside>

              <div className="content">
                <section className="legal-card" id="summary">
                  <div className="card-title">
                    <div className="title-left"><span className="num-badge" style={{ width: 34, height: 34, borderRadius: 12, fontSize: 13 }}>β</span><h2>CabEngine — Policies & Legal Documentation</h2></div>
                    <span className="section-tag">Public Beta</span>
                  </div>
                  <div className="card-body">
                    <div className="notice"><strong>Public Beta:</strong> CabEngine is currently in Public Beta. Features, pricing, and terms may change as the product evolves. By using this service, you acknowledge and accept that you are using pre-release software.</div>
                  </div>
                </section>

                <section className="legal-card" id="1-terms-of-service">
                  <div className="card-title">
                    <div className="title-left"><span className="num-badge">01</span><h2>1. Terms of Service</h2></div>
                    <span className="section-tag">Agreement</span>
                  </div>
                  <div className="card-body">
                    <h3 id="1-1-agreement-to-terms">1.1 Agreement to Terms</h3>
                    <p>By accessing or using CabEngine (&quot;the Service&quot;), available at <a href="https://www.protradee.com" target="_blank" rel="noopener noreferrer">www.protradee.com</a>, you (&quot;User&quot;, &quot;you&quot;, &quot;your&quot;) agree to be bound by these Terms of Service (&quot;Terms&quot;). If you do not agree to these Terms, you must not access or use the Service.</p>
                    <h3 id="1-2-description-of-service">1.2 Description of Service</h3>
                    <p>CabEngine is a cloud-based Software-as-a-Service (SaaS) application designed for cabinet makers and tradespeople. The Service provides tools for:</p>
                    <ul><li><strong>Project Management</strong> — Create and manage cabinet projects</li><li><strong>Cabinet Design & Editing</strong> — Elevation view (XY) and 3D visual editor for wall zones and cabinet layouts</li><li><strong>Bill of Materials (BOM)</strong> — Automated material, hardware, and labour cost estimation with configurable margin calculations</li><li><strong>Cutting Plan Optimisation</strong> — Material nesting and cut plan generation to minimise waste</li><li><strong>Wall Plans</strong> — Technical elevation drawings for workshop reference</li><li><strong>Quick Parts Calculator</strong> — Standalone parts calculation for individual components</li><li><strong>Area Calculator</strong> — Surface area and coverage calculations</li><li><strong>Export & Reporting</strong> — Print, JSON, Excel, and Quotation exports</li></ul>
                    <h3 id="1-3-eligibility">1.3 Eligibility</h3>
                    <p>You must be at least 18 years of age or the age of majority in your jurisdiction to use the Service. By using the Service, you represent and warrant that you meet this eligibility requirement.</p>
                    <h3 id="1-4-account-registration">1.4 Account Registration</h3>
                    <ul><li>You must provide a valid email address and create a password to register.</li><li>You are responsible for maintaining the confidentiality of your login credentials.</li><li>You are fully responsible for all activities that occur under your account.</li><li>You agree to notify us immediately of any unauthorised use of your account.</li></ul>
                    <h3 id="1-5-beta-programme">1.5 Beta Programme</h3>
                    <p>CabEngine is currently offered as a <strong>Public Beta</strong> product. This means:</p>
                    <ul><li>The Service may contain bugs, errors, or incomplete features.</li><li>Features may be added, modified, or removed without prior notice.</li><li>Uptime and availability are provided on a <strong>best-effort basis</strong> — no SLA (Service Level Agreement) is guaranteed.</li><li>Data generated during the beta period may not be preserved in future releases, although we will make reasonable efforts to maintain data continuity.</li></ul>
                    <h3 id="1-6-intellectual-property">1.6 Intellectual Property</h3>
                    <ul><li>All rights, title, and interest in and to the Service, including all associated intellectual property rights, are and shall remain the exclusive property of CabEngine and its licensors.</li><li>The Service is protected by copyright, trademark, and other applicable laws.</li><li>You are granted a limited, non-exclusive, non-transferable, revocable licence to use the Service for its intended purpose.</li><li>Your project data, designs, and outputs generated through the Service remain your property.</li></ul>
                    <h3 id="1-7-user-generated-content">1.7 User-Generated Content</h3>
                    <ul><li>You retain ownership of all project data, cabinet specifications, BOM data, and any other content you create using the Service (&quot;User Content&quot;).</li><li>By using the Service, you grant CabEngine a limited licence to process, store, and transmit your User Content solely for the purpose of providing the Service.</li><li>You are solely responsible for the accuracy, completeness, and legality of your User Content.</li></ul>
                    <h3 id="1-8-modifications-to-terms">1.8 Modifications to Terms</h3>
                    <p>We reserve the right to modify these Terms at any time. Changes will be communicated via email or through in-app notification. Your continued use of the Service after changes are posted constitutes your acceptance of the modified Terms.</p>
                  </div>
                </section>

                <section className="legal-card" id="2-privacy-policy">
                  <div className="card-title">
                    <div className="title-left"><span className="num-badge">02</span><h2>2. Privacy Policy</h2></div>
                    <span className="section-tag">Data handling</span>
                  </div>
                  <div className="card-body">
                    <h3 id="2-1-information-we-collect">2.1 Information We Collect</h3>
                    <p className="strong-line">Account Information:</p>
                    <ul><li>Email address</li><li>Password (stored in hashed form)</li><li>Display name or shop name (if provided)</li></ul>
                    <p className="strong-line">Project Data:</p>
                    <ul><li>Cabinet specifications, dimensions, and configurations</li><li>Bill of Materials (BOM) data, including material costs and pricing</li><li>Cutting plans and optimisation data</li><li>Project names and metadata</li></ul>
                    <p className="strong-line">Usage Data:</p>
                    <ul><li>Device type and browser information</li><li>IP address</li><li>Pages accessed and features used</li><li>Session duration and frequency of use</li><li>Error logs and crash reports</li></ul>
                    <p className="strong-line">Cookies & Local Storage:</p>
                    <ul><li>Authentication tokens</li><li>User preferences (e.g., dark/light mode, measurement units, currency)</li></ul>
                    <h3 id="2-2-how-we-use-your-information">2.2 How We Use Your Information</h3>
                    <p>We use collected information to:</p>
                    <div className="table-wrap"><table><thead><tr><th>Purpose</th><th>Legal Basis</th></tr></thead><tbody><tr><td>Provide and operate the Service</td><td>Contract performance</td></tr><tr><td>Authenticate users and secure accounts</td><td>Legitimate interest</td></tr><tr><td>Process subscription payments</td><td>Contract performance</td></tr><tr><td>Improve the Service and fix bugs</td><td>Legitimate interest</td></tr><tr><td>Send service-related notifications</td><td>Contract performance</td></tr><tr><td>Analyse usage patterns (aggregated, anonymised)</td><td>Legitimate interest</td></tr><tr><td>Respond to support requests</td><td>Contract performance</td></tr></tbody></table></div>
                    <h3 id="2-3-data-sharing">2.3 Data Sharing</h3>
                    <p>We <strong>do not sell, rent, or trade</strong> your personal information to third parties.</p>
                    <p>We may share information with:</p>
                    <ul><li><strong>Service Providers</strong> — Third-party hosting, payment processing, and analytics providers who process data on our behalf and are bound by contractual data protection obligations.</li><li><strong>Legal Requirements</strong> — When required by law, regulation, or legal process.</li><li><strong>Business Transfers</strong> — In connection with a merger, acquisition, or sale of assets, your data may be transferred to the acquiring entity.</li></ul>
                    <h3 id="2-4-data-security">2.4 Data Security</h3>
                    <p>We implement industry-standard security measures to protect your data, including:</p>
                    <ul><li>HTTPS/TLS encryption for all data in transit</li><li>Encrypted storage for passwords and sensitive data</li><li>Regular security reviews and updates</li></ul>
                    <p>However, <strong>no method of electronic storage or transmission is 100% secure</strong>, and we cannot guarantee absolute security.</p>
                    <h3 id="2-5-your-rights">2.5 Your Rights</h3>
                    <p>Depending on your jurisdiction, you may have the right to:</p>
                    <ul><li><strong>Access</strong> your personal data</li><li><strong>Correct</strong> inaccurate personal data</li><li><strong>Delete</strong> your personal data (&quot;right to be forgotten&quot;)</li><li><strong>Export</strong> your project data in standard formats (JSON, Excel)</li><li><strong>Object</strong> to processing of your personal data</li><li><strong>Withdraw consent</strong> at any time</li></ul>
                    <p>To exercise any of these rights, contact us at the address provided in <strong>Section 9</strong>.</p>
                    <h3 id="2-6-children-s-privacy">2.6 Children&#x27;s Privacy</h3>
                    <p>The Service is not directed to individuals under 18 years of age. We do not knowingly collect personal information from children. If we discover that a child under 18 has provided personal information, we will delete it promptly.</p>
                  </div>
                </section>

                <section className="legal-card" id="3-acceptable-use-policy">
                  <div className="card-title">
                    <div className="title-left"><span className="num-badge">03</span><h2>3. Acceptable Use Policy</h2></div>
                    <span className="section-tag">Platform rules</span>
                  </div>
                  <div className="card-body">
                    <h3 id="3-1-permitted-use">3.1 Permitted Use</h3>
                    <p>The Service is intended for lawful, professional, and commercial use by cabinet makers, joiners, interior designers, and tradespeople for the purpose of cabinet design, material estimation, and project management.</p>
                    <h3 id="3-2-prohibited-conduct">3.2 Prohibited Conduct</h3>
                    <p>You agree not to:</p>
                    <ul><li>Use the Service for any unlawful or fraudulent purpose</li><li>Attempt to reverse-engineer, decompile, or disassemble the Service</li><li>Interfere with or disrupt the Service&#x27;s infrastructure or other users&#x27; access</li><li>Use automated bots, scrapers, or crawlers to access the Service</li><li>Resell, sublicence, or redistribute access to the Service without written permission</li><li>Upload or transmit malicious code, viruses, or harmful content</li><li>Attempt to gain unauthorised access to other users&#x27; accounts or data</li><li>Use the Service to generate fraudulent quotations or misleading pricing</li></ul>
                    <h3 id="3-3-enforcement">3.3 Enforcement</h3>
                    <p>Violation of this Acceptable Use Policy may result in:</p>
                    <ul><li>Temporary or permanent suspension of your account</li><li>Termination of your subscription without refund</li><li>Legal action, if warranted</li></ul>
                  </div>
                </section>

                <section className="legal-card" id="4-cookie-policy">
                  <div className="card-title">
                    <div className="title-left"><span className="num-badge">04</span><h2>4. Cookie Policy</h2></div>
                    <span className="section-tag">Browser storage</span>
                  </div>
                  <div className="card-body">
                    <h3 id="4-1-what-are-cookies">4.1 What Are Cookies</h3>
                    <p>Cookies are small data files stored on your device when you access the Service. We use cookies and similar technologies (e.g., local storage) to enhance your experience.</p>
                    <h3 id="4-2-types-of-cookies-we-use">4.2 Types of Cookies We Use</h3>
                    <div className="table-wrap"><table><thead><tr><th>Cookie Type</th><th>Purpose</th><th>Duration</th></tr></thead><tbody><tr><td>Essential</td><td>Authentication, session management, security</td><td>Session / persistent</td></tr><tr><td>Functional</td><td>User preferences (theme, units, currency)</td><td>Persistent</td></tr><tr><td>Analytics</td><td>Usage patterns, feature adoption (anonymised)</td><td>Persistent</td></tr></tbody></table></div>
                    <h3 id="4-3-managing-cookies">4.3 Managing Cookies</h3>
                    <p>You can manage or disable cookies through your browser settings. However, disabling essential cookies may prevent the Service from functioning correctly.</p>
                  </div>
                </section>

                <section className="legal-card" id="5-subscription-billing-policy">
                  <div className="card-title">
                    <div className="title-left"><span className="num-badge">05</span><h2>5. Subscription & Billing Policy</h2></div>
                    <span className="section-tag">Plans</span>
                  </div>
                  <div className="card-body">
                    <h3 id="5-1-subscription-plans">5.1 Subscription Plans</h3>
                    <p>CabEngine operates on a <strong>subscription-based model</strong>. Current plans and pricing are displayed within the Service and may change as we transition from beta to general availability.</p>
                    <h3 id="5-2-beta-pricing">5.2 Beta Pricing</h3>
                    <p>During the public beta period:</p>
                    <ul><li>Subscription fees are offered at reduced introductory rates.</li><li>Pricing is subject to change upon general availability release.</li><li>Subscribers will receive advance notice of any pricing changes.</li></ul>
                    <h3 id="5-3-payment-terms">5.3 Payment Terms</h3>
                    <ul><li>Subscription fees are billed <strong>in advance</strong> on a recurring basis (monthly or annually, depending on the plan selected).</li><li>All fees are quoted and charged in the applicable currency (e.g., LKR or as displayed at checkout).</li><li>Payment is processed through our third-party payment provider.</li><li>You authorise us to charge your designated payment method for all applicable fees.</li></ul>
                    <h3 id="5-4-failed-payments">5.4 Failed Payments</h3>
                    <ul><li>If a payment fails, we will attempt to process it again within a reasonable timeframe.</li><li>After repeated failed payment attempts, your account may be downgraded or suspended until payment is resolved.</li><li>No data will be deleted immediately upon account suspension — see Section 8.</li></ul>
                    <h3 id="5-5-taxes">5.5 Taxes</h3>
                    <p>All stated prices are exclusive of applicable taxes unless otherwise specified. You are responsible for any applicable sales tax, VAT, or GST in your jurisdiction.</p>
                  </div>
                </section>

                <section className="legal-card" id="6-disclaimer-limitation-of-liability">
                  <div className="card-title">
                    <div className="title-left"><span className="num-badge">06</span><h2>6. Disclaimer & Limitation of Liability</h2></div>
                    <span className="section-tag">Risk notice</span>
                  </div>
                  <div className="card-body">
                    <div className="notice notice-caution"><strong>CAUTION</strong><p>PLEASE READ THIS SECTION CAREFULLY. IT LIMITS CABENGINE&#x27;S LIABILITY TO YOU.</p></div>
                    <h3 id="6-1-as-is-and-as-available">6.1 &quot;As Is&quot; and &quot;As Available&quot;</h3>
                    <p>THE SERVICE IS PROVIDED <strong>&quot;AS IS&quot;</strong> AND <strong>&quot;AS AVAILABLE&quot;</strong> WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, OR STATUTORY, INCLUDING BUT NOT LIMITED TO:</p>
                    <ul><li>IMPLIED WARRANTIES OF MERCHANTABILITY</li><li>FITNESS FOR A PARTICULAR PURPOSE</li><li>NON-INFRINGEMENT</li><li>ACCURACY OR RELIABILITY OF RESULTS</li></ul>
                    <h3 id="6-2-no-professional-advice">6.2 No Professional Advice</h3>
                    <p>CabEngine is a <strong>calculation and estimation tool</strong>. The BOM calculations, cost estimates, cutting plans, and material lists generated by the Service are provided as <strong>aids and reference tools only</strong>.</p>
                    <ul><li>The Service does <strong>not</strong> constitute professional engineering, architectural, or structural advice.</li><li>All outputs (including material quantities, cost estimates, margin calculations, and quotations) must be <strong>independently verified by the User</strong> before reliance.</li><li>CabEngine is <strong>not responsible</strong> for any errors, omissions, or inaccuracies in generated outputs.</li></ul>
                    <h3 id="6-3-limitation-of-liability">6.3 Limitation of Liability</h3>
                    <p className="strong-line">TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW:</p>
                    <p>CabEngine, its directors, employees, affiliates, and licensors shall <strong>NOT</strong> be liable for any <strong>indirect, incidental, special, consequential, or punitive damages</strong>, including but not limited to:</p>
                    <ul><li>Loss of profits, revenue, or business</li><li>Loss of data or project information</li><li>Cost of procurement of substitute services</li><li>Loss arising from inaccurate BOM, quotation, or cutting plan outputs</li><li>Damages arising from downtime or unavailability of the Service</li><li>Any other intangible losses</li></ul>
                    <p><strong>IN NO EVENT</strong> shall CabEngine&#x27;s total aggregate liability to you for all claims arising from or related to the Service exceed the <strong>total amount paid by you to CabEngine in the twelve (12) months preceding the claim</strong>, or <strong>fifty US dollars (USD $50)</strong>, whichever is greater.</p>
                    <h3 id="6-4-assumption-of-risk">6.4 Assumption of Risk</h3>
                    <p>You acknowledge and agree that:</p>
                    <ul><li>You use the Service <strong>at your own risk</strong>.</li><li>You are solely responsible for verifying all calculations, measurements, quantities, and cost estimates before quoting to your clients or purchasing materials.</li><li>CabEngine bears <strong>no responsibility</strong> for any financial loss, material waste, project delays, or client disputes arising from your reliance on the Service&#x27;s outputs.</li><li>As a <strong>beta product</strong>, the Service may contain bugs or produce unexpected results — you accept this risk.</li></ul>
                    <h3 id="6-5-indemnification">6.5 Indemnification</h3>
                    <p>You agree to indemnify, defend, and hold harmless CabEngine, its officers, directors, employees, and agents from and against any and all claims, damages, losses, liabilities, costs, and expenses (including reasonable legal fees) arising from:</p>
                    <ul><li>Your use of the Service</li><li>Your violation of these Terms</li><li>Your violation of any third-party rights</li><li>Any claim made by your clients or customers relating to quotations, estimates, or plans generated using the Service</li></ul>
                    <h3 id="6-6-force-majeure">6.6 Force Majeure</h3>
                    <p>CabEngine shall not be liable for any failure or delay in performance resulting from causes beyond its reasonable control, including but not limited to natural disasters, acts of government, internet or infrastructure outages, pandemics, or third-party service failures.</p>
                  </div>
                </section>

                <section className="legal-card" id="7-refund-cancellation-policy">
                  <div className="card-title">
                    <div className="title-left"><span className="num-badge">07</span><h2>7. Refund & Cancellation Policy</h2></div>
                    <span className="section-tag">Account changes</span>
                  </div>
                  <div className="card-body">
                    <h3 id="7-1-cancellation">7.1 Cancellation</h3>
                    <ul><li>You may cancel your subscription at any time through your account settings or by contacting support.</li><li>Cancellation takes effect at the end of the current billing period.</li><li>You will retain access to paid features until the end of your current billing period.</li></ul>
                    <h3 id="7-2-refunds">7.2 Refunds</h3>
                    <ul><li><strong>No refunds</strong> are provided for partial billing periods.</li><li>No refunds are provided for any period during which the Service was available and accessible, regardless of actual usage.</li><li>In exceptional circumstances (extended outages, billing errors), refunds may be granted at CabEngine&#x27;s sole discretion.</li></ul>
                    <h3 id="7-3-free-trial-beta-access">7.3 Free Trial / Beta Access</h3>
                    <ul><li>If you are using the Service under a free trial or beta programme, no charges apply and no refund is applicable.</li><li>CabEngine reserves the right to end the free trial or beta programme at any time with reasonable notice.</li></ul>
                  </div>
                </section>

                <section className="legal-card" id="8-data-retention-deletion-policy">
                  <div className="card-title">
                    <div className="title-left"><span className="num-badge">08</span><h2>8. Data Retention & Deletion Policy</h2></div>
                    <span className="section-tag">Retention</span>
                  </div>
                  <div className="card-body">
                    <h3 id="8-1-active-accounts">8.1 Active Accounts</h3>
                    <p>Your project data, account information, and settings are retained for as long as your account is active and you maintain a valid subscription.</p>
                    <h3 id="8-2-cancelled-accounts">8.2 Cancelled Accounts</h3>
                    <p>Upon cancellation:</p>
                    <ul><li>Your data will be retained for 30 days after the end of your billing period to allow for potential reactivation.</li><li>After the 30-day grace period, your data may be permanently deleted.</li><li>We recommend exporting your projects (JSON, Excel) before cancelling.</li></ul>
                    <h3 id="8-3-account-deletion-requests">8.3 Account Deletion Requests</h3>
                    <p>You may request full deletion of your account and all associated data at any time by contacting support. Deletion requests will be processed within 30 days.</p>
                    <h3 id="8-4-anonymised-data">8.4 Anonymised Data</h3>
                    <p>We may retain anonymised, aggregated data (which cannot be used to identify you) for analytics and service improvement purposes indefinitely.</p>
                  </div>
                </section>

                <section className="legal-card" id="9-contact-information">
                  <div className="card-title">
                    <div className="title-left"><span className="num-badge">09</span><h2>9. Contact Information</h2></div>
                    <span className="section-tag">Support</span>
                  </div>
                  <div className="card-body">
                    <p>For questions, concerns, or requests regarding these policies, please contact us:</p>
                    <ul><li><strong>Email:</strong> <a href="mailto:support@protradee.com">support@protradee.com</a></li><li><strong>Website:</strong> <a href="https://www.protradee.com" target="_blank" rel="noopener noreferrer">www.protradee.com</a></li><li><strong>In-App:</strong> Use the &quot;Report an Issue&quot; button within the application</li></ul>
                  </div>
                </section>

                <section className="legal-card" id="10-governing-law-dispute-resolution">
                  <div className="card-title">
                    <div className="title-left"><span className="num-badge">10</span><h2>10. Governing Law & Dispute Resolution</h2></div>
                    <span className="section-tag">Law</span>
                  </div>
                  <div className="card-body">
                    <h3 id="10-1-governing-law">10.1 Governing Law</h3>
                    <p>These Terms and all related policies shall be governed by and construed in accordance with the laws of the jurisdiction in which CabEngine operates, without regard to its conflict of law provisions.</p>
                    <h3 id="10-2-dispute-resolution">10.2 Dispute Resolution</h3>
                    <p>Any dispute arising from or related to these Terms or the Service shall first be resolved through good-faith negotiation. If the dispute cannot be resolved through negotiation within 30 days, either party may seek resolution through binding arbitration in accordance with the rules of the applicable arbitration body in the governing jurisdiction.</p>
                    <h3 id="10-3-class-action-waiver">10.3 Class Action Waiver</h3>
                    <p>To the maximum extent permitted by applicable law, you agree that any disputes shall be resolved on an individual basis, and you waive any right to participate in a class action, collective action, or representative proceeding.</p>
                  </div>
                </section>

                <section className="legal-card" id="11-severability">
                  <div className="card-title">
                    <div className="title-left"><span className="num-badge">11</span><h2>11. Severability</h2></div>
                    <span className="section-tag">Validity</span>
                  </div>
                  <div className="card-body">
                    <p>If any provision of these Terms is found to be unenforceable or invalid by a court of competent jurisdiction, the remaining provisions shall remain in full force and effect.</p>
                  </div>
                </section>

                <section className="legal-card" id="12-entire-agreement">
                  <div className="card-title">
                    <div className="title-left"><span className="num-badge">12</span><h2>12. Entire Agreement</h2></div>
                    <span className="section-tag">Finality</span>
                  </div>
                  <div className="card-body">
                    <p>These Terms, together with the Privacy Policy, Acceptable Use Policy, Cookie Policy, and all other policies referenced herein, constitute the entire agreement between you and CabEngine regarding your use of the Service and supersede all prior agreements, representations, and understandings.</p>
                  </div>
                </section>

                <footer className="legal-footer">
                  <span>CabEngine <small style={{ fontSize: 10, color: 'var(--muted)' }}>Legal Docs</small></span>
                  <div className="footer-links">
                    <a href="#9-contact-information" onClick={(e) => { e.preventDefault(); scrollToSection('9-contact-information'); }}>Support</a>
                    <a href="#top" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Back to top</a>
                  </div>
                  <span>&copy; 2026 CabEngine / ProTradee. All rights reserved.</span>
                </footer>
              </div>
            </div>
          </div>
        </main>

        <a className="floating-support" href="#9-contact-information" onClick={(e) => { e.preventDefault(); scrollToSection('9-contact-information'); }}>
          <span className="dot"></span>
          <span>Get support</span>
        </a>
      </div>
    </>
  );
};

export default TermsPage;
