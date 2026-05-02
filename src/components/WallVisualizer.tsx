import React, { useState, useRef, useEffect } from 'react';
import { Zone, CabinetUnit, PresetType, CabinetType, ProjectSettings } from '../types';
import { getActiveColor } from '../services/cabinetColors';
import { div } from 'three/tsl';

interface Props {
  zone: Zone;
  height: number;
  settings?: ProjectSettings;
  onCabinetClick?: (index: number) => void;
  onObstacleClick?: (index: number) => void;
  onCabinetMove?: (index: number, newX: number) => void;
  onObstacleMove?: (index: number, newX: number) => void;
  onDragEnd?: () => void;
  onSwapCabinets?: (index1: number, index2: number) => void;
  hideArrows?: boolean;
  selectedCabinet?: { zoneId: string, index: number } | null;
  draggedCabinet?: CabinetUnit | null;
  onDropCabinet?: (zoneId: string, fromLeft: number, cabinet: CabinetUnit) => void;
  isStatic?: boolean;
  forceWhite?: boolean;
  editLimits?: boolean;
  onLimitMove?: (type: 'start' | 'end', value: number) => void;
}

export const WallVisualizer: React.FC<Props> = ({
  zone, height, settings,
  onCabinetClick, onObstacleClick,
  onCabinetMove, onObstacleMove, onDragEnd,
  onSwapCabinets,
  hideArrows = false,
  selectedCabinet,
  draggedCabinet,
  onDropCabinet,
  isStatic = false,
  forceWhite = false,
  editLimits = false,
  onLimitMove
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
    width: (zone?.totalLength || 3000) + viewPadding * 2,
    height: (height || 2400) + 400,
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
    
    // Use project settings with fallbacks
    const baseHeight = settings?.baseHeight || 870;
    const wallHeight = settings?.wallHeight || 720;
    const counterThickness = settings?.counterThickness || 40;
    const tallHeight = (settings?.tallHeight === 2100 || !settings?.tallHeight) ? (baseHeight + counterThickness + (settings?.wallCabinetElevation || 450) + wallHeight) : settings.tallHeight;
    const toeKick = settings?.toeKickHeight || 100;
    
    let h = baseHeight - toeKick;
    let y = height - baseHeight;

    if (isTall) { 
        h = (unit.advancedSettings?.height || tallHeight) - toeKick; 
        y = (height || 2400) - tallHeight; 
    }
    else if (isWall) { 
        h = unit.advancedSettings?.height || wallHeight; 
        // Wall cabinet sits above counter top using settings
        const wallElevation = settings?.wallCabinetElevation || 450;
        // Top alignment: stay flush with the standard top edge
        y = (height || 2400) - baseHeight - counterThickness - wallElevation - wallHeight;
    }

    const x = unit.fromLeft;
    const w = unit.width;
    const isAuto = unit.isAutoFilled;
    const isSelected = selectedCabinet?.zoneId === zone.id && selectedCabinet?.index === index;
    const activeColor = getActiveColor(unit.preset);
    const strokeColor = isSelected ? '#3b82f6' : activeColor.stroke;
    const fillColor = isSelected ? 'rgba(59, 130, 246, 0.2)' : activeColor.fill;

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

    // --- Visual detail logic to match 3D ISO models ---
    const adv = unit.advancedSettings || {};
    
    // Align defaults with ScreenWallEditor sidebar logic
    const isSink = unit.preset === PresetType.SINK_UNIT;
    const isDrawerPreset = unit.preset === PresetType.BASE_DRAWER_3;
    const isOpenBox = unit.preset === PresetType.OPEN_BOX;

    const showDrawers = adv.showDrawers ?? false;
    const numDrawers = adv.numDrawers ?? (isSink ? 0 : 3);
    
    const showShelves = adv.showShelves ?? (isSink ? false : true);
    const numShelves = adv.numShelves ?? (isSink ? 0 : 2);
    
    const showDoors = adv.showDoors ?? true;

    const detailLines: React.ReactNode[] = [];
    const detailOpacity = "0.8"; // Increased for better visibility


    if (isTall) {
      // Tall cabinet sections
      const lowerH = adv.tallLowerSectionHeight ?? (settings?.baseHeight || 870) - toeKick;
      const upperH = adv.tallUpperSectionHeight ?? (settings?.wallHeight || 720);
      const dividerY = y + h - lowerH;
      
      // Horizontal divider for tall cabinet sections
      detailLines.push(<line key="tall-divider" x1={x} y1={dividerY} x2={x + w} y2={dividerY} stroke={strokeColor} strokeWidth="2" />);
      
      // Bottom panel of upper section
      const upperBottomY = y + upperH;
      // Only show if it's not effectively at the same position as the tall-divider
      if (Math.abs(upperBottomY - dividerY) > 5) {
        detailLines.push(<line key="tall-upper-bottom" x1={x} y1={upperBottomY} x2={x + w} y2={upperBottomY} stroke={strokeColor} strokeWidth="2" />);
      }
      
      // Upper section shelves
      if (adv.showShelves !== false && (adv.numShelves ?? 2) > 0) {
        const ns = adv.numShelves ?? 2;
        const spacing = upperH / ns;
        for (let i = 0; i < ns; i++) {
          const sy = y + spacing * i;
          detailLines.push(<line key={`upper-shelf-${i}`} x1={x + 2} y1={sy} x2={x + w - 2} y2={sy} stroke={strokeColor} strokeWidth="3" strokeDasharray="8,4" opacity={detailOpacity} />);
        }
      }

      // Lower section - drawers or shelves
      if (adv.showDrawers) {
        const nd = adv.numDrawers ?? 3;
        const stackH = adv.lowerSectionDrawerStackHeight ?? lowerH;
        const dh = stackH / nd;
        const startY = y + h - stackH;
        for (let i = 0; i < nd; i++) {
          const dy = startY + dh * i;
          // Drawer panel gap
          if (i > 0) {
            detailLines.push(<line key={`lower-drawer-line-${i}`} x1={x} y1={dy} x2={x + w} y2={dy} stroke={strokeColor} strokeWidth="2" />);
          }
          // Drawer handle indicator
          detailLines.push(
            <rect 
              key={`lower-drawer-handle-${i}`} 
              x={x + w / 2 - 20} 
              y={dy + 30} 
              width={40} 
              height={3} 
              fill={strokeColor} 
              rx="1.5"
              opacity="0.8"
            />
          );
        }
      } else if (adv.showLowerShelves !== false && (adv.numLowerShelves ?? 2) > 0) {
        const nls = adv.numLowerShelves ?? 2;
        const spacing = lowerH / (nls + 1);
        for (let i = 1; i <= nls; i++) {
          const sy = y + h - (spacing * i);
          detailLines.push(<line key={`lower-shelf-${i}`} x1={x + 2} y1={sy} x2={x + w - 2} y2={sy} stroke={strokeColor} strokeWidth="3" strokeDasharray="8,4" opacity={detailOpacity} />);
        }
      }

      // Upper door lines (V-lines)
      if (adv.showDoors !== false) {
        detailLines.push(<path key="upper-door-v" d={`M${x + w} ${y} L${x + w / 2} ${y + upperH / 2} L${x + w} ${y + upperH}`} fill="none" stroke={strokeColor} strokeWidth="1.5" opacity={detailOpacity} />);
      }
      // Lower door lines (V-lines)
      if (adv.showLowerDoors !== false && !adv.showDrawers) {
        detailLines.push(<path key="lower-door-v" d={`M${x + w} ${dividerY} L${x + w / 2} ${dividerY + lowerH / 2} L${x + w} ${y + h}`} fill="none" stroke={strokeColor} strokeWidth="1.5" opacity={detailOpacity} />);
      }

    } else if (unit.preset === PresetType.FILLER) {
      detailLines.push(<line key="filler-line" x1={x + w / 2} y1={y} x2={x + w / 2} y2={y + h} stroke={strokeColor} strokeWidth="1" strokeDasharray="4,2" />);
    } else if (unit.preset === PresetType.SINK_UNIT) {
      detailLines.push(
        <g key="sink-details">
          <rect x={x + 50} y={y - 10} width={w - 100} height={20} rx="2" fill="#94a3b8" />
          <path d={`M${x + w / 2 - 20} ${y - 10} L${x + w / 2 + 20} ${y - 10} L${x + w / 2} ${y - 60} Z`} fill="#94a3b8" />
          <path d={`M${x + w / 2} ${y - 60} Q${x + w / 2 + 20} ${y - 80} ${x + w / 2 + 30} ${y - 50}`} fill="none" stroke="#94a3b8" strokeWidth="4" />
          {/* Sink doors */}
          <line x1={x + w / 2} y1={y} x2={x + w / 2} y2={y + h} stroke={strokeColor} strokeWidth="1" opacity="0.3" />
          <path d={`M${x + w} ${y} L${x + w / 2} ${y + h / 2} L${x + w} ${y + h}`} fill="none" stroke={strokeColor} strokeWidth="0.5" opacity={detailOpacity} />
        </g>
      );
    } else if (unit.preset === PresetType.HOOD_UNIT) {
      // Hood specific details
      if (showShelves && numShelves > 0) {
        const spacing = h / (numShelves + 1);
        for (let i = 1; i <= numShelves; i++) {
          const sy = y + spacing * i;
          detailLines.push(
            <line 
              key={`shelf-line-${i}`} 
              x1={x + 2} 
              y1={sy} 
              x2={x + w - 2} 
              y2={sy} 
              stroke={strokeColor} 
              strokeWidth="3" 
              strokeDasharray="8,4" 
              opacity={detailOpacity} 
            />
          );
        }
      }
      
      // Optional: Add a subtle visual indicator for the hood area if needed, 
      // but usually the height difference is enough.
      detailLines.push(<path key="door-v" d={`M${x + w} ${y} L${x + w / 2} ${y + h / 2} L${x + w} ${y + h}`} fill="none" stroke={strokeColor} strokeWidth="1.5" opacity={detailOpacity} />);
    } else {
      // General Base/Wall cabinet logic
      
      // Drawers
      if (showDrawers && numDrawers > 0) {
        const dh = h / numDrawers;
        for (let i = 0; i < numDrawers; i++) {
          const dy = y + dh * i;
          // Drawer panel gap
          if (i > 0) {
            detailLines.push(<line key={`drawer-line-${i}`} x1={x} y1={dy} x2={x + w} y2={dy} stroke={strokeColor} strokeWidth="2" />);
          }
          // Drawer handle indicator
          detailLines.push(
            <rect 
              key={`drawer-handle-${i}`} 
              x={x + w / 2 - 20} 
              y={dy + 30} 
              width={40} 
              height={3} 
              fill={strokeColor} 
              rx="1.5"
              opacity="0.8"
            />
          );
        }
      } 
      // Shelves
      else if (showShelves && numShelves > 0) {
        const spacing = h / (numShelves + 1);
        for (let i = 1; i <= numShelves; i++) {
          const sy = y + spacing * i;
          detailLines.push(
            <line 
              key={`shelf-line-${i}`} 
              x1={x + 2} 
              y1={sy} 
              x2={x + w - 2} 
              y2={sy} 
              stroke={strokeColor} 
              strokeWidth="3" 
              strokeDasharray="8,4" 
              opacity={detailOpacity} 
            />
          );
        }
      }
      
      // Doors (V-lines)
      if (showDoors && !showDrawers) {
        if (w >= 600) {
          detailLines.push(<line key="door-split" x1={x + w / 2} y1={y} x2={x + w / 2} y2={y + h} stroke={strokeColor} strokeWidth="1" opacity="0.3" />);
        }
        detailLines.push(<path key="door-v" d={`M${x + w} ${y} L${x + w / 2} ${y + h / 2} L${x + w} ${y + h}`} fill="none" stroke={strokeColor} strokeWidth="1.5" opacity={detailOpacity} />);
      }
    }
    
    const details = <g>{detailLines}</g>;

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
          
          {/* Cabinet Label - Selection highlight ONLY, no text as per user request */}
          <g>
            {isSelected && (
              <rect
                x={x + 5}
                y={y + 5}
                width={w - 10}
                height={h - 10}
                rx="4"
                fill="none"
                stroke="#3b82f6"
                strokeWidth="4"
                strokeDasharray="10,5"
                className="animate-pulse"
              />
            )}
          </g>
          
          {/* Width Label - Outside (for editing view) */}
          {!hideArrows && (
            <text x={x + w / 2} y={y + h + 40} textAnchor="middle" fontSize="24" fontWeight="bold" fill="#475569" pointerEvents="none" className="font-mono">
              {unit.width}
            </text>
          )}
          
          {/* Width Label - Inside (for print view) */}
          {hideArrows && w > 60 && (
            <text 
              x={x + w / 2} 
              y={y + h / 2 + 40} 
              textAnchor="middle" 
              dominantBaseline="middle" 
              fontSize={Math.min(32, Math.max(16, w / 10))} 
              fontWeight="bold" 
              fill={strokeColor} 
              pointerEvents="none"
              opacity="0.5"
              style={{ fontSize: `${Math.min(32, Math.max(16, w / 10))}px` }}
            >
              {unit.width}mm
            </text>
          )}
          
          {details}
        </g>

        {/* Swap arrows removed as per user request */}
      </g>
    );

  };

  return (
    <div className="w-full h-full bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 overflow-hidden relative shadow-inner select-none print:border-none print:bg-white print:shadow-none">
      <style>{`
        :root { --bg-wall: #ffffff; --bg-void: #f1f5f9; --grid-line: #e2e8f0; --wall-border: #94a3b8; --cab-stroke: #f59e0b; --cab-fill: rgba(245, 158, 11, 0.2); --obs-stroke: #64748b; --obs-fill: #e2e8f0; --text-color: #f59e0b; }
        .dark { --bg-wall: #0F172A; --bg-void: #020617; --grid-line: #1e293b; --wall-border: #64748b; --cab-stroke: #fbbf24; --cab-fill: rgba(251, 191, 36, 0.1); --obs-stroke: #475569; --obs-fill: #1e293b; --text-color: #fbbf24; }
        .force-light { 
          --bg-wall: #f8fafc; 
          --bg-void: #fff; 
          --grid-line: #e2e8f0; 
          --wall-border: #64748b; 
          --cab-stroke: #475569; 
          --cab-fill: #f1f5f9; 
          --obs-stroke: #94a3b8; 
          --obs-fill: #f8fafc; 
          --text-color: #1e293b; 
        }
        @media print { 
          .print-hidden { display: none; } 
          .bg-slate-50, .dark .bg-slate-950 { background-color: white !important; } 
          svg { background-color: white !important; } 
          .dark { --bg-wall: #fff; --bg-void: #fff; --grid-line: #ccc; --wall-border: #000; --cab-stroke: #000; --cab-fill: #fff; --obs-stroke: #000; --obs-fill: #eee; --text-color: #000; } 
          :root { --bg-wall: #fff; --bg-void: #fff; --grid-line: #ccc; --wall-border: #000; --cab-stroke: #000; --cab-fill: #fff; --obs-stroke: #000; --obs-fill: #eee; --text-color: #000; } 
        }
      `}</style>


      <svg
        ref={svgRef}
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
        className={`w-full h-full ${forceWhite ? 'bg-white force-light' : 'bg-[var(--bg-void)]'} touch-none block`}
        preserveAspectRatio="xMidYMid meet"
        onWheel={isStatic ? undefined : handleWheel}
      >
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="3" markerHeight="3" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--wall-border)" />
          </marker>
          <marker id="tick" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="45">
            <line x1="0" y1="5" x2="10" y2="5" stroke="var(--wall-border)" strokeWidth="2" />
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
          onPointerUp={(e) => {
            if (draggedCabinet && onDropCabinet) {
              const { x: svgX } = clientToSvg(e.clientX, e.clientY);
              // Snap to grid or just use the mouse X
              onDropCabinet(zone.id, Math.max(0, Math.round(svgX)), draggedCabinet);
            }
          }}
          onMouseDown={isStatic ? undefined : handlePanStart}
          onTouchStart={isStatic ? undefined : handlePanStart}
          style={{ cursor: isStatic ? 'default' : (panning ? 'grabbing' : 'grab') }}
        />
        <rect
          data-pan="true"
          x="0"
          y="0"
          width={zone?.totalLength || 3000}
          height={height || 2400}
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

        {/* Alignment Guides - Show when a cabinet is selected */}
        {selectedCabinet && zone.cabinets[selectedCabinet.index] && (() => {
          const selCab = zone.cabinets[selectedCabinet.index];
          const otherEdges = new Set(
            zone.cabinets.flatMap((c, i) => i === selectedCabinet.index ? [] : [c.fromLeft, c.fromLeft + c.width])
          );
          
          // Edges of the selected cabinet
          const selEdges = [selCab.fromLeft, selCab.fromLeft + selCab.width];
          
          const allUniqueEdges = Array.from(new Set([...otherEdges, ...selEdges]));
          
          return allUniqueEdges.map((xPos) => {
            const isSelectedEdge = selEdges.includes(xPos);
            const isOtherEdge = otherEdges.has(xPos);
            const isAligned = isSelectedEdge && isOtherEdge; // Matches an external edge!
            
            return (
              <line
                key={`guide-${xPos}`}
                x1={xPos}
                y1={-200}
                x2={xPos}
                y2={height + 200}
                stroke={isAligned ? "#10b981" : isSelectedEdge ? "#3b82f6" : "var(--wall-border)"}
                strokeWidth={isAligned ? "4" : isSelectedEdge ? "2" : "1"}
                strokeDasharray={isAligned || isSelectedEdge ? "none" : "15,15"}
                opacity={isAligned ? "0.8" : isSelectedEdge ? "0.5" : "0.3"}
                className="pointer-events-none"
              />
            );
          });
        })()}

        <line x1="0" y1={height + 80} x2={zone.totalLength} y2={height + 80} stroke="var(--wall-border)" strokeWidth="2" markerEnd="url(#tick)" markerStart="url(#tick)" className="print:stroke-black" />
        <text x={zone.totalLength / 2} y={height + 130} textAnchor="middle" fill="var(--obs-stroke)" fontSize="50" fontWeight="black" className="print:fill-black font-mono">TOTAL {zone.totalLength}mm</text>

        {[...zone.cabinets]
          .map((c, idx) => ({ c, idx, x: c.fromLeft }))
          .sort((a, b) => a.x - b.x)
          .map(({ c, idx, x }) => (
            <g key={'dim' + c.id}>
              <line x1={x} y1="-80" x2={x + c.width} y2="-80" stroke="var(--wall-border)" strokeWidth="2" markerEnd="url(#tick)" markerStart="url(#tick)" />
              <text x={x + c.width / 2} y="-110" textAnchor="middle" fontSize="36" fontWeight="bold" fill="var(--wall-border)" className="font-mono">{c.width}</text>
            </g>
          ))}

        {zone.cabinets
          .map((c, idx) => ({ c, idx, x: c.fromLeft }))
          .filter(({ c }) => c.type === CabinetType.BASE)
          .map(({ c, x }) => {
            const baseH = settings?.baseHeight || 870;
            const tk = settings?.toeKickHeight || 100;
            const ct = settings?.counterThickness || 40;
            return (
            <g key={'ct' + c.id}>
              <rect x={x} y={height - baseH - ct} width={c.width} height={ct} fill="#475569" className="Print:fill-slate-200" />
              {c.preset === PresetType.BASE_DRAWER_3 && (
                <g>
                  <rect x={x + 50} y={height - baseH - ct - 5} width={c.width - 100} height={5} fill="#1e293b" rx="2" />
                  <text x={x + c.width / 2} y={height - baseH - ct - 10} textAnchor="middle" fontSize="12" fill="#475569" className="font-bold print:fill-black">HOB / COOKER</text>
                </g>
              )}
            </g>
          );
          })}

        <line x1="-100" y1={height} x2={zone.totalLength + 100} y2={height} stroke="var(--wall-border)" strokeWidth="4" className="print:stroke-black" />
        {zone.obstacles.filter(obs => !obs.id.startsWith('corner_')).map((obs, idx) => {
          const x = obs.fromLeft;
          return (
            <g key={obs.id}
              onClick={(e) => { e.stopPropagation(); onObstacleClick?.(idx); }}
              className="cursor-pointer hover:opacity-80 transition-opacity"
            >
              <rect 
                x={x} 
                y={height - (obs.type === 'window' && obs.sillHeight !== undefined ? obs.sillHeight : (obs.elevation || 0)) - (obs.height || 2100)} 
                width={obs.width} 
                height={obs.height || 2100} 
                fill="var(--obs-fill)" 
                stroke="var(--obs-stroke)" 
                strokeWidth="2" 
                fillOpacity="0.8" 
                className="print:stroke-black print:fill-slate-200" 
              />
              {obs.type === 'window' && (obs.sillHeight !== undefined || obs.elevation) && (
                <text 
                  x={x + obs.width / 2} 
                  y={height - 20} 
                  textAnchor="middle" 
                  fontSize="40" 
                  fill="var(--obs-stroke)" 
                  className="print:fill-black"
                >
                  {obs.sillHeight !== undefined ? `SILL: ${obs.sillHeight}` : `ELEV: ${obs.elevation}`}
                </text>
              )}
              <text 
                x={x + obs.width / 2} 
                y={height - (obs.type === 'window' && obs.sillHeight !== undefined ? obs.sillHeight : (obs.elevation || 0)) - (obs.height || 2100) / 2} 
                fill="var(--obs-stroke)" 
                fontSize="100" 
                textAnchor="middle" 
                dominantBaseline="middle" 
                style={{ textTransform: 'uppercase', opacity: 0.5, pointerEvents: 'none' }} 
                className="print:fill-black print:opacity-100"
              >
                {obs.type}
              </text>
            </g>
          );
        })}
        {/* Vertical Height Dimensions */}
        {(() => {
          const baseH = settings?.baseHeight || 870;
          const ct = settings?.counterThickness || 40;
          const wallElev = settings?.wallCabinetElevation || 450;
          const wallH = settings?.wallHeight || 720;
          
          const points = [
            { y: height, label: '0' },
            { y: height - baseH - ct, label: (baseH + ct).toString() },
            { y: height - baseH - ct - wallElev, label: (baseH + ct + wallElev).toString() },
            { y: height - baseH - ct - wallElev - wallH, label: (baseH + ct + wallElev + wallH).toString() },
            { y: 0, label: height.toString() }
          ].sort((a, b) => b.y - a.y);

          return (
            <g>
              <line x1="-150" y1="0" x2="-150" y2={height} stroke="var(--wall-border)" strokeWidth="2" markerStart="url(#tick)" markerEnd="url(#tick)" />
              {points.map((p, i) => (
                <g key={'vdim' + i}>
                  <line x1="-180" y1={p.y} x2="-120" y2={p.y} stroke="var(--wall-border)" strokeWidth="1" />
                  <text x="-200" y={p.y} textAnchor="end" dominantBaseline="middle" fontSize="30" fontWeight="bold" fill="var(--wall-border)" className="font-mono">{p.label}</text>
                </g>
              ))}
              <text x="-350" y={height / 2} textAnchor="middle" transform={`rotate(-90, -350, ${height / 2})`} fill="var(--wall-border)" fontSize="40" fontWeight="black" className="font-mono uppercase">Height mm</text>
            </g>
          );
        })()}

        {zone.cabinets.map((unit, idx) => renderCabinetDetail(unit, idx))}

        {/* Real-time Dimensions between Limits and Obstacles */}
        {editLimits && (() => {
          const s = zone.startLimit || 0;
          const e = zone.endLimit || zone.totalLength;
          const dims: React.ReactNode[] = [];
          
          // Distance between limits
          dims.push(
            <g key="dim-between">
              <line x1={s} y1={height - 100} x2={e} y2={height - 100} stroke="#f59e0b" strokeWidth="8" markerStart="url(#tick)" markerEnd="url(#tick)" />
              <text x={(s + e) / 2} y={height - 150} textAnchor="middle" dominantBaseline="middle" fontSize="80" fontWeight="black" className="fill-slate-900 dark:fill-white font-mono">{e - s}</text>
            </g>
          );

          // Find closest obstacles
          const obstacles = zone.obstacles.filter(o => !o.id.startsWith('corner_'));
          
          // 1. Start Limit to its RIGHT
          const nextRightOfS = [...obstacles].filter(o => o.fromLeft > s).sort((a, b) => a.fromLeft - b.fromLeft)[0];
          if (nextRightOfS) {
            const dist = Math.round(nextRightOfS.fromLeft - s);
            dims.push(
              <g key="dim-s-right">
                <line x1={s} y1="100" x2={nextRightOfS.fromLeft} y2="100" stroke="#64748b" strokeWidth="4" strokeDasharray="15,10" markerStart="url(#tick)" markerEnd="url(#tick)" />
                <text x={(s + nextRightOfS.fromLeft) / 2} y="50" textAnchor="middle" dominantBaseline="middle" fontSize="60" fontWeight="black" className="fill-slate-900 dark:fill-white font-mono">{dist}</text>
              </g>
            );
          }

          // 2. End Limit to its LEFT
          const nextLeftOfE = [...obstacles].filter(o => o.fromLeft + o.width < e).sort((a, b) => (b.fromLeft + b.width) - (a.fromLeft + a.width))[0];
          if (nextLeftOfE) {
            const dist = Math.round(e - (nextLeftOfE.fromLeft + nextLeftOfE.width));
            dims.push(
              <g key="dim-e-left">
                <line x1={nextLeftOfE.fromLeft + nextLeftOfE.width} y1="100" x2={e} y2="100" stroke="#64748b" strokeWidth="4" strokeDasharray="15,10" markerStart="url(#tick)" markerEnd="url(#tick)" />
                <text x={(nextLeftOfE.fromLeft + nextLeftOfE.width + e) / 2} y="50" textAnchor="middle" dominantBaseline="middle" fontSize="60" fontWeight="black" className="fill-slate-900 dark:fill-white font-mono">{dist}</text>
              </g>
            );
          }

          // 3. End Limit to its RIGHT (e.g. Door outside)
          const nextRightOfE = [...obstacles].filter(o => o.fromLeft > e).sort((a, b) => a.fromLeft - b.fromLeft)[0];
          if (nextRightOfE) {
            const dist = Math.round(nextRightOfE.fromLeft - e);
            dims.push(
              <g key="dim-e-right">
                <line x1={e} y1="100" x2={nextRightOfE.fromLeft} y2="100" stroke="#64748b" strokeWidth="4" strokeDasharray="15,10" markerStart="url(#tick)" markerEnd="url(#tick)" />
                <text x={(e + nextRightOfE.fromLeft) / 2} y="50" textAnchor="middle" dominantBaseline="middle" fontSize="60" fontWeight="black" className="fill-slate-900 dark:fill-white font-mono">{dist}</text>
              </g>
            );
          }
          
          // 4. Start Limit to its LEFT
          const nextLeftOfS = [...obstacles].filter(o => o.fromLeft + o.width < s).sort((a, b) => (b.fromLeft + b.width) - (a.fromLeft + a.width))[0];
          if (nextLeftOfS) {
            const dist = Math.round(s - (nextLeftOfS.fromLeft + nextLeftOfS.width));
            dims.push(
              <g key="dim-s-left">
                <line x1={nextLeftOfS.fromLeft + nextLeftOfS.width} y1="100" x2={s} y2="100" stroke="#64748b" strokeWidth="4" strokeDasharray="15,10" markerStart="url(#tick)" markerEnd="url(#tick)" />
                <text x={(nextLeftOfS.fromLeft + nextLeftOfS.width + s) / 2} y="50" textAnchor="middle" dominantBaseline="middle" fontSize="60" fontWeight="black" className="fill-slate-900 dark:fill-white font-mono">{dist}</text>
              </g>
            );
          }

          return dims;
        })()}

        {/* Wall Limits Overlay (Only in Edit Mode) */}
        {editLimits && (
          <g>
            {/* Darkened outside areas (Much lighter now) */}
            <rect 
              x="0" y="0" 
              width={zone.startLimit || 0} 
              height={height} 
              fill="rgba(0,0,0,0.15)" 
              className="pointer-events-none"
            />
            <rect 
              x={zone.endLimit || zone.totalLength} y="0" 
              width={zone.totalLength - (zone.endLimit || zone.totalLength)} 
              height={height} 
              fill="rgba(0,0,0,0.15)" 
              className="pointer-events-none"
            />

            {/* Start Limit Line */}
            <g 
              className="cursor-ew-resize group/limit"
              onPointerDown={(e) => {
                e.stopPropagation();
                const startX = e.clientX;
                const startLimit = zone.startLimit || 0;
                
                const handleMove = (moveEvent: PointerEvent) => {
                  const pt = clientToSvg(moveEvent.clientX, moveEvent.clientY);
                  onLimitMove?.('start', Math.round(pt.x));
                };
                
                const handleUp = () => {
                  window.removeEventListener('pointermove', handleMove);
                  window.removeEventListener('pointerup', handleUp);
                };
                
                window.addEventListener('pointermove', handleMove);
                window.addEventListener('pointerup', handleUp);
              }}
            >
              <line 
                x1={zone.startLimit || 0} y1="-100" 
                x2={zone.startLimit || 0} y2={height + 100} 
                stroke="#f59e0b" strokeWidth="8" strokeDasharray="20,10"
              />
              <rect 
                x={(zone.startLimit || 0) - 40} y={height / 2 - 60} 
                width="80" height="120" rx="20" fill="#f59e0b"
              />
              <text 
                x={zone.startLimit || 0} y={height / 2} 
                textAnchor="middle" dominantBaseline="middle" 
                fill="white" fontSize="24" fontWeight="black" transform={`rotate(-90, ${zone.startLimit || 0}, ${height / 2})`}
                className="pointer-events-none"
              >
                START
              </text>
            </g>

            {/* End Limit Line */}
            <g 
              className="cursor-ew-resize group/limit"
              onPointerDown={(e) => {
                e.stopPropagation();
                
                const handleMove = (moveEvent: PointerEvent) => {
                  const pt = clientToSvg(moveEvent.clientX, moveEvent.clientY);
                  onLimitMove?.('end', Math.round(pt.x));
                };
                
                const handleUp = () => {
                  window.removeEventListener('pointermove', handleMove);
                  window.removeEventListener('pointerup', handleUp);
                };
                
                window.addEventListener('pointermove', handleMove);
                window.addEventListener('pointerup', handleUp);
              }}
            >
              <line 
                x1={zone.endLimit || zone.totalLength} y1="-100" 
                x2={zone.endLimit || zone.totalLength} y2={height + 100} 
                stroke="#f59e0b" strokeWidth="8" strokeDasharray="20,10"
              />
              <rect 
                x={(zone.endLimit || zone.totalLength) - 40} y={height / 2 - 60} 
                width="80" height="120" rx="20" fill="#f59e0b"
              />
              <text 
                x={zone.endLimit || zone.totalLength} y={height / 2} 
                textAnchor="middle" dominantBaseline="middle" 
                fill="white" fontSize="24" fontWeight="black" transform={`rotate(-90, ${zone.endLimit || zone.totalLength}, ${height / 2})`}
                className="pointer-events-none"
              >
                END
              </text>
            </g>
          </g>
        )}
      </svg>
    </div>
  );
};
