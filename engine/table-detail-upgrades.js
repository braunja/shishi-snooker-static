import * as THREE from 'three';
const cache=new Map();
function canvasTexture(key,w,h,draw){if(cache.has(key))return cache.get(key);const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;map.wrapS=map.wrapT=THREE.RepeatWrapping;map.name=key;cache.set(key,map);return map;}
function lettering(ctx,text,x,y,width,height,color){ctx.save();ctx.fillStyle=color;ctx.font=`italic bold ${height}px Georgia, 'Times New Roman', serif`;ctx.textAlign='center';ctx.textBaseline='middle';const scale=Math.min(1,width/ctx.measureText(text).width);ctx.translate(x,y);ctx.scale(scale,1);ctx.fillText(text,0,0);ctx.restore();}
export function detailTexture(name){
 if(name==='tableBrandLogo')return canvasTexture('Snooker Master / single-line 2048',2048,512,(c,w,h)=>{lettering(c,'Snooker Master',w/2,h/2,w*.92,280,'#392610');});
 return null;
}
function components(geometry){const g=geometry.index?geometry.toNonIndexed():geometry,p=g.attributes.position,parents=[],keys=new Map();
 for(let i=0;i<p.count;i++){const key=[p.getX(i),p.getY(i),p.getZ(i)].map(v=>v.toFixed(5)).join(',');parents[i]=keys.has(key)?keys.get(key):i;if(!keys.has(key))keys.set(key,i);}
 const root=i=>{while(parents[i]!==i){parents[i]=parents[parents[i]];i=parents[i];}return i;};for(let i=0;i<p.count;i+=3){parents[root(i+1)]=root(i);parents[root(i+2)]=root(i);}
 const groups=new Map();for(let i=0;i<p.count;i++){const r=root(i);if(!groups.has(r))groups.set(r,[]);groups.get(r).push(i);}return {g,groups:[...groups.values()]};}
export function remapPocketNet(geometry){const {g,groups}=components(geometry),p=g.attributes.position,uv=g.attributes.uv;
 for(const ids of groups){const box=new THREE.Box3();for(const i of ids)box.expandByPoint(new THREE.Vector3().fromBufferAttribute(p,i));const center=box.getCenter(new THREE.Vector3()),height=box.max.z-box.min.z;
  for(const i of ids)uv.setXY(i,.5+Math.atan2(p.getY(i)-center.y,p.getX(i)-center.x)/(2*Math.PI),(p.getZ(i)-box.min.z)/height);
 }
 for(let i=0;i<p.count;i+=3){const us=[uv.getX(i),uv.getX(i+1),uv.getX(i+2)];if(Math.max(...us)-Math.min(...us)>.5)for(let j=0;j<3;j++)if(us[j]<.5)uv.setX(i+j,us[j]+1);}
 uv.needsUpdate=true;return g;
}
export function roundPocketRings(object,materials){const additions=[];
 object.traverse(mesh=>{if(!mesh.isMesh||mesh.material.name!=='tablePocketRail')return;
  const {g,groups}=components(mesh.geometry),p=g.attributes.position,remove=new Set();
  for(const ids of groups){const box=new THREE.Box3();for(const i of ids)box.expandByPoint(new THREE.Vector3().fromBufferAttribute(p,i));const size=box.getSize(new THREE.Vector3());if(!(size.x>.06&&size.x<.08&&size.y>.06&&size.y<.08&&size.z<.015))continue;
   ids.forEach(i=>remove.add(i));const r=size.x/2,h=size.z/2;
   // Sixteen sides and a plain rectangular section: 128 triangles per ring.
   const pts=[[r-.0031,-h],[r,-h],[r,h],[r-.0031,h],[r-.0031,-h]].map(([x,y])=>new THREE.Vector2(x,y));
   const geom=new THREE.LatheGeometry(pts,16);geom.rotateX(Math.PI/2);geom.translate(...box.getCenter(new THREE.Vector3()).toArray());
   const mat=new THREE.MeshStandardMaterial({name:'Pocket ring / rounded brass',color:'#efbd50',metalness:.72,roughness:.22,emissive:'#b77916',emissiveIntensity:.12,envMap:mesh.material.envMap,envMapIntensity:1});mat.userData.pocketFinish=true;materials.push(mat);additions.push(new THREE.Mesh(geom,mat));
  }
  if(remove.size){const out=new THREE.BufferGeometry();for(const key of Object.keys(g.attributes)){const a=g.attributes[key],data=[];for(let i=0;i<a.count;i++)if(!remove.has(i))for(let k=0;k<a.itemSize;k++)data.push(a.array[i*a.itemSize+k]);out.setAttribute(key,new THREE.Float32BufferAttribute(data,a.itemSize));}mesh.geometry.dispose();mesh.geometry=out;}
 });for(const m of additions)object.add(m);return additions.length;
}

export function resizeTableLogo(geometry){
 const {g,groups}=components(geometry),p=g.attributes.position;
 for(const ids of groups){const b=new THREE.Box3();for(const i of ids)b.expandByPoint(new THREE.Vector3().fromBufferAttribute(p,i));const c=b.getCenter(new THREE.Vector3()),size=b.getSize(new THREE.Vector3());
  for(const i of ids){if(size.x>size.y)p.setX(i,c.x+(p.getX(i)-c.x)*1.7);else p.setY(i,c.y+(p.getY(i)-c.y)*1.7);p.setZ(i,c.z+(p.getZ(i)-c.z)*.68);}
 }p.needsUpdate=true;g.computeBoundingBox();g.computeBoundingSphere();return g;
}

