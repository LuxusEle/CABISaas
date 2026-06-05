import React, { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Calculator, TrendingDown, Layers, FileText, ArrowRight, Check, Percent } from 'lucide-react';
import { LandingHeader } from './LandingHeader';

interface CutListGeneratorPageProps {
  onSignIn: () => void;
  onGetStarted: () => void;
  isDark: boolean;
  setIsDark: (isDark: boolean) => void;
}

export const CutListGeneratorPage: React.FC<CutListGeneratorPageProps> = ({
  onSignIn,
  onGetStarted,
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
      <div className={`bg-slate-50 dark:bg-slate-950 ${isDark ? 'lp-dark-theme' : 'lp-light-theme'}`}>
        <LandingHeader onSignIn={onSignIn} onGetStarted={onGetStarted} isDark={isDark} setIsDark={setIsDark} />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 sm:pt-28 pb-16">
          {/* Hero */}
          <div className="text-center max-w-4xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full text-sm font-bold mb-6">
              <Calculator size={16} /> Panel Optimization Engine
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 dark:text-white mb-6 leading-tight">
              Reduce Sheet Waste by Up to 30%
            </h1>
            <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-400 mb-8 max-w-3xl mx-auto">
              Automated plywood sheet nesting and cut list generation for cabinet makers. 
              Optimize panel layouts across multiple sheet sizes and material types simultaneously.
            </p>
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={onGetStarted}
                className="px-8 py-4 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-lg transition-all hover:scale-105 active:scale-95 shadow-lg shadow-amber-500/20"
              >
                Start Optimizing Free
              </button>
              <button
                onClick={onSignIn}
                className="px-8 py-4 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-lg transition-all"
              >
                Sign In
              </button>
            </div>
          </div>

          {/* Metrics */}
          <div className="grid sm:grid-cols-3 gap-6 mb-16">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm text-center">
              <div className="text-4xl font-black text-amber-500 mb-2">30%</div>
              <div className="text-sm font-bold text-slate-900 dark:text-white">Average Waste Reduction</div>
              <p className="text-xs text-slate-500 mt-1">Compared to manual layout estimation</p>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm text-center">
              <div className="text-4xl font-black text-amber-500 mb-2">500+</div>
              <div className="text-sm font-bold text-slate-900 dark:text-white">Sheet Sizes Supported</div>
              <p className="text-xs text-slate-500 mt-1">Custom dimensions and standard plywood grades</p>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm text-center">
              <div className="text-4xl font-black text-amber-500 mb-2">1-Click</div>
              <div className="text-sm font-bold text-slate-900 dark:text-white">Export Ready</div>
              <p className="text-xs text-slate-500 mt-1">Cut sheets, DXF files, and CNC-ready output</p>
            </div>
          </div>

          {/* How It Works */}
          <div className="mb-16">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white text-center mb-10">
              How the Nesting Engine Works
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mb-4 text-amber-600 dark:text-amber-400 font-black">1</div>
                <h3 className="font-bold text-slate-900 dark:text-white mb-2">Input Parts</h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm">Your cabinet design generates a complete part list — all panels, doors, and internal components.</p>
              </div>
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mb-4 text-amber-600 dark:text-amber-400 font-black">2</div>
                <h3 className="font-bold text-slate-900 dark:text-white mb-2">Select Materials</h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm">Choose sheet sizes, thicknesses, and material types. Mix and match across the same design.</p>
              </div>
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mb-4 text-amber-600 dark:text-amber-400 font-black">3</div>
                <h3 className="font-bold text-slate-900 dark:text-white mb-2">Optimize Layout</h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm">The nesting algorithm arranges parts across sheets to maximize yield and minimize scrap.</p>
              </div>
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mb-4 text-amber-600 dark:text-amber-400 font-black">4</div>
                <h3 className="font-bold text-slate-900 dark:text-white mb-2">Generate Output</h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm">Export optimized cut sheets, material cost reports, DXF, and CNC-ready nesting files.</p>
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="grid sm:grid-cols-2 gap-6 mb-16">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center shrink-0 mt-1">
                  <TrendingDown size={20} className="text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white mb-1">Multi-Sheet Optimization</h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm">Process multiple sheet thicknesses and material types in a single layout pass. The engine handles plywood, MDF, particle board, and melamine simultaneously.</p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center shrink-0 mt-1">
                  <Layers size={20} className="text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white mb-1">Grain Direction Awareness</h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm">Respect wood grain orientation for visible panels. The nesting engine intelligently aligns parts for consistent grain flow.</p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center shrink-0 mt-1">
                  <FileText size={20} className="text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white mb-1">Financial Reporting</h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm">Get a complete cost breakdown: raw sheet totals, hardware unit costs, estimated assembly time, and final quote matrix for client proposals.</p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center shrink-0 mt-1">
                  <Percent size={20} className="text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white mb-1">Waste Tracking</h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm">Every layout includes detailed scrap metrics. Track yield percentages, remnant management, and cost impact of waste across your projects.</p>
                </div>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="text-center bg-gradient-to-br from-emerald-500 to-teal-700 rounded-3xl p-8 sm:p-12">
            <h2 className="text-2xl sm:text-3xl font-black text-white mb-4">
              Start Saving on Material Costs Today
            </h2>
            <p className="text-emerald-100 mb-8 max-w-2xl mx-auto">
              Free tier includes full nesting optimization. See how much you can save on your next project.
            </p>
            <button
              onClick={onGetStarted}
              className="px-8 py-4 bg-white text-emerald-700 rounded-xl font-bold text-lg hover:bg-emerald-50 transition-all hover:scale-105 active:scale-95 inline-flex items-center gap-2"
            >
              Try the Optimizer Free <ArrowRight size={20} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
