import * as THREE from 'three';
import { loadTexture } from './abortable-texture.js';
import { CUE_INLAY_SCALE,CUE_WOOD_LENGTH } from './cue-smooth-geometry.js';
// Front colour, grain projection and material coverage are baked offline.
// Kept as a no-op for the inspector's shared decoration adapter.
export function applyPhotographicAshShader(){}
export const cueAppearanceSkipTextureFiles=style=>usesFourSpliceResources(style)?['cue-albedo-0.webp','cue-albedo-1.webp','cue-albedo-2.webp','cue-albedo-3.webp']:['cue-albedo-2.webp'];
async function applyStaticShaft(root,style,{renderer,resourceURL='./',inspection=false,signal}={}){
 const layout=usesFourSpliceResources(style)?'four':'single';
 const base=resourceURL+'resources/textures/cue/static-shaft/';
 const [color,finish]=await Promise.all([layout+'-5.webp',layout+'-'+(inspection?'inspection':'gameplay')+'-finish.png'].map(file=>loadTexture(base+file,signal)));
 color.colorSpace=THREE.SRGBColorSpace;
 for(const map of [color,finish]){map.wrapS=THREE.ClampToEdgeWrapping;map.wrapT=THREE.RepeatWrapping;map.anisotropy=Math.min(8,renderer?.capabilities.getMaxAnisotropy()||1);}
 root.traverse(o=>{if(!o.isMesh||o.name!=='cue-body-part-4')return;
  const m=o.material;m.map=m.emissiveMap=color;m.roughness=.56;m.roughnessMap=finish;
  m.userData.staticApprovedShaft=true;
  o.userData.staticApprovedShaft=true;m.onBeforeCompile=()=>{};m.customProgramCacheKey=()=> 'static-approved-shaft-v1';m.needsUpdate=true;
 });
 return {staticShaft:{color,finish,count:5,layout},dispose(){color.dispose();finish.dispose();}};
}
// This is the exact linear ebony base used by referenceWood in cue-model.js.
// Only remove decorative wood near the butt; retain the shaft and ebony leaf profile.
export function applyBlackThroughShader(shader,reference){
 shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
 bool plainEbony=.725-${reference}.x<.38 && (${reference}.z<.004 || length(vec2(${reference}.y,.708-${reference}.x))>.009);
 if(plainEbony)diffuseColor.rgb=vec3(.009,.011,.010);`);
 shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
 if(plainEbony)totalEmissiveRadiance=vec3(0.);`);
}
const speciesTextures={'thuya-four':'thuya-burl.webp','snakewood-four':'snakewood.webp','pink-ivory-four':'pink-ivory.webp','tulipwood-four':'tulipwood.webp'};
export const usesFourSpliceResources=style=>style==='amboyna-four'||Object.hasOwn(speciesTextures,style);
// Only the burl species changes. All boundaries come from the shared four-splice layout.
export function applyBurlSpeciesShader(shader,texture,reference,endFace=false){
 if(!texture)return;
 shader.uniforms.speciesBurl={value:texture};shader.uniforms.speciesRegion={value:texture.userData.regionMasks[endFace?1:0]};shader.uniforms.speciesEndFace={value:endFace};
 shader.fragmentShader='uniform sampler2D speciesBurl;\nuniform sampler2D speciesRegion;\nuniform bool speciesEndFace;\n'+shader.fragmentShader;
 shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
float burlS=.725-${reference}.x;
// Lossless material-ID mask shares the exact UVs, texel layout and filtering
// of the approved base map. Wood colour never participates in seam coverage.
float speciesMask=texture2D(speciesRegion,vMapUv).r;
if(!speciesEndFace)speciesMask*=1.-step(.35601,burlS);
vec2 speciesUV=speciesEndFace?vec2(${reference}.y,${reference}.z)/.024+.5:vec2(vMapUv.y,1.-burlS/.37);
vec3 speciesColor=texture2D(speciesBurl,speciesUV).rgb*(speciesEndFace?.65:1.);
diffuseColor.rgb=mix(diffuseColor.rgb,speciesColor,speciesMask);`);
 shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>',`vec3 speciesEmission=totalEmissiveRadiance;
#include <emissivemap_fragment>
totalEmissiveRadiance=mix(totalEmissiveRadiance,speciesEmission*speciesColor,speciesMask);`);
}
const singleSpeciesTextures={'amboyna-single':'amboyna-burl.png','snakewood-single':'snakewood.webp','thuya-single':'thuya-burl.webp','pink-ivory-single':'pink-ivory.webp','tulipwood-single':'tulipwood.webp'};
// Reuse the original single-splice boundaries; replace only the inner wood.
export function applySingleSpliceShader(shader,texture,reference){
 if(!texture)return;
 shader.uniforms.singleSpliceWood={value:texture};
 shader.uniforms.singleSpliceMaple={value:texture.userData.singleMaple};
 shader.uniforms.singleWoodWorldSize={value:texture.userData.singleWorldSize};
 shader.fragmentShader='uniform sampler2D singleSpliceWood;\nuniform sampler2D singleSpliceMaple;\nuniform vec2 singleWoodWorldSize;\n'+shader.fragmentShader;
 shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
 float singleS=.725-${reference}.x;
 float singleU=singleS/${CUE_WOOD_LENGTH*CUE_INLAY_SCALE};
 float singleRadius=length(${reference}.yz);
 float singleBoundary=mix(.0060,singleRadius,pow(clamp(singleU/.25,0.,1.),2.));
 float singleDistance=${reference}.z-singleBoundary;
 float singleAA=max(fwidth(singleDistance),.00002);
 float singleMask=smoothstep(-singleAA,singleAA,singleDistance)*(1.-smoothstep(.2495,.2505,singleU));
 float singleMapleBoundary=mix(.0038,singleRadius,pow(clamp(singleU/.29,0.,1.),2.));
 float singleMapleDistance=${reference}.z-singleMapleBoundary;
 float singleMapleAA=max(fwidth(singleMapleDistance),.00002);
 float singleMapleMask=smoothstep(-singleMapleAA,singleMapleAA,singleMapleDistance)*(1.-smoothstep(.2895,.2905,singleU));
 float singleBadgeKeep=smoothstep(.009,.0092,length(vec2(${reference}.y,.708-${reference}.x)));
 // Blend into a true two-dimensional end-grain projection over the bevel.
 // Both surfaces evaluate the same coordinates at the shared boundary.
 float singleEndBlend=1.-smoothstep(0.,.008,singleS);
 float singleAcross=clamp(${reference}.y/.032+.5,0.,1.);
 vec2 singleUV=vec2(singleAcross,1.-singleU/.25);
 vec2 singleEndUV=vec2(singleAcross,clamp(${reference}.z/.032+.5,0.,1.));
 // Equal millimetres per source pixel on both axes; tile instead of stretching.
 ${!texture.userData.singleOriginal?`singleUV=vec2(.5+${reference}.y/singleWoodWorldSize.x,1.-singleS/singleWoodWorldSize.y);singleEndUV=vec2(singleUV.x,1.-(.00855-${reference}.z)/singleWoodWorldSize.y);`:''}
 ${texture.userData.singleOriginal?'singleUV=vec2(.02+.46*singleAcross,4.*(1.-clamp(singleU/.25,0.,1.)));singleEndUV.x=.02+.46*singleAcross;':''}
 ${texture.userData.singleOriginal?'vec3 singleColor=mix(texture2D(singleSpliceWood,singleUV).rgb,texture2D(singleSpliceWood,singleEndUV).rgb,singleEndBlend);':'vec3 singleColor=texture2D(singleSpliceWood,mix(singleUV,singleEndUV,singleEndBlend)).rgb;'}
 ${texture.userData.singleOriginal?'singleColor*=vec3(.65,.68,.72);':''}
 vec2 singleMapleSideUV=vec2(.52+.46*singleAcross,4.*(1.-clamp(singleU/.29,0.,1.)));
 vec2 singleMapleEndUV=vec2(.52+.46*singleAcross,clamp(${reference}.z/.032+.5,0.,1.));
 vec3 singleMaple=mix(texture2D(singleSpliceMaple,singleMapleSideUV).rgb,texture2D(singleSpliceMaple,singleMapleEndUV).rgb,singleEndBlend);
 vec3 singleEndBase=mix(vec3(.009,.011,.010),singleMaple,singleMapleMask);
 vec3 singleFinished=mix(singleEndBase,singleColor,singleMask);
 float singleFinishWeight=singleEndBlend*singleBadgeKeep;
 ${texture.userData.singleOriginal?'diffuseColor.rgb=mix(diffuseColor.rgb,singleFinished,singleFinishWeight);':'diffuseColor.rgb=mix(diffuseColor.rgb,singleEndBase,singleFinishWeight);diffuseColor.rgb=mix(diffuseColor.rgb,singleColor,singleMask*singleBadgeKeep);'}`);
 shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>',`vec3 singleEmission=totalEmissiveRadiance;
