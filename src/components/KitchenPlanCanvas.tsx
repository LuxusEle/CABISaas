import React, { useEffect, useMemo, useRef, useState } from 'react';
import { jsPDF } from 'jspdf';
import { Button } from './Button';
import { exportBOMToPDF, renderKitchenPlanToCanvas } from '../services/planRenderer';
import type { ConstructionPlanJSON } from '../types/construction';

type Props = {
  data: ConstructionPlanJSON | null;
  scalePxPerMeter?: number;
};

type SingleProps = {
  data: ConstructionPlanJSON;
  scalePxPerMeter: number;
  title?: string;
};

const KitchenPlanViewer: React.FC<SingleProps> = ({ data, scalePxPerMeter }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  // Forces Elevation Mode always
  const viewMode = 'elevation';

  const walls = useMemo(() => data.room?.walls ?? [], [data]);
  // Default to first wall if available
  const [activeWallId, setActiveWallId] = useState<string>(walls[0]?.wallId || '');

  // Synchronize if data changes
  useEffect(() => {
    if (!activeWallId && walls.length > 0) {
      setActiveWallId(walls[0].wallId);
    }
  }, [walls, activeWallId]);

  // Filter data based on active selection
  const renderData = useMemo(() => {
    if (!activeWallId) return data;

    const targetWall = walls.find(w => w.wallId === activeWallId);
    if (!targetWall) return data;

    return {
      ...data,
      room: {
        ...data.room,
        // Only show the specific wall
        walls: [targetWall]
      },
      objects: (data.objects ?? []).filter(o => !o.wallId || o.wallId === targetWall.wallId)
    };
  }, [data, activeWallId, walls]);

  const activeTitle = useMemo(() => {
    const w = walls.find(w => w.wallId === activeWallId);
    return w ? (w.wallId || 'Selected Wall') : 'Kitchen Elevation';
  }, [activeWallId, walls]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const ro = new ResizeObserver(() => {
      const nextWidth = Math.floor(el.clientWidth);
      const nextHeight = Math.floor(el.clientHeight);
      if (nextWidth <= 0 || nextHeight <= 0) return;
      setSize((prev) => (prev.width === nextWidth && prev.height === nextHeight ? prev : { width: nextWidth, height: nextHeight }));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (size.width <= 0 || size.height <= 0) return;

    renderKitchenPlanToCanvas(canvas, renderData, {
      width: size.width,
      height: size.height,
      paddingPx: 20,
      scalePxPerMeter,
      background: '#ffffff',
      forceFill: true,
      viewMode,
    });
  }, [renderData, scalePxPerMeter, size.width, size.height, viewMode]);

  const handleGeneratePDF = () => {
    // A2 landscape: 594mm x 420mm
    const pageWidthMm = 594;
    const pageHeightMm = 420;
    const dpi = 96;
    const mmToPx = mm => Math.round((mm / 25.4) * dpi);
    const canvasWidth = mmToPx(pageWidthMm);
    const canvasHeight = mmToPx(pageHeightMm);
    const offScreenCanvas = document.createElement('canvas');
    offScreenCanvas.width = canvasWidth;
    offScreenCanvas.height = canvasHeight;

    renderKitchenPlanToCanvas(offScreenCanvas, renderData, {
      width: canvasWidth,
      height: canvasHeight,
      paddingPx: 0,
      scalePxPerMeter: 400,
      background: '#ffffff',
      forceFill: true,
      dprOverride: 1,
      viewMode,
    });

    const baseName = activeTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    exportBOMToPDF(offScreenCanvas, {
      jsPDF,
      filename: `${baseName}_elevation.pdf`,
      marginMm: 0,
      format: 'a2',
      orientation: 'landscape',
    });
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 p-4 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-2">
          <div className="text-slate-900 dark:text-white font-black text-2xl tracking-tight leading-none">{activeTitle}</div>
          <div className="text-slate-500 text-xs font-bold uppercase tracking-widest opacity-60">
            Elevation View (XY)
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-end sm:items-center">
          {/* Wall Selector - Moved Here & Styled like Toggle */}
          {walls.length > 0 && (
            <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-lg flex gap-1">
              {walls.map(w => (
                <button
                  key={w.wallId}
                  onClick={() => setActiveWallId(w.wallId)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${activeWallId === w.wallId ? 'bg-white dark:bg-slate-600 shadow text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                  {w.wallId}
                </button>
              ))}
            </div>
          )}

          <Button variant="primary" size="lg" onClick={handleGeneratePDF} className="shadow-lg shadow-amber-500/10">
            PDF
          </Button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="w-full overflow-hidden bg-white rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-center"
        style={{ height: '85vh', minHeight: 700 }}
      >
        <canvas ref={canvasRef} className="block shadow-sm" />
      </div>

      <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-widest">
        <div>Mode: Elevation XY • {activeWallId === 'all' ? 'Full Room' : 'Single Zone'}</div>
        <div>Fill: Max</div>
      </div>
    </div>
  );
};

export function KitchenPlanCanvas({ data, scalePxPerMeter = 100 }: Props) {
  const safeData = useMemo(() => data ?? null, [data]);

  if (!safeData) return null;

  return (
    <div className="space-y-6">
      <KitchenPlanViewer data={safeData} scalePxPerMeter={scalePxPerMeter} />
    </div>
  );
}
