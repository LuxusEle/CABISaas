import { DxfWriter, point3d, Units, LWPolylineFlags } from '@tarikjabiri/dxf';
import JSZip from 'jszip';
import { SheetLayout, ProjectSettings, CabinetUnit } from '../types';
import { PanelDrillingPattern, CabinetDrillingPattern, DrillingPoint } from './hardware';
import { generateCabinetDrillingPattern, generateAllCabinetDrillingPatterns } from './drillingService';

const SHEET_WIDTH = 1220;
const SHEET_HEIGHT = 2440;

export const generateSheetDXF = (sheet: SheetLayout, settings: ProjectSettings): string => {
  const writer = new DxfWriter();
  const kerf = settings.kerf || 4;

  writer.setUnits(Units.Millimeters);

  const layerSheetOutline = writer.tables.layerTable.addLayer('SHEET_OUTLINE', 7, 'CONTINUOUS');
  const layerParts = writer.tables.layerTable.addLayer('PARTS', 5, 'CONTINUOUS');
  const layerKerf = writer.tables.layerTable.addLayer('KERF', 1, 'CONTINUOUS');
  const layerLabels = writer.tables.layerTable.addLayer('LABELS', 2, 'CONTINUOUS');
  const layerDimensions = writer.tables.layerTable.addLayer('DIMENSIONS', 4, 'CONTINUOUS');
  const layerMachining = writer.tables.layerTable.addLayer('MACHINING', 1, 'CONTINUOUS'); // Red color

  const modelSpace = writer.modelSpace;

  modelSpace.addLWPolyline(
    [
      { point: { x: 0, y: 0 } },
      { point: { x: SHEET_WIDTH, y: 0 } },
      { point: { x: SHEET_WIDTH, y: SHEET_HEIGHT } },
      { point: { x: 0, y: SHEET_HEIGHT } },
      { point: { x: 0, y: 0 } }
    ],
    { flags: LWPolylineFlags.Closed, layerName: layerSheetOutline.name }
  );

  sheet.parts.forEach((part, _index) => {
    let cncData: any = null;
    part.features?.forEach(f => {
      try {
        const parsed = JSON.parse(f);
        if (parsed && parsed.cnc) cncData = parsed.cnc;
      } catch(e) {}
    });

    let points = [
      { point: { x: part.x, y: part.y } },
      { point: { x: part.x + part.width, y: part.y } }
    ];

    if (cncData && cncData.cutouts && cncData.cutouts.length > 0) {
       const cutouts = cncData.cutouts;
       const cncW = cncData.width;
       const cncH = cncData.height;
       
       let panelPoints = [{x: 0, y: 0}, {x: cncW, y: 0}];
       const sorted = [...cutouts].sort((a: any, b: any) => a.y - b.y);
       sorted.forEach((c: any) => {
         panelPoints.push({x: cncW, y: c.y});
         panelPoints.push({x: c.x, y: c.y});
         panelPoints.push({x: c.x, y: c.y + c.h});
         if (c.y + c.h < cncH - 0.1) panelPoints.push({x: cncW, y: c.y + c.h});
       });
       panelPoints.push({x: 0, y: cncH});
       
       if (cncData.mirrorX) {
         panelPoints.forEach(p => p.x = cncW - p.x);
       }
       
       points = panelPoints.map(p => {
          let fx, fy;
          if (part.rotated) {
            fx = part.x + p.y;
            fy = part.y + (cncW - p.x);
          } else {
            fx = part.x + p.x;
            fy = part.y + p.y;
          }
          return { point: { x: fx, y: fy } };
       });
    } else {
      points.push({ point: { x: part.x + part.width, y: part.y + part.length } });
      points.push({ point: { x: part.x, y: part.y + part.length } });
    }

    modelSpace.addLWPolyline([...points, points[0]], { flags: LWPolylineFlags.Closed, layerName: layerParts.name });

    modelSpace.addLine(
      point3d(part.x + part.width, part.y, 0),
      point3d(part.x + part.width, part.y + part.length, 0),
      { layerName: layerKerf.name }
    );
    modelSpace.addLine(
      point3d(part.x, part.y + part.length, 0),
      point3d(part.x + part.width + kerf, part.y + part.length, 0),
      { layerName: layerKerf.name }
    );

    const [partName, cabRef] = part.label.split(' (');
    const cabinetName = cabRef ? cabRef.replace(')', '') : '';
    
    const centerX = part.x + part.width / 2;
    const centerY = part.y + part.length / 2;

    const fontSize = Math.min(50, Math.max(20, Math.min(part.width, part.length) / 5));
    const showText = part.width > 100 && part.length > 100;

    if (showText) {
      const rotation = part.length > part.width ? 90 : 0;
      
      modelSpace.addText(
        point3d(centerX, centerY - fontSize * 0.3, 0),
        fontSize,
        partName,
        { layerName: layerLabels.name, rotation }
      );

      if (cabinetName) {
        modelSpace.addText(
          point3d(centerX, centerY + fontSize * 0.5, 0),
          fontSize * 0.7,
          cabinetName,
          { layerName: layerLabels.name, rotation }
        );
      }
    }

    const dimText = `${Math.round(part.length)}x${Math.round(part.width)}`;
    modelSpace.addText(
      point3d(part.x + 10, part.y + 28, 0),
      24,
      dimText,
      { layerName: layerDimensions.name }
    );

    if (cncData) {
      const cncW = cncData.width;
      const cncH = cncData.height;
      
      if (cncData.holes) {
        cncData.holes.forEach((hole: any) => {
           let cx = hole.z + cncW / 2;
           let cy = hole.y + cncH / 2;
           
           if (cncData.mirrorX) cx = cncW - cx;
           
           let fx, fy;
           if (part.rotated) {
             fx = part.x + cy;
             fy = part.y + (cncW - cx);
           } else {
             fx = part.x + cx;
             fy = part.y + cy;
           }
           const segments = 32;
           const pts = [];
           for (let i = 0; i <= segments; i++) {
             const angle = (i / segments) * 2 * Math.PI;
             pts.push({ point: { x: fx + hole.r * Math.cos(angle), y: fy + hole.r * Math.sin(angle) } });
           }
           modelSpace.addLWPolyline(pts, { flags: LWPolylineFlags.Closed, layerName: layerMachining.name });
        });
      }
      
      if (cncData.groove) {
         let gx = cncData.groove.x;
         let gy = cncData.groove.y;
         let gw = cncData.groove.w;
         let gh = cncData.groove.h;
         
         if (cncData.mirrorX) gx = cncW - gx - gw;
         
         let pts = [];
         if (part.rotated) {
            pts = [
              { point: { x: part.x + gy, y: part.y + (cncW - gx) } },
              { point: { x: part.x + gy, y: part.y + (cncW - (gx + gw)) } },
              { point: { x: part.x + (gy + gh), y: part.y + (cncW - (gx + gw)) } },
              { point: { x: part.x + (gy + gh), y: part.y + (cncW - gx) } }
            ];
         } else {
            pts = [
              { point: { x: part.x + gx, y: part.y + gy } },
              { point: { x: part.x + gx + gw, y: part.y + gy } },
              { point: { x: part.x + gx + gw, y: part.y + gy + gh } },
              { point: { x: part.x + gx, y: part.y + gy + gh } }
            ];
         }
         modelSpace.addLWPolyline([...pts, pts[0]], { flags: LWPolylineFlags.Closed, layerName: layerMachining.name });
      }
    } else {
      part.features?.forEach((feature) => {
        if (feature === 'gola-top-l') {
          const gWidth = 55;
          const gHeight = 55;
          const gX = part.rotated ? part.x + part.width - gWidth : part.x;
          const gY = part.y;
          
          modelSpace.addLWPolyline(
            [
              { point: { x: gX, y: gY } },
              { point: { x: gX + gWidth, y: gY } },
              { point: { x: gX + gWidth, y: gY + gHeight } },
              { point: { x: gX, y: gY + gHeight } },
              { point: { x: gX, y: gY } }
            ],
            { flags: LWPolylineFlags.Closed, layerName: layerMachining.name }
          );
        } else if (feature.startsWith('gola-mid-c:')) {
          const gh = parseFloat(feature.split(':')[1]);
          const thickness = settings.thickness || 18;
          const yOffsetFromBottom = gh - thickness / 2;
          const totalLen = part.rotated ? part.width : part.length;
          const yPosFromTop = totalLen - yOffsetFromBottom;
          
          const gWidth = part.rotated ? 73.5 : 35;
          const gHeight = part.rotated ? 35 : 73.5;
          const gX = part.rotated ? part.x + yPosFromTop - 36.75 : part.x;
          const gY = part.rotated ? part.y : part.y + yPosFromTop - 36.75;

          modelSpace.addLWPolyline(
            [
              { point: { x: gX, y: gY } },
              { point: { x: gX + gWidth, y: gY } },
              { point: { x: gX + gWidth, y: gY + gHeight } },
              { point: { x: gX, y: gY + gHeight } },
              { point: { x: gX, y: gY } }
            ],
            { flags: LWPolylineFlags.Closed, layerName: layerMachining.name }
          );
        } else if (feature === 'groove-back') {
          const thickness = settings.thickness || 18;
          const grooveWidth = (settings.backPanelThickness || 6) + 2;
          
          let gX, gY, gW, gH;
          if (part.rotated) {
            gX = part.x;
            gY = part.y + part.length - thickness - grooveWidth;
            gW = part.width;
            gH = grooveWidth;
          } else {
            gX = part.x + part.width - thickness - grooveWidth;
            gY = part.y;
            gW = grooveWidth;
            gH = part.length;
          }

          modelSpace.addLWPolyline(
            [
              { point: { x: gX, y: gY } },
              { point: { x: gX + gW, y: gY } },
              { point: { x: gX + gW, y: gY + gH } },
              { point: { x: gX, y: gY + gH } },
              { point: { x: gX, y: gY } }
            ],
            { flags: LWPolylineFlags.Closed, layerName: layerMachining.name }
          );
        } else if (feature === 'nail-holes') {
          const technicalR = (settings.nailHoleDiameter || 3) / 2;
          
          const holePositions = [
            { x: 50, y: 50 },
            { x: part.width - 50, y: 50 },
            { x: part.width - 50, y: part.length - 50 },
            { x: 50, y: part.length - 50 }
          ];

          holePositions.forEach(hp => {
            const segments = 16;
            const pts = [];
            for (let i = 0; i <= segments; i++) {
              const angle = (i / segments) * 2 * Math.PI;
              pts.push({ point: { x: part.x + hp.x + technicalR * Math.cos(angle), y: part.y + hp.y + technicalR * Math.sin(angle) } });
            }
            modelSpace.addLWPolyline(pts, { flags: LWPolylineFlags.Closed, layerName: layerMachining.name });
          });
        }
      });
    }
  });

  return writer.stringify();
};

