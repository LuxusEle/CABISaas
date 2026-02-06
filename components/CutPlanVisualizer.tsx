
import React from 'react';
import { SheetLayout, ProjectSettings } from '../types';

interface Props {
  sheet: SheetLayout;
  settings: ProjectSettings;
  index: number;
}

export const CutPlanVisualizer: React.FC<Props> = ({ sheet, settings, index }) => {
  // SVG Viewport calculation
  const margin = 50;
  const viewWidth = sheet.width + margin * 2;
  const viewHeight = sheet.length + margin * 2;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden print:border-slate-300 break-inside-avoid mb-6 shadow-sm">
      <div className="bg-slate-50 dark:bg-slate-800/50 px-4 py-2 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center print:bg-slate-100">
        <span className="font-bold text-sm text-slate-700 dark:text-white">Sheet #{index + 1} - {sheet.material}</span>
        <div className="flex gap-3 text-xs font-mono text-slate-500">
          <span>{sheet.length} x {sheet.width}mm</span>
          <span className={sheet.waste < 10 ? 'text-green-600 font-bold' : 'text-amber-600'}>
            Waste: {sheet.waste}%
          </span>
        </div>
      </div>
      
      <div className="w-full overflow-x-auto p-4 flex justify-center bg-slate-100 dark:bg-slate-950 print:bg-white">
        <svg 
          viewBox={`-${margin} -${margin} ${viewWidth} ${viewHeight}`} 
          className="w-full max-w-2xl h-auto border-2 border-slate-300 dark:border-slate-700 bg-white shadow-sm"
          style={{ maxHeight: '600px' }}
        >
          {/* Board Background */}
          <rect x="0" y="0" width={sheet.width} height={sheet.length} fill="#f8fafc" stroke="none" />
          
          {/* Parts */}
          {sheet.parts.map((part, i) => (
            <g key={i}>
              <rect 
                x={part.x} 
                y={part.y} 
                width={part.width} 
                height={part.length} 
                fill="#e2e8f0" 
                stroke="#64748b" 
                strokeWidth="1"
              />
              {part.width > 100 && part.length > 100 && (
                <text 
                  x={part.x + part.width / 2} 
                  y={part.y + part.length / 2} 
                  textAnchor="middle" 
                  dominantBaseline="middle" 
                  fontSize={Math.min(part.width, part.length) / 5}
                  fill="#334155"
                  style={{ pointerEvents: 'none' }}
                >
                  {part.label.split(' ')[0]} {/* Shorten label */}
                </text>
              )}
               <text 
                  x={part.x + 5} 
                  y={part.y + 15} 
                  fontSize="20"
                  fill="#64748b"
                >
                  {Math.round(part.length)}x{Math.round(part.width)}
                </text>
            </g>
          ))}
          
          {/* Dimensions */}
          <text x={sheet.width/2} y={-10} textAnchor="middle" fontSize="30" fill="#94a3b8">{sheet.width}</text>
          <text x={-10} y={sheet.length/2} textAnchor="middle" fontSize="30" fill="#94a3b8" transform={`rotate(-90, -10, ${sheet.length/2})`}>{sheet.length}</text>
        </svg>
      </div>
    </div>
  );
};
