import React, { useEffect, useMemo, useRef, useState } from 'react';
import { jsPDF } from 'jspdf';
import { Button } from './Button';
import { exportCanvasToPDF, renderKitchenPlanToCanvas } from '../services/kitchenPlanRenderer';
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
      paddingPx: 24,
      scalePxPerMeter,
      background: 'transparent',
    });
  }, [data, scalePxPerMeter, size.width, size.height]);

  const handleGeneratePDF = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const baseName = title ? title.replace(/[^a-z0-9]/gi, '_').toLowerCase() : 'kitchen-plan';
    exportCanvasToPDF(canvas, {
      jsPDF,
      filename: `${baseName}.pdf`,
      marginMm: 10,
      format: 'a2',
      orientation: 'landscape',
    });
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-slate-900 dark:text-white font-black text-lg">{title ?? 'Top-Down Kitchen Plan'}</div>
          <div className="text-slate-500 text-xs font-bold uppercase tracking-wider">Plan View (XZ) + PDF Export</div>
        </div>
        <Button variant="secondary" size="md" onClick={handleGeneratePDF}>Generate PDF</Button>
      </div>

      <div
        ref={containerRef}
        className="w-full overflow-hidden bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800"
        style={{ height: '70vh', minHeight: 420, maxHeight: 900 }}
      >
        <canvas ref={canvasRef} className="w-full h-full" />
      </div>

      <div className="text-xs text-slate-500">
        Scale factor: <span className="font-mono">{scalePxPerMeter}px / 1m</span> (auto-fits if needed)
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
