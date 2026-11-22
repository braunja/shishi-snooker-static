import { createAudioEntryGate } from './audio-entry-gate.js';
import { createIdleSceneCache } from './idle-scene-cache.js';
import { createGpuTiming } from './gpu-timing.js';
import { readQuality, createQualitySettings } from './quality-settings.js';
import { loadBakedAsset } from './baked-assets.js';
import { readGzipResponse } from './gzip-response.js';
import { createFrameScheduler } from './frame-scheduler.js';
import { applyReferenceFraming } from './viewport-framing.js';
import { reviewTextureUrl } from './texture-review.js';
import { initializeProjectPresets, readPresetLibrary } from './debug-preset-store.js';
import { resolveAppearanceConfig } from './appearance-config.js';
import { flattenPocketSkirt, roundPocketLeather } from './pocket-skirt.js';
import { detailTexture, remapPocketNet, roundPocketRings, resizeTableLogo } from './table-detail-upgrades.js';
import { upgradeTableStructure } from './table-structure.js';
import { loadSurfaceLighting, prepareClothDetailUV } from './surface-lighting.js';
import { CUE_DOT_RADIUS_RATIO, CUE_DOT_COLOR, CUE_DOT_GLSL } from './cue-ball-appearance.js';
import { createLightingTuning, BALL_BASE_BRIGHTNESS } from './lighting-tuning.js';
import { BALL_ROOF, BALL_ROOF_GLSL } from './ball-roof.js';
import * as THREE from 'three';
import { OrbitControls } from './vendor/OrbitControls.js';
import { OBJLoader } from './vendor/OBJLoader.js';
import { initializeGame } from './game.js';
import { calibrateTable, createCalibrationOverlay } from './table-calibration.js';
import { createPerformanceMonitor } from './performance-monitor.js';
import { createRendererViewportSync, productQualityPixelRatio } from './renderer-viewport.js';
let gameplay = null;
const isTrial = document.documentElement.dataset.product === 'trial';
const models = window.__threeAssetBuild ? null :
  isTrial ? window.SnookerProductLite : window.SnookerTestFieldModels;
const legacyReconstructed = !isTrial && location.pathname === '/reconstructed/';
const reconstructed = legacyReconstructed || models?.selection.table === 'v2';
const venue2026 = (models?.selection.venue ?? (!isTrial && new URLSearchParams(location.search).get('venue'))) === 'crucible-2026';
if(!isTrial) await initializeProjectPresets();
let surfaceLighting = null;
let practiceVenue = null;
let originalPracticeFloor = null;
let reviewCamera = null;
let independentTableBody = null;
let independentTableLighting = null;
let ballEnvironment = null;
const genericRailMaterials = new Map();
let stagedR135Table = null;
let stagedR135Meshes = null;
let testFieldClosed = false;
const testFieldTables = new Map();

const canvas = document.querySelector('#scene');
const status = document.querySelector('#status');
const statusText = document.querySelector('#status-text');
const loading = document.querySelector('#loading');
const loadingBar = document.querySelector('#loading-bar');
const loadingPercent = document.querySelector('#loading-percent');
function setLoadingProgress(value) {
  loadingBar.style.width = `${value}%`;
  loadingBar.parentElement.setAttribute('aria-valuenow', String(value));
  if (loadingPercent) loadingPercent.textContent = `${Math.round(value)}%`;
}
setLoadingProgress(5);

const qualityInitial = isTrial ? null : readQuality(window.localStorage);
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: qualityInitial?.antialias ?? true,
  alpha: false,
  powerPreference: 'high-performance',
});
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NoToneMapping;
renderer.toneMappingExposure = 1;
renderer.shadowMap.enabled = false;
renderer.shadowMap.type = THREE.PCFShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x07100e);
scene.fog = null;
const perf = isTrial ? { beginFrame() {}, endFrame() {}, input() {}, record() {}, count() {}, measure: (name, fn) => fn(), snapshot: () => ({}), destroy() {} } : createPerformanceMonitor({ renderer, scene });
window.threePerformance = perf;

const camera = new THREE.PerspectiveCamera(36, window.innerWidth / window.innerHeight, 0.04, 500);
function fitCameraViewport() {
  if(gameplay?.resizeViewport){gameplay.resizeViewport();return;}
  if(isTrial){applyReferenceFraming(camera,window.innerWidth,window.innerHeight);return;}
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(18)) / Math.min(1, camera.aspect)));
  camera.updateProjectionMatrix();
}
const gpuTiming = isTrial ? null : createGpuTiming(renderer.getContext());
const quality = isTrial ? null : createQualitySettings({ THREE, renderer, scene, gpuTiming, initial: qualityInitial, onChange: () => { gpuTiming?.reset(); requestFrame(); } });
const syncRendererViewport = createRendererViewportSync(renderer, window, fitCameraViewport, quality ? quality.pixelRatio : isTrial ? () => productQualityPixelRatio(window, window.SnookerOnline?.preferences?.()?.graphicsQuality ?? window.SnookerProduct?.preferences?.graphicsQuality ?? window.SnookerPracticeSettings?.read().graphicsQuality) : undefined);
syncRendererViewport();
const syncProductQuality = () => { requestFrame(); };
const readCueOverlay = () => isTrial
  ? window.SnookerPracticeSettings?.read().cueBallRedDotsEnabled !== false
  : !new URLSearchParams(location.search).has('inspect');
const cueOverlay = { value: readCueOverlay() };
function syncPracticeSettings() {
  cueOverlay.value = readCueOverlay();
  requestFrame();
}
if(isTrial){window.addEventListener('product-quality-change',syncProductQuality);window.addEventListener('practice-settings-change',syncPracticeSettings);}
camera.position.set(4.7, 3.05, 4.95);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0.5, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.065;
controls.minDistance = 3.2;
controls.maxDistance = 13;
controls.minPolarAngle = 0.08;
controls.maxPolarAngle = Math.PI * 0.49;
controls.panSpeed = 0.55;
controls.rotateSpeed = 0.58;
controls.zoomSpeed = 0.72;
controls.screenSpacePanning = false;

const originalSceneMatrix = new THREE.Matrix4();
async function loadOriginalLighting() {
  const response = await fetch('./resources/lighting/room.json');
  if (!response.ok) throw new Error('Missing original lighting settings');
  const data = await response.json();
  const settings = data.renderSettings;
  for (const node of data.tableAncestors) originalSceneMatrix.multiply(new THREE.Matrix4().compose(
    new THREE.Vector3().fromArray(node.position), new THREE.Quaternion().fromArray(node.quaternion),
    new THREE.Vector3().fromArray(node.scale)));
  const color = settings.ambientSkyColor;
  const ambient = new THREE.AmbientLight(new THREE.Color().setRGB(color.r, color.g, color.b), settings.ambientIntensity);
  ambient.name = 'room / flat ambient';
  scene.add(ambient);
  window.originalLightingReport = { activeLights: data.lights.filter(light => light.active).length,
    ambient: [color.r, color.g, color.b], shadows: 'Radial contact shadow texture', fog: settings.fog };
}

const tableRoot = new THREE.Group();
scene.add(tableRoot);
const loader = new OBJLoader();
const textureLoader = new THREE.TextureLoader();
const tableMaterials = [];
let tableEnvironmentTarget = null;
const balls = new THREE.Group();
balls.name = 'Match opening / 22 balls';
scene.add(balls);
const ballShadows = new THREE.Group();
// Transparent overlays: aim group (10), then contact shadows (20).
// Keep depth testing so opaque balls still occlude both overlays.
ballShadows.renderOrder = 20;
scene.add(ballShadows);

