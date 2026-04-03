import React, { useState, useMemo } from 'react';
import { Download } from 'lucide-react';
import { DxfWriter, point3d, Units, LWPolylineFlags } from '@tarikjabiri/dxf';
import JSZip from 'jszip';
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
  hingeVerticalOffsetTop: number,
  hingeVerticalOffsetBottom: number
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
  hingeHole1.absarc(hingeXOffset, doorHeight / 2 - hingeVerticalOffsetTop, hingeRadius, 0, Math.PI * 2, false);
  shape.holes.push(hingeHole1);

  const hingeHole2 = new THREE.Path();
  hingeHole2.absarc(hingeXOffset, -doorHeight / 2 + hingeVerticalOffsetBottom, hingeRadius, 0, Math.PI * 2, false);
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

const createPanelWithHolesGeo = (
  sizeX: number, // thickness
  sizeY: number, // height
  sizeZ: number, // depth
  grooveLocalZMin: number, // depth direction min (front to back)
  grooveLocalZMax: number, // depth direction max
  grooveDepth: number,
  grooveFace: 'px' | 'nx' | 'py' | 'ny',
  holes: { y: number, z: number, r: number, through?: boolean }[],
  holeDepth: number,
  grooveStartOffset: number = 0,
  grooveEndOffset: number = 0,
  notches: { u: number, v: number, width: number, height: number, alignV: 'top' | 'bottom' | 'center' }[] = []
) => {
  const uMin = -sizeZ / 2;
  const uMax = sizeZ / 2;
  const vMin = -sizeY / 2;
  const vMax = sizeY / 2;

  const createBaseShape = (includeGroove: boolean, includePartialHoles: boolean, includeThroughHoles: boolean) => {
    const shape = new THREE.Shape();
    
    // Default rectangle
    // We'll build the shape by points to allow notches on the front edge (uMax)
    // For Gola, notches are always on the front edge.
    
    const sorted = [...notches].sort((a, b) => {
      const vA = a.alignV === 'top' ? a.v - a.height : (a.alignV === 'center' ? a.v - a.height/2 : a.v);
      const vB = b.alignV === 'top' ? b.v - b.height : (b.alignV === 'center' ? b.v - b.height/2 : b.v);
      return vA - vB;
    });
    
    const tol = 0.001;
    let currentV = vMin;
    
    if (sorted.length > 0 && (sorted[0].alignV === 'bottom' || Math.abs((sorted[0].alignV === 'center' ? sorted[0].v - sorted[0].height/2 : sorted[0].v) - vMin) < tol)) {
       // First notch starts at the bottom
       const first = sorted[0];
       shape.moveTo(uMin, vMin);
       shape.lineTo(uMax - first.width, vMin);
       shape.lineTo(uMax - first.width, (first.alignV === 'center' ? first.v + first.height/2 : (first.alignV === 'top' ? first.v : first.v + first.height)));
       // Skip the first one in the loop or handle specially
       currentV = first.alignV === 'center' ? first.v + first.height/2 : (first.alignV === 'top' ? first.v : first.v + first.height);
       if (currentV < vMax - tol) {
         shape.lineTo(uMax, currentV);
       }
       sorted.shift();
    } else {
       shape.moveTo(uMin, vMin);
       shape.lineTo(uMax, vMin);
    }
    
    sorted.forEach(n => {
      const nVMin = n.alignV === 'top' ? n.v - n.height : (n.alignV === 'center' ? n.v - n.height/2 : n.v);
      const nVMax = nVMin + n.height;
      
      if (nVMin > currentV + tol) {
        shape.lineTo(uMax, nVMin);
      }
      shape.lineTo(uMax - n.width, nVMin);
      shape.lineTo(uMax - n.width, nVMax);
      
      if (nVMax < vMax - tol) {
        shape.lineTo(uMax, nVMax);
        currentV = nVMax;
      } else {
        currentV = vMax;
      }
    });
    
    if (currentV < vMax - tol) {
      shape.lineTo(uMax, vMax);
    }
    
    shape.lineTo(uMin, vMax);
    shape.lineTo(uMin, vMin);
    shape.closePath();

    // Add holes
    holes.forEach(h => {
      const shouldInclude = (h.through && includeThroughHoles) || (!h.through && includePartialHoles);
      if (shouldInclude) {
        const path = new THREE.Path();
        path.absarc(h.z, h.y, h.r, 0, Math.PI * 2, true);
        shape.holes.push(path);
      }
    });

    if (includeGroove) {
      const gPath = new THREE.Path();
      const gZMin = grooveLocalZMin;
      const gZMax = grooveLocalZMax;
      const gYMin = vMin + grooveEndOffset;
      const gYMax = vMax - grooveStartOffset;
      
      gPath.moveTo(gZMin, gYMin);
      gPath.lineTo(gZMax, gYMin);
      gPath.lineTo(gZMax, gYMax);
      gPath.lineTo(gZMin, gYMax);
      gPath.closePath();
      shape.holes.push(gPath);
    }
    
    return shape;
  };

  const layers: THREE.BufferGeometry[] = [];
  const hDepth = Math.min(holeDepth, sizeX);
  const gDepth = Math.min(grooveDepth, sizeX);
  
  const maxD = Math.max(hDepth, gDepth);
  const backThickness = sizeX - maxD;
  
  if (backThickness > 0) {
    // Backmost layer: Only through holes
    layers.push(new THREE.ExtrudeGeometry(createBaseShape(false, false, true), { depth: backThickness, bevelEnabled: false }));
  }
  
  if (hDepth > gDepth) {
    // Level Middle: partial + through
    const midThickness = hDepth - gDepth;
    const midGeo = new THREE.ExtrudeGeometry(createBaseShape(false, true, true), { depth: midThickness, bevelEnabled: false });
    midGeo.translate(0, 0, backThickness);
    layers.push(midGeo);
    
    // Level Inner face: partial + through + groove
    if (gDepth > 0) {
      const innerGeo = new THREE.ExtrudeGeometry(createBaseShape(true, true, true), { depth: gDepth, bevelEnabled: false });
      innerGeo.translate(0, 0, backThickness + midThickness);
      layers.push(innerGeo);
    }
  } else if (gDepth > hDepth) {
    // Level Middle: through + groove
    const midThickness = gDepth - hDepth;
    const midGeo = new THREE.ExtrudeGeometry(createBaseShape(true, false, true), { depth: midThickness, bevelEnabled: false });
    midGeo.translate(0, 0, backThickness);
    layers.push(midGeo);
    
    // Level Inner face: partial + through + groove
    if (hDepth > 0) {
      const innerGeo = new THREE.ExtrudeGeometry(createBaseShape(true, true, true), { depth: hDepth, bevelEnabled: false });
      innerGeo.translate(0, 0, backThickness + midThickness);
      layers.push(innerGeo);
    }
  } else {
    // hDepth == gDepth
    if (hDepth > 0) {
      const innerGeo = new THREE.ExtrudeGeometry(createBaseShape(true, true, true), { depth: hDepth, bevelEnabled: false });
      innerGeo.translate(0, 0, backThickness);
      layers.push(innerGeo);
    }
  }

  let mergedGeo = layers.length > 1 
    ? BufferGeometryUtils.mergeGeometries(layers) 
    : layers[0];
  
  mergedGeo = BufferGeometryUtils.mergeVertices(mergedGeo);
  
  const positions = mergedGeo.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const depthVal = positions.getX(i);
    const heightVal = positions.getY(i);
    const thicknessVal = positions.getZ(i) - sizeX / 2;

    if (grooveFace === 'px') {
      positions.setXYZ(i, thicknessVal, heightVal, depthVal);
    } else if (grooveFace === 'nx') {
      positions.setXYZ(i, -thicknessVal, heightVal, depthVal);
    } else if (grooveFace === 'py') {
      positions.setXYZ(i, heightVal, thicknessVal, depthVal);
    } else if (grooveFace === 'ny') {
      positions.setXYZ(i, heightVal, -thicknessVal, depthVal);
    }
  }
  
  mergedGeo.computeVertexNormals();
  return mergedGeo;
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
  doorOverride: number; // Door override for Gola system
  toeKickHeight: number;
  backStretcherHeight: number;
  topStretcherWidth: number;
  showBackPanel: boolean;
  showBackStretchers: boolean;
  showDoors: boolean;
  showDrawers: boolean;
  enableGola: boolean;
  showHinges: boolean;
  skeletonView: boolean;
  partsSeparatedView: boolean;
  selectedPart: string;
  numDrawers: number;
  numShelves: number;
  cabinetType: 'base' | 'wall' | 'tall';
  hingeDiameter: number;
  hingeDepth: number;
  hingeHorizontalOffset: number;
  hingeVerticalOffset: number;
  showDifferentPanelColors: boolean;
  showNailHoles: boolean;
  nailHoleDiameter: number;
  shelfHoleDiameter: number;
  nailHoleShelfDistance: number;
  nailHoleDepth: number;
  shelfDepth: number;
  drawerSideClearance: number;
  drawerBottomThickness: number;
  drawerBackThickness: number;
  drawerBoxHeightRatio: number;
  drawerBackClearance: number;
  golaCutoutDepth: number;
  golaLCutoutHeight: number;
  golaCCutoutHeight: number;
  golaTopGap: number;
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
  doorOverride: 0, // Door override for Gola system (set to 20 when Gola enabled)
  toeKickHeight: 100,
  backStretcherHeight: 100,
  topStretcherWidth: 100,
  showBackPanel: true,
  showBackStretchers: true,
  showDoors: true,
  showDrawers: false,
  enableGola: false,
  showHinges: false,
  skeletonView: false,
  partsSeparatedView: false,
  selectedPart: 'all',
  numDrawers: 3,
  numShelves: 2,
  cabinetType: 'base',
  hingeDiameter: 16,
  hingeDepth: 7,
  hingeHorizontalOffset: 40,
  hingeVerticalOffset: 60,
  showDifferentPanelColors: false,
  showNailHoles: true,
  nailHoleDiameter: 5,
  shelfHoleDiameter: 5,
  nailHoleShelfDistance: 10,
  nailHoleDepth: 5,
  shelfDepth: 560 - 18 - 6,
  drawerSideClearance: 5,
  drawerBottomThickness: 12,
  drawerBackThickness: 12,
  drawerBoxHeightRatio: 0.8,
  drawerBackClearance: 5,
  golaCutoutDepth: 26,
  golaLCutoutHeight: 59,
  golaCCutoutHeight: 73.5,
  golaTopGap: 30
};

