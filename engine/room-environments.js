import * as THREE from 'three';
import { OBJLoader } from './vendor/OBJLoader.js';

// Room shells share the game's separately controlled floor and original coordinates.
export function createRoomEnvironments({scene,offset,renderer,onLoad,nativeVenue=false}) {
 const roots=new Map(),pending=new Map(),resources=new Set();
 const loader=new OBJLoader(),textures=new THREE.TextureLoader(),maps=new Map();
 let selected='none',disposed=false,status='空场景';
 const names={none:'空场景',arena:'比赛场',room:'练习场',crucible:'克鲁斯堡'};
 async function texture(path){if(!maps.has(path))maps.set(path,textures.loadAsync('./resources/'+path).then(t=>{t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=renderer.capabilities.getMaxAnisotropy();resources.add(t);return t;}));return maps.get(path);}
 async function build(n){const g=new THREE.Group();g.name=n.name;g.position.set(-n.position[0],n.position[1],n.position[2]);const[x,y,z,w]=n.quaternion;g.quaternion.set(x,-y,-z,w);g.scale.fromArray(n.scale);
  // Avoid duplicate floor surfaces/overlays; floor controls remain independent.
  if(n.mesh&&!n.floorSurface){
   const obj=await loader.loadAsync('./resources/'+n.mesh);const mats=await Promise.all(n.materials.map(async s=>{
    const map=s.texture?(await texture(s.texture)).clone():null;if(map){map.repeat.fromArray(s.repeat||[1,1]);map.offset.fromArray(s.offset||[0,0]);resources.add(map);}
    const alpha=s.render.environmentAlpha;
    const m=new THREE.MeshBasicMaterial({name:s.name,map,color:0xffffff,side:THREE.DoubleSide,transparent:alpha,alphaTest:alpha?.04:0,depthWrite:!alpha,toneMapped:false});resources.add(m);return m;
   }));let slot=0;obj.traverse(o=>{if(o.isMesh){resources.add(o.geometry);o.material=mats[slot++];}});g.add(obj);
  }
  for(const c of n.children||[])g.add(await build(c));return g;
 }
 function select(value){if(!(value in names))return Promise.reject(new Error('Unknown room environment'));if(nativeVenue&&value==='crucible')return Promise.resolve();selected=value;for(const[k,r]of roots)r.visible=k===selected;status=names[value];if(value==='none'||roots.has(value))return Promise.resolve();status=names[value]+'加载中…';
  if(!pending.has(value))pending.set(value,(async()=>{let root;if(value==='crucible'){
   const {createCrucibleEnvironment}=await import('./crucible-environment.js');root=createCrucibleEnvironment({renderer,blueBannerMap:await texture('textures/scene/banner-blue-color.png')});
   root.traverse(o=>{if(o.isInstancedMesh)resources.add(o);if(o.geometry)resources.add(o.geometry);for(const m of (Array.isArray(o.material)?o.material:o.material?[o.material]:[])){resources.add(m);for(const t of Object.values(m))if(t?.isTexture)resources.add(t);}});
  }else{const r=await fetch('./resources/scenes/environment-'+value+'.json');if(!r.ok)throw new Error('HTTP '+r.status);root=await build(await r.json());root.position.add(offset);}
  if(disposed)return;root.name=names[value];root.visible=selected===value;scene.add(root);roots.set(value,root);onLoad(root);})().catch(e=>{if(selected===value)status=names[value]+'加载失败：'+e.message;pending.delete(value);}).finally(()=>{if(disposed){for(const r of resources)r.dispose();}else if(roots.has(selected))status=names[selected];}));return pending.get(value);
 }
 return {select,status:()=>status,dispose(){disposed=true;for(const r of roots.values())r.removeFromParent();for(const r of resources)r.dispose();}};
}
