import * as THREE from 'three';
import { gunzipSync } from './vendor/fflate.module.js';

const assetURL = new URL('./resources/lighting/cloth-reflection-rough095-64.json', import.meta.url);
export const PREPARED_CLOTH_ROUGHNESS = .95;

// Half-float display-space radiance, in CubeCamera's +X,-X,+Y,-Y,+Z,-Z order.
// This is prepared offline: no PMREM generation or render-target readback here.
export function decodePreparedClothCube(compressed, metadata) {
  if (metadata.size !== 64 || metadata.channels !== 4 || metadata.type !== 'rgba16f-le'
      || metadata.roughness !== PREPARED_CLOTH_ROUGHNESS || metadata.faces.join(',') !== 'px,nx,py,ny,pz,nz') {
    throw new Error('Unsupported prepared cloth reflection');
  }
  const raw = gunzipSync(compressed), faceWords = metadata.size ** 2 * metadata.channels;
  if (raw.byteLength !== faceWords * 2 * 6) throw new Error('Invalid cloth reflection length');
  const words = new Uint16Array(faceWords * 6), view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
  for (let i = 0; i < words.length; i++) {
    words[i] = view.getUint16(i * 2, true);
    if ((words[i] & 0x7c00) === 0x7c00) throw new Error('Non-finite cloth reflection');
  }
  const images = Array.from({ length: 6 }, (_, face) => new THREE.DataTexture(
    words.subarray(face * faceWords, (face + 1) * faceWords), metadata.size, metadata.size,
    THREE.RGBAFormat, THREE.HalfFloatType,
  ));
  const cube = new THREE.CubeTexture(images);
  cube.name = 'Prepared cloth reflection / roughness 0.95';
  cube.type = THREE.HalfFloatType;
  cube.format = THREE.RGBAFormat;
  cube.colorSpace = THREE.NoColorSpace;
  cube.generateMipmaps = false;
  cube.minFilter = cube.magFilter = THREE.LinearFilter;
  cube.flipY = false;
  cube.needsUpdate = true;
  return cube;
}

export async function loadPreparedClothReflection() {
  const response = await fetch(assetURL);
  if (!response.ok) throw new Error('Missing prepared cloth reflection metadata');
  const metadata = await response.json();
  const binary = await fetch(new URL(metadata.binary, assetURL));
  if (!binary.ok) throw new Error('Missing prepared cloth reflection');
  const texture = decodePreparedClothCube(new Uint8Array(await binary.arrayBuffer()), metadata);
  return { texture, roughness: metadata.roughness, binarySha256: metadata.binarySha256 };
}
