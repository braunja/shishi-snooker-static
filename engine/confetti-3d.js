import * as THREE from 'three';

// A one-time, conservative height field of the static table. No per-frame rays,
// colliders, rigid bodies or per-paper matrix uploads are needed.
export function createConfettiLandingField(table, floorY=0, cell=.018) {
  table.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(table),minX=bounds.min.x-.12,minZ=bounds.min.z-.12;
  const width=Math.ceil((bounds.max.x-minX+.12)/cell)+1,depth=Math.ceil((bounds.max.z-minZ+.12)/cell)+1;
  const heights=new Float32Array(width*depth).fill(floorY),a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3();
  table.traverse(mesh=>{
    if(!mesh.isMesh||!mesh.visible)return;
    const g=mesh.geometry,p=g.attributes.position,idx=g.index;
    for(let i=0;i<(idx?.count??p.count);i+=3){
      a.fromBufferAttribute(p,idx?idx.getX(i):i).applyMatrix4(mesh.matrixWorld);
      b.fromBufferAttribute(p,idx?idx.getX(i+1):i+1).applyMatrix4(mesh.matrixWorld);
      c.fromBufferAttribute(p,idx?idx.getX(i+2):i+2).applyMatrix4(mesh.matrixWorld);
      const den=(b.z-c.z)*(a.x-c.x)+(c.x-b.x)*(a.z-c.z);if(Math.abs(den)<1e-10)continue;
      const x0=Math.max(0,Math.floor((Math.min(a.x,b.x,c.x)-minX)/cell)),x1=Math.min(width-1,Math.ceil((Math.max(a.x,b.x,c.x)-minX)/cell));
      const z0=Math.max(0,Math.floor((Math.min(a.z,b.z,c.z)-minZ)/cell)),z1=Math.min(depth-1,Math.ceil((Math.max(a.z,b.z,c.z)-minZ)/cell));
      for(let z=z0;z<=z1;z++)for(let x=x0;x<=x1;x++){
        const px=minX+x*cell,pz=minZ+z*cell,u=((b.z-c.z)*(px-c.x)+(c.x-b.x)*(pz-c.z))/den,v=((c.z-a.z)*(px-c.x)+(a.x-c.x)*(pz-c.z))/den;
        if(u<-.00001||v<-.00001||u+v>1.00001)continue;
        const y=u*a.y+v*b.y+(1-u-v)*c.y,index=z*width+x;if(y>heights[index])heights[index]=y;
      }
    }
  });
  const texture=new THREE.DataTexture(heights,width,depth,THREE.RedFormat,THREE.FloatType);texture.needsUpdate=true;
  texture.magFilter=texture.minFilter=THREE.NearestFilter;
  return {texture,bounds:new THREE.Vector4(minX,minZ,(width-1)*cell,(depth-1)*cell),floorY,
    sample(x,z){const ix=Math.round((x-minX)/cell),iz=Math.round((z-minZ)/cell);return ix<0||iz<0||ix>=width||iz>=depth?floorY:heights[iz*width+ix];},width,depth,dispose(){texture.dispose();}};
}
export function createConfetti3D({scene,landing,count=4200,seed=8417,flightBoundary=null}){
  let value=seed>>>0;const random=()=>{value=(1664525*value+1013904223)>>>0;return value/4294967296;};
  const geometry=new THREE.InstancedBufferGeometry(),base=new THREE.PlaneGeometry(1,1,8,1);base.rotateX(-Math.PI/2);
  geometry.index=base.index;geometry.attributes.position=base.attributes.position;geometry.attributes.uv=base.attributes.uv;
  const target=new Float32Array(count*4),flight=new Float32Array(count*4),motion=new Float32Array(count*4),gust=new Float32Array(count*4),shape=new Float32Array(count*4),color=new Float32Array(count*3);
  const palette=[0xfaf9f4,0xec414b,0x4270db,0xf0da3c];
  // Equal totals, shuffled once so colours are mixed throughout the shower.
  const colorIndices=Array.from({length:count},(_,i)=>i%palette.length);
  for(let i=count-1;i>0;i--){const j=Math.floor(random()*(i+1));[colorIndices[i],colorIndices[j]]=[colorIndices[j],colorIndices[i]];}
  let duration=0,tablePieces=0;
  for(let i=0;i<count;i++){
    const length=.05+random()*.05,width=.02;
    // Total bend from one end to the other is at most pi/2 (90 degrees).
    const family=random(),curl=(random()<.5?-1:1)*(family<.45?.04+random()*.2:family<.8?.3+random()*.65:.95+random()*(Math.PI/2-.95)),twist=(random()-.5)*1.1;
    let x,z,y,yaw,valid=false;
    for(let attempt=0;attempt<80;attempt++){
      // Fill the inner arena, leaving clearance from its x=±6.4/z=±7.2 barriers.
      // Smooth density per unit area: 1 at the table centre, 1/3 at the perimeter.
      x=(random()-.5)*12.32;z=(random()-.5)*13.92;
      const radius=Math.max(Math.abs(x)/6.16,Math.abs(z)/6.96);
      const density=1-(2/3)*radius*radius*(3-2*radius);
      if(random()>density)continue;
      yaw=random()*Math.PI*2;
      const samples=[];for(const [dx,dz] of [[0,0],[-length*.55,-width*.6],[-length*.55,width*.6],[length*.55,-width*.6],[length*.55,width*.6]])samples.push(landing.sample(x+dx*Math.cos(yaw)-dz*Math.sin(yaw),z+dx*Math.sin(yaw)+dz*Math.cos(yaw)));
      y=Math.max(...samples);if(y-Math.min(...samples)<.003){valid=true;break;}
    }
    if(!valid){x=4.1;z=(random()-.5)*5;y=landing.sample(x,z);}
    if(y>.3)tablePieces++;
    // One-second ramp, seven seconds at full emission, then a gentle fade.
    // Inverse integral of the envelope: no per-frame emitter or allocations.
    const emission=random()*9.25;
    const start=emission<.5?Math.sqrt(2*emission):emission<7.5?1+emission-.5:11.5-Math.sqrt(7*(9.25-emission));
    const height=3.9+random()*.9,time=(height-y)/(.98+random()*.55)+.18;
    target.set([x,y+.0012+random()*.001,z,yaw],i*4);
    flight.set([start,time,height,0],i*4);
    motion.set([random()*Math.PI*2,.75+random()*1.8,(random()-.5)*2.3,(random()-.5)*2.0],i*4);
    gust.set([random()*Math.PI*2,random()*Math.PI*2,.4+random()*1.5,random()<.5?-1:1],i*4);
    shape.set([length,width,curl,twist],i*4);
    new THREE.Color(palette[colorIndices[i]]).toArray(color,i*3);duration=Math.max(duration,start+time+.25);
  }
  for(const [name,array,size] of [['aTarget',target,4],['aFlight',flight,4],['aMotion',motion,4],['aGust',gust,4],['aShape',shape,4],['aColor',color,3]])geometry.setAttribute(name,new THREE.InstancedBufferAttribute(array,size));
  geometry.instanceCount=count;
  const uniforms={uTime:{value:-1},uLanding:{value:landing.texture},uField:{value:landing.bounds},uFloor:{value:landing.floorY??0},uFlightBoundary:{value:new THREE.Vector3(flightBoundary?.x??0,flightBoundary?.z??0,flightBoundary?.offset??-1)}};
  const vertex=`
    uniform float uTime,uFloor;uniform sampler2D uLanding;uniform vec4 uField;uniform vec3 uFlightBoundary;
    attribute vec4 aTarget,aFlight,aMotion,aGust,aShape;attribute vec3 aColor;
    varying vec3 vColor,vNormal;varying float vLive,vHeight,vGap;varying vec2 vUv,vProjected;varying float vReceiver;
    mat3 rx(float a){float c=cos(a),s=sin(a);return mat3(1.,0.,0.,0.,c,s,0.,-s,c);}
    mat3 ry(float a){float c=cos(a),s=sin(a);return mat3(c,0.,-s,0.,1.,0.,s,0.,c);}
    mat3 rz(float a){float c=cos(a),s=sin(a);return mat3(c,s,0.,-s,c,0.,0.,0.,1.);}
    float surface(vec2 p){vec2 uv=(p-uField.xy)/uField.zw;if(min(uv.x,uv.y)<0.||max(uv.x,uv.y)>1.)return uFloor;return texture2D(uLanding,uv).r;}
    void main(){
      float age=max(0.,uTime-aFlight.x),t=clamp(age/aFlight.y,0.,1.);vLive=step(aFlight.x,uTime);vUv=uv;
      if(vLive<.5){gl_Position=vec4(2.,2.,2.,1.);return;}
      float airborne=1.-smoothstep(.86,1.,t),phase=aMotion.x,w=age*aMotion.y;
      float yaw=aTarget.w+airborne*(sin(w*1.4+phase)*1.2+sin(w*3.13+aGust.x)*.35);
      float L=aShape.x,W=aShape.y;
      float windTime=age+aGust.z*sin(age*1.37+aGust.x);
      vec2 drift=(1.-t)*aMotion.zw+sin(t*3.14159)*vec2(sin(windTime*2.6+phase)*.3+sin(w*5.3+aGust.y)*.09,cos(windTime*2.1+aGust.x)*.25+sin(w*4.37+phase)*.1);
      drift*=1.-smoothstep(.50,.74,t);
      float drop=t*t/(.08+.92*t);
      vec3 center=vec3(aTarget.x+drift.x,mix(aFlight.z,aTarget.y,drop),aTarget.z+drift.y);
      // Reserve camera clearance high in the air, releasing it before landing
      // so the camera never cuts a diagonal out of the ground distribution.
      center.xz+=uFlightBoundary.xy*max(0.,uFlightBoundary.z+.08-dot(center.xz,uFlightBoundary.xy))*smoothstep(1.8,3.,center.y);
      center.xz=clamp(center.xz,vec2(-6.16,-6.96),vec2(6.16,6.96));
      center.y=max(center.y,aTarget.y+airborne*(L*.56+W*.3));
      vec3 world;
      #ifdef PAPER_SHADOW
        // One soft patch per paper. A four-vertex quad uses only the centre's
        // height; it never evaluates curl, normals or individual light lobes.
        vec3 worldCenter=(modelMatrix*vec4(center,1.)).xyz;
        float gap=max(0.,worldCenter.y-surface(worldCenter.xz));
        float margin=.007+min(gap,1.)*.022;
        vec3 offset=ry(yaw)*vec3(position.x*(L+2.*margin),0.,position.z*(W+2.*margin));
        vec2 projected=worldCenter.xz+offset.xz;
        float receiver=surface(projected);
        vGap=gap;vProjected=projected;vReceiver=receiver;
        world=vec3(projected.x,receiver+.0008,projected.y);
      #else
        float pitch=aGust.w*(w*3.1+sin(w*1.73+phase)*1.3+sin(w*3.7+aGust.x)*.65);
        float roll=sin(w*2.31+aGust.y)*.7+sin(w*.83+phase)*.45;
        mat3 rotation=ry(yaw)*rx(pitch*airborne)*rz(roll*airborne);
        float u=position.x,v=position.z,k=aShape.z,ak=abs(k);
        float curlLift=max(0.,-sign(k)*(1.-cos(ak*.5))*L/ak)+abs(aShape.w)*W*.25;
        vec3 p=vec3(sin(k*u)*L/k,sign(k)*(1.-cos(k*u))*L/ak+curlLift+aShape.w*u*v*W,v*W);
        p.y+=sin(u*6.28+w*4.7+aGust.x)*.005*airborne;
        vec3 localNormal=normalize(vec3(-sin(k*u),cos(k*u),-aShape.w*u));
        world=(modelMatrix*vec4(center+rotation*p,1.)).xyz;
        vColor=aColor;vNormal=mat3(modelMatrix)*rotation*localNormal;vHeight=world.y;
      #endif
      gl_Position=projectionMatrix*viewMatrix*vec4(world,1.);
    }`;
  const material=new THREE.ShaderMaterial({side:THREE.DoubleSide,uniforms,vertexShader:vertex,fragmentShader:`
    varying vec3 vColor,vNormal;varying float vLive,vHeight;
    void main(){if(vLive<.5)discard;
      vec3 n=normalize(vNormal)*(gl_FrontFacing?1.:-1.);
      float light=.30+.38*abs(dot(n,vec3(0.,1.,0.)))
        +.18*abs(dot(n,normalize(vec3(.7,1.,.45))))
        +.14*abs(dot(n,normalize(vec3(-.6,1.,-.5))));
      light=mix(.84,1.,light);
      gl_FragColor=vec4(vColor*light,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`});
  const shadowMaterial=new THREE.ShaderMaterial({side:THREE.DoubleSide,uniforms,defines:{PAPER_SHADOW:1},vertexShader:vertex,transparent:true,depthWrite:false,fragmentShader:`
    uniform sampler2D uLanding;uniform vec4 uField;uniform float uFloor;
    varying float vLive,vGap,vReceiver;varying vec2 vUv,vProjected;
    void main(){if(vLive<.5)discard;
      // The same broad feather remains after landing. No curvature-dependent
      // softness and no multi-light sampling or trigonometry in the fragment.
      vec2 edge=1.-smoothstep(vec2(.12),vec2(.5),abs(vUv-.5));
      float opacity=edge.x*edge.y*.23/(1.+vGap*12.);
      if(opacity<.00035)discard;
      vec2 uv=(vProjected-uField.xy)/uField.zw;float receiver=uFloor;
      if(min(uv.x,uv.y)>=0.&&max(uv.x,uv.y)<=1.)receiver=texture2D(uLanding,uv).r;
      // Discard bridges across height discontinuities at a rail or pocket edge.
      if(abs(receiver-vReceiver)>.012)discard;
      gl_FragColor=vec4(0.,0.,0.,opacity);
    }`});
  const shadowGeometry=new THREE.InstancedBufferGeometry(),shadowBase=new THREE.PlaneGeometry(1,1);shadowBase.rotateX(-Math.PI/2);
  shadowGeometry.index=shadowBase.index;shadowGeometry.attributes.position=shadowBase.attributes.position;shadowGeometry.attributes.uv=shadowBase.attributes.uv;
  for(const name of ['aTarget','aFlight','aMotion','aGust','aShape'])shadowGeometry.setAttribute(name,geometry.getAttribute(name));
  shadowGeometry.instanceCount=count;
  const mesh=new THREE.Mesh(geometry,material),shadow=new THREE.Mesh(shadowGeometry,shadowMaterial);mesh.name='3D confetti / shared curved paper';shadow.name='3D confetti / batched projected shadows';
  for(const m of [mesh,shadow]){m.frustumCulled=false;m.visible=false;scene.add(m);}shadow.renderOrder=2;
  let elapsed=0,playing=false;
  return {mesh,shadow,duration,count,tablePieces,play(){elapsed=0;playing=true;mesh.visible=shadow.visible=true;uniforms.uTime.value=0;},clear(){playing=false;elapsed=0;mesh.visible=shadow.visible=false;uniforms.uTime.value=-1;},
    update(dt){if(!playing)return;elapsed=Math.min(duration,elapsed+Math.max(0,dt));uniforms.uTime.value=elapsed;if(elapsed>=duration)playing=false;},
    get playing(){return playing;},get elapsed(){return elapsed;},dispose(){scene.remove(mesh,shadow);geometry.dispose();shadowGeometry.dispose();material.dispose();shadowMaterial.dispose();}};
}
