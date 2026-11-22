import * as THREE from 'three';

// A physical-width ribbon, so perspective and zoom scale it with the cue ball.
export function createCueTrajectoryView({scene, core, center, surfaceY, requestFrame}) {
  const capacity=16384, capSteps=12;
  const geometry=new THREE.BufferGeometry();
  const positions=new Float32Array((capacity*2+2*(capSteps+2))*3);
  const indices=new Uint32Array((capacity-1)*6+capSteps*6);
  geometry.setAttribute('position',new THREE.BufferAttribute(positions,3).setUsage(THREE.DynamicDrawUsage));
  geometry.setIndex(new THREE.BufferAttribute(indices,1).setUsage(THREE.DynamicDrawUsage));
  geometry.setDrawRange(0,0);
  // Match the 2D actual-path white/15% opacity. Strict depth avoids alpha
  // accumulation where the same trajectory crosses itself.
  const material=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.15,depthWrite:true,depthFunc:THREE.LessDepth,side:THREE.DoubleSide});
  const ribbon=new THREE.Mesh(geometry,material);
  ribbon.name='test-field / actual cue trajectory';
  ribbon.frustumCulled=false;
  scene.add(ribbon);
  let enabled=true,revision=-1,pointCount=0,widthMm=52.5;
  function update() {
    const data=core.getCueTrajectory();
    ribbon.visible=enabled&&data.points.length>1;
    const diameter=(core.getCueBall()?.radius||26.25)*2;
    if(data.revision===revision&&diameter===widthMm)return;
    revision=data.revision;pointCount=data.points.length;widthMm=diameter;
    let count=0;
    const half=diameter/2000;
    const p=data.points;
    const put=(i,x,z)=>{positions[3*i]=x;positions[3*i+1]=surfaceY+.0015;positions[3*i+2]=z;};
    const direction=(a,b)=>{const dx=-(b.x-a.x),dz=-(b.y-a.y),len=Math.hypot(dx,dz)||1;return {x:dx/len,z:dz/len};};
    for(let i=0;i<p.length;i++){
      const before=direction(p[Math.max(0,i-1)],p[i===0?1:i]||p[i]);
      const after=direction(p[i],p[Math.min(p.length-1,i+1)]);
      if(i===p.length-1){after.x=before.x;after.z=before.z;}
      const mx=-before.z-after.z,mz=before.x+after.x,len=Math.hypot(mx,mz);
      const nx=len>1e-6?mx/len:-after.z,nz=len>1e-6?mz/len:after.x;
      const scale=Math.min(2*half,half/Math.max(.001,Math.abs(nx*(-after.z)+nz*after.x)));
      const x=center.x-p[i].x/1000,z=center.z-p[i].y/1000;
      put(2*i,x+nx*scale,z+nz*scale);put(2*i+1,x-nx*scale,z-nz*scale);
      if(i){const a=2*i-2,b=a+1,c=a+2,d=a+3;for(const index of [a,b,c,b,d,c])indices[count++]=index;}
    }
    if(p.length>1)for(const start of [true,false]){
      const i=start?0:p.length-1,dir=start?direction(p[0],p[1]):direction(p[i-1],p[i]);
      const sign=start?-1:1,x=center.x-p[i].x/1000,z=center.z-p[i].y/1000;
      const base=p.length*2+(start?0:capSteps+2);put(base,x,z);
      for(let j=0;j<=capSteps;j++){
        const angle=-Math.PI/2+j*Math.PI/capSteps;
        put(base+1+j,x+half*(sign*dir.x*Math.cos(angle)-dir.z*Math.sin(angle)),z+half*(sign*dir.z*Math.cos(angle)+dir.x*Math.sin(angle)));
        if(j)for(const index of [base,base+j,base+j+1])indices[count++]=index;
      }
    }
    geometry.attributes.position.needsUpdate=true;geometry.index.needsUpdate=true;
    geometry.setDrawRange(0,pointCount>1?count:0);
  }
  return {update,isVisible:()=>enabled,
    setVisible(value){enabled=Boolean(value);update();requestFrame();},
    clear(){core.clearCueTrajectory();update();requestFrame();},
    diagnostics:()=>({enabled,pointCount,visible:ribbon.visible,widthMm,color:'#ffffff',opacity:material.opacity}),
    dispose(){ribbon.removeFromParent();geometry.dispose();material.dispose();},
  };
}
