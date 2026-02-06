
import { BOMItem, OptimizationResult, SheetLayout, PlacedPart, ProjectSettings } from '../types';

// Simple Node for Guillotine Packing
interface Node {
  x: number;
  y: number;
  w: number;
  h: number;
  used: boolean;
  right?: Node;
  down?: Node;
}

const createNode = (x: number, y: number, w: number, h: number): Node => ({ x, y, w, h, used: false });

// Find a node that fits the part
const findNode = (root: Node, w: number, h: number): Node | null => {
  if (root.used) {
    return findNode(root.right!, w, h) || findNode(root.down!, w, h);
  } else if (w <= root.w && h <= root.h) {
    return root;
  }
  return null;
};

// Split the node after placing a part (Guillotine split)
const splitNode = (node: Node, w: number, h: number, kerf: number): Node => {
  node.used = true;
  // Create 'down' node (remaining vertical space)
  node.down = createNode(node.x, node.y + h + kerf, node.w, node.h - h - kerf);
  // Create 'right' node (remaining horizontal space NEXT to the placed part)
  node.right = createNode(node.x + w + kerf, node.y, node.w - w - kerf, h);
  return node;
};

export const optimizeCuts = (items: BOMItem[], settings: ProjectSettings): OptimizationResult => {
  const sheets: SheetLayout[] = [];
  
  // 1. Group items by material (we only nest panels, not hardware)
  const woodItems = items.filter(i => !i.isHardware);
  const materialGroups: Record<string, BOMItem[]> = {};
  
  woodItems.forEach(item => {
    if (!materialGroups[item.material]) materialGroups[item.material] = [];
    // Expand quantity into individual items for packing
    for (let i = 0; i < item.qty; i++) {
      materialGroups[item.material].push({ ...item }); // clone
    }
  });

  // 2. Process each material
  Object.keys(materialGroups).forEach(material => {
    // Sort parts by Area DESC (First Fit Decreasing heuristic)
    const parts = materialGroups[material].sort((a, b) => (b.width * b.length) - (a.width * a.length));
    
    // Create first sheet
    let currentSheetRoot: Node = createNode(0, 0, settings.sheetWidth, settings.sheetLength);
    let placedPartsInSheet: PlacedPart[] = [];
    
    // We need to track which parts are placed
    const remainingParts = [...parts];
    
    // Infinite loop protection
    let loopCount = 0;
    
    // Packing loop
    while (remainingParts.length > 0 && loopCount < 1000) {
      loopCount++;
      const currentSheetParts: PlacedPart[] = [];
      const partsToRetry: BOMItem[] = [];

      for (const part of remainingParts) {
        // Try fit normal
        let node = findNode(currentSheetRoot, part.width, part.length);
        let rotated = false;
        
        // Try fit rotated (if not found)
        if (!node) {
          node = findNode(currentSheetRoot, part.length, part.width);
          if (node) rotated = true;
        }

        if (node) {
          const w = rotated ? part.length : part.width;
          const h = rotated ? part.width : part.length;
          
          splitNode(node, w, h, settings.kerf);
          
          currentSheetParts.push({
            x: node.x,
            y: node.y,
            width: w,
            length: h,
            rotated,
            partId: part.id,
            label: `${part.name} (${part.label || ''})`
          });
        } else {
          partsToRetry.push(part);
        }
      }

      // Finish current sheet
      sheets.push({
        id: Math.random().toString(36).substr(2, 9),
        material,
        width: settings.sheetWidth,
        length: settings.sheetLength,
        parts: currentSheetParts,
        waste: 0 // Calculate later
      });

      // Prepare for next sheet
      remainingParts.length = 0;
      remainingParts.push(...partsToRetry);
      
      if (remainingParts.length > 0) {
        currentSheetRoot = createNode(0, 0, settings.sheetWidth, settings.sheetLength);
      }
    }
  });

  // 3. Calculate Waste
  sheets.forEach(sheet => {
    const totalArea = sheet.width * sheet.length;
    const usedArea = sheet.parts.reduce((acc, p) => acc + (p.width * p.length), 0);
    sheet.waste = Math.round(((totalArea - usedArea) / totalArea) * 100);
  });

  return {
    sheets,
    totalSheets: sheets.length,
    totalWaste: Math.round(sheets.reduce((acc, s) => acc + s.waste, 0) / sheets.length) || 0
  };
};
