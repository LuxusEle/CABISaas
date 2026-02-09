import React, { useState, useRef, useEffect } from 'react';
import { Zone, CabinetUnit, Obstacle, PresetType, CabinetType } from '../types';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  zone: Zone;
  height: number;
  onCabinetClick?: (index: number) => void;
  onObstacleClick?: (index: number) => void;
  onCabinetMove?: (index: number, newX: number) => void;
  onObstacleMove?: (index: number, newX: number) => void;
  onDragEnd?: () => void;
  onSwapCabinets?: (index1: number, index2: number) => void;
}

export const WallVisualizer: React.FC<Props> = ({
  zone, height,
  onCabinetClick, onObstacleClick,
  onCabinetMove, onObstacleMove, onDragEnd,
  onSwapCabinets
}) => {
  const [panning, setPanning] = useState<{
    startClientX: number;
    startClientY: number;
    startViewBox: { x: number; y: number; width: number; height: number };
  } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const MIN_ZOOM = 0.4;
  const MAX_ZOOM = 6;

  const viewPadding = 200;
  const baseViewBox = {
    x: -viewPadding,
    y: -200,
    width: zone.totalLength + viewPadding * 2,
    height: height + 400,
  };

  const [viewBox, setViewBox] = useState<{ x: number; y: number; width: number; height: number }>(() => ({
    x: baseViewBox.x,
    y: baseViewBox.y,
    width: baseViewBox.width,
    height: baseViewBox.height,
  }));

  const clampViewBox = (vb: { x: number; y: number; width: number; height: number }) => {
    const minWidth = baseViewBox.width / MAX_ZOOM;
    const maxWidth = baseViewBox.width / MIN_ZOOM;
    let width = Math.min(Math.max(vb.width, minWidth), maxWidth);
    const scale = width / vb.width;
    let height = vb.height * scale;

    const minHeight = baseViewBox.height / MAX_ZOOM;
    const maxHeight = baseViewBox.height / MIN_ZOOM;
    height = Math.min(Math.max(height, minHeight), maxHeight);

    const margin = 2000;
    const minX = baseViewBox.x - margin;
    const maxX = baseViewBox.x + baseViewBox.width + margin - width;
    const minY = baseViewBox.y - margin;
    const maxY = baseViewBox.y + baseViewBox.height + margin - height;

    const x = Math.min(Math.max(vb.x, minX), maxX);
    const y = Math.min(Math.max(vb.y, minY), maxY);
    return { x, y, width, height };
  };

  const getClientXY = (e: any): { clientX: number; clientY: number } => {
    if (e?.touches && e.touches.length > 0) {
      return { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY };
    }
    return { clientX: e.clientX ?? 0, clientY: e.clientY ?? 0 };
  };

  const clientToSvg = (clientX: number, clientY: number) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const CTM = svgRef.current.getScreenCTM();
    if (!CTM) return { x: 0, y: 0 };
    const pt = svgRef.current.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const sp = pt.matrixTransform(CTM.inverse());
    return { x: sp.x, y: sp.y };
  };

  const handlePanStart = (e: React.MouseEvent | React.TouchEvent) => {
    if ('button' in e && (e as React.MouseEvent).button !== 0) return;

    const target = e.target as Element | null;
    if (!target) return;
    if ((target as any).getAttribute?.('data-pan') !== 'true') return;

    e.stopPropagation();
    const { clientX, clientY } = getClientXY(e);
    setPanning({ startClientX: clientX, startClientY: clientY, startViewBox: viewBox });
  };

  const handlePanMove = (e: MouseEvent | TouchEvent) => {
    if (!panning) return;
    const { clientX, clientY } = getClientXY(e);
    const startSvg = clientToSvg(panning.startClientX, panning.startClientY);
    const curSvg = clientToSvg(clientX, clientY);
    const dx = startSvg.x - curSvg.x;
    const dy = startSvg.y - curSvg.y;

    const next = {
      ...panning.startViewBox,
      x: panning.startViewBox.x + dx,
      y: panning.startViewBox.y + dy,
    };
    setViewBox(clampViewBox(next));
  };

  const handlePanEnd = () => {
    if (!panning) return;
    setPanning(null);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (!svgRef.current) return;
    e.preventDefault();

    const { x: svgX, y: svgY } = clientToSvg(e.clientX, e.clientY);
    const zoomIntensity = 0.0015;
    const factor = Math.exp(e.deltaY * zoomIntensity);

    setViewBox((vb) => {
      const nextWidth = vb.width * factor;
      const scale = nextWidth / vb.width;
      const nextHeight = vb.height * scale;

      const nx = vb.x - (svgX - vb.x) * (scale - 1);
      const ny = vb.y - (svgY - vb.y) * (scale - 1);

      return clampViewBox({ x: nx, y: ny, width: nextWidth, height: nextHeight });
    });
  };

  // Swap cabinet with adjacent cabinet
  const handleSwapCabinet = (currentIndex: number, direction: 'left' | 'right') => {
    const currentCabinet = zone.cabinets[currentIndex];
    if (!currentCabinet) return;

    // Find adjacent cabinet of compatible type
    const currentX = currentCabinet.fromLeft;
    const candidates = zone.cabinets
      .map((cab, idx) => ({ cab, idx }))
      .filter(({ cab, idx }) => {
        if (idx === currentIndex) return false;
        
        // Check if types are compatible for swapping
        const currentType = currentCabinet.type;
        const targetType = cab.type;
        
        // Tall can swap with anything
        if (currentType === CabinetType.TALL || targetType === CabinetType.TALL) return true;
        
        // Same type can swap
        if (currentType === targetType) return true;
        
        return false;
      })
      .sort((a, b) => a.cab.fromLeft - b.cab.fromLeft);

    let targetIndex = -1;
    
    if (direction === 'right') {
      // Find first cabinet to the right
      const target = candidates.find(({ cab }) => cab.fromLeft > currentX);
      if (target) targetIndex = target.idx;
    } else {
      // Find last cabinet to the left
      const target = candidates.reverse().find(({ cab }) => cab.fromLeft < currentX);
      if (target) targetIndex = target.idx;
    }

    if (targetIndex !== -1 && onSwapCabinets) {
      onSwapCabinets(currentIndex, targetIndex);
      onDragEnd?.();
    }
  };

  useEffect(() => {
    if (panning) {
      window.addEventListener('mousemove', handlePanMove as any);
      window.addEventListener('mouseup', handlePanEnd);
      window.addEventListener('touchmove', handlePanMove as any);
      window.addEventListener('touchend', handlePanEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handlePanMove as any);
      window.removeEventListener('mouseup', handlePanEnd);
      window.removeEventListener('touchmove', handlePanMove as any);
      window.removeEventListener('touchend', handlePanEnd);
    };
  }, [panning]);

  useEffect(() => {
    setViewBox({
      x: baseViewBox.x,
      y: baseViewBox.y,
      width: baseViewBox.width,
      height: baseViewBox.height,
    });
  }, [zone.totalLength, height]);

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

    // Check if can swap left/right - show arrows for immediate neighbors with compatible types
    // Sort cabinets by position to find immediate neighbors
    const sortedCabs = zone.cabinets
      .map((cab, idx) => ({ cab, idx }))
      .filter(({ idx }) => idx !== index)
      .sort((a, b) => a.cab.fromLeft - b.cab.fromLeft);
    
    // Find immediate left neighbor
    const leftNeighbors = sortedCabs.filter(({ cab }) => cab.fromLeft < x);
    const immediateLeft = leftNeighbors.length > 0 ? leftNeighbors[leftNeighbors.length - 1] : null;
    
    // Find immediate right neighbor
    const rightNeighbors = sortedCabs.filter(({ cab }) => cab.fromLeft > x);
    const immediateRight = rightNeighbors.length > 0 ? rightNeighbors[0] : null;
    
    // Check type compatibility for left swap
    const canSwapLeft = immediateLeft ? (
      (unit.type === CabinetType.TALL || immediateLeft.cab.type === CabinetType.TALL) ||
      (unit.type === immediateLeft.cab.type)
    ) : false;
    
    // Check type compatibility for right swap
    const canSwapRight = immediateRight ? (
      (unit.type === CabinetType.TALL || immediateRight.cab.type === CabinetType.TALL) ||
      (unit.type === immediateRight.cab.type)
    ) : false;

    let details = null;
    switch (unit.preset) {
      case PresetType.BASE_DRAWER_3:
        const d1h = h * 0.2; const d2h = h * 0.4;
        details = <g><line x1={x} y1={y + d1h} x2={x + w} y2={y + d1h} stroke={strokeColor} strokeWidth="1" /><line x1={x} y1={y + d1h + d2h} x2={x + w} y2={y + d1h + d2h} stroke={strokeColor} strokeWidth="1" /></g>;
        break;
      case PresetType.BASE_DOOR: case PresetType.WALL_STD:
        details = <g><line x1={x + w / 2} y1={y} x2={x + w / 2} y2={y + h} stroke={strokeColor} strokeWidth="1" opacity="0.3" /><path d={`M${x + w} ${y} L${x + w / 2} ${y + h / 2} L${x + w} ${y + h}`} fill="none" stroke={strokeColor} strokeWidth="0.5" opacity="0.4" /></g>;
        break;
      case PresetType.FILLER:
        details = <line x1={x + w / 2} y1={y} x2={x + w / 2} y2={y + h} stroke={strokeColor} strokeWidth="1" strokeDasharray="4,2" />;
        break;
      case PresetType.TALL_OVEN:
        const ovenY = y + 720;
        details = <rect x={x + 10} y={ovenY + 10} width={w - 20} height={600 - 20} rx="4" fill="none" stroke={strokeColor} strokeWidth="2" />;
        break;
      case PresetType.SINK_UNIT:
        details = (
          <g>
            <rect x={x + 50} y={y - 10} width={w - 100} height={20} rx="2" fill="#94a3b8" />
            <path d={`M${x + w / 2 - 20} ${y - 10} L${x + w / 2 + 20} ${y - 10} L${x + w / 2} ${y - 60} Z`} fill="#94a3b8" />
            <path d={`M${x + w / 2} ${y - 60} Q${x + w / 2 + 20} ${y - 80} ${x + w / 2 + 30} ${y - 50}`} fill="none" stroke="#94a3b8" strokeWidth="4" />
          </g>
        );
        break;
      case PresetType.HOOD_UNIT:
        details = (
          <g>
            <rect x={x} y={y + h - 50} width={w} height={50} fill="rgba(0,0,0,0.1)" stroke={strokeColor} strokeWidth="1" strokeDasharray="2,2" />
            <text x={x + w / 2} y={y + h - 25} textAnchor="middle" fontSize="12" fill={strokeColor} opacity="0.6">200mm NOTCH</text>
          </g>
        );
        break;
      case PresetType.OPEN_BOX:
        const shelf1Y = y + h * 0.33;
        const shelf2Y = y + h * 0.66;
        details = (
          <g>
            <rect x={x + 2} y={shelf1Y - 8} width={w - 4} height={16} fill={strokeColor} opacity="0.3" />
            <rect x={x + 2} y={shelf2Y - 8} width={w - 4} height={16} fill={strokeColor} opacity="0.3" />
            <text x={x + w / 2} y={y + h / 2} textAnchor="middle" fontSize="12" fill={strokeColor} opacity="0.6" fontWeight="bold">OPEN</text>
          </g>
        );
        break;
    }

    return (
      <g key={unit.id}>
        {/* Cabinet Body - Clickable for edit */}
        <g
          onClick={(e) => { e.stopPropagation(); onCabinetClick?.(index); }}
          className="cursor-pointer"
          style={{ pointerEvents: 'all' }}
        >
          {/* Cabinet Base */}
          <rect x={x} y={y} width={w} height={h} rx="2" fill={fillColor} stroke={strokeColor} strokeWidth="2" />
          
          {/* Cabinet Label */}
          <text x={x + w / 2} y={y + h / 2} textAnchor="middle" dominantBaseline="middle" fontSize="12" fontWeight="bold" fill={strokeColor} pointerEvents="none">
            {unit.label}
          </text>
          
          {/* Width Label */}
          <text x={x + w / 2} y={y + h + 20} textAnchor="middle" fontSize="10" fill="#64748b" pointerEvents="none">
            {unit.width}mm
          </text>
          
          {details}
        </g>

        {/* Left Arrow Button - Inside left edge of cabinet (points LEFT) */}
        {canSwapLeft && (
          <g
            onClick={(e) => {
              e.stopPropagation();
              handleSwapCabinet(index, 'left');
            }}
            className="cursor-pointer"
            style={{ pointerEvents: 'all' }}
          >
            <rect x={x + 2} y={y + h/2 - 48} width="80" height="96" rx="8" fill="rgba(245, 158, 11, 0.9)" stroke="#f59e0b" strokeWidth="3" />
            <path d={`M${x + 56} ${y + h/2 - 24} L${x + 56} ${y + h/2 + 24} L${x + 16} ${y + h/2} Z`} fill="white" />
          </g>
        )}

        {/* Right Arrow Button - Inside right edge of cabinet (points RIGHT) */}
        {canSwapRight && (
          <g
            onClick={(e) => {
              e.stopPropagation();
              handleSwapCabinet(index, 'right');
            }}
            className="cursor-pointer"
            style={{ pointerEvents: 'all' }}
          >
            <rect x={x + w - 82} y={y + h/2 - 48} width="80" height="96" rx="8" fill="rgba(245, 158, 11, 0.9)" stroke="#f59e0b" strokeWidth="3" />
            <path d={`M${x + w - 56} ${y + h/2 - 24} L${x + w - 56} ${y + h/2 + 24} L${x + w - 16} ${y + h/2} Z`} fill="white" />
          </g>
        )}
      </g>
    );
  };

  return (
    <div className="w-full h-full bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 overflow-hidden relative shadow-inner select-none print:border-none print:bg-white print:shadow-none">
      <style>{`
        :root { --bg-wall: #ffffff; --bg-void: #f1f5f9; --grid-line: #e2e8f0; --wall-border: #94a3b8; --cab-stroke: #f59e0b; --cab-fill: rgba(245, 158, 11, 0.2); --obs-stroke: #64748b; --obs-fill: #e2e8f0; --text-color: #f59e0b; }
        .dark { --bg-wall: #0F172A; --bg-void: #020617; --grid-line: #1e293b; --wall-border: #64748b; --cab-stroke: #fbbf24; --cab-fill: rgba(251, 191, 36, 0.1); --obs-stroke: #475569; --obs-fill: #1e293b; --text-color: #fbbf24; }
        @media print { 
          .print-hidden { display: none; } 
          .bg-slate-50, .dark .bg-slate-950 { background-color: white !important; } 
          svg { background-color: white !important; } 
          .dark { --bg-wall: #fff; --bg-void: #fff; --grid-line: #ccc; --wall-border: #000; --cab-stroke: #000; --cab-fill: #fff; --obs-stroke: #000; --obs-fill: #eee; --text-color: #000; } 
          :root { --bg-wall: #fff; --bg-void: #fff; --grid-line: #ccc; --wall-border: #000; --cab-stroke: #000; --cab-fill: #fff; --obs-stroke: #000; --obs-fill: #eee; --text-color: #000; } 
        }
      `}</style>

      <div className="absolute top-2 left-2 text-[10px] text-slate-400 font-mono z-10 px-2 rounded opacity-50 print-hidden">ELEVATION VIEW - Click arrows to swap cabinets</div>

      <svg
        ref={svgRef}
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
        className="w-full h-full bg-[var(--bg-void)] touch-none block"
        preserveAspectRatio="xMidYMid meet"
        onWheel={handleWheel}
      >
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="3" markerHeight="3" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--wall-border)" />
          </marker>
          <pattern id="gridPattern" width="50" height="50" patternUnits="userSpaceOnUse"><path d="M 50 0 L 0 0 0 50" fill="none" stroke="var(--grid-line)" strokeWidth="1" /></pattern>
        </defs>
        <rect
          data-pan="true"
          x={viewBox.x}
          y={viewBox.y}
          width={viewBox.width}
          height={viewBox.height}
          fill="transparent"
          onMouseDown={handlePanStart}
          onTouchStart={handlePanStart}
          style={{ cursor: panning ? 'grabbing' : 'grab' }}
        />
        <rect
          data-pan="true"
          x="0"
          y="0"
          width={zone.totalLength}
          height={height}
          fill="var(--bg-wall)"
          className="stroke-[var(--wall-border)] print:stroke-black print:stroke-2"
          strokeWidth="2"
          onMouseDown={handlePanStart}
          onTouchStart={handlePanStart}
          style={{ cursor: panning ? 'grabbing' : 'grab' }}
        />
        <rect
          data-pan="true"
          x="0"
          y="0"
          width={zone.totalLength}
          height={height}
          fill="url(#gridPattern)"
          onMouseDown={handlePanStart}
          onTouchStart={handlePanStart}
          style={{ cursor: panning ? 'grabbing' : 'grab' }}
        />
        <line x1="0" y1={height + 50} x2={zone.totalLength} y2={height + 50} stroke="var(--wall-border)" strokeWidth="1" markerEnd="url(#arrow)" markerStart="url(#arrow)" className="print:stroke-black" />
        <text x={zone.totalLength / 2} y={height + 90} textAnchor="middle" fill="var(--obs-stroke)" fontSize="40" className="print:fill-black font-mono">TOTAL {zone.totalLength}mm</text>

        {[...zone.cabinets]
          .map((c, idx) => ({ c, idx, x: c.fromLeft }))
          .sort((a, b) => a.x - b.x)
          .map(({ c, idx, x }) => (
            <g key={'dim' + c.id}>
              <line x1={x} y1="-50" x2={x + c.width} y2="-50" stroke="var(--wall-border)" strokeWidth="1" markerEnd="url(#arrow)" markerStart="url(#arrow)" />
              <text x={x + c.width / 2} y="-70" textAnchor="middle" fontSize="30" fill="var(--wall-border)" className="font-mono">{c.width}</text>
            </g>
          ))}

        {zone.cabinets
          .map((c, idx) => ({ c, idx, x: c.fromLeft }))
          .filter(({ c }) => c.type === CabinetType.BASE)
          .map(({ c, x }) => (
            <g key={'ct' + c.id}>
              <rect x={x} y={height - 150 - 720 - 40} width={c.width} height={40} fill="#475569" className="print:fill-slate-200" />
              {c.preset === PresetType.BASE_DRAWER_3 && (
                <g>
                  <rect x={x + 50} y={height - 150 - 720 - 45} width={c.width - 100} height={5} fill="#1e293b" rx="2" />
                  <text x={x + c.width / 2} y={height - 150 - 720 - 55} textAnchor="middle" fontSize="12" fill="#475569" className="font-bold print:fill-black">HOB / COOKER</text>
                </g>
              )}
            </g>
          ))}

        <line x1="-100" y1={height} x2={zone.totalLength + 100} y2={height} stroke="var(--wall-border)" strokeWidth="4" className="print:stroke-black" />
        {zone.obstacles.map((obs, idx) => {
          const x = obs.fromLeft;
          return (
            <g key={obs.id}
              onClick={(e) => { e.stopPropagation(); onObstacleClick?.(idx); }}
              className="cursor-pointer hover:opacity-80 transition-opacity"
            >
              <rect x={x} y={height - (obs.elevation || 0) - (obs.height || 2100)} width={obs.width} height={obs.height || 2100} fill="var(--obs-fill)" stroke="var(--obs-stroke)" strokeWidth="2" fillOpacity="0.8" className="print:stroke-black print:fill-slate-200" />
              {obs.type === 'window' && obs.elevation && <text x={x + obs.width / 2} y={height - 20} textAnchor="middle" fontSize="40" fill="var(--obs-stroke)" className="print:fill-black">ELEV: {obs.elevation}</text>}
              <text x={x + obs.width / 2} y={height - (obs.elevation || 0) - (obs.height || 2100) / 2} fill="var(--obs-stroke)" fontSize="100" textAnchor="middle" dominantBaseline="middle" style={{ textTransform: 'uppercase', opacity: 0.5, pointerEvents: 'none' }} className="print:fill-black print:opacity-100">{obs.type}</text>
            </g>
          );
        })}
        {zone.cabinets.map((unit, idx) => renderCabinetDetail(unit, idx))}
      </svg>
    </div>
  );
};
