import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, Box, Trash2, ExternalLink, ShieldCheck, Search, Filter, 
  ArrowLeft, Download, RefreshCw
} from 'lucide-react';
import { projectService } from '../services/projectService';
import { Button } from '../components/Button';
import { motion, AnimatePresence } from 'framer-motion';
import { Project } from '../types';

interface ScreenAdminDashboardProps {
  onLoadProject: (p: Project) => void;
}

const ScreenAdminDashboard = ({ onLoadProject }: ScreenAdminDashboardProps) => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingProjectId, setLoadingProjectId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

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

  const fetchProjects = async () => {
    setLoading(true);
    const { data, error } = await projectService.getAllProjectsAdmin();
    if (error) {
      console.error('Error fetching admin projects:', error);
      alert('Failed to load projects. Ensure RLS policies are updated.');
    } else if (data) {
      setProjects(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.owner_company.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.designer.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 max-w-7xl mx-auto w-full overflow-hidden">
      {/* Admin Header */}
      <div className="shrink-0 p-6 sm:p-8 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/dashboard')}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-amber-500 transition-all"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="text-amber-500" size={24} />
              <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Admin Console</h1>
            </div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Global Project Management</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Search all projects..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-sm focus:ring-2 ring-amber-500 outline-none w-full sm:w-64 transition-all"
            />
          </div>
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={fetchProjects}
            className="rounded-xl aspect-square p-2"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </Button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 sm:p-8 shrink-0 bg-slate-100/50 dark:bg-slate-900/30">
        <StatCard icon={<Box size={20} />} label="Total Projects" value={projects.length} />
        <StatCard icon={<Users size={20} />} label="Active Companies" value={new Set(projects.map(p => p.owner_company)).size} />
        <StatCard icon={<Download size={20} />} label="Recent Exports" value="--" />
        <StatCard icon={<Filter size={20} />} label="In Progress" value="--" />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6 sm:p-8">
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Project Name</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Owner / Company</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Designer</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Last Modified</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              <AnimatePresence>
                {loading ? (
                  Array(5).fill(0).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={5} className="px-6 py-8"><div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-full" /></td>
                    </tr>
                  ))
                ) : filteredProjects.length > 0 ? (
                  filteredProjects.map((p) => (
                    <motion.tr 
                      key={p.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group cursor-pointer ${loadingProjectId === p.id ? 'animate-pulse bg-amber-50 dark:bg-amber-900/10' : ''}`}
                      onClick={() => handleProjectClick(p)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 dark:text-white truncate max-w-[200px]">{p.name}</span>
                          <span className="text-[9px] font-bold text-slate-400 truncate opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-tighter">{p.id}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center text-[10px] font-black">
                            {p.owner_company.substring(0, 2).toUpperCase()}
                          </div>
                          <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{p.owner_company}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{p.designer || '-'}</td>
                      <td className="px-6 py-4 text-xs font-bold text-slate-400 text-right">
                        {new Date(p.updated_at).toLocaleDateString()} at {new Date(p.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </motion.tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <Search className="text-slate-300" size={48} />
                        <p className="text-slate-400 font-bold uppercase tracking-widest">No matching projects found</p>
                      </div>
                    </td>
                  </tr>
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ icon, label, value }: any) => (
  <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
    <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
      {icon}
    </div>
    <div>
      <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{value}</div>
      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</div>
    </div>
  </div>
);

export default ScreenAdminDashboard;
