import { GLTFExporter } from 'three-stdlib';
import * as THREE from 'three';

export const exportSceneToGLB = (scene: THREE.Scene, projectName: string) => {
  const exporter = new GLTFExporter();

  // Create a container for objects we want to export
  const exportGroup = new THREE.Group();
  
  // We want to capture the highest level objects that match our criteria
  // to avoid double-exporting (capturing both a parent and its child).
  const processedUUIDs = new Set<string>();

  scene.traverse((object) => {
    // If we've already processed a parent of this object, skip it
    let parent = object.parent;
    while (parent) {
      if (processedUUIDs.has(parent.uuid)) return;
      parent = parent.parent;
    }

    if (
      object.name.startsWith('cabinet-group-') || 
      object.name.startsWith('wall-group-') ||
      object.name.startsWith('backsplash-') ||
      object.name.startsWith('obstacle-')
    ) {
      processedUUIDs.add(object.uuid);
      
      // Clone to avoid modifying the original scene
      const clone = object.clone();
      
      // Ensure world transform is preserved
      object.updateMatrixWorld(true);
      clone.matrix.copy(object.matrixWorld);
      clone.matrix.decompose(clone.position, clone.quaternion, clone.scale);
      
      // Remove any dimension HTML or UI Lines from the clone
      const toRemove: THREE.Object3D[] = [];
      clone.traverse((child) => {
        // Types like 'Line' or 'Points' or specific names
        if (
          child.type === 'Line' || 
          child.type === 'LineSegments' || 
          child.name === 'Dimension' ||
          child.type === 'Html' // Though clone() usually doesn't copy HTML components correctly anyway
        ) {
          toRemove.push(child);
        }
      });
      toRemove.forEach(r => r.parent?.remove(r));
      
      exportGroup.add(clone);
    }
  });

  if (exportGroup.children.length === 0) {
    console.warn('No objects found to export. Make sure objects have the correct name prefixes.');
    return;
  }

  const options = {
    binary: true,
    trs: false,
    onlyVisible: true,
    truncateDrawRange: true,
    embedImages: true,
  };

  exporter.parse(
    exportGroup,
    (gltf) => {
      const output = gltf as ArrayBuffer;
      const blob = new Blob([output], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${projectName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_design.glb`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    },
    (error) => {
      console.error('Error exporting GLTF:', error);
    },
    options
  );
};
