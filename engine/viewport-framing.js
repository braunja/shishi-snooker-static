// Fit the whole reference frame, then reveal the extra viewport area.
export function referenceViewport(width, height, portrait = height > width) {
  const baseWidth = portrait ? 1080 : 1920, baseHeight = portrait ? 1920 : 1080;
  const scale = Math.min(width / baseWidth, height / baseHeight);
  const frameWidth = baseWidth * scale, frameHeight = baseHeight * scale;
  return { baseWidth, baseHeight, scale, width: frameWidth, height: frameHeight,
    x: (width - frameWidth) / 2, y: (height - frameHeight) / 2 };
}
export function expandedVerticalTangent(baseTangent, width, height) {
  return baseTangent * height / referenceViewport(width, height).height;
}
export function referenceFov(width, height) {
  const baseTangent = Math.tan(Math.PI / 10) * (height > width ? 16 / 9 : 1);
  return 2 * Math.atan(expandedVerticalTangent(baseTangent, width, height)) * 180 / Math.PI;
}
export function applyReferenceFraming(camera, width, height) {
  camera.aspect = width / height;
  camera.fov = referenceFov(width, height);
  camera.updateProjectionMatrix();
}
