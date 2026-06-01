import React, { useState } from 'react';
import { 
  Settings, 
  Layout, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight,
  Download,
  Receipt,
  Eye,
  ChevronRight,
  Database,
  PencilRuler
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Project, Screen } from '../types';
import { calculateProjectProgress } from '../utils/progressUtils';

interface GlobalProjectProgressProps {
  project: Project;
  onNavigate: (screen: Screen, params?: any) => void;
  isDark?: boolean;
}

export const GlobalProjectProgress: React.FC<GlobalProjectProgressProps> = ({
  project,
  onNavigate,
  isDark = false
}) => {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  const stats = calculateProjectProgress(project);
  const setupStatus = stats.setup.status;
  const designStatus = stats.walls.status;
  const exportStatus = stats.output.status;

  const nodes = [
    {
      id: 'setup',
      label: 'Setup',
      icon: Settings,
      tasks: stats.setup.tasks,
      status: setupStatus,
      count: `${stats.setup.done}/${stats.setup.total}`,
      screen: Screen.PROJECT_SETUP,
    },
    {
      id: 'design',
      label: 'Walls',
      icon: Layout,
      tasks: stats.walls.tasks,
      status: designStatus,
      count: `${stats.walls.done}/${stats.walls.total}`,
      screen: Screen.WALL_EDITOR,
    },
    {
      id: 'export',
      label: 'Output',
      icon: FileText,
      tasks: stats.output.tasks,
      status: exportStatus,
      count: `${stats.output.done}/${stats.output.total}`,
      screen: Screen.BOM_REPORT,
    }
  ];

  return (
    <div className="flex items-center gap-0">
      {nodes.map((node, index) => (
        <React.Fragment key={node.id}>
          {/* Node */}
          <div 
            className="relative"
            onMouseEnter={() => setHoveredNode(node.id)}
            onMouseLeave={() => setHoveredNode(null)}
          >
            <button
              onClick={() => onNavigate(node.screen)}
              className={`
                group relative flex items-center gap-3 px-4 py-2 rounded-2xl transition-all duration-300
                ${node.status === 'complete' 
                  ? 'bg-emerald-500/10 border-2 border-emerald-500/20 text-emerald-600' 
                  : node.status === 'in_progress'
                  ? 'bg-indigo-600/10 border-2 border-indigo-500/20 text-indigo-700'
                  : 'bg-slate-100 dark:bg-slate-800/50 border-2 border-transparent text-slate-500'
                }
                ${hoveredNode === node.id ? 'scale-105 shadow-lg' : ''}
              `}
            >
              <div className={`
                w-8 h-8 rounded-xl flex items-center justify-center transition-all
                ${node.status === 'complete' 
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' 
                  : node.status === 'in_progress'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-400'
                }
              `}>
                <node.icon size={18} className={hoveredNode === node.id ? 'animate-pulse' : ''} />
              </div>
              
              <div className="text-left hidden lg:block">
                <div className="text-[10px] font-black uppercase tracking-widest opacity-60 leading-none mb-1">{node.label}</div>
                <div className="text-xs font-black flex items-center gap-1.5 leading-none">
                  {node.count}
                  {node.status === 'complete' && <CheckCircle2 size={12} className="text-emerald-500" />}
                  {node.status === 'in_progress' && <AlertCircle size={12} className="text-indigo-600" />}
                </div>
              </div>

              {/* Popover */}
              <AnimatePresence>
                {hoveredNode === node.id && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute top-full mt-4 left-0 w-72 bg-white dark:bg-slate-900 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.6)] border-2 border-slate-100 dark:border-slate-800 p-5 z-[100] overflow-hidden"
                  >
                    {/* Header Decoration */}
                    <div className={`absolute top-0 left-0 w-full h-1 ${node.status === 'complete' ? 'bg-emerald-500' : node.status === 'in_progress' ? 'bg-indigo-600' : 'bg-slate-300'}`} />
                    
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white">{node.label} Checklist</h4>
                      <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${node.status === 'complete' ? 'bg-emerald-500/10 text-emerald-500' : node.status === 'in_progress' ? 'bg-indigo-600/10 text-indigo-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                        {Math.round((node.tasks.filter(t => t.done).length / node.tasks.length) * 100)}%
                      </span>
                    </div>

                    <div className="space-y-3">
                      {node.tasks.map((task) => (
                        <div key={task.id} className="flex items-center justify-between group/task">
                          <div className="flex items-center gap-3">
                            <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors ${task.done ? 'bg-emerald-500/20 text-emerald-500' : 'bg-slate-50 dark:bg-slate-800 text-slate-300'}`}>
                              {task.done ? <CheckCircle2 size={12} /> : <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />}
                            </div>
                            <span className={`text-[11px] font-bold ${task.done ? 'text-slate-500' : 'text-slate-900 dark:text-slate-200'}`}>
                              {task.label}
                            </span>
                          </div>
                          {!task.done && (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                onNavigate(node.screen);
                              }}
                              className="opacity-0 group-hover/task:opacity-100 transition-opacity text-indigo-600"
                            >
                              <ChevronRight size={14} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => onNavigate(node.screen)}
                      className="w-full mt-5 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 group/btn"
                    >
                      Navigate to {node.label} <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          </div>

          {/* Connector */}
          {index < nodes.length - 1 && (
            <div className="w-8 lg:w-16 h-0.5 bg-slate-100 dark:bg-slate-800 mx-1 relative overflow-hidden">
               <motion.div 
                className={`absolute inset-0 ${node.status === 'complete' ? 'bg-emerald-500' : node.status === 'in_progress' ? 'bg-indigo-600/50' : 'bg-slate-200'}`}
                initial={{ x: '-100%' }}
                animate={{ x: node.status === 'complete' ? '0%' : node.status === 'in_progress' ? '-30%' : '-100%' }}
                transition={{ duration: 0.8, ease: "easeInOut" }}
               />
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
};
