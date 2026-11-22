import * as THREE from 'three';
import { loadTexture } from './abortable-texture.js';
import { readGzipResponse } from './gzip-response.js';
import { applyLegNormalMaterial } from './leg-model.js';

// The release artifact contains final geometry and independently retained exact
// collision geometry. Editor generators are not run by the practice client.
export async function loadBakedAsset(name, {renderer, surfaceLighting=null, environment=null,baseURL='./resources/baked/',resourceURL='./',skipTextureFiles=[],signal}={}) {
  const base=baseURL,skipped=new Set(skipTextureFiles);
  const response=await fetch(base+name+'.json',{signal});
  if(!response.ok)throw new Error('Missing prepared asset: '+name);
  const data=await response.json();
  const raw=await fetch(base+data.binary,{signal});if(!raw.ok)throw new Error('Missing prepared geometry: '+name);
  const binary=data.compression==='gzip' ? await readGzipResponse(raw) : await raw.arrayBuffer(),geometries=[],textures={},materials=[];
  const cleanup=()=>{for(const g of geometries)g.dispose();for(const m of materials)m.dispose();for(const t of Object.values(textures))t.dispose();};
  try {
  signal?.throwIfAborted();
  const constructors={Float32Array,Float64Array,Uint16Array,Uint32Array,Uint8Array,Int16Array};
  for(const record of data.geometries){
    let g=new THREE.BufferGeometry();g.name=record.name||'';
    for(const [key,a] of Object.entries(record.attributes)){const A=constructors[a.type];if(!A)throw Error('Unsupported asset attribute');g.setAttribute(key,new THREE.BufferAttribute(new A(binary,a.offset,a.length),a.itemSize,a.normalized));}
    if(record.index){const a=record.index,A=constructors[a.type];g.setIndex(new THREE.BufferAttribute(new A(binary,a.offset,a.length),1));}
    for(const group of record.groups||[])g.addGroup(group.start,group.count,group.materialIndex);
    if(record.drawRange)g.setDrawRange(...record.drawRange);
    if(record.expandIndex&&g.index){const indexed=g;g=g.toNonIndexed();indexed.dispose();}
    g.computeBoundingBox();g.computeBoundingSphere();geometries.push(g);
  }
  const pending=Object.entries(data.textures||{});let cursor=0;
  await Promise.all(Array.from({length:Math.min(4,pending.length)},async()=>{while(cursor<pending.length){const [id,t]=pending[cursor++];const map=skipped.has(t.file)?new THREE.Texture():await loadTexture(t.file.startsWith('./')?resourceURL+t.file.slice(2):base+t.file,signal);for(const key of ['name','colorSpace','flipY','wrapS','wrapT','magFilter','minFilter','generateMipmaps'])if(t[key]!==undefined)map[key]=t[key];map.repeat.fromArray(t.repeat);map.offset.fromArray(t.offset);map.anisotropy=Math.min(t.anisotropy||1,renderer?.capabilities.getMaxAnisotropy()||1);map.needsUpdate=true;textures[id]=map;}}));
  const materialLoader=new THREE.MaterialLoader().setTextures(textures);
  for(const record of data.materials){
    let m;
    if(record.surface){if(!surfaceLighting)throw Error('Surface lighting required');m=await surfaceLighting.createMaterial({name:record.surface,render:{surface:record.role}},null);m.name=record.name;}
    else {m=materialLoader.parse(record.json);if(m.isMeshStandardMaterial)m.envMap=environment;if(m.userData.tableFinish==='leg')applyLegNormalMaterial(m);}
    materials.push(m);
  }
  function object(record){
    const o=record.geometry!==undefined?new THREE.Mesh(geometries[record.geometry],Array.isArray(record.material)?record.material.map(i=>materials[i]):materials[record.material]):new THREE.Group();
    o.name=record.name;o.position.fromArray(record.position);o.quaternion.fromArray(record.quaternion);o.scale.fromArray(record.scale);o.visible=record.visible;o.renderOrder=record.renderOrder||0;o.castShadow=!!record.castShadow;o.receiveShadow=!!record.receiveShadow;o.userData={...record.userData};
    if(record.collision!==undefined)o.userData.cueCollisionGeometry=geometries[record.collision];
    for(const k of ['clothShadowGeometry','railShadowGeometry'])if(record[k]!==undefined)o.userData[k]=geometries[record[k]];
    for(const child of record.children)o.add(object(child));return o;
  }
  if(data.report?.cueSpace?.positions){const s=data.report.cueSpace,p=new Float64Array(binary,s.positions.offset,s.positions.length),ids=new Uint32Array(binary,s.indices.offset,s.indices.length),triangles=[];for(let i=0;i<ids.length;i+=3)triangles.push([0,1,2].map(j=>Array.from(p.subarray(ids[i+j]*3,ids[i+j]*3+3))));data.report.cueSpace={geometry:s.geometry,triangles};}
  const roots=data.roots.map(object);
  return {roots,materials,textures,geometries,report:data.report,dispose:cleanup};
  } catch(error){cleanup();throw error;}
}
