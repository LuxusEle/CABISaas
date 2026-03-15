import React, { useState, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';

const createDoorWithHingeHoles = (
  doorWidth: number, 
  doorHeight: number, 
  doorThickness: number, 
  hingeXOffset: number, 
  hingeRadius: number,
  hingeDepthVal: number,
  hingeVerticalOffsetVal: number
) => {
  const hingeDepth = hingeDepthVal;
  const backThickness = doorThickness - hingeDepth;

  const shape = new THREE.Shape();
  shape.moveTo(-doorWidth / 2, -doorHeight / 2);
  shape.lineTo(doorWidth / 2, -doorHeight / 2);
  shape.lineTo(doorWidth / 2, doorHeight / 2);
  shape.lineTo(-doorWidth / 2, doorHeight / 2);
  shape.lineTo(-doorWidth / 2, -doorHeight / 2);

  const hingeHole1 = new THREE.Path();
  hingeHole1.absarc(hingeXOffset, doorHeight / 2 - hingeVerticalOffsetVal, hingeRadius, 0, Math.PI * 2, false);
  shape.holes.push(hingeHole1);

  const hingeHole2 = new THREE.Path();
  hingeHole2.absarc(hingeXOffset, -doorHeight / 2 + hingeVerticalOffsetVal, hingeRadius, 0, Math.PI * 2, false);
  shape.holes.push(hingeHole2);

  const frontGeo = new THREE.ExtrudeGeometry(shape, { depth: hingeDepth, bevelEnabled: false });
  frontGeo.translate(0, 0, -doorThickness / 2);

  const backShape = new THREE.Shape();
  backShape.moveTo(-doorWidth / 2, -doorHeight / 2);
  backShape.lineTo(doorWidth / 2, -doorHeight / 2);
  backShape.lineTo(doorWidth / 2, doorHeight / 2);
  backShape.lineTo(-doorWidth / 2, doorHeight / 2);
  backShape.lineTo(-doorWidth / 2, -doorHeight / 2);

  const backGeo = new THREE.ExtrudeGeometry(backShape, { depth: backThickness, bevelEnabled: false });
  backGeo.translate(0, 0, -doorThickness / 2 + hingeDepth);

  let mergedGeo = BufferGeometryUtils.mergeGeometries([frontGeo, backGeo]);
  mergedGeo = BufferGeometryUtils.mergeVertices(mergedGeo);
  mergedGeo.center();
  
  return mergedGeo;
};

const createGroovedPanelGeo = (
  sizeX: number,
  sizeY: number,
  sizeZ: number,
  grooveLocalZMin: number,
  grooveLocalZMax: number,
  grooveDepth: number,
  grooveFace: 'px' | 'nx' | 'py' | 'ny',
  grooveStartOffset: number = 0,
  grooveEndOffset: number = 0
) => {
  let shapeWidth, shapeHeight, totalLength;
  
  if (grooveFace === 'px' || grooveFace === 'nx') {
    shapeWidth = sizeZ;
    shapeHeight = sizeX;
    totalLength = sizeY;
  } else {
    shapeWidth = sizeZ;
    shapeHeight = sizeY;
    totalLength = sizeX;
  }
  
  const uMin = -shapeWidth / 2;
  const uMax = shapeWidth / 2;
  const vMin = -shapeHeight / 2;
  const vMax = shapeHeight / 2;

  const getShape = (withGroove: boolean) => {
    const shape = new THREE.Shape();
    if (withGroove) {
      if (grooveFace === 'px' || grooveFace === 'py') {
        shape.moveTo(uMin, vMin);
        shape.lineTo(uMax, vMin);
        shape.lineTo(uMax, vMax);
        shape.lineTo(grooveLocalZMax, vMax);
        shape.lineTo(grooveLocalZMax, vMax - grooveDepth);
        shape.lineTo(grooveLocalZMin, vMax - grooveDepth);
        shape.lineTo(grooveLocalZMin, vMax);
        shape.lineTo(uMin, vMax);
        shape.lineTo(uMin, vMin);
      } else {
        shape.moveTo(uMin, vMax);
        shape.lineTo(uMin, vMin);
        shape.lineTo(grooveLocalZMin, vMin);
        shape.lineTo(grooveLocalZMin, vMin + grooveDepth);
        shape.lineTo(grooveLocalZMax, vMin + grooveDepth);
        shape.lineTo(grooveLocalZMax, vMin);
        shape.lineTo(uMax, vMin);
        shape.lineTo(uMax, vMax);
        shape.lineTo(uMin, vMax);
      }
    } else {
      shape.moveTo(uMin, vMin);
      shape.lineTo(uMax, vMin);
      shape.lineTo(uMax, vMax);
      shape.lineTo(uMin, vMax);
      shape.lineTo(uMin, vMin);
    }
    return shape;
  };

  const segments: THREE.BufferGeometry[] = [];
  let currentZ = 0;

  if (grooveStartOffset > 0) {
    const geo = new THREE.ExtrudeGeometry(getShape(false), { depth: grooveStartOffset, bevelEnabled: false });
    segments.push(geo);
    currentZ += grooveStartOffset;
  }

  const mainLength = totalLength - grooveStartOffset - grooveEndOffset;
  if (mainLength > 0) {
    const geo = new THREE.ExtrudeGeometry(getShape(true), { depth: mainLength, bevelEnabled: false });
    if (currentZ > 0) geo.translate(0, 0, currentZ);
    segments.push(geo);
    currentZ += mainLength;
  }

  if (grooveEndOffset > 0) {
    const geo = new THREE.ExtrudeGeometry(getShape(false), { depth: grooveEndOffset, bevelEnabled: false });
    if (currentZ > 0) geo.translate(0, 0, currentZ);
    segments.push(geo);
  }

  let finalGeo = segments.length > 1 
    ? BufferGeometryUtils.mergeGeometries(segments) 
    : segments[0];

  finalGeo = BufferGeometryUtils.mergeVertices(finalGeo);

  const positions = finalGeo.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const u = positions.getX(i);
    const v = positions.getY(i);
    const w = positions.getZ(i) - totalLength / 2;

    if (grooveFace === 'px' || grooveFace === 'nx') {
      positions.setXYZ(i, v, w, u);
    } else {
      positions.setXYZ(i, w, v, u);
    }
  }

  finalGeo.computeVertexNormals();
  return finalGeo;
};

