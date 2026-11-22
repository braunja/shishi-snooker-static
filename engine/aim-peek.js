// Camera-only overdrag: never changes the shot direction or prediction input.
export const MIN_AIM_HEIGHT = 0.12;
export const MAX_AIM_HEIGHT = 2.6;
export const PEEK_FULL_DRAG_PX = 180;
export function dragAimView(height, peekPx, dy, sensitivity) {
  let remaining = dy * 1.5;
  let peek = peekPx;
  if (remaining < 0 && peek > 0) {
    const consumed = Math.min(peek, -remaining);
    peek -= consumed;
    remaining += consumed;
  }
  const scale = 0.008 * sensitivity;
  if (remaining > 0) {
    const consumed = Math.min(remaining, Math.max(0, height - MIN_AIM_HEIGHT) / scale);
    height -= consumed * scale;
    peek = Math.min(PEEK_FULL_DRAG_PX, peek + remaining - consumed);
  } else {
    height -= remaining * scale;
  }
  return { height: Math.max(MIN_AIM_HEIGHT, Math.min(MAX_AIM_HEIGHT, height)), peekPx: peek };
}
export function peekAngle(direction, targetDirection, peekPx, orbitRadiusMm = 0, values = {}) {
  if (!direction || !targetDirection) return 0;
  const cross = direction.x * targetDirection.y - direction.y * targetDirection.x;
  const dot = direction.x * targetDirection.x + direction.y * targetDirection.y;
  const ratio = Math.max(0, Math.min(1, peekPx / PEEK_FULL_DRAG_PX));
  const angleLimit = Math.atan2(cross, dot) * (values.peekTargetAngleRatio ?? 1/3);
  // The eye orbits a ghost centre on the shot axis: lateral travel = R * sin(angle).
  const lateralMm = (values.peekTargetLateralCm ?? 40)*10;
  const lateralLimit = lateralMm<=0 ? 0 : orbitRadiusMm > lateralMm ? Math.asin(lateralMm / orbitRadiusMm) : Math.PI / 2;
  return Math.sign(angleLimit) * Math.min(Math.abs(angleLimit), lateralLimit) * ratio;
}
export function rotatePeekDirection(direction, angle) {
  return { x: direction.x * Math.cos(angle) - direction.y * Math.sin(angle),
    y: direction.x * Math.sin(angle) + direction.y * Math.cos(angle) };
}

export function peekLiftMetres(peekPx, values = {}) {
  return ((values.peekTargetLiftCm ?? 20)-(values.peekTargetLowerCm ?? 0))/100 * Math.max(0, Math.min(1, peekPx / PEEK_FULL_DRAG_PX));
}
// Exact critically damped response: position and velocity survive target changes.
// 55 ms time constant gives a short acceleration/deceleration without oscillation.
export function stepPeekMotion(motion, targetPx, dt) {
  const target = Math.max(0, Math.min(PEEK_FULL_DRAG_PX, targetPx));
  const omega = 1 / 0.055;
  const t = Math.max(0, dt);
  const offset = motion.position - target;
  const c = motion.velocity + omega * offset;
  const decay = Math.exp(-omega * t);
  let position = target + (offset + c * t) * decay;
  let velocity = (motion.velocity - omega * c * t) * decay;
  if (position < 0 || position > PEEK_FULL_DRAG_PX) {
    position = Math.max(0, Math.min(PEEK_FULL_DRAG_PX, position));
    velocity = 0;
  }
  if (Math.abs(position - target) < 0.02 && Math.abs(velocity) < 0.2) {
    position = target; velocity = 0;
  }
  return {position, velocity};
}

export const AIM_INERTIA_MS = 200;
export function startAimInertia(height, drag, releasedAt, peekPx) {
  if (!drag || drag.axis !== 'y' || peekPx > 0) return null;
  // macOS three-finger drag delays mouse release; touch/pen release is direct.
  const graceMs = drag.pointerType === 'mouse' ? 650 : 120;
  if (releasedAt - (drag.lastHeightMotionTime ?? drag.lastTime) > graceMs) return null;
  const velocity = Math.max(-0.0012, Math.min(0.0012, drag.heightVelocity || 0));
  if (Math.abs(velocity) < 0.00001) return null;
  return {height, velocity, startedAt:releasedAt};
}
export function sampleAimInertia(inertia, now) {
  const t = Math.max(0, Math.min(1, (now-inertia.startedAt)/AIM_INERTIA_MS));
  // Velocity starts at the release speed and reaches zero within 200 ms.
  const height = Math.max(MIN_AIM_HEIGHT, Math.min(MAX_AIM_HEIGHT,
    inertia.height + inertia.velocity*AIM_INERTIA_MS/3*(1-(1-t)**3)));
  return {height, done:t>=1 || height===MIN_AIM_HEIGHT || height===MAX_AIM_HEIGHT};
}

