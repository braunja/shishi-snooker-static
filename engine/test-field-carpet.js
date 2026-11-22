import * as THREE from 'three';

const finishes = {
  'short-pile': { period: .18, strength: .44 },
  'fine-wool': { period: .14, strength: .52 },
  'dense-low-pile': { period: 2, strength: 1.35, midpoint: .161 },
};

export function installTestFieldCarpet(room, renderer, requestFrame) {
  const materials = new Set();
  room.root.getObjectByName('2026 baked carpet')?.traverse(object => {
    if (object.isMesh && object.material.customProgramCacheKey() === 'approved-directional-floor-v1') {
      materials.add(object.material);
    }
  });
  if (!materials.size) return;

  const loader = new THREE.TextureLoader();
  const textures = new Map();
  const uniforms = {
    carpetPileMap: { value: null },
    carpetPileRepeat: { value: 0 },
    carpetPileStrength: { value: 0 },
    carpetPileMidpoint: { value: .502 },
  };
  let enabled = false;
  let selected = 'baked';
  let disposed = false;

  for (const material of materials) {
    const compile = material.onBeforeCompile;
    const baseKey = material.customProgramCacheKey();
    material.onBeforeCompile = (shader, webglRenderer) => {
      compile.call(material, shader, webglRenderer);
      if (!enabled) return;
      Object.assign(shader.uniforms, uniforms);
      shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>
        uniform sampler2D carpetPileMap;
        uniform float carpetPileRepeat;
        uniform float carpetPileStrength;
        uniform float carpetPileMidpoint;
      `).replace('outgoingLight = tableFloorLighting();', `
        float pile = texture2D(carpetPileMap, tableFloorPosition.xz * carpetPileRepeat).r;
        outgoingLight = tableFloorLighting() * (1.0 + carpetPileStrength * (pile - carpetPileMidpoint));
      `);
    };
    material.customProgramCacheKey = () => enabled ? baseKey + '/carpet-pile' : baseKey;
  }

  function enable(value) {
    if (enabled === value) return;
    enabled = value;
    for (const material of materials) material.needsUpdate = true;
  }

  room.root.userData.setCarpetDetail = (finish, multiplier) => {
    const spec = finishes[finish];
    if (!spec) {
      selected = 'baked';
      enable(false);
      return;
    }
    uniforms.carpetPileRepeat.value = multiplier / spec.period;
    uniforms.carpetPileStrength.value = spec.strength;
    uniforms.carpetPileMidpoint.value = spec.midpoint ?? .502;
    if (selected === finish) return;
    selected = finish;
    enable(false);
    if (!textures.has(finish)) {
      const pending = loader.loadAsync(new URL(`./test-field/carpet/${finish}.png`, import.meta.url).href);
      textures.set(finish, pending);
      pending.then(texture => {
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
        texture.needsUpdate = true;
      }, () => textures.delete(finish));
    }
    textures.get(finish).then(texture => {
      if (disposed || selected !== finish) return;
      uniforms.carpetPileMap.value = texture;
      enable(true);
      requestFrame();
    }, error => {
      if (disposed || selected !== finish) return;
      selected = 'baked';
      console.error('地毯细纹加载失败', error);
    });
  };

  const disposeRoom = room.dispose.bind(room);
  room.dispose = () => {
    disposed = true;
    delete room.root.userData.setCarpetDetail;
    for (const texture of textures.values()) texture.then(map => map.dispose(), () => {});
    textures.clear();
    disposeRoom();
  };
}
