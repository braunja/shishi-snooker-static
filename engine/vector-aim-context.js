import { clipGuideTriangles, prepareClipTriangles } from './aim-clip.js';
import * as THREE from 'three';
import { SVGLoader } from './vendor/SVGLoader.js';

const vertexShader = `varying vec2 paintPoint; varying float pathProgress;
void main() { paintPoint = position.xy; pathProgress = position.z; gl_Position = projectionMatrix * modelViewMatrix * vec4(position.xy, 0.0, 1.0); }`;
const fragmentShader = `varying vec2 paintPoint; varying float pathProgress;
uniform vec4 colors[3]; uniform vec3 stops;
uniform vec2 gradientStart; uniform vec2 gradientEnd; uniform bool gradient; uniform bool pathGradient;
uniform bool circle; uniform vec2 circleCenter; uniform vec2 radii;
void main() {
  if (paintPoint.x < 0.0 || paintPoint.x > 2048.0 || paintPoint.y < 0.0 || paintPoint.y > 1024.0) discard;
  vec4 color = colors[0];
  if (gradient) {
    vec2 axis = gradientEnd - gradientStart;
    float t = pathGradient ? clamp(pathProgress, 0.0, 1.0) : clamp(dot(paintPoint - gradientStart, axis) / max(dot(axis, axis), 0.000001), 0.0, 1.0);
    color = t < stops.y ? mix(colors[0], colors[1], clamp((t - stops.x) / max(stops.y - stops.x, 0.000001), 0.0, 1.0))
      : mix(colors[1], colors[2], clamp((t - stops.y) / max(stops.z - stops.y, 0.000001), 0.0, 1.0));
  }
  if (circle) {
    float distanceToCenter = length(paintPoint - circleCenter);
    float aa = max(fwidth(distanceToCenter), 0.0001);
    color.a *= 1.0 - smoothstep(radii.x - aa * 0.5, radii.x + aa * 0.5, distanceToCenter);
    if (radii.y > 0.0) color.a *= smoothstep(radii.y - aa * 0.5, radii.y + aa * 0.5, distanceToCenter);
  }
  if (color.a <= 0.00001) discard;
  gl_FragColor = color;
  #include <colorspace_fragment>
}`;

function parseColor(style) {
  // Fading arithmetic can stringify tiny alpha values as 1e-7. Treat those
  // as numbers; falling back to THREE.Color drops alpha and yields opaque white.
  const match = /^rgba?\(\s*([+-]?[\d.]+(?:e[+-]?\d+)?)\s*,\s*([+-]?[\d.]+(?:e[+-]?\d+)?)\s*,\s*([+-]?[\d.]+(?:e[+-]?\d+)?)(?:\s*,\s*([+-]?[\d.]+(?:e[+-]?\d+)?))?\s*\)$/i.exec(style);
  const color = match ? new THREE.Color().setRGB(+match[1] / 255, +match[2] / 255, +match[3] / 255, THREE.SRGBColorSpace)
    : new THREE.Color(style);
  return new THREE.Vector4(color.r, color.g, color.b, match?.[4] === undefined ? 1 : +match[4]);
}

