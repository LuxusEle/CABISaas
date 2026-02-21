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

function getVisualElevationY(obj: any, lengthUnit: string, referenceTopM?: number): number {
  const kind = (obj.cabinetKind || '').toLowerCase();
  const factor = UNIT_TO_METERS[lengthUnit] ?? 1;

  // 1. Force alignment for Wall Cabinets & Hoods if we have a reference top
  if (kind.includes('wall') || kind.includes('hood')) {
    if (referenceTopM !== undefined) {
      // Align top to reference
      const hM = toMeters(obj?.box?.size?.height ?? 0, lengthUnit);
      const yM = referenceTopM - hM;
      return yM / factor;
    }
  }

  // 2. Otherwise, trust existing positive Y values
  const existingY = obj?.box?.position?.y ?? 0;
  const m = toMeters(existingY, lengthUnit);
  if (m > 0.1) return existingY;

  // 3. Fallback for Wall Cabinets if no reference and no existing Y (should be rare now with default ref)
  if (kind.includes('wall') || kind.includes('hood')) {
    return 1.45 / factor;
  }

  // Base/Tall usually start at 0
  return 0;
}

function getXZ(point: any): { x: number; z: number } {
  return { x: point?.x ?? 0, z: point?.z ?? 0 };
}

function computeBounds(data: ConstructionPlanJSON, viewMode: 'plan' | 'elevation'): { minX: number; maxX: number; minY: number; maxY: number } {
  const points: Array<{ x: number; y: number }> = [];

  // Initialize with a small fake bounds if empty
  const defaultBounds = { minX: 0, maxX: 1, minY: 0, maxY: 1 };

  // 1. Prioritize cabinets and walls for the "actual" drawing area
  const walls = data?.room?.walls ?? [];
  const lengthUnit = data?.units?.lengthUnit ?? 'm';

  if (viewMode === 'plan') {
    for (const w of walls) {
      if (w.from) points.push({ x: w.from.x ?? 0, y: w.from.z ?? 0 });
      if (w.to) points.push({ x: w.to.x ?? 0, y: w.to.z ?? 0 });
    }
  } else {
    // Elevation: X and Y (Height)
    // For elevation, we primarily care about the wall's length (X) and height (Y)
    // We assume the wall starts at 0,0 in local wall coordinates for this simple visualizer
    for (const w of walls) {
      // We'll use the wall length as max X
      const len = Math.sqrt(Math.pow((w.to?.x ?? 0) - (w.from?.x ?? 0), 2) + Math.pow((w.to?.z ?? 0) - (w.from?.z ?? 0), 2));
      points.push({ x: 0, y: 0 });
      points.push({ x: len, y: (w.height ?? 2.4) });
    }
  }

  const objects = data?.objects ?? [];
  let hasCabinets = false;

  if (viewMode === 'plan') {
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
      points.push({ x: x0, y: z0 }, { x: x1, y: z1 });
      hasCabinets = true;
    }

    // Only include floor points if it's tight or we have nothing else (Plan Only)
    if (!hasCabinets && points.length === 0) {
      const floorPoints = data?.room?.floorPolygon?.points ?? [];
      for (const p of floorPoints) points.push({ x: p.x ?? 0, y: p.z ?? 0 });
    }

  } else {
    // Elevation Logic
    // Compute reference top if possible to ensure bounds include raised cabinets
    let boundsRefTop: number | undefined;
    let maxTall = 0;
    let hasTall = false;
    for (const obj of objects) {
      if (obj.category === 'cabinet' && (obj.cabinetKind || '').toLowerCase().includes('tall')) {
        const h = toMeters(obj.box?.size?.height ?? 0, lengthUnit);
        const y = toMeters(obj.box?.position?.y ?? 0, lengthUnit);
        if (y + h > maxTall) maxTall = y + h;
        hasTall = true;
      }
    }
    if (hasTall) boundsRefTop = maxTall;

    for (const obj of objects) {
      if (obj?.category !== 'cabinet') continue;
      const pos = obj?.box?.position;
      const size = obj?.box?.size;
      if (!pos || !size) continue;

      const x0 = pos.x ?? 0;
      // Pass lengthUnit and boundsRefTop which are now defined
      const y0 = getVisualElevationY(obj, lengthUnit, boundsRefTop);
      const x1 = x0 + (size.length ?? 0);
      const y1 = y0 + (size.height ?? 0);

      points.push({ x: x0, y: y0 }, { x: x1, y: y1 });
    }
  }


  if (points.length === 0) return defaultBounds;

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const p of points) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }

  if (!Number.isFinite(minX)) return defaultBounds;
  return { minX, maxX, minY, maxY };
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
  mapPoint: (pt: { x: number; y: number }) => { x: number; y: number },
  finalScale: number,
  lengthUnit: string,
  viewMode: 'plan' | 'elevation'
) {
  const dpr = window.devicePixelRatio || 1;
  ctx.save();
  ctx.strokeStyle = '#64748b'; // Slate-500 for a cleaner look
  ctx.lineCap = 'round';

  if (viewMode === 'plan') {
    for (const wall of walls ?? []) {
      const fromM = { x: toMeters(getXZ(wall.from).x, lengthUnit), y: toMeters(getXZ(wall.from).z, lengthUnit) };
      const toM = { x: toMeters(getXZ(wall.to).x, lengthUnit), y: toMeters(getXZ(wall.to).z, lengthUnit) };
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
  } else {
    // Elevation: Draw the wall rectangle
    for (const wall of walls ?? []) {
      // length in meters
      const dx = (wall.to?.x ?? 0) - (wall.from?.x ?? 0);
      const dz = (wall.to?.z ?? 0) - (wall.from?.z ?? 0);
      const len = Math.sqrt(dx * dx + dz * dz);

      const lenM = toMeters(len, lengthUnit);
      const hM = toMeters(wall.height ?? 2.4, lengthUnit);

      const bl = mapPoint({ x: 0, y: 0 }); // Bottom Left (0,0)
      const tr = mapPoint({ x: lenM, y: hM }); // Top Right (len, h)

      ctx.fillStyle = '#f8fafc'; // Slate-50
      ctx.fillRect(bl.x, tr.y, tr.x - bl.x, bl.y - tr.y);
      // ctx.strokeRect(bl.x, tr.y, tr.x - bl.x, bl.y - tr.y); // Removed wall border as requested
    }
  }
  ctx.restore();
}

function drawObstacles(
  ctx: CanvasRenderingContext2D,
  walls: ConstructionPlanJSON['room']['walls'],
  mapPoint: (pt: { x: number; y: number }) => { x: number; y: number },
  lengthUnit: string,
  viewMode: 'plan' | 'elevation'
) {
  const dpr = window.devicePixelRatio || 1;
  ctx.save();
  ctx.strokeStyle = '#334155';
  ctx.fillStyle = '#cbd5e1';
  ctx.lineWidth = 1.5 * dpr;

  for (const wall of walls ?? []) {
    if (!wall.openings || wall.openings.length === 0) continue;

    const wx1 = toMeters(getXZ(wall.from).x, lengthUnit);
    const wz1 = toMeters(getXZ(wall.from).z, lengthUnit);
    const wx2 = toMeters(getXZ(wall.to).x, lengthUnit);
    const wz2 = toMeters(getXZ(wall.to).z, lengthUnit);

    const dx = wx2 - wx1;
    const dz = wz2 - wz1;
    const len = Math.sqrt(dx * dx + dz * dz);
    const ux = len > 0.001 ? dx / len : 1;
    const uz = len > 0.001 ? dz / len : 0;

    for (const op of wall.openings) {
      const distM = toMeters(op.atDistanceFromFromPoint, lengthUnit);
      const wM = toMeters(op.width, lengthUnit);
      const hM = toMeters(op.height, lengthUnit);
      const sillM = toMeters(op.sillHeight, lengthUnit);

      if (viewMode === 'plan') {
        const sx = wx1 + ux * distM;
        const sz = wz1 + uz * distM;
        const ex = wx1 + ux * (distM + wM);
        const ez = wz1 + uz * (distM + wM);

        const pStart = mapPoint({ x: sx, y: sz });
        const pEnd = mapPoint({ x: ex, y: ez });

        ctx.beginPath();
        ctx.moveTo(pStart.x, pStart.y);
        ctx.lineTo(pEnd.x, pEnd.y);
        ctx.save();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 4 * dpr;
        ctx.stroke();
        ctx.restore();

        ctx.beginPath();
        ctx.moveTo(pStart.x, pStart.y);
        ctx.lineTo(pEnd.x, pEnd.y);

        if (op.type === 'door') {
          ctx.setLineDash([5 * dpr, 5 * dpr]);
          ctx.stroke();
          ctx.setLineDash([]);
        } else if (op.type === 'window') {
          ctx.stroke();
        } else {
          ctx.stroke();
        }
      } else {
        // Elevation View
        const x0 = distM;
        const y0 = sillM;

        const p0 = mapPoint({ x: x0, y: y0 });
        const p1 = mapPoint({ x: x0 + wM, y: y0 + hM });

        const rx = Math.min(p0.x, p1.x);
        const ry = Math.min(p0.y, p1.y);
        const rw = Math.abs(p1.x - p0.x);
        const rh = Math.abs(p1.y - p0.y);

        ctx.fillStyle = '#e2e8f0';
        if (op.type === 'door') ctx.fillStyle = '#f1f5f9';

        ctx.fillRect(rx, ry, rw, rh);
        ctx.strokeRect(rx, ry, rw, rh);

        if (op.type === 'window') {
          ctx.beginPath();
          ctx.moveTo(rx, ry); ctx.lineTo(rx + rw, ry + rh);
          ctx.moveTo(rx + rw, ry); ctx.lineTo(rx, ry + rh);
          ctx.save();
          ctx.globalAlpha = 0.2;
          ctx.stroke();
          ctx.restore();
        } else if (op.type === 'door') {
          ctx.beginPath();
          ctx.arc(rx + rw * 0.85, ry + rh * 0.55, 3 * dpr, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    }
  }
  ctx.restore();
}

function drawCabinets(
  ctx: CanvasRenderingContext2D,
  objects: ConstructionPlanJSON['objects'],
  mapPoint: (pt: { x: number; y: number }) => { x: number; y: number },
  lengthUnit: string,
  viewMode: 'plan' | 'elevation',
  referenceTopM?: number
) {
  const dpr = window.devicePixelRatio || 1;
  ctx.save();
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 1 * dpr;

  for (const obj of objects ?? []) {
    if (obj.category !== 'cabinet') continue;
    const pos = obj.box.position;
    const size = obj.box.size;

    // Convert to meters
    const wM = toMeters(size.length, lengthUnit);

    let xC: number, yC: number, w: number, h: number;
    let label = String(obj.label || '').trim();
    // Get width in mm for display
    const widthMm = Math.round(size.length);

    if (viewMode === 'plan') {
      const xM = toMeters(pos.x, lengthUnit);
      const zM = toMeters(pos.z, lengthUnit);
      const dM = toMeters(size.depth, lengthUnit);

      const p0 = mapPoint({ x: xM, y: zM });
      const p1 = mapPoint({ x: xM + wM, y: zM + dM });

      xC = Math.min(p0.x, p1.x);
      yC = Math.min(p0.y, p1.y);
      w = Math.abs(p1.x - p0.x);
      h = Math.abs(p1.y - p0.y);
    } else {
      // Elevation View
      const xM = toMeters(pos.x, lengthUnit);

      // Use helper for Y to guarantee separation
      const rawY = getVisualElevationY(obj, lengthUnit, referenceTopM);
      const yM = toMeters(rawY, lengthUnit);
      const hM = toMeters(size.height, lengthUnit);

      // Map (x, y) -> canvas pixels
      // Y is usually Up in world, Down in canvas. mapPoint handles this if we pass world Y as second coord
      const p0 = mapPoint({ x: xM, y: yM }); // Bottom Left
      const p1 = mapPoint({ x: xM + wM, y: yM + hM }); // Top Right

      xC = Math.min(p0.x, p1.x);
      yC = Math.min(p0.y, p1.y);
      w = Math.abs(p1.x - p0.x);
      h = Math.abs(p1.y - p0.y);

      // Draw specifics for elevation (optional simple styling)
      // Visual indicator for wall vs base
      if (obj.cabinetKind?.includes('wall')) {
        // Optional: Draw a "mounting rail" line or similar if needed
      }
    }

    ctx.fillStyle = cabinetFillForKind(obj.cabinetKind);
    ctx.fillRect(xC, yC, w, h);
    ctx.strokeRect(xC, yC, w, h);

    // Draw cross for Base/Wall cabinets in elevation
    if (viewMode === 'elevation') {
      ctx.save();
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.1)';
      ctx.lineWidth = 1 * dpr;
      ctx.beginPath();
      if (obj.cabinetKind === 'wall' || obj.cabinetKind?.includes('wall')) {
        ctx.moveTo(xC, yC + h); ctx.lineTo(xC + w / 2, yC); ctx.lineTo(xC + w, yC + h);
      } else {
        // Base / Tall default
        // ctx.moveTo(xC, yC); ctx.lineTo(xC + w/2, yC + h/2); ctx.lineTo(xC + w, yC);
      }
      ctx.stroke();
      ctx.restore();
    }

    // Draw cabinet width in mm with big bold letters (inside cabinet box)
    if (w > 20 * dpr && h > 20 * dpr) {
      ctx.save();
      ctx.fillStyle = '#0f172a';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      // Calculate font size based on cabinet size (big but fits)
      const fontSize = Math.min(Math.round(w / 3), Math.round(h / 2), Math.round(24 * dpr));
      ctx.font = `bold ${fontSize}px system-ui, sans-serif`;
      ctx.fillText(`${widthMm}`, xC + w / 2, yC + h / 2, w - 8 * dpr);
      ctx.restore();
    }
  }
  ctx.restore();
}

function drawScaleBar(
  ctx: CanvasRenderingContext2D,
  boundsMeters: { minX: number; maxX: number; minY: number; maxY: number },
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
  viewMode?: 'plan' | 'elevation';
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
    viewMode = 'plan',
  } = options;

  console.log('[PlanRenderer] Drawing with viewMode:', viewMode);
  console.log('[PlanRenderer] Bounds Raw:', computeBounds(data, viewMode));

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
  const boundsRaw = computeBounds(data, viewMode);
  const boundsMeters = {
    minX: toMeters(boundsRaw.minX, lengthUnit),
    maxX: toMeters(boundsRaw.maxX, lengthUnit),
    minY: toMeters(boundsRaw.minY, lengthUnit),
    maxY: toMeters(boundsRaw.maxY, lengthUnit),
  };

  const roomW = Math.max(0.001, boundsMeters.maxX - boundsMeters.minX);
  const roomH = Math.max(0.001, boundsMeters.maxY - boundsMeters.minY);

  const availW = pWidth - pPadding * 2;
  // Reserve extra space at the bottom for the scale legend so it doesn't overlap
  const legendReservedHeight = 60 * dpr;
  const availH = pHeight - pPadding * 2 - legendReservedHeight;

  const scaleNoRot = Math.min(availW / roomW, availH / roomH);
  // Only rotate if plan view AND rotation helps. Elevation usually isn't rotated 90deg.
  const scaleRot = (viewMode === 'plan') ? Math.min(availW / roomH, availH / roomW) : 0;
  const shouldRotate = scaleRot > scaleNoRot;

  const bestScale = shouldRotate ? scaleRot : scaleNoRot;
  const finalScale = forceFill ? bestScale : Math.min(scalePxPerMeter * dpr, bestScale);

  const effectiveRoomW = shouldRotate ? roomH : roomW;
  const effectiveRoomH = shouldRotate ? roomW : roomH;

  const offsetX = (pWidth - effectiveRoomW * finalScale) / 2;
  // Center vertically within the space ABOVE the legend (move up)
  const offsetY = (pHeight - legendReservedHeight - effectiveRoomH * finalScale) / 2;

  const mapPoint = ({ x, y }: { x: number; y: number }) => {
    const dx = x - boundsMeters.minX;
    const dy = y - boundsMeters.minY;

    if (shouldRotate) {
      // Plan View Rotation (Z becomes X, X becomes Y)
      // This path is usually just for Plan mode
      const px = offsetX + dy * finalScale;
      const py = offsetY + dx * finalScale;
      return { x: px, y: py };
    } else {
      // Standard Mapping
      // X -> X
      // Y -> Y (flipped)
      const px = offsetX + dx * finalScale;
      // In Plan: Y is Z (depth), we map maxZ-z to flip
      // In Elevation: Y is Height, we map maxY-y to flip (Canvas 0 is top)
      const py = offsetY + (boundsMeters.maxY - y) * finalScale;
      return { x: px, y: py };
    }
  };

  // 3. Drawing
  if (viewMode === 'plan') {
    const floorPoints = (data?.room?.floorPolygon?.points ?? []).map((p) => {
      const pt = getXZ(p);
      return mapPoint({ x: toMeters(pt.x, lengthUnit), y: toMeters(pt.z, lengthUnit) });
    });
    if (floorPoints.length >= 3) {
      drawFloor(ctx, floorPoints);
    }
  }

  // Calculate Reference Top Alignment
  // We look for the highest point of any "Tall" or "Wall" cabinet to establish a common top line.
  // Usually, tall cabinets define the max height (e.g. 2.15m or 2.35m).
  const objects = data?.objects ?? [];
  let referenceTopM: number | undefined;

  if (viewMode === 'elevation') {
    let maxTop = 0;
    let hasReference = false;
    for (const obj of objects) {
      if (obj.category !== 'cabinet') continue;
      const kind = (obj.cabinetKind || '').toLowerCase();
      // We trust Tall cabinets (and Hoods often) to define the top line.
      // We also include Wall cabinets in the search if they have explicit Y, 
      // but usually we are TRYING to find Y for them.
      // So mostly look for Tall cabinets.
      if (kind.includes('tall')) {
        const h = toMeters(obj.box?.size?.height ?? 0, lengthUnit);
        const y = toMeters(obj.box?.position?.y ?? 0, lengthUnit);
        const top = y + h;
        if (top > maxTop) maxTop = top;
        hasReference = true;
      }
    }
    if (hasReference) {
      referenceTopM = maxTop;
    } else {
      // Default to 2.35m if no tall cabinets found to ensure top alignment consistency
      referenceTopM = 2.35;
    }
  }

  drawWalls(ctx, data?.room?.walls ?? [], mapPoint, finalScale, lengthUnit, viewMode);
  drawObstacles(ctx, data?.room?.walls ?? [], mapPoint, lengthUnit, viewMode);
  drawCabinets(ctx, data?.objects ?? [], mapPoint, lengthUnit, viewMode, referenceTopM);
  // drawCabinets(ctx, data?.objects ?? [], mapPoint, lengthUnit, viewMode); // Duplicate removed
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

// legacy exportCanvasToPDF removed — use exportBOMToPDF or exportInvoiceToPDF
  // BOM PDF Export: A2 Landscape
  export function exportBOMToPDF(canvas: HTMLCanvasElement, options: CanvasPdfExportOptions) {
    const {
      jsPDF,
      filename = 'bom-plan.pdf',
      marginMm = 0,
      format = 'a2',
      orientation = 'landscape',
    } = options;
    if (!jsPDF) throw new Error('jsPDF instance not provided');

    const imgData = canvas.toDataURL('image/png', 1.0);
    const pdf = new jsPDF({ orientation, unit: 'mm', format });
    pdf.setProperties({ title: filename });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const imgWpx = canvas.width;
    const imgHpx = canvas.height;
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
    while (pdf.getNumberOfPages() > 1) {
      pdf.deletePage(pdf.getNumberOfPages());
    }
    pdf.save(filename);
  }

  // Invoice PDF Export: A4 Portrait (for future use, if needed)
  export function exportInvoiceToPDF(canvas: HTMLCanvasElement, options: CanvasPdfExportOptions) {
    const {
      jsPDF,
      filename = 'invoice.pdf',
      marginMm = 10,
      format = 'a4',
      orientation = 'portrait',
    } = options;
    if (!jsPDF) throw new Error('jsPDF instance not provided');

    const imgData = canvas.toDataURL('image/png', 1.0);
    const pdf = new jsPDF({ orientation, unit: 'mm', format });
    pdf.setProperties({ title: filename });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const imgWpx = canvas.width;
    const imgHpx = canvas.height;
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
    while (pdf.getNumberOfPages() > 1) {
      pdf.deletePage(pdf.getNumberOfPages());
    }
    pdf.save(filename);
  }
