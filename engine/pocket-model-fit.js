import * as THREE from 'three';
import { simplifyTableSurface } from './table-render-geometry.js';

const EPS = 0.15; // mm: interior surfaces only; contact edges are split at every physical knot
const key = p => `${p.x.toFixed(3)}:${p.y.toFixed(3)}`;
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const mix = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
const smooth = t => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
function path(points) {
  const lengths = [0];
  for (let i = 1; i < points.length; i++) lengths.push(lengths.at(-1) + distance(points[i - 1], points[i]));
  return { points, lengths, length: lengths.at(-1) };
}
function along(curve, s) {
  s = Math.max(0, Math.min(curve.length, s));
  let i = 1;
  while (i < curve.points.length - 1 && curve.lengths[i] < s) i++;
  const a = curve.points[i - 1], b = curve.points[i];
  return { ...mix(a, b, (s - curve.lengths[i - 1]) / (curve.lengths[i] - curve.lengths[i - 1] || 1)),
    angle: Math.atan2(b.y - a.y, b.x - a.x) };
}
function closest(p, curve) {
  let best = null;
  for (let i = 1; i < curve.points.length; i++) {
    const a = curve.points[i - 1], b = curve.points[i];
    const dx = b.x - a.x, dy = b.y - a.y, length2 = dx * dx + dy * dy;
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (length2 || 1)));
    const q = mix(a, b, t), d = distance(p, q);
    if (!best || d < best.distance) best = { ...q, distance: d, s: curve.lengths[i - 1] + Math.sqrt(length2) * t,
      angle: Math.atan2(dy, dx) };
  }
  return best;
}
function worldVertices(mesh) {
  const a = mesh.geometry.attributes.position;
  return Array.from({ length: a.count }, (_, i) => new THREE.Vector3().fromBufferAttribute(a, i).applyMatrix4(mesh.matrixWorld));
}

// The extracted model has six open nose-edge chains. Find those actual edges,
// then pair each straight span with its unchanged physical rail and two jaws.
function cushionPaths(mesh, to2, noseY, state) {
  const points = worldVertices(mesh), nodes = new Map();
  const add = p => {
    const q = to2(p), id = key(q);
    if (!nodes.has(id)) nodes.set(id, { point: q, neighbors: new Set() });
    return id;
  };
  for (let i = 0; i < points.length; i += 3) for (let j = 0; j < 3; j++) {
    const a = points[i + j], b = points[i + (j + 1) % 3];
    if (Math.abs(a.y - noseY) > 0.000002 || Math.abs(b.y - noseY) > 0.000002) continue;
    const ka = add(a), kb = add(b);
    if (ka === kb) continue;
    nodes.get(ka).neighbors.add(kb); nodes.get(kb).neighbors.add(ka);
  }
  const visited = new Set(), curves = [];
  for (const [id, node] of nodes) {
    if (visited.has(id) || node.neighbors.size !== 1) continue;
    const chain = []; let current = id;
    while (current) {
      visited.add(current); const n = nodes.get(current); chain.push(n.point);
      current = [...n.neighbors].find(k => !visited.has(k));
    }
    const source = path(chain);
    let straightIndex = 1;
    for (let i = 2; i < chain.length; i++) if (distance(chain[i - 1], chain[i]) > distance(chain[straightIndex - 1], chain[straightIndex])) straightIndex = i;
    const a = chain[straightIndex - 1], b = chain[straightIndex];
    const lips = state.tableColliderSet.pockets.flatMap(p => p.lips);
    const jawA = lips.reduce((best, l) => distance(a, l.points[0]) < distance(a, best.points[0]) ? l : best);
    const jawB = lips.reduce((best, l) => distance(b, l.points[0]) < distance(b, best.points[0]) ? l : best);
    const first = path([...jawA.points].reverse()), second = path(jawB.points);
    const target = path([...first.points, ...second.points]);
    const oldBreaks = [0, source.lengths[straightIndex - 1], source.lengths[straightIndex], source.length];
    const newBreaks = [0, first.length, target.length - second.length, target.length];
    const axis = Math.abs(b.x - a.x) > Math.abs(b.y - a.y) ? 'x' : 'y';
    const crossAxis = axis === 'x' ? 'y' : 'x';
    const outward = Math.sign((a[crossAxis] + b[crossAxis]) / 2);
    const station = (a[axis] + b[axis]) / 2;
    let back = -Infinity;
    for (let i = 0; i < points.length; i += 3) for (let j = 0; j < 3; j++) {
      const p = to2(points[i + j]), q = to2(points[i + (j + 1) % 3]);
      const t = (station - p[axis]) / (q[axis] - p[axis]);
      if (!(t >= 0 && t <= 1)) continue;
      const edge = mix(p, q, t), d = outward * (edge[crossAxis] - a[crossAxis]);
      if (d >= -0.01 && d < 100) back = Math.max(back, outward * edge[crossAxis]);
    }
    if (!Number.isFinite(back)) throw new Error('Cannot find original straight wood attachment');
    const cuts = target.lengths.map(s => {
      const part = s <= newBreaks[1] ? 0 : s <= newBreaks[2] ? 1 : 2;
      const t = (s - newBreaks[part]) / (newBreaks[part + 1] - newBreaks[part]);
      const point = along(source, oldBreaks[part] + t * (oldBreaks[part + 1] - oldBreaks[part]));
      return { point, normal: axis === 'x' ? { x: 1, y: 0 } : { x: 0, y: 1 } };
    });
    curves.push({ source, target, oldBreaks, newBreaks, axis, crossAxis, outward, back, cuts, bounds: {
      minX: Math.min(...chain.map(p => p.x)), maxX: Math.max(...chain.map(p => p.x)),
      minY: Math.min(...chain.map(p => p.y)), maxY: Math.max(...chain.map(p => p.y)),
    } });
  }
  if (curves.length !== 6) throw new Error(`Expected six model nose chains, found ${curves.length}`);
  return curves;
}

