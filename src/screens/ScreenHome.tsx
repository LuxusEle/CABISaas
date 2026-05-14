import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Layers, Zap, List, Box, Lock, Clock, ArrowUpRight, Plus, Settings2, ShieldCheck, 
  Settings, Table2, ChevronRight, MousePointer2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Project } from '../types';
import { projectService } from '../services/projectService';
import { subscriptionService } from '../services/subscriptionService';
import { calculateProjectProgress } from '../utils/progressUtils';

interface ScreenHomeProps {
  onNewProject: () => void;
  onQuickStart: () => void;
  onLoadProject: (p: Project, targetPath?: string) => void;
  logoUrl?: string;
  isUserPro: boolean;
  isDark: boolean;
}

const ScreenHome = ({ onNewProject, onQuickStart, onLoadProject, logoUrl, isUserPro, isDark }: ScreenHomeProps) => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingProjectId, setLoadingProjectId] = useState<string | null>(null);
  const [canCreate, setCanCreate] = useState(true);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cached = projectService.getCachedProjectsList();
    if (cached) {
      setProjects(cached);
      setLoading(false);
    }

    projectService.getProjectsList().then(({ data }) => {
      if (data) {
        setProjects(data);
        setLoading(false);
      }
    });

    subscriptionService.canCreateProject().then(canDo => {
      setCanCreate(canDo);
    });
  }, []);

  // Handle click outside to close menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleActionClick = async (pMetadata: any, targetPath: string) => {
    if (loadingProjectId) return;
    setLoadingProjectId(pMetadata.id);
    setActiveMenuId(null);
    try {
      const { data, error } = await projectService.getProject(pMetadata.id);
      if (error) {
        console.error(error);
      } else if (data) {
        onLoadProject(data, targetPath);
      }
    } finally {
      setLoadingProjectId(null);
    }
  };

  const handleStartNew = () => {
    if (canCreate) {
      onNewProject();
    } else {
      navigate('/pricing');
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-[#050a14] text-slate-900 dark:text-white p-6 sm:p-12 overflow-y-auto transition-colors duration-500">
      {/* Dynamic Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-amber-500/[0.03] dark:bg-amber-500/5 blur-[120px] rounded-full" />
        <div className="absolute top-[20%] -right-[10%] w-[30%] h-[30%] bg-blue-500/[0.03] dark:bg-blue-500/5 blur-[120px] rounded-full" />
      </div>

      <div className="max-w-7xl mx-auto w-full relative z-10">
        {/* Top Navigation / Branding */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-16 gap-8">
          <div className="flex flex-col items-center md:items-start gap-2">
            <img src="/landing.png" alt="CabEngine Logo" className={`h-12 w-auto object-contain transition-all ${isDark ? 'brightness-0 invert' : 'brightness-100'}`} />
            <div className="flex items-center gap-3 mt-2">
              <span className="px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full text-[10px] font-black uppercase tracking-[0.2em] text-amber-600 dark:text-amber-500">
                Engineering Suite
              </span>
              <span className="text-slate-500 dark:text-slate-400 text-xs font-medium italic">v2.4.0 • Enterprise Edition</span>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            {logoUrl && (
              <div className="h-12 w-12 bg-white dark:bg-slate-800 rounded-2xl p-2 flex items-center justify-center shadow-2xl dark:shadow-none border border-slate-100 dark:border-slate-700">
                <img src={logoUrl} alt="Company" className="h-full w-full object-contain" />
              </div>
            )}
            <div className="text-right hidden sm:block">
              <p className="text-sm font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Welcome Back</p>
              <p className="text-xs text-amber-600 dark:text-amber-500 font-bold italic">Active Session</p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-8 items-start">
          {/* Action Hub */}
          <div className="lg:col-span-4 space-y-6">
            {/* Onboarding / Quick Start Card */}
            <div className="relative group cursor-pointer" onClick={onQuickStart}>
              <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-500 to-amber-600 rounded-[2.5rem] blur opacity-10 dark:opacity-20 group-hover:opacity-30 dark:group-hover:opacity-40 transition duration-1000 group-hover:duration-200 animate-pulse"></div>
              <div className="relative bg-white dark:bg-slate-900 border border-amber-500/20 dark:border-amber-500/30 rounded-[2.5rem] p-8 overflow-hidden shadow-xl shadow-amber-500/5 dark:shadow-none">
                <div className="absolute -top-4 -right-4 w-24 h-24 bg-amber-500/5 dark:bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/10 dark:group-hover:bg-amber-500/20 transition-all" />
                
                <div className="flex items-center gap-2 mb-4">
                  <span className="px-2 py-0.5 bg-amber-500 text-white dark:text-[#050a14] text-[8px] font-black uppercase tracking-widest rounded-md shadow-lg shadow-amber-500/20">New Here?</span>
                  <div className="flex-1 h-[1px] bg-amber-500/10 dark:bg-amber-500/20" />
                </div>

                <h3 className="text-xl font-black uppercase tracking-tighter mb-2 italic text-slate-900 dark:text-white">Quick <span className="text-amber-600 dark:text-amber-500">Demo</span></h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium italic mb-6 leading-relaxed">Instantly load a professional kitchen layout and explore all engineering features.</p>
                
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-600 dark:text-amber-500 group-hover:translate-x-2 transition-transform flex items-center gap-2">
                    Launch Studio <ArrowUpRight size={14} />
                  </span>
                  <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center text-white shadow-lg shadow-amber-500/40 group-hover:scale-110 transition-all">
                    <Zap size={18} fill="currentColor" />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-8 relative overflow-hidden group shadow-lg shadow-slate-200/50 dark:shadow-none">
              <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity text-slate-900 dark:text-white">
                <Layers size={120} />
              </div>
              
              <h3 className="text-xl font-black uppercase tracking-tighter mb-2 italic text-slate-400 dark:text-slate-300">Design <span className="text-slate-300 dark:text-slate-500">Center</span></h3>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium italic mb-8 leading-relaxed">Initiate complex cabinetry layouts or continue your engineering workflow from scratch.</p>
              
              <button 
                onClick={handleStartNew}
                className={`w-full py-5 rounded-2xl font-black uppercase text-xs tracking-[0.2em] flex items-center justify-center gap-3 transition-all active:scale-95 ${
                  canCreate 
                    ? 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 hover:border-amber-500/50 dark:hover:border-amber-500/50' 
                    : 'bg-slate-100/50 dark:bg-slate-800/50 text-slate-400 dark:text-slate-600 cursor-not-allowed'
                }`}
              >
                {canCreate ? <Plus size={20} className="text-amber-600 dark:text-amber-500" /> : <Lock size={18} />}
                {canCreate ? 'Start New Project' : 'Limit Reached'}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-3xl p-5 flex flex-col items-center text-center shadow-lg shadow-slate-200/50 dark:shadow-none">
                <ShieldCheck size={24} className="text-emerald-500 mb-3" />
                <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest mb-1">PRO Status</span>
                <span className="text-xs font-bold text-slate-900 dark:text-white italic">{isUserPro ? 'Verified' : 'Free Tier'}</span>
              </div>
              <div className="bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-3xl p-5 flex flex-col items-center text-center shadow-lg shadow-slate-200/50 dark:shadow-none">
                <Settings2 size={24} className="text-blue-500 mb-3" />
                <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest mb-1">Last Sync</span>
                <span className="text-xs font-bold text-slate-900 dark:text-white italic">Real-time</span>
              </div>
            </div>
          </div>

          {/* Project Repository */}
          <div className="lg:col-span-8 bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-8 sm:p-10 min-h-[500px] relative overflow-visible group/repo shadow-xl shadow-slate-200/50 dark:shadow-none">
            {/* Clipped Background Elements */}
            <div className="absolute inset-0 overflow-hidden rounded-[2.5rem] pointer-events-none">
              <div className="absolute -bottom-20 -right-20 p-8 opacity-[0.03] dark:opacity-[0.03] group-hover/repo:opacity-[0.08] dark:group-hover/repo:opacity-[0.06] transition-opacity rotate-12 text-slate-900 dark:text-white">
                <Box size={400} />
              </div>
            </div>
            <div className="flex items-center justify-between mb-10">
              <h2 className="text-2xl font-black uppercase tracking-tight flex items-center gap-4 italic text-slate-900 dark:text-white">
                <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-600 dark:text-amber-500 border border-amber-500/20">
                  <Clock size={20} />
                </div>
                Project Repository
              </h2>
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 flex items-center gap-2">
                Total Files: <span className="text-amber-600 dark:text-amber-500">{projects.length}</span>
              </div>
            </div>

            {loading ? (
              <div className="grid sm:grid-cols-2 gap-6">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} className="h-24 bg-slate-100 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800 animate-pulse" />
                ))}
              </div>
            ) : projects.length > 0 ? (
              <div className="grid sm:grid-cols-2 gap-6">
                {projects.map(p => (
                  <div key={p.id} className="relative">
                    <button
                      onClick={() => setActiveMenuId(activeMenuId === p.id ? null : p.id)}
                      disabled={!!loadingProjectId}
                      className={`
                        group relative flex flex-col w-full p-6 rounded-3xl border transition-all text-left overflow-hidden active:scale-[0.98]
                        ${activeMenuId === p.id 
                          ? 'border-amber-500 bg-amber-500/[0.05] shadow-lg shadow-amber-500/10' 
                          : 'border-slate-100 dark:border-slate-800 bg-white/40 dark:bg-transparent hover:border-amber-500/50 hover:bg-amber-500/[0.03] dark:hover:bg-amber-500/5'
                        }
                      `}
                    >
                      <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className={`
                            w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors
                            ${activeMenuId === p.id 
                              ? 'bg-amber-500 text-white' 
                              : 'bg-slate-100 dark:bg-slate-800 group-hover:bg-amber-500 group-hover:text-white text-slate-400 dark:text-slate-500'
                            }
                          `}>
                            <Box size={16} />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <h4 className={`font-black uppercase text-sm tracking-widest transition-colors truncate ${activeMenuId === p.id ? 'text-amber-600 dark:text-amber-400' : 'text-slate-800 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400'}`}>
                              {p.name}
                            </h4>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <Clock size={10} className="text-amber-500/60 dark:text-amber-500/40" />
                              <span className="text-[9px] text-slate-500 dark:text-slate-400 uppercase font-black tracking-widest">
                                {new Date(p.updated_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                        <MousePointer2 size={16} className={`shrink-0 transition-colors ${activeMenuId === p.id ? 'text-amber-500' : 'text-slate-300 dark:text-slate-600 group-hover:text-amber-600 dark:group-hover:text-amber-500'}`} />
                      </div>

                      {/* Progress Summary */}
                      {(() => {
                        const stats = calculateProjectProgress(p as Project);
                        return (
                          <div className="flex items-center gap-3 mt-3">
                            {[
                              { label: 'S', stats: stats.setup },
                              { label: 'W', stats: stats.walls },
                              { label: 'O', stats: stats.output }
                            ].map((phase, i) => (
                              <div key={i} className="flex flex-col gap-1.5 flex-1">
                                <div className="flex items-center justify-between px-0.5">
                                  <span className="text-[7px] font-black uppercase tracking-tighter opacity-40">{phase.label}</span>
                                  <span className={`text-[8px] font-black ${phase.stats.status === 'complete' ? 'text-emerald-500' : phase.stats.status === 'in_progress' ? 'text-amber-500' : 'text-slate-300'}`}>
                                    {phase.stats.done}/{phase.stats.total}
                                  </span>
                                </div>
                                <div className="h-1 bg-slate-100 dark:bg-slate-800/50 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full transition-all duration-500 ${phase.stats.status === 'complete' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : phase.stats.status === 'in_progress' ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]' : 'bg-transparent'}`}
                                    style={{ width: `${(phase.stats.done / phase.stats.total) * 100}%` }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </button>

                    {/* Quick Action Dropdown */}
                    <AnimatePresence>
                      {activeMenuId === p.id && (
                        <div ref={menuRef} className="absolute z-50 top-[50%] left-2 right-2">
                          <motion.div 
                            initial={{ opacity: 0, y: -10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.95 }}
                            className="bg-white dark:bg-slate-900 border border-amber-500/30 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl"
                          >
                            <div className="p-2 space-y-1">
                              <button 
                                onClick={() => handleActionClick(p, '/setup')}
                                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group/item"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center text-blue-500">
                                    <Settings size={16} />
                                  </div>
                                  <div className="text-left">
                                    <p className="text-[10px] font-black uppercase text-slate-900 dark:text-white tracking-widest">Open Setup</p>
                                    <p className="text-[8px] text-slate-400 font-bold uppercase italic">General project settings</p>
                                  </div>
                                </div>
                                <ChevronRight size={14} className="text-slate-300 group-hover/item:translate-x-1 transition-transform" />
                              </button>

                              <button 
                                onClick={() => handleActionClick(p, '/walls?view=iso')}
                                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group/item"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-amber-500/10 rounded-lg flex items-center justify-center text-amber-500">
                                    <Box size={16} />
                                  </div>
                                  <div className="text-left">
                                    <p className="text-[10px] font-black uppercase text-slate-900 dark:text-white tracking-widest">3D Design Studio</p>
                                    <p className="text-[8px] text-slate-400 font-bold uppercase italic">Visual layout editor</p>
                                  </div>
                                </div>
                                <ChevronRight size={14} className="text-slate-300 group-hover/item:translate-x-1 transition-transform" />
                              </button>

                              <button 
                                onClick={() => handleActionClick(p, '/bom')}
                                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group/item"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center text-emerald-500">
                                    <Table2 size={16} />
                                  </div>
                                  <div className="text-left">
                                    <p className="text-[10px] font-black uppercase text-slate-900 dark:text-white tracking-widest">Reports & BOM</p>
                                    <p className="text-[8px] text-slate-400 font-bold uppercase italic">Production data & costs</p>
                                  </div>
                                </div>
                                <ChevronRight size={14} className="text-slate-300 group-hover/item:translate-x-1 transition-transform" />
                              </button>
                            </div>
                          </motion.div>
                        </div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-80 text-center">
                <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800/50 rounded-[2rem] flex items-center justify-center mb-6 text-slate-300 dark:text-slate-600">
                  <List size={32} />
                </div>
                <h3 className="text-lg font-black uppercase text-slate-900 dark:text-white mb-2">No Projects Detected</h3>
                <p className="text-sm text-slate-500 dark:text-slate-500 font-medium italic mb-8">Your engineering repository is currently empty.</p>
                <button onClick={handleStartNew} className="text-amber-600 dark:text-amber-500 font-black uppercase text-[10px] tracking-[0.2em] flex items-center gap-2 hover:gap-4 transition-all">
                  Create First Project <ArrowUpRight size={14} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScreenHome;
