import React, { useMemo } from 'react';
import * as THREE from 'three';
import { DxfWriter, Units, LWPolylineFlags, point3d } from '@tarikjabiri/dxf';
import JSZip from 'jszip';
import { 
  TestingSettings, 
  createPanelWithHolesGeo, 
  createDoorWithHingeHoles,
  panelColors,
  woodPalette
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

    if (showShelves && numShelves > 0) {
      const availableHeight = innerHeight - panelThickness * 2;
      const spacing = availableHeight / (numShelves + 1);
      for (let i = 0; i < numShelves; i++) {
        const shelfYCabinet = -innerHeight / 2 + panelThickness + spacing * (i + 1);
        const yLocalSide = shelfYCabinet; // Local Y goes from -sidePanelHeight/2 to +sidePanelHeight/2
        const holeY = yLocalSide - panelThickness / 2 - nailHoleShelfDistance;
        const shelfZStart = -depth / 2 + panelThickness + backPanelThickness;
        const localShelfDepth = depth - panelThickness - backPanelThickness;
        const frontZ = shelfZStart + localShelfDepth * 0.25;
        const backZ = shelfZStart + localShelfDepth * 0.75;
        positions.push({ y: holeY, z: frontZ, r: shelfR, through: false });
        positions.push({ y: holeY, z: backZ, r: shelfR, through: false });
      }
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
    return createPanelWithHolesGeo(
      panelThickness, sidePanelHeight, actualDepth,
      -actualDepth / 2 + panelThickness, -actualDepth / 2 + panelThickness + backPanelThickness,
      isBlindSide ? 0 : grooveDepth, 'px', sideHoles.filter(h => h.z < actualDepth/2 && h.z > -actualDepth/2), nailHoleDepth, 0, 0,
      notches
    );
  }, [panelThickness, sidePanelHeight, depth, backPanelThickness, grooveDepth, sideHoles, nailHoleDepth, isGolaActive, isDoorOnLeft, settings.golaLCutoutDepth, settings.golaLCutoutHeight, enableColumn, blindCornerSide, columnDepth]);

  const rightPanelGeo = useMemo(() => {
    const notches: any[] = [];
    const actualDepth = (enableColumn && blindCornerSide === 'right') ? depth - columnDepth : depth;
    const isBlindSide = enableColumn && blindCornerSide === 'right';
    return createPanelWithHolesGeo(
      panelThickness, sidePanelHeight, actualDepth,
      -actualDepth / 2 + panelThickness, -actualDepth / 2 + panelThickness + backPanelThickness,
      isBlindSide ? 0 : grooveDepth, 'nx', sideHoles.filter(h => h.z < actualDepth/2 && h.z > -actualDepth/2), nailHoleDepth, 0, 0,
      notches
    );
  }, [panelThickness, sidePanelHeight, depth, backPanelThickness, grooveDepth, sideHoles, nailHoleDepth, isGolaActive, isDoorOnRight, settings.golaLCutoutDepth, settings.golaLCutoutHeight, enableColumn, blindCornerSide, columnDepth]);

  const bottomPanelHoles = useMemo(() => {
    if (!showNailHoles) return [];
    
    const technicalR = nailHoleDiameter / 2;
    const holes: { y: number, z: number, r: number, through?: boolean }[] = [];
    
    const lpX = -innerWidth / 2 + panelThickness / 2;
    const rpX = innerWidth / 2 - panelThickness / 2;
    const zDist = [ -innerDepth / 2 + innerDepth / 5, 0, innerDepth / 2 - innerDepth / 5 ];
    zDist.forEach(zVal => {
      const actualLeftDepth = (enableColumn && blindCornerSide === 'left') ? depth - columnDepth : depth;
      const actualRightDepth = (enableColumn && blindCornerSide === 'right') ? depth - columnDepth : depth;
      
      const zMinL = -depth / 2;
      const zMaxL = -depth / 2 + actualLeftDepth;
      const zMinR = -depth / 2;
      const zMaxR = -depth / 2 + actualRightDepth;

      if (zVal >= zMinL && zVal <= zMaxL) {
        holes.push({ y: lpX, z: zVal, r: technicalR, through: true });
      }
      if (zVal >= zMinR && zVal <= zMaxR) {
        holes.push({ y: rpX, z: zVal, r: technicalR, through: true });
      }
    });

    if (showBackStretchers) {
      const bbsZ = -depth / 2 + panelThickness / 2;
      const backWidth = enableColumn ? innerWidth - columnWidth : innerWidth;
      const startX = (enableColumn && blindCornerSide === 'left') ? -innerWidth / 2 + columnWidth : -innerWidth / 2;
      
      holes.push({ y: startX + backWidth / 5, z: bbsZ, r: technicalR, through: true });
      holes.push({ y: startX + backWidth / 2, z: bbsZ, r: technicalR, through: true });
      holes.push({ y: startX + (backWidth * 4) / 5, z: bbsZ, r: technicalR, through: true });
    }

    const upZ1 = depth / 2 - topStretcherWidth * 1/4;
    const upZ2 = depth / 2 - topStretcherWidth * 3/4;
    holes.push({ y: uprightX, z: upZ1, r: technicalR, through: true });
    holes.push({ y: uprightX, z: upZ2, r: technicalR, through: true });

    return holes;
  }, [showNailHoles, nailHoleDiameter, innerWidth, innerDepth, depth, panelThickness, showBackStretchers, uprightX, topStretcherWidth, enableColumn, columnWidth, columnDepth, blindCornerSide]);

  const topPanelHoles = useMemo(() => {
    if (!showNailHoles) return [];
    
    const technicalR = nailHoleDiameter / 2;
    const holes: { y: number, z: number, r: number, through?: boolean }[] = [];
    
    const lpX = -innerWidth / 2 + panelThickness / 2;
    const rpX = innerWidth / 2 - panelThickness / 2;
    const zDist = [ -innerDepth / 2 + innerDepth / 5, 0, innerDepth / 2 - innerDepth / 5 ];
    zDist.forEach(zVal => {
      const actualLeftDepth = (enableColumn && blindCornerSide === 'left') ? depth - columnDepth : depth;
      const actualRightDepth = (enableColumn && blindCornerSide === 'right') ? depth - columnDepth : depth;
      
      const zMinL = -depth / 2;
      const zMaxL = -depth / 2 + actualLeftDepth;
      const zMinR = -depth / 2;
      const zMaxR = -depth / 2 + actualRightDepth;

      if (zVal >= zMinL && zVal <= zMaxL) {
        holes.push({ y: lpX, z: zVal, r: technicalR, through: true });
      }
      if (zVal >= zMinR && zVal <= zMaxR) {
        holes.push({ y: rpX, z: zVal, r: technicalR, through: true });
      }
    });

    if (showBackStretchers) {
      const bbsZ = -depth / 2 + panelThickness / 2;
      const backWidth = enableColumn ? innerWidth - columnWidth : innerWidth;
      const startX = (enableColumn && blindCornerSide === 'left') ? -innerWidth / 2 + columnWidth : -innerWidth / 2;
      
      holes.push({ y: startX + backWidth / 5, z: bbsZ, r: technicalR, through: true });
      holes.push({ y: startX + backWidth / 2, z: bbsZ, r: technicalR, through: true });
      holes.push({ y: startX + (backWidth * 4) / 5, z: bbsZ, r: technicalR, through: true });
    }

    const upZ1 = depth / 2 - topStretcherWidth * 1/4;
    const upZ2 = depth / 2 - topStretcherWidth * 3/4;
    holes.push({ y: uprightX, z: upZ1, r: technicalR, through: true });
    holes.push({ y: uprightX, z: upZ2, r: technicalR, through: true });

    return holes;
  }, [showNailHoles, nailHoleDiameter, innerWidth, innerDepth, depth, panelThickness, showBackStretchers, uprightX, topStretcherWidth, enableColumn, columnWidth, columnDepth, blindCornerSide]);

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
    holes.push({ y: yTopPanel, z: -blindWidthFront / 2 + blindWidthFront / 5, r: technicalR, through: true });
    holes.push({ y: yTopPanel, z: 0, r: technicalR, through: true });
    holes.push({ y: yTopPanel, z: blindWidthFront / 2 - blindWidthFront / 5, r: technicalR, through: true });

    // Bottom panel hit points
    const yBottomPanel = -innerHeight / 2 + panelThickness / 2 + wallBottomRecess;
    holes.push({ y: yBottomPanel, z: -blindWidthFront / 2 + blindWidthFront / 5, r: technicalR, through: true });
    holes.push({ y: yBottomPanel, z: 0, r: technicalR, through: true });
    holes.push({ y: yBottomPanel, z: blindWidthFront / 2 - blindWidthFront / 5, r: technicalR, through: true });

    // Side panel hit points
    const sidePanelLocalX = blindCornerSide === 'left' 
      ? panelThickness / 2 - blindPanelWidth / 2 
      : blindPanelWidth / 2 - panelThickness / 2;
      
    holes.push({ y: -blindPanelHeight / 2 + blindPanelHeight / 5, z: sidePanelLocalX, r: technicalR, through: true });
    holes.push({ y: 0, z: sidePanelLocalX, r: technicalR, through: true });
    holes.push({ y: blindPanelHeight / 2 - blindPanelHeight / 5, z: sidePanelLocalX, r: technicalR, through: true });

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
    
    return holes;
  }, [showNailHoles, nailHoleDiameter, columnDepth, panelThickness, showBackStretchers, sidePanelHeight, wallBottomRecess]);

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
    return new THREE.BoxGeometry(columnWidth, sidePanelHeight, panelThickness);
  }, [enableColumn, sidePanelHeight, panelThickness, columnWidth]);

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
          <meshStandardMaterial color={settings.isStudio && settings.carcassTexture ? '#ffffff' : darkerColor} map={settings.isStudio ? settings.carcassTexture : undefined} roughness={0.4} metalness={0} transparent={settings.opacity < 1} opacity={settings.opacity} />
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
              <lineBasicMaterial color={darkerColor} linewidth={2} />
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
              <edgesGeometry args={[new THREE.BoxGeometry(columnWidth, sidePanelHeight, panelThickness)]} />
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
          notches.push({
            u: -shelfD / 2 + columnDepth / 2,
            v: blindCornerSide === 'left' ? -shelfW / 2 + columnWidth / 2 : shelfW / 2 - columnWidth / 2,
            width: columnDepth + 2,
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
    showBackPanel, showBackStretchers, showShelves, numShelves, doorOuterGap
  } = settings;

  const innerWidth = width;
  const innerHeight = height;
  const innerDepth = depth;

  const doorWidth = width - blindPanelWidth - doorOuterGap * 2;
  const isGolaActive_DXF = settings.enableGola && settings.showDoors;
  const doorHeight = innerHeight + (isGolaActive_DXF ? settings.doorOverride : 0);
  const isLeftDoor = blindCornerSide === 'left';
  const hingeXOffset = isLeftDoor 
    ? -doorWidth / 2 + settings.hingeHorizontalOffset 
    : doorWidth / 2 - settings.hingeHorizontalOffset;

  const addPanelToZip = (name: string, w: number, h: number, notch?: { x: number, y: number, w: number, h: number }, holesInput?: { y: number, z: number, r: number }[]) => {
    if (dataCollector) {
      dataCollector({ name, width: w, height: h, holes: holesInput, cutouts: notch ? [notch] : [] });
    }
    if (!zip) return;
    const writer = new DxfWriter();
    writer.setUnits(Units.Millimeters);
    const modelSpace = writer.modelSpace;
    
    const points = [
      { point: { x: 0, y: 0 } },
      { point: { x: w, y: 0 } }
    ];

    if (notch) {
      points.push({ point: { x: w, y: notch.y } });
      points.push({ point: { x: notch.x + notch.w / 2, y: notch.y } });
      points.push({ point: { x: notch.x + notch.w / 2, y: h - notch.h } });
      points.push({ point: { x: notch.x - notch.w / 2, y: h - notch.h } });
      points.push({ point: { x: notch.x - notch.w / 2, y: notch.y } });
    }

    points.push({ point: { x: 0, y: h } });
    points.push({ point: { x: 0, y: 0 } });

    modelSpace.addLWPolyline(points, { flags: LWPolylineFlags.Closed });

    if (holesInput) {
      writer.addLayer('HOLES', 4, 'CONTINUOUS');
      holesInput.forEach(hole => {
        modelSpace.addCircle(point3d(w/2 + hole.z, h/2 + hole.y, 0), hole.r, { layerName: 'HOLES' });
      });
    }

    modelSpace.addText(point3d(w/2, h/2, 0), 10, name);
    zip.file(`${name}.dxf`, writer.stringify());
  };

  const sidePanelHeight = innerHeight - panelThickness * 2;
  
  addPanelToZip('Left_Panel', depth, sidePanelHeight);
  addPanelToZip('Right_Panel', depth, sidePanelHeight);
  addPanelToZip('Bottom_Panel', width, depth);
  addPanelToZip('Top_Panel', width, depth);
  addPanelToZip('Front_Blind_Panel', blindPanelWidth - doorOuterGap * 2, innerHeight);
  
  const hingeHoles = [
    { y: doorHeight / 2 - settings.hingeVerticalOffset, z: hingeXOffset, r: settings.hingeDiameter / 2 }, 
    { y: -doorHeight / 2 + settings.hingeVerticalOffset + (isGolaActive_DXF ? settings.doorOverride : 0), z: hingeXOffset, r: settings.hingeDiameter / 2 }
  ];
  addPanelToZip('Front_Door', doorWidth, doorHeight, undefined, hingeHoles);
  
  const supportH = sidePanelHeight;
  addPanelToZip('Internal_Support', topStretcherWidth, supportH);
  
  if (showBackPanel) {
    addPanelToZip('Back_Panel', width - panelThickness * 2 + grooveDepth * 2, innerHeight - panelThickness * 2 + grooveDepth * 2);
  }

  const stretcherW = width - panelThickness * 2;
  if(showBackStretchers) {
    addPanelToZip('Back_Stretcher_Top', stretcherW, backStretcherHeight);
    addPanelToZip('Back_Stretcher_Bottom', stretcherW, backStretcherHeight);
  }

  if (showShelves && numShelves > 0) {
    const shelfW = width - panelThickness * 2 - 2;
    const shelfD = depth - panelThickness - backPanelThickness - 2;
    const notchV = blindCornerSide === 'left' ? -shelfW / 2 + blindPanelWidth : shelfW / 2 - blindPanelWidth;
    
    for (let i = 0; i < numShelves; i++) {
      addPanelToZip(`Shelf_${i + 1}`, shelfW, shelfD, { 
        x: shelfW / 2 + notchV, 
        y: shelfD, 
        w: panelThickness + 2, 
        h: topStretcherWidth 
      });
    }
  }
};
