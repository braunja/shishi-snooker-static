// Independently maintained copy of the 2D six-dot design:
// src/render/gameStageRenderer.js drawCueSixDots; gameClientConfig defaults.
// Six axial centers, radius / ball radius = 2/15, pigment #e50012.
export const CUE_DOT_RADIUS_RATIO = 2 / 15;
export const CUE_DOT_COLOR = [229 / 255, 0, 18 / 255];
export const CUE_DOT_CENTERS = [
  [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1],
];
// A spherical cap has projected radius R sin(theta). Testing the largest
// absolute local coordinate selects exactly the six mutually orthogonal caps.
export const CUE_DOT_GLSL = `
  vec3 cueDirection = normalize(ballLocalPosition);
  vec3 cueAxes = abs(cueDirection);
  float cueCosAngle = max(cueAxes.x, max(cueAxes.y, cueAxes.z));
  float cueBoundary = sqrt(1.0 - cueDotRadiusRatio * cueDotRadiusRatio);
  float cueAA = max(fwidth(cueCosAngle), 0.00001);
  float cueMask = smoothstep(cueBoundary - cueAA, cueBoundary + cueAA, cueCosAngle);
  diffuse *= mix(vec3(1.0), cueDotColor, cueMask);
`;
