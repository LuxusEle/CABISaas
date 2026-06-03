import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Box, Ruler, Sliders, Wrench, ArrowRight, Check } from 'lucide-react';
import { LandingHeader } from './LandingHeader';

interface ManualCabinetSoftwarePageProps {
  onSignIn: () => void;
  onGetStarted: () => void;
  isDark: boolean;
  setIsDark: (isDark: boolean) => void;
}

export const ManualCabinetSoftwarePage: React.FC<ManualCabinetSoftwarePageProps> = ({
  onSignIn,
  onGetStarted,
  isDark,
  setIsDark
}) => {
  return (
    <>
      <Helmet>
        <title>Manual Cabinet Layout Software | Full Control Cabinet Design | CabEngine Pro</title>
        <link rel="canonical" href="https://www.protradee.com/manual-cabinet-software" />
        <meta name="description" content="Manual cabinet layout software with full geometric override. No auto-solver lock-in. Design custom cabinet boxes, set exact dimensions, and generate cut lists on your terms." />
      </Helmet>
      <div className="bg-slate-50 dark:bg-slate-950">
        <LandingHeader onSignIn={onSignIn} onGetStarted={onGetStarted} isDark={isDark} setIsDark={setIsDark} />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 sm:pt-28 pb-16">
          {/* Hero */}
          <div className="text-center max-w-4xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full text-sm font-bold mb-6">
              <Box size={16} /> Advanced Direct Entry Mode
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 dark:text-white mb-6 leading-tight">
              Full Control Cabinet Design — No Auto-Layout Lock-In
            </h1>
            <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-400 mb-8 max-w-3xl mx-auto">
              Veteran woodworkers and custom cabinet builders deserve complete control. 
              Set every dimension manually. Override any parameter. Your design, your rules.
            </p>
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={onGetStarted}
                className="px-8 py-4 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-lg transition-all hover:scale-105 active:scale-95 shadow-lg shadow-amber-500/20"
              >
                Start Building Free
              </button>
              <button
                onClick={onSignIn}
                className="px-8 py-4 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-lg transition-all"
              >
                Sign In
              </button>
            </div>
          </div>

          {/* Comparison Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden mb-16">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Auto Mode vs Advanced Direct Entry</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800">
                    <th className="text-left px-6 py-4 font-bold text-slate-900 dark:text-white">Feature</th>
                    <th className="text-left px-6 py-4 font-bold text-slate-500">Auto Mode (Standard)</th>
                    <th className="text-left px-6 py-4 font-bold text-amber-600 dark:text-amber-400">Advanced Direct Entry</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {[
                    ['Cabinet Dimensions', 'Auto-calculated from room size', 'Full manual override per cabinet'],
                    ['Carcass Side Thickness', 'Standard preset only', 'Any thickness, any material'],
                    ['Door Overlay Tolerance', 'Fixed values', 'Custom overlay and reveal settings'],
                    ['Drawer Box Depths', 'Predefined options', 'Any depth, any configuration'],
                    ['Back Panel Channel', 'Default channel size', 'Custom groove depth and position'],
                    ['Toe Kick Height', 'Standard 4" default', 'Any height, any offset'],
                    ['Corner Cabinet Geometry', 'Auto-generated', 'Custom angled and blind corner specs'],
                    ['Cut List Generation', 'Standard layout', 'Custom cut list with full part control'],
                  ].map(([feature, auto, manual], i) => (
                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{feature}</td>
                      <td className="px-6 py-4 text-slate-500">{auto}</td>
                      <td className="px-6 py-4 text-amber-700 dark:text-amber-300 font-medium">{manual}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Feature Highlights */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center mb-4">
                <Ruler size={24} className="text-amber-600 dark:text-amber-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Precise Dimensional Input</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm">Enter exact values for width, height, depth, and material thickness. Down to the millimeter.</p>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center mb-4">
                <Sliders size={24} className="text-amber-600 dark:text-amber-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Complete Geometric Override</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm">Override any automatic calculation. Perfect for complex blind panels and custom joinery.</p>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center mb-4">
                <Wrench size={24} className="text-amber-600 dark:text-amber-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Custom Hardware Integration</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm">Fine-tune hardware placement, hinge boring, and drawer slide mounting for any system.</p>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center mb-4">
                <Check size={24} className="text-amber-600 dark:text-amber-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">No Auto-Solver Required</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm">Work entirely in manual mode. The auto-layout is optional — you stay in complete control.</p>
            </div>
          </div>

          {/* CTA */}
          <div className="text-center bg-gradient-to-br from-slate-800 to-slate-900 dark:from-slate-900 dark:to-black rounded-3xl p-8 sm:p-12">
            <h2 className="text-2xl sm:text-3xl font-black text-white mb-4">
              Built for Cabinet Makers Who Demand Control
            </h2>
            <p className="text-slate-400 mb-8 max-w-2xl mx-auto">
              Stop fighting rigid auto-layout tools. Advanced Direct Entry Mode gives you the freedom to build exactly what your client needs.
            </p>
            <button
              onClick={onGetStarted}
              className="px-8 py-4 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-lg transition-all hover:scale-105 active:scale-95 inline-flex items-center gap-2 shadow-lg shadow-amber-500/20"
            >
              Try Advanced Mode Free <ArrowRight size={20} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
