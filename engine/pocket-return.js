import { createSMPocketModel } from './sm-pocket-model.js';
import * as THREE from 'three';
import { calibratedModelPoint } from './table-calibration.js';
import { measureRebuiltReturns } from './pocket-return-geometry.js';

// Index static geometry once. Each falling ball checks only its current
// cell, and AABB rejection handles triangles at other heights in that cell.
const pocketCellSize = 0.05;
const cellCoordinate = value => Math.floor(value / pocketCellSize);
const cellKey = (x, z) => x * 65536 + z;
const noTriangles = [];

function indexPocketTriangles(triangles, radius) {
  const cells = new Map();
  for (const triangle of triangles) {
    const { min, max } = triangle.bounds;
    for (let x = cellCoordinate(min.x - radius); x <= cellCoordinate(max.x + radius); x++) {
      for (let z = cellCoordinate(min.z - radius); z <= cellCoordinate(max.z + radius); z++) {
        const key = cellKey(x, z);
        if (!cells.has(key)) cells.set(key, []);
        cells.get(key).push(triangle);
      }
    }
  }
  return position => cells.get(cellKey(cellCoordinate(position.x), cellCoordinate(position.z))) || noTriangles;
}

// Metres/seconds. Catcher coordinates measured from pocketBallReturn, then calibrated.
export function createPocketReturn({ meshById, world, surfaceY, pockets, calibration, tableRoot, installLighting = true }) {
  const entries = new Map(), routes = new Map(), active = new Set();
  let lastUpdateSteps = 0;
  function wakeRoute(id) {
    for (const item of entries.values()) if (item.pocketId === id) active.add(item);
  }
  const radius = 0.02625, spacing = 2 * radius + 0.001;
  const up = new THREE.Vector3(0, 1, 0);
  const point = (x, y, z) => calibratedModelPoint(new THREE.Vector3(x, y, z), calibration);
  const netTriangles = [], rimTriangles = [], bedTriangles = [];
  const mouths = pockets.map(pocket => world(pocket.capture?.center || pocket.center, radius));
  const verticesWorld = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  const bounds = new THREE.Box3();
  tableRoot?.updateMatrixWorld(true);
  const rebuiltRoutes = measureRebuiltReturns(tableRoot, radius);
  for (const name of ['pocketNetAssembly', 'tableCloth', 'tableCushions', 'pocketCornerLeather', 'pocketMiddleLeather']) {
    tableRoot?.getObjectByName(name)?.traverse(mesh => {
      if (!mesh.isMesh) return;
      const geometry = mesh.geometry, vertices = geometry.attributes.position;
      const index = geometry.index;
      for (let i = 0; i < (index?.count ?? vertices.count); i += 3) {
        for (let j = 0; j < 3; j++) verticesWorld[j]
          .fromBufferAttribute(vertices, index ? index.getX(i + j) : i + j).applyMatrix4(mesh.matrixWorld);
        bounds.setFromPoints(verticesWorld);
        if (!mouths.some(mouth => bounds.distanceToPoint(mouth) < 0.25)) continue;
        const triangle = new THREE.Triangle().set(...verticesWorld);
        triangle.bounds = bounds.clone();
        const triangles = name === 'pocketNetAssembly' ? netTriangles : name === 'tableCloth' ? bedTriangles : rimTriangles;
        triangles.push(triangle);
      }
    });
  }
  for (const pocket of pockets) {
    const mouth = world(pocket.capture?.center || pocket.center, radius);
    const middle = pocket.type === 'middle' || pocket.id.startsWith('middle');
    const side = Math.sign(mouth.x) || 1, direction = middle ? -1 : -side;
    const startX = middle ? -0.0006 : side * 1.815;
    const z = Math.sign(mouth.z) * (middle ? 0.9493 : 0.9183);
    // The replacement table carries its catcher orientation with the model.
    // Apply the same rigid rotation to the chute and rolling track; the mouth stays fixed.
    const rotation = middle ? (tableRoot?.userData.middlePocketReturnRotation || 0) : 0;
    const pivotX = tableRoot?.userData.middlePocketReturnPivotX ?? -0.000712;
    const pivotZ = Math.sign(z) * (z > 0 ? 0.9495 : 0.9507);
    const returnPoint = (x,y,z) => {
      if (!rotation) return point(x,y,z);
      const dx=x-pivotX,dz=z-pivotZ,c=Math.cos(rotation),s=Math.sin(rotation);
      return point(pivotX+c*dx-s*dz,y,pivotZ+s*dx+c*dz);
    };
    const {net, bend, start, end} = rebuiltRoutes?.get(pocket.id) ?? {
      net: returnPoint(startX, 0.708, z),
      bend: returnPoint(startX - direction * 0.004, 0.652, z),
      start: returnPoint(startX + direction * 0.035, 0.608, z),
      end: returnPoint(middle ? -0.278 : side * 1.54, 0.558, z),
    };
    const curve = new THREE.LineCurve3(start, end);
    const edge = pocket.dropEdges?.find(edge => edge.role === 'pocket-drop-edge');
    const dropEdge = (edge?.points || []).slice(1).map((p, i) =>
      new THREE.Line3(world(edge.points[i]), world(p)));
    routes.set(pocket.id, { id: pocket.id, middle, mouth, net, bend, start, end, curve,
      dropEdge, fallRadius: Math.max(0.065, pocket.capture.radius / 1000 + radius),
      netSurface: indexPocketTriangles(netTriangles.filter(t => t.bounds.distanceToPoint(mouth) < 0.25), radius),
      rim: indexPocketTriangles(rimTriangles.filter(t => t.bounds.distanceToPoint(mouth) < 0.15 + radius), radius),
      bed: indexPocketTriangles(bedTriangles.filter(t => t.bounds.distanceToPoint(mouth) < 0.15 + radius), radius),
      length: curve.getLength(), capacity: Math.floor(curve.getLength() / spacing) });
  }
  const fallModel = createSMPocketModel({surfaceY, radius});
  // Ball meshes share colour materials. Set the occlusion uniform per draw,
  // otherwise one potted red darkens every red still on the cloth.
  for (const mesh of installLighting ? meshById.values() : []) {
    const before = mesh.onBeforeRender;
    lighting(mesh, 1);
    mesh.onBeforeRender = function (...args) {
      before?.apply(this, args);
      const material = args[4] || this.material;
      if (material?.uniforms?.pocketLight) {
        material.uniforms.pocketLight.value = this.userData.pocketLight;
        material.uniformsNeedUpdate = true;
      }
    };
  }
  function load(id) { return [...entries.values()].filter(e => e.pocketId === id).length; }
  function lighting(mesh, value) {
    mesh.userData.pocketLight = value;
  }
  function capture(events, state) {
    for (const event of events) {
      if (!['ball-potted', 'cue-ball-potted'].includes(event.type)) continue;
      const ball = state.balls.find(b => b.id === event.ballId), mesh = meshById.get(event.ballId);
      const source = routes.get(event.pocketId);
      if (!ball || !mesh || !source || entries.has(ball.id)) continue;
      // Reservations include balls still falling, so rapid successive pots cannot overbook.
      const destination = load(source.id) < source.capacity ? source : [...routes.values()]
        .filter(r => load(r.id) < r.capacity).sort((a, b) => load(a.id) - load(b.id))[0] || source;
      const velocity = event.entryVelocity || { x: 0, y: 0 };
      const spin = event.entryAngularVelocity || { x: 0, y: 0, z: 0 };
      entries.set(ball.id, { id: ball.id, sourceId: source.id, pocketId: destination.id,
        source, route: destination, phase: 'fall',
        // Physics may advance several substeps before this rendered frame. A
        // mesh still shows the PREVIOUS frame, potentially far from the mouth
        // during a hard shot. Start at the recorded crossing, not that stale pose.
        position: event.entryPosition ? world(event.entryPosition, Number.isFinite(event.entryHeight) ? event.entryHeight / 1000 : radius) : mesh.position.clone(),
        velocity: new THREE.Vector3(-velocity.x / 1000, (event.entryVerticalVelocity || 0) / 1000, -velocity.y / 1000),
        limitClothReboundHeight: event.limitClothReboundHeight,
        spin: new THREE.Vector3(spin.x || 0, -(spin.z || 0), spin.y || 0),
        distance: 0, speed: 0, moving: true, contacts: 0, netCaught: false });
      fallModel.capture(entries.get(ball.id));
      wakeRoute(destination.id);
    }
  }
  function impact(item) {
    item.contacts++;
  }
  function render(item, previous) {
    const mesh = meshById.get(item.id);
    const delta = item.position.clone().sub(previous);
    if (item.phase !== 'fall') {
      const axis = up.clone().cross(delta);
      if (axis.lengthSq() > 1e-12) mesh.quaternion.premultiply(new THREE.Quaternion()
        .setFromAxisAngle(axis.normalize(), Math.hypot(delta.x, delta.z) / radius));
    }
    mesh.position.copy(item.position); mesh.visible = true;
    mesh.scale.setScalar(mesh.userData.baseScale);
    // No ceiling cubemap/specular below the slab. Only subdued diffuse remains.
    lighting(mesh, THREE.MathUtils.smoothstep(item.position.y, surfaceY - radius, surfaceY + radius));
  }
  function enterChute(item) {
    impact(item);
    const source = item.source, target = item.route;
    if (source !== target) {
      // Cross-pocket collection is instantaneous once the source net catches
      // the ball. Put it directly behind the destination's reserved balls.
      const leaders = [...entries.values()].filter(e => e !== item && e.pocketId === item.pocketId && e.phase === 'track');
      item.distance = leaders.length ? Math.max(0, Math.min(...leaders.map(e => e.distance)) - spacing) : target.length;
      item.position.copy(target.curve.getPointAt(item.distance / target.length));
      item.velocity.set(0, 0, 0); item.spin.set(0, 0, 0);
      item.speed = 0; item.phase = 'track'; item.moving = false;
      return;
    }
    if (item.position.distanceToSquared(target.start) < 1e-16) {
      item.velocity.set(0, 0, 0);
      item.phase = 'track';
      return;
    }
    item.chute = fallModel.chuteCurve(item);
    item.chute.arcLengthDivisions = 160;
    item.chuteLength = item.chute.getLength(); item.travel = 0;
    const tangent = item.chute.getTangentAt(0);
    // The catcher absorbs motion into the net. The chute inherits only the
    // remaining downhill component at the exact same ball-centre position.
    item.speed = THREE.MathUtils.clamp(item.velocity.dot(tangent), 0, 1.2);
    item.velocity.copy(tangent).multiplyScalar(item.speed);
    item.phase = 'chute';
  }
  function stepCollection(item, h) {
    const previous = item.position.clone();
    if (item.phase === 'chute') {
      const tangent = item.chute.getTangentAt(Math.min(1, item.travel / item.chuteLength));
      item.speed = THREE.MathUtils.clamp(item.speed + (9.81 * Math.max(0, -tangent.y) / 1.4 - 2 * item.speed) * h,
        0, 1.2);
      let limit = item.chuteLength;
      for (const other of entries.values()) {
        if (other === item || other.pocketId !== item.pocketId) continue;
        if (other.phase === 'track') limit = Math.min(limit, item.chuteLength + other.distance - spacing);
        if (other.phase === 'chute' && other.sourceId === item.sourceId && other.order < item.order)
          limit = Math.min(limit, item.chuteLength - (other.chuteLength - other.travel) - spacing);
      }
      // Wait inside the chute, below the table, when the receiving rail is occupied.
      const nextTravel = item.travel + item.speed * h;
      item.travel = Math.max(item.travel, Math.min(Math.max(0, limit), nextTravel));
      if (item.travel < nextTravel && limit < item.chuteLength) item.speed = 0;
      item.position.copy(item.chute.getPointAt(item.travel / item.chuteLength));
      if (item.travel >= item.chuteLength) { item.phase = 'track'; item.distance = 0; }
    } else {
      const leaders = [...entries.values()].filter(e => e !== item && e.pocketId === item.pocketId
        && e.phase === 'track' && (e.distance > item.distance || (e.distance === item.distance && e.order < item.order)));
      const leader = leaders.sort((a, b) => a.distance - b.distance)[0];
      const limit = leader ? Math.max(0, leader.distance - spacing) : item.route.length;
      const tangent = item.route.curve.getTangentAt(0);
      item.speed = Math.min(0.85, item.speed + (9.81 * Math.max(0, -tangent.y) / 1.4 - 1.8 * item.speed) * h);
      item.distance = Math.min(limit, item.distance + item.speed * h);
      if (item.distance >= limit) {
        if (item.speed > 0.12) impact(item);
        item.speed = 0;
      }
      item.position.copy(item.route.curve.getPointAt(item.distance / item.route.length));
      item.moving = limit - item.distance > 1e-5 || Boolean(leader?.moving);
      // Sleep only at exact rest, after the leading ball has also stopped.
      // Keep the static reservation/mesh for display and following arrivals.
      if (item.distance >= limit && (!leader || !active.has(leader))) active.delete(item);
    }
    const tangent = item.phase === 'chute'
      ? item.chute.getTangentAt(item.travel / item.chuteLength) : item.route.curve.getTangentAt(0);
    item.velocity.copy(tangent).multiplyScalar(item.speed);
    render(item, previous);
  }
  function update(dt, state) {
    lastUpdateSteps = 0;
    for (const [id, item] of entries) {
      if (!state.balls.find(b => b.id === id)?.potted) {
        lighting(meshById.get(id), 1); entries.delete(id); active.delete(item);
        wakeRoute(item.pocketId);
      }
    }
    if (!active.size || !Number.isFinite(dt) || dt <= 0) return;
    // Drop hidden-tab wall time instead of teleporting through seconds of animation.
    const elapsed = Math.min(dt, 0.1);
    let order = 0;
    for (const item of entries.values()) item.order = order++;
    const modelItems = new Set();
    for (const item of active) if (item.phase === 'fall') {
      modelItems.add(item);
      const previous = item.position.clone(), mesh = meshById.get(item.id);
      const rotation = new THREE.Quaternion(), axis = new THREE.Vector3();
      const remainder = fallModel.advance(item, elapsed, (spin, h) => {
        const speed = spin.length();
        if (speed > 1e-8) mesh.quaternion.premultiply(rotation.setFromAxisAngle(axis.copy(spin).multiplyScalar(1 / speed), speed * h));
      });
      render(item, previous); lastUpdateSteps++;
      if (remainder !== null) {
        item.netCaught = true; enterChute(item);
        if (item.source !== item.route) {
          render(item, item.position);
        } else if (remainder > 1e-10) {
          const steps = Math.ceil(remainder * 60);
          for (let i = 0; i < steps; i++) stepCollection(item, remainder / steps);
        }
      }
    }
    const steps = Math.max(1, Math.ceil(elapsed * 60)), h = elapsed / steps;
    for (let i = 0; i < steps; i++) {
      // Entry order is stable even when a sleeping predecessor is reactivated.
      for (const item of entries.values()) if (active.has(item) && !modelItems.has(item)) { stepCollection(item, h); lastUpdateSteps++; }
    }
  }
  return {
    routeDiagnostics:()=>[...routes.values()].map(r=>({id:r.id,middle:r.middle,start:r.start.toArray(),end:r.end.toArray(),net:r.net.toArray(),length:r.length,capacity:r.capacity})), reset(){for(const mesh of meshById.values())lighting(mesh,1);entries.clear();active.clear();lastUpdateSteps=0;}, capture, update, activity: () => ({ active: active.size, total: entries.size, lastUpdateSteps }), has: id => entries.has(id),
    isMoving: () => [...entries.values()].some(e => e.moving),
    // Once caught below the table, collection is independent of shot readiness.
    // Full-pocket transfers can take several seconds and must run in background.
    isBlockingShot: () => [...entries.values()].some(e => e.phase === 'fall'),
    diagnostics: () => [...entries.values()].map(e => ({ id: e.id, sourceId: e.sourceId,
      model: 'sm-pocket', pocketModel: { ...e.pocketModel },
      pocketId: e.pocketId, phase: e.phase, netCaught: e.netCaught, contacts: e.contacts, velocity: e.velocity.toArray(), capacity: e.route.capacity,
      distance: e.distance, length: e.route.length, moving: e.moving,
      position: e.position.toArray(), scale: meshById.get(e.id).scale.x })) };
}
