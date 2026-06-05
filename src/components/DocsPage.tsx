import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Book, Settings, Box, Table2, CreditCard, Share2, HelpCircle, CheckCircle, Lightbulb } from 'lucide-react';
import { LandingHeader } from './LandingHeader';

interface DocSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  content: React.ReactNode;
  label?: string;
  number: string;
  searchText: string;
}

interface DocsPageProps {
  onSignIn: () => void;
  onGetStarted: () => void;
  isDark: boolean;
  setIsDark: (isDark: boolean) => void;
}

export const DocsPage: React.FC<DocsPageProps> = ({
  onSignIn,
  onGetStarted,
  isDark,
  setIsDark,
}) => {
  const [activeSection, setActiveSection] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');

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
    const sideLinks = Array.from(document.querySelectorAll<HTMLElement>('.side-link'));
    const sectionIds = sideLinks.map(link => link.dataset.sectionId).filter(Boolean) as string[];
    const sectionEls = sectionIds.map(id => document.getElementById(id)).filter(Boolean) as HTMLElement[];

    const setActiveLink = () => {
      if (!sectionEls.length || !sideLinks.length) return;
      let current = sectionEls[0];
      const offset = window.innerWidth <= 680 ? 150 : 115;
      for (const section of sectionEls) {
        if (section.getBoundingClientRect().top <= offset) current = section;
      }
      sideLinks.forEach(link => {
        const id = link.dataset.sectionId;
        const isActive = id && document.getElementById(id) === current;
        link.classList.toggle('active', !!isActive);
        if (isActive) {
          setActiveSection(id);
          if (window.innerWidth <= 940) {
            link.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
          }
        }
      });
    };

    window.addEventListener('scroll', setActiveLink, { passive: true });
    window.addEventListener('resize', setActiveLink);
    setActiveLink();

    return () => {
      window.removeEventListener('scroll', setActiveLink);
      window.removeEventListener('resize', setActiveLink);
    };
  }, []);

  const sections: DocSection[] = [
    {
      id: 'overview',
      title: 'Getting Started',
      number: '01',
      icon: <Book className="w-5 h-5" />,
      label: 'Overview',
      searchText: 'getting started overview welcome cabengine pro cabinet software integration 3d design bill of materials bom costings material nesting cutting patterns technical drawings elevations material libraries hardware quick start demo light dark mode dashboard action menu',
      content: (
        <>
          <h3>Welcome to CabEngine Pro</h3>
          <p>CabEngine Pro is an advanced cabinet software integration suite for high-fidelity 3D cabinet design and manufacturing. Use the cabinet configurator API and embeddable 3D planner to streamline your workflow. It enables you to:</p>
          <ul className="bullets">
            <li>Design complex kitchen layouts with multiple wall zones</li>
            <li>Generate accurate Bill of Materials (BOM) and costings</li>
            <li>Optimize material nesting and cutting patterns</li>
            <li>Create professional technical drawings and elevations</li>
            <li>Manage global material libraries and hardware</li>
          </ul>
          <div className="info-grid">
            <div className="info-box accent"><strong>New Here?</strong><span>Use the <strong>Quick Start Demo</strong> from the dashboard to instantly load a professional layout and explore all features.</span></div>
            <div className="info-box"><strong>Workspace Theme</strong><span>Toggle <strong>Light/Dark mode</strong> in the sidebar. The entire interface is theme-aware for different design environments.</span></div>
          </div>
          <div className="callout"><strong><Lightbulb className="w-4 h-4" /> Quick Tip</strong><p>Access any project directly from the <strong>Dashboard</strong> using the Action Menu overlay to jump straight to Setup, 3D Studio, or BOM.</p></div>
        </>
      ),
    },
    {
      id: 'workflow',
      title: 'Complete Project Workflow',
      number: '02',
      icon: <CheckCircle className="w-5 h-5" />,
      label: 'Engineering process',
      searchText: 'workflow complete project workflow engineering process step by step advanced mode materials sheet library hardware business profile 3d studio visualization production export bom cut plan excel pdf json',
      content: (
        <>
          <h3>Step-by-Step Engineering Process</h3>
          <div className="workflow-list">
            <div className="workflow-item"><div className="step-num">1</div><div><h3>Project Identity & Mode</h3><p>Configure site address and contact info. Enable <strong>Advanced Mode</strong> if you prefer manual weaponry box entry over automatic solvers.</p><span className="mini-location">Location: Sidebar → Setup → Step 1: Identity</span></div></div>
            <div className="workflow-item"><div className="step-num">2</div><div><h3>Materials & Branding</h3><p>Define your sheet library, hardware, and material allocation. Visit the <strong>Business Profile</strong> to sync your company logo for reports.</p><span className="mini-location">Location: Sidebar → Setup → Steps 2-8</span></div></div>
            <div className="workflow-item"><div className="step-num">3</div><div><h3>Studio Visualization</h3><p>Design your walls in the <strong>3D Studio</strong>. Toggle between Realistic and Technical views to verify textures and dimensions.</p><span className="mini-location">Location: Sidebar → 3D Design Studio</span></div></div>
            <div className="workflow-item"><div className="step-num">4</div><div><h3>Production Export</h3><p>Review your BOM, check material nesting in the Cut Plan, and export your final technical dossier (Excel/PDF/JSON).</p><span className="mini-location">Location: Sidebar → Reports & BOM</span></div></div>
          </div>
        </>
      ),
    },
    {
      id: 'setup',
      title: 'Project Setup & Modes',
      number: '03',
      icon: <Settings className="w-5 h-5" />,
      label: 'Configuration',
      searchText: 'project setup modes configuration advanced mode direct entry materials hardware sheet types accessories tile scaling material allocation carcass box front doors drawer boxes back panels business profile branding company logo',
      content: (
        <>
          <h3>Configuration Options</h3>
          <div className="callout"><strong><Settings className="w-4 h-4" /> Advanced Mode (Direct Entry)</strong><p>Enables precise manual control over cabinetry boxes. Skip the automatic layout solver to define exact widths, blind panels, and placement sequence.</p></div>
          <div className="info-grid">
            <div className="info-box"><strong>Materials & Hardware</strong><ul><li><strong>Sheet Types:</strong> Define name, thickness, and sheet price.</li><li><strong>Accessories:</strong> Add hardware with custom unit costs.</li><li><strong>Tile Scaling:</strong> Set backsplash tile dimensions for 3D realism.</li></ul></div>
            <div className="info-box"><strong>Material Allocation</strong><span>Assign defaults to:</span><ul><li><strong>Carcass (Box):</strong> Sides, top, and bottom.</li><li><strong>Front Doors:</strong> Finished exterior faces.</li><li><strong>Drawer Boxes:</strong> Bottoms and internal sides.</li><li><strong>Back Panels:</strong> Typically thinner materials.</li></ul></div>
          </div>
          <div className="info-box"><strong>Business Profile & Branding</strong><p>Your company identity is global and persists across projects:</p><ul><li><strong>Company Logo:</strong> Automatically scales for BOM and Wall Plan headers.</li><li><strong>Business Metadata:</strong> Syncs company name and address to all invoices.</li><li><strong>Real-time Sync:</strong> Ensures all devices show your latest pro status.</li></ul></div>
        </>
      ),
    },
    {
      id: 'walls',
      title: '3D Design Studio',
      number: '04',
      icon: <Box className="w-5 h-5" />,
      label: 'Visualization',
      searchText: '3d design studio visualization studio tools realistic tile scaling cabinet presets obstacles site constraints windows doors pipes iso elevation technical wireframe view toggles',
      content: (
        <>
          <h3>Studio Tools & Visualization</h3>
          <div className="stack">
            <div className="info-box accent"><strong>Realistic Visualization</strong><p>The studio uses physically accurate rendering for professional presentations:</p><ul><li><strong>View Toggles:</strong> Switch between Realistic (Textures) and Technical (Wireframe).</li><li><strong>Tile Scaling:</strong> Backsplash textures scale based on your hardware library dimensions.</li><li><strong>ISO Elevation:</strong> View specific wall zones in flattened technical elevation.</li></ul></div>
            <div className="info-box"><strong>Cabinet Presets Library</strong><ul className="cabinet-grid"><li>• <strong>Base 2-Door:</strong> Standard base unit</li><li>• <strong>Base 3-Drawer:</strong> Multi-drawer base</li><li>• <strong>Base Corner:</strong> L-shaped corner unit</li><li>• <strong>Wall Standard:</strong> Upper wall cabinet</li><li>• <strong>Tall Utility:</strong> Full-height storage</li><li>• <strong>Tall Oven/Micro:</strong> Appliance housing</li><li>• <strong>Sink Unit:</strong> Plumbing-ready base</li><li>• <strong>Open Box:</strong> Decorative shelving</li></ul></div>
            <div className="info-box"><strong>Obstacles & Site Constraints</strong><span>Define on-site obstacles (Windows, Doors, Pipes) to ensure layout feasibility. Obstacles appear as hatched regions in the technical elevation view.</span></div>
          </div>
        </>
      ),
    },
    {
      id: 'bom',
      title: 'Reports & BOM',
      number: '05',
      icon: <Table2 className="w-5 h-5" />,
      label: 'Production analytics',
      searchText: 'reports bom production analytics cost breakdown estimates material cost hardware totals hinges handles drawer slides labor estimate total quote cut plan optimization wall elevations export pdf excel xlsx json technical dossier',
      content: (
        <>
          <h3>Production Analytics</h3>
          <div className="stack">
            <div className="info-box accent"><strong>Cost Breakdown & Estimates</strong><p>The summary card tracks financial metrics in real-time:</p><ul><li><strong>Material Cost:</strong> Raw sheet material totals.</li><li><strong>Hardware Totals:</strong> Hinges (2/door), handles, and drawer slides.</li><li><strong>Labor Estimate:</strong> Projected assembly/install time.</li><li><strong>Total Quote:</strong> Final project cost including margin.</li></ul></div>
            <div className="info-grid"><div className="info-box"><strong>Cut Plan Optimization</strong><span>Visual layout of parts on sheets to minimize waste and optimize material usage.</span></div><div className="info-box"><strong>Wall Elevations</strong><span>Technical drawings for each wall zone with unit schedules and dimensions.</span></div></div>
            <div className="info-box"><strong>Export & Technical Dossier</strong><ul><li><strong>Print / PDF:</strong> Full dossier with title blocks and branding.</li><li><strong>Excel (XLSX):</strong> Detailed parts list for procurement.</li><li><strong>Raw JSON:</strong> Full project state for technical integration.</li></ul></div>
          </div>
        </>
      ),
    },
    {
      id: 'pricing',
      title: 'Access & Subscription',
      number: '06',
      icon: <CreditCard className="w-5 h-5" />,
      label: 'Subscription policies',
      searchText: 'access subscription pricing subscription policies new user privilege pro status free tier pro tier unlimited projects export business branding',
      content: (
        <>
          <h3>Subscription Policies</h3>
          <div className="callout"><strong>New User Privilege</strong><p>Experience the full power of the platform: your <strong>first three projects</strong> are automatically granted <strong>PRO status</strong>, enabling all export formats and Advanced mode.</p></div>
          <div className="info-grid">
            <div className="info-box"><strong>Free Tier</strong><ul><li>Design up to 3 projects</li><li>Realistic 3D visuals</li><li>Limited to basic presets</li><li>No Excel/PDF branding</li></ul></div>
            <div className="info-box accent"><strong>Pro Tier</strong><ul><li>Unlimited projects</li><li>Full export suite</li><li>Custom business branding</li><li>Advanced Direct Entry mode</li></ul></div>
          </div>
        </>
      ),
    },
    {
      id: 'embed',
      title: 'Cabinet Configurator API & Embeddable 3D Planner',
      number: '07',
      icon: <Share2 className="w-5 h-5" />,
      label: 'Integration',
      searchText: 'cabinet configurator api embeddable 3d planner integration embed code iframe modal button website client-facing',
      content: (
        <>
          <h3>Cabinet Configurator API — Embeddable 3D Planner</h3>
          <p>Our cabinet configurator API lets you embed the 3D kitchen planner directly into your own website or client portals. This cabinet software integration allows your customers to configure their cabinetry layout and submit specifications without leaving your site.</p>
          <div className="info-box accent"><strong>Quick Integration Steps</strong><ol className="numbered"><li>Register your domain under your developer/admin settings to generate an <strong>API Key</strong>.</li><li>Embed our secure iframe pointing to <code>https://www.protradee.com/embed/setup?apiKey=YOUR_API_KEY</code>.</li><li>Listen to parent window messages to automatically capture project completion events.</li></ol></div>
          <div className="code-card">
            <div className="code-head"><span>Standard HTML Embedding Snippet</span><span>HTML</span></div>
            <pre>{`<!-- Start Cabinet Widget Button -->
<button onclick="openCabinetModal()" style="padding: 14px 28px; background: #f59e0b; color: white; border: none; border-radius: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; cursor: pointer; transition: all 0.2s;">
  Configure Cabinets
</button>

<!-- Hidden Modal overlay -->
<div id="cabinetModal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.55); z-index:99999; justify-content:center; align-items:center;">
  <div style="position:relative; width:96%; max-width:1400px; height:90%; background:#1e293b; border-radius:24px; overflow:hidden; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);">
    <button onclick="closeCabinetModal()" style="position:absolute; top:16px; right:16px; border:none; background:rgba(255,255,255,0.05); color:#94a3b8; border-radius:99px; width:36px; height:36px; font-size:22px; cursor:pointer; display:flex; align-items:center; justify-content:center; z-index:100;">&times;</button>
    <iframe src="https://www.protradee.com/embed/setup?apiKey=YOUR_API_KEY" style="width:100%; height:100%; border:none;"></iframe>
  </div>
</div>

<script>
  function openCabinetModal() {
    document.getElementById('cabinetModal').style.display = 'flex';
  }
  function closeCabinetModal() {
    document.getElementById('cabinetModal').style.display = 'none';
  }

  // Auto close modal when project is submitted
  window.addEventListener('message', (event) => {
    if (event.data.type === 'SETUP_COMPLETED') {
      closeCabinetModal();
      console.log('Project completed successfully:', event.data.projectId);
    }
  });
</script>`}</pre>
          </div>
        </>
      ),
    },
    {
      id: 'faq',
      title: 'FAQ & Troubleshooting',
      number: '08',
      icon: <HelpCircle className="w-5 h-5" />,
      label: 'Support',
      searchText: 'faq support common questions backsplash tiles stretched tile dimensions bom dashboard action menu advanced mode bom precision technical support troubleshooting',
      content: (
        <>
          <h3>Common Questions</h3>
          <div className="faq-grid">
            <details open><summary>Q: Why are my backsplash tiles looking stretched?</summary><p>A: Verify the physical <strong>Tile Dimensions</strong> in your Accessory library. Realistic textures require accurate dimensions to calculate real-world scaling.</p></details>
            <details><summary>Q: How do I jump directly to BOM from the dashboard?</summary><p>A: Click any project card on the dashboard to open the <strong>Action Menu overlay</strong>. Select "Reports & BOM" to skip direct to production data.</p></details>
            <details><summary>Q: Does Advanced Mode affect BOM precision?</summary><p>A: No. Advanced Mode only changes the entry method (manual vs automated solver). Engineering logic and cost calculations remain 100% accurate.</p></details>
            <details id="support"><summary>Technical Support</summary><p>For complex engineering queries or hardware integration help, contact us at <span className="support-email">support@protradee.com</span>.</p></details>
          </div>
        </>
      ),
    },
  ];

  const filteredSections = searchQuery
    ? sections.filter(s => s.searchText.toLowerCase().includes(searchQuery.toLowerCase()))
    : sections;

  return (
    <>
      <Helmet>
        <title>Cabinet Software Integration Docs — CabEngine Pro | Cabinet Configurator API &amp; Embeddable 3D Planner</title>
        <link rel="canonical" href="https://www.protradee.com/docs" />
        <meta name="description" content="Complete CabEngine Pro documentation covering cabinet software integration, the cabinet configurator API, embeddable 3D planner setup, project workflows, and BOM generation." />
      </Helmet>

      <style>{`
        .docs-page {
          min-height: 100vh;
          background:
            radial-gradient(circle at 15% 0%, rgba(var(--wood-walnut-rgb), 0.22), transparent 29%),
            radial-gradient(circle at 88% 8%, rgba(var(--brass-rgb), 0.17), transparent 27%),
            radial-gradient(circle at 50% 0%, rgba(var(--sage-rgb), 0.09), transparent 30%),
            linear-gradient(180deg, var(--bg-950), var(--bg-900) 42%, var(--bg-950) 100%);
          isolation: isolate;
        }

        .docs-page::before {
          content: "";
          position: fixed;
          inset: 0;
          pointer-events: none;
          background-image:
            linear-gradient(var(--grid-line) 1px, transparent 1px),
            linear-gradient(90deg, var(--grid-line) 1px, transparent 1px);
          background-size: 72px 72px;
          mask-image: linear-gradient(to bottom, rgba(0,0,0,0.75), transparent 82%);
          -webkit-mask-image: linear-gradient(to bottom, rgba(0,0,0,0.75), transparent 82%);
          z-index: -2;
        }

        .docs-layout {
          display: grid;
          grid-template-columns: 300px minmax(0, 920px);
          gap: 32px;
          align-items: start;
          justify-content: center;
          padding: 42px 0 70px;
          width: min(var(--max), calc(100% - 40px));
          margin-inline: auto;
        }

        .docs-sidebar {
          position: sticky;
          top: 96px;
          border: 1px solid var(--border);
          background: var(--card);
          box-shadow: var(--shadow);
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
          border-radius: var(--radius-md);
          overflow: hidden;
        }

        .sidebar-head {
          padding: 18px 18px 15px;
          border-bottom: 1px solid var(--border);
          background:
            radial-gradient(circle at 0% 0%, rgba(var(--brass-rgb), .12), transparent 44%),
            var(--card-strong);
        }

        .sidebar-head strong {
          display: block;
          font-size: 14px;
          letter-spacing: -0.01em;
          margin-bottom: 5px;
          color: var(--text);
        }

        .sidebar-head span {
          color: var(--muted);
          font-size: 12px;
          line-height: 1.45;
        }

        .side-links {
          padding: 12px;
          display: grid;
          gap: 7px;
        }

        .side-link {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 9px 10px;
          border-radius: 10px;
          color: var(--soft);
          font-size: 12px;
          font-weight: 760;
          border: 1px solid transparent;
          transition: background .18s ease, border-color .18s ease, color .18s ease, transform .18s ease;
          cursor: pointer;
          background: none;
          text-align: left;
          width: 100%;
          font-family: inherit;
        }

        .side-link:hover,
        .side-link.active {
          color: var(--text);
          background: rgba(var(--brass-rgb), .10);
          border-color: var(--border);
          transform: translateX(2px);
        }

        .side-icon {
          width: 24px;
          height: 24px;
          flex: 0 0 auto;
          display: grid;
          place-items: center;
          border-radius: 7px;
          background: rgba(var(--brass-rgb), .12);
          color: var(--brass);
          border: 1px solid rgba(var(--brass-rgb), .17);
          font-size: 11px;
          font-weight: 900;
        }

        .docs-main {
          min-width: 0;
          max-width: 920px;
        }

        .hero-card {
          position: relative;
          overflow: hidden;
          border-radius: var(--radius-lg);
          background:
            radial-gradient(circle at 12% 0%, rgba(var(--brass-rgb), .17), transparent 33%),
            radial-gradient(circle at 86% 16%, rgba(var(--wood-oak-rgb), .16), transparent 32%),
            var(--card-strong);
          border: 1px solid var(--border-strong);
          box-shadow: var(--shadow);
          padding: 38px;
          margin-bottom: 24px;
        }

        .hero-card::after {
          content: "";
          position: absolute;
          right: -80px;
          top: -80px;
          width: 250px;
          height: 250px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(var(--brass-rgb), .20), transparent 68%);
          pointer-events: none;
        }

        .eyebrow {
          width: fit-content;
          display: inline-flex;
          align-items: center;
          gap: 9px;
          padding: 8px 12px;
          border-radius: 999px;
          border: 1px solid rgba(var(--brass-rgb), .36);
          background: rgba(var(--brass-rgb), .11);
          color: var(--brass);
          font-weight: 900;
          font-size: 12px;
          margin-bottom: 20px;
          position: relative;
          z-index: 1;
        }

        .pulse-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--sage);
          box-shadow: 0 0 0 rgba(var(--sage-rgb), .6);
          animation: docs-pulse 1.8s infinite;
        }

        @keyframes docs-pulse {
          0% { box-shadow: 0 0 0 0 rgba(var(--sage-rgb), .5); }
          70% { box-shadow: 0 0 0 9px rgba(var(--sage-rgb), 0); }
          100% { box-shadow: 0 0 0 0 rgba(var(--sage-rgb), 0); }
        }

        .hero-card h1 {
          position: relative;
          z-index: 1;
          font-size: clamp(42px, 6vw, 76px);
          line-height: .94;
          letter-spacing: -0.07em;
          max-width: 820px;
          margin-bottom: 22px;
          color: var(--text);
        }

        .gradient-text {
          background: linear-gradient(135deg, var(--amber-light), var(--brass) 52%, var(--wood-oak));
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }

        .hero-copy {
          position: relative;
          z-index: 1;
          color: var(--soft);
          font-size: 17px;
          line-height: 1.75;
          max-width: 760px;
          margin-bottom: 26px;
        }

        .hero-grid {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
          margin-top: 28px;
        }

        .quick-card {
          border-radius: 18px;
          padding: 18px;
          background: rgba(var(--slate-500-rgb), .10);
          border: 1px solid rgba(var(--slate-400-rgb), .14);
        }

        .quick-card strong {
          display: block;
          font-size: 13px;
          margin-bottom: 7px;
          color: var(--text);
        }

        .quick-card span {
          color: var(--muted);
          font-size: 12px;
          line-height: 1.55;
        }

        .search-shell {
          display: flex;
          align-items: center;
          gap: 12px;
          border: 1px solid var(--border);
          border-radius: 18px;
          padding: 13px 16px;
          background: var(--card-strong);
          box-shadow: 0 16px 42px rgba(var(--black-rgb), .08);
          margin-bottom: 24px;
        }

        .search-shell input {
          width: 100%;
          border: 0;
          outline: 0;
          background: transparent;
          color: var(--text);
          font-size: 14px;
          font-weight: 650;
          font-family: inherit;
        }

        .search-shell input::placeholder { color: var(--muted); }

        .no-results {
          text-align: center;
          padding: 40px 20px;
          color: var(--muted);
          font-size: 14px;
        }

        .no-results strong { color: var(--text); }

        .doc-section {
          border: 1px solid var(--border);
          background: var(--card);
          box-shadow: 0 20px 60px rgba(var(--black-rgb), .14);
          border-radius: var(--radius-lg);
          overflow: hidden;
          margin-bottom: 24px;
          scroll-margin-top: 100px;
        }

        .section-title {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          padding: 22px 26px;
          border-bottom: 1px solid var(--border);
          background:
            radial-gradient(circle at 0% 0%, rgba(var(--brass-rgb), .12), transparent 35%),
            var(--card-strong);
        }

        .section-title h2 {
          display: flex;
          align-items: center;
          gap: 11px;
          font-size: 18px;
          letter-spacing: -0.025em;
          color: var(--text);
        }

        .section-title .label {
          color: var(--brass);
          font-size: 11px;
          font-weight: 950;
          letter-spacing: .08em;
          text-transform: uppercase;
          white-space: nowrap;
        }

        .doc-body {
          padding: 26px;
          color: var(--text);
        }

        .doc-body h3 {
          font-size: 20px;
          letter-spacing: -0.025em;
          margin-bottom: 12px;
          color: var(--text);
        }

        .doc-body p {
          color: var(--muted);
          line-height: 1.75;
          font-size: 14px;
          margin-bottom: 18px;
        }

        .info-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 14px;
          margin: 18px 0;
        }

        .info-box {
          border-radius: 18px;
          border: 1px solid rgba(var(--slate-400-rgb), .13);
          background: rgba(var(--slate-500-rgb), .09);
          padding: 18px;
        }

        .info-box.accent {
          background: linear-gradient(135deg, rgba(var(--brass-rgb), .15), rgba(var(--wood-walnut-rgb), .08));
          border-color: rgba(var(--brass-rgb), .28);
        }

        .info-box strong {
          display: block;
          color: var(--text);
          font-size: 13px;
          margin-bottom: 8px;
        }

        .info-box span,
        .info-box li {
          color: var(--muted);
          font-size: 13px;
          line-height: 1.65;
        }

        .info-box ul {
          list-style: none;
          display: grid;
          gap: 9px;
        }

        .info-box li::before {
          content: "✓";
          color: var(--brass);
          font-weight: 950;
          margin-right: 8px;
        }

        .callout {
          border-radius: 18px;
          padding: 18px 19px;
          border: 1px solid rgba(var(--amber-rgb), .42);
          background:
            radial-gradient(circle at 0% 0%, rgba(var(--amber-rgb), .14), transparent 42%),
            rgba(var(--amber-rgb), .06);
          margin: 20px 0;
        }

        .callout strong {
          display: flex;
          align-items: center;
          gap: 9px;
          color: var(--brass);
          font-size: 13px;
          margin-bottom: 7px;
        }

        .callout p {
          margin: 0;
          font-size: 13px;
          color: var(--soft);
        }

        .workflow-list {
          display: grid;
          gap: 14px;
          margin-top: 18px;
        }

        .workflow-item {
          display: grid;
          grid-template-columns: 44px 1fr;
          gap: 14px;
          padding: 18px;
          border-radius: 18px;
          background: rgba(var(--slate-500-rgb), .09);
          border: 1px solid rgba(var(--slate-400-rgb), .13);
        }

        .step-num {
          width: 40px;
          height: 40px;
          border-radius: 13px;
          display: grid;
          place-items: center;
          color: #1B1207;
          font-weight: 950;
          font-size: 15px;
          background: linear-gradient(135deg, var(--brass), var(--amber));
          box-shadow: 0 12px 28px rgba(var(--amber-rgb), .22);
        }

        .workflow-item h3 {
          font-size: 16px;
          margin-bottom: 6px;
        }

        .workflow-item p {
          margin: 0;
          font-size: 13px;
        }

        .code-card {
          overflow: hidden;
          border-radius: 18px;
          border: 1px solid var(--border);
          background: rgba(var(--slate-950-rgb), 0.88);
          margin-top: 16px;
        }

        .code-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          border-bottom: 1px solid rgba(var(--slate-400-rgb), .14);
          color: #E2E8F0;
          font-size: 12px;
          font-weight: 850;
        }

        .code-card pre {
          margin: 0;
          overflow: auto;
          padding: 18px;
          color: #D7DEE8;
          font-size: 12px;
          line-height: 1.7;
        }

        .faq-grid { display: grid; gap: 12px; }

        .faq-grid details {
          border-radius: 18px;
          border: 1px solid rgba(var(--slate-400-rgb), .13);
          background: rgba(var(--slate-500-rgb), .09);
          padding: 0;
          overflow: hidden;
        }

        .faq-grid summary {
          cursor: pointer;
          padding: 17px 18px;
          color: var(--text);
          font-weight: 850;
          font-size: 14px;
          list-style: none;
        }

        .faq-grid summary::-webkit-details-marker { display: none; }

        .faq-grid details p {
          padding: 0 18px 18px;
          margin: 0;
          font-size: 13px;
        }

        .stat-strip {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
          margin-top: 18px;
        }

        .stat {
          text-align: center;
          border-radius: 18px;
          padding: 18px;
          background: rgba(var(--brass-rgb), .08);
          border: 1px solid rgba(var(--brass-rgb), .18);
        }

        .stat strong {
          display: block;
          color: var(--brass);
          font-size: 26px;
          letter-spacing: -0.04em;
        }

        .stat span {
          color: var(--muted);
          font-size: 12px;
        }

        .docs-cta {
          border-radius: var(--radius-lg);
          overflow: hidden;
          border: 1px solid var(--border-strong);
          box-shadow: var(--shadow);
          background:
            radial-gradient(circle at 50% 0%, rgba(var(--cream-rgb), .19), transparent 34%),
            linear-gradient(135deg, var(--wood-dark), var(--wood-walnut) 52%, var(--bg-900));
          padding: 38px;
          text-align: center;
          margin-top: 28px;
        }

        .docs-cta h2 {
          color: #FFFDF8;
          font-size: clamp(30px, 4vw, 48px);
          line-height: 1.05;
          letter-spacing: -0.05em;
          margin-bottom: 12px;
        }

        .docs-cta p {
          color: #F4D79B;
          max-width: 620px;
          margin: 0 auto 24px;
          line-height: 1.7;
          font-size: 14px;
        }

        .docs-cta .btn-primary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 42px;
          padding: 0 16px;
          border-radius: 12px;
          border: 1px solid transparent;
          font-size: 13px;
          font-weight: 900;
          cursor: pointer;
          transition: transform .18s ease, box-shadow .18s ease, background .18s ease, border-color .18s ease;
          white-space: nowrap;
          color: #1B1207;
          background: linear-gradient(135deg, var(--brass), var(--amber) 72%);
          box-shadow: 0 14px 36px rgba(var(--amber-rgb), .28);
          text-decoration: none;
          font-family: inherit;
        }

        .docs-cta .btn-primary:hover { transform: translateY(-2px); }

        .docs-footer {
          border-top: 1px solid var(--border);
          background: rgba(var(--slate-950-rgb), 0.88);
          padding: 28px 0;
          color: var(--muted);
          font-size: 13px;
        }

        .footer-inner {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 18px;
          width: min(var(--max), calc(100% - 40px));
          margin-inline: auto;
        }

        .footer-links { display: flex; gap: 18px; }
        .footer-links a { color: var(--muted); transition: color .18s ease; }
        .footer-links a:hover { color: var(--brass); }

        .lp-light-theme .docs-sidebar,
        .lp-light-theme .doc-section,
        .lp-light-theme .hero-card,
        .lp-light-theme .search-shell {
          box-shadow:
            0 22px 70px rgba(64, 43, 25, 0.12),
            inset 0 1px 0 rgba(255,255,255,.72);
        }

        .lp-light-theme .docs-cta {
          background:
            radial-gradient(circle at 50% 0%, rgba(255, 243, 207, .24), transparent 42%),
            linear-gradient(135deg, #6B3D21 0%, #996236 48%, #C79862 100%);
        }

        .lp-light-theme .docs-footer {
          background: var(--bg-950);
        }

        .bullets { list-style: none; display: grid; gap: 10px; margin: 14px 0 0; }
        .bullets li { color: var(--soft); font-size: 14px; line-height: 1.65; }
        .bullets li::before { content: "•"; color: var(--brass); font-weight: 950; margin-right: 9px; }
        .numbered { counter-reset: steps; list-style: none; display: grid; gap: 10px; }
        .numbered li { counter-increment: steps; color: var(--muted); font-size: 13px; line-height: 1.65; }
        .numbered li::before { content: counter(steps) "."; color: var(--brass); font-weight: 950; margin-right: 8px; }
        .mini-location { display: block; margin-top: 9px; color: var(--muted); opacity: .72; font-size: 10px; font-weight: 950; text-transform: uppercase; letter-spacing: .06em; font-style: italic; }
        .left-accent { border-left: 4px solid var(--brass); padding-left: 17px; }
        .left-accent.blue { border-left-color: var(--purple-2); }
        .left-accent.green { border-left-color: var(--sage); }
        .left-accent.purple { border-left-color: var(--purple); }
        .stack { display: grid; gap: 16px; }
        .cabinet-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px 24px; }
        .cabinet-grid li { list-style: none; color: var(--muted); font-size: 13px; line-height: 1.55; }
        .support-email { color: var(--brass); font-weight: 900; }
        .doc-body code:not(pre code) { color: var(--brass); background: rgba(var(--brass-rgb), .10); border: 1px solid rgba(var(--brass-rgb), .18); padding: 1px 5px; border-radius: 7px; }
        @media (max-width: 680px) { .cabinet-grid { grid-template-columns: 1fr; } }

        .doc-section,
        .docs-cta,
        details[id] {
          scroll-margin-top: 156px;
        }
        @media (max-width: 940px) {
          .doc-section,
          .docs-cta,
          details[id] {
            scroll-margin-top: 176px;
          }
        }
        @media (max-width: 560px) {
          .doc-section,
          .docs-cta,
          details[id] {
            scroll-margin-top: 154px;
          }
        }

        .docs-main,
        .doc-section,
        .hero-card,
        .search-shell,
        .code-card,
        .info-box,
        .workflow-item,
        .docs-cta {
          min-width: 0;
        }

        pre, code {
          max-width: 100%;
          white-space: pre;
        }

        img, svg, video, canvas, iframe {
          max-width: 100%;
        }

        @media (max-width: 1180px) {
          .docs-layout {
            grid-template-columns: 280px minmax(0, 1fr);
            gap: 24px;
            justify-content: stretch;
          }
          .docs-main {
            max-width: none;
          }
        }

        @media (max-width: 940px) {
          .docs-layout {
            display: block;
            padding: 22px 0 56px;
          }

          .docs-sidebar {
            position: sticky;
            top: 78px;
            z-index: 35;
            margin-bottom: 22px;
            border-radius: 20px;
          }

          .sidebar-head {
            padding: 14px 16px 11px;
          }

          .sidebar-head span {
            display: none;
          }

          .side-links {
            display: flex;
            gap: 8px;
            padding: 10px;
            overflow-x: auto;
            overscroll-behavior-inline: contain;
            scroll-snap-type: x proximity;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: none;
          }

          .side-links::-webkit-scrollbar {
            display: none;
          }

          .side-link {
            flex: 0 0 auto;
            min-width: max-content;
            scroll-snap-align: start;
            padding: 7px 10px;
            font-size: 11px;
            width: auto;
          }

          .side-icon {
            width: 22px;
            height: 22px;
            font-size: 10px;
            border-radius: 7px;
          }

          .side-link:hover,
          .side-link.active {
            transform: translateY(-1px);
          }

          .hero-card {
            padding: 30px;
          }

          h1 {
            font-size: clamp(42px, 9vw, 64px);
            letter-spacing: -0.065em;
          }

          .hero-copy {
            font-size: 16px;
          }

          .hero-grid,
          .info-grid,
          .stat-strip {
            grid-template-columns: 1fr;
          }

          .section-title {
            align-items: flex-start;
            flex-direction: column;
            gap: 10px;
            padding: 20px;
          }

          .doc-body {
            padding: 22px;
          }

          .footer-inner {
            flex-direction: column;
            align-items: flex-start;
          }
        }

        @media (max-width: 680px) {
          .docs-sidebar {
            top: 72px;
            margin-inline: -2px;
            border-radius: 18px;
          }

          .sidebar-head {
            display: none;
          }

          .side-links {
            padding: 8px;
          }

          .side-icon {
            width: 22px;
            height: 22px;
            border-radius: 7px;
            font-size: 10px;
          }

          .side-link {
            padding: 6px 8px;
            font-size: 11px;
            gap: 6px;
          }

          .hero-card {
            padding: 24px;
            border-radius: 22px;
            margin-bottom: 18px;
          }

          .hero-card::after {
            width: 190px;
            height: 190px;
            right: -96px;
            top: -72px;
          }

          .eyebrow {
            font-size: 11px;
            line-height: 1.25;
            padding: 7px 10px;
            margin-bottom: 16px;
          }

          h1 {
            font-size: clamp(36px, 13vw, 50px);
            line-height: .98;
            letter-spacing: -0.058em;
          }

          .hero-copy {
            font-size: 14px;
            line-height: 1.65;
          }

          .quick-card,
          .info-box,
          .workflow-item,
          .callout {
            border-radius: 16px;
            padding: 16px;
          }

          .search-shell {
            border-radius: 16px;
            padding: 12px 14px;
            margin-bottom: 18px;
          }

          .search-shell input {
            font-size: 13px;
          }

          .doc-section {
            border-radius: 22px;
            margin-bottom: 18px;
            scroll-margin-top: 128px;
          }

          .section-title h2 {
            font-size: 16px;
            line-height: 1.3;
          }

          .section-title .label {
            font-size: 10px;
          }

          .doc-body {
            padding: 18px;
          }

          .doc-body h3 {
            font-size: 18px;
          }

          .doc-body p,
          .info-box span,
          .info-box li,
          .workflow-item p,
          details p {
            font-size: 13px;
          }

          .workflow-item {
            grid-template-columns: 36px 1fr;
            gap: 12px;
          }

          .step-num {
            width: 34px;
            height: 34px;
            border-radius: 11px;
            font-size: 12px;
          }

          .workflow-item h3 {
            font-size: 15px;
          }

          .code-card {
            border-radius: 16px;
          }

          .code-head {
            padding: 11px 13px;
            font-size: 11px;
          }

          pre {
            padding: 14px;
            font-size: 11px;
            line-height: 1.65;
          }

          summary {
            padding: 15px 16px;
            font-size: 13px;
          }

          details p {
            padding: 0 16px 16px;
          }

          .docs-cta {
            padding: 28px 20px;
            border-radius: 22px;
          }

          .docs-cta h2 {
            font-size: clamp(28px, 9vw, 38px);
          }

          .docs-cta p {
            font-size: 13px;
          }

          .footer-links {
            flex-wrap: wrap;
          }
        }

        @media (max-width: 420px) {
          .side-link {
            padding: 6px 8px;
            font-size: 10px;
            gap: 5px;
          }

          .side-icon {
            width: 20px;
            height: 20px;
            font-size: 9px;
            border-radius: 6px;
          }

          h1 {
            font-size: clamp(33px, 14vw, 44px);
          }

          .hero-card,
          .doc-body,
          .section-title {
            padding-inline: 16px;
          }

          .hero-grid {
            gap: 10px;
          }
        }
      `}</style>

      <div className={`docs-page ${isDark ? 'lp-dark-theme' : 'lp-light-theme'}`}>
        <LandingHeader
          onSignIn={onSignIn}
          onGetStarted={onGetStarted}
          isDark={isDark}
          setIsDark={setIsDark}
        />

        <div className="docs-layout">
          <aside className="docs-sidebar" aria-label="Documentation navigation">
            <div className="sidebar-head">
              <strong>Documentation</strong>
              <span>CabEngine Pro setup, workflow, reports, subscriptions and integration notes.</span>
            </div>
            <div className="side-links">
              {filteredSections.map((section) => (
                <button
                  key={section.id}
                  data-section-id={section.id}
                  onClick={() => scrollToSection(section.id)}
                  className={`side-link ${activeSection === section.id ? 'active' : ''}`}
                >
                  <span className="side-icon">{section.number}</span>
                  {section.title}
                </button>
              ))}
            </div>
          </aside>

          <section className="docs-main">
            <article className="hero-card">
              <div className="eyebrow"><span className="pulse-dot"></span> Cabinet software integration docs</div>
              <h1>CabEngine Pro <span className="gradient-text">documentation</span>.</h1>
              <p className="hero-copy">Complete CabEngine Pro documentation covering cabinet software integration, the cabinet configurator API, embeddable 3D planner setup, project workflows, and BOM generation.</p>
              <div className="hero-grid">
                <div className="quick-card"><strong>Project workflow</strong><span>Move from identity and material setup into studio visualisation and production export.</span></div>
                <div className="quick-card"><strong>Manufacturing reports</strong><span>Understand BOM, costing, cut plans, wall elevations and technical dossier outputs.</span></div>
                <div className="quick-card"><strong>Embeddable planner</strong><span>Use the configurator API to add a client-facing cabinet planner to your site.</span></div>
              </div>
            </article>

            <div className="search-shell" role="search">
              <span aria-hidden="true" style={{ color: 'var(--muted)', fontSize: '18px', fontWeight: 300 }}>⌕</span>
              <input type="search" placeholder="Search docs: BOM, tile scaling, advanced mode, API key…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>

            {filteredSections.length === 0 && searchQuery && (
              <div className="no-results">No docs match "<strong>{searchQuery}</strong>". Try a different term.</div>
            )}

            {filteredSections.map((section) => (
              <article key={section.id} id={section.id} className="doc-section">
                <header className="section-title">
                  <h2>
                    <span className="side-icon">{section.number}</span>
                    {section.title}
                  </h2>
                  {section.label && <span className="label">{section.label}</span>}
                </header>
                <div className="doc-body">
                  {section.content}
                </div>
              </article>
            ))}

            <section className="docs-cta">
              <h2>Need more help?</h2>
              <p>Contact support at support@protradee.com, or return to the app and open the relevant project from your dashboard.</p>
              <button className="btn-primary" onClick={() => document.querySelector('.overflow-y-auto')?.scrollTo({ top: 0, behavior: 'smooth' })}>Back to top</button>
            </section>
          </section>
        </div>

        <footer className="docs-footer">
          <div className="footer-inner">
            <span>CabEngine <small style={{ fontSize: '10px', color: 'var(--muted)' }}>Docs</small></span>
            <div className="footer-links">
              <a href="#overview" onClick={(e) => { e.preventDefault(); scrollToSection('overview'); }}>Docs</a>
              <a href="#embed" onClick={(e) => { e.preventDefault(); scrollToSection('embed'); }}>API</a>
              <a href="#faq" onClick={(e) => { e.preventDefault(); scrollToSection('faq'); }}>Support</a>
            </div>
            <span>&copy; 2026 CabEngine Pro. All rights reserved.</span>
          </div>
        </footer>
      </div>
    </>
  );
};

export default DocsPage;
