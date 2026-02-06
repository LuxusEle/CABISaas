
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
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden print:border-slate-400 print:shadow-none break-inside-avoid mb-6 shadow-sm">
      <div className="bg-slate-50 dark:bg-slate-800/50 px-4 py-2 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center print:bg-slate-100 print:border-slate-400">
        <span className="font-bold text-sm text-slate-700 dark:text-white print:text-black">Sheet #{index + 1} - {sheet.material}</span>
        <div className="flex gap-3 text-xs font-mono text-slate-500 print:text-black">
          <span>{sheet.length} x {sheet.width}mm</span>
          <span className={sheet.waste < 10 ? 'text-green-600 font-bold' : 'text-amber-600'}>
            Waste: {sheet.waste}%
          </span>
        </div>
      </div>
      
      <div className="w-full overflow-x-auto p-4 flex justify-center bg-slate-100 dark:bg-slate-950 print:bg-white">
        <svg 
          viewBox={`-${margin} -${margin} ${viewWidth} ${viewHeight}`} 
          className="w-full max-w-2xl h-auto border-2 border-slate-300 dark:border-slate-700 bg-white shadow-sm print:border-2 print:border-black print:shadow-none"
          style={{ maxHeight: '600px' }}
        >
          {/* Board Background */}
          <rect x="0" y="0" width={sheet.width} height={sheet.length} fill="#f8fafc" stroke="none" className="print:fill-white" />
          
          {/* Parts */}
          {sheet.parts.map((part, i) => {
             const [partName, cabRef] = part.label.split(' (');
             const cabinetName = cabRef ? cabRef.replace(')', '') : '';
             const minDim = Math.min(part.width, part.length);
             // Dynamic font size based on part size
             const fontSize = Math.max(12, minDim / 6);
             const showText = part.width > 100 && part.length > 100;

             return (
              <g key={i}>
                <rect 
                  x={part.x} 
                  y={part.y} 
                  width={part.width} 
                  height={part.length} 
                  fill="#e2e8f0" 
                  stroke="#334155" 
                  strokeWidth="1"
                  className="print:fill-slate-100 print:stroke-black"
                />
                {showText && (
                  <g style={{ pointerEvents: 'none' }}>
                    <text 
                      x={part.x + part.width / 2} 
                      y={part.y + part.length / 2 - fontSize * 0.6} 
                      textAnchor="middle" 
                      fontSize={fontSize}
                      fill="#0f172a"
                      fontWeight="bold"
                      className="print:fill-black"
                    >
                      {partName}
                    </text>
                    <text 
                      x={part.x + part.width / 2} 
                      y={part.y + part.length / 2 + fontSize * 0.6} 
                      textAnchor="middle" 
                      fontSize={fontSize * 0.7}
                      fill="#475569"
                      className="print:fill-black"
                    >
                      {cabinetName}
                    </text>
                  </g>
                )}
                 <text 
                    x={part.x + 5} 
                    y={part.y + 15} 
                    fontSize="16"
                    fill="#64748b"
                    className="print:fill-slate-500"
                  >
                    {Math.round(part.length)}x{Math.round(part.width)}
                  </text>
              </g>
             );
          })}
          
          {/* Dimensions */}
          <text x={sheet.width/2} y={-15} textAnchor="middle" fontSize="30" fill="#94a3b8" className="print:fill-black font-mono">{sheet.width}</text>
          <text x={-15} y={sheet.length/2} textAnchor="middle" fontSize="30" fill="#94a3b8" transform={`rotate(-90, -15, ${sheet.length/2})`} className="print:fill-black font-mono">{sheet.length}</text>
        </svg>
      </div>
    </div>
  );
};
