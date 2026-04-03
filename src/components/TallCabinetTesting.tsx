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
    showDoors, showShelves, numShelves, showHinges, skeletonView, partsSeparatedView, selectedPart,
    hingeDiameter, hingeDepth, hingeHorizontalOffset, hingeVerticalOffset, showDifferentPanelColors,
    showNailHoles, nailHoleDiameter,
  } = settings;

  const baseColor = new THREE.Color('#d4a574');
  const darkerColor = baseColor.clone().multiplyScalar(0.7);
  const backPanelColor = new THREE.Color('#c9a87c');
  const doorColor = baseColor.clone();

  const getPanelColor = (panelType: string): THREE.Color => {
    if (!showDifferentPanelColors) return darkerColor;
    return (panelColors as any)[panelType] || darkerColor;
  };

  const innerWidth = width;
  const innerHeight = height;
  const innerDepth = depth;

  const actualNumDoors = width < RUBY_DOOR_THRESHOLD ? 1 : 2;
  const doorWidth = actualNumDoors === 1 
    ? innerWidth - doorOuterGap * 2 
    : (innerWidth - doorOuterGap * 2 - doorInnerGap) / 2;
  const doorHeight = innerHeight - doorOuterGap * 2;

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
    };
    return offsets[part] || [0, 0, 0];
  };

  const nailHolePositions = useMemo(() => {
    if (!showNailHoles) return [];
    const positions: { y: number, z: number, r: number, through?: boolean }[] = [];
    const shelfR = settings.shelfHoleDiameter / 2;

    if (showShelves && numShelves > 0) {
      const availableHeight = innerHeight - panelThickness * 2;
      const spacing = availableHeight / (numShelves + 1);
      for (let i = 0; i < numShelves; i++) {
        const shelfYCabinet = -innerHeight / 2 + panelThickness + spacing * (i + 1);
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
  }, [showNailHoles, innerHeight, depth, panelThickness, backPanelThickness, settings.shelfHoleDiameter, showShelves, numShelves, settings.nailHoleShelfDistance, settings.shelfDepth]);

  const leftPanelGeo = useMemo(() => {
    const sidePanelHeight = innerHeight - panelThickness;
    return createPanelWithHolesGeo(
      panelThickness, sidePanelHeight, depth,
      -depth / 2 + panelThickness, -depth / 2 + panelThickness + backPanelThickness,
      grooveDepth, 'px',
      nailHolePositions, settings.nailHoleDepth,
      panelThickness - grooveDepth, 0
    );
  }, [panelThickness, innerHeight, depth, backPanelThickness, grooveDepth, nailHolePositions, settings.nailHoleDepth]);

  const rightPanelGeo = useMemo(() => {
    const sidePanelHeight = innerHeight - panelThickness;
    return createPanelWithHolesGeo(
      panelThickness, sidePanelHeight, depth,
      -depth / 2 + panelThickness, -depth / 2 + panelThickness + backPanelThickness,
      grooveDepth, 'nx',
      nailHolePositions, settings.nailHoleDepth,
      panelThickness - grooveDepth, 0
    );
  }, [panelThickness, innerHeight, depth, backPanelThickness, grooveDepth, nailHolePositions, settings.nailHoleDepth]);

  const bottomPanelGeo = useMemo(() => createPanelWithHolesGeo(
    panelThickness, innerWidth, innerDepth,
    -innerDepth / 2 + panelThickness, -innerDepth / 2 + panelThickness + backPanelThickness,
    grooveDepth, 'py',
    [], settings.nailHoleDepth,
    panelThickness, panelThickness
  ), [innerWidth, panelThickness, innerDepth, backPanelThickness, grooveDepth]);

  const topPanelGeo = useMemo(() => createGroovedPanelGeo(
    innerWidth, panelThickness, innerDepth,
    -innerDepth / 2 + panelThickness, -innerDepth / 2 + panelThickness + backPanelThickness,
    grooveDepth, 'ny'
  ), [innerWidth, panelThickness, innerDepth, backPanelThickness, grooveDepth]);

  const doorGeos = useMemo(() => {
    const geos = [];
    for (let i = 0; i < actualNumDoors; i++) {
      const hingeXOffset = actualNumDoors === 1 
        ? -doorWidth / 2 + hingeHorizontalOffset 
        : (i === 0 ? -doorWidth / 2 + hingeHorizontalOffset : doorWidth / 2 - hingeHorizontalOffset);
      geos.push(createDoorWithHingeHoles(
        doorWidth, doorHeight, doorMaterialThickness,
        hingeXOffset, hingeDiameter / 2, hingeDepth, 
        hingeVerticalOffset, hingeVerticalOffset
      ));
    }
    return geos;
  }, [actualNumDoors, doorWidth, doorHeight, doorMaterialThickness, hingeHorizontalOffset, hingeDiameter, hingeDepth, hingeVerticalOffset]);

  const shelfGeo = useMemo(() => {
    const shelfWidth = innerWidth - panelThickness * 2 - 2;
    const shelfDepth = settings.shelfDepth;
    return new THREE.BoxGeometry(shelfWidth, panelThickness, shelfDepth);
  }, [innerWidth, panelThickness, settings.shelfDepth]);

  const shouldShow = (part: string): boolean => {
    if (!partsSeparatedView) return true;
    if (selectedPart === 'all' || selectedPart === part) return true;
    return false;
  };

  return (
    <group position={[width / 2, height / 2, depth / 2]}>
      {shouldShow('bottomPanel') && (
        <mesh position={[0 + getOffset('bottomPanel')[0], -innerHeight / 2 + panelThickness / 2 + getOffset('bottomPanel')[1], 0 + getOffset('bottomPanel')[2]]} castShadow receiveShadow visible={!skeletonView}>
          <primitive object={bottomPanelGeo} attach="geometry" />
          <meshStandardMaterial color={getPanelColor('bottomPanel')} roughness={0.8} />
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
          <meshStandardMaterial color={getPanelColor('topPanel')} roughness={0.8} />
        </mesh>
      )}
      {skeletonView && shouldShow('topPanel') && (
        <lineSegments position={[0 + getOffset('topPanel')[0], innerHeight / 2 - panelThickness / 2 + getOffset('topPanel')[1], 0 + getOffset('topPanel')[2]]}>
          <edgesGeometry args={[topPanelGeo]} />
          <lineBasicMaterial color={getPanelColor('topPanel')} linewidth={2} />
        </lineSegments>
      )}

      {shouldShow('leftPanel') && (
        <mesh position={[-width / 2 + panelThickness / 2 + getOffset('leftPanel')[0], panelThickness / 2 + getOffset('leftPanel')[1], 0 + getOffset('leftPanel')[2]]} castShadow receiveShadow visible={!skeletonView}>
          <primitive object={leftPanelGeo} attach="geometry" />
          <meshStandardMaterial color={getPanelColor('leftPanel')} roughness={0.8} side={THREE.DoubleSide} />
        </mesh>
      )}
      {skeletonView && shouldShow('leftPanel') && (
        <lineSegments position={[-width / 2 + panelThickness / 2 + getOffset('leftPanel')[0], panelThickness / 2 + getOffset('leftPanel')[1], 0 + getOffset('leftPanel')[2]]}>
          <edgesGeometry args={[leftPanelGeo]} />
          <lineBasicMaterial color={getPanelColor('leftPanel')} linewidth={2} />
        </lineSegments>
      )}
      {shouldShow('rightPanel') && (
        <mesh position={[width / 2 - panelThickness / 2 + getOffset('rightPanel')[0], panelThickness / 2 + getOffset('rightPanel')[1], 0 + getOffset('rightPanel')[2]]} castShadow receiveShadow visible={!skeletonView}>
          <primitive object={rightPanelGeo} attach="geometry" />
          <meshStandardMaterial color={getPanelColor('rightPanel')} roughness={0.8} side={THREE.DoubleSide} />
        </mesh>
      )}
      {skeletonView && shouldShow('rightPanel') && (
        <lineSegments position={[width / 2 - panelThickness / 2 + getOffset('rightPanel')[0], panelThickness / 2 + getOffset('rightPanel')[1], 0 + getOffset('rightPanel')[2]]}>
          <edgesGeometry args={[rightPanelGeo]} />
          <lineBasicMaterial color={getPanelColor('rightPanel')} linewidth={2} />
        </lineSegments>
      )}

      {showBackPanel && shouldShow('backPanel') && (
        <mesh position={[0 + getOffset('backPanel')[0], 0 + getOffset('backPanel')[1], -innerDepth / 2 + panelThickness + backPanelThickness / 2 + getOffset('backPanel')[2]]} castShadow receiveShadow visible={!skeletonView}>
          <boxGeometry args={[innerWidth - panelThickness * 2 + grooveDepth * 2, innerHeight - panelThickness * 2 + grooveDepth * 2, backPanelThickness]} />
          <meshStandardMaterial color={showDifferentPanelColors ? panelColors.backPanel : backPanelColor} roughness={0.9} />
        </mesh>
      )}
      {showBackPanel && skeletonView && shouldShow('backPanel') && (
        <lineSegments position={[0 + getOffset('backPanel')[0], 0 + getOffset('backPanel')[1], -innerDepth / 2 + panelThickness + backPanelThickness / 2 + getOffset('backPanel')[2]]}>
          <edgesGeometry args={[new THREE.BoxGeometry(innerWidth - panelThickness * 2 + grooveDepth * 2, innerHeight - panelThickness * 2 + grooveDepth * 2, backPanelThickness)]} />
          <lineBasicMaterial color={getPanelColor('backPanel')} linewidth={2} />
        </lineSegments>
      )}

      {showDoors && actualNumDoors > 0 && Array.from({ length: actualNumDoors }).map((_, i) => {
        const doorX = actualNumDoors === 1 ? 0 : (i === 0 ? -doorWidth / 2 - doorInnerGap / 2 : doorWidth / 2 + doorInnerGap / 2);
        const handleXOffset = actualNumDoors === 1 ? doorWidth / 2 - 30 : (i === 0 ? doorWidth / 2 - 30 : -doorWidth / 2 + 30);
        const hingeXOffset = actualNumDoors === 1 ? -doorWidth / 2 + hingeHorizontalOffset : (i === 0 ? -doorWidth / 2 + hingeHorizontalOffset : doorWidth / 2 - hingeHorizontalOffset);

        return (
          <group key={`door-${i}`}>
            {shouldShow('door') && (
              <mesh position={[doorX + getOffset('door', i)[0], 0 + getOffset('door', i)[1], depth / 2 + doorMaterialThickness / 2 + getOffset('door', i)[2]]} castShadow receiveShadow visible={!skeletonView}>
                <primitive object={doorGeos[i]} attach="geometry" />
                <meshStandardMaterial color={doorColor} roughness={0.6} />
              </mesh>
            )}
            {shouldShow('door') && skeletonView && (
              <lineSegments position={[doorX + getOffset('door', i)[0], 0 + getOffset('door', i)[1], depth / 2 + doorMaterialThickness / 2 + getOffset('door', i)[2]]}>
                <edgesGeometry args={[doorGeos[i]]} />
                <lineBasicMaterial color={getPanelColor('door')} linewidth={2} />
              </lineSegments>
            )}
            {shouldShow('door') && (
              <mesh position={[doorX + handleXOffset + getOffset('door', i)[0], 0 + getOffset('door', i)[1], depth / 2 + doorMaterialThickness + 5 + getOffset('door', i)[2]]} castShadow>
                <cylinderGeometry args={[2.5, 2.5, 50, 16]} />
                <meshStandardMaterial color="#4a5568" metalness={0.8} roughness={0.2} />
              </mesh>
            )}
            {showHinges && (
              <>
                <mesh position={[doorX + hingeXOffset, doorHeight / 2 - hingeVerticalOffset, depth / 2 - hingeDepth / 2]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                  <cylinderGeometry args={[hingeDiameter / 2, hingeDiameter / 2, hingeDepth, 16]} />
                  <meshStandardMaterial color="#888888" metalness={0.9} roughness={0.1} />
                </mesh>
                <mesh position={[doorX + hingeXOffset, -doorHeight / 2 + hingeVerticalOffset, depth / 2 - hingeDepth / 2]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                  <cylinderGeometry args={[hingeDiameter / 2, hingeDiameter / 2, hingeDepth, 16]} />
                  <meshStandardMaterial color="#888888" metalness={0.9} roughness={0.1} />
                </mesh>
              </>
            )}
          </group>
        );
      })}

      {showShelves && numShelves > 0 && Array.from({ length: numShelves }).map((_, i) => {
        const availableHeight = innerHeight - panelThickness * 2;
        const spacing = availableHeight / (numShelves + 1);
        const shelfY = -innerHeight / 2 + panelThickness + spacing * (i + 1);
        const shelfZOffset = -depth / 2 + panelThickness + backPanelThickness + settings.shelfDepth / 2;
        return (
          <mesh key={`shelf-${i}`} position={[0 + getOffset('shelf', i)[0], shelfY - panelThickness / 2 + getOffset('shelf', i)[1], shelfZOffset + getOffset('shelf', i)[2]]} castShadow receiveShadow visible={!skeletonView}>
            <boxGeometry args={[innerWidth - panelThickness * 2 - 2, panelThickness, settings.shelfDepth]} />
            <meshStandardMaterial color={getPanelColor('shelf')} roughness={0.8} />
          </mesh>
        );
      })}
      {showShelves && numShelves > 0 && skeletonView && Array.from({ length: numShelves }).map((_, i) => {
        const availableHeight = innerHeight - panelThickness * 2;
        const spacing = availableHeight / (numShelves + 1);
        const shelfY = -innerHeight / 2 + panelThickness + spacing * (i + 1);
        const shelfZOffset = -depth / 2 + panelThickness + backPanelThickness + settings.shelfDepth / 2;
        return (
          <lineSegments key={`sk-shelf-${i}`} position={[0 + getOffset('shelf', i)[0], shelfY - panelThickness / 2 + getOffset('shelf', i)[1], shelfZOffset + getOffset('shelf', i)[2]]}>
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
    showBackPanel, showBackStretchers, showDoors, showShelves, numShelves, hingeDiameter, hingeHorizontalOffset, hingeVerticalOffset
  } = settings;

  const innerWidth = width;
  const innerHeight = height;
  const innerDepth = depth;
  const actualNumDoors = width < RUBY_DOOR_THRESHOLD ? 1 : 2;
  const doorWidth = actualNumDoors === 1 ? innerWidth - doorOuterGap * 2 : (innerWidth - doorOuterGap * 2 - doorInnerGap) / 2;
  const doorHeight = innerHeight - doorOuterGap * 2;

  const addPanelToZip = (name: string, width: number, height: number, holesInput: { y: number, z: number, r: number, through?: boolean }[] = [], grooveInput?: { x: number, y: number, w: number, h: number, depth: number }, mirrorX: boolean = false) => {
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
    const points = [{ point: { x: 0, y: 0 } }, { point: { x: width, y: 0 } }, { point: { x: width, y: height } }, { point: { x: 0, y: height } }];
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
  if (showShelves && numShelves > 0) {
    const availableH = innerHeight - panelThickness * 2;
    const spacing = availableH / (numShelves + 1);
    const sR = settings.shelfHoleDiameter / 2;
    for (let i = 0; i < numShelves; i++) {
      const sy = -innerHeight / 2 + panelThickness + spacing * (i + 1);
      const hy = sy - panelThickness / 2 - settings.nailHoleShelfDistance;
      const szS = -depth / 2 + panelThickness + backPanelThickness;
      nailHoles.push({ y: hy, z: szS + settings.shelfDepth * 0.25, r: sR, through: false }, { y: hy, z: szS + settings.shelfDepth * 0.75, r: sR, through: false });
    }
  }

  const sideW = depth;
  const sideH_Panel = innerHeight - panelThickness;
  const sideGroove = { x: panelThickness, y: 0, w: backPanelThickness + 2, h: sideH_Panel - panelThickness + grooveDepth, depth: grooveDepth };
  
  addPanelToZip('Left_Panel', sideW, sideH_Panel, nailHoles, sideGroove, false);
  addPanelToZip('Right_Panel', sideW, sideH_Panel, nailHoles, sideGroove, true);
  addPanelToZip('Bottom_Panel', innerWidth, innerDepth, [], { x: 0, y: panelThickness, w: innerWidth, h: backPanelThickness + 2, depth: grooveDepth });
  addPanelToZip('Top_Panel', innerWidth, innerDepth, [], { x: 0, y: panelThickness, w: innerWidth, h: backPanelThickness + 2, depth: grooveDepth });

  if (showDoors) {
    for (let i = 0; i < actualNumDoors; i++) {
      const hX = actualNumDoors === 1 ? -doorWidth / 2 + hingeHorizontalOffset : (i === 0 ? -doorWidth / 2 + hingeHorizontalOffset : doorWidth / 2 - hingeHorizontalOffset);
      const hingeHoles = [{ y: doorHeight / 2 - hingeVerticalOffset, z: hX, r: hingeDiameter / 2 }, { y: -doorHeight / 2 + hingeVerticalOffset, z: hX, r: hingeDiameter / 2 }];
      addPanelToZip(`Door_${i + 1}`, doorWidth, doorHeight, hingeHoles);
    }
  }

  if (showShelves && numShelves > 0) {
    const shelfWidth = innerWidth - panelThickness * 2 - 2;
    const shelfDepth = settings.shelfDepth;
    for (let i = 0; i < numShelves; i++) {
       addPanelToZip(`Shelf_${i + 1}`, shelfWidth, shelfDepth);
    }
  }

  if (showBackPanel) {
    addPanelToZip('Back_Panel', innerWidth - panelThickness * 2 + grooveDepth * 2, innerHeight - panelThickness * 2 + grooveDepth * 2);
  }
};
