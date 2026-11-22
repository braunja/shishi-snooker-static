import * as THREE from 'three';
import { createClothShadowGeometry, createRailShadowGeometry } from './table-render-geometry.js';
import { installCueShadowScissor } from './cue-shadow-scissor.js';

// Soft overhead-light approximation on the cloth plane and actual rail surfaces.
export function createCueLighting({ cue, cloth, tableRoot, scene, environment, surfaceLighting }) {
  const surfaces = new Map();
  function collectSurfaces(){cue.traverse(part => {
    if (!part.isMesh || !part.material.isMeshStandardMaterial || surfaces.has(part.material) || part.material.userData.staticFerrule) return;
    if (!part.material.userData.preserveCueMetalEnvironment) part.material.envMap = environment;
    if (!part.material.userData.preserveCueMetalEnvironment) part.material.envMapIntensity = part.material.metalness > .5 ? 1.15 : .8;
    part.material.needsUpdate = true;
    const room = !part.material.userData.preserveCueMetalEnvironment ? surfaceLighting?.attachCueMaterial(part.material) : null;
    surfaces.set(part.material, { room, reflection: part.material.envMapIntensity, roughness: part.material.roughness, emission: part.material.emissiveIntensity, socket: part.material.userData.cueMetalPart === 'socket', brass: Boolean(part.material.userData.preserveCueMetalEnvironment) });
  });
  }
  collectSurfaces();
  const bounds = new THREE.Box3().setFromObject(cue);
  const tipLocal = new THREE.Vector3(0, bounds.min.y, 0);
  const buttLocal = new THREE.Vector3(0, bounds.max.y, 0);
  const tip = new THREE.Vector3(), butt = new THREE.Vector3();
  const material = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, depthTest: true,
    polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
    uniforms: { tip: { value: tip }, butt: { value: butt }, opacity: { value: 0 }, strength: { value: .42 }, softness: { value: 1 }, heightFade: { value: 4 } },
    vertexShader: `varying vec3 worldPoint;
      void main(){ vec4 p=modelMatrix*vec4(position,1.); worldPoint=p.xyz;
      gl_Position=projectionMatrix*viewMatrix*p; }`,
    fragmentShader: `varying vec3 worldPoint; uniform vec3 tip,butt;
      uniform float opacity,strength,softness,heightFade;
      void main(){vec2 segment=butt.xz-tip.xz;
        float t=clamp(dot(worldPoint.xz-tip.xz,segment)/max(dot(segment,segment),.000001),0.,1.);
        float height=mix(tip.y,butt.y,t)-worldPoint.y;
        if(height<-.001)discard;
        height=max(0.,height);
        float width=mix(.0045,.014,t)+(.006+height*.16)*softness;
        float d=length(worldPoint.xz-mix(tip.xz,butt.xz,t));
        float alpha=strength*opacity*exp(-height*heightFade)*exp(-2.*d*d/(width*width));
        if(alpha<.002)discard;gl_FragColor=vec4(0.,0.,0.,alpha);
      }`,
  });
  const shadow = new THREE.Mesh(undefined, material);
  shadow.name = 'Cue soft table shadow'; shadow.matrixAutoUpdate = false;
  shadow.renderOrder = 18;
  const shadowGroup = new THREE.Group(); shadowGroup.renderOrder = 18;
  shadowGroup.add(shadow); scene.add(shadowGroup);
  const railShadows=[];
  let removeScissor;
  function clearReceivers() {
    removeScissor?.();
    for(const receiver of railShadows){receiver.removeFromParent();receiver.geometry.dispose();}
    railShadows.length=0;
    shadow.geometry.dispose();
  }
  function bindTable(cloth) {
    cloth.updateWorldMatrix(true, true);
    const source = cloth.isMesh ? cloth : cloth.children.find(o => o.isMesh) || cloth.getObjectsByProperty('isMesh', true)[0];
    const surfaceY = new THREE.Box3().setFromObject(cloth).max.y;
    clearReceivers();
    shadow.geometry = source.userData.clothShadowGeometry?.clone() || createClothShadowGeometry(source,surfaceY);
    tableRoot?.updateWorldMatrix(true,true);
    const railSources=[];
    tableRoot?.traverse(o=>{
      if(o.isMesh&&(Array.isArray(o.material)?o.material:[o.material]).some(m=>['rail','cushionSurface'].includes(m.userData.surfaceRole)))railSources.push(o);
    });
    for(const source of railSources){
      const geometry=source.userData.railShadowGeometry?.clone() || createRailShadowGeometry(source,surfaceY);
      if(!geometry.attributes.position.count){geometry.dispose();continue;}
      const receiver=new THREE.Mesh(geometry,material);
      receiver.name='Cue soft rail shadow';receiver.renderOrder=18;
      source.add(receiver);railShadows.push(receiver);
    }
    removeScissor = installCueShadowScissor([shadow, ...railShadows], material.uniforms);
    updateVisibility();
  }
  let shadowEnabled = true;
  function updateVisibility(){
    shadow.visible=cue.visible&&shadowEnabled;
    for(const receiver of railShadows)receiver.visible=shadow.visible;
  }
  bindTable(cloth);
  const parameters = [
    { id: 'cueDiffuseTop', nameZh: '顶部柔光强度', group: '球杆基础照明', min: 0, max: 2, step: .01, default: .85, description: '中性顶部照明随杆身表面朝向变化，照亮木纹，独立于镜面反射。' },
    { id: 'cueDiffuseFill', nameZh: '暗部补光强度', group: '球杆基础照明', min: 0, max: 1, step: .01, default: .25, description: '抬高杆身暗部，保留深色镶嵌本色；不改变铜箍。' },
    { id: 'cueReflection', nameZh: '环境反射倍率', group: '球杆材质光泽', min: 0, max: 3, step: .01, default: 1, description: '调节杆身及其他部件反射；黄铜杆箍由下方独立控制。' },
    { id: 'cueRoughness', nameZh: '粗糙度倍率', group: '球杆材质光泽', min: .25, max: 2, step: .01, default: 1, description: '越高越哑光，越低越光滑；不影响黄铜杆箍。' },
    { id: 'cueRoomEdge', nameZh: '掠视角高光倍率', group: '球杆材质光泽', min: 0, max: 3, step: .01, default: 1, description: '球杆与木边共用赛场反射探针，独立控制球杆高光。' },
    { id: 'cueRoomFocus', nameZh: '高光集中度倍率', group: '球杆材质光泽', min: .1, max: 3, step: .01, default: 1, description: '越高，高光越集中在掠视角。' },
    { id: 'cueBaseLight', nameZh: '底图自发光倍率', group: '球杆材质光泽', min: 0, max: 2, step: .01, default: 1, description: '调整底图亮度；降低后环境光泽更明显。' },
    { id: 'cueBrassReflection', nameZh: '铜箍反射强度', group: '黄铜杆箍', min: 0, max: 3, step: .01, default: 1.15, description: '独立调节中性环境反射，保留黄铜本色。' },
    { id: 'cueBrassRoughness', nameZh: '铜箍粗糙度', group: '黄铜杆箍', min: .05, max: 1, step: .01, default: .19, description: '越低越抛光，越高越哑光；不影响木质杆身。' },
    { id: 'cueShadowEnabled', nameZh: '显示球杆投影', group: '球杆表面投影', type: 'checkbox', default: true },
    { id: 'cueShadowOpacity', nameZh: '投影深浅', group: '球杆表面投影', min: 0, max: 1, step: .01, default: .42, description: '越低越浅，仍随击球动画淡出。' },
    { id: 'cueShadowSoftness', nameZh: '投影柔和程度', group: '球杆表面投影', min: .1, max: 3, step: .01, default: 1, description: '越高扩散越宽、边缘越柔。' },
    { id: 'cueShadowHeightFade', nameZh: '高度衰减', group: '球杆表面投影', min: 0, max: 15, step: .1, default: 4, description: '越高，球杆离台面、布库或木边表面越远时，投影变淡越快。' },
  ];
  return {
    parameters,bindTable,
    apply(values) {
      collectSurfaces();
      for (const [surface, base] of surfaces) {
        if (base.socket) {
          surface.envMapIntensity = base.reflection * values.cueReflection;
          surface.roughness = Math.min(1, Math.max(.02, base.roughness * values.cueRoughness));
          surface.emissiveIntensity = base.emission;
          continue;
        }
        if (base.brass) {
          surface.envMapIntensity = values.cueBrassReflection;
          surface.roughness = values.cueBrassRoughness;
          surface.emissiveIntensity = base.emission;
          continue;
        }
        surface.envMapIntensity = base.reflection * values.cueReflection;
        if(base.room){
          base.room.cueDiffuseTop.value=values.cueDiffuseTop;
          base.room.cueDiffuseFill.value=values.cueDiffuseFill;
          base.room.cueRoomStrength.value=base.reflection*values.cueReflection;
          base.room.cueRoomEdge.value=values.cueRoomEdge;
          base.room.cueRoomFocus.value=values.cueRoomFocus;
        }
        surface.roughness = Math.min(1, Math.max(.02, base.roughness * values.cueRoughness));
        surface.emissiveIntensity = base.emission * values.cueBaseLight;
      }
      shadowEnabled = values.cueShadowEnabled;
      updateVisibility();
      material.uniforms.strength.value = values.cueShadowOpacity;
      material.uniforms.softness.value = values.cueShadowSoftness;
      material.uniforms.heightFade.value = values.cueShadowHeightFade;
    },
    update() {
      updateVisibility();
      if (!cue.visible) return;
      cue.updateWorldMatrix(true, false);
      tip.copy(tipLocal).applyMatrix4(cue.matrixWorld);
      butt.copy(buttLocal).applyMatrix4(cue.matrixWorld);
      material.uniforms.opacity.value = cue.children[0]?.material.opacity ?? 1;
    },
    dispose() { clearReceivers(); scene.remove(shadowGroup); material.dispose(); },
  };
}
