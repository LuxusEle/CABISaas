import { DxfWriter, point3d, Units, LWPolylineFlags } from '@tarikjabiri/dxf';
import JSZip from 'jszip';
import { SheetLayout, ProjectSettings } from '../types';

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
    modelSpace.addLWPolyline(
      [
        { point: { x: part.x, y: part.y } },
        { point: { x: part.x + part.width, y: part.y } },
        { point: { x: part.x + part.width, y: part.y + part.length } },
        { point: { x: part.x, y: part.y + part.length } },
        { point: { x: part.x, y: part.y } }
      ],
      { flags: LWPolylineFlags.Closed, layerName: layerParts.name }
    );

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