// Only the path subset used by GameStageRenderer.drawAim. Shared geometry,
// collision rules and prediction remain in that renderer; no raster texture.
export class VectorAimContext {
  constructor({ center, surfaceY, record = () => {} }) {
    this.group = new THREE.Group(); this.group.name = 'Vector aim guides';
    // Match the former 2048x1024, 4x2m canvas plane exactly.
    this.group.position.set(center.x + 2, surfaceY + .001, center.z + 1);
    this.group.rotation.x = Math.PI / 2;
    this.group.scale.set(-1 / 512, -1 / 512, 1);
    this.pool = []; this.used = 0; this.bytes = 0; this.record = record;
    this.state = { fillStyle: '#000000', strokeStyle: '#000000', lineWidth: 1, lineCap: 'butt', lineJoin: 'miter' };
    this.stack = []; this.points = []; this.vertices = []; this.circlePath = null;
  }
  get fillStyle() { return this.state.fillStyle; } set fillStyle(v) { this.state.fillStyle = v; }
  get strokeStyle() { return this.state.strokeStyle; } set strokeStyle(v) { this.state.strokeStyle = v; }
  get lineWidth() { return this.state.lineWidth; } set lineWidth(v) { this.state.lineWidth = v; }
  get lineCap() { return this.state.lineCap; } set lineCap(v) { this.state.lineCap = v; }
  get lineJoin() { return this.state.lineJoin; } set lineJoin(v) { this.state.lineJoin = v; }
  save() { this.stack.push({ ...this.state }); }
  restore() { if (this.stack.length) this.state = this.stack.pop(); }
  setLineDash(values) { if (values.length) throw new Error('Dashed aim paths require an explicit vector implementation'); }
  beginPath() { this.points = []; this.circlePath = null; }
  moveTo(x, y) { this.points.push(new THREE.Vector2(x, y)); }
  lineTo(x, y) { this.points.push(new THREE.Vector2(x, y)); }
  closePath() { if (this.points.length) this.points.push(this.points[0].clone()); }
  arc(x, y, radius, start, end) {
    if (Math.abs(end - start) < Math.PI * 2 - .00001 || this.points.length) throw new Error('Only full circular aim paths are supported');
    this.circlePath = { x, y, radius };
  }
  createLinearGradient(x0, y0, x1, y1) {
    return { start: new THREE.Vector2(x0, y0), end: new THREE.Vector2(x1, y1), stops: [],
      addColorStop(offset, color) { this.stops.push({ offset, color: parseColor(color) }); } };
  }
  beginFrame() { this.used = 0; this.bytes = 0; }
  endFrame() {
    for (let i = this.used; i < this.pool.length; i++) this.pool[i].visible = false;
    this.record('aimGeometryBytes', this.bytes);
  }
  clip() {
    const key=this.points.map(p=>`${p.x},${p.y}`).join(';');
    if(key!==this.clipKey){
      this.clipKey=key;
      this.clipTriangles=prepareClipTriangles(this.points.map(p=>({x:p.x,y:p.y})),THREE.ShapeUtils.triangulateShape(this.points,[]));
    }
    this.state.clipTriangles=this.clipTriangles;
  }
  fill() {
    if (this.circlePath) return this.drawCircle(this.fillStyle, false);
    if (this.points.length < 3) return;
    this.vertices.length = 0;
    const triangles = THREE.ShapeUtils.triangulateShape(this.points, []);
    for (const triangle of triangles) for (const index of triangle) {
      const p = this.points[index]; this.vertices.push(p.x, p.y, 0);
    }
    this.submit(this.vertices, this.fillStyle);
  }
  fillConeBand(left, right, paint, progress) {
    const vertices = [];
    const add = (p,i) => vertices.push(p.x, p.y, progress?.[i] ?? 0);
    for (let i = 1; i < left.length; i++) {
      add(left[i-1],i-1); add(right[i-1],i-1); add(left[i],i);
      add(right[i-1],i-1); add(right[i],i); add(left[i],i);
    }
    const mesh = this.submit(vertices, paint);
    mesh.material.uniforms.pathGradient.value = Boolean(progress);
  }

