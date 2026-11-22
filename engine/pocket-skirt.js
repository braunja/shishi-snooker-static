import * as THREE from 'three';
// Keep the stitched collar intact; retain 75% of the original outward flare.
// Source OBJ axes: Z is table height; U follows the stitched perimeter.
export function flattenPocketSkirt(geometry) {
 const p=geometry.attributes.position,uv=geometry.attributes.uv,n=geometry.attributes.normal;
 const anchors=[];
 for(let i=0;i<p.count;i++)if(p.getZ(i)>-.009&&p.getZ(i)<-.005)anchors.push(i);
 if(!anchors.length)return;
 const original=p.array.slice(),oldNormals=n.array.slice();
 let bottomMin=Infinity,bottomMax=-Infinity;
 for(let i=0;i<p.count;i++)if(p.getZ(i)<-.03){bottomMin=Math.min(bottomMin,p.getZ(i));bottomMax=Math.max(bottomMax,p.getZ(i));}
 const bottom=(bottomMin+bottomMax)/2;
 const flare=.75, toothDepth=.0024;
 const sourceToothDepth=Math.max(bottomMax-bottomMin,1e-6);
 for(let i=0;i<p.count;i++){
  if(p.getZ(i)>=-.03)continue;
  let closest=-1,best=Infinity;
  for(const a of anchors){
   const dx=p.getX(i)-p.getX(a),dy=p.getY(i)-p.getY(a),distance=Math.hypot(dx,dy);
   if(distance>.13)continue;
   // Select the same side of the thin leather, preserving thickness.
   if(n.getX(i)*n.getX(a)+n.getY(i)*n.getY(a)+n.getZ(i)*n.getZ(a)<0)continue;
   const score=Math.abs(uv.getX(i)-uv.getX(a))*10+distance;
   if(score<best){best=score;closest=a;}
  }
  if(closest<0)throw new Error('Pocket apron hem has no matching collar anchor');
  p.setXYZ(i,p.getX(closest)+(original[i*3]-p.getX(closest))*flare,
   p.getY(closest)+(original[i*3+1]-p.getY(closest))*flare,
   bottom+(original[i*3+2]-bottom)/sourceToothDepth*toothDepth);
  // Map the re-shaped hem to its matching seam station, not its former flare.
  uv.setXY(i,uv.getX(closest),.285+(p.getZ(i)-bottom)*4.2);
 }
 uv.needsUpdate=true;p.needsUpdate=true;geometry.computeVertexNormals();
 // Only the deformed skirt needs new normals; keep the original collar shading.
 for(let i=0;i<p.count;i++)if(original[i*3+2]>=-.03)n.setXYZ(i,oldNormals[i*3],oldNormals[i*3+1],oldNormals[i*3+2]);
 n.needsUpdate=true;densifyPocketHem(geometry);geometry.computeBoundingBox();geometry.computeBoundingSphere();
}


