import React, { useEffect, useMemo, useRef } from 'react';
import { jsPDF } from 'jspdf';
import { Button } from './Button';
import { exportCanvasToPDF, renderKitchenPlanToCanvas } from '../services/kitchenPlanRenderer';

export function KitchenPlanCanvas({ data, scalePxPerMeter = 100 }) {
  const canvasRef = useRef(null);

  const safeData = useMemo(() => data ?? null, [data]);

  useEffect(() => {
    if (!safeData) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const parent = canvas.parentElement;
    const width = Math.max(720, Math.min(1400, parent?.clientWidth ?? 1100));

    renderKitchenPlanToCanvas(canvas, safeData, {
      width,
      height: 640,
      paddingPx: 40,
      scalePxPerMeter,
      background: 'transparent',
    });
  }, [safeData, scalePxPerMeter]);

  const handleGeneratePDF = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    exportCanvasToPDF(canvas, {
      jsPDF,
      filename: 'kitchen-plan.pdf',
      marginMm: 10,
    });
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-slate-900 dark:text-white font-black text-lg">Top-Down Kitchen Plan</div>
          <div className="text-slate-500 text-xs font-bold uppercase tracking-wider">Plan View (XZ) + PDF Export</div>
        </div>
        <Button variant="secondary" size="md" onClick={handleGeneratePDF}>Generate PDF</Button>
      </div>

      <div className="w-full overflow-auto">
        <canvas
          ref={canvasRef}
          className="bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800"
        />
      </div>

      <div className="text-xs text-slate-500">
        Scale factor: <span className="font-mono">{scalePxPerMeter}px / 1m</span> (auto-fits if needed)
      </div>
    </div>
  );
}
