
import React, { useState } from 'react';
import { SheetLayout, ProjectSettings } from '../types';

interface Props {
  sheet: SheetLayout;
  settings: ProjectSettings;
  index: number;
}

export const CutPlanVisualizer: React.FC<Props> = ({ sheet, settings, index }) => {
  const [selectedPart, setSelectedPart] = useState<number | null>(null);
  const kerf = settings.kerf || 4;
  
  // VERTICAL sheet orientation: 1220mm wide x 2440mm tall (4' x 8')
  const sheetWidth = 1220;
  const sheetHeight = 2440;
  
  // Scale to fit display - larger scale for better visibility
  const scale = 0.25;
  const displayWidth = sheetWidth * scale;
  const displayHeight = sheetHeight * scale;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden print:border-slate-400 print:shadow-none break-inside-avoid mb-4 shadow-sm">
      <div className="bg-slate-50 dark:bg-slate-800/50 px-3 py-2 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center print:bg-slate-100 print:border-slate-400">
        <span className="font-bold text-sm text-slate-700 dark:text-white print:text-black">Sheet #{index + 1} - {sheet.material}</span>
        <div className="flex gap-2 text-xs font-mono text-slate-500 print:text-black">
          <span>{sheetWidth} x {sheetHeight}mm</span>
          <span className={sheet.waste < 10 ? 'text-green-600 font-bold' : 'text-amber-600'}>
            Waste: {sheet.waste}%
          </span>
        </div>
      </div>
      
      <div className="w-full flex justify-center bg-slate-100 dark:bg-slate-950 print:bg-white p-1">
        <svg 
          viewBox={`0 0 ${sheetWidth} ${sheetHeight}`} 
          className="border border-slate-400 dark:border-slate-600 bg-white print:border-black"
          style={{ width: `${displayWidth}px`, height: `${displayHeight}px`, maxWidth: '100%' }}
        >
          {/* Sheet Background */}
          <rect x="0" y="0" width={sheetWidth} height={sheetHeight} fill="#ffffff" stroke="#64748b" strokeWidth="3" className="print:fill-white print:stroke-black" />
          
          {/* Kerf lines between parts */}
          {sheet.parts.map((part, i) => (
            <g key={`kerf-${i}`}>
              <rect x={part.x + part.width} y={part.y} width={kerf} height={part.length} fill="#f8fafc" />
              <rect x={part.x} y={part.y + part.length} width={part.width + kerf} height={kerf} fill="#f8fafc" />
            </g>
          ))}
          
          {/* Parts */}
          {sheet.parts.map((part, i) => {
             const [partName, cabRef] = part.label.split(' (');
             const cabinetName = cabRef ? cabRef.replace(')', '') : '';
             const isLongSideVertical = part.length > part.width;
             const minDim = Math.min(part.width, part.length);
             
             // Larger font size for readability
             const fontSize = Math.min(50, Math.max(20, minDim / 5));
             const showText = part.width > 100 && part.length > 100;
             const isSelected = selectedPart === i;

             return (
              <g 
                key={i} 
                className="cursor-pointer hover:opacity-90"
                onClick={() => setSelectedPart(isSelected ? null : i)}
              >
                <rect 
                  x={part.x} 
                  y={part.y} 
                  width={part.width} 
                  height={part.length} 
                  fill={isSelected ? '#fef3c7' : '#f1f5f9'} 
                  stroke={isSelected ? '#f59e0b' : '#475569'} 
                  strokeWidth={isSelected ? "4" : "2"}
                  className="print:fill-slate-100 print:stroke-black"
                />
                {showText && (
                  <g style={{ pointerEvents: 'none' }}>
                    {/* Part name - parallel to grain */}
                    <text 
                      x={part.x + part.width / 2} 
                      y={part.y + part.length / 2 - (isLongSideVertical ? 0 : 8)} 
                      textAnchor="middle" 
                      fontSize={fontSize}
                      fill="#0f172a"
                      fontWeight="bold"
                      className="print:fill-black"
                      transform={isLongSideVertical ? 
                        `rotate(-90, ${part.x + part.width / 2}, ${part.y + part.length / 2})` : 
                        ''}
                    >
                      {partName}
                    </text>
                    {/* Cabinet reference */}
                    <text 
                      x={part.x + part.width / 2} 
                      y={part.y + part.length / 2 + (isLongSideVertical ? 0 : fontSize * 0.8)} 
                      textAnchor="middle" 
                      fontSize={fontSize * 0.7}
                      fill="#475569"
                      className="print:fill-black"
                      transform={isLongSideVertical ? 
                        `rotate(-90, ${part.x + part.width / 2}, ${part.y + part.length / 2})` : 
                        ''}
                    >
                      {cabinetName}
                    </text>
                  </g>
                )}
                {/* Dimensions in corner */}
                <text 
                  x={part.x + 10} 
                  y={part.y + 28} 
                  fontSize="24"
                  fill="#64748b"
                  className="print:fill-slate-600 font-mono"
                  fontWeight="bold"
                >
                  {Math.round(part.length)}×{Math.round(part.width)}
                </text>
              </g>
             );
          })}
          
          {/* Sheet border dimensions */}
          <text x={sheetWidth/2} y={30} textAnchor="middle" fontSize="28" fill="#64748b" className="print:fill-black font-mono font-bold">{sheetWidth}</text>
          <text x={30} y={sheetHeight/2} textAnchor="middle" fontSize="28" fill="#64748b" transform={`rotate(-90, 30, ${sheetHeight/2})`} className="print:fill-black font-mono font-bold">{sheetHeight}</text>
          
          {/* Grain direction indicator */}
          <g transform={`translate(${sheetWidth - 100}, 50)`}>
            <line x1="0" y1="0" x2="0" y2="50" stroke="#94a3b8" strokeWidth="3" markerEnd="url(#arrowhead-${index})" />
            <text x="15" y="30" fontSize="18" fill="#64748b" className="print:fill-black font-bold">GRAIN</text>
          </g>
          
          <defs>
            <marker id={`arrowhead-${index}`} markerWidth="12" markerHeight="9" refX="11" refY="4.5" orient="auto">
              <polygon points="0 0, 12 4.5, 0 9" fill="#64748b" />
            </marker>
          </defs>
        </svg>
      </div>
      
      {/* Selected Part Detail Modal */}
      {selectedPart !== null && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedPart(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-4">Part Details</h3>
            {(() => {
              const part = sheet.parts[selectedPart];
              const [partName, cabRef] = part.label.split(' (');
              return (
                <div className="space-y-2">
                  <p><span className="font-semibold">Part:</span> {partName}</p>
                  <p><span className="font-semibold">Cabinet:</span> {cabRef?.replace(')', '')}</p>
                  <p><span className="font-semibold">Dimensions:</span> {Math.round(part.length)} × {Math.round(part.width)} mm</p>
                  <p><span className="font-semibold">Position:</span> X:{Math.round(part.x)}, Y:{Math.round(part.y)}</p>
                  <p><span className="font-semibold">Grain:</span> Along length ({part.length > part.width ? 'vertical' : 'horizontal'})</p>
                </div>
              );
            })()}
            <button 
              className="mt-4 w-full bg-amber-500 text-white py-2 rounded-lg font-bold hover:bg-amber-600"
              onClick={() => setSelectedPart(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
