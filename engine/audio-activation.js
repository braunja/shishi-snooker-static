// Register before the opening animation's capture-phase input lock. Touch
// activation becomes valid at pointerup/touchend, not at touch pointerdown.
export function installAudioActivation(target,activate){
 const events=['pointerdown','pointerup','touchend','click','keydown'];
 const handler=event=>{try{Promise.resolve(activate(event)).catch(()=>{});}catch{}};
 for(const type of events)target.addEventListener(type,handler,{capture:true,passive:true});
 return()=>{for(const type of events)target.removeEventListener(type,handler,true);};
}
