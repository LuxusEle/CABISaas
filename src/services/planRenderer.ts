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

  // Initialize with a small fake bounds if empty
  const defaultBounds = { minX: 0, maxX: 1, minZ: 0, maxZ: 1 };

  // 1. Prioritize cabinets and walls for the "actual" drawing area
  const walls = data?.room?.walls ?? [];
  for (const w of walls) {
    if (w.from) points.push(getXZ(w.from));
    if (w.to) points.push(getXZ(w.to));
  }

  const objects = data?.objects ?? [];
  let hasCabinets = false;
  for (const obj of objects) {
    if (obj?.category !== 'cabinet') continue;
    const pos = obj?.box?.position;
    const size = obj?.box?.size;
    if (!pos || !size) continue;

    // Ignore items at exact (0,0) if they are likely placeholder/uninitialized 
    // unless they are the only things there
    if (pos.x === 0 && pos.z === 0 && size.length === 0) continue;

    const x0 = pos.x ?? 0;
    const z0 = pos.z ?? 0;
    const x1 = x0 + (size.length ?? 0);
    const z1 = z0 + (size.depth ?? 0);
    points.push({ x: x0, z: z0 }, { x: x1, z: z1 });
    hasCabinets = true;
  }

  // 2. Only include floor points if it's tight or we have nothing else
  if (!hasCabinets && points.length === 0) {
    const floorPoints = data?.room?.floorPolygon?.points ?? [];
    for (const p of floorPoints) points.push(getXZ(p));
  }

  if (points.length === 0) return defaultBounds;

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

  if (!Number.isFinite(minX)) return defaultBounds;
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
  const dpr = window.devicePixelRatio || 1;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(floorPointsPx[0].x, floorPointsPx[0].y);
  for (let i = 1; i < floorPointsPx.length; i++) ctx.lineTo(floorPointsPx[i].x, floorPointsPx[i].y);
  ctx.closePath();

  ctx.fillStyle = '#ffffff';
  ctx.fill();

  // Removing floor stroke to eliminate the stray line around the room
  // ctx.strokeStyle = '#0f172a';
  // ctx.lineWidth = 1.5 * dpr;
  // ctx.stroke();
  ctx.restore();
}

function drawWalls(
  ctx: CanvasRenderingContext2D,
  walls: ConstructionPlanJSON['room']['walls'],
  mapPoint: (pt: { x: number; z: number }) => { x: number; y: number },
  finalScale: number,
  lengthUnit: string
) {
  const dpr = window.devicePixelRatio || 1;
  ctx.save();
  ctx.strokeStyle = '#64748b'; // Slate-500 for a cleaner look
  ctx.lineCap = 'round';

  for (const wall of walls ?? []) {
    const fromM = { x: toMeters(getXZ(wall.from).x, lengthUnit), z: toMeters(getXZ(wall.from).z, lengthUnit) };
    const toM = { x: toMeters(getXZ(wall.to).x, lengthUnit), z: toMeters(getXZ(wall.to).z, lengthUnit) };
    const a = mapPoint(fromM);
    const b = mapPoint(toM);

    // Using a thin consistent line instead of a physical-scaled thickness 
    // to avoid massive black bars in the on-screen preview.
    ctx.lineWidth = 2 * dpr;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    // ctx.stroke(); // Removed wall baseline to eliminate the "middle line" artifact
  }
  ctx.restore();
}

function drawCabinets(
  ctx: CanvasRenderingContext2D,
  objects: ConstructionPlanJSON['objects'],
  mapPoint: (pt: { x: number; z: number }) => { x: number; y: number },
  lengthUnit: string
) {
  const dpr = window.devicePixelRatio || 1;
  ctx.save();
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 1 * dpr;
  ctx.font = `${Math.round(10 * dpr)}px system-ui, sans-serif`;

  for (const obj of objects ?? []) {
    if (obj.category !== 'cabinet') continue;
    const pos = obj.box.position;
    const size = obj.box.size;
    const xM = toMeters(pos.x, lengthUnit);
    const zM = toMeters(pos.z, lengthUnit);
    const wM = toMeters(size.length, lengthUnit);
    const dM = toMeters(size.depth, lengthUnit);

    const p0 = mapPoint({ x: xM, z: zM });
    const p1 = mapPoint({ x: xM + wM, z: zM + dM });

    const x = Math.min(p0.x, p1.x);
    const y = Math.min(p0.y, p1.y);
    const w = Math.abs(p1.x - p0.x);
    const h = Math.abs(p1.y - p0.y);

    ctx.fillStyle = cabinetFillForKind(obj.cabinetKind);
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x, y, w, h);

    const label = String(obj.label || '').trim();
    if (label && w > 12 * dpr) {
      ctx.fillStyle = '#0f172a';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, x + w / 2, y + h / 2, w - 4 * dpr);
    }
  }
  ctx.restore();
}