interface TestingSettings {
  width: number;
  height: number;
  depth: number;
  panelThickness: number;
  backPanelThickness: number;
  doorMaterialThickness: number;
  grooveDepth: number;
  doorToDoorGap: number;
  doorToPanelGap: number;
  drawerToDrawerGap: number;
  doorOuterGap: number;
  doorInnerGap: number;
  doorSideClearance: number;
  toeKickHeight: number;
  backStretcherHeight: number;
  topStretcherWidth: number;
  showBackPanel: boolean;
  showBackStretchers: boolean;
  showDoors: boolean;
  showDrawers: boolean;
  showHinges: boolean;
  skeletonView: boolean;
  partsSeparatedView: boolean;
  selectedPart: string;
  numDrawers: number;
  cabinetType: 'base' | 'wall' | 'tall';
  hingeDiameter: number;
  hingeDepth: number;
  hingeHorizontalOffset: number;
  hingeVerticalOffset: number;
  showDifferentPanelColors: boolean;
}

const DEFAULT_SETTINGS: TestingSettings = {
  width: 600,
  height: 870,
  depth: 560,
  panelThickness: 18,
  backPanelThickness: 6,
  doorMaterialThickness: 18,
  grooveDepth: 5,
  doorToDoorGap: 2.0,
  doorToPanelGap: 2.0,
  drawerToDrawerGap: 2.0,
  doorOuterGap: 2.0,
  doorInnerGap: 2.0,
  doorSideClearance: 2.0,
  toeKickHeight: 100,
  backStretcherHeight: 100,
  topStretcherWidth: 100,
  showBackPanel: true,
  showBackStretchers: true,
  showDoors: true,
  showDrawers: false,
  showHinges: false,
  skeletonView: false,
  partsSeparatedView: false,
  selectedPart: 'all',
  numDrawers: 3,
  cabinetType: 'base',
  hingeDiameter: 16,
  hingeDepth: 7,
  hingeHorizontalOffset: 40,
  hingeVerticalOffset: 60,
  showDifferentPanelColors: false
};

const RUBY_DOOR_THRESHOLD = 599.5;

