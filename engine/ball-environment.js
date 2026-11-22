import * as THREE from 'three';

// Authored from the matching 8892 scene. No runtime camera, render target or bake.
const base = './test-field/ball-environment/crucible-2026-v2/';
export function createBallEnvironment({balls, onChange=()=>{}}) {
  const materials = [...new Set(balls.children.map(ball=>ball.material))];
  const legacy = new Map(materials.map(material=>[material,material.uniforms.reflectionMap.value]));
  let cube = null, pending = null, disposed = false, revision = 0;
  const report = {active:false,projection:'legacy-box',ready:false};
  async function load() {
    if(cube)return cube;
    if(!pending)pending=(async()=>{
      const response=await fetch(base+'capture.json');
      if(!response.ok)throw Error('球体场馆反射清单加载失败');
      const metadata=await response.json();
      const loader=new THREE.ImageLoader();
      const names=['px','nx','ny','pz','nz'];
      const images=await Promise.all(names.map(face=>loader.loadAsync(base+metadata.files[face].file)));
      if(images.some(image=>image.width!==metadata.resolution||image.height!==metadata.resolution))throw Error('球体场馆反射尺寸不一致');
      const top=document.createElement('canvas');top.width=top.height=metadata.resolution;
      const context=top.getContext('2d');context.fillStyle='#000';context.fillRect(0,0,top.width,top.height);
      const texture=new THREE.CubeTexture([images[0],images[1],top,images[2],images[3],images[4]]);
      // Legacy ball shading composes gamma-space samples, as with the old cube.
      texture.colorSpace=THREE.NoColorSpace;texture.flipY=false;texture.needsUpdate=true;
      texture.name='8892 / 2026 venue / blue-spot ball-height probe';
      if(disposed){texture.dispose();return null;}
      cube=texture;
      Object.assign(report,{ready:true,position:metadata.position,surfaceY:metadata.surfaceY,resolution:metadata.resolution,
        cubeGpuBytesWithMipmaps:metadata.resolution**2*6*4*4/3,source:base+'capture.json'});
      return cube;
    })().catch(error=>{pending=null;throw error;});
    return pending;
  }
  async function update(selection) {
    const request=++revision;
    const matches=selection?.venue==='crucible-2026'&&selection.table==='v2'&&selection.effectiveLighting==='r135';
    const next=matches?await load():null;
    if(disposed||request!==revision)return;
    for(const material of materials) {
      material.uniforms.reflectionMap.value=next||legacy.get(material);
      material.uniforms.useCapturedEnvironment.value=!!next;
    }
    Object.assign(report,{active:!!next,projection:next?'world-direction':'legacy-box'});
    onChange();
  }
  function dispose() {
    if(disposed)return;
    disposed=true;++revision;
    for(const material of materials){material.uniforms.reflectionMap.value=legacy.get(material);material.uniforms.useCapturedEnvironment.value=false;}
    cube?.dispose();cube=null;
    Object.assign(report,{active:false,ready:false,disposed:true});
  }
  return {update,dispose,report};
}
