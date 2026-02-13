import React from 'react';
import { X, ExternalLink, FileText, DollarSign, Shield, Users, CreditCard, CheckCircle, Layers, Calculator, Zap, Box, Table2, Map } from 'lucide-react';

interface DocsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LandingDocsModal: React.FC<DocsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
        
        <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-6 flex items-center justify-between z-10">
            <div className="flex items-center gap-3">
              <FileText className="w-6 h-6 text-amber-500" />
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">CabEngine Pro Documentation</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-8">
            {/* Overview Section */}
            <section>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Box className="w-5 h-5 text-amber-500" />
                Application Overview
              </h3>
              <div className="prose dark:prose-invert max-w-none">
                <p className="text-slate-600 dark:text-slate-300">
                  CabEngine Pro is a professional cabinet design and manufacturing application that streamlines the entire 
                  process from design to production. The app enables users to create detailed cabinet layouts, generate 
                  accurate bills of materials (BOM), optimize material cutting patterns, and produce professional documentation.
                </p>
              </div>
            </section>

            {/* Core Features */}
            <section>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Layers className="w-5 h-5 text-amber-500" />
                Core Features
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                {[
                  { icon: <Box />, title: '3D Cabinet Design', desc: 'Design cabinets across multiple wall zones with base, wall, and tall cabinet types' },
                  { icon: <Table2 />, title: 'Bill of Materials (BOM)', desc: 'Automatic generation of detailed BOM with material specifications and hardware calculations' },
                  { icon: <Calculator />, title: 'Cost Estimation', desc: 'Real-time cost calculation based on materials, hardware, and labor rates' },
                  { icon: <Zap />, title: 'Cut Optimization', desc: 'Material cutting pattern optimization to minimize waste and costs' },
                  { icon: <Map />, title: 'Elevation Plans', desc: 'Generate professional elevation drawings with dimensions and cabinet positions' },
                  { icon: <FileText />, title: 'Export Capabilities', desc: 'Export to PDF, Excel, and JSON formats for production and integration' },
                ].map((feature, idx) => (
                  <div key={idx} className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-amber-500">{feature.icon}</span>
                      <h4 className="font-bold text-slate-900 dark:text-white">{feature.title}</h4>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{feature.desc}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Technical Specifications */}
            <section>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-amber-500" />
                Technical Specifications
              </h3>
              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white mb-2">Cabinet Types</h4>
                    <ul className="list-disc list-inside text-sm text-slate-600 dark:text-slate-300 space-y-1">
                      <li>Base Cabinets (720mm height)</li>
                      <li>Wall Cabinets (720mm height)</li>
                      <li>Tall Cabinets (2100mm height)</li>
                      <li>Custom cabinet configurations</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white mb-2">Material Support</h4>
                    <ul className="list-disc list-inside text-sm text-slate-600 dark:text-slate-300 space-y-1">
                      <li>Custom sheet sizes (default: 2440x1220mm)</li>
                      <li>Multiple thickness options (16mm, 18mm, 19mm)</li>
                      <li>Material-specific pricing</li>
                      <li>Waste optimization algorithms</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white mb-2">Hardware Management</h4>
                    <ul className="list-disc list-inside text-sm text-slate-600 dark:text-slate-300 space-y-1">
                      <li>Soft-close hinges (2 per door)</li>
                      <li>Drawer slides (per drawer)</li>
                      <li>Handles/Knobs (per door + drawer)</li>
                      <li>Custom hardware accessories</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white mb-2">Export Formats</h4>
                    <ul className="list-disc list-inside text-sm text-slate-600 dark:text-slate-300 space-y-1">
                      <li>PDF Reports with professional layouts</li>
                      <li>Excel Spreadsheets (.xlsx)</li>
                      <li>JSON Data for integration</li>
                      <li>Print-optimized wall plans</li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>

            {/* Architecture */}
            <section>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-amber-500" />
                Architecture & Infrastructure
              </h3>
              <div className="space-y-4">
                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                  <h4 className="font-bold text-slate-900 dark:text-white mb-2">Frontend</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    React 18+ with TypeScript, Tailwind CSS for styling, Lucide React for icons. 
                    Responsive design supporting desktop and mobile devices.
                  </p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                  <h4 className="font-bold text-slate-900 dark:text-white mb-2">Backend & Database</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    Supabase (PostgreSQL) for data persistence, Row Level Security (RLS) for data protection,
                    Storage bucket for logo and file uploads.
                  </p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                  <h4 className="font-bold text-slate-900 dark:text-white mb-2">Authentication</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    JWT-based authentication via Supabase Auth. Users can sign up with email/password.
                    All projects are user-specific and secured via RLS policies.
                  </p>
                </div>
              </div>
            </section>

            {/* 2Checkout Integration */}
            <section>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-amber-500" />
                Payment Integration
              </h3>
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-6">
                <h4 className="font-bold text-amber-800 dark:text-amber-400 mb-2">Subscription Model</h4>
                <div className="space-y-4">
                  <div>
                    <h5 className="font-semibold text-slate-900 dark:text-white">Free Plan</h5>
                    <ul className="list-disc list-inside text-sm text-slate-600 dark:text-slate-300 mt-1">
                      <li>Up to 3 projects</li>
                      <li>Basic cabinet presets</li>
                      <li>PDF export</li>
                      <li>Limited material types</li>
                    </ul>
                  </div>
                  <div>
                    <h5 className="font-semibold text-slate-900 dark:text-white">Pro Plan</h5>
                    <ul className="list-disc list-inside text-sm text-slate-600 dark:text-slate-300 mt-1">
                      <li>Unlimited projects</li>
                      <li>All cabinet presets including custom</li>
                      <li>Full BOM export (Excel, PDF, JSON)</li>
                      <li>Unlimited material types</li>
                      <li>Cloud backup</li>
                      <li>Priority support</li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>

            {/* User Workflow */}
            <section>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-500" />
                User Workflow
              </h3>
              <div className="space-y-3">
                {[
                  { step: '1', title: 'Account Creation', desc: 'User signs up with email/password' },
                  { step: '2', title: 'Project Setup', desc: 'Configure company info, materials, dimensions' },
                  { step: '3', title: 'Material Configuration', desc: 'Add sheet types, hardware items, pricing' },
                  { step: '4', title: 'Cabinet Design', desc: 'Design cabinets across multiple wall zones' },
                  { step: '5', title: 'BOM Generation', desc: 'Automatic calculation of materials and costs' },
                  { step: '6', title: 'Export & Production', desc: 'Export reports for manufacturing' },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400 font-bold text-sm">
                      {item.step}
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900 dark:text-white">{item.title}</h4>
                      <p className="text-sm text-slate-600 dark:text-slate-300">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Security & Compliance */}
            <section>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-amber-500" />
                Security & Data Protection
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                  <h4 className="font-bold text-slate-900 dark:text-white mb-2">Data Security</h4>
                  <ul className="list-disc list-inside text-sm text-slate-600 dark:text-slate-300 space-y-1">
                    <li>All data encrypted in transit (HTTPS/TLS)</li>
                    <li>Row Level Security (RLS) enforced</li>
                    <li>JWT-based authentication</li>
                    <li>Secure password hashing</li>
                    <li>No sensitive payment data stored</li>
                  </ul>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                  <h4 className="font-bold text-slate-900 dark:text-white mb-2">Compliance</h4>
                  <ul className="list-disc list-inside text-sm text-slate-600 dark:text-slate-300 space-y-1">
                    <li>PCI DSS compliant payment processing</li>
                    <li>GDPR compliant data handling</li>
                    <li>User data export available</li>
                    <li>Account deletion support</li>
                    <li>Privacy-focused architecture</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Contact */}
            <section className="border-t border-slate-200 dark:border-slate-800 pt-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">Questions or Support?</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    For technical inquiries
                  </p>
                </div>
                <a
                  href="mailto:asanke1@gmail.com"
                  className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg font-bold hover:bg-amber-600 transition-colors"
                >
                  Contact Support
                  <ExternalLink size={16} />
                </a>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingDocsModal;