async function loadOriginalBalls() {
  const prepared = !window.__threeAssetBuild ? await loadBakedAsset('ball',{renderer}) : null;
  const original = prepared ? prepared.roots[0] : await loader.loadAsync('./resources/models/balls/ball-sphere.obj');
  const mesh = original.children.find(child => child.isMesh);
  if (!mesh) throw new Error('Missing original ballSphere mesh');
  const geometry = mesh.geometry;
  geometry.computeBoundingSphere();
  const radius = 0.0525 / 2;
  const scale = radius / geometry.boundingSphere.radius;
  const cloth = tableRoot.getObjectByName('tableCloth');
  const clothBox = new THREE.Box3().setFromObject(cloth);
  const center = new THREE.Vector3().fromArray(window.tablePreviewReport.calibration.origin);
  // The exported table is in metres, with baulk at +X and black at -X.
  const surfaceY = window.tablePreviewReport.calibration.surfaceY;
  const response = await fetch('./resources/materials/balls.json');
  if (!response.ok) throw new Error('Missing original ball materials');
  const source = await response.json();
  const cube = await new THREE.CubeTextureLoader().loadAsync(['px', 'nx', 'py', 'ny', 'pz', 'nz'].map(face => `./resources/textures/reflections/ball-${face}.png`));
  const roofMap = await textureLoader.loadAsync(BALL_ROOF.texture);
  // Sample in image-row order; legacy ball shading composes gamma-space colours.
  roofMap.flipY = false;
  roofMap.needsUpdate = true;
  // Share the already filtered room probe; surfaceLighting owns its lifetime.
  tableEnvironmentTarget = await surfaceLighting.getRoomEnvironment();
  const brdf = await textureLoader.loadAsync('./resources/textures/balls/brdf-lookup.png');
  const materials = {};
  for (const name of ['red', 'yellow', 'green', 'brown', 'blue', 'pink', 'black', 'white']) {
    const original = source.materials[`ball${name[0].toUpperCase()}${name.slice(1)}`];
    const lut = await textureLoader.loadAsync('./resources/' + original.textures.baseMap);
    const f = original.floats;
    const material = new THREE.ShaderMaterial({ name: `ballSphere / ${name}`,
      uniforms: { lightLut: { value: lut }, reflectionMap: { value: cube }, brdf: { value: brdf },
        roofDimensions: {value:new THREE.Vector2(BALL_ROOF.length,BALL_ROOF.panelWidth)}, roofMap: {value:roofMap}, roofPlane: {value:new THREE.Vector3(center.x, surfaceY + BALL_ROOF.height, center.z)},
        whiteWarmth: {value:name === 'white' ? .35 : 0},
        pocketLight: { value: 1 }, pocketBrightness: {value:1},
        cueDotRadiusRatio: { value: CUE_DOT_RADIUS_RATIO },
        cueDotColor: { value: new THREE.Vector3(...CUE_DOT_COLOR) }, useCueOverlay: name === 'white' ? cueOverlay : { value: false },
        amount: { value: f.amount }, mainAmount: { value: BALL_BASE_BRIGHTNESS[name] },
        fresnelAmount: { value: f.fresnelAmount }, fresnelFocus: { value: f.fresnelFocus },
        roughness: { value: f.roughness }, aoStrength: { value: 1 }, ballLightAxisTilt: {value:0},
        ballContactShadowStrength: {value:.65}, ballContactShadowRange: {value:.10},
        ballContactShadowPlaneY: {value:surfaceY}, ballContactShadowDiameter: {value:radius*2},
        useCapturedEnvironment: {value:false}, ballEnvironmentStrength: {value:1}, ballLowerReflection: {value:1},
        boxMin: { value: new THREE.Vector3().fromArray(original.colors.boundsMin) },
        boxMax: { value: new THREE.Vector3().fromArray(original.colors.boundsMax) },
        cubePosition: { value: new THREE.Vector3().fromArray(original.colors.probePosition) },
        tableOffset: { value: tableRoot.position.clone() }, originalSceneMatrix: { value: originalSceneMatrix },
        originalNormalMatrix: { value: new THREE.Matrix3().getNormalMatrix(originalSceneMatrix) } },
      vertexShader: `varying vec3 worldPosition; varying vec3 worldNormal; varying vec3 ballLocalPosition; varying vec3 ballCenter;
        void main() {
          ballLocalPosition = position;
          ballCenter = modelMatrix[3].xyz;
          worldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
          worldNormal = normalize(mat3(modelMatrix) * normal);
          gl_Position = projectionMatrix * viewMatrix * vec4(worldPosition, 1.0);
        }`,
      // Ball reflection and Fresnel shading in gamma space.
      // Unity's shader combines gamma-space LUT / cubemap samples directly.
      fragmentShader: `uniform sampler2D lightLut; uniform sampler2D brdf;
        uniform float cueDotRadiusRatio; uniform vec3 cueDotColor; uniform bool useCueOverlay; varying vec3 ballLocalPosition;
        uniform samplerCube reflectionMap;
        uniform bool useCapturedEnvironment;
        uniform float ballEnvironmentStrength, ballLowerReflection;
        uniform sampler2D roofMap;
        uniform vec3 roofPlane; uniform vec2 roofDimensions;
        uniform float pocketLight, pocketBrightness;
        uniform float whiteWarmth;
        uniform float amount, mainAmount, fresnelAmount, fresnelFocus, roughness, aoStrength, ballLightAxisTilt;
        uniform float ballContactShadowStrength, ballContactShadowRange;
        uniform float ballContactShadowPlaneY, ballContactShadowDiameter;
        uniform vec3 boxMin, boxMax, cubePosition, tableOffset;
        uniform mat4 originalSceneMatrix;
        uniform mat3 originalNormalMatrix;
        varying vec3 worldPosition; varying vec3 worldNormal; varying vec3 ballCenter;
        ${BALL_ROOF_GLSL}
        void main() {
          vec3 reflection = vec3(-1.0, 1.0, 1.0);
          vec3 p = (originalSceneMatrix * vec4((worldPosition - tableOffset) * reflection, 1.0)).xyz;
          vec3 n = normalize(originalNormalMatrix * (worldNormal * reflection));
          vec3 v = normalize(mat3(originalSceneMatrix) * ((worldPosition - cameraPosition) * reflection));
          vec3 r = reflect(v, n);
          vec3 eyeRay = isOrthographic
            ? -vec3(viewMatrix[0][2], viewMatrix[1][2], viewMatrix[2][2])
            : normalize(worldPosition - cameraPosition);
          vec3 roofRay = reflect(eyeRay, normalize(worldNormal));
          // The current venue cube is captured in game world coordinates.
          // Keep its continuous directions: do not project a cloth/stand horizon
          // onto the walls of the unrelated legacy reflection box.
          vec3 direction = roofRay;
          if (!useCapturedEnvironment) {
            vec3 distances = max((boxMax - p) / r, (boxMin - p) / r);
            direction = p + r * min(min(distances.x, distances.y), distances.z) - cubePosition;
          }
          // Replace the legacy roof completely: never stack old and new lamps.
          bool oldRoof = direction.y > max(abs(direction.x), abs(direction.z));
          vec3 reflected = oldRoof ? vec3(0.003) : textureCube(reflectionMap, direction).rgb;
          reflected *= ballEnvironmentStrength * mix(1.0, ballLowerReflection, smoothstep(0.0, 0.12, -roofRay.y));
          // The roof is a separate metric plane, not the old near-field box roof.
          // Reflect BEFORE any nonuniform export transform. Orthographic eyes
          // use parallel viewing rays, matching the actual overhead projection.
          if (roofRay.y > 0.00001 && worldPosition.y < roofPlane.y) {
            vec2 hit = (worldPosition + roofRay * ((roofPlane.y-worldPosition.y)/roofRay.y) - roofPlane).xz;
            hit.x *= 5.0/roofDimensions.x;
            hit.y = sign(hit.y)*(abs(hit.y)<=.325 ? abs(hit.y) : .325+(abs(hit.y)-.325)*.75/roofDimensions.y);
            float edge = max(abs(hit.x),abs(hit.y));
            if (edge < 3.5) {
              vec3 ceiling = texture2D(roofMap, vec2(roofU(-hit.x),roofV(hit.y))).rgb;
              reflected = mix(reflected, ceiling, 1.0-smoothstep(3.35,3.5,edge));
            }
          }
          // Use the same lamp centre and live roof height as the ball reflection.
          // Map the axis with the same normal transform as n, so export scale
          // cannot skew its peak away from the lamp. At 0 retain vertical n.y.
          vec3 lampAxis = normalize(originalNormalMatrix * ((roofPlane - ballCenter) * reflection));
          vec3 lightAxis = normalize(mix(vec3(0.0, 1.0, 0.0), lampAxis, ballLightAxisTilt));
          float height = (dot(n, lightAxis) + 1.0) * 0.5;
          vec3 diffuse = texture2D(lightLut, vec2(0.25, height)).rgb;
          diffuse *= mix(vec3(1.0), vec3(1.0, 0.98, 0.78), whiteWarmth);
          if (useCueOverlay) { ${CUE_DOT_GLSL} }
          vec3 ao = mix(vec3(1.0), texture2D(lightLut, vec2(0.75, height)).rgb, aoStrength);
          vec2 integrated = texture2D(brdf, vec2(roughness, abs(dot(n, v)))).rg;
          float specular = integrated.x + integrated.y;
          vec3 indirect = diffuse * (0.28 + 0.18 * max(0.0, dot(n, normalize(vec3(0.6, 0.15, 0.8)))));
          // Contact occlusion follows the cloth plane in world space, not the
          // lamp-oriented LUT axis or the ball's rotating local coordinates.
          // A lifted ball leaves the cap; pocketLight removes it below the bed.
          float contactHeight = max(0.0, worldPosition.y - ballContactShadowPlaneY) / ballContactShadowDiameter;
          float contactOcclusion = 1.0 - ballContactShadowStrength * pocketLight *
            (1.0 - smoothstep(0.0, ballContactShadowRange, contactHeight));
          gl_FragColor = vec4(mix(indirect * pocketBrightness, diffuse, pocketLight) * mainAmount +
            (amount * reflected * specular + pow(specular, fresnelFocus * 64.0) * fresnelAmount) * ao * pocketLight, 1.0);
          gl_FragColor.rgb *= contactOcclusion;
        }`,
    });
    tableMaterials.push(material);
    materials[name] = material;
  }
  // Two contact-shadow zones in one draw, with no texture or depth-writing overlay.
  const shadowMaterial = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1,
    toneMapped: false,
    uniforms: { shadowDrift: {value:new THREE.Vector2()}, opacity: {value:1}, innerStrength: {value:.75}, outerStrength: {value:.28},
      innerRadius: {value:.50}, outerRadius: {value:.78},
      innerBlur: {value:.2}, outerBlur: {value:.25} },
    vertexShader: `varying vec2 shadowPoint; uniform vec2 shadowDrift;
      void main(){
        float padding=1.+length(shadowDrift);
        shadowPoint=(uv-.5)*2.*padding;
        vec3 expanded=position;expanded.xy*=padding;
        gl_Position=projectionMatrix*modelViewMatrix*vec4(expanded,1.);
      }`,
    fragmentShader: `varying vec2 shadowPoint; uniform vec2 shadowDrift;
      uniform float opacity, innerStrength, outerStrength, innerRadius, outerRadius, innerBlur, outerBlur;
      float shadowZone(float r, float radius, float blur) {
        // Blur scales with each layer; keep the soft tail inside the shadow quad.
        float width=max(radius*blur, .00001);
        return 1.-smoothstep(max(0.,radius-width),min(.995,radius+width),r);
      }
      void main(){
        float inner=innerStrength*shadowZone(length(shadowPoint-shadowDrift*.25),innerRadius,innerBlur);
        float outer=outerStrength*shadowZone(length(shadowPoint-shadowDrift),outerRadius,outerBlur);
        gl_FragColor=vec4(0.,0.,0.,opacity*(1.-(1.-inner)*(1.-outer)));
      }`
  });
  const shadowGeometry = new THREE.PlaneGeometry(radius * 4, radius * 4);
  function add(name, color, x, z) {
    const ball = new THREE.Mesh(geometry, materials[color]);
    ball.name = name;
    ball.scale.setScalar(scale);
    ball.position.set(center.x + x, surfaceY + radius, center.z + z);
    ball.castShadow = ball.receiveShadow = true;
    balls.add(ball);
    const shadow = new THREE.Mesh(shadowGeometry, shadowMaterial);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.set(ball.position.x, surfaceY + 0.0001, ball.position.z);
    ballShadows.add(shadow);
  }
  const opening = window.SnookerThreeCore.createClientInitialGameState(window.GAME_CLIENT_CONFIG);
  let number = 1;
  for (const ball of opening.balls) {
    const color = ball.kind === 'cue' ? 'white' : ball.kind;
    add(ball.kind === 'red' ? `red-${number++}` : color, color, -ball.pos.x / 1000, -ball.pos.y / 1000);
  }
  window.tablePreviewReport.balls = { count: balls.children.length, radius,
    surfaceY, source: 'ball-sphere',
    positions: balls.children.map(ball => ({ name: ball.name, position: ball.position.toArray() })) };
}

