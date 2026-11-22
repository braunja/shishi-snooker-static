import * as THREE from 'three';
import { MeshoptSimplifier } from './vendor/meshopt_simplifier.module.js';

// Initialization occurs once, before table assembly. All subsequent operations
// are synchronous; render simplification never runs during aiming or a shot.
await MeshoptSimplifier.ready;

export function simplifyTableSurface(mesh,state,report){
 const source=mesh.geometry;
 const tableOnly=mesh.name==='table-cloth-part-0';
 if(!MeshoptSimplifier.supported)return {before:source.attributes.position.count/3,after:source.attributes.position.count/3};
 const position=source.attributes.position,normal=source.attributes.normal,uv=source.attributes.uv;
 const ids=new Map(),positions=[],attributes=[],local=[],indices=[];
 const world=new THREE.Vector3();
 for(let i=0;i<position.count;i++){
  // Keep UV seams and authored normal discontinuities separate.
  const data=[position.getX(i),position.getY(i),position.getZ(i),normal.getX(i),normal.getY(i),normal.getZ(i),uv.getX(i),uv.getY(i)];
  const key=(tableOnly || mesh.name==='table-cushions-part-0') ? [...data.slice(0,3),...data.slice(6)].map(v=>v.toFixed(7)).join(':') : data.join(':');
  if(!ids.has(key)){
   ids.set(key,local.length/3);local.push(...data.slice(0,3));
   world.fromArray(data).applyMatrix4(mesh.matrixWorld);positions.push(world.x,world.y,world.z);
   attributes.push(...data.slice(3));
  }
  indices.push(ids.get(key));
 }
 const lock=new Uint8Array(local.length/3);
 const sectionY=report.surfaceY+(mesh.name==='table-cloth-part-0'?-.000001:state.balls[0].radius/1000+.000001);
 for(let i=0;i<indices.length;i+=3){
  const tri=indices.slice(i,i+3),ys=tri.map(id=>positions[id*3+1]);
  if(Math.min(...ys)<=sectionY&&Math.max(...ys)>=sectionY)for(const id of tri)lock[id]=1;
 }
 const [output,error]=MeshoptSimplifier.simplifyWithAttributes(new Uint32Array(indices),new Float32Array(positions),3,new Float32Array(attributes),5,tableOnly?[0,0,0,.001,.001]:[.001,.001,.001,.001,.001],lock,Math.min(indices.length,1800),tableOnly?.0005:.0004,['LockBorder','ErrorAbsolute']);
 const geometry=new THREE.BufferGeometry(),p=[],n=[],u=[];
 for(const id of output){p.push(...local.slice(id*3,id*3+3));n.push(...attributes.slice(id*5,id*5+3));u.push(...attributes.slice(id*5+3,id*5+5));}
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(p,3));geometry.setAttribute('normal',new THREE.Float32BufferAttribute(n,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(u,2));
 geometry.computeBoundingBox();geometry.computeBoundingSphere();
 // Keep the exact dense position stream for cue clearance; it is never rendered.
 const collision=new THREE.BufferGeometry();collision.setAttribute('position',position);
 mesh.userData.cueCollisionGeometry?.dispose();mesh.userData.cueCollisionGeometry=collision;
 mesh.geometry=geometry;source.dispose();
 return {before:indices.length/3,after:output.length/3,estimatedErrorMm:error*1000,lockedVertices:lock.reduce((s,v)=>s+v,0)};
}

// A separate flat receiver: no upholstery skirts, UVs or normals are needed by
// the cue-shadow shader. Keep the exact tabletop outline and pocket openings.
function fallbackShadowGeometry(source,surfaceY){
 const geometry=source.userData.cueCollisionGeometry||source.geometry;
 const attr=geometry.attributes.position,ids=new Map(),points=[],indices=[];
 const read=i=>new THREE.Vector3().fromBufferAttribute(attr,i).applyMatrix4(source.matrixWorld);
 for(let i=0;i<attr.count;i+=3){
  const vertices=[read(i),read(i+1),read(i+2)];
  if(vertices.some(p=>Math.abs(p.y-surfaceY)>.000001))continue;
  for(const p of vertices){
   const key=`${p.x.toFixed(5)}:${p.z.toFixed(5)}`;
   if(!ids.has(key)){ids.set(key,points.length/3);points.push(p.x,surfaceY,p.z);}
   indices.push(ids.get(key));
  }
 }
 const position=new Float32Array(points),input=new Uint32Array(indices);
 const output=MeshoptSimplifier.supported?MeshoptSimplifier.simplify(input,position,3,Math.min(input.length,1800),.0000001,['LockBorder','ErrorAbsolute'])[0]:input;
 const result=new THREE.BufferGeometry();result.setAttribute('position',new THREE.BufferAttribute(position,3));result.setIndex(new THREE.BufferAttribute(output,1));
 result.computeBoundingBox();result.computeBoundingSphere();return result;
}

