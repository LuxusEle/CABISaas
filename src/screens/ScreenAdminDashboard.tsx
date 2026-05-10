import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Box, ShieldCheck, Search, Filter, ArrowLeft, RefreshCw, TrendingUp, AlertCircle, CheckCircle2, Phone, Calendar, ArrowRight, LayoutGrid, Activity } from 'lucide-react';
import { projectService } from '../services/projectService';
import { profileService, UserProfile } from '../services/profileService';
import { Button } from '../components/Button';
import { motion, AnimatePresence } from 'framer-motion';
import { Project } from '../types';

interface ScreenAdminDashboardProps {
  onLoadProject: (p: Project) => void;
}

type AdminView = 'projects' | 'users';

const ScreenAdminDashboard = ({ onLoadProject }: ScreenAdminDashboardProps) => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingProjectId, setLoadingProjectId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeView, setActiveView] = useState<AdminView>('projects');
  const [selectedUserId, setSelectedUserId] = useState<string>('all');

  const handleProjectClick = async (pMetadata: any) => {
    if (loadingProjectId) return;
    
    setLoadingProjectId(pMetadata.id);
    try {
      const { data, error } = await projectService.getProject(pMetadata.id);
      if (error) {
        alert("Failed to load project details.");
        console.error(error);
      } else if (data) {
        onLoadProject(data);
      }
    } finally {
      setLoadingProjectId(null);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    const [pResult, uResult] = await Promise.all([
      projectService.getAllProjectsAdmin(),
      profileService.getAllProfilesAdmin()
    ]);

    if (pResult.error) console.error('Error fetching admin projects:', pResult.error);
    if (pResult.data) setProjects(pResult.data);
    
    if (uResult) setProfiles(uResult);
    
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Analytics Calculations
  const stats = useMemo(() => {
    const totalUsers = profiles.length;
    const totalProjects = projects.length;
    
    const usersWithProjects = new Set(projects.map(p => p.user_id)).size;
    const conversionRate = totalUsers > 0 ? Math.round((usersWithProjects / totalUsers) * 100) : 0;
    
    const today = new Date().toISOString().split('T')[0];
    const activeToday = profiles.filter(p => p.updated_at.startsWith(today)).length;

    return {
      totalUsers,
      totalProjects,
      conversionRate,
      activeToday,
      usersWithProjects
    };
  }, [projects, profiles]);

  // Enhanced User Data
  const userData = useMemo(() => {
    return profiles.map(profile => {
      const userProjects = projects.filter(p => p.user_id === profile.id);
      return {
        ...profile,
        projectCount: userProjects.length,
        lastProjectDate: userProjects.length > 0 
          ? new Date(Math.max(...userProjects.map(p => new Date(p.updated_at).getTime())))
          : null
      };
    });
  }, [profiles, projects]);

  const filteredProjects = projects.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.owner_company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.designer.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesUser = selectedUserId === 'all' || p.user_id === selectedUserId;
    
    return matchesSearch && matchesUser;
  });

  const filteredUsers = userData.filter(u => 
    u.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.phone?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 w-full overflow-hidden">
      {/* Admin Header - Column Aligned */}
      <div className="shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex z-20">
        {/* Left Side: Matches Sidebar Width */}
        <div className="w-80 lg:w-96 shrink-0 p-6 lg:p-8 flex items-center gap-4 border-r border-slate-200 dark:border-slate-800">
          <button 
            onClick={() => navigate('/dashboard')}
            className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-amber-500 transition-all border border-slate-200 dark:border-slate-700 shadow-sm"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="truncate">
            <h1 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tighter italic truncate leading-tight">Admin <span className="text-amber-500">Analytics</span></h1>
            <p className="text-[7px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-1.5 mt-0.5">
              <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" /> Live System
            </p>
          </div>
        </div>

        {/* Right Side: Aligned with Table Area */}
        <div className="flex-1 p-6 lg:p-8 flex items-center justify-between gap-6 overflow-hidden">
          <div className="flex items-center gap-6">
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shrink-0 shadow-inner">
              <button
                onClick={() => setActiveView('projects')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeView === 'projects' ? 'bg-white dark:bg-slate-700 text-amber-500 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <LayoutGrid size={14} /> Projects
              </button>
              <button
                onClick={() => setActiveView('users')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeView === 'users' ? 'bg-white dark:bg-slate-700 text-amber-500 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <Users size={14} /> Users
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {activeView === 'projects' && (
              <UserDropdown 
                profiles={profiles} 
                selectedUserId={selectedUserId} 
                onSelect={setSelectedUserId} 
              />
            )}

            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder={activeView === 'projects' ? "Search projects..." : "Search users/companies..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 pr-6 py-3 bg-slate-100 dark:bg-slate-800 border-none rounded-2xl text-sm font-medium focus:ring-2 ring-amber-500 outline-none w-full sm:w-64 transition-all"
              />
            </div>
            <Button 
              variant="secondary" 
              size="sm" 
              onClick={fetchData}
              className="rounded-2xl h-12 w-12 p-0 flex items-center justify-center border border-slate-200 dark:border-slate-700"
            >
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content Area - Split Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Analytics Cards */}
        <aside className="w-80 lg:w-96 shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col p-6 lg:p-8">
          <div className="flex items-center justify-between mb-6 shrink-0">
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic">System Intelligence</h2>
            <Activity size={14} className="text-amber-500" />
          </div>
          
          <div className="flex-1 flex flex-col gap-4 min-h-0">
            <StatCard 
              icon={<Users size={20} />} 
              label="Total Signups" 
              value={stats.totalUsers} 
              trend="+12%"
              color="amber"
            />
            <StatCard 
              icon={<Box size={20} />} 
              label="Total Projects" 
              value={stats.totalProjects} 
              trend="+8%"
              color="blue"
            />
            <StatCard 
              icon={<TrendingUp size={20} />} 
              label="Activation Rate" 
              value={`${stats.conversionRate}%`}
              subtext={`${stats.usersWithProjects} users active`}
              color="emerald"
            />
            <StatCard 
              icon={<CheckCircle2 size={20} />} 
              label="Active Today" 
              value={stats.activeToday}
              subtext="Updated profiles"
              color="purple"
            />
          </div>

          <div className="mt-6 p-5 rounded-[2rem] bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shrink-0">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle size={14} className="text-amber-500" />
              <h3 className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest">Growth Tip</h3>
            </div>
            <p className="text-[10px] leading-relaxed text-slate-500 dark:text-slate-400 font-medium">
              Users with <span className="text-red-500 font-bold">0 projects</span> are 80% more likely to churn. Contact them today.
            </p>
          </div>
        </aside>

        {/* Right Area: Tables */}
        <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 p-6 lg:p-8">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden min-h-full">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                  {activeView === 'projects' ? (
                    <>
                      <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Project Detail</th>
                      <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Organization</th>
                      <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 text-center">Platform Progress</th>
                      <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 text-right">Synchronization</th>
                    </>
                  ) : (
                    <>
                      <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">User / Company</th>
                      <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 text-center">Status</th>
                      <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 text-center">Projects</th>
                      <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 text-right">Contact</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                <AnimatePresence mode="wait">
                  {loading ? (
                    Array(8).fill(0).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td colSpan={4} className="px-8 py-8"><div className="h-6 bg-slate-100 dark:bg-slate-800 rounded-xl w-full" /></td>
                      </tr>
                    ))
                  ) : activeView === 'projects' ? (
                    filteredProjects.length > 0 ? (
                      filteredProjects.map((p) => (
                        <motion.tr 
                          key={p.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-all group cursor-pointer ${loadingProjectId === p.id ? 'bg-amber-50 dark:bg-amber-900/10' : ''}`}
                          onClick={() => handleProjectClick(p)}
                        >
                          <td className="px-8 py-5">
                            <div className="flex flex-col">
                              <span className="font-black text-slate-900 dark:text-white uppercase tracking-tight">{p.name}</span>
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">ID: {p.id.substring(0, 8)}...</span>
                            </div>
                          </td>
                          <td className="px-8 py-5">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center text-xs font-black border border-slate-200 dark:border-slate-700">
                                {p.owner_company.substring(0, 2).toUpperCase()}
                              </div>
                              <span className="text-sm font-bold text-slate-700 dark:text-slate-300 italic">{p.owner_company}</span>
                            </div>
                          </td>
                          <td className="px-8 py-5">
                            <div className="flex items-center justify-center gap-2">
                              <ProgressDot 
                                label="Setup" 
                                active={p.settings?.completedSteps?.length > 0} 
                                complete={p.settings?.completedSteps?.length >= 8} 
                              />
                              <div className="w-4 h-px bg-slate-200 dark:bg-slate-800" />
                              <ProgressDot 
                                label="Design" 
                                active={p.zones?.some((z: any) => z.cabinets?.length > 0)} 
                                complete={p.zones?.some((z: any) => z.cabinets?.length > 0)} 
                              />
                              <div className="w-4 h-px bg-slate-200 dark:bg-slate-800" />
                              <ProgressDot 
                                label="Output" 
                                active={p.settings?.progress?.reportViewed} 
                                complete={p.settings?.progress?.quotationGenerated} 
                              />
                            </div>
                          </td>
                          <td className="px-8 py-5 text-right">
                            <div className="flex flex-col items-end">
                              <span className="text-xs font-black text-slate-900 dark:text-white">{new Date(p.updated_at).toLocaleDateString()}</span>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{new Date(p.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          </td>
                        </motion.tr>
                      ))
                    ) : <NoResults />
                  ) : (
                    filteredUsers.length > 0 ? (
                      filteredUsers.map((u) => (
                        <motion.tr 
                          key={u.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-all group"
                        >
                          <td className="px-8 py-5">
                            <div className="flex items-center gap-4">
                              <div className="relative">
                                {u.logo_url ? (
                                  <img src={u.logo_url} className="w-12 h-12 rounded-2xl object-cover border border-slate-200 dark:border-slate-700 shadow-sm" alt="Logo" />
                                ) : (
                                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center font-black text-sm italic shadow-lg shadow-amber-500/20">
                                    {u.company_name?.substring(0, 1).toUpperCase() || '?'}
                                  </div>
                                )}
                              </div>
                              <div className="flex flex-col">
                                <span className="font-black text-slate-900 dark:text-white uppercase tracking-tight">{u.company_name || 'Individual User'}</span>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">UUID: {u.id.substring(0, 8)}...</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-5 text-center">
                            {u.projectCount === 0 ? (
                              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/10 text-red-500 text-[10px] font-black uppercase tracking-widest">
                                <AlertCircle size={12} /> Needs Help
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase tracking-widest">
                                <CheckCircle2 size={12} /> Activated
                              </div>
                            )}
                          </td>
                          <td className="px-8 py-5 text-center">
                            <div className="inline-flex flex-col">
                              <span className={`text-xl font-black ${u.projectCount > 0 ? 'text-slate-900 dark:text-white' : 'text-slate-300 dark:text-slate-700'}`}>
                                {u.projectCount}
                              </span>
                              <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Projects</span>
                            </div>
                          </td>
                          <td className="px-8 py-5 text-right">
                            <div className="flex flex-col items-end gap-1">
                              <a href={`tel:${u.phone}`} className="flex items-center gap-2 text-xs font-black text-amber-500 hover:text-amber-600 transition-colors uppercase tracking-widest">
                                <Phone size={12} /> {u.phone || 'NO PHONE'}
                              </a>
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                <Calendar size={10} /> {new Date(u.updated_at).toLocaleDateString()}
                              </span>
                            </div>
                          </td>
                        </motion.tr>
                      ))
                    ) : <NoResults />
                  )}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </main>
      </div>
    </div>
  );
};

const NoResults = () => (
  <tr>
    <td colSpan={4} className="px-8 py-24 text-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-300 dark:text-slate-600">
          <Search size={40} />
        </div>
        <div>
          <p className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">No Results Found</p>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Try adjusting your search criteria</p>
        </div>
      </div>
    </td>
  </tr>
);

const StatCard = ({ icon, label, value, trend, subtext, color }: any) => {
  const themes: any = {
    amber: {
      bg: 'bg-amber-500/10',
      text: 'text-amber-500',
      glow: 'from-amber-500 to-orange-600'
    },
    blue: {
      bg: 'bg-blue-500/10',
      text: 'text-blue-500',
      glow: 'from-blue-500 to-indigo-600'
    },
    emerald: {
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-500',
      glow: 'from-emerald-500 to-teal-600'
    },
    purple: {
      bg: 'bg-purple-500/10',
      text: 'text-purple-500',
      glow: 'from-purple-500 to-pink-600'
    },
  };

  const theme = themes[color] || themes.amber;

  return (
    <div className="flex-1 bg-white dark:bg-slate-900 p-5 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-center relative overflow-hidden group hover:scale-[1.02] transition-all">
      <div className="flex items-start justify-between mb-2 relative z-10">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${theme.bg} ${theme.text}`}>
          {icon}
        </div>
        {trend && (
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-500 text-[10px] font-black">
            <TrendingUp size={10} /> {trend}
          </div>
        )}
      </div>
      <div className="relative z-10">
        <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter italic uppercase leading-none">{value}</div>
        <div className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mt-2">{label}</div>
        {subtext && <div className="text-[8px] font-bold text-slate-400 italic mt-1 line-clamp-1">{subtext}</div>}
      </div>
      
      {/* Subtle Background Glow */}
      <div className={`absolute -bottom-10 -right-10 w-24 h-24 blur-[60px] opacity-10 rounded-full bg-gradient-to-br ${theme.glow}`} />
    </div>
  );
};

const UserDropdown = ({ profiles, selectedUserId, onSelect }: { profiles: UserProfile[], selectedUserId: string, onSelect: (id: string) => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedUser = profiles.find(u => u.id === selectedUserId);
  const label = selectedUserId === 'all' ? 'All Users' : (selectedUser?.company_name || selectedUser?.phone || 'User');

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 pl-5 pr-6 py-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-300 hover:border-amber-500/50 transition-all min-w-[180px] justify-between group"
      >
        <div className="flex items-center gap-2">
          <Filter size={14} className={isOpen ? 'text-amber-500' : 'text-slate-400'} />
          <span className="truncate max-w-[120px]">{label}</span>
        </div>
        <ArrowRight size={14} className={`text-slate-500 transition-transform ${isOpen ? 'rotate-90 text-amber-500' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute top-full mt-2 left-0 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl shadow-black/50 overflow-hidden z-50 p-2"
          >
            <div className="max-h-64 overflow-y-auto custom-scrollbar">
              <button
                onClick={() => { onSelect('all'); setIsOpen(false); }}
                className={`w-full text-left px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all mb-1 flex items-center justify-between ${selectedUserId === 'all' ? 'bg-amber-500 text-white' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'}`}
              >
                All Users
                {selectedUserId === 'all' && <CheckCircle2 size={12} />}
              </button>
              
              <div className="h-px bg-slate-100 dark:bg-slate-800 my-2 mx-2" />

              {profiles.map(u => (
                <button
                  key={u.id}
                  onClick={() => { onSelect(u.id); setIsOpen(false); }}
                  className={`w-full text-left px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all mb-1 flex items-center justify-between ${selectedUserId === u.id ? 'bg-amber-500 text-white' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'}`}
                >
                  <span className="truncate mr-2">{u.company_name || u.phone || 'Anonymous'}</span>
                  {selectedUserId === u.id && <CheckCircle2 size={12} />}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #f59e0b; }
      `}</style>
    </div>
  );
};

const ProgressDot = ({ label, active, complete }: { label: string, active: boolean, complete: boolean }) => (
  <div className="flex flex-col items-center gap-1.5 group relative">
    <div className={`w-2.5 h-2.5 rounded-full transition-all duration-500 ${complete ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : active ? 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)] animate-pulse' : 'bg-slate-200 dark:bg-slate-800'}`} />
    <span className="text-[7px] font-black uppercase tracking-tighter text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-colors">{label}</span>
    
    {/* Tooltip on hover */}
    <div className="absolute bottom-full mb-2 px-2 py-1 bg-slate-900 text-white text-[8px] font-bold rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-30">
      {label}: {complete ? 'Completed' : active ? 'In Progress' : 'Not Started'}
    </div>
  </div>
);

export default ScreenAdminDashboard;
