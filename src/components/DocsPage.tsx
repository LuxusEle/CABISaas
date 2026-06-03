import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Book, ChevronRight, Settings, Settings2, Box, Table2, CreditCard, Lightbulb, HelpCircle, CheckCircle, Share2 } from 'lucide-react';
import { LandingHeader } from './LandingHeader';

interface DocSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  content: React.ReactNode;
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
  setIsDark
}) => {
  const [activeSection, setActiveSection] = useState('overview');

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash) {
      setActiveSection(hash);
      setTimeout(() => {
        const element = document.getElementById(hash);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  }, []);

  const sections: DocSection[] = [
    {
      id: 'overview',
      title: 'Getting Started',
      icon: <Book className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">Welcome to CabEngine Pro</h3>
          <p className="text-slate-600 dark:text-slate-300">
            CabEngine Pro is an advanced engineering suite for high-fidelity cabinet design and manufacturing. It enables you to:
          </p>
          <ul className="list-disc list-inside space-y-2 text-slate-600 dark:text-slate-300 ml-4">
            <li>Design complex kitchen layouts with multiple wall zones</li>
            <li>Generate accurate Bill of Materials (BOM) and costings</li>
            <li>Optimize material nesting and cutting patterns</li>
            <li>Create professional technical drawings and elevations</li>
            <li>Manage global material libraries and hardware</li>
          </ul>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <h4 className="font-black text-xs uppercase tracking-widest text-amber-600 dark:text-amber-500 mb-2">New Here?</h4>
              <p className="text-sm text-slate-600 dark:text-slate-400 italic">Use the <strong>Quick Start Demo</strong> from the dashboard to instantly load a professional layout and explore all features.</p>
            </div>
            <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <h4 className="font-black text-xs uppercase tracking-widest text-blue-600 dark:text-blue-500 mb-2">Workspace Theme</h4>
              <p className="text-sm text-slate-600 dark:text-slate-400 italic">Toggle <strong>Light/Dark mode</strong> in the sidebar. The entire interface is theme-aware for different design environments.</p>
            </div>
          </div>

          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mt-4">
            <h4 className="font-bold text-amber-800 dark:text-amber-400 flex items-center gap-2">
              <Lightbulb className="w-4 h-4" />
              Quick Tip
            </h4>
            <p className="text-sm text-amber-700 dark:text-amber-300 mt-2">
              Access any project directly from the <strong>Dashboard</strong> using the Action Menu overlay to jump straight to Setup, 3D Studio, or BOM.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'workflow',
      title: 'Complete Project Workflow',
      icon: <CheckCircle className="w-5 h-5" />,
      content: (
        <div className="space-y-6">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">Step-by-Step Engineering Process</h3>

          <div className="space-y-6">
            <div className="border-l-4 border-amber-500 pl-4">
              <h4 className="font-bold text-slate-900 dark:text-white text-lg">Step 1: Project Identity & Mode</h4>
              <p className="text-slate-600 dark:text-slate-300 mt-2">
                Configure site address and contact info. Enable <strong>Advanced Mode</strong> if you prefer manual weaponry box entry over automatic solvers.
              </p>
              <p className="text-[10px] font-bold text-slate-400 mt-2 italic uppercase">Location: Sidebar → Setup → Step 1: Identity</p>
            </div>

            <div className="border-l-4 border-blue-500 pl-4">
              <h4 className="font-bold text-slate-900 dark:text-white text-lg">Step 2: Materials & Branding</h4>
              <p className="text-slate-600 dark:text-slate-300 mt-2">
                Define your sheet library, hardware, and material allocation. Visit the <strong>Business Profile</strong> to sync your company logo for reports.
              </p>
              <p className="text-[10px] font-bold text-slate-400 mt-2 italic uppercase">Location: Sidebar → Setup → Steps 2-8</p>
            </div>

            <div className="border-l-4 border-green-500 pl-4">
              <h4 className="font-bold text-slate-900 dark:text-white text-lg">Step 3: Studio Visualization</h4>
              <p className="text-slate-600 dark:text-slate-300 mt-2">
                Design your walls in the <strong>3D Studio</strong>. Toggle between Realistic and Technical views to verify textures and dimensions.
              </p>
              <p className="text-[10px] font-bold text-slate-400 mt-2 italic uppercase">Location: Sidebar → 3D Design Studio</p>
            </div>

            <div className="border-l-4 border-purple-500 pl-4">
              <h4 className="font-bold text-slate-900 dark:text-white text-lg">Step 4: Production Export</h4>
              <p className="text-slate-600 dark:text-slate-300 mt-2">
                Review your BOM, check material nesting in the Cut Plan, and export your final technical dossier (Excel/PDF/JSON).
              </p>
              <p className="text-[10px] font-bold text-slate-400 mt-2 italic uppercase">Location: Sidebar → Reports & BOM</p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'setup',
      title: 'Project Setup & Modes',
      icon: <Settings className="w-5 h-5" />,
      content: (
        <div className="space-y-6">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">Configuration Options</h3>

          <div className="space-y-4">
            <div className="bg-amber-50/50 dark:bg-amber-900/10 p-5 rounded-2xl border border-amber-200/50 dark:border-amber-800/50">
              <h4 className="font-black text-xs uppercase tracking-widest text-amber-700 dark:text-amber-500 mb-2 flex items-center gap-2">
                <Settings2 className="w-4 h-4" /> Advanced Mode (Direct Entry)
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed italic">
                Enables precise manual control over cabinetry boxes. Skip the automatic layout solver to define exact widths, blind panels, and placement sequence.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                <h4 className="font-bold text-slate-900 dark:text-white mb-2 text-sm uppercase">Materials & Hardware</h4>
                <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                  <li>• <strong>Sheet Types:</strong> Define name, thickness, and sheet price.</li>
                  <li>• <strong>Accessories:</strong> Add hardware with custom unit costs.</li>
                  <li>• <strong>Tile Scaling:</strong> Set backsplash tile dimensions for 3D realism.</li>
                </ul>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                <h4 className="font-bold text-slate-900 dark:text-white mb-2 text-sm uppercase">Material Allocation</h4>
                <p className="text-[10px] text-slate-400 mb-2 uppercase font-black">Assign defaults to:</p>
                <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                  <li>• <strong>Carcass (Box):</strong> Sides, top, and bottom.</li>
                  <li>• <strong>Front Doors:</strong> Finished exterior faces.</li>
                  <li>• <strong>Drawer Boxes:</strong> Bottoms and internal sides.</li>
                  <li>• <strong>Back Panels:</strong> Typically thinner materials.</li>
                </ul>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
              <h4 className="font-bold text-slate-900 dark:text-white mb-2">Business Profile & Branding</h4>
              <p className="text-sm text-slate-600 dark:text-slate-300 mb-2">
                Your company identity is global and persists across projects:
              </p>
              <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                <li>• <strong>Company Logo:</strong> Automatically scales for BOM and Wall Plan headers.</li>
                <li>• <strong>Business Metadata:</strong> Syncs company name and address to all invoices.</li>
                <li>• <strong>Real-time Sync:</strong> Ensures all devices show your latest pro status.</li>
              </ul>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'walls',
      title: '3D Design Studio',
      icon: <Box className="w-5 h-5" />,
      content: (
        <div className="space-y-6">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">Studio Tools & Visualization</h3>

          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-800 rounded-lg p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
              <h4 className="font-black text-xs uppercase tracking-widest text-amber-600 dark:text-amber-500 mb-3">Realistic Visualization</h4>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                The studio uses physically accurate rendering for professional presentations:
              </p>
              <ul className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
                <li>• <strong>View Toggles:</strong> Switch between Realistic (Textures) and Technical (Wireframe).</li>
                <li>• <strong>Tile Scaling:</strong> Backsplash textures scale based on your hardware library dimensions.</li>
                <li>• <strong>ISO Elevation:</strong> View specific wall zones in flattened technical elevation.</li>
              </ul>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
              <h4 className="font-bold text-slate-900 dark:text-white mb-2">Cabinet Presets Library</h4>
              <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-xs text-slate-600 dark:text-slate-300">
                <li>• <strong>Base 2-Door:</strong> Standard base unit</li>
                <li>• <strong>Base 3-Drawer:</strong> Multi-drawer base</li>
                <li>• <strong>Base Corner:</strong> L-shaped corner unit</li>
                <li>• <strong>Wall Standard:</strong> Upper wall cabinet</li>
                <li>• <strong>Tall Utility:</strong> Full-height storage</li>
                <li>• <strong>Tall Oven/Micro:</strong> Appliance housing</li>
                <li>• <strong>Sink Unit:</strong> Plumbing-ready base</li>
                <li>• <strong>Open Box:</strong> Decorative shelving</li>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
              <h4 className="font-bold text-slate-900 dark:text-white mb-2 text-sm uppercase">Obstacles & Site Constraints</h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 mb-2">
                Define on-site obstacles (Windows, Doors, Pipes) to ensure layout feasibility. Obstacles appear as hatched regions in the technical elevation view.
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'bom',
      title: 'Reports & BOM',
      icon: <Table2 className="w-5 h-5" />,
      content: (
        <div className="space-y-6">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">Production Analytics</h3>

          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
              <h4 className="font-bold text-slate-900 dark:text-white mb-2">Cost Breakdown & Estimates</h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 mb-3">The summary card tracks financial metrics in real-time:</p>
              <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                <li>• <strong>Material Cost:</strong> Raw sheet material totals.</li>
                <li>• <strong>Hardware Totals:</strong> Hinges (2/door), handles, and drawer slides.</li>
                <li>• <strong>Labor Estimate:</strong> Projected assembly/install time.</li>
                <li>• <strong>Total Quote:</strong> Final project cost including margin.</li>
              </ul>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                <h4 className="font-bold text-slate-900 dark:text-white mb-2 text-sm uppercase">Cut Plan Optimization</h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 italic">Visual layout of parts on sheets to minimize waste and optimize material usage.</p>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                <h4 className="font-bold text-slate-900 dark:text-white mb-2 text-sm uppercase">Wall Elevations</h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 italic">Technical drawings for each wall zone with unit schedules and dimensions.</p>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
              <h4 className="font-bold text-slate-900 dark:text-white mb-2">Export & Technical Dossier</h4>
              <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                <li>• <strong>Print / PDF:</strong> Full dossier with title blocks and branding.</li>
                <li>• <strong>Excel (XLSX):</strong> Detailed parts list for procurement.</li>
                <li>• <strong>Raw JSON:</strong> Full project state for technical integration.</li>
              </ul>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'pricing',
      title: 'Access & Subscription',
      icon: <CreditCard className="w-5 h-5" />,
      content: (
        <div className="space-y-6">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">Subscription Policies</h3>

          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-800 rounded-lg p-5 border-2 border-amber-500 dark:border-amber-400">
              <h4 className="font-black text-xs uppercase tracking-widest text-amber-600 dark:text-amber-500 mb-2">New User Privilege</h4>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed italic">
                Experience the full power of the platform: your <strong>first two projects</strong> are automatically granted <strong>PRO status</strong>, enabling all export formats and Advanced mode.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                <h4 className="font-bold text-slate-900 dark:text-white mb-2">Free Tier</h4>
                <ul className="space-y-1 text-xs text-slate-500 dark:text-slate-400">
                  <li>✓ Design up to 2 projects</li>
                  <li>✓ Realistic 3D visuals</li>
                  <li>✗ Limited to basic presets</li>
                  <li>✗ No Excel/PDF branding</li>
                </ul>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                <h4 className="font-bold text-slate-900 dark:text-white mb-2">Pro Tier</h4>
                <ul className="space-y-1 text-xs text-slate-500 dark:text-slate-400">
                  <li>✓ Unlimited projects</li>
                  <li>✓ Full export suite</li>
                  <li>✓ Custom business branding</li>
                  <li>✓ Advanced Direct Entry mode</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'embed',
      title: 'Embed Configurator API',
      icon: <Share2 className="w-5 h-5" />,
      content: (
        <div className="space-y-6">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">Embedding the 3D Planner</h3>
          <p className="text-slate-600 dark:text-slate-300 text-sm">
            You can embed the kitchen setup wizard and 3D designer directly into your own website or client portals. This allows your customers to configure their cabinetry layout and submit specifications without leaving your site.
          </p>

          <div className="space-y-4">
            <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
              <h4 className="font-bold text-slate-900 dark:text-white mb-2 text-sm uppercase">Quick Integration Steps</h4>
              <ol className="list-decimal list-inside space-y-2 text-xs text-slate-600 dark:text-slate-300">
                <li>Register your domain under your developer/admin settings to generate an <strong>API Key</strong>.</li>
                <li>Embed our secure iframe pointing to <code>https://www.protradee.com/embed/setup?apiKey=YOUR_API_KEY</code>.</li>
                <li>Listen to parent window messages to automatically capture project completion events.</li>
              </ol>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
              <h4 className="font-bold text-slate-900 dark:text-white mb-3 text-sm uppercase">Standard HTML Embedding Snippet</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                Use this template to add a customizable lightbox/modal widget that opens the configurator:
              </p>
              <pre className="bg-slate-900 text-slate-200 p-4 rounded-xl text-xs overflow-x-auto font-mono max-h-60 leading-relaxed border border-slate-800">
{`<!-- Start Cabinet Widget Button -->
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
      // Handle the completed setup: event.data.projectId
      console.log('Project completed successfully:', event.data.projectId);
    }
  });
</script>`}
              </pre>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'faq',
      title: 'FAQ & Troubleshooting',
      icon: <HelpCircle className="w-5 h-5" />,
      content: (
        <div className="space-y-6">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">Common Questions</h3>

          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
              <h4 className="font-bold text-slate-900 dark:text-white mb-2">Q: Why are my backsplash tiles looking stretched?</h4>
              <p className="text-slate-600 dark:text-slate-300 text-sm">
                A: Verify the physical <strong>Tile Dimensions</strong> in your Accessory library. Realistic textures require accurate dimensions to calculate real-world scaling.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
              <h4 className="font-bold text-slate-900 dark:text-white mb-2">Q: How do I jump directly to BOM from the dashboard?</h4>
              <p className="text-slate-600 dark:text-slate-300 text-sm">
                A: Click any project card on the dashboard to open the <strong>Action Menu overlay</strong>. Select "Reports & BOM" to skip direct to production data.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
              <h4 className="font-bold text-slate-900 dark:text-white mb-2">Q: Does Advanced Mode affect BOM precision?</h4>
              <p className="text-slate-600 dark:text-slate-300 text-sm">
                A: No. Advanced Mode only changes the entry method (manual vs automated solver). Engineering logic and cost calculations remain 100% accurate.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
              <h4 className="font-bold text-slate-900 dark:text-white mb-2 text-sm uppercase">Technical Support</h4>
              <p className="text-slate-600 dark:text-slate-300 text-xs italic">
                For complex engineering queries or hardware integration help, contact us at <span className="text-amber-600 font-bold">support@protradee.com</span>.
              </p>
            </div>
          </div>
        </div>
      )
    }
  ];


  return (
    <>
      <Helmet>
        <title>Documentation - CabEngine Pro | Cabinet Software Guide</title>
        <meta name="description" content="Complete CabEngine Pro documentation. Learn how to set up projects, use the 3D design studio, generate BOM reports, and integrate the embeddable cabinet configurator." />
      </Helmet>
    <div className="h-full overflow-y-auto bg-slate-50 dark:bg-slate-950">
      <LandingHeader
        onSignIn={onSignIn}
        onGetStarted={onGetStarted}
        isDark={isDark}
        setIsDark={setIsDark}
      />

      {/* Content */}
      <div className="max-w-6xl mx-auto flex pt-14 sm:pt-16">
        {/* Sidebar Navigation */}
        <aside className="hidden md:block w-64 shrink-0 border-r border-slate-200 dark:border-slate-800 sticky top-14 sm:top-16 h-[calc(100vh-4rem)] overflow-y-auto p-4 bg-white dark:bg-slate-900">
          <nav className="space-y-1">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => scrollToSection(section.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors text-left ${activeSection === section.id
                    ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
              >
                <div className="shrink-0">
                  {section.icon}
                </div>
                <span className="flex-1 truncate">{section.title}</span>
                <ChevronRight className={`w-4 h-4 transition-transform ${activeSection === section.id ? 'rotate-90 opacity-100' : 'opacity-30'}`} />
              </button>
            ))}
          </nav>
        </aside>

        {/* Mobile + Content wrapper */}
        <div className="flex-1 min-w-0">
          {/* Mobile Section Navigation */}
          <div className="md:hidden sticky top-14 sm:top-16 z-30 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm">
            <nav className="flex overflow-x-auto gap-1 px-3 py-2.5">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => scrollToSection(section.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors shrink-0 ${
                    activeSection === section.id
                      ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                      : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="w-3.5 h-3.5 flex items-center justify-center">
                    {section.icon}
                  </div>
                  <span>{section.title}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Main Content */}
          <main className="p-4 md:p-8">
            <div className="max-w-4xl mx-auto space-y-6 md:space-y-8">
              {sections.map((section) => (
                <section
                  key={section.id}
                  id={section.id}
                  className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden scroll-mt-28 md:scroll-mt-20"
                >
                <div className={`px-4 md:px-6 py-3 md:py-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 transition-colors ${activeSection === section.id ? 'bg-amber-50 dark:bg-amber-900/10' : 'bg-slate-50 dark:bg-slate-800/50'
                  }`}>
                  <div className={activeSection === section.id ? 'text-amber-700 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400'}>
                    {section.icon}
                  </div>
                  <h2 className={`text-lg font-bold transition-colors ${activeSection === section.id ? 'text-amber-900 dark:text-amber-100' : 'text-slate-900 dark:text-white'
                    }`}>
                    {section.title}
                  </h2>
                </div>
                <div className="p-4 md:p-6">
                  {section.content}
                </div>
              </section>
            ))}

            {/* Footer */}
            <div className="text-center py-12 text-slate-400 dark:text-slate-600 border-t border-slate-200 dark:border-slate-800">
              <p className="text-sm">
                Need more help? Contact support at support@protradee.com
              </p>
            </div>
          </div>
        </main>
        </div>
      </div>
    </div>
    </>
  );
};

export default DocsPage;
