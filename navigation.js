'use strict';
// Native text tools belong to text editors, not the game's buttons or artwork.
window.ProductInteraction=(()=>{
 const textTypes=['text','search','url','tel','email','password','number'];
 const editors=textTypes.map(type=>`input[type="${type}"]`).concat('input:not([type])','textarea','[contenteditable=""]','[contenteditable="true" i]','[contenteditable="plaintext-only" i]');
 const css=`*,*::before,*::after{-webkit-user-select:none!important;user-select:none!important;-webkit-touch-callout:none!important}
 ${editors.join(',')},:is([contenteditable=""],[contenteditable="true" i],[contenteditable="plaintext-only" i]) *{-webkit-user-select:text!important;user-select:text!important;-webkit-touch-callout:default!important}
 [contenteditable="false" i]{-webkit-user-select:none!important;user-select:none!important;-webkit-touch-callout:none!important}
 button,summary,a[href],[role=button],input[type=button],input[type=submit],input[type=checkbox],input[type=radio]{touch-action:manipulation}
 [data-product-press="inside"]{filter:brightness(.65)!important}`;
 function editable(node){
  if(node?.matches?.('input'))return textTypes.includes((node.type||'text').toLowerCase());
  return Boolean(node?.matches?.('textarea')||node?.isContentEditable);
 }
 // Touch pointers implicitly capture their starting element. A browser click
 // can therefore still target a button after the finger has left its bounds.
 // Keep native click/user activation, but reject a gesture once it leaves.
 function bindButtonPresses(root){
  const selector='button,input[type=button],input[type=submit],input[type=reset],input[type=checkbox],input[type=radio],summary,a[href],[role=button],[data-detail]';
  const active=new Map(),pointers=new Map(),cleanupTimers=new Set();let last=null,landscape=innerWidth>innerHeight;
  const path=event=>event.composedPath?.()||[event.target];
  function inside(press,event){
   const button=press.button;if(!button.isConnected||button.disabled||button.getAttribute('aria-disabled')==='true')return false;
   const rect=button.getBoundingClientRect(),x=event.clientX,y=event.clientY;
   if(x<rect.left||x>=rect.right||y<rect.top||y>=rect.bottom)return false;
   // Hit-test through open Shadow DOM as well, so overlays and clipped scroll
   // regions cannot activate an obscured button inside its bounding box.
   let hit=document.elementFromPoint(x,y),child;
   while(hit?.shadowRoot&&(child=hit.shadowRoot.elementFromPoint?.(x,y))&&child!==hit)hit=child;
   while(hit){if(hit===button)return true;hit=hit.parentElement||hit.getRootNode?.().host;}
   return false;
  }
  function cancel(press){press.cancelled=true;for(const button of press.buttons)button.setAttribute('data-product-press','cancelled');}
  function cancelAll(){for(const press of active.values())cancel(press);}
  function scrollPositions(button){
   const positions=[];
   for(let node=button;node;node=node.parentElement||node.getRootNode?.().host){
    if(node.scrollHeight>node.clientHeight||node.scrollWidth>node.clientWidth)positions.push([node,node.scrollLeft||0,node.scrollTop||0]);
   }
   return positions;
  }
  function scroll(){
   // A toolbar/visual-viewport resize or another panel's scroll is not a drag
   // of this button. Only cancel when its own scroll ancestor actually moves.
   for(const press of active.values())if(press.scroll.some(([node,x,y])=>(node.scrollLeft||0)!==x||(node.scrollTop||0)!==y))cancel(press);
  }
  function clearVisual(press){
   const timer=setTimeout(()=>{cleanupTimers.delete(timer);for(const button of press.buttons)if(![...active.values()].some(p=>p.buttons.includes(button)))button.removeAttribute('data-product-press');},0);cleanupTimers.add(timer);
  }
  function down(event){
   if(!event.pointerType||event.button!==0)return;
   if(event.pointerType==='touch'||event.pointerType==='pen')pointers.set(event.pointerId,{target:path(event)[0],pointerType:event.pointerType,clientX:event.clientX,clientY:event.clientY});
   // A new primary contact means Safari has no other live contact. Drop a
   // stale gesture whose terminal event was lost during viewport transitions.
   if(event.isPrimary&&active.size){for(const press of active.values())clearVisual(press);active.clear();}
   if(active.size)cancelAll();last=null;
   const buttons=path(event).filter(node=>node?.matches?.(selector)),button=buttons[0];
   // This button is a continuous drag control, not a discrete command.
   if(!button||button.matches('.observation-joystick')||button.disabled)return;
   const press={button,buttons,id:event.pointerId,scroll:scrollPositions(button),cancelled:active.size>0};
   active.set(event.pointerId,press);last=press;
   for(const target of buttons)target.setAttribute('data-product-press',press.cancelled?'cancelled':'inside');
   // Native pointerdown already hit-tested this target.
  }
  function move(event){const press=active.get(event.pointerId);if(press&&!press.cancelled&&!inside(press,event))cancel(press);}
  function up(event){
   pointers.delete(event.pointerId);
   const press=active.get(event.pointerId);if(!press)return;
   if(event.type==='pointercancel'||!inside(press,event))cancel(press);
   active.delete(event.pointerId);last=press;clearVisual(press);
  }
  function click(event){
   // Keyboard and programmatic activation have no pointer gesture to cancel.
   if(event.detail===0&&!event.pointerType)return;
   const press=active.get(event.pointerId)||last;if(!press)return;
   // Compatibility mouse clicks must not inherit a previous button's gesture.
   if(!path(event).some(node=>press.buttons.includes(node)))return;
   last=null;
   // pointerup already checked release position; compatibility clicks can
   // carry stale viewport coordinates after iOS rotation.
   if(press.cancelled){event.preventDefault();event.stopImmediatePropagation();}
  }
  function blur(){cancelAll();for(const press of active.values())clearVisual(press);active.clear();pointers.clear();}
  function rotate(){
   landscape=innerWidth>innerHeight;
   // iOS can rotate without delivering a terminal event for an old contact.
   // Cancel drags rather than synthesizing a release that could fire a shot.
   const pending=[...pointers.entries()];pointers.clear();
   for(const [pointerId,pointer]of pending){const target=pointer.target?.isConnected?pointer.target:document;target.dispatchEvent(new PointerEvent('pointercancel',{bubbles:true,composed:true,pointerId,pointerType:pointer.pointerType,clientX:pointer.clientX,clientY:pointer.clientY}));if(pointer.target?.hasPointerCapture?.(pointerId))pointer.target.releasePointerCapture(pointerId);}
   for(const press of [...active.values(),...(last?[last]:[])])for(const button of press.buttons)button.removeAttribute('data-product-press');
   active.clear();last=null;
  }
  function resized(){if((innerWidth>innerHeight)!==landscape)rotate();}

  const handlers=[['pointerdown',down],['pointermove',move],['pointerup',up],['pointercancel',up],['click',click],['scroll',scroll]];
  for(const [type,handler]of handlers)root.addEventListener(type,handler,true);
  window.addEventListener('blur',blur);window.addEventListener('orientationchange',rotate);window.addEventListener('resize',resized);
  return()=>{for(const [type,handler]of handlers)root.removeEventListener(type,handler,true);window.removeEventListener('blur',blur);window.removeEventListener('orientationchange',rotate);window.removeEventListener('resize',resized);pointers.clear();for(const timer of cleanupTimers)clearTimeout(timer);for(const press of [...active.values(),...(last?[last]:[])])for(const button of press.buttons)button.removeAttribute('data-product-press');active.clear();};
 }
 function bind(root){
  const types=['contextmenu','selectstart','dragstart'],options={capture:true,passive:false};
  const unbindPresses=root===document?bindButtonPresses(root):()=>{};
  function suppress(event){const target=event.composedPath?.().find(node=>node?.nodeType===1)||(event.target?.nodeType===3?event.target.parentElement:event.target);if(!editable(target)&&event.cancelable)event.preventDefault();}
  for(const type of types)root.addEventListener(type,suppress,options);
  return()=>{unbindPresses();for(const type of types)root.removeEventListener(type,suppress,options);};
 }
 const style=document.createElement('style');style.textContent=css;document.head.append(style);
 const unbind=bind(document);addEventListener('pagehide',()=>{unbind();style.remove();},{once:true});
 return{css,bind};
})();
// All product routes share one layout viewport. A software keyboard may cover
// the UI, but must never rescale it or turn a portrait layout into landscape.
window.ProductViewport=(()=>{
 let previous=null,focused=false,frame=0,timers=[],layoutEpoch=0;
 const layouts=new WeakMap();
 const editable=node=>Boolean(node?.matches?.('input:not([type=range]):not([type=checkbox]):not([type=radio]),textarea,[contenteditable=true]'));
 function measure(){
  let width=innerWidth,height=innerHeight;
  // iOS can update its visible viewport before the percentage-height root.
  // Use the visible extent when it belongs to this orientation, never the keyboard.
  const visible=window.visualViewport;
  if(!focused&&visible&&visible.height>=height*.65&&Math.abs(visible.width-width)<2&&Math.abs((visible.scale||1)-1)<.01)height=Math.ceil(visible.height);
  if(previous&&focused&&Math.abs(width-previous.width)<2&&height<previous.height)height=previous.height;
  const css=getComputedStyle(document.documentElement),safe={};
  for(const side of ['top','right','bottom','left'])safe[side]=parseFloat(css.getPropertyValue('--product-safe-'+side))||0;
  const root=document.documentElement;
  // Game chrome shares a centered safe rectangle, even with a notch on one side.
  if(document.getElementById('viewer')){
   const mobileControls=window.ThreeTrialPageLayout ? window.ThreeTrialPageLayout.device==='mobile' : matchMedia('(pointer: coarse)').matches;
   root.toggleAttribute('data-product-mobile-controls',mobileControls);
   // Tablets can report zero horizontal insets even in landscape. Keep the
   // same visible gutter for touch controls and menus in both orientations.
   safe.left=safe.right=Math.max(safe.left,safe.right,mobileControls||height>width?12:0);
   if(root.style.getPropertyValue('--product-game-safe-horizontal')!==safe.left+'px')root.style.setProperty('--product-game-safe-horizontal',safe.left+'px');
  }
  if(root.style.getPropertyValue('--product-viewport-width')!==width+'px')root.style.setProperty('--product-viewport-width',width+'px');
  if(root.style.getPropertyValue('--product-viewport-height')!==height+'px')root.style.setProperty('--product-viewport-height',height+'px');
  // iOS's translucent status-bar treatment can extend beyond its safe inset.
  // Move only the unscaled topbar host; never rescale the game or its viewport.
  let iphoneFullScreen=false;
  if(/iPhone|iPod/i.test(navigator.userAgent||'')&&height>width){
   for(let owner=window;;){
    try{
     iphoneFullScreen=Boolean(owner.navigator.standalone||owner.document.fullscreenElement||owner.document.webkitFullscreenElement||owner.matchMedia('(display-mode: standalone)').matches||owner.matchMedia('(display-mode: fullscreen)').matches);
     if(iphoneFullScreen||owner.parent===owner)break;
     owner=owner.parent;
    }catch{break;}
   }
  }
  if(root.hasAttribute('data-product-iphone-topbar-clearance')!==iphoneFullScreen)root.toggleAttribute('data-product-iphone-topbar-clearance',iphoneFullScreen);
  const topbarClearance=iphoneFullScreen?'24px':'0px';
  if(root.style.getPropertyValue('--product-iphone-topbar-clearance')!==topbarClearance)root.style.setProperty('--product-iphone-topbar-clearance',topbarClearance);
  previous={width,height,safe};return previous;
 }
 // Rebuild geometry and its hit-test mapping in one synchronous transaction.
 // Only a real geometry/orientation change pays for layout; idle UI does no work.
 function applyLayout(element,styles){
  const signature=layoutEpoch+':'+JSON.stringify(styles);if(layouts.get(element)===signature)return false;
  const transform=Object.hasOwn(styles,'transform')?styles.transform:element.style.transform;
  const zoom=Object.hasOwn(styles,'zoom')?styles.zoom:element.style.zoom;
  const visible=!element.closest('[hidden]')&&!element.getRootNode().host?.hidden;
  element.style.transform='none';element.style.zoom='1';
  for(const [key,value]of Object.entries(styles))if(key!=='transform'&&key!=='zoom'){if(key.startsWith('--'))element.style.setProperty(key,value);else element.style[key]=value;}
  if(visible)element.getBoundingClientRect();
  element.style.zoom=zoom;element.style.transform=transform;
  if(visible)element.getBoundingClientRect();
  layouts.set(element,signature);return true;
 }
 function publish(){frame=0;const viewport=measure();dispatchEvent(new CustomEvent('product-viewport-resize',{detail:viewport}));}
 function schedule(){if(!frame)frame=requestAnimationFrame(publish);}
 function settled(){layoutEpoch++;schedule();timers.forEach(clearTimeout);timers=[60,180,360].map(ms=>setTimeout(schedule,ms));}
 function focusin(e){if(editable(e.composedPath?.()[0]||e.target)){measure();focused=true;}}
 function focusout(){setTimeout(()=>{let active=document.activeElement;while(active?.shadowRoot?.activeElement)active=active.shadowRoot.activeElement;focused=editable(active);schedule();},0);}
 // Safari's gesture events and Chromium's Ctrl+wheel represent native page
 // zoom. Prevent only magnification, leaving single-finger scroll and game input.
 const options={capture:true,passive:false};
 function prevent(e){if(e.cancelable)e.preventDefault();}
 let touchY=null,touchOrigin=null;
 function touchStart(e){const t=e.touches?.length===1?e.touches[0]:null;touchY=t?.clientY??null;touchOrigin=t?{x:t.clientX,y:t.clientY}:null;multiTouch(e);}
 function multiTouch(e){if(e.touches?.length>1)prevent(e);}
 function touchMove(e){
  multiTouch(e);if(e.touches?.length!==1||!Number.isFinite(e.touches[0].clientY)||touchY===null)return;
  const touch=e.touches[0],y=touch.clientY,delta=y-touchY;touchY=y;
  // Finger jitter is still a tap. Preventing its touchmove cancels Safari's
  // native click, even when pointerup lands on the original button.
  if(touchOrigin&&Math.hypot(touch.clientX-touchOrigin.x,y-touchOrigin.y)<10)return;
  if(!delta)return;
  const path=e.composedPath?.()||[e.target];
  if(path.some(editable))return;
  for(const node of path){
   if(node===document.body||node===document.documentElement)break;
   if(node?.nodeType!==1)continue;
   const css=getComputedStyle(node);
   if(/auto|scroll/.test(css.overflowY)&&node.scrollHeight>node.clientHeight+1&&((delta>0&&node.scrollTop>0)||(delta<0&&node.scrollTop+node.clientHeight<node.scrollHeight-1)))return;
  }
  // The setup page scrolls the document; game canvases retain their drag guard.
  if(document.body.classList.contains('computer-lobby')){
   const node=document.scrollingElement;
   if(node&&node.scrollHeight>node.clientHeight+1&&((delta>0&&node.scrollTop>0)||(delta<0&&node.scrollTop+node.clientHeight<node.scrollHeight-1)))return;
  }
  prevent(e);
 }
 function wheel(e){if(e.ctrlKey)prevent(e);}
 const gestures=['gesturestart','gesturechange','gestureend'];
 gestures.forEach(type=>document.addEventListener(type,prevent,options));
 document.addEventListener('touchstart',touchStart,options);document.addEventListener('touchmove',touchMove,options);document.addEventListener('wheel',wheel,options);
 document.addEventListener('focusin',focusin,true);document.addEventListener('focusout',focusout,true);
 addEventListener('resize',schedule);addEventListener('operation-layout-change',schedule);addEventListener('orientationchange',settled);addEventListener('pageshow',settled);
 document.addEventListener('fullscreenchange',settled);document.addEventListener('webkitfullscreenchange',settled);
 window.visualViewport?.addEventListener('resize',schedule);
 const observer=new ResizeObserver(schedule);observer.observe(document.documentElement);
 addEventListener('pagehide',()=>{cancelAnimationFrame(frame);timers.forEach(clearTimeout);observer.disconnect();removeEventListener('resize',schedule);removeEventListener('operation-layout-change',schedule);removeEventListener('orientationchange',settled);removeEventListener('pageshow',settled);document.removeEventListener('fullscreenchange',settled);document.removeEventListener('webkitfullscreenchange',settled);window.visualViewport?.removeEventListener('resize',schedule);document.removeEventListener('focusin',focusin,true);document.removeEventListener('focusout',focusout,true);gestures.forEach(type=>document.removeEventListener(type,prevent,options));document.removeEventListener('touchstart',touchStart,options);document.removeEventListener('touchmove',touchMove,options);document.removeEventListener('wheel',wheel,options);},{once:true});
 return{measure,applyLayout};
})();
// Keep the screen awake only while a game document is visible. Browsers may
// revoke the lock (for example in low-power mode), so retry on return or input.
(()=>{
 if(!/^\/(?:match|practice|replay|computer\/play|battle\/[^/]+\/play)\/?$/.test(location.pathname)||!navigator.wakeLock?.request)return;
 let lock=null,pending=false,stopped=false,generation=0;
 const release=sentinel=>{try{Promise.resolve(sentinel.release()).catch(()=>{});}catch{}};
 async function acquire(){
  if(stopped||document.hidden||lock||pending)return;
  pending=true;const requested=generation;
  try{
   const sentinel=await navigator.wakeLock.request('screen');
   if(stopped||document.hidden||requested!==generation){release(sentinel);return;}
   if(sentinel.released)return;
   lock=sentinel;sentinel.addEventListener('release',()=>{if(lock===sentinel)lock=null;},{once:true});
  }catch{/* Unsupported, denied or temporarily unavailable; gameplay continues. */}
  finally{pending=false;if(!stopped&&!document.hidden&&requested!==generation)acquire();}
 }
 function visibility(){generation++;if(document.hidden){if(lock){const previous=lock;lock=null;release(previous);}}else acquire();}
 function stop(){
  if(stopped)return;stopped=true;generation++;
  document.removeEventListener('visibilitychange',visibility);document.removeEventListener('pointerdown',acquire,true);document.removeEventListener('keydown',acquire,true);
  removeEventListener('pagehide',stop);removeEventListener('product-wake-lock-stop',stop);
  if(lock){const previous=lock;lock=null;release(previous);}
 }
 document.addEventListener('visibilitychange',visibility);document.addEventListener('pointerdown',acquire,true);document.addEventListener('keydown',acquire,true);
 addEventListener('pagehide',stop);addEventListener('product-wake-lock-stop',stop);acquire();
})();
window.ProductNavigation=(()=>{
 let frame=null,homeShell=false,entryCheck=null,departed=false;const shellURL=new URL(location.href);
 const lobbyKey='snooker.product.lobby-path.v1';let lobbyPath='/';
 try{const saved=sessionStorage.getItem(lobbyKey);if(saved==='/'||/^\/preview\/?$/.test(saved||''))lobbyPath=saved;if(shellURL.pathname==='/'||/^\/preview\/?$/.test(shellURL.pathname)){lobbyPath=shellURL.pathname;sessionStorage.setItem(lobbyKey,lobbyPath);}}catch{if(/^\/preview\/?$/.test(shellURL.pathname))lobbyPath=shellURL.pathname;}
 function route(value){const url=new URL(value,location.href);if(url.origin===location.origin&&url.pathname==='/')url.pathname=lobbyPath;return url;}
 function owner(){try{return parent!==window&&parent.ProductNavigation?.hasFrame()?parent.ProductNavigation:window.ProductNavigation;}catch{return window.ProductNavigation;}}
 function active(){const o=owner();return o!==window.ProductNavigation?o.active():Boolean(document.fullscreenElement||document.webkitFullscreenElement);}
 function standalone(){return navigator.standalone===true||matchMedia('(display-mode: standalone)').matches||matchMedia('(display-mode: fullscreen)').matches;}
 async function toggle(){const o=owner();if(o!==window.ProductNavigation)return o.toggle();if(active())await(document.exitFullscreen?.()||document.webkitExitFullscreen?.());else await(document.documentElement.requestFullscreen?.()||document.documentElement.webkitRequestFullscreen?.());}
 addEventListener('pagehide',()=>{departed=true;entryCheck?.abort();});
 async function go(value,replace=false,admitted=false){const url=route(value);if(url.origin!==location.origin)return;
  if(entryCheck&&!['/match','/practice','/replay'].includes(url.pathname)){const previous=entryCheck;entryCheck=null;previous.abort();}
  if(!admitted&&['/match','/practice','/replay'].includes(url.pathname)){
   if(entryCheck||departed)return false;
   const controller=entryCheck=new AbortController(),timer=setTimeout(()=>controller.abort(),5000);
   try{
    const response=await fetch(url.href,{headers:{'X-Product-Entry-Check':'1'},cache:'no-store',signal:controller.signal});
    if(departed||entryCheck!==controller)return false;
    if(!response.ok){let message='暂时无法进入，请稍后重试';try{message=(await response.json()).message||message;}catch{}window.dispatchEvent(new CustomEvent('product-notice',{detail:message}));return false;}
   }catch{if(!departed&&entryCheck===controller)window.dispatchEvent(new CustomEvent('product-notice',{detail:'连接失败，请稍后重试'}));return false;}
   finally{clearTimeout(timer);if(entryCheck===controller)entryCheck=null;}
  }
  window.dispatchEvent(new Event('product-wake-lock-stop'));if(url.pathname==='/login'){if(window.ProductSessionGuard){window.ProductSessionGuard.login();return;}window.dispatchEvent(new Event('product-route-depart'));try{window.top.location.replace(url.href);}catch{location.replace(url.href);}return;}if(['/match','/practice','/replay'].includes(url.pathname))window.dispatchEvent(new Event('product-route-depart'));const o=owner();if(o!==window.ProductNavigation)return o.go(url.href,replace,true);
  if(frame){
   try{frame.contentWindow.dispatchEvent(new Event('product-wake-lock-stop'));}catch{}
   if(homeShell&&['/','/preview'].includes(url.pathname)){
    frame.remove();frame=null;history.replaceState(null,'',standalone()?shellURL.pathname+shellURL.search+url.hash:url.pathname+url.search+url.hash);
    window.dispatchEvent(new Event('hashchange'));window.dispatchEvent(new Event('product-route-resume'));return;
   }
   frame.style.visibility='hidden';const target=frame.contentWindow.location;replace?target.replace(url.href):target.assign(url.href);return;
  }
  if(!active()&&!standalone()){replace?location.replace(url.href):location.assign(url.href);return;}
  // Standalone iOS navigation stays inside this app document. A retained lobby
  // pauses its socket; only a discarded game document tears down its renderer.
  homeShell=Boolean(document.getElementById('app'));
  if(homeShell)window.dispatchEvent(new Event('product-route-suspend'));
  else window.dispatchEvent(new PageTransitionEvent('pagehide'));
  frame=document.createElement('iframe');frame.id='product-route-frame';frame.title='斯诺石狮三剑克';frame.allow='fullscreen; autoplay; clipboard-write; screen-wake-lock';frame.setAttribute('allowfullscreen','');Object.assign(frame.style,{position:'fixed',inset:'0',width:'var(--product-viewport-width,100%)',height:'var(--product-viewport-height,100%)',border:'0',zIndex:'2147483000',background:'#0e171a',visibility:'hidden'});frame.addEventListener('load',()=>{try{if(!frame?.contentDocument?.getElementById('product-loading-bootstrap'))revealFrame(frame.contentWindow);}catch{} });frame.src=url.href;document.body.append(frame);
 }
 // Keep the installed web clip's outer URL in its original navigation scope.
 function sync(url){if(!frame||standalone()||homeShell&&lobbyPath!=='/')return;const u=new URL(url);if(u.origin===location.origin)history.replaceState(null,'',u.pathname+u.search+u.hash);}
 const syncParent=()=>{if(parent===window)return;try{if(parent.ProductNavigation?.hasFrame())parent.ProductNavigation.sync(location.href);}catch{}};
 if(parent!==window){addEventListener('DOMContentLoaded',syncParent);addEventListener('hashchange',syncParent);}
 // Legacy lobby views write /#... directly. Normalize both History API entry
 // points so every view keeps the real lobby path, including /preview installs.
 for(const name of ['pushState','replaceState']){const original=history[name].bind(history);history[name]=(...args)=>{if(args.length>2&&args[2]!=null){const url=route(args[2]);if(url.origin===location.origin)args[2]=url.pathname+url.search+url.hash;}const result=original(...args);syncParent();return result;};}
 document.addEventListener('click',e=>{const path=e.composedPath(),button=path.find(n=>n?.matches?.('[data-fullscreen],#trial-fullscreen'));if(!button)return;e.preventDefault();e.stopImmediatePropagation();toggle().catch(()=>window.dispatchEvent(new CustomEvent('product-notice',{detail:'当前浏览器无法切换全屏'})));},true);
 // Rebuild a document restored from the back/forward cache after its real
 // pagehide handlers disposed game resources. Saved seats recover the room.
 addEventListener('pageshow',event=>{if(event.persisted)location.reload();});
 function revealFrame(source){if(frame&&source===frame.contentWindow)frame.style.visibility='visible';}
 return{go,toggle,active,hasFrame:()=>!!frame,sync,revealFrame};
})();
