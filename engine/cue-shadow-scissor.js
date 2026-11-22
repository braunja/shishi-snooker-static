import * as THREE from 'three';

// Bound the *existing* analytic shadow at its existing alpha discard threshold.
// This limits fragment coverage; it does not approximate its colour or geometry.
export function cueShadowRadius({ tip, butt, strength, opacity, softness, heightFade }, minY, maxY) {
  const amplitude = strength * opacity, cutoff = .002;
  if (!(amplitude >= cutoff)) return 0;
  const low = Math.max(0, Math.min(tip.y, butt.y) - maxY);
  const high = Math.max(0, Math.max(tip.y, butt.y) - minY);
  const logAmplitude = Math.log(amplitude / cutoff);
  if (heightFade * low > logAmplitude || Math.max(tip.y, butt.y) < minY - .001) return 0;
  // The taper never exceeds .014. For every t, width <= a + b * height.
  const a = .014 + .006 * softness, b = .16 * softness;
  const radiusAt = h => (a + b * h) * Math.sqrt(Math.max(0, (logAmplitude - heightFade * h) * .5));
  let radius = Math.max(radiusAt(low), radiusAt(high));
  if (heightFade > 0 && b > 0) {
    const peak = (2 * b * logAmplitude - heightFade * a) / (3 * b * heightFade);
    radius = Math.max(radius, radiusAt(Math.min(high, Math.max(low, peak))));
  }
  return Math.max(1e-6, radius);
}

export function createCueShadowScissorBounds() {
  const clipMatrix = new THREE.Matrix4(), point = new THREE.Vector4();
  return function bounds(camera, viewport, state, minY, maxY, result) {
    if (![minY, maxY, state.tip.x, state.tip.y, state.tip.z, state.butt.x, state.butt.y, state.butt.z,
      state.strength, state.opacity, state.softness, state.heightFade].every(Number.isFinite) || state.softness < 0 || state.heightFade < 0) return null;
    const radius = cueShadowRadius(state, minY, maxY);
    if (!radius) return result.set(viewport.x, viewport.y, 0, 0);
    const { tip, butt } = state;
    const dx = butt.x - tip.x, dz = butt.z - tip.z, length = Math.hypot(dx, dz);
    const ux = length > 1e-10 ? dx / length : 1, uz = length > 1e-10 ? dz / length : 0;
    clipMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    let left = Infinity, bottom = Infinity, right = -Infinity, top = -Infinity;
    // An oriented rectangular prism contains the entire segment capsule on all
    // cloth/rail heights. Perspective extrema lie at its corners if none crosses
    // the near plane; otherwise leave the original full receiver draw intact.
    for (let end = 0; end < 2; end++) for (let side = -1; side <= 1; side += 2) for (let high = 0; high < 2; high++) {
      const p = end ? butt : tip, along = (end ? 1 : -1) * radius;
      point.set(p.x + ux * along - uz * radius * side, high ? maxY : minY,
        p.z + uz * along + ux * radius * side, 1).applyMatrix4(clipMatrix);
      if (!(point.w > 1e-8) || !Number.isFinite(point.x) || !Number.isFinite(point.y) || !Number.isFinite(point.z) || point.z <= -point.w + 1e-7) return null;
      const x = point.x / point.w, y = point.y / point.w;
      left = Math.min(left, x); right = Math.max(right, x); bottom = Math.min(bottom, y); top = Math.max(top, y);
    }
    // Two logical pixels also cover rasterization/rounding at non-integer DPR.
    const x0 = THREE.MathUtils.clamp(Math.floor(viewport.x + (left + 1) * .5 * viewport.z) - 2, viewport.x, viewport.x + viewport.z);
    const y0 = THREE.MathUtils.clamp(Math.floor(viewport.y + (bottom + 1) * .5 * viewport.w) - 2, viewport.y, viewport.y + viewport.w);
    const x1 = THREE.MathUtils.clamp(Math.ceil(viewport.x + (right + 1) * .5 * viewport.z) + 2, viewport.x, viewport.x + viewport.z);
    const y1 = THREE.MathUtils.clamp(Math.ceil(viewport.y + (top + 1) * .5 * viewport.w) + 2, viewport.y, viewport.y + viewport.w);
    return result.set(x0, y0, Math.max(0, x1 - x0), Math.max(0, y1 - y0));
  };
}

