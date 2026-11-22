import * as THREE from 'three';

// Original cue dimensions, with a symmetric 192-sided replacement surface.
const MODEL_SCALE=1.45/(.84924078+.849241018);
const FERRULE_START=-.843770564;
const START=FERRULE_START+.008/MODEL_SCALE, SHOULDER=.84524078, END=.84924078;
export const CUE_WOOD_LENGTH=(END-START)*MODEL_SCALE;
export const CUE_INLAY_SCALE=(.45*CUE_WOOD_LENGTH-.10)/(.45*CUE_WOOD_LENGTH);
const Z=.00199368, SIDES=192;
const stations=[[START,.005193],[.367615,.014111],[SHOULDER,.018095]];
function bodyRadius(x){
  return stations.reduce((sum,[a,r],i)=>sum+r*stations.reduce((p,[b],j)=>j===i?p:p*(x-b)/(a-b),1),0);
}
function surface(x,t,slot){
  let radius,flat=1;
  if(slot===1){
    radius=x<-.847 ? .005106*Math.sqrt(Math.max(0,1-((x+.847)/.002241018)**2)) : THREE.MathUtils.lerp(.005106,.005085,(x+.847)/.003229854);
  }else if(slot===2){
    radius=THREE.MathUtils.lerp(.005085,.005193,(x-FERRULE_START)/(START-FERRULE_START));
  }else{
    radius=bodyRadius(Math.min(x,SHOULDER));
    const bevel=.004;
    const q=Math.max(0,Math.min(1,(x-SHOULDER)/bevel));
    const edgeInset=bevel*(1-Math.sqrt(Math.max(0,1-q*q)));
    radius-=edgeInset;
    // A single inclined cutting plane intersects the round taper naturally.
    // No eased pocket floor: its outline begins at a rounded point 100 mm up.
    const cutStart=END-.10/MODEL_SCALE;
    const cutSlope=(.0113-bodyRadius(cutStart))/(END-cutStart);
    flat=bodyRadius(cutStart)+cutSlope*(x-cutStart)-edgeInset*.4;
  }
  const y=radius*Math.sin(t),z=radius*Math.cos(t);
  // Round the two edges of the badge flat into the cylindrical sides.
  // Keep the front centre planar; the larger blend only removes corner material.
  const k=slot===0?.0035:.0003;
  const h=Math.max(k-Math.abs(z-flat),0)/k;
  return new THREE.Vector3(x,y,Z+Math.min(z,flat)-h*h*k*.25);
}

export function smoothCueGeometry(slot,quality='high'){
  const optimized=quality==='optimized', SIDES=optimized?48:192;
  const limits=[[.367615,END],[-.849241018,-.843770564],[-.843770564,START],[.363645,.367615],[START,.363645]][slot];
  const [lo,hi]=limits, xs=[];
  const segments=optimized?(slot===0?32:slot===4?16:slot===1?8:2):(slot===0?240:slot===4?120:slot===1?40:8);
  const shoulderSegments=optimized?16:48;
  for(let i=0;i<=segments;i++)xs.push(lo+(Math.min(hi,slot===0?SHOULDER:hi)-lo)*i/segments);
  if(slot===0)for(let i=1;i<=shoulderSegments;i++)xs.push(SHOULDER+(END-SHOULDER)*Math.sin(i/shoulderSegments*Math.PI/2));
  const positions=[],normals=[],uvs=[],indices=[];
  for(let i=0;i<xs.length;i++)for(let j=0;j<=SIDES;j++){
    const x=xs[i],t=j/SIDES*Math.PI*2,p=surface(x,t,slot);
    const dx=surface(Math.min(hi,x+.000001),t,slot).sub(surface(Math.max(lo,x-.000001),t,slot));
    const dt=surface(x,t+.0001,slot).sub(surface(x,t-.0001,slot));
    const n=new THREE.Vector3().crossVectors(dx,dt).normalize();
    if(dt.lengthSq()<1e-18)n.set(slot===1?-1:1,0,0);
    positions.push(...p);normals.push(...n);uvs.push((x-lo)/(hi-lo),j/SIDES);
    if(i<xs.length-1&&j<SIDES){const a=i*(SIDES+1)+j,b=a+SIDES+1;indices.push(a,b,a+1,a+1,b,b+1);}
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  g.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
  g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));g.setIndex(indices);
  const result=g.toNonIndexed();g.dispose();return result;
}

// Open ebony end face, brass socket rim, recessed bore and dark internal floor.
export function cueButtSocket(quality='high'){
  const optimized=quality==='optimized',SIDES=optimized?48:192,ringSides=optimized?24:128;
  const group=new THREE.Group(),positions=[],normals=[],uvs=[],indices=[];
  const hole=.0060;
  for(let j=0;j<=SIDES;j++){
    const t=j/SIDES*Math.PI*2,p=surface(END,t,0);
    positions.push(...p,END,hole*Math.sin(t),Z+hole*Math.cos(t));
    normals.push(1,0,0,1,0,0);
    uvs.push(0,.5+t/(2*Math.PI),0,.5+t/(2*Math.PI));
    if(j<SIDES){const a=j*2;indices.push(a,a+1,a+2,a+2,a+1,a+3);}
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));g.setIndex(indices);g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
  const ebony=new THREE.MeshStandardMaterial({color:0x090b09,roughness:.32,side:THREE.DoubleSide});
  group.add(new THREE.Mesh(g,ebony));
  const brass=new THREE.MeshStandardMaterial({color:0xb9a36b,metalness:1,roughness:.22,side:THREE.DoubleSide});
  const rim=new THREE.Mesh(new THREE.RingGeometry(.0054,hole,ringSides),brass);rim.rotation.y=Math.PI/2;rim.position.set(END+.00002,0,Z);group.add(rim);
  const bore=new THREE.Mesh(new THREE.CylinderGeometry(.0054,.0054,.014,ringSides,1,true),brass);bore.rotation.z=Math.PI/2;bore.position.set(END-.007,0,Z);group.add(bore);
  // Continuous internal helix, inset from the smooth mouth of the brass sleeve.
  // Real relief catches light as the viewer looks into and rotates the socket.
  class InternalThread extends THREE.Curve {
    getPoint(t,target=new THREE.Vector3()){
      const angle=t*Math.PI*2*8;
      return target.set(END-.002-t*.0108,.00522*Math.sin(angle),Z+.00522*Math.cos(angle));
    }
  }
  const threadMaterial=brass.clone();threadMaterial.roughness=.36;
  threadMaterial.emissive.setHex(0x6b542b);threadMaterial.emissiveIntensity=.12;
  const thread=new THREE.Mesh(new THREE.TubeGeometry(new InternalThread(),optimized?96:1024,.00032,optimized?4:8,false),threadMaterial);
  thread.name='extension-socket-internal-thread';group.add(thread);
  const floor=new THREE.Mesh(new THREE.CircleGeometry(.0054,ringSides),new THREE.MeshStandardMaterial({color:0x080807,roughness:.95,side:THREE.DoubleSide}));floor.rotation.y=Math.PI/2;floor.position.set(END-.014,0,Z);group.add(floor);
  return group;
}
