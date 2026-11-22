import { smoothPocketNormals } from './pocket-skirt.js';
import * as THREE from 'three';
import { fitPocketModel } from './pocket-model-fit.js';

// All measurements are taken after the Unity hierarchy has been assembled.
// OBJ local bounding boxes include hidden cloth and are not the playing area.
function positions(mesh) {
  const p = mesh.geometry.attributes.position;
  return Array.from({ length: p.count }, (_, i) => new THREE.Vector3()
    .fromBufferAttribute(p, i).applyMatrix4(mesh.matrixWorld));
}

function components(vertices) {
  const byPosition = new Map(), parent = vertices.map((_, i) => i);
  const find = i => parent[i] === i ? i : (parent[i] = find(parent[i]));
  vertices.forEach((v, i) => {
    const key = v.toArray().map(n => n.toFixed(6)).join(':');
    if (byPosition.has(key)) parent[find(i)] = find(byPosition.get(key));
    else byPosition.set(key, i);
  });
  for (let i = 0; i < vertices.length; i += 3) {
    parent[find(i + 1)] = find(i); parent[find(i + 2)] = find(i);
  }
  const groups = new Map();
  vertices.forEach((_, i) => { const k = find(i); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(i); });
  return [...groups.values()];
}

// Move each existing inner/outer vertex pair together. This corrects the
// centreline without changing any cross-section width or replacing the mesh.
function alignArcCentreline(output, ids, centre, radius) {
  const unique = new Map();
  for (const i of ids) {
    const key = output[i].toArray().map(n => n.toFixed(6)).join(':');
    if (!unique.has(key)) unique.set(key, []);
    unique.get(key).push(i);
  }
  const pending = [...unique.values()];
  while (pending.length) {
    const a = pending.shift();
    const p = output[a[0]];
    let nearest = 0;
    for (let j = 1; j < pending.length; j++) {
      if (p.distanceToSquared(output[pending[j][0]]) < p.distanceToSquared(output[pending[nearest][0]])) nearest = j;
    }
    const b = pending.splice(nearest, 1)[0];
    const midpoint = p.clone().add(output[b[0]]).multiplyScalar(0.5);
    const direction = midpoint.clone().sub(centre);
    direction.y = 0;
    // Exported endpoints have sub-micrometre x noise from the Unity transform.
    if (Math.abs(direction.x) < 1e-6) direction.x = 0;
    const shift = direction.normalize().multiplyScalar(radius).add(centre).sub(midpoint);
    for (const i of [...a, ...b]) output[i].add(shift);
  }
}

export function measureTable(root) {
  root.updateMatrixWorld(true);
  const cloth = new THREE.Box3().setFromObject(root.getObjectByName('tableCloth'));
  const center = cloth.getCenter(new THREE.Vector3());
  const surfaceY = cloth.max.y;
  const meshes = [];
  root.getObjectByName('tableCushions').traverse(m => { if (m.isMesh) meshes.push(m); });
  const vertices = meshes.flatMap(positions);
  const noses = {};
  for (const [name, axis, crossAxis, cross, sign] of [
    ['xMin', 'x', 'z', center.z, -1], ['xMax', 'x', 'z', center.z, 1],
    ['zMin', 'z', 'x', center.x + 0.5, -1], ['zMax', 'z', 'x', center.x + 0.5, 1],
  ]) {
    let best = Infinity;
    for (let i = 0; i < vertices.length; i += 3) for (let j = 0; j < 3; j++) {
      const a = vertices[i + j], b = vertices[i + (j + 1) % 3];
      const delta = b[crossAxis] - a[crossAxis];
      if (Math.abs(delta) < 1e-12) continue;
      const t = (cross - a[crossAxis]) / delta;
      if (t < 0 || t > 1) continue;
      const p = a.clone().lerp(b, t);
      const d = sign * (p[axis] - center[axis]);
      if (d <= 0 || d > best + 1e-7) continue;
      // A vertical nose face has several equally leading points. OBJ float
      // noise must not randomly select its upper edge as the contact height.
      const height = p.y - surfaceY;
      if (d < best - 1e-7) noses[name] = { coordinate: p[axis], height };
      else if (height < noses[name].height) noses[name].height = height;
      best = Math.min(best, d);
    }
    if (!noses[name]) throw new Error(`Cannot measure cushion nose: ${name}`);
  }
  return { center: center.toArray(), surfaceY, noses,
    lengthMm: (noses.xMax.coordinate - noses.xMin.coordinate) * 1000,
    widthMm: (noses.zMax.coordinate - noses.zMin.coordinate) * 1000 };
}

