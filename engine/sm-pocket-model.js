import * as THREE from 'three';
import { createNetChuteCurve } from './pocket-net-path.js';

// PocketPutManager + five-line pocket world, reconstructed from the reference
// ARM64 methods and serialized values. Provenance and native numerical fixtures:
// Fixtures: apps/three-game/tests/pocket/sm-pocket-math.fixture.json. Only confirmed pots enter.
export const SM_POCKET = Object.freeze({
  fallingSpeed: .5, speedInfluence: 1, exitSpeed: .5,
  exitHeightFromCloth: 7.849999904632568 - 7.941400051116943,
  fixedStep: .029999999329447746, minEntrySpeed: .30000001192092896,
  wallCount: 5, wallLength: 1, restitution: .5, friction: .2, yawDrag: 25,
  openingFraction: 1,
});

// Sphere-first/static-line branch of CollisionResolution.ResolveCollision3.
// n points from sphere towards contact; t = cross(n, up). Compare native fixtures.
export function resolveSMPocketWall(velocity, spin, nx, nz, radius) {
  const vn = velocity.x * nx + velocity.z * nz;
  if (vn <= 0) return;
  const tx = -nz, tz = nx, vt = velocity.x * tx + velocity.z * tz;
  const normalImpulsePerMass = (1 + SM_POCKET.restitution) * vn;
  const frictionLimit = SM_POCKET.friction * normalImpulsePerMass;
  const slip = vt - radius * spin.y;
  const jt = -Math.sign(slip) * Math.min(frictionLimit, Math.abs(slip) / 3.5);
  velocity.x += -normalImpulsePerMass * nx + jt * tx;
  velocity.z += -normalImpulsePerMass * nz + jt * tz;
  spin.y -= jt * 2.5 / radius;
  const wt = spin.x * tx + spin.z * tz;
  const change = -Math.sign(wt) * Math.min(Math.abs(wt), frictionLimit * 2.5 / radius);
  spin.x += change * tx; spin.z += change * tz;
}

export function advanceSMPocketSpin(spin, dt) {
  spin.y = Math.sign(spin.y) * Math.max(0, Math.abs(spin.y) - SM_POCKET.yawDrag * dt);
}

