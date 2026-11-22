// Presentation only: never write the received aim back into the game state.
export function createRemoteAimCamera({responseSeconds=.04,epsilon=1e-4}={}){
 let heading=null,targetHeading=null,key,lastX,lastY,moving=false;
 const delta=(to,from)=>Math.atan2(Math.sin(to-from),Math.cos(to-from));
 function reset(){heading=targetHeading=null;key=lastX=lastY=undefined;moving=false;}
 return{
  sample(direction,{active=false,dt=0,identity=null,anchor=null,immediate=false}={}){
   if(!direction||!Number.isFinite(direction.x)||!Number.isFinite(direction.y)||Math.hypot(direction.x,direction.y)<1e-9){reset();return direction;}
   if(!active){reset();return direction;}
   const target=Math.atan2(direction.y,direction.x);
   const discontinuity=key!==identity||lastX!==anchor?.x||lastY!==anchor?.y;
   if(immediate||heading===null||discontinuity){heading=target;moving=false;}
   else{
    // The scheduler may have slept before this packet. Do not apply that idle
    // duration to a newly received direction and jump straight to its endpoint.
    const elapsed=Math.min(Math.max(0,dt),moving ? .1 : 1/60);
    heading+=delta(target,heading)*(1-Math.exp(-elapsed/responseSeconds));
    moving=Math.abs(delta(target,heading))>epsilon;
    if(!moving)heading=target;
   }
   targetHeading=target;key=identity;lastX=anchor?.x;lastY=anchor?.y;
   return immediate?direction:{x:Math.cos(heading),y:Math.sin(heading)};
  },
  isAnimating:()=>moving,
  diagnostics:()=>({heading,targetHeading,moving}),
  reset,
 };
}