export function calibrateTable(root, state, spec, options = {}) {
  const before = measureTable(root);
  const oldCenter = new THREE.Vector3().fromArray(before.center);
  const { noses } = before;
  const noseCenterX = (noses.xMin.coordinate + noses.xMax.coordinate) / 2;
  const noseCenterZ = (noses.zMin.coordinate + noses.zMax.coordinate) / 2;
  const scaleX = state.table.playAreaMm.width / before.lengthMm;
  const scaleZ = state.table.playAreaMm.height / before.widthMm;
  const fullBox = new THREE.Box3().setFromObject(root);
  const floorY = fullBox.min.y;
  const scaleY = spec.cushionTopHeightMm / ((fullBox.max.y - floorY) * 1000);
  const surfaceY = floorY + (before.surfaceY - floorY) * scaleY;
  const targetCenter = new THREE.Vector3(oldCenter.x, surfaceY, oldCenter.z);
  const mapPoint = p => p.set(
    targetCenter.x + (p.x - noseCenterX) * scaleX,
    floorY + (p.y - floorY) * scaleY,
    targetCenter.z + (p.z - noseCenterZ) * scaleZ,
  );
  const markings = root.getObjectByName('tableMarkings');
  const markingMeshes = new Set(); markings.traverse(m => { if (m.isMesh) markingMeshes.add(m); });
  const cushionMeshes = new Set(); root.getObjectByName('tableCushions').traverse(m => { if (m.isMesh) cushionMeshes.add(m); });
  const spotCenters = {};
  const baulkLines = [];
  root.traverse(mesh => {
    if (!mesh.isMesh) return;
    const source = positions(mesh), output = source.map(p => mapPoint(p.clone()));
    const removedSpotVertices = new Set();
    if (cushionMeshes.has(mesh)) {
      // The shared physics resolves a 2D sphere against the nose line. Put the
      // profile's leading tip at ball-centre height, retaining cloth and rail top.
      // This is a rendering contact convention, not a claimed WPBSA nose height.
      for (const ids of components(source)) {
        const box = new THREE.Box3().setFromPoints(ids.map(i => source[i]));
        const c = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3());
        const side = size.x > size.z ? (c.z < oldCenter.z ? 'zMin' : 'zMax') : (c.x < oldCenter.x ? 'xMin' : 'xMax');
        const noseH = noses[side].height;
        const topH = box.max.y - before.surfaceY;
        const radius = state.balls[0].radius / 1000;
        for (const i of ids) {
          const h = source[i].y - before.surfaceY;
          output[i].y = surfaceY + (h <= 0 ? h * scaleY : h <= noseH
            ? h / noseH * radius
            : radius + (h - noseH) / (topH - noseH) * (topH * scaleY - radius));
        }
      }
    }
    if (markingMeshes.has(mesh)) {
      for (const ids of components(source)) {
        const box = new THREE.Box3().setFromPoints(ids.map(i => source[i]));
        const c = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3());
        const x = c.x - oldCenter.x, z = c.z - oldCenter.z;
        const baulkX = -state.table.baulkLineMm / 1000;
        if (size.z > 1) {
          baulkLines.push({ mesh, ids });
          for (const i of ids) output[i].set(targetCenter.x + baulkX + source[i].x - c.x,
            surfaceY + 0.0001, targetCenter.z + (source[i].z - c.z) * (spec.widthMm / 1000 / size.z));
        } else if (size.x > 0.2) {
          // D arc: its left endpoint lies on the baulk line in this reflected view.
          for (const i of ids) output[i].set(targetCenter.x + baulkX + (source[i].x - box.min.x) * (spec.dRadiusMm / 1000 / size.x),
            surfaceY + 0.0001, targetCenter.z + (source[i].z - c.z) * (2 * spec.dRadiusMm / 1000 / size.z));
          alignArcCentreline(output, ids,
            new THREE.Vector3(targetCenter.x + baulkX, surfaceY + 0.0001, targetCenter.z),
            state.table.dRadiusMm / 1000);
        } else {
          const kind = x < -1.2 ? 'black' : x < -0.5 ? 'pink' : x < 0.5 ? 'blue' : Math.abs(z) < 0.1 ? 'brown' : z < 0 ? 'yellow' : 'green';
          const ball = state.balls.find(b => b.kind === kind);
          const px = targetCenter.x - ball.pos.x / 1000, pz = targetCenter.z - ball.pos.y / 1000;
          // Remove the exported crosses/spot shapes, retaining the baulk line and D.
          for (const i of ids) removedSpotVertices.add(i);
          spotCenters[kind] = [px, surfaceY + 0.0001, pz];
        }
      }
    }
    const inverse = mesh.matrixWorld.clone().invert();
    const attr = mesh.geometry.attributes.position;
    output.forEach((p, i) => { p.applyMatrix4(inverse); attr.setXYZ(i, p.x, p.y, p.z); });
    attr.needsUpdate = true;
    if (removedSpotVertices.size) {
      mesh.geometry.setIndex(source.map((_, i) => i).filter(i => !removedSpotVertices.has(i)));
    }
    mesh.geometry.computeVertexNormals(); if(/^pocketLeather/.test(mesh.material?.name||''))smoothPocketNormals(mesh.geometry); mesh.geometry.computeBoundingBox(); mesh.geometry.computeBoundingSphere();
  });
  const after = measureTable(root);
  // Cloth bounds can be asymmetric around the calibrated nose centre. Consumers
  // must use this explicit origin instead of inferring it from a cloth AABB.
  const report = { standard: spec.source, before, after, origin: targetCenter.toArray(), surfaceY,
    sourceTransform: { noseCenterX, noseCenterZ, floorY },
    scale: [scaleX, scaleY, scaleZ], spotCenters,
    playingAreaMm: state.table.playAreaMm, cushionTopHeightMm: spec.cushionTopHeightMm,
    noseHeightConvention: 'ball-centre plane for shared 2D contact',
    pocketContours: 'Model cushion noses and cloth openings fitted to the existing independent 3D physics polylines.' };
  if (options.fitPockets !== false) report.pocketFit = fitPocketModel(root, state, report);
  report.after = measureTable(root);
  // Continue the original baulk strip across the cloth beneath the cushions.
  // Depth testing hides the covered portion; x coordinates retain its width.
  const clothBounds = new THREE.Box3().setFromObject(root.getObjectByName('tableCloth'));
  for (const { mesh, ids } of baulkLines) {
    const attr = mesh.geometry.attributes.position;
    const inverse = mesh.matrixWorld.clone().invert();
    for (const i of ids) {
      const p = new THREE.Vector3().fromBufferAttribute(attr, i).applyMatrix4(mesh.matrixWorld);
      const t = (p.z - targetCenter.z) / (spec.widthMm / 1000) + 0.5;
      p.z = THREE.MathUtils.lerp(clothBounds.min.z, clothBounds.max.z, t);
      p.applyMatrix4(inverse);
      attr.setXYZ(i, p.x, p.y, p.z);
    }
    attr.needsUpdate = true;
    mesh.geometry.computeBoundingBox();
    mesh.geometry.computeBoundingSphere();
  }
  // Five-millimetre cloth markings use world geometry, so viewport size,
  // camera zoom and both projection modes scale them together with the table.
  const spotGeometry = new THREE.CircleGeometry(0.0025, 32);
  spotGeometry.rotateX(-Math.PI / 2);
  const spotMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff, toneMapped: false, depthTest: true, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
  });
  const spots = new THREE.Group();
  spots.name = 'ProceduralColourSpots';
  const inverseRoot = root.matrixWorld.clone().invert();
  for (const [kind, center] of Object.entries(spotCenters)) {
    const spot = new THREE.Mesh(spotGeometry, spotMaterial);
    spot.name = `ColourSpot-${kind}`;
    spot.applyMatrix4(inverseRoot.clone().multiply(new THREE.Matrix4().makeTranslation(...center)));
    spots.add(spot);
  }
  root.add(spots);
  return report;
}

