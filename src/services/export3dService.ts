import { GLTFExporter } from 'three-stdlib';
import * as THREE from 'three';

export const exportSceneToGLB = (scene: THREE.Scene, projectName: string, exportOptions: { skeletonView?: boolean } = {}) => {
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
      
      // Filter components based on view mode
      const toRemove: THREE.Object3D[] = [];
      clone.traverse((child) => {
        // Always remove UI artifacts
        if (child.name === 'Dimension' || (child as any).isHtml || child.type === 'Html') {
          toRemove.push(child);
          return;
        }

        if (exportOptions.skeletonView) {
          // In skeleton mode, we want ONLY the lines. 
          // We remove meshes so that they don't appear in the export.
          if (child instanceof THREE.Mesh) {
            toRemove.push(child);
          }
        } else {
          // In normal mode, we want ONLY the solid geometry.
          // We remove helper lines and wireframes.
          if (child instanceof THREE.Line || child instanceof THREE.LineSegments) {
            toRemove.push(child);
          }
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