export function installCueShadowScissor(receivers, uniforms) {
  const worldBounds = new THREE.Box3(), box = new THREE.Box3();
  for (const mesh of receivers) {
    mesh.updateWorldMatrix(true, false);
    mesh.geometry.computeBoundingBox();
    worldBounds.union(box.copy(mesh.geometry.boundingBox).applyMatrix4(mesh.matrixWorld));
  }
  const compute = createCueShadowScissorBounds(), viewport = new THREE.Vector4(), rect = new THREE.Vector4();
  const previous = new THREE.Vector4(), clipped = new THREE.Vector4();
  const state = { tip: uniforms.tip.value, butt: uniforms.butt.value, strength: 0, opacity: 0, softness: 0, heightFade: 0 };
  const scalarKeys = ['strength', 'opacity', 'softness', 'heightFade'];
  const inputs = new Float64Array(46), cachedInputs = new Float64Array(46).fill(NaN);
  let frame = -1, priorCamera = null, priorRenderer = null, bounded = false, restore = false, priorTest = false;
  const hooks = receivers.map(mesh => {
    const before = mesh.onBeforeRender, after = mesh.onAfterRender;
    mesh.onBeforeRender = function (renderer, scene, camera, ...rest) {
      before.call(this, renderer, scene, camera, ...rest);
      restore = false;
      // Render-target and XR viewports have separate coordinate conventions.
      // Their uncommon paths retain the unchanged full receiver for safety.
      if (renderer.getRenderTarget() || camera.isArrayCamera || renderer.xr?.isPresenting) return;
      if (priorRenderer !== renderer || frame !== renderer.info.render.frame || priorCamera !== camera) {
        frame = renderer.info.render.frame; priorCamera = camera; priorRenderer = renderer;
        renderer.getViewport(viewport);
        for (const key of scalarKeys) state[key] = uniforms[key].value;
        state.tip.toArray(inputs, 0); state.butt.toArray(inputs, 3);
        for (let i = 0; i < scalarKeys.length; i++) inputs[6 + i] = state[scalarKeys[i]];
        viewport.toArray(inputs, 10); inputs.set(camera.projectionMatrix.elements, 14); inputs.set(camera.matrixWorldInverse.elements, 30);
        let changed = false;
        for (let i = 0; i < inputs.length; i++) if (inputs[i] !== cachedInputs[i]) { changed = true; break; }
        if (changed) {
          cachedInputs.set(inputs);
          bounded = Boolean(compute(camera, viewport, state, worldBounds.min.y, worldBounds.max.y, rect));
        }
      }
      if (!bounded) return;
      priorTest = renderer.getScissorTest(); renderer.getScissor(previous); clipped.copy(rect);
      if (priorTest) {
        const x = Math.max(rect.x, previous.x), y = Math.max(rect.y, previous.y);
        clipped.set(x, y, Math.max(0, Math.min(rect.x + rect.z, previous.x + previous.z) - x),
          Math.max(0, Math.min(rect.y + rect.w, previous.y + previous.w) - y));
      }
      renderer.setScissor(clipped); renderer.setScissorTest(true); restore = true;
    };
    mesh.onAfterRender = function (renderer, ...rest) {
      if (restore) { renderer.setScissor(previous); renderer.setScissorTest(priorTest); restore = false; }
      after.call(this, renderer, ...rest);
    };
    return { mesh, before, after };
  });
  return () => { for (const { mesh, before, after } of hooks) { mesh.onBeforeRender = before; mesh.onAfterRender = after; } };
}
