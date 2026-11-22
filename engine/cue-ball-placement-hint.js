// Connect the cue ball's rendered centre to an offset drag handle.
export function createCueBallPlacementHint({root,ball,canPlace,project,size=()=>48,offsetScale=()=>1,inHand=canPlace,sessionKey=()=>null,onBegin,onMove,onEnd,requestFrame=()=>{},bottomInset=()=>0,projectBall=cue=>project(cue.pos,(cue.radius||26.25)/1000)}){
 const layer=document.createElement('div');layer.className='cue-placement-hint';layer.hidden=true;
 // Move two small composited elements instead of invalidating a full-screen
 // SVG path each camera frame, avoiding mobile SVG repaint artifacts.
 const line=document.createElement('div');line.className='cue-placement-connector';line.setAttribute('aria-hidden','true');
 layer.append(line);
 const handle=document.createElement('button');handle.type='button';handle.className='cue-placement-handle';handle.setAttribute('aria-label','按住把手拖动母球');handle.title='按住把手拖动母球';
 const icon=document.createElement('img');icon.src=new URL('./textures/cue-placement-handle-arrows.svg',import.meta.url).href;icon.alt='';icon.draggable=false;handle.append(icon);
 layer.append(handle);root.append(layer);let drag=null,wasInHand=false,lastKey=null,dismissed=false,handleOnRight=true;
 function syncSession(){
  const active=!!inHand(),key=sessionKey();
  if(active&&(!wasInHand||key!==lastKey))dismissed=false;
  wasInHand=active;lastKey=key;
 }
 function shotStarted(){syncSession();if(wasInHand){dismissed=true;layer.hidden=true;}requestFrame();}
 const stop=e=>{e.preventDefault();e.stopPropagation();};
 const dragPoint=event=>({x:drag.anchor.x+event.clientX-drag.start.x,y:drag.anchor.y+event.clientY-drag.start.y});
 function finish(event,cancel=false){
  if(!drag||event&&event.pointerId!==undefined&&event.pointerId!==drag.id)return;
  if(!cancel&&!canPlace())cancel=true;
  if(!cancel&&event&&Number.isFinite(event.clientX)&&Number.isFinite(event.clientY))onMove(dragPoint(event));
  if(event)stop(event);const current=drag;drag=null;handle.classList.remove('is-held');
  if(handle.hasPointerCapture(current.id))handle.releasePointerCapture(current.id);
  onEnd(cancel,event);
  requestFrame();
 }
 handle.addEventListener('pointerdown',e=>{
  stop(e);syncSession();if(e.button!==0||drag||dismissed||!inHand()||!canPlace())return;
  const anchor=onBegin(e);if(!anchor)return;
  drag={id:e.pointerId,start:{x:e.clientX,y:e.clientY},anchor,right:handleOnRight};handle.classList.add('is-held');handle.setPointerCapture(e.pointerId);requestFrame();
 });
 handle.addEventListener('pointermove',e=>{
  if(!drag||e.pointerId!==drag.id)return;stop(e);
  if(!canPlace()){finish(e,true);return;}
  onMove(dragPoint(e));requestFrame();
 });
 handle.addEventListener('pointerup',e=>finish(e));
 for(const type of ['pointercancel','lostpointercapture'])handle.addEventListener(type,e=>finish(e,true));
 for(const type of ['click','contextmenu','touchstart','touchmove','touchend'])handle.addEventListener(type,stop,{passive:false});
 const blur=()=>finish(null,true);window.addEventListener('blur',blur);
 function update(){
  syncSession();
  const cue=ball(),visible=wasInHand&&!dismissed&&canPlace()&&cue&&!cue.potted;
  if(!visible){finish(null,true);layer.hidden=true;return;}
  const center=projectBall(cue);
  if(!Number.isFinite(center.x)||!Number.isFinite(center.y)||center.x<0||center.x>innerWidth||center.y<0||center.y>innerHeight){finish(null,true);layer.hidden=true;return;}
  layer.hidden=false;
  {
   const visualSize=Math.max(1,size(cue)),scale=visualSize/48,hitSize=Math.max(44,visualSize),edge=hitSize/2+4*scale;
   handle.style.width=handle.style.height=`${hitSize}px`;
   icon.style.width=icon.style.height=`${visualSize}px`;
   const strokeWidth=1.5*scale;
   line.style.height=`${strokeWidth}px`;
   const edgePoint=project({x:cue.pos.x+(cue.radius||26.25),y:cue.pos.y},(cue.radius||26.25)/1000);
   const ballEdge=Math.hypot(edgePoint.x-center.x,edgePoint.y-center.y);
   const offset=offsetScale();
   const distance=Math.max(96*scale,ballEdge+hitSize/2+32*scale)*offset;
   const right=drag?.right??(center.x+distance<innerWidth-edge);handleOnRight=right;
   const x=Math.max(edge,Math.min(innerWidth-edge,center.x+(right?distance:-distance)));
   const y=Math.max(edge,Math.min(innerHeight-bottomInset()-edge,center.y-24*scale*offset));
   handle.style.transform=`translate3d(${x-hitSize/2}px,${y-hitSize/2}px,0)`;
   line.style.width=`${Math.hypot(x-center.x,y-center.y)}px`;
   line.style.transform=`translate3d(${center.x}px,${center.y-strokeWidth/2}px,0) rotate(${Math.atan2(y-center.y,x-center.x)}rad)`;
  }
 }
 return {update,shotStarted,isVisible:()=>!layer.hidden,reset(){finish(null,true);wasInHand=false;lastKey=null;dismissed=false;layer.hidden=true;},cancel:()=>finish(null,true),isDragging:()=>!!drag,dispose(){finish(null,true);window.removeEventListener('blur',blur);layer.remove();}};
}
