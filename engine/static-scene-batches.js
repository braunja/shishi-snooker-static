import * as THREE from 'three';

// Static, single-material triangle streams only. This is concatenation, not a
// simplifier: authored positions, normals, UV seams and triangle order survive.
export function mergeStaticTriangleStreams(geometries) {
  if (!geometries.length) throw new Error('Cannot merge an empty static batch');
  const names = Object.keys(geometries[0].attributes);
  for (const geometry of geometries) {
    if (geometry.index || Object.keys(geometry.morphAttributes).length || geometry.drawRange.start !== 0 || geometry.drawRange.count !== Infinity)
      throw new Error('Static stream merge requires complete non-indexed geometry');
    if (Object.keys(geometry.attributes).length !== names.length) throw new Error('Static stream attributes differ');
    for (const name of names) {
      const a = geometry.attributes[name], first = geometries[0].attributes[name];
      if (!a || a.isInterleavedBufferAttribute || a.itemSize !== first.itemSize || a.normalized !== first.normalized || a.array.constructor !== first.array.constructor)
        throw new Error('Static stream attribute layout differs: ' + name);
    }
  }
  const merged = new THREE.BufferGeometry();
  for (const name of names) {
    const first = geometries[0].attributes[name];
    const array = new first.array.constructor(geometries.reduce((n, geometry) => n + geometry.attributes[name].array.length, 0));
    let offset = 0;
    for (const geometry of geometries) { const source = geometry.attributes[name].array; array.set(source, offset); offset += source.length; }
    const attribute = new THREE.BufferAttribute(array, first.itemSize, first.normalized);
    attribute.gpuType = first.gpuType;
    merged.setAttribute(name, attribute);
  }
  merged.computeBoundingBox(); merged.computeBoundingSphere();
  return merged;
}

// Repeated opaque parts use their original geometry/material and a static
// transform buffer. Spatial chunks keep useful frustum culling around the room.
export function instanceStaticMeshes(root, accept, cellSize = 2) {
  root.updateWorldMatrix(true, true);
  const inverse = new THREE.Matrix4().copy(root.matrixWorld).invert(), matrix = new THREE.Matrix4();
  const bounds = new THREE.Box3(), centre = new THREE.Vector3(), groups = new Map();
  root.traverse(mesh => {
    if (!mesh.isMesh || mesh.isInstancedMesh || !accept(mesh)) return;
    if (Array.isArray(mesh.material) || mesh.material.transparent || mesh.children.length || !mesh.visible)
      throw new Error('Static instance batching requires visible opaque leaf meshes');
    matrix.multiplyMatrices(inverse, mesh.matrixWorld);
    mesh.geometry.computeBoundingBox();
    bounds.copy(mesh.geometry.boundingBox).applyMatrix4(matrix).getCenter(centre);
    const cell = [Math.floor(centre.x / cellSize), Math.floor(centre.y / cellSize), Math.floor(centre.z / cellSize)].join(',');
    const key = [mesh.geometry.uuid, mesh.material.uuid, mesh.layers.mask, mesh.renderOrder, mesh.castShadow, mesh.receiveShadow, cell].join('/');
    if (!groups.has(key)) groups.set(key, { cell, items: [] });
    groups.get(key).items.push({ mesh, matrix: matrix.clone() });
  });
  let sources = 0, batches = 0;
  for (const { cell, items } of groups.values()) {
    if (items.length < 2) continue;
    const first = items[0].mesh, mesh = new THREE.InstancedMesh(first.geometry, first.material, items.length);
    mesh.name = first.name + ' / sector ' + cell;
    mesh.layers.mask = first.layers.mask; mesh.renderOrder = first.renderOrder;
    mesh.castShadow = first.castShadow; mesh.receiveShadow = first.receiveShadow;
    mesh.userData = { ...first.userData, staticBatchCount: items.length };
    items.forEach((item, index) => { mesh.setMatrixAt(index, item.matrix); item.mesh.removeFromParent(); });
    mesh.computeBoundingBox(); mesh.computeBoundingSphere(); root.add(mesh);
    sources += items.length; batches++;
  }
  return { sourceMeshes: sources, batches, savedDraws: sources - batches };
}