const RUBY_DOOR_THRESHOLD = 599.5;

const TestingCabinet: React.FC<{ settings: TestingSettings }> = ({ settings }) => {
  const {
    width, height, depth, panelThickness, backPanelThickness,
    doorMaterialThickness, grooveDepth, doorToDoorGap, doorToPanelGap,
    drawerToDrawerGap, doorOuterGap, doorInnerGap, doorSideClearance,
    toeKickHeight, backStretcherHeight, topStretcherWidth, showBackPanel, showBackStretchers,
    showDoors, showDrawers, showHinges, skeletonView, partsSeparatedView, selectedPart, numDrawers, numShelves, cabinetType,
    hingeDiameter, hingeDepth, hingeHorizontalOffset, hingeVerticalOffset, showDifferentPanelColors,
    showNailHoles, nailHoleDiameter,
    drawerSideClearance, drawerBottomThickness, drawerBackThickness, drawerBoxHeightRatio
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
    shelf: new THREE.Color('#8e44ad'),
    drawerFront: new THREE.Color('#f1c40f'),
    drawerSide: new THREE.Color('#e67e22'),
    drawerBack: new THREE.Color('#d35400'),
    drawerBottom: new THREE.Color('#7f8c8d'),
  }), []);

  const getPanelColor = (panelType: string): THREE.Color => {
    if (!showDifferentPanelColors) return darkerColor;
    return panelColors[panelType as keyof typeof panelColors] || darkerColor;
  };

  const innerWidth = width;
  const innerHeight = isBase ? height - toeKickHeight : height;
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
  const isGolaActive = settings.enableGola && isBase && showDoors && !showDrawers;
  const doorWidth = actualNumDoors === 1 
    ? innerWidth - doorOuterGap * 2 
    : (innerWidth - doorOuterGap * 2 - doorInnerGap) / 2;
  const doorHeight = innerHeight - doorOuterGap * 2 - (isGolaActive ? settings.doorOverride : 0);
  // For base cabinets with Gola, shift door DOWN so reduction is only from top
  // For wall cabinets with Gola, shift door UP so reduction is only from bottom
  const doorYOffset = isGolaActive ? -settings.doorOverride / 2 : (settings.enableGola && isWall && showDoors && !showDrawers ? settings.doorOverride / 2 : 0);

  const drawerHeight = numDrawers > 0 
    ? (innerHeight - panelThickness - doorOuterGap * (numDrawers + 1)) / numDrawers 
    : 0;

  // Gola-specific drawer/door calculations
  const golaTopGap = isGolaActive ? settings.golaTopGap : doorOuterGap;
  const golaVerticalGap = isGolaActive ? 13 : doorOuterGap;
  const golaHorizontalGap3 = isGolaActive ? 3 : doorOuterGap;
  const golaDepthOffset = isGolaActive ? settings.golaCutoutDepth : 0;

  const midZForGola = (innerHeight - golaTopGap) / 2;

  const topHingeVerticalOffset = isGolaActive 
    ? (settings.golaLCutoutHeight + settings.hingeVerticalOffset - settings.doorOverride - doorOuterGap)
    : settings.hingeVerticalOffset;
  const bottomHingeVerticalOffset = settings.hingeVerticalOffset;

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
    
    // Front Holes (Top Stretcher)
    const golaOffset = (settings.enableGola && isBase) ? settings.golaCutoutDepth : 0;
    const zFront1 = depth / 2 - (topStretcherWidth / 4) - golaOffset;
    const zFront2 = depth / 2 - (topStretcherWidth * 3 / 4) - golaOffset;
    
    // Back Holes (Top Stretcher mirrored at -z)
    const zBack1 = -depth / 2 + (topStretcherWidth / 4);
    const zBack2 = -depth / 2 + (topStretcherWidth * 3 / 4);

    const positions: { y: number, z: number, r: number, through?: boolean }[] = [
      { y, z: zFront1, r: technicalR, through: true },
      { y, z: zFront2, r: technicalR, through: true },
      { y, z: zBack1, r: technicalR, through: true },
      { y, z: zBack2, r: technicalR, through: true }
    ];

    // Shelf Pin Holes (below each shelf)
    if (numShelves > 0 && !showDrawers) {
      const availableHeight = innerHeight - panelThickness * 2;
      const spacing = availableHeight / (numShelves + 1);
      for (let i = 0; i < numShelves; i++) {
        // Shelf Y in cabinet world coordinate (relative to cabinet center)
        const shelfYCabinet = -innerHeight / 2 + panelThickness + spacing * (i + 1);
        
        // Side panel local Y: 0 is vertical center
        // Side panel height is height - panelThickness.
        // Side panel center is at Y_world = toeKickHeight + height/2 + panelThickness/2.
        // Shelf center is at Y_world = toeKickHeight + height/2 + shelfYCabinet.
        
        const yLocalSide = shelfYCabinet - panelThickness / 2;
        
        // Hole should be below the shelf at user-defined distance
        // Shelf bottom is at yLocalSide - panelThickness / 2.
        const holeY = yLocalSide - panelThickness / 2 - settings.nailHoleShelfDistance;
        
        // Depth (Z) positions: 1/4 and 3/4 of shelf depth
        const shelfZStart = -depth / 2 + panelThickness + backPanelThickness;
        const frontZ = shelfZStart + settings.shelfDepth * 0.25;
        const backZ = shelfZStart + settings.shelfDepth * 0.75;
        
        positions.push({ y: holeY, z: frontZ, r: shelfR, through: false });
        positions.push({ y: holeY, z: backZ, r: shelfR, through: false });
      }
    }
 
    // Holes for Back Stretchers (if enabled and base cabinet)
    if (showBackStretchers && isBase) {
      const zBackStretcher = -depth / 2 + panelThickness / 2;
      
      // Top Back Stretcher holes
      const yTopBackMax = panelHeight / 2;
      positions.push({ y: yTopBackMax - (backStretcherHeight / 4) - panelThickness, z: zBackStretcher, r: technicalR, through: true });
      positions.push({ y: yTopBackMax - (backStretcherHeight * 3 / 4) - panelThickness, z: zBackStretcher, r: technicalR, through: true });
      
      // Bottom Back Stretcher holes
      const yBottomBackMin = -panelHeight / 2 + panelThickness;
      positions.push({ y: (yBottomBackMin + (backStretcherHeight / 4)) - panelThickness, z: zBackStretcher, r: technicalR, through: true });
      positions.push({ y: (yBottomBackMin + (backStretcherHeight * 3 / 4)) - panelThickness, z: zBackStretcher, r: technicalR, through: true });
    }
    
    return positions;
  }, [showNailHoles, height, depth, panelThickness, backPanelThickness, nailHoleDiameter, settings.shelfHoleDiameter, topStretcherWidth, showBackStretchers, isBase, backStretcherHeight, numShelves, showDrawers, settings.nailHoleShelfDistance, settings.shelfDepth, innerHeight, isGolaActive, settings.golaCutoutDepth]);

  const leftPanelGeo = useMemo(() => {
    const sidePanelHeight = innerHeight - panelThickness;
    const notches: { u: number, v: number, width: number, height: number, alignV: 'top' | 'bottom' | 'center' }[] = [];
    if (isGolaActive) {
      // L-notch at top front
      notches.push({ 
        u: depth / 2, 
        v: sidePanelHeight / 2, 
        width: settings.golaCutoutDepth, 
        height: settings.golaLCutoutHeight, 
        alignV: 'top'
      });
    }
    return createPanelWithHolesGeo(
      panelThickness, sidePanelHeight, depth,
      -depth / 2 + panelThickness, -depth / 2 + panelThickness + backPanelThickness,
      grooveDepth, 'px',
      nailHolePositions,
      settings.nailHoleDepth,
      panelThickness - grooveDepth, 0,
      notches
    );
  }, [panelThickness, innerHeight, depth, backPanelThickness, grooveDepth, nailHolePositions, settings.nailHoleDepth, isGolaActive, settings.enableGola, isBase, showDoors, showDrawers, numDrawers, midZForGola, settings.golaCutoutDepth, settings.golaLCutoutHeight]);

  const rightPanelGeo = useMemo(() => {
    const sidePanelHeight = innerHeight - panelThickness;
    const notches: { u: number, v: number, width: number, height: number, alignV: 'top' | 'bottom' | 'center' }[] = [];
    if (isGolaActive) {
      // L-notch at top front
      notches.push({ 
        u: depth / 2, 
        v: sidePanelHeight / 2, 
        width: settings.golaCutoutDepth, 
        height: settings.golaLCutoutHeight, 
        alignV: 'top'
      });
    }
    return createPanelWithHolesGeo(
      panelThickness, sidePanelHeight, depth,
      -depth / 2 + panelThickness, -depth / 2 + panelThickness + backPanelThickness,
      grooveDepth, 'nx',
      nailHolePositions,
      settings.nailHoleDepth,
      panelThickness - grooveDepth, 0,
      notches
    );
  }, [panelThickness, innerHeight, depth, backPanelThickness, grooveDepth, nailHolePositions, settings.nailHoleDepth, isGolaActive, settings.enableGola, isBase, showDoors, showDrawers, numDrawers, midZForGola, settings.golaCutoutDepth, settings.golaLCutoutHeight]);

  const leftCGolaCutout = null;
  const rightCGolaCutout = null;
  const leftGolaCutout = null;
  const rightGolaCutout = null;

  const bottomPanelHoles = useMemo(() => {
    if (!showNailHoles) return [];
    const length = innerWidth;
    const depthVal = innerDepth;
    const technicalR = nailHoleDiameter / 2;
    // Across depth (U in shape)
    const u1 = -depthVal / 2 + depthVal / 5;
    const u2 = 0;
    const u3 = depthVal / 2 - depthVal / 5;
    // At edges for side panels (V in shape maps to World X)
    const vLeft = -length / 2 + panelThickness / 2;
    const vRight = length / 2 - panelThickness / 2;
    
    // In length (V in shape) for horizontal parts
    const v1 = -length / 2 + length / 5;
    const v2 = 0;
    const v3 = length / 2 - length / 5;

    const positions = [
      { y: vLeft, z: u1, r: technicalR, through: true },
      { y: vLeft, z: u2, r: technicalR, through: true },
      { y: vLeft, z: u3, r: technicalR, through: true },
      { y: vRight, z: u1, r: technicalR, through: true },
      { y: vRight, z: u2, r: technicalR, through: true },
      { y: vRight, z: u3, r: technicalR, through: true }
    ];

    // Holes for Bottom Back Stretcher
    if (showBackStretchers && isBase) {
      const zBack = -depthVal / 2 + panelThickness / 2;
      positions.push({ y: v1, z: zBack, r: technicalR, through: true });
      positions.push({ y: v2, z: zBack, r: technicalR, through: true });
      positions.push({ y: v3, z: zBack, r: technicalR, through: true });
    }

    // Holes for Toe Kick (if base cabinet)
    if (isBase) {
      const zToeKick = depthVal / 2 - 50 - panelThickness / 2;
      positions.push({ y: v1, z: zToeKick, r: technicalR, through: true });
      positions.push({ y: v2, z: zToeKick, r: technicalR, through: true });
      positions.push({ y: v3, z: zToeKick, r: technicalR, through: true });
    }
    
    return positions;
  }, [showNailHoles, innerWidth, innerDepth, panelThickness, nailHoleDiameter, showBackStretchers, isBase]);

  const bottomPanelGeo = useMemo(() => createPanelWithHolesGeo(
    panelThickness, innerWidth, innerDepth,
    -innerDepth / 2 + panelThickness, -innerDepth / 2 + panelThickness + backPanelThickness,
    grooveDepth, 'py',
    bottomPanelHoles,
    settings.nailHoleDepth,
    panelThickness, panelThickness
  ), [innerWidth, panelThickness, innerDepth, backPanelThickness, grooveDepth, bottomPanelHoles, settings.nailHoleDepth]);

  const topPanelGeo = useMemo(() => createGroovedPanelGeo(
    innerWidth, panelThickness, innerDepth,
    -innerDepth / 2 + panelThickness, -innerDepth / 2 + panelThickness + backPanelThickness,
    grooveDepth, 'ny'
  ), [innerWidth, panelThickness, innerDepth, backPanelThickness, grooveDepth]);

  const topStretcherBackHoles = useMemo(() => {
    if (!showNailHoles) return [];
    const length = innerWidth - panelThickness * 2;
    const technicalR = nailHoleDiameter / 2;
    // Across length (local Y in shape maps to World X)
    // Distances: 1/5, 1/2, 4/5
    const y1 = -length / 2 + length / 5;
    const y2 = 0;
    const y3 = length / 2 - length / 5;
    // Aligned with back stretcher center (local Z maps to World Z)
    const z = -topStretcherWidth / 2 + panelThickness / 2;
    
    return [
      { y: y1, z, r: technicalR, through: true },
      { y: y2, z, r: technicalR, through: true },
      { y: y3, z, r: technicalR, through: true }
    ];
  }, [showNailHoles, innerWidth, panelThickness, nailHoleDiameter, topStretcherWidth]);

  const topStretcherBackGeo = useMemo(() => createPanelWithHolesGeo(
    panelThickness, innerWidth - panelThickness * 2, topStretcherWidth,
    panelThickness - topStretcherWidth / 2, panelThickness + backPanelThickness - topStretcherWidth / 2,
    grooveDepth, 'ny',
    topStretcherBackHoles,
    panelThickness // Top stretcher holes are through-holes (usually for screws)
  ), [innerWidth, panelThickness, topStretcherWidth, backPanelThickness, grooveDepth, topStretcherBackHoles]);

  const doorGeos = useMemo(() => {
    const geos = [];
    const numDoors = actualNumDoors;
    for (let i = 0; i < numDoors; i++) {
      const doorX = numDoors === 1 
        ? 0 
        : (i === 0 ? -doorWidth / 2 - doorInnerGap / 2 : doorWidth / 2 + doorInnerGap / 2);
      const hingeXOffset = numDoors === 1 
        ? -doorWidth / 2 + hingeHorizontalOffset 
        : (i === 0 ? -doorWidth / 2 + hingeHorizontalOffset : doorWidth / 2 - hingeHorizontalOffset);
      const hingeRadius = hingeDiameter / 2;
      geos.push(createDoorWithHingeHoles(
        doorWidth, doorHeight, doorMaterialThickness,
        hingeXOffset, hingeRadius, hingeDepth, 
        topHingeVerticalOffset, bottomHingeVerticalOffset
      ));
    }
    return geos;
  }, [actualNumDoors, doorWidth, doorHeight, doorMaterialThickness, hingeHorizontalOffset, hingeDiameter, hingeDepth, topHingeVerticalOffset, bottomHingeVerticalOffset, doorInnerGap]);

  const { drawerFrontGeos, drawerYPositions, drawerSideLGeo, drawerSideRGeo } = useMemo(() => {
    const boxDepth = depth - panelThickness - backPanelThickness - settings.drawerBackClearance;
    const frontWidth = innerWidth - doorOuterGap * 2;
    const cabinetInnerWidthForDrawer = width - panelThickness * 2;
    const boxWidth = cabinetInnerWidthForDrawer - drawerSideClearance * 2;
    // For geometry creation, we'll use a placeholder height and update per-drawer if needed
    // but the actual box height should be based on the smallest drawer height or just the average.
    // For simplicity, we'll keep the average height for side/back panels or calculate per-drawer in the loop.
    const drawerHeightVal = drawerHeight; 
    const boxHeight = drawerHeightVal * drawerBoxHeightRatio;

    // Gola specific drawer front heights
    let drawerFrontHeights = Array(numDrawers).fill(drawerHeight);
    let drawerYPositions = Array(numDrawers).fill(0);

    if (settings.enableGola && numDrawers > 0) {
      if (numDrawers === 2) {
        const bottomH = midZForGola - golaVerticalGap - doorOuterGap;
        const topH = (innerHeight - golaTopGap) - (midZForGola + golaVerticalGap);
        drawerFrontHeights = [bottomH + panelThickness, topH];
        drawerYPositions = [
          -innerHeight / 2 + doorOuterGap + bottomH / 2 - panelThickness / 2,
          -innerHeight / 2 + (midZForGola + golaVerticalGap) + topH / 2
        ];
      } else if (numDrawers === 3) {
        const bottomH = midZForGola - golaVerticalGap - doorOuterGap;
        const topRegionH = (innerHeight - golaTopGap) - (midZForGola + golaVerticalGap);
        const topTwoH = (topRegionH - golaHorizontalGap3) / 2;
        drawerFrontHeights = [bottomH + panelThickness, topTwoH, topTwoH];
        drawerYPositions = [
          -innerHeight / 2 + doorOuterGap + bottomH / 2 - panelThickness / 2,
          -innerHeight / 2 + (midZForGola + golaVerticalGap) + topTwoH / 2,
          -innerHeight / 2 + (midZForGola + golaVerticalGap) + topTwoH + golaHorizontalGap3 + topTwoH / 2
        ];
      }
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
        frontHoles.push({ 
          z: side * (boxWidth / 2 - panelThickness / 2), 
          y: -boxHeight / 2 + boxHeight * vRatio, 
          r: technicalR, 
          through: true 
        });
      }));
    }

    const bottomFrontHoles = [];
    if (showNailHoles) {
      [-1, 1].forEach(side => [0.25, 0.75].forEach(vRatio => {
        bottomFrontHoles.push({ 
          z: side * (boxWidth / 2 - panelThickness / 2), 
          y: -boxHeight / 2 + boxHeight * vRatio + panelThickness / 2, 
          r: technicalR, 
          through: true 
        });
      }));
    }

    const sideHoles = [];
    if (showNailHoles) {
      // Back connection holes
      [0.25, 0.75].forEach(vRatio => {
        sideHoles.push({ 
          z: -boxDepth / 2 + drawerBackThickness / 2, 
          y: -boxHeight / 2 + boxHeight * vRatio, 
          r: technicalR, 
          through: true 
        });
      });

      // Bottom connection holes (1/5, 1/2, 4/5)
      [0.2, 0.5, 0.8].forEach(dRatio => {
        sideHoles.push({
          z: -boxDepth / 2 + boxDepth * dRatio,
          y: -boxHeight / 2 + drawerBottomThickness / 2,
          r: technicalR,
          through: true
        });
      });
    }

    const drawerFrontGeos = drawerFrontHeights.map((h, i) => {
      const holes = i === 0 ? bottomFrontHoles : frontHoles;
      return createPanelWithHolesGeo(doorMaterialThickness, h, frontWidth, 0, 0, 0, 'px', holes, doorMaterialThickness);
    });

    return {
      drawerFrontGeos,
      drawerYPositions,
      drawerSideLGeo: createPanelWithHolesGeo(panelThickness, boxHeight, boxDepth, 0, 0, 0, 'nx', sideHoles, panelThickness),
      drawerSideRGeo: createPanelWithHolesGeo(panelThickness, boxHeight, boxDepth, 0, 0, 0, 'px', sideHoles, panelThickness),
      boxWidth,
      boxHeight,
      boxDepth
    };
  }, [width, innerHeight, depth, panelThickness, backPanelThickness, doorOuterGap, numDrawers, drawerSideClearance, drawerBoxHeightRatio, settings.drawerBackClearance, innerWidth, nailHoleDiameter, showNailHoles, doorMaterialThickness, drawerBackThickness, drawerBottomThickness, settings.enableGola, settings.golaTopGap, golaVerticalGap, golaHorizontalGap3, drawerHeight, midZForGola]);

  const shouldShow = (part: string): boolean => {
    if (!partsSeparatedView) return true;
    if (selectedPart === 'all' || selectedPart === part) return true;
    if (selectedPart === 'drawer' && (part === 'drawerFront' || part === 'drawerSide' || part === 'drawerBack' || part === 'drawerBottom')) return true;
    return false;
  };

  return (
    <group>
      <group position={[width / 2, isBase ? toeKickHeight + innerHeight / 2 : height / 2, depth / 2]}>
        {isBase && shouldShow('bottomPanel') && (
          <>
            <mesh position={[
              0 + getOffset('bottomPanel')[0],
              -innerHeight / 2 + panelThickness / 2 + getOffset('bottomPanel')[1],
              0 + getOffset('bottomPanel')[2]
            ]} castShadow receiveShadow visible={!skeletonView}>
            <primitive object={bottomPanelGeo} attach="geometry" />
            <meshStandardMaterial color={getPanelColor('bottomPanel')} roughness={0.8} side={THREE.DoubleSide} />
          </mesh>
            {skeletonView && (
              <lineSegments position={[
                0 + getOffset('bottomPanel')[0],
                -innerHeight / 2 + panelThickness / 2 + getOffset('bottomPanel')[1],
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
            innerHeight / 2 - panelThickness / 2 + getOffset('topPanel')[1],
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
              innerHeight / 2 - panelThickness / 2 + getOffset('topPanel')[1],
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
            -innerHeight / 2 + panelThickness / 2 + getOffset('bottomPanel')[1],
            0 + getOffset('bottomPanel')[2]
          ]} castShadow receiveShadow visible={!skeletonView}>
            <primitive object={bottomPanelGeo} attach="geometry" />
            <meshStandardMaterial color={darkerColor} roughness={0.8} />
          </mesh>
        )}

        {shouldShow('leftPanel') && (
          <group>
            <mesh position={[
              -width / 2 + panelThickness / 2 + getOffset('leftPanel')[0],
              panelThickness / 2 + getOffset('leftPanel')[1],
              0 + getOffset('leftPanel')[2]
            ]} castShadow receiveShadow visible={!skeletonView}>
              <primitive object={leftPanelGeo} attach="geometry" />
              <meshStandardMaterial color={getPanelColor('leftPanel')} roughness={0.8} side={THREE.DoubleSide} />
            </mesh>
          </group>
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
          <group>
            <mesh position={[
              width / 2 - panelThickness / 2 + getOffset('rightPanel')[0],
              panelThickness / 2 + getOffset('rightPanel')[1],
              0 + getOffset('rightPanel')[2]
            ]} castShadow receiveShadow visible={!skeletonView}>
              <primitive object={rightPanelGeo} attach="geometry" />
              <meshStandardMaterial color={getPanelColor('rightPanel')} roughness={0.8} side={THREE.DoubleSide} />
            </mesh>
          </group>
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
            innerHeight / 2 - panelThickness - backStretcherHeight / 2 + getOffset('backStretcherTop')[1],
            -innerDepth / 2 + panelThickness / 2 + getOffset('backStretcherTop')[2]
          ]} castShadow receiveShadow visible={!skeletonView}>
            <boxGeometry args={[innerWidth - panelThickness * 2, backStretcherHeight, panelThickness]} />
            <meshStandardMaterial color={getPanelColor('backStretcherTop')} roughness={0.8} />
          </mesh>
        )}
        {showBackStretchers && isBase && shouldShow('backStretcherBottom') && (
          <mesh position={[
            0 + getOffset('backStretcherBottom')[0],
            -innerHeight / 2 + panelThickness + backStretcherHeight / 2 + getOffset('backStretcherBottom')[1],
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
                innerHeight / 2 - panelThickness - backStretcherHeight / 2 + getOffset('backStretcherTop')[1],
                -innerDepth / 2 + panelThickness / 2 + getOffset('backStretcherTop')[2]
              ]}>
                <edgesGeometry args={[new THREE.BoxGeometry(innerWidth - panelThickness * 2, backStretcherHeight, panelThickness)]} />
                <lineBasicMaterial color="#ffff00" linewidth={3} />
              </lineSegments>
            )}
            {shouldShow('backStretcherBottom') && (
              <lineSegments position={[
                0 + getOffset('backStretcherBottom')[0],
                -innerHeight / 2 + panelThickness + backStretcherHeight / 2 + getOffset('backStretcherBottom')[1],
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
            innerHeight / 2 - panelThickness / 2 + getOffset('topStretcherFront')[1],
            depth / 2 - topStretcherWidth / 2 - golaDepthOffset + getOffset('topStretcherFront')[2]
          ]} castShadow receiveShadow visible={!skeletonView}>
            <boxGeometry args={[innerWidth - panelThickness * 2, panelThickness, topStretcherWidth]} />
            <meshStandardMaterial color={getPanelColor('topStretcherFront')} roughness={0.8} />
          </mesh>
        )}
        {showBackStretchers && isBase && shouldShow('topStretcherBack') && (
          <mesh position={[
            0 + getOffset('topStretcherBack')[0],
            innerHeight / 2 - panelThickness / 2 + getOffset('topStretcherBack')[1],
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
                innerHeight / 2 - panelThickness / 2 + getOffset('topStretcherFront')[1],
                depth / 2 - topStretcherWidth / 2 - golaDepthOffset + getOffset('topStretcherFront')[2]
              ]}>
                <edgesGeometry args={[new THREE.BoxGeometry(innerWidth - panelThickness * 2, panelThickness, topStretcherWidth)]} />
                <lineBasicMaterial color="#ffff00" linewidth={3} />
              </lineSegments>
            )}
            {shouldShow('topStretcherBack') && (
              <lineSegments position={[
                0 + getOffset('topStretcherBack')[0],
                innerHeight / 2 - panelThickness / 2 + getOffset('topStretcherBack')[1],
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

          return (
            <group key={`door-${i}`}>
              {shouldShow('door') && (
                <>
                  <mesh position={[
                    doorX + getOffset('door', i)[0],
                    doorYOffset + getOffset('door', i)[1],
                    depth / 2 + doorMaterialThickness / 2 + getOffset('door', i)[2]
                  ]} castShadow receiveShadow visible={!skeletonView}>
            <primitive object={doorGeos[i]} attach="geometry" />
            <meshStandardMaterial color={doorColor} roughness={0.6} />
          </mesh>
                  {skeletonView && (
                    <group position={[
                      doorX + getOffset('door', i)[0],
                      doorYOffset + getOffset('door', i)[1],
                      depth / 2 + doorMaterialThickness / 2 + getOffset('door', i)[2]
                    ]}>
                      <lineSegments>
                        <edgesGeometry args={[new THREE.BoxGeometry(doorWidth, doorHeight, doorMaterialThickness)]} />
                        <lineBasicMaterial color="#00ffff" linewidth={3} />
                      </lineSegments>
                      <lineSegments position={[hingeXOffset, doorHeight / 2 - topHingeVerticalOffset, -doorMaterialThickness / 2 + hingeDepth / 2]}>
                        <edgesGeometry args={[new THREE.CylinderGeometry(hingeRadius, hingeRadius, hingeDepth, 16).rotateX(Math.PI / 2)]} />
                        <lineBasicMaterial color="#00ffff" linewidth={3} />
                      </lineSegments>
                      <lineSegments position={[hingeXOffset, -doorHeight / 2 + bottomHingeVerticalOffset, -doorMaterialThickness / 2 + hingeDepth / 2]}>
                        <edgesGeometry args={[new THREE.CylinderGeometry(hingeRadius, hingeRadius, hingeDepth, 16).rotateX(Math.PI / 2)]} />
                        <lineBasicMaterial color="#00ffff" linewidth={3} />
                      </lineSegments>
                    </group>
                  )}
                </>
              )}
              {shouldShow('door') && !settings.enableGola && (
                <mesh position={[
                  doorX + handleXOffset + getOffset('door', i)[0],
                  handleYPos + doorYOffset + getOffset('door', i)[1],
                  depth / 2 + doorMaterialThickness + 5 + getOffset('door', i)[2]
                ]} rotation={[0, 0, isWall ? Math.PI / 2 : 0]} castShadow>
                  <cylinderGeometry args={[3, 3, isWall ? 60 : 50, 16]} />
                  <meshStandardMaterial color="#4a5568" metalness={0.8} roughness={0.2} />
                </mesh>
              )}
              {showHinges && (
                <>
                  <mesh position={[doorX + hingeXOffset, doorYOffset + doorHeight / 2 - topHingeVerticalOffset, depth / 2 - hingeDepth / 2]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                    <cylinderGeometry args={[hingeRadius, hingeRadius, hingeDepth, 16]} />
                    <meshStandardMaterial color="#888888" metalness={0.9} roughness={0.1} />
                  </mesh>
                  <mesh position={[doorX + hingeXOffset, doorYOffset - doorHeight / 2 + bottomHingeVerticalOffset, depth / 2 - hingeDepth / 2]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                    <cylinderGeometry args={[hingeRadius, hingeRadius, hingeDepth, 16]} />
                    <meshStandardMaterial color="#888888" metalness={0.9} roughness={0.1} />
                  </mesh>
                </>
              )}
            </group>
          );
        })}

        {showDrawers && numDrawers > 0 && Array.from({ length: numDrawers }).map((_, i) => {
          const drawerY = drawerYPositions[i];
          
          const cabinetInnerWidthForDrawer = width - panelThickness * 2;
          const boxWidth = cabinetInnerWidthForDrawer - drawerSideClearance * 2;
          const boxHeight = (drawerFrontGeos[i].userData?.height || drawerHeight) * drawerBoxHeightRatio;
          const boxDepth = depth - panelThickness - backPanelThickness - settings.drawerBackClearance; 
          
          const boxZOffset = (panelThickness + backPanelThickness + settings.drawerBackClearance) / 2;

          return (
            <group key={`drawer-${i}`} position={getOffset('drawer', i)}>
              {shouldShow('drawerFront') && (
                <>
                  {/* Drawer Front */}
                  <mesh position={[
                    0,
                    drawerY,
                    depth / 2 + doorMaterialThickness / 2
                  ]} castShadow receiveShadow visible={!skeletonView} rotation={[0, -Math.PI / 2, 0]}>
                    <primitive object={drawerFrontGeos[i]} attach="geometry" />
                    <meshStandardMaterial color={showDifferentPanelColors ? panelColors.drawerFront : doorColor} roughness={0.6} side={THREE.DoubleSide} />
                  </mesh>
                  
                  {/* Drawer Box Bottom */}
                  {shouldShow('drawerBottom') && (
                    <mesh position={[
                      0,
                      drawerY - boxHeight / 2 + drawerBottomThickness / 2,
                      boxZOffset + drawerBackThickness / 2
                    ]} castShadow receiveShadow visible={!skeletonView}>
                      <boxGeometry args={[boxWidth - panelThickness * 2, drawerBottomThickness, boxDepth - drawerBackThickness]} />
                      <meshStandardMaterial color={showDifferentPanelColors ? panelColors.drawerBottom : darkerColor2} roughness={0.8} />
                    </mesh>
                  )}
 
                  {/* Drawer Box Sides */}
                  {[-1, 1].map(side => (
                    <React.Fragment key={side}>
                      {shouldShow('drawerSide') && (
                        <mesh position={[
                          side * (boxWidth / 2 - panelThickness / 2),
                          drawerY,
                          boxZOffset
                        ]} castShadow receiveShadow visible={!skeletonView}>
                          <primitive object={side === -1 ? drawerSideLGeo : drawerSideRGeo} attach="geometry" />
                          <meshStandardMaterial color={showDifferentPanelColors ? panelColors.drawerSide : darkerColor2} roughness={0.8} side={THREE.DoubleSide} />
                        </mesh>
                      )}
                    </React.Fragment>
                  ))}
 
                  {/* Drawer Box Back */}
                  {shouldShow('drawerBack') && (
                    <mesh position={[
                      0,
                      drawerY,
                      boxZOffset - boxDepth / 2 + drawerBackThickness / 2
                    ]} castShadow receiveShadow visible={!skeletonView}>
                      <boxGeometry args={[boxWidth - panelThickness * 2, boxHeight, drawerBackThickness]} />
                      <meshStandardMaterial color={showDifferentPanelColors ? panelColors.drawerBack : darkerColor2} roughness={0.8} />
                    </mesh>
                  )}

                  {skeletonView && (
                    <group position={[0, drawerY, 0]}>
                      <lineSegments position={[0, 0, depth / 2 + doorMaterialThickness / 2]} rotation={[0, -Math.PI / 2, 0]}>
                        <edgesGeometry args={[drawerFrontGeos[i]]} />
                        <lineBasicMaterial color="#ff6600" linewidth={3} />
                      </lineSegments>
                      <lineSegments position={[0, -boxHeight / 2 + drawerBottomThickness / 2, boxZOffset + drawerBackThickness / 2]}>
                        <edgesGeometry args={[new THREE.BoxGeometry(boxWidth - panelThickness * 2, drawerBottomThickness, boxDepth - drawerBackThickness)]} />
                        <lineBasicMaterial color="#ffaa00" linewidth={2} />
                      </lineSegments>
                      {[-1, 1].map(side => (
                        <lineSegments key={side} position={[side * (boxWidth / 2 - panelThickness / 2), 0, boxZOffset]}>
                          <edgesGeometry args={[side === -1 ? drawerSideLGeo : drawerSideRGeo]} />
                          <lineBasicMaterial color="#ffaa00" linewidth={2} />
                        </lineSegments>
                      ))}
                      <lineSegments position={[0, 0, boxZOffset - boxDepth / 2 + drawerBackThickness / 2]}>
                        <edgesGeometry args={[new THREE.BoxGeometry(boxWidth - panelThickness * 2, boxHeight, drawerBackThickness)]} />
                        <lineBasicMaterial color="#ffaa00" linewidth={2} />
                      </lineSegments>
                    </group>
                  )}
                </>
              )}
              {shouldShow('drawer') && !settings.enableGola && (
                <mesh position={[
                  0,
                  drawerY,
                  depth / 2 + doorMaterialThickness + 5
                ]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                  <cylinderGeometry args={[2.5, 2.5, 40, 16]} />
                  <meshStandardMaterial color="#4a5568" metalness={0.8} roughness={0.2} />
                </mesh>
              )}
            </group>
          );
        })}

        {numShelves > 0 && !showDrawers && Array.from({ length: numShelves }).map((_, i) => {
          const availableHeight = innerHeight - panelThickness * 2;
          const spacing = availableHeight / (numShelves + 1);
          const shelfY = -innerHeight / 2 + panelThickness + spacing * (i + 1);
          const shelfZStart = -depth / 2 + panelThickness + backPanelThickness;
          const shelfZPos = shelfZStart + settings.shelfDepth / 2;
          
          return (
            <group key={`shelf-${i}`}>
              {shouldShow('shelf') && (
                <mesh position={[
                  0 + getOffset('shelf', i)[0],
                  shelfY + getOffset('shelf', i)[1],
                  shelfZPos + getOffset('shelf', i)[2]
                ]} castShadow receiveShadow visible={!skeletonView}>
                  <boxGeometry args={[innerWidth - panelThickness * 2, panelThickness, settings.shelfDepth]} />
                  <meshStandardMaterial color={showDifferentPanelColors ? panelColors.shelf : darkerColor2} roughness={0.8} side={THREE.DoubleSide} />
                </mesh>
              )}
              {skeletonView && shouldShow('shelf') && (
                <lineSegments position={[
                  0 + getOffset('shelf', i)[0],
                  shelfY + getOffset('shelf', i)[1],
                  shelfZPos + getOffset('shelf', i)[2]
                ]}>
                  <edgesGeometry args={[new THREE.BoxGeometry(innerWidth - panelThickness * 2, panelThickness, settings.shelfDepth)]} />
                  <lineBasicMaterial color="#8e44ad" linewidth={3} />
                </lineSegments>
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

// Placeholder for Section component, assuming it's a simple div for styling
const Section: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="bg-slate-700 rounded-lg p-3 space-y-2">
    {children}
  </div>
);

export const CabinetTestingPage: React.FC = () => {
  const [settings, setSettings] = useState<TestingSettings>(DEFAULT_SETTINGS);

  const updateSetting = <K extends keyof TestingSettings>(key: K, value: TestingSettings[K]) => {
    setSettings(prev => {
      const newSettings = { ...prev, [key]: value };
      
      // If showDrawers is turned on, turn off doors and vice versa
      if (key === 'showDrawers' && value === true) {
        newSettings.showDoors = false;
        newSettings.showHinges = false;
      } else if (key === 'showDoors' && value === true) {
        newSettings.showDrawers = false;
      }
      
      // When Gola is enabled, set doorOverride to 20 if not already set
      if (key === 'enableGola' && value === true && newSettings.doorOverride === 0) {
        newSettings.doorOverride = 20;
      }
      if (key === 'showDoors' && value === false) {
        newSettings.enableGola = false;
      }
      if (key === 'showDrawers' && value === true) {
        newSettings.enableGola = false;
      }
      
      return newSettings;
    });
  };

  const {
    width, height, depth,
    panelThickness, backPanelThickness,
    grooveDepth,
    numShelves, showDrawers,
    cabinetType,
    showBackPanel, topStretcherWidth, showBackStretchers, backStretcherHeight,
    showDoors, doorOuterGap, doorInnerGap,
    hingeHorizontalOffset, hingeVerticalOffset, hingeDiameter,
    toeKickHeight,
    drawerSideClearance, drawerBottomThickness, drawerBackThickness, drawerBoxHeightRatio
  } = settings;

  const isWall = cabinetType === 'wall';
  const isTall = cabinetType === 'tall';
  const isBase = cabinetType === 'base';
  
  const innerWidth = width - panelThickness * 2;
  const innerHeight = isBase ? height - toeKickHeight : height;
  const innerDepth = depth - panelThickness;
  const backPanelWidth = innerWidth + grooveDepth * 2;
  const backPanelHeight = innerHeight - panelThickness * 2 + grooveDepth * 2;
  const actualNumDoors = width < RUBY_DOOR_THRESHOLD ? 1 : 2;
  const calculatedInnerWidth = width - panelThickness * 2;
  const calculatedInnerHeight = height - panelThickness * 2;
  const doorWidthCalculated = width < RUBY_DOOR_THRESHOLD 
    ? width - panelThickness * 2 - doorOuterGap * 2 
    : (width - panelThickness * 2 - doorOuterGap * 2 - doorInnerGap) / 2;
  const backPanelZPos = -depth / 2 + panelThickness + backPanelThickness / 2;
  const backPanelWidthCalc = width - panelThickness * 2 + grooveDepth * 2;

  // Re-calculate hole positions for export - MUST match TestingCabinet exactly
  const nailHolePositions = useMemo(() => {
    if (!settings.showNailHoles) return [];
    const panelHeight = innerHeight - panelThickness;
    const y = panelHeight / 2 - panelThickness / 2;
    const technicalR = settings.nailHoleDiameter / 2;
    const shelfR = settings.shelfHoleDiameter / 2;
    
    // Front Holes (Top Stretcher)
    const golaOffset = (settings.enableGola && isBase && showDoors && !showDrawers) ? settings.golaCutoutDepth : 0;
    const zFront1 = depth / 2 - (topStretcherWidth / 4) - golaOffset;
    const zFront2 = depth / 2 - (topStretcherWidth * 3 / 4) - golaOffset;
    
    // Back Holes (Top Stretcher mirrored at -z)
    const zBack1 = -depth / 2 + (topStretcherWidth / 4);
    const zBack2 = -depth / 2 + (topStretcherWidth * 3 / 4);

    const positions: { y: number, z: number, r: number, through?: boolean }[] = [
      { y, z: zFront1, r: technicalR, through: true },
      { y, z: zFront2, r: technicalR, through: true },
      { y, z: zBack1, r: technicalR, through: true },
      { y, z: zBack2, r: technicalR, through: true }
    ];

    if (numShelves > 0 && !showDrawers) {
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

    if (showBackStretchers && isBase) {
      const zBackStretcher = -depth / 2 + panelThickness / 2;
      const yTopBackMax = panelHeight / 2;
      positions.push({ y: yTopBackMax - (backStretcherHeight / 4) - panelThickness, z: zBackStretcher, r: technicalR, through: true });
      positions.push({ y: yTopBackMax - (backStretcherHeight * 3 / 4) - panelThickness, z: zBackStretcher, r: technicalR, through: true });
      
      const yBottomBackMin = -panelHeight / 2 + panelThickness;
      positions.push({ y: (yBottomBackMin + (backStretcherHeight / 4)) - panelThickness, z: zBackStretcher, r: technicalR, through: true });
      positions.push({ y: (yBottomBackMin + (backStretcherHeight * 3 / 4)) - panelThickness, z: zBackStretcher, r: technicalR, through: true });
    }
    
    return positions;
  }, [settings.showNailHoles, height, depth, panelThickness, backPanelThickness, settings.shelfHoleDiameter, topStretcherWidth, showBackStretchers, isBase, backStretcherHeight, numShelves, showDrawers, showDoors, settings.enableGola, settings.golaCutoutDepth, settings.nailHoleShelfDistance, settings.shelfDepth, settings.nailHoleDiameter]);

  const bottomPanelHoles = useMemo(() => {
    if (!settings.showNailHoles) return [];
    const length = innerWidth;
    const depthVal = innerDepth;
    const technicalR = settings.nailHoleDiameter / 2;
    const u1 = -depthVal / 2 + depthVal / 5;
    const u2 = 0;
    const u3 = depthVal / 2 - depthVal / 5;
    const vLeft = -length / 2 + panelThickness / 2;
    const vRight = length / 2 - panelThickness / 2;
    const v1 = -length / 2 + length / 5;
    const v2 = 0;
    const v3 = length / 2 - length / 5;

    const positions = [
      { y: vLeft, z: u1, r: technicalR, through: true },
      { y: vLeft, z: u2, r: technicalR, through: true },
      { y: vLeft, z: u3, r: technicalR, through: true },
      { y: vRight, z: u1, r: technicalR, through: true },
      { y: vRight, z: u2, r: technicalR, through: true },
      { y: vRight, z: u3, r: technicalR, through: true }
    ];

    if (showBackStretchers && isBase) {
      const zBack = -depthVal / 2 + panelThickness / 2;
      positions.push({ y: v1, z: zBack, r: technicalR, through: true });
      positions.push({ y: v2, z: zBack, r: technicalR, through: true });
      positions.push({ y: v3, z: zBack, r: technicalR, through: true });
    }

    if (isBase) {
      const zToeKick = depthVal / 2 - 50 - panelThickness / 2;
      positions.push({ y: v1, z: zToeKick, r: technicalR, through: true });
      positions.push({ y: v2, z: zToeKick, r: technicalR, through: true });
      positions.push({ y: v3, z: zToeKick, r: technicalR, through: true });
    }
    
    return positions;
  }, [settings.showNailHoles, innerWidth, innerDepth, panelThickness, settings.nailHoleDiameter, showBackStretchers, isBase]);

  const topStretcherBackHoles = useMemo(() => {
    if (!settings.showNailHoles) return [];
    const length = innerWidth - panelThickness * 2;
    const technicalR = settings.nailHoleDiameter / 2;
    const y1 = -length / 2 + length / 5;
    const y2 = 0;
    const y3 = length / 2 - length / 5;
    const z = -topStretcherWidth / 2 + panelThickness / 2;
    
    return [
      { y: y1, z, r: technicalR, through: true },
      { y: y2, z, r: technicalR, through: true },
      { y: y3, z, r: technicalR, through: true }
    ];
  }, [settings.showNailHoles, innerWidth, panelThickness, settings.nailHoleDiameter, topStretcherWidth]);

  const handleExportDXF = async () => {
    const zip = new JSZip();
    
    const addPanelToZip = (name: string, width: number, height: number, holesInput: { y: number, z: number, r: number, through?: boolean }[] = [], grooveInput?: { x: number, y: number, w: number, h: number, depth: number }, golaCutouts?: { x: number, y: number, w: number, h: number }[], mirrorX: boolean = false) => {
      const writer = new DxfWriter();
      writer.setUnits(Units.Millimeters);
      
      writer.addLayer('PANEL', 7, 'CONTINUOUS');
      writer.addLayer('DRILL', 1, 'CONTINUOUS');
      writer.addLayer('GROOVE', 3, 'CONTINUOUS');
      writer.addLayer('TEXT', 7, 'CONTINUOUS');
      
      const modelSpace = writer.modelSpace;

      // Clone inputs to avoid mutation of shared memos
      const holes = holesInput.map(h => ({ ...h }));
      const groove = grooveInput ? { ...grooveInput } : undefined;

      // Apply mirroring if requested
      if (mirrorX) {
        if (groove) {
          groove.x = width - groove.x - groove.w;
        }
        holes.forEach(h => {
          h.z = -h.z;
        });
      }

      // Define standard rectangle points
      let points = [
        { point: { x: 0, y: 0 } }, 
        { point: { x: width, y: 0 } }, 
        { point: { x: width, y: height } }, 
        { point: { x: 0, y: height } }
      ];

      // If Gola L-cut is present (assuming top front corner TR for side panels)
      if (golaCutouts && golaCutouts.length > 0) {
        const cutout = golaCutouts[0]; // Assuming first cutout is the L-notch for side panels
        // L-notch at TR corner:
        points = [
          { point: { x: 0, y: 0 } }, 
          { point: { x: width, y: 0 } }, 
          { point: { x: width, y: cutout.y } }, // Bottom-right of notch
          { point: { x: cutout.x, y: cutout.y } }, // Inner corner of notch
          { point: { x: cutout.x, y: height } }, // Top-left of notch (at top edge)
          { point: { x: 0, y: height } }
        ];
      }

      // Final mirroring of points if requested
      if (mirrorX) {
        points.forEach(p => {
          p.point.x = width - p.point.x;
        });
      }

      modelSpace.addLWPolyline(
        [...points, points[0]],
        { flags: LWPolylineFlags.Closed, layerName: 'PANEL' }
      );

      modelSpace.addText(point3d(width / 2, height / 2, 0), 12, name, { layerName: 'TEXT' });

      holes.forEach(hole => {
        const radius = hole.r;
        let centerX, centerY;
        if (name.includes('Side') || name.includes('Left_Panel') || name.includes('Right_Panel')) {
          centerX = hole.z + width / 2;
          centerY = hole.y + height / 2;
        } else if (name.includes('Bottom') || name.includes('Top')) {
          centerX = hole.y + width / 2;
          centerY = hole.z + height / 2;
        } else if (name.includes('Back_Panel')) {
          centerX = hole.z + width / 2;
          centerY = hole.y + height / 2;
        } else if (name.includes('Door') || name.includes('Drawer')) {
          centerX = hole.z + width / 2;
          centerY = hole.y + height / 2;
        } else {
          centerX = hole.z + width / 2;
          centerY = hole.y + height / 2;
        }
        
        const segments = 32;
        const pts = [];
        for (let i = 0; i <= segments; i++) {
          const angle = (i / segments) * 2 * Math.PI;
          pts.push({ point: { x: centerX + radius * Math.cos(angle), y: centerY + radius * Math.sin(angle) } });
        }
        modelSpace.addLWPolyline(pts, { flags: LWPolylineFlags.Closed, layerName: 'DRILL' });
      });

      if (groove) {
        modelSpace.addLWPolyline(
          [{ point: { x: groove.x, y: groove.y } }, { point: { x: groove.x + groove.w, y: groove.y } }, { point: { x: groove.x + groove.w, y: groove.y + groove.h } }, { point: { x: groove.x, y: groove.y + groove.h } }, { point: { x: groove.x, y: groove.y } }],
          { flags: LWPolylineFlags.Closed, layerName: 'GROOVE' }
        );
      }

      zip.file(`${name}.dxf`, writer.stringify());
    };

    const sideW = depth;
    const sideH_Panel = innerHeight - panelThickness;
    const sideGroove = { x: panelThickness, y: 0, w: backPanelThickness + 2, h: sideH_Panel - panelThickness + grooveDepth, depth: grooveDepth };
    
    const midZValRecalc = (innerHeight - settings.golaTopGap) / 2;
    const golaVerticalGapVal = 13;
    const golaHorizontalGap3Val = 3;

    const isGolaActiveDXF = settings.enableGola && isBase && showDoors && !showDrawers;

    // Gola cutouts for side panels
    const golaCutoutsArr: { x: number, y: number, w: number, h: number }[] = [];
    if (isGolaActiveDXF) {
      const lH = settings.golaLCutoutHeight;
      const lD = settings.golaCutoutDepth;
      const lBottom = sideH_Panel - lH;
      golaCutoutsArr.push({ x: sideW - lD, y: lBottom, w: lD, h: lH });
    }

    addPanelToZip('Left_Panel', sideW, sideH_Panel, nailHolePositions, sideGroove, golaCutoutsArr, false);
    addPanelToZip('Right_Panel', sideW, sideH_Panel, nailHolePositions, sideGroove, golaCutoutsArr, true);
    addPanelToZip('Bottom_Panel', innerWidth, innerDepth, bottomPanelHoles, { x: 0, y: panelThickness, w: innerWidth, h: backPanelThickness + 2, depth: grooveDepth });
    
    if (isWall || isTall) {
      addPanelToZip('Top_Panel', innerWidth, innerDepth, [], { x: 0, y: panelThickness, w: innerWidth, h: backPanelThickness + 2, depth: grooveDepth });
    }
    
    const doorHeightValue = innerHeight - panelThickness * 2 - doorOuterGap * 2 - (settings.enableGola ? settings.doorOverride : 0);
    if (showDoors) {
      for (let i = 0; i < actualNumDoors; i++) {
        const hingeX = actualNumDoors === 1 
          ? -doorWidthCalculated / 2 + hingeHorizontalOffset 
          : (i === 0 ? -doorWidthCalculated / 2 + hingeHorizontalOffset : doorWidthCalculated / 2 - hingeHorizontalOffset);
          
        const topHingeVDXF = isGolaActiveDXF 
          ? (settings.golaLCutoutHeight + settings.hingeVerticalOffset - settings.doorOverride - doorOuterGap)
          : settings.hingeVerticalOffset;
        const bottomHingeVDXF = settings.hingeVerticalOffset;

        const hingeHoles = [
          { y: doorHeightValue / 2 - topHingeVDXF, z: hingeX, r: hingeDiameter / 2, through: false },
          { y: -doorHeightValue / 2 + bottomHingeVDXF, z: hingeX, r: hingeDiameter / 2, through: false }
        ];
        addPanelToZip(`Door_${i + 1}`, doorWidthCalculated, doorHeightValue, hingeHoles);
      }
    }

    if (showDrawers && settings.numDrawers > 0) {
      // Recalculate Gola drawer heights for DXF
      let dxfDrawerFrontHeights = Array(settings.numDrawers).fill(0);
      const avgDrawerH = (innerHeight - panelThickness * 2 - settings.doorOuterGap * (settings.numDrawers + 1)) / settings.numDrawers;
      
      if (settings.enableGola && settings.numDrawers > 0) {
        if (settings.numDrawers === 2) {
          const bottomH = midZValRecalc - golaVerticalGapVal - settings.doorOuterGap;
          const topH = (innerHeight - settings.golaTopGap) - (midZValRecalc + golaVerticalGapVal);
          dxfDrawerFrontHeights = [bottomH + panelThickness, topH];
        } else if (settings.numDrawers === 3) {
          const bottomH = midZValRecalc - golaVerticalGapVal - settings.doorOuterGap;
          const topRegionH = (innerHeight - settings.golaTopGap) - (midZValRecalc + golaVerticalGapVal);
          const topTwoH = (topRegionH - golaHorizontalGap3Val) / 2;
          dxfDrawerFrontHeights = [bottomH + panelThickness, topTwoH, topTwoH];
        } else {
          for (let i = 0; i < settings.numDrawers; i++) {
            dxfDrawerFrontHeights[i] = i === 0 ? avgDrawerH + panelThickness : avgDrawerH;
          }
        }
      } else {
        for (let i = 0; i < settings.numDrawers; i++) {
          dxfDrawerFrontHeights[i] = i === 0 ? avgDrawerH + panelThickness : avgDrawerH;
        }
      }

      for (let i = 0; i < settings.numDrawers; i++) {
        const drawerHeightVal = avgDrawerH;
        const cabinetInnerWidthForDrawer = width - panelThickness * 2;
        const boxWidth = cabinetInnerWidthForDrawer - drawerSideClearance * 2;
        const boxHeight = drawerHeightVal * drawerBoxHeightRatio;
        const boxDepth = depth - panelThickness - backPanelThickness - settings.drawerBackClearance;

        const currentFrontHeight = dxfDrawerFrontHeights[i];
        const frontHoles = [];
        if (settings.showNailHoles) {
          [-1, 1].map(side => [0.25, 0.75].map(vRatio => {
            const holeYInBox = -boxHeight / 2 + boxHeight * vRatio;
            const frontCenterY = i === 0 ? -panelThickness / 2 : 0;
            frontHoles.push({ y: holeYInBox - frontCenterY, z: side * (boxWidth / 2 - panelThickness / 2), r: settings.nailHoleDiameter / 2, through: true });
          }));
        }
        addPanelToZip(`Drawer_${i + 1}_Front`, width - doorOuterGap * 2, currentFrontHeight, frontHoles);
        addPanelToZip(`Drawer_${i + 1}_Bottom`, boxWidth, boxDepth);
        
        const sideHoles = [];
        if (settings.showNailHoles) {
          // Back connection holes
          [0.25, 0.75].map(vRatio => {
            sideHoles.push({ y: -boxHeight / 2 + boxHeight * vRatio, z: -boxDepth / 2 + drawerBackThickness / 2, r: settings.nailHoleDiameter / 2, through: true });
          });
          // Bottom connection holes (1/5, 1/2, 4/5)
          [0.2, 0.5, 0.8].map(dRatio => {
            sideHoles.push({ y: -boxHeight / 2 + drawerBottomThickness / 2, z: -boxDepth / 2 + boxDepth * dRatio, r: settings.nailHoleDiameter / 2, through: true });
          });
        }
        addPanelToZip(`Drawer_${i + 1}_Side_L`, boxDepth, boxHeight, sideHoles);
        addPanelToZip(`Drawer_${i + 1}_Side_R`, boxDepth, boxHeight, sideHoles);
        addPanelToZip(`Drawer_${i + 1}_Back`, boxWidth - panelThickness * 2, boxHeight);
      }
    }

    if (showBackStretchers && isBase) {
      addPanelToZip('Top_Stretcher_Front', innerWidth, topStretcherWidth);
      addPanelToZip('Top_Stretcher_Back', innerWidth, topStretcherWidth, topStretcherBackHoles);
      addPanelToZip('Back_Stretcher_Top', innerWidth, backStretcherHeight);
      addPanelToZip('Back_Stretcher_Bottom', innerWidth, backStretcherHeight);
    }

    if (numShelves > 0 && !showDrawers) {
      for (let i = 0; i < numShelves; i++) {
        addPanelToZip(`Shelf_${i + 1}`, innerWidth, settings.shelfDepth);
      }
    }

    if (showBackPanel) addPanelToZip('Back_Panel', backPanelWidth, backPanelHeight);
    if (isBase) addPanelToZip('Toe_Kick', innerWidth, toeKickHeight);

    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, 'cabinet_cnc_export.zip');
  };

  // Helper for file download
  const saveAs = (blob: Blob, name: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-full bg-slate-900 text-white">
      <div className="w-80 shrink-0 overflow-y-auto p-4 border-r border-slate-700 bg-slate-800">
        <h2 className="text-lg font-bold text-amber-500 mb-4">Cabinet Testing</h2>
        
        <div className="space-y-4">
          <Section>
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
          </Section>

          <Section>
            <h3 className="text-sm font-bold text-slate-300 mb-2">Dimensions (mm)</h3>
            <SettingRow label="Width" value={settings.width} onChange={v => updateSetting('width', v)} step={10} min={200} max={1200} />
            <SettingRow label="Height" value={settings.height} onChange={v => updateSetting('height', v)} step={10} min={300} max={2400} />
            <SettingRow label="Depth" value={settings.depth} onChange={v => updateSetting('depth', v)} step={10} min={200} max={800} />
          </Section>

          <Section>
            <h3 className="text-sm font-bold text-slate-300 mb-2">Panel Thickness (mm)</h3>
            <SettingRow label="Side/End Panel" value={settings.panelThickness} onChange={v => updateSetting('panelThickness', v)} step={1} min={12} max={25} />
            <SettingRow label="Back Panel" value={settings.backPanelThickness} onChange={v => updateSetting('backPanelThickness', v)} step={1} min={3} max={18} />
            <SettingRow label="Door Material" value={settings.doorMaterialThickness} onChange={v => updateSetting('doorMaterialThickness', v)} step={1} min={12} max={25} />
            <SettingRow label="Groove Depth" value={settings.grooveDepth} onChange={v => updateSetting('grooveDepth', v)} step={1} min={2} max={10} />
          </Section>

          <Section>
            <h3 className="text-sm font-bold text-slate-300 mb-2">Gaps (mm)</h3>
            <SettingRow label="Door-to-Door" value={settings.doorToDoorGap} onChange={v => updateSetting('doorToDoorGap', v)} step={0.5} min={0} max={10} />
            <SettingRow label="Door-to-Panel" value={settings.doorToPanelGap} onChange={v => updateSetting('doorToPanelGap', v)} step={0.5} min={0} max={10} />
            <SettingRow label="Door Outer Gap" value={settings.doorOuterGap} onChange={v => updateSetting('doorOuterGap', v)} step={0.5} min={0} max={10} />
            <SettingRow label="Door Inner Gap" value={settings.doorInnerGap} onChange={v => updateSetting('doorInnerGap', v)} step={0.5} min={0} max={10} />
            <SettingRow label="Drawer-to-Drawer" value={settings.drawerToDrawerGap} onChange={v => updateSetting('drawerToDrawerGap', v)} step={0.5} min={0} max={10} />
          </Section>

          <Section>
            <h3 className="text-sm font-bold text-slate-300 mb-2">Components</h3>
            <CheckboxRow label="Show Back Panel" checked={settings.showBackPanel} onChange={v => updateSetting('showBackPanel', v)} />
            <CheckboxRow label="Show Back Stretchers" checked={settings.showBackStretchers} onChange={v => updateSetting('showBackStretchers', v)} />
            <SettingRow label="Back Stretcher Height" value={settings.backStretcherHeight} onChange={v => updateSetting('backStretcherHeight', v)} step={10} min={50} max={200} />
            <SettingRow label="Top Stretcher Width" value={settings.topStretcherWidth} onChange={v => updateSetting('topStretcherWidth', v)} step={10} min={50} max={200} />
          </Section>

          <Section>
            <h3 className="text-sm font-bold text-slate-300 mb-2">Front Options</h3>
            <CheckboxRow label="Show Doors" checked={settings.showDoors} onChange={v => updateSetting('showDoors', v)} />
            {settings.showDoors && (
              <CheckboxRow label="Enable Gola (Handleless)" checked={settings.enableGola} onChange={v => updateSetting('enableGola', v)} />
            )}
            {settings.enableGola && showDoors && !showDrawers && (
              <>
                <SettingRow label="Door Override" value={settings.doorOverride} onChange={v => updateSetting('doorOverride', v)} step={1} min={0} max={50} />
                <SettingRow label="Gola Cutout Depth" value={settings.golaCutoutDepth} onChange={v => updateSetting('golaCutoutDepth', v)} step={1} min={10} max={50} />
                <SettingRow label="Gola L Cut Height" value={settings.golaLCutoutHeight} onChange={v => updateSetting('golaLCutoutHeight', v)} step={1} min={20} max={100} />
              </>
            )}
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
              <>
                <SettingRow label="Num Drawers" value={settings.numDrawers} onChange={v => updateSetting('numDrawers', v)} step={1} min={1} max={6} />
                <SettingRow label="Side Clearance" value={settings.drawerSideClearance} onChange={v => updateSetting('drawerSideClearance', v)} step={1} min={0} max={50} />
                <SettingRow label="Box Bottom Thk" value={settings.drawerBottomThickness} onChange={v => updateSetting('drawerBottomThickness', v)} step={1} min={3} max={18} />
                <SettingRow label="Box Back Thk" value={settings.drawerBackThickness} onChange={v => updateSetting('drawerBackThickness', v)} step={1} min={3} max={18} />
                <SettingRow label="Box H Ratio" value={settings.drawerBoxHeightRatio} onChange={v => updateSetting('drawerBoxHeightRatio', v)} step={0.05} min={0.5} max={1} />
                <SettingRow label="Back Clearance" value={settings.drawerBackClearance} onChange={v => updateSetting('drawerBackClearance', v)} step={1} min={0} max={200} />
              </>
            )}
            {!settings.showDrawers && (
              <>
                <CheckboxRow label="Show Shelves" checked={settings.numShelves > 0} onChange={v => updateSetting('numShelves', v ? 2 : 0)} />
                {settings.numShelves > 0 && (
                  <SettingRow label="Num Shelves" value={settings.numShelves} onChange={v => updateSetting('numShelves', v)} step={1} min={1} max={6} />
                )}
              </>
            )}
          </Section>

          <Section>
            <h3 className="text-sm font-bold text-slate-300 mb-2">Construction</h3>
            <CheckboxRow label="Show Nail Holes" checked={settings.showNailHoles} onChange={v => updateSetting('showNailHoles', v)} />
            {settings.showNailHoles && (
              <>
                <SettingRow label="Stretcher Hole Dia" value={settings.nailHoleDiameter} onChange={v => updateSetting('nailHoleDiameter', v)} step={0.5} min={1} max={10} />
                <SettingRow label="Shelf Hole Dia" value={settings.shelfHoleDiameter} onChange={v => updateSetting('shelfHoleDiameter', v)} step={0.5} min={1} max={10} />
                <SettingRow label="Shelf Depth" value={settings.shelfDepth} onChange={v => updateSetting('shelfDepth', v)} step={1} min={100} max={settings.depth - settings.panelThickness - settings.backPanelThickness} />
                <SettingRow label="Hole Depth" value={settings.nailHoleDepth} onChange={v => updateSetting('nailHoleDepth', v)} step={1} min={1} max={settings.panelThickness} />
                <SettingRow label="Shelf to Hole Dist" value={settings.nailHoleShelfDistance} onChange={v => updateSetting('nailHoleShelfDistance', v)} step={1} min={0} max={100} />
              </>
            )}
            <div className="pt-4 border-t border-slate-700 mt-2">
              <button 
                onClick={handleExportDXF}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-2 px-4 rounded transition-colors flex items-center justify-center gap-2"
              >
                <Download size={14} />
                Export CNC DXF
              </button>
            </div>
          </Section>

          <Section>
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
                  <option value="drawer">Drawer(s) (All)</option>
                  <option value="drawerFront">Drawer Front</option>
                  <option value="drawerSide">Drawer Side</option>
                  <option value="drawerBack">Drawer Back</option>
                  <option value="drawerBottom">Drawer Bottom</option>
                  <option value="toeKick">Toe Kick</option>
                  <option value="shelf">Shelf</option>
                </select>
              </div>
            )}
          </Section>

          {settings.cabinetType === 'base' && (
            <div className="bg-slate-700 rounded-lg p-3 space-y-2">
              <h3 className="text-sm font-bold text-slate-300 mb-2">Base Cabinet</h3>
              <SettingRow label="Toe Kick Height" value={settings.toeKickHeight} onChange={v => updateSetting('toeKickHeight', v)} step={10} min={50} max={150} />
            </div>
          )}

          <div className="bg-slate-700 rounded-lg p-3">
            <div className="text-xs text-slate-400 mb-2">Calculated Values</div>
            <div className="text-xs text-slate-300 space-y-1">
              <div>Inner Width: {calculatedInnerWidth}mm</div>
              <div>Inner Height: {calculatedInnerHeight}mm</div>
              <div>Num Doors (Ruby Rule): {actualNumDoors} (threshold: {RUBY_DOOR_THRESHOLD}mm)</div>
              <div>Door Width ({actualNumDoors} door{actualNumDoors > 1 ? 's' : ''}): {doorWidthCalculated}mm</div>
              <div>Back Panel Position: Z = {backPanelZPos}mm (from center)</div>
              <div>Back Panel Width: {backPanelWidthCalc}mm (with {grooveDepth}mm groove each side)</div>
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