  stroke() {
    if (this.circlePath) return this.drawCircle(this.strokeStyle, true);
    if (this.points.length < 2) return;
    this.vertices.length = 0;
    SVGLoader.pointsToStrokeWithBuffers(this.points, {
      strokeWidth: this.lineWidth, strokeLineCap: this.lineCap,
      // SVG round joins can wrap almost 360 degrees at near-collinear
      // physics samples, painting overlapping disks into translucent lines.
      // Shared miter joins keep one coverage layer; endpoints remain round.
      strokeLineJoin: this.lineJoin === 'round' ? 'miter' : this.lineJoin, strokeMiterLimit: 10,
    }, 12, .001, this.vertices);
    this.submit(this.vertices, this.strokeStyle);
  }
  drawCircle(paint, stroke) {
    const { x, y, radius } = this.circlePath;
    const outer = radius + (stroke ? this.lineWidth / 2 : 0);
    const inner = stroke ? Math.max(0, radius - this.lineWidth / 2) : -1;
    const edge = outer + 2;
    const mesh = this.submit([x-edge,y-edge,0, x+edge,y-edge,0, x+edge,y+edge,0,
      x-edge,y-edge,0, x+edge,y+edge,0, x-edge,y+edge,0], paint);
    mesh.material.uniforms.circle.value = true;
    mesh.material.uniforms.circleCenter.value.set(x, y);
    mesh.material.uniforms.radii.value.set(outer, inner);
  }
  submit(vertices, paint) {
    if(this.state.clipTriangles)vertices=clipGuideTriangles(vertices,this.state.clipTriangles);
    let mesh = this.pool[this.used];
    if (!mesh) {
      const material = new THREE.ShaderMaterial({ vertexShader, fragmentShader, transparent: true,
        depthWrite: false, side: THREE.DoubleSide, forceSinglePass: true,
        uniforms: { pathGradient: {value:false}, colors: { value: [new THREE.Vector4(), new THREE.Vector4(), new THREE.Vector4()] },
          stops: { value: new THREE.Vector3(0, .5, 1) }, gradientStart: { value: new THREE.Vector2() },
          gradientEnd: { value: new THREE.Vector2() }, gradient: { value: false }, circle: { value: false },
          circleCenter: { value: new THREE.Vector2() }, radii: { value: new THREE.Vector2() } } });
      mesh = new THREE.Mesh(new THREE.BufferGeometry(), material);
      mesh.frustumCulled = false; // Reused dynamic buffers; avoid stale bounds.
      mesh.renderOrder = 100 + this.used;
      this.pool.push(mesh); this.group.add(mesh);
    }
    this.used++; mesh.visible = true;
    let position = mesh.geometry.getAttribute('position');
    if (!position || position.array.length < vertices.length) {
      // Grow only when needed. Dispose the old GPU allocation on growth.
      mesh.geometry.dispose(); mesh.geometry = new THREE.BufferGeometry();
      const vertexCapacity = 2 ** Math.ceil(Math.log2(Math.max(256, Math.ceil(vertices.length / 3))));
      position = new THREE.BufferAttribute(new Float32Array(vertexCapacity * 3), 3);
      position.setUsage(THREE.DynamicDrawUsage); mesh.geometry.setAttribute('position', position);
    }
    position.array.set(vertices); position.clearUpdateRanges(); position.addUpdateRange(0, vertices.length);
    position.needsUpdate = true; mesh.geometry.setDrawRange(0, vertices.length / 3);
    this.bytes += vertices.length * 4;
    const u = mesh.material.uniforms; u.pathGradient.value = false; u.circle.value = false; u.gradient.value = typeof paint !== 'string';
    if (u.gradient.value) {
      const stops = [...paint.stops].sort((a, b) => a.offset - b.offset);
      if (stops.length !== 3) throw new Error('Aim gradients must have three stops');
      stops.forEach((stop, i) => u.colors.value[i].copy(stop.color));
      u.stops.value.set(...stops.map(stop => stop.offset));
      u.gradientStart.value.copy(paint.start); u.gradientEnd.value.copy(paint.end);
    } else u.colors.value[0].copy(parseColor(paint));
    return mesh;
  }
  diagnostics() { return { backend: 'webgl-vector', drawPrimitives: this.used, pooledPrimitives: this.pool.length,
    lastUploadBytes: this.bytes, canvasTextureUploads: 0 }; }
  dispose() { for (const mesh of this.pool) { mesh.geometry.dispose(); mesh.material.dispose(); }
    this.group.removeFromParent(); this.pool.length = 0; }
}
