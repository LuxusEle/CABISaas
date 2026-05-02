import React, { useState, useEffect, useRef } from 'react';
import { X, Save, ArrowRight, MousePointer2 } from 'lucide-react';
import { Project, Zone } from '../types';
import { WallVisualizer } from './WallVisualizer';

interface WallLimitsModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  onSave: (newZones: Zone[]) => void;
  isDark?: boolean;
}

export const WallLimitsModal: React.FC<WallLimitsModalProps> = ({
  isOpen,
  onClose,
  project,
  onSave,
  isDark = true
}) => {
  const [localZones, setLocalZones] = useState<Zone[]>(project.zones);
  const [activeTab, setActiveTab] = useState<string>('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setLocalZones(JSON.parse(JSON.stringify(project.zones)).map((z: Zone) => ({
        ...z,
        startLimit: z.startLimit ?? 0,
        endLimit: z.endLimit ?? z.totalLength
      })));
      setActiveTab(project.zones[0]?.id || '');
    }
  }, [project.zones, isOpen]);

  if (!isOpen) return null;

  const currentZoneIndex = localZones.findIndex(z => z.id === activeTab);
  const currentZone = localZones[currentZoneIndex];

  const handleUpdateLimit = (type: 'start' | 'end', value: number) => {
    if (!currentZone) return;
    const newZones = [...localZones];
    const zone = { ...currentZone };
    
    if (type === 'start') {
      zone.startLimit = Math.max(0, Math.min(value, (zone.endLimit || zone.totalLength) - 300));
    } else {
      zone.endLimit = Math.max((zone.startLimit || 0) + 300, Math.min(value, zone.totalLength));
    }
    
    newZones[currentZoneIndex] = zone;
    setLocalZones(newZones);
  };

  const handleSave = () => {
    onSave(localZones);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-md">
      <div className="bg-white dark:bg-slate-900 rounded-t-[2.5rem] sm:rounded-[2rem] shadow-2xl w-full max-w-6xl h-[95vh] sm:h-[85vh] overflow-hidden flex flex-col animate-in slide-in-from-bottom duration-300 sm:zoom-in-95 sm:duration-200">
        
        {/* Header with Tabs Integrated */}
        <div className="px-6 py-4 border-b dark:border-slate-800 flex items-center justify-between shrink-0 bg-white dark:bg-slate-900 z-10">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                <MousePointer2 size={20} />
              </div>
              <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white shrink-0">
                Wall <span className="text-amber-500">Limits</span>
              </h3>
            </div>
            
            {/* Tabs integrated here */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              {localZones.map((zone) => (
                <button
                  key={zone.id}
                  onClick={() => setActiveTab(zone.id)}
                  className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
                    activeTab === zone.id 
                      ? 'bg-white dark:bg-slate-900 text-amber-500 shadow-sm' 
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {zone.id}
                </button>
              ))}
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-400"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden relative">
          {/* Tabs section removed from here */}

          {/* Visualization Area */}
          <div className="flex-1 relative bg-slate-100/50 dark:bg-slate-950/50 overflow-hidden" ref={containerRef}>
            {currentZone && (
              <div className="absolute inset-0 p-2 sm:p-4 flex flex-col">
                <div className="flex-1 relative bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden group">
                  
                  {/* The actual wall visualizer but with limits overlay */}
                  <WallVisualizer 
                    zone={{ ...currentZone, cabinets: [] }} 
                    height={currentZone.wallHeight} 
                    isStatic={true} 
                    hideArrows={true}
                    settings={project.settings}
                    editLimits={true}
                    onLimitMove={handleUpdateLimit}
                  />
                </div>

                {/* Legend / Info */}
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <div className="bg-white dark:bg-slate-900 p-2 sm:p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Offset from Left Edge</span>
                      <div className="flex items-center gap-1">
                        <input 
                          type="number"
                          value={currentZone.startLimit || 0}
                          onChange={(e) => handleUpdateLimit('start', parseInt(e.target.value) || 0)}
                          className="w-24 bg-transparent text-xl font-black text-amber-500 font-mono text-right outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none border-b-2 border-transparent focus:border-amber-500 transition-all"
                        />
                        <span className="text-xl font-black text-amber-500 font-mono">mm</span>
                      </div>
                    </div>
                    <input 
                      type="range" min="0" max={currentZone.totalLength} step="10"
                      value={currentZone.startLimit || 0}
                      onChange={(e) => handleUpdateLimit('start', parseInt(e.target.value))}
                      className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                    />
                  </div>
                  <div className="bg-white dark:bg-slate-900 p-2 sm:p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Offset from Right Edge</span>
                      <div className="flex items-center gap-1">
                        <input 
                          type="number"
                          value={currentZone.totalLength - (currentZone.endLimit || currentZone.totalLength)}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            handleUpdateLimit('end', currentZone.totalLength - val);
                          }}
                          className="w-24 bg-transparent text-xl font-black text-amber-500 font-mono text-right outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none border-b-2 border-transparent focus:border-amber-500 transition-all"
                        />
                        <span className="text-xl font-black text-amber-500 font-mono">mm</span>
                      </div>
                    </div>
                    <input 
                      type="range" min="0" max={currentZone.totalLength} step="10"
                      value={currentZone.totalLength - (currentZone.endLimit || currentZone.totalLength)}
                      onChange={(e) => handleUpdateLimit('end', currentZone.totalLength - parseInt(e.target.value))}
                      className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t dark:border-slate-800 flex justify-between items-center">
          <div className="flex items-center gap-6">
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Wall Edges</span>
              <span className="text-lg font-black text-slate-900 dark:text-white italic">Measured from Left/Right</span>
            </div>
            <div className="h-10 w-px bg-slate-200 dark:bg-slate-700" />
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Usable Area</span>
              <span className="text-lg font-black text-amber-500 font-mono">
                {currentZone ? (currentZone.endLimit || currentZone.totalLength) - (currentZone.startLimit || 0) : 0}mm
              </span>
            </div>
          </div>

          <div className="flex gap-4">
            <button 
              onClick={onClose}
              className="px-8 py-3 rounded-full border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-black uppercase tracking-widest text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
            >
              Cancel
            </button>
            <button 
              onClick={handleSave}
              className="px-12 py-4 bg-amber-500 hover:bg-amber-600 text-white font-black uppercase tracking-widest rounded-full shadow-2xl shadow-amber-500/40 text-xs transition-all flex items-center gap-2 group"
            >
              Confirm Limits <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
