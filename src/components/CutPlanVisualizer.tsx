
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
  const sheetWidth = sheet.width || 1220;
  const sheetHeight = sheet.length || 2440;
  
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
          className="border border-slate-400 dark:border-slate-600 bg-white print:border-black print:w-full print:h-auto"
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
             const [cabName, partName] = part.label.split('|');
             const isLongSideVertical = part.length > part.width;
             const minDim = Math.min(part.width, part.length);
             const maxDim = Math.max(part.width, part.length);
             
             // Adaptive font size: scale based on part size but keep it within readable limits
             const fontSize = Math.min(maxDim / 10, minDim / 4, 45);
             const showText = maxDim > 120 && minDim > 60;
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
                  <text 
                    x={part.x + part.width / 2} 
                    y={part.y + part.length / 2} 
                    textAnchor="middle" 
                    dominantBaseline="middle"
                    fontSize={fontSize}
                    fill="#0f172a"
                    fontWeight="bold"
                    className="print:fill-black select-none"
                    transform={isLongSideVertical ? 
                      `rotate(-90, ${part.x + part.width / 2}, ${part.y + part.length / 2})` : 
                      ''}
                  >
                    <tspan x={part.x + part.width / 2} dy="-0.4em" fontSize={fontSize * 0.75} fill="#475569">{cabName}</tspan>
                    <tspan x={part.x + part.width / 2} dy="1.2em">{partName}</tspan>
                  </text>
                )}
                {/* Gola Cuts Visualization */}
                {part.features?.map((feature, fIdx) => {
                  if (feature === 'gola-top-l') {
                    return (
                      <rect 
                        key={`gola-${fIdx}`}
                        x={part.rotated ? part.x + part.width - 55 : part.x}
                        y={part.y}
                        width={55}
                        height={55}
                        fill="#cbd5e1"
                        stroke="#94a3b8"
                        strokeWidth="1"
                        strokeDasharray="5,5"
                      />
                    );
                  }
                  if (feature.startsWith('gola-mid-c:') || feature.startsWith('gola-mid-l:')) {
                    const isLCut = feature.startsWith('gola-mid-l:');
                    const gh = parseFloat(feature.split(':')[1]);
                    // Side panel height in design is innerHeight - panelThickness
                    // gh is from cabinet bottom (above toe kick)
                    const yOffsetFromBottom = gh - (settings.thickness || 18)/2;
                    const yPosFromTop = (part.rotated ? part.width : part.length) - yOffsetFromBottom;
                    
                    const cutDim = isLCut ? 55 : 73.5;
                    const cutOffset = cutDim / 2;

                    return (
                      <rect 
                        key={`gola-${fIdx}`}
                        x={part.rotated ? part.x + yPosFromTop - cutOffset : part.x}
                        y={part.rotated ? part.y : part.y + yPosFromTop - cutOffset}
                        width={part.rotated ? cutDim : (isLCut ? 20 : 35)}
                        height={part.rotated ? (isLCut ? 20 : 35) : cutDim}
                        fill="#cbd5e1"
                        stroke="#94a3b8"
                        strokeWidth="1"
                        strokeDasharray="5,5"
                      />
                    );
                  }
                  if (feature === 'groove-back') {
                    const thickness = settings.thickness || 18;
                    const grooveWidth = (settings.backPanelThickness || 6) + 2;
                    let gX, gY, gW, gH;
                    if (part.rotated) {
                      gX = part.x;
                      gY = part.y + part.length - thickness - grooveWidth;
                      gW = part.width;
                      gH = grooveWidth;
                    } else {
                      gX = part.x + part.width - thickness - grooveWidth;
                      gY = part.y;
                      gW = grooveWidth;
                      gH = part.length;
                    }
                    return (
                      <rect 
                        key={`groove-${fIdx}`}
                        x={gX}
                        y={gY}
                        width={gW}
                        height={gH}
                        fill="#94a3b8"
                        fillOpacity="0.3"
                        stroke="#64748b"
                        strokeWidth="0.5"
                        strokeDasharray="2,2"
                      />
                    );
                  }
                  if (feature === 'nail-holes') {
                    const technicalR = (settings.nailHoleDiameter || 3) / 2;
                    const holePositions = [
                      { x: 50, y: 50 },
                      { x: part.width - 50, y: 50 },
                      { x: part.width - 50, y: part.length - 50 },
                      { x: 50, y: part.length - 50 }
                    ];
                    return (
                      <g key={`nails-${fIdx}`}>
                        {holePositions.map((hp, hIdx) => (
                          <circle 
                            key={`nail-${hIdx}`}
                            cx={part.x + hp.x}
                            cy={part.y + hp.y}
                            r={technicalR}
                            fill="#ef4444"
                            fillOpacity="0.5"
                          />
                        ))}
                      </g>
                    );
                  }
                  return null;
                })}
                
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
              const [cabName, partName] = part.label.split('|');
              return (
                <div className="space-y-2">
                  <p><span className="font-semibold">Cabinet:</span> {cabName}</p>
                  <p><span className="font-semibold">Part:</span> {partName}</p>
                  <p><span className="font-semibold">Dimensions:</span> {Math.round(part.length)} × {Math.round(part.width)} mm</p>
                  <p><span className="font-semibold">Position:</span> X:{Math.round(part.x)}, Y:{Math.round(part.y)}</p>
                  <p><span className="font-semibold">Grain:</span> Along length ({part.length > part.width ? 'vertical' : 'horizontal'})</p>
                  {part.features && part.features.length > 0 && (
                    <p><span className="font-semibold">Machining:</span> {part.features.map(f => f.replace(/-/g, ' ').toUpperCase()).join(', ')}</p>
                  )}
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