export function orbitPeekPoint(point, ghostCenter, angle) {
  const offset = rotatePeekDirection({x:point.x-ghostCenter.x,y:point.y-ghostCenter.y}, angle);
  return {x:ghostCenter.x+offset.x,y:ghostCenter.y+offset.y};
}

// Only a contact identity change gets an extra transition. Normal Peek dragging
// and release use the existing peekMotion directly, without another follow filter.
export function stepPeekOffsets(current, target, dt, targetId = null, ratio = 1) {
  const keys = ['eyeForward','eyeSide','focusForward','focusSide','eyeLift','zoomDelta'];
  if (ratio <= 0) return {};
  const desired = Object.fromEntries(keys.map(key => [key, (target[key] || 0) / ratio]));
  let correction = current.correction || null, elapsed = current.elapsed || 0;
  if (current.initialized && current.targetId !== targetId) {
    correction = Object.fromEntries(keys.map(key => [key, (current.normalized[key] || 0) - desired[key]]));
    elapsed = 0;
  } else elapsed += Math.max(0, dt);
  const t = Math.min(1, elapsed / 0.25);
  const remaining = correction ? 1 - t*t*(3-2*t) : 0;
  const normalized = {}, next = {initialized:true,targetId,elapsed,correction:t<1?correction:null,normalized};
  for (const key of keys) {
    normalized[key] = desired[key] + (correction?.[key] || 0)*remaining;
    next[key] = {position:normalized[key]*ratio,velocity:0};
  }
  return next;
}

// Camera contact visibility must match the blurred cue-line range.
export function peekContactVisible(contact, origin, values = {}, illegal = false) {
  if(illegal || contact?.type !== 'ball' || !contact.ball || !contact.point)return false;
  return values.cueLineMode !== 'blur' || Math.hypot(contact.point.x-origin.x,contact.point.y-origin.y) <= Math.max(1,values.cueLineBlurMaxLengthMm ?? 1000);
}
export function peekFreeOffsets(peekPx, values = {}) {
  const ratio=Math.max(0,Math.min(1,peekPx/PEEK_FULL_DRAG_PX));
  return {forwardMm:(values.peekFreeForwardCm ?? 40)*10*ratio,
    liftMetres:((values.peekFreeLiftCm ?? 0)-(values.peekFreeLowerCm ?? 20))/100*ratio};
}

export function peekZoomMultiplier(peekPx, hasTarget, values = {}) {
  if(hasTarget)return 1;
  const maximum=Math.max(1,Math.min(2,Number(values.peekFreeMaxZoom)||1));
  const ratio=Math.max(0,Math.min(1,peekPx/PEEK_FULL_DRAG_PX));
  return 1+(maximum-1)*ratio;
}

// A long shot moves the contact normal much faster than the cue direction.
// Restore the geometric input compensation at reduced strength. Calibrated to
// 1/5 input at 2m centre-to-centre, straight contact, full Peek and 1/3 orbit.
export function peekAimSensitivity(origin, direction, contact, peekPx, values = {}) {
  if(contact?.type!=='ball'||!contact.ball||!contact.point)return 1;
  const ratio=Math.max(0,Math.min(1,peekPx/PEEK_FULL_DRAG_PX));
  const fraction=.315*Math.max(0,Math.min(1,values.peekTargetAngleRatio ?? 1/3))*ratio;
  if(!fraction || (values.peekTargetLateralCm ?? 40)<=0)return 1;
  const dx=contact.ball.pos.x-contact.point.x,dy=contact.ball.pos.y-contact.point.y;
  const diameter=Math.hypot(dx,dy),directionLength=Math.hypot(direction.x,direction.y);
  if(diameter<=0||directionLength<=0)return 1;
  const cosine=Math.max(.01,(dx*direction.x+dy*direction.y)/diameter/directionLength);
  const distance=Math.hypot(contact.point.x-origin.x,contact.point.y-origin.y);
  // Use a conservative continuous bound on the camera's angular leverage.
  return 1/(1+fraction*(1+distance/(diameter*cosine)));
}
