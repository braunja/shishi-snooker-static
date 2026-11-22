import * as THREE from 'three';

// Close each existing rail's open underside at its own bottom edge.
// No separate slab, no new exterior skirt, and no enclosure around the pockets.
export function addTableUnderboard(table) {
 table.updateMatrixWorld(true);
 const frame=table.getObjectByName('tableRailFrame');
 const bottom=new THREE.Box3().setFromObject(frame).min.y;
 const edges=new Map(),vertices=new Map();let material;
 const key=p=>p.toArray().map(v=>v.toFixed(5)).join(',');
 frame.traverse(mesh=>{if(!mesh.isMesh)return;
  if(mesh.material.name==='tableRailEdgeWood'||mesh.material.userData.sourceMaterial==='tableRailEdgeWood')material=mesh.material;
  const geo=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry,p=geo.attributes.position;
  for(let i=0;i<p.count;i+=3){const tri=[0,1,2].map(j=>new THREE.Vector3().fromBufferAttribute(p,i+j).applyMatrix4(mesh.matrixWorld));
   for(let j=0;j<3;j++){const a=tri[j],b=tri[(j+1)%3];if(Math.abs(a.y-bottom)>.00003||Math.abs(b.y-bottom)>.00003)continue;
    const ka=key(a),kb=key(b),id=[ka,kb].sort().join('|');vertices.set(ka,a);vertices.set(kb,b);const old=edges.get(id);edges.set(id,{a:ka,b:kb,count:(old?.count||0)+1});
   }
  }if(geo!==mesh.geometry)geo.dispose();
 });
 const adjacency=new Map();for(const e of edges.values())if(e.count===1){for(const [a,b] of [[e.a,e.b],[e.b,e.a]]){if(!adjacency.has(a))adjacency.set(a,[]);adjacency.get(a).push(b);}}
 const seen=new Set(),sections=[];
 for(const start of adjacency.keys()){if(seen.has(start))continue;const stack=[start],pts=[];while(stack.length){const k=stack.pop();if(seen.has(k))continue;seen.add(k);pts.push(vertices.get(k));for(const next of adjacency.get(k)||[])if(!seen.has(next))stack.push(next);}sections.push(pts);}
 if(sections.length!==6||sections.some(p=>p.length!==4))throw new Error('Expected six open, four-corner rail undersides');
 const group=new THREE.Group();group.name='Existing wooden rails / completed underside faces';
 const wood=material.clone();wood.name='Rail underside / original edge wood';
 for(const [index,pts] of sections.entries()){
  const center=pts.reduce((c,p)=>c.add(p),new THREE.Vector3()).multiplyScalar(.25);
  pts.sort((a,b)=>Math.atan2(a.z-center.z,a.x-center.x)-Math.atan2(b.z-center.z,b.x-center.x));
  const positions=[],uv=[];for(const i of [0,1,2,0,2,3]){const p=pts[i];positions.push(p.x,p.y,p.z);const alongX=Math.abs(pts[1].x-pts[0].x)>Math.abs(pts[1].z-pts[0].z);uv.push((alongX?p.x:p.z)*.6,(alongX?p.z:p.x)*4);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.computeVertexNormals();
  const mesh=new THREE.Mesh(g,wood);mesh.name=`Rail ${index+1} / flush wood underside`;group.add(mesh);
 }
 table.add(group);group.updateMatrixWorld(true);
 const holes=[];table.traverse(o=>{if(o.isMesh&&o.material.name==='Pocket ring / rounded brass')holes.push(new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3()));});
 const ray=new THREE.Raycaster();for(const p of holes){ray.set(new THREE.Vector3(p.x,bottom-1,p.z),new THREE.Vector3(0,1,0));if(ray.intersectObject(group,true).length)throw new Error('Rail closure obstructs pocket');}
 return {type:'existing-rail-undersides',sections:6,addedThickness:0,bottomY:bottom,pocketClearanceVerified:holes.length===6};
}
