import React from 'react';
import { Zone, CabinetUnit, Obstacle } from '../types';

interface Props {
  zone: Zone;
  height: number; // Wall Height
}

export const WallVisualizer: React.FC<Props> = ({ zone, height }) => {
  // Sort obstacles by position
  const sortedObs = [...zone.obstacles].sort((a, b) => a.fromLeft - b.fromLeft);
  
  // Calculate cabinet positions (Simple Flow Logic)
  let cursorX = 0;
  const placedCabinets: { x: number, w: number, unit: CabinetUnit }[] = [];
  
  zone.cabinets.forEach(cab => {
    // Check if current cursor overlaps an obstacle
    let isClear = false;
    while (!isClear) {
      isClear = true;
      for (const obs of sortedObs) {
        // If cursor is inside an obstacle
        if (cursorX >= obs.fromLeft && cursorX < (obs.fromLeft + obs.width)) {
          cursorX = obs.fromLeft + obs.width; // Jump over
          isClear = false;
        }
        // If cabinet would overlap obstacle partially
        else if (cursorX < obs.fromLeft && (cursorX + cab.width) > obs.fromLeft) {
          // Can't fit here, jump to after obstacle?
          // For simplicity in this non-CAD tool, we assume user/auto-fill handles order.
          // But visualizing it overlapping helps debugging.
          // Let's just draw it where it flows.
        }
      }
    }
    
    placedCabinets.push({ x: cursorX, w: cab.width, unit: cab });
    cursorX += cab.width;
  });

  // SVG Scaling
  const scale = 0.2; // 1px = 5mm? No, SVG viewBox handles units directly.
  const svgWidth = "100%";
  const viewWidth = Math.max(zone.totalLength, 1000);
  const viewHeight = Math.max(height, 2400);

  return (
    <div className="w-full bg-slate-900 border-b border-slate-800 overflow-hidden relative">
      <div className="absolute top-2 left-2 text-[10px] text-slate-500 font-mono">ELEVATION (FRONT VIEW)</div>
      <svg 
        viewBox={`0 0 ${viewWidth} ${viewHeight}`} 
        className="w-full h-40 md:h-64 bg-slate-800/30"
        preserveAspectRatio="xMinYMax meet"
      >
        {/* Wall Background */}
        <rect x="0" y="0" width={zone.totalLength} height={height} fill="#1e293b" />
        
        {/* Grid Lines (Every 1m) */}
        {Array.from({ length: Math.ceil(zone.totalLength / 1000) }).map((_, i) => (
          <line 
            key={i} 
            x1={(i + 1) * 1000} y1="0" 
            x2={(i + 1) * 1000} y2={height} 
            stroke="#334155" strokeWidth="2" strokeDasharray="10,10" 
          />
        ))}

        {/* Obstacles */}
        {sortedObs.map(obs => (
          <g key={obs.id}>
             <rect 
              x={obs.fromLeft} 
              y={height - (obs.elevation || 0) - (obs.height || 2100)} 
              width={obs.width} 
              height={obs.height || 2100} 
              fill="#475569" 
              stroke="#94a3b8"
              strokeWidth="4"
            />
            <text x={obs.fromLeft + 20} y={height - (obs.elevation || 0) - (obs.height || 2100) + 100} fill="white" fontSize="120" style={{textTransform: 'uppercase'}}>
              {obs.type}
            </text>
          </g>
        ))}

        {/* Cabinets */}
        {placedCabinets.map((pc, i) => {
          // Determine height based on type (rough viz)
          const isTall = pc.unit.type === 'Tall';
          const isWall = pc.unit.type === 'Wall';
          const h = isTall ? 2100 : (isWall ? 720 : 720); // mm
          const y = isWall ? (height - 2100) : (height - h); // Top aligned for wall? No, Wall cabs usually at 2100 top alignment

          // Wall Cab Y: Top alignment usually 2100-2400. Let's assume Top Align 2100 for viz.
          let yPos = height - 870; // Base (150 leg + 720 box)
          if (isTall) yPos = height - 2100;
          if (isWall) yPos = height - 2100; // Aligned with tall top

          return (
            <g key={i}>
              <rect 
                x={pc.x} 
                y={yPos} 
                width={pc.w} 
                height={h} 
                fill={pc.unit.isAutoFilled ? "rgba(245, 158, 11, 0.1)" : "rgba(245, 158, 11, 0.2)"}
                stroke="#f59e0b" 
                strokeWidth="4"
              />
              {/* Door swing / details */}
              <line x1={pc.x} y1={yPos} x2={pc.x + pc.w} y2={yPos + h} stroke="#f59e0b" strokeWidth="1" opacity="0.5" />
              <line x1={pc.x + pc.w} y1={yPos} x2={pc.x} y2={yPos + h} stroke="#f59e0b" strokeWidth="1" opacity="0.5" />
              
              <text x={pc.x + 20} y={yPos + h/2} fill="white" fontSize="80" fontWeight="bold">
                {pc.w}
              </text>
            </g>
          );
        })}
      </svg>
      {/* Legend / Metrics */}
      <div className="absolute bottom-0 left-0 bg-slate-900/80 px-2 py-1 text-[10px] text-amber-500 font-mono">
        View Scale: 1:{Math.round(viewWidth/300)}
      </div>
    </div>
  );
};