async function loadOriginalTable() {
  if(!window.__threeAssetBuild){
    const asset=await loadBakedAsset('table-venue',{renderer,surfaceLighting});
    const [table,floor]=asset.roots;originalPracticeFloor=floor;tableRoot.position.copy(table.position);tableRoot.quaternion.copy(table.quaternion);tableRoot.scale.copy(table.scale);tableRoot.add(...table.children.slice());scene.add(floor);tableMaterials.push(...asset.materials);window.tablePreviewReport=asset.report;
    return {meshes:asset.report.meshes,triangles:asset.report.triangles};
  }
  const leatherHeightMap = await textureLoader.loadAsync(reviewTextureUrl('./resources/textures/pockets/leather-height.png'));
  leatherHeightMap.name = 'Leather / fine hide relief 1024';
  leatherHeightMap.colorSpace = THREE.NoColorSpace;
  leatherHeightMap.wrapS = leatherHeightMap.wrapT = THREE.RepeatWrapping;
  const response = await fetch('./resources/scenes/table.json');
  if (!response.ok) throw new Error('Missing table scene hierarchy');
  const data = await response.json();
  let meshes = 0;
  let triangles = 0;
  let loadedParts = 0;
  const countParts = node => (node.mesh ? 1 : 0) + (node.children || []).reduce((sum, child) => sum + countParts(child), 0);
  const totalParts = Math.max(1, countParts(data));
  async function build(node) {
    const group = new THREE.Group();
    group.name = node.name;
    // UnityPy OBJ reflects X and reverses triangle winding. Conjugate each
    // Unity transform by that same reflection, preserving the hierarchy.
    group.position.set(-node.position[0], node.position[1], node.position[2]);
    const [x,y,z,w] = node.quaternion;
    group.quaternion.set(x,-y,-z,w);
    group.scale.fromArray(node.scale);
    if (node.mesh) {
      const object = await loader.loadAsync('./resources/' + node.mesh);
      const mats = await Promise.all(node.materials.map(async (source) => {
        const leatherFile = source.name === 'pocketLeather' ? 'corner-leather-color.png' : source.name === 'pocketLeatherMid' ? 'middle-leather-color.png' : null;
        const netFile=source.name==='pocketNet'?'pocket-net-cotton.webp':null;
        const map = netFile ? await textureLoader.loadAsync('./resources/textures/pockets/'+netFile) : leatherFile ? await textureLoader.loadAsync(reviewTextureUrl('./resources/textures/pockets/' + leatherFile))
          : (source.render.surface ? null : detailTexture(source.name)) || (!source.render.surface && source.texture ? await textureLoader.loadAsync('./resources/' + source.texture) : null);
        if (leatherFile) map.name = source.name + ' / baked leather 1024';
        if (map) {
          map.colorSpace = THREE.SRGBColorSpace;
          map.wrapS = map.wrapT = THREE.RepeatWrapping;
          map.repeat.fromArray(source.repeat);
          map.offset.fromArray(source.offset);
          if(netFile){map.name='White fluffy cotton pocket net / approved compact 1024';map.repeat.set(44,9.5);map.offset.set(0,0);}
          map.anisotropy = renderer.capabilities.getMaxAnisotropy();
        }
        const surfaceMaterial = await surfaceLighting.createMaterial(source, map);
        if (surfaceMaterial) { tableMaterials.push(surfaceMaterial); map?.dispose(); return surfaceMaterial; }
        const groundOverlay = source.render.groundOverlay;
        const decal = source.render.decal;
        const net = source.render.net;
        const cloth = source.render.cloth;
        const material = new THREE.MeshStandardMaterial({
          name: source.name, map,
          color: leatherFile ? '#ecd7c8' : 0xffffff,
          dithering: source.texture === 'textures/scene/table-cloth-color-color.png',
          roughness: cloth ? 0.88 : net ? 0.95 : 0.4,
          metalness: source.render.gold ? 0.25 : 0,
          side: net ? THREE.DoubleSide : THREE.FrontSide,
          transparent: decal || net,
          alphaTest: decal || net ? 0.04 : 0,
          depthWrite: !decal,
          polygonOffset: decal,
          polygonOffsetFactor: decal ? -1 : 0,
          emissive: 0xffffff,
          emissiveMap: map,
          emissiveIntensity: net ? 0.35 : (source.floats.unlitAmount ?? (decal ? 1 : 0)),
        });
        if (source.name === 'tablePocketRail') {
          material.dispose();
          const lacquer = new THREE.MeshPhysicalMaterial({name: source.name, color:'#101114', metalness:.12,
            roughness:.23, clearcoat:1, clearcoatRoughness:.14});
          lacquer.userData.pocketFinish=true;tableMaterials.push(lacquer);return lacquer;
        }
        if (source.render.unlit || groundOverlay) {
          material.dispose();
          const unlit = new THREE.MeshBasicMaterial({ name: source.name, map,
            transparent: groundOverlay, depthWrite: !groundOverlay,
            opacity: source.floats.alpha ?? 1, toneMapped: false });
          tableMaterials.push(unlit);
          return unlit;
        }
        tableMaterials.push(material);
        return material;
      }));
      let slot = 0;
      object.traverse(child => {
        if (!child.isMesh) return;
        if (!mats[slot]) throw new Error('Missing material slot: ' + node.name);
        child.material = mats[slot++];
        if (/^pocketLeather/.test(child.material.name)) {const old=child.geometry;flattenPocketSkirt(old);child.geometry=roundPocketLeather(old);old.dispose();child.material.vertexColors=false;child.material.bumpMap=leatherHeightMap;child.material.bumpScale=.00008;child.material.needsUpdate=true;}
        if (child.material.name==='pocketNet') child.geometry=remapPocketNet(child.geometry);
        if (child.material.name==='tableBrandLogo') child.geometry=resizeTableLogo(child.geometry);
        child.castShadow = node.materials[slot-1].render.castShadow;
        child.receiveShadow = true;
        meshes++;
        triangles += child.geometry.attributes.position.count / 3;
      });
      roundPocketRings(object,tableMaterials);
      group.add(object);
      loadedParts++;
      setLoadingProgress(Math.min(60, 5 + Math.round(loadedParts / totalParts * 55)));
    }
    for (const child of node.children) group.add(await build(child));
    return group;
  }
  tableRoot.add(await build(data));
  const upgrade=upgradeTableStructure(tableRoot,null,tableMaterials);
  const box = new THREE.Box3().setFromObject(tableRoot);
  const center = box.getCenter(new THREE.Vector3());
  // Reposition only the complete assembled table to the viewer origin.
  tableRoot.position.set(-center.x, -box.min.y, -center.z);
  const calibrationState = window.SnookerThreeCore.createClientInitialGameState(window.GAME_CLIENT_CONFIG);
  const calibration = calibrateTable(tableRoot, calibrationState, window.SnookerThreeCore.STANDARD_TABLE);
  const calibrationOverlay = createCalibrationOverlay(calibration, calibrationState);
  scene.add(calibrationOverlay);
  const calibrationButton = document.createElement('button');
  calibrationButton.type = 'button'; calibrationButton.textContent = '校准线';
  calibrationButton.title = '绿色：碰撞边界；橙色：落袋判定；蓝色：彩球点位';
  calibrationButton.id = 'toggle-calibration';
  const toggleCalibration = value => {
    calibrationOverlay.visible = value;
    calibrationButton.classList.toggle('is-active', value);
    calibrationButton.setAttribute('aria-pressed', String(value));
  };
  calibrationButton.addEventListener('click', () => toggleCalibration(!calibrationOverlay.visible));
  document.querySelector('.toolbar').append(calibrationButton);
  toggleCalibration(!isTrial && new URLSearchParams(location.search).has('calibration'));
  const environmentResponse = await fetch('./resources/scenes/floor.json');
  if (!environmentResponse.ok) throw new Error('Missing original arena floor');
  const environment = await build(await environmentResponse.json());
  environment.position.copy(tableRoot.position);
  scene.add(environment);
  {
    // Extend the existing selectable floor, leaving baked table shadows at their original size.
    environment.updateMatrixWorld(true);
    environment.traverse(mesh => {
      const sourceMaterial = mesh.material?.userData.sourceMaterial || mesh.material?.name;
      if (!mesh.isMesh || sourceMaterial !== 'floorCarpet') return;
      const bounds = new THREE.Box3().setFromObject(mesh);
      const size = bounds.getSize(new THREE.Vector3()), centre = bounds.getCenter(new THREE.Vector3());
      const factor = Math.max(1, 40 / size.x, 40 / size.z);
      const geometry = mesh.geometry.clone(), position = geometry.attributes.position, uv = geometry.attributes.uv;
      const inverse = mesh.matrixWorld.clone().invert(), point = new THREE.Vector3();
      for (let i = 0; i < position.count; i++) {
        point.fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld);
        point.x = centre.x + (point.x - centre.x) * factor;
        point.z = centre.z + (point.z - centre.z) * factor;
        point.applyMatrix4(inverse); position.setXYZ(i, point.x, point.y, point.z);
        if (uv) uv.setXY(i, (uv.getX(i) - .5) * factor + .5, (uv.getY(i) - .5) * factor + .5);
      }
      geometry.computeBoundingBox(); geometry.computeBoundingSphere();
      mesh.geometry.dispose(); mesh.geometry = geometry;
      mesh.userData.floorCoverageMetres = [size.x * factor, size.z * factor];
    });
  }
  const appearance={rings:0,blackRails:0,leatherTextureWidth:0,netTextureWidth:0};
  meshes=0;triangles=0;
  tableRoot.traverse(object=>{if(!object.isMesh)return;meshes++;
    triangles+=(object.geometry.index?.count ?? object.geometry.attributes.position.count)/3;
    const material=object.material;
    if(material.name==='Pocket ring / rounded brass')appearance.rings++;
    if(material.name==='tablePocketRail'&&material.color.getHexString()==='101114')appearance.blackRails++;
    if(/^pocketLeather/.test(material.name))appearance.leatherTextureWidth=material.map.image.width;
    if(material.name==='pocketNet')appearance.netTextureWidth=material.map.image.width;
  });
  const size = new THREE.Box3().setFromObject(tableRoot).getSize(new THREE.Vector3());
  window.tablePreviewReport = { upgrade: {version:'approved-table-v1',appearance,legs:upgrade.mounts.length,underboard:upgrade.underboard}, meshes, triangles, calibration, size: size.toArray(), source: 'table-assembly',
    transform: { position: tableRoot.position.toArray(), scale: tableRoot.scale.toArray(), quaternion: tableRoot.quaternion.toArray() },
    floor: 'room-floor', floorLayers: 4 };
  return { meshes, triangles: Math.round(triangles) };
}