// Add 50% more tooth cycles only along the apron hem. Shared front/back
// stations use the same phase so the thin cut edge remains closed.
function densifyPocketHem(g) {
 const p=g.attributes.position, uv=g.attributes.uv, normal=g.attributes.normal;
 const keys=new Map(), points=[], ids=[];
 for(let i=0;i<p.count;i++){
  if(p.getZ(i)>=-.03){ids[i]=-1;continue;}
  const key=[p.getX(i),p.getY(i),p.getZ(i)].map(v=>v.toFixed(6)).join(',');
  if(!keys.has(key)){keys.set(key,points.length);points.push({p:new THREE.Vector3().fromBufferAttribute(p,i),u:uv.getX(i),links:new Set()});}
  ids[i]=keys.get(key);
 }
 for(let i=0;i<p.count;i+=3)for(let j=0;j<3;j++){
  const a=ids[i+j],b=ids[i+(j+1)%3];if(a>=0&&b>=0){points[a].links.add(b);points[b].links.add(a);}
 }
 const seen=new Set();
 const hemCycles=[];
 for(let seed=0;seed<points.length;seed++){
  if(seen.has(seed))continue;
  const component=[],queue=[seed];seen.add(seed);
  while(queue.length){const i=queue.pop();component.push(i);for(const j of points[i].links)if(!seen.has(j)){seen.add(j);queue.push(j);}}
  const stations=[...new Set(component.map(i=>points[i].u.toFixed(5)))].map(Number).sort((a,b)=>a-b);
  hemCycles.push({before:(stations.length-1)/2,after:(stations.length-1)*.75});
  const low=Math.min(...component.map(i=>points[i].p.z)),high=Math.max(...component.map(i=>points[i].p.z));
  for(const i of component){const v=points[i];v.station=stations.reduce((best,u,k)=>Math.abs(u-v.u)<Math.abs(stations[best]-v.u)?k:best,0);v.center=(low+high)/2;v.depth=(high-low)/1.5;}
  // Remove the old alternating outward flare before drawing the smaller teeth.
  for(const i of component){const v=points[i],neighbors=[];for(const offset of [-1,1]){
   const candidates=component.filter(j=>points[j].station===v.station+offset);
   if(candidates.length)neighbors.push(points[candidates.reduce((a,b)=>points[a].p.distanceToSquared(v.p)<points[b].p.distanceToSquared(v.p)?a:b)].p);
  }v.smooth=v.p.clone();if(neighbors.length===2){v.smooth.x=(neighbors[0].x+2*v.p.x+neighbors[1].x)/4;v.smooth.y=(neighbors[0].y+2*v.p.y+neighbors[1].y)/4;}}
 }
 const vertex=i=>({p:new THREE.Vector3().fromBufferAttribute(p,i),uv:new THREE.Vector2().fromBufferAttribute(uv,i),n:new THREE.Vector3().fromBufferAttribute(normal,i),hem:ids[i]>=0?points[ids[i]]:null});
 const shape=v=>{if(!v.hem)return v;const h=v.hem,phase=h.station*1.5,wave=1-2*Math.abs((phase%2)-1);v.p.copy(h.smooth);v.p.z=h.center+wave*h.depth/2;v.uv.y=.285+(v.p.z-h.center)*4.2;return v;};
 const positions=[],coords=[],normals=[];
 const emit=(...vs)=>{for(const v of vs){positions.push(...v.p.toArray());coords.push(...v.uv.toArray());normals.push(...v.n.toArray());}};
 for(let i=0;i<p.count;i+=3){const original=[vertex(i),vertex(i+1),vertex(i+2)],polygon=[];
  for(let j=0;j<3;j++){const a=original[j],b=original[(j+1)%3];polygon.push(shape({...a,p:a.p.clone(),uv:a.uv.clone()}));
   if(!a.hem||!b.hem)continue;
   const x=a.hem.station*1.5,y=b.hem.station*1.5,cuts=[];
   for(let k=Math.floor(Math.min(x,y))+1;k<Math.max(x,y)-1e-6;k++)cuts.push((k-x)/(y-x));
   cuts.sort((a,b)=>a-b);
   for(const t of cuts)polygon.push(shape({p:new THREE.Vector3(),uv:a.uv.clone().lerp(b.uv,t),n:a.n.clone().lerp(b.n,t).normalize(),hem:{station:a.hem.station+(b.hem.station-a.hem.station)*t,center:a.hem.center,depth:a.hem.depth,smooth:a.hem.smooth.clone().lerp(b.hem.smooth,t)}}));
  }
  if(polygon.length===3)emit(...polygon);
  else{const center={p:new THREE.Vector3(),uv:new THREE.Vector2(),n:new THREE.Vector3()};for(const v of polygon){center.p.add(v.p);center.uv.add(v.uv);center.n.add(v.n);}center.p.divideScalar(polygon.length);center.uv.divideScalar(polygon.length);center.n.normalize();for(let j=0;j<polygon.length;j++)emit(center,polygon[j],polygon[(j+1)%polygon.length]);}
 }
 g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(coords,2));g.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
 g.userData.hemCycles=hemCycles;
}