const TestingCabinet: React.FC<{ settings: TestingSettings }> = ({ settings }) => {
  const {
    width, height, depth, panelThickness, backPanelThickness,
    doorMaterialThickness, grooveDepth, doorToDoorGap, doorToPanelGap,
    drawerToDrawerGap, doorOuterGap, doorInnerGap, doorSideClearance,
    toeKickHeight, backStretcherHeight, topStretcherWidth, showBackPanel, showBackStretchers,
    showDoors, showDrawers, showHinges, skeletonView, partsSeparatedView, selectedPart, numDrawers, cabinetType,
    hingeDiameter, hingeDepth, hingeHorizontalOffset, hingeVerticalOffset, showDifferentPanelColors
  } = settings;

  const isBase = cabinetType === 'base';
  const isWall = cabinetType === 'wall';
  const isTall = cabinetType === 'tall';

  const panelColors = useMemo(() => ({
    leftPanel: new THREE.Color('#e74c3c'),
    rightPanel: new THREE.Color('#3498db'),
    bottomPanel: new THREE.Color('#2ecc71'),
    topPanel: new THREE.Color('#9b59b6'),
    backPanel: new THREE.Color('#f39c12'),
    backStretcherTop: new THREE.Color('#1abc9c'),
    backStretcherBottom: new THREE.Color('#e67e22'),
    topStretcherFront: new THREE.Color('#34495e'),
    topStretcherBack: new THREE.Color('#16a085'),
    toeKick: new THREE.Color('#c0392b'),
  }), []);

  const getPanelColor = (panelType: string): THREE.Color => {
    if (!showDifferentPanelColors) return darkerColor;
    return panelColors[panelType as keyof typeof panelColors] || darkerColor;
  };

  const innerWidth = width;
  const innerHeight = height;
  const innerDepth = depth;

  const baseColor = new THREE.Color('#d4a574');
  const darkerColor = baseColor.clone().multiplyScalar(0.7);
  const darkerColor2 = baseColor.clone().multiplyScalar(0.5);
  const backPanelColor = new THREE.Color('#c9a87c');
  const doorColor = baseColor.clone();

  const SkeletonMaterial = ({ color }: { color: string }) => (
    <meshStandardMaterial color={color} transparent opacity={0.15} wireframe />
  );

  const SkeletonBox: React.FC<{ 
    position: [number, number, number]; 
    args: [number, number, number]; 
    color: string;
    thickness?: number;
  }> = ({ position, args, color, thickness }) => {
    if (!skeletonView) return null;
    const [w, h, d] = args;
    return (
      <group position={position}>
        <mesh>
          <boxGeometry args={args} />
          <SkeletonMaterial color={color} />
        </mesh>
        <lineSegments>
          <edgesGeometry args={[new THREE.BoxGeometry(w, h, d)]} />
          <lineBasicMaterial color={color} linewidth={3} />
        </lineSegments>
        {thickness && thickness > 0 && (
          <>
            <lineSegments position={[0, -h/2 + thickness/2, d/2]}>
              <edgesGeometry args={[new THREE.BoxGeometry(w, thickness, thickness)]} />
              <lineBasicMaterial color="#ffffff" linewidth={2} />
            </lineSegments>
            <lineSegments position={[0, h/2 - thickness/2, d/2]}>
              <edgesGeometry args={[new THREE.BoxGeometry(w, thickness, thickness)]} />
              <lineBasicMaterial color="#ffffff" linewidth={2} />
            </lineSegments>
          </>
        )}
      </group>
    );
  };

  const actualNumDoors = width < RUBY_DOOR_THRESHOLD ? 1 : 2;
  const doorWidth = actualNumDoors === 1 
    ? innerWidth - doorOuterGap * 2 
    : (innerWidth - doorOuterGap * 2 - doorInnerGap) / 2;
  const doorHeight = innerHeight - doorOuterGap * 2;

  const drawerHeight = numDrawers > 0 
    ? (innerHeight - panelThickness - doorOuterGap * (numDrawers + 1)) / numDrawers 
    : 0;

  const backPanelY = depth - panelThickness - backPanelThickness - grooveDepth;
  const backPanelWidth = innerWidth - panelThickness * 2 + grooveDepth * 2;
  const backPanelHeight = innerHeight - panelThickness * 2 + grooveDepth * 2;

  const backPanelZ = -depth / 2 + panelThickness + backPanelThickness / 2;

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
    };
    return offsets[part] || [0, 0, 0];
  };

  const leftPanelGeo = useMemo(() => createGroovedPanelGeo(
    panelThickness, height - panelThickness, depth,
    -depth / 2 + panelThickness, -depth / 2 + panelThickness + backPanelThickness,
    grooveDepth, 'px',
    0, panelThickness
  ), [panelThickness, height, depth, backPanelThickness, grooveDepth]);

  const rightPanelGeo = useMemo(() => createGroovedPanelGeo(
    panelThickness, height - panelThickness, depth,
    -depth / 2 + panelThickness, -depth / 2 + panelThickness + backPanelThickness,
    grooveDepth, 'nx',
    0, panelThickness
  ), [panelThickness, height, depth, backPanelThickness, grooveDepth]);

  const bottomPanelGeo = useMemo(() => createGroovedPanelGeo(
    innerWidth, panelThickness, innerDepth,
    -innerDepth / 2 + panelThickness, -innerDepth / 2 + panelThickness + backPanelThickness,
    grooveDepth, 'py',
    panelThickness, panelThickness
  ), [innerWidth, panelThickness, innerDepth, backPanelThickness, grooveDepth]);

  const topPanelGeo = useMemo(() => createGroovedPanelGeo(
    innerWidth, panelThickness, innerDepth,
    -innerDepth / 2 + panelThickness, -innerDepth / 2 + panelThickness + backPanelThickness,
    grooveDepth, 'ny'
  ), [innerWidth, panelThickness, innerDepth, backPanelThickness, grooveDepth]);

  const topStretcherBackGeo = useMemo(() => createGroovedPanelGeo(
    innerWidth - panelThickness * 2, panelThickness, topStretcherWidth,
    panelThickness - topStretcherWidth / 2, panelThickness + backPanelThickness - topStretcherWidth / 2,
    grooveDepth, 'ny'
  ), [innerWidth, panelThickness, topStretcherWidth, backPanelThickness, grooveDepth]);

  const shouldShow = (part: string): boolean => {
    if (!partsSeparatedView) return true;
    return selectedPart === 'all' || selectedPart === part;
  };

  return (
    <group>
      <group position={[width / 2, isBase ? toeKickHeight + height / 2 : height / 2, depth / 2]}>
        {isBase && shouldShow('bottomPanel') && (
          <>
            <mesh position={[
              0 + getOffset('bottomPanel')[0],
              -height / 2 + panelThickness / 2 + getOffset('bottomPanel')[1],
              0 + getOffset('bottomPanel')[2]
            ]} castShadow receiveShadow visible={!skeletonView}>
            <primitive object={bottomPanelGeo} attach="geometry" />
            <meshStandardMaterial color={getPanelColor('bottomPanel')} roughness={0.8} side={THREE.DoubleSide} />
          </mesh>
            {skeletonView && (
              <lineSegments position={[
                0 + getOffset('bottomPanel')[0],
                -height / 2 + panelThickness / 2 + getOffset('bottomPanel')[1],
                0 + getOffset('bottomPanel')[2]
              ]}>
                <edgesGeometry args={[bottomPanelGeo]} />
                <lineBasicMaterial color="#00ff00" linewidth={3} />
              </lineSegments>
            )}
          </>
        )}

        {isWall && shouldShow('topPanel') && (
          <mesh position={[
            0 + getOffset('topPanel')[0],
            height / 2 - panelThickness / 2 + getOffset('topPanel')[1],
            0 + getOffset('topPanel')[2]
          ]} castShadow receiveShadow visible={!skeletonView}>
            <primitive object={topPanelGeo} attach="geometry" />
            <meshStandardMaterial color={getPanelColor('topPanel')} roughness={0.8} side={THREE.DoubleSide} />
          </mesh>
        )}

        {isTall && shouldShow('topPanel') && (
          <>
            <mesh position={[
              0 + getOffset('topPanel')[0],
              height / 2 - panelThickness / 2 + getOffset('topPanel')[1],
              0 + getOffset('topPanel')[2]
            ]} castShadow receiveShadow visible={!skeletonView}>
            <primitive object={topPanelGeo} attach="geometry" />
            <meshStandardMaterial color={darkerColor} roughness={0.8} side={THREE.DoubleSide} />
          </mesh>
          </>
        )}

        {isTall && shouldShow('bottomPanel') && (
          <mesh position={[
            0 + getOffset('bottomPanel')[0],
            -height / 2 + panelThickness / 2 + getOffset('bottomPanel')[1],
            0 + getOffset('bottomPanel')[2]
          ]} castShadow receiveShadow visible={!skeletonView}>
            <primitive object={bottomPanelGeo} attach="geometry" />
            <meshStandardMaterial color={darkerColor} roughness={0.8} />
          </mesh>
        )}

        {shouldShow('leftPanel') && (
          <mesh position={[
            -width / 2 + panelThickness / 2 + getOffset('leftPanel')[0],
            panelThickness / 2 + getOffset('leftPanel')[1],
            0 + getOffset('leftPanel')[2]
          ]} castShadow receiveShadow visible={!skeletonView}>
            <primitive object={leftPanelGeo} attach="geometry" />
            <meshStandardMaterial color={getPanelColor('leftPanel')} roughness={0.8} side={THREE.DoubleSide} />
          </mesh>
        )}
        {skeletonView && shouldShow('leftPanel') && (
          <lineSegments position={[
            -width / 2 + panelThickness / 2 + getOffset('leftPanel')[0],
            panelThickness / 2 + getOffset('leftPanel')[1],
            0 + getOffset('leftPanel')[2]
          ]}>
            <edgesGeometry args={[leftPanelGeo]} />
            <lineBasicMaterial color="#00ff00" linewidth={3} />
          </lineSegments>
        )}

        {shouldShow('rightPanel') && (
          <mesh position={[
            width / 2 - panelThickness / 2 + getOffset('rightPanel')[0],
            panelThickness / 2 + getOffset('rightPanel')[1],
            0 + getOffset('rightPanel')[2]
          ]} castShadow receiveShadow visible={!skeletonView}>
            <primitive object={rightPanelGeo} attach="geometry" />
            <meshStandardMaterial color={getPanelColor('rightPanel')} roughness={0.8} side={THREE.DoubleSide} />
          </mesh>
        )}
        {skeletonView && shouldShow('rightPanel') && (
          <lineSegments position={[
            width / 2 - panelThickness / 2 + getOffset('rightPanel')[0],
            panelThickness / 2 + getOffset('rightPanel')[1],
            0 + getOffset('rightPanel')[2]
          ]}>
            <edgesGeometry args={[rightPanelGeo]} />
            <lineBasicMaterial color="#00ff00" linewidth={3} />
          </lineSegments>
        )}

        {showBackPanel && shouldShow('backPanel') && (
          <mesh position={[
            0 + getOffset('backPanel')[0],
            0 + getOffset('backPanel')[1],
            -innerDepth / 2 + panelThickness + backPanelThickness / 2 + getOffset('backPanel')[2]
          ]} castShadow receiveShadow visible={!skeletonView}>
            <boxGeometry args={[backPanelWidth, backPanelHeight, backPanelThickness]} />
            <meshStandardMaterial color={showDifferentPanelColors ? panelColors.backPanel : backPanelColor} roughness={0.9} />
          </mesh>
        )}
        {skeletonView && showBackPanel && shouldShow('backPanel') && (
          <lineSegments position={[
            0 + getOffset('backPanel')[0],
            0 + getOffset('backPanel')[1],
            -innerDepth / 2 + panelThickness + backPanelThickness / 2 + getOffset('backPanel')[2]
          ]}>
            <edgesGeometry args={[new THREE.BoxGeometry(backPanelWidth, backPanelHeight, backPanelThickness)]} />
            <lineBasicMaterial color="#ff00ff" linewidth={3} />
          </lineSegments>
        )}

        {showBackStretchers && isBase && shouldShow('backStretcherTop') && (
          <mesh position={[
            0 + getOffset('backStretcherTop')[0],
            height / 2 - panelThickness - backStretcherHeight / 2 + getOffset('backStretcherTop')[1],
            -innerDepth / 2 + panelThickness / 2 + getOffset('backStretcherTop')[2]
          ]} castShadow receiveShadow visible={!skeletonView}>
            <boxGeometry args={[innerWidth - panelThickness * 2, backStretcherHeight, panelThickness]} />
            <meshStandardMaterial color={getPanelColor('backStretcherTop')} roughness={0.8} />
          </mesh>
        )}
        {showBackStretchers && isBase && shouldShow('backStretcherBottom') && (
          <mesh position={[
            0 + getOffset('backStretcherBottom')[0],
            -height / 2 + panelThickness + backStretcherHeight / 2 + getOffset('backStretcherBottom')[1],
            -innerDepth / 2 + panelThickness / 2 + getOffset('backStretcherBottom')[2]
          ]} castShadow receiveShadow visible={!skeletonView}>
            <boxGeometry args={[innerWidth - panelThickness * 2, backStretcherHeight, panelThickness]} />
            <meshStandardMaterial color={getPanelColor('backStretcherBottom')} roughness={0.8} />
          </mesh>
        )}
        {skeletonView && showBackStretchers && isBase && (
          <>
            {shouldShow('backStretcherTop') && (
              <lineSegments position={[
                0 + getOffset('backStretcherTop')[0],
                height / 2 - panelThickness - backStretcherHeight / 2 + getOffset('backStretcherTop')[1],
                -innerDepth / 2 + panelThickness / 2 + getOffset('backStretcherTop')[2]
              ]}>
                <edgesGeometry args={[new THREE.BoxGeometry(innerWidth - panelThickness * 2, backStretcherHeight, panelThickness)]} />
                <lineBasicMaterial color="#ffff00" linewidth={3} />
              </lineSegments>
            )}
            {shouldShow('backStretcherBottom') && (
              <lineSegments position={[
                0 + getOffset('backStretcherBottom')[0],
                -height / 2 + panelThickness + backStretcherHeight / 2 + getOffset('backStretcherBottom')[1],
                -innerDepth / 2 + panelThickness / 2 + getOffset('backStretcherBottom')[2]
              ]}>
                <edgesGeometry args={[new THREE.BoxGeometry(innerWidth - panelThickness * 2, backStretcherHeight, panelThickness)]} />
                <lineBasicMaterial color="#ffff00" linewidth={3} />
              </lineSegments>
            )}
          </>
        )}

        {showBackStretchers && isBase && shouldShow('topStretcherFront') && (
          <mesh position={[
            0 + getOffset('topStretcherFront')[0],
            height / 2 - panelThickness / 2 + getOffset('topStretcherFront')[1],
            depth / 2 - topStretcherWidth / 2 + getOffset('topStretcherFront')[2]
          ]} castShadow receiveShadow visible={!skeletonView}>
            <boxGeometry args={[innerWidth - panelThickness * 2, panelThickness, topStretcherWidth]} />
            <meshStandardMaterial color={getPanelColor('topStretcherFront')} roughness={0.8} />
          </mesh>
        )}
        {showBackStretchers && isBase && shouldShow('topStretcherBack') && (
          <mesh position={[
            0 + getOffset('topStretcherBack')[0],
            height / 2 - panelThickness / 2 + getOffset('topStretcherBack')[1],
            -innerDepth / 2 + topStretcherWidth / 2 + getOffset('topStretcherBack')[2]
          ]} castShadow receiveShadow visible={!skeletonView}>
            <primitive object={topStretcherBackGeo} attach="geometry" />
            <meshStandardMaterial color={getPanelColor('topStretcherBack')} roughness={0.8} side={THREE.DoubleSide} />
          </mesh>
        )}
        {skeletonView && showBackStretchers && isBase && (
          <>
            {shouldShow('topStretcherFront') && (
              <lineSegments position={[
                0 + getOffset('topStretcherFront')[0],
                height / 2 - panelThickness / 2 + getOffset('topStretcherFront')[1],
                depth / 2 - topStretcherWidth / 2 + getOffset('topStretcherFront')[2]
              ]}>
                <edgesGeometry args={[new THREE.BoxGeometry(innerWidth - panelThickness * 2, panelThickness, topStretcherWidth)]} />
                <lineBasicMaterial color="#ffff00" linewidth={3} />
              </lineSegments>
            )}
            {shouldShow('topStretcherBack') && (
              <lineSegments position={[
                0 + getOffset('topStretcherBack')[0],
                height / 2 - panelThickness / 2 + getOffset('topStretcherBack')[1],
                -innerDepth / 2 + topStretcherWidth / 2 + getOffset('topStretcherBack')[2]
              ]}>
                <edgesGeometry args={[topStretcherBackGeo]} />
                <lineBasicMaterial color="#ffff00" linewidth={3} />
              </lineSegments>
            )}
          </>
        )}

        {showDoors && actualNumDoors > 0 && Array.from({ length: actualNumDoors }).map((_, i) => {
          const doorX = actualNumDoors === 1 
            ? 0 
            : (i === 0 ? -doorWidth / 2 - doorInnerGap / 2 : doorWidth / 2 + doorInnerGap / 2);
          
          let handleYPos;
          if (isWall) {
            handleYPos = -doorHeight / 2 + 50;
          } else if (isTall) {
            handleYPos = 0;
          } else {
            handleYPos = doorHeight / 2 - 50;
          }

          const handleXOffset = actualNumDoors === 1 
            ? doorWidth / 2 - 30 
            : (i === 0 ? doorWidth / 2 - 30 : -doorWidth / 2 + 30);

          const hingeXOffset = actualNumDoors === 1 
            ? -doorWidth / 2 + hingeHorizontalOffset 
            : (i === 0 ? -doorWidth / 2 + hingeHorizontalOffset : doorWidth / 2 - hingeHorizontalOffset);
          const hingeRadius = hingeDiameter / 2;

          const doorGeo = useMemo(() => createDoorWithHingeHoles(
            doorWidth, doorHeight, doorMaterialThickness, 
            hingeXOffset, hingeRadius, hingeDepth, hingeVerticalOffset
          ), [doorWidth, doorHeight, doorMaterialThickness, hingeXOffset, hingeRadius, hingeDepth, hingeVerticalOffset]);

          return (
            <group key={`door-${i}`}>
              {shouldShow('door') && (
                <>
                  <mesh position={[
                    doorX + getOffset('door', i)[0],
                    0 + getOffset('door', i)[1],
                    depth / 2 + doorMaterialThickness / 2 + getOffset('door', i)[2]
                  ]} castShadow receiveShadow visible={!skeletonView}>
            <primitive object={doorGeo} attach="geometry" />
            <meshStandardMaterial color={doorColor} roughness={0.6} />
          </mesh>
                  {skeletonView && (
                    <group position={[
                      doorX + getOffset('door', i)[0],
                      0 + getOffset('door', i)[1],
                      depth / 2 + doorMaterialThickness / 2 + getOffset('door', i)[2]
                    ]}>
                      <lineSegments>
                        <edgesGeometry args={[new THREE.BoxGeometry(doorWidth, doorHeight, doorMaterialThickness)]} />
                        <lineBasicMaterial color="#00ffff" linewidth={3} />
                      </lineSegments>
                      <lineSegments position={[hingeXOffset, doorHeight / 2 - hingeVerticalOffset, -doorMaterialThickness / 2 + hingeDepth / 2]}>
                        <edgesGeometry args={[new THREE.CylinderGeometry(hingeRadius, hingeRadius, hingeDepth, 16).rotateX(Math.PI / 2)]} />
                        <lineBasicMaterial color="#00ffff" linewidth={3} />
                      </lineSegments>
                      <lineSegments position={[hingeXOffset, -doorHeight / 2 + hingeVerticalOffset, -doorMaterialThickness / 2 + hingeDepth / 2]}>
                        <edgesGeometry args={[new THREE.CylinderGeometry(hingeRadius, hingeRadius, hingeDepth, 16).rotateX(Math.PI / 2)]} />
                        <lineBasicMaterial color="#00ffff" linewidth={3} />
                      </lineSegments>
                    </group>
                  )}
                </>
              )}
              {shouldShow('door') && (
                <mesh position={[
                  doorX + handleXOffset + getOffset('door', i)[0],
                  handleYPos + getOffset('door', i)[1],
                  depth / 2 + doorMaterialThickness + 5 + getOffset('door', i)[2]
                ]} rotation={[0, 0, isWall ? Math.PI / 2 : 0]} castShadow>
                  <cylinderGeometry args={[3, 3, isWall ? 60 : 50, 16]} />
                  <meshStandardMaterial color="#4a5568" metalness={0.8} roughness={0.2} />
                </mesh>
              )}
              {showHinges && (
                <>
                  <mesh position={[doorX + hingeXOffset, doorHeight / 2 - hingeVerticalOffset, depth / 2 - hingeDepth / 2]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                    <cylinderGeometry args={[hingeRadius, hingeRadius, hingeDepth, 16]} />
                    <meshStandardMaterial color="#888888" metalness={0.9} roughness={0.1} />
                  </mesh>
                  <mesh position={[doorX + hingeXOffset, -doorHeight / 2 + hingeVerticalOffset, depth / 2 - hingeDepth / 2]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                    <cylinderGeometry args={[hingeRadius, hingeRadius, hingeDepth, 16]} />
                    <meshStandardMaterial color="#888888" metalness={0.9} roughness={0.1} />
                  </mesh>
                </>
              )}
            </group>
          );
        })}

        {showDrawers && numDrawers > 0 && Array.from({ length: numDrawers }).map((_, i) => {
          const drawerY = -height / 2 + panelThickness + doorOuterGap + i * (drawerHeight + drawerToDrawerGap) + drawerHeight / 2;
          
          return (
            <group key={`drawer-${i}`}>
              {shouldShow('drawer') && (
                <>
                  <mesh position={[
                    0 + getOffset('drawer', i)[0],
                    drawerY + getOffset('drawer', i)[1],
                    depth / 2 + doorMaterialThickness / 2 + getOffset('drawer', i)[2]
                  ]} castShadow receiveShadow visible={!skeletonView}>
            <boxGeometry args={[innerWidth - doorOuterGap * 2, drawerHeight, doorMaterialThickness]} />
            <meshStandardMaterial color={doorColor} roughness={0.6} />
          </mesh>
                  {skeletonView && (
                    <lineSegments position={[
                      0 + getOffset('drawer', i)[0],
                      drawerY + getOffset('drawer', i)[1],
                      depth / 2 + doorMaterialThickness / 2 + getOffset('drawer', i)[2]
                    ]}>
                      <edgesGeometry args={[new THREE.BoxGeometry(innerWidth - doorOuterGap * 2, drawerHeight, doorMaterialThickness)]} />
                      <lineBasicMaterial color="#ff6600" linewidth={3} />
                    </lineSegments>
                  )}
                </>
              )}
              {shouldShow('drawer') && (
                <mesh position={[
                  0 + getOffset('drawer', i)[0],
                  drawerY + getOffset('drawer', i)[1],
                  depth / 2 + doorMaterialThickness + 5 + getOffset('drawer', i)[2]
                ]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                  <cylinderGeometry args={[2.5, 2.5, 40, 16]} />
                  <meshStandardMaterial color="#4a5568" metalness={0.8} roughness={0.2} />
                </mesh>
              )}
            </group>
          );
        })}
      </group>

      {isBase && shouldShow('toeKick') && (
        <group position={[width / 2, toeKickHeight / 2, depth / 2]}>
          <mesh position={[
            0 + getOffset('toeKick')[0],
            0 + getOffset('toeKick')[1],
            depth / 2 - 50 - panelThickness / 2 + getOffset('toeKick')[2]
          ]} castShadow receiveShadow visible={!skeletonView}>
            <boxGeometry args={[innerWidth, toeKickHeight, panelThickness]} />
            <meshStandardMaterial color={getPanelColor('toeKick')} roughness={0.8} />
          </mesh>
          {skeletonView && (
            <lineSegments position={[
              0 + getOffset('toeKick')[0],
              0 + getOffset('toeKick')[1],
              depth / 2 - 50 - panelThickness / 2 + getOffset('toeKick')[2]
            ]}>
              <edgesGeometry args={[new THREE.BoxGeometry(innerWidth, toeKickHeight, panelThickness)]} />
              <lineBasicMaterial color="#00ffff" linewidth={3} />
            </lineSegments>
          )}
        </group>
      )}

      <axesHelper args={[200]} />
    </group>
  );
};

const SettingRow: React.FC<{ label: string; value: number; onChange: (v: number) => void; step?: number; min?: number; max?: number }> = 
  ({ label, value, onChange, step = 1, min = 0, max = 1000 }) => (
    <div className="flex items-center justify-between gap-2">
      <label className="text-xs text-slate-400 shrink-0">{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        step={step}
        min={min}
        max={max}
        className="w-20 px-2 py-1 text-xs bg-slate-700 border border-slate-600 rounded text-white"
      />
    </div>
  );

const CheckboxRow: React.FC<{ label: string; checked: boolean; onChange: (v: boolean) => void }> = 
  ({ label, checked, onChange }) => (
    <div className="flex items-center justify-between gap-2">
      <label className="text-xs text-slate-400">{label}</label>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 accent-amber-500"
      />
    </div>
  );

export const CabinetTestingPage: React.FC = () => {
  const [settings, setSettings] = useState<TestingSettings>(DEFAULT_SETTINGS);

  const updateSetting = <K extends keyof TestingSettings>(key: K, value: TestingSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="flex h-full bg-slate-900 text-white">
      <div className="w-80 shrink-0 overflow-y-auto p-4 border-r border-slate-700 bg-slate-800">
        <h2 className="text-lg font-bold text-amber-500 mb-4">Cabinet Testing</h2>
        
        <div className="space-y-4">
          <div className="bg-slate-700 rounded-lg p-3">
            <h3 className="text-sm font-bold text-slate-300 mb-2">Cabinet Type</h3>
            <div className="flex gap-2">
              {(['base', 'wall', 'tall'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => updateSetting('cabinetType', type)}
                  className={`flex-1 px-3 py-1.5 text-xs font-medium rounded ${
                    settings.cabinetType === type 
                      ? 'bg-amber-500 text-white' 
                      : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                  }`}
                >
                  {type.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-slate-700 rounded-lg p-3 space-y-2">
            <h3 className="text-sm font-bold text-slate-300 mb-2">Dimensions (mm)</h3>
            <SettingRow label="Width" value={settings.width} onChange={v => updateSetting('width', v)} step={10} min={200} max={1200} />
            <SettingRow label="Height" value={settings.height} onChange={v => updateSetting('height', v)} step={10} min={300} max={2400} />
            <SettingRow label="Depth" value={settings.depth} onChange={v => updateSetting('depth', v)} step={10} min={200} max={800} />
          </div>

          <div className="bg-slate-700 rounded-lg p-3 space-y-2">
            <h3 className="text-sm font-bold text-slate-300 mb-2">Panel Thickness (mm)</h3>
            <SettingRow label="Side/End Panel" value={settings.panelThickness} onChange={v => updateSetting('panelThickness', v)} step={1} min={12} max={25} />
            <SettingRow label="Back Panel" value={settings.backPanelThickness} onChange={v => updateSetting('backPanelThickness', v)} step={1} min={3} max={18} />
            <SettingRow label="Door Material" value={settings.doorMaterialThickness} onChange={v => updateSetting('doorMaterialThickness', v)} step={1} min={12} max={25} />
            <SettingRow label="Groove Depth" value={settings.grooveDepth} onChange={v => updateSetting('grooveDepth', v)} step={1} min={2} max={10} />
          </div>

          <div className="bg-slate-700 rounded-lg p-3 space-y-2">
            <h3 className="text-sm font-bold text-slate-300 mb-2">Gaps (mm)</h3>
            <SettingRow label="Door-to-Door" value={settings.doorToDoorGap} onChange={v => updateSetting('doorToDoorGap', v)} step={0.5} min={0} max={10} />
            <SettingRow label="Door-to-Panel" value={settings.doorToPanelGap} onChange={v => updateSetting('doorToPanelGap', v)} step={0.5} min={0} max={10} />
            <SettingRow label="Door Outer Gap" value={settings.doorOuterGap} onChange={v => updateSetting('doorOuterGap', v)} step={0.5} min={0} max={10} />
            <SettingRow label="Door Inner Gap" value={settings.doorInnerGap} onChange={v => updateSetting('doorInnerGap', v)} step={0.5} min={0} max={10} />
            <SettingRow label="Drawer-to-Drawer" value={settings.drawerToDrawerGap} onChange={v => updateSetting('drawerToDrawerGap', v)} step={0.5} min={0} max={10} />
          </div>

          <div className="bg-slate-700 rounded-lg p-3 space-y-2">
            <h3 className="text-sm font-bold text-slate-300 mb-2">Components</h3>
            <CheckboxRow label="Show Back Panel" checked={settings.showBackPanel} onChange={v => updateSetting('showBackPanel', v)} />
            <CheckboxRow label="Show Back Stretchers" checked={settings.showBackStretchers} onChange={v => updateSetting('showBackStretchers', v)} />
            <SettingRow label="Back Stretcher Height" value={settings.backStretcherHeight} onChange={v => updateSetting('backStretcherHeight', v)} step={10} min={50} max={200} />
            <SettingRow label="Top Stretcher Width" value={settings.topStretcherWidth} onChange={v => updateSetting('topStretcherWidth', v)} step={10} min={50} max={200} />
          </div>

          <div className="bg-slate-700 rounded-lg p-3 space-y-2">
            <h3 className="text-sm font-bold text-slate-300 mb-2">Front Options</h3>
            <CheckboxRow label="Show Doors" checked={settings.showDoors} onChange={v => updateSetting('showDoors', v)} />
            <CheckboxRow label="Show Hinges" checked={settings.showHinges} onChange={v => updateSetting('showHinges', v)} />
            {settings.showHinges && (
              <>
                <SettingRow label="Hinge Diameter" value={settings.hingeDiameter} onChange={v => updateSetting('hingeDiameter', v)} step={1} min={8} max={30} />
                <SettingRow label="Hinge Depth" value={settings.hingeDepth} onChange={v => updateSetting('hingeDepth', v)} step={1} min={3} max={18} />
                <SettingRow label="Hinge H Offset" value={settings.hingeHorizontalOffset} onChange={v => updateSetting('hingeHorizontalOffset', v)} step={1} min={10} max={100} />
                <SettingRow label="Hinge V Offset" value={settings.hingeVerticalOffset} onChange={v => updateSetting('hingeVerticalOffset', v)} step={1} min={20} max={150} />
              </>
            )}
            <CheckboxRow label="Show Drawers" checked={settings.showDrawers} onChange={v => updateSetting('showDrawers', v)} />
            {settings.showDrawers && (
              <SettingRow label="Num Drawers" value={settings.numDrawers} onChange={v => updateSetting('numDrawers', v)} step={1} min={1} max={6} />
            )}
          </div>

          <div className="bg-slate-700 rounded-lg p-3 space-y-2">
            <h3 className="text-sm font-bold text-slate-300 mb-2">View Options</h3>
            <CheckboxRow label="Skeleton View" checked={settings.skeletonView} onChange={v => updateSetting('skeletonView', v)} />
            <CheckboxRow label="Different Panel Colors" checked={settings.showDifferentPanelColors} onChange={v => updateSetting('showDifferentPanelColors', v)} />
            <CheckboxRow label="Parts Separated View" checked={settings.partsSeparatedView} onChange={v => updateSetting('partsSeparatedView', v)} />
            {settings.partsSeparatedView && (
              <div className="space-y-1 mt-2">
                <label className="text-xs text-slate-400">Select Part:</label>
                <select 
                  value={settings.selectedPart}
                  onChange={(e) => updateSetting('selectedPart', e.target.value)}
                  className="w-full px-2 py-1 text-xs bg-slate-600 border border-slate-500 rounded text-white"
                >
                  <option value="all">All Parts</option>
                  <option value="leftPanel">Left Side Panel</option>
                  <option value="rightPanel">Right Side Panel</option>
                  <option value="bottomPanel">Bottom Panel</option>
                  <option value="topPanel">Top Panel</option>
                  <option value="backPanel">Back Panel</option>
                  <option value="backStretcherTop">Back Stretcher (Top)</option>
                  <option value="backStretcherBottom">Back Stretcher (Bottom)</option>
                  <option value="topStretcherFront">Top Stretcher (Front)</option>
                  <option value="topStretcherBack">Top Stretcher (Back)</option>
                  <option value="door">Door(s)</option>
                  <option value="drawer">Drawer(s)</option>
                  <option value="toeKick">Toe Kick</option>
                </select>
              </div>
            )}
          </div>

          {settings.cabinetType === 'base' && (
            <div className="bg-slate-700 rounded-lg p-3 space-y-2">
              <h3 className="text-sm font-bold text-slate-300 mb-2">Base Cabinet</h3>
              <SettingRow label="Toe Kick Height" value={settings.toeKickHeight} onChange={v => updateSetting('toeKickHeight', v)} step={10} min={50} max={150} />
            </div>
          )}

          <div className="bg-slate-700 rounded-lg p-3">
            <div className="text-xs text-slate-400 mb-2">Calculated Values</div>
            <div className="text-xs text-slate-300 space-y-1">
              <div>Inner Width: {settings.width - settings.panelThickness * 2}mm</div>
              <div>Inner Height: {settings.height - settings.panelThickness * 2}mm</div>
              <div>Num Doors (Ruby Rule): {settings.width < RUBY_DOOR_THRESHOLD ? 1 : 2} (threshold: {RUBY_DOOR_THRESHOLD}mm)</div>
              <div>Door Width ({settings.width < RUBY_DOOR_THRESHOLD ? 1 : 2} door{settings.width >= RUBY_DOOR_THRESHOLD ? 's' : ''}): {settings.width < RUBY_DOOR_THRESHOLD ? settings.width - settings.panelThickness * 2 - settings.doorOuterGap * 2 : (settings.width - settings.panelThickness * 2 - settings.doorOuterGap * 2 - settings.doorInnerGap) / 2}mm</div>
              <div>Back Panel Position: Z = {-settings.depth / 2 + settings.panelThickness + settings.backPanelThickness / 2}mm (from center)</div>
              <div>Back Panel Width: {settings.width - settings.panelThickness * 2 + settings.grooveDepth * 2}mm (with {settings.grooveDepth}mm groove each side)</div>
            </div>
          </div>

          <button
            onClick={() => setSettings(DEFAULT_SETTINGS)}
            className="w-full px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white text-sm font-medium rounded"
          >
            Reset to Defaults
          </button>
        </div>
      </div>

      <div className="flex-1 relative">
        <Canvas 
          shadows 
          camera={{ position: [600, 500, 600], fov: 45, near: 1, far: 10000 }}
          gl={{ antialias: true }}
        >
          <ambientLight intensity={0.6} />
          <directionalLight position={[400, 800, 400]} intensity={1} castShadow shadow-mapSize={[2048, 2048]} shadow-camera-far={2000} shadow-camera-left={-500} shadow-camera-right={500} shadow-camera-top={500} shadow-camera-bottom={-500} />
          <directionalLight position={[-400, 400, -400]} intensity={0.4} />
          
          <TestingCabinet settings={settings} />
          
          <gridHelper args={[2000, 20, '#444', '#222']} position={[0, 0, 0]} />
          <OrbitControls 
            makeDefault 
            minDistance={100} 
            maxDistance={5000}
            target={[settings.width / 2, settings.cabinetType === 'base' ? settings.toeKickHeight + settings.height / 2 : settings.height / 2, settings.depth / 2]}
            enableDamping
            dampingFactor={0.05}
          />
        </Canvas>

        <div className="absolute top-4 right-4 bg-slate-800/90 backdrop-blur rounded-lg p-3 text-xs">
          <div className="text-amber-500 font-bold mb-2">Controls</div>
          <div className="text-slate-400">Left Click: Rotate</div>
          <div className="text-slate-400">Right Click: Pan</div>
          <div className="text-slate-400">Scroll: Zoom</div>
        </div>
      </div>
    </div>
  );
};

export default CabinetTestingPage;
