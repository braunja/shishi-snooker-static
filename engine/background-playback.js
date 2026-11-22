// Advance existing physics/authoritative events without entering the renderer.
// One timer, no history or shot queue; idle/paused pages schedule no work.
export function createBackgroundPlayback({hidden,busy,tick,now=()=>performance.now(),schedule=setTimeout,cancel=clearTimeout,onError=()=>{},interval=50}) {
  let timer=null,last=null,stopped=false;
  function clear(){if(timer!==null)cancel(timer);timer=null;last=null;}
  function run(){
    timer=null;
    if(stopped||!hidden()||!busy()){last=null;return;}
    const time=now(),dt=last===null?0:Math.max(0,Math.min(.1,(time-last)/1000));last=time;
    try{tick(dt,time);}catch(error){clear();onError(error);return;}
    wake();
  }
  function wake(){if(stopped||timer!==null||!hidden()||!busy())return;timer=schedule(run,interval);}
  return {wake,visibility(){clear();wake();},stop(){stopped=true;clear();},resume(){stopped=false;wake();},diagnostics:()=>({scheduled:timer!==null})};
}