export function createClothShadowGeometry(source,surfaceY){
 const sourceGeometry=source.userData.cueCollisionGeometry||source.geometry;
 const attr=sourceGeometry.attributes.position,height=surfaceY-.000001,nodes=new Map();
 const get=p=>{const key=`${p.x.toFixed(6)}:${p.z.toFixed(6)}`;if(!nodes.has(key))nodes.set(key,{p,neighbors:new Set(),component:-1});return key;};
 for(let i=0;i<attr.count;i+=3){
  const vertices=[0,1,2].map(j=>new THREE.Vector3().fromBufferAttribute(attr,i+j).applyMatrix4(source.matrixWorld)),hits=[];
  for(let j=0;j<3;j++){
   const a=vertices[j],b=vertices[(j+1)%3];
   if((a.y>height)===(b.y>height))continue;
   hits.push(a.clone().lerp(b,(height-a.y)/(b.y-a.y)));
  }
  if(hits.length!==2)continue;
  const a=get(hits[0]),b=get(hits[1]);if(a===b)continue;
  nodes.get(a).neighbors.add(b);nodes.get(b).neighbors.add(a);
 }
 // The six skirt sections are open at the timber attachment. Connect only
 // different chains along a common straight outer edge, never across a pocket.
 let component=0;
 for(const [key,node] of nodes){
  if(node.component>=0)continue;
  const pending=[key];while(pending.length){const n=nodes.get(pending.pop());if(n.component>=0)continue;n.component=component;pending.push(...n.neighbors);}
  component++;
 }
 const ends=[...nodes].filter(([,n])=>n.neighbors.size===1);
 for(const [key,node] of ends){
  if(node.neighbors.size!==1)continue;
  const candidates=ends.filter(([k,n])=>k!==key&&n.neighbors.size===1&&n.component!==node.component&&Math.min(Math.abs(n.p.x-node.p.x),Math.abs(n.p.z-node.p.z))<.0005)
   .sort((a,b)=>a[1].p.distanceToSquared(node.p)-b[1].p.distanceToSquared(node.p));
  if(!candidates.length)return fallbackShadowGeometry(source,surfaceY);
  const [other,n]=candidates[0];node.neighbors.add(other);n.neighbors.add(key);
 }
 if(!nodes.size||[...nodes.values()].some(n=>n.neighbors.size!==2))return fallbackShadowGeometry(source,surfaceY);
 const first=nodes.keys().next().value,loop=[],visited=new Set();let key=first;
 while(!visited.has(key)){visited.add(key);const n=nodes.get(key);loop.push(new THREE.Vector2(n.p.x,n.p.z));key=[...n.neighbors].find(k=>!visited.has(k))||first;}
 if(visited.size!==nodes.size)return fallbackShadowGeometry(source,surfaceY);
 const triangles=THREE.ShapeUtils.triangulateShape(loop,[]),positions=[],indices=[];
 for(const p of loop)positions.push(p.x,surfaceY,p.y);
 for(const tri of triangles){const [a,b,c]=tri.map(i=>loop[i]);const ny=(b.y-a.y)*(c.x-a.x)-(b.x-a.x)*(c.y-a.y);indices.push(...(ny>=0?tri:[tri[0],tri[2],tri[1]]));}
 const result=new THREE.BufferGeometry();result.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));result.setIndex(indices);result.computeBoundingBox();result.computeBoundingSphere();return result;
}

// Follow the rendered rail shape, including its sloping cloth and rounded wood.
// Use local coordinates so the receiver can remain a child of the source mesh.
export function createRailShadowGeometry(source,surfaceY){
 const geometry=source.geometry,position=geometry.attributes.position,index=geometry.index;
 const materials=Array.isArray(source.material)?source.material:[source.material];
 const accepts=m=>['rail','cushionSurface'].includes(m?.userData.surfaceRole);
 const count=index?index.count:position.count,points=[];
 const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3(),normal=new THREE.Vector3(),edge=new THREE.Vector3();
 for(let i=0;i<count;i+=3){
  const group=geometry.groups.find(g=>i>=g.start&&i<g.start+g.count);
  if(!accepts(materials[Array.isArray(source.material)?group?.materialIndex??0:0]))continue;
  const ids=[0,1,2].map(j=>index?index.getX(i+j):i+j);
  [a,b,c].forEach((p,j)=>p.fromBufferAttribute(position,ids[j]).applyMatrix4(source.matrixWorld));
  normal.subVectors(b,a).cross(edge.subVectors(c,a)).normalize();
  // Overhead light cannot reach downward-facing surfaces or the table legs.
  if(normal.y<=.001||Math.max(a.y,b.y,c.y)<surfaceY-.001)continue;
  for(const id of ids)points.push(position.getX(id),position.getY(id),position.getZ(id));
 }
 const unique=[],worldPositions=[],indices=[],ids=new Map();
 for(let i=0;i<points.length;i+=3){
  const key=points.slice(i,i+3).join(':');
  if(!ids.has(key)){ids.set(key,unique.length/3);unique.push(...points.slice(i,i+3));a.fromArray(points,i).applyMatrix4(source.matrixWorld);worldPositions.push(a.x,a.y,a.z);}
  indices.push(ids.get(key));
 }
 const output=MeshoptSimplifier.supported?MeshoptSimplifier.simplify(new Uint32Array(indices),new Float32Array(worldPositions),3,Math.floor(indices.length*.5/3)*3,.0003,['LockBorder','ErrorAbsolute'])[0]:indices;
 const reduced=[];for(const id of output)reduced.push(...unique.slice(id*3,id*3+3));
 const result=new THREE.BufferGeometry();result.setAttribute('position',new THREE.Float32BufferAttribute(reduced,3));
 result.computeBoundingBox();result.computeBoundingSphere();return result;
}