async function installReconstructedReviewViews() {
  const response = await fetch((models?.v2Assets ?? '/reconstructed/') + 'review-views.json');
  if (!response.ok) return;
  const views = await response.json();
  const select = document.createElement('select');
  select.setAttribute('aria-label', '球桌对比机位');
  select.add(new Option('游戏镜头', ''));
  for (const { id, label } of views) select.add(new Option(label, id));
  const apply = () => {
    const view = views.find(item => item.id === select.value);
    reviewCamera = null;
    if (view) {
      reviewCamera = new THREE.PerspectiveCamera(view.fov, 1, .01, 100);
      reviewCamera.position.fromArray(view.position);
      reviewCamera.up.fromArray(view.up);
      reviewCamera.lookAt(new THREE.Vector3().fromArray(view.target));
      reviewCamera.userData.reviewView = view;
    }
    const url = new URL(location.href);
    if (view) url.searchParams.set('view', view.id);
    else url.searchParams.delete('view');
    history.replaceState(history.state, '', url);
    requestFrame();
  };
  select.addEventListener('change', apply);
  document.querySelector('.toolbar').append(select);
  select.value = new URLSearchParams(location.search).get('view') || '';
  if (select.value) apply();
}

function reconstructedReviewUrl(path) {
  const url = new URL(path, location.origin);
  url.search = location.search;
  return url;
}

