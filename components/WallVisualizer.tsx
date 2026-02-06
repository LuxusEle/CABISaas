
import React, { useState, useRef, useEffect } from 'react';
import { Zone, CabinetUnit, Obstacle, PresetType, CabinetType } from '../types';

interface Props {
  zone: Zone;
  height: number;
  onCabinetClick?: (index: number) => void;
  onObstacleClick?: (index: number) => void;
  onCabinetMove?: (index: number, newX: number) => void;
  onObstacleMove?: (index: number, newX: number) => void;
  onDragEnd?: () => void; // New prop to trigger resolution after drop
}

export const WallVisualizer: React.FC<Props> = ({ 
  zone, height, 
  onCabinetClick, onObstacleClick,
  onCabinetMove, onObstacleMove, onDragEnd
}) => {
  const [dragging, setDragging] = useState<{ type: 'cabinet' | 'obstacle', index: number, startX: number, originalX: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const getPointerX = (e: React.MouseEvent | React.TouchEvent) => {
    if (!svgRef.current) return 0;
    const CTM = svgRef.current.getScreenCTM();
    if (!CTM) return 0;
    let clientX = 0;
    if ('touches' in e) clientX = e.touches[0].clientX;
    else clientX = (e as React.MouseEvent).clientX;
    return (clientX - CTM.e) / CTM.a;
  };

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent, type: 'cabinet' | 'obstacle', index: number, currentX: number) => {
    e.stopPropagation();
    const startX = getPointerX(e);
    setDragging({ type, index, startX, originalX: currentX });
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!dragging) return;
    const currentX = getPointerX(e);
    const delta = currentX - dragging.startX;
    let newX = dragging.originalX + delta;
    
    // 1. Basic Bounds Check
    const maxWidth = zone.totalLength;
    if (newX < 0) newX = 0;
    
    // Get width of item being dragged
    let itemWidth = 0;
    if (dragging.type === 'cabinet') itemWidth = zone.cabinets[dragging.index].width;
    else itemWidth = zone.obstacles[dragging.index].width;
    
    if (newX + itemWidth > maxWidth) newX = maxWidth - itemWidth;

    // 2. MAGNETIC SNAPPING (Snap to Neighbors)
    const SNAP_DIST = 50; // mm
    let snapped = false;

    // Check neighbors (Cabinets)
    for (let i = 0; i < zone.cabinets.length; i++) {
      if (dragging.type === 'cabinet' && i === dragging.index) continue; // Skip self
      
      const neighbor = zone.cabinets[i];
      const neighborLeft = neighbor.fromLeft;
      const neighborRight = neighbor.fromLeft + neighbor.width;

      // Snap Left edge of current to Right edge of neighbor
      if (Math.abs(newX - neighborRight) < SNAP_DIST) {
        newX = neighborRight;
        snapped = true;
        break;
      }

      // Snap Right edge of current to Left edge of neighbor
      if (Math.abs((newX + itemWidth) - neighborLeft) < SNAP_DIST) {
        newX = neighborLeft - itemWidth;
        snapped = true;
        break;
      }
    }

    // 3. Grid Snap (fallback)
    if (!snapped) {
      newX = Math.round(newX / 25) * 25; // 25mm grid
    }

    if (dragging.type === 'cabinet' && onCabinetMove) {
       onCabinetMove(dragging.index, newX);
    } else if (dragging.type === 'obstacle' && onObstacleMove) {
       onObstacleMove(dragging.index, newX);
    }
  };

  const handleMouseUp = () => {
    if (dragging) {
      setDragging(null);
      if (onDragEnd) onDragEnd();
    }
  };

  useEffect(() => {
    if (dragging) {
      window.addEventListener('mousemove', handleMouseMove as any);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleMouseMove as any);
      window.addEventListener('touchend', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove as any);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleMouseMove as any);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [dragging]);

  const viewWidth = Math.max(zone.totalLength, 1500); 
  const viewHeight = Math.max(height, 2400);

  // RENDER HELPERS
  const renderCabinetDetail = (unit: CabinetUnit, index: number) => {
    const isTall = unit.type === CabinetType.TALL;
    const isWall = unit.type === CabinetType.WALL;
    let h = 720;
    let y = height - 150 - 720; 

    if (isTall) { h = 2100; y = height - 150 - 2100; } 
    else if (isWall) { h = 720; y = height - 150 - 2100; }

    const x = unit.fromLeft;
    const w = unit.width;
    const isAuto = unit.isAutoFilled;
    const strokeColor = isAuto ? "#F59E0B" : "var(--cab-stroke)";
    const fillColor = isAuto ? "rgba(245, 158, 11, 0.15)" : "var(--cab-fill)";
    
    let details = null;
    switch (unit.preset) {
      case PresetType.BASE_DRAWER_3:
        const d1h = h * 0.2; const d2h = h * 0.4; 
        details = <g><line x1={x} y1={y + d1h} x2={x + w} y2={y + d1h} stroke={strokeColor} strokeWidth="1" /><line x1={x} y1={y + d1h + d2h} x2={x + w} y2={y + d1h + d2h} stroke={strokeColor} strokeWidth="1" /></g>;
        break;
      case PresetType.BASE_DOOR: case PresetType.WALL_STD:
          details = <g><line x1={x + w/2} y1={y} x2={x + w/2} y2={y + h} stroke={strokeColor} strokeWidth="1" opacity="0.3" /><path d={`M${x+w} ${y} L${x + w/2} ${y+h/2} L${x+w} ${y+h}`} fill="none" stroke={strokeColor} strokeWidth="0.5" opacity="0.4" /></g>;
        break;
      case PresetType.FILLER:
        details = <line x1={x + w/2} y1={y} x2={x + w/2} y2={y + h} stroke={strokeColor} strokeWidth="1" strokeDasharray="4,2" />;
        break;
      case PresetType.TALL_OVEN:
        const ovenY = y + 720;
        details = <rect x={x + 10} y={ovenY + 10} width={w - 20} height={600 - 20} rx="4" fill="none" stroke={strokeColor} strokeWidth="2" />;
        break;
    }

    return (
      <g 
        key={unit.id} 
        onMouseDown={(e) => handleMouseDown(e, 'cabinet', index, x)}
        onTouchStart={(e) => handleMouseDown(e, 'cabinet', index, x)}
        onClick={(e) => { e.stopPropagation(); onCabinetClick?.(index); }} 
        className="cursor-pointer hover:opacity-80 transition-opacity"
      >
        <rect x={x} y={y} width={w} height={h} fill={fillColor} stroke={strokeColor} strokeWidth="2"/>
        {details}
        <text x={x + w/2} y={y + h/2} fill="var(--text-color)" fontSize={Math.min(80, w/3)} textAnchor="middle" dominantBaseline="middle" fontWeight="bold" style={{pointerEvents: 'none'}}>{w}</text>
      </g>
    );
  };

  return (
    <div className="w-full bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 overflow-hidden relative shadow-inner select-none print:border-none">
      <style>{`
        :root { --bg-wall: #ffffff; --bg-void: #f1f5f9; --grid-line: #e2e8f0; --wall-border: #94a3b8; --cab-stroke: #f59e0b; --cab-fill: rgba(245, 158, 11, 0.2); --obs-stroke: #64748b; --obs-fill: #e2e8f0; --text-color: #f59e0b; }
        .dark { --bg-wall: #0F172A; --bg-void: #020617; --grid-line: #1e293b; --wall-border: #64748b; --cab-stroke: #fbbf24; --cab-fill: rgba(251, 191, 36, 0.1); --obs-stroke: #475569; --obs-fill: #1e293b; --text-color: #fbbf24; }
        @media print { .print-hidden { display: none; } .bg-slate-50, .dark .bg-slate-950 { background-color: white !important; } svg { background-color: white !important; } .dark { --bg-wall: #fff; --bg-void: #fff; --grid-line: #eee; --wall-border: #000; --cab-stroke: #000; --cab-fill: #eee; --obs-stroke: #000; --obs-fill: #ddd; --text-color: #000; } }
      `}</style>
      
      <div className="absolute top-2 left-2 text-[10px] text-slate-400 font-mono z-10 px-2 rounded opacity-50 print-hidden">ELEVATION VIEW</div>
      
      <svg ref={svgRef} viewBox={`-50 -100 ${viewWidth + 100} ${viewHeight + 150}`} className="w-full h-48 md:h-full bg-[var(--bg-void)] touch-none" preserveAspectRatio="xMidYMax meet">
        <rect x="0" y="0" width={zone.totalLength} height={height} fill="var(--bg-wall)" className="stroke-[var(--wall-border)]" strokeWidth="2"/>
        <defs><pattern id="gridPattern" width="500" height="500" patternUnits="userSpaceOnUse"><path d="M 500 0 L 0 0 0 500" fill="none" stroke="var(--grid-line)" strokeWidth="1"/></pattern></defs>
        <rect x="0" y="0" width={zone.totalLength} height={height} fill="url(#gridPattern)" />
        <line x1="0" y1={height + 50} x2={zone.totalLength} y2={height + 50} stroke="var(--wall-border)" strokeWidth="1" markerEnd="url(#arrow)" markerStart="url(#arrow)" />
        <text x={zone.totalLength/2} y={height + 90} textAnchor="middle" fill="var(--obs-stroke)" fontSize="40">TOTAL {zone.totalLength}mm</text>
        <line x1="-100" y1={height} x2={viewWidth + 100} y2={height} stroke="var(--wall-border)" strokeWidth="4" />
        {zone.obstacles.map((obs, idx) => (
          <g key={obs.id} onMouseDown={(e) => handleMouseDown(e, 'obstacle', idx, obs.fromLeft)} onTouchStart={(e) => handleMouseDown(e, 'obstacle', idx, obs.fromLeft)} onClick={(e) => { e.stopPropagation(); onObstacleClick?.(idx); }} className="cursor-pointer hover:opacity-80 transition-opacity">
             <rect x={obs.fromLeft} y={height - (obs.elevation || 0) - (obs.height || 2100)} width={obs.width} height={obs.height || 2100} fill="var(--obs-fill)" stroke="var(--obs-stroke)" strokeWidth="2" fillOpacity="0.8"/>
             {obs.type === 'window' && obs.elevation && <text x={obs.fromLeft + obs.width/2} y={height - 20} textAnchor="middle" fontSize="40" fill="var(--obs-stroke)">ELEV: {obs.elevation}</text>}
            <text x={obs.fromLeft + obs.width/2} y={height - (obs.elevation||0) - (obs.height||2100)/2} fill="var(--obs-stroke)" fontSize="100" textAnchor="middle" dominantBaseline="middle" style={{textTransform: 'uppercase', opacity: 0.5, pointerEvents: 'none'}}>{obs.type}</text>
          </g>
        ))}
        {zone.cabinets.map((unit, idx) => renderCabinetDetail(unit, idx))}
      </svg>
    </div>
  );
};