export function createSMPocketReferenceModel({ surfaceY, radius, routes }) {
  const configs = new Map();
  for (const route of routes) {
    const centre = route.mouth, R = route.triggerRadius + radius;
    const dx = -route.inwardDirection.x, dz = -route.inwardDirection.z;
    const walls = [];
    // Unity Quaternion.AngleAxis(+a, up): (x,z) -> (c*x+s*z,-s*x+c*z).
    const a = Math.asin(SM_POCKET.openingFraction), c = Math.cos(a), s = Math.sin(a);
    const ax = R * (c * dx + s * dz), az = R * (-s * dx + c * dz);
    const threshold = Math.hypot(ax - 2 * R * dx, az - 2 * R * dz);
    for (let i = 0; i < SM_POCKET.wallCount; i++) {
      const angle = i * Math.PI * 2 / SM_POCKET.wallCount;
      const nx = Math.cos(angle) * dx + Math.sin(angle) * dz;
      const nz = -Math.sin(angle) * dx + Math.cos(angle) * dz;
      const x = centre.x + R * nx, z = centre.z + R * nz, tx = -nz, tz = nx;
      walls.push({ x, z, nx, nz, tx, tz,
        opens: Math.hypot(R * nx - 2 * R * dx, R * nz - 2 * R * dz) < threshold });
    }
    configs.set(route.id, { id: route.id, centre, R, dx, dz, walls });
  }
  const exitY = surfaceY + SM_POCKET.exitHeightFromCloth;
  let remainder = 0;
  function capture(item) {
    let config, nearest = Infinity;
    for (const c of configs.values()) {
      const d = Math.hypot(item.position.x - c.centre.x, item.position.z - c.centre.z);
      if (d < nearest) { nearest = d; config = c; }
    }
    const allowed = config.R - radius;
    if (nearest > allowed) {
      item.position.x = config.centre.x + (item.position.x - config.centre.x) * allowed / nearest;
      item.position.z = config.centre.z + (item.position.z - config.centre.z) * allowed / nearest;
    }
    item.velocity.y = 0;
    const speed = Math.hypot(item.velocity.x, item.velocity.z);
    if (speed < SM_POCKET.minEntrySpeed) {
      // Unity Vector3.normalized returns zero at magnitude <= 1e-5.
      if (speed > 1e-5) item.velocity.multiplyScalar(SM_POCKET.minEntrySpeed / speed);
      else item.velocity.set(0, 0, 0);
    }
    item.pocketModel = { config, exiting: false, fixedUpdates: 0, wallHits: 0, previousHeight: item.position.y };
  }
  function fixedUpdate(item, dt) {
    const b = item.pocketModel, c = b.config;
    b.previousHeight = item.position.y;
    if (item.position.y > exitY) {
      item.position.y = Math.max(exitY, item.position.y - Math.max(SM_POCKET.fallingSpeed,
        SM_POCKET.fallingSpeed * SM_POCKET.speedInfluence * Math.hypot(item.velocity.x, item.velocity.z)) * dt);
    } else {
      item.velocity.set(c.dx * SM_POCKET.exitSpeed, 0, c.dz * SM_POCKET.exitSpeed);
      b.exiting = true;
      if (Math.hypot(item.position.x - c.centre.x, item.position.z - c.centre.z) > 2 * (c.R + radius)) return true;
    }
    b.fixedUpdates++;
    return false;
  }
  function flight(item, time, rotate) {
    item.position.x += item.velocity.x * time; item.position.z += item.velocity.z * time;
    rotate?.(item.spin, time);
    advanceSMPocketSpin(item.spin, time);
  }
  function advance(item, dt, fixedSteps, rotate) {
    for (let i = 0; i < fixedSteps; i++) if (fixedUpdate(item, SM_POCKET.fixedStep)) return true;
    let remaining = dt;
    // Continuous sphere/finite-line contacts: no timestep-dependent tunnelling.
    // Restitution loses energy. Guard numerical corruption instead of hanging.
    let iterations = 0;
    while (remaining > 1e-10) {
      let first = remaining + 1, hit = null, hx = 0, hz = 0;
      for (const wall of item.pocketModel.config.walls) {
        if (item.pocketModel.exiting && wall.opens) continue;
        const vn = item.velocity.x * wall.nx + item.velocity.z * wall.nz;
        if (vn > 1e-10) {
          const distance = (wall.x - item.position.x) * wall.nx + (wall.z - item.position.z) * wall.nz;
          const time = Math.max(0, (distance - radius) / vn);
          const along = (item.position.x + item.velocity.x * time - wall.x) * wall.tx
            + (item.position.z + item.velocity.z * time - wall.z) * wall.tz;
          if (time <= remaining && time < first && Math.abs(along) <= SM_POCKET.wallLength / 2) {
            first = time; hit = wall; hx = wall.nx; hz = wall.nz;
          }
        }
        // Capsule end caps. Usually far outside the pocket, but retained to
        // match the finite original segments, including high-speed exits.
        for (const sign of [-1, 1]) {
          const ex = wall.x + sign * wall.tx * SM_POCKET.wallLength / 2;
          const ez = wall.z + sign * wall.tz * SM_POCKET.wallLength / 2;
          const ox = item.position.x - ex, oz = item.position.z - ez;
          const aa = item.velocity.x ** 2 + item.velocity.z ** 2;
          const bb = ox * item.velocity.x + oz * item.velocity.z;
          const cc = ox * ox + oz * oz - radius * radius, disc = bb * bb - aa * cc;
          if (aa <= 1e-16 || bb >= 0 || disc < 0) continue;
          const time = Math.max(0, (-bb - Math.sqrt(disc)) / aa);
          if (time > remaining || time >= first) continue;
          const nx = ex - item.position.x - item.velocity.x * time;
          const nz = ez - item.position.z - item.velocity.z * time, length = Math.hypot(nx, nz);
          first = time; hit = wall; hx = nx / length; hz = nz / length;
        }
      }
      if (!hit) { flight(item, remaining, rotate); break; }
      flight(item, first, rotate); remaining -= first;
      resolveSMPocketWall(item.velocity, item.spin, hx, hz, radius);
      item.contacts++; item.pocketModel.wallHits++;
      // Roundoff separation only, less than a millionth of a millimetre.
      item.position.x -= hx * 1e-10; item.position.z -= hz * 1e-10;
      if (++iterations > 100) throw new Error('SM pocket collision iteration limit');
    }
    return false;
  }
  return { id: 'sm-pocket', capture, advance,
    interpolationAlpha: () => remainder / SM_POCKET.fixedStep,
    ticks(dt) { remainder += dt; const n = Math.floor((remainder + 1e-10) / SM_POCKET.fixedStep); remainder -= n * SM_POCKET.fixedStep; return n; },
    reset() { remainder = 0; },
    diagnostics: () => ({ exitY, configs: [...configs.values()].map(c => ({ id: c.id, radius: c.R, walls: c.walls.map(w => ({...w})) })) }),
  };
}

// Confirmed pots are presentation bodies. All distances are world metres.
const GRAVITY = 9.81;
const MAX_FALL_STEP = 1 / 240;
const MIN_FALL_STEP = 1 / 1920;
const CONTACT_SLOP = 1e-7;
const LIP_ROUNDING = 0.0005;

