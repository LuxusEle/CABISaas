import type { ConstructionPlanJSON } from '../types/construction';

const UNIT_TO_METERS: Record<string, number> = {
  m: 1,
  cm: 0.01,
  mm: 0.001,
  in: 0.0254,
  ft: 0.3048,
};

function toMeters(value: number, lengthUnit: string): number {
  const factor = UNIT_TO_METERS[lengthUnit] ?? 1;
  return value * factor;
}

function getXZ(point: any): { x: number; z: number } {
  return { x: point?.x ?? 0, z: point?.z ?? 0 };
}

function computeBounds(data: ConstructionPlanJSON): { minX: number; maxX: number; minZ: number; maxZ: number } {
  const points: Array<{ x: number; z: number }> = [];

  const floorPoints = data?.room?.floorPolygon?.points ?? [];
  for (const p of floorPoints) points.push(getXZ(p));

  const walls = data?.room?.walls ?? [];
  for (const w of walls) {
    points.push(getXZ(w.from));
    points.push(getXZ(w.to));
  }

  const objects = data?.objects ?? [];
  for (const obj of objects) {
    if (obj?.category !== 'cabinet') continue;
    const pos = obj?.box?.position;
    const size = obj?.box?.size;
    if (!pos || !size) continue;
    const x0 = pos.x ?? 0;
    const z0 = pos.z ?? 0;
    const x1 = x0 + (size.length ?? 0);
    const z1 = z0 + (size.depth ?? 0);
    points.push({ x: x0, z: z0 }, { x: x1, z: z1 });
  }

  if (points.length === 0) return { minX: 0, maxX: 1, minZ: 0, maxZ: 1 };

  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;

  for (const p of points) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minZ = Math.min(minZ, p.z);
    maxZ = Math.max(maxZ, p.z);
  }

  if (!Number.isFinite(minX)) return { minX: 0, maxX: 1, minZ: 0, maxZ: 1 };
  return { minX, maxX, minZ, maxZ };
}

function pickScaleBarMeters(roomWidthMeters: number): number {
  const candidates = [0.25, 0.5, 1, 2, 3, 5];
  const target = Math.max(0.25, roomWidthMeters * 0.25);
  let best = candidates[0];
  let bestDiff = Math.abs(best - target);
  for (const c of candidates) {
    const diff = Math.abs(c - target);
    if (diff < bestDiff) {
      best = c;
      bestDiff = diff;
    }
  }
  return best;
}

function formatMeters(m: number): string {
  if (m >= 1) return `${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)} m`;
  const cm = m * 100;
  return `${cm % 1 === 0 ? cm.toFixed(0) : cm.toFixed(1)} cm`;
}

function cabinetFillForKind(kind?: string): string {
  switch (kind) {
    case 'sink_base':
      return 'rgba(15, 23, 42, 0.12)';
    case 'hood_unit':
      return 'rgba(15, 23, 42, 0.06)';
    default:
      return 'rgba(15, 23, 42, 0.08)';
  }
}

