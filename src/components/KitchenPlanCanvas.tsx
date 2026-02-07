import React, { useEffect, useMemo, useRef, useState } from 'react';
import { jsPDF } from 'jspdf';
import { Button } from './Button';
import { exportCanvasToPDF, renderKitchenPlanToCanvas } from '../services/planRenderer';
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

const KitchenPlanCanvasSingle: React.FC<SingleProps> = ({ data, scalePxPerMeter, title }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

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

    renderKitchenPlanToCanvas(canvas, data, {
      width: size.width,
      height: size.height,
      paddingPx: 20, // Reduced padding for better fill
      scalePxPerMeter,
      background: '#ffffff',
      forceFill: true,
    });
  }, [data, scalePxPerMeter, size.width, size.height]);

  const handleGeneratePDF = () => {
    // High-Res landscape A2 canvas
    const offScreenCanvas = document.createElement('canvas');
    const highResWidth = 4200;
    const highResHeight = 2970;

    renderKitchenPlanToCanvas(offScreenCanvas, data, {
      width: highResWidth,
      height: highResHeight,
      paddingPx: 100,
      scalePxPerMeter: 400,
      background: '#ffffff',
      forceFill: true,
      dprOverride: 1,
    });

    const baseName = title ? title.replace(/[^a-z0-9]/gi, '_').toLowerCase() : 'kitchen-plan';
    exportCanvasToPDF(offScreenCanvas, {
      jsPDF,
      filename: `${baseName}.pdf`,
      marginMm: 10,
      format: 'a2',
      orientation: 'landscape',
    });
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 p-4 md:p-8 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-slate-900 dark:text-white font-black text-2xl tracking-tight">{title ?? 'Top-Down Kitchen Plan'}</div>
          <div className="text-slate-500 text-xs font-bold uppercase tracking-widest opacity-60">Plan View (XZ) • Auto-Fit Optimized</div>
        </div>
        <Button variant="primary" size="lg" onClick={handleGeneratePDF} className="shadow-lg shadow-amber-500/10">Generate PDF</Button>
      </div>

      <div
        ref={containerRef}
        className="w-full overflow-hidden bg-white rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-center"
        style={{ height: '85vh', minHeight: 700 }}
      >
        <canvas ref={canvasRef} className="block shadow-sm" />
      </div>

      <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-widest">
        <div>Plan Render Mode: High-Precision XZ</div>
        <div>Fill Factor: Maximized</div>
      </div>
    </div>
  );
};

export function KitchenPlanCanvas({ data, scalePxPerMeter = 100 }: Props) {
  const safeData = useMemo(() => data ?? null, [data]);

  if (!safeData) return null;

  const walls = safeData.room?.walls ?? [];
  if (walls.length <= 1) {
    return <KitchenPlanCanvasSingle data={safeData} scalePxPerMeter={scalePxPerMeter} title={walls[0]?.wallId} />;
  }

  return (
    <div className="space-y-6">
      {walls.map((wall) => {
        const wallId = wall.wallId;
        const wallData: ConstructionPlanJSON = {
          ...safeData,
          room: {
            ...safeData.room,
            walls: [wall],
          },
          objects: (safeData.objects ?? []).filter((o) => !o.wallId || o.wallId === wallId),
        };

        return (
          <KitchenPlanCanvasSingle
            key={wallId}
            data={wallData}
            scalePxPerMeter={scalePxPerMeter}
            title={wallId}
          />
        );
      })}
    </div>
  );
}