export function createSMPocketModel({ surfaceY, radius }) {
  const next = new THREE.Vector3();
  const closest = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const edge = new THREE.Vector3();
  const horizontal = new THREE.Vector3();
  const contact = new THREE.Vector3();
  const lipNormal = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  const beforeBed = new THREE.Vector3();

  function sampleLip(position, source) {
    horizontal.set(position.x, surfaceY, position.z);
    let nearest = Infinity;
    for (const segment of source.dropEdge) {
      segment.closestPointToPoint(horizontal, true, closest);
      const distance = closest.distanceToSquared(horizontal);
      if (distance < nearest) {
        nearest = distance;
        edge.copy(closest);
      }
    }
    lipNormal.copy(source.mouth).sub(edge).setY(0).normalize();
    return lipNormal.dot(horizontal.sub(edge));
  }

  function supportAtLip(item) {
    if (item.pocketModel.clearedLip || item.source.dropEdge.length === 0) return;
    let depth = sampleLip(next, item.source);
    if (depth >= radius || item.position.y < surfaceY) {
      item.pocketModel.clearedLip = true;
      return;
    }
    // An accepted pot cannot go back onto the cloth after a jaw rebound.
    // Cancel retreat at the lip, keeping tangential and vertical motion.
    if (depth < 0) {
      const approach = item.velocity.dot(lipNormal);
      if (approach < 0) {
        next.addScaledVector(lipNormal, CONTACT_SLOP - depth);
        item.velocity.addScaledVector(lipNormal, -approach);
        depth = CONTACT_SLOP;
      }
    }
    // The cloth folds over a rounded edge. This also lets a confirmed ball
    // at rest on the nominal line tip under gravity without an inward kick.
    const overhang = Math.max(0, Math.min(radius, depth + LIP_ROUNDING));
    const height = Math.sqrt(radius * radius - overhang * overhang);
    if (next.y >= surfaceY + height) return;
    // After a jaw contact, the nearest lip segment can switch sides.
    // Preserve the achieved depth instead of raising the sphere back onto
    // that segment. The lip clearance below resolves the lateral contact.
    next.y = Math.min(item.position.y, surfaceY + height);
    normal.copy(lipNormal).multiplyScalar(overhang / radius).setY(height / radius);
    const approach = item.velocity.dot(normal);
    if (approach < 0) item.velocity.addScaledVector(normal, -approach);
    // Sliding back across the curved support must not turn into upward
    // velocity and repeatedly restart the confirmed drop.
    item.velocity.y = Math.min(0, item.velocity.y);
  }

  function keepInsideLip(item) {
    const height = next.y - surfaceY;
    if ((!item.pocketModel.clearedLip && !item.pocketModel.rimContact)
      || !item.pocketModel.atLip || Math.abs(height) >= radius) return;
    // While the sphere still overlaps the cloth's height, its cross-section
    // must fit past the lip. A return impact loses its tableward component
    // here, before the solver can push the ball up onto the playing surface.
    const depth = sampleLip(next, item.source);
    const clearance = Math.sqrt(radius * radius - height * height);
    if (depth >= clearance) return;
    next.addScaledVector(lipNormal, clearance - depth + CONTACT_SLOP);
    const approach = item.velocity.dot(lipNormal);
    if (approach < 0) item.velocity.addScaledVector(lipNormal, -approach);
  }

  function deepestContact(candidates, horizontalCenter = null) {
    let minDistanceSq = radius * radius;
    for (const triangle of candidates(next)) {
      if (triangle.bounds.clampPoint(next, closest).distanceToSquared(next) >= minDistanceSq) continue;
      triangle.closestPointToPoint(next, closest);
      const distanceSq = next.distanceToSquared(closest);
      if (distanceSq < minDistanceSq) {
        minDistanceSq = distanceSq;
        contact.copy(closest);
      }
    }
    if (minDistanceSq === radius * radius) return false;
    const distance = Math.sqrt(minDistanceSq);
    normal.copy(next).sub(contact);
    if (horizontalCenter) {
      const clearance = Math.sqrt(Math.max(0, radius * radius - normal.y * normal.y));
      const horizontalDistance = normal.setY(0).length();
      if (horizontalDistance < CONTACT_SLOP) normal.copy(horizontalCenter).sub(contact).setY(0).normalize();
      else normal.multiplyScalar(1 / horizontalDistance);
      if (normal.lengthSq() === 0) return false;
      next.addScaledVector(normal, clearance - horizontalDistance + CONTACT_SLOP);
    } else {
      if (distance < CONTACT_SLOP) normal.copy(up);
      else normal.multiplyScalar(1 / distance);
      next.addScaledVector(normal, radius - distance + CONTACT_SLOP);
    }
    return true;
  }

  function rebound(item, restitution, rim = false) {
    const approach = item.velocity.dot(normal);
    if (approach >= 0) return;
    const verticalBefore = item.velocity.y;
    // Lose energy at the wall, including some tangential motion.
    item.velocity.addScaledVector(normal, -approach).multiplyScalar(0.8)
      .addScaledVector(normal, -restitution * approach);
    // An accepted ball can rebound along the leather, but a sloped rim face
    // should not launch it back above the bed.
    if (rim && verticalBefore <= 0) item.velocity.y = Math.min(0, item.velocity.y);
    item.spin.multiplyScalar(0.8);
    item.pocketModel.wallHits++;
    item.contacts++;
  }

  function containOutsideModel(item) {
    // Replays and standalone tables may have no wall geometry. The local
    // envelope also closes gaps between the leather and the net meshes.
    normal.copy(next).sub(item.source.mouth).setY(0);
    const distance = normal.length();
    const limit = item.source.fallRadius;
    if (distance <= limit) return;
    normal.multiplyScalar(-1 / distance);
    if (item.velocity.dot(normal) >= 0) return;
    horizontal.copy(item.position).sub(item.source.mouth).setY(0);
    // An older event can already start outside this envelope. Keep its pose.
    next.addScaledVector(normal, Math.max(0, distance - Math.max(limit, horizontal.length())));
    rebound(item, 0.5);
  }

  function advance(item, dt, rotate) {
    const model = item.pocketModel;
    let remaining = dt;
    while (remaining > 1e-10) {
      // Slow motion needs only the base step. Shorten fast steps so the
      // sphere cannot cross a pocket surface between contact checks.
      const h = Math.min(remaining, MAX_FALL_STEP, Math.max(MIN_FALL_STEP,
        (radius * 0.2) / (item.velocity.length() + GRAVITY * MAX_FALL_STEP)));
      remaining -= h;
      next.copy(item.position).addScaledVector(item.velocity, h);
      next.y -= 0.5 * GRAVITY * h * h;
      item.velocity.y -= GRAVITY * h;
      supportAtLip(item);
      keepInsideLip(item);
      for (let pass = 0; pass < 4 && deepestContact(item.source.rim, item.source.mouth); pass++) {
        model.rimContact = true;
        rebound(item, 0.45, true);
        keepInsideLip(item);
      }
      containOutsideModel(item);
      const horizontalCenter = model.clearedLip || model.rimContact ? item.source.mouth : null;
      beforeBed.copy(next);
      if (deepestContact(item.source.bed, horizontalCenter)) {
        if (next.y > item.position.y + CONTACT_SLOP) {
          next.copy(beforeBed);
          deepestContact(item.source.bed, item.source.mouth);
        }
        const approach = item.velocity.dot(normal);
        if (approach < 0) item.velocity.addScaledVector(normal, -approach);
        item.velocity.y = Math.min(0, item.velocity.y);
      }
      keepInsideLip(item);
      const caught = next.y <= surfaceY - radius && deepestContact(item.source.netSurface);
      if (caught) {
        const approach = Math.min(0, item.velocity.dot(normal));
        item.velocity.addScaledVector(normal, -approach).multiplyScalar(0.55);
      }
      if (item.limitClothReboundHeight && next.y >= surfaceY + radius) {
        next.y = surfaceY + radius;
        item.velocity.y = Math.min(0, item.velocity.y);
      }
      item.position.copy(next);
      rotate?.(item.spin, h);
      model.fixedUpdates++;
      if (caught || next.y <= item.source.net.y) {
        model.exitReason = 'visible-net';
        model.catchSurface = caught ? 'fabric' : 'collector';
        return remaining;
      }
    }
    return null;
  }

  return {
    capture(item) {
      // Historical or synthetic events may start outside the finite lip.
      const atLip = item.source.dropEdge.length > 0 && sampleLip(item.position, item.source) >= -LIP_ROUNDING / 2;
      // A confirmed cloth rebound has already been resolved by the live solver.
      // Let it descend while the lip still confines its horizontal motion.
      const confirmedClothRebound = item.limitClothReboundHeight === true;
      if (confirmedClothRebound) item.velocity.y = Math.min(0, item.velocity.y);
      item.pocketModel = { atLip, clearedLip: confirmedClothRebound || !atLip || item.position.y < surfaceY,
        fixedUpdates: 0, wallHits: 0 };
    },
    advance,
    chuteCurve(item) {
      const points = [item.position.clone()];
      if (item.position.y > item.source.net.y) points.push(item.source.net);
      if (item.position.y > item.source.bend.y) points.push(item.source.bend);
      points.push(item.route.start);
      return createNetChuteCurve(points);
    },
  };
}
