import React, { useMemo } from 'react';
import * as THREE from 'three';
import { DxfWriter, point3d, Units, LWPolylineFlags } from '@tarikjabiri/dxf';
import JSZip from 'jszip';
import { 
  TestingSettings, 
  createPanelWithHolesGeo, 
  createDoorWithHingeHoles, 
  createGroovedPanelGeo,
  panelColors,
  woodPalette,
  RUBY_DOOR_THRESHOLD
} from './CabinetTestingUtils';

interface Props {
  settings: TestingSettings;
}

export const TallCabinetTesting: React.FC<Props> = ({ settings }) => {
  const {
    width, height, depth, panelThickness, backPanelThickness,
    doorMaterialThickness, grooveDepth, doorToDoorGap, doorOuterGap, doorInnerGap,
    showBackPanel, showBackStretchers,
    showDoors, showDrawers, showShelves, numDrawers, numShelves, showHinges, skeletonView, partsSeparatedView, selectedPart,
    hingeDiameter, hingeDepth, hingeHorizontalOffset, hingeVerticalOffset, showDifferentPanelColors,
    showNailHoles, nailHoleDiameter,
    drawerSideClearance, drawerBoxHeightRatio, drawerBackThickness, drawerBottomThickness,
    tallLowerSectionHeight, tallUpperSectionHeight,
    showLowerShelves, numLowerShelves, showLowerDoors, lowerDoorOpenAngle,
    lowerSectionDrawerStackHeight, toeKickHeight,
  } = settings;

  const isSelected = settings.isSelected;
  const baseColor = new THREE.Color(isSelected ? '#3b82f6' : woodPalette.carcass);
  const darkerColor = new THREE.Color(isSelected ? '#3b82f6' : woodPalette.carcass);
  const backPanelColor = new THREE.Color(isSelected ? '#60a5fa' : woodPalette.backPanel);
  const doorColor = new THREE.Color(isSelected ? '#2563eb' : woodPalette.door);
  const toeKickColor = new THREE.Color(isSelected ? '#1e40af' : woodPalette.toeKick);
  const shelfColor = new THREE.Color(isSelected ? '#93c5fd' : woodPalette.shelf);

  const getPanelColor = (panelType: string): THREE.Color => {
    if (!showDifferentPanelColors) return darkerColor;
    return (panelColors as any)[panelType] || darkerColor;
  };

  const innerWidth = width;
  const innerHeight = height - toeKickHeight;
  const innerDepth = depth;

  const actualNumDoors = width < RUBY_DOOR_THRESHOLD ? 1 : 2;
  const doorWidth = actualNumDoors === 1 
    ? innerWidth - doorOuterGap * 2 
    : (innerWidth - doorOuterGap * 2 - doorInnerGap) / 2;
  
  const drawerHeightEach = numDrawers > 0 
    ? (lowerSectionDrawerStackHeight - doorOuterGap * (numDrawers + 1)) / numDrawers 
    : 0;

  const isLowerGolaActive = settings.enableGola && (showLowerDoors || (showDrawers && numDrawers > 0));
  const isUpperGolaActive = settings.enableTallUpperGola && showDoors;
  const golaVerticalGap = isLowerGolaActive ? 13 : doorOuterGap;
  const golaTopGap = isLowerGolaActive ? settings.golaTopGap : doorOuterGap;

  const actualDoorHeight = tallUpperSectionHeight - doorOuterGap + (isUpperGolaActive ? settings.doorOverride : 0);
  const doorYOffset_Upper = innerHeight / 2 - doorOuterGap - (tallUpperSectionHeight - doorOuterGap) / 2 - (isUpperGolaActive ? settings.doorOverride / 2 : 0);

  const actualLowerDoorHeight = tallLowerSectionHeight - doorOuterGap - (isLowerGolaActive ? settings.doorOverride : 0);
  const doorYOffset_Lower = -innerHeight / 2 + doorOuterGap + actualLowerDoorHeight / 2;

  const getOffset = (part: string, index: number = 0): [number, number, number] => {
    if (!partsSeparatedView || selectedPart !== 'all' && selectedPart !== part) return [0, 0, 0];
    const d = 200;
    const offsets: Record<string, [number, number, number]> = {
      leftPanel: [-d, 0, 0],
      rightPanel: [d, 0, 0],
      bottomPanel: [0, -d * 1.5, 0],
      topPanel: [0, d * 1.5, 0],
      backPanel: [0, 0, -d],
      door: [(index % 2 === 0 ? -1 : 1) * Math.ceil((index + 1) / 2) * d * 0.75, 0, d * 1.5],
      shelf: [0, 0, d * 2],
      topStretcher: [0, d * 1.5, -d],
      bottomStretcher: [0, -d * 1.5, -d],
      drawer: [0, 0, d * 1.5],
      drawerFront: [0, 0, d * 1.5],
      drawerSide: [0, 0, d * 1.5],
      drawerBack: [0, 0, d * 1.5],
      drawerBottom: [0, 0, d * 1.5],
      toeKick: [0, -d * 2, d],
    };
    return offsets[part] || [0, 0, 0];
  };

  const drawerData = useMemo(() => {
    const boxDepth = depth - panelThickness - backPanelThickness - settings.drawerBackClearance;
    const frontWidth = innerWidth - doorOuterGap * 2;
    const boxWidth = (width - panelThickness * 2) - drawerSideClearance * 2;
    const boxHeight = drawerHeightEach * drawerBoxHeightRatio;

    const dividerY = tallLowerSectionHeight - innerHeight / 2;
    const drawerZoneBottom = dividerY - lowerSectionDrawerStackHeight;

    let drawerFrontHeights = Array(numDrawers).fill(drawerHeightEach);
    let drawerYPositions = Array(numDrawers).fill(0);
    const gapHeights: number[] = [];

    if (isLowerGolaActive && numDrawers > 0) {
      const golaGapTotal = golaVerticalGap * 2;
      const totalAvailablePool = lowerSectionDrawerStackHeight - golaTopGap - doorOuterGap;
      const numGaps = numDrawers - 1;
      const totalGapSpace = numGaps * golaGapTotal;
      const eachFrontH = totalAvailablePool > 0 ? (totalAvailablePool - totalGapSpace) / numDrawers : 0;

      for (let i = 0; i < numDrawers; i++) {
        drawerFrontHeights[i] = eachFrontH;
        let yBase = drawerZoneBottom + doorOuterGap;
        for (let j = 0; j < i; j++) {
          yBase += drawerFrontHeights[j] + golaGapTotal;
        }
        drawerYPositions[i] = yBase + drawerFrontHeights[i] / 2;
        if (i < numDrawers - 1) {
          gapHeights.push(yBase + drawerFrontHeights[i] + golaVerticalGap);
        }
      }
    } else {
      for (let i = 0; i < numDrawers; i++) {
        drawerFrontHeights[i] = drawerHeightEach;
        drawerYPositions[i] = drawerZoneBottom + doorOuterGap + i * (drawerHeightEach + doorOuterGap) + drawerHeightEach / 2;
      }
    }

    return {
      drawerFrontHeights,
        drawerYPositions,
        boxWidth,
        boxDepth,
        frontWidth,
        boxH: boxHeight,
        gapHeights,
      boxZOffset: (panelThickness + backPanelThickness + settings.drawerBackClearance) / 2
    };
  }, [width, innerHeight, depth, panelThickness, backPanelThickness, doorOuterGap, numDrawers, drawerSideClearance, drawerBoxHeightRatio, settings.drawerBackClearance, innerWidth, drawerHeightEach, drawerBackThickness, drawerBottomThickness, lowerSectionDrawerStackHeight, tallLowerSectionHeight, isLowerGolaActive, golaVerticalGap, golaTopGap]);

  const nailHolePositions = useMemo(() => {
    if (!showNailHoles) return [];
    const positions: { y: number, z: number, r: number, through?: boolean }[] = [];
    const technicalR = nailHoleDiameter / 2;
    const shelfR = settings.shelfHoleDiameter / 2;
    const zBack = -depth / 2 + panelThickness / 2;

    if (showBackStretchers) {
      const topStretcherYTop = innerHeight / 2 - panelThickness;
      const bottomStretcherYTop = -innerHeight / 2 + panelThickness + settings.wallBottomRecess + 100;
      positions.push({ y: topStretcherYTop - 25, z: zBack, r: technicalR, through: true });
      positions.push({ y: topStretcherYTop - 80, z: zBack, r: technicalR, through: true });
      positions.push({ y: bottomStretcherYTop - 25, z: zBack, r: technicalR, through: true });
      positions.push({ y: bottomStretcherYTop - 80, z: zBack, r: technicalR, through: true });
    }

    const dividerY = tallLowerSectionHeight - innerHeight / 2;
    const holeY = dividerY - settings.nailHoleShelfDistance;
    const shelfZStart = -depth / 2 + panelThickness + backPanelThickness;
    const frontZ = shelfZStart + settings.shelfDepth * 0.25;
    const backZ = shelfZStart + settings.shelfDepth * 0.75;
    const isGolaActive = isLowerGolaActive;
    const golaLDepthOffset = isGolaActive ? settings.golaLCutoutDepth : 0;
    
    // Always add divider deck holes
    positions.push({ y: holeY, z: frontZ, r: shelfR, through: false });
    positions.push({ y: holeY, z: backZ, r: shelfR, through: false });

    if (showDrawers) {
      const drawerZoneBottom = dividerY - lowerSectionDrawerStackHeight;
      const dH = (lowerSectionDrawerStackHeight - (isGolaActive ? settings.golaTopGap : doorOuterGap) - doorOuterGap - (numDrawers - 1) * (golaVerticalGap * 2)) / numDrawers;
      for (let i = 0; i < numDrawers; i++) {
        // Use the same coordinate logic as drawerData for holes
        const hH = (isGolaActive && numDrawers > 0) ? drawerData.drawerYPositions[i] - (drawerData.drawerFrontHeights[i] / 2) + (drawerData.drawerFrontHeights[i] / 2) - settings.nailHoleShelfDistance : 0; // Logic fix needed
        // Simpler: use drawerData.drawerYPositions[i] - settings.nailHoleShelfDistance
        if (drawerData.drawerYPositions) {
           const hy = drawerData.drawerYPositions[i] - settings.nailHoleShelfDistance;
           positions.push({ y: hy, z: frontZ, r: shelfR, through: false });
           positions.push({ y: hy, z: backZ, r: shelfR, through: false });
        }
      }
    }

    if (showShelves && numShelves > 0) {
      const topSectionStart = innerHeight / 2 - tallUpperSectionHeight + panelThickness;
      const topSectionEnd = innerHeight / 2 - panelThickness;
      const availableHeight = topSectionEnd - topSectionStart;
      const spacing = availableHeight / numShelves;
      for (let i = 0; i < numShelves; i++) {
        const sy = topSectionStart + spacing * i;
        const yLocalSide = sy - panelThickness / 2;
        const holeY = yLocalSide - panelThickness / 2 - settings.nailHoleShelfDistance;
        const shelfZStart = -depth / 2 + panelThickness + backPanelThickness;
        const fZ = shelfZStart + settings.shelfDepth * 0.25;
        const bZ = shelfZStart + settings.shelfDepth * 0.75;
        positions.push({ y: holeY, z: fZ, r: shelfR, through: false });
        positions.push({ y: holeY, z: bZ, r: shelfR, through: false });
      }
    }

    if (showLowerShelves && numLowerShelves > 0) {
      const bottomSectionStart = -innerHeight / 2 + panelThickness;
      const drawerZoneBottom = (-innerHeight / 2 + tallLowerSectionHeight) - (showDrawers ? lowerSectionDrawerStackHeight : 0);
      const bottomSectionEnd = drawerZoneBottom - doorOuterGap;
      const availableHeight = bottomSectionEnd - bottomSectionStart;
      const spacing = availableHeight / (numLowerShelves + 1);
      for (let i = 0; i < numLowerShelves; i++) {
        const shelfYCabinet = bottomSectionStart + spacing * (i + 1);
        const yLocalSide = shelfYCabinet - panelThickness / 2;
        const holeY = yLocalSide - panelThickness / 2 - settings.nailHoleShelfDistance;
        const shelfZStart = -depth / 2 + panelThickness + backPanelThickness;
        const frontZ = shelfZStart + settings.shelfDepth * 0.25;
        const backZ = shelfZStart + settings.shelfDepth * 0.75;
        positions.push({ y: holeY, z: frontZ, r: shelfR, through: false });
        positions.push({ y: holeY, z: backZ, r: shelfR, through: false });
      }
    }
    return positions;
  }, [showNailHoles, height, depth, panelThickness, backPanelThickness, settings.shelfHoleDiameter, 
      showShelves, numShelves, showLowerShelves, numLowerShelves,
      tallLowerSectionHeight, tallUpperSectionHeight, doorOuterGap,
      settings.nailHoleShelfDistance, settings.shelfDepth, settings.wallBottomRecess, nailHoleDiameter, showBackStretchers,
      showDrawers, numDrawers, lowerSectionDrawerStackHeight]);

  const leftPanelGeo = useMemo(() => {
    const sidePanelHeight = innerHeight - panelThickness * 2;
    const dividerY = tallLowerSectionHeight - innerHeight / 2;
    const notches: any[] = [];
    if (isLowerGolaActive) {
      notches.push({ u: depth / 2, v: dividerY, width: settings.golaLCutoutDepth, height: settings.golaLCutoutHeight, alignV: 'top' });
      if (showDrawers && drawerData.gapHeights.length > 0) {
        drawerData.gapHeights.forEach(gh => {
          notches.push({ u: depth / 2, v: gh, width: settings.golaCutoutDepth, height: settings.golaCCutoutHeight, alignV: 'center' });
        });
      }
    }
    return createPanelWithHolesGeo(
      panelThickness, sidePanelHeight, depth,
      -depth / 2 + panelThickness, -depth / 2 + panelThickness + backPanelThickness,
      grooveDepth, 'px',
      nailHolePositions, settings.nailHoleDepth,
      panelThickness - grooveDepth, 0,
      notches
    );
  }, [panelThickness, innerHeight, height, depth, backPanelThickness, grooveDepth, nailHolePositions, settings.nailHoleDepth, isLowerGolaActive, isUpperGolaActive, tallLowerSectionHeight, drawerData.gapHeights, settings.golaLCutoutDepth, settings.golaCutoutDepth, settings.golaLCutoutHeight, settings.golaCCutoutHeight, showDrawers]);

  const rightPanelGeo = useMemo(() => {
    const sidePanelHeight = innerHeight - panelThickness * 2;
    const dividerY = tallLowerSectionHeight - innerHeight / 2;
    const notches: any[] = [];
    if (isLowerGolaActive) {
      notches.push({ u: depth / 2, v: dividerY, width: settings.golaLCutoutDepth, height: settings.golaLCutoutHeight, alignV: 'top' });
      if (showDrawers && drawerData.gapHeights.length > 0) {
        drawerData.gapHeights.forEach(gh => {
          notches.push({ u: depth / 2, v: gh, width: settings.golaCutoutDepth, height: settings.golaCCutoutHeight, alignV: 'center' });
        });
      }
    }
    return createPanelWithHolesGeo(
      panelThickness, sidePanelHeight, depth,
      -depth / 2 + panelThickness, -depth / 2 + panelThickness + backPanelThickness,
      grooveDepth, 'nx',
      nailHolePositions, settings.nailHoleDepth,
      panelThickness - grooveDepth, 0,
      notches
    );
  }, [panelThickness, innerHeight, height, depth, backPanelThickness, grooveDepth, nailHolePositions, settings.nailHoleDepth, isLowerGolaActive, isUpperGolaActive, tallLowerSectionHeight, drawerData.gapHeights, settings.golaLCutoutDepth, settings.golaCutoutDepth, settings.golaLCutoutHeight, settings.golaCCutoutHeight, showDrawers]);

  const commonPanelHoles = useMemo(() => {
    if (!showNailHoles) return [];
    const technicalR = nailHoleDiameter / 2;
    const u1 = -innerDepth / 2 + innerDepth / 5;
    const u2 = 0;
    const u3 = innerDepth / 2 - innerDepth / 5;
    const vLeft = -innerWidth / 2 + panelThickness / 2;
    const vRight = innerWidth / 2 - panelThickness / 2;

    const positions = [
      { y: vLeft, z: u1, r: technicalR, through: true },
      { y: vLeft, z: u2, r: technicalR, through: true },
      { y: vLeft, z: u3, r: technicalR, through: true },
      { y: vRight, z: u1, r: technicalR, through: true },
      { y: vRight, z: u2, r: technicalR, through: true },
      { y: vRight, z: u3, r: technicalR, through: true }
    ];

    if (showBackStretchers) {
      const v1 = -innerWidth / 2 + innerWidth / 5;
      const v2 = 0;
      const v3 = innerWidth / 2 - innerWidth / 5;
      const zBackHole = -innerDepth / 2 + panelThickness / 2;
      positions.push(
        { y: v1, z: zBackHole, r: technicalR, through: true },
        { y: v2, z: zBackHole, r: technicalR, through: true },
        { y: v3, z: zBackHole, r: technicalR, through: true }
      );
    }
    return positions;
  }, [showNailHoles, innerWidth, innerDepth, panelThickness, nailHoleDiameter, showBackStretchers]);

  const bottomPanelHoles = useMemo(() => {
    if (!showNailHoles) return [];
    const technicalR = nailHoleDiameter / 2;
    const positions = [...commonPanelHoles];
    
    // Add 3 Toe Kick Nailholes
    const tk1 = -innerWidth / 2 + innerWidth / 5;
    const tk2 = 0;
    const tk3 = innerWidth / 2 - innerWidth / 5;
    const zToeKick = innerDepth / 2 - 50 - panelThickness / 2;
    positions.push(
      { y: tk1, z: zToeKick, r: technicalR, through: true },
      { y: tk2, z: zToeKick, r: technicalR, through: true },
      { y: tk3, z: zToeKick, r: technicalR, through: true }
    );

    return positions;
  }, [commonPanelHoles, showNailHoles, innerWidth, innerDepth, panelThickness, nailHoleDiameter]);

  const bottomPanelGeo = useMemo(() => createPanelWithHolesGeo(
    panelThickness, innerWidth, innerDepth,
    -innerDepth / 2 + panelThickness, -innerDepth / 2 + panelThickness + backPanelThickness,
    grooveDepth, 'py',
    bottomPanelHoles, settings.nailHoleDepth,
    panelThickness, panelThickness
  ), [innerWidth, panelThickness, innerDepth, backPanelThickness, grooveDepth, bottomPanelHoles, settings.nailHoleDepth]);

  const topPanelGeo = useMemo(() => createPanelWithHolesGeo(
    panelThickness, innerWidth, innerDepth,
    -innerDepth / 2 + panelThickness, -innerDepth / 2 + panelThickness + backPanelThickness,
    grooveDepth, 'ny',
    commonPanelHoles, settings.nailHoleDepth,
    panelThickness, panelThickness
  ), [innerWidth, panelThickness, innerDepth, backPanelThickness, grooveDepth, commonPanelHoles, settings.nailHoleDepth]);

  const doorGeos = useMemo(() => {
    const geos = [];
    const isUpperGolaActive = settings.enableTallUpperGola && settings.showDoors;
    for (let i = 0; i < actualNumDoors; i++) {
      const hingeXOffset = actualNumDoors === 1 
        ? -doorWidth / 2 + hingeHorizontalOffset 
        : (i === 0 ? -doorWidth / 2 + hingeHorizontalOffset : doorWidth / 2 - hingeHorizontalOffset);
      geos.push(createDoorWithHingeHoles(
        doorWidth, actualDoorHeight, doorMaterialThickness,
        hingeXOffset, hingeDiameter / 2, hingeDepth, 
        hingeVerticalOffset, hingeVerticalOffset + (isUpperGolaActive ? settings.doorOverride : 0)
      ));
    }
    return geos;
  }, [actualNumDoors, doorWidth, actualDoorHeight, doorMaterialThickness, hingeHorizontalOffset, hingeDiameter, hingeDepth, hingeVerticalOffset, settings.enableTallUpperGola, settings.showDoors, settings.doorOverride]);

  const lowerDoorGeos = useMemo(() => {
    const geos = [];
    for (let i = 0; i < actualNumDoors; i++) {
      const hingeXOffset = actualNumDoors === 1 
        ? -doorWidth / 2 + hingeHorizontalOffset 
        : (i === 0 ? -doorWidth / 2 + hingeHorizontalOffset : doorWidth / 2 - hingeHorizontalOffset);
      geos.push(createDoorWithHingeHoles(
        doorWidth, actualLowerDoorHeight, doorMaterialThickness,
        hingeXOffset, hingeDiameter / 2, hingeDepth, 
        hingeVerticalOffset, hingeVerticalOffset
      ));
    }
    return geos;
  }, [actualNumDoors, doorWidth, actualLowerDoorHeight, doorMaterialThickness, hingeHorizontalOffset, hingeDiameter, hingeDepth, hingeVerticalOffset]);


  const getDrawerGeos = (i: number) => {
    const { drawerFrontHeights, boxWidth, boxDepth, frontWidth } = drawerData;
    const h = drawerFrontHeights[i];
    const boxH = h * drawerBoxHeightRatio;
    const technicalR = nailHoleDiameter / 2;
    
    const sideHoles = [];
    if (showNailHoles) {
      [0.25, 0.75].forEach(vRatio => {
        sideHoles.push({ z: -boxDepth / 2 + drawerBackThickness / 2, y: -boxH / 2 + boxH * vRatio, r: technicalR, through: true });
      });
      [0.2, 0.5, 0.8].forEach(dRatio => {
        sideHoles.push({ z: -boxDepth / 2 + boxDepth * dRatio, y: -boxH / 2 + drawerBottomThickness / 2, r: technicalR, through: true });
      });
    }

    const fHoles = [];
    if (showNailHoles) {
      [-1, 1].forEach(side => [0.25, 0.75].forEach(vRatio => {
        fHoles.push({ z: side * (boxWidth / 2 - panelThickness / 2), y: -boxH / 2 + boxH * vRatio, r: technicalR, through: true });
      }));
    }
    const bottomFHoles = [];
    if (showNailHoles) {
      [-1, 1].forEach(side => [0.25, 0.75].forEach(vRatio => {
        bottomFHoles.push({ z: side * (boxWidth / 2 - panelThickness / 2), y: -boxH / 2 + boxH * vRatio + panelThickness / 2, r: technicalR, through: true });
      }));
    }

    return {
      frontGeo: createPanelWithHolesGeo(doorMaterialThickness, h, frontWidth, 0, 0, 0, 'px', i === 0 ? bottomFHoles : fHoles, doorMaterialThickness),
      sideLGeo: createPanelWithHolesGeo(panelThickness, boxH, boxDepth, 0, 0, 0, 'nx', sideHoles, panelThickness),
      sideRGeo: createPanelWithHolesGeo(panelThickness, boxH, boxDepth, 0, 0, 0, 'px', sideHoles, panelThickness),
      boxH
    };
  };

  const shelfGeo = useMemo(() => {
    const shelfWidth = innerWidth - panelThickness * 2 - 2;
    const shelfDepth = settings.shelfDepth;
    return new THREE.BoxGeometry(shelfWidth, panelThickness, shelfDepth);
  }, [innerWidth, panelThickness, settings.shelfDepth]);

  const shouldShow = (part: string): boolean => {
    if (!partsSeparatedView) return true;
    if (selectedPart === 'all' || selectedPart === part) return true;
    if (selectedPart === 'drawer' && (part === 'drawerFront' || part === 'drawerSide' || part === 'drawerBack' || part === 'drawerBottom')) return true;
    if (selectedPart === 'toeKick' && part === 'toeKick') return true;
    return false;
  };

  return (
    <group position={[width / 2, innerHeight / 2 + toeKickHeight, depth / 2]}>
      {shouldShow('bottomPanel') && (
        <mesh position={[0 + getOffset('bottomPanel')[0], -innerHeight / 2 + panelThickness / 2 + getOffset('bottomPanel')[1], 0 + getOffset('bottomPanel')[2]]} castShadow receiveShadow visible={!skeletonView}>
          <primitive object={bottomPanelGeo} attach="geometry" />
          <meshStandardMaterial color={getPanelColor('bottomPanel')} roughness={0.4} metalness={0} side={THREE.DoubleSide} transparent={settings.opacity < 1} opacity={settings.opacity} />
        </mesh>
      )}
      {skeletonView && shouldShow('bottomPanel') && (
        <lineSegments position={[0 + getOffset('bottomPanel')[0], -innerHeight / 2 + panelThickness / 2 + getOffset('bottomPanel')[1], 0 + getOffset('bottomPanel')[2]]}>
          <edgesGeometry args={[bottomPanelGeo]} />
          <lineBasicMaterial color={getPanelColor('bottomPanel')} linewidth={2} />
        </lineSegments>
      )}
      {shouldShow('topPanel') && (
        <mesh position={[0 + getOffset('topPanel')[0], innerHeight / 2 - panelThickness / 2 + getOffset('topPanel')[1], 0 + getOffset('topPanel')[2]]} castShadow receiveShadow visible={!skeletonView}>
          <primitive object={topPanelGeo} attach="geometry" />
          <meshStandardMaterial color={getPanelColor('topPanel')} roughness={0.4} metalness={0} side={THREE.DoubleSide} transparent={settings.opacity < 1} opacity={settings.opacity} />
        </mesh>
      )}
      {skeletonView && shouldShow('topPanel') && (
        <lineSegments position={[0 + getOffset('topPanel')[0], innerHeight / 2 - panelThickness / 2 + getOffset('topPanel')[1], 0 + getOffset('topPanel')[2]]}>
          <edgesGeometry args={[topPanelGeo]} />
          <lineBasicMaterial color={getPanelColor('topPanel')} linewidth={2} />
        </lineSegments>
      )}

      {toeKickHeight > 0 && shouldShow('toeKick') && (
        <mesh position={[0 + getOffset('toeKick')[0], -innerHeight / 2 - toeKickHeight / 2 + getOffset('toeKick')[1], depth / 2 - 50 - panelThickness / 2 + getOffset('toeKick')[2]]} castShadow receiveShadow visible={!skeletonView}>
          <boxGeometry args={[width, toeKickHeight, panelThickness]} />
          <meshStandardMaterial color={toeKickColor} roughness={0.4} metalness={0} transparent={settings.opacity < 1} opacity={settings.opacity} />
        </mesh>
      )}
      {toeKickHeight > 0 && skeletonView && shouldShow('toeKick') && (
        <lineSegments position={[0 + getOffset('toeKick')[0], -innerHeight / 2 - toeKickHeight / 2 + getOffset('toeKick')[1], depth / 2 - 50 - panelThickness / 2 + getOffset('toeKick')[2]]}>
          <edgesGeometry args={[new THREE.BoxGeometry(width, toeKickHeight, panelThickness)]} />
          <lineBasicMaterial color={getPanelColor('toeKick')} linewidth={2} />
        </lineSegments>
      )}

      {shouldShow('leftPanel') && (
        <mesh position={[-width / 2 + panelThickness / 2 + getOffset('leftPanel')[0], 0 + getOffset('leftPanel')[1], 0 + getOffset('leftPanel')[2]]} castShadow receiveShadow visible={!skeletonView}>
          <primitive object={leftPanelGeo} attach="geometry" />
          <meshStandardMaterial color={getPanelColor('leftPanel')} roughness={0.4} metalness={0} side={THREE.DoubleSide} transparent={settings.opacity < 1} opacity={settings.opacity} />
        </mesh>
      )}
      {skeletonView && shouldShow('leftPanel') && (
        <lineSegments position={[-width / 2 + panelThickness / 2 + getOffset('leftPanel')[0], 0 + getOffset('leftPanel')[1], 0 + getOffset('leftPanel')[2]]}>
          <edgesGeometry args={[leftPanelGeo]} />
          <lineBasicMaterial color={getPanelColor('leftPanel')} linewidth={2} />
        </lineSegments>
      )}
      {shouldShow('rightPanel') && (
        <mesh position={[width / 2 - panelThickness / 2 + getOffset('rightPanel')[0], 0 + getOffset('rightPanel')[1], 0 + getOffset('rightPanel')[2]]} castShadow receiveShadow visible={!skeletonView}>
          <primitive object={rightPanelGeo} attach="geometry" />
          <meshStandardMaterial color={getPanelColor('rightPanel')} roughness={0.4} metalness={0} side={THREE.DoubleSide} transparent={settings.opacity < 1} opacity={settings.opacity} />
        </mesh>
      )}
      {skeletonView && shouldShow('rightPanel') && (
        <lineSegments position={[width / 2 - panelThickness / 2 + getOffset('rightPanel')[0], 0 + getOffset('rightPanel')[1], 0 + getOffset('rightPanel')[2]]}>
          <edgesGeometry args={[rightPanelGeo]} />
          <lineBasicMaterial color={getPanelColor('rightPanel')} linewidth={2} />
        </lineSegments>
      )}

      {showBackPanel && shouldShow('backPanel') && (
        <mesh position={[0 + getOffset('backPanel')[0], 0 + getOffset('backPanel')[1], -innerDepth / 2 + panelThickness + backPanelThickness / 2 + getOffset('backPanel')[2]]} castShadow receiveShadow visible={!skeletonView}>
          <boxGeometry args={[innerWidth - panelThickness * 2 + grooveDepth * 2, innerHeight - panelThickness * 2 + grooveDepth * 2, backPanelThickness]} />
          <meshStandardMaterial color={showDifferentPanelColors ? panelColors.backPanel : backPanelColor} roughness={0.5} metalness={0} transparent={settings.opacity < 1} opacity={settings.opacity} />
        </mesh>
      )}
      {showBackPanel && skeletonView && shouldShow('backPanel') && (
        <lineSegments position={[0 + getOffset('backPanel')[0], 0 + getOffset('backPanel')[1], -innerDepth / 2 + panelThickness + backPanelThickness / 2 + getOffset('backPanel')[2]]}>
          <edgesGeometry args={[new THREE.BoxGeometry(innerWidth - panelThickness * 2 + grooveDepth * 2, innerHeight - panelThickness * 2 + grooveDepth * 2, backPanelThickness)]} />
          <lineBasicMaterial color={getPanelColor('backPanel')} linewidth={2} />
        </lineSegments>
      )}

      {showBackStretchers && (
        <>
          <mesh position={[0, innerHeight / 2 - panelThickness - 50, -innerDepth / 2 + panelThickness / 2 + getOffset('topStretcher')[2]]} castShadow receiveShadow visible={!skeletonView}>
            <boxGeometry args={[innerWidth - panelThickness * 2, 100, panelThickness]} />
            <meshStandardMaterial color={getPanelColor('topStretcher')} roughness={0.4} metalness={0} transparent={settings.opacity < 1} opacity={settings.opacity} />
          </mesh>
          {skeletonView && (
            <lineSegments position={[0, innerHeight / 2 - panelThickness - 50, -innerDepth / 2 + panelThickness / 2 + getOffset('topStretcher')[2]]}>
              <edgesGeometry args={[new THREE.BoxGeometry(innerWidth - panelThickness * 2, 100, panelThickness)]} />
              <lineBasicMaterial color={getPanelColor('topStretcher')} linewidth={2} />
            </lineSegments>
          )}

          <mesh position={[0, -innerHeight / 2 + panelThickness + settings.wallBottomRecess + 50, -innerDepth / 2 + panelThickness / 2 + getOffset('bottomStretcher')[2]]} castShadow receiveShadow visible={!skeletonView}>
            <boxGeometry args={[innerWidth - panelThickness * 2, 100, panelThickness]} />
            <meshStandardMaterial color={getPanelColor('bottomStretcher')} roughness={0.4} metalness={0} transparent={settings.opacity < 1} opacity={settings.opacity} />
          </mesh>
          {skeletonView && (
            <lineSegments position={[0, -innerHeight / 2 + panelThickness + settings.wallBottomRecess + 50, -innerDepth / 2 + panelThickness / 2 + getOffset('bottomStretcher')[2]]}>
              <edgesGeometry args={[new THREE.BoxGeometry(innerWidth - panelThickness * 2, 100, panelThickness)]} />
              <lineBasicMaterial color={getPanelColor('bottomStretcher')} linewidth={2} />
            </lineSegments>
          )}
        </>
      )}

      {showDoors && actualNumDoors > 0 && Array.from({ length: actualNumDoors }).map((_, i) => {
        const doorX = actualNumDoors === 1 ? 0 : (i === 0 ? -doorWidth / 2 - doorInnerGap / 2 : doorWidth / 2 + doorInnerGap / 2);
        const handleXOffset = actualNumDoors === 1 ? doorWidth / 2 - 30 : (i === 0 ? doorWidth / 2 - 30 : -doorWidth / 2 + 30);
        const hingeXOffset = actualNumDoors === 1 ? -doorWidth / 2 + hingeHorizontalOffset : (i === 0 ? -doorWidth / 2 + hingeHorizontalOffset : doorWidth / 2 - hingeHorizontalOffset);

        const doorAngle = (settings.doorOpenAngle * Math.PI) / 180;
        const isLeftDoor = actualNumDoors === 1 || i === 0;
        const rotationDirection = isLeftDoor ? -1 : 1;
        const pivotX = isLeftDoor ? -doorWidth / 2 : doorWidth / 2;

        return (
          <group key={`door-${i}`} position={[doorX + getOffset('door', i)[0], doorYOffset_Upper + getOffset('door', i)[1], depth / 2 + getOffset('door', i)[2]]}>
            <group position={[pivotX, 0, 0]} rotation={[0, rotationDirection * doorAngle, 0]}>
              <mesh position={[-pivotX, 0, doorMaterialThickness / 2]} castShadow receiveShadow visible={!skeletonView}>
                <primitive object={doorGeos[i]} attach="geometry" />
                <meshStandardMaterial color={doorColor} roughness={0.4} metalness={0} transparent={settings.opacity < 1} opacity={settings.opacity} />
              </mesh>
              {skeletonView && (
                <lineSegments position={[-pivotX, 0, doorMaterialThickness / 2]}>
                  <edgesGeometry args={[doorGeos[i]]} />
                  <lineBasicMaterial color={getPanelColor('door')} linewidth={2} />
                </lineSegments>
              )}
              {shouldShow('door') && !isUpperGolaActive && (
                <mesh position={[handleXOffset - pivotX, -actualDoorHeight / 2 + 50, doorMaterialThickness + 5]} rotation={[0, 0, Math.PI / 2]} castShadow>
                  <cylinderGeometry args={[2.5, 2.5, 60, 16]} />
                  <meshStandardMaterial color="#4a5568" metalness={0.8} roughness={0.2} />
                </mesh>
              )}
              {showHinges && (
                <>
                  <mesh position={[hingeXOffset - pivotX, actualDoorHeight / 2 - hingeVerticalOffset, -hingeDepth / 2]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                    <cylinderGeometry args={[hingeDiameter / 2, hingeDiameter / 2, hingeDepth, 16]} />
                    <meshStandardMaterial color="#333333" metalness={0.9} roughness={0.1} />
                  </mesh>
                  <mesh position={[hingeXOffset - pivotX, -actualDoorHeight / 2 + hingeVerticalOffset + (isUpperGolaActive ? settings.doorOverride : 0), -hingeDepth / 2]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                    <cylinderGeometry args={[hingeDiameter / 2, hingeDiameter / 2, hingeDepth, 16]} />
                    <meshStandardMaterial color="#333333" metalness={0.9} roughness={0.1} />
                  </mesh>
                </>
              )}
            </group>
          </group>
        );
      })}

      {showLowerDoors && actualNumDoors > 0 && Array.from({ length: actualNumDoors }).map((_, i) => {
        const doorX = actualNumDoors === 1 ? 0 : (i === 0 ? -doorWidth / 2 - doorInnerGap / 2 : doorWidth / 2 + doorInnerGap / 2);
        const handleXOffset = actualNumDoors === 1 ? doorWidth / 2 - 30 : (i === 0 ? doorWidth / 2 - 30 : -doorWidth / 2 + 30);
        const hingeXOffset = actualNumDoors === 1 ? -doorWidth / 2 + hingeHorizontalOffset : (i === 0 ? -doorWidth / 2 + hingeHorizontalOffset : doorWidth / 2 - hingeHorizontalOffset);

        const doorAngle = (lowerDoorOpenAngle * Math.PI) / 180;
        const isLeftDoor = actualNumDoors === 1 || i === 0;
        const rotationDirection = isLeftDoor ? -1 : 1;
        const pivotX = isLeftDoor ? -doorWidth / 2 : doorWidth / 2;

        return (
          <group key={`lower-door-${i}`} position={[doorX + getOffset('door', i)[0], doorYOffset_Lower + getOffset('door', i)[1], depth / 2 + getOffset('door', i)[2]]}>
            <group position={[pivotX, 0, 0]} rotation={[0, rotationDirection * doorAngle, 0]}>
              <mesh position={[-pivotX, 0, doorMaterialThickness / 2]} castShadow receiveShadow visible={!skeletonView}>
                <primitive object={lowerDoorGeos[i]} attach="geometry" />
                <meshStandardMaterial color={doorColor} roughness={0.4} metalness={0} transparent={settings.opacity < 1} opacity={settings.opacity} />
              </mesh>
              {skeletonView && (
                <lineSegments position={[-pivotX, 0, doorMaterialThickness / 2]}>
                  <edgesGeometry args={[lowerDoorGeos[i]]} />
                  <lineBasicMaterial color={getPanelColor('door')} linewidth={2} />
                </lineSegments>
              )}
              {shouldShow('door') && !isLowerGolaActive && (
                <mesh position={[handleXOffset - pivotX, 0, doorMaterialThickness + 5]} castShadow>
                  <cylinderGeometry args={[2.5, 2.5, 50, 16]} />
                  <meshStandardMaterial color="#4a5568" metalness={0.8} roughness={0.2} />
                </mesh>
              )}
              {showHinges && (
                <>
                  <mesh position={[hingeXOffset - pivotX, actualLowerDoorHeight / 2 - hingeVerticalOffset, -hingeDepth / 2]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                    <cylinderGeometry args={[hingeDiameter / 2, hingeDiameter / 2, hingeDepth, 16]} />
                    <meshStandardMaterial color="#333333" metalness={0.9} roughness={0.1} />
                  </mesh>
                  <mesh position={[hingeXOffset - pivotX, -actualLowerDoorHeight / 2 + hingeVerticalOffset, -hingeDepth / 2]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                    <cylinderGeometry args={[hingeDiameter / 2, hingeDiameter / 2, hingeDepth, 16]} />
                    <meshStandardMaterial color="#333333" metalness={0.9} roughness={0.1} />
                  </mesh>
                </>
              )}
            </group>
          </group>
        );
      })}

      {showDrawers && numDrawers > 0 && Array.from({ length: numDrawers }).map((_, i) => {
        const { drawerYPositions, boxWidth, boxDepth, boxZOffset } = drawerData;
        const { frontGeo, sideLGeo, sideRGeo, boxH } = getDrawerGeos(i);
        const drawerOpenDistance = (settings.drawerOpenDistances && settings.drawerOpenDistances[i]) || 0;
        return (
          <group key={`drawer-${i}`} position={[getOffset('drawer', i)[0], getOffset('drawer', i)[1], getOffset('drawer', i)[2] + drawerOpenDistance]}>
            <mesh position={[0, drawerYPositions[i], depth / 2 + doorMaterialThickness / 2]} rotation={[0, -Math.PI / 2, 0]} castShadow receiveShadow visible={!skeletonView}>
              <primitive object={frontGeo} attach="geometry" />
              <meshStandardMaterial color={showDifferentPanelColors ? panelColors.drawerFront : doorColor} roughness={0.4} metalness={0} side={THREE.DoubleSide} transparent={settings.opacity < 1} opacity={settings.opacity} />
            </mesh>
            {!isLowerGolaActive && (
              <mesh position={[0, drawerYPositions[i], depth / 2 + doorMaterialThickness + 5]} rotation={[0, 0, Math.PI / 2]} castShadow>
                <cylinderGeometry args={[2.5, 2.5, 150, 16]} />
                <meshStandardMaterial color="#4a5568" metalness={0.8} roughness={0.2} />
              </mesh>
            )}
            {shouldShow('drawerBottom') && (
              <mesh position={[0, drawerYPositions[i] - boxH / 2 + drawerBottomThickness / 2, boxZOffset + drawerBackThickness / 2]} castShadow receiveShadow visible={!skeletonView}>
                <boxGeometry args={[boxWidth - panelThickness * 2, drawerBottomThickness, boxDepth - drawerBackThickness]} />
                <meshStandardMaterial color={showDifferentPanelColors ? panelColors.drawerBottom : shelfColor} roughness={0.4} metalness={0} transparent={settings.opacity < 1} opacity={settings.opacity} />
              </mesh>
            )}
            {[-1, 1].map(side => shouldShow('drawerSide') && (
              <mesh key={side} position={[side * (boxWidth / 2 - panelThickness / 2), drawerYPositions[i], boxZOffset]} castShadow receiveShadow visible={!skeletonView}>
                <primitive object={side === -1 ? sideLGeo : sideRGeo} attach="geometry" />
                <meshStandardMaterial color={showDifferentPanelColors ? panelColors.drawerSide : shelfColor} roughness={0.4} metalness={0} side={THREE.DoubleSide} transparent={settings.opacity < 1} opacity={settings.opacity} />
              </mesh>
            ))}
            {shouldShow('drawerBack') && (
              <mesh position={[0, drawerYPositions[i], boxZOffset - boxDepth / 2 + drawerBackThickness / 2]} castShadow receiveShadow visible={!skeletonView}>
                <boxGeometry args={[boxWidth - panelThickness * 2, boxH, drawerBackThickness]} />
                <meshStandardMaterial color={showDifferentPanelColors ? panelColors.drawerBack : shelfColor} roughness={0.4} metalness={0} transparent={settings.opacity < 1} opacity={settings.opacity} />
              </mesh>
            )}

            {skeletonView && (
              <>
                <lineSegments position={[0, drawerYPositions[i], depth / 2 + doorMaterialThickness / 2]} rotation={[0, -Math.PI / 2, 0]}>
                  <edgesGeometry args={[frontGeo]} />
                  <lineBasicMaterial color={getPanelColor('drawerFront')} linewidth={2} />
                </lineSegments>
                {shouldShow('drawerBottom') && (
                  <lineSegments position={[0, drawerYPositions[i] - boxH / 2 + drawerBottomThickness / 2, boxZOffset + drawerBackThickness / 2]}>
                    <edgesGeometry args={[new THREE.BoxGeometry(boxWidth - panelThickness * 2, drawerBottomThickness, boxDepth - drawerBackThickness)]} />
                    <lineBasicMaterial color={getPanelColor('drawerBottom')} linewidth={2} />
                  </lineSegments>
                )}
                {[-1, 1].map(side => shouldShow('drawerSide') && (
                  <lineSegments key={`sk-side-${side}`} position={[side * (boxWidth / 2 - panelThickness / 2), drawerYPositions[i], boxZOffset]}>
                    <edgesGeometry args={[side === -1 ? sideLGeo : sideRGeo]} />
                    <lineBasicMaterial color={getPanelColor('drawerSide')} linewidth={2} />
                  </lineSegments>
                ))}
                {shouldShow('drawerBack') && (
                  <lineSegments position={[0, drawerYPositions[i], boxZOffset - boxDepth / 2 + drawerBackThickness / 2]}>
                    <edgesGeometry args={[new THREE.BoxGeometry(boxWidth - panelThickness * 2, boxH, drawerBackThickness)]} />
                    <lineBasicMaterial color={getPanelColor('drawerBack')} linewidth={2} />
                  </lineSegments>
                )}
              </>
            )}
          </group>
        );
      })}


      <mesh position={[0 + getOffset('shelf', 99)[0], tallLowerSectionHeight - innerHeight / 2 - panelThickness / 2 + getOffset('shelf', 99)[1], -depth / 2 + panelThickness + backPanelThickness + (depth - panelThickness - backPanelThickness) / 2 + getOffset('shelf', 99)[2]]} castShadow receiveShadow visible={!skeletonView}>
        <boxGeometry args={[innerWidth - panelThickness * 2, panelThickness, depth - panelThickness - backPanelThickness]} />
        <meshStandardMaterial color={shelfColor} roughness={0.4} metalness={0} transparent={settings.opacity < 1} opacity={settings.opacity} />
      </mesh>

      {showShelves && numShelves > 0 && Array.from({ length: numShelves }).map((_, i) => {
        const topSectionStart = innerHeight / 2 - tallUpperSectionHeight + panelThickness;
        const topSectionEnd = innerHeight / 2 - panelThickness;
        const availableHeight = topSectionEnd - topSectionStart;
        const spacing = availableHeight / numShelves;
        const sy = topSectionStart + spacing * i;
        const shelfZOffset = -depth / 2 + panelThickness + backPanelThickness + settings.shelfDepth / 2;
        return (
          <mesh key={`shelf-upper-${i}`} position={[0 + getOffset('shelf', i)[0], sy - panelThickness / 2 + getOffset('shelf', i)[1], shelfZOffset + getOffset('shelf', i)[2]]} castShadow receiveShadow visible={!skeletonView}>
            <primitive object={shelfGeo.clone()} attach="geometry" />
            <meshStandardMaterial color={shelfColor} roughness={0.4} metalness={0} transparent={settings.opacity < 1} opacity={settings.opacity} />
          </mesh>
        );
      })}
      {showLowerShelves && numLowerShelves > 0 && Array.from({ length: numLowerShelves }).map((_, i) => {
        const bottomSectionStart = -innerHeight / 2 + panelThickness;
        const drawerZoneBottom = (-innerHeight / 2 + tallLowerSectionHeight) - (showDrawers ? lowerSectionDrawerStackHeight : 0);
        const bottomSectionEnd = drawerZoneBottom - doorOuterGap;
        const availableHeight = bottomSectionEnd - bottomSectionStart;
        const spacing = availableHeight / (numLowerShelves + 1);
        const shelfY = bottomSectionStart + spacing * (i + 1);
        const shelfZOffset = -depth / 2 + panelThickness + backPanelThickness + settings.shelfDepth / 2;
        return (
          <mesh key={`shelf-lower-${i}`} position={[0 + getOffset('shelf', i)[0], shelfY - panelThickness / 2 + getOffset('shelf', i)[1], shelfZOffset + getOffset('shelf', i)[2]]} castShadow receiveShadow visible={!skeletonView}>
            <primitive object={shelfGeo.clone()} attach="geometry" />
            <meshStandardMaterial color={shelfColor} roughness={0.4} metalness={0} transparent={settings.opacity < 1} opacity={settings.opacity} />
          </mesh>
        );
      })}
      {skeletonView && (
        <lineSegments position={[0 + getOffset('shelf', 99)[0], tallLowerSectionHeight - innerHeight / 2 - panelThickness / 2 + getOffset('shelf', 99)[1], -depth / 2 + panelThickness + backPanelThickness + (depth - panelThickness - backPanelThickness) / 2 + getOffset('shelf', 99)[2]]}>
          <edgesGeometry args={[new THREE.BoxGeometry(innerWidth - panelThickness * 2, panelThickness, depth - panelThickness - backPanelThickness)]} />
          <lineBasicMaterial color={getPanelColor('shelf')} linewidth={2} />
        </lineSegments>
      )}

      {showShelves && numShelves > 0 && skeletonView && Array.from({ length: numShelves }).map((_, i) => {
        const topSectionStart = innerHeight / 2 - tallUpperSectionHeight + panelThickness;
        const topSectionEnd = innerHeight / 2 - panelThickness;
        const availableHeight = topSectionEnd - topSectionStart;
        const spacing = availableHeight / numShelves;
        const sy = topSectionStart + spacing * i;
        const shelfZOffset = -depth / 2 + panelThickness + backPanelThickness + settings.shelfDepth / 2;
        return (
          <lineSegments key={`sk-shelf-upper-${i}`} position={[0 + getOffset('shelf', i)[0], sy - panelThickness / 2 + getOffset('shelf', i)[1], shelfZOffset + getOffset('shelf', i)[2]]}>
            <edgesGeometry args={[new THREE.BoxGeometry(innerWidth - panelThickness * 2 - 2, panelThickness, settings.shelfDepth)]} />
            <lineBasicMaterial color={getPanelColor('shelf')} linewidth={2} />
          </lineSegments>
        );
      })}
      {showLowerShelves && numLowerShelves > 0 && skeletonView && Array.from({ length: numLowerShelves }).map((_, i) => {
        const bottomSectionStart = -innerHeight / 2 + panelThickness;
        const drawerZoneBottom = (-innerHeight / 2 + tallLowerSectionHeight) - (showDrawers ? lowerSectionDrawerStackHeight : 0);
        const bottomSectionEnd = drawerZoneBottom - doorOuterGap;
        const availableHeight = bottomSectionEnd - bottomSectionStart;
        const spacing = availableHeight / (numLowerShelves + 1);
        const shelfY = bottomSectionStart + spacing * (i + 1);
        const shelfZOffset = -depth / 2 + panelThickness + backPanelThickness + settings.shelfDepth / 2;
        return (
          <lineSegments key={`sk-shelf-lower-${i}`} position={[0 + getOffset('shelf', i)[0], shelfY - panelThickness / 2 + getOffset('shelf', i)[1], shelfZOffset + getOffset('shelf', i)[2]]}>
            <edgesGeometry args={[new THREE.BoxGeometry(innerWidth - panelThickness * 2 - 2, panelThickness, settings.shelfDepth)]} />
            <lineBasicMaterial color={getPanelColor('shelf')} linewidth={2} />
          </lineSegments>
        );
      })}
    </group>
  );
};

export const exportTallCabinetDXF = async (settings: TestingSettings, zip: JSZip) => {
  const {
    width, height, depth, panelThickness, backPanelThickness,
    doorMaterialThickness, grooveDepth, doorOuterGap, doorInnerGap,
    showBackPanel, showBackStretchers, showDoors, showDrawers, numDrawers, showShelves, numShelves, hingeDiameter, hingeHorizontalOffset, hingeVerticalOffset, nailHoleDiameter,
    tallLowerSectionHeight, tallUpperSectionHeight, drawerSideClearance, drawerBoxHeightRatio, drawerBackThickness, drawerBottomThickness,
    showLowerShelves, numLowerShelves, showLowerDoors,
    lowerSectionDrawerStackHeight, toeKickHeight
  } = settings;

  const innerWidth = width;
  const innerHeight = height;
  const innerDepth = depth;
  const actualNumDoors = width < RUBY_DOOR_THRESHOLD ? 1 : 2;
  const doorWidth = actualNumDoors === 1 ? innerWidth - doorOuterGap * 2 : (innerWidth - doorOuterGap * 2 - doorInnerGap) / 2;
  
  const drawerHeightEach_DXF = numDrawers > 0 
    ? (lowerSectionDrawerStackHeight - doorOuterGap * (numDrawers + 1)) / numDrawers 
    : 0;

  const isUpperGolaActive_DXF = settings.enableTallUpperGola && showDoors;
  const actualDoorHeight = tallUpperSectionHeight - doorOuterGap + (isUpperGolaActive_DXF ? settings.doorOverride : 0);

  const addPanelToZip = (name: string, width: number, height: number, holesInput: { y: number, z: number, r: number, through?: boolean }[] = [], grooveInput?: { x: number, y: number, w: number, h: number, depth: number }, mirrorX: boolean = false, golaCutouts?: { x: number, y: number, w: number, h: number }[]) => {
    const writer = new DxfWriter();
    writer.setUnits(Units.Millimeters);
    writer.addLayer('PANEL', 7, 'CONTINUOUS');
    writer.addLayer('DRILL', 1, 'CONTINUOUS');
    writer.addLayer('GROOVE', 3, 'CONTINUOUS');
    writer.addLayer('TEXT', 7, 'CONTINUOUS');
    const modelSpace = writer.modelSpace;
    const holes = holesInput.map(h => ({ ...h }));
    const groove = grooveInput ? { ...grooveInput } : undefined;
    if (mirrorX) {
      if (groove) groove.x = width - groove.x - groove.w;
      holes.forEach(h => { h.z = -h.z; });
    }
    let points = [{ point: { x: 0, y: 0 } }, { point: { x: width, y: 0 } }];
    if (golaCutouts && golaCutouts.length > 0) {
      const sorted = [...golaCutouts].sort((a, b) => a.y - b.y);
      sorted.forEach(c => {
        points.push({ point: { x: width, y: c.y } });
        points.push({ point: { x: c.x, y: c.y } });
        points.push({ point: { x: c.x, y: c.y + c.h } });
        points.push({ point: { x: width, y: c.y + c.h } });
      });
    }
    points.push({ point: { x: width, y: height } });
    points.push({ point: { x: 0, y: height } });

    if (mirrorX) points.forEach(p => { p.point.x = width - p.point.x; });
    modelSpace.addLWPolyline([...points, points[0]], { flags: LWPolylineFlags.Closed, layerName: 'PANEL' });
    modelSpace.addText(point3d(width / 2, height / 2, 0), 12, name, { layerName: 'TEXT' });
    holes.forEach(hole => {
      const radius = hole.r;
      const centerX = hole.z + width / 2;
      const centerY = hole.y + height / 2;
      const segments = 32;
      const pts = [];
      for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * 2 * Math.PI;
        pts.push({ point: { x: centerX + radius * Math.cos(angle), y: centerY + radius * Math.sin(angle) } });
      }
      modelSpace.addLWPolyline(pts, { flags: LWPolylineFlags.Closed, layerName: 'DRILL' });
    });
    if (groove) modelSpace.addLWPolyline([{ point: { x: groove.x, y: groove.y } }, { point: { x: groove.x + groove.w, y: groove.y } }, { point: { x: groove.x + groove.w, y: groove.y + groove.h } }, { point: { x: groove.x, y: groove.y + groove.h } }, { point: { x: groove.x, y: groove.y } }], { flags: LWPolylineFlags.Closed, layerName: 'GROOVE' });
    zip.file(`${name}.dxf`, writer.stringify());
  };

  const nailHoles = [];
  const technicalR = nailHoleDiameter / 2;
  const zBack_DXF = -depth / 2 + panelThickness / 2;

  if (showBackStretchers) {
    const tSYT = innerHeight / 2 - panelThickness;
    const bSYT = -innerHeight / 2 + panelThickness + settings.wallBottomRecess + 100;
    nailHoles.push({ y: tSYT - 25, z: zBack_DXF, r: technicalR, through: true });
    nailHoles.push({ y: tSYT - 80, z: zBack_DXF, r: technicalR, through: true });
    nailHoles.push({ y: bSYT - 25, z: zBack_DXF, r: technicalR, through: true });
    nailHoles.push({ y: bSYT - 80, z: zBack_DXF, r: technicalR, through: true });
  }

  if (showShelves && numShelves > 0) {
    const topSectionStart = innerHeight / 2 - tallUpperSectionHeight + panelThickness;
    const topSectionEnd = innerHeight / 2 - panelThickness;
    const availableH = topSectionEnd - topSectionStart;
    const spacing = availableH / numShelves;
    const sR = settings.shelfHoleDiameter / 2;
    for (let i = 0; i < numShelves; i++) {
      const sy = topSectionStart + spacing * i;
      const hy = sy - panelThickness / 2 - settings.nailHoleShelfDistance;
      const szS = -depth / 2 + panelThickness + backPanelThickness;
      nailHoles.push({ y: hy, z: szS + settings.shelfDepth * 0.25, r: sR, through: false }, { y: hy, z: szS + settings.shelfDepth * 0.75, r: sR, through: false });
    }
  }

  if (showLowerShelves && numLowerShelves > 0) {
    const bottomSectionStart = -innerHeight / 2 + panelThickness;
    const drawerZoneBottom = (-innerHeight / 2 + tallLowerSectionHeight) - (showDrawers ? lowerSectionDrawerStackHeight : 0);
    const bottomSectionEnd = drawerZoneBottom - doorOuterGap;
    const availableH = bottomSectionEnd - bottomSectionStart;
    const spacing = availableH / (numLowerShelves + 1);
    const sR = settings.shelfHoleDiameter / 2;
    for (let i = 0; i < numLowerShelves; i++) {
      const sy = bottomSectionStart + spacing * (i + 1);
      const hy = sy - panelThickness / 2 - settings.nailHoleShelfDistance;
      const szS = -depth / 2 + panelThickness + backPanelThickness;
      nailHoles.push({ y: hy, z: szS + settings.shelfDepth * 0.25, r: sR, through: false }, { y: hy, z: szS + settings.shelfDepth * 0.75, r: sR, through: false });
    }
  }

  if (showDrawers && numDrawers > 0) {
    const dividerY_DXF = tallLowerSectionHeight - innerHeight / 2;
    const drawerZoneBottom = dividerY_DXF - lowerSectionDrawerStackHeight;
    const dH_DXF = (lowerSectionDrawerStackHeight - doorOuterGap * (numDrawers + 1)) / numDrawers;
    const sR = settings.shelfHoleDiameter / 2;
    const szS = -depth / 2 + panelThickness + backPanelThickness;
    for (let i = 0; i < numDrawers; i++) {
      const dy = drawerZoneBottom + doorOuterGap + i * (dH_DXF + doorOuterGap);
      const hy = dy + dH_DXF / 2 - settings.nailHoleShelfDistance;
      nailHoles.push({ y: hy, z: szS + settings.shelfDepth * 0.25, r: sR, through: false }, { y: hy, z: szS + settings.shelfDepth * 0.75, r: sR, through: false });
    }
  }
  const dividerY = tallLowerSectionHeight - innerHeight / 2;
  const holeY = dividerY - settings.nailHoleShelfDistance;
  const sR = settings.shelfHoleDiameter / 2;
  const szS = -depth / 2 + panelThickness + backPanelThickness;
  nailHoles.push({ y: holeY, z: szS + settings.shelfDepth * 0.25, r: sR, through: false }, { y: holeY, z: szS + settings.shelfDepth * 0.75, r: sR, through: false });

  addPanelToZip('Divider_Deck', innerWidth - panelThickness * 2, depth - panelThickness - backPanelThickness);

  const sideW = depth;
  const sideH_Panel = innerHeight - panelThickness * 2;
  const sideGroove = { x: panelThickness, y: 0, w: backPanelThickness + 2, h: sideH_Panel - panelThickness + grooveDepth, depth: grooveDepth };
  
  const isLowerGolaActive_DXF = settings.enableGola && (showLowerDoors || (showDrawers && numDrawers > 0));
  const golaVerticalGap_DXF = isLowerGolaActive_DXF ? 13 : doorOuterGap;
  const golaTopGap_DXF = isLowerGolaActive_DXF ? settings.golaTopGap : doorOuterGap;
  const dividerY_Abs = tallLowerSectionHeight - innerHeight / 2;
  const dividerY_Local = dividerY_Abs + innerHeight / 2 - panelThickness;

  const golaCutoutsArr: { x: number, y: number, w: number, h: number }[] = [];
  if (isLowerGolaActive_DXF) {
    golaCutoutsArr.push({ 
      x: sideW - settings.golaLCutoutDepth, 
      y: dividerY_Local - settings.golaLCutoutHeight, 
      w: settings.golaLCutoutDepth, 
      h: settings.golaLCutoutHeight 
    });

    if (showDrawers && numDrawers > 0) {
      const drawerZoneBottom = dividerY_Abs - lowerSectionDrawerStackHeight;
      const golaGapTotal = golaVerticalGap_DXF * 2;
      const totalAvailablePool = lowerSectionDrawerStackHeight - golaTopGap_DXF - doorOuterGap;
      const eachFrontH = totalAvailablePool > 0 ? (totalAvailablePool - (numDrawers - 1) * golaGapTotal) / numDrawers : 0;

      for (let i = 0; i < numDrawers - 1; i++) {
        let yBase_Cabinet = drawerZoneBottom + doorOuterGap;
        for (let j = 0; j <= i; j++) {
          yBase_Cabinet += eachFrontH + (j < i ? golaGapTotal : 0);
        }
        const gapY_Cabinet = yBase_Cabinet + golaVerticalGap_DXF;
        const gapY_Local = gapY_Cabinet + innerHeight / 2 - panelThickness;

        golaCutoutsArr.push({
          x: sideW - settings.golaCutoutDepth,
          y: gapY_Local - settings.golaCCutoutHeight / 2,
          w: settings.golaCutoutDepth,
          h: settings.golaCCutoutHeight
        });
      }
    }
  }
  if (isUpperGolaActive_DXF) {
    const upperDoorBottomY_Abs = innerHeight / 2 - settings.tallUpperSectionHeight + settings.doorOuterGap + settings.doorOverride;
    const upperDoorBottomY_Local = upperDoorBottomY_Abs + innerHeight / 2 - settings.panelThickness;
    golaCutoutsArr.push({ 
      x: sideW - settings.golaLCutoutDepth, 
      y: upperDoorBottomY_Local - settings.golaLCutoutHeight / 2, 
      w: settings.golaLCutoutDepth, 
      h: settings.golaLCutoutHeight 
    });
  }

  addPanelToZip('Left_Panel', sideW, sideH_Panel, nailHoles, sideGroove, false, golaCutoutsArr);
  addPanelToZip('Right_Panel', sideW, sideH_Panel, nailHoles, sideGroove, true, golaCutoutsArr);

  const commonNailHoles = [];
  const u1b = -innerDepth / 2 + innerDepth / 5;
  const u2b = 0;
  const u3b = innerDepth / 2 - innerDepth / 5;
  const vLeftb = -innerWidth / 2 + panelThickness / 2;
  const vRightb = innerWidth / 2 - panelThickness / 2;
  commonNailHoles.push(
    { z: vLeftb, y: u1b, r: technicalR, through: true },
    { z: vLeftb, y: u2b, r: technicalR, through: true },
    { z: vLeftb, y: u3b, r: technicalR, through: true },
    { z: vRightb, y: u1b, r: technicalR, through: true },
    { z: vRightb, y: u2b, r: technicalR, through: true },
    { z: vRightb, y: u3b, r: technicalR, through: true }
  );

  if (showBackStretchers) {
    const v1 = -innerWidth / 2 + innerWidth / 5;
    const v2 = 0;
    const v3 = innerWidth / 2 - innerWidth / 5;
    const zBackH = -innerDepth / 2 + panelThickness / 2;
    commonNailHoles.push(
      { z: v1, y: zBackH, r: technicalR, through: true },
      { z: v2, y: zBackH, r: technicalR, through: true },
      { z: v3, y: zBackH, r: technicalR, through: true }
    );
  }

  const bottomNailHoles = [...commonNailHoles];

  // Add 3 Toe Kick Nailholes for DXF
  const tk1 = -innerWidth / 2 + innerWidth / 5;
  const tk2 = 0;
  const tk3 = innerWidth / 2 - innerWidth / 5;
  const zTK = innerDepth / 2 - 50 - panelThickness / 2;
  bottomNailHoles.push(
    { z: tk1, y: zTK, r: technicalR, through: true },
    { z: tk2, y: zTK, r: technicalR, through: true },
    { z: tk3, y: zTK, r: technicalR, through: true }
  );

  addPanelToZip('Bottom_Panel', innerWidth, innerDepth, bottomNailHoles, { x: panelThickness, y: panelThickness, w: innerWidth - 2 * panelThickness, h: backPanelThickness + 2, depth: grooveDepth });
  addPanelToZip('Top_Panel', innerWidth, innerDepth, commonNailHoles, { x: panelThickness, y: panelThickness, w: innerWidth - 2 * panelThickness, h: backPanelThickness + 2, depth: grooveDepth });

  if (toeKickHeight > 0) {
    addPanelToZip('Toe_Kick', width, toeKickHeight);
  }

  if (showBackStretchers) {
    addPanelToZip('Top_Stretcher_Back', innerWidth - panelThickness * 2, 100);
    addPanelToZip('Bottom_Stretcher_Back', innerWidth - panelThickness * 2, 100);
  }


  if (showDoors) {
    for (let i = 0; i < actualNumDoors; i++) {
      const hX = actualNumDoors === 1 ? -doorWidth / 2 + hingeHorizontalOffset : (i === 0 ? -doorWidth / 2 + hingeHorizontalOffset : doorWidth / 2 - hingeHorizontalOffset);
      const hingeHoles = [
        { y: actualDoorHeight / 2 - hingeVerticalOffset, z: hX, r: hingeDiameter / 2 }, 
        { y: -actualDoorHeight / 2 + hingeVerticalOffset + (isUpperGolaActive_DXF ? settings.doorOverride : 0), z: hX, r: hingeDiameter / 2 }
      ];
      addPanelToZip(`Door_Upper_${i + 1}`, doorWidth, actualDoorHeight, hingeHoles);
    }
  }

  if (showLowerDoors) {
    const isLowerGolaActive_DXF_Door = settings.enableGola && (showLowerDoors || (showDrawers && numDrawers > 0));
    const actualLowerDoorHeight = tallLowerSectionHeight - doorOuterGap - (isLowerGolaActive_DXF_Door ? settings.doorOverride : 0);
    for (let i = 0; i < actualNumDoors; i++) {
      const hX = actualNumDoors === 1 ? -doorWidth / 2 + hingeHorizontalOffset : (i === 0 ? -doorWidth / 2 + hingeHorizontalOffset : doorWidth / 2 - hingeHorizontalOffset);
      const hingeHoles = [{ y: actualLowerDoorHeight / 2 - hingeVerticalOffset, z: hX, r: hingeDiameter / 2 }, { y: -actualLowerDoorHeight / 2 + hingeVerticalOffset, z: hX, r: hingeDiameter / 2 }];
      addPanelToZip(`Door_Lower_${i + 1}`, doorWidth, actualLowerDoorHeight, hingeHoles);
    }
  }

  if (showDrawers && numDrawers > 0) {
    const boxDepth = depth - panelThickness - backPanelThickness - settings.drawerBackClearance;
    const boxWidth = (width - panelThickness * 2) - drawerSideClearance * 2;
    const drawerHeightEach = (lowerSectionDrawerStackHeight - doorOuterGap * (numDrawers + 1)) / numDrawers;

    for (let i = 0; i < numDrawers; i++) {
        const hFront = drawerHeightEach;
        const boxH = hFront * drawerBoxHeightRatio;
        const frontWidth = innerWidth - doorOuterGap * 2;

        const sideHoles = [];
        [0.25, 0.75].forEach(vRatio => {
          sideHoles.push({ z: -boxDepth / 2 + drawerBackThickness / 2, y: -boxH / 2 + boxH * vRatio, r: technicalR, through: true });
        });
        [0.2, 0.5, 0.8].forEach(dRatio => {
          sideHoles.push({ z: -boxDepth / 2 + boxDepth * dRatio, y: -boxH / 2 + drawerBottomThickness / 2, r: technicalR, through: true });
        });

        const fHoles = [];
        [-1, 1].forEach(side => [0.25, 0.75].forEach(vRatio => {
          fHoles.push({ z: side * (boxWidth / 2 - panelThickness / 2), y: -boxH / 2 + boxH * vRatio, r: technicalR, through: true });
        }));
        
        const bottomFHoles = [];
        [-1, 1].forEach(side => [0.25, 0.75].forEach(vRatio => {
          bottomFHoles.push({ z: side * (boxWidth / 2 - panelThickness / 2), y: -boxH / 2 + boxH * vRatio + panelThickness / 2, r: technicalR, through: true });
        }));

        addPanelToZip(`Drawer_Front_${i + 1}`, frontWidth, hFront, fHoles);
        addPanelToZip(`Drawer_Side_L_${i + 1}`, boxDepth, boxH, sideHoles);
        addPanelToZip(`Drawer_Side_R_${i + 1}`, boxDepth, boxH, sideHoles);
        addPanelToZip(`Drawer_Back_${i + 1}`, boxWidth - panelThickness * 2, boxH);
        addPanelToZip(`Drawer_Bottom_${i + 1}`, boxWidth - panelThickness * 2, boxDepth - drawerBackThickness);
    }
  }



  if (showShelves && numShelves > 0) {
    const shelfWidth = innerWidth - panelThickness * 2 - 2;
    const shelfDepth = settings.shelfDepth;
    for (let i = 0; i < numShelves; i++) {
       addPanelToZip(`Shelf_Upper_${i + 1}`, shelfWidth, shelfDepth);
    }
  }

  if (showLowerShelves && numLowerShelves > 0) {
    const shelfWidth = innerWidth - panelThickness * 2 - 2;
    const shelfDepth = settings.shelfDepth;
    for (let i = 0; i < numLowerShelves; i++) {
       addPanelToZip(`Shelf_Lower_${i + 1}`, shelfWidth, shelfDepth);
    }
  }

  if (showDrawers) {
     const shelfWidth = innerWidth - panelThickness * 2;
     const dividerDepth = depth - panelThickness - backPanelThickness;
     addPanelToZip('Lower_Section_Divider', shelfWidth, dividerDepth);
  }

  if (showBackPanel) {
    addPanelToZip('Back_Panel', innerWidth - panelThickness * 2 + grooveDepth * 2, innerHeight - panelThickness * 2 + grooveDepth * 2);
  }
};