function section(object, height, to2) {
  const lines = [];
  object.traverse(mesh => {
    if (!mesh.isMesh) return;
    const vertices = worldVertices(mesh);
    for (let i = 0; i < vertices.length; i += 3) {
      const hits = [];
      for (let j = 0; j < 3; j++) {
        const a = vertices[i + j], b = vertices[i + (j + 1) % 3];
        if ((a.y > height) === (b.y > height)) continue;
        hits.push(to2(a.clone().lerp(b, (height - a.y) / (b.y - a.y))));
      }
      if (hits.length === 2) lines.push(hits);
    }
  });
  return lines;
}
function rayRadius(center, direction, segments) {
  let best = Infinity;
  for (const [a, b] of segments) {
    const sx = b.x - a.x, sy = b.y - a.y;
    const denominator = direction.x * sy - direction.y * sx;
    if (Math.abs(denominator) < 1e-9) continue;
    const ax = a.x - center.x, ay = a.y - center.y;
    const t = (ax * sy - ay * sx) / denominator;
    const u = (ax * direction.y - ay * direction.x) / denominator;
    if (t > 0 && u >= -1e-8 && u <= 1 + 1e-8) best = Math.min(best, t);
  }
  return best;
}

// Adaptively subdivide only near the pockets. Interpolate the original UVs and
// deform the existing surfaces, preserving the table's materials and profiles.
function deform(mesh, mapPoint, centers, to2, cuts = []) {
  if (globalThis.__POCKET_FIT_DEBUG__) console.log('fit start', mesh.name);
  const old = mesh.geometry, positions = worldVertices(mesh), uv = old.attributes.uv;
  const inverse = mesh.matrixWorld.clone().invert();
  const vertices = [], uvs = [], indices = [], vertexIds = new Map();
  const triangles = [];
  const mapped = new Map();
  function mappedPoint(p) {
    const id = `${p.x}:${p.y}:${p.z}`;
    if (!mapped.has(id)) mapped.set(id, mapPoint(p));
    return mapped.get(id);
  }
  const middle = (a, b) => ({ p: a.p.clone().lerp(b.p, 0.5), uv: [(a.uv[0] + b.uv[0]) / 2, (a.uv[1] + b.uv[1]) / 2] });
  const interpolate = (a, b, t) => ({ p: a.p.clone().lerp(b.p, t), uv: [0, 1].map(i => a.uv[i] + (b.uv[i] - a.uv[i]) * t) });
  function emit(v) {
    const p = mappedPoint(v.p).clone().applyMatrix4(inverse);
    const id = [p.x, p.y, p.z, ...v.uv].map(n => n.toFixed(8)).join(':');
    if (!vertexIds.has(id)) { vertexIds.set(id, vertices.length / 3); vertices.push(p.x, p.y, p.z); uvs.push(...v.uv); }
    indices.push(vertexIds.get(id));
  }
  function emitTriangle(v) {
    const points = v.map(x => to2(x.p));
    const minX = Math.min(...points.map(p => p.x)), maxX = Math.max(...points.map(p => p.x));
    const minY = Math.min(...points.map(p => p.y)), maxY = Math.max(...points.map(p => p.y));
    let polygons = [v];
    for (const cut of cuts) {
      if (Math.hypot(Math.max(minX - cut.point.x, 0, cut.point.x - maxX), Math.max(minY - cut.point.y, 0, cut.point.y - maxY)) > 130) continue;
      const next = [];
      for (const polygon of polygons) {
        const values = polygon.map(vertex => { const p = to2(vertex.p); return (p.x - cut.point.x) * cut.normal.x + (p.y - cut.point.y) * cut.normal.y; });
        if (Math.min(...values) >= -1e-7 || Math.max(...values) <= 1e-7) { next.push(polygon); continue; }
        for (const sign of [-1, 1]) {
          const output = [];
          for (let i = 0; i < polygon.length; i++) {
            const j = (i + 1) % polygon.length;
            if (sign * values[i] >= 0) output.push(polygon[i]);
            if (values[i] * values[j] < 0) output.push(interpolate(polygon[i], polygon[j], values[i] / (values[i] - values[j])));
          }
          if (output.length >= 3) next.push(output);
        }
      }
      polygons = next;
    }
    for (const polygon of polygons) for (let i = 1; i < polygon.length - 1; i++) {
      const triangle = [polygon[0], polygon[i], polygon[i + 1]];
      // Clipping can leave sub-float slivers at nearly coincident planes.
      // They have unreliable normals after Float32 quantization; omit them.
      const p = triangle.map(v => mappedPoint(v.p).clone().applyMatrix4(inverse)).map(p => new THREE.Vector3(Math.fround(p.x), Math.fround(p.y), Math.fround(p.z)));
      if (p[1].clone().sub(p[0]).cross(p[2].clone().sub(p[0])).lengthSq() < 1e-24) continue;
      triangles.push(triangle);
    }
  }
  function split(v, depth = 0) {
    const p = v.map(x => to2(x.p));
    const minX = Math.min(...p.map(q => q.x)), maxX = Math.max(...p.map(q => q.x));
    const minY = Math.min(...p.map(q => q.y)), maxY = Math.max(...p.map(q => q.y));
    const near = centers.some(c => Math.hypot(Math.max(minX - c.x, 0, c.x - maxX), Math.max(minY - c.y, 0, c.y - maxY)) < 190);
    if (!near || depth >= 12) { emitTriangle(v); return; }
    const mids = [middle(v[0], v[1]), middle(v[1], v[2]), middle(v[2], v[0])];
    const lengths = v.map((x, i) => x.p.distanceTo(v[(i + 1) % 3].p) * 1000);
    const errors = mids.map((m, i) => mappedPoint(m.p).distanceTo(mappedPoint(v[i].p).clone().lerp(mappedPoint(v[(i + 1) % 3].p), 0.5)) * 1000);
    let edge = lengths.indexOf(Math.max(...lengths));
    if (lengths[edge] <= 25) edge = errors.indexOf(Math.max(...errors));
    if (lengths.some(n => n > 25) || errors[edge] > EPS) {
      const a = v[edge], b = v[(edge + 1) % 3], c = v[(edge + 2) % 3], m = mids[edge];
      split([a, m, c], depth + 1); split([m, b, c], depth + 1); return;
    }
    const center = { p: v[0].p.clone().add(v[1].p).add(v[2].p).multiplyScalar(1 / 3),
      uv: [0, 1].map(axis => v.reduce((s, x) => s + x.uv[axis], 0) / 3) };
    const average = mappedPoint(v[0].p).clone().add(mappedPoint(v[1].p)).add(mappedPoint(v[2].p)).multiplyScalar(1 / 3);
    if (mappedPoint(center.p).distanceTo(average) * 1000 > EPS) {
      for (let i = 0; i < 3; i++) split([v[i], v[(i + 1) % 3], center], depth + 1);
    } else emitTriangle(v);
  }
  for (let i = 0; i < positions.length; i += 3) split([0, 1, 2].map(j => ({ p: positions[i + j], uv: uv ? [uv.getX(i + j), uv.getY(i + j)] : [0, 0] })));
  // Stitch T-junctions in source space before applying the nonlinear map. A
  // midpoint on one triangle's edge must also exist on its neighbor, otherwise
  // their warped chords leave the dark hairline gaps visible at close range.
  const edgeLines = new Map();
  function edgeLine(a, b) {
    const delta = b.p.clone().sub(a.p), values = delta.toArray();
    const axis = values.map(Math.abs).indexOf(Math.max(...values.map(Math.abs)));
    if (Math.abs(values[axis]) < 1e-12) return null;
    const p = a.p.toArray(), ratios = values.map(v => v / values[axis]);
    const id = [axis, ...ratios.map(v => v.toFixed(7)), ...p.map((v, i) => (v - ratios[i] * p[axis]).toFixed(8))].join(':');
    if (!edgeLines.has(id)) edgeLines.set(id, { axis, values: [] });
    const line = edgeLines.get(id);
    line.values.push(a.p.getComponent(axis), b.p.getComponent(axis));
    return line;
  }
  const edges = triangles.map(v => v.map((a, i) => edgeLine(a, v[(i + 1) % 3])));
  for (const line of edgeLines.values()) line.values = [...new Set(line.values.map(n => Math.round(n * 1e10) / 1e10))].sort((a, b) => a - b);
  triangles.forEach((v, index) => {
    const polygon = [];
    for (let i = 0; i < 3; i++) {
      const a = v[i], b = v[(i + 1) % 3], line = edges[index][i];
      polygon.push(a);
      if (!line) continue;
      const start = a.p.getComponent(line.axis), end = b.p.getComponent(line.axis);
      let left = 0, right = line.values.length;
      while (left < right) { const mid = (left + right) >> 1; if (line.values[mid] <= Math.min(start, end) + 1e-9) left = mid + 1; else right = mid; }
      const values = [];
      for (let j = left; j < line.values.length && line.values[j] < Math.max(start, end) - 1e-9; j++) values.push(line.values[j]);
      if (end < start) values.reverse();
      for (const coordinate of values) polygon.push(interpolate(a, b, (coordinate - start) / (end - start)));
    }
    if (polygon.length === 3) polygon.forEach(emit);
    else {
      const center = { p: polygon.reduce((p, v) => p.add(v.p), new THREE.Vector3()).multiplyScalar(1 / polygon.length),
        uv: [0, 1].map(axis => polygon.reduce((s, v) => s + v.uv[axis], 0) / polygon.length) };
      for (let i = 0; i < polygon.length; i++) [center, polygon[i], polygon[(i + 1) % polygon.length]].forEach(emit);
    }
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices); geometry.computeVertexNormals(); geometry.computeBoundingBox(); geometry.computeBoundingSphere();
  // Keep non-indexed topology for the existing measurement/inspection tools.
  mesh.geometry = geometry.toNonIndexed(); geometry.dispose(); old.dispose();
  if (globalThis.__POCKET_FIT_DEBUG__) console.log('fit end', mesh.name, indices.length / 3);
  return { beforeTriangles: positions.length / 3, afterTriangles: indices.length / 3 };
}

export function fitPocketModel(root, state, report) {
  root.updateMatrixWorld(true);
  const to2 = p => ({ x: (report.origin[0] - p.x) * 1000, y: (report.origin[2] - p.z) * 1000 });
  const from2 = (p, q) => new THREE.Vector3(report.origin[0] - q.x / 1000, p.y, report.origin[2] - q.y / 1000);
  const centers = state.tableColliderSet.pockets.map(p => p.center);
  const cushion = root.getObjectByName('tableCushions');
  const cloth = root.getObjectByName('tableCloth');
  const clothSection = section(cloth, report.surfaceY - 0.000001, to2);
  const stats = [];
  const curves = [];
  cushion.traverse(mesh => {
    if (mesh.isMesh) curves.push(...cushionPaths(mesh, to2, report.surfaceY + state.balls[0].radius / 1000, state));
  });
  const warpCushion = p => {
      const q = to2(p);
      let best;
      const candidates = curves.map(curve => ({ curve, d: Math.hypot(
        Math.max(curve.bounds.minX - q.x, 0, q.x - curve.bounds.maxX),
        Math.max(curve.bounds.minY - q.y, 0, q.y - curve.bounds.maxY)) })).sort((a, b) => a.d - b.d);
      for (const { curve, d } of candidates) {
        if (best && d >= best.hit.distance) break;
        const hit = closest(q, curve.source);
        if (!best || hit.distance < best.hit.distance) best = { curve, hit };
      }
      const { curve, hit } = best;
      // Use a monotone longitudinal coordinate through each source rail. This
      // retains the profile without the nearest-edge bisectors of a coarse jaw.
      const coordinate = q[curve.axis];
      let segment = 1;
      const increasing = curve.source.points.at(-1)[curve.axis] > curve.source.points[0][curve.axis];
      while (segment < curve.source.points.length - 1 && (increasing ? curve.source.points[segment][curve.axis] < coordinate : curve.source.points[segment][curve.axis] > coordinate)) segment++;
      const a = curve.source.points[segment - 1], b = curve.source.points[segment];
      const fraction = Math.max(0, Math.min(1, (coordinate - a[curve.axis]) / (b[curve.axis] - a[curve.axis])));
      const sourcePoint = mix(a, b, fraction);
      hit.x = sourcePoint.x; hit.y = sourcePoint.y;
      hit.s = curve.source.lengths[segment - 1] + fraction * distance(a, b);
      // Keep the original straight rear attachment fixed. Near a pocket the
      // remaining green strip is narrow, so a fixed-distance falloff would move
      // its whole rear edge and expose the wood. Stretch that strip from the
      // exact nose to the unchanged attachment instead.
      const front = curve.outward * sourcePoint[curve.crossAxis];
      const depth = curve.outward * q[curve.crossAxis];
      const width = Math.max(0.001, curve.back - front);
      const weight = 1 - smooth((depth - front) / width);
      if (weight === 0) return p.clone();
      let part = hit.s <= curve.oldBreaks[1] ? 0 : hit.s <= curve.oldBreaks[2] ? 1 : 2;
      const t = (hit.s - curve.oldBreaks[part]) / (curve.oldBreaks[part + 1] - curve.oldBreaks[part]);
      const target = along(curve.target, curve.newBreaks[part] + t * (curve.newBreaks[part + 1] - curve.newBreaks[part]));
      // Translate the local profile. Keeping the offset vector avoids a normal
      // discontinuity at the source model's coarse polygon corners.
      return from2(p, { x: q.x + (target.x - hit.x) * weight, y: q.y + (target.y - hit.y) * weight });
  };
  // Only the green upholstery changes. The timber, leather and nets retain
  // their original geometry; the cloth's rear attachment stays on the timber.
  for (const name of ['tableCushions']) {
    root.getObjectByName(name)?.traverse(mesh => {
      if (!mesh.isMesh) return;
      stats.push({ name: mesh.name, ...deform(mesh, warpCushion, centers, to2,
        name === 'tableCushions' ? curves.flatMap(curve => curve.cuts) : []) });
    });
  }
  const openings = state.tableColliderSet.pockets.map(p => {
    const points = p.dropEdges[0].points;
    return { center: p.center, ends: [points[0], points.at(-1)], segments: points.slice(1).map((q, i) => [points[i], q]) };
  });
  cloth.traverse(mesh => {
    if (!mesh.isMesh) return;
    stats.push({ name: mesh.name, ...deform(mesh, p => {
      const q = to2(p);
      const opening = openings.reduce((best, o) => distance(q, o.center) < distance(q, best.center) ? o : best);
      const r = distance(q, opening.center);
      if (r < 1e-6 || r > 190) return p.clone();
      const direction = { x: (q.x - opening.center.x) / r, y: (q.y - opening.center.y) / r };
      const sourceR = rayRadius(opening.center, direction, clothSection);
      const targetR = rayRadius(opening.center, direction, opening.segments);
      if (!Number.isFinite(sourceR)) return p.clone();
      let shift = targetR - sourceR;
      if (!Number.isFinite(targetR)) {
        const end = opening.ends.map(e => {
          const radius = distance(e, opening.center);
          const dir = { x: (e.x - opening.center.x) / radius, y: (e.y - opening.center.y) / radius };
          return { radius, dir, angle: Math.acos(Math.max(-1, Math.min(1, dir.x * direction.x + dir.y * direction.y))) };
        }).sort((a, b) => a.angle - b.angle)[0];
        if (end.angle >= 0.3) return p.clone();
        shift = (end.radius - rayRadius(opening.center, end.dir, clothSection)) * (1 - smooth(end.angle / 0.3));
      }
      const weight = 1 - smooth((Math.abs(r - sourceR) - 8) / 55);
      const offset = shift * weight;
      return from2(p, { x: q.x + direction.x * offset, y: q.y + direction.y * offset });
    }, centers, to2, openings.flatMap(o => o.segments.flat().map(point => {
      const d = distance(point, o.center);
      return { point, normal: { x: -(point.y - o.center.y) / d, y: (point.x - o.center.x) / d } };
    }))) });
  });
  const renderMeshes=[];
  for(const name of ['table-cloth-part-0','table-cushions-part-0']){const mesh=root.getObjectByName(name);renderMeshes.push({name,...simplifyTableSurface(mesh,state,report)});}
  return { renderMeshes, physicsUnmodified: true, surfaceInterpolationErrorMm: EPS, contactKnotsConstrained: true, meshes: stats };
}