async function loadReconstructedTable(target, detached = false) {
  const modelRoot = target ?? tableRoot;
  const base = models?.v2Assets ?? './';
  const [{ GLTFLoader }, response] = await Promise.all([
    import(base + 'GLTFLoader.js'), fetch(base + 'table.json'),
  ]);
  if (!response.ok) throw new Error('重构版资源尚未生成');
  const { revision, calibration, source, venueLighting, surfaceResponse, bakedRail, directionalCloth, clothLighting, previewStage, runtimeBaizeTextures } = await response.json();
  if (venue2026 && !venueLighting) throw new Error('重构版场馆光照尚未生成');
  const config = window.GAME_CLIENT_CONFIG;
  const state = window.SnookerThreeCore.createClientInitialGameState(models ? {
    ...config, physics:{...config.physics, settings:{...config.physics.settings, tableBoundaryId:revision}},
  } : config);
  if (state.tableColliderSet.source !== revision) throw new Error('重构球桌和候选物理边界版本不一致');
  const loader = new GLTFLoader();
  let loaded;
  if (models?.venueAssets) {
    const response = await fetch(base + 'table.glb.gz');
    if (!response.ok) throw new Error('无法加载 Lite 球桌');
    const buffer = await readGzipResponse(response);
    loaded = await loader.parseAsync(buffer, base);
  } else {
    loaded = await loader.loadAsync(models ? './test-field/table-v2-deep-red.glb' : base + 'table.glb');
  }
  const {scene: model} = loaded;
  // The existing ball and cue renderers use this shared reflection probe.
  await surfaceLighting.createMaterial({ name: 'tableRailWood', render: { surface: 'rail' } });
  // Blender's glTF axes (X, Z, -Y) to the test field's (Y, Z, X).
  model.rotation.y = -Math.PI / 2;
  modelRoot.add(model);
  modelRoot.updateMatrixWorld(true);
  const groups = new Map();
  const parts = [];
  let meshes = 0, triangles = 0;
  model.traverse(node => {
    if (node.userData.testFieldGroup) parts.push(node);
    if (node.isMesh) {
      meshes++;
      triangles += (node.geometry.index?.count ?? node.geometry.attributes.position.count) / 3;
    }
  });
  for (const part of parts) {
    const name = part.userData.testFieldGroup;
    if (!groups.has(name)) {
      const group = new THREE.Group();
      group.name = name;
      modelRoot.add(group);
      groups.set(name, group);
    }
    groups.get(name).attach(part);
  }
  const cloth = new THREE.Box3().setFromObject(groups.get('tableCloth'));
  if (groups.get('tableCushions')?.children.length !== 6 || Math.abs(cloth.max.y - calibration.surfaceY) > .00001) {
    throw new Error('重构版台面或胶边的游戏坐标不正确');
  }
  if (venue2026 || models) {
    const surfaces = [
      [groups.get('tableCloth'), 'tableClothColor', 'baize', surfaceResponse?.baize],
      [groups.get('tableCushions'), 'tableCushionCloth', 'cushionSurface', surfaceResponse?.cushionSurface],
    ];
    if (!bakedRail || models) surfaces.push([model.getObjectByName('库边上框'), 'tableRailWood', 'rail', surfaceResponse?.rail]);
    for (const [root, name, surface, authoredLightResponse] of surfaces) {
      const meshes = [];
      root?.traverse(node => { if (node.isMesh) meshes.push(node); });
      if (!meshes.length) throw new Error('缺少台面实时光照网格 ' + name);
      for (const mesh of meshes) {
        const sourceMaterial = mesh.material;
        const cloth = surface !== 'rail';
        const legacyCloth = cloth && clothLighting === '8895';
        const useBedProjection = legacyCloth && surface === 'baize';
        if (!sourceMaterial.map && !(runtimeBaizeTextures && useBedProjection)) {
          throw new Error('缺少定稿底色贴图 ' + name);
        }
        const material = await surfaceLighting.createMaterial({ name, render: { surface } }, useBedProjection ? null : sourceMaterial.map, {
          authoredUV: !useBedProjection,
          authoredLightResponse: legacyCloth ? undefined : authoredLightResponse,
          directionalCloth: cloth && !legacyCloth && directionalCloth,
          side: cloth && (directionalCloth || legacyCloth) ? sourceMaterial.side : undefined,
        });
        if (models && bakedRail && surface === 'rail') {
          genericRailMaterials.set(mesh, material);
          continue;
        }
        mesh.material = material;
        if (surface !== 'rail') {
          if (mesh.geometry.index) mesh.geometry = mesh.geometry.toNonIndexed();
          prepareClothDetailUV(mesh);
        }
      }
    }
  }
  const size = new THREE.Box3().setFromObject(modelRoot).getSize(new THREE.Vector3()).toArray();
  const report = { source: 'reconstructed-table', revision, calibration, sourceBlend: source, meshes, triangles, size, previewStage };
  if (detached) return report;
  window.tablePreviewReport = report;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(24, 24), new THREE.MeshStandardMaterial({ color: 0x263630, roughness: 1 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -.002;
  originalPracticeFloor = floor;
  scene.add(floor);
  if (legacyReconstructed && !venue2026) {
    scene.add(new THREE.HemisphereLight(0xfff1dd, 0x53665c, .8));
    const key = new THREE.DirectionalLight(0xfff5e8, 1.6);
    key.position.set(-1, 4, 2);
    scene.add(key);
  }
  if (legacyReconstructed) {
    const back = document.createElement('button');
    back.type = 'button';
    back.textContent = '返回测试场';
    back.addEventListener('click', () => location.assign(reconstructedReviewUrl('/')));
    document.querySelector('.toolbar').append(back);
  }
  return { meshes, triangles };
}

async function prepareTableFinishes(target) {
  target.traverse(object=>{
    if(!object.isMesh)return;
    for(const material of (Array.isArray(object.material)?object.material:[object.material])){
      if(material.isMeshStandardMaterial){material.envMap=tableEnvironmentTarget.texture;
        if(material.userData.pocketFinish)material.envMapIntensity=1.2;
        material.needsUpdate=true;
      }
      if(!tableMaterials.includes(material))tableMaterials.push(material);
    }
  });
  await surfaceLighting.attachTableFinishes(target);
}

async function assembleTestFieldTable(target, selection, floor) {
  const {classicAssets} = models;
  if (selection.table === 'v2') {
    target.userData.middlePocketReturnRotation = 0;
    // Bake bindings against an off-scene copy. The live meshes remain owned by
    // gameplay and the model inspector while assets are loading.
    stagedR135Table = target.clone(true);
    const originalMeshes = [], stagedMeshes = [];
    target.traverse(mesh => { if (mesh.isMesh) originalMeshes.push(mesh); });
    stagedR135Table.traverse(mesh => { if (mesh.isMesh) stagedMeshes.push(mesh); });
    const sources = new Map();
    const copySource = material => {
      if (!sources.has(material)) sources.set(material, material.clone());
      return sources.get(material);
    };
    stagedR135Meshes = originalMeshes.map((live,index) => {
      const staged = stagedMeshes[index];
      staged.material = Array.isArray(live.material) ? live.material.map(copySource) : copySource(live.material);
      return {live,staged,source:staged.material,geometry:live.geometry,
        generic:genericRailMaterials.get(live) ?? live.material};
    });
    await prepareTestFieldLighting(selection);
    applyTestFieldLighting(selection);
    return;
  }

  const {loadNativeTableBody} = await import('./native-venue/loader.js');
  independentTableBody = await loadNativeTableBody({renderer, base:classicAssets});
  const replaced = new Set(independentTableBody.description.replacedGameNames);
  const duplicates = [];
  target.traverse(node => {
    if (!node.isMesh) return;
    if (replaced.has(node.name)) duplicates.push(node);
    for (const material of [node.material].flat()) {
      if (material.name !== 'tableBrandLogo') continue;
      material.color.setRGB(0,0,0);
      material.emissive.setRGB(0,0,0);
    }
  });
  const prunedNames = floor.userData.venuePruning?.replacedGameNames;
  const prebound = prunedNames?.length === replaced.size && prunedNames.every(name => replaced.has(name));
  if (!duplicates.length && !prebound) throw Error('V1 球桌桌身未能与 8895 资产对应');
  for (const duplicate of duplicates) duplicate.visible = false;
  target.attach(independentTableBody.root);
  target.userData.middlePocketReturnRotation = Math.PI;
  target.userData.middlePocketReturnPivotX = -.000712;
}

async function prepareTestFieldLighting(selection) {
  if (selection.effectiveLighting !== 'r135' || independentTableLighting) return;
  const {loadR135TableLighting} = await import(models.v2Assets + 'room-and-lighting.js');
  for (const {staged,source,geometry} of stagedR135Meshes) {
    staged.material = source;
    staged.geometry = geometry;
  }
  const prepared = await loadR135TableLighting({
    base:models.v2Assets, renderer, tableRoot:stagedR135Table, railViewReflection:surfaceLighting.railViewReflection,
  });
  if (testFieldClosed) {
    prepared.dispose();
    throw Error('测试场已关闭');
  }
  const upperRail = stagedR135Table.getObjectByName('库边上框');
  for (const material of [upperRail?.material].flat()) {
    if (!material?.envMap) continue;
    material.envMapIntensity *= .35;
    material.clearcoatRoughness = .24;
  }
  independentTableLighting = prepared;
}

function applyTestFieldLighting(selection) {
  if (selection.table !== 'v2') return;
  const useR135 = selection.effectiveLighting === 'r135';
  for (const {live,staged,source,geometry,generic} of stagedR135Meshes) {
    if (staged.material === source && staged.geometry === geometry && !genericRailMaterials.has(live)) continue;
    live.geometry = useR135 ? staged.geometry : geometry;
    live.material = useR135 ? staged.material : generic;
  }
}

const crucible2026Details = './resources/venues/crucible-2026-v13/detail-upgrades/';

async function installCrucible2026DrinkDetails(room, detailsUrl) {
  const {GLTFLoader} = await import(models.v2Assets + 'GLTFLoader.js');
  const {scene: details} = await new GLTFLoader().loadAsync(detailsUrl);
  // Match the authored-to-game rotation in the 2026 venue loader.
  details.rotation.y = -Math.PI / 2;
  const originalMaterials = new Map();
  details.traverse(object => {
    if (!object.isMesh) return;
    const original = object.material;
    if (!originalMaterials.has(original)) {
      originalMaterials.set(original, new THREE.MeshBasicMaterial({
        map: original.map, color: new THREE.Color().setScalar(0.55),
        polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2,
      }));
    }
    object.material = originalMaterials.get(original);
  });
  room.root.add(details);
  const disposeRoom = room.dispose.bind(room);
  room.dispose = () => {
    details.removeFromParent();
    details.traverse(object => { if (object.isMesh) object.geometry.dispose(); });
    for (const [original, material] of originalMaterials) {
      material.map.dispose();
      material.dispose();
      original.dispose();
    }
    disposeRoom();
  };
}

async function loadTestFieldRoom(venue, attach = true) {
  const args = {renderer, tableRoot, floor:originalPracticeFloor, independentTable:true, attach};
  if (venue === 'crucible-2026') {
    const {loadCrucible2026} = await import(models.v2Assets + 'room-and-lighting.js');
    const room = await loadCrucible2026({...args, r135FloorBase:models.v2Assets, base:models.venueAssets});
    try {
      await installCrucible2026DrinkDetails(room, crucible2026Details + 'drink-details.glb');
      const { installTestFieldCarpet } = await import('./test-field-carpet.js');
      installTestFieldCarpet(room, renderer, requestFrame);
    } catch (error) {
      room.dispose();
      throw error;
    }
    const perimeterDisplayMaterials = new Set();
    room.root.traverse(object => {
      const material = object.material;
      // The same atlas contains the event artwork and the upper wordmark strip.
      if (object.isMesh && material?.isMeshBasicMaterial && material.map?.name === 'perimeter-static-v13-4096') {
        perimeterDisplayMaterials.add(material);
      }
    });
    for (const material of perimeterDisplayMaterials) material.color.multiplyScalar(0.25);
    return room;
  }
  const {loadPracticeVenue} = await import('./practice-venue.js');
  return loadPracticeVenue(args);
}

function reportTestFieldSelection(selection) {
  Object.assign(window.tablePreviewReport, {
    modelSelection:{...selection},
    tableLighting:selection.effectiveLighting === 'r135' ? independentTableLighting.report : null,
  });
  statusText.textContent = `${selection.table.toUpperCase()} 球桌 · ${selection.venue === 'crucible-2026' ? '2026 克鲁斯堡' : '经典克鲁斯堡'}`;
}

function rememberTestFieldTable(version, root, report) {
  const entry = {
    holder:root === tableRoot ? new THREE.Group() : root,
    position:root.position.clone(), quaternion:root.quaternion.clone(), scale:root.scale.clone(),
    rotation:root.userData.middlePocketReturnRotation, pivot:root.userData.middlePocketReturnPivotX,
    report,
  };
  testFieldTables.set(version,entry);
  return entry;
}

async function prepareTestFieldTable(selection) {
  const saved = testFieldTables.get(selection.table);
  if (saved) return saved;
  const root = new THREE.Group();
  let report, floor, asset;
  if (selection.table === 'v2') {
    report = await loadReconstructedTable(root,true);
  } else {
    asset = await loadBakedAsset('table-venue',{renderer,surfaceLighting});
    const [model, sourceFloor] = asset.roots;
    floor = sourceFloor;
    root.position.copy(model.position);
    root.quaternion.copy(model.quaternion);
    root.scale.copy(model.scale);
    root.add(...model.children.slice());
    report = asset.report;
  }
  try {
    await prepareTableFinishes(root);
    await assembleTestFieldTable(root,selection,floor);
    const entry = rememberTestFieldTable(selection.table,root,report);
    entry.asset = asset;
    return entry;
  } catch (error) {
    asset?.dispose();
    throw error;
  }
}

function activateTestFieldTable(previous, next) {
  previous.holder.add(...tableRoot.children.slice());
  tableRoot.position.copy(next.position);
  tableRoot.quaternion.copy(next.quaternion);
  tableRoot.scale.copy(next.scale);
  tableRoot.add(...next.holder.children.slice());
  tableRoot.userData.middlePocketReturnRotation = next.rotation;
  if (next.pivot === undefined) delete tableRoot.userData.middlePocketReturnPivotX;
  else tableRoot.userData.middlePocketReturnPivotX = next.pivot;
  const balls = window.tablePreviewReport.balls;
  window.tablePreviewReport = {...next.report,balls};
  tableRoot.updateMatrixWorld(true);
}

async function switchTestFieldModels(patch) {
  const current = models.selection;
  const changingTable = patch.table && patch.table !== current.table;
  const next = models.resolve({...current,...patch,...(changingTable ? {lighting:'auto'} : {})});
  let nextRoom;
  try {
    if (next.venue !== current.venue) nextRoom = await loadTestFieldRoom(next.venue,false);
    const nextTable = changingTable ? await prepareTestFieldTable(next) : null;
    await prepareTestFieldLighting(next);
    if (testFieldClosed) throw Error('测试场已关闭');
    if (nextRoom) {
      const previousRoom = practiceVenue;
      previousRoom.deactivate();
      try {
        nextRoom.activate();
        quality?.addRoot(nextRoom.root);
      } catch (error) {
        quality?.removeRoot(nextRoom.root);
        nextRoom.dispose();
        nextRoom = null;
        previousRoom.activate();
        throw error;
      }
      practiceVenue = nextRoom;
      nextRoom = null;
      quality?.removeRoot(previousRoom.root);
      previousRoom.dispose();
    }
    if (nextTable) {
      if (!gameplay?.canSwitchTable()) throw Error('请等本杆结束或退出回放后切换球桌');
      const previousTable = testFieldTables.get(current.table);
      activateTestFieldTable(previousTable,nextTable);
      applyTestFieldLighting(next);
      if (!gameplay.switchTable(next.table)) {
        activateTestFieldTable(nextTable,previousTable);
        throw Error('球桌物理边界切换失败');
      }
      window.tablePreviewReport.physicsSource = window.threeGame.core.getState().tableColliderSet.source;
    } else if (next.effectiveLighting !== current.effectiveLighting) applyTestFieldLighting(next);
    Object.assign(current,next);
    await ballEnvironment?.update(current);
    models.save(current);
    reportTestFieldSelection(current);
    idleSceneCache.release();
    gpuTiming?.reset();
    gameplay?.materialsChanged();
    quality?.syncTextures();
    requestFrame();
  } finally {
    nextRoom?.dispose();
  }
}

// Resizing a WebGL drawing buffer clears it. Resize only inside the next draw,
// so rotation never exposes a cleared buffer while waiting for a throttled RAF.

(async () => {
  await loadOriginalLighting();
  const appearance = resolveAppearanceConfig(isTrial ? window.SnookerTrialTuning.snapshot : { presets: readPresetLibrary() });
  tableRoot.userData.sceneAppearance = appearance.scene;
  surfaceLighting = await loadSurfaceLighting({ renderer, originalSceneMatrix, tableOffset: tableRoot.position,
    initialFloor:appearance.scene.floorMaterial, initialWood:appearance.scene.railWoodStyle, legacyFloor:!!window.__threeAssetBuild,
    burgundyRail: !models && !isTrial && !window.__threeAssetBuild && location.port === '8892',
    onChange:()=>{gameplay?.materialsChanged();requestFrame();} });
  return reconstructed ? loadReconstructedTable() : loadOriginalTable();
})().then(async ({ meshes, triangles }) => {
  setLoadingProgress(65);
  surfaceLighting.bind(scene);
  if(window.__threeAssetBuild){await window.__threeAssetBuild({THREE,renderer,scene,tableRoot,surfaceLighting,report:window.tablePreviewReport});return;}
  setLoadingProgress(70);
  await loadOriginalBalls();
  await prepareTableFinishes(tableRoot);
  if (models) {
    await assembleTestFieldTable(tableRoot,models.selection,originalPracticeFloor);
    rememberTestFieldTable(models.selection.table,tableRoot,window.tablePreviewReport);
    practiceVenue = await loadTestFieldRoom(models.selection.venue);
    quality?.addRoot(practiceVenue.root);
    reportTestFieldSelection(models.selection);
    window.tablePreviewReport.physicsSource = models.selection.table === 'v2' ? window.tablePreviewReport.revision : 'wpbsa-2005-6-parametric-runtime';
    if (!isTrial) models.switch = switchTestFieldModels;
  } else if (!window.__threeAssetBuild && (!reconstructed || venue2026)) {
    const {loadPracticeVenue} = venue2026
      ? {loadPracticeVenue:(await import('./crucible-2026-venue.js')).loadCrucible2026}
      : await import('./practice-venue.js');
    practiceVenue = await loadPracticeVenue({
      renderer, tableRoot, floor:originalPracticeFloor,
      ...(reconstructed ? { reconstructedBase: './' } : {}),
    });
    quality?.addRoot(practiceVenue.root);
    if (venue2026 && !reconstructed) {
      const next = document.createElement('button');
      next.type = 'button';
      next.textContent = '试打重构版';
      next.addEventListener('click', () => location.assign(reconstructedReviewUrl('/reconstructed/')));
      document.querySelector('.toolbar').append(next);
    }
    if (venue2026) await installReconstructedReviewViews();
    if(!isTrial&&!reconstructed){
      let switching=false,closed=false;
      window.addEventListener('pagehide',event=>{if(!event.persisted)closed=true;},{once:true});
      tableRoot.userData.switchVenue=async id=>{
        if(closed||switching)throw Error('场馆正在切换，请稍候');
        if(!['crucible','crucible-2026'].includes(id))throw Error('未知场馆');
        const expected=id==='crucible-2026'?'crucible-2026-v13':'v12-042-compact';
        if(practiceVenue.report.version===expected)return;
        switching=true;let next;
        try{
          const load=id==='crucible-2026'?(await import('./crucible-2026-venue.js')).loadCrucible2026:(await import('./practice-venue.js')).loadPracticeVenue;
          next=await load({renderer,tableRoot,floor:originalPracticeFloor,attach:false});
          if(closed){next.dispose();throw Error('测试场已关闭');}
          const previous=practiceVenue;
          previous.deactivate();
          try{next.activate();quality?.addRoot(next.root);}
          catch(error){quality?.removeRoot(next.root);next.dispose();previous.activate();throw error;}
          practiceVenue=next;quality?.removeRoot(previous.root);previous.dispose();
          idleSceneCache.release();gpuTiming?.reset();gameplay?.materialsChanged();requestFrame();
          const url=new URL(location.href);url.searchParams.set('venue',id);history.replaceState(history.state,'',url);
        }finally{switching=false;}
      };
    }

  }
  setLoadingProgress(85);
  if ((isTrial || !new URLSearchParams(location.search).has('inspect'))) {
    const lighting = createLightingTuning({ balls, ballShadows, tableMaterials, ambient: scene.getObjectByName('room / flat ambient'),onChange:()=>requestFrame() });
    lighting.register(surfaceLighting);
    gameplay = await initializeGame({ environment: tableEnvironmentTarget.texture, surfaceLighting, lighting, scene, tableRoot, camera, renderer, controls, balls, ballShadows, performanceMonitor: perf, requestFrame, quality,
      getVenueRoot: models || !isTrial ? () => practiceVenue?.root : undefined });
  }
  if (models) {
    const {createBallEnvironment} = await import('./ball-environment.js');
    ballEnvironment = createBallEnvironment({balls,onChange:()=>{gameplay?.materialsChanged();requestFrame();}});
    await ballEnvironment.update(models.selection);
    window.tablePreviewReport.ballEnvironment = ballEnvironment.report;
  }
  let entered=false,entryGate=null;
  const enterGame = () => {
    if(entered)return;entered=true;
    window.removeEventListener('practice-replay-start-game',requestEntry);
    syncRendererViewport();
    document.querySelector('#viewer').classList.remove('is-loading');
    loading.remove();
    window.SnookerOnline?.entryReady?.();
    gameplay?.startPresentation();
    gameplay?.activateAudio?.();
  };
  const requestEntry=event=>entryGate?.start(event);
  window.addEventListener('practice-replay-start-game',requestEntry);
  addEventListener('pagehide',()=>{entryGate?.dispose();window.removeEventListener('practice-replay-start-game',requestEntry);},{once:true});
  quality?.syncTextures();
  setLoadingProgress(85);
  await gameplay?.prepareAudio?.(progress=>{
    setLoadingProgress(85+14*(progress.totalBytes?progress.loadedBytes/progress.totalBytes:0));
  });
  if(await gameplay?.prepareReplay()===false)return;
  syncRendererViewport();
  gameplay?.update(performance.now());
  renderPracticeScene(camera);
  setLoadingProgress(100);
  status.classList.add('is-ready');
  const previewStage = window.tablePreviewReport?.previewStage;
  statusText.textContent = models
    ? `${models.selection.table.toUpperCase()} 球桌 · ${venue2026 ? '2026 克鲁斯堡' : '经典克鲁斯堡'}`
    : reconstructed
    ? (previewStage ? `重构球桌 · ${previewStage} 阶段预览` : '重构球桌 · 候选袋口物理')
    : '12ft 升级球桌 · 22 球 · 52.5 mm';
  const button=document.getElementById('loading-start');
  entryGate=createAudioEntryGate({
    ready:()=>!gameplay||gameplay.canAutoStartAudio(),activate:event=>gameplay.activateAudio(event),enter:enterGame,
    show:({pending,message})=>{
      if(!button)return;
      button.dataset.audioEntry='true';button.disabled=pending;button.setAttribute('role','button');
      button.setAttribute('aria-label','开始游戏');
      button.setAttribute('aria-valuetext',message||'');
      if(loadingPercent)loadingPercent.textContent='开始游戏';
      if(!isTrial){button.hidden=false;button.textContent=message?'重试启用声音':'开始游戏';}
      button.onclick=requestEntry;
    }
  });
}).catch((error) => {
  console.error(error);
  if(isTrial)window.reportThreeLoadingError?.(error);
  status.classList.add('is-error');
  statusText.textContent = '模型加载失败';
  loadingBar.style.background = '#ef766f';
  loadingBar.parentElement.setAttribute('aria-valuetext', '加载失败，请刷新重试');
});

let scheduler;
const idleSceneCache=createIdleSceneCache(renderer);
function requestFrame(scene=true){scheduler?.request(scene);}
function renderPracticeScene(viewCamera) {
  if (reviewCamera) {
    const view = reviewCamera.userData.reviewView;
    reviewCamera.aspect = canvas.width / canvas.height;
    const height = 1000;
    const width = height * reviewCamera.aspect;
    reviewCamera.setViewOffset(width, height, view.shiftX * width, -view.shiftY * width, width, height);
    viewCamera = reviewCamera;
  }
  const timed = gpuTiming?.begin();
  try {
  if (practiceVenue) practiceVenue.render(viewCamera, scene, {hideRigging:gameplay?.renderView() === 'god'});
  else renderer.render(scene, viewCamera);
  } finally { if(timed)gpuTiming.end(); }
}
function frameActivity(){return !isTrial || !gameplay ? {scene:true} : gameplay.frameActivity(performance.now());}

function animate(now, frame) {
  try {
  perf.beginFrame(now);
  const viewportChanged=syncRendererViewport();
  if(frame.scene||viewportChanged){
    idleSceneCache.invalidate();
    if(frame.resumed||viewportChanged)gameplay?.resumeFrameClock();
    if (controls.enabled) perf.measure('orbitMs', () => controls.update());
    gameplay?.update(now);
    gameplay?.updateSceneDebug();
    perf.measure('renderSubmitMs', () => renderPracticeScene(gameplay?.renderCamera() ?? camera));
    if(!frameActivity().scene && gameplay?.idleEffect()?.visible)idleSceneCache.capture();
  }else {
    gameplay?.updateUI(now);
    gameplay?.updateIdleEffect();
    if(gameplay?.idleEffect()?.visible){
      const viewCamera=gameplay.renderCamera();
      if(!idleSceneCache.render(gameplay.idleEffect(),viewCamera,croppedCamera=>renderPracticeScene(croppedCamera??viewCamera))){
        renderPracticeScene(viewCamera);idleSceneCache.capture();
      }
    }else idleSceneCache.release();
  }
  perf.endFrame(now);
  quality?.update();
  } catch(error) {
    console.error('[3D frame stopped]',error);
    let recovered=false;
    try{recovered=gameplay?.recoverFrame?.(error)===true;}catch(recoveryError){console.error('[3D recovery failed]',recoveryError);}
    if(!recovered){
      const alert=document.createElement('div');alert.setAttribute('role','alert');
      alert.style.cssText='position:fixed;inset:0;z-index:9999;background:#07100eee;color:#fff;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:16px;padding:24px;text-align:center';
      const text=document.createElement('p');text.textContent='游戏运行遇到异常，请刷新后重试。';
      const retry=document.createElement('button');retry.textContent='刷新游戏';retry.onclick=()=>location.reload();
      alert.append(text,retry);document.body.append(alert);return;
    }
  }
  return frameActivity();
}

scheduler=createFrameScheduler({draw:animate,maxFrameRate:()=>isTrial?Number(window.SnookerOnline?.preferences?.()?.maxFrameRate??window.SnookerProduct?.preferences?.maxFrameRate??window.SnookerPracticeSettings?.read().maxFrameRate)||0:0});
window.threeFrameScheduler=scheduler;
const wakeEvents=['pointerdown','pointermove','pointerup','pointercancel','keydown','keyup','wheel','input','change','click','resize','fullscreenchange','gesturechange','webglcontextrestored'];
const wake=event=>{if(event?.type==='pointermove'&&event.pointerType==='mouse'&&!event.buttons)return;requestFrame();};
for(const type of wakeEvents)window.addEventListener(type,wake,{capture:true,passive:true});
controls.addEventListener('change',wake);
const assetsLoaded=THREE.DefaultLoadingManager.onLoad;
THREE.DefaultLoadingManager.onLoad=()=>{assetsLoaded?.();quality?.syncTextures();requestFrame();};
const visibility=()=>{if(document.hidden)idleSceneCache.release();scheduler.visibility();};
document.addEventListener('visibilitychange',visibility);
const restored=event=>{if(event.persisted)requestFrame();};
window.addEventListener('pageshow',restored);
requestFrame();
window.addEventListener('pagehide', event => {
  if(event.persisted){idleSceneCache.release();scheduler.visibility();return;}
  testFieldClosed = true;
  ballEnvironment?.dispose();
  window.removeEventListener('product-quality-change',syncProductQuality);window.removeEventListener('practice-settings-change',syncPracticeSettings);
  scheduler.dispose();idleSceneCache.dispose();document.removeEventListener('visibilitychange',visibility);window.removeEventListener('pageshow',restored);for(const type of wakeEvents)window.removeEventListener(type,wake,true);controls.removeEventListener('change',wake); gpuTiming?.dispose(); quality?.dispose(); practiceVenue?.dispose(); independentTableLighting?.dispose(); independentTableBody?.dispose(); for (const table of testFieldTables.values()) table.asset?.dispose(); surfaceLighting?.dispose(); perf.destroy(); controls.dispose(); renderer.dispose();
});
