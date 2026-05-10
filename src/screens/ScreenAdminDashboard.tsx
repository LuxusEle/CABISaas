import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, Box, Trash2, ExternalLink, ShieldCheck, Search, Filter, 
  ArrowLeft, Download, RefreshCw, TrendingUp, AlertCircle, CheckCircle2,
  Phone, Calendar, ArrowRight, LayoutGrid, List
} from 'lucide-react';
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

  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.owner_company.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.designer.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredUsers = userData.filter(u => 
    u.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.phone?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 max-w-7xl mx-auto w-full overflow-hidden">
      {/* Admin Header */}
      <div className="shrink-0 p-6 sm:p-8 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/dashboard')}
            className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-amber-500 transition-all border border-slate-200 dark:border-slate-700"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="text-amber-500" size={28} />
              <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic">Admin <span className="text-amber-500">Analytics</span></h1>
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Live Infrastructure Monitoring
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* View Toggle */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setActiveView('projects')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeView === 'projects' ? 'bg-white dark:bg-slate-700 text-amber-500 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <LayoutGrid size={14} /> Projects
            </button>
            <button
              onClick={() => setActiveView('users')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeView === 'users' ? 'bg-white dark:bg-slate-700 text-amber-500 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Users size={14} /> Users
            </button>
          </div>

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

      {/* Modern Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-6 sm:p-8 shrink-0 bg-slate-100/50 dark:bg-slate-900/30">
        <StatCard 
          icon={<Users size={24} />} 
          label="Total Signups" 
          value={stats.totalUsers} 
          trend="+12%"
          color="amber"
        />
        <StatCard 
          icon={<Box size={24} />} 
          label="Total Projects" 
          value={stats.totalProjects} 
          trend="+8%"
          color="blue"
        />
        <StatCard 
          icon={<TrendingUp size={24} />} 
          label="Activation Rate" 
          value={`${stats.conversionRate}%`}
          subtext={`${stats.usersWithProjects} users active`}
          color="emerald"
        />
        <StatCard 
          icon={<CheckCircle2 size={24} />} 
          label="Active Today" 
          value={stats.activeToday}
          subtext="Updated profiles"
          color="purple"
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6 sm:p-8 pt-0">
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                {activeView === 'projects' ? (
                  <>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Project Detail</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Organization</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Designer</th>
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
                  Array(6).fill(0).map((_, i) => (
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
                        <td className="px-8 py-5 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{p.designer || 'SYSTEM'}</td>
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
                              {u.projectCount > 0 && (
                                <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full" />
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
  const colorMap: any = {
    amber: 'from-amber-500 to-orange-600 shadow-amber-500/20 text-amber-500',
    blue: 'from-blue-500 to-indigo-600 shadow-blue-500/20 text-blue-500',
    emerald: 'from-emerald-500 to-teal-600 shadow-emerald-500/20 text-emerald-500',
    purple: 'from-purple-500 to-pink-600 shadow-purple-500/20 text-purple-500',
  };

  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between relative overflow-hidden group hover:scale-[1.02] transition-all">
      <div className="flex items-start justify-between mb-4 relative z-10">
        <div className={`w-12 h-12 rounded-2xl bg-opacity-10 flex items-center justify-center ${colorMap[color].split(' ')[2]} bg-current`}>
          {icon}
        </div>
        {trend && (
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-500 text-[10px] font-black">
            <TrendingUp size={10} /> {trend}
          </div>
        )}
      </div>
      <div className="relative z-10">
        <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter italic uppercase">{value}</div>
        <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">{label}</div>
        {subtext && <div className="text-[9px] font-bold text-slate-400 italic mt-2">{subtext}</div>}
      </div>
      
      {/* Subtle Background Glow */}
      <div className={`absolute -bottom-10 -right-10 w-24 h-24 blur-[60px] opacity-20 rounded-full bg-gradient-to-br ${colorMap[color].split(' ')[0]} ${colorMap[color].split(' ')[1]}`} />
    </div>
  );
};

export default ScreenAdminDashboard;