function drawFloor(ctx: CanvasRenderingContext2D, floorPointsPx: Array<{ x: number; y: number }>) {
  if (floorPointsPx.length < 3) return;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(floorPointsPx[0].x, floorPointsPx[0].y);
  for (let i = 1; i < floorPointsPx.length; i++) ctx.lineTo(floorPointsPx[i].x, floorPointsPx[i].y);
  ctx.closePath();

  ctx.fillStyle = '#ffffff';
  ctx.fill();

  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

function drawWalls(
  ctx: CanvasRenderingContext2D,
  walls: ConstructionPlanJSON['room']['walls'],
  mapPoint: (pt: { x: number; z: number }) => { x: number; y: number },
  scalePxPerMeter: number,
  lengthUnit: string
) {
  ctx.save();
  ctx.strokeStyle = '#0f172a';
  ctx.lineCap = 'butt';

  for (const wall of walls) {
    const from = getXZ(wall.from);
    const to = getXZ(wall.to);

    const ax = toMeters(from.x, lengthUnit);
    const az = toMeters(from.z, lengthUnit);
    const bx = toMeters(to.x, lengthUnit);
    const bz = toMeters(to.z, lengthUnit);

    const thicknessM = toMeters(wall.thickness ?? 0.12, lengthUnit);
    const lineWidth = Math.max(1, thicknessM * scalePxPerMeter);

    const a = mapPoint({ x: ax, z: az });
    const b = mapPoint({ x: bx, z: bz });

    const openings = wall.openings ?? [];
    if (!openings.length) {
      ctx.lineWidth = lineWidth;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      continue;
    }

    const dx = bx - ax;
    const dz = bz - az;
    const wallLen = Math.hypot(dx, dz) || 1;
    const ux = dx / wallLen;
    const uz = dz / wallLen;

    const cuts: Array<{ start: number; end: number }> = [];
    for (const op of openings) {
      const at = toMeters(op.atDistanceFromFromPoint ?? 0, lengthUnit);
      const w = toMeters(op.width ?? 0, lengthUnit);
      const start = Math.max(0, at - w / 2);
      const end = Math.min(wallLen, at + w / 2);
      if (end > start) cuts.push({ start, end });
    }
    cuts.sort((c1, c2) => c1.start - c2.start);

    const merged: Array<{ start: number; end: number }> = [];
    for (const c of cuts) {
      const last = merged[merged.length - 1];
      if (!last || c.start > last.end) merged.push({ ...c });
      else last.end = Math.max(last.end, c.end);
    }

    let cursor = 0;
    const segments: Array<{ start: number; end: number }> = [];
    for (const c of merged) {
      if (c.start > cursor) segments.push({ start: cursor, end: c.start });
      cursor = Math.max(cursor, c.end);
    }
    if (cursor < wallLen) segments.push({ start: cursor, end: wallLen });

    ctx.lineWidth = lineWidth;
    for (const seg of segments) {
      const sx = ax + ux * seg.start;
      const sz = az + uz * seg.start;
      const ex = ax + ux * seg.end;
      const ez = az + uz * seg.end;
      const s = mapPoint({ x: sx, z: sz });
      const e = mapPoint({ x: ex, z: ez });
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(e.x, e.y);
      ctx.stroke();
    }

    ctx.lineWidth = 1;
    for (const c of merged) {
      const mid = (c.start + c.end) / 2;
      const mx = ax + ux * mid;
      const mz = az + uz * mid;
      const p = mapPoint({ x: mx, z: mz });
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = '#0f172a';
      ctx.fill();
    }
  }

  ctx.restore();
}

function drawCabinets(
  ctx: CanvasRenderingContext2D,
  objects: ConstructionPlanJSON['objects'],
  mapPoint: (pt: { x: number; z: number }) => { x: number; y: number },
  lengthUnit: string
) {
  ctx.save();
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 2;
  ctx.font = '12px system-ui, -apple-system, Segoe UI, Roboto, Arial';

  for (const obj of objects ?? []) {
    if (obj?.category !== 'cabinet') continue;
    const pos = obj?.box?.position;
    const size = obj?.box?.size;
    if (!pos || !size) continue;

    const xM = toMeters(pos.x ?? 0, lengthUnit);
    const zM = toMeters(pos.z ?? 0, lengthUnit);
    const wM = toMeters(size.length ?? 0, lengthUnit);
    const dM = toMeters(size.depth ?? 0, lengthUnit);

    const p0 = mapPoint({ x: xM, z: zM });
    const p1 = mapPoint({ x: xM + wM, z: zM + dM });

    const x = Math.min(p0.x, p1.x);
    const y = Math.min(p0.y, p1.y);
    const w = Math.abs(p1.x - p0.x);
    const h = Math.abs(p1.y - p0.y);

    ctx.fillStyle = cabinetFillForKind(obj.cabinetKind);
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x, y, w, h);

    const label = String(obj.label ?? obj.id ?? '').trim();
    if (label) {
      const padding = 6;
      const maxWidth = Math.max(0, w - padding * 2);
      if (maxWidth > 20) {
        ctx.save();
        ctx.fillStyle = '#0f172a';
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'center';
        const text = label.length > 24 ? `${label.slice(0, 24)}…` : label;
        ctx.fillText(text, x + w / 2, y + h / 2, maxWidth);
        ctx.restore();
      }
    }
  }

  ctx.restore();
}

