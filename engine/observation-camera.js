// Keep the complete camera outside a padded table box, along its orbit ray.
export function observationMinDistance(target, direction, bounds, minimum = 2.5, padding = 0.2) {
  let near = -Infinity, far = Infinity;
  for (const axis of ['x', 'y', 'z']) {
    const low = bounds.min[axis] - padding, high = bounds.max[axis] + padding;
    const d = direction[axis];
    if (Math.abs(d) < 1e-9) {
      if (target[axis] < low || target[axis] > high) return minimum;
      continue;
    }
    const a = (low - target[axis]) / d, b = (high - target[axis]) / d;
    near = Math.max(near, Math.min(a, b));
    far = Math.min(far, Math.max(a, b));
  }
  return far >= Math.max(near, 0) ? Math.max(minimum, far) : minimum;
}

// Desktop pinch remains disabled. Mobile uses scene pointer pairs with 1–2 zoom.
export const OBSERVATION_PINCH_ZOOM_ENABLED = false;

// Camera scale follows the physical device, not the responsive UI layout.
// A narrow desktop product window may intentionally use the mobile layout.
export function isMobileObservationDevice(layout, nav) {
  if (layout?.physicalDevice) return layout.physicalDevice === 'mobile';
  return Boolean(nav.userAgentData?.mobile || /Android|iPhone|iPad|iPod|Mobile/i.test(nav.userAgent || '')
    || (/Macintosh/i.test(nav.userAgent || '') && nav.maxTouchPoints > 1));
}

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export function createObservationOrbit({camera,controls,canvas,bounds,surfaceY,viewport=()=>({width:innerWidth,height:innerHeight}),now=()=>performance.now(),pinchZoomEnabled=OBSERVATION_PINCH_ZOOM_ENABLED,isMobile=()=>false}) {
  const pointers=new Map();
  let pendingTheta=0,pendingPhi=0,lastUpdate=now();
  const damping=controls.dampingFactor ?? .065;
  const rotationSpeed=controls.rotateSpeed ?? .58;
  const tableCenterX=(bounds.min.x+bounds.max.x)/2,tableCenterZ=(bounds.min.z+bounds.max.z)/2;
  let cx=tableCenterX,cz=tableCenterZ,cy=surfaceY+.05;
  let fx=cx,fy=cy,fz=cz;
  let theta=0,phi=Math.PI/3,baseRadius=3,zoom=1,yaw=0,pitch=0,targetYaw=0,targetPitch=0,returning=null,pair=null,holdUntilRelease=false,looking=false;
  function coast(amount,verticalAmount=amount){
    theta+=pendingTheta*amount;phi+=pendingPhi*verticalAmount;
    pendingTheta*=1-amount;pendingPhi*=1-verticalAmount;
  }
  function render(){
    const radius=baseRadius/zoom;
    const minPhi=Math.acos(clamp((bounds.min.y+2-cy)/radius,-1,1));
    const maxPhi=Math.acos(clamp((surfaceY+.1-cy)/radius,-1,1));
    phi=clamp(phi,Math.max(.001,minPhi),Math.min(Math.PI/2,maxPhi));
    const horizontal=radius*Math.sin(phi);
    const x=cx+horizontal*Math.sin(theta),z=cz+horizontal*Math.cos(theta);
    camera.position.set(x,cy+radius*Math.cos(phi),z);
    if(yaw===0&&pitch===0)controls.target.set(fx,fy,fz);
    else{
      const dx=fx-x,dy=fy-camera.position.y,dz=fz-z,c=Math.cos(yaw),s=Math.sin(yaw);
      const gazeHorizontal=Math.hypot(dx,dz),gazeRadius=Math.max(1e-9,Math.hypot(dx,dy,dz));
      const elevation=clamp(Math.atan2(dy,gazeHorizontal)+pitch,-Math.PI/2+.001,Math.PI/2-.001);
      const planar=gazeRadius*Math.cos(elevation)/Math.max(gazeHorizontal,1e-9);
      controls.target.set(x+(dx*c-dz*s)*planar,camera.position.y+gazeRadius*Math.sin(elevation),z+(dx*s+dz*c)*planar);
    }
    controls.enabled=false;camera.lookAt(controls.target);camera.updateMatrixWorld();
  }
  function setZoom(value){if(!isMobile()&&!pinchZoomEnabled)return;zoom=clamp(value,isMobile()?1:.7,2);render();}
  function center(){const [a,b]=[...pointers.values()];return {x:(a.x+b.x)/2,distance:Math.max(1,Math.hypot(a.x-b.x,a.y-b.y))};}
  function stop(e){e.preventDefault();e.stopImmediatePropagation();}
  function cancel(){looking=false;pendingTheta=0;pendingPhi=0;for(const id of pointers.keys())if(canvas.hasPointerCapture(id))canvas.releasePointerCapture(id);pointers.clear();pair=null;holdUntilRelease=false;returning=null;yaw=0;pitch=0;targetYaw=0;targetPitch=0;}
  return {
    enter(initialZoom=isMobile()?1.5:1,focus=null,lookTarget=null){cancel();zoom=clamp(initialZoom,isMobile()?1:.7,2);
      cx=focus?.x??tableCenterX;cy=focus?.y??surfaceY+.05;cz=focus?.z??tableCenterZ;
      // The orbit pivot and the fixed world-space gaze point are independent.
      fx=lookTarget?.x??cx;fy=lookTarget?.y??cy;fz=lookTarget?.z??cz;
      const dx=camera.position.x-cx,dy=camera.position.y-cy,dz=camera.position.z-cz;
      const radius=Math.max(.3,Math.hypot(dx,dy,dz));
      baseRadius=focus?radius*zoom:radius;theta=Math.atan2(dx,dz);
      phi=Math.acos(clamp(dy/radius,-1,1));lastUpdate=now();render();},
    down(e){if(e.button!==0)return false;stop(e);if(pointers.size>=2)return true;
      returning=null;
      pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});canvas.setPointerCapture(e.pointerId);
      if(pointers.size===2){pendingTheta=0;pendingPhi=0;const c=center();pair={...c,zoom};returning=null;holdUntilRelease=false;}return true;},
    move(e){if(!pointers.has(e.pointerId))return false;stop(e);const old=pointers.get(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});const v=viewport();
      if(pointers.size===2&&pair){const c=center();setZoom(pair.zoom*c.distance/pair.distance);}
      else if(!holdUntilRelease){
        pendingTheta-=(e.clientX-old.x)/Math.max(1,v.width)*rotationSpeed*2*Math.PI*(isMobile()?2:1);
        pendingPhi-=(e.clientY-old.y)/v.height*rotationSpeed*2*Math.PI;
        coast(damping);render();}return true;},
    up(e){if(!pointers.has(e.pointerId))return false;stop(e);pointers.delete(e.pointerId);if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);
      if(pair){pendingTheta=0;pendingPhi=0;pair=null;holdUntilRelease=true;if(!looking)returning={start:now(),yaw,pitch};}if(!pointers.size)holdUntilRelease=false;return true;},
    wheel(e){
      stop(e);if(pointers.size)return;
      const unit=e.deltaMode===1?16:e.deltaMode===2?viewport().width:1;
      if(e.ctrlKey){setZoom(zoom*Math.exp(-e.deltaY*unit*.01));return;}
      if(!e.deltaX)return;
      pendingTheta=0;pendingPhi=0;returning=null;
      yaw=clamp(yaw-e.deltaX*unit/viewport().width*Math.PI/3,-Math.PI/6,Math.PI/6);
      // A quiet wheel stream does not imply finger-up. Retain the look angle
      // until an explicit action; touch pointers still return on pointerup.
      render();
    },
    beginLook(){if(!pointers.size){pendingTheta=0;pendingPhi=0;}returning=null;targetYaw=yaw;targetPitch=pitch;looking=true;},
    // Pointer events supply targets only. The render loop fills the gaps between
    // low-rate / pixel-stepped input samples without quantizing the angles.
    look(value,vertical=0){targetYaw=clamp(value,-1,1)*Math.PI/4;targetPitch=clamp(vertical,-1,0)*Math.PI/4;},
    endLook(){if(looking){looking=false;returning={start:now(),yaw,pitch};}},
    isLooking:()=>looking,
    cancel,setZoom,zoom:()=>zoom,
    update(){const dt=clamp((now()-lastUpdate)/1000,0,.05);lastUpdate=now();
      if(looking){
        const blend=1-Math.exp(-dt/.055);
        yaw+=(targetYaw-yaw)*blend;pitch+=(targetPitch-pitch)*blend;
        if(Math.abs(targetYaw-yaw)<1e-7)yaw=targetYaw;
        if(Math.abs(targetPitch-pitch)<1e-7)pitch=targetPitch;
      }
      if(!pair){const decay=1-Math.pow(1-damping,dt*60);coast(isMobile()&&!pointers.size?1-Math.pow(1-damping,dt*30):decay,decay);}
      if(returning){const t=clamp((now()-returning.start)/200,0,1);yaw=returning.yaw*(1-t*t*(3-2*t));pitch=returning.pitch*(1-t*t*(3-2*t));if(t===1){returning=null;yaw=0;pitch=0;targetYaw=0;targetPitch=0;}}render();},
    isAnimating:()=>Boolean(returning || Math.abs(pendingTheta)>1e-7 || Math.abs(pendingPhi)>1e-7 || (looking && (Math.abs(targetYaw-yaw)>1e-7 || Math.abs(targetPitch-pitch)>1e-7))),
    resumeClock(){lastUpdate=now();},
    diagnostics:()=>({height:camera.position.y,zoom,radius:baseRadius/zoom,targetYawDegrees:targetYaw*180/Math.PI,targetPitchDegrees:targetPitch*180/Math.PI,yawDegrees:yaw*180/Math.PI,pitchDegrees:pitch*180/Math.PI,touches:pointers.size,returning:!!returning}),
  };
}
