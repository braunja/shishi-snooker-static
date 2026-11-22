import { applyCueFerrule } from './cue-ferrule.js';
import { applyCueAppearance,usesFourSpliceResources,cueAppearanceSkipTextureFiles } from './cue-appearance.js';
import { loadBakedAsset } from './baked-assets.js';
import { reviewTextureUrl, textureReviewEnabled } from './texture-review.js';
import * as THREE from 'three';
import { OBJLoader } from './vendor/OBJLoader.js';
import { createCueBrassEnvironment, applyCueBrass } from './cue-brass.js';
import { smoothCueGeometry, cueButtSocket, CUE_INLAY_SCALE } from './cue-smooth-geometry.js';
// Decoration boundaries live in continuous cue coordinates, not individual mesh UVs.
// u runs butt -> ferrule; v=.5 is the badge / sword-grain face.
export function applyReferenceSplices(material, badgeMap, woodMap, surfaceScale=1, surfaceOffset=new THREE.Vector3()) {
  material.onBeforeCompile = shader => {
    shader.uniforms.referenceBadge={value:badgeMap};
    shader.uniforms.inlayWood={value:woodMap};shader.uniforms.inlayScale={value:CUE_INLAY_SCALE};
    shader.uniforms.cueScale={value:surfaceScale};shader.uniforms.cueOffset={value:surfaceOffset};
    shader.vertexShader=shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 cueSurface;\nattribute vec3 cueReferencePosition;').replace('#include <begin_vertex>', '#include <begin_vertex>\ncueSurface=cueReferencePosition;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <map_pars_fragment>', `#include <map_pars_fragment>
uniform sampler2D referenceBadge;
uniform sampler2D inlayWood;
uniform float inlayScale;
varying vec3 cueSurface;
vec4 referenceWood(vec2 uv) {
  float u=uv.x/inlayScale, v=fract(uv.y);
  // Keep only ash from the source atlas here; its misplaced inlay is not used.
  vec4 ash=texture2D(map,vec2(${textureReviewEnabled ? '(0.96+1238.04*uv.x)/1239.0' : '.43+.57*uv.x'},v));
  float sector=abs(fract(v*4.+.5)-.5)*2.;
  // Preserve the original full ebony leaf; trim only the bottom of each ash valley.
  // Smooth the angular absolute value only near each ebony apex: a small
  // rounded nose, while preserving the existing forward extent at u=.45.
  float noseRadius=.06;
  float roundedSector=(sqrt(sector*sector+noseRadius*noseRadius)-noseRadius)
    /(sqrt(1.+noseRadius*noseRadius)-noseRadius);
  float ebonyEnd=.35+.10*sqrt(max(0.,1.-roundedSector));
  float aa=max(fwidth(u-ebonyEnd),.0001);
  float ebonyMask=1.-smoothstep(-aa,aa,u-ebonyEnd);
  // Axial cutoff is independent of leaf shape, with a short antialiased finish.
  ebonyMask=max(ebonyMask,1.-smoothstep(.367,.369,u));
  vec4 ebony=vec4(vec3(.009,.011,.010),1.);
  vec4 color=mix(ash,ebony,ebonyMask);
  // One pair of continuous material boundaries defines the whole splice,
  // including the sides and the butt end face. No separate end-band overlay.
  vec4 brown=texture2D(inlayWood,vec2(.02+.46*clamp((v-.25)*2.,0.,1.),4.*(1.-clamp(u/.25,0.,1.))));
  vec4 maple=texture2D(inlayWood,vec2(.52+.46*clamp((v-.25)*2.,0.,1.),4.*(1.-clamp(u/.29,0.,1.))));
  brown.rgb*=vec3(.65,.68,.72);
  float radius=length(cueSurface.yz);
  float mapleHeight=mix(.0038,radius,pow(clamp(u/.29,0.,1.),2.));
  float brownHeight=mix(.0060,radius,pow(clamp(u/.25,0.,1.),2.));
  float md=cueSurface.z-mapleHeight,bd=cueSurface.z-brownHeight;
  float ma=max(fwidth(md),.00002),ba=max(fwidth(bd),.00002);
  float mapleMask=smoothstep(-ma,ma,md)*(1.-smoothstep(.2895,.2905,u));
  float brownMask=smoothstep(-ba,ba,bd)*(1.-smoothstep(.2495,.2505,u));
  color=mix(color,maple,mapleMask);
  color=mix(color,brown,brownMask);
  // Sample the badge directly on the existing front face: no floating decal mesh.
  // Centre 17 mm from the butt; photo plane follows the cue's real surface.
  vec2 badgeUV=vec2(cueSurface.y, .708-cueSurface.x)/.018+.5;
  float badgeDistance=length(badgeUV-.5);
  float badgeAA=max(fwidth(badgeDistance),.001);
  float badgeMask=(1.-smoothstep(.5-badgeAA,.5+badgeAA,badgeDistance))*step(.004,cueSurface.z);
  vec4 badge=texture2D(referenceBadge,clamp(badgeUV,0.,1.)*.94+.03);
  return mix(color,badge,badgeMask);
}`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>', 'diffuseColor *= referenceWood(vMapUv);');
    shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>', 'totalEmissiveRadiance *= referenceWood(vEmissiveMapUv).rgb;');
  };
  material.customProgramCacheKey=()=> 'reference-full-leaf-trimmed-ash-v18';
}
export async function loadCueModel(renderer, config, { reference=true, quality='optimized', environment=null, useBaked=true, cueAppearance=window.SnookerProduct?.cueAppearance, ferruleEquipmentId=window.SnookerProduct?.ferruleEquipmentId, signal }={}) {
if(reference && quality==='optimized' && useBaked && !window.__threeAssetBuild){
  const asset=await loadBakedAsset('cue',{renderer,environment,skipTextureFiles:cueAppearanceSkipTextureFiles(cueAppearance),signal}),metalEnvironment=createCueBrassEnvironment(renderer);
  for(const m of asset.materials)if(m.userData.preserveCueMetalEnvironment){m.envMap=metalEnvironment.texture;m.needsUpdate=true;}
  let style,ferrule,disposed=false;
  try{style=await applyCueAppearance(asset.roots[0],cueAppearance,{renderer,badgeURL:'/cue-badge-hd.webp',signal});ferrule=await applyCueFerrule(asset.roots[0],ferruleEquipmentId,{renderer,environment:metalEnvironment.texture,signal});signal?.throwIfAborted();}
  catch(e){ferrule?.dispose();style?.dispose();asset.dispose();metalEnvironment.dispose();throw e;}
  return {cue:asset.roots[0],cueSpace:asset.report.cueSpace,environment:null,metalEnvironment,dispose(){if(disposed)return;disposed=true;ferrule.dispose();style.dispose();asset.dispose();metalEnvironment.dispose();}};
}
const rootPath='./resources/';
const textures=new Set();
async function texture(file){const map=await new THREE.TextureLoader().loadAsync(reviewTextureUrl(rootPath+file));map.colorSpace=THREE.SRGBColorSpace;map.wrapT=THREE.RepeatWrapping;map.wrapS=THREE.ClampToEdgeWrapping;textures.add(map);return map;}
async function loadCue(v,index,config){
  const cue=await new OBJLoader().loadAsync(rootPath+config.mesh);v.cue=cue;
  if(index===1)cue.children.forEach((part,slot)=>{part.geometry.dispose();part.geometry=smoothCueGeometry(slot,quality);});
  if(!environment){v.cube=await new THREE.CubeTextureLoader().loadAsync(['px','nx','py','ny','pz','nz'].map(f=>'./resources/textures/reflections/ball-'+f+'.png'));v.cube.colorSpace=THREE.SRGBColorSpace;
  const pmrem=new THREE.PMREMGenerator(v.renderer);v.environment=pmrem.fromCubemap(v.cube);
  pmrem.dispose();}else v.environment={texture:environment};
  if(index===1)v.metalEnvironment=createCueBrassEnvironment(v.renderer);
  const bounds=new THREE.Box3().setFromObject(cue),center=bounds.getCenter(new THREE.Vector3());
  const axis=new THREE.Box3().setFromObject(cue.children[1]).getCenter(new THREE.Vector3());
  const scale=1.45/(bounds.max.x-bounds.min.x);
  const woodMin=new THREE.Box3().setFromObject(cue.children[4]).min.x,woodMax=bounds.max.x;
  const atlas=index===1?await texture('textures/cue/shaft-wood.png'):null;
  const woodMap=index===1?await texture('textures/cue/inlay-wood.png'):null;
  if(woodMap){woodMap.wrapT=THREE.MirroredRepeatWrapping;woodMap.anisotropy=v.renderer.capabilities.getMaxAnisotropy();}
  const badgeMap=index===1?await texture('textures/cue/brand-badge.png'):null;
  if(badgeMap){badgeMap.wrapT=THREE.ClampToEdgeWrapping;badgeMap.anisotropy=v.renderer.capabilities.getMaxAnisotropy();}
  await Promise.all(cue.children.map(async(part,slot)=>{
    const source=config.materials[slot].textures.colorMap||config.materials[slot].textures.baseMap;
    const wood=[0,3,4].includes(slot),map=index===1&&wood?atlas:index===1&&slot===2?null:await texture(source.file);
    if(map)map.anisotropy=v.renderer.capabilities.getMaxAnisotropy();
    if(map&&!(index===1&&wood)){map.repeat.fromArray(source.repeat);map.offset.fromArray(source.offset);map.wrapS=wood?THREE.ClampToEdgeWrapping:THREE.RepeatWrapping;}
    const uv=part.geometry.attributes.uv,p=part.geometry.attributes.position;
    if(index===1&&wood){
      // One continuous object-space unwrap across all three wood meshes.
      const angles=[];for(let i=0;i<p.count;i++)angles.push(.5+Math.atan2(p.getY(i)-axis.y,p.getZ(i)-axis.z)/(2*Math.PI));
      for(let i=0;i<p.count;i+=3){const seam=Math.max(...angles.slice(i,i+3))-Math.min(...angles.slice(i,i+3))>.5;
        for(let j=i;j<i+3;j++){let a=angles[j];if(seam&&a<.5)a+=1;uv.setXY(j,(woodMax-p.getX(j))/(woodMax-woodMin),a);}}
      uv.needsUpdate=true;
    } else if(slot===4){let lo=Infinity,hi=-Infinity;for(let i=0;i<uv.count;i++){lo=Math.min(lo,uv.getY(i));hi=Math.max(hi,uv.getY(i));}for(let i=0;i<uv.count;i++)uv.setY(i,(uv.getY(i)-lo)/(hi-lo));uv.needsUpdate=true;}
    (Array.isArray(part.material)?part.material:[part.material]).forEach(m=>m.dispose());
    part.material=new THREE.MeshStandardMaterial({name:config.materials[slot].name,map,metalness:slot===2?1:0,roughness:slot===2?.14:slot===1?.92:.4,envMap:slot===2?v.environment.texture:null,envMapIntensity:1.2,emissive:0xffffff,emissiveMap:slot===1?null:map,emissiveIntensity:slot===2||slot===1?0:.65});
    if(index===1&&slot===2)applyCueBrass(part.material,v.metalEnvironment);
    if(index===1&&wood){part.material.emissiveIntensity=.12;part.material.envMap=v.environment.texture;part.material.roughness=.32;applyReferenceSplices(part.material,badgeMap,woodMap);}
    part.geometry.translate(-center.x,-axis.y,-axis.z);part.geometry.scale(scale,scale,scale);
  }));
  if(index===1){
    const socket=cueButtSocket(quality);
    socket.traverse(o=>{if(o.isMesh)o.userData.cueSocketPart=true;});
    socket.position.set(-center.x*scale,-axis.y*scale,-axis.z*scale);socket.scale.setScalar(scale);
    socket.traverse(o=>{if(o.isMesh&&o.material.metalness===1){
      // Keep the socket's brass color and distinct sleeve/thread roughness.
      // Share the neutral metal probe, not the varnished-wood reflection shader.
      o.material.envMap=v.metalEnvironment.texture;o.material.envMapIntensity=1.2;
      o.material.userData.preserveCueMetalEnvironment=true;
      o.material.userData.cueMetalPart='socket';
      o.material.emissiveIntensity=0;
    }});
    const endFace=socket.children[0];endFace.material.dispose();
    endFace.material=cue.children[0].material.clone();
    applyReferenceSplices(endFace.material,badgeMap,woodMap,scale,new THREE.Vector3(-center.x*scale,-axis.y*scale,-axis.z*scale));
    cue.add(socket);
  }
  // Freeze reference coordinates before callers orient the model for gameplay.
  cue.updateMatrixWorld(true);
  cue.traverse(mesh=>{if(!mesh.isMesh)return;
    const reference=mesh.geometry.attributes.position.clone();
    const point=new THREE.Vector3();
    for(let i=0;i<reference.count;i++){
      point.fromBufferAttribute(reference,i).applyMatrix4(mesh.matrixWorld);
      reference.setXYZ(i,point.x,point.y,point.z);
    }
    mesh.geometry.setAttribute('cueReferencePosition',reference);
  });
}
const v={renderer};
await loadCue(v,reference?1:0,config);
return {...v, dispose(){
  v.cue.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});
  if(!environment)v.environment?.dispose();v.metalEnvironment?.dispose();v.cube?.dispose();
  textures.forEach(t=>t.dispose());
}};
}