export function calibratedModelPoint(point, report) {
  if (!report) return point;
  const { noseCenterX, noseCenterZ, floorY } = report.sourceTransform;
  return point.set(report.origin[0] + (point.x - noseCenterX) * report.scale[0],
    floorY + (point.y - floorY) * report.scale[1],
    report.origin[2] + (point.z - noseCenterZ) * report.scale[2]);
}

export function createCalibrationOverlay(report, state) {
  const group = new THREE.Group(); group.name = 'Physical calibration overlay';
  const [x, y, z] = report.origin;
  const at = (p, h = 0.002) => new THREE.Vector3(x - p.x / 1000, y + h, z - p.y / 1000);
  function line(points, color, height = 0.0001) {
    const material = new THREE.LineBasicMaterial({ color, depthTest: false, transparent: true, opacity: 0.9 });
    const item = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points.map(p => at(p, height))), material);
    item.renderOrder = 100; group.add(item);
  }
  const contactHeight = state.balls[0].radius / 1000 + 0.00005;
  state.tableColliderSet.rails.forEach(r => line([r.start, r.end], 0x36ff83, contactHeight));
  state.tableColliderSet.pocketLips.forEach(l => line(l.points, 0x36ff83, contactHeight));
  state.tableColliderSet.pocketDropEdges.forEach(l => line(l.points, 0xffa326));
  for (const b of state.balls.filter(b => !['cue', 'red'].includes(b.kind))) {
    line([{ x: b.pos.x - 12, y: b.pos.y }, { x: b.pos.x + 12, y: b.pos.y }], 0x44cfff);
    line([{ x: b.pos.x, y: b.pos.y - 12 }, { x: b.pos.x, y: b.pos.y + 12 }], 0x44cfff);
  }
  group.visible = false;
  return group;
}


