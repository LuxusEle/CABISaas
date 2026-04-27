import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Layers, Calculator, Zap, List, Box, Lock 
} from 'lucide-react';
import { Project } from '../types';
import { Button } from '../components/Button';
import { projectService } from '../services/projectService';
import { subscriptionService } from '../services/subscriptionService';

interface ScreenHomeProps {
  onNewProject: () => void;
  onLoadProject: (p: Project) => void;
  logoUrl?: string;
  isUserPro: boolean;
}

const ScreenHome = ({ onNewProject, onLoadProject, logoUrl, isUserPro }: ScreenHomeProps) => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingProjectId, setLoadingProjectId] = useState<string | null>(null);
  const [canCreate, setCanCreate] = useState(true);

  useEffect(() => {
    // Check for cached data first for instant display
    const cached = projectService.getCachedProjectsList();
    if (cached) {
      setProjects(cached);
      setLoading(false);
    }

    // Load fresh projects in background
    projectService.getProjectsList().then(({ data }) => {
      if (data) {
        setProjects(data);
        setLoading(false);
      }
    });

    // Load subscription status in the background
    subscriptionService.canCreateProject().then(canDo => {
      setCanCreate(canDo);
    });
  }, []);

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

  const handleStartNew = () => {
    if (canCreate) {
      onNewProject();
    } else {
      navigate('/pricing');
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 items-center justify-start max-w-6xl mx-auto w-full overflow-y-auto p-4 sm:p-6">
      <div className="w-full flex justify-between items-start mb-6 sm:mb-8">
        <div className="text-center space-y-2 flex-1 flex flex-col items-center">
          <img src="/landing.png" alt="CabEngine Logo" className="h-10 sm:h-16 md:h-20 w-auto object-contain mb-2 dark:invert-0 invert" />
          <p className="text-slate-500 dark:text-slate-400 font-medium italic text-sm sm:text-base">Professional Cabinet Engineering Suite</p>
        </div>
        {logoUrl && (
          <img
            src={logoUrl}
            alt="Company Logo"
            className="h-10 sm:h-12 w-auto object-contain ml-4"
          />
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-4 sm:gap-8 w-full items-start">
        {/* Main Action Side */}
        <div className="md:col-span-1 space-y-3 sm:space-y-4">
          <Button 
            variant={canCreate ? "primary" : "secondary"} 
            size="xl" 
            onClick={handleStartNew} 
            leftIcon={canCreate ? <Layers size={24} /> : <Lock size={24} className="text-amber-500" />} 
            className={`w-full py-8 sm:py-12 text-lg sm:text-xl shadow-xl flex-col gap-2 min-h-[120px] ${!canCreate ? 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 opacity-90' : 'shadow-amber-500/20'}`}
          >
            <span>{canCreate ? 'Start New Project' : 'Project Limit Reached'}</span>
            {!canCreate && <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mt-1">Upgrade to PRO for unlimited</span>}
          </Button>
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <Button variant="secondary" size="lg" className="h-24 sm:h-28 flex-col gap-2 min-h-[96px]"><Calculator size={24} className="text-amber-600" /><span className="text-sm">Quick Parts</span></Button>
            <Button variant="secondary" size="lg" className="h-24 sm:h-28 flex-col gap-2 min-h-[96px]"><Zap size={24} className="text-amber-600" /><span className="text-sm">Area Calc</span></Button>
          </div>
        </div>

        {/* Project List Side */}
        <div className="md:col-span-2 bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm min-h-[300px] sm:min-h-[400px]">
          <h2 className="text-lg sm:text-xl font-bold mb-4 sm:mb-6 flex items-center gap-2">
            <List className="text-amber-500 w-5 h-5" /> Recent Projects
          </h2>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="flex flex-col p-3 sm:p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 animate-pulse min-h-[80px]">
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-2" />
                  <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded w-1/4 mb-3" />
                  <div className="mt-auto flex items-center justify-between">
                    <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-1/3" />
                    <div className="w-4 h-4 bg-slate-100 dark:bg-slate-800 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : projects.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {projects.map(p => (
                <button
                  key={p.id}
                  onClick={() => handleProjectClick(p)}
                  disabled={!!loadingProjectId}
                  className={`flex flex-col text-left p-3 sm:p-4 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-amber-300 dark:hover:border-amber-900 hover:bg-amber-50 dark:hover:bg-amber-900/10 transition-all group min-h-[80px] ${loadingProjectId === p.id ? 'animate-pulse bg-amber-50' : ''}`}
                >
                  <div className="font-bold text-slate-800 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 truncate mb-1 text-sm sm:text-base">
                    {p.name}
                  </div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-2">
                    Edited {new Date(p.updated_at).toLocaleDateString()}
                  </div>
                  <div className="mt-auto flex items-center justify-between">
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {loadingProjectId === p.id ? 'Loading layout...' : 'Click to open'}
                    </div>
                    <div className="text-amber-600 dark:text-amber-500">
                      {loadingProjectId === p.id ? (
                        <div className="w-3 h-3 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Box size={14} />
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 sm:h-64 text-center px-4">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 text-slate-400">
                <Layers size={24} />
              </div>
              <h3 className="font-bold text-slate-700 dark:text-slate-300 mb-1 text-base">No Projects Yet</h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">Start your first cabinet design by clicking the button.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScreenHome;
