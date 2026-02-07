
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
  const [dragging, setDragging] = useState<{ type: 'cabinet' | 'obstacle', index: number, startX: number, originalX: number, currentX: number } | null>(null);
  const [previewPositions, setPreviewPositions] = useState<{ cabinets: Map<number, number>; obstacles: Map<number, number> } | null>(null);
  const [panning, setPanning] = useState<{
    startClientX: number;
    startClientY: number;
    startViewBox: { x: number; y: number; width: number; height: number };
  } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const GRID = 50; // mm (grid cell is 50x50)
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

  const clampX = (x: number, w: number) => {
    const max = Math.max(0, zone.totalLength - w);
    return Math.min(Math.max(0, x), max);
  };

  const clampViewBox = (vb: { x: number; y: number; width: number; height: number }) => {
    // Clamp zoom relative to the "base" viewbox size
    const minWidth = baseViewBox.width / MAX_ZOOM;
    const maxWidth = baseViewBox.width / MIN_ZOOM;
    let width = Math.min(Math.max(vb.width, minWidth), maxWidth);
    const scale = width / vb.width;
    let height = vb.height * scale;

    const minHeight = baseViewBox.height / MAX_ZOOM;
    const maxHeight = baseViewBox.height / MIN_ZOOM;
    height = Math.min(Math.max(height, minHeight), maxHeight);

    // Keep within a generous world-bounds so users can't "lose" the drawing
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

  const intervalsOverlap = (aX: number, aW: number, bX: number, bW: number) => {
    // strict overlap (touching edges is allowed)
    return aX < bX + bW && bX < aX + aW;
  };

  const computePushedLayout = (
    activeKind: 'cabinet' | 'obstacle',
    activeIndex: number,
    activeX: number
  ) => {
    // 1. Initialize data structures
    const cabinets = zone.cabinets.map((c, idx) => ({
      kind: 'cabinet' as const,
      index: idx,
      x: c.fromLeft,
      w: c.width,
      isActive: activeKind === 'cabinet' && idx === activeIndex,
      type: c.type,
    }));

    const obstacles = zone.obstacles.map((o, idx) => ({
      kind: 'obstacle' as const,
      index: idx,
      x: o.fromLeft,
      w: o.width,
      isActive: activeKind === 'obstacle' && idx === activeIndex,
      type: o.type,
      elevation: (o as any).elevation || 0,
      height: o.height || 2100,
    }));

    const activeItem = activeKind === 'cabinet' ? cabinets[activeIndex] : obstacles[activeIndex];
    if (!activeItem) return { cabinets: new Map(), obstacles: new Map() };

    const getVerticalRange = (item: any): [number, number] => {
      if (item.kind === 'obstacle') {
        const e = item.elevation || 0;
        const h = item.height || 2100;
        return [e, e + h];
      }
      if (item.type === CabinetType.TALL) return [150, 2250];
      if (item.type === CabinetType.WALL) return [1530, 2250];
      if (item.type === CabinetType.BASE) return [150, 870];
      return [150, 870];
    };

    const overlapsVertically = (a: any, b: any) => {
      const [minA, maxA] = getVerticalRange(a);
      const [minB, maxB] = getVerticalRange(b);
      return maxA > minB && maxB > minA;
    };

    const canPush = (pusher: any, target: any) => {
      if (target.kind === 'obstacle') return false;
      if (!overlapsVertically(pusher, target)) return false;

      if (pusher.kind === 'obstacle') return true;
      if (pusher.type === CabinetType.TALL) return true;
      if (pusher.type === CabinetType.WALL) return target.type === CabinetType.WALL;
      if (pusher.type === CabinetType.BASE) return target.type === CabinetType.BASE;
      return false;
    };

    // 2. Apply initial movement
    activeItem.x = clampX(activeX, activeItem.w);

    const allItems = [...cabinets, ...obstacles];

    // 3. Resolve Collisions (Blocking and Pushing)
    let changed = true;
    let iterations = 0;
    while (changed && iterations < 40) {
      changed = false;
      iterations++;

      for (const pusher of allItems) {
        for (const target of allItems) {
          if (pusher === target) continue;
          if (!overlapsVertically(pusher, target)) continue;
          if (!intervalsOverlap(pusher.x, pusher.w, target.x, target.w)) continue;

          if (canPush(pusher, target)) {
            const oldTargetX = target.x;
            if (pusher.x < target.x) target.x = clampX(pusher.x + pusher.w, target.w);
            else target.x = clampX(pusher.x - target.w, target.w);

            if (target.x !== oldTargetX) {
              changed = true;
            } else {
              const oldPusherX = pusher.x;
              if (pusher.x < target.x) pusher.x = Math.min(pusher.x, target.x - pusher.w);
              else pusher.x = Math.max(pusher.x, target.x + target.w);
              pusher.x = clampX(pusher.x, pusher.w);
              if (pusher.x !== oldPusherX) changed = true;
            }
          } else {
            const oldPusherX = pusher.x;
            if (pusher.x < target.x) pusher.x = Math.min(pusher.x, target.x - pusher.w);
            else pusher.x = Math.max(pusher.x, target.x + target.w);
            pusher.x = clampX(pusher.x, pusher.w);
            if (pusher.x !== oldPusherX) changed = true;
          }
        }
      }
    }

    const resCabinets = new Map<number, number>();
    const resObstacles = new Map<number, number>();
    cabinets.forEach(c => resCabinets.set(c.index, c.x));
    obstacles.forEach(o => resObstacles.set(o.index, o.x));

    return { cabinets: resCabinets, obstacles: resObstacles };
  };

  const getPointerX = (e: React.MouseEvent | React.TouchEvent) => {
    if (!svgRef.current) return 0;
    const CTM = svgRef.current.getScreenCTM();
    if (!CTM) return 0;
    let clientX = 0;
    if ('touches' in e) clientX = e.touches[0].clientX;
    else clientX = (e as React.MouseEvent).clientX;
    return (clientX - CTM.e) / CTM.a;
  };

  const handlePanStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (dragging) return;
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

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent, type: 'cabinet' | 'obstacle', index: number, currentX: number) => {
    e.stopPropagation();
    const startX = getPointerX(e);
    setDragging({ type, index, startX, originalX: currentX, currentX });
    setPreviewPositions(null);
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!dragging) return;
    const currentX = getPointerX(e);
    const delta = currentX - dragging.startX;
    let newX = dragging.originalX + delta;

    const maxWidth = zone.totalLength;
    if (newX < 0) newX = 0;

    let itemWidth = 0;
    if (dragging.type === 'cabinet') itemWidth = zone.cabinets[dragging.index].width;
    else itemWidth = zone.obstacles[dragging.index].width;

    if (newX + itemWidth > maxWidth) newX = maxWidth - itemWidth;

    newX = Math.round(newX / GRID) * GRID;
    newX = clampX(newX, itemWidth);

    const pushed = computePushedLayout(dragging.type, dragging.index, newX);
    setDragging((prev) => (prev ? { ...prev, currentX: newX } : prev));
    setPreviewPositions(pushed);
  };

  const handleMouseUp = () => {
    if (!dragging) return;

    const finalX = dragging.currentX;
    const pushed = computePushedLayout(dragging.type, dragging.index, finalX);

    if (onCabinetMove) {
      for (const [idx, x] of pushed.cabinets) {
        const cur = zone.cabinets[idx]?.fromLeft;
        if (cur == null) continue;
        if (Math.abs(cur - x) > 0.5) onCabinetMove(idx, x);
      }
    }
    if (onObstacleMove) {
      for (const [idx, x] of pushed.obstacles) {
        const cur = zone.obstacles[idx]?.fromLeft;
        if (cur == null) continue;
        if (Math.abs(cur - x) > 0.5) onObstacleMove(idx, x);
      }
    }

    setDragging(null);
    setPreviewPositions(null);
    onDragEnd?.();
  };

  const getCabinetX = (idx: number) => {
    const unit = zone.cabinets[idx];
    if (!unit) return 0;
    const x = previewPositions?.cabinets.get(idx) ?? unit.fromLeft;
    return clampX(x, unit.width);
  };
  const getObstacleX = (idx: number) => {
    const obs = zone.obstacles[idx];
    if (!obs) return 0;
    const x = previewPositions?.obstacles.get(idx) ?? obs.fromLeft;
    return clampX(x, obs.width);
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
    setViewBox((prev) => {
      const zoom = baseViewBox.width / prev.width;
      const nextW = baseViewBox.width / Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));
      const nextH = baseViewBox.height / Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));
      const centerX = prev.x + prev.width / 2;
      const centerY = prev.y + prev.height / 2;
      return clampViewBox({ x: centerX - nextW / 2, y: centerY - nextH / 2, width: nextW, height: nextH });
    });
  }, [zone.totalLength, height]);

  const renderCabinetDetail = (unit: CabinetUnit, index: number) => {
    const isTall = unit.type === CabinetType.TALL;
    const isWall = unit.type === CabinetType.WALL;
    let h = 720;
    let y = height - 150 - 720;

    if (isTall) { h = 2100; y = height - 150 - 2100; }
    else if (isWall) { h = 720; y = height - 150 - 2100; }

    const x = getCabinetX(index);
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
            <text x={x + w / 2} y={y + h - 25} textAnchor="middle" fontSize="12" fill={strokeColor} opacity="0.6">50mm NOTCH</text>
          </g>
        );
        break;
    }

    return (
      <g
        key={unit.id}
        onMouseDown={(e) => handleMouseDown(e, 'cabinet', index, x)}
        onTouchStart={(e) => handleMouseDown(e, 'cabinet', index, x)}
        onDoubleClick={(e) => { e.stopPropagation(); onCabinetClick?.(index); }}
        className="cursor-pointer hover:opacity-80 transition-opacity"
      >
        <rect x={x} y={y} width={w} height={h} fill={fillColor} stroke={strokeColor} strokeWidth="2" className="print:stroke-black print:stroke-2" />
        {details}
        <text x={x + w / 2} y={y + h / 2} fill="var(--text-color)" fontSize={Math.min(80, w / 3)} textAnchor="middle" dominantBaseline="middle" fontWeight="bold" style={{ pointerEvents: 'none' }} className="print:fill-black">{w}</text>
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

      <div className="absolute top-2 left-2 text-[10px] text-slate-400 font-mono z-10 px-2 rounded opacity-50 print-hidden">ELEVATION VIEW</div>

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
          .map((c, idx) => ({ c, idx, x: getCabinetX(idx) }))
          .sort((a, b) => a.x - b.x)
          .map(({ c, idx, x }) => (
            <g key={'dim' + c.id}>
              <line x1={x} y1="-50" x2={x + c.width} y2="-50" stroke="var(--wall-border)" strokeWidth="1" markerEnd="url(#arrow)" markerStart="url(#arrow)" />
              <text x={x + c.width / 2} y="-70" textAnchor="middle" fontSize="30" fill="var(--wall-border)" className="font-mono">{c.width}</text>
            </g>
          ))}

        {zone.cabinets
          .map((c, idx) => ({ c, idx, x: getCabinetX(idx) }))
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
          const x = getObstacleX(idx);
          return (
            <g key={obs.id}
              onMouseDown={(e) => handleMouseDown(e, 'obstacle', idx, x)}
              onTouchStart={(e) => handleMouseDown(e, 'obstacle', idx, x)}
              onDoubleClick={(e) => { e.stopPropagation(); onObstacleClick?.(idx); }}
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
