import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Box, ShieldCheck, Search, Filter, ArrowLeft, RefreshCw, TrendingUp, AlertCircle, CheckCircle2, Phone, Calendar, ArrowRight, LayoutGrid, Activity, ExternalLink, Download } from 'lucide-react';
import { projectService } from '../services/projectService';
import { profileService, UserProfile } from '../services/profileService';
import { Button } from '../components/Button';
import { motion, AnimatePresence } from 'framer-motion';
import { Project, Screen } from '../types';
import { feedbackService, Feedback } from '../services/feedbackService';

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
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [selectedUserFeedback, setSelectedUserFeedback] = useState<Feedback[]>([]);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<any>(null);

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

  const handleUpdateFeedbackStatus = async (id: string, newStatus: any) => {
    const success = await feedbackService.updateFeedbackStatus(id, newStatus);
    if (success) {
      // Refresh feedback data
      const feedData = await feedbackService.getAllFeedbackAdmin();
      setFeedback(feedData);
      
      // Update the local selected feedback list if modal is open
      setSelectedUserFeedback(prev => 
        prev.map(f => f.id === id ? { ...f, status: newStatus } : f)
      );
    }
  };

  const fetchData = async () => {
    setLoading(true);
    const [pResult, uResult, fResult] = await Promise.all([
      projectService.getAllProjectsAdmin(),
      profileService.getAllProfilesAdmin(),
      feedbackService.getAllFeedbackAdmin()
    ]);

    if (pResult.error) console.error('Error fetching admin projects:', pResult.error);
    if (pResult.data) setProjects(pResult.data);
    
    if (uResult) setProfiles(uResult);
    if (fResult) setFeedback(fResult);
    
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
      const userFeedback = feedback.filter(f => f.user_id === profile.id);
      return {
        ...profile,
        projectCount: userProjects.length,
        feedback: userFeedback,
        hasPendingFeedback: userFeedback.some(f => f.status === 'new'),
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
                onClick={() => {
                  setActiveView('projects');
                  setSelectedProfile(null);
                }}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeView === 'projects' && !selectedProfile ? 'bg-white dark:bg-slate-700 text-amber-500 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <LayoutGrid size={14} /> Projects
              </button>
              <button
                onClick={() => {
                  setActiveView('users');
                  setSelectedProfile(null);
                }}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeView === 'users' && !selectedProfile ? 'bg-white dark:bg-slate-700 text-amber-500 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <Users size={14} /> Users
                {feedback.some(f => f.status === 'new') && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 border-2 border-white dark:border-slate-800 rounded-full animate-bounce" />
                )}
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
        {/* Left Sidebar: Analytics OR User List */}
        <aside className="w-80 lg:w-96 shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col p-6 lg:p-8">
          <AnimatePresence mode="wait">
            {!selectedProfile ? (
              <motion.div 
                key="stats"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex-1 flex flex-col h-full"
              >
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
              </motion.div>
            ) : (
              <motion.div 
                key="user-list"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex-1 flex flex-col h-full"
              >
                <div className="flex items-center justify-between mb-6 shrink-0">
                  <button 
                    onClick={() => setSelectedProfile(null)}
                    className="text-[10px] font-black text-amber-500 uppercase tracking-[0.2em] flex items-center gap-2 hover:translate-x-[-4px] transition-transform"
                  >
                    <ArrowLeft size={14} /> Back to Stats
                  </button>
                  <Activity size={14} className="text-amber-500" />
                </div>

                <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-4 italic">Support <span className="text-amber-500">Inbox</span></h2>
                
                <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-2">
                  {userData.map(u => (
                    <button
                      key={u.id}
                      onClick={() => {
                        setSelectedProfile(u);
                        setSelectedUserFeedback(u.feedback);
                      }}
                      className={`w-full p-4 rounded-2xl border transition-all text-left group relative flex items-center gap-4 ${
                        selectedProfile.id === u.id 
                          ? 'bg-amber-500/10 border-amber-500/30' 
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-amber-500/50'
                      }`}
                    >
                      {/* Selection Indicator Bar */}
                      {selectedProfile.id === u.id && (
                        <div className="absolute left-0 top-4 bottom-4 w-1 bg-amber-500 rounded-r-full shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
                      )}

                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 transition-colors ${
                        selectedProfile.id === u.id 
                          ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' 
                          : 'bg-slate-100 dark:bg-slate-900 text-slate-500'
                      }`}>
                        {u.company_name?.substring(0, 1).toUpperCase() || '?'}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className={`text-[10px] font-black uppercase tracking-tight truncate transition-colors ${
                          selectedProfile.id === u.id ? 'text-amber-500' : 'text-slate-900 dark:text-white'
                        }`}>
                          {u.company_name || 'Individual'}
                        </div>
                        <div className="text-[8px] font-bold uppercase tracking-widest mt-1 text-slate-400">
                          {u.feedback.length > 0 ? `${u.feedback.length} Messages` : 'No Messages'}
                        </div>
                      </div>

                      {u.hasPendingFeedback && (
                        <div className="w-2 h-2 rounded-full animate-pulse bg-red-500 shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </aside>

        {/* Right Area: Tables OR Feedback Details */}
        <main className="flex-1 overflow-hidden bg-slate-50 dark:bg-slate-950 relative">
          <AnimatePresence mode="wait">
            {!selectedProfile ? (
              <motion.div 
                key="tables"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="h-full p-6 lg:p-8 overflow-y-auto"
              >
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
                      {/* ... rows content ... */}
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
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-all group cursor-pointer"
                          onClick={() => {
                            if (u.feedback.length > 0) {
                              setSelectedUserFeedback(u.feedback);
                              setSelectedProfile(u);
                              setIsFeedbackModalOpen(true);
                            }
                          }}
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
                                
                                {/* Feedback Indicator Dots */}
                                {u.hasPendingFeedback && (
                                  <div className="absolute -top-1 -right-1 flex -space-x-1">
                                    {Array.from(new Set(u.feedback.filter((f: any) => f.status === 'new').map((f: any) => f.type))).map((type: any) => (
                                      <div 
                                        key={type}
                                        className={`w-3 h-3 rounded-full border border-white dark:border-slate-900 ${
                                          type === 'bug_report' ? 'bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.5)]' : 
                                          type === 'complaint' ? 'bg-orange-500 shadow-[0_0_5px_rgba(249,115,22,0.5)]' : 
                                          type === 'feature_request' ? 'bg-blue-500 shadow-[0_0_5px_rgba(59,130,246,0.5)]' : 
                                          'bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]'
                                        }`}
                                      />
                                    ))}
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
        </motion.div>
      ) : (
        <motion.div 
          key="feedback-detail"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          className="h-full flex flex-col bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800"
        >
          {/* Detailed Conversation View */}
          <div className="flex-1 overflow-y-auto p-12 space-y-12 custom-scrollbar">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center justify-between mb-12">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 rounded-[2rem] bg-amber-500 flex items-center justify-center text-white font-black italic shadow-2xl shadow-amber-500/20 text-2xl">
                    {selectedProfile.company_name?.substring(0, 1).toUpperCase() || '?'}
                  </div>
                  <div>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic">{selectedProfile.company_name || 'Individual User'}</h2>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">User ID: {selectedProfile.id}</span>
                      <div className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                      <a href={`tel:${selectedProfile.phone}`} className="text-[10px] font-black text-amber-500 uppercase tracking-[0.2em] hover:underline">Contact: {selectedProfile.phone}</a>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedProfile(null)}
                  className="p-4 rounded-3xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-amber-500 transition-all border border-slate-200 dark:border-slate-700"
                >
                  <RefreshCw className="rotate-45" size={24} />
                </button>
              </div>

              <div className="space-y-12">
                {selectedUserFeedback.length > 0 ? (
                  selectedUserFeedback.map((item: Feedback) => (
                    <div key={item.id} className="relative pl-12 border-l-2 border-slate-100 dark:border-slate-800 pb-12 last:pb-0">
                      {/* Time Dot */}
                      <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-4 border-white dark:border-slate-900 ${
                        item.status === 'new' ? 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]'
                      }`} />
                      
                      <div className="bg-slate-50 dark:bg-slate-800/50 p-10 rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all">
                        <div className="flex items-center justify-between mb-8">
                          <div className="flex items-center gap-4">
                            <span className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest ${
                              item.type === 'bug_report' ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' :
                              item.type === 'complaint' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' :
                              item.type === 'feature_request' ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' :
                              'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                            }`}>
                              {item.type.replace('_', ' ')}
                            </span>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">
                              Reported on {new Date(item.created_at || '').toLocaleString()}
                            </span>
                          </div>

                          <select 
                            value={item.status}
                            onChange={(e) => handleUpdateFeedbackStatus(item.id!, e.target.value)}
                            className={`text-xs font-black uppercase tracking-widest bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 outline-none focus:ring-2 ring-amber-500 cursor-pointer shadow-sm ${
                              item.status === 'new' ? 'text-red-500' :
                              item.status === 'in_progress' ? 'text-amber-500' :
                              'text-emerald-500'
                            }`}
                          >
                            <option value="new">New Entry</option>
                            <option value="in_progress">Investigation</option>
                            <option value="resolved">Resolved</option>
                            <option value="closed">Closed / Archive</option>
                          </select>
                        </div>

                        <p className="text-xl text-slate-700 dark:text-slate-300 font-medium leading-relaxed mb-10 italic">
                          "{item.message}"
                        </p>

                        {/* Large Images Section */}
                        {(item.screenshot_url || item.attachment_url) && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-10">
                            {item.screenshot_url && (
                              <div className="space-y-3">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Attached Screenshot</span>
                                <a href={item.screenshot_url} target="_blank" rel="noopener noreferrer" className="block relative group/img overflow-hidden rounded-[2rem] border-4 border-white dark:border-slate-800 shadow-2xl">
                                  <img 
                                    src={item.screenshot_url} 
                                    className="w-full aspect-video object-cover group-hover:scale-105 transition-transform duration-700" 
                                    alt="Screenshot" 
                                  />
                                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity">
                                    <div className="px-6 py-3 bg-white text-slate-900 rounded-full font-black uppercase text-xs tracking-widest flex items-center gap-2">
                                      <ExternalLink size={16} /> Enlarge View
                                    </div>
                                  </div>
                                </a>
                              </div>
                            )}
                            {item.attachment_url && (
                              <div className="space-y-3">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Support Document</span>
                                <a 
                                  href={item.attachment_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="flex flex-col items-center justify-center h-full aspect-video bg-white dark:bg-slate-900 rounded-[2rem] border-4 border-dashed border-slate-200 dark:border-slate-800 hover:border-amber-500 transition-all group/file p-8 text-center"
                                >
                                  <div className="w-16 h-16 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-500 group-hover/file:bg-amber-500 group-hover/file:text-white transition-all mb-4">
                                    <Download size={28} />
                                  </div>
                                  <span className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white mb-1">Attached File</span>
                                  <span className="text-[10px] font-bold text-slate-400 uppercase">Click to Download</span>
                                </a>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-32 opacity-50">
                    <div className="w-24 h-24 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-300 dark:text-slate-600 mb-6">
                      <AlertCircle size={48} />
                    </div>
                    <p className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic">No Feedback Recorded</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">This user hasn't submitted any support requests yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
        )}
      </AnimatePresence>
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

const FeedbackViewer = ({ profile, feedback, isOpen, onClose, onUpdateStatus }: any) => {
  if (!profile) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
          >
            {/* Modal Header */}
            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500 flex items-center justify-center text-white font-black italic shadow-lg shadow-amber-500/20 text-lg">
                  {profile.company_name?.substring(0, 1).toUpperCase() || '?'}
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">User Feedback</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{profile.company_name || 'Individual User'}</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-500">
                <RefreshCw className="rotate-45" size={24} />
              </button>
            </div>

            {/* Feedback List */}
            <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
              {feedback.map((item: Feedback) => (
                <div key={item.id} className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 relative group">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                        item.type === 'bug_report' ? 'bg-red-500/10 text-red-500' :
                        item.type === 'complaint' ? 'bg-orange-500/10 text-orange-500' :
                        item.type === 'feature_request' ? 'bg-blue-500/10 text-blue-500' :
                        'bg-emerald-500/10 text-emerald-500'
                      }`}>
                        {item.type.replace('_', ' ')}
                      </span>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                        {new Date(item.created_at || '').toLocaleDateString()}
                      </span>
                    </div>
                    
                    {/* Status Select */}
                    <select 
                      value={item.status}
                      onChange={(e) => onUpdateStatus(item.id, e.target.value)}
                      className={`text-[9px] font-black uppercase tracking-widest bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 outline-none focus:ring-1 ring-amber-500 cursor-pointer ${
                        item.status === 'new' ? 'text-red-500' :
                        item.status === 'in_progress' ? 'text-amber-500' :
                        'text-emerald-500'
                      }`}
                    >
                      <option value="new">New</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>

                  <p className="text-sm text-slate-700 dark:text-slate-300 font-medium leading-relaxed mb-4">
                    {item.message}
                  </p>

                  {/* Attachments Section */}
                  <div className="flex flex-wrap gap-4 mt-4">
                    {item.screenshot_url && (
                      <a href={item.screenshot_url} target="_blank" rel="noopener noreferrer" className="group/img relative">
                        <img 
                          src={item.screenshot_url} 
                          className="w-32 h-20 object-cover rounded-xl border border-slate-200 dark:border-slate-700 hover:opacity-75 transition-all" 
                          alt="Screenshot" 
                        />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity">
                          <ExternalLink size={20} className="text-white" />
                        </div>
                      </a>
                    )}
                    {item.attachment_url && (
                      <a 
                        href={item.attachment_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 px-4 py-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-amber-500/50 transition-all group/file"
                      >
                        <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 group-hover/file:text-amber-500">
                          <Download size={14} />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">View File</span>
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <Button onClick={onClose} variant="secondary" size="sm" className="rounded-2xl px-8 font-black uppercase tracking-widest italic">
                Close Viewer
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ScreenAdminDashboard;
