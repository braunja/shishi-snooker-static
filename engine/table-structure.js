import * as THREE from 'three';
import { createReferenceLeg } from './leg-model.js';
import { addTableUnderboard } from './table-underboard.js';

export function upgradeTableStructure(updated,environment,tableMaterials) {
 updated.updateMatrixWorld(true);
 const round=updated.getObjectByName('tableLegBody');
 const points=[];round.traverse(o=>{if(!o.isMesh)return;const p=o.geometry.attributes.position;for(let i=0;i<p.count;i++)points.push(new THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld));});
 const clusters=axis=>{const values=points.map(p=>p[axis]).sort((a,b)=>a-b),groups=[];for(const v of values){if(!groups.length||v-groups.at(-1).at(-1)>.25)groups.push([]);groups.at(-1).push(v);}return groups.map(g=>(g[0]+g.at(-1))/2);};
 const xs=clusters('x'),zs=clusters('z');
 if(xs.length*zs.length!==8)throw new Error('Expected eight existing leg locations');
 const footY=Math.min(...points.map(p=>p.y));
 const mount=new THREE.Box3().setFromObject(updated.getObjectByName('tableLegMount')).max.y;
 for(const name of ['tableLegBody','tableLegMount']){const group=updated.getObjectByName(name);group.removeFromParent();}
 const existingWood=tableMaterials.find(m=>m.name==='tableLongApronWood'||m.userData.sourceMaterial==='tableLongApronWood');
 const panelMaterial=existingWood.clone();panelMaterial.name='Leg panel / existing walnut-apron-v3';
 const prototype=createReferenceLeg(environment,{panelMaterial});
 const mounts=[];for(const x of xs)for(const z of zs){const leg=prototype.clone(true);leg.position.set(x,footY,z);leg.scale.y=(mount-footY)/.726;updated.add(leg);mounts.push(leg.position.toArray());}
 const underboard=addTableUnderboard(updated);
 return {underboard,mounts};
}