function drawScaleBar(
  ctx: CanvasRenderingContext2D,
  boundsMeters: { minX: number; maxX: number; minZ: number; maxZ: number },
  scale: number,
  pWidth: number,
  pHeight: number
) {
  const dpr = window.devicePixelRatio || 1;
  const roomW = Math.max(0.001, boundsMeters.maxX - boundsMeters.minX);
  const barM = pickScaleBarMeters(roomW);
  const barPx = barM * scale;

  const margin = 24 * dpr;
  const x0 = pWidth - margin - barPx;
  const y0 = pHeight - margin;

  ctx.save();
  ctx.strokeStyle = '#0f172a';
  ctx.fillStyle = '#0f172a';
  ctx.lineWidth = 2 * dpr;

  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x0 + barPx, y0);
  ctx.moveTo(x0, y0 - 5 * dpr);
  ctx.lineTo(x0, y0 + 5 * dpr);
  ctx.moveTo(x0 + barPx, y0 - 5 * dpr);
  ctx.lineTo(x0 + barPx, y0 + 5 * dpr);
  ctx.stroke();

  ctx.font = `bold ${Math.round(11 * dpr)}px system-ui`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText(formatMeters(barM), x0 + barPx / 2, y0 - 6 * dpr);
  ctx.restore();
}

export type KitchenPlanRenderOptions = {
  width?: number;
  height?: number;
  paddingPx?: number;
  scalePxPerMeter?: number;
  background?: string;
  forceFill?: boolean;
  dprOverride?: number;
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
    background = '#ffffff',
    forceFill = false,
    dprOverride,
  } = options;

  // 1. Physical vs Logical sizing (DPI)
  const dpr = dprOverride ?? (window.devicePixelRatio || 1);
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  // We convert everything to physical pixels immediately to avoid context scaling errors
  const pWidth = canvas.width;
  const pHeight = canvas.height;
  const pPadding = paddingPx * dpr;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, pWidth, pHeight);
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, pWidth, pHeight);

  // 2. Coordinate Mapping Setup
  const boundsRaw = computeBounds(data);
  const boundsMeters = {
    minX: toMeters(boundsRaw.minX, lengthUnit),
    maxX: toMeters(boundsRaw.maxX, lengthUnit),
    minZ: toMeters(boundsRaw.minZ, lengthUnit),
    maxZ: toMeters(boundsRaw.maxZ, lengthUnit),
  };

  const roomW = Math.max(0.001, boundsMeters.maxX - boundsMeters.minX);
  const roomH = Math.max(0.001, boundsMeters.maxZ - boundsMeters.minZ);

  const availW = pWidth - pPadding * 2;
  const availH = pHeight - pPadding * 2;

  const scaleNoRot = Math.min(availW / roomW, availH / roomH);
  const scaleRot = Math.min(availW / roomH, availH / roomW);
  const shouldRotate = scaleRot > scaleNoRot;

  const bestScale = shouldRotate ? scaleRot : scaleNoRot;
  const finalScale = forceFill ? bestScale : Math.min(scalePxPerMeter * dpr, bestScale);

  const effectiveRoomW = shouldRotate ? roomH : roomW;
  const effectiveRoomH = shouldRotate ? roomW : roomH;

  const offsetX = (pWidth - effectiveRoomW * finalScale) / 2;
  const offsetY = (pHeight - effectiveRoomH * finalScale) / 2;

  const mapPoint = ({ x, z }: { x: number; z: number }) => {
    const dx = x - boundsMeters.minX;
    const dz = z - boundsMeters.minZ;

    if (shouldRotate) {
      const px = offsetX + dz * finalScale;
      const py = offsetY + dx * finalScale;
      return { x: px, y: py };
    } else {
      const px = offsetX + dx * finalScale;
      const py = offsetY + (boundsMeters.maxZ - z) * finalScale;
      return { x: px, y: py };
    }
  };

  // 3. Drawing
  const floorPoints = (data?.room?.floorPolygon?.points ?? []).map((p) => {
    const pt = getXZ(p);
    return mapPoint({ x: toMeters(pt.x, lengthUnit), z: toMeters(pt.z, lengthUnit) });
  });

  if (floorPoints.length >= 3) {
    drawFloor(ctx, floorPoints);
  }

  drawWalls(ctx, data?.room?.walls ?? [], mapPoint, finalScale, lengthUnit);
  drawCabinets(ctx, data?.objects ?? [], mapPoint, lengthUnit);
  drawScaleBar(ctx, boundsMeters, finalScale, pWidth, pHeight);
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

  // For high-res canvas exports, we don't divide by DPR because we want the pixel-perfect quality.
  // The scale calculation handles fitting the image to the page.
  const imgWpx = canvas.width;
  const imgHpx = canvas.height;

  // Assume 96 DPI for logical-to-mm conversion of the target area
  const pxToMm = (px: number) => (px * 25.4) / 96;
  const imgWmm = pxToMm(imgWpx);
  const imgHmm = pxToMm(imgHpx);

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
