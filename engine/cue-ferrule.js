import * as THREE from 'three';
import { loadTexture } from './abortable-texture.js';

export const FERRULES=Object.freeze({
 '4-basic':Object.freeze({name:'brass',metalness:1,roughness:.085}),
 '4-upgrade':Object.freeze({name:'cupronickel',metalness:1,roughness:.075}),
 '4-2':Object.freeze({name:'titanium',metalness:1,roughness:.10})
});
// Retired carbon equipment and unknown IDs use the standard brass ferrule.
export function ferruleEquipmentId(id){return Object.hasOwn(FERRULES,id)?id:'4-basic';}

// One small, precomputed color map. Polished metal uses scalar roughness:
// no normal/roughness-map fetches, derivative work or procedural shader.
export async function applyCueFerrule(root,id,{renderer,resourceURL='./',environment=null,signal}={}){
 const equipmentId=ferruleEquipmentId(id),spec=FERRULES[equipmentId],meshes=[];
 root.traverse(o=>{if(o.isMesh&&o.name==='cue-body-part-2')meshes.push(o);});
 if(!meshes.length)throw Error('Cue ferrule mesh is missing');
 const map=await loadTexture(resourceURL+'resources/textures/cue/ferrules/'+spec.name+'-color.webp',signal);
 let material;
 try{
  map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=Math.min(4,renderer?.capabilities.getMaxAnisotropy()||1);
  material=new THREE.MeshStandardMaterial({name:'cueFerrule-'+spec.name,map,
   metalness:spec.metalness,roughness:spec.roughness,envMap:environment||meshes[0].material.envMap,
   envMapIntensity:1.15});
  material.userData.ferruleEquipmentId=equipmentId;material.userData.staticFerrule=true;
  const originals=meshes.map(o=>o.material);for(const mesh of meshes)mesh.material=material;
  let disposed=false;
  return {equipmentId,material,dispose(){if(disposed)return;disposed=true;meshes.forEach((o,i)=>{if(o.material===material)o.material=originals[i];});material.dispose();map.dispose();}};
 }catch(e){material?.dispose();map.dispose();throw e;}
}
