// A single owner for frame requests. Timed UI work can wake without redrawing 3D.
export function createFrameScheduler({draw,raf=requestAnimationFrame,caf=cancelAnimationFrame,
  now=()=>performance.now(),schedule=setTimeout,cancel=clearTimeout,hidden=()=>document.hidden,maxFrameRate=()=>0}) {
  let frame=null,timer=null,dirty=true,active={scene:false,ui:false},disposed=false,lastDraw=-Infinity;
  const counters={callbacks:0,sceneFrames:0,wakes:0};
  function request(scene=true){
    if(disposed)return;dirty ||= scene;
    if(frame===null&&!hidden()){counters.wakes++;frame=raf(run);}
  }
  function run(time){
    frame=null;if(disposed||hidden())return;
    const limit=Number(maxFrameRate()),interval=limit>0?1000/limit:0;
    if(interval&&time-lastDraw<interval-.1){request(false);return;}
    // Keep the deadline aligned with the refresh clock to avoid losing a frame
    // when 60 Hz timestamps alternate around the 30/60/120 Hz boundary.
    lastDraw=interval&&Number.isFinite(lastDraw)?lastDraw+Math.max(1,Math.floor((time-lastDraw+.1)/interval))*interval:time;
    const scene=Boolean(dirty||active.scene),resumed=!active.scene;dirty=false;
    counters.callbacks++;if(scene)counters.sceneFrames++;
    active=draw(time,{scene,resumed})||{scene:false,ui:false};
    if(timer!==null){cancel(timer);timer=null;}
    if(dirty||active.scene||active.ui)request(false);
    if(Number.isFinite(active.wakeAt))timer=schedule(()=>{timer=null;request(false);},Math.max(0,active.wakeAt-now()));
  }
  function visibility(){
    if(hidden()){if(frame!==null)caf(frame);frame=null;if(timer!==null)cancel(timer);timer=null;active={scene:false,ui:false};}
    else {lastDraw=-Infinity;request();}
  }
  return {request,visibility,diagnostics:()=>({...counters,scheduled:frame!==null,sceneActive:!!active.scene}),
    dispose(){disposed=true;if(frame!==null)caf(frame);if(timer!==null)cancel(timer);frame=timer=null;}};
}
