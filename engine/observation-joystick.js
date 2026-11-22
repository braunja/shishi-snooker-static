// Anchor to the actual tip-pad bounds so trial layouts and device scaling agree.
export function createObservationJoystick({tipPad,powerTrack,powerCenter,orbit,visible,layout=()=>null,enabled=()=>true,onHold=()=>true,onRelease=()=>{},isMobile=()=>matchMedia('(pointer: coarse)').matches}) {
  const button=document.createElement('button');
  button.type='button';button.className='observation-joystick';button.hidden=true;
  button.setAttribute('aria-label','按住拖动左右转头、下拉俯视，松手回正');
  button.title='按住拖动左右转头、下拉俯视，松手回正';
  button.innerHTML='<span class="observation-joystick-stick" aria-hidden="true"></span>';
  // Share the viewer's isolated stacking context with debug panels and modals.
  // A body-level joystick would paint above every overlay inside #viewer.
  (tipPad.closest?.('#viewer') || document.body).append(button);
  let pointer=null,startX=0,startY=0,reach=1,dirty=true,lastMobile=null;
  const invalidate=()=>{dirty=true;};
  const resizeObserver=new ResizeObserver(invalidate);
  resizeObserver.observe(tipPad);resizeObserver.observe(powerTrack);
  const mutationObserver=new MutationObserver(invalidate);
  for(const element of new Set([tipPad,powerTrack,tipPad.parentElement,powerTrack.parentElement,document.body])){
    if(element)mutationObserver.observe(element,{attributes:true,attributeFilter:['style','class','hidden']});
  }
  window.addEventListener('resize',invalidate);window.addEventListener('scroll',invalidate,true);
  const stop=e=>{e.preventDefault();e.stopImmediatePropagation();};
  function release(e){if(pointer===null||e&&e.pointerId!==undefined&&e.pointerId!==pointer)return;if(e)stop(e);const id=pointer;pointer=null;button.classList.remove('is-held');button.style.setProperty('--stick-x','0px');button.style.setProperty('--stick-y','0px');orbit.endLook();if(button.hasPointerCapture(id))button.releasePointerCapture(id);onRelease();}
  button.addEventListener('pointerdown',e=>{if(e.button!==0||pointer!==null)return;stop(e);if(!enabled()||onHold()===false)return;reach=Math.max(1,button.getBoundingClientRect().width*.5);pointer=e.pointerId;startX=e.clientX;startY=e.clientY;orbit.beginLook();button.classList.add('is-held');button.setPointerCapture(pointer);});
  button.addEventListener('pointermove',e=>{if(e.pointerId!==pointer)return;stop(e);if(!enabled()){release();return;}const x=Math.max(-reach,Math.min(reach,e.clientX-startX));const y=Math.max(0,Math.min(reach,e.clientY-startY));button.style.setProperty('--stick-x',`${x}px`);button.style.setProperty('--stick-y',`${y}px`);orbit.look(x/reach,-y/reach);});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(event,release);
  button.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Escape'].includes(e.key))return;stop(e);if(!enabled())return;if(e.key==='ArrowUp')return;if(e.key==='Escape')orbit.endLook();else{orbit.beginLook();orbit.look(e.key==='ArrowLeft'?-1:e.key==='ArrowRight'?1:0,e.key==='ArrowDown'?-1:0);}});
  button.addEventListener('keyup',e=>{if(['ArrowLeft','ArrowRight','ArrowDown'].includes(e.key)){stop(e);orbit.endLook();}});
  const blur=()=>{release();orbit.endLook();};window.addEventListener('blur',blur);button.addEventListener('blur',()=>{if(pointer===null)orbit.endLook();});
  return {update(){
    const disabled=!enabled();
    if(button.disabled!==disabled){button.disabled=disabled;button.setAttribute('aria-disabled',String(disabled));}
    if(disabled)release();
    if(!visible()){if(!button.hidden)button.hidden=true;dirty=true;release();return;}
    const mobile=isMobile();const label=mobile?'按住观察，左右拖动转头、下拉俯视，另一指拖动画面绕桌':'按住观察，左右拖动转头、下拉俯视，松手返回';if(button.title!==label){button.title=label;button.setAttribute('aria-label',label);}if(mobile!==lastMobile){lastMobile=mobile;dirty=true;}
    if(!dirty)return;dirty=false;
    const r=tipPad.getBoundingClientRect(),show=r.width>0&&r.height>0;
    button.hidden=!show;if(!show){release();return;}
    const padSize=Math.min(r.width,r.height),radius=padSize*.42;
    const size=mobile&&window.SnookerProduct?2*(radius+Math.max(2,radius*.08)/2):padSize*.6;
    const custom=layout(size);
    if(custom){Object.assign(button.style,{left:custom.x+'px',top:custom.y+'px',width:custom.width+'px',height:custom.height+'px'});return;}
    button.style.width=button.style.height=`${size}px`;
    if(mobile){
      button.style.left=`${r.left+(r.width-size)/2}px`;
      button.style.top=`${r.top-size-16}px`;
    }else{
      const power=powerTrack.getBoundingClientRect();
      button.style.left=`${powerCenter()-size/2}px`;
      button.style.top=`${power.top-size-16}px`;
    }
  },dispose(){resizeObserver.disconnect();mutationObserver.disconnect();window.removeEventListener('resize',invalidate);window.removeEventListener('scroll',invalidate,true);release();window.removeEventListener('blur',blur);button.remove();}};
}
