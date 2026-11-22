import * as THREE from 'three';

// Dimensions retain the original game's mounting height (metres).
// Outline follows the supplied front photograph; 28 shaded grooves on a game-scale polygon budget.
const profile=[
 [0,.050],[.004,.058],[.012,.062],[.026,.062],[.033,.057],
 [.037,.059],[.043,.069],[.053,.074],[.064,.073],[.075,.064],[.081,.057],
 [.087,.057],[.095,.070],[.105,.074],[.126,.072],[.16,.068],[.195,.069],
 [.229,.074],[.259,.082],[.276,.086],[.283,.080],
 [.288,.071],[.294,.068],[.299,.073],[.305,.073],[.310,.066],
 [.316,.064],[.322,.071],[.328,.071],[.332,.065],
 [.339,.069],[.348,.081],[.359,.091],[.370,.094],[.381,.089],
 [.393,.074],[.400,.067],[.405,.068],[.410,.076],[.418,.076],
 [.423,.069],[.433,.069]
];
function radius(y){
 let i=0;while(i<profile.length-2&&y>profile[i+1][0])i++;
 const a=profile[i],b=profile[i+1],t=(y-a[0])/(b[0]-a[0]);
 // Shape-preserving cubic slopes keep the bulb continuous between samples.
 const slope=k=>(profile[k+1][1]-profile[k][1])/(profile[k+1][0]-profile[k][0]);
 const tangent=k=>{if(k===0)return slope(0);if(k===profile.length-1)return slope(k-1);
  const l=slope(k-1),r=slope(k);return l*r<=0?0:2*l*r/(l+r);};
 const h=b[0]-a[0];
 return (2*t*t*t-3*t*t+1)*a[1]+(t*t*t-2*t*t+t)*h*tangent(i)
  +(-2*t*t*t+3*t*t)*b[1]+(t*t*t-t*t)*h*tangent(i+1);
}
function makeTexture(){
 const c=document.createElement('canvas');c.width=c.height=512;
 const ctx=c.getContext('2d'),data=ctx.createImageData(512,512);let seed=781;
 for(let i=0;i<data.data.length;i+=4){seed=(1664525*seed+1013904223)>>>0;const n=(seed/4294967296-.5)*5;
 data.data[i]=217+n;data.data[i+1]=164+n;data.data[i+2]=58+n;data.data[i+3]=255;}
 ctx.putImageData(data,0,0);
 const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;map.wrapS=map.wrapT=THREE.RepeatWrapping;
 map.name='Warm ochre gold lacquer / fine painted grain';return map;
}
// Continuous object-space surface normals occupy the lower 85% of this shared atlas.
// The remaining area is flat for the mounting block and foot.
function makeFluteNormals(){
 const size=512,data=new Uint8Array(size*size*4),span=.85,height=.433;
 const relief=(u,v)=>{
  const y=v/span*height;
  const fade=THREE.MathUtils.smoothstep(y,.088,.105)*(1-THREE.MathUtils.smoothstep(y,.271,.285));
  return -.0055*fade*(.5+.5*Math.cos(u*Math.PI*2*28));
 };
 for(let j=0;j<size;j++)for(let i=0;i<size;i++){
  const u=(i+.5)/size,v=(j+.5)/size,e=1/size;
  const y=THREE.MathUtils.clamp(v/span*height,0,height),a=u*Math.PI*2;
  const circumference=2*Math.PI*radius(y);
  const dx=(relief(u+e,v)-relief(u-e,v))/(2*e*circumference);
  const dy=(relief(u,v+e)-relief(u,v-e))/(2*e*height/span);
  // Bake the continuous turned profile as well as the flutes; no extra vertices.
  const lo=Math.max(0,y-.0005),hi=Math.min(height,y+.0005);
  const slope=(radius(hi)-radius(lo))/(hi-lo);
  const n=new THREE.Vector3(Math.cos(a)+dx*Math.sin(a),-slope-dy,Math.sin(a)-dx*Math.cos(a)).normalize(),k=(j*size+i)*4;
  data[k]=Math.round((n.x*.5+.5)*255);data[k+1]=Math.round((n.y*.5+.5)*255);data[k+2]=Math.round((n.z*.5+.5)*255);data[k+3]=255;
 }
 const map=new THREE.DataTexture(data,size,size,THREE.RGBAFormat);
 map.name='Continuous turned profile and 28 flutes / object normals';map.wrapS=THREE.RepeatWrapping;
 map.magFilter=THREE.LinearFilter;map.minFilter=THREE.LinearMipmapLinearFilter;map.generateMipmaps=true;map.needsUpdate=true;return map;
}
function useFlatGoldUV(geometry){
 const uv=geometry.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,.98,.98);uv.needsUpdate=true;return geometry;
}
function turnedBody(){
 // Retain only the major shoulders; 16 sides are sufficient at game scale.
 const heights=[0,.012,.033,.053,.081,.105,.18,.276,.294,.322,.339,.348,.359,.370,.381,.393,.410,.433];
 const radial=16,rows=heights.length-1,pos=[],uv=[],indices=[];
 for(let j=0;j<=rows;j++){
  const y=heights[j];
  const fade=THREE.MathUtils.smoothstep(y,.088,.105)*(1-THREE.MathUtils.smoothstep(y,.271,.285));
  for(let i=0;i<=radial;i++){
   const t=i/radial*Math.PI*2;
   const r=radius(y)-.0015*fade;
   pos.push(r*Math.cos(t),y,r*Math.sin(t));uv.push(i/radial,y/.433*.85);
   if(j<rows&&i<radial){const a=j*(radial+1)+i,b=a+radial+1;indices.push(a,b,a+1,b,b+1,a+1);}
  }
 }
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();
 // Weld seam normals visually without merging UV endpoints.
 const n=geo.attributes.normal;for(let j=0;j<=rows;j++){const a=j*(radial+1),b=a+radial;const v=new THREE.Vector3().fromBufferAttribute(n,a).add(new THREE.Vector3().fromBufferAttribute(n,b)).normalize();n.setXYZ(a,v.x,v.y,v.z);n.setXYZ(b,v.x,v.y,v.z);}return geo;
}
// Collapse the mounting panels into one mesh per material.
// All eight legs can still share the resulting two geometries.
function mergeLegMeshes(root){
 root.updateMatrixWorld(true);
 const batches=new Map(),originals=new Set();
 root.traverse(mesh=>{
  if(!mesh.isMesh)return;
  let batch=batches.get(mesh.material);
  if(!batch){batch={position:[],normal:[],uv:[]};batches.set(mesh.material,batch);}
  const geometry=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone();
  geometry.applyMatrix4(mesh.matrixWorld);
  for(const name of ['position','normal','uv']){
   const a=geometry.attributes[name].array;for(let i=0;i<a.length;i++)batch[name].push(a[i]);
  }
  geometry.dispose();originals.add(mesh.geometry);
 });
 root.clear();for(const geometry of originals)geometry.dispose();
 for(const [material,batch] of batches){
  const geometry=new THREE.BufferGeometry();
  for(const name of ['position','normal','uv'])geometry.setAttribute(name,new THREE.Float32BufferAttribute(batch[name],name==='uv'?2:3));
  geometry.computeBoundingBox();geometry.computeBoundingSphere();
  const mesh=new THREE.Mesh(geometry,material);mesh.name=material.map?.name==='Warm ochre gold lacquer / fine painted grain'?'Gold leg / merged':'Wood panels / merged';root.add(mesh);
 }
}
export function createReferenceLeg(environment, { panelMaterial=null }={}){
 const root=new THREE.Group();root.name='Reference gold fluted leg / approval prototype';
 const map=makeTexture();
 const gold=new THREE.MeshPhysicalMaterial({map,normalMap:makeFluteNormals(),normalMapType:THREE.ObjectSpaceNormalMap,metalness:.32,roughness:.32,clearcoat:.4,clearcoatRoughness:.23,envMap:environment,envMapIntensity:.8});
 applyLegNormalMaterial(gold);
 gold.userData.tableFinish='leg';
 const dark=panelMaterial || new THREE.MeshPhysicalMaterial({color:'#282025',roughness:.38,metalness:.12,clearcoat:.3,envMap:environment});
 const body=new THREE.Mesh(turnedBody(),gold);body.name='Turned mouldings / 28 normal-mapped grooves';root.add(body);
 const foot=new THREE.Mesh(useFlatGoldUV(new THREE.CircleGeometry(.05,16)),gold);foot.rotation.x=Math.PI/2;root.add(foot);
 const post=new THREE.Mesh(useFlatGoldUV(new THREE.BoxGeometry(.168,.289,.168)),gold);post.position.y=.5795;post.name='Gold mounting post';root.add(post);
 for(let side=0;side<4;side++){
  const face=new THREE.Group();face.rotation.y=side*Math.PI/2;
  const panel=new THREE.Mesh(new THREE.PlaneGeometry(.112,.230),dark);panel.position.set(0,.59,.085);
  if(panelMaterial){const p=panel.geometry.attributes.position,uv=panel.geometry.attributes.uv;for(let i=0;i<p.count;i++)uv.setXY(i,p.getX(i)/.112+.5,p.getY(i)/.230+.5);}
  face.add(panel);
  root.add(face);
 }
 mergeLegMeshes(root);
 root.userData={heightMetres:.726,flutes:28,radialSegments:16,approval:'approved game model',texture:'Procedural fine gold lacquer based on supplied photos'};
 return root;
}

export function applyLegNormalMaterial(gold){
 // The mounting block and foot retain their own hard surface normals.
 gold.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`
 vec3 legBaseNormal=normal;
 #include <normal_fragment_maps>
 #ifdef USE_NORMALMAP
 if(vNormalMapUv.y>.85) normal=legBaseNormal;
 #endif
 `);};
 gold.customProgramCacheKey=()=> 'leg-object-normal-atlas-v1';
}