export const exportAllSheetsToDXFZip = async (
  sheets: SheetLayout[],
  settings: ProjectSettings,
  projectName: string
): Promise<void> => {
  const zip = new JSZip();

  sheets.forEach((sheet, index) => {
    const dxfContent = generateSheetDXF(sheet, settings);
    const fileName = `sheet_${index + 1}_${sheet.material.replace(/[^a-z0-9]/gi, '_')}.dxf`;
    zip.file(fileName, dxfContent);
  });

  const blob = await zip.generateAsync({ type: 'blob' });
  
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${projectName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_cut_plans.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const exportSingleSheetToDXF = (
  sheet: SheetLayout,
  settings: ProjectSettings,
  index: number,
  projectName: string
): void => {
  const dxfContent = generateSheetDXF(sheet, settings);
  const blob = new Blob([dxfContent], { type: 'application/dxf' });
  
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${projectName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_sheet_${index + 1}.dxf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const generatePanelDrillingDXF = (panel: PanelDrillingPattern): string => {
  const writer = new DxfWriter();
  writer.setUnits(Units.Millimeters);

  const layerOutline = writer.tables.layerTable.addLayer('PANEL_OUTLINE', 7, 'CONTINUOUS');
  const layerCupHoles = writer.tables.layerTable.addLayer('CUP_HOLES', 1, 'CONTINUOUS');
  const layerScrewHoles = writer.tables.layerTable.addLayer('SCREW_HOLES', 2, 'CONTINUOUS');
  const layerMountingHoles = writer.tables.layerTable.addLayer('MOUNTING_HOLES', 3, 'CONTINUOUS');
  const layerCamHoles = writer.tables.layerTable.addLayer('CAM_HOLES', 4, 'CONTINUOUS');
  const layerConfirmatHoles = writer.tables.layerTable.addLayer('CONFIRMAT_HOLES', 5, 'CONTINUOUS');
  const layerLabels = writer.tables.layerTable.addLayer('LABELS', 6, 'CONTINUOUS');
  const layerDimensions = writer.tables.layerTable.addLayer('DIMENSIONS', 8, 'CONTINUOUS');

  const modelSpace = writer.modelSpace;

  modelSpace.addLWPolyline(
    [
      { point: { x: 0, y: 0 } },
      { point: { x: panel.width, y: 0 } },
      { point: { x: panel.width, y: panel.height } },
      { point: { x: 0, y: panel.height } },
      { point: { x: 0, y: 0 } }
    ],
    { flags: LWPolylineFlags.Closed, layerName: layerOutline.name }
  );

  panel.holes.forEach((hole) => {
    const radius = hole.diameter / 2;
    
    let layerName = layerLabels.name;
    switch (hole.type) {
      case 'cup':
        layerName = layerCupHoles.name;
        break;
      case 'screw':
      case 'pilot':
        layerName = layerScrewHoles.name;
        break;
      case 'mounting':
        layerName = layerMountingHoles.name;
        break;
      case 'cam':
      case 'clearance':
        layerName = layerCamHoles.name;
        break;
      case 'confirmat':
        layerName = layerConfirmatHoles.name;
        break;
    }

    const segments = 32;
    const points: { point: { x: number; y: number } }[] = [];
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * 2 * Math.PI;
      points.push({
        point: {
          x: hole.x + radius * Math.cos(angle),
          y: hole.y + radius * Math.sin(angle)
        }
      });
    }
    modelSpace.addLWPolyline(points, { flags: LWPolylineFlags.Closed, layerName });

    if (hole.label) {
      modelSpace.addText(
        point3d(hole.x + radius + 5, hole.y, 0),
        8,
        `${hole.label} (${hole.diameter}x${hole.depth})`,
        { layerName: layerLabels.name }
      );
    }
  });

  modelSpace.addText(
    point3d(10, panel.height + 20, 0),
    20,
    `${panel.panelName} - ${panel.width}x${panel.height}mm`,
    { layerName: layerDimensions.name }
  );

  modelSpace.addText(
    point3d(10, panel.height + 45, 0),
    14,
    `Holes: ${panel.holes.length}`,
    { layerName: layerDimensions.name }
  );

  return writer.stringify();
};

export const generateCabinetDrillingDXF = (
  cabinet: CabinetUnit,
  settings: ProjectSettings
): CabinetDrillingPattern => {
  return generateCabinetDrillingPattern(cabinet, settings);
};

export const exportCabinetDrillingToDXF = (
  cabinet: CabinetUnit,
  settings: ProjectSettings
): void => {
  const pattern = generateCabinetDrillingPattern(cabinet, settings);
  const zip = new JSZip();

  pattern.panels.forEach((panel, index) => {
    const dxfContent = generatePanelDrillingDXF(panel);
    const fileName = `${panel.panelName.toLowerCase().replace(/\s+/g, '_')}_${index + 1}.dxf`;
    zip.file(fileName, dxfContent);
  });

  zip.generateAsync({ type: 'blob' }).then((blob) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const cabinetLabel = cabinet.label || cabinet.preset;
    link.download = `${cabinetLabel.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_drilling.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  });
};

export const exportAllDrillingToZip = async (
  cabinets: CabinetUnit[],
  settings: ProjectSettings,
  projectName: string
): Promise<void> => {
  const zip = new JSZip();

  cabinets.forEach((cabinet) => {
    const pattern = generateCabinetDrillingPattern(cabinet, settings);
    const cabinetLabel = cabinet.label || cabinet.preset;
    const cabinetFolder = zip.folder(cabinetLabel.replace(/[^a-z0-9]/gi, '_'));

    if (cabinetFolder) {
      pattern.panels.forEach((panel, index) => {
        const dxfContent = generatePanelDrillingDXF(panel);
        const fileName = `${panel.panelName.toLowerCase().replace(/\s+/g, '_')}_${index + 1}.dxf`;
        cabinetFolder.file(fileName, dxfContent);
      });
    }
  });

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${projectName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_drilling_patterns.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