#include <emissivemap_fragment>
 ${texture.userData.singleOriginal?'totalEmissiveRadiance=mix(totalEmissiveRadiance,singleEmission*singleFinished,singleFinishWeight);':'totalEmissiveRadiance=mix(totalEmissiveRadiance,singleEmission*singleEndBase,singleFinishWeight);totalEmissiveRadiance=mix(totalEmissiveRadiance,singleEmission*singleColor,singleMask*singleBadgeKeep);'}`);
}
function alignSingleSpliceEnd(root){
 const surfaces=[];root.updateMatrixWorld(true);
 root.traverse(o=>{if(!o.isMesh||!o.geometry.hasAttribute('cueReferencePosition')||o.material?.map?.name!=='Prepared cue albedo')return;
  const ref=o.geometry.attributes.cueReferencePosition;let lo=Infinity,hi=-Infinity;
  for(let i=0;i<ref.count;i++){lo=Math.min(lo,ref.getX(i));hi=Math.max(hi,ref.getX(i));}
  surfaces.push({mesh:o,ref,end:hi-lo<.00001&&hi>.7,hi});
 });
 const body=surfaces.find(o=>!o.end&&o.hi>.7249),end=surfaces.find(o=>o.end);if(!body||!end)return;
 const ring=[];for(let i=0;i<body.ref.count;i++)if(body.ref.getX(i)>body.hi-.000001)ring.push(new THREE.Vector3().fromBufferAttribute(body.ref,i));
 const inverse=end.mesh.matrixWorld.clone().invert(),point=new THREE.Vector3(),positions=end.mesh.geometry.attributes.position;
 for(let i=0;i<end.ref.count;i++){
  const y=end.ref.getY(i),z=end.ref.getZ(i);if(Math.hypot(y,z)<.008)continue;
  let best,score=Infinity;const angle=Math.atan2(y,z);
  for(const p of ring){const delta=Math.abs(Math.atan2(Math.sin(Math.atan2(p.y,p.z)-angle),Math.cos(Math.atan2(p.y,p.z)-angle)));if(delta<score){score=delta;best=p;}}
  if(!best)continue;end.ref.setXYZ(i,best.x,best.y,best.z);point.copy(best).applyMatrix4(inverse);positions.setXYZ(i,point.x,point.y,point.z);
 }
 end.ref.needsUpdate=true;positions.needsUpdate=true;end.mesh.geometry.computeBoundingBox();end.mesh.geometry.computeBoundingSphere();
}
async function applySingleSpliceAppearance(root,style,{renderer,resourceURL,signal}){
 const original=!Object.hasOwn(singleSpeciesTextures,style);
 const texture=await loadTexture(resourceURL+'resources/textures/cue/'+(original?'inlay-wood.png':'styles/'+singleSpeciesTextures[style]),signal);
 const maple=original?texture:await loadTexture(resourceURL+'resources/textures/cue/inlay-wood.png',signal);
 for(const map of new Set([texture,maple])){map.colorSpace=THREE.SRGBColorSpace;map.wrapS=THREE.ClampToEdgeWrapping;map.wrapT=THREE.RepeatWrapping;map.anisotropy=Math.min(8,renderer?.capabilities.getMaxAnisotropy()||1);}
 if(!original)texture.wrapS=texture.wrapT=THREE.MirroredRepeatWrapping;
 const nativeWidth=texture.image.naturalWidth||texture.image.width,nativeHeight=texture.image.naturalHeight||texture.image.height;
 texture.userData.singleWorldSize=new THREE.Vector2(.065,.065*nativeHeight/nativeWidth);
 texture.userData.singleOriginal=original;texture.userData.singleMaple=maple;
 alignSingleSpliceEnd(root);
 root.traverse(o=>{if(!o.isMesh||!o.geometry.hasAttribute('cueReferencePosition')||o.material?.map?.name!=='Prepared cue albedo')return;
  o.material.onBeforeCompile=shader=>{
   shader.vertexShader='varying vec3 singleReference;\nattribute vec3 cueReferencePosition;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nsingleReference=cueReferencePosition;');
   shader.fragmentShader='varying vec3 singleReference;\n'+shader.fragmentShader;
   applySingleSpliceShader(shader,texture,'singleReference');
  };o.material.customProgramCacheKey=()=> 'single-splice-v3-'+style;o.material.needsUpdate=true;o.userData.cueAppearance=style;
 });
 root.userData.cueAppearance=style;
 return {singleSpliceTexture:texture,dispose(){for(const map of new Set([texture,maple]))map.dispose();}};
}
// Shared prepared geometry; decoration is precomputed in static albedo textures.
async function applyDecoratedCueAppearance(root,style,{renderer,resourceURL='./',badgeURL=null,signal}={}){
 if(!style||style==='default'||Object.hasOwn(singleSpeciesTextures,style))return applySingleSpliceAppearance(root,style,{renderer,resourceURL,signal});
 if(style==='black-through'){
 const endMaterials=[];
 root.traverse(o=>{if(!o.isMesh||!o.geometry.hasAttribute('cueReferencePosition')||o.material?.map?.name!=='Prepared cue albedo')return;
 const p=o.geometry.attributes.cueReferencePosition;let lo=Infinity,hi=-Infinity;for(let i=0;i<p.count;i++){lo=Math.min(lo,p.getX(i));hi=Math.max(hi,p.getX(i));}
 // End face is a separate surface: no projected badge or baked decoration may survive here.
 if(hi-lo<.00001&&hi>.7){const m=new THREE.MeshPhysicalMaterial();THREE.MeshStandardMaterial.prototype.copy.call(m,o.material);m.map=m.emissiveMap=null;m.color.setRGB(.009,.011,.010);m.emissive.set(0);m.clearcoat=.92;m.clearcoatRoughness=.09;m.roughness=.20;m.envMapIntensity=.7;o.material=m;o.userData.cueAppearance=style;endMaterials.push(m);return;}
 o.material.onBeforeCompile=shader=>{shader.vertexShader='varying vec3 ebonyReference;\nattribute vec3 cueReferencePosition;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nebonyReference=cueReferencePosition;');shader.fragmentShader='varying vec3 ebonyReference;\n'+shader.fragmentShader;applyBlackThroughShader(shader,'ebonyReference');};
 o.material.customProgramCacheKey=()=> 'black-through-v1';o.material.needsUpdate=true;o.userData.cueAppearance=style;
 });return{blackThrough:true,dispose(){endMaterials.forEach(m=>m.dispose());}};
 }
 if(!usesFourSpliceResources(style))return {dispose(){}};
 const maps=await Promise.all(['body','end','shaft'].map(async name=>{if(name==='shaft')return new THREE.Texture();const t=await loadTexture(resourceURL+'resources/textures/cue/styles/amboyna-four/'+name+'.webp',signal);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=THREE.ClampToEdgeWrapping;t.wrapT=name!=='end'?THREE.RepeatWrapping:THREE.ClampToEdgeWrapping;t.anisotropy=Math.min(8,renderer?.capabilities.getMaxAnisotropy()||1);return t;}));
 let burlTexture=null;
 if(speciesTextures[style]){burlTexture=await loadTexture(resourceURL+'resources/textures/cue/styles/'+speciesTextures[style],signal);burlTexture.colorSpace=THREE.SRGBColorSpace;burlTexture.wrapS=burlTexture.wrapT=THREE.RepeatWrapping;burlTexture.anisotropy=Math.min(8,renderer?.capabilities.getMaxAnisotropy()||1);const regionMasks=await Promise.all(['body','end'].map(async name=>{const t=await loadTexture(resourceURL+'resources/textures/cue/styles/amboyna-four/'+name+'-wood-mask.png',signal);t.wrapS=THREE.ClampToEdgeWrapping;t.wrapT=name==='body'?THREE.RepeatWrapping:THREE.ClampToEdgeWrapping;t.anisotropy=Math.min(8,renderer?.capabilities.getMaxAnisotropy()||1);return t;}));burlTexture.userData.regionMasks=regionMasks;maps.push(...regionMasks);maps.push(burlTexture);}
 root.traverse(o=>{if(!o.isMesh||o.material?.map?.name!=='Prepared cue albedo')return;const g=o.geometry,p=g.attributes.cueReferencePosition;if(!p)return;let lo=Infinity,hi=-Infinity;for(let i=0;i<p.count;i++){lo=Math.min(lo,p.getX(i));hi=Math.max(hi,p.getX(i));}const end=hi-lo<.00001&&hi>.7,shaft=lo<0,uv=g.attributes.uv;
 for(let i=0;i<uv.count;i++){if(end)uv.setXY(i,p.getY(i)/.04+.5,p.getZ(i)/.04+.5);else if(!shaft)uv.setX(i,(.725-p.getX(i))/.415);}uv.needsUpdate=true;o.material.map=o.material.emissiveMap=maps[end?1:shaft?2:0];o.material.onBeforeCompile=shader=>{
 shader.vertexShader='varying vec3 photoReference;\nattribute vec3 cueReferencePosition;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nphotoReference=cueReferencePosition;');
 shader.fragmentShader='varying vec3 photoReference;\n'+shader.fragmentShader;
 applyBurlSpeciesShader(shader,burlTexture,'photoReference',end);
};o.material.customProgramCacheKey=()=> 'cue-style-photo-approved-v4-'+style;o.material.needsUpdate=true;o.userData.cueAppearance=style;o.userData.cueBurlEnd=end;
 });root.userData.cueAppearance=style;if(badgeURL){const badge=await loadTexture(badgeURL,signal);badge.colorSpace=THREE.SRGBColorSpace;badge.anisotropy=Math.min(8,renderer?.capabilities.getMaxAnisotropy()||1);maps.push(badge);root.traverse(o=>{if(!o.isMesh||!o.geometry.hasAttribute('cueReferencePosition')||o.userData.cueAppearance!==style)return;const m=o.material;m.onBeforeCompile=shader=>{shader.uniforms.cueStyleBadge={value:badge};shader.vertexShader='varying vec3 styleBadgeReference;\nattribute vec3 cueReferencePosition;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nstyleBadgeReference=cueReferencePosition;');shader.fragmentShader='varying vec3 styleBadgeReference;\nuniform sampler2D cueStyleBadge;\n'+shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
vec2 badgeUV=vec2(styleBadgeReference.y,.708-styleBadgeReference.x)/.018+.5;float bd=length(badgeUV-.5),aa=max(fwidth(bd),.001);float mask=(1.-smoothstep(.5-aa,.5+aa,bd))*step(.004,styleBadgeReference.z);diffuseColor.rgb=mix(diffuseColor.rgb,texture2D(cueStyleBadge,clamp(badgeUV,0.,1.)*.94+.03).rgb,mask);`);applyBurlSpeciesShader(shader,burlTexture,'styleBadgeReference',o.userData.cueBurlEnd);};m.customProgramCacheKey=()=> 'cue-style-hd-badge-photo-approved-v4-'+style;});}return{burlTexture,dispose(){maps.forEach(t=>t.dispose());}};
}

// Single-splice and black-through cues keep their existing butt decoration.
// The inspector consumes the same photographicAsh handle when it adds its badge.
export async function applyCueAppearance(root,style,options={}){
 const appearance=await applyDecoratedCueAppearance(root,style,options);
 let shaft;try{shaft=await applyStaticShaft(root,style,options);}catch(error){appearance.dispose?.();throw error;}
 return {...appearance,staticShaft:shaft.staticShaft,dispose(){shaft.dispose();appearance.dispose?.();}};
}
