import React from 'react';
import { AreaChart } from 'lucide-react';
import { Project } from '../types';

interface WallSetupCardProps {
  project: Project;
  onClick: () => void;
}

export const WallSetupCard: React.FC<WallSetupCardProps> = ({ project, onClick }) => {
  const activeZones = project.zones.filter(z => z.active);
  const maxWallHeight = activeZones.reduce((max, z) => Math.max(max, z.wallHeight || 2400), 0);
  const totalLength = activeZones.reduce((total, z) => total + (z.totalLength || 0), 0);

  return (
    <div
      onClick={onClick}
      className="bg-white dark:bg-slate-800 rounded-2xl border-2 border-slate-200 dark:border-slate-700 p-4 cursor-pointer hover:border-amber-500 hover:shadow-lg transition-all group mb-4"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 rounded-lg bg-amber-500 text-white">
          <AreaChart size={20} />
        </div>
        <div>
          <h3 className="font-bold text-slate-900 dark:text-white">Wall Dimensions Setup</h3>
          <p className="text-xs text-slate-500">Edit room shape and walls</p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center text-sm">
          <span className="text-slate-500">Number of Walls:</span>
          <span className="font-semibold text-slate-900 dark:text-white">{activeZones.length}</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-slate-500">Max Wall Height:</span>
          <span className="font-semibold text-slate-900 dark:text-white">{maxWallHeight}mm</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-slate-500">Total Wall Length:</span>
          <span className="font-semibold text-slate-900 dark:text-white">{totalLength}mm</span>
        </div>
      </div>
      
      <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
        <p className="text-xs text-slate-500 mb-2">Active Walls:</p>
        <div className="flex flex-wrap gap-1">
          {activeZones.map(z => (
            <span
              key={z.id}
              className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs rounded"
            >
              {z.id}: {z.totalLength}mm
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
