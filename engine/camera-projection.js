import * as THREE from 'three';

// The live camera keeps its identity while switching projection. Its native
// clone() still constructs a PerspectiveCamera, which loses orthographic type
// flags and makes Raycaster interpret the frozen projection as perspective.
export function capturePickingCamera(camera) {
  camera.updateWorldMatrix(true, false);
  const snapshot = camera.isOrthographicCamera
    ? new THREE.OrthographicCamera()
    : new THREE.PerspectiveCamera();
  return snapshot.copy(camera);
}

// Keep the shared camera identity used by the renderer, controls and picking.
// Switch both the projection and type flags so rays and materials agree.
export function installCameraProjection(camera) {
  let overheadDistance = null;
  camera.updateProjectionMatrix = function () {
    if (overheadDistance === null) {
      THREE.PerspectiveCamera.prototype.updateProjectionMatrix.call(this);
      return;
    }
    const halfHeight = overheadDistance * Math.tan(THREE.MathUtils.degToRad(this.fov / 2));
    this.top = halfHeight; this.bottom = -halfHeight;
    this.left = -halfHeight * this.aspect; this.right = halfHeight * this.aspect;
    THREE.OrthographicCamera.prototype.updateProjectionMatrix.call(this);
  };
  return distance => {
    overheadDistance = distance;
    camera.isPerspectiveCamera = distance === null;
    camera.isOrthographicCamera = distance !== null;
    camera.updateProjectionMatrix();
  };
}