function drawScaleBar(
  ctx: CanvasRenderingContext2D,
  boundsMeters: { minX: number; maxX: number; minZ: number; maxZ: number },
  scalePxPerMeter: number,
  canvasWidth: number,
  canvasHeight: number
) {
  ctx.save();
  const roomWidth = Math.max(0.001, boundsMeters.maxX - boundsMeters.minX);
  const barM = pickScaleBarMeters(roomWidth);
  const barPx = barM * scalePxPerMeter;

  const margin = 18;
  const x0 = canvasWidth - margin - barPx;
  const y0 = canvasHeight - margin;

  ctx.strokeStyle = '#0f172a';
  ctx.fillStyle = '#0f172a';
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x0 + barPx, y0);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x0, y0 - 6);
  ctx.lineTo(x0, y0 + 6);
  ctx.moveTo(x0 + barPx, y0 - 6);
  ctx.lineTo(x0 + barPx, y0 + 6);
  ctx.stroke();

  ctx.font = '12px system-ui, -apple-system, Segoe UI, Roboto, Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText(formatMeters(barM), x0 + barPx / 2, y0 - 8);

  ctx.restore();
}

export type KitchenPlanRenderOptions = {
  width?: number;
  height?: number;
  paddingPx?: number;
  scalePxPerMeter?: number;
  background?: string;
};

export function renderKitchenPlanToCanvas(
  canvas: HTMLCanvasElement,
  data: ConstructionPlanJSON,
  options: KitchenPlanRenderOptions = {}
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const lengthUnit = data?.units?.lengthUnit ?? 'm';

  const {
    width = 1100,
    height = 700,
    paddingPx = 40,
    scalePxPerMeter = 100,
    background = '#f8fafc',
  } = options;

  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);

  const boundsRaw = computeBounds(data);
  const boundsMeters = {
    minX: toMeters(boundsRaw.minX, lengthUnit),
    maxX: toMeters(boundsRaw.maxX, lengthUnit),
    minZ: toMeters(boundsRaw.minZ, lengthUnit),
    maxZ: toMeters(boundsRaw.maxZ, lengthUnit),
  };

  const roomW = Math.max(0.001, boundsMeters.maxX - boundsMeters.minX);
  const roomH = Math.max(0.001, boundsMeters.maxZ - boundsMeters.minZ);

  const fitScale = Math.min((width - paddingPx * 2) / roomW, (height - paddingPx * 2) / roomH);
  const finalScale = Math.min(scalePxPerMeter, fitScale);

  const mapPoint = ({ x, z }: { x: number; z: number }) => {
    const px = paddingPx + (x - boundsMeters.minX) * finalScale;
    const py = paddingPx + (boundsMeters.maxZ - z) * finalScale;
    return { x: px, y: py };
  };

  const floorPoints = (data?.room?.floorPolygon?.points ?? []).map((p) => {
    const pt = getXZ(p);
    return mapPoint({ x: toMeters(pt.x, lengthUnit), z: toMeters(pt.z, lengthUnit) });
  });
  drawFloor(ctx, floorPoints);

  drawWalls(ctx, data?.room?.walls ?? [], mapPoint, finalScale, lengthUnit);
  drawCabinets(ctx, data?.objects ?? [], mapPoint, lengthUnit);
  drawScaleBar(ctx, boundsMeters, finalScale, width, height);
}

export type CanvasPdfExportOptions = {
  // The jsPDF constructor/class (passed in from the caller to keep this module UI-agnostic)
  jsPDF: any;
  filename?: string;
  marginMm?: number;
  format?: 'a0' | 'a1' | 'a2' | 'a3' | 'a4' | 'letter' | 'legal' | [number, number];
  orientation?: 'portrait' | 'landscape';
};

export function exportCanvasToPDF(canvas: HTMLCanvasElement, options: CanvasPdfExportOptions) {
  const {
    jsPDF,
    filename = 'kitchen-plan.pdf',
    marginMm = 10,
    format = 'a2',
    orientation = 'landscape',
  } = options;
  if (!jsPDF) throw new Error('jsPDF instance not provided');

  const imgData = canvas.toDataURL('image/png', 1.0);

  const pdf = new jsPDF({ orientation, unit: 'mm', format });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();

  const dpr = window.devicePixelRatio || 1;
  const logicalW = canvas.width / dpr;
  const logicalH = canvas.height / dpr;

  const pxToMm = (px: number) => (px * 25.4) / 96;
  const imgWmm = pxToMm(logicalW);
  const imgHmm = pxToMm(logicalH);

  const maxW = pageW - marginMm * 2;
  const maxH = pageH - marginMm * 2;
  const scale = Math.min(maxW / imgWmm, maxH / imgHmm);

  const drawW = imgWmm * scale;
  const drawH = imgHmm * scale;
  const x = (pageW - drawW) / 2;
  const y = (pageH - drawH) / 2;

  pdf.addImage(imgData, 'PNG', x, y, drawW, drawH, undefined, 'FAST');
  pdf.save(filename);
}
