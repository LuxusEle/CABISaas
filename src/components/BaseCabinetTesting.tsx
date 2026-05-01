import React, { useMemo } from 'react';
import * as THREE from 'three';
import { DxfWriter, point3d, Units, LWPolylineFlags } from '@tarikjabiri/dxf';
import JSZip from 'jszip';
import { 
  TestingSettings, 
  createPanelWithHolesGeo, 
  createDoorWithHingeHoles, 
  panelColors,
  woodPalette,
  RUBY_DOOR_THRESHOLD,
  calculateNailHolePositions
} from './CabinetTestingUtils';
import { RealisticSink } from './3d/RealisticSink';
import { RealisticCooker } from './3d/RealisticCooker';

interface Props {
  settings: TestingSettings;
}



export const BaseCabinetTesting: React.FC<Props> = ({ settings }) => {
  const {
    width, height, depth, panelThickness, backPanelThickness,
    doorMaterialThickness, grooveDepth, doorToDoorGap, doorToPanelGap,
    drawerToDrawerGap, doorOuterGap, doorInnerGap, doorSideClearance,
    toeKickHeight, backStretcherHeight, topStretcherWidth, showBackPanel, showBackStretchers,
    showDoors, showDrawers, showShelves, showHinges, skeletonView, partsSeparatedView, selectedPart, numDrawers, numShelves,
    hingeDiameter, hingeDepth, hingeHorizontalOffset, hingeVerticalOffset, showDifferentPanelColors,
    showNailHoles, nailHoleDiameter,
    drawerSideClearance, drawerBottomThickness, drawerBackThickness, drawerBoxHeightRatio
  } = settings;

  const isSelected = settings.isSelected;
  const baseColor = new THREE.Color(isSelected ? '#3b82f6' : woodPalette.carcass);
  const backPanelColor = new THREE.Color(isSelected ? '#60a5fa' : woodPalette.backPanel);
  const doorColor = new THREE.Color(isSelected ? '#2563eb' : woodPalette.door);
  const toeKickColor = new THREE.Color(isSelected ? '#1e40af' : woodPalette.toeKick);
  const shelfColor = new THREE.Color(isSelected ? '#93c5fd' : woodPalette.shelf);

  const getPanelColor = (panelType: string): THREE.Color => {
    if (!showDifferentPanelColors) return baseColor;
    return (panelColors as any)[panelType] || baseColor;
  };

  const carcassWidth = width - (settings.exposedLeft ? doorMaterialThickness : 0) - (settings.exposedRight ? doorMaterialThickness : 0);
  const innerWidth = carcassWidth;
  const innerHeight = height - toeKickHeight;
  const innerDepth = depth;

  const actualNumDoors = carcassWidth < RUBY_DOOR_THRESHOLD ? 1 : 2;
  const isGolaActive = settings.enableGola && (showDoors || (showDrawers && numDrawers > 0));
  const doorWidth = actualNumDoors === 1 
    ? innerWidth - doorOuterGap * 2 
    : (innerWidth - doorOuterGap * 2 - doorInnerGap) / 2;
  const doorHeight = innerHeight - doorOuterGap * 2 - (isGolaActive ? settings.doorOverride : 0);
  const doorYOffset = isGolaActive ? -settings.doorOverride / 2 : 0;

  const drawerHeight = numDrawers > 0 
    ? (innerHeight - panelThickness - doorOuterGap * (numDrawers + 1)) / numDrawers 
    : 0;

  const golaVerticalGap = isGolaActive ? (settings.golaCCutoutHeight / 2) : doorOuterGap;
  const golaHorizontalGap3 = isGolaActive ? 3 : doorOuterGap;
  const golaDepthOffset = isGolaActive ? settings.golaCutoutDepth : 0;
  const golaLDepthOffset = isGolaActive ? settings.golaLCutoutDepth : 0;
  const golaTopGap = isGolaActive ? settings.golaTopGap : doorOuterGap;
  const midZForGola = (innerHeight - golaTopGap) / 2;

  const topHingeVerticalOffset = isGolaActive 
    ? (settings.golaLCutoutHeight + settings.hingeVerticalOffset - settings.doorOverride - doorOuterGap)
    : settings.hingeVerticalOffset;
  const bottomHingeVerticalOffset = settings.hingeVerticalOffset;

  const backPanelWidth = innerWidth - panelThickness * 2 + grooveDepth * 2;
  const backPanelHeight = innerHeight - panelThickness * 2 + grooveDepth * 2;

  const getOffset = (part: string, index: number = 0): [number, number, number] => {
    if (!partsSeparatedView || selectedPart !== 'all' && selectedPart !== part) return [0, 0, 0];
    const d = 200;
    const idx = index;
    const idxOffset = idx * d * 1.5;
    const offsets: Record<string, [number, number, number]> = {
      leftPanel: [-d, 0, 0],
      rightPanel: [d, 0, 0],
      bottomPanel: [0, -d * 1.5, 0],
      topPanel: [0, d * 1.5, 0],
      backPanel: [0, 0, -d],
      backStretcherTop: [0, d, -d],
      backStretcherBottom: [0, -d, -d],
      topStretcherFront: [0, d, d],
      topStretcherBack: [0, d, -d * 1.5],
      door: [(idx % 2 === 0 ? -1 : 1) * Math.ceil((idx + 1) / 2) * d * 0.75, 0, d * 1.5],
      drawer: [0, 0, d * 1.5 + idxOffset],
      toeKick: [0, -d * 2, d],
      shelf: [0, 0, d * 2],
    };
    return offsets[part] || [0, 0, 0];
  };

  const nailHolePositions = useMemo(() => {
    if (!showNailHoles) return [];
    const panelHeight = innerHeight - panelThickness;
    const y = panelHeight / 2 - panelThickness / 2;
    const technicalR = nailHoleDiameter / 2;
    const shelfR = settings.shelfHoleDiameter / 2;
    
    const zCenterFront = depth / 2 - golaLDepthOffset - topStretcherWidth / 2;
    const zCenterBack = -depth / 2 + topStretcherWidth / 2;

    const positions: { y: number, z: number, r: number, through?: boolean }[] = [];

    calculateNailHolePositions(topStretcherWidth).forEach(offset => {
      positions.push({ y, z: zCenterFront + offset, r: technicalR, through: true });
      positions.push({ y, z: zCenterBack + offset, r: technicalR, through: true });
    });

    if (showShelves && numShelves > 0 && !showDrawers) {
      const availableHeight = innerHeight - panelThickness * 2;
      const spacing = availableHeight / (numShelves + 1);
      for (let i = 0; i < numShelves; i++) {
        const shelfYCabinet = -innerHeight / 2 + panelThickness + spacing * (i + 1);
        const holeY = shelfYCabinet - panelThickness - (settings.shelfHoleDiameter / 2) - panelThickness / 2;
        const shelfZStartGlobal = -depth / 2 + panelThickness + backPanelThickness;
        const shelfLength = settings.shelfDepth;
        const zCenterShelf = shelfZStartGlobal + shelfLength / 2;
        
        const shelfHoleOffsets = calculateNailHolePositions(shelfLength);
        const finalOffsets = [shelfHoleOffsets[0], shelfHoleOffsets[shelfHoleOffsets.length - 1]];
        
        finalOffsets.forEach(offset => {
          positions.push({ y: holeY, z: zCenterShelf + offset, r: shelfR, through: false });
        });
      }
    }
 
    if (showBackStretchers) {
      const zBackStretcher = -depth / 2 + panelThickness / 2;
      const yCenterTop = panelHeight / 2 - panelThickness - backStretcherHeight / 2;
      const yCenterBottom = -panelHeight / 2 + backStretcherHeight / 2;
      
      calculateNailHolePositions(backStretcherHeight).forEach(offset => {
        positions.push({ y: yCenterTop + offset, z: zBackStretcher, r: technicalR, through: true });
        positions.push({ y: yCenterBottom + offset, z: zBackStretcher, r: technicalR, through: true });
      });
    }
    
    return positions;
  }, [showNailHoles, innerHeight, depth, panelThickness, backPanelThickness, nailHoleDiameter, settings.shelfHoleDiameter, topStretcherWidth, showBackStretchers, backStretcherHeight, showShelves, numShelves, showDrawers, settings.nailHoleShelfDistance, settings.shelfDepth, isGolaActive, settings.golaLCutoutDepth, settings.golaCutoutDepth]);

  const drawerData = useMemo(() => {
    const boxDepth = depth - panelThickness - backPanelThickness - settings.drawerBackClearance;
    const frontWidth = innerWidth - doorOuterGap * 2;
    const boxWidth = (width - panelThickness * 2) - drawerSideClearance * 2;
    const boxHeight = drawerHeight * drawerBoxHeightRatio;

    let drawerFrontHeights = Array(numDrawers).fill(drawerHeight);
    let drawerYPositions = Array(numDrawers).fill(0);

    const gapHeights: number[] = [];
    if (settings.enableGola && numDrawers > 0) {
      const golaGapTotal = golaVerticalGap * 2;
      const totalAvailablePool = (innerHeight - golaTopGap) - doorOuterGap - panelThickness;
      const numGaps = numDrawers - 1;
      const totalGapSpace = numGaps * golaGapTotal;
      const eachFrontH = totalAvailablePool > 0 ? (totalAvailablePool - totalGapSpace) / numDrawers : 0;

      const baseHeights = Array(numDrawers).fill(0);
      const baseYPositions = Array(numDrawers).fill(0);

      for (let i = 0; i < numDrawers; i++) {
        let h_base = eachFrontH;
        if (i === 0) h_base += panelThickness;

        baseHeights[i] = h_base;
        
        let yBase = doorOuterGap;
        for (let j = 0; j < i; j++) {
           yBase += baseHeights[j] + golaGapTotal;
        }
        baseYPositions[i] = -innerHeight / 2 + yBase + h_base / 2;

        let finalH = h_base;
        let finalY = baseYPositions[i];
        if (i === 0) {
          finalH += 15;
          finalY = (-innerHeight / 2 + yBase) + finalH / 2;
        } else {
          finalH += 30;
          finalY = (-innerHeight / 2 + yBase - 15) + finalH / 2;
        }

        drawerFrontHeights[i] = finalH;
        drawerYPositions[i] = finalY;
        
        if (i < numDrawers - 1) {
          gapHeights.push(yBase + h_base + golaVerticalGap);
        }
      }
      return {
        drawerFrontHeights,
        drawerYPositions,
        baseHeights,
        baseYPositions,
        boxWidth,
        boxDepth,
        frontWidth,
        boxH: boxHeight,
        gapHeights,
        boxZOffset: (panelThickness + backPanelThickness + settings.drawerBackClearance) / 2
      };
    } else {
      for (let i = 0; i < numDrawers; i++) {
        drawerFrontHeights[i] = i === 0 ? drawerHeight + panelThickness : drawerHeight;
        drawerYPositions[i] = -innerHeight / 2 + panelThickness + doorOuterGap + i * (drawerHeight + doorOuterGap) + drawerHeight / 2 - (i === 0 ? panelThickness / 2 : 0);
      }
    }

    const technicalR = nailHoleDiameter / 2;
    const frontHoles = [];
    if (showNailHoles) {
      [-1, 1].forEach(side => [0.25, 0.75].forEach(vRatio => {
        frontHoles.push({ z: side * (boxWidth / 2 - panelThickness / 2), y: -boxHeight / 2 + boxHeight * vRatio, r: technicalR, through: true });
      }));
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
  }, [width, innerHeight, depth, panelThickness, backPanelThickness, doorOuterGap, numDrawers, drawerSideClearance, drawerBoxHeightRatio, settings.drawerBackClearance, innerWidth, nailHoleDiameter, showNailHoles, doorMaterialThickness, drawerBackThickness, drawerBottomThickness, settings.enableGola, settings.golaTopGap, golaVerticalGap, golaHorizontalGap3, drawerHeight, midZForGola]);

  const leftPanelGeo = useMemo(() => {
    const sidePanelHeight = innerHeight - panelThickness;
    const notches: any[] = [];
    if (isGolaActive) {
      notches.push({ u: depth / 2, v: sidePanelHeight / 2, width: settings.golaLCutoutDepth, height: settings.golaLCutoutHeight, alignV: 'top' });
      if (showDrawers && drawerData.gapHeights.length > 0) {
        drawerData.gapHeights.forEach(gh => {
          notches.push({ u: depth / 2, v: gh - (innerHeight + panelThickness) / 2, width: settings.golaCutoutDepth, height: settings.golaCCutoutHeight, alignV: 'center' });
        });
      }
    }
    const effectiveGrooveDepth = !settings.showBackPanel ? 0 : grooveDepth;
    return createPanelWithHolesGeo(
      panelThickness, sidePanelHeight, depth,
      -depth / 2 + panelThickness, -depth / 2 + panelThickness + backPanelThickness,
      effectiveGrooveDepth, 'px',
      nailHolePositions,
      settings.nailHoleDepth,
      panelThickness - effectiveGrooveDepth, 0,
      notches
    );
  }, [panelThickness, innerHeight, depth, backPanelThickness, grooveDepth, nailHolePositions, settings.nailHoleDepth, isGolaActive, settings.golaLCutoutDepth, settings.golaCutoutDepth, settings.golaLCutoutHeight, midZForGola, settings.golaCCutoutHeight, numDrawers, showDrawers, drawerData.gapHeights, settings.showBackPanel]);

  const rightPanelGeo = useMemo(() => {
    const sidePanelHeight = innerHeight - panelThickness;
    const notchesR: any[] = [];
    if (isGolaActive) {
      notchesR.push({ u: depth / 2, v: sidePanelHeight / 2, width: settings.golaLCutoutDepth, height: settings.golaLCutoutHeight, alignV: 'top' });
      if (showDrawers && drawerData.gapHeights.length > 0) {
        drawerData.gapHeights.forEach(gh => {
          notchesR.push({ u: depth / 2, v: gh - (innerHeight + panelThickness) / 2, width: settings.golaCutoutDepth, height: settings.golaCCutoutHeight, alignV: 'center' });
        });
      }
    }
    const effectiveGrooveDepth = !settings.showBackPanel ? 0 : grooveDepth;
    return createPanelWithHolesGeo(
      panelThickness, sidePanelHeight, depth,
      -depth / 2 + panelThickness, -depth / 2 + panelThickness + backPanelThickness,
      effectiveGrooveDepth, 'nx',
      nailHolePositions,
      settings.nailHoleDepth,
      panelThickness - effectiveGrooveDepth, 0,
      notchesR
    );
  }, [panelThickness, innerHeight, depth, backPanelThickness, grooveDepth, nailHolePositions, settings.nailHoleDepth, isGolaActive, settings.golaLCutoutDepth, settings.golaCutoutDepth, settings.golaLCutoutHeight, midZForGola, settings.golaCCutoutHeight, numDrawers, showDrawers, drawerData.gapHeights]);

  const bottomPanelHoles = useMemo(() => {
    if (!showNailHoles) return [];
    const technicalR = nailHoleDiameter / 2;
    const vLeft = -innerWidth / 2 + panelThickness / 2;
    const vRight = innerWidth / 2 - panelThickness / 2;

    const positions: { y: number, z: number, r: number, through?: boolean }[] = [];

    // Side panel connections
    calculateNailHolePositions(innerDepth).forEach(offset => {
      positions.push({ y: vLeft, z: offset, r: technicalR, through: true });
      positions.push({ y: vRight, z: offset, r: technicalR, through: true });
    });

    if (showBackStretchers) {
      const zBack = -innerDepth / 2 + panelThickness / 2;
      calculateNailHolePositions(innerWidth).forEach(offset => {
        positions.push({ y: offset, z: zBack, r: technicalR, through: true });
      });
    }

    // Toe kick holes
    const zToeKick = innerDepth / 2 - 50 - panelThickness / 2;
    calculateNailHolePositions(innerWidth).forEach(offset => {
      positions.push({ y: offset, z: zToeKick, r: technicalR, through: true });
    });
    
    return positions;
  }, [showNailHoles, innerWidth, innerDepth, panelThickness, nailHoleDiameter, showBackStretchers]);

  const bottomPanelGeo = useMemo(() => {
    const effectiveGrooveDepth = !settings.showBackPanel ? 0 : grooveDepth;
    return createPanelWithHolesGeo(
      panelThickness, innerWidth, innerDepth,
      -innerDepth / 2 + panelThickness, -innerDepth / 2 + panelThickness + backPanelThickness,
      effectiveGrooveDepth, 'py',
      bottomPanelHoles,
      settings.nailHoleDepth,
      panelThickness, panelThickness
    );
  }, [innerWidth, panelThickness, innerDepth, backPanelThickness, grooveDepth, bottomPanelHoles, settings.nailHoleDepth, settings.showBackPanel]);

  const topStretcherBackHoles = useMemo(() => {
    if (!showNailHoles) return [];
    const length = innerWidth - panelThickness * 2;
    const technicalR = nailHoleDiameter / 2;
    const z = -topStretcherWidth / 2 + panelThickness / 2;
    return calculateNailHolePositions(length).map(offset => ({
      y: offset, z, r: technicalR, through: true
    }));
  }, [showNailHoles, innerWidth, panelThickness, nailHoleDiameter, topStretcherWidth]);

  const topStretcherBackGeo = useMemo(() => {
    const effectiveGrooveDepth = !settings.showBackPanel ? 0 : grooveDepth;
    return createPanelWithHolesGeo(
      panelThickness, innerWidth - panelThickness * 2, topStretcherWidth,
      panelThickness - topStretcherWidth / 2, panelThickness + backPanelThickness - topStretcherWidth / 2,
      effectiveGrooveDepth, 'ny',
      topStretcherBackHoles,
      panelThickness
    );
  }, [innerWidth, panelThickness, topStretcherWidth, backPanelThickness, grooveDepth, topStretcherBackHoles, settings.showBackPanel]);

  const doorGeos = useMemo(() => {
    const geos = [];
    for (let i = 0; i < actualNumDoors; i++) {
      const hingeXOffset = actualNumDoors === 1 
        ? -doorWidth / 2 + hingeHorizontalOffset 
        : (i === 0 ? -doorWidth / 2 + hingeHorizontalOffset : doorWidth / 2 - hingeHorizontalOffset);
      geos.push(createDoorWithHingeHoles(
        doorWidth, doorHeight, doorMaterialThickness,
        hingeXOffset, hingeDiameter / 2, hingeDepth, 
        topHingeVerticalOffset, bottomHingeVerticalOffset
      ));
    }
    return geos;
  }, [actualNumDoors, doorWidth, doorHeight, doorMaterialThickness, hingeHorizontalOffset, hingeDiameter, hingeDepth, topHingeVerticalOffset, bottomHingeVerticalOffset, doorInnerGap]);

  const getDrawerGeos = (i: number) => {
    const { drawerFrontHeights, baseHeights, boxWidth, boxDepth, frontWidth } = drawerData;
    const h = drawerFrontHeights[i];
    // In Gola mode, align box height with the base height (matching notches)
    const baseH = (isGolaActive && baseHeights) ? baseHeights[i] : h;
    const boxH = isGolaActive ? baseH : (h * drawerBoxHeightRatio);
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
    const shelfWidth = innerWidth - panelThickness * 2 - 2; // small gap
    const shelfDepth = settings.shelfDepth;
    return new THREE.BoxGeometry(shelfWidth, panelThickness, shelfDepth);
  }, [innerWidth, panelThickness, settings.shelfDepth]);

  const shouldShow = (part: string): boolean => {
    if (!partsSeparatedView) return true;
    if (selectedPart === 'all' || selectedPart === part) return true;
    if (selectedPart === 'drawer' && (part === 'drawerFront' || part === 'drawerSide' || part === 'drawerBack' || part === 'drawerBottom')) return true;
    return false;
  };


  const carcassXOffset = (settings.exposedLeft ? doorMaterialThickness : 0) / 2 - (settings.exposedRight ? doorMaterialThickness : 0) / 2;

  return (
    <group position={[width / 2, toeKickHeight + innerHeight / 2, depth / 2]}>
      {/* Additional Exposed Side Panels (Door Material) */}
      {settings.exposedLeft && (
        <mesh position={[-width / 2 + doorMaterialThickness / 2, -toeKickHeight / 2, 0]} rotation={[0, -Math.PI / 2, 0]} castShadow receiveShadow>
          <primitive object={createPanelWithHolesGeo(doorMaterialThickness, height, depth, 0, 0, 0, 'none', [], 0)} attach="geometry" />
          <meshStandardMaterial color={settings.isStudio && settings.doorTexture ? '#ffffff' : doorColor} map={settings.isStudio ? settings.doorTexture : undefined} roughness={0.4} metalness={0} transparent={settings.opacity < 1} opacity={settings.opacity} side={THREE.DoubleSide} />
        </mesh>
      )}
      {settings.exposedRight && (
        <mesh position={[width / 2 - doorMaterialThickness / 2, -toeKickHeight / 2, 0]} rotation={[0, -Math.PI / 2, 0]} castShadow receiveShadow>
          <primitive object={createPanelWithHolesGeo(doorMaterialThickness, height, depth, 0, 0, 0, 'none', [], 0)} attach="geometry" />
          <meshStandardMaterial color={settings.isStudio && settings.doorTexture ? '#ffffff' : doorColor} map={settings.isStudio ? settings.doorTexture : undefined} roughness={0.4} metalness={0} transparent={settings.opacity < 1} opacity={settings.opacity} side={THREE.DoubleSide} />
        </mesh>
      )}

      {shouldShow('bottomPanel') && (
        <mesh position={[carcassXOffset + 0 + getOffset('bottomPanel')[0], -innerHeight / 2 + panelThickness / 2 + getOffset('bottomPanel')[1], 0 + getOffset('bottomPanel')[2]]} castShadow receiveShadow visible={!skeletonView}>
          <primitive object={bottomPanelGeo} attach="geometry" />
          <meshStandardMaterial color={settings.isStudio && settings.carcassTexture ? '#ffffff' : getPanelColor('bottomPanel')} map={settings.isStudio ? settings.carcassTexture : undefined} roughness={0.4} metalness={0} side={THREE.DoubleSide} transparent={settings.opacity < 1} opacity={settings.opacity} />
        </mesh>
      )}
      {skeletonView && shouldShow('bottomPanel') && (
        <lineSegments position={[carcassXOffset + 0 + getOffset('bottomPanel')[0], -innerHeight / 2 + panelThickness / 2 + getOffset('bottomPanel')[1], 0 + getOffset('bottomPanel')[2]]}>
          <edgesGeometry args={[bottomPanelGeo]} />
          <lineBasicMaterial color={getPanelColor('bottomPanel')} linewidth={2} />
        </lineSegments>
      )}

      {shouldShow('leftPanel') && (
        <mesh position={[carcassXOffset - innerWidth / 2 + panelThickness / 2 + getOffset('leftPanel')[0], panelThickness / 2 + getOffset('leftPanel')[1], 0 + getOffset('leftPanel')[2]]} castShadow receiveShadow visible={!skeletonView}>
          <primitive object={leftPanelGeo} attach="geometry" />
          <meshStandardMaterial color={settings.isStudio && (settings.shelfTexture || settings.carcassTexture) ? '#ffffff' : getPanelColor('leftPanel')} map={settings.isStudio ? (settings.shelfTexture || settings.carcassTexture) : undefined} roughness={0.4} metalness={0} side={THREE.DoubleSide} transparent={settings.opacity < 1} opacity={settings.opacity} />
        </mesh>
      )}
      {skeletonView && shouldShow('leftPanel') && (
        <lineSegments position={[carcassXOffset - innerWidth / 2 + panelThickness / 2 + getOffset('leftPanel')[0], panelThickness / 2 + getOffset('leftPanel')[1], 0 + getOffset('leftPanel')[2]]}>
          <edgesGeometry args={[leftPanelGeo]} />
          <lineBasicMaterial color={getPanelColor('leftPanel')} linewidth={2} />
        </lineSegments>
      )}

      {shouldShow('rightPanel') && (
        <mesh position={[carcassXOffset + innerWidth / 2 - panelThickness / 2 + getOffset('rightPanel')[0], panelThickness / 2 + getOffset('rightPanel')[1], 0 + getOffset('rightPanel')[2]]} castShadow receiveShadow visible={!skeletonView}>
          <primitive object={rightPanelGeo} attach="geometry" />
          <meshStandardMaterial color={settings.isStudio && settings.carcassTexture ? '#ffffff' : getPanelColor('rightPanel')} map={settings.isStudio ? settings.carcassTexture : undefined} roughness={0.4} metalness={0} side={THREE.DoubleSide} transparent={settings.opacity < 1} opacity={settings.opacity} />
        </mesh>
      )}
      {skeletonView && shouldShow('rightPanel') && (
        <lineSegments position={[carcassXOffset + innerWidth / 2 - panelThickness / 2 + getOffset('rightPanel')[0], panelThickness / 2 + getOffset('rightPanel')[1], 0 + getOffset('rightPanel')[2]]}>
          <edgesGeometry args={[rightPanelGeo]} />
          <lineBasicMaterial color={getPanelColor('rightPanel')} linewidth={2} />
        </lineSegments>
      )}

      {showBackPanel && shouldShow('backPanel') && (
        <mesh position={[carcassXOffset + 0 + getOffset('backPanel')[0], 0 + getOffset('backPanel')[1], -innerDepth / 2 + panelThickness + backPanelThickness / 2 + getOffset('backPanel')[2]]} castShadow receiveShadow visible={!skeletonView}>
          <boxGeometry args={[backPanelWidth, backPanelHeight, backPanelThickness]} />
          <meshStandardMaterial color={settings.isStudio && settings.carcassTexture ? '#ffffff' : showDifferentPanelColors ? panelColors.backPanel : backPanelColor} map={settings.isStudio ? settings.carcassTexture : undefined} roughness={0.5} metalness={0} transparent={settings.opacity < 1} opacity={settings.opacity} />
        </mesh>
      )}
      {showBackPanel && skeletonView && shouldShow('backPanel') && (
        <lineSegments position={[carcassXOffset + 0 + getOffset('backPanel')[0], 0 + getOffset('backPanel')[1], -innerDepth / 2 + panelThickness + backPanelThickness / 2 + getOffset('backPanel')[2]]}>
          <edgesGeometry args={[new THREE.BoxGeometry(backPanelWidth, backPanelHeight, backPanelThickness)]} />
          <lineBasicMaterial color={getPanelColor('backPanel')} linewidth={2} />
        </lineSegments>
      )}

      {showBackStretchers && shouldShow('backStretcherTop') && (
        <mesh position={[carcassXOffset + 0 + getOffset('backStretcherTop')[0], innerHeight / 2 - panelThickness - backStretcherHeight / 2 + getOffset('backStretcherTop')[1], -innerDepth / 2 + panelThickness / 2 + getOffset('backStretcherTop')[2]]} castShadow receiveShadow visible={!skeletonView}>
          <boxGeometry args={[innerWidth - panelThickness * 2, backStretcherHeight, panelThickness]} />
          <meshStandardMaterial color={settings.isStudio && settings.carcassTexture ? '#ffffff' : getPanelColor('backStretcherTop')} map={settings.isStudio ? settings.carcassTexture : undefined} roughness={0.4} metalness={0} transparent={settings.opacity < 1} opacity={settings.opacity} />
        </mesh>
      )}
      {showBackStretchers && shouldShow('backStretcherBottom') && (
        <mesh position={[carcassXOffset + 0 + getOffset('backStretcherBottom')[0], -innerHeight / 2 + panelThickness + backStretcherHeight / 2 + getOffset('backStretcherBottom')[1], -innerDepth / 2 + panelThickness / 2 + getOffset('backStretcherBottom')[2]]} castShadow receiveShadow visible={!skeletonView}>
          <boxGeometry args={[innerWidth - panelThickness * 2, backStretcherHeight, panelThickness]} />
          <meshStandardMaterial color={settings.isStudio && settings.carcassTexture ? '#ffffff' : getPanelColor('backStretcherBottom')} map={settings.isStudio ? settings.carcassTexture : undefined} roughness={0.4} metalness={0} transparent={settings.opacity < 1} opacity={settings.opacity} />
        </mesh>
      )}
      {showBackStretchers && skeletonView && shouldShow('backStretcherTop') && (
        <lineSegments position={[carcassXOffset + 0 + getOffset('backStretcherTop')[0], innerHeight / 2 - panelThickness - backStretcherHeight / 2 + getOffset('backStretcherTop')[1], -innerDepth / 2 + panelThickness / 2 + getOffset('backStretcherTop')[2]]}>
          <edgesGeometry args={[new THREE.BoxGeometry(innerWidth - panelThickness * 2, backStretcherHeight, panelThickness)]} />
          <lineBasicMaterial color={getPanelColor('backStretcherTop')} linewidth={2} />
        </lineSegments>
      )}
      {showBackStretchers && skeletonView && shouldShow('backStretcherBottom') && (
        <lineSegments position={[carcassXOffset + 0 + getOffset('backStretcherBottom')[0], -innerHeight / 2 + panelThickness + backStretcherHeight / 2 + getOffset('backStretcherBottom')[1], -innerDepth / 2 + panelThickness / 2 + getOffset('backStretcherBottom')[2]]}>
          <edgesGeometry args={[new THREE.BoxGeometry(innerWidth - panelThickness * 2, backStretcherHeight, panelThickness)]} />
          <lineBasicMaterial color={getPanelColor('backStretcherBottom')} linewidth={2} />
        </lineSegments>
      )}

      {showBackStretchers && shouldShow('topStretcherFront') && (
        <mesh position={[carcassXOffset + 0 + getOffset('topStretcherFront')[0], innerHeight / 2 - panelThickness / 2 + getOffset('topStretcherFront')[1], depth / 2 - topStretcherWidth / 2 - golaLDepthOffset + getOffset('topStretcherFront')[2]]} castShadow receiveShadow visible={!skeletonView}>
          <boxGeometry args={[innerWidth - panelThickness * 2, panelThickness, topStretcherWidth]} />
          <meshStandardMaterial color={settings.isStudio && settings.carcassTexture ? '#ffffff' : getPanelColor('topStretcher')} map={settings.isStudio ? settings.carcassTexture : undefined} roughness={0.4} metalness={0} transparent={settings.opacity < 1} opacity={settings.opacity} />
        </mesh>
      )}
      {showBackStretchers && shouldShow('topStretcherBack') && (
        <mesh position={[carcassXOffset + 0 + getOffset('topStretcherBack')[0], innerHeight / 2 - panelThickness / 2 + getOffset('topStretcherBack')[1], -innerDepth / 2 + topStretcherWidth / 2 + getOffset('topStretcherBack')[2]]} castShadow receiveShadow visible={!skeletonView}>
          <primitive object={topStretcherBackGeo} attach="geometry" />
          <meshStandardMaterial color={settings.isStudio && settings.carcassTexture ? '#ffffff' : getPanelColor('topStretcherBack')} map={settings.isStudio ? settings.carcassTexture : undefined} roughness={0.4} metalness={0} side={THREE.DoubleSide} transparent={settings.opacity < 1} opacity={settings.opacity} />
        </mesh>
      )}
      {showBackStretchers && skeletonView && shouldShow('topStretcherFront') && (
        <lineSegments position={[carcassXOffset + 0 + getOffset('topStretcherFront')[0], innerHeight / 2 - panelThickness / 2 + getOffset('topStretcherFront')[1], depth / 2 - topStretcherWidth / 2 - golaLDepthOffset + getOffset('topStretcherFront')[2]]}>
          <edgesGeometry args={[new THREE.BoxGeometry(innerWidth - panelThickness * 2, panelThickness, topStretcherWidth)]} />
          <lineBasicMaterial color={getPanelColor('topStretcherFront')} linewidth={2} />
        </lineSegments>
      )}
      {showBackStretchers && skeletonView && shouldShow('topStretcherBack') && (
        <lineSegments position={[carcassXOffset + 0 + getOffset('topStretcherBack')[0], innerHeight / 2 - panelThickness / 2 + getOffset('topStretcherBack')[1], -innerDepth / 2 + topStretcherWidth / 2 + getOffset('topStretcherBack')[2]]}>
          <edgesGeometry args={[topStretcherBackGeo]} />
          <lineBasicMaterial color={getPanelColor('topStretcherBack')} linewidth={2} />
        </lineSegments>
      )}

      {toeKickHeight > 0 && shouldShow('toeKick') && (
        <mesh position={[carcassXOffset + 0 + getOffset('toeKick')[0], -innerHeight / 2 - toeKickHeight / 2 + getOffset('toeKick')[1], depth / 2 - 50 - panelThickness / 2 + getOffset('toeKick')[2]]} castShadow receiveShadow visible={!skeletonView}>
          <boxGeometry args={[innerWidth, toeKickHeight, panelThickness]} />
          <meshStandardMaterial color={settings.isStudio && settings.carcassTexture ? '#ffffff' : toeKickColor} map={settings.isStudio ? settings.carcassTexture : undefined} roughness={0.4} metalness={0} transparent={settings.opacity < 1} opacity={settings.opacity} />
        </mesh>
      )}
      {toeKickHeight > 0 && skeletonView && shouldShow('toeKick') && (
        <lineSegments position={[carcassXOffset + 0 + getOffset('toeKick')[0], -innerHeight / 2 - toeKickHeight / 2 + getOffset('toeKick')[1], depth / 2 - 50 - panelThickness / 2 + getOffset('toeKick')[2]]}>
          <edgesGeometry args={[new THREE.BoxGeometry(innerWidth, toeKickHeight, panelThickness)]} />
          <lineBasicMaterial color={getPanelColor('toeKick')} linewidth={2} />
        </lineSegments>
      )}

      {!showDrawers && showDoors && actualNumDoors > 0 && Array.from({ length: actualNumDoors }).map((_, i) => {
        const doorX = actualNumDoors === 1 ? 0 : (i === 0 ? -doorWidth / 2 - doorInnerGap / 2 : doorWidth / 2 + doorInnerGap / 2);
        const handleXOffset = actualNumDoors === 1 ? doorWidth / 2 - 30 : (i === 0 ? doorWidth / 2 - 30 : -doorWidth / 2 + 30);
        const hingeXOffset = actualNumDoors === 1 ? -doorWidth / 2 + hingeHorizontalOffset : (i === 0 ? -doorWidth / 2 + hingeHorizontalOffset : doorWidth / 2 - hingeHorizontalOffset);

        const doorAngle = (settings.doorOpenAngle * Math.PI) / 180;
        const isLeftDoor = actualNumDoors === 1 || i === 0;
        const rotationDirection = isLeftDoor ? -1 : 1;
        const pivotX = isLeftDoor ? -doorWidth / 2 : doorWidth / 2;

        return (
          <group key={`door-${i}`} position={[carcassXOffset + doorX + getOffset('door', i)[0], doorYOffset + getOffset('door', i)[1], depth / 2 + getOffset('door', i)[2]]}>
            <group position={[pivotX, 0, 0]} rotation={[0, rotationDirection * doorAngle, 0]}>
              <mesh position={[-pivotX, 0, doorMaterialThickness / 2]} castShadow receiveShadow visible={!skeletonView}>
                <primitive object={doorGeos[i]} attach="geometry" />
                <meshStandardMaterial color={settings.isStudio && settings.doorTexture ? '#ffffff' : doorColor} map={settings.isStudio ? settings.doorTexture : undefined} roughness={0.4} metalness={0} transparent={true} opacity={settings.opacity} side={THREE.DoubleSide} depthWrite={settings.opacity < 1 ? false : true} />
              </mesh>
              {skeletonView && (
                <lineSegments position={[-pivotX, 0, doorMaterialThickness / 2]}>
                  <edgesGeometry args={[doorGeos[i]]} />
                  <lineBasicMaterial color={getPanelColor('door')} linewidth={2} />
                </lineSegments>
              )}
              {!settings.enableGola && (
                <mesh position={[handleXOffset - pivotX, doorHeight / 2 - 50, doorMaterialThickness + 5]} castShadow>
                  <cylinderGeometry args={[3, 3, 50, 16]} />
                  <meshStandardMaterial color="#4a5568" metalness={0.8} roughness={0.2} transparent={settings.opacity < 1} opacity={settings.opacity} />
                </mesh>
              )}
              {showHinges && (
                <>
                  <mesh position={[hingeXOffset - pivotX, doorHeight / 2 - topHingeVerticalOffset, -hingeDepth / 2]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                    <cylinderGeometry args={[hingeDiameter / 2, hingeDiameter / 2, hingeDepth, 16]} />
                    <meshStandardMaterial color="#333333" metalness={0.9} roughness={0.1} transparent={settings.opacity < 1} opacity={settings.opacity} />
                  </mesh>
                  <mesh position={[hingeXOffset - pivotX, -doorHeight / 2 + bottomHingeVerticalOffset, -hingeDepth / 2]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                    <cylinderGeometry args={[hingeDiameter / 2, hingeDiameter / 2, hingeDepth, 16]} />
                    <meshStandardMaterial color="#333333" metalness={0.9} roughness={0.1} transparent={settings.opacity < 1} opacity={settings.opacity} />
                  </mesh>
                </>
              )}
            </group>
          </group>
        );
      })}

      {showDrawers && numDrawers > 0 && Array.from({ length: numDrawers }).map((_, i) => {
        const { drawerYPositions, drawerFrontHeights, baseHeights, baseYPositions, boxWidth, boxDepth, boxZOffset } = drawerData;
        const { frontGeo, sideLGeo, sideRGeo, boxH } = getDrawerGeos(i);
        
        const boxY = (isGolaActive && baseYPositions) 
          ? baseYPositions[i] 
          : drawerYPositions[i];
        
        return (
          <group key={`drawer-${i}`} position={[carcassXOffset + getOffset('drawer', i)[0], getOffset('drawer', i)[1], getOffset('drawer', i)[2] + (settings.drawerOpenDistances[i] || 0)]}>
            <mesh position={[0, drawerYPositions[i], depth / 2 + doorMaterialThickness / 2]} rotation={[0, -Math.PI / 2, 0]} castShadow receiveShadow visible={!skeletonView}>
              <primitive object={frontGeo} attach="geometry" />
              <meshStandardMaterial color={settings.isStudio && settings.doorTexture ? '#ffffff' : doorColor} map={settings.isStudio ? settings.doorTexture : undefined} roughness={0.4} metalness={0} side={THREE.DoubleSide} transparent={true} opacity={settings.opacity} depthWrite={settings.opacity < 1 ? false : true} />
            </mesh>
            {!settings.enableGola && (
              <mesh position={[0, drawerYPositions[i], depth / 2 + doorMaterialThickness + 5]} rotation={[0, 0, Math.PI / 2]} castShadow>
                <cylinderGeometry args={[3, 3, 150, 16]} />
                <meshStandardMaterial color="#4a5568" metalness={0.8} roughness={0.2} transparent={settings.opacity < 1} opacity={settings.opacity} />
              </mesh>
            )}
            {shouldShow('drawerBottom') && (
              <mesh position={[0, boxY - boxH / 2 + drawerBottomThickness / 2, boxZOffset + drawerBackThickness / 2]} castShadow receiveShadow visible={!skeletonView}>
                <boxGeometry args={[boxWidth - panelThickness * 2, drawerBottomThickness, boxDepth - drawerBackThickness]} />
                <meshStandardMaterial color={settings.isStudio && settings.carcassTexture ? '#ffffff' : showDifferentPanelColors ? panelColors.drawerBottom : shelfColor} map={settings.isStudio ? settings.carcassTexture : undefined} roughness={0.4} metalness={0} transparent={settings.opacity < 1} opacity={settings.opacity} />
              </mesh>
            )}
            {[-1, 1].map(side => shouldShow('drawerSide') && (
              <mesh key={side} position={[side * (boxWidth / 2 - panelThickness / 2), boxY, boxZOffset]} castShadow receiveShadow visible={!skeletonView}>
                <primitive object={side === -1 ? sideLGeo : sideRGeo} attach="geometry" />
                <meshStandardMaterial color={settings.isStudio && settings.carcassTexture ? '#ffffff' : showDifferentPanelColors ? panelColors.drawerSide : shelfColor} map={settings.isStudio ? settings.carcassTexture : undefined} roughness={0.4} metalness={0} side={THREE.DoubleSide} transparent={settings.opacity < 1} opacity={settings.opacity} />
              </mesh>
            ))}
            {shouldShow('drawerBack') && (
              <mesh position={[0, boxY, boxZOffset - boxDepth / 2 + drawerBackThickness / 2]} castShadow receiveShadow visible={!skeletonView}>
                <boxGeometry args={[boxWidth - panelThickness * 2, boxH, drawerBackThickness]} />
                <meshStandardMaterial color={settings.isStudio && settings.carcassTexture ? '#ffffff' : showDifferentPanelColors ? panelColors.drawerBack : shelfColor} map={settings.isStudio ? settings.carcassTexture : undefined} roughness={0.4} metalness={0} transparent={settings.opacity < 1} opacity={settings.opacity} />
              </mesh>
            )}

            {skeletonView && (
              <>
                <lineSegments position={[0, drawerYPositions[i], depth / 2 + doorMaterialThickness / 2]} rotation={[0, -Math.PI / 2, 0]}>
                  <edgesGeometry args={[frontGeo]} />
                  <lineBasicMaterial color={getPanelColor('drawerFront')} linewidth={2} />
                </lineSegments>
                {shouldShow('drawerBottom') && (
                  <lineSegments position={[0, boxY - boxH / 2 + drawerBottomThickness / 2, boxZOffset + drawerBackThickness / 2]}>
                    <edgesGeometry args={[new THREE.BoxGeometry(boxWidth - panelThickness * 2, drawerBottomThickness, boxDepth - drawerBackThickness)]} />
                    <lineBasicMaterial color={getPanelColor('drawerBottom')} linewidth={2} />
                  </lineSegments>
                )}
                {[-1, 1].map(side => shouldShow('drawerSide') && (
                  <lineSegments key={`sk-side-${side}`} position={[side * (boxWidth / 2 - panelThickness / 2), boxY, boxZOffset]}>
                    <edgesGeometry args={[side === -1 ? sideLGeo : sideRGeo]} />
                    <lineBasicMaterial color={getPanelColor('drawerSide')} linewidth={2} />
                  </lineSegments>
                ))}
                {shouldShow('drawerBack') && (
                  <lineSegments position={[0, boxY, boxZOffset - boxDepth / 2 + drawerBackThickness / 2]}>
                    <edgesGeometry args={[new THREE.BoxGeometry(boxWidth - panelThickness * 2, boxH, drawerBackThickness)]} />
                    <lineBasicMaterial color={getPanelColor('drawerBack')} linewidth={2} />
                  </lineSegments>
                )}
              </>
            )}
          </group>
        );
      })}

      {showShelves && numShelves > 0 && !showDrawers && skeletonView && Array.from({ length: numShelves }).map((_, i) => {
        const availableHeight = innerHeight - panelThickness * 2;
        const spacing = availableHeight / (numShelves + 1);
        const shelfY = -innerHeight / 2 + panelThickness + spacing * (i + 1);
        const shelfZOffset = -depth / 2 + panelThickness + backPanelThickness + settings.shelfDepth / 2;
        return (
          <lineSegments key={`sk-shelf-${i}`} position={[carcassXOffset + 0 + getOffset('shelf', i)[0], shelfY - panelThickness / 2 + getOffset('shelf', i)[1], shelfZOffset + getOffset('shelf', i)[2]]}>
            <edgesGeometry args={[new THREE.BoxGeometry(innerWidth - panelThickness * 2 - 2, panelThickness, settings.shelfDepth)]} />
            <lineBasicMaterial color={getPanelColor('shelf')} linewidth={2} />
          </lineSegments>
        );
      })}

      {showShelves && numShelves > 0 && !showDrawers && !skeletonView && Array.from({ length: numShelves }).map((_, i) => {
        const availableHeight = innerHeight - panelThickness * 2;
        const spacing = availableHeight / (numShelves + 1);
        const shelfY = -innerHeight / 2 + panelThickness + spacing * (i + 1);
        const shelfZOffset = -depth / 2 + panelThickness + backPanelThickness + settings.shelfDepth / 2;
        return (
          <mesh 
            key={`shelf-${i}`} 
            position={[carcassXOffset + 0 + getOffset('shelf', i)[0], shelfY - panelThickness / 2 + getOffset('shelf', i)[1], shelfZOffset + getOffset('shelf', i)[2]]}
            castShadow 
            receiveShadow
          >
            <primitive object={shelfGeo.clone()} attach="geometry" />
            <meshStandardMaterial color={settings.isStudio && settings.carcassTexture ? '#ffffff' : shelfColor} map={settings.isStudio ? settings.carcassTexture : undefined} roughness={0.4} metalness={0} transparent={settings.opacity < 1} opacity={settings.opacity} />
          </mesh>
        );
      })}

      {/* --- Specialized Equipment --- */}
      
      {/* 1. SINK UNIT BASIN */}
      {settings.preset === 'Sink Unit' && !skeletonView && (
        <group position={[carcassXOffset, innerHeight / 2 + 1, 0]}>
          <RealisticSink width={innerWidth} depth={depth} cabinetHeight={innerHeight} opacity={settings.opacity} />
        </group>
      )}

      {/* 2. COOKER HOB */}
      {((settings.preset === 'Base 3-Drawer' && carcassWidth >= 600) || settings.preset === 'Cooker Hob') && !skeletonView && (
        <group position={[carcassXOffset, innerHeight / 2 + 5, 0]}>
          <RealisticCooker width={innerWidth} depth={depth} opacity={settings.opacity} />
        </group>
      )}
    </group>
  );
};

export const exportBaseCabinetDXF = async (settings: TestingSettings, zip: JSZip | null, dataCollector?: (data: any) => void) => {
  const {
    width, height, depth, panelThickness, backPanelThickness,
    doorMaterialThickness, grooveDepth, doorOuterGap, doorInnerGap,
    toeKickHeight, backStretcherHeight, topStretcherWidth,
    showBackPanel, showBackStretchers, showDoors, showDrawers, showShelves, numDrawers, numShelves,
    hingeDiameter, hingeDepth, hingeHorizontalOffset, hingeVerticalOffset,
    nailHoleDiameter, drawerSideClearance, drawerBottomThickness, drawerBackThickness, drawerBoxHeightRatio
  } = settings;

  const carcassWidth = width - (settings.exposedLeft ? doorMaterialThickness : 0) - (settings.exposedRight ? doorMaterialThickness : 0);
  const innerWidth = carcassWidth;
  const innerHeight = height - toeKickHeight;
  const innerDepth = depth;
  const actualNumDoors = carcassWidth < RUBY_DOOR_THRESHOLD ? 1 : 2;
  const isGolaActive = settings.enableGola && (showDoors || (showDrawers && numDrawers > 0));
  const golaVerticalGap = isGolaActive ? 13 : doorOuterGap;
  const golaTopGap = isGolaActive ? settings.golaTopGap : doorOuterGap;

  const gapHeights: number[] = [];
  let drawerFrontHeights: number[] = [];
  if (showDrawers && numDrawers > 0) {
    if (isGolaActive) {
      const golaGapTotal = golaVerticalGap * 2;
      const totalAvailablePool = (innerHeight - golaTopGap) - doorOuterGap - panelThickness;
      const eachFrontH = (totalAvailablePool - (numDrawers - 1) * golaGapTotal) / numDrawers;
      drawerFrontHeights = Array.from({ length: numDrawers }).map((_, i) => (i === 0 ? eachFrontH + panelThickness : eachFrontH));
      
      for (let i = 0; i < numDrawers - 1; i++) {
        let yBase = doorOuterGap;
        for (let j = 0; j <= i; j++) {
          yBase += drawerFrontHeights[j] + (j < i ? golaGapTotal : 0);
        }
        gapHeights.push(yBase + golaVerticalGap);
      }
    } else {
      const drawerHeight = (innerHeight - panelThickness - doorOuterGap * (numDrawers + 1)) / numDrawers;
      drawerFrontHeights = Array.from({ length: numDrawers }).map((_, i) => (i === 0 ? drawerHeight + panelThickness : drawerHeight));
    }
  }

  const doorWidth = actualNumDoors === 1 ? innerWidth - doorOuterGap * 2 : (innerWidth - doorOuterGap * 2 - doorInnerGap) / 2;
  const doorHeight = innerHeight - doorOuterGap * 2 - (isGolaActive ? settings.doorOverride : 0);
  const topHingeVerticalOffset = isGolaActive ? (settings.golaLCutoutHeight + settings.hingeVerticalOffset - settings.doorOverride - doorOuterGap) : settings.hingeVerticalOffset;
  const bottomHingeVerticalOffset = settings.hingeVerticalOffset;

  const addPanelToZip = (name: string, width: number, height: number, holesInput: { y: number, z: number, r: number, through?: boolean }[] = [], grooveInput?: { x: number, y: number, w: number, h: number, depth: number }, golaCutouts?: { x: number, y: number, w: number, h: number }[], mirrorX: boolean = false) => {
    if (dataCollector) {
      dataCollector({ name, width, height, holes: holesInput, groove: grooveInput, cutouts: golaCutouts, mirrorX });
    }
    if (!zip) return;
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
        if (c.y + c.h < height - 0.1) {
          points.push({ point: { x: width, y: c.y + c.h } });
        }
      });
    } else {
      points.push({ point: { x: width, y: height } });
    }
    points.push({ point: { x: 0, y: height } });

    if (mirrorX) points.forEach(p => { p.point.x = width - p.point.x; });
    modelSpace.addLWPolyline([...points, points[0]], { flags: LWPolylineFlags.Closed, layerName: 'PANEL' });
    modelSpace.addText(point3d(width / 2, height / 2, 0), 12, name, { layerName: 'TEXT' });
    holes.forEach(hole => {
      const radius = hole.r;
      let centerX = hole.z + width / 2;
      let centerY = hole.y + height / 2;
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

  const sideW = depth;
  const sideH_Panel = innerHeight - panelThickness;
  const sideGroove = { x: panelThickness, y: 0, w: backPanelThickness + 2, h: sideH_Panel - panelThickness + grooveDepth, depth: grooveDepth };
  const nailR = nailHoleDiameter / 2;
  const panelHeight = innerHeight - panelThickness;
  const nailY = panelHeight / 2 - panelThickness / 2;
  const golaLOffsetDXF = isGolaActive ? settings.golaLCutoutDepth : 0;
  const zCenterFrontDXF = depth / 2 - golaLOffsetDXF - topStretcherWidth / 2;
  const zCenterBackDXF = -depth / 2 + topStretcherWidth / 2;
  const nailHoles = [];
  calculateNailHolePositions(topStretcherWidth).forEach(offset => {
    nailHoles.push({ y: nailY, z: zCenterFrontDXF + offset, r: nailR, through: true });
    nailHoles.push({ y: nailY, z: zCenterBackDXF + offset, r: nailR, through: true });
  });

  if (showBackStretchers) {
    const zBS = -depth / 2 + panelThickness / 2;
    const yCenterTopDXF = panelHeight / 2 - panelThickness - backStretcherHeight / 2;
    const yCenterBottomDXF = -panelHeight / 2 + backStretcherHeight / 2;
    calculateNailHolePositions(backStretcherHeight).forEach(offset => {
      nailHoles.push({ y: yCenterTopDXF + offset, z: zBS, r: nailR, through: true });
      nailHoles.push({ y: yCenterBottomDXF + offset, z: zBS, r: nailR, through: true });
    });
  }

  if (showShelves && numShelves > 0 && !showDrawers) {
    const availableH = innerHeight - panelThickness * 2;
    const spacing = availableH / (numShelves + 1);
    const sR = settings.shelfHoleDiameter / 2;
    for (let i = 0; i < numShelves; i++) {
      const sy = -innerHeight / 2 + panelThickness + spacing * (i + 1);
      const hy = sy - panelThickness / 2 - settings.nailHoleShelfDistance;
      const shelfLength = settings.shelfDepth;
      const shelfZStartGlobal = -depth / 2 + panelThickness + backPanelThickness;
      const zCenterShelf = shelfZStartGlobal + shelfLength / 2;
      const shelfHoleOffsets = calculateNailHolePositions(shelfLength);
      const finalShelfOffsets = [shelfHoleOffsets[0], shelfHoleOffsets[shelfHoleOffsets.length - 1]];

      finalShelfOffsets.forEach(offset => {
        nailHoles.push({ y: hy, z: zCenterShelf + offset, r: sR, through: false });
      });
    }
  }

  const golaCutoutsArr = isGolaActive ? [{ x: sideW - settings.golaLCutoutDepth, y: sideH_Panel - settings.golaLCutoutHeight, w: settings.golaLCutoutDepth, h: settings.golaLCutoutHeight }] : [];
  if (isGolaActive && showDrawers && gapHeights.length > 0) {
    gapHeights.forEach(gh => {
      golaCutoutsArr.push({ 
        x: sideW - settings.golaCutoutDepth, 
        y: gh - settings.golaCCutoutHeight / 2 - panelThickness, 
        w: settings.golaCutoutDepth, 
        h: settings.golaCCutoutHeight 
      });
    });
  }
  addPanelToZip('Left_Panel', sideW, sideH_Panel, nailHoles, sideGroove, golaCutoutsArr, false);
  addPanelToZip('Right_Panel', sideW, sideH_Panel, nailHoles, sideGroove, golaCutoutsArr, true);

  if (settings.exposedLeft) {
    addPanelToZip('Exposed_Left_Panel', depth, height);
  }
  if (settings.exposedRight) {
    addPanelToZip('Exposed_Right_Panel', depth, height);
  }

  const bottomHoles = [];
  const vLeftB = -innerWidth / 2 + panelThickness / 2;
  const vRightB = innerWidth / 2 - panelThickness / 2;
  calculateNailHolePositions(innerDepth).forEach(offset => {
    bottomHoles.push({ z: vLeftB, y: offset, r: nailR, through: true });
    bottomHoles.push({ z: vRightB, y: offset, r: nailR, through: true });
  });

  if (showBackStretchers) {
    const yB = -innerDepth / 2 + panelThickness / 2;
    calculateNailHolePositions(innerWidth).forEach(offset => {
      bottomHoles.push({ z: offset, y: yB, r: nailR, through: true });
    });
  }

  // Toe kick holes in bottom panel
  const zToeKickB = innerDepth / 2 - 50 - panelThickness / 2;
  calculateNailHolePositions(innerWidth).forEach(offset => {
    bottomHoles.push({ z: offset, y: zToeKickB, r: nailR, through: true });
  });

  addPanelToZip('Bottom_Panel', innerWidth, innerDepth, bottomHoles, { x: panelThickness, y: panelThickness, w: innerWidth - 2 * panelThickness, h: backPanelThickness + 2, depth: grooveDepth });

  if (showBackPanel) {
    addPanelToZip('Back_Panel', innerWidth - panelThickness * 2 + grooveDepth * 2, innerHeight - panelThickness * 2 + grooveDepth * 2);
  }

  // Top Stretchers (Only if enabled in construction)
  if (showBackStretchers) {
    addPanelToZip('top_front_stretcher', innerWidth - panelThickness * 2, topStretcherWidth);
  }
  
  // top_back_stretcher with holes and groove (Only if enabled)
  if (showBackStretchers) {
    const technicalR2 = nailHoleDiameter / 2;
    const tbsWidth = innerWidth - panelThickness * 2;
    const tbsZ = -topStretcherWidth / 2 + panelThickness / 2;
    const topBackHoles = calculateNailHolePositions(tbsWidth).map(offset => ({
      z: offset, y: tbsZ, r: technicalR2, through: true
    }));
    // Groove for back panel (at panelThickness from the edge)
    const topBackGroove = { x: 0, y: panelThickness, w: tbsWidth, h: backPanelThickness + 2, depth: grooveDepth };
    addPanelToZip('top_back_stretcher', tbsWidth, topStretcherWidth, topBackHoles, topBackGroove);
  }
  
  if (showBackStretchers) {
     addPanelToZip('back_top_stretcher', innerWidth - panelThickness * 2, backStretcherHeight);
     addPanelToZip('back_bottom_stretcher', innerWidth - panelThickness * 2, backStretcherHeight);
  }

  if (showDoors) {
    const doorHeight = innerHeight - doorOuterGap * 2;
    for (let i = 0; i < actualNumDoors; i++) {
      const hX = actualNumDoors === 1 ? -doorWidth / 2 + hingeHorizontalOffset : (i === 0 ? -doorWidth / 2 + hingeHorizontalOffset : doorWidth / 2 - hingeHorizontalOffset);
      const hingeHoles = [{ y: doorHeight / 2 - hingeVerticalOffset, z: hX, r: hingeDiameter / 2 }, { y: -doorHeight / 2 + hingeVerticalOffset, z: hX, r: hingeDiameter / 2 }];
      addPanelToZip(`Door_${i + 1}`, doorWidth, doorHeight, hingeHoles);
    }
  }

  if (toeKickHeight > 0) {
    addPanelToZip('Toe_Kick', width, toeKickHeight);
  }

  if (showShelves && numShelves > 0 && !showDrawers) {
    const shelfWidth = innerWidth - panelThickness * 2 - 2;
    const shelfDepth = settings.shelfDepth;
    for (let i = 0; i < numShelves; i++) {
       addPanelToZip(`Shelf_${i + 1}`, shelfWidth, shelfDepth);
    }
  }

  if (showDrawers && numDrawers > 0) {
    const boxDepth = depth - panelThickness - backPanelThickness - settings.drawerBackClearance;
    const boxWidth = (carcassWidth - panelThickness * 2) - drawerSideClearance * 2;
    const boxHeight = (innerHeight / numDrawers) * drawerBoxHeightRatio; // Approx, but good for labels
    
    const frontWidth = carcassWidth - doorOuterGap * 2;
    for (let i = 0; i < numDrawers; i++) {
      const frontHeight = drawerFrontHeights[i];
      const handleHoles: { y: number, z: number, r: number, through?: boolean }[] = [];
      if (!isGolaActive) {
        // Center handle Holes (assuming 128mm CC)
        handleHoles.push({ y: 0, z: -64, r: 2.5, through: true }, { y: 0, z: 64, r: 2.5, through: true });
      }
      
      addPanelToZip(`Drawer_${i + 1}_Front`, frontWidth, frontHeight, handleHoles);
      addPanelToZip(`Drawer_${i + 1}_Side_L`, boxDepth, boxHeight);
      addPanelToZip(`Drawer_${i + 1}_Side_R`, boxDepth, boxHeight);
      addPanelToZip(`Drawer_${i + 1}_Back`, boxWidth - panelThickness * 2, boxHeight);
      addPanelToZip(`Drawer_${i + 1}_Bottom`, boxWidth - panelThickness * 2, boxDepth - drawerBackThickness);
    }
  }
};
