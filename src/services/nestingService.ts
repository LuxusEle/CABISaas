
import { BOMItem, OptimizationResult, SheetLayout, PlacedPart, ProjectSettings } from '../types';

// Maximal rectangle bin packing for efficient space utilization
interface FreeRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const optimizeCuts = (items: BOMItem[], settings: ProjectSettings): OptimizationResult => {
  const sheets: SheetLayout[] = [];
  
  // 1. Group items by material
  const woodItems = items.filter(i => !i.isHardware);
  const materialGroups: Record<string, BOMItem[]> = {};
  
  woodItems.forEach(item => {
    if (!materialGroups[item.material]) materialGroups[item.material] = [];
    for (let i = 0; i < item.qty; i++) {
      materialGroups[item.material].push({ ...item });
    }
  });

  // 2. Process each material
  Object.keys(materialGroups).forEach(material => {
    // Sort by height DESC, then by width DESC for shelf-like packing
    const parts = materialGroups[material].sort((a, b) => {
      if (b.length !== a.length) return b.length - a.length;
      return b.width - a.width;
    });
    
    let remainingParts = [...parts];
    
    while (remainingParts.length > 0) {
      const currentSheetParts: PlacedPart[] = [];
      
      // Start with one free rectangle (the whole sheet)
      let freeRects: FreeRect[] = [{
        x: 0,
        y: 0,
        width: settings.sheetWidth,
        height: settings.sheetLength
      }];
      
      // Keep trying to place parts until no more can fit
      let madeProgress = true;
      while (madeProgress && remainingParts.length > 0) {
        madeProgress = false;
        const unplacedParts: BOMItem[] = [];
        
        for (const part of remainingParts) {
          let placed = false;
          let bestRectIndex = -1;
          let bestScore = Infinity;
          let rotated = false;
          
          // Find the best rectangle to place this part
          for (let i = 0; i < freeRects.length; i++) {
            const rect = freeRects[i];
            
            // Try normal orientation
            if (part.width <= rect.width && part.length <= rect.height) {
              // Score: prefer lower y (top), then lower x (left), minimize waste
              const score = rect.y * 10000 + rect.x + (rect.width - part.width) + (rect.height - part.length);
              if (score < bestScore) {
                bestScore = score;
                bestRectIndex = i;
                rotated = false;
              }
            }
            
            // Try rotated orientation
            if (part.length <= rect.width && part.width <= rect.height) {
              const score = rect.y * 10000 + rect.x + (rect.width - part.length) + (rect.height - part.width);
              if (score < bestScore) {
                bestScore = score;
                bestRectIndex = i;
                rotated = true;
              }
            }
          }
          
          if (bestRectIndex >= 0) {
            const rect = freeRects[bestRectIndex];
            const w = rotated ? part.length : part.width;
            const h = rotated ? part.width : part.length;
            
            // Place the part
            currentSheetParts.push({
              x: rect.x,
              y: rect.y,
              width: w,
              length: h,
              rotated,
              partId: part.id,
              label: `${part.name} (${part.label || ''})`
            });
            
            // Remove the used rectangle
            freeRects.splice(bestRectIndex, 1);
            
            // Split the remaining space into new free rectangles
            // Right rectangle (next to the placed part)
            if (rect.width - w - settings.kerf > 0) {
              freeRects.push({
                x: rect.x + w + settings.kerf,
                y: rect.y,
                width: rect.width - w - settings.kerf,
                height: h  // Same height for clean horizontal cut
              });
            }
            
            // Bottom rectangle (below the placed part)
            if (rect.height - h - settings.kerf > 0) {
              freeRects.push({
                x: rect.x,
                y: rect.y + h + settings.kerf,
                width: rect.width,
                height: rect.height - h - settings.kerf
              });
            }
            
            // Sort free rectangles: top-to-bottom, left-to-right
            freeRects.sort((a, b) => {
              if (a.y !== b.y) return a.y - b.y;
              return a.x - b.x;
            });
            
            placed = true;
            madeProgress = true;
          } else {
            // Couldn't place this part now, save for retry
            unplacedParts.push(part);
          }
        }
        
        remainingParts = unplacedParts;
      }

      // Finish current sheet
      sheets.push({
        id: Math.random().toString(36).substr(2, 9),
        material,
        width: settings.sheetWidth,
        length: settings.sheetLength,
        parts: currentSheetParts,
        waste: 0
      });
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
