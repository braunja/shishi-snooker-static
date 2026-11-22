// Render-only presentation: pointer handling and shot strength stay in the game core.
export const POWER_TRACK_SCALE = 1.05;
export function powerTrackTravel(height){return Math.max(1,height-(42+5+10)*POWER_TRACK_SCALE);}

// Older system browsers accept only a sequence for radii. Keep the native
// circular path where supported, with an equivalent arc path as a fallback.
export function powerTrackRoundRect(ctx,x,y,w,h,radius){
 if(typeof ctx.roundRect==='function'){
  try{ctx.roundRect(x,y,w,h,[radius]);return;}catch{ctx.beginPath();}
 }
 const r=Math.min(radius,Math.abs(w)/2,Math.abs(h)/2);
 ctx.moveTo(x+r,y);
 ctx.lineTo(x+w-r,y);ctx.arcTo(x+w,y,x+w,y+r,r);
 ctx.lineTo(x+w,y+h-r);ctx.arcTo(x+w,y+h,x+w-r,y+h,r);
 ctx.lineTo(x+r,y+h);ctx.arcTo(x,y+h,x,y+h-r,r);
 ctx.lineTo(x,y+r);ctx.arcTo(x,y,x+r,y,r);
 ctx.closePath();
}

export function drawModelPowerTrack(ctx,{width,height,cue,power,pullDistance,enabled,containerAlpha=.28,cueAlpha=1,opaqueCue=false,containerWidth,containerX}){
 const top=42,bottom=height-5,h=bottom-top,w=containerWidth??Math.min(58,width*.64),x=containerX??(width-w)/2;
 const enabledAlpha=enabled?1:.45;
 ctx.save();ctx.globalAlpha=enabledAlpha*Math.min(1,Math.max(0,containerAlpha));
 ctx.beginPath();powerTrackRoundRect(ctx,x,top,w,h,Math.min(20,w*.32));ctx.fillStyle='rgba(245,250,246,.46)';ctx.fill();ctx.strokeStyle='rgb(233,243,239)';ctx.lineWidth=1;ctx.stroke();
 ctx.save();ctx.clip();
 for(const f of [.25,.5,.75]){ctx.fillStyle='rgba(231,243,236,.5714285714)';ctx.fillRect(x+6,top+h*f,w-12,1);}
 // Keep the visible butt inset equal to the side clearance, excluding transparent texture padding.
 const visibleLength=powerTrackTravel(height*POWER_TRACK_SCALE)/POWER_TRACK_SCALE,cueHeight=visibleLength*2*1.5*1.5;
 const cueWidth=cueHeight*cue.naturalWidth/cue.naturalHeight;
 // All offline sprites share the original 128x4096 framing and butt anchor.
 const sideInset=Math.max(0,(w-cueWidth*84/128)/2);
 const cueY=bottom-sideInset-cueHeight*3982/4096;
 const shift=Math.min(Math.max(0,pullDistance),visibleLength);
 // Product cue artwork stays opaque; its surrounding pixels retain image alpha.
 ctx.globalAlpha=opaqueCue?1:enabledAlpha*Math.min(1,Math.max(0,cueAlpha));
 ctx.drawImage(cue,x+w/2-cueWidth/2,cueY+shift,cueWidth,cueHeight);
 ctx.restore();ctx.restore();
}

// Share the table cue's actual strike progress, including its power-dependent
// duration and constant acceleration. No second animation clock.
export function powerTrackStrikeDistance(animation, releasedDistance) {
 if(!animation || animation.fired || animation.phase!=='strike')return 0;
 return Math.max(0,releasedDistance)*Math.max(0,Math.min(1,animation.currentOffset/Math.max(1e-9,animation.pullOffset)));
}
