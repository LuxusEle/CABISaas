import React, { useMemo } from 'react';
import * as THREE from 'three';
import { DxfWriter, Units, LWPolylineFlags, point3d } from '@tarikjabiri/dxf';
import JSZip from 'jszip';
import { 
  TestingSettings, 
  createPanelWithHolesGeo, 
  createDoorWithHingeHoles,
  panelColors,
  woodPalette,
  calculateNailHolePositions
} from './CabinetTestingUtils';

interface Props {
  settings: TestingSettings;
}

export const WallCornerCabinetTesting: React.FC<Props> = ({ settings }) => {
  const {
    width, height, depth, panelThickness, backPanelThickness,
    grooveDepth, backStretcherHeight, topStretcherWidth,
    showBackPanel, showBackStretchers, showShelves, numShelves,
    skeletonView, partsSeparatedView, selectedPart, showDifferentPanelColors,
    blindPanelWidth, blindCornerSide, doorMaterialThickness, doorOuterGap, doorToPanelGap,
    showDoors, doorOpenAngle, showHinges, hingeDiameter, hingeDepth, hingeHorizontalOffset, hingeVerticalOffset,
    showNailHoles, nailHoleDiameter, shelfHoleDiameter, nailHoleShelfDistance, shelfDepth, nailHoleDepth,
    wallBottomRecess, enableColumn, columnWidth, columnDepth
  } = settings;

  const isSelected = settings.isSelected;
  const baseColor = new THREE.Color(isSelected ? '#3b82f6' : woodPalette.carcass);
  const darkerColor = new THREE.Color(isSelected ? '#3b82f6' : woodPalette.carcass);
  const backPanelColor = new THREE.Color(isSelected ? '#60a5fa' : woodPalette.backPanel);
  const doorColor = new THREE.Color(isSelected ? '#2563eb' : woodPalette.door);
  const shelfColor = new THREE.Color(isSelected ? '#93c5fd' : woodPalette.shelf);

  const getPanelColor = (panelType: string): THREE.Color => {
    if (!showDifferentPanelColors) return darkerColor;
    return (panelColors as any)[panelType] || darkerColor;
  };

  const innerWidth = width;
  const innerHeight = height; // No toe kick for wall cabinets
  const innerDepth = depth;

  const getOffset = (part: string, index: number = 0): [number, number, number] => {
    if (!partsSeparatedView || selectedPart !== 'all' && selectedPart !== part) return [0, 0, 0];
    const d = 200;
    const offsets: Record<string, [number, number, number]> = {
      leftPanel: [-d, 0, 0],
      rightPanel: [d, 0, 0],
      bottomPanel: [0, -d * 1.5, 0],
      topPanel: [0, d * 1.5, 0],
      blindPanelFront: [0, 0, d],
      backPanel: [0, 0, -d],
      backStretcherTop: [0, 0, -d],
      backStretcherBottom: [0, 0, -d],
      door: [(index % 2 === 0 ? -1 : 1) * Math.ceil((index + 1) / 2) * d * 0.75, 0, d * 1.5],
      shelf: [0, 0, d * 2],
      upright: [0, 0, d]
    };
    return offsets[part] || [0, 0, 0];
  };

  const sidePanelHeight = innerHeight - panelThickness * 2;

  const sideHoles = useMemo(() => {
    if (!showNailHoles) return [];
    
    const positions: { y: number, z: number, r: number, through?: boolean }[] = [];
    const technicalR = nailHoleDiameter / 2;
    const shelfR = shelfHoleDiameter / 2;
    const zBack = -depth / 2 + panelThickness / 2;

    if (showBackStretchers) {
      const topStretcherYTop = sidePanelHeight / 2;
      const bottomStretcherYTop = -sidePanelHeight / 2 + wallBottomRecess + 100;
      
      positions.push({ y: topStretcherYTop - 25, z: zBack, r: technicalR, through: true });
      positions.push({ y: topStretcherYTop - 80, z: zBack, r: technicalR, through: true });
      
      positions.push({ y: bottomStretcherYTop - 25, z: zBack, r: technicalR, through: true });
      positions.push({ y: bottomStretcherYTop - 80, z: zBack, r: technicalR, through: true });
    }

    return positions;
  }, [showNailHoles, innerHeight, depth, panelThickness, backPanelThickness, nailHoleDiameter, shelfHoleDiameter, showBackStretchers, numShelves, showShelves, nailHoleShelfDistance, shelfDepth, wallBottomRecess, sidePanelHeight]);

  const uprightX = blindCornerSide === 'left'
    ? -width / 2 + blindPanelWidth + panelThickness / 2
    : width / 2 - blindPanelWidth - panelThickness / 2;

  const isGolaActive = settings.enableGola && showDoors;
  const isDoorOnLeft = blindCornerSide === 'right';
  const isDoorOnRight = blindCornerSide === 'left';
  const isLeftDoor = isDoorOnRight; // Hinges on the internal upright

  // Side Panels (Separate geometries for inward-facing grooves)
  const leftPanelGeo = useMemo(() => {
    const notches: any[] = [];
    const actualDepth = (enableColumn && blindCornerSide === 'left') ? depth - columnDepth : depth;
    const isBlindSide = enableColumn && blindCornerSide === 'left';
    const holes = [...sideHoles.filter(h => h.z < actualDepth/2 && h.z > -actualDepth/2)];
    if (showNailHoles && isBlindSide) {
      const zAttach = -actualDepth / 2 + panelThickness / 2;
      calculateNailHolePositions(sidePanelHeight).forEach(offset => {
        holes.push({ y: offset, z: zAttach, r: nailHoleDiameter / 2, through: true });
      });
    }

    // Shelf holes logic
    if (showShelves && numShelves > 0) {
      const availableHeight = innerHeight - panelThickness * 2;
      const spacing = availableHeight / (numShelves + 1);
      const shelfR = shelfHoleDiameter / 2;
      const shelfLengthFull = depth - panelThickness - backPanelThickness;
      const shelfZStartGlobal = -depth / 2 + panelThickness + backPanelThickness;
      const zCenterShelfFull = shelfZStartGlobal + shelfLengthFull / 2;
      const zOffset = isBlindSide ? columnDepth / 2 : 0;

      for (let i = 0; i < numShelves; i++) {
        const shelfYCabinet = -innerHeight / 2 + panelThickness + spacing * (i + 1);
        const holeY = shelfYCabinet - panelThickness - (shelfHoleDiameter / 2);
        
        if (isBlindSide) {
           const h1zGlobal = depth / 2 - 50;
           const h2zGlobal = -depth / 2 + columnDepth + 50;
           holes.push({ y: holeY, z: h1zGlobal - zOffset, r: shelfR, through: false });
           holes.push({ y: holeY, z: h2zGlobal - zOffset, r: shelfR, through: false });
        } else {
           const shelfHoleOffsets = calculateNailHolePositions(shelfLengthFull);
           const finalShelfOffsets = [shelfHoleOffsets[0], shelfHoleOffsets[shelfHoleOffsets.length - 1]];
           finalShelfOffsets.forEach(offset => {
             holes.push({ y: holeY, z: (zCenterShelfFull + offset) - zOffset, r: shelfR, through: false });
           });
        }
      }
    }

    return createPanelWithHolesGeo(
      panelThickness, sidePanelHeight, actualDepth,
      -actualDepth / 2 + panelThickness, -actualDepth / 2 + panelThickness + backPanelThickness,
      isBlindSide ? 0 : grooveDepth, 'px', holes, nailHoleDepth, 0, 0,
      notches
    );
  }, [panelThickness, sidePanelHeight, innerHeight, depth, backPanelThickness, grooveDepth, sideHoles, nailHoleDepth, isGolaActive, isDoorOnLeft, settings.golaLCutoutDepth, settings.golaLCutoutHeight, enableColumn, blindCornerSide, columnDepth, showShelves, numShelves, shelfHoleDiameter, nailHoleShelfDistance]);

  const rightPanelGeo = useMemo(() => {
    const notches: any[] = [];
    const actualDepth = (enableColumn && blindCornerSide === 'right') ? depth - columnDepth : depth;
    const isBlindSide = enableColumn && blindCornerSide === 'right';
    const holes = [...sideHoles.filter(h => h.z < actualDepth/2 && h.z > -actualDepth/2)];
    if (showNailHoles && isBlindSide) {
      const zAttach = -actualDepth / 2 + panelThickness / 2;
      calculateNailHolePositions(sidePanelHeight).forEach(offset => {
        holes.push({ y: offset, z: zAttach, r: nailHoleDiameter / 2, through: true });
      });
    }

    // Shelf holes logic
    if (showShelves && numShelves > 0) {
      const availableHeight = innerHeight - panelThickness * 2;
      const spacing = availableHeight / (numShelves + 1);
      const shelfR = shelfHoleDiameter / 2;
      const shelfLengthFull = depth - panelThickness - backPanelThickness;
      const shelfZStartGlobal = -depth / 2 + panelThickness + backPanelThickness;
      const zCenterShelfFull = shelfZStartGlobal + shelfLengthFull / 2;
      const zOffset = isBlindSide ? columnDepth / 2 : 0;

      for (let i = 0; i < numShelves; i++) {
        const shelfYCabinet = -innerHeight / 2 + panelThickness + spacing * (i + 1);
        const holeY = shelfYCabinet - panelThickness - (shelfHoleDiameter / 2);
        
        if (isBlindSide) {
           const h1zGlobal = depth / 2 - 50;
           const h2zGlobal = -depth / 2 + columnDepth + 50;
           holes.push({ y: holeY, z: h1zGlobal - zOffset, r: shelfR, through: false });
           holes.push({ y: holeY, z: h2zGlobal - zOffset, r: shelfR, through: false });
        } else {
           const shelfHoleOffsets = calculateNailHolePositions(shelfLengthFull);
           const finalShelfOffsets = [shelfHoleOffsets[0], shelfHoleOffsets[shelfHoleOffsets.length - 1]];
           finalShelfOffsets.forEach(offset => {
             holes.push({ y: holeY, z: (zCenterShelfFull + offset) - zOffset, r: shelfR, through: false });
           });
        }
      }
    }

    return createPanelWithHolesGeo(
      panelThickness, sidePanelHeight, actualDepth,
      -actualDepth / 2 + panelThickness, -actualDepth / 2 + panelThickness + backPanelThickness,
      isBlindSide ? 0 : grooveDepth, 'nx', holes, nailHoleDepth, 0, 0,
      notches
    );
  }, [panelThickness, sidePanelHeight, innerHeight, depth, backPanelThickness, grooveDepth, sideHoles, nailHoleDepth, isGolaActive, isDoorOnRight, settings.golaLCutoutDepth, settings.golaLCutoutHeight, enableColumn, blindCornerSide, columnDepth, showShelves, numShelves, shelfHoleDiameter, nailHoleShelfDistance]);

  const bottomPanelHoles = useMemo(() => {
    if (!showNailHoles) return [];
    const technicalR = nailHoleDiameter / 2;
    const holes: { y: number, z: number, r: number, through?: boolean }[] = [];
    const lpX = -innerWidth / 2 + panelThickness / 2;
    const rpX = innerWidth / 2 - panelThickness / 2;
    
    const isLeftShortened = enableColumn && blindCornerSide === 'left';
    const isRightShortened = enableColumn && blindCornerSide === 'right';
    const actualLeftDepth = isLeftShortened ? depth - columnDepth : depth;
    const actualRightDepth = isRightShortened ? depth - columnDepth : depth;

    // Side panel holes
    calculateNailHolePositions(actualLeftDepth).forEach(offset => {
      // If shortened, it's flush with the front (depth/2)
      const centerZ = isLeftShortened ? depth / 2 - actualLeftDepth / 2 : 0;
      holes.push({ y: lpX, z: centerZ + offset, r: technicalR, through: true });
    });
    calculateNailHolePositions(actualRightDepth).forEach(offset => {
      // If shortened, it's flush with the front (depth/2)
      const centerZ = isRightShortened ? depth / 2 - actualRightDepth / 2 : 0;
      holes.push({ y: rpX, z: centerZ + offset, r: technicalR, through: true });
    });

    if (enableColumn) {
      const columnSideX = blindCornerSide === 'left' ? -width / 2 + columnWidth + panelThickness / 2 : width / 2 - columnWidth - panelThickness / 2;
      const columnSideCenterZ = -depth / 2 + columnDepth / 2;
      calculateNailHolePositions(columnDepth).forEach(offset => {
        holes.push({ y: columnSideX, z: columnSideCenterZ + offset, r: technicalR, through: true });
      });

      const columnBackCenterY = blindCornerSide === 'left' ? -width / 2 + columnWidth / 2 + panelThickness : width / 2 - columnWidth / 2 - panelThickness;
      const columnBackZ = -depth / 2 + columnDepth + panelThickness / 2;
      calculateNailHolePositions(columnWidth).forEach(offset => {
        holes.push({ y: columnBackCenterY + offset, z: columnBackZ, r: technicalR, through: true });
      });
    }

    if (showBackStretchers) {
      const bbsZ = -depth / 2 + panelThickness / 2;
      const backWidth = enableColumn ? innerWidth - columnWidth : innerWidth;
      const startX = (enableColumn && blindCornerSide === 'left') ? -innerWidth / 2 + columnWidth : -innerWidth / 2;
      calculateNailHolePositions(backWidth).forEach(offset => {
        holes.push({ y: startX + backWidth / 2 + offset, z: bbsZ, r: technicalR, through: true });
      });
    }

    const zCenterUpright = depth / 2 - topStretcherWidth / 2;
    calculateNailHolePositions(topStretcherWidth).forEach(offset => {
      holes.push({ y: uprightX, z: zCenterUpright + offset, r: technicalR, through: true });
    });

    return holes;
  }, [showNailHoles, nailHoleDiameter, innerWidth, innerDepth, depth, width, panelThickness, showBackStretchers, uprightX, topStretcherWidth, enableColumn, columnWidth, columnDepth, blindCornerSide]);

  const topPanelHoles = useMemo(() => {
    if (!showNailHoles) return [];
    const technicalR = nailHoleDiameter / 2;
    const holes: { y: number, z: number, r: number, through?: boolean }[] = [];
    const lpX = -innerWidth / 2 + panelThickness / 2;
    const rpX = innerWidth / 2 - panelThickness / 2;
    
    const isLeftShortened = enableColumn && blindCornerSide === 'left';
    const isRightShortened = enableColumn && blindCornerSide === 'right';
    const actualLeftDepth = isLeftShortened ? depth - columnDepth : depth;
    const actualRightDepth = isRightShortened ? depth - columnDepth : depth;

    // Side panel holes
    calculateNailHolePositions(actualLeftDepth).forEach(offset => {
      const centerZ = isLeftShortened ? depth / 2 - actualLeftDepth / 2 : 0;
      holes.push({ y: lpX, z: centerZ + offset, r: technicalR, through: true });
    });
    calculateNailHolePositions(actualRightDepth).forEach(offset => {
      const centerZ = isRightShortened ? depth / 2 - actualRightDepth / 2 : 0;
      holes.push({ y: rpX, z: centerZ + offset, r: technicalR, through: true });
    });

    if (enableColumn) {
      const columnSideX = blindCornerSide === 'left' ? -width / 2 + columnWidth + panelThickness / 2 : width / 2 - columnWidth - panelThickness / 2;
      const columnSideCenterZ = -depth / 2 + columnDepth / 2;
      calculateNailHolePositions(columnDepth).forEach(offset => {
        holes.push({ y: columnSideX, z: columnSideCenterZ + offset, r: technicalR, through: true });
      });

      const columnBackCenterY = blindCornerSide === 'left' ? -width / 2 + columnWidth / 2 + panelThickness : width / 2 - columnWidth / 2 - panelThickness;
      const columnBackZ = -depth / 2 + columnDepth + panelThickness / 2;
      calculateNailHolePositions(columnWidth).forEach(offset => {
        holes.push({ y: columnBackCenterY + offset, z: columnBackZ, r: technicalR, through: true });
      });
    }

    if (showBackStretchers) {
      const bbsZ = -depth / 2 + panelThickness / 2;
      const backWidth = enableColumn ? innerWidth - columnWidth : innerWidth;
      const startX = (enableColumn && blindCornerSide === 'left') ? -innerWidth / 2 + columnWidth : -innerWidth / 2;
      calculateNailHolePositions(backWidth).forEach(offset => {
        holes.push({ y: startX + backWidth / 2 + offset, z: bbsZ, r: technicalR, through: true });
      });
    }

    const zCenterUpright = depth / 2 - topStretcherWidth / 2;
    calculateNailHolePositions(topStretcherWidth).forEach(offset => {
      holes.push({ y: uprightX, z: zCenterUpright + offset, r: technicalR, through: true });
    });

    return holes;
  }, [showNailHoles, nailHoleDiameter, innerWidth, innerDepth, depth, width, panelThickness, showBackStretchers, uprightX, topStretcherWidth, enableColumn, columnWidth, columnDepth, blindCornerSide]);

  // Bottom Panel
  const bottomPanelGeo = useMemo(() => {
    const notches: any[] = [];
    if (enableColumn) {
      notches.push({
        u: -innerDepth / 2 + columnDepth / 2,
        v: blindCornerSide === 'left' ? -innerWidth / 2 + columnWidth / 2 : innerWidth / 2 - columnWidth / 2,
        width: columnDepth,
        height: columnWidth,
        alignV: 'center',
        side: 'uMin'
      });
    }
    const gStartOffset = (enableColumn && blindCornerSide === 'right') ? columnWidth + panelThickness : panelThickness;
    const gEndOffset = (enableColumn && blindCornerSide === 'left') ? columnWidth + panelThickness : panelThickness;

    return createPanelWithHolesGeo(
      panelThickness, innerWidth, innerDepth,
      -innerDepth / 2 + panelThickness, -innerDepth / 2 + panelThickness + backPanelThickness,
      grooveDepth, 'py', bottomPanelHoles, nailHoleDepth, gStartOffset, gEndOffset,
      notches
    );
  }, [innerWidth, panelThickness, innerDepth, backPanelThickness, grooveDepth, bottomPanelHoles, nailHoleDepth, enableColumn, columnWidth, columnDepth, blindCornerSide]);

  // Top Panel
  const topPanelGeo = useMemo(() => {
    const notches: any[] = [];
    if (enableColumn) {
      notches.push({
        u: -innerDepth / 2 + columnDepth / 2,
        v: blindCornerSide === 'left' ? -innerWidth / 2 + columnWidth / 2 : innerWidth / 2 - columnWidth / 2,
        width: columnDepth,
        height: columnWidth,
        alignV: 'center',
        side: 'uMin'
      });
    }
    const gStartOffset = (enableColumn && blindCornerSide === 'right') ? columnWidth + panelThickness : panelThickness;
    const gEndOffset = (enableColumn && blindCornerSide === 'left') ? columnWidth + panelThickness : panelThickness;

    return createPanelWithHolesGeo(
      panelThickness, innerWidth, innerDepth,
      -innerDepth / 2 + panelThickness, -innerDepth / 2 + panelThickness + backPanelThickness,
      grooveDepth, 'ny', topPanelHoles, nailHoleDepth, gStartOffset, gEndOffset,
      notches
    );
  }, [innerWidth, panelThickness, innerDepth, backPanelThickness, grooveDepth, topPanelHoles, nailHoleDepth, enableColumn, columnWidth, columnDepth, blindCornerSide]);

  const blindWidthFront = blindPanelWidth - doorOuterGap * 2;
  const doorWidth = width - blindPanelWidth - doorOuterGap * 2;
  
  const blindPanelHeight = innerHeight;
  let doorHeight = innerHeight + (isGolaActive ? settings.doorOverride : 0);
  let doorYOffset = isGolaActive ? -settings.doorOverride / 2 : 0;

  const blindPanelHoles = useMemo(() => {
    if (!showNailHoles) return [];
    
    const technicalR = nailHoleDiameter / 2;
    const holes: { y: number, z: number, r: number, through?: boolean }[] = [];
    
    // Top Panel hit points
    const yTopPanel = innerHeight / 2 - panelThickness / 2;
    holes.push({ y: yTopPanel, z: -blindWidthFront / 2 + 50, r: technicalR, through: true });
    holes.push({ y: yTopPanel, z: 0, r: technicalR, through: true });
    holes.push({ y: yTopPanel, z: blindWidthFront / 2 - 50, r: technicalR, through: true });

    // Bottom panel hit points
    const yBottomPanel = -innerHeight / 2 + panelThickness / 2 + wallBottomRecess;
    holes.push({ y: yBottomPanel, z: -blindWidthFront / 2 + 50, r: technicalR, through: true });
    holes.push({ y: yBottomPanel, z: 0, r: technicalR, through: true });
    holes.push({ y: yBottomPanel, z: blindWidthFront / 2 - 50, r: technicalR, through: true });

    // Side panel hit points
    const sidePanelLocalX = blindCornerSide === 'left' 
      ? panelThickness / 2 - blindPanelWidth / 2 
      : blindPanelWidth / 2 - panelThickness / 2;
      
    calculateNailHolePositions(blindPanelHeight).forEach(offset => {
      holes.push({ y: offset, z: sidePanelLocalX, r: technicalR, through: true });
    });

    return holes;
  }, [showNailHoles, nailHoleDiameter, innerHeight, panelThickness, blindWidthFront, blindCornerSide, blindPanelWidth, blindPanelHeight, wallBottomRecess]);


  const rotationDirection = isLeftDoor ? -1 : 1;
  const doorPivotX = isLeftDoor ? -doorWidth / 2 : doorWidth / 2;
  const doorAngleRad = THREE.MathUtils.degToRad(doorOpenAngle || 0);

  const hingeXOffset = isLeftDoor 
    ? -doorWidth / 2 + hingeHorizontalOffset 
    : doorWidth / 2 - hingeHorizontalOffset;

  const topHingeVerticalOffset = hingeVerticalOffset;
  const bottomHingeVerticalOffset = hingeVerticalOffset;

  // Front Blind Panel (Overlay)
  const blindPanelFrontGeo = useMemo(() => createPanelWithHolesGeo(
    doorMaterialThickness, blindPanelHeight, blindWidthFront,  
    0, 0, 0, 'pz', blindPanelHoles, doorMaterialThickness
  ), [doorMaterialThickness, blindPanelHeight, blindWidthFront, blindPanelHoles]);

  // Door
  const doorGeo = useMemo(() => {
    return createDoorWithHingeHoles(
      doorWidth, doorHeight, doorMaterialThickness,
      hingeXOffset, hingeDiameter / 2, hingeDepth,
      topHingeVerticalOffset, bottomHingeVerticalOffset + (isGolaActive ? settings.doorOverride : 0)
    );
  }, [doorWidth, doorHeight, doorMaterialThickness, hingeXOffset, hingeDiameter, hingeDepth, topHingeVerticalOffset, bottomHingeVerticalOffset, isGolaActive, settings.doorOverride]);

  // Internal Upright (The divider)
  const uprightGeo = useMemo(() => {
    const dividerHeight = sidePanelHeight;
    const dividerDepth = topStretcherWidth; // Usually top stretchers absent in wall cabinet, but the parameter acts as upright width
    return new THREE.BoxGeometry(panelThickness, dividerHeight, dividerDepth);
  }, [sidePanelHeight, panelThickness, topStretcherWidth]);

  const returnPanelHoles = useMemo(() => {
    if (!showNailHoles) return [];
    
    const technicalR = nailHoleDiameter / 2;
    const zBack = -columnDepth / 2 + panelThickness / 2;
    const holes: { y: number, z: number, r: number, through?: boolean }[] = [];

    if (showBackStretchers) {
      const topStretcherYTop = sidePanelHeight / 2;
      const bottomStretcherYTop = -sidePanelHeight / 2 + wallBottomRecess + 100;
      
      holes.push({ y: topStretcherYTop - 25, z: zBack, r: technicalR, through: true });
      holes.push({ y: topStretcherYTop - 80, z: zBack, r: technicalR, through: true });
      
      holes.push({ y: bottomStretcherYTop - 25, z: zBack, r: technicalR, through: true });
      holes.push({ y: bottomStretcherYTop - 80, z: zBack, r: technicalR, through: true });
    }
    
    if (showShelves && numShelves > 0) {
      const availableHeight = innerHeight - panelThickness * 2;
      const spacing = availableHeight / (numShelves + 1);
      const sR = shelfHoleDiameter / 2;
      for (let i = 0; i < numShelves; i++) {
        const shelfYCabinet = -innerHeight / 2 + panelThickness + spacing * (i + 1);
        const holeY = shelfYCabinet - panelThickness - (shelfHoleDiameter / 2);
        
        // Hole 3: 50mm from back edge of shelf in column depth panel
        const localZ = (panelThickness + backPanelThickness + 50) - (columnDepth / 2);
        holes.push({ y: holeY, z: localZ, r: sR, through: false });
      }
    }
    
    return holes;
  }, [showNailHoles, innerHeight, panelThickness, backPanelThickness, nailHoleDiameter, columnDepth, showBackStretchers, sidePanelHeight, wallBottomRecess, showShelves, numShelves, shelfHoleDiameter, nailHoleShelfDistance]);

  // Column Return Panels
  const columnSideReturnGeo = useMemo(() => {
    if (!enableColumn) return null;
    return createPanelWithHolesGeo(
      panelThickness, sidePanelHeight, columnDepth,
      -columnDepth / 2 + panelThickness, -columnDepth / 2 + panelThickness + backPanelThickness,
      grooveDepth, blindCornerSide === 'left' ? 'px' : 'nx', returnPanelHoles, nailHoleDepth,
      0, 0
    );
  }, [enableColumn, sidePanelHeight, panelThickness, columnDepth, backPanelThickness, grooveDepth, blindCornerSide, returnPanelHoles, nailHoleDepth]);

  const columnBackReturnGeo = useMemo(() => {
    if (!enableColumn) return null;
    const holes: any[] = [];
    if (showNailHoles) {
      calculateNailHolePositions(sidePanelHeight).forEach(offset => {
        const zAttach = blindCornerSide === 'left' ? columnWidth / 2 - panelThickness / 2 : -columnWidth / 2 + panelThickness / 2;
        holes.push({ y: offset, z: zAttach, r: nailHoleDiameter / 2, through: true });
      });
    }
    return createPanelWithHolesGeo(
      panelThickness, sidePanelHeight, columnWidth,
      0, 0, 0, 'pz', holes, nailHoleDepth
    );
  }, [enableColumn, sidePanelHeight, panelThickness, columnWidth, showNailHoles, nailHoleDiameter, blindCornerSide, nailHoleDepth]);

  // Positions
  const blindPanelFrontX = blindCornerSide === 'left' 
    ? -width / 2 + blindPanelWidth / 2 
    : width / 2 - blindPanelWidth / 2;

  const blindPanelFrontY = 0; 

  const doorX = blindCornerSide === 'left'
    ? width / 2 - doorWidth / 2 - doorOuterGap
    : -width / 2 + doorWidth / 2 + doorOuterGap;

  const doorZ = depth / 2 + doorMaterialThickness / 2;

  const shouldShow = (part: string): boolean => {
    if (!partsSeparatedView) return true;
    return selectedPart === 'all' || selectedPart === part;
  };

  return (
    <group position={[width / 2, innerHeight / 2, depth / 2]}>
      {/* Bottom Panel */}
      {shouldShow('bottomPanel') && (
        <mesh position={[0 + getOffset('bottomPanel')[0], -innerHeight / 2 + panelThickness / 2 + wallBottomRecess + getOffset('bottomPanel')[1], 0 + getOffset('bottomPanel')[2]]} castShadow receiveShadow visible={!skeletonView}>
          <primitive object={bottomPanelGeo} attach="geometry" />
          <meshStandardMaterial color={settings.isStudio && settings.carcassTexture ? '#ffffff' : getPanelColor('bottomPanel')} map={settings.isStudio ? settings.carcassTexture : undefined} roughness={0.4} metalness={0} side={THREE.DoubleSide} transparent={settings.opacity < 1} opacity={settings.opacity} />
        </mesh>
      )}
      {skeletonView && shouldShow('bottomPanel') && (
        <lineSegments position={[0 + getOffset('bottomPanel')[0], -innerHeight / 2 + panelThickness / 2 + wallBottomRecess + getOffset('bottomPanel')[1], 0 + getOffset('bottomPanel')[2]]}>
          <edgesGeometry args={[bottomPanelGeo]} />
          <lineBasicMaterial color={getPanelColor('bottomPanel')} linewidth={2} />
        </lineSegments>
      )}

      {/* Top Panel */}
      {shouldShow('topPanel') && (
        <mesh position={[0 + getOffset('topPanel')[0], innerHeight / 2 - panelThickness / 2 + getOffset('topPanel')[1], 0 + getOffset('topPanel')[2]]} castShadow receiveShadow visible={!skeletonView}>
          <primitive object={topPanelGeo} attach="geometry" />
          <meshStandardMaterial color={settings.isStudio && settings.carcassTexture ? '#ffffff' : getPanelColor('topPanel')} map={settings.isStudio ? settings.carcassTexture : undefined} roughness={0.4} metalness={0} side={THREE.DoubleSide} transparent={settings.opacity < 1} opacity={settings.opacity} />
        </mesh>
      )}
      {skeletonView && shouldShow('topPanel') && (
        <lineSegments position={[0 + getOffset('topPanel')[0], innerHeight / 2 - panelThickness / 2 + getOffset('topPanel')[1], 0 + getOffset('topPanel')[2]]}>
          <edgesGeometry args={[topPanelGeo]} />
          <lineBasicMaterial color={getPanelColor('topPanel')} linewidth={2} />
        </lineSegments>
      )}

      {/* Left Panel */}
      {shouldShow('leftPanel') && (
        <mesh position={[-width / 2 + panelThickness / 2 + getOffset('leftPanel')[0], 0 + getOffset('leftPanel')[1], ((enableColumn && blindCornerSide === 'left') ? columnDepth / 2 : 0) + getOffset('leftPanel')[2]]} castShadow receiveShadow visible={!skeletonView}>
          <primitive object={leftPanelGeo} attach="geometry" />
          <meshStandardMaterial color={settings.isStudio && settings.carcassTexture ? '#ffffff' : getPanelColor('leftPanel')} map={settings.isStudio ? settings.carcassTexture : undefined} roughness={0.4} metalness={0} side={THREE.DoubleSide} transparent={settings.opacity < 1} opacity={settings.opacity} />
        </mesh>
      )}
      {skeletonView && shouldShow('leftPanel') && (
        <lineSegments position={[-width / 2 + panelThickness / 2 + getOffset('leftPanel')[0], 0 + getOffset('leftPanel')[1], ((enableColumn && blindCornerSide === 'left') ? columnDepth / 2 : 0) + getOffset('leftPanel')[2]]}>
          <edgesGeometry args={[leftPanelGeo]} />
          <lineBasicMaterial color={getPanelColor('leftPanel')} linewidth={2} />
        </lineSegments>
      )}

      {/* Right Panel */}
      {shouldShow('rightPanel') && (
        <mesh position={[width / 2 - panelThickness / 2 + getOffset('rightPanel')[0], 0 + getOffset('rightPanel')[1], ((enableColumn && blindCornerSide === 'right') ? columnDepth / 2 : 0) + getOffset('rightPanel')[2]]} castShadow receiveShadow visible={!skeletonView}>
          <primitive object={rightPanelGeo} attach="geometry" />
          <meshStandardMaterial color={settings.isStudio && settings.carcassTexture ? '#ffffff' : getPanelColor('rightPanel')} map={settings.isStudio ? settings.carcassTexture : undefined} roughness={0.4} metalness={0} side={THREE.DoubleSide} transparent={settings.opacity < 1} opacity={settings.opacity} />
        </mesh>
      )}
      {skeletonView && shouldShow('rightPanel') && (
        <lineSegments position={[width / 2 - panelThickness / 2 + getOffset('rightPanel')[0], 0 + getOffset('rightPanel')[1], ((enableColumn && blindCornerSide === 'right') ? columnDepth / 2 : 0) + getOffset('rightPanel')[2]]}>
          <edgesGeometry args={[rightPanelGeo]} />
          <lineBasicMaterial color={getPanelColor('rightPanel')} linewidth={2} />
        </lineSegments>
      )}

      {/* Front Blind Panel */}
      {shouldShow('blindPanelFront') && (
        <mesh position={[blindPanelFrontX + getOffset('blindPanelFront')[0], blindPanelFrontY + getOffset('blindPanelFront')[1], doorZ + getOffset('blindPanelFront')[2]]} castShadow receiveShadow visible={!skeletonView}>
          <primitive object={blindPanelFrontGeo} attach="geometry" />
          <meshStandardMaterial color={settings.isStudio && settings.doorTexture ? '#ffffff' : doorColor} map={settings.isStudio ? settings.doorTexture : undefined} roughness={0.4} metalness={0} transparent={settings.opacity < 1} opacity={settings.opacity} />
        </mesh>
      )}

      {/* Door */}
      {showDoors && shouldShow('door') && (
        <group position={[doorX + getOffset('door')[0], doorYOffset + getOffset('door')[1], doorZ + getOffset('door')[2]]}>
          <group position={[doorPivotX, 0, 0]} rotation={[0, rotationDirection * doorAngleRad, 0]}>
            <mesh position={[-doorPivotX, 0, 0]} castShadow receiveShadow visible={!skeletonView}>
              <primitive object={doorGeo} attach="geometry" />
              <meshStandardMaterial color={settings.isStudio && settings.doorTexture ? '#ffffff' : doorColor} map={settings.isStudio ? settings.doorTexture : undefined} roughness={0.4} metalness={0} transparent={true} opacity={settings.opacity} side={THREE.DoubleSide} depthWrite={settings.opacity < 1 ? false : true} />
            </mesh>
            {skeletonView && (
              <lineSegments position={[-doorPivotX, 0, 0]}>
                <edgesGeometry args={[doorGeo]} />
                <lineBasicMaterial color={getPanelColor('door')} linewidth={2} />
              </lineSegments>
            )}
            {showHinges && !skeletonView && (
              <group position={[-doorPivotX, 0, 0]}>
                <mesh position={[hingeXOffset, doorHeight / 2 - topHingeVerticalOffset, -hingeDepth / 2]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                  <cylinderGeometry args={[hingeDiameter / 2, hingeDiameter / 2, hingeDepth, 16]} />
                  <meshStandardMaterial color="#888888" metalness={0.8} roughness={0.2} transparent={settings.opacity < 1} opacity={settings.opacity} />
                </mesh>
                <mesh position={[hingeXOffset, -doorHeight / 2 + bottomHingeVerticalOffset + (isGolaActive ? settings.doorOverride : 0), -hingeDepth / 2]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                  <cylinderGeometry args={[hingeDiameter / 2, hingeDiameter / 2, hingeDepth, 16]} />
                  <meshStandardMaterial color="#888888" metalness={0.8} roughness={0.2} transparent={settings.opacity < 1} opacity={settings.opacity} />
                </mesh>
              </group>
            )}
          </group>
        </group>
      )}

      {/* Internal Upright (Support) */}
      {shouldShow('upright') && (
        <mesh position={[uprightX + getOffset('upright')[0], 0 + getOffset('upright')[1], depth / 2 - topStretcherWidth / 2 + getOffset('upright')[2]]} castShadow receiveShadow visible={!skeletonView}>
          <primitive object={uprightGeo} attach="geometry" />
          <meshStandardMaterial color={settings.isStudio && settings.carcassTexture ? '#ffffff' : getPanelColor('blindPanel')} map={settings.isStudio ? settings.carcassTexture : undefined} roughness={0.4} metalness={0} side={THREE.DoubleSide} transparent={settings.opacity < 1} opacity={settings.opacity} />
        </mesh>
      )}
      {skeletonView && (
        <>
          {shouldShow('blindPanelFront') && (
            <lineSegments position={[blindPanelFrontX + getOffset('blindPanelFront')[0], blindPanelFrontY + getOffset('blindPanelFront')[1], doorZ + getOffset('blindPanelFront')[2]]}>
              <edgesGeometry args={[blindPanelFrontGeo]} />
              <lineBasicMaterial color={doorColor} linewidth={2} />
            </lineSegments>
          )}
          {shouldShow('upright') && (
            <lineSegments position={[uprightX + getOffset('upright')[0], 0 + getOffset('upright')[1], depth / 2 - topStretcherWidth / 2 + getOffset('upright')[2]]}>
              <edgesGeometry args={[uprightGeo]} />
              <lineBasicMaterial color={getPanelColor('blindPanel')} linewidth={2} />
            </lineSegments>
          )}
        </>
      )}

      {/* Back Panel */}
      {showBackPanel && shouldShow('backPanel') && (
        <>
          <mesh position={[
            (enableColumn ? (blindCornerSide === 'left' ? columnWidth / 2 : -columnWidth / 2) : 0) + getOffset('backPanel')[0], 
            0 + getOffset('backPanel')[1], 
            -depth / 2 + panelThickness + backPanelThickness / 2 + getOffset('backPanel')[2]
          ]} castShadow receiveShadow visible={!skeletonView}>
            <boxGeometry args={[innerWidth - panelThickness * 2 + grooveDepth * 2 - (enableColumn ? columnWidth : 0), innerHeight - panelThickness * 2 + grooveDepth * 2, backPanelThickness]} />
            <meshStandardMaterial color={settings.isStudio && settings.carcassTexture ? '#ffffff' : showDifferentPanelColors ? panelColors.backPanel : backPanelColor} map={settings.isStudio ? settings.carcassTexture : undefined} roughness={0.5} metalness={0} side={THREE.DoubleSide} transparent={settings.opacity < 1} opacity={settings.opacity} />
          </mesh>
          {skeletonView && (
            <lineSegments position={[
              (enableColumn ? (blindCornerSide === 'left' ? columnWidth / 2 : -columnWidth / 2) : 0) + getOffset('backPanel')[0], 
              0 + getOffset('backPanel')[1], 
              -depth / 2 + panelThickness + backPanelThickness / 2 + getOffset('backPanel')[2]
            ]}>
              <edgesGeometry args={[new THREE.BoxGeometry(innerWidth - panelThickness * 2 + grooveDepth * 2 - (enableColumn ? columnWidth : 0), innerHeight - panelThickness * 2 + grooveDepth * 2, backPanelThickness)]} />
              <lineBasicMaterial color={getPanelColor('backPanel')} linewidth={2} />
            </lineSegments>
          )}
        </>
      )}

      {/* Back Stretchers */}
      {showBackStretchers && shouldShow('backStretcherTop') && (
        <>
          <mesh position={[(enableColumn ? (blindCornerSide === 'left' ? columnWidth / 2 : -columnWidth / 2) : 0) + getOffset('backStretcherTop')[0], innerHeight / 2 - panelThickness - backStretcherHeight / 2 + getOffset('backStretcherTop')[1], -depth / 2 + panelThickness / 2 + getOffset('backStretcherTop')[2]]} castShadow receiveShadow visible={!skeletonView}>
            <boxGeometry args={[innerWidth - panelThickness * 2 - (enableColumn ? columnWidth : 0), backStretcherHeight, panelThickness]} />
            <meshStandardMaterial color={settings.isStudio && settings.carcassTexture ? '#ffffff' : getPanelColor('backStretcherTop')} map={settings.isStudio ? settings.carcassTexture : undefined} roughness={0.4} metalness={0} transparent={settings.opacity < 1} opacity={settings.opacity} />
          </mesh>
          {skeletonView && (
            <lineSegments position={[(enableColumn ? (blindCornerSide === 'left' ? columnWidth / 2 : -columnWidth / 2) : 0) + getOffset('backStretcherTop')[0], innerHeight / 2 - panelThickness - backStretcherHeight / 2 + getOffset('backStretcherTop')[1], -depth / 2 + panelThickness / 2 + getOffset('backStretcherTop')[2]]}>
              <edgesGeometry args={[new THREE.BoxGeometry(innerWidth - panelThickness * 2 - (enableColumn ? columnWidth : 0), backStretcherHeight, panelThickness)]} />
              <lineBasicMaterial color={getPanelColor('backStretcherTop')} linewidth={2} />
            </lineSegments>
          )}
        </>
      )}
      {showBackStretchers && shouldShow('backStretcherBottom') && (
        <>
          <mesh position={[(enableColumn ? (blindCornerSide === 'left' ? columnWidth / 2 : -columnWidth / 2) : 0) + getOffset('backStretcherBottom')[0], -innerHeight / 2 + panelThickness + backStretcherHeight / 2 + wallBottomRecess + getOffset('backStretcherBottom')[1], -depth / 2 + panelThickness / 2 + getOffset('backStretcherBottom')[2]]} castShadow receiveShadow visible={!skeletonView}>
            <boxGeometry args={[innerWidth - panelThickness * 2 - (enableColumn ? columnWidth : 0), backStretcherHeight, panelThickness]} />
            <meshStandardMaterial color={settings.isStudio && settings.carcassTexture ? '#ffffff' : getPanelColor('backStretcherBottom')} map={settings.isStudio ? settings.carcassTexture : undefined} roughness={0.4} metalness={0} transparent={settings.opacity < 1} opacity={settings.opacity} />
          </mesh>
          {skeletonView && (
            <lineSegments position={[(enableColumn ? (blindCornerSide === 'left' ? columnWidth / 2 : -columnWidth / 2) : 0) + getOffset('backStretcherBottom')[0], -innerHeight / 2 + panelThickness + backStretcherHeight / 2 + wallBottomRecess + getOffset('backStretcherBottom')[1], -depth / 2 + panelThickness / 2 + getOffset('backStretcherBottom')[2]]}>
              <edgesGeometry args={[new THREE.BoxGeometry(innerWidth - panelThickness * 2 - (enableColumn ? columnWidth : 0), backStretcherHeight, panelThickness)]} />
              <lineBasicMaterial color={getPanelColor('backStretcherBottom')} linewidth={2} />
            </lineSegments>
          )}
        </>
      )}

      {/* Column Return Panels Rendering */}
      {enableColumn && (
        <>
          <mesh position={[blindCornerSide === 'left' ? -width / 2 + columnWidth + panelThickness / 2 : width / 2 - columnWidth - panelThickness / 2, 0, -depth / 2 + columnDepth / 2]} castShadow receiveShadow visible={!skeletonView}>
            <primitive object={columnSideReturnGeo} attach="geometry" />
            <meshStandardMaterial color={settings.isStudio && settings.carcassTexture ? '#ffffff' : getPanelColor(blindCornerSide === 'left' ? 'leftPanel' : 'rightPanel')} map={settings.isStudio ? settings.carcassTexture : undefined} roughness={0.4} metalness={0} side={THREE.DoubleSide} transparent={settings.opacity < 1} opacity={settings.opacity} />
          </mesh>
          {skeletonView && (
            <lineSegments position={[blindCornerSide === 'left' ? -width / 2 + columnWidth + panelThickness / 2 : width / 2 - columnWidth - panelThickness / 2, 0, -depth / 2 + columnDepth / 2]}>
              <edgesGeometry args={[columnSideReturnGeo]} />
              <lineBasicMaterial color={getPanelColor(blindCornerSide === 'left' ? 'leftPanel' : 'rightPanel')} linewidth={2} />
            </lineSegments>
          )}

          <mesh position={[blindCornerSide === 'left' ? -width / 2 + columnWidth / 2 + panelThickness : width / 2 - columnWidth / 2 - panelThickness, 0, -depth / 2 + columnDepth + panelThickness / 2]} castShadow receiveShadow visible={!skeletonView}>
            <primitive object={columnBackReturnGeo} attach="geometry" />
            <meshStandardMaterial color={settings.isStudio && settings.carcassTexture ? '#ffffff' : getPanelColor('backStretcherTop')} map={settings.isStudio ? settings.carcassTexture : undefined} roughness={0.4} metalness={0} side={THREE.DoubleSide} transparent={settings.opacity < 1} opacity={settings.opacity} />
          </mesh>
          {skeletonView && (
            <lineSegments position={[blindCornerSide === 'left' ? -width / 2 + columnWidth / 2 + panelThickness : width / 2 - columnWidth / 2 - panelThickness, 0, -depth / 2 + columnDepth + panelThickness / 2]}>
              <edgesGeometry args={[columnBackReturnGeo]} />
              <lineBasicMaterial color={getPanelColor('backStretcherTop')} linewidth={2} />
            </lineSegments>
          )}
        </>
      )}

      {/* Shelves */}
      {showShelves && numShelves > 0 && Array.from({ length: numShelves }).map((_, i) => {
        const availableHeight = innerHeight - panelThickness * 2;
        const spacing = availableHeight / (numShelves + 1);
        const shelfY = -innerHeight / 2 + panelThickness + spacing * (i + 1);
        
        const shelfW = width - panelThickness * 2 - 2;
        const shelfD = depth - panelThickness - backPanelThickness - 2;
        
        const shelfNotchX = uprightX; 
        const notches: any[] = [
          { u: shelfD / 2, v: shelfNotchX, width: topStretcherWidth, height: panelThickness + 2, alignV: 'center' }
        ];

        if (enableColumn) {
          const shelfNotchDepth = columnDepth - backPanelThickness;
          notches.push({
            u: -shelfD / 2 + shelfNotchDepth / 2,
            v: blindCornerSide === 'left' ? -shelfW / 2 + columnWidth / 2 : shelfW / 2 - columnWidth / 2,
            width: shelfNotchDepth + 2,
            height: columnWidth + 2,
            alignV: 'center',
            side: 'uMin'
          });
        }
       
        const shelfGeometry = createPanelWithHolesGeo(
          panelThickness, shelfW, shelfD,
          0, 0, 0, 'py', [], 0, 0, 0,
          notches
       );

        return (
          <group key={`shelf-${i}`}>
            <mesh position={[0 + getOffset('shelf')[0], shelfY - panelThickness / 2 + getOffset('shelf')[1], (panelThickness + backPanelThickness) / 2 + getOffset('shelf')[2]]} castShadow receiveShadow visible={!skeletonView}>
              <primitive object={shelfGeometry} attach="geometry" />
              <meshStandardMaterial color={settings.isStudio && (settings.shelfTexture || settings.carcassTexture) ? '#ffffff' : shelfColor} map={settings.isStudio ? (settings.shelfTexture || settings.carcassTexture) : undefined} roughness={0.4} metalness={0} transparent={settings.opacity < 1} opacity={settings.opacity} />
            </mesh>
            {skeletonView && (
              <lineSegments position={[0 + getOffset('shelf')[0], shelfY - panelThickness / 2 + getOffset('shelf')[1], (panelThickness + backPanelThickness) / 2 + getOffset('shelf')[2]]}>
                <edgesGeometry args={[shelfGeometry]} />
                <lineBasicMaterial color={getPanelColor('shelf')} linewidth={2} />
              </lineSegments>
            )}
          </group>
        );
      })}
    </group>
  );
};

export const exportWallCornerCabinetDXF = async (settings: TestingSettings, zip: JSZip | null, dataCollector?: (data: any) => void) => {
  const {
    width, height, depth, panelThickness, backPanelThickness,
    grooveDepth, backStretcherHeight, topStretcherWidth, blindPanelWidth, blindCornerSide,
    showBackPanel, showBackStretchers, showShelves, numShelves, doorOuterGap, enableColumn, columnWidth, columnDepth,
    nailHoleDiameter, shelfHoleDiameter, hingeDiameter, hingeHorizontalOffset, hingeVerticalOffset, wallBottomRecess
  } = settings;

  const innerWidth = width;
  const innerHeight = height;
  const innerDepth = depth;

  const addPanelToZip = (
    name: string, 
    w: number, 
    h: number, 
    holes?: { y: number, z: number, r: number }[],
    groove?: { x: number, y: number, w: number, h: number },
    notches: { u: number, v: number, width: number, height: number, alignV: 'top' | 'bottom' | 'center' | 'left' | 'right', side?: 'uMax' | 'uMin' | 'vMax' | 'vMin' }[] = []
  ) => {
    if (dataCollector) {
      dataCollector({ name, width: w, height: h, holes, groove, cutouts: notches });
    }
    if (!zip) return;
    const writer = new DxfWriter();
    writer.setUnits(Units.Millimeters);
    const modelSpace = writer.modelSpace;
    
    writer.addLayer('PANEL', 7, 'CONTINUOUS');
    writer.addLayer('HOLES', 4, 'CONTINUOUS');
    writer.addLayer('GROOVE', 3, 'CONTINUOUS');

    const uMin = -w / 2;
    const uMax = w / 2;
    const vMin = -h / 2;
    const vMax = h / 2;

    const points: { x: number, y: number }[] = [];
    const tol = 0.01;

    const uMinNotches = notches.filter(n => n.side === 'uMin').map(n => {
      const vMinRaw = n.alignV === 'top' ? n.v - n.height : (n.alignV === 'center' ? n.v - n.height/2 : n.v);
      return { vMin: Math.max(vMin, vMinRaw), vMax: Math.min(vMax, vMinRaw + n.height), width: n.width };
    }).sort((a, b) => a.vMin - b.vMin);

    const uMaxNotches = notches.filter(n => n.side === 'uMax' || !n.side).map(n => {
      const vMinRaw = n.alignV === 'top' ? n.v - n.height : (n.alignV === 'center' ? n.v - n.height/2 : n.v);
      return { vMin: Math.max(vMin, vMinRaw), vMax: Math.min(vMax, vMinRaw + n.height), width: n.width };
    }).sort((a, b) => a.vMin - b.vMin);

    const vMinNotches = notches.filter(n => n.side === 'vMin').map(n => {
      const uMinRaw = n.alignV === 'right' ? n.u - n.width : (n.alignV === 'center' ? n.u - n.width/2 : n.u);
      return { uMin: Math.max(uMin, uMinRaw), uMax: Math.min(uMax, uMinRaw + n.width), height: n.height };
    }).sort((a, b) => a.uMin - b.uMin);

    const vMaxNotches = notches.filter(n => n.side === 'vMax').map(n => {
      const uMinRaw = n.alignV === 'right' ? n.u - n.width : (n.alignV === 'center' ? n.u - n.width/2 : n.u);
      return { uMin: Math.max(uMin, uMinRaw), uMax: Math.min(uMax, uMinRaw + n.width), height: n.height };
    }).sort((a, b) => a.uMin - b.uMin);

    // 1. Bottom edge (vMin) - Go from uMin to uMax
    const vMinCornerNotchL = uMinNotches.find(n => Math.abs(n.vMin - vMin) < tol);
    const vMinCornerNotchR = uMaxNotches.find(n => Math.abs(n.vMin - vMin) < tol);
    
    let currentU = vMinCornerNotchL ? uMin + vMinCornerNotchL.width : uMin;
    const uMaxBound = vMinCornerNotchR ? uMax - vMinCornerNotchR.width : uMax;

    if (vMinNotches.length > 0 || vMinCornerNotchL || vMinCornerNotchR) {
      if (!vMinCornerNotchL) points.push({ x: uMin, y: vMin });
      vMinNotches.forEach(n => {
        if (n.uMin > currentU + tol) points.push({ x: n.uMin, y: vMin });
        points.push({ x: n.uMin, y: vMin + n.height });
        points.push({ x: n.uMax, y: vMin + n.height });
        if (n.uMax < uMaxBound - tol) points.push({ x: n.uMax, y: vMin });
        currentU = n.uMax;
      });
      if (!vMinCornerNotchR && currentU < uMax - tol) points.push({ x: uMax, y: vMin });
    } else {
      points.push({ x: uMin, y: vMin });
      points.push({ x: uMax, y: vMin });
    }

    // 2. Right edge (uMax) - Go from vMin to vMax
    const uMaxCornerNotchB = vMinNotches.find(n => Math.abs(n.uMax - uMax) < tol);
    const uMaxCornerNotchT = vMaxNotches.find(n => Math.abs(n.uMax - uMax) < tol);
    
    let currentV = uMaxCornerNotchB ? vMin + uMaxCornerNotchB.height : vMin;
    const vMaxBound = uMaxCornerNotchT ? vMax - uMaxCornerNotchT.height : vMax;

    if (uMaxNotches.length > 0 || uMaxCornerNotchB || uMaxCornerNotchT) {
      if (!uMaxCornerNotchB) points.push({ x: uMax, y: vMin });
      uMaxNotches.forEach(n => {
        if (n.vMin > currentV + tol) points.push({ x: uMax, y: n.vMin });
        points.push({ x: uMax - n.width, y: n.vMin });
        points.push({ x: uMax - n.width, y: n.vMax });
        if (n.vMax < vMaxBound - tol) points.push({ x: uMax, y: n.vMax });
        currentV = n.vMax;
      });
      if (!uMaxCornerNotchT && currentV < vMax - tol) points.push({ x: uMax, y: vMax });
    } else {
      points.push({ x: uMax, y: vMax });
    }

    // 3. Top edge (vMax) - Go from uMax to uMin
    const vMaxCornerNotchR = uMaxNotches.find(n => Math.abs(n.vMax - vMax) < tol);
    const vMaxCornerNotchL = uMinNotches.find(n => Math.abs(n.vMax - vMax) < tol);
    
    currentU = vMaxCornerNotchR ? uMax - vMaxCornerNotchR.width : uMax;
    const uMinBound = vMaxCornerNotchL ? uMin + vMaxCornerNotchL.width : uMin;

    if (vMaxNotches.length > 0 || vMaxCornerNotchR || vMaxCornerNotchL) {
      if (!vMaxCornerNotchR) points.push({ x: uMax, y: vMax });
      const vMaxNotchesRev = [...vMaxNotches].reverse();
      vMaxNotchesRev.forEach(n => {
        if (n.uMax < currentU - tol) points.push({ x: n.uMax, y: vMax });
        points.push({ x: n.uMax, y: vMax - n.height });
        points.push({ x: n.uMin, y: vMax - n.height });
        if (n.uMin > uMinBound + tol) points.push({ x: n.uMin, y: vMax });
        currentU = n.uMin;
      });
      if (!vMaxCornerNotchL && currentU > uMin + tol) points.push({ x: uMin, y: vMax });
    } else {
      points.push({ x: uMin, y: vMax });
    }

    // 4. Left edge (uMin) - Go from vMax to vMin
    const uMinCornerNotchT = vMaxNotches.find(n => Math.abs(n.uMin - uMin) < tol);
    const uMinCornerNotchB = vMinNotches.find(n => Math.abs(n.uMin - uMin) < tol);
    
    currentV = uMinCornerNotchT ? vMax - uMinCornerNotchT.height : vMax;
    const vMinBound = uMinCornerNotchB ? vMin + uMinCornerNotchB.height : vMin;

    if (uMinNotches.length > 0 || uMinCornerNotchT || uMinCornerNotchB) {
      if (!uMinCornerNotchT) points.push({ x: uMin, y: vMax });
      const uMinNotchesRev = [...uMinNotches].reverse();
      uMinNotchesRev.forEach(n => {
        if (n.vMax < currentV - tol) points.push({ x: uMin, y: n.vMax });
        points.push({ x: uMin + n.width, y: n.vMax });
        points.push({ x: uMin + n.width, y: n.vMin });
        if (n.vMin > vMinBound + tol) points.push({ x: uMin, y: n.vMin });
        currentV = n.vMin;
      });
      if (!uMinCornerNotchB && currentV > vMin + tol) points.push({ x: uMin, y: vMin });
    } else {
      points.push({ x: uMin, y: vMin });
    }

    const dxfPoints = points.map(p => ({ point: { x: p.x + w/2, y: p.y + h/2 } }));
    modelSpace.addLWPolyline(dxfPoints, { flags: LWPolylineFlags.Closed, layerName: 'PANEL' });

    if (holes) {
      holes.forEach(hole => {
        modelSpace.addCircle(point3d(w/2 + hole.z, h/2 + hole.y, 0), hole.r, { layerName: 'HOLES' });
      });
    }

    if (groove) {
      modelSpace.addLWPolyline([
        { point: { x: groove.x, y: groove.y } },
        { point: { x: groove.x + groove.w, y: groove.y } },
        { point: { x: groove.x + groove.w, y: groove.y + groove.h } },
        { point: { x: groove.x, y: groove.y + groove.h } }
      ], { flags: LWPolylineFlags.Closed, layerName: 'GROOVE' });
    }

    modelSpace.addText(point3d(w/2, h/2, 0), 10, name);
    zip.file(`${name}.dxf`, writer.stringify());
  };

  const isGolaActive = settings.enableGola && settings.showDoors;
  const sidePanelHeight = innerHeight - panelThickness * 2;
  const lpX = -innerWidth / 2 + panelThickness / 2;
  const rpX = innerWidth / 2 - panelThickness / 2;
  const uprightX = blindCornerSide === 'left' ? -width / 2 + blindPanelWidth + panelThickness / 2 : width / 2 - blindPanelWidth - panelThickness / 2;
  const zCenterUpright = depth / 2 - topStretcherWidth / 2;

  // Left Panel
  const isLShort = enableColumn && blindCornerSide === 'left';
  const leftW = isLShort ? depth - columnDepth : depth;
  const leftH = innerHeight - panelThickness;
  const leftHoles: any[] = [];
  if (isLShort) {
    const zAttach = -leftW / 2 + panelThickness / 2;
    calculateNailHolePositions(leftH).forEach(offset => {
      leftHoles.push({ y: offset, z: zAttach, r: nailHoleDiameter / 2 });
    });
  }
  // Shelf holes for Left Panel
  if (showShelves && numShelves > 0) {
    const spacing = (innerHeight - panelThickness * 2) / (numShelves + 1);
    for (let i = 0; i < numShelves; i++) {
      const holeYCabinet = -innerHeight / 2 + panelThickness + spacing * (i + 1);
      const holeY = holeYCabinet - panelThickness - panelThickness / 2;
      const shelfZStartGlobal = -depth / 2 + panelThickness + backPanelThickness;
      const shelfLengthFull = depth - panelThickness - backPanelThickness;
      const zCenterShelfFull = shelfZStartGlobal + shelfLengthFull / 2;
      const zOffsetL = isLShort ? columnDepth / 2 : 0;
      if (isLShort) {
        leftHoles.push({ y: holeY, z: (depth / 2 - 50) - zOffsetL, r: shelfHoleDiameter / 2 });
        leftHoles.push({ y: holeY, z: (-depth / 2 + columnDepth + 50) - zOffsetL, r: shelfHoleDiameter / 2 });
      } else {
        const shelfHoleOffsets = calculateNailHolePositions(shelfLengthFull);
        [shelfHoleOffsets[0], shelfHoleOffsets[shelfHoleOffsets.length - 1]].forEach(offset => {
          leftHoles.push({ y: holeY, z: (zCenterShelfFull + offset) - zOffsetL, r: shelfHoleDiameter / 2 });
        });
      }
    }
  }
  const leftGroove = !isLShort ? { x: panelThickness, y: 0, w: backPanelThickness + 2, h: leftH - panelThickness } : undefined;
  addPanelToZip('Left_Panel', leftW, leftH, leftHoles, leftGroove);

  // Right Panel
  const isRShort = enableColumn && blindCornerSide === 'right';
  const rightW = isRShort ? depth - columnDepth : depth;
  const rightH = innerHeight - panelThickness;
  const rightHoles: any[] = [];
  if (isRShort) {
    const zAttach = -rightW / 2 + panelThickness / 2;
    calculateNailHolePositions(rightH).forEach(offset => {
      rightHoles.push({ y: offset, z: zAttach, r: nailHoleDiameter / 2 });
    });
  }
  // Shelf holes for Right Panel
  if (showShelves && numShelves > 0) {
    const spacing = (innerHeight - panelThickness * 2) / (numShelves + 1);
    for (let i = 0; i < numShelves; i++) {
      const holeYCabinet = -innerHeight / 2 + panelThickness + spacing * (i + 1);
      const holeY = holeYCabinet - panelThickness - panelThickness / 2;
      const shelfZStartGlobal = -depth / 2 + panelThickness + backPanelThickness;
      const shelfLengthFull = depth - panelThickness - backPanelThickness;
      const zCenterShelfFull = shelfZStartGlobal + shelfLengthFull / 2;
      const zOffsetR = isRShort ? columnDepth / 2 : 0;
      if (isRShort) {
        rightHoles.push({ y: holeY, z: (depth / 2 - 50) - zOffsetR, r: shelfHoleDiameter / 2 });
        rightHoles.push({ y: holeY, z: (-depth / 2 + columnDepth + 50) - zOffsetR, r: shelfHoleDiameter / 2 });
      } else {
        const shelfHoleOffsets = calculateNailHolePositions(shelfLengthFull);
        [shelfHoleOffsets[0], shelfHoleOffsets[shelfHoleOffsets.length - 1]].forEach(offset => {
          rightHoles.push({ y: holeY, z: (zCenterShelfFull + offset) - zOffsetR, r: shelfHoleDiameter / 2 });
        });
      }
    }
  }
  const rightGroove = !isRShort ? { x: panelThickness, y: 0, w: backPanelThickness + 2, h: rightH - panelThickness } : undefined;
  addPanelToZip('Right_Panel', rightW, rightH, rightHoles, rightGroove);

  // Bottom Panel
  const bottomHoles: any[] = [];
  const bottomNotches: any[] = [];
  // Side Panels
  calculateNailHolePositions(leftW).forEach(offset => {
    const centerZ = isLShort ? depth / 2 - leftW / 2 : 0;
    bottomHoles.push({ z: lpX, y: -(centerZ + offset), r: nailHoleDiameter / 2 });
  });
  calculateNailHolePositions(rightW).forEach(offset => {
    const centerZ = isRShort ? depth / 2 - rightW / 2 : 0;
    bottomHoles.push({ z: rpX, y: -(centerZ + offset), r: nailHoleDiameter / 2 });
  });

  // Column
  if (enableColumn) {
    const columnSideX = blindCornerSide === 'left' ? -width / 2 + columnWidth + panelThickness / 2 : width / 2 - columnWidth - panelThickness / 2;
    const columnSideCenterZ = -depth / 2 + columnDepth / 2;
    calculateNailHolePositions(columnDepth).forEach(offset => {
      bottomHoles.push({ z: columnSideX, y: -(columnSideCenterZ + offset), r: nailHoleDiameter / 2 });
    });

    const columnBackCenterY = blindCornerSide === 'left' ? -width / 2 + columnWidth / 2 + panelThickness : width / 2 - columnWidth / 2 - panelThickness;
    const columnBackZ = -depth / 2 + columnDepth + panelThickness / 2;
    calculateNailHolePositions(columnWidth).forEach(offset => {
      bottomHoles.push({ z: columnBackCenterY + offset, y: -columnBackZ, r: nailHoleDiameter / 2 });
    });
  }

  // Back Stretcher (Bottom)
  if (showBackStretchers) {
    const bbsZ = -depth / 2 + panelThickness / 2;
    const backWidth = enableColumn ? innerWidth - columnWidth : innerWidth;
    const startX = (enableColumn && blindCornerSide === 'left') ? -innerWidth / 2 + columnWidth : -innerWidth / 2;
    calculateNailHolePositions(backWidth).forEach(offset => {
      bottomHoles.push({ z: startX + backWidth / 2 + offset, y: -bbsZ, r: nailHoleDiameter / 2 });
    });
  }

  // Internal Support
  calculateNailHolePositions(topStretcherWidth).forEach(offset => {
    bottomHoles.push({ z: uprightX, y: -(zCenterUpright + offset), r: nailHoleDiameter / 2 });
  });
  
  if (enableColumn) {
    bottomNotches.push({
      u: blindCornerSide === 'left' ? -width / 2 : width / 2,
      v: depth / 2,
      width: columnWidth,
      height: columnDepth,
      alignV: 'top',
      side: blindCornerSide === 'left' ? 'uMin' : 'uMax'
    });
  }
  const bGrooveX_base = panelThickness - grooveDepth;
  const bGrooveW_base = width - panelThickness * 2 + grooveDepth * 2;
  const bGrooveW = enableColumn ? bGrooveW_base - columnWidth : bGrooveW_base;
  const bGrooveX = (enableColumn && blindCornerSide === 'left') ? bGrooveX_base + columnWidth : bGrooveX_base;
  addPanelToZip('Bottom_Panel', width, depth, bottomHoles, { x: bGrooveX, y: depth - panelThickness - backPanelThickness - 2, w: bGrooveW, h: backPanelThickness + 2 }, bottomNotches);




  // Top Panel
  const topHoles: any[] = [];
  const topNotches: any[] = [];
  // Side Panels
  calculateNailHolePositions(leftW).forEach(offset => {
    const centerZ = isLShort ? depth / 2 - leftW / 2 : 0;
    topHoles.push({ z: lpX, y: -(centerZ + offset), r: nailHoleDiameter / 2 });
  });
  calculateNailHolePositions(rightW).forEach(offset => {
    const centerZ = isRShort ? depth / 2 - rightW / 2 : 0;
    topHoles.push({ z: rpX, y: -(centerZ + offset), r: nailHoleDiameter / 2 });
  });

  // Column
  if (enableColumn) {
    const columnSideX = blindCornerSide === 'left' ? -width / 2 + columnWidth + panelThickness / 2 : width / 2 - columnWidth - panelThickness / 2;
    const columnSideCenterZ = -depth / 2 + columnDepth / 2;
    calculateNailHolePositions(columnDepth).forEach(offset => {
      topHoles.push({ z: columnSideX, y: -(columnSideCenterZ + offset), r: nailHoleDiameter / 2 });
    });

    const columnBackCenterY = blindCornerSide === 'left' ? -width / 2 + columnWidth / 2 + panelThickness : width / 2 - columnWidth / 2 - panelThickness;
    const columnBackZ = -depth / 2 + columnDepth + panelThickness / 2;
    calculateNailHolePositions(columnWidth).forEach(offset => {
      topHoles.push({ z: columnBackCenterY + offset, y: -columnBackZ, r: nailHoleDiameter / 2 });
    });
  }

  // Back Stretcher (Top)
  if (showBackStretchers) {
    const tbsZ = -depth / 2 + panelThickness / 2;
    const backWidth = enableColumn ? innerWidth - columnWidth : innerWidth;
    const startX = (enableColumn && blindCornerSide === 'left') ? -innerWidth / 2 + columnWidth : -innerWidth / 2;
    calculateNailHolePositions(backWidth).forEach(offset => {
      topHoles.push({ z: startX + backWidth / 2 + offset, y: -tbsZ, r: nailHoleDiameter / 2 });
    });
  }

  // Internal Support
  calculateNailHolePositions(topStretcherWidth).forEach(offset => {
    topHoles.push({ z: uprightX, y: -(zCenterUpright + offset), r: nailHoleDiameter / 2 });
  });

  if (enableColumn) {
    topNotches.push({
      u: blindCornerSide === 'left' ? -width / 2 : width / 2,
      v: depth / 2,
      width: columnWidth,
      height: columnDepth,
      alignV: 'top',
      side: blindCornerSide === 'left' ? 'uMin' : 'uMax'
    });
  }
  const tGrooveX_base = panelThickness - grooveDepth;
  const tGrooveW_base = width - panelThickness * 2 + grooveDepth * 2;
  const tGrooveW = enableColumn ? tGrooveW_base - columnWidth : tGrooveW_base;
  const tGrooveX = (enableColumn && blindCornerSide === 'left') ? tGrooveX_base + columnWidth : tGrooveX_base;
  addPanelToZip('Top_Panel', width, depth, topHoles, { x: tGrooveX, y: depth - panelThickness - backPanelThickness - 2, w: tGrooveW, h: backPanelThickness + 2 }, topNotches);






  // Front Blind Panel
  addPanelToZip('Front_Blind_Panel', blindPanelWidth - doorOuterGap * 2, innerHeight);
  
  // Door
  const doorWidth = width - blindPanelWidth - doorOuterGap * 2;
  const doorHeight = innerHeight + (isGolaActive ? settings.doorOverride : 0);
  const isLeftDoor = blindCornerSide === 'left';
  const hingeX = isLeftDoor ? -doorWidth / 2 + hingeHorizontalOffset : doorWidth / 2 - hingeHorizontalOffset;
  const hingeHoles = [
    { y: doorHeight / 2 - hingeVerticalOffset, z: hingeX, r: hingeDiameter / 2 }, 
    { y: -doorHeight / 2 + hingeVerticalOffset + (isGolaActive ? settings.doorOverride : 0), z: hingeX, r: hingeDiameter / 2 }
  ];
  addPanelToZip('Front_Door', doorWidth, doorHeight, hingeHoles);

  // Internal Support
  const supportH = sidePanelHeight;
  addPanelToZip('Internal_Support', topStretcherWidth, supportH);
  
  // Back Panel
  if (showBackPanel) {
    const backW = innerWidth - panelThickness * 2 + grooveDepth * 2 - (enableColumn ? columnWidth : 0);
    const backH = innerHeight - panelThickness * 2 + grooveDepth * 2;
    addPanelToZip('Back_Panel', backW, backH);
  }

  // Back Stretchers
  if (showBackStretchers) {
    const backStretcherW = innerWidth - panelThickness * 2 - (enableColumn ? columnWidth : 0);
    addPanelToZip('Back_Stretcher_Top', backStretcherW, backStretcherHeight);
    addPanelToZip('Back_Stretcher_Bottom', backStretcherW, backStretcherHeight);
  }

  // Column Return Panels
  if (enableColumn) {
    const columnPanelHeight = innerHeight - panelThickness;
    const csrHoles: any[] = [];
    const technicalR = nailHoleDiameter / 2;
    const zBack = -columnDepth / 2 + panelThickness / 2;

    // Top Panel connection
    const yTopPanel = columnPanelHeight / 2 - panelThickness / 2;
    csrHoles.push({ y: yTopPanel, z: -columnDepth / 2 + 50, r: technicalR });
    csrHoles.push({ y: yTopPanel, z: columnDepth / 2 - 50, r: technicalR });

    // Bottom panel connection
    const yBottomPanel = -columnPanelHeight / 2 + panelThickness / 2 + wallBottomRecess;
    csrHoles.push({ y: yBottomPanel, z: -columnDepth / 2 + 50, r: technicalR });
    csrHoles.push({ y: yBottomPanel, z: columnDepth / 2 - 50, r: technicalR });

    if (showBackStretchers) {
      const topStretcherYTop = columnPanelHeight / 2;
      const bottomStretcherYTop = -columnPanelHeight / 2 + wallBottomRecess + 100;
      
      csrHoles.push({ y: topStretcherYTop - 25, z: zBack, r: technicalR });
      csrHoles.push({ y: topStretcherYTop - 80, z: zBack, r: technicalR });
      
      csrHoles.push({ y: bottomStretcherYTop - 25, z: zBack, r: technicalR });
      csrHoles.push({ y: bottomStretcherYTop - 80, z: zBack, r: technicalR });
    }

    addPanelToZip('Column_Side_Return', columnDepth, columnPanelHeight, csrHoles, { x: panelThickness, y: 0, w: backPanelThickness + 2, h: columnPanelHeight - (panelThickness - grooveDepth) });
    
    const cbHoles: any[] = [];
    calculateNailHolePositions(columnPanelHeight).forEach(offset => {
      const zAttach = blindCornerSide === 'left' ? columnWidth / 2 - panelThickness / 2 : -columnWidth / 2 + panelThickness / 2;
      cbHoles.push({ y: offset, z: zAttach, r: nailHoleDiameter / 2 });
    });
    addPanelToZip('Column_Back_Return', columnWidth, columnPanelHeight, cbHoles);
  }

  // Shelves
  if (showShelves && numShelves > 0) {
    const shelfW = width - panelThickness * 2 - 2;
    const shelfD = depth - panelThickness - backPanelThickness - 2;
    const shelfNotchX = uprightX; 
    
    for (let i = 0; i < numShelves; i++) {
      const notches: any[] = [
        { u: shelfNotchX, v: -shelfD / 2, width: panelThickness + 2, height: topStretcherWidth, alignV: 'bottom', side: 'vMin' }
      ];
      if (enableColumn) {
        notches.push({
          u: blindCornerSide === 'left' ? -shelfW / 2 : shelfW / 2,
          v: shelfD / 2,
          width: columnWidth,
          height: columnDepth - backPanelThickness,
          alignV: 'top',
          side: blindCornerSide === 'left' ? 'uMin' : 'uMax'
        });
      }

      addPanelToZip(`Shelf_${i + 1}`, shelfW, shelfD, [], undefined, notches);
    }
  }

};