export function measureCueSpace(tableRoot, cue, center, surfaceY) {
  // Cue collision retains the exact calibrated geometry before render simplification.
  const triangles = [];
  tableRoot.updateMatrixWorld(true);
  tableRoot.traverse(mesh => {
    if (!mesh.isMesh) return;
    const collision = mesh.userData.cueCollisionGeometry || mesh.geometry;
    const geometry = collision.index ? collision.toNonIndexed() : collision;
    const positions = geometry.attributes.position;
    for (let i = 0; i < positions.count; i += 3) {
      const points = [0, 1, 2].map(j => {
        const p = new THREE.Vector3().fromBufferAttribute(positions, i + j).applyMatrix4(mesh.matrixWorld);
        return [(center.x - p.x) * 1000, (center.z - p.z) * 1000, (p.y - surfaceY) * 1000];
      });
      if (Math.max(...points.map(p => p[2])) >= 0) triangles.push(points);
    }
    if (geometry !== collision) geometry.dispose();
  });
  const profile = Array.from({ length: 29 }, (_, i) => ({ start: i * 50, end: (i + 1) * 50, radius: 0, samples: [] }));
  for (const part of cue.children) {
    const p = part.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const axial = p.getY(i) * 1000;
      const bin = profile[Math.min(28, Math.max(0, Math.floor(axial / 50)))];
      const radial = Math.hypot(p.getX(i), p.getZ(i)) * 1000;
      bin.radius = Math.max(bin.radius, radial);
      bin.samples.push([axial, radial]);
    }
  }
  // Include crossing triangles: a long shaft face can span multiple profile bins.
  for (const part of cue.children) {
    const geom = part.geometry.index ? part.geometry.toNonIndexed() : part.geometry;
    const p = geom.attributes.position;
    for (let i = 0; i < p.count; i += 3) {
      const axial = [0, 1, 2].map(j => p.getY(i + j) * 1000);
      for (const bin of profile) {
        if (bin.end < Math.min(...axial) || bin.start > Math.max(...axial)) continue;
        for (let j = 0; j < 3; j++) {
          const k = (j + 1) % 3;
          for (const boundary of [bin.start, bin.end]) {
            const t = (boundary - axial[j]) / (axial[k] - axial[j]);
            if (!(t >= 0 && t <= 1)) continue;
            const x = p.getX(i + j) + t * (p.getX(i + k) - p.getX(i + j));
            const z = p.getZ(i + j) + t * (p.getZ(i + k) - p.getZ(i + j));
            const radial = Math.hypot(x, z) * 1000;
            bin.radius = Math.max(bin.radius, radial);
            bin.samples.push([boundary, radial]);
          }
        }
      }
    }
    if (geom !== part.geometry) geom.dispose();
  }
  // Tight axial capsule endpoints. Each sampled surface point must remain
  // within the capsule; convexity then covers the clipped triangle interiors.
  // The old endpoint at zero extended a full-radius sphere ahead of the tip.
  for (const bin of profile) {
    let first=Infinity,last=-Infinity;
    for (const [axial,radial] of bin.samples) {
      const reach=Math.sqrt(Math.max(0,bin.radius*bin.radius-radial*radial));
      first=Math.min(first,axial+reach);last=Math.max(last,axial-reach);
    }
    bin.capsuleStart=Number.isFinite(first)?Math.min(first,last):bin.start;
    bin.capsuleEnd=Number.isFinite(last)?Math.max(first,last):bin.end;
    delete bin.samples;
  }
  // Actual rounded leather mesh, in the same local basis used by syncCue.
  const tipSurface = [];
  const tipSource = cue.children[1].geometry;
  const tipGeometry = tipSource.index ? tipSource.toNonIndexed() : tipSource;
  const tipPositions = tipGeometry.attributes.position;
  for (let i=0;i<tipPositions.count;i+=3) {
    tipSurface.push([0,1,2].map(j=>[-tipPositions.getX(i+j)*1000,
      tipPositions.getY(i+j)*1000,tipPositions.getZ(i+j)*1000]));
  }
  if (tipGeometry !== tipSource) tipGeometry.dispose();
  return { triangles, geometry: { profile, tipSurface,
    tipRadius: profile[0].radius, buttRadius: Math.max(...profile.map(p => p.radius)) } };
}