// Split shared horizontal collar edges; skirt triangles stay at the original density.
export function roundPocketLeather(source) {
 const g=source.index?source.toNonIndexed():source.clone();g.computeVertexNormals();
 const p=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv,groups=new Map(),ns=[];
 const key=i=>[p.getX(i),p.getY(i),p.getZ(i)].map(v=>v.toFixed(5)).join(',');
 for(let i=0;i<p.count;i++){const k=key(i);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(i);}
 for(const ids of groups.values()){const sum=new THREE.Vector3();for(const i of ids)sum.add(new THREE.Vector3().fromBufferAttribute(n,i));sum.normalize();for(const i of ids)ns[i]=sum;}
 const vertex=i=>({p:new THREE.Vector3().fromBufferAttribute(p,i),n:ns[i],uv:new THREE.Vector2().fromBufferAttribute(uv,i)});
 const split=(a,b)=>Math.abs(a.p.z-b.p.z)<.00001&&a.p.z>-.01&&a.p.distanceTo(b.p)>.004;
 function mid(a,b){const c=a.p.clone().add(b.p).multiplyScalar(.5),v=c.clone();for(const e of [a,b])v.addScaledVector(e.n,-.32*c.clone().sub(e.p).dot(e.n));v.z=c.z;for(const axis of ['x','y'])v[axis]=THREE.MathUtils.clamp(v[axis],Math.min(a.p[axis],b.p[axis]),Math.max(a.p[axis],b.p[axis]));return {p:v,uv:a.uv.clone().add(b.uv).multiplyScalar(.5)};}
 const positions=[],coords=[];const tri=(...vs)=>{for(const v of vs){positions.push(...v.p.toArray());coords.push(...v.uv.toArray());}};
 for(let i=0;i<p.count;i+=3){let vs=[vertex(i),vertex(i+1),vertex(i+2)],flags=vs.map((v,j)=>split(v,vs[(j+1)%3])),count=flags.filter(Boolean).length;
  if(!count){tri(...vs);continue;}
  if(count===1){const k=flags.indexOf(true),a=vs[k],b=vs[(k+1)%3],c=vs[(k+2)%3],ab=mid(a,b);tri(a,ab,c);tri(ab,b,c);}
  else if(count===2){const k=(flags.indexOf(false)+1)%3,a=vs[k],b=vs[(k+1)%3],c=vs[(k+2)%3],ab=mid(a,b),bc=mid(b,c);tri(a,ab,c);tri(ab,bc,c);tri(ab,b,bc);}
  else{const[a,b,c]=vs,ab=mid(a,b),bc=mid(b,c),ca=mid(c,a);tri(a,ab,ca);tri(ab,b,bc);tri(ca,bc,c);tri(ab,bc,ca);}
 }
 const out=new THREE.BufferGeometry();out.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));out.setAttribute('uv',new THREE.Float32BufferAttribute(coords,2));out.computeVertexNormals();smoothPocketNormals(out);out.computeBoundingBox();out.computeBoundingSphere();g.dispose();return out;
}

// Calibration deforms the table and rebuilds face normals. Restore smooth seams afterwards.
export function smoothPocketNormals(g){
 const p=g.attributes.position,n=g.attributes.normal,groups=new Map(),out=n.array.slice();
 let top=-Infinity;for(let i=0;i<p.count;i++)top=Math.max(top,p.getZ(i));
 for(let i=0;i<p.count;i++){const k=[p.getX(i),p.getY(i),p.getZ(i)].map(v=>v.toFixed(5)).join(',');if(!groups.has(k))groups.set(k,[]);groups.get(k).push(i);}
 for(const ids of groups.values())for(const i of ids){const base=new THREE.Vector3().fromBufferAttribute(n,i),sum=new THREE.Vector3();for(const j of ids){const v=new THREE.Vector3().fromBufferAttribute(n,j);if(base.dot(v)>.15)sum.add(v);}sum.normalize().toArray(out,i*3);}
 // The flat cap must not inherit varying normals from its bevel triangles.
 // Pin the shared top rim too, so the bevel transitions continuously to the cap.
 for(let i=0;i<p.count;i++)if(Math.abs(p.getZ(i)-top)<.00001){out[i*3]=0;out[i*3+1]=0;out[i*3+2]=1;}
 n.array.set(out);n.needsUpdate=true;
}
