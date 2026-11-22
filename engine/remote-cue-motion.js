// Smooth only the opponent's displayed cue. Authoritative aim and strike
// inputs remain untouched, and the actual strike animation takes over exactly.
export function createRemoteCueMotion({responseSeconds=.045}={}){
 let activeLastFrame=false,moving=false,lastAnchorX,lastAnchorY;
 return {
  apply(cue,position,quaternion,{active=false,dt=0,anchor=null}={}){
   // A checkpoint can move the cue ball while the old displayed shaft is
   // still nearby. That is a discontinuity, not another remote aim sample.
   const relocated=anchor&&(anchor.x!==lastAnchorX||anchor.y!==lastAnchorY);
   lastAnchorX=anchor?.x;lastAnchorY=anchor?.y;
   if(active && activeLastFrame && !relocated && cue.position.distanceTo(position)<1){
    const alpha=1-Math.exp(-Math.max(0,dt)/responseSeconds);
    cue.position.lerp(position,alpha);
    cue.quaternion.slerp(quaternion,alpha);
   }else{
    cue.position.copy(position);cue.quaternion.copy(quaternion);
   }
   activeLastFrame=active;
   moving=Boolean(active&&(cue.position.distanceToSquared(position)>1e-10||cue.quaternion.angleTo(quaternion)>1e-5));
   if(!moving){cue.position.copy(position);cue.quaternion.copy(quaternion);}
  },
  isAnimating:()=>moving,
  reset(){activeLastFrame=false;moving=false;lastAnchorX=lastAnchorY=undefined;},
 };
}
