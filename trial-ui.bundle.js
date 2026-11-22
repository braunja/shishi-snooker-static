(() => {

  const modules = {
0: [function(require, module, exports) {
const {drawReplayFooter}=require('./replay-footer.cjs');
const {createPracticeReplayUI}=require('./practice-replay-ui.cjs');
const trialTuning=require('./tuning.cjs');
const {powerGeometry}=require('./power-geometry.cjs');
const {anchorShotControls}=require('./side-anchors.cjs');
const {drawPracticeHud,drawPracticeViews,DIFFICULTIES}=require('./practice-hud.cjs');
const {roundRect}=require('../src/render/canvasPrimitives');
const {drawTipMagnifier,tipMagnifierRect,tipMagnifierCenterLeftOfSource}=require('../src/render/hud/shotControlsHudRenderer');
const {drawRuleToast}=require('./notifications.cjs');
const {createRuleResultMessages}=require('../src/core/match/intermission');
const Practice=require('../src/game-client/practiceMode');
const {createRuleToastQueue}=require('../src/game-client/ruleToastQueue');
const {createLayoutRuntime}=require('./layout-runtime.cjs');
const {mapFooterRect,anchorFooterBottom,distributeFooterRows,keys:footerKeys}=require('./footer-layout.cjs');
const practiceDefaults={
 practiceBreakScoreboard:{x:280,y:976,width:480,height:68,opacity:1},
 practiceDifficultySelector:{x:784,y:976,width:134,height:68,opacity:1},
 practiceShapeSelector:{x:934,y:976,width:240,height:68,opacity:1},
 practiceFreePlacementToggle:{x:1198,y:976,width:210,height:68,opacity:1},
 practiceViewButtons:{x:1018,y:976,width:460,height:68,opacity:1},
 practiceResetButton:{x:1440,y:976,width:200,height:68,opacity:1}
};
async function initialize({core,setView,getView,getTipHeldAt=()=>null,prepareAudio=async()=>true,requestFrame=()=>{},celebration=null}){
 const runtime=await (window.ThreeTrialPageLayoutReady || createLayoutRuntime());
 let layout,scale=1,offsetX=0,offsetY=0,menuOpen=false,difficultyOpen=false,difficultyId=window.SnookerOnline?.difficulty()||trialTuning.readDifficulty(),message='';
 const toastDuration=window.SnookerProduct?3000:5000,toastFadeAt=toastDuration-520;
 const notices=createRuleToastQueue({now:()=>performance.now(),slotMs:toastDuration});
 const canvas=document.createElement('canvas');canvas.id='trial-hud';canvas.setAttribute('aria-label','单杆得分练习');document.querySelector('#viewer').append(canvas);
 const controls=document.createElement('div');controls.id='trial-practice-controls';controls.style.paddingBottom='env(safe-area-inset-bottom, 0px)';document.querySelector('#viewer').append(controls);
 controls.style.paddingLeft='env(safe-area-inset-left, 0px)';controls.style.paddingRight='env(safe-area-inset-right, 0px)';controls.style.paddingTop='env(safe-area-inset-top, 0px)';
 const buttons=new Map();
 const replayUI=window.SnookerOnline?null:createPracticeReplayUI({core,setView,getView,notice,prepareAudio});
 window.addEventListener('pagehide',event=>{if(!event.persisted)replayUI?.dispose();});
 let replayFooterTop=null;
 let footerDrawing=false,footerTransform={scale:1,x:0,y:0};
 let layoutDirty=true,layoutCache=null,layoutVersion=0,lastDrawKey='',lastBaseKey='',lastOverlayRects=[],safeInsets={};
 const invalidate=()=>{replayFooterTop=null;layoutDirty=true;lastDrawKey='';requestFrame();};
 window.addEventListener('resize',invalidate);window.visualViewport?.addEventListener('resize',invalidate);
 document.fonts?.ready.then(invalidate);
 window.addEventListener('pagehide',event=>{if(event.persisted)return;window.removeEventListener('resize',invalidate);window.visualViewport?.removeEventListener('resize',invalidate);});
 function writeStyle(el,values){for(const [key,value]of Object.entries(values))if(el.style[key]!==value)el.style[key]=value;}
 function attribute(el,key,value){value=String(value);if(el.getAttribute(key)!==value)el.setAttribute(key,value);}
 let usedButtons=new Set();
 function footerFit(){return {scale:1,x:0,y:0};} // Each profile owns its row positions, in preview and play.
 function notice(text){message=text;requestFrame(false);return notices.push(text);}
 function page(fit=true){
  const raw=runtime.page();
  if(!layoutDirty&&layoutCache?.raw===raw&&layoutCache.width===innerWidth&&layoutCache.height===innerHeight)return fit?layoutCache.fitted:layoutCache.rawLayout;
  const style=getComputedStyle(controls);safeInsets={bottom:parseFloat(style.paddingBottom)||0,top:parseFloat(style.paddingTop)||0,left:parseFloat(style.paddingLeft)||0,right:parseFloat(style.paddingRight)||0};
  const result={...raw,...Object.fromEntries(Object.entries(practiceDefaults).map(([k,v])=>[k,raw[k]||{...v,hidden:true}]))};
  const design=runtime.profile(),s=Math.min(innerWidth/design.width,innerHeight/design.height),oy=(innerHeight-design.height*s)/2;
  const safe=safeInsets.bottom;
  const safeTop=safeInsets.top;
  const anchored=Object.fromEntries(Object.entries(result).map(([key,r])=>[key,r.anchor==='bottom'?{...r,y:(innerHeight-oy-safe)/s-r.height-(r.bottomInset??16)}:r.anchor==='top'?{...r,y:(safeTop-oy)/s+(r.topInset??12)}:r]));
  const footerAnchored=anchorFooterBottom(anchored,{height:innerHeight,scale:s,offsetY:oy,safeBottom:safe});
  const footerRows=runtime.sourceProfile().orientation==='portrait'?distributeFooterRows(footerAnchored,{width:innerWidth,scale:s,offsetX:(innerWidth-design.width*s)/2,safeLeft:safeInsets.left,safeRight:safeInsets.right}):footerAnchored;
  const anchoredSides=anchorShotControls(footerRows,{device:runtime.device,width:innerWidth,height:innerHeight,safeLeft:safeInsets.left,safeRight:safeInsets.right,designWidth:design.width,designHeight:design.height});
  if(window.SnookerOnline&&!window.SnookerOnline.isLocalPractice?.()){
   const bounds=window.SnookerOnline.scoreboardBounds();
   const limit=(bounds.y-oy-12)/s;
   const tip=anchoredSides.tipPad,power=anchoredSides.powerPull;
   const shift=Math.max(0,Math.max(tip?tip.y+tip.height:0,power?powerGeometry(power,runtime.device==='mobile').rect.y+powerGeometry(power,runtime.device==='mobile').rect.height:0)-limit);
   for(const key of ['tipPad','powerPull'])if(anchoredSides[key])anchoredSides[key]={...anchoredSides[key],y:anchoredSides[key].y-shift};
   const bar=anchoredSides.effectivePowerBar;
   if(bar)anchoredSides.effectivePowerBar={...bar,y:Math.min(bar.y,limit-bar.height)};
  }
  if(anchoredSides.effectivePowerBar)anchoredSides.effectivePowerBar={...anchoredSides.effectivePowerBar,x:(design.width-anchoredSides.effectivePowerBar.width)/2};
  const t=footerFit(anchoredSides),fitted=Object.fromEntries(Object.entries(anchoredSides).map(([k,r])=>[k,footerKeys.includes(k)?mapFooterRect(r,t):r]));
  layoutCache={raw,width:innerWidth,height:innerHeight,rawLayout:anchoredSides,fitted};layoutDirty=false;layoutVersion++;
  return fit?fitted:anchoredSides;
 }
 function place(el,r){writeStyle(el,{left:`${offsetX+r.x*scale}px`,top:`${offsetY+r.y*scale}px`,width:`${r.width*scale}px`,height:`${r.height*scale}px`,opacity:String(r.opacity??1),visibility:r.hidden?'hidden':'visible'});}
 function control(id,label,r,action,disabled=false){
  let b=buttons.get(id);if(!b){b=document.createElement('button');b.dataset.action=id;b.onclick=()=>{action();requestFrame();};controls.append(b);buttons.set(id,b);}
  usedButtons.add(id);attribute(b,'data-popup',Boolean(r.popup));attribute(b,'aria-label',label);if(b.title!==label)b.title=label;if(b.disabled!==disabled)b.disabled=disabled;if(b.hidden)b.hidden=false;place(b,footerDrawing?mapFooterRect(r,footerTransform):r);return b;
 }
 let frameState={ui:false,wakeAt:Infinity};
 function update(now){
  replayUI?.update();
  layout=page(false);footerTransform=footerFit(layout);const design=runtime.profile();scale=Math.min(innerWidth/design.width,innerHeight/design.height);offsetX=(innerWidth-design.width*scale)/2;offsetY=(innerHeight-design.height*scale)/2;
  const footerHeight=(Math.max(...footerKeys.map(key=>layout[key]).filter(r=>r&&!r.hidden).map(r=>r.height),0)||68)*footerTransform.scale*scale;
  const fullscreen=document.getElementById('trial-fullscreen');
  if(fullscreen && fullscreen.style.height!==`${footerHeight}px`){fullscreen.style.height=`${footerHeight}px`;fullscreen.style.width=`${footerHeight}px`;document.documentElement.style.setProperty("--trial-fullscreen-size",`${footerHeight}px`);}
  if(fullscreen){const style=layout.practiceViewButtons;const alpha=String(style?.backgroundOpacity??.42);if(fullscreen.style.getPropertyValue('--fullscreen-background-alpha')!==alpha)fullscreen.style.setProperty('--fullscreen-background-alpha',alpha);writeStyle(fullscreen,{opacity:String(style?.opacity??1)});}
  const currentToast=notices.next(now);

 const state=core.getState(),heldAt=getTipHeldAt(),tipValue=core.getTip();
 const magnifier=window.SnookerOnline?.preferences().tipMagnifierEnabled!==false&&heldAt!==null&&now-heldAt>=200&&core.canAdjustTip()&&!layout.tipPad?.hidden;
 const toastAge=currentToast?now-currentToast.startedAt:0;
 const animatingToast=!!currentToast&&(toastAge<280||(!notices.hasQueued()&&toastAge>toastFadeAt));
 frameState={ui:animatingToast,wakeAt:Math.min(
   currentToast?currentToast.startedAt+(toastAge<toastFadeAt&&!notices.hasQueued()?toastFadeAt:toastDuration):Infinity,
   heldAt!==null&&now<heldAt+200?heldAt+200:Infinity)};
 const baseKey=JSON.stringify([layoutVersion,innerWidth,innerHeight,Math.min(devicePixelRatio||1,2),menuOpen,difficultyOpen,difficultyId,
  core.isPractice(),state.practiceStreak,state.players[0].break,state.ruleState?.currentBreakPots,core.getPracticeShape(),core.isFreePlacement(),core.canRetry(),core.isBusy(),core.canOperate(),getView(),
  core.replayStatus()]);
 const drawKey=JSON.stringify([baseKey,magnifier,magnifier?tipValue.x:null,magnifier?tipValue.y:null,currentToast?.id,currentToast?.text]);
 if(drawKey===lastDrawKey&&!animatingToast)return;
 lastDrawKey=drawKey;
  const power=layout.powerPull||{x:0,y:42,width:110,height:356,hidden:true},tip=layout.tipPad||{x:0,y:0,width:175,height:175,hidden:true};
  place(document.querySelector('#power-track'),powerGeometry(power,runtime.device==='mobile').rect);place(document.querySelector('#tip-pad'),tip);
  const dpr=Math.min(devicePixelRatio||1,2),w=Math.round(innerWidth*dpr),h=Math.round(innerHeight*dpr);
  if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
  let magnifierCenter=null;
  const overlayRects=[];
  if(magnifier){
   magnifierCenter=tipMagnifierCenterLeftOfSource(tip,2,100);
   if(runtime.device==='mobile')magnifierCenter.x=2*(tip.x+tip.width/2)-magnifierCenter.x;
   const radius=Math.min(tip.width,tip.height);
   magnifierCenter.y=Math.max(-offsetY/scale+radius+12,Math.min((innerHeight-offsetY)/scale-radius-12,magnifierCenter.y));
   overlayRects.push(tipMagnifierRect(tip,null,null,2,magnifierCenter));
  }
  if((currentToast||runtime.preview)&&layout.toast&&!layout.toast.hidden){const r=layout.toast;overlayRects.push({...r,y:r.y-20,height:r.height+20});}
  const fullPaint=baseKey!==lastBaseKey;
  // Clipping limits rasterization, but still records every canvas command.
  // Only restore the footer when an old/new overlay actually touches it.
  // Open menus extend beyond their buttons, so retain their complete repaint.
  const dirtyRects=lastOverlayRects.concat(overlayRects);
  const shouldPaintFooter=source=>{
   if(fullPaint||menuOpen||difficultyOpen)return true;
   if(!source||source.hidden)return false;
   const r=mapFooterRect(source,footerTransform),pad=Math.max(8,(source.fontSize||26.4)*2*footerTransform.scale);
   return dirtyRects.some(d=>d.x-8<r.x+r.width+pad&&d.x+d.width+8>r.x-pad&&d.y-8<r.y+r.height+pad&&d.y+d.height+8>r.y-pad);
  };
  const paintPracticeFooter=footerKeys.some(key=>shouldPaintFooter(layout[key]));
  lastBaseKey=baseKey;
  const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.save();
  if(!fullPaint){
   // One backing canvas: restore only the old/new transient regions, including anything beneath.
   ctx.beginPath();
   for(const r of [...lastOverlayRects,...overlayRects])ctx.rect(offsetX+(r.x-8)*scale,offsetY+(r.y-8)*scale,(r.width+16)*scale,(r.height+16)*scale);
   ctx.clip();
  }
  const previousOverlayRects=lastOverlayRects;lastOverlayRects=overlayRects;
  if(fullPaint)ctx.clearRect(0,0,innerWidth,innerHeight);
  else for(const r of overlayRects.concat(previousOverlayRects))ctx.clearRect(offsetX+(r.x-8)*scale,offsetY+(r.y-8)*scale,(r.width+16)*scale,(r.height+16)*scale);
  ctx.translate(offsetX,offsetY);ctx.scale(scale,scale);
  ctx.save();ctx.translate(footerTransform.x,footerTransform.y);ctx.scale(footerTransform.scale,footerTransform.scale);footerDrawing=true;
  if (paintPracticeFooter && (!window.SnookerOnline || window.SnookerOnline.isLocalPractice?.()) && !replayUI?.watching) {
  const ui=drawPracticeHud(ctx,{core,layout,menuOpen,difficultyOpen,difficultyId,preview:runtime.preview,shouldPaint:shouldPaintFooter});

  if(fullPaint){
  usedButtons.clear();
  control('practice-shape-selector','球型选择：'+Practice.practiceShapeLabel(core.getPracticeShape()),ui.practiceShapeSelector,()=>{menuOpen=!menuOpen;difficultyOpen=false;});
  const difficultyButton=control('practice-difficulty-selector','难度选择：'+DIFFICULTIES.find(d=>d.id===difficultyId).label,ui.practiceDifficultySelector,()=>{if(core.canChangePracticeDifficulty?.()===false){difficultyOpen=false;notice('仅开局时可切换难度');return;}difficultyOpen=!difficultyOpen;menuOpen=false;});
  attribute(difficultyButton,'aria-expanded',difficultyOpen);attribute(difficultyButton,'aria-haspopup','listbox');
  attribute(buttons.get('practice-shape-selector'),'aria-expanded',menuOpen);attribute(buttons.get('practice-shape-selector'),'aria-haspopup','listbox');
  // Apply only the approved release snapshot and remember this browser’s selection.
  for(const r of ui.practiceDifficultyOptions)control(r.id,DIFFICULTIES.find(d=>d.id===r.value).label,{...r,hidden:layout.practiceDifficultySelector.hidden},()=>{if(core.canChangePracticeDifficulty?.()===false){difficultyOpen=false;notice('仅开局时可切换难度');return;}if((!window.SnookerOnline||window.SnookerOnline.isLocalPractice?.())&&core.updateTuning({aim:trialTuning.aimValues(r.value)})){difficultyId=r.value;trialTuning.rememberDifficulty(difficultyId);difficultyOpen=false;}});
  const toggle=control('practice-free-placement-toggle','自由摆球',ui.practiceFreePlacementToggle,()=>{if((!window.SnookerOnline||window.SnookerOnline.isLocalPractice?.())&&core.setFreePlacement(!core.isFreePlacement())){menuOpen=false;notice(core.isFreePlacement()?'自由摆球已开启，按住球即可拖动':'自由摆球已关闭');}});toggle.setAttribute('aria-pressed',String(core.isFreePlacement()));toggle.setAttribute('aria-disabled','false');
  control('practice-reset','复位重打',ui.practiceResetButton,()=>{if(window.SnookerOnline&&!window.SnookerOnline.isLocalPractice?.())return;if(core.canRetry())core.retry();else {if(core.loadPracticeShape(core.getPracticeShape()))window.SnookerPracticeAnalytics?.track('challenge_started',{shapeId:core.getPracticeShape(),shapeName:Practice.practiceShapeLabel(core.getPracticeShape())});}menuOpen=false;difficultyOpen=false;window.SnookerOnline?.practiceChanged?.();});
  const group=layout.practiceViewButtons;
  for(const r of drawPracticeViews(ctx,group,getView())){
   const button=control(r.id,r.label,r,()=>{menuOpen=false;setView(r.mode);});button.setAttribute('aria-pressed',String(getView()===r.mode));
  }
  for(const r of ui.practiceShapeOptions)control(r.id,Practice.practiceShapeLabel(r.shapeId),{...r,hidden:layout.practiceShapeSelector.hidden},()=>{if(window.SnookerOnline&&!window.SnookerOnline.isLocalPractice?.())return;if(core.loadPracticeShape(r.shapeId)){window.SnookerPracticeAnalytics?.track('challenge_started',{shapeId:r.shapeId,shapeName:Practice.practiceShapeLabel(r.shapeId)});menuOpen=false;window.SnookerOnline?.practiceChanged?.();notice('已切换：'+Practice.practiceShapeLabel(r.shapeId));}});
  for(const [id,b]of buttons)if(!usedButtons.has(id)&&!b.hidden)b.hidden=true;
  } else drawPracticeViews(ctx,layout.practiceViewButtons,getView(),shouldPaintFooter);
  }
  if(window.SnookerOnline&&!window.SnookerOnline.isLocalPractice?.())for(const b of buttons.values())b.hidden=true;
  if(replayUI?.watching){
   usedButtons.clear();
   const r=drawReplayFooter(ctx,{core,layout,selected:getView(),portrait:runtime.device==='mobile'&&innerHeight>innerWidth,left:Math.min(layout.practiceBreakScoreboard.x,layout.practiceViewButtons.x),right:(innerWidth-offsetX-safeInsets.right-12)/scale,bottom:(innerHeight-offsetY-safeInsets.bottom-12)/scale});
   replayFooterTop={top:offsetY+r.top*scale,width:innerWidth,height:innerHeight};
   for(const view of r.views){const el=control(view.id,view.label,view,()=>setView(view.mode));attribute(el,'aria-pressed',getView()===view.mode);}
   for(const action of r.actions)control(action.id,action.label,action,()=>replayUI.action(action.action),action.disabled);
   for(const [id,rect]of [['replay-score',r.score],['replay-difficulty',r.difficulty],['replay-shape',r.shape]]){
    let el=buttons.get(id);if(!el){el=document.createElement('span');el.className='replay-label';el.dataset.action=id;controls.append(el);buttons.set(id,el);}
    usedButtons.add(id);el.hidden=false;el.textContent=rect.label||(core.getState().practiceStreak?`连进 ${core.getState().practiceStreak.current}`:`单杆 ${core.getState().players[0].break}`);place(el,rect);
   }
   for(const [id,b]of buttons)if(!usedButtons.has(id))b.hidden=true;
  }
  footerDrawing=false;ctx.restore();
  if(magnifierCenter)drawTipMagnifier(ctx,tip,tipValue,{scale:2,dotScale:2,center:magnifierCenter});
  const toast=currentToast||(runtime.preview?{text:'示例：犯规，罚 4 分',startedAt:now,fixed:true}:null);
  if(toast&&layout.toast&&!layout.toast.hidden){
    const age=now-toast.startedAt,ease=p=>1-Math.pow(1-p,3);let opacity=1,yOffset=0;
    if(!toast.fixed&&age<280){opacity=ease(age/280);yOffset=-(1-opacity)*20;}
    else if(!toast.fixed&&!notices.hasQueued()&&age>toastFadeAt){const p=ease((age-toastFadeAt)/520);opacity=1-p;yOffset=-p*18;}
    const toastRect=layout.toast;
    drawRuleToast(ctx,{sizeScale:runtime.device==='mobile'?2:1,rect:toastRect,text:toast.text,maximumWidth:Math.min(design.width-48,layout.toast.width),opacity:(layout.toast.opacity??1)*Math.max(0,opacity),yOffset});
  }
  ctx.restore();
  const live=document.querySelector('#trial-live-score'),text=core.getState().practiceStreak?`当前连进 ${core.getState().practiceStreak.current} 个；最高连进 ${core.getState().practiceStreak.best} 个；${message}`:`单杆 ${core.getState().players[0].break} 分；${message}`;if(live.textContent!==text)live.textContent=text;
 }
 update(performance.now());
 window.SnookerTrialLayout={physicalDevice:runtime.physicalDevice,device:runtime.device,preview:runtime.preview,profile:runtime.profile,getLayoutEditorElements:()=>page()};runtime.ready();
 return {update,notice,getView,setView,setDifficulty(value){if(core.canChangePracticeDifficulty?.()===false)return false;if(!DIFFICULTIES.some(d=>d.id===value))return false;if(!core.updateTuning({aim:trialTuning.aimValues(value)}))return false;difficultyId=value;menuOpen=difficultyOpen=false;return true;},frameActivity:()=>frameState,difficulty:()=>core.replayStatus()?.difficulty||difficultyId,isReplay:()=>Boolean(replayUI?.watching),prepareReplay:()=>replayUI?.prepare(),startReplay:()=>replayUI?.start(),scale:()=>scale,
  effectivePowerBarLayout(){const r=page().effectivePowerBar;if(!r)return null;const d=runtime.profile(),s=Math.min(innerWidth/d.width,innerHeight/d.height);return {...r,x:(innerWidth-d.width*s)/2+r.x*s,y:(innerHeight-d.height*s)/2+r.y*s,width:r.width*s,height:r.height*s,preview:runtime.preview};},
  powerVisualScale:()=>layout.powerPull?.visualScale||1,
  powerContainerWidth:()=>powerGeometry(layout.powerPull||{height:356,width:110,x:0,y:42},runtime.device==='mobile').containerWidth,
  referenceViewRect:()=>{
    const d=runtime.sourceProfile(),s=Math.min(innerWidth/d.width,innerHeight/d.height),x=(innerWidth-d.width*s)/2,y=(innerHeight-d.height*s)/2;
    const items=footerKeys.map(k=>d.pages.game[k]).filter(r=>r&&!r.hidden);
    const bottom=items.length?Math.min(...items.map(r=>r.anchor==='bottom'?d.height-r.height-(r.bottomInset??16):r.y))-16:d.height-100;
    return {left:x+20*s,top:y+20*s,right:x+(d.width-20)*s,bottom:Math.min(y+bottom*s,replayUI?.watching?(replayFooterTop?.width===innerWidth&&replayFooterTop?.height===innerHeight?replayFooterTop.top:innerHeight)-16:Infinity)};
  },
  viewRect(){const r=this.referenceViewRect();const d=runtime.sourceProfile(),s=Math.min(innerWidth/d.width,innerHeight/d.height),y=(innerHeight-d.height*s)/2;return {...r,bottom:Math.min(r.bottom,y+d.height*880/1080*s)};},
  centerCamera(camera){const r=this.viewRect();const y=innerHeight/2-(r.top+r.bottom)/2,v=camera.view;if(!v?.enabled||v.fullWidth!==innerWidth||v.fullHeight!==innerHeight||v.offsetX!==0||v.offsetY!==y)camera.setViewOffset(innerWidth,innerHeight,0,y,innerWidth,innerHeight);},
  event(event){if(event.type==='shot-start')difficultyOpen=false;if(event.type==='shot' && core.isPractice() && !core.isReplay()){const shapeId=core.getPracticeShape();window.SnookerPracticeAnalytics?.track('shot_played',{shapeId,shapeName:Practice.PRACTICE_SHAPES.find(s=>s.id===shapeId)?.label||shapeId});}replayUI?.event(event);if(event.type==='replay-enter'||event.type==='replay-exit'){celebration?.clear();notices.clear();message='';}if(replayUI?.watching){if(event.type==='replay-seek'&&event.freePlacement)notice('自由摆球：展示调整前后的位置');return;}if(event.type==='reset'){menuOpen=false;difficultyOpen=false;message='';celebration?.clear();notices.clear();}
   if(event.type==='settled'){if(core.isPractice()&&core.getState().frameOver){const group=Practice.PRACTICE_SHAPES.find(s=>s.id===core.getPracticeShape())?.group;if(group==='实战球型'||group==='围球练习'){celebration?.play();requestFrame();}}else if(!core.getState().practiceStreak)for(const text of createRuleResultMessages(core.getState(),event.result.ruleResult))notice(text);}
  }
 };
}
window.SnookerTrialUI={initialize};
window.SnookerTrialTuning=require('./tuning.cjs');

}, {"./replay-footer.cjs":1,"./practice-replay-ui.cjs":25,"./tuning.cjs":28,"./power-geometry.cjs":30,"./side-anchors.cjs":31,"./practice-hud.cjs":2,"../src/render/canvasPrimitives":21,"../src/render/hud/shotControlsHudRenderer":35,"./notifications.cjs":37,"../src/core/match/intermission":38,"../src/game-client/practiceMode":3,"../src/game-client/ruleToastQueue":45,"./layout-runtime.cjs":46,"./footer-layout.cjs":49}, "apps/three-game/trial/ui.cjs"],
1: [function(require, module, exports) {
const {drawPracticeScore,drawPracticeViews,drawPracticeLabel,DIFFICULTIES}=require('./practice-hud.cjs');
const Practice=require('../src/game-client/practiceMode');
function drawReplayFooter(ctx,{core,layout,selected,left,right,bottom,portrait=false}){
 const status=core.replayStatus();
 const base=layout.practiceBreakScoreboard,style=layout.practiceViewButtons,h=base.height,gap=portrait?8:16;
 const difficulty=DIFFICULTIES.find(d=>d.id===status?.difficulty)?.label||'回放';
 const shape=Practice.practiceShapeLabel(core.getPracticeShape());
 function width(label,rect){ctx.font=`700 ${rect.fontSize||26.4}px system-ui, sans-serif`;return Math.ceil(ctx.measureText(label).width)+36;}
 const dw=width(difficulty,layout.practiceDifficultySelector),sw=width(shape,layout.practiceShapeSelector);
 // Landscape: content flows from the left; Share/Exit stay at the right.
 // Portrait: Share belongs to the metadata row, Exit to the playback row.
 const available=right-left,pw=3*h+2*gap;
 const cellWidth=Math.min(style.width/4,portrait?(available-pw-2*gap)/5:(available-base.width-dw-sw-pw-6*gap)/6);
 const vw=4*cellWidth,y=bottom-h;
 const scoreWidth=portrait?Math.min(base.width,available-dw-sw-cellWidth-3*gap):base.width;
 const score={...base,x:left,y:portrait?y-h-gap:y,width:scoreWidth,hidden:false};
 const difficultyRect={...layout.practiceDifficultySelector,x:left+scoreWidth+gap,y:score.y,width:dw,height:h,hidden:false};
 const shapeRect={...layout.practiceShapeSelector,x:difficultyRect.x+dw+gap,y:score.y,width:sw,height:h,hidden:false};
 const group={...style,x:portrait?left:shapeRect.x+sw+gap,y,width:vw,height:h,hidden:false};
 const playerY=y,playerX=group.x+vw+gap;
 drawPracticeScore(ctx,score,core.getState());drawPracticeLabel(ctx,difficultyRect,difficulty);drawPracticeLabel(ctx,shapeRect,shape);
 const views=drawPracticeViews(ctx,group,selected);
 const share={...style,id:'replay-share',action:'share',label:'分享回放',x:portrait?shapeRect.x+sw+gap:right-2*cellWidth-gap,y:portrait?score.y:y,width:cellWidth,height:h,hidden:false};
 drawPracticeLabel(ctx,share,'分享');
 const actions=[['previous','上一杆',!status||status.index===0],['pause',status?.ended&&globalThis.SnookerProduct?'重播':status?.paused?'继续':'暂停',!status||(status.ended&&!globalThis.SnookerProduct)],['next','下一杆',!status||status.index===status.total-1]].map(([id,label,disabled],i)=>{
  const rect={...style,x:playerX+i*(h+gap),y:playerY,width:h,height:h,hidden:false,opacity:disabled?.35:style.opacity};
  drawPracticeLabel(ctx,rect,'');ctx.save();ctx.translate(rect.x+h/2,rect.y+h/2);ctx.scale(h/68,h/68);ctx.strokeStyle=ctx.fillStyle='#f3ead6';ctx.globalAlpha=disabled?.35:1;ctx.lineWidth=3;ctx.lineJoin='round';
  if(globalThis.SnookerProduct?.drawReplayIcon?.(ctx,{id,status})){}
  else if(id==='pause'&&!status?.paused){ctx.fillRect(-10,-13,6,26);ctx.fillRect(4,-13,6,26);}
  else{const dir=id==='previous'?-1:1;ctx.scale(dir,1);ctx.beginPath();ctx.moveTo(-8,-12);ctx.lineTo(10,0);ctx.lineTo(-8,12);ctx.closePath();ctx.stroke();if(id!=='pause'){ctx.beginPath();ctx.moveTo(14,-13);ctx.lineTo(14,13);ctx.stroke();}}
  ctx.restore();return {id:'replay-'+id,action:id,label,disabled,...rect};
 });
 const exit={...style,id:'replay-exit',action:'exit',label:'退出',x:right-cellWidth,y:playerY,width:cellWidth,height:h,hidden:false,fill:'#e2bf78',textColor:'#13241a'};
 drawPracticeLabel(ctx,exit,'退出');
 return {score,difficulty:{...difficultyRect,label:difficulty},shape:{...shapeRect,label:shape},views,actions:[...actions,share,exit],top:score.y};
}
module.exports={drawReplayFooter};

}, {"./practice-hud.cjs":2,"../src/game-client/practiceMode":3}, "apps/three-game/trial/replay-footer.cjs"],
2: [function(require, module, exports) {
// One-time copy of the 2D practice HUD; independently adapted to the 3D layout.
// Product chrome uses the approved neutral translucent controls; trial defaults stay unchanged.
const isProduct=()=>typeof window!=='undefined'&&Boolean(window.SnookerProduct);
const theme=(legacy,key)=>isProduct()?({fill:'rgba(0,0,0,0.333333)',edge:'rgba(255,255,255,0.219608)',divider:'rgba(255,255,255,0.14902)',text:'#ffffff',active:'rgba(56,91,64,0.466667)',menu:'rgba(21,32,43,0.960784)'})[key]:legacy;
const Practice=require('../src/game-client/practiceMode');
const {BALL_COLORS}=require('../src/core/model/ballSpec');
const CanvasPrimitives=require('../src/render/canvasPrimitives');
const {drawInteractionOverlay,drawToggle,createButton,drawButton}=require('../src/render/hud/canvasControlsRenderer');
const BreakScoreboardRenderer=require('../src/render/hud/breakScoreboardRenderer');
function drawSideActionButtons(ctx, options = {}) {
  const {
    actions = [],
    buttonMetrics = {},
    fill = 'rgba(30, 61, 42, 0.82)',
    hoveredButtonId = null,
    pressedButtonId = null,
    sideRect,
    stroke = 'rgba(99, 250, 103, 0.9)',
    text = '#82ff76',
    yOffset = 0,
  } = options;
  if (!sideRect || !actions.length) return [];
  const startX = sideRect.x + (sideRect.width - buttonMetrics.width) * 0.5;
  const buttons = [];
  ctx.save();
  actions.forEach((action, index) => {
    const button = createButton(
      action.value || action.id,
      action.label,
      startX,
      sideRect.y + yOffset + index * (buttonMetrics.height + buttonMetrics.gap),
      buttonMetrics.width,
      buttonMetrics.height,
    );
    // Keep action metadata on the hit target. Readiness uses this to
    // distinguish “准备” from “取消准备” without adding a second button id.
    Object.assign(button, action);
    buttons.push(button);
    drawButton(ctx, button, {
      font: `700 ${sideRect.fontSize||26.4}px system-ui, sans-serif`,
      fill: action.fill || fill,
      hovered: hoveredButtonId === button.id,
      pressed: pressedButtonId === button.id,
      stroke: action.stroke || stroke,
      text: action.text || text,
    });
  });
  ctx.restore();
  return buttons;
}


const GameOverlayRenderer={drawSideActionButtons};
  function drawPracticeHud(ctx, options) {
    const {core,layout,menuOpen,difficultyOpen=false,difficultyId='novice',preview=false}=options;
    const shouldPaint=options.shouldPaint||(()=>true);
    const state=core.getState, practiceShapes=Practice.PRACTICE_SHAPES,practiceShapeId=core.getPracticeShape,practiceFreePlacementEnabled=core.isFreePlacement,practiceUndoAvailable=core.canRetry,practiceShapeMenuOpen=()=>menuOpen;
    const gameInteraction=()=>({}),ui={};
    const setVisibleLayoutEditorElement=()=>{};
    const scoreRect={x:50,y:960,width:1680,height:100};
    const gameState = state();

    const gap = Math.max(16, Math.min(24, scoreRect.width * 0.025));
    const placementWidth = Math.max(180, Math.min(210, scoreRect.width * 0.22));
    const selectorWidth = Math.max(250, Math.min(390, scoreRect.width * 0.34));
    const breakWidth = Math.max(
      280,
      Math.min(480, scoreRect.width - selectorWidth - placementWidth - gap * 2),
    );
    const itemHeight = Math.max(58, Math.min(68, scoreRect.height * 0.92));
    const groupWidth = breakWidth + gap + selectorWidth + gap + placementWidth;
    const startX = scoreRect.x + (scoreRect.width - groupWidth) * 0.5;
    const y = scoreRect.y + (scoreRect.height - itemHeight) * 0.5;
    const breakRect = layout.practiceBreakScoreboard;
    const selectorRect = {...layout.practiceShapeSelector,id:'practice-shape-selector'};
    const placementRect = {...layout.practiceFreePlacementToggle,id:'practice-free-placement-toggle'};
    const sideRect=layout.practiceResetButton;
    const createSideActionButtonMetrics=()=>({width:sideRect.width,height:sideRect.height,gap:0});
    const getGameHoveredButtonId=()=>null,getGamePressedButtonId=()=>null;

    ctx.save();
    if(shouldPaint(breakRect))drawPracticeScore(ctx,breakRect,gameState);

    const shapes=shouldPaint(selectorRect)?drawPullup(ctx,selectorRect,practiceShapes,practiceShapeId(),menuOpen,'practice-shape'):[];
    ui.practiceShapeSelector=selectorRect;
    ui.practiceShapeOptions=shapes.map(r=>({...r,shapeId:r.value}));
    const difficultyRect={...layout.practiceDifficultySelector,id:'practice-difficulty-selector'};
    ui.practiceDifficultySelector=difficultyRect;
    ui.practiceDifficultyOptions=shouldPaint(difficultyRect)?drawPullup(ctx,difficultyRect,DIFFICULTIES,difficultyId,difficultyOpen,'practice-difficulty'):[];

    if(shouldPaint(placementRect)){
    ctx.globalAlpha=placementRect.hidden?0:(placementRect.opacity??1);
    ctx.fillStyle = theme(`rgba(3,11,23,${placementRect.backgroundOpacity ?? .42})`,'fill');
    ctx.strokeStyle = theme('rgba(211, 154, 76, 0.72)','edge');
    ctx.lineWidth = 1.2;
    CanvasPrimitives.roundRect(ctx, placementRect, 12);
    ctx.fill();
    ctx.stroke();
    drawInteractionOverlay(ctx, placementRect, {
      ...gameInteraction(placementRect.id),
      radius: 12,
    });
    ctx.fillStyle = theme('#f3ead6','text');
    ctx.font = `700 ${placementRect.fontSize||26.4}px system-ui, sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('自由摆球', placementRect.x + 14, placementRect.y + placementRect.height * 0.5);
    drawToggle(ctx, {
      x: placementRect.x + placementRect.width - 66,
      y: placementRect.y + (placementRect.height - 24) * 0.5,
      width: 52,
      height: 24,
    }, practiceFreePlacementEnabled(), gameInteraction(placementRect.id));
    }
    ui.practiceFreePlacementToggle = placementRect;
    ctx.restore();

    ctx.save();ctx.globalAlpha=sideRect.hidden?0:(sideRect.opacity??1);
    const resetButtons = shouldPaint(sideRect)?GameOverlayRenderer.drawSideActionButtons(ctx, {
      actions: [{ id: 'practice-reset', label: '复位重打' }],
      buttonMetrics: createSideActionButtonMetrics(sideRect),
      fill: theme(`rgba(30,61,42,${sideRect.backgroundOpacity??.42})`,'fill'),
      hoveredButtonId: getGameHoveredButtonId(),
      pressedButtonId: getGamePressedButtonId(),
      sideRect,
      stroke: theme('rgba(230, 196, 120, 0.9)','edge'),
      text: theme('#f3ead6','text'),
    }):[];
    ctx.restore();
    ui.practiceResetButton = resetButtons[0] || null;
    setVisibleLayoutEditorElement('practiceBreakScoreboard', breakRect);
    setVisibleLayoutEditorElement('practiceShapeSelector', selectorRect);
    setVisibleLayoutEditorElement('practiceFreePlacementToggle', placementRect);
    if (ui.practiceResetButton) setVisibleLayoutEditorElement('practiceResetButton', ui.practiceResetButton);
    return ui;
  }


function drawPracticeScore(ctx,breakRect,gameState){
 const itemHeight=68;
    ctx.save();
    ctx.globalAlpha=breakRect.hidden?0:(breakRect.opacity??1);
    ctx.fillStyle = theme(`rgba(3,11,23,${breakRect.backgroundOpacity ?? .42})`,'fill');
    ctx.strokeStyle = theme('rgba(211, 154, 76, 0.72)','edge');
    ctx.lineWidth = 1.2;
    CanvasPrimitives.roundRect(ctx, breakRect, 12);
    ctx.fill();
    ctx.stroke();
    if(gameState.practiceStreak){
      const {current,best}=gameState.practiceStreak;
      ctx.fillStyle=theme('#f3ead6','text');ctx.font=`700 ${breakRect.fontSize||26.4}px system-ui, sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText(`当前连进：${current}  ｜  最高连进：${best}`,breakRect.x+breakRect.width/2,breakRect.y+breakRect.height/2,breakRect.width-24);
      ctx.restore();return;
    }
    BreakScoreboardRenderer.drawBreakScoreboard(ctx, {
      x: breakRect.x + 22,
      y: breakRect.y,
      width: breakRect.width - 44,
      height: breakRect.height,
    }, {
      score: Number(gameState.players?.[0]?.break) || 0,
      counts: gameState.ruleState?.currentBreakPots || {},
    }, {
      ballColors: BALL_COLORS,
      chipRadius: Math.max(9, itemHeight * 0.22),
      forceVisible: true,
      inlineLeadWidth: Math.max(160, itemHeight * 3.05),
      label: '单杆',
      labelFont: `700 ${breakRect.fontSize||26.4}px system-ui, sans-serif`,
      labelGap: Math.max(78, itemHeight * 1.35),
      scoreColor: '#e1a514',
      scoreFont: `850 ${(breakRect.fontSize||26.4)*1.27}px system-ui, sans-serif`,
      showPottedCount: false,
      textColor: '#d9cfb9',
      variant: 'inline',
    });

 ctx.restore();
}

const DIFFICULTIES=[{id:'novice',label:'新手'},{id:'intermediate',label:'进阶'},{id:'professional',label:'职业'},{id:'master',label:'大师'}];
function drawPullup(ctx,rect,items,value,open,prefix){
  ctx.save();ctx.globalAlpha=rect.hidden?0:(rect.opacity??1);
  ctx.fillStyle=theme(`rgba(3,11,23,${rect.backgroundOpacity??.42})`,'fill');
  ctx.strokeStyle=open?theme('rgba(230,196,120,.96)','edge'):theme('rgba(211,154,76,.72)','edge');ctx.lineWidth=1.2;
  CanvasPrimitives.roundRect(ctx,rect,12);ctx.fill();ctx.stroke();
  ctx.textBaseline='middle';ctx.textAlign='left';ctx.fillStyle=theme('#f3ead6','text');ctx.font=`700 ${rect.fontSize||26.4}px system-ui, sans-serif`;
  ctx.fillText((items.find(i=>i.id===value)||items[0]).label,rect.x+18,rect.y+rect.height/2);
  ctx.strokeStyle=theme('#e6c478','text');ctx.lineWidth=2;ctx.beginPath();
  ctx.moveTo(rect.x+rect.width-30,rect.y+rect.height*.58);
  ctx.lineTo(rect.x+rect.width-21,rect.y+rect.height*.42);
  ctx.lineTo(rect.x+rect.width-12,rect.y+rect.height*.58);ctx.stroke();
  const options=[];
  if(open){
    const rows=[];let group=null;
    for(const item of items){
      if(item.group && item.group!==group){rows.push({heading:item.group,gap:group ? .32 : 0,units:group ? .96 : .64});group=item.group;}
      rows.push({...item,units:1});
    }
    const totalUnits=rows.reduce((sum,row)=>sum+row.units,0);
    const h=Math.min(rect.height,Math.max(24,(rect.y-24)/totalUnits));
    const menu={x:rect.x,y:rect.y-8-h*totalUnits,width:rect.width,height:h*totalUnits};
    ctx.fillStyle=theme('rgba(4,16,25,.9)','menu');CanvasPrimitives.roundRect(ctx,menu,12);ctx.fill();ctx.stroke();
    let rowY=menu.y;
    const optionFontSize=Math.min(rect.fontSize||26.4,h*.65);
    rows.forEach(item=>{
      const y=rowY;rowY+=item.units*h;
      if(item.heading){
        ctx.save();ctx.fillStyle='#b4b9b4';ctx.font=`400 ${optionFontSize*.68}px system-ui, sans-serif`;
        if(item.gap){ctx.strokeStyle=theme('rgba(211,154,76,.3)','divider');ctx.beginPath();ctx.moveTo(menu.x+16,y+h*.12);ctx.lineTo(menu.x+menu.width-16,y+h*.12);ctx.stroke();}
        ctx.fillText(item.heading,menu.x+16,y+h*(item.gap+.34));ctx.restore();return;
      }
      const r={id:prefix+'-'+item.id,popup:true,value:item.id,x:menu.x,y,width:menu.width,height:h};options.push(r);
      if(item.id===value){ctx.fillStyle='rgba(34,104,72,.96)';ctx.fillRect(r.x+2,r.y+1,r.width-4,r.height-2);}
      ctx.font=`700 ${optionFontSize}px system-ui, sans-serif`;
      ctx.fillStyle=theme('#f3ead6','text');ctx.fillText(item.label,r.x+(item.group?28:18),r.y+h/2);
      if(item.id===value){ctx.textAlign='right';ctx.fillStyle=theme('#e6c478','text');ctx.fillText('✓',r.x+r.width-12,r.y+h/2);ctx.textAlign='left';}
    });
  }
  ctx.restore();return options;
}
module.exports={drawPracticeHud,drawPracticeScore,drawPracticeViews,drawPracticeLabel,DIFFICULTIES};

function drawPracticeLabel(ctx,rect,label){
 ctx.save();ctx.globalAlpha=rect.opacity??1;ctx.fillStyle=rect.fill||theme(`rgba(3,11,23,${rect.backgroundOpacity??.42})`,'fill');ctx.strokeStyle=theme('rgba(211,154,76,.72)','edge');ctx.lineWidth=1.2;
 CanvasPrimitives.roundRect(ctx,rect,12);ctx.fill();ctx.stroke();ctx.fillStyle=rect.textColor||theme('#f3ead6','text');ctx.font=`700 ${rect.fontSize||26.4}px system-ui, sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(label,rect.x+rect.width/2,rect.y+rect.height/2);ctx.restore();
}
function drawPracticeViews(ctx,group,selected,shouldPaint=()=>true){
 const modes=[['aim','击球'],['camera','观察'],['broadcast','直播'],['god','上帝']];
 const targets=modes.map(([mode,label],index)=>{
  const r={...group,x:group.x+index*group.width/4,width:group.width/4,id:'view-'+mode,mode,label};
  if(!shouldPaint(r))return r;
  ctx.save();ctx.globalAlpha=r.hidden?0:(r.opacity??1);CanvasPrimitives.roundRect(ctx,group,12);ctx.clip();
  ctx.fillStyle=selected===mode?theme(`rgba(30,90,55,${Math.min(1,(group.backgroundOpacity??.42)+.16)})`,'active'):theme(`rgba(3,11,23,${group.backgroundOpacity??.42})`,'fill');ctx.fillRect(r.x,r.y,r.width,r.height);
  ctx.fillStyle=theme('#f3ead6','text');ctx.font=`700 ${group.fontSize||26.4}px system-ui, sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(label,r.x+r.width/2,r.y+r.height/2);
  if(index){ctx.strokeStyle=theme('rgba(211,154,76,.72)','edge');ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(r.x,r.y);ctx.lineTo(r.x,r.y+r.height);ctx.stroke();}ctx.restore();return r;
 });
 ctx.save();ctx.globalAlpha=group.hidden?0:(group.opacity??1);ctx.strokeStyle=theme('rgba(211,154,76,.72)','edge');ctx.lineWidth=1.2;CanvasPrimitives.roundRect(ctx,group,12);ctx.stroke();ctx.restore();return targets;
}

}, {"../src/game-client/practiceMode":3,"../src/core/model/ballSpec":5,"../src/render/canvasPrimitives":21,"../src/render/hud/canvasControlsRenderer":22,"../src/render/hud/breakScoreboardRenderer":23}, "apps/three-game/trial/practice-hud.cjs"],
3: [function(require, module, exports) {
const { BALL_KIND, COLOR_ORDER } = require('../config/constants');
const { BALL_RADIUS_MM } = require('../core/model/ballSpec');
const { colorSpot } = require('../core/model/spotModel');
const {
  BAULK_LINE_X_MM,
  BLACK_SPOT_X_MM,
  HALF_PLAY_AREA_MM,
  PINK_SPOT_X_MM,
} = require('../core/model/tableModel');
const { createBallState } = require('../core/state/ballState');
const { createOpeningRackState } = require('../core/state/openingRackState');

const PRACTICE_SHAPE = Object.freeze({
  FULL_FRAME: 'full-frame',
  HENDRY: 'hendry',
  T_SHAPE: 't-shape',
  DOUBLE_DRAGON: 'double-dragon',
  X_SHAPE: 'x-shape',
  Y_SHAPE: 'y-shape',
  SNAKE: 'snake',
  TEN_RED_SURROUND: 'ten-red-surround',
  SPOTTED_COLORS: 'spotted-colors',
  SPOT_BLACK: 'spot-black', SPOT_PINK: 'spot-pink', RANDOM_LONG: 'random-long',
});

const PRACTICE_SHAPES = Object.freeze([
  { id: PRACTICE_SHAPE.FULL_FRAME, label: '完整球局', group: '实战球型' },
  { id: PRACTICE_SHAPE.HENDRY, label: '亨得利球型', group: '实战球型' },
  { id: PRACTICE_SHAPE.SNAKE, label: '蛇彩', group: '围球练习' },
  { id: PRACTICE_SHAPE.T_SHAPE, label: 'T 型', group: '围球练习' },
  { id: PRACTICE_SHAPE.DOUBLE_DRAGON, label: '双龙', group: '围球练习' },
  { id: PRACTICE_SHAPE.X_SHAPE, label: 'X 型', group: '围球练习' },
  { id: PRACTICE_SHAPE.Y_SHAPE, label: 'Y 型', group: '围球练习' },
  { id: PRACTICE_SHAPE.TEN_RED_SURROUND, label: '10 红球围球', group: '围球练习' },
  { id: PRACTICE_SHAPE.SPOTTED_COLORS, label: '点位彩球', group: '基本功练习' },
  { id: 'spot-black', label: '点位黑球', group: '基本功练习' },
  { id: 'spot-pink', label: '点位粉球', group: '基本功练习' },
  { id: 'random-long', label: '随机远台', group: '基本功练习' },
]);

const BasicPractice = require('./basicPractice');
const BALL_DIAMETER_MM = BALL_RADIUS_MM * 2;

const PRACTICE_CUE_POSITIONS = Object.freeze({
  [PRACTICE_SHAPE.HENDRY]: Object.freeze({ x: HALF_PLAY_AREA_MM.width - 3 * BALL_RADIUS_MM, y: 0 }),
  [PRACTICE_SHAPE.DOUBLE_DRAGON]: Object.freeze({ x: BLACK_SPOT_X_MM - 300, y: -300 }),
  [PRACTICE_SHAPE.X_SHAPE]: Object.freeze({ x: 450, y: -300 }),
  [PRACTICE_SHAPE.Y_SHAPE]: Object.freeze({ x: BLACK_SPOT_X_MM - 300, y: -300 }),
  [PRACTICE_SHAPE.T_SHAPE]: Object.freeze({ x: 625, y: -250 }),
  [PRACTICE_SHAPE.SNAKE]: Object.freeze({ x: 1650, y: 300 }),
  [PRACTICE_SHAPE.TEN_RED_SURROUND]: Object.freeze({ x: 1100, y: -300 }),
});

function evenlySpacedPoints(startX, endX, count) {
  return Array.from({ length: count }, (_, index) => ({
    x: startX + (endX - startX) * ((index + 1) / (count + 1)),
    y: 0,
  }));
}

function createBall(id, kind, pos) {
  return createBallState(id, kind, pos, colorSpot(kind));
}

function createCueBall(shapeId) {
  const position = PRACTICE_CUE_POSITIONS[shapeId] || {
    x: BAULK_LINE_X_MM,
    y: BALL_DIAMETER_MM + 20,
  };
  return createBallState('cue', BALL_KIND.CUE, {
    ...position,
  });
}

function createColors() {
  return COLOR_ORDER.map((kind) => createBall(kind, kind, colorSpot(kind)));
}

function createTShapeReds() {
  const armSpacing = (BLACK_SPOT_X_MM - PINK_SPOT_X_MM) / 6;
  return [
    ...Array.from({ length: 5 }, (_, index) => ({
      x: PINK_SPOT_X_MM,
      y: -(index + 1) * armSpacing,
    })),
    ...Array.from({ length: 5 }, (_, index) => ({
      x: PINK_SPOT_X_MM,
      y: (index + 1) * armSpacing,
    })),
    ...evenlySpacedPoints(PINK_SPOT_X_MM, BLACK_SPOT_X_MM, 5),
  ];
}

// Keep both endpoints fixed; edge-to-edge gaps grow linearly from 1x to 2x.
function createDoubleDragonReds() {
  const previous = evenlySpacedPoints(BLACK_SPOT_X_MM - 80, PINK_SPOT_X_MM + BALL_RADIUS_MM, 15);
  const bottom = previous[0].x + BALL_DIAMETER_MM / 3;
  const top = previous[14].x - BALL_DIAMETER_MM / 3;
  const previousPitch = (bottom - top) / 7;
  const eightTop = top - BALL_DIAMETER_MM / 2;
  const sevenBottom = bottom - previousPitch / 2 + BALL_DIAMETER_MM / 2;
  const sevenTop = top + previousPitch / 2 - BALL_DIAMETER_MM / 2;
  return Array.from({length: 15}, (_, i) => {
    const seven = i % 2 === 1;
    const start = (seven ? sevenBottom : bottom) - BALL_DIAMETER_MM / 3;
    const end = seven ? sevenTop : eightTop;
    const intervals = seven ? 6 : 7;
    const index = Math.floor(i / 2);
    const firstGap = (start - end - intervals * BALL_DIAMETER_MM) / (1.5 * intervals);
    const gapSum = firstGap * (index + index * (index - 1) / (2 * (intervals - 1)));
    return {
      x: start - index * BALL_DIAMETER_MM - gapSum + (seven ? 0 : BALL_DIAMETER_MM / 4) + 5,
      y: (seven ? 1 : -1) * BALL_DIAMETER_MM,
    };
  });
}

function createXShapeReds(pockets) {
  pockets ||= require('../core/model/tableColliderSet').createTableColliderSet().pockets;
  const mouth = id => {
    const p = pockets.find(p => p.id === id);
    return p.openingDefinition?.center || p.center;
  };
  const centre=colorSpot(BALL_KIND.PINK);
  const a=mouth('corner-bottom-right'), c=mouth('corner-top-right');
  // Both files pass exactly through pink and the black-end corner mouth.
  // Extend the same lines towards the middles without bending either file.
  const b={x:2*centre.x-a.x,y:2*centre.y-a.y};
  const d={x:2*centre.x-c.x,y:2*centre.y-c.y};
  // Fifteen reds: 4 + 4 + 4 + 3 around the pink centre.
  return [a,c,d,b].flatMap((end,arm)=>{
    const dx=end.x-centre.x,dy=end.y-centre.y,length=Math.hypot(dx,dy);
    return Array.from({length:arm===3?3:4},(_,i)=>({
      x:centre.x+dx/length*(i+1)*BALL_DIAMETER_MM*1.8,
      y:centre.y+dy/length*(i+1)*BALL_DIAMETER_MM*1.8,
    }));
  });
}

function createYShapeReds() {
  const step = (BLACK_SPOT_X_MM - PINK_SPOT_X_MM) / 6;
  const armStep = step / Math.hypot(1, 1.12);
  return [
    ...evenlySpacedPoints(BLACK_SPOT_X_MM, PINK_SPOT_X_MM, 5),
    ...[-1, 1].flatMap(side => Array.from({length:5}, (_, i) => ({
      x: PINK_SPOT_X_MM - (i + 1) * armStep,
      y: side * (i + 1) * armStep * 1.12,
    }))),
  ];
}

function createHendryReds() {
  // Cushion clearance is measured from the ball edge: one diameter = 3R centre setback.
  const endX = HALF_PLAY_AREA_MM.width - 3 * BALL_RADIUS_MM;
  const sideY = HALF_PLAY_AREA_MM.height - 3 * BALL_RADIUS_MM;
  const triangleX = PINK_SPOT_X_MM + (BLACK_SPOT_X_MM - PINK_SPOT_X_MM) * .4;
  const pitch = BALL_DIAMETER_MM + .2;
  return [
    ...[-1, 1].flatMap(side => [-HALF_PLAY_AREA_MM.width * .65 + 3 * BALL_DIAMETER_MM, HALF_PLAY_AREA_MM.width * .15 + 2 * BALL_DIAMETER_MM, HALF_PLAY_AREA_MM.width * .65]
      .map(x => ({x, y: side * sideY}))),
    ...[-1, 1].flatMap(end => [-1, 1].map(side => ({x: end * endX, y: side * HALF_PLAY_AREA_MM.height * .4}))),
    {x: PINK_SPOT_X_MM * .5, y: 0},
    {x: triangleX, y: -pitch * .5},
    {x: triangleX, y: pitch * .5},
    {x: triangleX + pitch * Math.sqrt(3) / 2, y: 0},
    {x: BLACK_SPOT_X_MM - 140, y: 0},
  ];
}

function createSnakeReds() {
  return [
    ...evenlySpacedPoints(BLACK_SPOT_X_MM, HALF_PLAY_AREA_MM.width, 4),
    ...evenlySpacedPoints(PINK_SPOT_X_MM, BLACK_SPOT_X_MM, 5),
    ...evenlySpacedPoints(0, PINK_SPOT_X_MM, 6),
  ];
}

function createTenRedSurroundReds() {
  const sixRedRack = createOpeningRackState()
    .filter((ball) => ball.kind === BALL_KIND.RED)
    .slice(0, 6)
    .map((ball) => ({ ...ball.pos }));
  const blackToEndCushionMidpointDistance = (
    HALF_PLAY_AREA_MM.width - BLACK_SPOT_X_MM
  ) * 0.5;
  return [
    ...sixRedRack,
    { x: BLACK_SPOT_X_MM, y: -HALF_PLAY_AREA_MM.height * 0.5 },
    { x: (BLACK_SPOT_X_MM + HALF_PLAY_AREA_MM.width) * 0.5, y: 0 },
    { x: BLACK_SPOT_X_MM, y: HALF_PLAY_AREA_MM.height * 0.5 },
    { x: BLACK_SPOT_X_MM - blackToEndCushionMidpointDistance, y: 0 },
  ];
}

function createPatternBalls(shapeId, redPositions) {
  return [
    createCueBall(shapeId),
    ...createColors(),
    ...redPositions.map((pos, index) => createBallState(
      `red-${index + 1}`,
      BALL_KIND.RED,
      pos,
    )),
  ];
}

function spottedColorsStance(pockets) {
  pockets ||= require('../core/model/tableColliderSet').createTableColliderSet().pockets;
  const yellow = colorSpot(BALL_KIND.YELLOW), green = colorSpot(BALL_KIND.GREEN);
  const mouth = id => {
    const pocket = pockets.find(p => p.id === id);
    return pocket.openingDefinition?.center || pocket.center;
  };
  const a = mouth('corner-bottom-left'), b = mouth('corner-top-left');
  const u = {x:a.x-yellow.x,y:a.y-yellow.y}, v = {x:b.x-green.x,y:b.y-green.y};
  const t = ((green.x-yellow.x)*v.y-(green.y-yellow.y)*v.x)/(u.x*v.y-u.y*v.x);
  const position = {x:yellow.x+t*u.x,y:yellow.y+t*u.y};
  const length = Math.hypot(yellow.x-position.x,yellow.y-position.y);
  return {position,direction:{x:(yellow.x-position.x)/length,y:(yellow.y-position.y)/length}};
}

function createPracticeBalls(shapeId = PRACTICE_SHAPE.FULL_FRAME, pockets) {
  if (BasicPractice.isStreak(shapeId)) return BasicPractice.balls(shapeId);
  if (shapeId === PRACTICE_SHAPE.SPOTTED_COLORS) {
    return [createBallState('cue', BALL_KIND.CUE, spottedColorsStance(pockets).position), ...createColors()];
  }
  if (shapeId === PRACTICE_SHAPE.HENDRY) return createPatternBalls(shapeId, createHendryReds());
  if (shapeId === PRACTICE_SHAPE.DOUBLE_DRAGON) {
    const reds = createDoubleDragonReds();
    const target = reds[0];
    const tablePockets = pockets || require('../core/model/tableColliderSet').createTableColliderSet().pockets;
    const pocket = tablePockets.find(p => p.id === 'corner-bottom-right');
    const mouth = pocket.openingDefinition?.center || pocket.center;
    const dx = mouth.x - target.x, dy = mouth.y - target.y;
    const distance = Math.hypot(dx, dy);
    const stance = PRACTICE_CUE_POSITIONS[shapeId];
    const cueDistance = Math.hypot(stance.x - target.x, stance.y - target.y);
    const balls = createPatternBalls(shapeId, reds);
    const position = {x: target.x - dx / distance * cueDistance, y: target.y - dy / distance * cueDistance};
    balls[0].pos = position;
    balls[0].prevPos = {...position};
    return balls;
  }
  if (shapeId === PRACTICE_SHAPE.X_SHAPE) return createPatternBalls(shapeId, createXShapeReds(pockets));
  if (shapeId === PRACTICE_SHAPE.Y_SHAPE) return createPatternBalls(shapeId, createYShapeReds());
  if (shapeId === PRACTICE_SHAPE.T_SHAPE) {
    return createPatternBalls(shapeId, createTShapeReds());
  }
  if (shapeId === PRACTICE_SHAPE.SNAKE) {
    return createPatternBalls(shapeId, createSnakeReds());
  }
  if (shapeId === PRACTICE_SHAPE.TEN_RED_SURROUND) {
    return createPatternBalls(shapeId, createTenRedSurroundReds());
  }
  return createOpeningRackState();
}

function practiceShapeLabel(shapeId = PRACTICE_SHAPE.FULL_FRAME) {
  return PRACTICE_SHAPES.find((shape) => shape.id === shapeId)?.label
    || PRACTICE_SHAPES[0].label;
}

function createPracticeUndoHistory() {
  const snapshots = [];
  return {
    clear() {
      snapshots.length = 0;
    },
    length() {
      return snapshots.length;
    },
    pop() {
      return snapshots.pop() || null;
    },
    push(snapshot) {
      if (!snapshot) return false;
      snapshots.push(snapshot);
      return true;
    },
  };
}

function createPracticeShotHistoryEntry(matchStateSnapshot, shotInput = {}) {
  if (!matchStateSnapshot) return null;
  return {
    matchStateSnapshot,
    aimDirection: shotInput.direction
      ? { x: Number(shotInput.direction.x) || 0, y: Number(shotInput.direction.y) || 0 }
      : null,
    tipOffset: {
      x: Number(shotInput.tipOffset?.x) || 0,
      y: Number(shotInput.tipOffset?.y) || 0,
    },
  };
}

function resolvePracticeShotHistoryEntry(entry) {
  if (!entry) return null;
  if (entry.matchStateSnapshot) return entry;
  return {
    matchStateSnapshot: entry,
    aimDirection: null,
    tipOffset: { x: 0, y: 0 },
  };
}

function restorePracticeShotHistoryEntry(entry, applyMatchState) {
  const resolved = resolvePracticeShotHistoryEntry(entry);
  if (!resolved || typeof applyMatchState !== 'function') return null;
  // Practice undo is an intentional local timeline rollback. Online room
  // snapshots still use the normal monotonic shot-sequence protection.
  applyMatchState(resolved.matchStateSnapshot, {
    force: true,
    cueBallPlacementArea: 'table',
  });
  return resolved;
}

module.exports = {
  spottedColorsStance,
  PRACTICE_SHAPE,
  PRACTICE_SHAPES,
  PRACTICE_CUE_POSITIONS,
  createPracticeBalls,
  createPracticeShotHistoryEntry,
  createPracticeUndoHistory,
  createHendryReds,
  createDoubleDragonReds,
  createXShapeReds,
  createYShapeReds,
  createSnakeReds,
  createTenRedSurroundReds,
  createTShapeReds,
  evenlySpacedPoints,
  practiceShapeLabel,
  resolvePracticeShotHistoryEntry,
  restorePracticeShotHistoryEntry,
};

}, {"../config/constants":4,"../core/model/ballSpec":5,"../core/model/spotModel":6,"../core/model/tableModel":7,"../core/state/ballState":12,"../core/state/openingRackState":13,"./basicPractice":14,"../core/model/tableColliderSet":16}, "apps/three-game/src/game-client/practiceMode.js"],
4: [function(require, module, exports) {
const APP_NAME = '斯诺石狮三剑克';

const BALL_KIND = {
  CUE: 'cue',
  RED: 'red',
  YELLOW: 'yellow',
  GREEN: 'green',
  BROWN: 'brown',
  BLUE: 'blue',
  PINK: 'pink',
  BLACK: 'black',
};

const COLOR_ORDER = [
  BALL_KIND.YELLOW,
  BALL_KIND.GREEN,
  BALL_KIND.BROWN,
  BALL_KIND.BLUE,
  BALL_KIND.PINK,
  BALL_KIND.BLACK,
];

module.exports = {
  APP_NAME,
  BALL_KIND,
  COLOR_ORDER,
};

}, {}, "apps/three-game/src/config/constants.js"],
5: [function(require, module, exports) {
const { BALL_KIND } = require('../../config/constants');

const BALL_RADIUS_MM = 26.25;
const BALL_MASS = 1;
const BALL_INERTIA = (2 / 5) * BALL_MASS * BALL_RADIUS_MM * BALL_RADIUS_MM;

const BALL_VALUES = {
  [BALL_KIND.RED]: 1,
  [BALL_KIND.YELLOW]: 2,
  [BALL_KIND.GREEN]: 3,
  [BALL_KIND.BROWN]: 4,
  [BALL_KIND.BLUE]: 5,
  [BALL_KIND.PINK]: 6,
  [BALL_KIND.BLACK]: 7,
  [BALL_KIND.CUE]: 0,
};

const BALL_COLORS = {
  [BALL_KIND.CUE]: '#fff2bd',
  [BALL_KIND.RED]: '#e50012',
  [BALL_KIND.YELLOW]: '#f7a800',
  [BALL_KIND.GREEN]: '#08b976',
  [BALL_KIND.BROWN]: '#a86122',
  [BALL_KIND.BLUE]: '#0078bd',
  [BALL_KIND.PINK]: '#ff5a7d',
  [BALL_KIND.BLACK]: '#050505',
};

const BALL_SPEC = {
  radius: BALL_RADIUS_MM,
  mass: BALL_MASS,
  inertia: BALL_INERTIA,
};

function getBallSpec() {
  return { ...BALL_SPEC };
}

module.exports = {
  BALL_RADIUS_MM,
  BALL_MASS,
  BALL_INERTIA,
  BALL_VALUES,
  BALL_COLORS,
  BALL_SPEC,
  getBallSpec,
};

}, {"../../config/constants":4}, "apps/three-game/src/core/model/ballSpec.js"],
6: [function(require, module, exports) {
const { BALL_KIND } = require('../../config/constants');
const { BALL_RADIUS_MM } = require('./ballSpec');
const {
  BAULK_LINE_X_MM,
  BLACK_SPOT_X_MM,
  D_RADIUS_MM,
  PINK_SPOT_X_MM,
} = require('./tableModel');

const CUE_BALL_BROWN_EDGE_CLEARANCE_MM = 20;
const OPENING_RACK_RED_EDGE_GAP_MM = 0.1;

function colorSpot(kind) {
  switch (kind) {
    case BALL_KIND.YELLOW:
      return { x: BAULK_LINE_X_MM, y: D_RADIUS_MM };
    case BALL_KIND.GREEN:
      return { x: BAULK_LINE_X_MM, y: -D_RADIUS_MM };
    case BALL_KIND.BROWN:
      return { x: BAULK_LINE_X_MM, y: 0 };
    case BALL_KIND.BLUE:
      return { x: 0, y: 0 };
    case BALL_KIND.PINK:
      return { x: PINK_SPOT_X_MM, y: 0 };
    case BALL_KIND.BLACK:
      return { x: BLACK_SPOT_X_MM, y: 0 };
    default:
      return { x: 0, y: 0 };
  }
}

function openingCueBallPosition(options = {}) {
  const baulkLineX = Number.isFinite(Number(options.baulkLineX))
    ? Number(options.baulkLineX)
    : BAULK_LINE_X_MM;
  const ballRadius = Number.isFinite(Number(options.ballRadius))
    ? Number(options.ballRadius)
    : BALL_RADIUS_MM;
  return {
    x: baulkLineX,
    y: ballRadius * 2 + CUE_BALL_BROWN_EDGE_CLEARANCE_MM,
  };
}

function createOpeningRackLayout() {
  const balls = [];
  let id = 0;

  balls.push({
    id: `ball-${id++}`,
    kind: BALL_KIND.CUE,
    pos: openingCueBallPosition(),
  });

  [
    BALL_KIND.YELLOW,
    BALL_KIND.GREEN,
    BALL_KIND.BROWN,
    BALL_KIND.BLUE,
    BALL_KIND.PINK,
    BALL_KIND.BLACK,
  ].forEach((kind) => {
    balls.push({
      id: `ball-${id++}`,
      kind,
      pos: colorSpot(kind),
    });
  });

  const apex = { x: PINK_SPOT_X_MM + BALL_RADIUS_MM * 2 + 5, y: 0 };
  const redCenterDistance = BALL_RADIUS_MM * 2 + OPENING_RACK_RED_EDGE_GAP_MM;
  const rowGap = redCenterDistance;
  const colGap = Math.sqrt(3) * redCenterDistance * 0.5;

  for (let row = 0; row < 5; row += 1) {
    for (let col = 0; col <= row; col += 1) {
      balls.push({
        id: `ball-${id++}`,
        kind: BALL_KIND.RED,
        pos: {
          x: apex.x + row * colGap,
          y: (col - row * 0.5) * rowGap,
        },
      });
    }
  }

  return balls;
}

function createOpeningRack() {
  const { createBallState } = require('../state/ballState');
  return createOpeningRackLayout().map((ball) => (
    createBallState(ball.id, ball.kind, ball.pos, ball.spot || ball.pos)
  ));
}

module.exports = {
  CUE_BALL_BROWN_EDGE_CLEARANCE_MM,
  OPENING_RACK_RED_EDGE_GAP_MM,
  colorSpot,
  createOpeningRack,
  createOpeningRackLayout,
  openingCueBallPosition,
};

}, {"../../config/constants":4,"./ballSpec":5,"./tableModel":7,"../state/ballState":12}, "apps/three-game/src/core/model/spotModel.js"],
7: [function(require, module, exports) {
const { getTableBoundaryById } = require('./tableBoundaryPresets');
const { STANDARD_TABLE } = require('./standardTableSpec');

const BOUNDARY = getTableBoundaryById();
const PLAY_AREA_MM = { width: STANDARD_TABLE.lengthMm, height: STANDARD_TABLE.widthMm };
const DEFAULT_PLAY_AREA_MM = { ...BOUNDARY.playAreaMm };
const HALF_PLAY_AREA_MM = {
  width: DEFAULT_PLAY_AREA_MM.width * 0.5,
  height: DEFAULT_PLAY_AREA_MM.height * 0.5,
};
const RAIL_WIDTH_MM = Math.min(BOUNDARY.playAreaOffsetMm.x, BOUNDARY.playAreaOffsetMm.y);
// Official snooker spot rules are inch-based: baulk line 29in from the baulk
// cushion, D radius 11.5in, black spot 12.75in from the top cushion, and the
// pink spot halfway between the blue spot and the top cushion.
const BAULK_LINE_FROM_LEFT_MM = STANDARD_TABLE.baulkFromBottomMm;
const D_RADIUS_MM = STANDARD_TABLE.dRadiusMm;
const BLACK_SPOT_FROM_TOP_MM = STANDARD_TABLE.blackFromTopMm;
const BAULK_LINE_X_MM = -HALF_PLAY_AREA_MM.width + BAULK_LINE_FROM_LEFT_MM;
const BAULK_LINE_HALF_LENGTH_MM = HALF_PLAY_AREA_MM.height;
const PINK_SPOT_X_MM = HALF_PLAY_AREA_MM.width * 0.5;
const BLACK_SPOT_X_MM = HALF_PLAY_AREA_MM.width - BLACK_SPOT_FROM_TOP_MM;
const TOP_UI_HEIGHT = 94;
const SCOREBOARD_HEIGHT = 118;
const RIGHT_CONTROL_WIDTH = 86;
const TABLE_REFERENCE_TEXTURE_PATH = 'assets/images/table/scene_reference_clean.png';
const REFERENCE_PLAY_RECT = {
  x: 256.5,
  y: 164.0,
  width: 1405.1,
  height: 700.0,
};

function createOuterSizeMm() {
  return {
    ...BOUNDARY.outerSizeMm,
  };
}

function createTableModel() {
  return {
    physicalModel: 'pro-match-84-parametric-boundary',
    rulesPlayAreaMm: { ...PLAY_AREA_MM },
    playAreaMm: { ...DEFAULT_PLAY_AREA_MM },
    halfPlayAreaMm: { ...HALF_PLAY_AREA_MM },
    railWidthMm: RAIL_WIDTH_MM,
    railWidthXMm: BOUNDARY.playAreaOffsetMm.x,
    railWidthYMm: BOUNDARY.playAreaOffsetMm.y,
    playAreaOffsetMm: { ...BOUNDARY.playAreaOffsetMm },
    outerSizeMm: createOuterSizeMm(),
    physicalOuterBoundsMm: { ...BOUNDARY.outerBoundsMm },
    throatWidthMm: { ...BOUNDARY.throatWidthMm },
    mouthWidthMm: { ...BOUNDARY.mouthWidthMm },
    baulkLineMm: BAULK_LINE_X_MM,
    baulkLineFromLeftMm: BAULK_LINE_FROM_LEFT_MM,
    baulkLineHalfLengthMm: BAULK_LINE_HALF_LENGTH_MM,
    dRadiusMm: D_RADIUS_MM,
    pinkSpotMm: PINK_SPOT_X_MM,
    blackSpotFromTopMm: BLACK_SPOT_FROM_TOP_MM,
    blackSpotMm: BLACK_SPOT_X_MM,
    topUiHeight: TOP_UI_HEIGHT,
    scoreboardHeight: SCOREBOARD_HEIGHT,
    rightControlWidth: RIGHT_CONTROL_WIDTH,
    referenceTexturePath: TABLE_REFERENCE_TEXTURE_PATH,
    referencePlayRect: { ...REFERENCE_PLAY_RECT },
  };
}

module.exports = {
  PLAY_AREA_MM,
  DEFAULT_PLAY_AREA_MM,
  HALF_PLAY_AREA_MM,
  RAIL_WIDTH_MM,
  BAULK_LINE_FROM_LEFT_MM,
  BAULK_LINE_X_MM,
  BAULK_LINE_HALF_LENGTH_MM,
  D_RADIUS_MM,
  PINK_SPOT_X_MM,
  BLACK_SPOT_FROM_TOP_MM,
  BLACK_SPOT_X_MM,
  TOP_UI_HEIGHT,
  SCOREBOARD_HEIGHT,
  RIGHT_CONTROL_WIDTH,
  TABLE_REFERENCE_TEXTURE_PATH,
  REFERENCE_PLAY_RECT,
  createOuterSizeMm,
  createTableModel,
};

}, {"./tableBoundaryPresets":8,"./standardTableSpec":9}, "apps/three-game/src/core/model/tableModel.js"],
8: [function(require, module, exports) {
const { STANDARD_TABLE } = require('./standardTableSpec');
const { PRO_MATCH_84_FULL_PHYSICAL_BOUNDARIES } = require('./proMatch84FullPhysicalBoundaries');
const TABLE_BOUNDARY_PRESET_IDS = {
  PRO_MATCH_84: 'pro-match-84',
};
const DEFAULT_TABLE_BOUNDARY_PRESET_ID = TABLE_BOUNDARY_PRESET_IDS.PRO_MATCH_84;
const PRO_MATCH_THROAT_WIDTH_MM = 84;

const PRO_MATCH_84_BOUNDARY = {
  id: TABLE_BOUNDARY_PRESET_IDS.PRO_MATCH_84,
  name: '职业赛 84mm',
  source: 'wpbsa-2005-6-parametric-runtime',
  coordinateSystem: 'center-origin-mm',
  playAreaMm: {
    width: STANDARD_TABLE.lengthMm,
    height: STANDARD_TABLE.widthMm,
  },
  outerSizeMm: {
    width: 3684.684885,
    height: 1989.532387,
  },
  outerBoundsMm: {
    minX: -1842.342442,
    maxX: 1842.342442,
    minY: -994.766193,
    maxY: 994.766193,
  },
  playAreaOffsetMm: {
    x: 302.263826,
    y: 227.654699,
  },
  straightRailBoundsMm: {
    minX: -STANDARD_TABLE.lengthMm / 2,
    maxX: STANDARD_TABLE.lengthMm / 2,
    minY: -STANDARD_TABLE.widthMm / 2,
    maxY: STANDARD_TABLE.widthMm / 2,
  },
  straightRailSizeMm: {
    width: STANDARD_TABLE.lengthMm,
    height: STANDARD_TABLE.widthMm,
  },
  throatWidthMm: {
    middle: PRO_MATCH_THROAT_WIDTH_MM,
    corner: PRO_MATCH_THROAT_WIDTH_MM,
  },
  mouthWidthMm: {
    middle: 226.424991,
    corner: 126.974133,
  },
  rails: [],
  pockets: [
    {
      id: 'middle-top',
      type: 'middle',
      side: 'top',
      center: { x: 0, y: -957.090867 },
      candidateRadius: 202.586199,
      renderRadius: 60.344825,
      captureRadius: 67.241377,
      dropDirection: { x: 0, y: -1 },
      lips: [],
    },
    {
      id: 'corner-top-right',
      type: 'corner',
      side: 'top-right',
      center: { x: 1814.830006, y: -918.190443 },
      candidateRadius: 211.206888,
      renderRadius: 63.793101,
      captureRadius: 67.241377,
      dropDirection: { x: 0.707107, y: -0.707107 },
      lips: [],
    },
    {
      id: 'corner-bottom-right',
      type: 'corner',
      side: 'bottom-right',
      center: { x: 1814.830006, y: 918.190443 },
      candidateRadius: 211.206888,
      renderRadius: 63.793101,
      captureRadius: 67.241377,
      dropDirection: { x: 0.707107, y: 0.707107 },
      lips: [],
    },
    {
      id: 'middle-bottom',
      type: 'middle',
      side: 'bottom',
      center: { x: 0, y: 957.090867 },
      candidateRadius: 202.586199,
      renderRadius: 60.344825,
      captureRadius: 67.241377,
      dropDirection: { x: 0, y: 1 },
      lips: [],
    },
    {
      id: 'corner-bottom-left',
      type: 'corner',
      side: 'bottom-left',
      center: { x: -1814.830006, y: 918.190443 },
      candidateRadius: 211.206888,
      renderRadius: 63.793101,
      captureRadius: 67.241377,
      dropDirection: { x: -0.707107, y: 0.707107 },
      lips: [],
    },
    {
      id: 'corner-top-left',
      type: 'corner',
      side: 'top-left',
      center: { x: -1814.830006, y: -918.190443 },
      candidateRadius: 211.206888,
      renderRadius: 63.793101,
      captureRadius: 67.241377,
      dropDirection: { x: -0.707107, y: -0.707107 },
      lips: [],
    },
  ],
};

function clonePoint(point) {
  return { x: point.x, y: point.y };
}

function cloneBoundary(boundary) {
  const shift = PRO_MATCH_84_FULL_PHYSICAL_BOUNDARIES.calibration.translationMm;
  return {
    ...boundary,
    playAreaMm: { ...boundary.playAreaMm },
    outerSizeMm: { ...boundary.outerSizeMm },
    outerBoundsMm: { ...boundary.outerBoundsMm },
    playAreaOffsetMm: { ...boundary.playAreaOffsetMm },
    straightRailBoundsMm: { ...boundary.straightRailBoundsMm },
    straightRailSizeMm: { ...boundary.straightRailSizeMm },
    throatWidthMm: { ...boundary.throatWidthMm },
    mouthWidthMm: { ...boundary.mouthWidthMm },
    rails: boundary.rails.map((rail) => ({
      ...rail,
      start: clonePoint(rail.start),
      end: clonePoint(rail.end),
    })),
    pockets: boundary.pockets.map((pocket) => ({
      ...pocket,
      center: {
        x: pocket.center.x + (pocket.type === 'middle' ? 0 : Math.sign(pocket.center.x) * shift.x),
        y: pocket.center.y + Math.sign(pocket.center.y) * shift.y,
      },
      dropDirection: { ...pocket.dropDirection },
      lips: [],
    })),
  };
}

function getTableBoundaryPreset() {
  return {
    id: PRO_MATCH_84_BOUNDARY.id,
    name: PRO_MATCH_84_BOUNDARY.name,
    description: 'WPBSA 参数化职业赛袋口边界。',
    boundary: cloneBoundary(PRO_MATCH_84_BOUNDARY),
  };
}

function getTableBoundaryById() {
  return getTableBoundaryPreset().boundary;
}

function listTableBoundaryPresets() {
  const boundary = PRO_MATCH_84_BOUNDARY;
  return [{
    id: boundary.id,
    name: boundary.name,
    description: 'WPBSA 参数化职业赛袋口边界。',
    throatWidthMm: { ...boundary.throatWidthMm },
    mouthWidthMm: { ...boundary.mouthWidthMm },
  }];
}

function measurePocketThroat() {
  return {
    widthMm: PRO_MATCH_THROAT_WIDTH_MM,
  };
}

module.exports = {
  DEFAULT_TABLE_BOUNDARY_PRESET_ID,
  PRO_MATCH_THROAT_WIDTH_MM,
  TABLE_BOUNDARY_PRESET_IDS,
  getTableBoundaryById,
  getTableBoundaryPreset,
  listTableBoundaryPresets,
  measurePocketThroat,
};

}, {"./standardTableSpec":9,"./proMatch84FullPhysicalBoundaries":10}, "apps/three-game/src/core/model/tableBoundaryPresets.js"],
9: [function(require, module, exports) {
// WPBSA 2024–25, Equipment §1. Bracketed metric dimensions in the rulebook
// are rounded; retain the inch dimensions exactly for shared simulation/rendering.
const INCH_MM = 25.4;
const STANDARD_TABLE = Object.freeze({
  lengthMm: 140.5 * INCH_MM,
  widthMm: 70 * INCH_MM,
  cushionTopHeightMm: 34 * INCH_MM,
  baulkFromBottomMm: 29 * INCH_MM,
  dRadiusMm: 11.5 * INCH_MM,
  blackFromTopMm: 12.75 * INCH_MM,
  source: 'https://wpbsa.com/wp-content/uploads/2198_WPBSA-Rulebook-2024-25.pdf',
});

module.exports = { INCH_MM, STANDARD_TABLE };

}, {}, "apps/three-game/src/core/model/standardTableSpec.js"],
10: [function(require, module, exports) {
// Generated from docs/physics/pro-match-84-wpbsa-parametric-boundary-candidate.json.
// This is the default full-table physical boundary set for the pro-match-84 preset.
// Straight rails and black-hole circles are retained from the previous hand-drawn boundary.
// Pocket rail and drop-judge lines are generated from the WPBSA 2005/6 parametric model.

const PRO_MATCH_84_FULL_PHYSICAL_BOUNDARIES = {
  "version": 2,
  "source": "wpbsa-2005-6-parametric-runtime",
  "boundaryId": "pro-match-84",
  "boundaryName": "职业赛 WPBSA 参数化",
  "sourceImagePath": "../../assets/images/table/full-table-clean-aligned-broadcast-green-smooth-edge10.png",
  "imagePhysicalRectPx": {
    "x": 103,
    "y": 63,
    "width": 2010,
    "height": 1085
  },
  "coordinateSystem": "center-origin-mm",
  "areas": [
    {
      "id": "rail-0",
      "kind": "straight-rail-area",
      "name": "直线库边 1",
      "boundaryTypes": [
        "straightRail"
      ],
      "focusImageRect": {
        "x": 1079.757,
        "y": 30.217,
        "width": 1043.798,
        "height": 180
      }
    },
    {
      "id": "rail-1",
      "kind": "straight-rail-area",
      "name": "直线库边 2",
      "boundaryTypes": [
        "straightRail"
      ],
      "focusImageRect": {
        "x": 1992.533,
        "y": 79.18,
        "width": 180,
        "height": 1052.64
      }
    },
    {
      "id": "rail-2",
      "kind": "straight-rail-area",
      "name": "直线库边 3",
      "boundaryTypes": [
        "straightRail"
      ],
      "focusImageRect": {
        "x": 1079.757,
        "y": 1000.783,
        "width": 1043.798,
        "height": 180
      }
    },
    {
      "id": "rail-3",
      "kind": "straight-rail-area",
      "name": "直线库边 4",
      "boundaryTypes": [
        "straightRail"
      ],
      "focusImageRect": {
        "x": 92.445,
        "y": 1000.783,
        "width": 1043.798,
        "height": 180
      }
    },
    {
      "id": "rail-4",
      "kind": "straight-rail-area",
      "name": "直线库边 5",
      "boundaryTypes": [
        "straightRail"
      ],
      "focusImageRect": {
        "x": 43.467,
        "y": 79.18,
        "width": 180,
        "height": 1052.64
      }
    },
    {
      "id": "rail-5",
      "kind": "straight-rail-area",
      "name": "直线库边 6",
      "boundaryTypes": [
        "straightRail"
      ],
      "focusImageRect": {
        "x": 92.445,
        "y": 30.217,
        "width": 1043.798,
        "height": 180
      }
    },
    {
      "id": "middle-top",
      "kind": "pocket-area",
      "name": "middle-top (middle)",
      "pocketId": "middle-top",
      "boundaryTypes": [
        "pocketRail",
        "dropJudge",
        "blackHole"
      ],
      "focusImageRect": {
        "x": 916.243,
        "y": -67,
        "width": 383.515,
        "height": 317.218
      }
    },
    {
      "id": "corner-top-right",
      "kind": "pocket-area",
      "name": "corner-top-right (corner)",
      "pocketId": "corner-top-right",
      "boundaryTypes": [
        "pocketRail",
        "dropJudge",
        "blackHole"
      ],
      "focusImageRect": {
        "x": 1918.556,
        "y": -23.754,
        "width": 307.955,
        "height": 307.934
      }
    },
    {
      "id": "corner-bottom-right",
      "kind": "pocket-area",
      "name": "corner-bottom-right (corner)",
      "pocketId": "corner-bottom-right",
      "boundaryTypes": [
        "pocketRail",
        "dropJudge",
        "blackHole"
      ],
      "focusImageRect": {
        "x": 1918.556,
        "y": 926.82,
        "width": 307.955,
        "height": 307.934
      }
    },
    {
      "id": "middle-bottom",
      "kind": "pocket-area",
      "name": "middle-bottom (middle)",
      "pocketId": "middle-bottom",
      "boundaryTypes": [
        "pocketRail",
        "dropJudge",
        "blackHole"
      ],
      "focusImageRect": {
        "x": 916.243,
        "y": 960.782,
        "width": 383.515,
        "height": 317.218
      }
    },
    {
      "id": "corner-bottom-left",
      "kind": "pocket-area",
      "name": "corner-bottom-left (corner)",
      "pocketId": "corner-bottom-left",
      "boundaryTypes": [
        "pocketRail",
        "dropJudge",
        "blackHole"
      ],
      "focusImageRect": {
        "x": -10.51,
        "y": 926.82,
        "width": 307.955,
        "height": 307.934
      }
    },
    {
      "id": "corner-top-left",
      "kind": "pocket-area",
      "name": "corner-top-left (corner)",
      "pocketId": "corner-top-left",
      "boundaryTypes": [
        "pocketRail",
        "dropJudge",
        "blackHole"
      ],
      "focusImageRect": {
        "x": -10.51,
        "y": -23.754,
        "width": 307.955,
        "height": 307.934
      }
    }
  ],
  "lines": [
    {
      "id": "table-rail-0",
      "name": "直线库边 1",
      "areaId": "rail-0",
      "boundaryType": "straightRail",
      "boundaryTypeName": "直线库边区",
      "tool": "line",
      "toolName": "直线",
      "source": "table-boundary-preset",
      "outputPointCount": 2,
      "endpointContact": {
        "startDistancePx": null,
        "endDistancePx": null,
        "startEndpointDistancePx": null,
        "endEndpointDistancePx": null
      },
      "controlImagePx": [
        [
          1169.757,
          120.217
        ],
        [
          2033.555,
          120.217
        ]
      ],
      "controlTableMm": [
        [
          113.211,
          -889.849
        ],
        [
          1696.706,
          -889.849
        ]
      ],
      "polylineImagePx": [
        [
          1169.757,
          120.217
        ],
        [
          2033.555,
          120.217
        ]
      ],
      "polylineTableMm": [
        [
          113.211,
          -889.849
        ],
        [
          1696.706,
          -889.849
        ]
      ]
    },
    {
      "id": "table-rail-1",
      "name": "直线库边 2",
      "areaId": "rail-1",
      "boundaryType": "straightRail",
      "boundaryTypeName": "直线库边区",
      "tool": "line",
      "toolName": "直线",
      "source": "table-boundary-preset",
      "outputPointCount": 2,
      "endpointContact": {
        "startDistancePx": null,
        "endDistancePx": null,
        "startEndpointDistancePx": null,
        "endEndpointDistancePx": null
      },
      "controlImagePx": [
        [
          2082.533,
          169.18
        ],
        [
          2082.533,
          1041.82
        ]
      ],
      "controlTableMm": [
        [
          1786.491,
          -800.067
        ],
        [
          1786.491,
          800.067
        ]
      ],
      "polylineImagePx": [
        [
          2082.533,
          169.18
        ],
        [
          2082.533,
          1041.82
        ]
      ],
      "polylineTableMm": [
        [
          1786.491,
          -800.067
        ],
        [
          1786.491,
          800.067
        ]
      ]
    },
    {
      "id": "table-rail-2",
      "name": "直线库边 3",
      "areaId": "rail-2",
      "boundaryType": "straightRail",
      "boundaryTypeName": "直线库边区",
      "tool": "line",
      "toolName": "直线",
      "source": "table-boundary-preset",
      "outputPointCount": 2,
      "endpointContact": {
        "startDistancePx": null,
        "endDistancePx": null,
        "startEndpointDistancePx": null,
        "endEndpointDistancePx": null
      },
      "controlImagePx": [
        [
          2033.555,
          1090.783
        ],
        [
          1169.757,
          1090.783
        ]
      ],
      "controlTableMm": [
        [
          1696.706,
          889.849
        ],
        [
          113.211,
          889.849
        ]
      ],
      "polylineImagePx": [
        [
          2033.555,
          1090.783
        ],
        [
          1169.757,
          1090.783
        ]
      ],
      "polylineTableMm": [
        [
          1696.706,
          889.849
        ],
        [
          113.211,
          889.849
        ]
      ]
    },
    {
      "id": "table-rail-3",
      "name": "直线库边 4",
      "areaId": "rail-3",
      "boundaryType": "straightRail",
      "boundaryTypeName": "直线库边区",
      "tool": "line",
      "toolName": "直线",
      "source": "table-boundary-preset",
      "outputPointCount": 2,
      "endpointContact": {
        "startDistancePx": null,
        "endDistancePx": null,
        "startEndpointDistancePx": null,
        "endEndpointDistancePx": null
      },
      "controlImagePx": [
        [
          1046.243,
          1090.783
        ],
        [
          182.445,
          1090.783
        ]
      ],
      "controlTableMm": [
        [
          -113.211,
          889.849
        ],
        [
          -1696.706,
          889.849
        ]
      ],
      "polylineImagePx": [
        [
          1046.243,
          1090.783
        ],
        [
          182.445,
          1090.783
        ]
      ],
      "polylineTableMm": [
        [
          -113.211,
          889.849
        ],
        [
          -1696.706,
          889.849
        ]
      ]
    },
    {
      "id": "table-rail-4",
      "name": "直线库边 5",
      "areaId": "rail-4",
      "boundaryType": "straightRail",
      "boundaryTypeName": "直线库边区",
      "tool": "line",
      "toolName": "直线",
      "source": "table-boundary-preset",
      "outputPointCount": 2,
      "endpointContact": {
        "startDistancePx": null,
        "endDistancePx": null,
        "startEndpointDistancePx": null,
        "endEndpointDistancePx": null
      },
      "controlImagePx": [
        [
          133.467,
          1041.82
        ],
        [
          133.467,
          169.18
        ]
      ],
      "controlTableMm": [
        [
          -1786.491,
          800.067
        ],
        [
          -1786.491,
          -800.067
        ]
      ],
      "polylineImagePx": [
        [
          133.467,
          1041.82
        ],
        [
          133.467,
          169.18
        ]
      ],
      "polylineTableMm": [
        [
          -1786.491,
          800.067
        ],
        [
          -1786.491,
          -800.067
        ]
      ]
    },
    {
      "id": "table-rail-5",
      "name": "直线库边 6",
      "areaId": "rail-5",
      "boundaryType": "straightRail",
      "boundaryTypeName": "直线库边区",
      "tool": "line",
      "toolName": "直线",
      "source": "table-boundary-preset",
      "outputPointCount": 2,
      "endpointContact": {
        "startDistancePx": null,
        "endDistancePx": null,
        "startEndpointDistancePx": null,
        "endEndpointDistancePx": null
      },
      "controlImagePx": [
        [
          182.445,
          120.217
        ],
        [
          1046.243,
          120.217
        ]
      ],
      "controlTableMm": [
        [
          -1696.706,
          -889.849
        ],
        [
          -113.211,
          -889.849
        ]
      ],
      "polylineImagePx": [
        [
          182.445,
          120.217
        ],
        [
          1046.243,
          120.217
        ]
      ],
      "polylineTableMm": [
        [
          -1696.706,
          -889.849
        ],
        [
          -113.211,
          -889.849
        ]
      ]
    },
    {
      "id": "boundary-mpdxxgec-1111",
      "name": "网袋黑洞区 4",
      "areaId": "middle-top",
      "boundaryType": "blackHole",
      "boundaryTypeName": "网袋黑洞区",
      "tool": "circle",
      "toolName": "圆形",
      "source": "editor",
      "outputPointCount": 20,
      "endpointContact": null,
      "controlImagePx": [
        [
          1108.421,
          93.34
        ]
      ],
      "controlTableMm": [
        [
          0.772,
          -939.133
        ]
      ],
      "polylineImagePx": [
        [
          1123.997,
          93.34
        ],
        [
          1123.235,
          98.153
        ],
        [
          1121.022,
          102.495
        ],
        [
          1117.576,
          105.941
        ],
        [
          1113.234,
          108.154
        ],
        [
          1108.421,
          108.916
        ],
        [
          1103.608,
          108.154
        ],
        [
          1099.266,
          105.941
        ],
        [
          1095.82,
          102.495
        ],
        [
          1093.607,
          98.153
        ],
        [
          1092.845,
          93.34
        ],
        [
          1093.607,
          88.527
        ],
        [
          1095.82,
          84.185
        ],
        [
          1099.266,
          80.739
        ],
        [
          1103.608,
          78.526
        ],
        [
          1108.421,
          77.764
        ],
        [
          1113.234,
          78.526
        ],
        [
          1117.576,
          80.739
        ],
        [
          1121.022,
          84.185
        ],
        [
          1123.235,
          88.527
        ],
        [
          1123.997,
          93.34
        ]
      ],
      "polylineTableMm": [
        [
          29.325,
          -939.133
        ],
        [
          27.928,
          -930.307
        ],
        [
          23.872,
          -922.345
        ],
        [
          17.555,
          -916.026
        ],
        [
          9.595,
          -911.969
        ],
        [
          0.772,
          -910.571
        ],
        [
          -8.052,
          -911.969
        ],
        [
          -16.012,
          -916.026
        ],
        [
          -22.329,
          -922.345
        ],
        [
          -26.384,
          -930.307
        ],
        [
          -27.782,
          -939.133
        ],
        [
          -26.384,
          -947.959
        ],
        [
          -22.329,
          -955.921
        ],
        [
          -16.012,
          -962.239
        ],
        [
          -8.052,
          -966.296
        ],
        [
          0.772,
          -967.694
        ],
        [
          9.595,
          -966.296
        ],
        [
          17.555,
          -962.239
        ],
        [
          23.872,
          -955.921
        ],
        [
          27.928,
          -947.959
        ],
        [
          29.325,
          -939.133
        ]
      ],
      "circleImagePx": {
        "center": [
          1108.421,
          93.34
        ],
        "radius": 15.576
      },
      "circleTableMm": {
        "center": [
          0.772,
          -939.133
        ],
        "radius": 28.554
      }
    },
    {
      "id": "boundary-mpdxxyrj-2976",
      "name": "网袋黑洞区 4",
      "areaId": "middle-bottom",
      "boundaryType": "blackHole",
      "boundaryTypeName": "网袋黑洞区",
      "tool": "circle",
      "toolName": "圆形",
      "source": "editor",
      "outputPointCount": 20,
      "endpointContact": null,
      "controlImagePx": [
        [
          1107.891,
          1113.304
        ]
      ],
      "controlTableMm": [
        [
          -0.2,
          931.145
        ]
      ],
      "polylineImagePx": [
        [
          1123.508,
          1113.304
        ],
        [
          1122.744,
          1118.13
        ],
        [
          1120.525,
          1122.483
        ],
        [
          1117.07,
          1125.938
        ],
        [
          1112.717,
          1128.157
        ],
        [
          1107.891,
          1128.921
        ],
        [
          1103.065,
          1128.157
        ],
        [
          1098.712,
          1125.938
        ],
        [
          1095.257,
          1122.483
        ],
        [
          1093.038,
          1118.13
        ],
        [
          1092.274,
          1113.304
        ],
        [
          1093.038,
          1108.478
        ],
        [
          1095.257,
          1104.125
        ],
        [
          1098.712,
          1100.67
        ],
        [
          1103.065,
          1098.451
        ],
        [
          1107.891,
          1097.687
        ],
        [
          1112.717,
          1098.451
        ],
        [
          1117.07,
          1100.67
        ],
        [
          1120.525,
          1104.125
        ],
        [
          1122.744,
          1108.478
        ],
        [
          1123.508,
          1113.304
        ]
      ],
      "polylineTableMm": [
        [
          28.429,
          931.145
        ],
        [
          27.028,
          939.994
        ],
        [
          22.961,
          947.977
        ],
        [
          16.628,
          954.313
        ],
        [
          8.647,
          958.38
        ],
        [
          -0.2,
          959.782
        ],
        [
          -9.047,
          958.38
        ],
        [
          -17.027,
          954.313
        ],
        [
          -23.361,
          947.977
        ],
        [
          -27.427,
          939.994
        ],
        [
          -28.829,
          931.145
        ],
        [
          -27.427,
          922.296
        ],
        [
          -23.361,
          914.313
        ],
        [
          -17.027,
          907.978
        ],
        [
          -9.047,
          903.91
        ],
        [
          -0.2,
          902.509
        ],
        [
          8.647,
          903.91
        ],
        [
          16.628,
          907.978
        ],
        [
          22.961,
          914.313
        ],
        [
          27.028,
          922.296
        ],
        [
          28.429,
          931.145
        ]
      ],
      "circleImagePx": {
        "center": [
          1107.891,
          1113.304
        ],
        "radius": 15.617
      },
      "circleTableMm": {
        "center": [
          -0.2,
          931.145
        ],
        "radius": 28.629
      }
    },
    {
      "id": "boundary-mpdxz7ag-3750",
      "name": "网袋黑洞区 6",
      "areaId": "corner-top-right",
      "boundaryType": "blackHole",
      "boundaryTypeName": "网袋黑洞区",
      "tool": "circle",
      "toolName": "圆形",
      "source": "editor",
      "outputPointCount": 20,
      "endpointContact": null,
      "controlImagePx": [
        [
          2083.017,
          111.332
        ]
      ],
      "controlTableMm": [
        [
          1787.378,
          -906.141
        ]
      ],
      "polylineImagePx": [
        [
          2096.845,
          111.332
        ],
        [
          2096.168,
          115.605
        ],
        [
          2094.204,
          119.46
        ],
        [
          2091.145,
          122.519
        ],
        [
          2087.29,
          124.483
        ],
        [
          2083.017,
          125.16
        ],
        [
          2078.744,
          124.483
        ],
        [
          2074.889,
          122.519
        ],
        [
          2071.83,
          119.46
        ],
        [
          2069.866,
          115.605
        ],
        [
          2069.189,
          111.332
        ],
        [
          2069.866,
          107.059
        ],
        [
          2071.83,
          103.204
        ],
        [
          2074.889,
          100.145
        ],
        [
          2078.744,
          98.181
        ],
        [
          2083.017,
          97.504
        ],
        [
          2087.29,
          98.181
        ],
        [
          2091.145,
          100.145
        ],
        [
          2094.204,
          103.204
        ],
        [
          2096.168,
          107.059
        ],
        [
          2096.845,
          111.332
        ]
      ],
      "polylineTableMm": [
        [
          1812.727,
          -906.141
        ],
        [
          1811.487,
          -898.306
        ],
        [
          1807.886,
          -891.237
        ],
        [
          1802.278,
          -885.628
        ],
        [
          1795.212,
          -882.026
        ],
        [
          1787.378,
          -880.785
        ],
        [
          1779.545,
          -882.026
        ],
        [
          1772.478,
          -885.628
        ],
        [
          1766.87,
          -891.237
        ],
        [
          1763.27,
          -898.306
        ],
        [
          1762.029,
          -906.141
        ],
        [
          1763.27,
          -913.977
        ],
        [
          1766.87,
          -921.045
        ],
        [
          1772.478,
          -926.655
        ],
        [
          1779.545,
          -930.256
        ],
        [
          1787.378,
          -931.497
        ],
        [
          1795.212,
          -930.256
        ],
        [
          1802.278,
          -926.655
        ],
        [
          1807.886,
          -921.045
        ],
        [
          1811.487,
          -913.977
        ],
        [
          1812.727,
          -906.141
        ]
      ],
      "circleImagePx": {
        "center": [
          2083.017,
          111.332
        ],
        "radius": 13.828
      },
      "circleTableMm": {
        "center": [
          1787.378,
          -906.141
        ],
        "radius": 25.349
      }
    },
    {
      "id": "line-mpdy0414-0-1016",
      "name": "网袋黑洞区 copy",
      "areaId": "corner-bottom-right",
      "boundaryType": "blackHole",
      "boundaryTypeName": "网袋黑洞区",
      "tool": "circle",
      "toolName": "圆形",
      "source": "editor copy",
      "outputPointCount": 20,
      "endpointContact": null,
      "controlImagePx": [
        [
          2083.482,
          1097.26
        ]
      ],
      "controlTableMm": [
        [
          1788.231,
          901.726
        ]
      ],
      "polylineImagePx": [
        [
          2097.31,
          1097.26
        ],
        [
          2096.633,
          1101.533
        ],
        [
          2094.669,
          1105.388
        ],
        [
          2091.61,
          1108.447
        ],
        [
          2087.755,
          1110.411
        ],
        [
          2083.482,
          1111.088
        ],
        [
          2079.209,
          1110.411
        ],
        [
          2075.354,
          1108.447
        ],
        [
          2072.295,
          1105.388
        ],
        [
          2070.331,
          1101.533
        ],
        [
          2069.654,
          1097.26
        ],
        [
          2070.331,
          1092.987
        ],
        [
          2072.295,
          1089.132
        ],
        [
          2075.354,
          1086.073
        ],
        [
          2079.209,
          1084.109
        ],
        [
          2083.482,
          1083.432
        ],
        [
          2087.755,
          1084.109
        ],
        [
          2091.61,
          1086.073
        ],
        [
          2094.669,
          1089.132
        ],
        [
          2096.633,
          1092.987
        ],
        [
          2097.31,
          1097.26
        ]
      ],
      "polylineTableMm": [
        [
          1813.58,
          901.726
        ],
        [
          1812.339,
          909.561
        ],
        [
          1808.739,
          916.63
        ],
        [
          1803.131,
          922.239
        ],
        [
          1796.064,
          925.841
        ],
        [
          1788.231,
          927.082
        ],
        [
          1780.397,
          925.841
        ],
        [
          1773.331,
          922.239
        ],
        [
          1767.723,
          916.63
        ],
        [
          1764.122,
          909.561
        ],
        [
          1762.882,
          901.726
        ],
        [
          1764.122,
          893.89
        ],
        [
          1767.723,
          886.822
        ],
        [
          1773.331,
          881.212
        ],
        [
          1780.397,
          877.611
        ],
        [
          1788.231,
          876.37
        ],
        [
          1796.064,
          877.611
        ],
        [
          1803.131,
          881.212
        ],
        [
          1808.739,
          886.822
        ],
        [
          1812.339,
          893.89
        ],
        [
          1813.58,
          901.726
        ]
      ],
      "circleImagePx": {
        "center": [
          2083.482,
          1097.26
        ],
        "radius": 13.828
      },
      "circleTableMm": {
        "center": [
          1788.231,
          901.726
        ],
        "radius": 25.349
      }
    },
    {
      "id": "line-mpdy0d0h-0-5919",
      "name": "网袋黑洞区 copy",
      "areaId": "corner-bottom-left",
      "boundaryType": "blackHole",
      "boundaryTypeName": "网袋黑洞区",
      "tool": "circle",
      "toolName": "圆形",
      "source": "editor copy",
      "outputPointCount": 20,
      "endpointContact": null,
      "controlImagePx": [
        [
          133.277,
          1096.282
        ]
      ],
      "controlTableMm": [
        [
          -1786.839,
          899.932
        ]
      ],
      "polylineImagePx": [
        [
          147.105,
          1096.282
        ],
        [
          146.428,
          1100.555
        ],
        [
          144.464,
          1104.41
        ],
        [
          141.405,
          1107.469
        ],
        [
          137.55,
          1109.433
        ],
        [
          133.277,
          1110.11
        ],
        [
          129.004,
          1109.433
        ],
        [
          125.149,
          1107.469
        ],
        [
          122.09,
          1104.41
        ],
        [
          120.126,
          1100.555
        ],
        [
          119.449,
          1096.282
        ],
        [
          120.126,
          1092.009
        ],
        [
          122.09,
          1088.154
        ],
        [
          125.149,
          1085.095
        ],
        [
          129.004,
          1083.131
        ],
        [
          133.277,
          1082.454
        ],
        [
          137.55,
          1083.131
        ],
        [
          141.405,
          1085.095
        ],
        [
          144.464,
          1088.154
        ],
        [
          146.428,
          1092.009
        ],
        [
          147.105,
          1096.282
        ]
      ],
      "polylineTableMm": [
        [
          -1761.49,
          899.932
        ],
        [
          -1762.731,
          907.768
        ],
        [
          -1766.331,
          914.836
        ],
        [
          -1771.939,
          920.446
        ],
        [
          -1779.006,
          924.047
        ],
        [
          -1786.839,
          925.288
        ],
        [
          -1794.673,
          924.047
        ],
        [
          -1801.739,
          920.446
        ],
        [
          -1807.347,
          914.836
        ],
        [
          -1810.948,
          907.768
        ],
        [
          -1812.189,
          899.932
        ],
        [
          -1810.948,
          892.097
        ],
        [
          -1807.347,
          885.029
        ],
        [
          -1801.739,
          879.419
        ],
        [
          -1794.673,
          875.817
        ],
        [
          -1786.839,
          874.576
        ],
        [
          -1779.006,
          875.817
        ],
        [
          -1771.939,
          879.419
        ],
        [
          -1766.331,
          885.029
        ],
        [
          -1762.731,
          892.097
        ],
        [
          -1761.49,
          899.932
        ]
      ],
      "circleImagePx": {
        "center": [
          133.277,
          1096.282
        ],
        "radius": 13.828
      },
      "circleTableMm": {
        "center": [
          -1786.839,
          899.932
        ],
        "radius": 25.349
      }
    },
    {
      "id": "line-mpdy0kq4-0-1069",
      "name": "网袋黑洞区 copy",
      "areaId": "corner-top-left",
      "boundaryType": "blackHole",
      "boundaryTypeName": "网袋黑洞区",
      "tool": "circle",
      "toolName": "圆形",
      "source": "editor copy",
      "outputPointCount": 20,
      "endpointContact": null,
      "controlImagePx": [
        [
          133.374,
          111.734
        ]
      ],
      "controlTableMm": [
        [
          -1786.662,
          -905.404
        ]
      ],
      "polylineImagePx": [
        [
          147.202,
          111.734
        ],
        [
          146.525,
          116.007
        ],
        [
          144.561,
          119.862
        ],
        [
          141.502,
          122.921
        ],
        [
          137.647,
          124.885
        ],
        [
          133.374,
          125.562
        ],
        [
          129.101,
          124.885
        ],
        [
          125.246,
          122.921
        ],
        [
          122.187,
          119.862
        ],
        [
          120.223,
          116.007
        ],
        [
          119.546,
          111.734
        ],
        [
          120.223,
          107.461
        ],
        [
          122.187,
          103.606
        ],
        [
          125.246,
          100.547
        ],
        [
          129.101,
          98.583
        ],
        [
          133.374,
          97.906
        ],
        [
          137.647,
          98.583
        ],
        [
          141.502,
          100.547
        ],
        [
          144.561,
          103.606
        ],
        [
          146.525,
          107.461
        ],
        [
          147.202,
          111.734
        ]
      ],
      "polylineTableMm": [
        [
          -1761.312,
          -905.404
        ],
        [
          -1762.553,
          -897.569
        ],
        [
          -1766.154,
          -890.5
        ],
        [
          -1771.762,
          -884.891
        ],
        [
          -1778.828,
          -881.289
        ],
        [
          -1786.662,
          -880.048
        ],
        [
          -1794.495,
          -881.289
        ],
        [
          -1801.561,
          -884.891
        ],
        [
          -1807.169,
          -890.5
        ],
        [
          -1810.77,
          -897.569
        ],
        [
          -1812.011,
          -905.404
        ],
        [
          -1810.77,
          -913.24
        ],
        [
          -1807.169,
          -920.308
        ],
        [
          -1801.561,
          -925.918
        ],
        [
          -1794.495,
          -929.519
        ],
        [
          -1786.662,
          -930.76
        ],
        [
          -1778.828,
          -929.519
        ],
        [
          -1771.762,
          -925.918
        ],
        [
          -1766.154,
          -920.308
        ],
        [
          -1762.553,
          -913.24
        ],
        [
          -1761.312,
          -905.404
        ]
      ],
      "circleImagePx": {
        "center": [
          133.374,
          111.734
        ],
        "radius": 13.828
      },
      "circleTableMm": {
        "center": [
          -1786.662,
          -905.404
        ],
        "radius": 25.349
      }
    },
    {
      "id": "middle-top:wpbsa-param:left-pocket-rail",
      "name": "middle-top left pocket rail",
      "areaId": "middle-top",
      "boundaryType": "pocketRail",
      "boundaryTypeName": "袋口库边区",
      "tool": "parametricPolyline",
      "toolName": "参数化多段线",
      "source": "wpbsa-2005-6-parametric-candidate",
      "outputPointCount": 39,
      "polylineTableMm": [
        [
          -113.211,
          -889.849
        ],
        [
          -110.4,
          -889.898
        ],
        [
          -107.592,
          -890.043
        ],
        [
          -104.79,
          -890.285
        ],
        [
          -101.999,
          -890.624
        ],
        [
          -99.221,
          -891.06
        ],
        [
          -96.46,
          -891.59
        ],
        [
          -93.719,
          -892.216
        ],
        [
          -91.001,
          -892.936
        ],
        [
          -88.31,
          -893.749
        ],
        [
          -85.648,
          -894.655
        ],
        [
          -83.019,
          -895.652
        ],
        [
          -80.426,
          -896.74
        ],
        [
          -77.872,
          -897.916
        ],
        [
          -75.36,
          -899.179
        ],
        [
          -72.893,
          -900.529
        ],
        [
          -70.475,
          -901.963
        ],
        [
          -68.107,
          -903.479
        ],
        [
          -65.793,
          -905.077
        ],
        [
          -63.586,
          -906.818
        ],
        [
          -62.057,
          -908.146
        ],
        [
          -60.525,
          -909.467
        ],
        [
          -59.044,
          -910.843
        ],
        [
          -57.614,
          -912.274
        ],
        [
          -56.239,
          -913.756
        ],
        [
          -54.919,
          -915.288
        ],
        [
          -53.657,
          -916.868
        ],
        [
          -52.455,
          -918.494
        ],
        [
          -51.313,
          -920.163
        ],
        [
          -50.234,
          -921.873
        ],
        [
          -49.22,
          -923.622
        ],
        [
          -48.27,
          -925.408
        ],
        [
          -47.388,
          -927.227
        ],
        [
          -46.573,
          -929.078
        ],
        [
          -45.828,
          -930.958
        ],
        [
          -45.153,
          -932.864
        ],
        [
          -44.549,
          -934.794
        ],
        [
          -44.017,
          -936.745
        ],
        [
          -43.557,
          -938.714
        ]
      ],
      "polylineImagePx": [
        [
          1046.243,
          120.217
        ],
        [
          1047.777,
          120.191
        ],
        [
          1049.309,
          120.111
        ],
        [
          1050.837,
          119.979
        ],
        [
          1052.359,
          119.794
        ],
        [
          1053.875,
          119.557
        ],
        [
          1055.381,
          119.267
        ],
        [
          1056.876,
          118.926
        ],
        [
          1058.359,
          118.534
        ],
        [
          1059.827,
          118.09
        ],
        [
          1061.279,
          117.596
        ],
        [
          1062.713,
          117.052
        ],
        [
          1064.128,
          116.459
        ],
        [
          1065.521,
          115.818
        ],
        [
          1066.891,
          115.129
        ],
        [
          1068.237,
          114.393
        ],
        [
          1069.556,
          113.611
        ],
        [
          1070.848,
          112.784
        ],
        [
          1072.11,
          111.913
        ],
        [
          1073.314,
          110.963
        ],
        [
          1074.148,
          110.239
        ],
        [
          1074.983,
          109.518
        ],
        [
          1075.791,
          108.768
        ],
        [
          1076.571,
          107.988
        ],
        [
          1077.322,
          107.179
        ],
        [
          1078.041,
          106.344
        ],
        [
          1078.73,
          105.482
        ],
        [
          1079.386,
          104.595
        ],
        [
          1080.009,
          103.685
        ],
        [
          1080.597,
          102.752
        ],
        [
          1081.151,
          101.799
        ],
        [
          1081.668,
          100.825
        ],
        [
          1082.15,
          99.833
        ],
        [
          1082.594,
          98.823
        ],
        [
          1083.001,
          97.798
        ],
        [
          1083.369,
          96.759
        ],
        [
          1083.699,
          95.706
        ],
        [
          1083.989,
          94.642
        ],
        [
          1084.24,
          93.568
        ]
      ]
    },
    {
      "id": "middle-top:wpbsa-param:right-pocket-rail",
      "name": "middle-top right pocket rail",
      "areaId": "middle-top",
      "boundaryType": "pocketRail",
      "boundaryTypeName": "袋口库边区",
      "tool": "parametricPolyline",
      "toolName": "参数化多段线",
      "source": "wpbsa-2005-6-parametric-candidate",
      "outputPointCount": 39,
      "polylineTableMm": [
        [
          113.211,
          -889.849
        ],
        [
          110.4,
          -889.898
        ],
        [
          107.592,
          -890.043
        ],
        [
          104.79,
          -890.285
        ],
        [
          101.999,
          -890.624
        ],
        [
          99.221,
          -891.06
        ],
        [
          96.46,
          -891.59
        ],
        [
          93.719,
          -892.216
        ],
        [
          91.001,
          -892.936
        ],
        [
          88.31,
          -893.749
        ],
        [
          85.648,
          -894.655
        ],
        [
          83.019,
          -895.652
        ],
        [
          80.426,
          -896.74
        ],
        [
          77.872,
          -897.916
        ],
        [
          75.36,
          -899.179
        ],
        [
          72.893,
          -900.529
        ],
        [
          70.475,
          -901.963
        ],
        [
          68.107,
          -903.479
        ],
        [
          65.793,
          -905.077
        ],
        [
          63.586,
          -906.818
        ],
        [
          62.057,
          -908.146
        ],
        [
          60.525,
          -909.467
        ],
        [
          59.044,
          -910.843
        ],
        [
          57.614,
          -912.274
        ],
        [
          56.239,
          -913.756
        ],
        [
          54.919,
          -915.288
        ],
        [
          53.657,
          -916.868
        ],
        [
          52.455,
          -918.494
        ],
        [
          51.313,
          -920.163
        ],
        [
          50.234,
          -921.873
        ],
        [
          49.22,
          -923.622
        ],
        [
          48.27,
          -925.408
        ],
        [
          47.388,
          -927.227
        ],
        [
          46.573,
          -929.078
        ],
        [
          45.828,
          -930.958
        ],
        [
          45.153,
          -932.864
        ],
        [
          44.549,
          -934.794
        ],
        [
          44.017,
          -936.745
        ],
        [
          43.557,
          -938.714
        ]
      ],
      "polylineImagePx": [
        [
          1169.757,
          120.217
        ],
        [
          1168.223,
          120.191
        ],
        [
          1166.691,
          120.111
        ],
        [
          1165.163,
          119.979
        ],
        [
          1163.641,
          119.794
        ],
        [
          1162.125,
          119.557
        ],
        [
          1160.619,
          119.267
        ],
        [
          1159.124,
          118.926
        ],
        [
          1157.641,
          118.534
        ],
        [
          1156.173,
          118.09
        ],
        [
          1154.721,
          117.596
        ],
        [
          1153.287,
          117.052
        ],
        [
          1151.872,
          116.459
        ],
        [
          1150.479,
          115.818
        ],
        [
          1149.109,
          115.129
        ],
        [
          1147.763,
          114.393
        ],
        [
          1146.444,
          113.611
        ],
        [
          1145.152,
          112.784
        ],
        [
          1143.89,
          111.913
        ],
        [
          1142.686,
          110.963
        ],
        [
          1141.852,
          110.239
        ],
        [
          1141.017,
          109.518
        ],
        [
          1140.209,
          108.768
        ],
        [
          1139.429,
          107.988
        ],
        [
          1138.678,
          107.179
        ],
        [
          1137.959,
          106.344
        ],
        [
          1137.27,
          105.482
        ],
        [
          1136.614,
          104.595
        ],
        [
          1135.991,
          103.685
        ],
        [
          1135.403,
          102.752
        ],
        [
          1134.849,
          101.799
        ],
        [
          1134.332,
          100.825
        ],
        [
          1133.85,
          99.833
        ],
        [
          1133.406,
          98.823
        ],
        [
          1132.999,
          97.798
        ],
        [
          1132.631,
          96.759
        ],
        [
          1132.301,
          95.706
        ],
        [
          1132.011,
          94.642
        ],
        [
          1131.76,
          93.568
        ]
      ]
    },
    {
      "id": "middle-top:wpbsa-param:drop-judge",
      "name": "middle-top drop judge",
      "areaId": "middle-top",
      "boundaryType": "dropJudge",
      "boundaryTypeName": "落袋判定区",
      "tool": "parametricPolyline",
      "toolName": "参数化多段线",
      "source": "wpbsa-2005-6-parametric-candidate",
      "outputPointCount": 20,
      "polylineTableMm": [
        [
          -50.338,
          -921.703
        ],
        [
          -47.355,
          -915.657
        ],
        [
          -43.65,
          -910.025
        ],
        [
          -39.279,
          -904.894
        ],
        [
          -34.308,
          -900.34
        ],
        [
          -28.814,
          -896.434
        ],
        [
          -22.88,
          -893.235
        ],
        [
          -16.597,
          -890.792
        ],
        [
          -10.06,
          -889.142
        ],
        [
          -3.371,
          -888.311
        ],
        [
          3.371,
          -888.311
        ],
        [
          10.06,
          -889.142
        ],
        [
          16.597,
          -890.792
        ],
        [
          22.88,
          -893.235
        ],
        [
          28.814,
          -896.434
        ],
        [
          34.308,
          -900.34
        ],
        [
          39.279,
          -904.894
        ],
        [
          43.65,
          -910.025
        ],
        [
          47.355,
          -915.657
        ],
        [
          50.338,
          -921.703
        ]
      ],
      "polylineImagePx": [
        [
          1080.54,
          102.846
        ],
        [
          1082.168,
          106.143
        ],
        [
          1084.189,
          109.214
        ],
        [
          1086.573,
          112.012
        ],
        [
          1089.285,
          114.496
        ],
        [
          1092.282,
          116.626
        ],
        [
          1095.519,
          118.371
        ],
        [
          1098.946,
          119.703
        ],
        [
          1102.512,
          120.602
        ],
        [
          1106.161,
          121.056
        ],
        [
          1109.839,
          121.056
        ],
        [
          1113.488,
          120.602
        ],
        [
          1117.054,
          119.703
        ],
        [
          1120.481,
          118.371
        ],
        [
          1123.718,
          116.626
        ],
        [
          1126.715,
          114.496
        ],
        [
          1129.427,
          112.012
        ],
        [
          1131.811,
          109.214
        ],
        [
          1133.832,
          106.143
        ],
        [
          1135.46,
          102.846
        ]
      ]
    },
    {
      "id": "middle-bottom:wpbsa-param:left-pocket-rail",
      "name": "middle-bottom left pocket rail",
      "areaId": "middle-bottom",
      "boundaryType": "pocketRail",
      "boundaryTypeName": "袋口库边区",
      "tool": "parametricPolyline",
      "toolName": "参数化多段线",
      "source": "wpbsa-2005-6-parametric-candidate",
      "outputPointCount": 39,
      "polylineTableMm": [
        [
          -113.211,
          889.849
        ],
        [
          -110.4,
          889.898
        ],
        [
          -107.592,
          890.043
        ],
        [
          -104.79,
          890.285
        ],
        [
          -101.999,
          890.624
        ],
        [
          -99.221,
          891.06
        ],
        [
          -96.46,
          891.59
        ],
        [
          -93.719,
          892.216
        ],
        [
          -91.001,
          892.936
        ],
        [
          -88.31,
          893.749
        ],
        [
          -85.648,
          894.655
        ],
        [
          -83.019,
          895.652
        ],
        [
          -80.426,
          896.74
        ],
        [
          -77.872,
          897.916
        ],
        [
          -75.36,
          899.179
        ],
        [
          -72.893,
          900.529
        ],
        [
          -70.475,
          901.963
        ],
        [
          -68.107,
          903.479
        ],
        [
          -65.793,
          905.077
        ],
        [
          -63.586,
          906.818
        ],
        [
          -62.057,
          908.146
        ],
        [
          -60.525,
          909.467
        ],
        [
          -59.044,
          910.843
        ],
        [
          -57.614,
          912.274
        ],
        [
          -56.239,
          913.756
        ],
        [
          -54.919,
          915.288
        ],
        [
          -53.657,
          916.868
        ],
        [
          -52.455,
          918.494
        ],
        [
          -51.313,
          920.163
        ],
        [
          -50.234,
          921.873
        ],
        [
          -49.22,
          923.622
        ],
        [
          -48.27,
          925.408
        ],
        [
          -47.388,
          927.227
        ],
        [
          -46.573,
          929.078
        ],
        [
          -45.828,
          930.958
        ],
        [
          -45.153,
          932.864
        ],
        [
          -44.549,
          934.794
        ],
        [
          -44.017,
          936.745
        ],
        [
          -43.557,
          938.714
        ]
      ],
      "polylineImagePx": [
        [
          1046.243,
          1090.783
        ],
        [
          1047.777,
          1090.809
        ],
        [
          1049.309,
          1090.889
        ],
        [
          1050.837,
          1091.021
        ],
        [
          1052.359,
          1091.206
        ],
        [
          1053.875,
          1091.443
        ],
        [
          1055.381,
          1091.733
        ],
        [
          1056.876,
          1092.074
        ],
        [
          1058.359,
          1092.466
        ],
        [
          1059.827,
          1092.91
        ],
        [
          1061.279,
          1093.404
        ],
        [
          1062.713,
          1093.948
        ],
        [
          1064.128,
          1094.541
        ],
        [
          1065.521,
          1095.182
        ],
        [
          1066.891,
          1095.871
        ],
        [
          1068.237,
          1096.607
        ],
        [
          1069.556,
          1097.389
        ],
        [
          1070.848,
          1098.216
        ],
        [
          1072.11,
          1099.087
        ],
        [
          1073.314,
          1100.037
        ],
        [
          1074.148,
          1100.762
        ],
        [
          1074.983,
          1101.482
        ],
        [
          1075.791,
          1102.232
        ],
        [
          1076.571,
          1103.012
        ],
        [
          1077.322,
          1103.821
        ],
        [
          1078.041,
          1104.656
        ],
        [
          1078.73,
          1105.518
        ],
        [
          1079.386,
          1106.405
        ],
        [
          1080.009,
          1107.315
        ],
        [
          1080.597,
          1108.248
        ],
        [
          1081.151,
          1109.201
        ],
        [
          1081.668,
          1110.175
        ],
        [
          1082.15,
          1111.167
        ],
        [
          1082.594,
          1112.177
        ],
        [
          1083.001,
          1113.202
        ],
        [
          1083.369,
          1114.242
        ],
        [
          1083.699,
          1115.294
        ],
        [
          1083.989,
          1116.358
        ],
        [
          1084.24,
          1117.432
        ]
      ]
    },
    {
      "id": "middle-bottom:wpbsa-param:right-pocket-rail",
      "name": "middle-bottom right pocket rail",
      "areaId": "middle-bottom",
      "boundaryType": "pocketRail",
      "boundaryTypeName": "袋口库边区",
      "tool": "parametricPolyline",
      "toolName": "参数化多段线",
      "source": "wpbsa-2005-6-parametric-candidate",
      "outputPointCount": 39,
      "polylineTableMm": [
        [
          113.211,
          889.849
        ],
        [
          110.4,
          889.898
        ],
        [
          107.592,
          890.043
        ],
        [
          104.79,
          890.285
        ],
        [
          101.999,
          890.624
        ],
        [
          99.221,
          891.06
        ],
        [
          96.46,
          891.59
        ],
        [
          93.719,
          892.216
        ],
        [
          91.001,
          892.936
        ],
        [
          88.31,
          893.749
        ],
        [
          85.648,
          894.655
        ],
        [
          83.019,
          895.652
        ],
        [
          80.426,
          896.74
        ],
        [
          77.872,
          897.916
        ],
        [
          75.36,
          899.179
        ],
        [
          72.893,
          900.529
        ],
        [
          70.475,
          901.963
        ],
        [
          68.107,
          903.479
        ],
        [
          65.793,
          905.077
        ],
        [
          63.586,
          906.818
        ],
        [
          62.057,
          908.146
        ],
        [
          60.525,
          909.467
        ],
        [
          59.044,
          910.843
        ],
        [
          57.614,
          912.274
        ],
        [
          56.239,
          913.756
        ],
        [
          54.919,
          915.288
        ],
        [
          53.657,
          916.868
        ],
        [
          52.455,
          918.494
        ],
        [
          51.313,
          920.163
        ],
        [
          50.234,
          921.873
        ],
        [
          49.22,
          923.622
        ],
        [
          48.27,
          925.408
        ],
        [
          47.388,
          927.227
        ],
        [
          46.573,
          929.078
        ],
        [
          45.828,
          930.958
        ],
        [
          45.153,
          932.864
        ],
        [
          44.549,
          934.794
        ],
        [
          44.017,
          936.745
        ],
        [
          43.557,
          938.714
        ]
      ],
      "polylineImagePx": [
        [
          1169.757,
          1090.783
        ],
        [
          1168.223,
          1090.809
        ],
        [
          1166.691,
          1090.889
        ],
        [
          1165.163,
          1091.021
        ],
        [
          1163.641,
          1091.206
        ],
        [
          1162.125,
          1091.443
        ],
        [
          1160.619,
          1091.733
        ],
        [
          1159.124,
          1092.074
        ],
        [
          1157.641,
          1092.466
        ],
        [
          1156.173,
          1092.91
        ],
        [
          1154.721,
          1093.404
        ],
        [
          1153.287,
          1093.948
        ],
        [
          1151.872,
          1094.541
        ],
        [
          1150.479,
          1095.182
        ],
        [
          1149.109,
          1095.871
        ],
        [
          1147.763,
          1096.607
        ],
        [
          1146.444,
          1097.389
        ],
        [
          1145.152,
          1098.216
        ],
        [
          1143.89,
          1099.087
        ],
        [
          1142.686,
          1100.037
        ],
        [
          1141.852,
          1100.762
        ],
        [
          1141.017,
          1101.482
        ],
        [
          1140.209,
          1102.232
        ],
        [
          1139.429,
          1103.012
        ],
        [
          1138.678,
          1103.821
        ],
        [
          1137.959,
          1104.656
        ],
        [
          1137.27,
          1105.518
        ],
        [
          1136.614,
          1106.405
        ],
        [
          1135.991,
          1107.315
        ],
        [
          1135.403,
          1108.248
        ],
        [
          1134.849,
          1109.201
        ],
        [
          1134.332,
          1110.175
        ],
        [
          1133.85,
          1111.167
        ],
        [
          1133.406,
          1112.177
        ],
        [
          1132.999,
          1113.202
        ],
        [
          1132.631,
          1114.242
        ],
        [
          1132.301,
          1115.294
        ],
        [
          1132.011,
          1116.358
        ],
        [
          1131.76,
          1117.432
        ]
      ]
    },
    {
      "id": "middle-bottom:wpbsa-param:drop-judge",
      "name": "middle-bottom drop judge",
      "areaId": "middle-bottom",
      "boundaryType": "dropJudge",
      "boundaryTypeName": "落袋判定区",
      "tool": "parametricPolyline",
      "toolName": "参数化多段线",
      "source": "wpbsa-2005-6-parametric-candidate",
      "outputPointCount": 20,
      "polylineTableMm": [
        [
          -50.338,
          921.703
        ],
        [
          -47.355,
          915.657
        ],
        [
          -43.65,
          910.025
        ],
        [
          -39.279,
          904.894
        ],
        [
          -34.308,
          900.34
        ],
        [
          -28.814,
          896.434
        ],
        [
          -22.88,
          893.235
        ],
        [
          -16.597,
          890.792
        ],
        [
          -10.06,
          889.142
        ],
        [
          -3.371,
          888.311
        ],
        [
          3.371,
          888.311
        ],
        [
          10.06,
          889.142
        ],
        [
          16.597,
          890.792
        ],
        [
          22.88,
          893.235
        ],
        [
          28.814,
          896.434
        ],
        [
          34.308,
          900.34
        ],
        [
          39.279,
          904.894
        ],
        [
          43.65,
          910.025
        ],
        [
          47.355,
          915.657
        ],
        [
          50.338,
          921.703
        ]
      ],
      "polylineImagePx": [
        [
          1080.54,
          1108.154
        ],
        [
          1082.168,
          1104.858
        ],
        [
          1084.189,
          1101.786
        ],
        [
          1086.573,
          1098.988
        ],
        [
          1089.285,
          1096.504
        ],
        [
          1092.282,
          1094.374
        ],
        [
          1095.519,
          1092.63
        ],
        [
          1098.946,
          1091.297
        ],
        [
          1102.512,
          1090.398
        ],
        [
          1106.161,
          1089.944
        ],
        [
          1109.839,
          1089.944
        ],
        [
          1113.488,
          1090.398
        ],
        [
          1117.054,
          1091.297
        ],
        [
          1120.481,
          1092.63
        ],
        [
          1123.718,
          1094.374
        ],
        [
          1126.715,
          1096.504
        ],
        [
          1129.427,
          1098.988
        ],
        [
          1131.811,
          1101.786
        ],
        [
          1133.832,
          1104.858
        ],
        [
          1135.46,
          1108.154
        ]
      ]
    },
    {
      "id": "corner-top-right:wpbsa-param:left-pocket-rail",
      "name": "corner-top-right mirrored pocket rail",
      "areaId": "corner-top-right",
      "boundaryType": "pocketRail",
      "boundaryTypeName": "袋口库边区",
      "tool": "parametricPolyline",
      "toolName": "参数化多段线",
      "source": "wpbsa-2005-6-parametric-candidate",
      "outputPointCount": 40,
      "polylineTableMm": [
        [
          1786.491,
          -800.067
        ],
        [
          1786.517,
          -802.058
        ],
        [
          1786.596,
          -804.048
        ],
        [
          1786.726,
          -806.035
        ],
        [
          1786.909,
          -808.017
        ],
        [
          1787.144,
          -809.995
        ],
        [
          1787.431,
          -811.965
        ],
        [
          1787.769,
          -813.927
        ],
        [
          1788.159,
          -815.88
        ],
        [
          1788.6,
          -817.822
        ],
        [
          1789.092,
          -819.751
        ],
        [
          1789.635,
          -821.667
        ],
        [
          1790.227,
          -823.568
        ],
        [
          1790.87,
          -825.453
        ],
        [
          1791.562,
          -827.32
        ],
        [
          1792.302,
          -829.168
        ],
        [
          1793.091,
          -830.997
        ],
        [
          1793.928,
          -832.803
        ],
        [
          1794.811,
          -834.588
        ],
        [
          1795.742,
          -836.348
        ],
        [
          1796.652,
          -837.801
        ],
        [
          1797.505,
          -839.284
        ],
        [
          1798.38,
          -840.754
        ],
        [
          1799.278,
          -842.211
        ],
        [
          1800.197,
          -843.654
        ],
        [
          1801.138,
          -845.083
        ],
        [
          1802.1,
          -846.498
        ],
        [
          1803.083,
          -847.898
        ],
        [
          1804.087,
          -849.284
        ],
        [
          1805.112,
          -850.654
        ],
        [
          1806.158,
          -852.008
        ],
        [
          1807.224,
          -853.347
        ],
        [
          1808.31,
          -854.669
        ],
        [
          1809.415,
          -855.975
        ],
        [
          1810.54,
          -857.264
        ],
        [
          1811.685,
          -858.536
        ],
        [
          1812.848,
          -859.79
        ],
        [
          1814.031,
          -861.027
        ],
        [
          1815.231,
          -862.246
        ],
        [
          1833.844,
          -880.859
        ]
      ],
      "polylineImagePx": [
        [
          2082.533,
          169.18
        ],
        [
          2082.547,
          168.094
        ],
        [
          2082.59,
          167.009
        ],
        [
          2082.661,
          165.926
        ],
        [
          2082.761,
          164.844
        ],
        [
          2082.889,
          163.766
        ],
        [
          2083.046,
          162.691
        ],
        [
          2083.23,
          161.621
        ],
        [
          2083.443,
          160.556
        ],
        [
          2083.684,
          159.497
        ],
        [
          2083.952,
          158.445
        ],
        [
          2084.248,
          157.4
        ],
        [
          2084.571,
          156.364
        ],
        [
          2084.922,
          155.336
        ],
        [
          2085.299,
          154.318
        ],
        [
          2085.703,
          153.31
        ],
        [
          2086.133,
          152.313
        ],
        [
          2086.59,
          151.327
        ],
        [
          2087.072,
          150.354
        ],
        [
          2087.579,
          149.394
        ],
        [
          2088.076,
          148.602
        ],
        [
          2088.541,
          147.793
        ],
        [
          2089.019,
          146.991
        ],
        [
          2089.508,
          146.197
        ],
        [
          2090.009,
          145.41
        ],
        [
          2090.523,
          144.63
        ],
        [
          2091.048,
          143.859
        ],
        [
          2091.584,
          143.095
        ],
        [
          2092.132,
          142.34
        ],
        [
          2092.691,
          141.592
        ],
        [
          2093.261,
          140.854
        ],
        [
          2093.843,
          140.124
        ],
        [
          2094.435,
          139.403
        ],
        [
          2095.038,
          138.691
        ],
        [
          2095.652,
          137.988
        ],
        [
          2096.276,
          137.294
        ],
        [
          2096.911,
          136.61
        ],
        [
          2097.556,
          135.935
        ],
        [
          2098.211,
          135.27
        ],
        [
          2108.364,
          125.12
        ]
      ]
    },
    {
      "id": "corner-top-right:wpbsa-param:right-pocket-rail",
      "name": "corner-top-right pocket rail",
      "areaId": "corner-top-right",
      "boundaryType": "pocketRail",
      "boundaryTypeName": "袋口库边区",
      "tool": "parametricPolyline",
      "toolName": "参数化多段线",
      "source": "wpbsa-2005-6-parametric-candidate",
      "outputPointCount": 40,
      "polylineTableMm": [
        [
          1696.706,
          -889.849
        ],
        [
          1698.697,
          -889.875
        ],
        [
          1700.687,
          -889.954
        ],
        [
          1702.674,
          -890.084
        ],
        [
          1704.656,
          -890.267
        ],
        [
          1706.634,
          -890.502
        ],
        [
          1708.604,
          -890.789
        ],
        [
          1710.566,
          -891.128
        ],
        [
          1712.519,
          -891.518
        ],
        [
          1714.461,
          -891.959
        ],
        [
          1716.39,
          -892.451
        ],
        [
          1718.306,
          -892.994
        ],
        [
          1720.207,
          -893.586
        ],
        [
          1722.092,
          -894.229
        ],
        [
          1723.959,
          -894.92
        ],
        [
          1725.807,
          -895.661
        ],
        [
          1727.635,
          -896.45
        ],
        [
          1729.442,
          -897.287
        ],
        [
          1731.226,
          -898.171
        ],
        [
          1732.987,
          -899.101
        ],
        [
          1734.439,
          -900.011
        ],
        [
          1735.922,
          -900.864
        ],
        [
          1737.393,
          -901.74
        ],
        [
          1738.85,
          -902.637
        ],
        [
          1740.293,
          -903.556
        ],
        [
          1741.722,
          -904.497
        ],
        [
          1743.137,
          -905.459
        ],
        [
          1744.537,
          -906.443
        ],
        [
          1745.922,
          -907.447
        ],
        [
          1747.292,
          -908.472
        ],
        [
          1748.646,
          -909.518
        ],
        [
          1749.985,
          -910.584
        ],
        [
          1751.307,
          -911.669
        ],
        [
          1752.613,
          -912.775
        ],
        [
          1753.902,
          -913.9
        ],
        [
          1755.174,
          -915.045
        ],
        [
          1756.428,
          -916.208
        ],
        [
          1757.665,
          -917.391
        ],
        [
          1758.884,
          -918.591
        ],
        [
          1777.497,
          -937.205
        ]
      ],
      "polylineImagePx": [
        [
          2033.555,
          120.217
        ],
        [
          2034.641,
          120.203
        ],
        [
          2035.727,
          120.16
        ],
        [
          2036.81,
          120.089
        ],
        [
          2037.892,
          119.989
        ],
        [
          2038.971,
          119.861
        ],
        [
          2040.046,
          119.704
        ],
        [
          2041.116,
          119.52
        ],
        [
          2042.181,
          119.307
        ],
        [
          2043.24,
          119.066
        ],
        [
          2044.293,
          118.798
        ],
        [
          2045.338,
          118.502
        ],
        [
          2046.375,
          118.179
        ],
        [
          2047.403,
          117.829
        ],
        [
          2048.422,
          117.451
        ],
        [
          2049.43,
          117.047
        ],
        [
          2050.427,
          116.617
        ],
        [
          2051.413,
          116.161
        ],
        [
          2052.386,
          115.679
        ],
        [
          2053.346,
          115.171
        ],
        [
          2054.139,
          114.675
        ],
        [
          2054.948,
          114.21
        ],
        [
          2055.75,
          113.732
        ],
        [
          2056.544,
          113.243
        ],
        [
          2057.332,
          112.742
        ],
        [
          2058.111,
          112.229
        ],
        [
          2058.883,
          111.704
        ],
        [
          2059.647,
          111.168
        ],
        [
          2060.403,
          110.62
        ],
        [
          2061.15,
          110.061
        ],
        [
          2061.889,
          109.491
        ],
        [
          2062.619,
          108.909
        ],
        [
          2063.34,
          108.317
        ],
        [
          2064.052,
          107.714
        ],
        [
          2064.756,
          107.101
        ],
        [
          2065.449,
          106.476
        ],
        [
          2066.134,
          105.842
        ],
        [
          2066.808,
          105.197
        ],
        [
          2067.473,
          104.542
        ],
        [
          2077.627,
          94.392
        ]
      ]
    },
    {
      "id": "corner-top-right:wpbsa-param:drop-judge",
      "name": "corner-top-right drop judge",
      "areaId": "corner-top-right",
      "boundaryType": "dropJudge",
      "boundaryTypeName": "落袋判定区",
      "tool": "parametricPolyline",
      "toolName": "参数化多段线",
      "source": "wpbsa-2005-6-parametric-candidate",
      "outputPointCount": 20,
      "polylineTableMm": [
        [
          1749.641,
          -910.306
        ],
        [
          1751.094,
          -906.121
        ],
        [
          1752.756,
          -902.014
        ],
        [
          1754.621,
          -897.995
        ],
        [
          1756.685,
          -894.075
        ],
        [
          1758.943,
          -890.263
        ],
        [
          1761.389,
          -886.569
        ],
        [
          1764.017,
          -883.002
        ],
        [
          1766.821,
          -879.572
        ],
        [
          1769.793,
          -876.286
        ],
        [
          1772.926,
          -873.153
        ],
        [
          1776.212,
          -870.182
        ],
        [
          1779.642,
          -867.378
        ],
        [
          1783.209,
          -864.75
        ],
        [
          1786.903,
          -862.304
        ],
        [
          1790.715,
          -860.046
        ],
        [
          1794.635,
          -857.982
        ],
        [
          1798.654,
          -856.117
        ],
        [
          1802.761,
          -854.456
        ],
        [
          1806.946,
          -853.002
        ]
      ],
      "polylineImagePx": [
        [
          2062.431,
          109.061
        ],
        [
          2063.224,
          111.343
        ],
        [
          2064.13,
          113.583
        ],
        [
          2065.148,
          115.775
        ],
        [
          2066.274,
          117.912
        ],
        [
          2067.505,
          119.991
        ],
        [
          2068.84,
          122.006
        ],
        [
          2070.274,
          123.951
        ],
        [
          2071.803,
          125.822
        ],
        [
          2073.424,
          127.614
        ],
        [
          2075.133,
          129.322
        ],
        [
          2076.926,
          130.943
        ],
        [
          2078.797,
          132.472
        ],
        [
          2080.743,
          133.905
        ],
        [
          2082.758,
          135.239
        ],
        [
          2084.837,
          136.47
        ],
        [
          2086.976,
          137.596
        ],
        [
          2089.168,
          138.613
        ],
        [
          2091.408,
          139.519
        ],
        [
          2093.691,
          140.312
        ]
      ]
    },
    {
      "id": "corner-bottom-right:wpbsa-param:left-pocket-rail",
      "name": "corner-bottom-right mirrored pocket rail",
      "areaId": "corner-bottom-right",
      "boundaryType": "pocketRail",
      "boundaryTypeName": "袋口库边区",
      "tool": "parametricPolyline",
      "toolName": "参数化多段线",
      "source": "wpbsa-2005-6-parametric-candidate",
      "outputPointCount": 40,
      "polylineTableMm": [
        [
          1786.491,
          800.067
        ],
        [
          1786.517,
          802.058
        ],
        [
          1786.596,
          804.048
        ],
        [
          1786.726,
          806.035
        ],
        [
          1786.909,
          808.017
        ],
        [
          1787.144,
          809.995
        ],
        [
          1787.431,
          811.965
        ],
        [
          1787.769,
          813.927
        ],
        [
          1788.159,
          815.88
        ],
        [
          1788.6,
          817.822
        ],
        [
          1789.092,
          819.751
        ],
        [
          1789.635,
          821.667
        ],
        [
          1790.227,
          823.568
        ],
        [
          1790.87,
          825.453
        ],
        [
          1791.562,
          827.32
        ],
        [
          1792.302,
          829.168
        ],
        [
          1793.091,
          830.997
        ],
        [
          1793.928,
          832.803
        ],
        [
          1794.811,
          834.588
        ],
        [
          1795.742,
          836.348
        ],
        [
          1796.652,
          837.801
        ],
        [
          1797.505,
          839.284
        ],
        [
          1798.38,
          840.754
        ],
        [
          1799.278,
          842.211
        ],
        [
          1800.197,
          843.654
        ],
        [
          1801.138,
          845.083
        ],
        [
          1802.1,
          846.498
        ],
        [
          1803.083,
          847.898
        ],
        [
          1804.087,
          849.284
        ],
        [
          1805.112,
          850.654
        ],
        [
          1806.158,
          852.008
        ],
        [
          1807.224,
          853.347
        ],
        [
          1808.31,
          854.669
        ],
        [
          1809.415,
          855.975
        ],
        [
          1810.54,
          857.264
        ],
        [
          1811.685,
          858.536
        ],
        [
          1812.848,
          859.79
        ],
        [
          1814.031,
          861.027
        ],
        [
          1815.231,
          862.246
        ],
        [
          1833.844,
          880.859
        ]
      ],
      "polylineImagePx": [
        [
          2082.533,
          1041.82
        ],
        [
          2082.547,
          1042.906
        ],
        [
          2082.59,
          1043.991
        ],
        [
          2082.661,
          1045.074
        ],
        [
          2082.761,
          1046.156
        ],
        [
          2082.889,
          1047.234
        ],
        [
          2083.046,
          1048.309
        ],
        [
          2083.23,
          1049.379
        ],
        [
          2083.443,
          1050.444
        ],
        [
          2083.684,
          1051.503
        ],
        [
          2083.952,
          1052.555
        ],
        [
          2084.248,
          1053.6
        ],
        [
          2084.571,
          1054.636
        ],
        [
          2084.922,
          1055.664
        ],
        [
          2085.299,
          1056.682
        ],
        [
          2085.703,
          1057.69
        ],
        [
          2086.133,
          1058.688
        ],
        [
          2086.59,
          1059.673
        ],
        [
          2087.072,
          1060.646
        ],
        [
          2087.579,
          1061.606
        ],
        [
          2088.076,
          1062.398
        ],
        [
          2088.541,
          1063.207
        ],
        [
          2089.019,
          1064.009
        ],
        [
          2089.508,
          1064.803
        ],
        [
          2090.009,
          1065.59
        ],
        [
          2090.523,
          1066.37
        ],
        [
          2091.048,
          1067.141
        ],
        [
          2091.584,
          1067.905
        ],
        [
          2092.132,
          1068.661
        ],
        [
          2092.691,
          1069.408
        ],
        [
          2093.261,
          1070.146
        ],
        [
          2093.843,
          1070.876
        ],
        [
          2094.435,
          1071.597
        ],
        [
          2095.038,
          1072.31
        ],
        [
          2095.652,
          1073.012
        ],
        [
          2096.276,
          1073.706
        ],
        [
          2096.911,
          1074.39
        ],
        [
          2097.556,
          1075.065
        ],
        [
          2098.211,
          1075.73
        ],
        [
          2108.364,
          1085.88
        ]
      ]
    },
    {
      "id": "corner-bottom-right:wpbsa-param:right-pocket-rail",
      "name": "corner-bottom-right pocket rail",
      "areaId": "corner-bottom-right",
      "boundaryType": "pocketRail",
      "boundaryTypeName": "袋口库边区",
      "tool": "parametricPolyline",
      "toolName": "参数化多段线",
      "source": "wpbsa-2005-6-parametric-candidate",
      "outputPointCount": 40,
      "polylineTableMm": [
        [
          1696.706,
          889.849
        ],
        [
          1698.697,
          889.875
        ],
        [
          1700.687,
          889.954
        ],
        [
          1702.674,
          890.084
        ],
        [
          1704.656,
          890.267
        ],
        [
          1706.634,
          890.502
        ],
        [
          1708.604,
          890.789
        ],
        [
          1710.566,
          891.128
        ],
        [
          1712.519,
          891.518
        ],
        [
          1714.461,
          891.959
        ],
        [
          1716.39,
          892.451
        ],
        [
          1718.306,
          892.994
        ],
        [
          1720.207,
          893.586
        ],
        [
          1722.092,
          894.229
        ],
        [
          1723.959,
          894.92
        ],
        [
          1725.807,
          895.661
        ],
        [
          1727.635,
          896.45
        ],
        [
          1729.442,
          897.287
        ],
        [
          1731.226,
          898.171
        ],
        [
          1732.987,
          899.101
        ],
        [
          1734.439,
          900.011
        ],
        [
          1735.922,
          900.864
        ],
        [
          1737.393,
          901.74
        ],
        [
          1738.85,
          902.637
        ],
        [
          1740.293,
          903.556
        ],
        [
          1741.722,
          904.497
        ],
        [
          1743.137,
          905.459
        ],
        [
          1744.537,
          906.443
        ],
        [
          1745.922,
          907.447
        ],
        [
          1747.292,
          908.472
        ],
        [
          1748.646,
          909.518
        ],
        [
          1749.985,
          910.584
        ],
        [
          1751.307,
          911.669
        ],
        [
          1752.613,
          912.775
        ],
        [
          1753.902,
          913.9
        ],
        [
          1755.174,
          915.045
        ],
        [
          1756.428,
          916.208
        ],
        [
          1757.665,
          917.391
        ],
        [
          1758.884,
          918.591
        ],
        [
          1777.497,
          937.205
        ]
      ],
      "polylineImagePx": [
        [
          2033.555,
          1090.783
        ],
        [
          2034.641,
          1090.797
        ],
        [
          2035.727,
          1090.84
        ],
        [
          2036.81,
          1090.911
        ],
        [
          2037.892,
          1091.011
        ],
        [
          2038.971,
          1091.139
        ],
        [
          2040.046,
          1091.296
        ],
        [
          2041.116,
          1091.48
        ],
        [
          2042.181,
          1091.693
        ],
        [
          2043.24,
          1091.934
        ],
        [
          2044.293,
          1092.202
        ],
        [
          2045.338,
          1092.498
        ],
        [
          2046.375,
          1092.821
        ],
        [
          2047.403,
          1093.171
        ],
        [
          2048.422,
          1093.549
        ],
        [
          2049.43,
          1093.953
        ],
        [
          2050.427,
          1094.383
        ],
        [
          2051.413,
          1094.839
        ],
        [
          2052.386,
          1095.321
        ],
        [
          2053.346,
          1095.829
        ],
        [
          2054.139,
          1096.325
        ],
        [
          2054.948,
          1096.79
        ],
        [
          2055.75,
          1097.268
        ],
        [
          2056.544,
          1097.757
        ],
        [
          2057.332,
          1098.258
        ],
        [
          2058.111,
          1098.771
        ],
        [
          2058.883,
          1099.296
        ],
        [
          2059.647,
          1099.832
        ],
        [
          2060.403,
          1100.38
        ],
        [
          2061.15,
          1100.939
        ],
        [
          2061.889,
          1101.509
        ],
        [
          2062.619,
          1102.091
        ],
        [
          2063.34,
          1102.683
        ],
        [
          2064.052,
          1103.286
        ],
        [
          2064.756,
          1103.899
        ],
        [
          2065.449,
          1104.524
        ],
        [
          2066.134,
          1105.158
        ],
        [
          2066.808,
          1105.803
        ],
        [
          2067.473,
          1106.458
        ],
        [
          2077.627,
          1116.609
        ]
      ]
    },
    {
      "id": "corner-bottom-right:wpbsa-param:drop-judge",
      "name": "corner-bottom-right drop judge",
      "areaId": "corner-bottom-right",
      "boundaryType": "dropJudge",
      "boundaryTypeName": "落袋判定区",
      "tool": "parametricPolyline",
      "toolName": "参数化多段线",
      "source": "wpbsa-2005-6-parametric-candidate",
      "outputPointCount": 20,
      "polylineTableMm": [
        [
          1749.641,
          910.306
        ],
        [
          1751.094,
          906.121
        ],
        [
          1752.756,
          902.014
        ],
        [
          1754.621,
          897.995
        ],
        [
          1756.685,
          894.075
        ],
        [
          1758.943,
          890.263
        ],
        [
          1761.389,
          886.569
        ],
        [
          1764.017,
          883.002
        ],
        [
          1766.821,
          879.572
        ],
        [
          1769.793,
          876.286
        ],
        [
          1772.926,
          873.153
        ],
        [
          1776.212,
          870.182
        ],
        [
          1779.642,
          867.378
        ],
        [
          1783.209,
          864.75
        ],
        [
          1786.903,
          862.304
        ],
        [
          1790.715,
          860.046
        ],
        [
          1794.635,
          857.982
        ],
        [
          1798.654,
          856.117
        ],
        [
          1802.761,
          854.456
        ],
        [
          1806.946,
          853.002
        ]
      ],
      "polylineImagePx": [
        [
          2062.431,
          1101.939
        ],
        [
          2063.224,
          1099.657
        ],
        [
          2064.13,
          1097.417
        ],
        [
          2065.148,
          1095.226
        ],
        [
          2066.274,
          1093.088
        ],
        [
          2067.505,
          1091.009
        ],
        [
          2068.84,
          1088.994
        ],
        [
          2070.274,
          1087.049
        ],
        [
          2071.803,
          1085.178
        ],
        [
          2073.424,
          1083.386
        ],
        [
          2075.133,
          1081.678
        ],
        [
          2076.926,
          1080.057
        ],
        [
          2078.797,
          1078.528
        ],
        [
          2080.743,
          1077.095
        ],
        [
          2082.758,
          1075.761
        ],
        [
          2084.837,
          1074.53
        ],
        [
          2086.976,
          1073.404
        ],
        [
          2089.168,
          1072.387
        ],
        [
          2091.408,
          1071.481
        ],
        [
          2093.691,
          1070.689
        ]
      ]
    },
    {
      "id": "corner-bottom-left:wpbsa-param:left-pocket-rail",
      "name": "corner-bottom-left mirrored pocket rail",
      "areaId": "corner-bottom-left",
      "boundaryType": "pocketRail",
      "boundaryTypeName": "袋口库边区",
      "tool": "parametricPolyline",
      "toolName": "参数化多段线",
      "source": "wpbsa-2005-6-parametric-candidate",
      "outputPointCount": 40,
      "polylineTableMm": [
        [
          -1786.491,
          800.067
        ],
        [
          -1786.517,
          802.058
        ],
        [
          -1786.596,
          804.048
        ],
        [
          -1786.726,
          806.035
        ],
        [
          -1786.909,
          808.017
        ],
        [
          -1787.144,
          809.995
        ],
        [
          -1787.431,
          811.965
        ],
        [
          -1787.769,
          813.927
        ],
        [
          -1788.159,
          815.88
        ],
        [
          -1788.6,
          817.822
        ],
        [
          -1789.092,
          819.751
        ],
        [
          -1789.635,
          821.667
        ],
        [
          -1790.227,
          823.568
        ],
        [
          -1790.87,
          825.453
        ],
        [
          -1791.562,
          827.32
        ],
        [
          -1792.302,
          829.168
        ],
        [
          -1793.091,
          830.997
        ],
        [
          -1793.928,
          832.803
        ],
        [
          -1794.811,
          834.588
        ],
        [
          -1795.742,
          836.348
        ],
        [
          -1796.652,
          837.801
        ],
        [
          -1797.505,
          839.284
        ],
        [
          -1798.38,
          840.754
        ],
        [
          -1799.278,
          842.211
        ],
        [
          -1800.197,
          843.654
        ],
        [
          -1801.138,
          845.083
        ],
        [
          -1802.1,
          846.498
        ],
        [
          -1803.083,
          847.898
        ],
        [
          -1804.087,
          849.284
        ],
        [
          -1805.112,
          850.654
        ],
        [
          -1806.158,
          852.008
        ],
        [
          -1807.224,
          853.347
        ],
        [
          -1808.31,
          854.669
        ],
        [
          -1809.415,
          855.975
        ],
        [
          -1810.54,
          857.264
        ],
        [
          -1811.685,
          858.536
        ],
        [
          -1812.848,
          859.79
        ],
        [
          -1814.031,
          861.027
        ],
        [
          -1815.231,
          862.246
        ],
        [
          -1833.844,
          880.859
        ]
      ],
      "polylineImagePx": [
        [
          133.467,
          1041.82
        ],
        [
          133.453,
          1042.906
        ],
        [
          133.41,
          1043.991
        ],
        [
          133.339,
          1045.074
        ],
        [
          133.239,
          1046.156
        ],
        [
          133.111,
          1047.234
        ],
        [
          132.954,
          1048.309
        ],
        [
          132.77,
          1049.379
        ],
        [
          132.557,
          1050.444
        ],
        [
          132.316,
          1051.503
        ],
        [
          132.048,
          1052.555
        ],
        [
          131.752,
          1053.6
        ],
        [
          131.429,
          1054.636
        ],
        [
          131.078,
          1055.664
        ],
        [
          130.701,
          1056.682
        ],
        [
          130.297,
          1057.69
        ],
        [
          129.867,
          1058.688
        ],
        [
          129.41,
          1059.673
        ],
        [
          128.928,
          1060.646
        ],
        [
          128.421,
          1061.606
        ],
        [
          127.924,
          1062.398
        ],
        [
          127.459,
          1063.207
        ],
        [
          126.981,
          1064.009
        ],
        [
          126.492,
          1064.803
        ],
        [
          125.99,
          1065.59
        ],
        [
          125.477,
          1066.37
        ],
        [
          124.952,
          1067.141
        ],
        [
          124.416,
          1067.905
        ],
        [
          123.868,
          1068.661
        ],
        [
          123.309,
          1069.408
        ],
        [
          122.739,
          1070.146
        ],
        [
          122.157,
          1070.876
        ],
        [
          121.565,
          1071.597
        ],
        [
          120.962,
          1072.31
        ],
        [
          120.348,
          1073.012
        ],
        [
          119.724,
          1073.706
        ],
        [
          119.089,
          1074.39
        ],
        [
          118.444,
          1075.065
        ],
        [
          117.789,
          1075.73
        ],
        [
          107.636,
          1085.88
        ]
      ]
    },
    {
      "id": "corner-bottom-left:wpbsa-param:right-pocket-rail",
      "name": "corner-bottom-left pocket rail",
      "areaId": "corner-bottom-left",
      "boundaryType": "pocketRail",
      "boundaryTypeName": "袋口库边区",
      "tool": "parametricPolyline",
      "toolName": "参数化多段线",
      "source": "wpbsa-2005-6-parametric-candidate",
      "outputPointCount": 40,
      "polylineTableMm": [
        [
          -1696.706,
          889.849
        ],
        [
          -1698.697,
          889.875
        ],
        [
          -1700.687,
          889.954
        ],
        [
          -1702.674,
          890.084
        ],
        [
          -1704.656,
          890.267
        ],
        [
          -1706.634,
          890.502
        ],
        [
          -1708.604,
          890.789
        ],
        [
          -1710.566,
          891.128
        ],
        [
          -1712.519,
          891.518
        ],
        [
          -1714.461,
          891.959
        ],
        [
          -1716.39,
          892.451
        ],
        [
          -1718.306,
          892.994
        ],
        [
          -1720.207,
          893.586
        ],
        [
          -1722.092,
          894.229
        ],
        [
          -1723.959,
          894.92
        ],
        [
          -1725.807,
          895.661
        ],
        [
          -1727.635,
          896.45
        ],
        [
          -1729.442,
          897.287
        ],
        [
          -1731.226,
          898.171
        ],
        [
          -1732.987,
          899.101
        ],
        [
          -1734.439,
          900.011
        ],
        [
          -1735.922,
          900.864
        ],
        [
          -1737.393,
          901.74
        ],
        [
          -1738.85,
          902.637
        ],
        [
          -1740.293,
          903.556
        ],
        [
          -1741.722,
          904.497
        ],
        [
          -1743.137,
          905.459
        ],
        [
          -1744.537,
          906.443
        ],
        [
          -1745.922,
          907.447
        ],
        [
          -1747.292,
          908.472
        ],
        [
          -1748.646,
          909.518
        ],
        [
          -1749.985,
          910.584
        ],
        [
          -1751.307,
          911.669
        ],
        [
          -1752.613,
          912.775
        ],
        [
          -1753.902,
          913.9
        ],
        [
          -1755.174,
          915.045
        ],
        [
          -1756.428,
          916.208
        ],
        [
          -1757.665,
          917.391
        ],
        [
          -1758.884,
          918.591
        ],
        [
          -1777.497,
          937.205
        ]
      ],
      "polylineImagePx": [
        [
          182.445,
          1090.783
        ],
        [
          181.359,
          1090.797
        ],
        [
          180.273,
          1090.84
        ],
        [
          179.19,
          1090.911
        ],
        [
          178.108,
          1091.011
        ],
        [
          177.029,
          1091.139
        ],
        [
          175.954,
          1091.296
        ],
        [
          174.884,
          1091.48
        ],
        [
          173.819,
          1091.693
        ],
        [
          172.76,
          1091.934
        ],
        [
          171.707,
          1092.202
        ],
        [
          170.662,
          1092.498
        ],
        [
          169.625,
          1092.821
        ],
        [
          168.597,
          1093.171
        ],
        [
          167.578,
          1093.549
        ],
        [
          166.57,
          1093.953
        ],
        [
          165.573,
          1094.383
        ],
        [
          164.587,
          1094.839
        ],
        [
          163.614,
          1095.321
        ],
        [
          162.654,
          1095.829
        ],
        [
          161.861,
          1096.325
        ],
        [
          161.052,
          1096.79
        ],
        [
          160.25,
          1097.268
        ],
        [
          159.456,
          1097.757
        ],
        [
          158.668,
          1098.258
        ],
        [
          157.889,
          1098.771
        ],
        [
          157.117,
          1099.296
        ],
        [
          156.353,
          1099.832
        ],
        [
          155.597,
          1100.38
        ],
        [
          154.85,
          1100.939
        ],
        [
          154.111,
          1101.509
        ],
        [
          153.381,
          1102.091
        ],
        [
          152.66,
          1102.683
        ],
        [
          151.948,
          1103.286
        ],
        [
          151.244,
          1103.899
        ],
        [
          150.551,
          1104.524
        ],
        [
          149.866,
          1105.158
        ],
        [
          149.191,
          1105.803
        ],
        [
          148.527,
          1106.458
        ],
        [
          138.373,
          1116.609
        ]
      ]
    },
    {
      "id": "corner-bottom-left:wpbsa-param:drop-judge",
      "name": "corner-bottom-left drop judge",
      "areaId": "corner-bottom-left",
      "boundaryType": "dropJudge",
      "boundaryTypeName": "落袋判定区",
      "tool": "parametricPolyline",
      "toolName": "参数化多段线",
      "source": "wpbsa-2005-6-parametric-candidate",
      "outputPointCount": 20,
      "polylineTableMm": [
        [
          -1749.641,
          910.306
        ],
        [
          -1751.094,
          906.121
        ],
        [
          -1752.756,
          902.014
        ],
        [
          -1754.621,
          897.995
        ],
        [
          -1756.685,
          894.075
        ],
        [
          -1758.943,
          890.263
        ],
        [
          -1761.389,
          886.569
        ],
        [
          -1764.017,
          883.002
        ],
        [
          -1766.821,
          879.572
        ],
        [
          -1769.793,
          876.286
        ],
        [
          -1772.926,
          873.153
        ],
        [
          -1776.212,
          870.182
        ],
        [
          -1779.642,
          867.378
        ],
        [
          -1783.209,
          864.75
        ],
        [
          -1786.903,
          862.304
        ],
        [
          -1790.715,
          860.046
        ],
        [
          -1794.635,
          857.982
        ],
        [
          -1798.654,
          856.117
        ],
        [
          -1802.761,
          854.456
        ],
        [
          -1806.946,
          853.002
        ]
      ],
      "polylineImagePx": [
        [
          153.569,
          1101.939
        ],
        [
          152.776,
          1099.657
        ],
        [
          151.87,
          1097.417
        ],
        [
          150.852,
          1095.226
        ],
        [
          149.726,
          1093.088
        ],
        [
          148.495,
          1091.009
        ],
        [
          147.16,
          1088.994
        ],
        [
          145.726,
          1087.049
        ],
        [
          144.197,
          1085.178
        ],
        [
          142.576,
          1083.386
        ],
        [
          140.867,
          1081.678
        ],
        [
          139.074,
          1080.057
        ],
        [
          137.203,
          1078.528
        ],
        [
          135.257,
          1077.095
        ],
        [
          133.242,
          1075.761
        ],
        [
          131.163,
          1074.53
        ],
        [
          129.024,
          1073.404
        ],
        [
          126.832,
          1072.387
        ],
        [
          124.592,
          1071.481
        ],
        [
          122.309,
          1070.689
        ]
      ]
    },
    {
      "id": "corner-top-left:wpbsa-param:left-pocket-rail",
      "name": "corner-top-left mirrored pocket rail",
      "areaId": "corner-top-left",
      "boundaryType": "pocketRail",
      "boundaryTypeName": "袋口库边区",
      "tool": "parametricPolyline",
      "toolName": "参数化多段线",
      "source": "wpbsa-2005-6-parametric-candidate",
      "outputPointCount": 40,
      "polylineTableMm": [
        [
          -1786.491,
          -800.067
        ],
        [
          -1786.517,
          -802.058
        ],
        [
          -1786.596,
          -804.048
        ],
        [
          -1786.726,
          -806.035
        ],
        [
          -1786.909,
          -808.017
        ],
        [
          -1787.144,
          -809.995
        ],
        [
          -1787.431,
          -811.965
        ],
        [
          -1787.769,
          -813.927
        ],
        [
          -1788.159,
          -815.88
        ],
        [
          -1788.6,
          -817.822
        ],
        [
          -1789.092,
          -819.751
        ],
        [
          -1789.635,
          -821.667
        ],
        [
          -1790.227,
          -823.568
        ],
        [
          -1790.87,
          -825.453
        ],
        [
          -1791.562,
          -827.32
        ],
        [
          -1792.302,
          -829.168
        ],
        [
          -1793.091,
          -830.997
        ],
        [
          -1793.928,
          -832.803
        ],
        [
          -1794.811,
          -834.588
        ],
        [
          -1795.742,
          -836.348
        ],
        [
          -1796.652,
          -837.801
        ],
        [
          -1797.505,
          -839.284
        ],
        [
          -1798.38,
          -840.754
        ],
        [
          -1799.278,
          -842.211
        ],
        [
          -1800.197,
          -843.654
        ],
        [
          -1801.138,
          -845.083
        ],
        [
          -1802.1,
          -846.498
        ],
        [
          -1803.083,
          -847.898
        ],
        [
          -1804.087,
          -849.284
        ],
        [
          -1805.112,
          -850.654
        ],
        [
          -1806.158,
          -852.008
        ],
        [
          -1807.224,
          -853.347
        ],
        [
          -1808.31,
          -854.669
        ],
        [
          -1809.415,
          -855.975
        ],
        [
          -1810.54,
          -857.264
        ],
        [
          -1811.685,
          -858.536
        ],
        [
          -1812.848,
          -859.79
        ],
        [
          -1814.031,
          -861.027
        ],
        [
          -1815.231,
          -862.246
        ],
        [
          -1833.844,
          -880.859
        ]
      ],
      "polylineImagePx": [
        [
          133.467,
          169.18
        ],
        [
          133.453,
          168.094
        ],
        [
          133.41,
          167.009
        ],
        [
          133.339,
          165.926
        ],
        [
          133.239,
          164.844
        ],
        [
          133.111,
          163.766
        ],
        [
          132.954,
          162.691
        ],
        [
          132.77,
          161.621
        ],
        [
          132.557,
          160.556
        ],
        [
          132.316,
          159.497
        ],
        [
          132.048,
          158.445
        ],
        [
          131.752,
          157.4
        ],
        [
          131.429,
          156.364
        ],
        [
          131.078,
          155.336
        ],
        [
          130.701,
          154.318
        ],
        [
          130.297,
          153.31
        ],
        [
          129.867,
          152.313
        ],
        [
          129.41,
          151.327
        ],
        [
          128.928,
          150.354
        ],
        [
          128.421,
          149.394
        ],
        [
          127.924,
          148.602
        ],
        [
          127.459,
          147.793
        ],
        [
          126.981,
          146.991
        ],
        [
          126.492,
          146.197
        ],
        [
          125.99,
          145.41
        ],
        [
          125.477,
          144.63
        ],
        [
          124.952,
          143.859
        ],
        [
          124.416,
          143.095
        ],
        [
          123.868,
          142.34
        ],
        [
          123.309,
          141.592
        ],
        [
          122.739,
          140.854
        ],
        [
          122.157,
          140.124
        ],
        [
          121.565,
          139.403
        ],
        [
          120.962,
          138.691
        ],
        [
          120.348,
          137.988
        ],
        [
          119.724,
          137.294
        ],
        [
          119.089,
          136.61
        ],
        [
          118.444,
          135.935
        ],
        [
          117.789,
          135.27
        ],
        [
          107.636,
          125.12
        ]
      ]
    },
    {
      "id": "corner-top-left:wpbsa-param:right-pocket-rail",
      "name": "corner-top-left pocket rail",
      "areaId": "corner-top-left",
      "boundaryType": "pocketRail",
      "boundaryTypeName": "袋口库边区",
      "tool": "parametricPolyline",
      "toolName": "参数化多段线",
      "source": "wpbsa-2005-6-parametric-candidate",
      "outputPointCount": 40,
      "polylineTableMm": [
        [
          -1696.706,
          -889.849
        ],
        [
          -1698.697,
          -889.875
        ],
        [
          -1700.687,
          -889.954
        ],
        [
          -1702.674,
          -890.084
        ],
        [
          -1704.656,
          -890.267
        ],
        [
          -1706.634,
          -890.502
        ],
        [
          -1708.604,
          -890.789
        ],
        [
          -1710.566,
          -891.128
        ],
        [
          -1712.519,
          -891.518
        ],
        [
          -1714.461,
          -891.959
        ],
        [
          -1716.39,
          -892.451
        ],
        [
          -1718.306,
          -892.994
        ],
        [
          -1720.207,
          -893.586
        ],
        [
          -1722.092,
          -894.229
        ],
        [
          -1723.959,
          -894.92
        ],
        [
          -1725.807,
          -895.661
        ],
        [
          -1727.635,
          -896.45
        ],
        [
          -1729.442,
          -897.287
        ],
        [
          -1731.226,
          -898.171
        ],
        [
          -1732.987,
          -899.101
        ],
        [
          -1734.439,
          -900.011
        ],
        [
          -1735.922,
          -900.864
        ],
        [
          -1737.393,
          -901.74
        ],
        [
          -1738.85,
          -902.637
        ],
        [
          -1740.293,
          -903.556
        ],
        [
          -1741.722,
          -904.497
        ],
        [
          -1743.137,
          -905.459
        ],
        [
          -1744.537,
          -906.443
        ],
        [
          -1745.922,
          -907.447
        ],
        [
          -1747.292,
          -908.472
        ],
        [
          -1748.646,
          -909.518
        ],
        [
          -1749.985,
          -910.584
        ],
        [
          -1751.307,
          -911.669
        ],
        [
          -1752.613,
          -912.775
        ],
        [
          -1753.902,
          -913.9
        ],
        [
          -1755.174,
          -915.045
        ],
        [
          -1756.428,
          -916.208
        ],
        [
          -1757.665,
          -917.391
        ],
        [
          -1758.884,
          -918.591
        ],
        [
          -1777.497,
          -937.205
        ]
      ],
      "polylineImagePx": [
        [
          182.445,
          120.217
        ],
        [
          181.359,
          120.203
        ],
        [
          180.273,
          120.16
        ],
        [
          179.19,
          120.089
        ],
        [
          178.108,
          119.989
        ],
        [
          177.029,
          119.861
        ],
        [
          175.954,
          119.704
        ],
        [
          174.884,
          119.52
        ],
        [
          173.819,
          119.307
        ],
        [
          172.76,
          119.066
        ],
        [
          171.707,
          118.798
        ],
        [
          170.662,
          118.502
        ],
        [
          169.625,
          118.179
        ],
        [
          168.597,
          117.829
        ],
        [
          167.578,
          117.451
        ],
        [
          166.57,
          117.047
        ],
        [
          165.573,
          116.617
        ],
        [
          164.587,
          116.161
        ],
        [
          163.614,
          115.679
        ],
        [
          162.654,
          115.171
        ],
        [
          161.861,
          114.675
        ],
        [
          161.052,
          114.21
        ],
        [
          160.25,
          113.732
        ],
        [
          159.456,
          113.243
        ],
        [
          158.668,
          112.742
        ],
        [
          157.889,
          112.229
        ],
        [
          157.117,
          111.704
        ],
        [
          156.353,
          111.168
        ],
        [
          155.597,
          110.62
        ],
        [
          154.85,
          110.061
        ],
        [
          154.111,
          109.491
        ],
        [
          153.381,
          108.909
        ],
        [
          152.66,
          108.317
        ],
        [
          151.948,
          107.714
        ],
        [
          151.244,
          107.101
        ],
        [
          150.551,
          106.476
        ],
        [
          149.866,
          105.842
        ],
        [
          149.191,
          105.197
        ],
        [
          148.527,
          104.542
        ],
        [
          138.373,
          94.392
        ]
      ]
    },
    {
      "id": "corner-top-left:wpbsa-param:drop-judge",
      "name": "corner-top-left drop judge",
      "areaId": "corner-top-left",
      "boundaryType": "dropJudge",
      "boundaryTypeName": "落袋判定区",
      "tool": "parametricPolyline",
      "toolName": "参数化多段线",
      "source": "wpbsa-2005-6-parametric-candidate",
      "outputPointCount": 20,
      "polylineTableMm": [
        [
          -1749.641,
          -910.306
        ],
        [
          -1751.094,
          -906.121
        ],
        [
          -1752.756,
          -902.014
        ],
        [
          -1754.621,
          -897.995
        ],
        [
          -1756.685,
          -894.075
        ],
        [
          -1758.943,
          -890.263
        ],
        [
          -1761.389,
          -886.569
        ],
        [
          -1764.017,
          -883.002
        ],
        [
          -1766.821,
          -879.572
        ],
        [
          -1769.793,
          -876.286
        ],
        [
          -1772.926,
          -873.153
        ],
        [
          -1776.212,
          -870.182
        ],
        [
          -1779.642,
          -867.378
        ],
        [
          -1783.209,
          -864.75
        ],
        [
          -1786.903,
          -862.304
        ],
        [
          -1790.715,
          -860.046
        ],
        [
          -1794.635,
          -857.982
        ],
        [
          -1798.654,
          -856.117
        ],
        [
          -1802.761,
          -854.456
        ],
        [
          -1806.946,
          -853.002
        ]
      ],
      "polylineImagePx": [
        [
          153.569,
          109.061
        ],
        [
          152.776,
          111.343
        ],
        [
          151.87,
          113.583
        ],
        [
          150.852,
          115.775
        ],
        [
          149.726,
          117.912
        ],
        [
          148.495,
          119.991
        ],
        [
          147.16,
          122.006
        ],
        [
          145.726,
          123.951
        ],
        [
          144.197,
          125.822
        ],
        [
          142.576,
          127.614
        ],
        [
          140.867,
          129.322
        ],
        [
          139.074,
          130.943
        ],
        [
          137.203,
          132.472
        ],
        [
          135.257,
          133.905
        ],
        [
          133.242,
          135.239
        ],
        [
          131.163,
          136.47
        ],
        [
          129.024,
          137.596
        ],
        [
          126.832,
          138.613
        ],
        [
          124.592,
          139.519
        ],
        [
          122.309,
          140.312
        ]
      ]
    }
  ],
  "baseBoundaryId": "pro-match-84",
  "notes": [
    "Straight rails and black-hole circles are retained from the current hand-drawn boundary.",
    "Pocket rails and drop-judge edges are generated from WPBSA 2005/6 parametric arcs.",
    "Rubber/glue-edge boundary lines are intentionally omitted in this candidate."
  ],
  "parametricMetrics": {
    "arcPointCount": 20,
    "middle": {
      "computed_opening_in": 3.8630333358398308,
      "j_error_in": 0.006320049966819855,
      "k_x_in": 1.6713203375527703
    },
    "corner": {
      "computed_tangent_width_in": 3.3289994994423515,
      "r3_end_angle_deg": 118.61045966596524,
      "r45_start_angle_deg": 118.61045966596524
    }
  }
};

module.exports = {
  PRO_MATCH_84_FULL_PHYSICAL_BOUNDARIES: require('./calibratePhysicalBoundary')
    .calibratePhysicalBoundary(PRO_MATCH_84_FULL_PHYSICAL_BOUNDARIES),
};

}, {"./calibratePhysicalBoundary":11}, "apps/three-game/src/core/model/proMatch84FullPhysicalBoundaries.js"],
11: [function(require, module, exports) {
const { STANDARD_TABLE } = require('./standardTableSpec');

// Relocate complete pocket assemblies, rather than scaling their throat widths,
// lip radii or capture circles. The source remains an immutable measured asset.
function calibratePhysicalBoundary(source) {
  const straight = source.lines.filter(line => line.boundaryType === 'straightRail');
  const points = straight.flatMap(line => line.polylineTableMm);
  const oldHalfX = Math.max(...points.map(p => Math.abs(p[0])));
  const oldHalfY = Math.max(...points.map(p => Math.abs(p[1])));
  const dx = STANDARD_TABLE.lengthMm / 2 - oldHalfX;
  const dy = STANDARD_TABLE.widthMm / 2 - oldHalfY;
  const translate = (point, areaId) => {
    const middle = areaId.startsWith('middle-');
    const rail = areaId.startsWith('rail-');
    return [
      point[0] + (middle || (rail && Math.abs(point[0]) < oldHalfX / 2) ? 0 : Math.sign(point[0]) * dx),
      point[1] + Math.sign(point[1]) * dy,
    ];
  };
  return {
    ...source,
    calibration: { standard: STANDARD_TABLE.source, playAreaMm: { width: STANDARD_TABLE.lengthMm,
      height: STANDARD_TABLE.widthMm }, translationMm: { x: dx, y: dy }, pocketShapePreserved: true },
    lines: source.lines.map(line => ({
      ...line,
      controlTableMm: line.controlTableMm?.map(p => translate(p, line.areaId)),
      polylineTableMm: line.polylineTableMm?.map(p => translate(p, line.areaId)),
      ...(line.circleTableMm ? { circleTableMm: { ...line.circleTableMm,
        center: translate(line.circleTableMm.center, line.areaId) } } : {}),
    })),
  };
}

module.exports = { calibratePhysicalBoundary };

}, {"./standardTableSpec":9}, "apps/three-game/src/core/model/calibratePhysicalBoundary.js"],
12: [function(require, module, exports) {
const {
  BALL_COLORS,
  BALL_INERTIA,
  BALL_MASS,
  BALL_RADIUS_MM,
  BALL_VALUES,
} = require('../model/ballSpec');

function cloneVector2(vector) {
  return { x: vector.x, y: vector.y };
}

function createBallState(id, kind, pos, spot = pos) {
  const position = cloneVector2(pos);
  const previousPosition = cloneVector2(pos);
  const velocity = { x: 0, y: 0 };
  const angularVelocity = { x: 0, y: 0, z: 0 };

  return {
    id,
    kind,
    value: BALL_VALUES[kind],
    color: BALL_COLORS[kind],
    radius: BALL_RADIUS_MM,
    mass: BALL_MASS,
    inertia: BALL_INERTIA,
    pos: position,
    position,
    prevPos: previousPosition,
    previousPosition,
    vel: velocity,
    velocity,
    omega: angularVelocity,
    angularVelocity,
    orientation: { x: 0, y: 0, z: 0, w: 1 },
    contactMode: 'rolling',
    pocketMode: 'table',
    pocketEntry: null,
    spot: cloneVector2(spot),
    potted: false,
    isSliding: false,
    potting: null,
    pocketState: null,
  };
}

module.exports = {
  createBallState,
};

}, {"../model/ballSpec":5}, "apps/three-game/src/core/state/ballState.js"],
13: [function(require, module, exports) {
const { createOpeningRackLayout } = require('../model/spotModel');
const { createBallState } = require('./ballState');

function createOpeningRackState() {
  return createOpeningRackLayout().map((ball) => (
    createBallState(ball.id, ball.kind, ball.pos, ball.spot || ball.pos)
  ));
}

module.exports = {
  createOpeningRackState,
};

}, {"../model/spotModel":6,"./ballState":12}, "apps/three-game/src/core/state/openingRackState.js"],
14: [function(require, module, exports) {
const { createBallState } = require('../core/state/ballState');
const { colorSpot } = require('../core/model/spotModel');
const { BAULK_LINE_X_MM, D_RADIUS_MM, HALF_PLAY_AREA_MM, PINK_SPOT_X_MM, BLACK_SPOT_X_MM } = require('../core/model/tableModel');
const { BALL_RADIUS_MM } = require('../core/model/ballSpec');
const KINDS = { 'spot-black': 'black', 'spot-pink': 'pink', 'random-long': 'red' };
const isStreak = id => Boolean(KINDS[id]);
const isBasic = id => isStreak(id) || id === 'spotted-colors';
function balls(id, random = Math.random) {
  const kind = KINDS[id];
  if (!kind) return null;
  let target, cue;
  if (id === 'random-long') {
    const radius = Math.sqrt(random()) * (D_RADIUS_MM - BALL_RADIUS_MM);
    const angle = Math.PI / 2 + random() * Math.PI;
    cue = { x: BAULK_LINE_X_MM + radius * Math.cos(angle), y: radius * Math.sin(angle) };
    target = { x: PINK_SPOT_X_MM + random() * (BLACK_SPOT_X_MM - PINK_SPOT_X_MM), y: (random() * 2 - 1) * (HALF_PLAY_AREA_MM.height - BALL_RADIUS_MM - 1) };
  } else {
    target = colorSpot(kind);
    const angle = Math.atan2(HALF_PLAY_AREA_MM.height - target.y, HALF_PLAY_AREA_MM.width - target.x) + (kind === 'black' ? 15 : 5) * Math.PI / 180;
    cue = { x: target.x - 500 * Math.cos(angle), y: target.y - 500 * Math.sin(angle) };
  }
  return [createBallState('cue', 'cue', cue), createBallState(kind, kind, target, target)];
}
function prepare(state, id) {
  state.frameOver = state.matchOver = false;
  state.currentPlayerId = 'p1';
  Object.assign(state.ruleState, { phase: id === 'random-long' ? 'reds' : 'clearance', targetColorKind: KINDS[id], pendingDecision: null, requiresNomination: false, cueBallInHand: false, freeBallAvailable: false });
}
function settle(state, id, shot, random = Math.random) {
  const target = state.balls.find(b => b.kind === KINDS[id]);
  const cue = state.balls.find(b => b.kind === 'cue');
  const success = shot.firstContactBallId === target.id && shot.pottedBallIds?.includes(target.id) && !shot.cueBallPotted && !shot.pottedBallIds.includes(cue.id) && !cue.potted;
  const streak = state.practiceStreak;
  const ended = streak.current;
  if (success) {
    streak.current++;
    streak.best = Math.max(streak.best, streak.current);
  } else streak.current = 0;
  const record = !success && ended > streak.startBest;
  if (!success) streak.startBest = streak.best;
  const fresh = balls(id, random);
  state.balls = fresh.map(b => {
    const previous = state.balls.find(p => p.kind === b.kind);
    // Successful spot drills preserve the cue's settled position.
    if (success && id !== 'random-long' && b.kind === 'cue') return previous;
    b.id = previous.id;
    return b;
  });
  if(success && id!=='random-long'){
    const ball=state.balls.find(b=>b.kind===KINDS[id]);
    const pos=require('../core/rules/respot').findRespottedColorPosition(state,ball);
    ball.pos={...pos};ball.prevPos={...pos};ball.position=ball.pos;ball.previousPosition=ball.prevPos;
  }
  prepare(state, id);
  state.frameOver = record;
  return { success, record, count: ended };
}
function readBest(id, storage) {
  try { const value = Number(storage?.getItem('snooker.basic.best.' + id)); return Number.isSafeInteger(value) && value > 0 ? value : 0; } catch { return 0; }
}
function saveBest(id, value, storage) {
  try { storage?.setItem('snooker.basic.best.' + id, String(Math.max(value, readBest(id, storage)))); } catch {}
}
module.exports = { KINDS, isBasic, isStreak, balls, prepare, settle, readBest, saveBest };

}, {"../core/state/ballState":12,"../core/model/spotModel":6,"../core/model/tableModel":7,"../core/model/ballSpec":5,"../core/rules/respot":15}, "apps/three-game/src/game-client/basicPractice.js"],
15: [function(require, module, exports) {
const { BALL_KIND, COLOR_ORDER } = require('../../config/constants');
const { BALL_RADIUS_MM } = require('../model/ballSpec');
const { BAULK_LINE_X_MM, D_RADIUS_MM, HALF_PLAY_AREA_MM } = require('../model/tableModel');
const { colorSpot, openingCueBallPosition } = require('../model/spotModel');

function respotColor(state, kind) {
  return { state, kind };
}

const COLOR_RESPOT_ORDER = [
  BALL_KIND.BLACK,
  BALL_KIND.PINK,
  BALL_KIND.BLUE,
  BALL_KIND.BROWN,
  BALL_KIND.GREEN,
  BALL_KIND.YELLOW,
];

function isColorBallKind(kind) {
  return COLOR_ORDER.includes(kind);
}

function tableBaulkLineX(state) {
  return state?.table?.baulkLineMm ?? BAULK_LINE_X_MM;
}

function tableDRadius(state) {
  return state?.table?.dRadiusMm ?? D_RADIUS_MM;
}

function isInsideDZone(state, pos) {
  const baulkLineX = tableBaulkLineX(state);
  const dRadius = tableDRadius(state);
  return (
    pos.x <= baulkLineX + 0.001
    && Math.hypot(pos.x - baulkLineX, pos.y) <= dRadius + 0.001
  );
}

function isCuePlacementBlocked(state, pos, cueBall) {
  const cueRadius = cueBall?.radius || BALL_RADIUS_MM;
  return isPositionBlocked(state, pos, {
    ignoreBallId: cueBall?.id,
    radius: cueRadius,
  });
}

function isPositionBlocked(state, pos, options = {}) {
  const radius = options.radius || BALL_RADIUS_MM;
  const ignoreBallId = options.ignoreBallId || null;
  return (state?.balls || []).some((ball) => {
    if (ball.id === ignoreBallId || ball.potted || !ball.pos) return false;
    const clearance = radius + (ball.radius || BALL_RADIUS_MM) + 0.6;
    return Math.hypot(ball.pos.x - pos.x, ball.pos.y - pos.y) < clearance;
  });
}

function tableLimitX(state, ball) {
  const radius = ball?.radius || BALL_RADIUS_MM;
  return (state?.table?.halfPlayAreaMm?.width ?? HALF_PLAY_AREA_MM.width) - radius;
}

function tableMinX(state, ball) {
  const radius = ball?.radius || BALL_RADIUS_MM;
  return -((state?.table?.halfPlayAreaMm?.width ?? HALF_PLAY_AREA_MM.width) - radius);
}

function isInsidePlayAreaX(state, ball, x) {
  return Number.isFinite(x)
    && x >= tableMinX(state, ball)
    && x <= tableLimitX(state, ball);
}

function findOpenPointOnSpotLine(state, ball, spot, direction) {
  const radius = ball?.radius || BALL_RADIUS_MM;
  const step = Math.max(1, radius / 10);
  const limit = direction > 0 ? tableLimitX(state, ball) : tableMinX(state, ball);
  let blockedX = spot.x;

  for (
    let x = spot.x + direction * step;
    direction > 0 ? x <= limit : x >= limit;
    x += direction * step
  ) {
    const candidate = { x, y: spot.y };
    if (!isInsidePlayAreaX(state, ball, candidate.x)) break;
    if (!isPositionBlocked(state, candidate, { ignoreBallId: ball.id, radius })) {
      let openX = x;
      for (let i = 0; i < 14; i += 1) {
        const mid = (blockedX + openX) * 0.5;
        const refined = { x: mid, y: spot.y };
        if (!isPositionBlocked(state, refined, { ignoreBallId: ball.id, radius })) {
          openX = mid;
        } else {
          blockedX = mid;
        }
      }
      return { x: openX, y: spot.y };
    }
    blockedX = x;
  }

  return null;
}

function findRespottedColorPosition(state, ball) {
  const ownSpot = colorSpot(ball.kind);
  if (!isPositionBlocked(state, ownSpot, {
    ignoreBallId: ball.id,
    radius: ball.radius || BALL_RADIUS_MM,
  })) {
    return ownSpot;
  }

  const officialSpot = COLOR_RESPOT_ORDER
    .map(colorSpot)
    .find((spot) => !isPositionBlocked(state, spot, {
      ignoreBallId: ball.id,
      radius: ball.radius || BALL_RADIUS_MM,
    }));
  if (officialSpot) return officialSpot;

  return findOpenPointOnSpotLine(state, ball, ownSpot, 1)
    || findOpenPointOnSpotLine(state, ball, ownSpot, -1)
    || ownSpot;
}

function defaultCueBallDPosition(state) {
  return openingCueBallPosition({ baulkLineX: tableBaulkLineX(state) });
}

function findCueBallDPosition(state, cueBall) {
  const preferred = defaultCueBallDPosition(state);
  if (isInsideDZone(state, preferred) && !isCuePlacementBlocked(state, preferred, cueBall)) {
    return preferred;
  }

  const baulkLineX = tableBaulkLineX(state);
  const dRadius = tableDRadius(state);
  const cueRadius = cueBall?.radius || BALL_RADIUS_MM;
  const radialStep = Math.max(cueRadius * 1.05, dRadius / 5);
  const angleStep = Math.PI / 12;

  for (let radius = radialStep; radius <= dRadius; radius += radialStep) {
    for (let angle = Math.PI; angle >= 0; angle -= angleStep) {
      const candidate = {
        x: baulkLineX - Math.sin(angle) * radius,
        y: Math.cos(angle) * radius,
      };
      if (isInsideDZone(state, candidate) && !isCuePlacementBlocked(state, candidate, cueBall)) {
        return candidate;
      }
    }
  }

  return preferred;
}

function resetBallToTable(ball, pos) {
  ball.potted = false;
  ball.potting = null;
  ball.pocketState = null;
  ball.pocketMotion = null;
  ball.pocketEntry = null;
  ball.pocketMode = 'table';
  ball.pos = { ...pos };
  ball.position = ball.pos;
  ball.prevPos = { ...pos };
  ball.previousPosition = ball.prevPos;
  ball.vel = { x: 0, y: 0 };
  ball.velocity = ball.vel;
  ball.omega = { x: 0, y: 0, z: 0 };
  ball.angularVelocity = ball.omega;
}

function respotPottedCueBallInD(state) {
  const cueBallId = state?.cueBallId;
  const cueBall = state?.balls?.find((ball) => (
    ball.id === cueBallId || ball.kind === BALL_KIND.CUE
  ));

  if (!cueBall || !cueBall.potted) {
    return [];
  }

  const pos = findCueBallDPosition(state, cueBall);
  resetBallToTable(cueBall, pos);
  return [{
    type: 'cue-ball-respotted',
    ballId: cueBall.id,
    pos: { ...pos },
  }];
}

function respotPottedColorBalls(state, options = {}) {
  const includeKinds = options.includeKinds || null;
  const includeBallIds = options.includeBallIds
    ? new Set(options.includeBallIds)
    : null;
  const excludeKinds = options.excludeKinds || [];
  const events = [];
  (state?.balls || [])
    .filter((ball) => (
      ball.potted
      && isColorBallKind(ball.kind)
      && (!includeBallIds || includeBallIds.has(ball.id))
      && (!includeKinds || includeKinds.includes(ball.kind))
      && !excludeKinds.includes(ball.kind)
    ))
    .sort((a, b) => COLOR_ORDER.indexOf(b.kind) - COLOR_ORDER.indexOf(a.kind))
    .forEach((ball) => {
      const from = {
        potted: Boolean(ball.potted),
        pos: ball.pos ? { ...ball.pos } : null,
        pocketMode: ball.pocketMode || null,
      };
      const pos = findRespottedColorPosition(state, ball);
      resetBallToTable(ball, pos);
      events.push({
        type: 'color-respotted',
        ballId: ball.id,
        kind: ball.kind,
        from,
        pos: { ...pos },
      });
    });
  return events;
}

module.exports = {
  defaultCueBallDPosition,
  findRespottedColorPosition,
  findCueBallDPosition,
  isColorBallKind,
  isInsideDZone,
  isPositionBlocked,
  resetBallToTable,
  respotPottedColorBalls,
  respotPottedCueBallInD,
  respotColor,
};

}, {"../../config/constants":4,"../model/ballSpec":5,"../model/tableModel":7,"../model/spotModel":6}, "apps/three-game/src/core/rules/respot.js"],
16: [function(require, module, exports) {
const { createTableModel } = require('./tableModel');
const { createRailGeometry } = require('./railGeometry');
const { createPocketGeometry } = require('./pocketGeometry');
const { createCompositeLineCollider, createLineCollider, createSphereCollider } = require('./colliderPrimitives');
const { getPocketBoundaryOverride } = require('./pocketBoundaryOverrides');
const { PRO_MATCH_84_FULL_PHYSICAL_BOUNDARIES } = require('./proMatch84FullPhysicalBoundaries');
const { getTableBoundaryById } = require('./tableBoundaryPresets');

function createBoundaryRails(boundary) {
  return boundary.rails.map((rail) => createLineCollider(
    rail.id,
    rail.start,
    rail.end,
    {
      role: 'rail',
      material: 'cushion',
    },
  ));
}

function clonePoint(point) {
  return { x: point.x, y: point.y };
}

function pointFromArray(point) {
  if (Array.isArray(point)) {
    return { x: point[0], y: point[1] };
  }
  return clonePoint(point);
}

function midpoint(points) {
  if (!points.length) {
    return null;
  }
  return clonePoint(points[Math.floor((points.length - 1) / 2)]);
}

function physicalBoundaryDataFor(boundary) {
  if (boundary?.id === PRO_MATCH_84_FULL_PHYSICAL_BOUNDARIES.boundaryId) {
    return PRO_MATCH_84_FULL_PHYSICAL_BOUNDARIES;
  }
  return null;
}

function pointsFromPhysicalLine(line) {
  const points = line.polylineTableMm || line.controlTableMm || [];
  return points.map(pointFromArray).filter((point) => (
    Number.isFinite(point.x) && Number.isFinite(point.y)
  ));
}

function createPhysicalBoundaryRails(physicalBoundary) {
  return physicalBoundary.lines.reduce((rails, line) => {
    if (line.boundaryType !== 'straightRail') {
      return rails;
    }

    const points = pointsFromPhysicalLine(line);
    if (points.length >= 2) {
      rails.push(createLineCollider(
        line.id,
        points[0],
        points[points.length - 1],
        {
          role: 'rail',
          material: 'cushion',
        },
      ));
    }
    return rails;
  }, []);
}

function groupPhysicalLinesByArea(physicalBoundary) {
  const result = new Map();
  physicalBoundary.lines.forEach((line) => {
    if (!line.areaId) {
      return;
    }
    if (!result.has(line.areaId)) {
      result.set(line.areaId, []);
    }
    result.get(line.areaId).push(line);
  });
  return result;
}

function createPhysicalPocketLip(line) {
  return createCompositeLineCollider(
    line.id,
    pointsFromPhysicalLine(line),
    {
      role: 'pocket-lip',
      material: 'pocket-lip',
    },
  );
}

function createPhysicalDropEdge(line) {
  return createDropEdge({
    id: line.id,
    name: line.name,
    points: pointsFromPhysicalLine(line),
  });
}

function createBlackHoleCapture(line) {
  if (
    !line?.circleTableMm?.center
    || !Number.isFinite(line.circleTableMm.radius)
    || line.circleTableMm.radius <= 0
  ) {
    return null;
  }

  return {
    center: pointFromArray(line.circleTableMm.center),
    radius: line.circleTableMm.radius,
  };
}

function createBoundaryPocketsFromPhysicalData(boundary, physicalBoundary) {
  const linesByArea = groupPhysicalLinesByArea(physicalBoundary);

  return boundary.pockets.map((pocket) => {
    const pocketLines = linesByArea.get(pocket.id) || [];
    const throatWidthMm = boundary.throatWidthMm[pocket.type];
    const mouthWidthMm = boundary.mouthWidthMm[pocket.type];
    const lips = pocketLines
      .filter((line) => line.boundaryType === 'pocketRail' && pointsFromPhysicalLine(line).length >= 2)
      .map(createPhysicalPocketLip);
    const dropEdges = pocketLines
      .filter((line) => line.boundaryType === 'dropJudge' && pointsFromPhysicalLine(line).length >= 2)
      .map(createPhysicalDropEdge);
    const blackHole = createBlackHoleCapture(
      pocketLines
        .filter((line) => line.boundaryType === 'blackHole')
        .find((line) => createBlackHoleCapture(line)),
    );
    const center = blackHole?.center || pocket.center;
    const captureRadius = blackHole?.radius || pocket.captureRadius;
    const openingCenter = midpoint(dropEdges[0]?.points || []) || pocket.center;

    return {
      id: pocket.id,
      type: pocket.type,
      side: pocket.side,
      center: { ...center },
      candidateRadius: pocket.candidateRadius,
      renderRadius: pocket.renderRadius,
      throatWidthMm,
      mouthWidthMm,
      dropDirection: { ...pocket.dropDirection },
      capture: createSphereCollider(
        `${pocket.id}:capture`,
        center,
        captureRadius,
      ),
      blackHole: blackHole
        ? { center: { ...blackHole.center }, radius: blackHole.radius }
        : null,
      pocketDefinition: {
        id: pocket.id,
        type: pocket.type,
        direction: { ...pocket.dropDirection },
      },
      openingDefinition: {
        center: openingCenter,
        throatWidthMm,
        mouthWidthMm,
      },
      edgeDefinitions: lips,
      lips,
      dropEdges,
      boundaryOverrideSource: physicalBoundary.source,
    };
  });
}

function createDropEdge(definition) {
  return {
    id: definition.id,
    name: definition.name,
    type: 'polyline',
    role: definition.role || 'pocket-drop-edge',
    material: definition.material || 'pocket-drop-edge',
    points: definition.points.map(clonePoint),
  };
}

function createOverrideCollisionLine(definition) {
  return createCompositeLineCollider(
    definition.id,
    definition.points,
    {
      role: definition.role || 'pocket-rubber-boundary',
      material: definition.material || 'pocket-lip',
      restitution: definition.restitution,
      frictionMu: definition.frictionMu,
    },
  );
}

function createBoundaryPockets(boundary) {
  return boundary.pockets.map((pocket) => {
    const throatWidthMm = boundary.throatWidthMm[pocket.type];
    const mouthWidthMm = boundary.mouthWidthMm[pocket.type];
    const override = getPocketBoundaryOverride(boundary.id, pocket.id);
    const lips = pocket.lips.map((lip) => ({
      id: lip.id,
      type: 'composite-line',
      role: 'pocket-lip',
      material: 'pocket-lip',
      points: [],
      segments: lip.segments.map((segment) => createLineCollider(
        segment.id,
        segment.start,
        segment.end,
        {
          role: 'pocket-lip',
          material: 'pocket-lip',
        },
      )),
    }));
    const overrideCollisionLines = (override?.collisionLines || []).map(createOverrideCollisionLine);
    const dropEdges = (override?.dropEdges || []).map(createDropEdge);
    const edgeDefinitions = [...lips, ...overrideCollisionLines];

    return {
      id: pocket.id,
      type: pocket.type,
      side: pocket.side,
      center: { ...pocket.center },
      candidateRadius: pocket.candidateRadius,
      renderRadius: pocket.renderRadius,
      throatWidthMm,
      mouthWidthMm,
      dropDirection: { ...pocket.dropDirection },
      capture: createSphereCollider(
        `${pocket.id}:capture`,
        pocket.center,
        pocket.captureRadius,
      ),
      pocketDefinition: {
        id: pocket.id,
        type: pocket.type,
        direction: { ...pocket.dropDirection },
      },
      openingDefinition: {
        center: { ...pocket.center },
        throatWidthMm,
        mouthWidthMm,
      },
      edgeDefinitions,
      lips: edgeDefinitions,
      dropEdges,
      boundaryOverrideSource: override?.source || null,
    };
  });
}

function createLegacyColliderSet(table) {
  const rails = createRailGeometry(table);
  const pockets = createPocketGeometry(table);
  const pocketLips = pockets.flatMap((pocket) => pocket.lips);
  const pocketCaptures = pockets.map((pocket) => pocket.capture);

  return {
    coordinateSystem: 'center-origin-mm',
    rails,
    pockets,
    pocketLips,
    pocketCaptures,
  };
}

function createBoundaryColliderSet(boundary = getTableBoundaryById()) {
  const physicalBoundary = physicalBoundaryDataFor(boundary);
  const rails = physicalBoundary
    ? createPhysicalBoundaryRails(physicalBoundary)
    : createBoundaryRails(boundary);
  const pockets = physicalBoundary
    ? createBoundaryPocketsFromPhysicalData(boundary, physicalBoundary)
    : createBoundaryPockets(boundary);
  const pocketLips = pockets.flatMap((pocket) => pocket.lips);
  const pocketCaptures = pockets.map((pocket) => pocket.capture);
  const pocketDropEdges = pockets.flatMap((pocket) => pocket.dropEdges || []);

  return {
    coordinateSystem: boundary.coordinateSystem,
    source: physicalBoundary?.source || boundary.source,
    boundaryId: boundary.id,
    boundaryName: physicalBoundary?.boundaryName || boundary.name,
    rails,
    pockets,
    pocketLips,
    pocketCaptures,
    pocketDropEdges,
    throatWidthMm: { ...boundary.throatWidthMm },
    mouthWidthMm: { ...boundary.mouthWidthMm },
  };
}

function createTableColliderSet(table = createTableModel(), options = {}) {
  if (options.model === 'legacy' || table.physicalModel === 'legacy') {
    return createLegacyColliderSet(table);
  }

  return createBoundaryColliderSet(
    options.boundary || getTableBoundaryById(options.boundaryId || options.tableBoundaryId),
  );
}

module.exports = {
  createBoundaryColliderSet,
  createTableColliderSet,
};

}, {"./tableModel":7,"./railGeometry":17,"./pocketGeometry":19,"./colliderPrimitives":18,"./pocketBoundaryOverrides":20,"./proMatch84FullPhysicalBoundaries":10,"./tableBoundaryPresets":8}, "apps/three-game/src/core/model/tableColliderSet.js"],
17: [function(require, module, exports) {
const { createLineCollider } = require('./colliderPrimitives');
const { POCKET_GEOMETRY } = require('./pocketGeometry');

function createRailGeometry(table) {
  const half = table.halfPlayAreaMm;
  const middleGap = POCKET_GEOMETRY.middleMouthHalfWidthMm;
  const cornerCut = POCKET_GEOMETRY.cornerRailCutMm;

  return [
    createLineCollider(
      'rail-top-right',
      { x: middleGap, y: -half.height },
      { x: half.width - cornerCut, y: -half.height },
      { normal: { x: 0, y: 1 } },
    ),
    createLineCollider(
      'rail-right',
      { x: half.width, y: -half.height + cornerCut },
      { x: half.width, y: half.height - cornerCut },
      { normal: { x: -1, y: 0 } },
    ),
    createLineCollider(
      'rail-bottom-right',
      { x: half.width - cornerCut, y: half.height },
      { x: middleGap, y: half.height },
      { normal: { x: 0, y: -1 } },
    ),
    createLineCollider(
      'rail-bottom-left',
      { x: -middleGap, y: half.height },
      { x: -half.width + cornerCut, y: half.height },
      { normal: { x: 0, y: -1 } },
    ),
    createLineCollider(
      'rail-left',
      { x: -half.width, y: half.height - cornerCut },
      { x: -half.width, y: -half.height + cornerCut },
      { normal: { x: 1, y: 0 } },
    ),
    createLineCollider(
      'rail-top-left',
      { x: -half.width + cornerCut, y: -half.height },
      { x: -middleGap, y: -half.height },
      { normal: { x: 0, y: 1 } },
    ),
  ];
}

module.exports = {
  createRailGeometry,
};

}, {"./colliderPrimitives":18,"./pocketGeometry":19}, "apps/three-game/src/core/model/railGeometry.js"],
18: [function(require, module, exports) {
function clonePoint(point) {
  return { x: point.x, y: point.y };
}

function cloneVector(vector) {
  if (!vector) {
    return null;
  }
  return { x: vector.x, y: vector.y };
}

function createLineAabb(start, end) {
  return {
    minX: Math.min(start.x, end.x),
    maxX: Math.max(start.x, end.x),
    minY: Math.min(start.y, end.y),
    maxY: Math.max(start.y, end.y),
  };
}

function createLineCollider(id, start, end, options = {}) {
  return {
    id,
    type: 'line',
    role: options.role || 'rail',
    material: options.material || 'cushion',
    start: clonePoint(start),
    end: clonePoint(end),
    aabb: createLineAabb(start, end),
    normal: cloneVector(options.normal),
    restitution: options.restitution,
    frictionMu: options.frictionMu,
  };
}

function createCompositeLineCollider(id, points, options = {}) {
  const clonedPoints = points.map(clonePoint);
  const segments = [];

  for (let i = 0; i < clonedPoints.length - 1; i += 1) {
    segments.push(createLineCollider(
      `${id}:segment-${i}`,
      clonedPoints[i],
      clonedPoints[i + 1],
      {
        role: options.role || 'pocket-lip',
        material: options.material || 'pocket-lip',
        restitution: options.restitution,
        frictionMu: options.frictionMu,
      },
    ));
  }

  return {
    id,
    type: 'composite-line',
    role: options.role || 'pocket-lip',
    material: options.material || 'pocket-lip',
    points: clonedPoints,
    segments,
  };
}

function createSphereCollider(id, center, radius, options = {}) {
  return {
    id,
    type: 'sphere',
    role: options.role || 'pocket-capture',
    center: clonePoint(center),
    radius,
  };
}

module.exports = {
  createLineCollider,
  createCompositeLineCollider,
  createSphereCollider,
};

}, {}, "apps/three-game/src/core/model/colliderPrimitives.js"],
19: [function(require, module, exports) {
const { createCompositeLineCollider, createSphereCollider } = require('./colliderPrimitives');

const POCKET_GEOMETRY = {
  middleMouthHalfWidthMm: 113,
  middleCandidateRadiusMm: 235,
  middleCaptureOffsetMm: 68,
  middleCaptureRadiusMm: 66,
  middleRenderRadiusMm: 70,
  cornerRailCutMm: 88,
  cornerCandidateRadiusMm: 245,
  cornerCaptureOffsetMm: 54,
  cornerCaptureRadiusMm: 78,
  cornerRenderRadiusMm: 74,
};

function signName(value, negativeName, positiveName) {
  return value < 0 ? negativeName : positiveName;
}

function createMiddlePocket(table, verticalSign) {
  const half = table.halfPlayAreaMm;
  const side = signName(verticalSign, 'top', 'bottom');
  const id = `middle-${side}`;
  const y = verticalSign * half.height;
  const mouth = POCKET_GEOMETRY.middleMouthHalfWidthMm;
  const center = { x: 0, y };
  const captureCenter = {
    x: 0,
    y: y + verticalSign * POCKET_GEOMETRY.middleCaptureOffsetMm,
  };

  const leftLip = [
    { x: -mouth, y },
    { x: -82, y: y + verticalSign * 4 },
    { x: -48, y: y + verticalSign * 15 },
    { x: -22, y: y + verticalSign * 36 },
    { x: -8, y: y + verticalSign * 58 },
  ];
  const rightLip = leftLip.map((point) => ({ x: -point.x, y: point.y }));

  return {
    id,
    type: 'middle',
    side,
    center,
    candidateRadius: POCKET_GEOMETRY.middleCandidateRadiusMm,
    renderRadius: POCKET_GEOMETRY.middleRenderRadiusMm,
    dropDirection: { x: 0, y: verticalSign },
    capture: createSphereCollider(
      `${id}:capture`,
      captureCenter,
      POCKET_GEOMETRY.middleCaptureRadiusMm,
    ),
    lips: [
      createCompositeLineCollider(`${id}:left-lip`, leftLip),
      createCompositeLineCollider(`${id}:right-lip`, rightLip),
    ],
  };
}

function createCornerPocket(table, horizontalSign, verticalSign) {
  const half = table.halfPlayAreaMm;
  const horizontalName = signName(horizontalSign, 'left', 'right');
  const verticalName = signName(verticalSign, 'top', 'bottom');
  const id = `corner-${verticalName}-${horizontalName}`;
  const cut = POCKET_GEOMETRY.cornerRailCutMm;
  const corner = {
    x: horizontalSign * half.width,
    y: verticalSign * half.height,
  };
  const captureCenter = {
    x: corner.x + horizontalSign * POCKET_GEOMETRY.cornerCaptureOffsetMm,
    y: corner.y + verticalSign * POCKET_GEOMETRY.cornerCaptureOffsetMm,
  };
  const diagonal = Math.SQRT1_2;

  const longRailLip = [
    { x: horizontalSign * (half.width - cut), y: corner.y },
    { x: horizontalSign * (half.width - 54), y: corner.y + verticalSign * 6 },
    { x: horizontalSign * (half.width - 28), y: corner.y + verticalSign * 24 },
    { x: corner.x + horizontalSign * 10, y: corner.y + verticalSign * 50 },
  ];
  const shortRailLip = [
    { x: corner.x, y: verticalSign * (half.height - cut) },
    { x: corner.x + horizontalSign * 6, y: verticalSign * (half.height - 54) },
    { x: corner.x + horizontalSign * 24, y: verticalSign * (half.height - 28) },
    { x: corner.x + horizontalSign * 50, y: corner.y + verticalSign * 10 },
  ];

  return {
    id,
    type: 'corner',
    side: `${verticalName}-${horizontalName}`,
    center: corner,
    candidateRadius: POCKET_GEOMETRY.cornerCandidateRadiusMm,
    renderRadius: POCKET_GEOMETRY.cornerRenderRadiusMm,
    dropDirection: {
      x: horizontalSign * diagonal,
      y: verticalSign * diagonal,
    },
    capture: createSphereCollider(
      `${id}:capture`,
      captureCenter,
      POCKET_GEOMETRY.cornerCaptureRadiusMm,
    ),
    lips: [
      createCompositeLineCollider(`${id}:long-rail-lip`, longRailLip),
      createCompositeLineCollider(`${id}:short-rail-lip`, shortRailLip),
    ],
  };
}

function createPocketGeometry(table) {
  return [
    createCornerPocket(table, -1, -1),
    createMiddlePocket(table, -1),
    createCornerPocket(table, 1, -1),
    createCornerPocket(table, -1, 1),
    createMiddlePocket(table, 1),
    createCornerPocket(table, 1, 1),
  ];
}

module.exports = {
  POCKET_GEOMETRY,
  createPocketGeometry,
};

}, {"./colliderPrimitives":18}, "apps/three-game/src/core/model/pocketGeometry.js"],
20: [function(require, module, exports) {
const POCKET_BOUNDARY_POINT_DATA = {
  'middle-top': {
    blueRubber: [
      [-41.745, -966.392],
      [-41.337, -968.181],
      [-40.89, -969.929],
      [-40.407, -971.635],
      [-39.887, -973.301],
      [-39.332, -974.925],
      [-38.742, -976.509],
      [-38.119, -978.051],
      [-37.464, -979.552],
      [-36.776, -981.012],
      [-36.058, -982.431],
      [-35.31, -983.808],
      [-34.532, -985.145],
      [-33.727, -986.441],
      [-32.894, -987.695],
      [-32.034, -988.908],
      [-31.149, -990.08],
      [-30.239, -991.211],
      [-29.306, -992.301],
      [-28.349, -993.35],
      [-27.371, -994.358],
      [-26.371, -995.324],
      [-25.351, -996.25],
      [-24.311, -997.134],
      [-23.253, -997.977],
      [-22.177, -998.779],
      [-21.085, -999.54],
      [-19.977, -1000.26],
      [-18.853, -1000.939],
      [-17.716, -1001.577],
      [-16.565, -1002.173],
      [-15.402, -1002.728],
      [-14.227, -1003.243],
      [-13.042, -1003.716],
      [-11.847, -1004.148],
      [-10.644, -1004.539],
      [-9.432, -1004.888],
      [-8.213, -1005.197],
      [-6.988, -1005.464],
      [-5.758, -1005.691],
      [-4.524, -1005.876],
      [-3.285, -1006.02],
      [-2.045, -1006.123],
      [-0.802, -1006.185],
      [0.441, -1006.206],
      [1.685, -1006.186],
      [2.927, -1006.124],
      [4.168, -1006.022],
      [5.406, -1005.878],
      [6.641, -1005.693],
      [7.871, -1005.467],
      [9.096, -1005.2],
      [10.315, -1004.892],
      [11.527, -1004.542],
      [12.731, -1004.152],
      [13.926, -1003.72],
      [15.111, -1003.248],
      [16.286, -1002.734],
      [17.449, -1002.179],
      [18.6, -1001.583],
      [19.738, -1000.946],
      [20.861, -1000.267],
      [21.97, -999.548],
      [23.063, -998.787],
      [24.139, -997.986],
      [25.197, -997.143],
      [26.237, -996.259],
      [27.257, -995.334],
      [28.257, -994.368],
      [29.236, -993.36],
      [30.193, -992.312],
      [31.127, -991.222],
      [32.037, -990.091],
      [32.923, -988.92],
      [33.783, -987.707],
      [34.616, -986.453],
      [35.422, -985.157],
      [36.2, -983.821],
      [36.949, -982.444],
      [37.668, -981.025],
      [38.356, -979.565],
      [39.012, -978.064],
      [39.635, -976.522],
      [40.225, -974.939],
      [40.781, -973.315],
      [41.301, -971.65],
      [41.785, -969.943],
      [42.232, -968.195],
      [42.642, -966.407],
    ],
    whiteDrop: [
      [-52.689, -922.879],
      [-51.633, -921.547],
      [-50.567, -920.246],
      [-49.491, -918.977],
      [-48.406, -917.74],
      [-47.311, -916.535],
      [-46.207, -915.361],
      [-45.094, -914.22],
      [-43.973, -913.11],
      [-42.844, -912.032],
      [-41.706, -910.985],
      [-40.561, -909.97],
      [-39.408, -908.987],
      [-38.248, -908.036],
      [-37.082, -907.116],
      [-35.908, -906.229],
      [-34.728, -905.372],
      [-33.541, -904.548],
      [-32.349, -903.755],
      [-31.151, -902.994],
      [-29.948, -902.264],
      [-28.739, -901.566],
      [-27.526, -900.9],
      [-26.308, -900.265],
      [-25.086, -899.662],
      [-23.859, -899.09],
      [-22.629, -898.55],
      [-21.395, -898.042],
      [-20.157, -897.565],
      [-18.917, -897.12],
      [-17.674, -896.707],
      [-16.428, -896.325],
      [-15.18, -895.974],
      [-13.93, -895.655],
      [-12.678, -895.368],
      [-11.424, -895.112],
      [-10.17, -894.887],
      [-8.914, -894.694],
      [-7.658, -894.533],
      [-6.401, -894.403],
      [-5.143, -894.304],
      [-3.886, -894.237],
      [-2.629, -894.201],
      [-1.373, -894.197],
      [-0.118, -894.224],
      [1.137, -894.283],
      [2.39, -894.373],
      [3.641, -894.495],
      [4.891, -894.648],
      [6.138, -894.832],
      [7.383, -895.048],
      [8.626, -895.295],
      [9.865, -895.573],
      [11.102, -895.883],
      [12.335, -896.224],
      [13.564, -896.596],
      [14.789, -897],
      [16.011, -897.435],
      [17.227, -897.901],
      [18.439, -898.399],
      [19.647, -898.928],
      [20.848, -899.488],
      [22.045, -900.08],
      [23.235, -900.703],
      [24.42, -901.357],
      [25.598, -902.042],
      [26.77, -902.758],
      [27.935, -903.506],
      [29.093, -904.285],
      [30.244, -905.095],
      [31.387, -905.937],
      [32.522, -906.809],
      [33.649, -907.713],
      [34.768, -908.648],
      [35.878, -909.614],
      [36.98, -910.611],
      [38.072, -911.64],
      [39.155, -912.699],
      [40.228, -913.79],
      [41.291, -914.912],
      [42.344, -916.065],
      [43.387, -917.249],
      [44.419, -918.464],
      [45.44, -919.71],
      [46.45, -920.987],
      [47.448, -922.296],
      [48.435, -923.635],
      [49.41, -925.005],
      [50.372, -926.407],
    ],
  },
  'corner-top-right': {
    blueRubber: [
      [1778.185, -942.972],
      [1779.925, -946.084],
      [1781.705, -949.044],
      [1783.522, -951.855],
      [1785.374, -954.52],
      [1787.26, -957.04],
      [1789.176, -959.418],
      [1791.12, -961.656],
      [1793.091, -963.756],
      [1795.086, -965.72],
      [1797.103, -967.551],
      [1799.14, -969.25],
      [1801.194, -970.821],
      [1803.263, -972.265],
      [1805.345, -973.584],
      [1807.439, -974.781],
      [1809.54, -975.858],
      [1811.648, -976.817],
      [1813.76, -977.661],
      [1815.875, -978.391],
      [1817.988, -979.009],
      [1820.1, -979.519],
      [1822.206, -979.922],
      [1824.306, -980.22],
      [1826.396, -980.416],
      [1828.475, -980.512],
      [1830.541, -980.51],
      [1832.591, -980.412],
      [1834.622, -980.22],
      [1836.633, -979.938],
      [1838.622, -979.566],
      [1840.587, -979.108],
      [1842.524, -978.565],
      [1844.432, -977.939],
      [1846.309, -977.233],
      [1848.152, -976.45],
      [1849.959, -975.59],
      [1851.729, -974.657],
      [1853.458, -973.653],
      [1855.145, -972.58],
      [1856.787, -971.44],
      [1858.382, -970.235],
      [1859.928, -968.967],
      [1861.423, -967.64],
      [1862.864, -966.254],
      [1864.25, -964.813],
      [1865.577, -963.318],
      [1866.845, -961.772],
      [1868.05, -960.177],
      [1869.19, -958.535],
      [1870.263, -956.848],
      [1871.268, -955.118],
      [1872.201, -953.349],
      [1873.061, -951.541],
      [1873.845, -949.698],
      [1874.551, -947.82],
      [1875.177, -945.912],
      [1875.72, -943.974],
      [1876.179, -942.01],
      [1876.551, -940.021],
      [1876.834, -938.009],
      [1877.026, -935.977],
      [1877.124, -933.926],
      [1877.127, -931.86],
      [1877.032, -929.781],
      [1876.837, -927.69],
      [1876.539, -925.589],
      [1876.137, -923.482],
      [1875.628, -921.37],
      [1875.01, -919.256],
      [1874.281, -917.141],
      [1873.438, -915.028],
      [1872.48, -912.919],
      [1871.404, -910.816],
      [1870.208, -908.722],
      [1868.889, -906.639],
      [1867.446, -904.569],
      [1865.877, -902.514],
      [1864.178, -900.476],
      [1862.348, -898.458],
      [1860.385, -896.462],
      [1858.286, -894.49],
      [1856.049, -892.544],
      [1853.673, -890.627],
      [1851.154, -888.741],
      [1848.49, -886.887],
      [1845.68, -885.069],
      [1842.721, -883.288],
      [1839.611, -881.546],
    ],
    whiteDrop: [
      [1748.089, -911.765],
      [1748.302, -910.585],
      [1748.526, -909.417],
      [1748.762, -908.26],
      [1749.008, -907.115],
      [1749.266, -905.983],
      [1749.536, -904.862],
      [1749.816, -903.753],
      [1750.108, -902.656],
      [1750.411, -901.57],
      [1750.725, -900.497],
      [1751.051, -899.435],
      [1751.387, -898.386],
      [1751.735, -897.348],
      [1752.094, -896.322],
      [1752.464, -895.308],
      [1752.846, -894.306],
      [1753.239, -893.315],
      [1753.643, -892.337],
      [1754.058, -891.37],
      [1754.485, -890.416],
      [1754.922, -889.473],
      [1755.371, -888.542],
      [1755.831, -887.623],
      [1756.303, -886.716],
      [1756.785, -885.82],
      [1757.279, -884.937],
      [1757.784, -884.065],
      [1758.3, -883.205],
      [1758.828, -882.357],
      [1759.367, -881.521],
      [1759.917, -880.697],
      [1760.478, -879.885],
      [1761.05, -879.084],
      [1761.634, -878.296],
      [1762.229, -877.519],
      [1762.835, -876.754],
      [1763.452, -876.001],
      [1764.081, -875.26],
      [1764.721, -874.531],
      [1765.372, -873.814],
      [1766.034, -873.108],
      [1766.707, -872.415],
      [1767.392, -871.733],
      [1768.088, -871.063],
      [1768.795, -870.405],
      [1769.513, -869.759],
      [1770.243, -869.124],
      [1770.984, -868.502],
      [1771.736, -867.891],
      [1772.499, -867.293],
      [1773.273, -866.706],
      [1774.059, -866.131],
      [1774.856, -865.568],
      [1775.664, -865.017],
      [1776.484, -864.477],
      [1777.314, -863.95],
      [1778.156, -863.434],
      [1779.009, -862.931],
      [1779.874, -862.439],
      [1780.749, -861.959],
      [1781.636, -861.491],
      [1782.534, -861.034],
      [1783.443, -860.59],
      [1784.363, -860.157],
      [1785.295, -859.737],
      [1786.238, -859.328],
      [1787.192, -858.931],
      [1788.157, -858.546],
      [1789.134, -858.173],
      [1790.122, -857.811],
      [1791.121, -857.462],
      [1792.131, -857.124],
      [1793.152, -856.799],
      [1794.185, -856.485],
      [1795.229, -856.183],
      [1796.284, -855.893],
      [1797.35, -855.615],
      [1798.428, -855.348],
      [1799.517, -855.094],
      [1800.617, -854.851],
      [1801.728, -854.62],
      [1802.851, -854.401],
      [1803.984, -854.194],
      [1805.129, -853.999],
      [1806.285, -853.816],
      [1807.453, -853.644],
      [1808.631, -853.485],
      [1809.821, -853.337],
    ],
  },
  'corner-bottom-right': {
    blueRubber: [
      [1839.611, 881.546],
      [1842.46, 883.347],
      [1845.172, 885.178],
      [1847.747, 887.038],
      [1850.189, 888.925],
      [1852.499, 890.837],
      [1854.678, 892.773],
      [1856.73, 894.729],
      [1858.656, 896.704],
      [1860.458, 898.697],
      [1862.138, 900.705],
      [1863.698, 902.725],
      [1865.139, 904.758],
      [1866.464, 906.799],
      [1867.676, 908.848],
      [1868.774, 910.903],
      [1869.763, 912.96],
      [1870.643, 915.02],
      [1871.417, 917.078],
      [1872.086, 919.135],
      [1872.653, 921.186],
      [1873.119, 923.232],
      [1873.487, 925.269],
      [1873.758, 927.296],
      [1873.935, 929.31],
      [1874.019, 931.311],
      [1874.012, 933.295],
      [1873.916, 935.261],
      [1873.734, 937.207],
      [1873.467, 939.131],
      [1873.117, 941.03],
      [1872.686, 942.904],
      [1872.177, 944.75],
      [1871.59, 946.566],
      [1870.928, 948.35],
      [1870.193, 950.1],
      [1869.387, 951.814],
      [1868.512, 953.491],
      [1867.57, 955.128],
      [1866.563, 956.723],
      [1865.492, 958.275],
      [1864.361, 959.781],
      [1863.169, 961.239],
      [1861.921, 962.648],
      [1860.617, 964.005],
      [1859.26, 965.309],
      [1857.851, 966.558],
      [1856.392, 967.749],
      [1854.887, 968.88],
      [1853.335, 969.951],
      [1851.74, 970.958],
      [1850.103, 971.9],
      [1848.427, 972.775],
      [1846.713, 973.58],
      [1844.963, 974.315],
      [1843.179, 974.976],
      [1841.364, 975.563],
      [1839.518, 976.072],
      [1837.645, 976.503],
      [1835.745, 976.852],
      [1833.822, 977.119],
      [1831.877, 977.301],
      [1829.911, 977.396],
      [1827.927, 977.402],
      [1825.928, 977.317],
      [1823.914, 977.14],
      [1821.887, 976.869],
      [1819.851, 976.5],
      [1817.806, 976.033],
      [1815.755, 975.466],
      [1813.699, 974.796],
      [1811.641, 974.021],
      [1809.583, 973.14],
      [1807.526, 972.151],
      [1805.473, 971.051],
      [1803.424, 969.839],
      [1801.384, 968.513],
      [1799.352, 967.071],
      [1797.332, 965.51],
      [1795.326, 963.829],
      [1793.334, 962.027],
      [1791.36, 960.1],
      [1789.404, 958.047],
      [1787.47, 955.866],
      [1785.559, 953.555],
      [1783.673, 951.112],
      [1781.814, 948.535],
      [1779.984, 945.823],
      [1778.185, 942.972],
    ],
    whiteDrop: [
      [1805.782, 847.964],
      [1804.695, 848.26],
      [1803.617, 848.566],
      [1802.548, 848.881],
      [1801.488, 849.206],
      [1800.437, 849.54],
      [1799.394, 849.884],
      [1798.361, 850.238],
      [1797.337, 850.601],
      [1796.321, 850.973],
      [1795.315, 851.355],
      [1794.317, 851.747],
      [1793.328, 852.148],
      [1792.349, 852.558],
      [1791.378, 852.978],
      [1790.417, 853.408],
      [1789.464, 853.846],
      [1788.52, 854.295],
      [1787.586, 854.752],
      [1786.66, 855.22],
      [1785.744, 855.696],
      [1784.836, 856.182],
      [1783.938, 856.677],
      [1783.049, 857.182],
      [1782.168, 857.696],
      [1781.297, 858.22],
      [1780.435, 858.752],
      [1779.583, 859.295],
      [1778.739, 859.846],
      [1777.904, 860.407],
      [1777.079, 860.977],
      [1776.263, 861.556],
      [1775.456, 862.145],
      [1774.658, 862.743],
      [1773.869, 863.35],
      [1773.09, 863.966],
      [1772.319, 864.592],
      [1771.558, 865.227],
      [1770.806, 865.871],
      [1770.064, 866.524],
      [1769.33, 867.187],
      [1768.606, 867.858],
      [1767.892, 868.539],
      [1767.186, 869.229],
      [1766.49, 869.929],
      [1765.803, 870.637],
      [1765.125, 871.354],
      [1764.457, 872.081],
      [1763.798, 872.817],
      [1763.149, 873.562],
      [1762.509, 874.316],
      [1761.878, 875.079],
      [1761.256, 875.851],
      [1760.644, 876.632],
      [1760.041, 877.422],
      [1759.448, 878.221],
      [1758.864, 879.03],
      [1758.29, 879.847],
      [1757.725, 880.673],
      [1757.169, 881.509],
      [1756.623, 882.353],
      [1756.087, 883.206],
      [1755.559, 884.069],
      [1755.042, 884.94],
      [1754.534, 885.82],
      [1754.035, 886.709],
      [1753.546, 887.607],
      [1753.066, 888.514],
      [1752.596, 889.43],
      [1752.136, 890.355],
      [1751.685, 891.289],
      [1751.243, 892.231],
      [1750.811, 893.183],
      [1750.389, 894.143],
      [1749.977, 895.112],
      [1749.574, 896.09],
      [1749.18, 897.077],
      [1748.796, 898.072],
      [1748.422, 899.077],
      [1748.058, 900.09],
      [1747.703, 901.112],
      [1747.358, 902.143],
      [1747.022, 903.182],
      [1746.697, 904.231],
      [1746.38, 905.288],
      [1746.074, 906.354],
      [1745.777, 907.428],
      [1745.491, 908.511],
      [1745.213, 909.603],
    ],
  },
  'middle-bottom': {
    blueRubber: [
      [-42.13, 957.209],
      [-41.511, 959.029],
      [-40.869, 960.808],
      [-40.204, 962.545],
      [-39.516, 964.24],
      [-38.807, 965.893],
      [-38.077, 967.504],
      [-37.326, 969.074],
      [-36.555, 970.601],
      [-35.765, 972.087],
      [-34.955, 973.531],
      [-34.127, 974.933],
      [-33.281, 976.293],
      [-32.418, 977.612],
      [-31.538, 978.888],
      [-30.641, 980.123],
      [-29.729, 981.315],
      [-28.802, 982.466],
      [-27.86, 983.575],
      [-26.904, 984.643],
      [-25.934, 985.668],
      [-24.951, 986.651],
      [-23.956, 987.593],
      [-22.949, 988.493],
      [-21.93, 989.351],
      [-20.901, 990.167],
      [-19.861, 990.941],
      [-18.812, 991.674],
      [-17.753, 992.364],
      [-16.685, 993.013],
      [-15.61, 993.62],
      [-14.526, 994.185],
      [-13.436, 994.708],
      [-12.339, 995.189],
      [-11.237, 995.629],
      [-10.128, 996.026],
      [-9.015, 996.382],
      [-7.898, 996.696],
      [-6.777, 996.968],
      [-5.652, 997.198],
      [-4.525, 997.386],
      [-3.396, 997.533],
      [-2.265, 997.637],
      [-1.133, 997.7],
      [0, 997.721],
      [1.133, 997.7],
      [2.265, 997.637],
      [3.396, 997.533],
      [4.525, 997.386],
      [5.652, 997.198],
      [6.777, 996.968],
      [7.898, 996.696],
      [9.015, 996.382],
      [10.128, 996.026],
      [11.237, 995.629],
      [12.339, 995.189],
      [13.436, 994.708],
      [14.526, 994.185],
      [15.61, 993.62],
      [16.685, 993.013],
      [17.753, 992.364],
      [18.812, 991.674],
      [19.861, 990.941],
      [20.901, 990.167],
      [21.93, 989.351],
      [22.949, 988.493],
      [23.956, 987.593],
      [24.951, 986.651],
      [25.934, 985.668],
      [26.904, 984.643],
      [27.86, 983.575],
      [28.802, 982.466],
      [29.729, 981.315],
      [30.641, 980.123],
      [31.538, 978.888],
      [32.418, 977.612],
      [33.281, 976.293],
      [34.127, 974.933],
      [34.955, 973.531],
      [35.765, 972.087],
      [36.555, 970.601],
      [37.326, 969.074],
      [38.077, 967.504],
      [38.807, 965.893],
      [39.516, 964.24],
      [40.204, 962.545],
      [40.869, 960.808],
      [41.511, 959.029],
      [42.13, 957.209],
    ],
    whiteDrop: [
      [52.35, 922.021],
      [51.752, 920.386],
      [51.113, 918.787],
      [50.436, 917.225],
      [49.72, 915.698],
      [48.967, 914.209],
      [48.177, 912.755],
      [47.352, 911.338],
      [46.493, 909.958],
      [45.6, 908.614],
      [44.674, 907.306],
      [43.717, 906.035],
      [42.728, 904.8],
      [41.709, 903.602],
      [40.662, 902.441],
      [39.586, 901.316],
      [38.483, 900.227],
      [37.353, 899.175],
      [36.198, 898.16],
      [35.019, 897.182],
      [33.816, 896.24],
      [32.59, 895.335],
      [31.342, 894.467],
      [30.074, 893.635],
      [28.785, 892.84],
      [27.478, 892.082],
      [26.152, 891.361],
      [24.809, 890.677],
      [23.449, 890.029],
      [22.074, 889.419],
      [20.685, 888.845],
      [19.282, 888.308],
      [17.866, 887.808],
      [16.438, 887.345],
      [15, 886.919],
      [13.551, 886.531],
      [12.093, 886.179],
      [10.628, 885.864],
      [9.154, 885.586],
      [7.675, 885.346],
      [6.19, 885.142],
      [4.701, 884.976],
      [3.208, 884.847],
      [1.712, 884.755],
      [0.214, 884.7],
      [-1.284, 884.683],
      [-2.782, 884.702],
      [-4.28, 884.759],
      [-5.776, 884.854],
      [-7.269, 884.985],
      [-8.758, 885.154],
      [-10.243, 885.361],
      [-11.722, 885.604],
      [-13.195, 885.886],
      [-14.66, 886.204],
      [-16.118, 886.56],
      [-17.566, 886.954],
      [-19.004, 887.385],
      [-20.432, 887.853],
      [-21.847, 888.359],
      [-23.25, 888.903],
      [-24.639, 889.484],
      [-26.014, 890.103],
      [-27.373, 890.759],
      [-28.715, 891.454],
      [-30.041, 892.185],
      [-31.348, 892.955],
      [-32.636, 893.762],
      [-33.904, 894.607],
      [-35.151, 895.49],
      [-36.376, 896.41],
      [-37.579, 897.368],
      [-38.758, 898.365],
      [-39.912, 899.399],
      [-41.041, 900.47],
      [-42.143, 901.58],
      [-43.218, 902.728],
      [-44.265, 903.913],
      [-45.283, 905.137],
      [-46.271, 906.398],
      [-47.227, 907.698],
      [-48.152, 909.035],
      [-49.045, 910.411],
      [-49.903, 911.825],
      [-50.727, 913.276],
      [-51.516, 914.766],
      [-52.268, 916.294],
      [-52.982, 917.86],
      [-53.659, 919.465],
    ],
  },
  'corner-bottom-left': {
    blueRubber: [
      [-1839.611, 881.546],
      [-1842.425, 883.285],
      [-1845.101, 885.057],
      [-1847.642, 886.859],
      [-1850.049, 888.691],
      [-1852.325, 890.549],
      [-1854.471, 892.432],
      [-1856.489, 894.339],
      [-1858.382, 896.266],
      [-1860.151, 898.213],
      [-1861.798, 900.176],
      [-1863.325, 902.155],
      [-1864.735, 904.147],
      [-1866.029, 906.15],
      [-1867.209, 908.162],
      [-1868.278, 910.181],
      [-1869.236, 912.205],
      [-1870.087, 914.232],
      [-1870.832, 916.261],
      [-1871.473, 918.289],
      [-1872.012, 920.314],
      [-1872.451, 922.334],
      [-1872.792, 924.348],
      [-1873.038, 926.352],
      [-1873.189, 928.347],
      [-1873.248, 930.328],
      [-1873.218, 932.295],
      [-1873.099, 934.245],
      [-1872.895, 936.176],
      [-1872.606, 938.087],
      [-1872.235, 939.976],
      [-1871.784, 941.839],
      [-1871.256, 943.676],
      [-1870.651, 945.485],
      [-1869.972, 947.263],
      [-1869.22, 949.008],
      [-1868.399, 950.719],
      [-1867.509, 952.394],
      [-1866.553, 954.03],
      [-1865.533, 955.626],
      [-1864.451, 957.179],
      [-1863.309, 958.688],
      [-1862.108, 960.15],
      [-1860.851, 961.564],
      [-1859.54, 962.928],
      [-1858.176, 964.239],
      [-1856.762, 965.496],
      [-1855.3, 966.697],
      [-1853.791, 967.839],
      [-1852.238, 968.921],
      [-1850.643, 969.941],
      [-1849.007, 970.897],
      [-1847.332, 971.786],
      [-1845.622, 972.607],
      [-1843.876, 973.358],
      [-1842.099, 974.037],
      [-1840.29, 974.642],
      [-1838.454, 975.17],
      [-1836.59, 975.621],
      [-1834.702, 975.991],
      [-1832.792, 976.279],
      [-1830.861, 976.483],
      [-1828.911, 976.601],
      [-1826.945, 976.631],
      [-1824.964, 976.571],
      [-1822.971, 976.42],
      [-1820.966, 976.174],
      [-1818.953, 975.832],
      [-1816.934, 975.392],
      [-1814.909, 974.852],
      [-1812.882, 974.21],
      [-1810.854, 973.465],
      [-1808.828, 972.613],
      [-1806.804, 971.654],
      [-1804.786, 970.585],
      [-1802.775, 969.404],
      [-1800.773, 968.109],
      [-1798.782, 966.698],
      [-1796.804, 965.17],
      [-1794.842, 963.522],
      [-1792.896, 961.752],
      [-1790.97, 959.858],
      [-1789.064, 957.839],
      [-1787.182, 955.692],
      [-1785.325, 953.415],
      [-1783.494, 951.007],
      [-1781.693, 948.465],
      [-1779.922, 945.788],
      [-1778.185, 942.972],
    ],
    whiteDrop: [
      [-1806.124, 848.419],
      [-1805.305, 848.482],
      [-1804.476, 848.57],
      [-1803.639, 848.685],
      [-1802.795, 848.825],
      [-1801.943, 848.991],
      [-1801.084, 849.181],
      [-1800.219, 849.396],
      [-1799.347, 849.634],
      [-1798.47, 849.896],
      [-1797.587, 850.181],
      [-1796.699, 850.489],
      [-1795.807, 850.819],
      [-1794.911, 851.171],
      [-1794.011, 851.544],
      [-1793.107, 851.939],
      [-1792.201, 852.354],
      [-1791.292, 852.789],
      [-1790.38, 853.244],
      [-1789.468, 853.719],
      [-1788.553, 854.212],
      [-1787.638, 854.724],
      [-1786.723, 855.254],
      [-1785.807, 855.802],
      [-1784.892, 856.368],
      [-1783.977, 856.95],
      [-1783.064, 857.549],
      [-1782.152, 858.164],
      [-1781.242, 858.794],
      [-1780.334, 859.44],
      [-1779.429, 860.101],
      [-1778.527, 860.776],
      [-1777.629, 861.466],
      [-1776.734, 862.169],
      [-1775.844, 862.885],
      [-1774.959, 863.614],
      [-1774.079, 864.355],
      [-1773.205, 865.109],
      [-1772.336, 865.874],
      [-1771.474, 866.65],
      [-1770.619, 867.437],
      [-1769.771, 868.234],
      [-1768.93, 869.041],
      [-1768.098, 869.858],
      [-1767.274, 870.684],
      [-1766.459, 871.519],
      [-1765.653, 872.362],
      [-1764.856, 873.213],
      [-1764.07, 874.071],
      [-1763.294, 874.937],
      [-1762.529, 875.809],
      [-1761.776, 876.687],
      [-1761.033, 877.571],
      [-1760.303, 878.461],
      [-1759.586, 879.355],
      [-1758.881, 880.255],
      [-1758.19, 881.158],
      [-1757.512, 882.065],
      [-1756.849, 882.976],
      [-1756.2, 883.89],
      [-1755.566, 884.806],
      [-1754.947, 885.724],
      [-1754.344, 886.644],
      [-1753.757, 887.565],
      [-1753.186, 888.487],
      [-1752.633, 889.41],
      [-1752.097, 890.333],
      [-1751.578, 891.255],
      [-1751.078, 892.177],
      [-1750.596, 893.098],
      [-1750.134, 894.017],
      [-1749.69, 894.934],
      [-1749.267, 895.849],
      [-1748.863, 896.761],
      [-1748.48, 897.669],
      [-1748.119, 898.574],
      [-1747.778, 899.475],
      [-1747.46, 900.372],
      [-1747.163, 901.264],
      [-1746.89, 902.15],
      [-1746.639, 903.031],
      [-1746.411, 903.906],
      [-1746.208, 904.774],
      [-1746.029, 905.636],
      [-1745.874, 906.49],
      [-1745.745, 907.336],
      [-1745.641, 908.175],
      [-1745.562, 909.004],
      [-1745.51, 909.825],
    ],
  },
  'corner-top-left': {
    blueRubber: [
      [-1778.185, -942.972],
      [-1779.97, -945.997],
      [-1781.79, -948.876],
      [-1783.644, -951.611],
      [-1785.53, -954.204],
      [-1787.444, -956.656],
      [-1789.386, -958.972],
      [-1791.353, -961.151],
      [-1793.342, -963.198],
      [-1795.353, -965.112],
      [-1797.382, -966.898],
      [-1799.427, -968.557],
      [-1801.487, -970.09],
      [-1803.56, -971.5],
      [-1805.643, -972.79],
      [-1807.733, -973.961],
      [-1809.83, -975.016],
      [-1811.931, -975.956],
      [-1814.033, -976.783],
      [-1816.135, -977.501],
      [-1818.235, -978.11],
      [-1820.33, -978.613],
      [-1822.419, -979.013],
      [-1824.498, -979.31],
      [-1826.567, -979.508],
      [-1828.623, -979.608],
      [-1830.663, -979.613],
      [-1832.687, -979.525],
      [-1834.691, -979.345],
      [-1836.673, -979.077],
      [-1838.632, -978.721],
      [-1840.566, -978.28],
      [-1842.471, -977.757],
      [-1844.347, -977.153],
      [-1846.19, -976.47],
      [-1848, -975.711],
      [-1849.773, -974.878],
      [-1851.508, -973.972],
      [-1853.202, -972.997],
      [-1854.854, -971.953],
      [-1856.461, -970.844],
      [-1858.021, -969.671],
      [-1859.532, -968.436],
      [-1860.992, -967.141],
      [-1862.399, -965.79],
      [-1863.751, -964.383],
      [-1865.046, -962.922],
      [-1866.281, -961.411],
      [-1867.454, -959.851],
      [-1868.563, -958.243],
      [-1869.607, -956.592],
      [-1870.583, -954.897],
      [-1871.489, -953.162],
      [-1872.322, -951.389],
      [-1873.082, -949.579],
      [-1873.764, -947.735],
      [-1874.369, -945.859],
      [-1874.893, -943.953],
      [-1875.334, -942.02],
      [-1875.69, -940.06],
      [-1875.959, -938.077],
      [-1876.139, -936.073],
      [-1876.228, -934.049],
      [-1876.224, -932.007],
      [-1876.124, -929.951],
      [-1875.926, -927.882],
      [-1875.629, -925.801],
      [-1875.231, -923.712],
      [-1874.728, -921.617],
      [-1874.12, -919.516],
      [-1873.403, -917.413],
      [-1872.576, -915.31],
      [-1871.637, -913.208],
      [-1870.583, -911.111],
      [-1869.413, -909.019],
      [-1868.124, -906.936],
      [-1866.715, -904.862],
      [-1865.182, -902.801],
      [-1863.525, -900.754],
      [-1861.74, -898.724],
      [-1859.827, -896.713],
      [-1857.782, -894.722],
      [-1855.603, -892.754],
      [-1853.289, -890.812],
      [-1850.837, -888.896],
      [-1848.246, -887.009],
      [-1845.512, -885.154],
      [-1842.635, -883.332],
      [-1839.611, -881.546],
    ],
    whiteDrop: [
      [-1749.941, -913.104],
      [-1750.246, -912.044],
      [-1750.561, -910.994],
      [-1750.884, -909.952],
      [-1751.216, -908.918],
      [-1751.557, -907.893],
      [-1751.907, -906.876],
      [-1752.266, -905.868],
      [-1752.634, -904.868],
      [-1753.011, -903.877],
      [-1753.397, -902.894],
      [-1753.792, -901.92],
      [-1754.196, -900.954],
      [-1754.608, -899.997],
      [-1755.03, -899.049],
      [-1755.46, -898.109],
      [-1755.899, -897.178],
      [-1756.347, -896.255],
      [-1756.804, -895.341],
      [-1757.27, -894.435],
      [-1757.745, -893.538],
      [-1758.229, -892.65],
      [-1758.721, -891.77],
      [-1759.222, -890.899],
      [-1759.732, -890.037],
      [-1760.251, -889.183],
      [-1760.779, -888.338],
      [-1761.316, -887.501],
      [-1761.861, -886.673],
      [-1762.415, -885.854],
      [-1762.978, -885.044],
      [-1763.55, -884.242],
      [-1764.13, -883.448],
      [-1764.719, -882.664],
      [-1765.318, -881.888],
      [-1765.924, -881.121],
      [-1766.54, -880.363],
      [-1767.164, -879.613],
      [-1767.797, -878.872],
      [-1768.439, -878.139],
      [-1769.089, -877.416],
      [-1769.749, -876.701],
      [-1770.417, -875.995],
      [-1771.093, -875.298],
      [-1771.778, -874.609],
      [-1772.472, -873.929],
      [-1773.175, -873.258],
      [-1773.886, -872.596],
      [-1774.607, -871.943],
      [-1775.335, -871.298],
      [-1776.073, -870.662],
      [-1776.819, -870.035],
      [-1777.573, -869.417],
      [-1778.337, -868.807],
      [-1779.108, -868.207],
      [-1779.889, -867.615],
      [-1780.678, -867.032],
      [-1781.476, -866.458],
      [-1782.282, -865.893],
      [-1783.097, -865.336],
      [-1783.921, -864.789],
      [-1784.753, -864.25],
      [-1785.594, -863.72],
      [-1786.443, -863.2],
      [-1787.301, -862.688],
      [-1788.167, -862.184],
      [-1789.042, -861.69],
      [-1789.926, -861.205],
      [-1790.818, -860.729],
      [-1791.718, -860.261],
      [-1792.628, -859.803],
      [-1793.545, -859.353],
      [-1794.471, -858.912],
      [-1795.406, -858.481],
      [-1796.349, -858.058],
      [-1797.301, -857.644],
      [-1798.261, -857.239],
      [-1799.229, -856.844],
      [-1800.207, -856.457],
      [-1801.192, -856.079],
      [-1802.186, -855.71],
      [-1803.188, -855.35],
      [-1804.199, -854.999],
      [-1805.219, -854.658],
      [-1806.246, -854.325],
      [-1807.283, -854.001],
      [-1808.327, -853.686],
      [-1809.38, -853.381],
      [-1810.442, -853.084],
    ],
  },
};

function toPoints(points) {
  return points.map(([x, y]) => ({ x, y }));
}

function createPocketOverride(pocketId, data) {
  return {
    source: `pocket-boundary-editor ${pocketId} high precision arc data`,
    collisionLines: [],
    dropEdges: [
      {
        id: `${pocketId}:white-drop-edge`,
        name: `${pocketId} white drop edge`,
        role: 'pocket-drop-edge',
        material: 'pocket-drop-edge',
        points: toPoints(data.whiteDrop),
      },
    ],
  };
}
const PRO_MATCH_84_OVERRIDES = Object.fromEntries(
  Object.entries(POCKET_BOUNDARY_POINT_DATA).map(([pocketId, pocketData]) => [
    pocketId,
    createPocketOverride(pocketId, pocketData),
  ]),
);

const POCKET_BOUNDARY_OVERRIDES = {
  'pro-match-84': PRO_MATCH_84_OVERRIDES,
};

function getPocketBoundaryOverride(boundaryId, pocketId) {
  return POCKET_BOUNDARY_OVERRIDES[boundaryId]?.[pocketId] || null;
}

module.exports = {
  POCKET_BOUNDARY_OVERRIDES,
  getPocketBoundaryOverride,
};

}, {}, "apps/three-game/src/core/model/pocketBoundaryOverrides.js"],
21: [function(require, module, exports) {
(function installCanvasPrimitives(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SnookerCanvasPrimitives = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this), function createCanvasPrimitives() {
function rectFrom(rect = {}) {
  return {
    x: Number(rect.x ?? rect.left) || 0,
    y: Number(rect.y ?? rect.top) || 0,
    width: Math.max(0, Number(rect.width) || 0),
    height: Math.max(0, Number(rect.height) || 0),
  };
}

function pointInRect(point, rect) {
  const bounds = rectFrom(rect);
  return Boolean(
    point
    && point.x >= bounds.x
    && point.x <= bounds.x + bounds.width
    && point.y >= bounds.y
    && point.y <= bounds.y + bounds.height
  );
}

function roundRect(ctx, rect, radius = 0) {
  const bounds = rectFrom(rect);
  const r = Math.max(0, Math.min(Number(radius) || 0, bounds.width * 0.5, bounds.height * 0.5));
  ctx.beginPath();
  ctx.moveTo(bounds.x + r, bounds.y);
  ctx.lineTo(bounds.x + bounds.width - r, bounds.y);
  ctx.quadraticCurveTo(bounds.x + bounds.width, bounds.y, bounds.x + bounds.width, bounds.y + r);
  ctx.lineTo(bounds.x + bounds.width, bounds.y + bounds.height - r);
  ctx.quadraticCurveTo(
    bounds.x + bounds.width,
    bounds.y + bounds.height,
    bounds.x + bounds.width - r,
    bounds.y + bounds.height,
  );
  ctx.lineTo(bounds.x + r, bounds.y + bounds.height);
  ctx.quadraticCurveTo(bounds.x, bounds.y + bounds.height, bounds.x, bounds.y + bounds.height - r);
  ctx.lineTo(bounds.x, bounds.y + r);
  ctx.quadraticCurveTo(bounds.x, bounds.y, bounds.x + r, bounds.y);
  ctx.closePath();
}

function drawImageCover(ctx, image, rect) {
  const bounds = rectFrom(rect);
  const imageWidth = image?.naturalWidth || image?.width || 0;
  const imageHeight = image?.naturalHeight || image?.height || 0;
  if (!imageWidth || !imageHeight || bounds.width <= 0 || bounds.height <= 0) return false;
  const scale = Math.max(bounds.width / imageWidth, bounds.height / imageHeight);
  const sourceWidth = bounds.width / scale;
  const sourceHeight = bounds.height / scale;
  const sourceX = (imageWidth - sourceWidth) * 0.5;
  const sourceY = (imageHeight - sourceHeight) * 0.5;
  ctx.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, bounds.x, bounds.y, bounds.width, bounds.height);
  return true;
}

return {
  drawImageCover,
  pointInRect,
  rectFrom,
  roundRect,
};
});

}, {}, "apps/three-game/src/render/canvasPrimitives.js"],
22: [function(require, module, exports) {
(function installCanvasControlsRenderer(root, factory) {
  let CanvasPrimitives = root?.SnookerCanvasPrimitives || null;
  if (typeof module === 'object' && module.exports) {
    CanvasPrimitives = CanvasPrimitives || require('../canvasPrimitives');
  }
  const api = factory(CanvasPrimitives);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SnookerCanvasControlsRenderer = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this), function createCanvasControlsRenderer(CanvasPrimitives) {
const DEFAULT_TEXT_COLOR = '#f7f1df';
const FONT_FAMILY = 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif';

function createButton(id, label, x, y, width, height, extra = {}) {
  return { id, label, x, y, width, height, ...extra };
}

function drawInteractionOverlay(ctx, rect, options = {}) {
  const hovered = options.hovered === true || options.pressed === true;
  const pressed = options.pressed === true;
  if (!hovered) return;
  ctx.fillStyle = options.hoverFill || 'rgba(255, 255, 255, 0.065)';
  CanvasPrimitives.roundRect(ctx, rect, Number.isFinite(Number(options.radius)) ? Number(options.radius) : 10);
  ctx.fill();
  if (pressed) {
    ctx.fillStyle = options.pressedFill || 'rgba(0, 0, 0, 0.18)';
    CanvasPrimitives.roundRect(ctx, rect, Number.isFinite(Number(options.radius)) ? Number(options.radius) : 10);
    ctx.fill();
  }
}

function drawButton(ctx, button, options = {}) {
  ctx.save();
  ctx.fillStyle = options.fill || 'rgba(10, 12, 15, 0.72)';
  ctx.strokeStyle = options.stroke || 'rgba(255, 255, 255, 0.18)';
  ctx.lineWidth = Number.isFinite(Number(options.lineWidth)) ? Number(options.lineWidth) : 1.5;
  CanvasPrimitives.roundRect(ctx, button, Number.isFinite(Number(options.radius)) ? Number(options.radius) : 10);
  ctx.fill();
  drawInteractionOverlay(ctx, button, options);
  if (options.hovered || options.pressed) {
    ctx.strokeStyle = options.interactionStroke || 'rgba(241, 210, 132, 0.62)';
  }
  if (options.stroke !== false) ctx.stroke();
  ctx.fillStyle = options.text || DEFAULT_TEXT_COLOR;
  ctx.font = options.font || `700 22px ${FONT_FAMILY}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(button?.label ?? ''), button.x + button.width * 0.5, button.y + button.height * 0.5 + (Number(options.textOffsetY) || 0));
  ctx.restore();
  return button;
}

function drawIconButton(ctx, button, icon, options = {}) {
  ctx.save();
  ctx.fillStyle = options.fill || 'rgba(10, 12, 15, 0.66)';
  ctx.strokeStyle = options.stroke || 'rgba(255, 255, 255, 0.20)';
  ctx.lineWidth = Number.isFinite(Number(options.lineWidth)) ? Number(options.lineWidth) : 1.5;
  CanvasPrimitives.roundRect(ctx, button, Number.isFinite(Number(options.radius)) ? Number(options.radius) : 12);
  ctx.fill();
  drawInteractionOverlay(ctx, button, { ...options, radius: Number.isFinite(Number(options.radius)) ? Number(options.radius) : 12 });
  if (options.hovered || options.pressed) {
    ctx.strokeStyle = options.interactionStroke || 'rgba(241, 210, 132, 0.62)';
  }
  if (options.stroke !== false) ctx.stroke();
  ctx.strokeStyle = options.iconColor || DEFAULT_TEXT_COLOR;
  ctx.fillStyle = options.iconColor || DEFAULT_TEXT_COLOR;
  ctx.lineWidth = Number.isFinite(Number(options.iconLineWidth)) ? Number(options.iconLineWidth) : 3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const cx = button.x + button.width * 0.5;
  const cy = button.y + button.height * 0.5;

  if (options.iconImage) {
    const sourceWidth = Number(options.iconImage.naturalWidth || options.iconImage.width) || 1;
    const sourceHeight = Number(options.iconImage.naturalHeight || options.iconImage.height) || 1;
    const maxSize = Math.min(button.width, button.height) * 0.58;
    const scale = Math.min(maxSize / sourceWidth, maxSize / sourceHeight);
    const width = sourceWidth * scale;
    const height = sourceHeight * scale;
    ctx.drawImage(options.iconImage, cx - width * 0.5, cy - height * 0.5, width, height);
  } else if (icon === 'chat') {
    ctx.beginPath();
    CanvasPrimitives.roundRect(ctx, { x: cx - 14, y: cy - 11, width: 28, height: 20 }, 5);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - 7, cy + 9);
    ctx.lineTo(cx - 11, cy + 15);
    ctx.lineTo(cx + 1, cy + 9);
    ctx.stroke();
  } else if (icon === 'close') {
    ctx.beginPath();
    ctx.moveTo(cx - 11, cy - 11);
    ctx.lineTo(cx + 11, cy + 11);
    ctx.moveTo(cx + 11, cy - 11);
    ctx.lineTo(cx - 11, cy + 11);
    ctx.stroke();
  }
  ctx.restore();
  return button;
}

function drawPanelShell(ctx, panel, options = {}) {
  ctx.save();
  if (options.overlayRect) {
    ctx.fillStyle = options.overlayFill || 'rgba(0, 0, 0, 0.42)';
    ctx.fillRect(options.overlayRect.x, options.overlayRect.y, options.overlayRect.width, options.overlayRect.height);
  }
  ctx.shadowColor = options.shadowColor || 'rgba(0, 0, 0, 0.48)';
  ctx.shadowBlur = Number.isFinite(Number(options.shadowBlur)) ? Number(options.shadowBlur) : 22;
  ctx.fillStyle = options.fill || 'rgba(13, 18, 24, 0.94)';
  ctx.strokeStyle = options.stroke || 'rgba(255, 255, 255, 0.18)';
  ctx.lineWidth = Number.isFinite(Number(options.lineWidth)) ? Number(options.lineWidth) : 1.4;
  CanvasPrimitives.roundRect(ctx, panel, Number.isFinite(Number(options.radius)) ? Number(options.radius) : 14);
  ctx.fill();
  if (options.stroke !== false) ctx.stroke();
  ctx.restore();
}

function drawToggle(ctx, track, value, options = {}) {
  ctx.save();
  ctx.fillStyle = value ? (options.activeFill || '#d8be68') : (options.inactiveFill || 'rgba(255,255,255,0.18)');
  CanvasPrimitives.roundRect(ctx, track, track.height * 0.5);
  ctx.fill();
  drawInteractionOverlay(ctx, track, {
    ...options,
    radius: track.height * 0.5,
    hoverFill: options.hoverFill || 'rgba(255, 255, 255, 0.08)',
  });
  ctx.fillStyle = options.knobFill || '#f9f0cf';
  ctx.beginPath();
  ctx.arc(track.x + (value ? track.width - track.height * 0.58 : track.height * 0.58), track.y + track.height * 0.5, track.height * 0.375, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawToast(ctx, rect, text, options = {}) {
  ctx.save();
  ctx.globalAlpha = Number.isFinite(Number(options.opacity)) ? Number(options.opacity) : 1;
  ctx.fillStyle = options.fill || 'rgba(14, 38, 18, 0.72)';
  ctx.strokeStyle = options.stroke || 'rgba(255, 255, 255, 0.30)';
  ctx.lineWidth = Number.isFinite(Number(options.lineWidth)) ? Number(options.lineWidth) : 1.4;
  CanvasPrimitives.roundRect(ctx, rect, Number.isFinite(Number(options.radius)) ? Number(options.radius) : 8);
  ctx.fill();
  if (options.stroke !== false) ctx.stroke();
  ctx.fillStyle = options.textColor || DEFAULT_TEXT_COLOR;
  let fontSize = Number.isFinite(Number(options.fontSize)) ? Number(options.fontSize) : 23;
  const minFontSize = Number.isFinite(Number(options.minFontSize)) ? Number(options.minFontSize) : 17;
  const horizontalPadding = Number(options.horizontalPadding) || 44;
  do {
    ctx.font = `700 ${fontSize}px ${FONT_FAMILY}`;
    if (ctx.measureText(String(text)).width <= rect.width - horizontalPadding) break;
    fontSize -= 1;
  } while (fontSize > minFontSize);
  ctx.textAlign = options.textAlign === 'left' ? 'left' : 'center';
  ctx.textBaseline = 'middle';
  const textX = ctx.textAlign === 'left'
    ? rect.x + horizontalPadding * 0.5
    : rect.x + rect.width * 0.5;
  ctx.fillText(String(text), textX, rect.y + rect.height * 0.5 + (Number(options.textOffsetY) || 1), rect.width - horizontalPadding);
  ctx.restore();
}

return {
  createButton,
  drawButton,
  drawIconButton,
  drawInteractionOverlay,
  drawPanelShell,
  drawToast,
  drawToggle,
};
});

}, {"../canvasPrimitives":21}, "apps/three-game/src/render/hud/canvasControlsRenderer.js"],
23: [function(require, module, exports) {
(function installBreakScoreboardRenderer(root, factory) {
  const api = factory(root || {});
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SnookerBreakScoreboardRenderer = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this), function createBreakScoreboardRenderer(root) {
const CanvasPrimitives = typeof require === 'function'
  ? require('../canvasPrimitives')
  : root.SnookerCanvasPrimitives;
const BreakState = typeof require === 'function'
  ? require('../../core/rules/breakState')
  : root.SnookerBreakState;
const { BALL_COLORS } = typeof require === 'function'
  ? require('../../core/model/ballSpec')
  : { BALL_COLORS: root.SnookerBallSpec?.BALL_COLORS || {} };

function drawBreakScoreboard(ctx, rect, model = {}, options = {}) {
  const score = Number(model.score) || 0;
  const threshold = Number.isFinite(Number(options.threshold)) ? Number(options.threshold) : 0;
  if (!options.forceVisible && score <= threshold) return false;

  const ballColors = options.ballColors || BALL_COLORS;
  const counts = BreakState.createBreakCounts(model.counts || {});
  const side = options.side || 'none';
  const align = options.align || side;
  const label = options.label || 'Break';
  const inline = options.variant === 'inline';
  const chipRadius = Number.isFinite(Number(options.chipRadius))
    ? Number(options.chipRadius)
    : Math.max(8, Math.min(14, rect.height * 0.37));
  const chipStep = chipRadius * 2 + (inline ? 4 : 5);
  const visibleKinds = BreakState.BREAK_SCORE_ORDER.filter((kind) => (Number(counts[kind]) || 0) > 0);
  const pottedCount = visibleKinds.reduce((total, kind) => total + (Number(counts[kind]) || 0), 0);
  const inlineLeadWidth = Number(options.inlineLeadWidth) || Math.max(108, rect.height * 4.9);
  const inlineContentWidth = inlineLeadWidth + visibleKinds.length * chipStep;
  const baseX = inline && align === 'right'
    ? Math.max(rect.x, rect.x + rect.width - inlineContentWidth)
    : rect.x + (inline ? 0 : 10);
  const midY = rect.y + rect.height * 0.5 + 1;

  ctx.save();
  if (!inline) {
    ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
    ctx.shadowBlur = 8;
    ctx.fillStyle = options.background || '#f7f7f3';
    ctx.strokeStyle = options.border || 'rgba(17, 24, 31, 0.24)';
    ctx.lineWidth = 1;
    CanvasPrimitives.roundRect(ctx, rect, 2);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
    CanvasPrimitives.roundRect(ctx, {
      x: rect.x + 1,
      y: rect.y + 1,
      width: rect.width - 2,
      height: rect.height - 2,
    }, 1);
    ctx.stroke();
  }

  if (options.showIndicator === true && (side === 'left' || side === 'right')) {
    ctx.fillStyle = options.indicatorColor || '#e0a900';
    ctx.beginPath();
    if (side === 'left') {
      ctx.moveTo(rect.x, rect.y + rect.height * 0.5);
      ctx.lineTo(rect.x - 42, rect.y + rect.height * 0.04);
      ctx.lineTo(rect.x - 42, rect.y + rect.height * 0.96);
    } else {
      ctx.moveTo(rect.x + rect.width, rect.y + rect.height * 0.5);
      ctx.lineTo(rect.x + rect.width + 42, rect.y + rect.height * 0.04);
      ctx.lineTo(rect.x + rect.width + 42, rect.y + rect.height * 0.96);
    }
    ctx.closePath();
    ctx.fill();
  }

  ctx.fillStyle = options.textColor || '#111820';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  if (inline) {
    ctx.font = options.labelFont || '650 15px system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
    const labelText = options.showPottedCount === false
      ? label
      : `${label} ${score} · ${pottedCount}球`;
    ctx.fillText(labelText, baseX, midY);
    if (options.showPottedCount === false) {
      const labelGap = Number(options.labelGap) || Math.max(48, rect.height * 1.55);
      ctx.fillStyle = options.scoreColor || options.textColor || '#111820';
      ctx.font = options.scoreFont || '850 24px system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillText(String(score), baseX + labelGap, midY);
    }
  } else {
    ctx.font = options.labelFont || '450 17px system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText(label, baseX, midY);
    ctx.font = options.scoreFont || '850 28px system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText(String(score), baseX + 62, midY);
  }

  let chipX = baseX + (inline ? inlineLeadWidth : 116);
  BreakState.BREAK_SCORE_ORDER.forEach((kind) => {
    const count = Number(counts[kind]) || 0;
    if (count <= 0) return;
    const cx = chipX + chipRadius;
    const cy = rect.y + rect.height * 0.5;
    ctx.fillStyle = ballColors[kind] || '#e50012';
    ctx.beginPath();
    ctx.arc(cx, cy, chipRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.clip();
    const gradient = ctx.createLinearGradient(cx, cy - chipRadius, cx, cy + chipRadius);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.34)');
    gradient.addColorStop(0.46, 'rgba(255, 255, 255, 0)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.22)');
    ctx.fillStyle = gradient;
    ctx.fillRect(chipX, cy - chipRadius, chipRadius * 2, chipRadius * 2);
    ctx.restore();
    ctx.fillStyle = kind === 'yellow' ? '#111820' : '#ffffff';
    ctx.font = options.chipFont || '850 15px system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = kind === 'yellow' ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.42)';
    ctx.shadowBlur = 2;
    ctx.shadowOffsetY = 1;
    ctx.fillText(String(count), cx, cy + 1);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    chipX += chipStep;
  });
  ctx.restore();
  return true;
}

return {
  drawBreakScoreboard,
};
});

}, {"../canvasPrimitives":21,"../../core/rules/breakState":24,"../../core/model/ballSpec":5}, "apps/three-game/src/render/hud/breakScoreboardRenderer.js"],
24: [function(require, module, exports) {
(function installBreakState(root, factory) {
  const api = factory(root || {});
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SnookerBreakState = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this), function createBreakStateApi(root) {
const { BALL_KIND, COLOR_ORDER } = typeof require === 'function'
  ? require('../../config/constants')
  : {
    BALL_KIND: root.SnookerConstants?.BALL_KIND || {
      CUE: 'cue',
      RED: 'red',
      YELLOW: 'yellow',
      GREEN: 'green',
      BROWN: 'brown',
      BLUE: 'blue',
      PINK: 'pink',
      BLACK: 'black',
    },
    COLOR_ORDER: root.SnookerConstants?.COLOR_ORDER || ['yellow', 'green', 'brown', 'blue', 'pink', 'black'],
  };
const { BALL_VALUES } = typeof require === 'function'
  ? require('../model/ballSpec')
  : {
    BALL_VALUES: root.SnookerBallSpec?.BALL_VALUES || {
      cue: 0,
      red: 1,
      yellow: 2,
      green: 3,
      brown: 4,
      blue: 5,
      pink: 6,
      black: 7,
    },
  };

const BREAK_SCORE_ORDER = [BALL_KIND.RED, ...COLOR_ORDER];

function ballScoreValue(kind) {
  return BALL_VALUES[kind] || 0;
}

function createBreakCounts(source = {}) {
  return Object.fromEntries(BREAK_SCORE_ORDER.map((kind) => [kind, Number(source[kind]) || 0]));
}

function createBreakState() {
  return {
    score: 0,
    lastPotKind: '',
    pottedBallIds: [],
    scoredEventKeys: [],
    counts: createBreakCounts(),
  };
}

function cloneBreakState(state) {
  const source = state || createBreakState();
  return {
    score: Number(source.score) || 0,
    lastPotKind: source.lastPotKind || '',
    pottedBallIds: [...(source.pottedBallIds || [])],
    scoredEventKeys: [...(source.scoredEventKeys || [])],
    counts: createBreakCounts(source.counts || {}),
  };
}

function kindFromLookup(kindLookup, event) {
  if (event.ballKind) return event.ballKind;
  if (typeof kindLookup === 'function') return kindLookup(event.ballId, event);
  if (kindLookup?.get) return kindLookup.get(event.ballId);
  return kindLookup?.[event.ballId] || '';
}

function scorePottingEventsIntoBreakState(baseState, events, kindLookup, options = {}) {
  const eventTimeLimit = Number.isFinite(Number(options.eventTimeLimit))
    ? Number(options.eventTimeLimit)
    : Infinity;
  const next = cloneBreakState(baseState);
  const pottedRedIds = new Set(next.pottedBallIds || []);
  const scoredEventKeys = new Set(next.scoredEventKeys || []);

  (events || []).forEach((event) => {
    if (event.type !== 'ball-potted') return;
    if (Number(event.t ?? 0) > eventTimeLimit) return;
    const eventKey = [
      event.type,
      event.ballId || '',
      Number(event.t ?? 0).toFixed(4),
      event.pocketId || '',
    ].join(':');
    if (scoredEventKeys.has(eventKey)) return;
    const kind = kindFromLookup(kindLookup, event);
    if (kind === BALL_KIND.RED && event.ballId && pottedRedIds.has(event.ballId)) return;
    const value = ballScoreValue(kind);
    if (!value) return;
    scoredEventKeys.add(eventKey);
    next.scoredEventKeys.push(eventKey);
    if (kind === BALL_KIND.RED && event.ballId) {
      pottedRedIds.add(event.ballId);
      next.pottedBallIds.push(event.ballId);
    }
    next.score += value;
    next.counts[kind] = (next.counts[kind] || 0) + 1;
    next.lastPotKind = kind;
  });

  return next;
}

function possibleBreakFromBalls(breakState, balls) {
  const state = cloneBreakState(breakState);
  const tableBalls = (balls || []).filter((ball) => !ball.potted);
  const remainingReds = tableBalls.filter((ball) => ball.kind === BALL_KIND.RED).length;
  const colorClearance = tableBalls.reduce((sum, ball) => (
    ball.kind === BALL_KIND.CUE || ball.kind === BALL_KIND.RED
      ? sum
      : sum + ballScoreValue(ball.kind)
  ), 0);

  if (remainingReds > 0) {
    const pendingColorAfterRed = state.lastPotKind === BALL_KIND.RED ? ballScoreValue(BALL_KIND.BLACK) : 0;
    return state.score + pendingColorAfterRed + remainingReds * (ballScoreValue(BALL_KIND.RED) + ballScoreValue(BALL_KIND.BLACK)) + 27;
  }
  if (state.lastPotKind === BALL_KIND.RED) return state.score + ballScoreValue(BALL_KIND.BLACK) + colorClearance;
  return state.score + colorClearance;
}

return {
  BREAK_SCORE_ORDER,
  ballScoreValue,
  cloneBreakState,
  createBreakCounts,
  createBreakState,
  possibleBreakFromBalls,
  scorePottingEventsIntoBreakState,
};
});

}, {"../../config/constants":4,"../model/ballSpec":5}, "apps/three-game/src/core/rules/breakState.js"],
25: [function(require, module, exports) {
const {validateReplay}=require('./replay-format.cjs');
const {acceptedReplayShots}=require('./replay-history.cjs');
const {practiceShapeLabel}=require('../src/game-client/practiceMode');
function createPracticeReplayUI({core,setView,getView,notice,prepareAudio=async()=>true}){
 const id=new URL(location.href).searchParams.get('replay');
 let watching=id!==null,embedded=false;
 const base=new URL('../',document.baseURI);
 const gameUrl=new URL(location.href);gameUrl.search='';gameUrl.hash='';
 const api=new URL('api/practice-replays',base);
 const presentation=window.SnookerProduct?.createPracticeResultUI?.({notice});
 const dialog=presentation?.dialog||document.createElement('dialog');if(!presentation)dialog.className='practice-replay-dialog';
 if(!presentation)dialog.setAttribute('aria-labelledby','practice-replay-title');
 if(!presentation)dialog.innerHTML='<h2 id="practice-replay-title"></h2><p class="replay-summary"></p><p class="replay-feedback" role="status"></p><div class="replay-dialog-actions"></div>';
 if(!presentation)document.body.append(dialog);
 dialog.addEventListener('cancel',e=>e.preventDefault());
 const title=presentation?.title||dialog.querySelector('h2'),summary=presentation?.summary||dialog.querySelector('.replay-summary'),feedback=presentation?.feedback||dialog.querySelector('.replay-feedback'),actions=presentation?.actions||dialog.querySelector('.replay-dialog-actions');
 let savedUrl=id?location.href:'',savePending=false,generation=0,started=false,preparedRecord=null;
 function button(label,action){const el=document.createElement('button');el.type='button';el.textContent=label;el.onclick=action;actions.append(el);presentation?.decorateAction(el,label);return el;}
 function show(heading,detail='',modal=true){
  title.textContent=heading;summary.textContent=detail;feedback.textContent='';actions.replaceChildren();
  if(!dialog.open){if(modal)dialog.showModal();else dialog.show();}
 }
 function close(){if(dialog.open)dialog.close();}
 async function copyText(text){
  try{await navigator.clipboard.writeText(text);return true;}catch{}
  const temporary=document.createElement('textarea');temporary.value=text;temporary.setAttribute('readonly','');
  Object.assign(temporary.style,{position:'fixed',left:'0',top:'0',opacity:'0'});
  (dialog.open?dialog:document.body).append(temporary);temporary.select();temporary.setSelectionRange(0,text.length);
  let copied=false;try{copied=document.execCommand('copy');}catch{}finally{temporary.remove();}
  if(copied)return true;
  return false;
 }
 function complete(){
  const record=core.exportPracticeReplay();
  const best=record?Math.max(...record.shots.flatMap(s=>[s.before.players[0].break,s.after.players[0].break])):core.getState().players[0].break;
  const completionGeneration=generation;const verification=presentation?presentation.prepareResult(record):null;const verified=presentation?.pendingResult(record);
  streakCount=record?.streakCount ?? null;
  show(streakCount!==null?'恭喜你创造个人纪录！':'恭喜你完成挑战！',streakCount!==null?`${practiceShapeLabel(core.getPracticeShape())} · 连进 ${streakCount} 个`:`本局单杆最高分 ${best} 分 · 重打 ${core.retryCount()} 次`);
  const resultData={record,best,retries:core.retryCount(),shape:core.getPracticeShape(),streak:streakCount};presentation?.renderResult(resultData,verified);
  verification?.then(result=>{if(completionGeneration===generation&&dialog.open)presentation.renderResult(resultData,result);});
  button('再次挑战',()=>{close();if(streakCount!==null){core.continueBasicPractice();savedUrl='';generation++;setView('aim');return;}if(core.loadPracticeShape(core.getPracticeShape()))window.SnookerPracticeAnalytics?.track('challenge_started',{shapeId:core.getPracticeShape()});setView('aim');});
  const view=button('查看回放',async()=>{
   if(savePending)return;
   window.SnookerPracticeAnalytics?.track('replay_view_clicked');
   savePending=true;view.disabled=true;view.textContent='准备中…';feedback.textContent='';const current=generation;
   try{
    if(!record)throw Error('没有可查看的完整回放');
    if(!savedUrl){
     const response=await fetch(api,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(record),signal:AbortSignal.timeout(30000)});
     if(!response.ok)throw Error('回放保存失败，请重试。');
     const result=await response.json();if(!/^[a-f0-9]{32}$/.test(result.id))throw Error('回放保存失败，请重试。');
     if(current!==generation)return;
     const url=new URL(gameUrl);url.searchParams.set('replay',result.id);savedUrl=url.href;
    }
    await Promise.all([prepareAudio(),core.preparePracticeReplay(record)]);if(current!==generation)return;
    scores=record.shots.flatMap(s=>[s.before.players[0].break,s.after.players[0].break]);
    watching=true;embedded=true;document.documentElement.dataset.practiceReplay='true';
    core.loadPracticeReplay(record,{preserveChallenge:true});setView('broadcast');close();
   }catch(error){
    if(current===generation){watching=false;embedded=false;delete document.documentElement.dataset.practiceReplay;feedback.textContent=error.message;}
   }finally{if(current===generation){savePending=false;view.disabled=false;view.textContent='查看回放';}}
  });
 }
 function exit(){
  preparedRecord=null;
  close();watching=false;delete document.documentElement.dataset.practiceReplay;
  const restored=core.exitPracticeReplay();embedded=false;
  if(restored)complete();
  else {history.replaceState(null,'',gameUrl.href);savedUrl='';}
  if(document.querySelector('#loading'))window.dispatchEvent(new Event('practice-replay-start-game'));
 }
 function ended(){if(presentation)return;show('回放已结束',streakCount!==null?`${practiceShapeLabel(core.getPracticeShape())} · 连进 ${streakCount} 个`:`单杆最高分 ${Math.max(...scores)} 分 · 重打 ${core.retryCount()} 次`,false);button('重新播放',()=>{close();core.seekReplay(0,false);});button(embedded?'退出回放':'开始游戏',exit);}
 let scores=[0],streakCount=null;
 if(watching)document.documentElement.dataset.practiceReplay='true';
 return {
  get watching(){return watching;},
  async action(action){
   if(action==='exit'){exit();return;}
   if(action==='share'){
    window.SnookerPracticeAnalytics?.track('replay_share_clicked');
    const text=streakCount!==null?`${practiceShapeLabel(core.getPracticeShape())} · 连进 ${streakCount} 个\n点击查看回放：${savedUrl}`:`${practiceShapeLabel(core.getPracticeShape())} 球型 单杆${Math.max(...scores)}分，点击查看回放：${savedUrl}`;
    notice(await copyText(text)?'回放链接已复制！':'复制失败，请重试。');return;
   }
   const s=core.replayStatus();if(!s)return;if(action==='pause'){if(presentation&&s.ended)core.seekReplay(0,false);else core.togglePause();return;}const index=s.index+(action==='previous'?-1:1);if(index>=0&&index<s.total){close();core.seekReplay(index,s.paused);}
  },
  async prepare(){
   if(!watching)return true;
   try{
    if(!/^[a-f0-9]{32}$/.test(id))throw Object.assign(Error('回放链接无效'),{invalid:true});
    const response=await fetch(new URL(api.href+'/'+id),{signal:AbortSignal.timeout(30000)});
    if(!response.ok)throw Object.assign(Error(response.status===404?'回放不存在或已超过 30 天保存期限。':'回放加载失败，请刷新重试'),{expired:response.status===404});
    const raw=validateReplay(await response.json());
    preparedRecord={...raw,shots:acceptedReplayShots(raw),historyPolicy:'accepted-shots'};
    streakCount=preparedRecord.streakCount ?? null;
    scores=preparedRecord.shots.flatMap(s=>[s.before.players[0].break,s.after.players[0].break]);
    await Promise.all([prepareAudio(),core.preparePracticeReplay(preparedRecord)]);
    return true;
   }catch(e){if(presentation?.showReplayError){presentation.showReplayError(e);return false;}show(e.expired?'回放已失效':'无法播放回放',e.message);if(!e.expired)button('重试',()=>location.reload());button('开始游戏',exit);return false;}
  },
  start(){
   if(!watching||started||!preparedRecord)return;
   try{core.loadPracticeReplay(preparedRecord);preparedRecord=null;started=true;setView('broadcast');}
   catch(e){if(presentation?.showReplayError){presentation.showReplayError(e);return;}show('无法播放回放',e.message);button('开始游戏',exit);}
  },
  event(event){
   if(watching){if(event.type==='replay-ended')ended();if(event.type==='replay-seek')close();return;}
   if(event.type==='reset'){presentation?.reset();generation++;savePending=false;savedUrl='';close();}
   if(event.type==='settled'&&core.isPractice()&&core.getState().frameOver)complete();
  },
  update(){},
  dispose(){preparedRecord=null;close();dialog.remove();}
 };
}
module.exports={createPracticeReplayUI};

}, {"./replay-format.cjs":26,"./replay-history.cjs":27,"../src/game-client/practiceMode":3}, "apps/three-game/trial/practice-replay-ui.cjs"],
26: [function(require, module, exports) {
const {PRACTICE_SHAPES}=require('../src/game-client/practiceMode');
const DIFFICULTIES=['novice','intermediate','professional','master'];
const MAX_BYTES=16*1024*1024;
function validateReplay(record,{allowIncomplete=false}={}){
 const fail=()=>{throw new Error('回放数据不完整或格式错误');};
 function tree(v,depth=0){
  if(depth>24)fail();
  if(typeof v==='number'&&!Number.isFinite(v))fail();
  if(v&&typeof v==='object')for(const key of Object.keys(v)){
   if(['__proto__','constructor','prototype'].includes(key))fail();tree(v[key],depth+1);
  }
 }
 tree(record);
 if(record?.version!==1 || typeof record.engineVersion!=='string' || record.engineVersion.length>80 || (!allowIncomplete&&!record.completed))fail();
 if(!PRACTICE_SHAPES.some(s=>s.id===record.shapeId)||!Number.isInteger(record.retryCount)||record.retryCount<0)fail();
 if(!record.physics || Array.isArray(record.physics) || typeof record.physics!=='object')fail();
 if(!Array.isArray(record.shots)||record.shots.length<(allowIncomplete?0:1)||record.shots.length>1000)fail();
 const number=(v,lo,hi)=>typeof v==='number'&&Number.isFinite(v)&&v>=lo&&v<=hi;
 function snapshot(s){
  if(!s||!Array.isArray(s.balls)||s.balls.length<2||s.balls.length>22||!Array.isArray(s.players)||s.players.length!==2||!s.ruleState)fail();
  const ids=new Set();
  for(const b of s.balls){
   if(typeof b.id!=='string'||ids.has(b.id)||!['cue','red','yellow','green','brown','blue','pink','black'].includes(b.kind)||!number(b.pos?.x,-10000,10000)||!number(b.pos?.y,-10000,10000)||!number(b.radius,1,100))fail();ids.add(b.id);
  }
  if(!s.balls.some(b=>b.id===s.cueBallId&&b.kind==='cue'))fail();
 }
 for(const item of record.shots){
  snapshot(item.before);snapshot(item.after);
  if(item.placementBefore){snapshot(item.placementBefore);if(item.placementBefore.balls.length!==item.before.balls.length||item.before.balls.some(b=>!item.placementBefore.balls.some(p=>p.id===b.id&&p.kind===b.kind)))fail();}
  if(!DIFFICULTIES.includes(item.difficulty)||!item.aimValues||typeof item.aimValues!=='object')fail();
  const shot=item.shot;
  if(!number(shot?.power,0.001,100)||!number(shot.direction?.x,-1.001,1.001)||!number(shot.direction?.y,-1.001,1.001)||Math.hypot(shot.direction.x,shot.direction.y)<.99||!number(shot.tipOffset?.x,-1,1)||!number(shot.tipOffset?.y,-1,1)||!number(shot.verticalAngle,0,90)||!number(item.duration,0,120))fail();
  if(!item.cuePose||!['origin','back','right'].every(k=>Array.isArray(item.cuePose[k])&&item.cuePose[k].length===3&&item.cuePose[k].every(n=>number(n,-10000,10000))))fail();
 }
 if(record.streakCount!==undefined && (!['spot-black','spot-pink','random-long'].includes(record.shapeId)||!Number.isSafeInteger(record.streakCount)||record.streakCount<1||record.streakCount>=record.shots.length))fail();
 if(!allowIncomplete&&!record.shots.at(-1).after.frameOver)fail();
 return record;
}
module.exports={validateReplay,MAX_BYTES};

}, {"../src/game-client/practiceMode":3}, "apps/three-game/trial/replay-format.cjs"],
27: [function(require, module, exports) {
// Legacy recordings contained abandoned branches. Infer rollbacks only at a
// discontinuity, so an ordinary miss with an unchanged layout remains a shot.
function positionKey(snapshot){
 const n=x=>Math.round((Number(x)||0)*1e5);
 return JSON.stringify([snapshot.balls.map(b=>[b.id,b.potted,n(b.pos.x),n(b.pos.y)]),snapshot.players.map(p=>[p.score,p.break]),snapshot.ruleState.phase,snapshot.ruleState.targetColorKind,snapshot.ruleState.currentBreakPots]);
}
function acceptedReplayShots(record){
 if(record.historyPolicy==='accepted-shots')return record.shots;
 const accepted=[];
 for(const shot of record.shots){
  const before=positionKey(shot.before);
  if(accepted.length && positionKey(accepted.at(-1).after)!==before){
   const previous=accepted.findLastIndex(s=>positionKey(s.before)===before);
   if(previous>=0)accepted.splice(previous);
  }
  if(!shot.interrupted)accepted.push(shot);
 }
 return accepted;
}
module.exports={acceptedReplayShots,positionKey};

}, {}, "apps/three-game/trial/replay-history.cjs"],
28: [function(require, module, exports) {
// Explicit release snapshot: test-field drafts never affect the trial at runtime.
const snapshot = require('../../../assets/three-trial/tuning-snapshot.json');
const DIFFICULTY_KEY='snooker.3d-trial.difficulty.v1';
const ids=['novice','intermediate','professional','master'];
function readDifficulty(storage){
  try {const value=(storage||localStorage).getItem(DIFFICULTY_KEY);return ids.includes(value)?value:'novice';}catch{return 'novice';}
}
function rememberDifficulty(id,storage){
  if(!ids.includes(id))return false;
  try{(storage||localStorage).setItem(DIFFICULTY_KEY,id);}catch{/* Private/storage-disabled sessions still allow live selection. */}
  return true;
}
function aimValues(id=readDifficulty()){
  const saved=snapshot.presets.aim?.values||{};
  return saved.difficultyProfiles?.[ids.includes(id)?id:'novice']||saved;
}
function createConfig(api, defaults) {
  return api.createGameClientConfig({ ...defaults,
    aim: { ...defaults.aim, values: { ...defaults.aim.values, ...aimValues() } },
    physics: { ...defaults.physics, overrides: { ...defaults.physics.overrides, ...snapshot.presets.physics?.values } },
  });
}
module.exports = { snapshot, createConfig, readDifficulty, rememberDifficulty, aimValues, DIFFICULTY_KEY };

}, {"../../../assets/three-trial/tuning-snapshot.json":29}, "apps/three-game/trial/tuning.cjs"],
29: [function(require, module, exports) {
module.exports = {"source":"apps/three-game/config/test-field-presets.json","copiedAt":"2026-10-12T10:48:28.688Z","presets":{"aim":{"id":"cc3392d7-768d-4fab-93c5-012340488e9f","revisionId":"e51f1517-29a8-496f-a35d-d7d9640ed829","kind":"aim","name":"3D-v2","savedAt":1791770751142,"values":{"difficultyVersion":1,"activeDifficulty":"professional","difficultyProfiles":{"novice":{"clickPreAimEnabled":true,"clickPreAimColor":"#ffffff","clickPreAimAlpha":0.9,"clickPreAimWidthMm":3,"clickPreAimRadiusScale":1.3,"powerTrackContainerAlpha":0.35,"powerTrackCueAlpha":0.8,"observationAimEnabled":true,"broadcastAimEnabled":true,"godAimEnabled":true,"reboundMode":"line","reboundLineWidthMm":8,"cueBallReboundEnabled":true,"reboundEnabled":true,"reboundMinLengthMm":240,"reboundMaxLengthMm":400,"reboundMinAngleDeg":5,"reboundMaxAngleDeg":5,"reboundDistanceMm":5000,"reboundDistanceInfluence":0.45,"reboundAngleInfluence":0.6,"reboundSpinInfluence":0.5,"reboundStartWidthMm":10,"reboundColor":"#86cfff","reboundAlpha":0.8,"cueLineMode":"line","cueLineBlurMaxLengthMm":1000,"cueLineBlurStartAlpha":0.7,"cueLineBlurEndAlpha":0,"cueLineColor":"#ffffff","cueLineAlpha":0.7,"cueLineWidthMm":5,"cueBallCutAngleCurvePower":1,"cueBallDistanceCurvePower":1,"distanceLengthInfluence":1,"distanceAngleInfluence":0.2,"cutLengthInfluence":1,"cutAngleInfluence":1,"objectMode":"line","objectMaxDistanceMm":4000,"objectLineMinLengthMm":700,"objectLineMaxLengthMm":1400,"objectLineWidthMm":8,"objectConeMinLengthMm":225,"objectConeMaxLengthMm":800,"objectConeMinAngleDeg":1,"objectConeMaxAngleDeg":30,"objectConeStartWidthMm":5,"objectColor":"#00f900","objectAlpha":0.8,"cueBallMode":"line","cueBallLineMinLengthMm":300,"cueBallLineMaxLengthMm":800,"cueBallLineWidthMm":8,"cueBallConeMinLengthMm":150,"cueBallConeMaxLengthMm":500,"cueBallConeMinAngleDeg":1,"cueBallConeMaxAngleDeg":15,"cueBallConeStartWidthMm":5,"cueBallColor":"#f5f5ee","cueBallAlpha":0.8,"cueBallRedOverlayEnabled":true,"cueBallRedColor":"#ff3b30","cueBallRedAlpha":0.8,"ghostBallTailEnabled":false,"ghostBallTailWidthMm":3,"ghostBallTailColor":"#ffffff","ghostBallTailAlpha":0.9,"ghostBallLineWidthMm":4,"ghostBallStrokeColor":"#ffffff","ghostBallStrokeAlpha":0.92,"ghostBallFillColor":"#ffffff","ghostBallFillAlpha":0.5,"cushionAccuracyInfluenceStrength":1,"cushionAccuracyStartDistanceMm":120,"cueBallCushionAccuracyLengthPenaltyRatio":0.5,"cueBallCushionAccuracyConeAngleBoostDeg":22.5,"cushionTargetLengthInfluence":0.5,"cushionTargetAngleInfluence":0.75,"cushionTangentNoEffectAngleDeg":10,"backSnookerAccuracyInfluenceStrength":1,"backSnookerDetectionDistanceMm":300,"cueBallBackSnookerAccuracyLengthPenaltyRatio":0.5,"cueBallBackSnookerAccuracyConeAngleBoostDeg":22.5,"backSnookerTargetLengthInfluence":0.8,"backSnookerTargetAngleInfluence":1,"cueLineBlurCushionPenalty":0.5,"cueLineBlurBackSnookerPenalty":0.5},"intermediate":{"clickPreAimEnabled":true,"clickPreAimColor":"#ffffff","clickPreAimAlpha":0.9,"clickPreAimWidthMm":3,"clickPreAimRadiusScale":1.3,"powerTrackContainerAlpha":0.35,"powerTrackCueAlpha":0.8,"observationAimEnabled":false,"broadcastAimEnabled":true,"godAimEnabled":true,"reboundMode":"cone","reboundLineWidthMm":4,"cueBallReboundEnabled":true,"reboundEnabled":true,"reboundMinLengthMm":150,"reboundMaxLengthMm":240,"reboundMinAngleDeg":10,"reboundMaxAngleDeg":20,"reboundDistanceMm":3650,"reboundDistanceInfluence":0.5,"reboundAngleInfluence":0.6,"reboundSpinInfluence":0.5,"reboundStartWidthMm":10,"reboundColor":"#86cfff","reboundAlpha":0.65,"cueLineMode":"line","cueLineBlurMaxLengthMm":1000,"cueLineBlurStartAlpha":0.7,"cueLineBlurEndAlpha":0,"cueLineColor":"#ffffff","cueLineAlpha":0.7,"cueLineWidthMm":5,"cueBallCutAngleCurvePower":1,"cueBallDistanceCurvePower":1,"distanceLengthInfluence":1,"distanceAngleInfluence":0.2,"cutLengthInfluence":1,"cutAngleInfluence":1,"objectMode":"cone","objectMaxDistanceMm":4000,"objectLineMinLengthMm":0,"objectLineMaxLengthMm":600,"objectLineWidthMm":8,"objectConeMinLengthMm":500,"objectConeMaxLengthMm":1000,"objectConeMinAngleDeg":1,"objectConeMaxAngleDeg":20,"objectConeStartWidthMm":5,"objectColor":"#35e96d","objectAlpha":0.9,"cueBallMode":"cone","cueBallLineMinLengthMm":25,"cueBallLineMaxLengthMm":850,"cueBallLineWidthMm":5,"cueBallConeMinLengthMm":250,"cueBallConeMaxLengthMm":500,"cueBallConeMinAngleDeg":1,"cueBallConeMaxAngleDeg":10,"cueBallConeStartWidthMm":5,"cueBallColor":"#f5f5ee","cueBallAlpha":0.8,"cueBallRedOverlayEnabled":true,"cueBallRedColor":"#ff3b30","cueBallRedAlpha":0.8,"ghostBallTailEnabled":false,"ghostBallTailWidthMm":3,"ghostBallTailColor":"#ffffff","ghostBallTailAlpha":0.9,"ghostBallLineWidthMm":4,"ghostBallStrokeColor":"#ffffff","ghostBallStrokeAlpha":0.92,"ghostBallFillColor":"#ffffff","ghostBallFillAlpha":0.5,"cushionAccuracyInfluenceStrength":1,"cushionAccuracyStartDistanceMm":120,"cueBallCushionAccuracyLengthPenaltyRatio":0.5,"cueBallCushionAccuracyConeAngleBoostDeg":22.5,"cushionTargetLengthInfluence":0.5,"cushionTargetAngleInfluence":0.75,"cushionTangentNoEffectAngleDeg":10,"backSnookerAccuracyInfluenceStrength":1,"backSnookerDetectionDistanceMm":300,"cueBallBackSnookerAccuracyLengthPenaltyRatio":0.5,"cueBallBackSnookerAccuracyConeAngleBoostDeg":22.5,"backSnookerTargetLengthInfluence":0.8,"backSnookerTargetAngleInfluence":1,"cueLineBlurCushionPenalty":0.5,"cueLineBlurBackSnookerPenalty":0.5},"professional":{"clickPreAimEnabled":true,"clickPreAimColor":"#ffffff","clickPreAimAlpha":0.9,"clickPreAimWidthMm":3,"clickPreAimRadiusScale":1.3,"powerTrackContainerAlpha":0.35,"powerTrackCueAlpha":0.8,"observationAimEnabled":false,"broadcastAimEnabled":true,"godAimEnabled":false,"reboundMode":"cone","reboundLineWidthMm":4,"cueBallReboundEnabled":false,"reboundEnabled":true,"reboundMinLengthMm":150,"reboundMaxLengthMm":240,"reboundMinAngleDeg":10,"reboundMaxAngleDeg":20,"reboundDistanceMm":3650,"reboundDistanceInfluence":0.5,"reboundAngleInfluence":0.6,"reboundSpinInfluence":0.5,"reboundStartWidthMm":10,"reboundColor":"#86cfff","reboundAlpha":0.65,"cueLineMode":"blur","cueLineBlurMaxLengthMm":2000,"cueLineBlurStartAlpha":0.7,"cueLineBlurEndAlpha":0.05,"cueLineColor":"#ffffff","cueLineAlpha":0.7,"cueLineWidthMm":5,"cueBallCutAngleCurvePower":1,"cueBallDistanceCurvePower":1,"distanceLengthInfluence":1,"distanceAngleInfluence":0.2,"cutLengthInfluence":1,"cutAngleInfluence":1,"objectMode":"cone","objectMaxDistanceMm":4000,"objectLineMinLengthMm":0,"objectLineMaxLengthMm":600,"objectLineWidthMm":8,"objectConeMinLengthMm":350,"objectConeMaxLengthMm":700,"objectConeMinAngleDeg":1,"objectConeMaxAngleDeg":30,"objectConeStartWidthMm":5,"objectColor":"#35e96d","objectAlpha":0.9,"cueBallMode":"cone","cueBallLineMinLengthMm":25,"cueBallLineMaxLengthMm":850,"cueBallLineWidthMm":5,"cueBallConeMinLengthMm":200,"cueBallConeMaxLengthMm":400,"cueBallConeMinAngleDeg":1,"cueBallConeMaxAngleDeg":15,"cueBallConeStartWidthMm":5,"cueBallColor":"#f5f5ee","cueBallAlpha":0.8,"cueBallRedOverlayEnabled":true,"cueBallRedColor":"#ff3b30","cueBallRedAlpha":0.8,"ghostBallTailEnabled":false,"ghostBallTailWidthMm":3,"ghostBallTailColor":"#ffffff","ghostBallTailAlpha":0.9,"ghostBallLineWidthMm":4,"ghostBallStrokeColor":"#ffffff","ghostBallStrokeAlpha":0.92,"ghostBallFillColor":"#ffffff","ghostBallFillAlpha":0.5,"cushionAccuracyInfluenceStrength":1,"cushionAccuracyStartDistanceMm":120,"cueBallCushionAccuracyLengthPenaltyRatio":0.5,"cueBallCushionAccuracyConeAngleBoostDeg":22.5,"cushionTargetLengthInfluence":0.5,"cushionTargetAngleInfluence":0.75,"cushionTangentNoEffectAngleDeg":10,"backSnookerAccuracyInfluenceStrength":1,"backSnookerDetectionDistanceMm":300,"cueBallBackSnookerAccuracyLengthPenaltyRatio":0.5,"cueBallBackSnookerAccuracyConeAngleBoostDeg":22.5,"backSnookerTargetLengthInfluence":0.8,"backSnookerTargetAngleInfluence":1,"cueLineBlurCushionPenalty":0.3,"cueLineBlurBackSnookerPenalty":0.5},"master":{"clickPreAimEnabled":true,"clickPreAimColor":"#ffffff","clickPreAimAlpha":0.9,"clickPreAimWidthMm":3,"clickPreAimRadiusScale":1.3,"powerTrackContainerAlpha":0.35,"powerTrackCueAlpha":0.8,"observationAimEnabled":false,"broadcastAimEnabled":false,"godAimEnabled":false,"reboundMode":"cone","reboundLineWidthMm":4,"cueBallReboundEnabled":false,"reboundEnabled":false,"reboundMinLengthMm":150,"reboundMaxLengthMm":240,"reboundMinAngleDeg":10,"reboundMaxAngleDeg":20,"reboundDistanceMm":3650,"reboundDistanceInfluence":0.5,"reboundAngleInfluence":0.6,"reboundSpinInfluence":0.5,"reboundStartWidthMm":10,"reboundColor":"#86cfff","reboundAlpha":0.65,"cueLineMode":"blur","cueLineBlurMaxLengthMm":1500,"cueLineBlurStartAlpha":0.7,"cueLineBlurEndAlpha":0.05,"cueLineColor":"#ffffff","cueLineAlpha":0.7,"cueLineWidthMm":5,"cueBallCutAngleCurvePower":1,"cueBallDistanceCurvePower":1,"distanceLengthInfluence":1,"distanceAngleInfluence":0.2,"cutLengthInfluence":1,"cutAngleInfluence":1,"objectMode":"cone","objectMaxDistanceMm":2000,"objectLineMinLengthMm":0,"objectLineMaxLengthMm":600,"objectLineWidthMm":8,"objectConeMinLengthMm":300,"objectConeMaxLengthMm":600,"objectConeMinAngleDeg":1,"objectConeMaxAngleDeg":40,"objectConeStartWidthMm":5,"objectColor":"#35e96d","objectAlpha":0.9,"cueBallMode":"cone","cueBallLineMinLengthMm":25,"cueBallLineMaxLengthMm":850,"cueBallLineWidthMm":5,"cueBallConeMinLengthMm":150,"cueBallConeMaxLengthMm":300,"cueBallConeMinAngleDeg":1,"cueBallConeMaxAngleDeg":20,"cueBallConeStartWidthMm":5,"cueBallColor":"#f5f5ee","cueBallAlpha":0.8,"cueBallRedOverlayEnabled":true,"cueBallRedColor":"#ff3b30","cueBallRedAlpha":0.8,"ghostBallTailEnabled":false,"ghostBallTailWidthMm":3,"ghostBallTailColor":"#ffffff","ghostBallTailAlpha":0.9,"ghostBallLineWidthMm":4,"ghostBallStrokeColor":"#ffffff","ghostBallStrokeAlpha":0.92,"ghostBallFillColor":"#ffffff","ghostBallFillAlpha":0.5,"cushionAccuracyInfluenceStrength":1,"cushionAccuracyStartDistanceMm":120,"cueBallCushionAccuracyLengthPenaltyRatio":0.5,"cueBallCushionAccuracyConeAngleBoostDeg":22.5,"cushionTargetLengthInfluence":0.5,"cushionTargetAngleInfluence":0.75,"cushionTangentNoEffectAngleDeg":10,"backSnookerAccuracyInfluenceStrength":1,"backSnookerDetectionDistanceMm":300,"cueBallBackSnookerAccuracyLengthPenaltyRatio":0.5,"cueBallBackSnookerAccuracyConeAngleBoostDeg":22.5,"backSnookerTargetLengthInfluence":0.8,"backSnookerTargetAngleInfluence":1,"cueLineBlurCushionPenalty":0.3,"cueLineBlurBackSnookerPenalty":0.5}}}},"physics":{"id":"2b6704d8-0274-4480-baa7-1c21d6a647a6","revisionId":"a4f38d9c-838f-44ed-b83c-b58adbcbc93c","kind":"physics","name":"V1","savedAt":1791771640960,"values":{"maxCueElevationDeg":20,"maxCenterBallSpeedMmS":7000,"maxTipOffsetRatio":0.5,"maxTipSpeedRetention":0.85,"cueSpinEfficiency":0.8,"gravityMmS2":9810,"clothSlidingMu":0.17,"clothRollingDecelMmS2":125,"clothSideSpinDecelRadS2":18,"ballNormalRestitution":1,"ballContactFrictionMu":0,"cushionContactFrictionMu":0.14,"cushionNoseHeightRadiusRatio":1.4,"cushionEnergeticRestitution":0.95,"cushionSpinCorrectionStrength":0.32,"cushionImpulseSteps":64}},"lighting":{"id":"99412025-e523-475f-86a4-3bb6d4355186","revisionId":"b607703e-1806-4597-b431-a1a706d53b3b","kind":"lighting","name":"V1","savedAt":1791778449463,"values":{"shadowOpacity":1,"shadowSize":0.8,"shadowOffsetStrength":0.5,"shadowInnerStrength":0.75,"shadowOuterStrength":0.35,"shadowInnerRadius":0.5,"shadowOuterRadius":0.67,"shadowInnerBlur":0.35,"shadowOuterBlur":0.34,"whiteWarmth":0.5,"shadowEnabled":true,"colorReflection":1.6,"whiteReflection":1.6,"pocketBrightness":2.36,"mainAmount":1.1,"aoStrength":1,"fresnelAmount":0,"fresnelFocus":0.22,"roughness":0,"ambientIntensity":2,"ambientColor":"#b9b9b9","floorMaterial":"red","railBase":1,"railReflection":1,"railEdge":1,"railFocus":1,"baizeRoughness":0.95,"baizeSoftReflection":1,"baizeBase":1.1,"baizeEdge":1,"baizeFocus":1,"baizeDetail":1,"baizeWeaveScale":0.5,"cushionSurfaceRoughness":0.95,"cushionSurfaceSoftReflection":0.35,"cushionSurfaceBase":1,"cushionSurfaceEdge":1,"cushionSurfaceFocus":1,"cushionSurfaceDetail":1,"cushionSurfaceWeaveScale":0.5,"floorSurfaceBase":1,"floorSurfaceReflection":1,"floorSurfaceEdge":1,"floorSurfaceFocus":1,"floorSurfaceDetail":1,"floorSurfaceScale":1,"leatherReflection":1,"leatherRoughness":0.38,"legReflection":1,"legRoughness":0.32,"floorBakedLight":1,"cueDiffuseTop":0.85,"cueDiffuseFill":0,"cueReflection":3,"cueRoughness":0.75,"cueRoomEdge":1,"cueRoomFocus":1,"cueBaseLight":0.5,"cueBrassReflection":1.15,"cueBrassRoughness":0.19,"cueShadowEnabled":true,"cueShadowOpacity":0.42,"cueShadowSoftness":1,"cueShadowHeightFade":4,"roofLength":5,"roofWidth":0.8,"roofHeight":2.8,"broadcastHeight":3.3809460939255955,"broadcastElevation":25}},"scene":{"id":"ac787b10-f98b-4f28-830a-7e80c0e9c759","revisionId":"a56a5e2d-493e-41e5-a972-12d359953bed","kind":"scene","name":"羊毛地毯 V2","savedAt":1791645047871,"values":{"show_room":true,"show_floor":true,"show_legs":true,"show_panels":true,"show_rails":true,"show_cloth":true,"show_leather":true,"show_net":true,"show_rings":true,"show_slides":true,"show_cue":true,"show_balls":true,"show_other":true,"isolate":"all","roomEnvironment":"crucible","background":"#07100e","floorMaterial":"woolV2","carpetCustom":true,"carpetColor":"#b23d44","floorRepeat":1,"railWoodStyle":"redBrown","allTextures":true,"colorMaps":true,"normalMaps":true,"roughnessMaps":true,"mode":"original","wireframe":false}}},"sceneSource":{"source":"apps/three-game/config/test-field-presets.json","revisionId":"05224845-6490-4dcf-a6f9-1d100843c782","copiedAt":"2026-09-14T15:05:35.596Z"},"aimSource":{"source":"apps/three-game/config/test-field-presets.json","revisionId":"74c62ba8-d592-45d7-b998-105381558e58","copiedAt":"2026-09-30T16:14:26.828Z"},"physicsSource":{"path":"assets/three-table-preview/project-presets.json","name":"V1","revisionId":"d82ee80c-c3e9-4b43-8574-dd5d15ddd9dc","copiedAt":"2026-09-21T08:21:54.248844+00:00"}};
}, {}, "assets/three-trial/tuning-snapshot.json"],
30: [function(require, module, exports) {
// Preserve the desktop 110 × 356 control's cue/container proportions.
function powerGeometry(power, mobile) {
  const containerWidth = 58 * Math.max(1, power.height - 15) / 341;
  const width = 2 * containerWidth;
  const visualScale=power.visualScale||1;
  return {
    containerWidth:containerWidth*visualScale,
    rect: { ...power, x: power.x, y: power.y - 42*visualScale, width, height: (power.height + 42)*visualScale },
  };
}
module.exports = { powerGeometry };

}, {}, "apps/three-game/trial/power-geometry.cjs"],
31: [function(require, module, exports) {
const {powerGeometry}=require('./power-geometry.cjs');
const {tipPadMetrics}=require('../src/input/shotControlRenderer.js');
function anchorShotControls(layout,{device,width,height,safeLeft=0,safeRight=0,designWidth=1920,designHeight=1080}){
 const scale=Math.min(width/designWidth,height/designHeight),offsetX=(width-designWidth*scale)/2;
 const result={...layout};
 for(const key of ['tipPad','powerPull']){
  const r=layout[key];if(!r)continue;
  if(key==='powerPull'){
   const hitWidth=powerGeometry(r,device==='mobile').rect.width;
   result[key]={...r,x:(width-offsetX)/scale-hitWidth};continue;
  }
  const side=r.horizontalAnchor||(device==='mobile'&&key==='tipPad'?'left':'right');
  const inset=Number.isFinite(r.sideInset)?Math.max(0,r.sideInset):Math.max(0,side==='left'?r.x:designWidth-r.x-r.width);
  const pixelX=side==='left'?safeLeft+inset*scale:width-safeRight-(inset+r.width)*scale;
  result[key]={...r,x:(pixelX-offsetX)/scale};
 }
 if(device==='desktop' && result.tipPad && result.powerPull){
  const power=powerGeometry(result.powerPull,false);
  // The visible track starts at canvas x=0; its hit canvas is twice as wide.
  result.tipPad={...result.tipPad,x:power.rect.x+(power.containerWidth-result.tipPad.width)/2};
 }
 if(device==='mobile' && result.tipPad && result.powerPull){
  const tip=result.tipPad,{radius}=tipPadMetrics(tip);
  const visibleBottom=tip.y+tip.height/2+radius+Math.max(2,radius*.08)/2;
  // Power track ends 5 units inside its canvas, plus half its 1-unit stroke.
  const power=result.powerPull;
  const joystickTop=tip.y-Math.min(tip.width,tip.height)*.6-16/scale;
  const visualScale=(visibleBottom-joystickTop)/(power.height-4);
  // Preserve the existing visible lower-left corner; grow upward and rightward.
  result.powerPull={...power,visualScale,y:visibleBottom-(power.height-4.5)*visualScale};
 }
 return result;
}
module.exports={anchorShotControls};

}, {"./power-geometry.cjs":30,"../src/input/shotControlRenderer.js":32}, "apps/three-game/trial/side-anchors.cjs"],
32: [function(require, module, exports) {
(function installShotControlRenderer(root, factory) {
  let PowerController = root?.SnookerPowerController || root?.TestFieldPowerController || null;
  let ShotControl = root?.SnookerShotControl || root?.TestFieldShotControl || null;
  if (typeof module === 'object' && module.exports) {
    PowerController = PowerController || require('./powerController');
    ShotControl = ShotControl || require('./shotControl');
  }
  const api = factory(PowerController, ShotControl);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SnookerShotControlRenderer = api;
    root.TestFieldShotControlRenderer = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this), function createShotControlRenderer(PowerController, ShotControl) {
const DEFAULT_TIP_RADIUS_RATIO = 0.42;
const DEFAULT_TIP_PAD_FILL_ALPHA = 0.18;

function rectFrom(rect = {}) {
  return {
    x: Number(rect.x ?? rect.left) || 0,
    y: Number(rect.y ?? rect.top) || 0,
    width: Math.max(1, Number(rect.width) || 1),
    height: Math.max(1, Number(rect.height) || 1),
  };
}

function pointInRect(point, rect) {
  return Boolean(
    point
    && rect
    && point.x >= rect.x
    && point.x <= rect.x + rect.width
    && point.y >= rect.y
    && point.y <= rect.y + rect.height
  );
}

function tipPadOffsetScale(rect, options = {}) {
  const { radius, dotRadius } = tipPadMetrics(rect, options);
  const maxOffset = Number.isFinite(Number(options.maxOffset))
    ? Number(options.maxOffset)
    : ShotControl.constants.TIP_PAD_MAX_OFFSET;
  return Math.max(1, (radius - dotRadius) / Math.max(0.000001, maxOffset));
}

function tipPadMetrics(rect, options = {}) {
  const pad = rectFrom(rect);
  const radius = Math.min(pad.width, pad.height) * (options.radiusRatio || DEFAULT_TIP_RADIUS_RATIO);
  return {
    dotRadius: options.dotRadius || Math.max(5, radius * 0.14),
    pad,
    radius,
  };
}

function drawTipPad(ctx, rect, state = {}, options = {}) {
  const { pad, radius, dotRadius } = tipPadMetrics(rect, options);
  const center = {
    x: pad.x + pad.width * 0.5,
    y: pad.y + pad.height * 0.5,
  };
  const tipOffset = state.tipOffset || { x: 0, y: 0 };
  const alpha = Number.isFinite(Number(options.alpha)) ? Number(options.alpha) : 0.72;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = options.fillStyle || `rgba(245, 250, 246, ${DEFAULT_TIP_PAD_FILL_ALPHA})`;
  ctx.beginPath();
  ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = options.ringStyle || 'rgba(245, 250, 246, 0.28)';
  ctx.lineWidth = options.ringWidth || Math.max(2, radius * 0.08);
  ctx.stroke();

  ctx.globalAlpha = alpha;
  ctx.strokeStyle = options.crossStyle || 'rgba(245, 250, 246, 0.26)';
  ctx.lineWidth = options.crossWidth || Math.max(1, radius * 0.03);
  ctx.beginPath();
  ctx.moveTo(center.x - radius, center.y);
  ctx.lineTo(center.x + radius, center.y);
  ctx.moveTo(center.x, center.y - radius);
  ctx.lineTo(center.x, center.y + radius);
  ctx.stroke();

  const dot = ShotControl.tipPadPointFromOffset(tipOffset, pad, {
    maxOffset: ShotControl.constants.TIP_PAD_MAX_OFFSET,
    // Keep the full red dot inside the pad at the maximum allowed offset.
    offsetScalePx: tipPadOffsetScale(pad, { dotRadius, radiusRatio: options.radiusRatio }),
  });
  ctx.globalAlpha = Number.isFinite(Number(options.dotAlpha)) ? Number(options.dotAlpha) : 0.9;
  ctx.beginPath();
  ctx.arc(dot.x, dot.y, dotRadius, 0, Math.PI * 2);
  ctx.fillStyle = options.dotStyle || 'rgba(224, 67, 65, 0.9)';
  ctx.fill();
  if (options.dotStrokeStyle !== false) {
    ctx.strokeStyle = options.dotStrokeStyle || 'rgba(14, 22, 30, 0.86)';
    ctx.lineWidth = options.dotStrokeWidth || Math.max(1, dotRadius * 0.22);
    ctx.stroke();
  }
  ctx.restore();

  return { rect: pad, center, radius, dot };
}

function drawPowerController(ctx, rect, state = {}, assets = {}, options = {}) {
  const bounds = rectFrom(rect);
  PowerController.drawPowerController(ctx, bounds, state, assets, options);
  return { rect: bounds };
}

function formatPowerValue(power) {
  const value = ShotControl.resolvedShotPower(power);
  return String(Math.round(value));
}

function drawPowerValue(ctx, rect, state = {}, options = {}) {
  if (options.visible === false) return null;
  const bounds = rectFrom(rect);
  const value = Math.max(0, Math.min(100, (Number(state.power) || 0)));
  const width = Number.isFinite(Number(options.width)) ? Number(options.width) : Math.min(54, bounds.width * 0.72);
  const height = Number.isFinite(Number(options.height)) ? Number(options.height) : 28;
  const offsetX = Number.isFinite(Number(options.offsetX)) ? Number(options.offsetX) : 0;
  const offsetY = Number.isFinite(Number(options.offsetY)) ? Number(options.offsetY) : 0;
  const chip = {
    x: bounds.x + (bounds.width - width) * 0.5 + offsetX,
    y: bounds.y + Math.max(5, bounds.height * 0.025) + offsetY,
    width,
    height,
  };

  ctx.save();
  ctx.globalAlpha = Number.isFinite(Number(options.alpha)) ? Number(options.alpha) : 0.95;
  ctx.fillStyle = options.fillStyle || 'rgba(9, 14, 19, 0.66)';
  ctx.strokeStyle = options.strokeStyle || 'rgba(244, 223, 149, 0.42)';
  ctx.lineWidth = Number.isFinite(Number(options.lineWidth)) ? Number(options.lineWidth) : 1;
  const radius = Math.min(7, chip.height * 0.5);
  ctx.beginPath();
  ctx.moveTo(chip.x + radius, chip.y);
  ctx.lineTo(chip.x + chip.width - radius, chip.y);
  ctx.quadraticCurveTo(chip.x + chip.width, chip.y, chip.x + chip.width, chip.y + radius);
  ctx.lineTo(chip.x + chip.width, chip.y + chip.height - radius);
  ctx.quadraticCurveTo(chip.x + chip.width, chip.y + chip.height, chip.x + chip.width - radius, chip.y + chip.height);
  ctx.lineTo(chip.x + radius, chip.y + chip.height);
  ctx.quadraticCurveTo(chip.x, chip.y + chip.height, chip.x, chip.y + chip.height - radius);
  ctx.lineTo(chip.x, chip.y + radius);
  ctx.quadraticCurveTo(chip.x, chip.y, chip.x + radius, chip.y);
  ctx.closePath();
  ctx.fill();
  if (options.strokeStyle !== false) ctx.stroke();
  ctx.fillStyle = options.textStyle || '#f4df95';
  ctx.font = options.font || '800 18px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(formatPowerValue(value), chip.x + chip.width * 0.5, chip.y + chip.height * 0.5 + (Number(options.textOffsetY) || 1));
  ctx.restore();
  return chip;
}

function layoutShotControlPanel(rect, options = {}) {
  const panel = rectFrom(rect);
  const gap = Number.isFinite(Number(options.gap)) ? Number(options.gap) : 10;
  const padding = Number.isFinite(Number(options.padding)) ? Number(options.padding) : 0;
  const inner = {
    x: panel.x + padding,
    y: panel.y + padding,
    width: Math.max(1, panel.width - padding * 2),
    height: Math.max(1, panel.height - padding * 2),
  };
  const powerWidth = Math.max(
    58,
    Math.min(Number(options.powerWidth) || 86, inner.width * 0.48),
  );
  const tipSize = Math.max(
    72,
    Math.min(Number(options.tipSize) || 128, inner.width - powerWidth - gap, inner.height),
  );
  const tipPad = {
    x: inner.x,
    y: inner.y + (inner.height - tipSize) * 0.5,
    width: tipSize,
    height: tipSize,
  };
  const powerPullTrack = {
    x: inner.x + inner.width - powerWidth,
    y: inner.y,
    width: powerWidth,
    height: inner.height,
  };
  return {
    panel,
    tipPad,
    powerPullTrack,
  };
}

function drawShotControlPanel(ctx, rect, state = {}, assets = {}, options = {}) {
  const layout = layoutShotControlPanel(rect, options);
  const tip = drawTipPad(ctx, layout.tipPad, {
    tipOffset: state.tipOffset,
  }, options.tipPad || {});
  const power = drawPowerController(ctx, layout.powerPullTrack, {
    power: state.power,
    pullDistancePx: state.pullDistancePx,
    enabled: state.enabled,
  }, assets, options.powerController || {});
  const powerValue = drawPowerValue(ctx, layout.powerPullTrack, {
    power: state.power,
  }, options.powerValue || {});
  return {
    ...layout,
    tip,
    power,
    powerValue,
  };
}

function hitTestShotControl(point, layout) {
  if (pointInRect(point, layout?.tipPad)) return 'tip';
  if (pointInRect(point, layout?.powerPullTrack)) return 'power';
  return null;
}

return {
  DEFAULT_TIP_PAD_FILL_ALPHA,
  DEFAULT_TIP_RADIUS_RATIO,
  drawPowerController,
  drawPowerValue,
  formatPowerValue,
  drawShotControlPanel,
  drawTipPad,
  hitTestShotControl,
  layoutShotControlPanel,
  pointInRect,
  tipPadMetrics,
  tipPadOffsetScale,
};
});

}, {"./powerController":33,"./shotControl":34}, "apps/three-game/src/input/shotControlRenderer.js"],
33: [function(require, module, exports) {
(function installPowerController(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SnookerPowerController = api;
    root.TestFieldPowerController = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this), function createPowerController() {
  const POWER_SEGMENT_COUNT = 4;
  const GUARD_SEGMENT_RATIO = 0.25;
  const TOTAL_UNITS = POWER_SEGMENT_COUNT + GUARD_SEGMENT_RATIO * 2;
  const DEFAULT_INNER_SLOT = {
    x: 89 / 339,
    y: 87 / 1983,
    width: 159 / 339,
    height: 1817 / 1983,
  };
  const DEFAULT_BASE_ASPECT = 339 / 1983;

  function clamp(value, min, max) {
    const number = Number(value);
    if (!Number.isFinite(number)) return min;
    return Math.max(min, Math.min(max, number));
  }

  function resolvedPower(value) {
    return clamp((Number(value) || 0), 0, 100);
  }

  function rectFromDomRect(rect) {
    return {
      x: Number(rect?.x ?? rect?.left) || 0,
      y: Number(rect?.y ?? rect?.top) || 0,
      width: Math.max(1, Number(rect?.width) || 1),
      height: Math.max(1, Number(rect?.height) || 1),
    };
  }

  function createVisualBounds(rect, options = {}) {
    const bounds = rectFromDomRect(rect);
    const aspect = Number.isFinite(Number(options.baseAspect)) && Number(options.baseAspect) > 0
      ? Number(options.baseAspect)
      : DEFAULT_BASE_ASPECT;
    const heightLimitedWidth = bounds.height * aspect;
    const widthLimitedHeight = bounds.width / aspect;
    let width = bounds.width;
    let height = bounds.height;
    if (heightLimitedWidth <= bounds.width) {
      width = heightLimitedWidth;
    } else {
      height = widthLimitedHeight;
    }
    return {
      x: bounds.x + (bounds.width - width) * 0.5,
      y: bounds.y + (bounds.height - height) * 0.5,
      width,
      height,
    };
  }

  function createGeometry(rect, options = {}) {
    const hitBounds = rectFromDomRect(rect);
    const bounds = createVisualBounds(hitBounds, options);
    const slotRatio = options.innerSlot || DEFAULT_INNER_SLOT;
    const slot = {
      x: bounds.x + bounds.width * slotRatio.x,
      y: bounds.y + bounds.height * slotRatio.y,
      width: bounds.width * slotRatio.width,
      height: bounds.height * slotRatio.height,
    };
    const unit = slot.height / TOTAL_UNITS;
    const startGuardHeight = unit * GUARD_SEGMENT_RATIO;
    const endGuardHeight = unit * GUARD_SEGMENT_RATIO;
    const powerTop = slot.y + startGuardHeight;
    const powerBottom = slot.y + slot.height - endGuardHeight;
    const dividerYs = [];
    for (let index = 0; index <= POWER_SEGMENT_COUNT; index += 1) {
      dividerYs.push(powerTop + (powerBottom - powerTop) * index / POWER_SEGMENT_COUNT);
    }
    return {
      bounds,
      hitBounds,
      slot,
      unit,
      startGuardHeight,
      endGuardHeight,
      powerTop,
      powerBottom,
      powerRange: Math.max(1, powerBottom - powerTop),
      dividerYs,
    };
  }

  function clientPointY(input) {
    return Number(input?.clientY ?? input?.y ?? input) || 0;
  }

  function powerFromPoint(input, rect, options = {}) {
    const geometry = createGeometry(rect, options);
    const y = clamp(clientPointY(input), geometry.slot.y, geometry.powerBottom);
    if (y <= geometry.powerTop) return 0;
    return resolvedPower((y - geometry.powerTop) / geometry.powerRange * 100);
  }

  function powerFromPullDistance(distance, rect, options = {}) {
    const geometry = createGeometry(rect, options);
    const pullDistance = Math.max(0, Number(distance) || 0);
    const effectiveDistance = Math.max(0, pullDistance - geometry.startGuardHeight);
    return resolvedPower(effectiveDistance / geometry.powerRange * 100);
  }

  function cueTipYForPower(power, rect, options = {}) {
    const geometry = createGeometry(rect, options);
    const value = resolvedPower(power);
    if (value <= 0) return geometry.slot.y;
    return geometry.powerTop + geometry.powerRange * (value / 100);
  }

  function cueTipYForPullDistance(distance, rect, options = {}) {
    const geometry = createGeometry(rect, options);
    const maxDistance = geometry.powerBottom - geometry.slot.y;
    return geometry.slot.y + clamp(Number(distance) || 0, 0, maxDistance);
  }

  function maskOpacityForPower(power) {
    return 0.5 * (1 - resolvedPower(power) / 100);
  }

  function isDrawableImageAsset(image) {
    if (!image) return false;
    const width = Number(image.naturalWidth || image.width) || 0;
    const height = Number(image.naturalHeight || image.height) || 0;
    return Boolean((image.complete || image.assetState?.status === 'loaded') && width > 0 && height > 0);
  }

  function arePowerControllerImageAssetsReady(assets = {}) {
    return isDrawableImageAsset(assets.base) && isDrawableImageAsset(assets.cue);
  }

  function drawRoundedRect(ctx, rect, radius) {
    const r = Math.max(0, Math.min(radius, rect.width * 0.5, rect.height * 0.5));
    ctx.beginPath();
    ctx.moveTo(rect.x + r, rect.y);
    ctx.lineTo(rect.x + rect.width - r, rect.y);
    ctx.quadraticCurveTo(rect.x + rect.width, rect.y, rect.x + rect.width, rect.y + r);
    ctx.lineTo(rect.x + rect.width, rect.y + rect.height - r);
    ctx.quadraticCurveTo(rect.x + rect.width, rect.y + rect.height, rect.x + rect.width - r, rect.y + rect.height);
    ctx.lineTo(rect.x + r, rect.y + rect.height);
    ctx.quadraticCurveTo(rect.x, rect.y + rect.height, rect.x, rect.y + rect.height - r);
    ctx.lineTo(rect.x, rect.y + r);
    ctx.quadraticCurveTo(rect.x, rect.y, rect.x + r, rect.y);
    ctx.closePath();
  }

  function drawFallbackBase(ctx, bounds, geometry) {
    const frameGradient = ctx.createLinearGradient(bounds.x, bounds.y, bounds.x + bounds.width, bounds.y);
    frameGradient.addColorStop(0, '#212733');
    frameGradient.addColorStop(0.18, '#8b8f98');
    frameGradient.addColorStop(0.5, '#363a43');
    frameGradient.addColorStop(0.82, '#9ca0aa');
    frameGradient.addColorStop(1, '#1b2029');
    ctx.fillStyle = frameGradient;
    drawRoundedRect(ctx, bounds, bounds.width * 0.22);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.72)';
    ctx.lineWidth = Math.max(1, bounds.width * 0.025);
    ctx.stroke();

    const bar = ctx.createLinearGradient(geometry.slot.x, geometry.slot.y, geometry.slot.x, geometry.slot.y + geometry.slot.height);
    bar.addColorStop(0, '#fff200');
    bar.addColorStop(0.36, '#f7b400');
    bar.addColorStop(0.68, '#ff5a00');
    bar.addColorStop(1, '#ee0000');
    ctx.fillStyle = bar;
    drawRoundedRect(ctx, geometry.slot, geometry.slot.width * 0.38);
    ctx.fill();
  }

  function drawFallbackCue(ctx, cueRect) {
    const centerX = cueRect.x + cueRect.width * 0.5;
    const tipHeight = cueRect.height * 0.01;
    const ferruleHeight = cueRect.height * 0.024;
    const ferruleWidth = cueRect.width * 0.38;
    const tipWidth = ferruleWidth * 0.96;
    const topY = cueRect.y + tipHeight + ferruleHeight;
    const bottomY = cueRect.y + cueRect.height;
    const topWidth = ferruleWidth * 0.92;
    const midWidth = cueRect.width * 0.55;
    const tailWidth = cueRect.width * 0.82;

    const drawShaftPath = () => {
      ctx.beginPath();
      ctx.moveTo(centerX - topWidth * 0.5, topY);
      ctx.bezierCurveTo(
        centerX - midWidth * 0.5,
        cueRect.y + cueRect.height * 0.34,
        centerX - tailWidth * 0.5,
        cueRect.y + cueRect.height * 0.82,
        centerX - tailWidth * 0.5,
        bottomY,
      );
      ctx.quadraticCurveTo(
        centerX,
        bottomY + cueRect.width * 0.11,
        centerX + tailWidth * 0.5,
        bottomY,
      );
      ctx.bezierCurveTo(
        centerX + tailWidth * 0.5,
        cueRect.y + cueRect.height * 0.82,
        centerX + midWidth * 0.5,
        cueRect.y + cueRect.height * 0.34,
        centerX + topWidth * 0.5,
        topY,
      );
      ctx.closePath();
    };

    const shaft = ctx.createLinearGradient(cueRect.x, cueRect.y, cueRect.x + cueRect.width, cueRect.y);
    shaft.addColorStop(0, '#7a3f1d');
    shaft.addColorStop(0.16, '#c37a34');
    shaft.addColorStop(0.42, '#ffd58b');
    shaft.addColorStop(0.54, '#fff0b9');
    shaft.addColorStop(0.66, '#e59d4f');
    shaft.addColorStop(1, '#6e3318');

    drawShaftPath();
    ctx.fillStyle = shaft;
    ctx.fill();

    ctx.save();
    drawShaftPath();
    ctx.clip();
    ctx.globalAlpha = 0.28;
    ctx.strokeStyle = '#7d3f1a';
    ctx.lineWidth = Math.max(0.7, cueRect.width * 0.035);
    [0.34, 0.47, 0.61].forEach((ratio, index) => {
      const offset = (ratio - 0.5) * cueRect.width * 0.34;
      ctx.beginPath();
      ctx.moveTo(centerX + offset * 0.45, topY + cueRect.height * 0.04);
      ctx.bezierCurveTo(
        centerX + offset * 0.8,
        cueRect.y + cueRect.height * (0.28 + index * 0.03),
        centerX + offset * 1.08,
        cueRect.y + cueRect.height * 0.66,
        centerX + offset * 1.24,
        bottomY - cueRect.height * 0.05,
      );
      ctx.stroke();
    });
    const highlight = ctx.createLinearGradient(centerX, topY, centerX, bottomY);
    highlight.addColorStop(0, 'rgba(255, 255, 255, 0.42)');
    highlight.addColorStop(0.22, 'rgba(255, 255, 255, 0.18)');
    highlight.addColorStop(0.72, 'rgba(255, 255, 255, 0.28)');
    highlight.addColorStop(1, 'rgba(255, 255, 255, 0.08)');
    ctx.strokeStyle = highlight;
    ctx.lineWidth = Math.max(1, cueRect.width * 0.11);
    ctx.beginPath();
    ctx.moveTo(centerX - cueRect.width * 0.05, topY + cueRect.height * 0.02);
    ctx.bezierCurveTo(
      centerX - cueRect.width * 0.03,
      cueRect.y + cueRect.height * 0.35,
      centerX + cueRect.width * 0.01,
      cueRect.y + cueRect.height * 0.72,
      centerX + cueRect.width * 0.05,
      bottomY - cueRect.height * 0.04,
    );
    ctx.stroke();
    ctx.restore();

    drawShaftPath();
    ctx.strokeStyle = 'rgba(60, 28, 13, 0.54)';
    ctx.lineWidth = Math.max(0.7, cueRect.width * 0.035);
    ctx.stroke();

    const ferruleRect = {
      x: centerX - ferruleWidth * 0.5,
      y: cueRect.y + tipHeight,
      width: ferruleWidth,
      height: ferruleHeight,
    };
    drawRoundedRect(ctx, ferruleRect, Math.max(0.6, cueRect.width * 0.025));
    const ferrule = ctx.createLinearGradient(centerX - ferruleWidth * 0.5, 0, centerX + ferruleWidth * 0.5, 0);
    ferrule.addColorStop(0, '#7a5617');
    ferrule.addColorStop(0.18, '#d8a93f');
    ferrule.addColorStop(0.5, '#fff0a8');
    ferrule.addColorStop(0.78, '#b47a1f');
    ferrule.addColorStop(1, '#5c3b12');
    ctx.fillStyle = ferrule;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 244, 170, 0.44)';
    ctx.lineWidth = Math.max(0.5, cueRect.width * 0.018);
    ctx.beginPath();
    ctx.moveTo(ferruleRect.x + ferruleRect.width * 0.18, ferruleRect.y + ferruleRect.height * 0.18);
    ctx.lineTo(ferruleRect.x + ferruleRect.width * 0.82, ferruleRect.y + ferruleRect.height * 0.18);
    ctx.stroke();

    const tipTopY = cueRect.y + tipHeight * 0.36;
    const tipBaseY = cueRect.y + tipHeight;
    const tipLeft = centerX - tipWidth * 0.5;
    const tipRight = centerX + tipWidth * 0.5;
    const tip = ctx.createLinearGradient(tipLeft, cueRect.y, tipRight, cueRect.y);
    tip.addColorStop(0, '#152f28');
    tip.addColorStop(0.48, '#256d53');
    tip.addColorStop(1, '#10261f');
    ctx.beginPath();
    ctx.moveTo(tipLeft, tipBaseY);
    ctx.bezierCurveTo(
      tipLeft + tipWidth * 0.22,
      tipTopY,
      tipRight - tipWidth * 0.22,
      tipTopY,
      tipRight,
      tipBaseY,
    );
    ctx.lineTo(tipRight, tipBaseY + tipHeight * 0.16);
    ctx.quadraticCurveTo(centerX, tipBaseY + tipHeight * 0.28, tipLeft, tipBaseY + tipHeight * 0.16);
    ctx.closePath();
    ctx.fillStyle = tip;
    ctx.fill();
    ctx.strokeStyle = 'rgba(4, 16, 12, 0.42)';
    ctx.lineWidth = Math.max(0.4, cueRect.width * 0.014);
    ctx.stroke();
  }

  function drawPowerController(ctx, rect, state = {}, assets = {}) {
    const geometry = createGeometry(rect, state);
    const bounds = geometry.bounds;
    const power = resolvedPower(state.power);
    const enabled = state.enabled !== false;
    const alpha = enabled ? 1 : 0.5;
    const useImageAssets = arePowerControllerImageAssetsReady(assets);

    ctx.save();
    ctx.globalAlpha *= alpha;
    if (useImageAssets) {
      ctx.drawImage(assets.base, bounds.x, bounds.y, bounds.width, bounds.height);
    } else {
      drawFallbackBase(ctx, bounds, geometry);
    }

    ctx.save();
    drawRoundedRect(ctx, geometry.slot, geometry.slot.width * 0.36);
    ctx.clip();
    ctx.fillStyle = `rgba(0, 0, 0, ${maskOpacityForPower(power).toFixed(3)})`;
    ctx.fillRect(geometry.slot.x, geometry.slot.y, geometry.slot.width, geometry.slot.height);
    ctx.strokeStyle = 'rgba(18, 20, 24, 0.42)';
    ctx.lineWidth = Math.max(1, bounds.width * 0.018);
    geometry.dividerYs.forEach((y) => {
      ctx.beginPath();
      ctx.moveTo(geometry.slot.x, y);
      ctx.lineTo(geometry.slot.x + geometry.slot.width, y);
      ctx.stroke();
    });
    ctx.restore();

    const cueTipY = Number.isFinite(Number(state.pullDistancePx))
      ? cueTipYForPullDistance(state.pullDistancePx, bounds, state)
      : cueTipYForPower(power, bounds, state);
    const cueHeight = geometry.slot.height;
    const cueNaturalWidth = assets.cue?.naturalWidth || assets.cue?.width || 0;
    const cueNaturalHeight = assets.cue?.naturalHeight || assets.cue?.height || 0;
    const cueAspect = cueNaturalWidth > 0 && cueNaturalHeight > 0
      ? cueNaturalWidth / cueNaturalHeight
      : 0.05;
    const cueWidth = cueHeight * cueAspect;
    const cueRect = {
      x: bounds.x + bounds.width * 0.5 - cueWidth * 0.5,
      y: cueTipY,
      width: cueWidth,
      height: cueHeight,
    };
    ctx.save();
    drawRoundedRect(ctx, geometry.slot, geometry.slot.width * 0.36);
    ctx.clip();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = Math.max(2, bounds.width * 0.08);
    ctx.shadowOffsetY = Math.max(1, bounds.height * 0.01);
    if (useImageAssets) {
      ctx.drawImage(assets.cue, cueRect.x, cueRect.y, cueRect.width, cueRect.height);
    } else {
      drawFallbackCue(ctx, cueRect);
    }
    ctx.restore();
    ctx.restore();
  }

  return {
    constants: {
      POWER_SEGMENT_COUNT,
      GUARD_SEGMENT_RATIO,
      TOTAL_UNITS,
      DEFAULT_INNER_SLOT,
      DEFAULT_BASE_ASPECT,
    },
    createVisualBounds,
    createGeometry,
    arePowerControllerImageAssetsReady,
    cueTipYForPower,
    cueTipYForPullDistance,
    drawPowerController,
    isDrawableImageAsset,
    maskOpacityForPower,
    powerFromPoint,
    powerFromPullDistance,
    resolvedPower,
  };
});

}, {}, "apps/three-game/src/input/powerController.js"],
34: [function(require, module, exports) {
(function installShotControl(root, factory) {
  const api = factory(root || {});
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SnookerShotControl = api;
    root.TestFieldShotControl = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this), function createShotControl() {
  let PowerController = (typeof globalThis !== 'undefined' && globalThis.SnookerPowerController) || null;
  if (!PowerController && typeof require === 'function') {
    try {
      PowerController = require('./powerController');
    } catch (error) {
      PowerController = null;
    }
  }

  // Maximum actual surface offset, as in the original shot selector.
  const TIP_PAD_MAX_OFFSET = 0.5;
  const TIP_PAD_SCREEN_RADIUS_RATIO = 0.4;
  const POWER_PULL_TOP_PX = 10;
  const POWER_PULL_BOTTOM_PX = 168;
  const CUE_FOLLOW_THROUGH_RATIO = 0.5;
  const CUE_STRIKE_HOLD_MS = 200;
  const CUE_FADE_MS = 300;
  const MAX_CUE_PULL_OFFSET_MM = 220;
  const CUE_ADDRESS_GAP_MM = 10;
  const TIP_DRAG_FULL_DISTANCE_PX = 170;
  const SHOT_INTERACTION_MODE = {
    TOUCH_PULL: 'touch-pull',
  };

  function clamp(value, min, max) {
    const number = Number(value);
    if (!Number.isFinite(number)) return min;
    return Math.max(min, Math.min(max, number));
  }

  function normalize(vector) {
    const length = Math.hypot(vector?.x || 0, vector?.y || 0);
    if (length <= 0.000001) return { x: 1, y: 0 };
    return { x: vector.x / length, y: vector.y / length };
  }

  function normalizeAngleDeg(degrees) {
    let value = Number(degrees) || 0;
    while (value > 180) value -= 360;
    while (value <= -180) value += 360;
    return value;
  }

  function directionToAngleDeg(direction) {
    const value = normalize(direction);
    return normalizeAngleDeg(Math.atan2(value.y, value.x) * 180 / Math.PI);
  }

  function angleDegToDirection(degrees) {
    const radians = normalizeAngleDeg(degrees) * Math.PI / 180;
    return { x: Math.cos(radians), y: Math.sin(radians) };
  }

  function powerFromPull(startClientY, currentClientY, options = {}) {
    if (PowerController && options.controllerRect) {
      return PowerController.powerFromPullDistance(
        (Number(currentClientY) || 0) - (Number(startClientY) || 0),
        options.controllerRect,
        options,
      );
    }
    const top = Number.isFinite(Number(options.topPx)) ? Number(options.topPx) : POWER_PULL_TOP_PX;
    const bottom = Number.isFinite(Number(options.bottomPx)) ? Number(options.bottomPx) : POWER_PULL_BOTTOM_PX;
    const travel = Math.max(1, bottom - top);
    const pullDistance = clamp((Number(currentClientY) || 0) - (Number(startClientY) || 0), 0, travel);
    return resolvedShotPower(pullDistance / travel * 100);
  }

  function powerPullVisualOffsetPx(power) {
    if (PowerController && this?.controllerRect) {
      return PowerController.cueTipYForPower(power, this.controllerRect, this);
    }
    const ratio = clamp((Number(power) || 0) / 100, 0, 1);
    return 4 + ratio * 34;
  }

  function clampTipOffsetCircle(offset, maxOffset = TIP_PAD_MAX_OFFSET) {
    let x = clamp(offset?.x || 0, -maxOffset, maxOffset);
    let y = clamp(offset?.y || 0, -maxOffset, maxOffset);
    const offsetLength = Math.hypot(x, y);
    if (offsetLength > maxOffset) {
      x = x / offsetLength * maxOffset;
      y = y / offsetLength * maxOffset;
    }
    return { x, y };
  }

  function rectOrigin(rect) {
    return {
      x: Number.isFinite(Number(rect?.left)) ? Number(rect.left) : (Number(rect?.x) || 0),
      y: Number.isFinite(Number(rect?.top)) ? Number(rect.top) : (Number(rect?.y) || 0),
    };
  }

  function tipPadOffsetScale(rect, options = {}) {
    const maxOffset = Number.isFinite(Number(options.maxOffset)) ? Number(options.maxOffset) : TIP_PAD_MAX_OFFSET;
    const screenRadiusRatio = Number.isFinite(Number(options.screenRadiusRatio))
      ? Number(options.screenRadiusRatio)
      : TIP_PAD_SCREEN_RADIUS_RATIO;
    if (Number.isFinite(Number(options.offsetScalePx))) {
      return Math.max(1, Number(options.offsetScalePx));
    }
    return Math.max(1, Math.min(Number(rect?.width) || 1, Number(rect?.height) || 1) * screenRadiusRatio / maxOffset);
  }

  function tipPadPointFromOffset(offset, rect, options = {}) {
    const origin = rectOrigin(rect);
    const scale = tipPadOffsetScale(rect, options);
    const maxOffset = Number.isFinite(Number(options.maxOffset)) ? Number(options.maxOffset) : TIP_PAD_MAX_OFFSET;
    const clamped = clampTipOffsetCircle(offset, maxOffset);
    return {
      x: origin.x + (Number(rect?.width) || 0) * 0.5 + clamped.x * scale,
      y: origin.y + (Number(rect?.height) || 0) * 0.5 - clamped.y * scale,
    };
  }

  function tipOffsetFromPoint(point, rect, options = {}) {
    const origin = rectOrigin(rect);
    const scale = tipPadOffsetScale(rect, options);
    const maxOffset = Number.isFinite(Number(options.maxOffset)) ? Number(options.maxOffset) : TIP_PAD_MAX_OFFSET;
    return clampTipOffsetCircle({
      x: ((Number(point?.x) || 0) - (origin.x + (Number(rect?.width) || 0) * 0.5)) / scale,
      y: ((origin.y + (Number(rect?.height) || 0) * 0.5) - (Number(point?.y) || 0)) / scale,
    }, maxOffset);
  }

  function tipOffsetFromClientPoint(clientX, clientY, rect, options = {}) {
    return tipOffsetFromPoint({ x: clientX, y: clientY }, rect, options);
  }

  function tipOffsetFromPointerDelta(baseOffset, delta, options = {}) {
    const maxOffset = Number.isFinite(Number(options.maxOffset)) ? Number(options.maxOffset) : TIP_PAD_MAX_OFFSET;
    const fullDistancePx = Math.max(
      1,
        Number.isFinite(Number(options.fullDistancePx))
        ? Number(options.fullDistancePx)
        : TIP_DRAG_FULL_DISTANCE_PX,
    );
    return clampTipOffsetCircle({
      x: (baseOffset?.x || 0) + ((delta?.x || 0) / fullDistancePx) * maxOffset,
      y: (baseOffset?.y || 0) - ((delta?.y || 0) / fullDistancePx) * maxOffset,
    }, maxOffset);
  }

  function resolvedShotPower(power) {
    return clamp((Number(power) || 0), 0, 100);
  }

  function powerToPullOffsetMm(power, options = {}) {
    const maxPullOffsetMm = Math.max(
      0,
      Number.isFinite(Number(options.maxPullOffsetMm))
        ? Number(options.maxPullOffsetMm)
        : MAX_CUE_PULL_OFFSET_MM,
    );
    return resolvedShotPower(power) / 100 * maxPullOffsetMm;
  }

  function powerToAddressOffsetMm(power, options = {}) {
    return CUE_ADDRESS_GAP_MM + powerToPullOffsetMm(power, options);
  }

  function resolveClientY(input) {
    if (typeof input === 'number') return Number(input) || 0;
    return Number(input?.clientY ?? input?.y) || 0;
  }

  function createTouchPullShotInteraction(options = {}) {
    const topPx = Number.isFinite(Number(options.topPx)) ? Number(options.topPx) : POWER_PULL_TOP_PX;
    const bottomPx = Number.isFinite(Number(options.bottomPx)) ? Number(options.bottomPx) : POWER_PULL_BOTTOM_PX;
    const controllerRect = options.controllerRect || null;
    const controllerGeometry = controllerRect && PowerController ? PowerController.createGeometry(controllerRect, options) : null;
    const maxControllerDistance = controllerGeometry
      ? Math.max(1, controllerGeometry.powerBottom - controllerGeometry.slot.y)
      : Math.max(1, bottomPx - topPx);
    const deadZonePx = maxControllerDistance * Math.max(0, Number(options.deadZonePower)||0) / 100;
    let pull = null;

    function snapshot(extra = {}) {
      return {
        mode: SHOT_INTERACTION_MODE.TOUCH_PULL,
        active: Boolean(pull),
        power: pull?.power || 0,
        pullDistancePx: pull?.pullDistancePx || 0,
        ...extra,
      };
    }

    function begin(input) {
      pull = {
        startClientY: resolveClientY(input),
        normalizeStart: Boolean(options.normalizeTouchStart && input?.pointerType==='touch'),
        power: 0,
        pullDistancePx: 0,
      };
      return snapshot();
    }

    function move(input) {
      if (!pull) return snapshot({ active: false });
      const y=resolveClientY(input);
      // Mobile browsers may batch the initial movement behind touch slop.
      // Arm at zero on the first delivered sample beyond the guard, then track
      // subsequent motion linearly without inheriting that initial jump.
      if(pull.normalizeStart && y-pull.startClientY>=deadZonePx){
        pull.startClientY=y-deadZonePx;pull.normalizeStart=false;
      }
      pull.pullDistancePx = clamp(y - pull.startClientY, 0, maxControllerDistance+deadZonePx);
      pull.power = y-pull.startClientY<=deadZonePx+1e-9 ? 0 : powerFromPull(pull.startClientY+deadZonePx, y, {
        ...options,
        controllerRect,
        topPx,
        bottomPx,
      });
      return snapshot();
    }

    function end(input) {
      if (pull && input && !options.ignoreReleaseMotion) move(input);
      const result = snapshot({
        shouldShoot: Boolean(pull && pull.power > 0),
      });
      pull = null;
      return { ...result, active: false };
    }

    function cancel() {
      pull = null;
      return snapshot({ active: false, power: 0, shouldShoot: false });
    }

    return {
      mode: SHOT_INTERACTION_MODE.TOUCH_PULL,
      begin,
      move,
      end,
      cancel,
      getState: snapshot,
    };
  }

  function createShotInteraction(mode, options = {}) {
    return createTouchPullShotInteraction(options);
  }

  function createFrameRenderScheduler(options = {}) {
    const scheduleFrame = options.scheduleFrame || ((callback) => (
      typeof requestAnimationFrame === 'function' ? requestAnimationFrame(callback) : setTimeout(callback, 0)
    ));
    const render = typeof options.render === 'function' ? options.render : () => {};
    let pending = false;

    function request() {
      if (pending) return false;
      pending = true;
      scheduleFrame(() => {
        pending = false;
        render();
      });
      return true;
    }

    function flush() {
      if (!pending) return false;
      pending = false;
      render();
      return true;
    }

    return {
      flush,
      isPending: () => pending,
      request,
    };
  }

  function createCueStrikeAnimation(options = {}) {
    const power = resolvedShotPower(options.power);
    if (power <= 0 || !options.cuePos || !options.direction) return null;
    const direction = normalize(options.direction);
    const tipOffset = clampTipOffsetCircle(options.tipOffset || { x: 0, y: 0 });
    const pullOffset = powerToAddressOffsetMm(power, options);
    const duration = Math.max(95, 190 - power * 0.65);
    return {
      phase: 'strike',
      power,
      startTime: Number.isFinite(Number(options.now)) ? Number(options.now) : Date.now(),
      duration,
      pullOffset,
      followThroughOffset: -pullOffset * CUE_FOLLOW_THROUGH_RATIO,
      followThroughDuration: Number.isFinite(Number(options.followThroughDuration))
        ? Math.max(0, Number(options.followThroughDuration))
        : duration * CUE_FOLLOW_THROUGH_RATIO,
      holdDuration: Number.isFinite(Number(options.holdDuration))
        ? Math.max(0, Number(options.holdDuration))
        : CUE_STRIKE_HOLD_MS,
      fadeDuration: Number.isFinite(Number(options.fadeDuration)) ? Number(options.fadeDuration) : CUE_FADE_MS,
      currentOffset: pullOffset,
      opacity: 1,
      fired: false,
      cuePos: { x: Number(options.cuePos.x) || 0, y: Number(options.cuePos.y) || 0 },
      direction,
      radius: Number(options.radius) || 26.25,
      sideOffsetRatio: tipOffset.x || 0,
      shotPayload: options.shotPayload || null,
      replayArmed: false,
    };
  }

  function updateCueStrikeAnimation(animation, timestamp) {
    if (!animation) return { animation: null, fired: false, shotPayload: null, active: false };
    const now = Number.isFinite(Number(timestamp)) ? Number(timestamp) : Date.now();
    if (animation.phase === 'strike') {
      const progress = Math.min(1, (now - animation.startTime) / Math.max(1, animation.duration));
      const next = {
        ...animation,
        currentOffset: animation.pullOffset * (1 - progress * progress),
      };
      if (progress >= 1 && !next.fired) {
        next.fired = true;
        next.phase = 'follow-through';
        next.startTime = now;
        next.currentOffset = 0;
        next.opacity = 1;
        return { animation: next, fired: true, shotPayload: next.shotPayload, active: true };
      }
      return { animation: next, fired: false, shotPayload: null, active: true };
    }
    if (animation.phase === 'follow-through') {
      const duration = Math.max(1, animation.followThroughDuration ?? animation.duration * CUE_FOLLOW_THROUGH_RATIO);
      const progress = Math.min(1, (now - animation.startTime) / duration);
      const eased = 1 - (1 - progress) * (1 - progress);
      const next = {
        ...animation,
        currentOffset: animation.followThroughOffset * eased,
        opacity: 1,
      };
      if (progress >= 1) {
        next.phase = 'hold';
        next.startTime = animation.startTime + duration;
        next.currentOffset = animation.followThroughOffset;
        return updateCueStrikeAnimation(next, now);
      }
      return { animation: next, fired: false, shotPayload: null, active: true };
    }
    if (animation.phase === 'hold') {
      const duration = Math.max(0, animation.holdDuration ?? CUE_STRIKE_HOLD_MS);
      const next = {
        ...animation,
        currentOffset: animation.followThroughOffset,
        opacity: 1,
      };
      if (now - animation.startTime >= duration) {
        next.phase = 'fade';
        next.startTime = animation.startTime + duration;
        return updateCueStrikeAnimation(next, now);
      }
      return { animation: next, fired: false, shotPayload: null, active: true };
    }
    if (animation.phase === 'fade') {
      const duration = Math.max(1, animation.fadeDuration || CUE_FADE_MS);
      const progress = Math.min(1, (now - animation.startTime) / duration);
      const next = {
        ...animation,
        currentOffset: animation.followThroughOffset,
        opacity: Math.max(0, 1 - progress),
      };
      if (progress >= 1) return { animation: null, fired: false, shotPayload: null, active: false };
      return { animation: next, fired: false, shotPayload: null, active: true };
    }
    return { animation: null, fired: false, shotPayload: null, active: false };
  }

  const api = {
    constants: {
      TIP_PAD_MAX_OFFSET,
      TIP_PAD_SCREEN_RADIUS_RATIO,
      POWER_PULL_TOP_PX,
      POWER_PULL_BOTTOM_PX,
      CUE_FOLLOW_THROUGH_RATIO,
      CUE_STRIKE_HOLD_MS,
      CUE_FADE_MS,
      MAX_CUE_PULL_OFFSET_MM,
      CUE_ADDRESS_GAP_MM,
      TIP_DRAG_FULL_DISTANCE_PX,
      SHOT_INTERACTION_MODE,
    },
    angleDegToDirection,
    clamp,
    clampTipOffsetCircle,
    createFrameRenderScheduler,
    createShotInteraction,
    createTouchPullShotInteraction,
    createCueStrikeAnimation,
    directionToAngleDeg,
    normalize,
    normalizeAngleDeg,
    powerFromPull,
    powerPullVisualOffsetPx,
    powerToPullOffsetMm,
    powerToAddressOffsetMm,
    resolvedShotPower,
    tipOffsetFromPoint,
    tipOffsetFromClientPoint,
    tipOffsetFromPointerDelta,
    tipPadOffsetScale,
    tipPadPointFromOffset,
    updateCueStrikeAnimation,
  };

  return api;
});

}, {"./powerController":33}, "apps/three-game/src/input/shotControl.js"],
35: [function(require, module, exports) {
(function installShotControlsHudRenderer(root, factory) {
  let CanvasPrimitives = root?.SnookerCanvasPrimitives || null;
  let ValueChipRenderer = root?.SnookerValueChipRenderer || null;
  let ShotControlRenderer = root?.SnookerShotControlRenderer || root?.TestFieldShotControlRenderer || null;
  if (typeof module === 'object' && module.exports) {
    CanvasPrimitives = CanvasPrimitives || require('../canvasPrimitives');
    ValueChipRenderer = ValueChipRenderer || require('./valueChipRenderer');
    ShotControlRenderer = ShotControlRenderer || require('../../input/shotControlRenderer');
  }
  const api = factory(CanvasPrimitives, ValueChipRenderer, ShotControlRenderer);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SnookerShotControlsHudRenderer = api;
    root.SnookerGameShotControlsRenderer = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this), function createShotControlsHudRenderer(CanvasPrimitives, ValueChipRenderer, ShotControlRenderer) {
const POWER_SEGMENT_COLORS = ['#1fb6ff', '#f1d72c', '#ff8a10', '#e50012'];

function clamp(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.max(min, Math.min(max, number));
}

function drawPowerMeter(ctx, rect, power, options = {}) {
  if (options.visible === false) return false;
  const ratio = clamp(power / 100, 0, 1);
  const activeIndex = Math.min(3, Math.floor(Math.max(0, power - 0.0001) / 25));
  const fillWidth = rect.width * ratio;

  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
  ctx.shadowBlur = 8;
  ctx.save();
  CanvasPrimitives.roundRect(ctx, rect, 4);
  ctx.clip();
  if (fillWidth > 0) {
    ctx.fillStyle = POWER_SEGMENT_COLORS[activeIndex];
    ctx.fillRect(rect.x, rect.y, fillWidth, rect.height);
  }
  ctx.restore();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.lineWidth = 2;
  CanvasPrimitives.roundRect(ctx, rect, 4);
  ctx.stroke();
  for (let index = 1; index < 4; index += 1) {
    const x = rect.x + rect.width * index / 4;
    ctx.beginPath();
    ctx.moveTo(x, rect.y);
    ctx.lineTo(x, rect.y + rect.height);
    ctx.stroke();
  }
  ctx.restore();
  return true;
}

function powerValueChipRect(rect, options = {}) {
  return {
    x: rect.x + rect.width * 0.5 - (Number(options.width) || 76) * 0.5 + (Number(options.offsetX) || 0),
    y: rect.y - (Number(options.offsetY) || 42),
    width: Number(options.width) || 76,
    height: Number(options.height) || 34,
  };
}

function drawPowerValueChip(ctx, rect, power, options = {}) {
  if (options.visible === false || (!options.forceVisible && power <= 0)) return false;
  const chip = powerValueChipRect(rect, options);

  const drawn = ValueChipRenderer.drawValueChip(ctx, chip, ShotControlRenderer.formatPowerValue(power), {
    textOffsetY: 1,
    ...(options.chip || {}),
  });
  return drawn ? chip : false;
}

function drawPowerPullControl(ctx, rect, options = {}) {
  const power = ShotControlRenderer.drawPowerController(ctx, rect, {
    enabled: options.enabled !== false,
    power: options.power,
    pullDistancePx: options.powerPullDistancePx,
  }, options.assets || {});
  const powerValue = drawPowerValueChip(ctx, rect, options.power, options.powerValue || {});
  return {
    power,
    powerPullTrack: rect,
    powerValue,
  };
}

function drawTipPad(ctx, rect, tipOffset, options = {}) {
  const tip = ShotControlRenderer.drawTipPad(ctx, rect, { tipOffset }, options);
  return {
    tip,
    tipPad: rect,
  };
}

function tipMagnifierRect(sourceTipPad, coreWidth, coreHeight, scale = 2, center = null) {
  const diameter = Math.max(1, Math.min(
    Number(sourceTipPad?.width) || 1,
    Number(sourceTipPad?.height) || 1,
  ) * Math.max(1, Number(scale) || 2));
  const centerX = Number.isFinite(Number(center?.x))
    ? Number(center.x)
    : (Number(coreWidth) || 0) * 0.5;
  const centerY = Number.isFinite(Number(center?.y))
    ? Number(center.y)
    : (Number(coreHeight) || 0) * 0.5;
  return {
    x: centerX - diameter * 0.5,
    y: centerY - diameter * 0.5,
    width: diameter,
    height: diameter,
  };
}

function tipMagnifierCenterLeftOfSource(sourceTipPad, scale = 2, gap = 100) {
  const sourceMetrics = ShotControlRenderer.tipPadMetrics(sourceTipPad);
  const sourceCenter = {
    x: sourceMetrics.pad.x + sourceMetrics.pad.width * 0.5,
    y: sourceMetrics.pad.y + sourceMetrics.pad.height * 0.5,
  };
  return {
    x: sourceCenter.x
      - sourceMetrics.radius
      - sourceMetrics.radius * Math.max(1, Number(scale) || 2)
      - Math.max(0, Number(gap) || 0),
    y: sourceCenter.y,
  };
}

function drawTipMagnifier(ctx, sourceTipPad, tipOffset, options = {}) {
  const center = options.center || tipMagnifierCenterLeftOfSource(
    sourceTipPad,
    options.scale,
    options.gap,
  );
  const rect = tipMagnifierRect(
    sourceTipPad,
    options.coreWidth,
    options.coreHeight,
    options.scale,
    center,
  );
  const sourceMetrics = ShotControlRenderer.tipPadMetrics(sourceTipPad);
  const dotScale = Math.max(0.01, Number(options.dotScale) || 1);
  const dotRadius = sourceMetrics.dotRadius * dotScale;
  drawTipPad(ctx, rect, tipOffset, {
    dotRadius,
    dotStrokeWidth: Math.max(1, dotRadius * 0.22) * 0.7,
  });
  return rect;
}

function drawGameShotControls(ctx, options = {}) {
  const tableRect = options.tableRect;
  const powerPullTrack = options.createPowerPullRect(tableRect);
  const tipPad = options.createTipPadRect(tableRect);
  const powerEnabled = options.powerEnabled ?? options.enabled;
  const tipEnabled = options.tipEnabled ?? options.enabled;
  if (options.powerPullVisible !== false) {
    drawPowerPullControl(ctx, powerPullTrack, {
      assets: options.assets,
      enabled: powerEnabled,
      power: options.power,
      powerPullDistancePx: options.powerPullDistancePx,
      powerValue: options.powerValue,
    });
  }
  drawPowerMeter(ctx, options.createPowerMeterRect(tableRect), options.power, {
    visible: options.powerMeterVisible !== false && options.powerIndicatorVisible,
  });
  if (options.tipPadVisible !== false) {
    const tipPadMetrics = ShotControlRenderer.tipPadMetrics(tipPad);
    drawTipPad(ctx, tipPad, options.tipOffset, {
      dotStrokeWidth: Math.max(1, tipPadMetrics.dotRadius * 0.22) * 0.7,
      ...(tipEnabled === false ? {
        alpha: 0.38,
        dotAlpha: 0.46,
      } : {}),
    });
  }
  return {
    powerPullTrack: options.powerPullVisible === false ? null : powerPullTrack,
    tipPad: options.tipPadVisible === false ? null : tipPad,
  };
}

return {
  POWER_SEGMENT_COLORS,
  drawGameShotControls,
  drawPowerMeter,
  drawPowerPullControl,
  drawPowerValueChip,
  drawTipMagnifier,
  drawTipPad,
  powerValueChipRect,
  tipMagnifierCenterLeftOfSource,
  tipMagnifierRect,
};
});

}, {"../canvasPrimitives":21,"./valueChipRenderer":36,"../../input/shotControlRenderer":32}, "apps/three-game/src/render/hud/shotControlsHudRenderer.js"],
36: [function(require, module, exports) {
(function installValueChipRenderer(root, factory) {
  let CanvasPrimitives = root?.SnookerCanvasPrimitives || null;
  if (typeof module === 'object' && module.exports) {
    CanvasPrimitives = CanvasPrimitives || require('../canvasPrimitives');
  }
  const api = factory(CanvasPrimitives);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SnookerValueChipRenderer = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this), function createValueChipRenderer(CanvasPrimitives) {
function drawValueChip(ctx, rect, text, options = {}) {
  const value = String(text ?? '');
  if (!options.forceVisible && value.length === 0) return false;

  ctx.save();
  ctx.shadowColor = options.shadowColor || 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = Number.isFinite(Number(options.shadowBlur)) ? Number(options.shadowBlur) : 10;
  ctx.fillStyle = options.background || 'rgba(13, 18, 24, 0.88)';
  ctx.strokeStyle = options.border || 'rgba(238, 196, 79, 0.72)';
  ctx.lineWidth = Number.isFinite(Number(options.lineWidth)) ? Number(options.lineWidth) : 1.4;
  CanvasPrimitives.roundRect(ctx, rect, Number.isFinite(Number(options.radius)) ? Number(options.radius) : 8);
  ctx.fill();
  if (options.border !== false) ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = options.color || '#f7f1df';
  ctx.font = options.font || '800 22px system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(value, rect.x + rect.width * 0.5, rect.y + rect.height * 0.5 + (Number(options.textOffsetY) || 0));
  ctx.restore();
  return true;
}

return {
  drawValueChip,
};
});

}, {"../canvasPrimitives":21}, "apps/three-game/src/render/hud/valueChipRenderer.js"],
37: [function(require, module, exports) {
// Copied from the 2D gameOverlayRenderer, independently maintained for 3D.
const { drawToast } = require('../src/render/hud/canvasControlsRenderer');
function drawRuleToast(ctx, options = {}) {
  const {
    maximumWidth,
    sizeScale = 1,
    opacity = 1,
    rect,
    text = '',
    tone = '',
    yOffset = 0,
  } = options;
  if (!rect || !text) return false;
  const fittedRect = fitMessageToastRect(ctx, {
    x: rect.x,
    y: rect.y + yOffset,
    width: rect.width,
    height: rect.height,
  }, text, { maximumWidth, fontSize: 23 * sizeScale, horizontalPadding: 44 * sizeScale, minimumWidth: 80 * sizeScale });
  drawToast(ctx, fittedRect, text, {
    horizontalPadding: 44 * sizeScale,
    fontSize: 23 * sizeScale,
    minFontSize: 17 * sizeScale,
    radius: 8 * sizeScale,
    opacity,
    stroke: false,
    textAlign: 'left',
  });
  return true;
}

function measureMessageText(ctx, text, fontSize = 23) {
  ctx.save();
  ctx.font = `700 ${fontSize}px system-ui, -apple-system, BlinkMacSystemFont, sans-serif`;
  const width = ctx.measureText(String(text || '')).width;
  ctx.restore();
  return width;
}

function fitMessageToastRect(ctx, maxRect, text, options = {}) {
  const horizontalPadding = Number(options.horizontalPadding) || 44;
  const maximumWidth = Math.max(maxRect.width, Number(options.maximumWidth) || maxRect.width);
  const minimumWidth = Math.min(maximumWidth, Number(options.minimumWidth) || 80);
  const width = Math.min(
    maximumWidth,
    Math.max(minimumWidth, Math.ceil(measureMessageText(ctx, text, Number(options.fontSize) || 23) + horizontalPadding)),
  );
  return {
    ...maxRect,
    x: maxRect.x + (maxRect.width - width) * 0.5,
    width,
  };
}


module.exports = { drawRuleToast };

}, {"../src/render/hud/canvasControlsRenderer":22}, "apps/three-game/trial/notifications.cjs"],
38: [function(require, module, exports) {
const { BALL_KIND, COLOR_ORDER } = require('../../config/constants');
const {
  DECISION,
  RULE_PHASE,
  displayFoulCode,
} = require('../rules/rulesEngine');
const { ballValue } = require('../rules/scoring');
const { playerRequiresSnookers } = require('../rules/scoreAvailability');

function ballKindLabel(kind) {
  const labels = {
    [BALL_KIND.RED]: '红球',
    [BALL_KIND.YELLOW]: '黄球',
    [BALL_KIND.GREEN]: '绿球',
    [BALL_KIND.BROWN]: '棕球',
    [BALL_KIND.BLUE]: '蓝球',
    [BALL_KIND.PINK]: '粉球',
    [BALL_KIND.BLACK]: '黑球',
    [BALL_KIND.CUE]: '母球',
  };
  return labels[kind] || kind || '目标球';
}

function decisionLabel(decision) {
  const labels = {
    [DECISION.PLAY_SELF]: '自己打',
    [DECISION.PLAY_AGAIN]: '现位重打',
    [DECISION.RESTORE_PLAY_AGAIN]: '复位重打',
    'current-player-breaks': '当前方开球',
    'other-player-breaks': '对方开球',
  };
  return labels[decision] || decision;
}

function frameScoreText(players) {
  const first = Number(players?.[0]?.frames) || 0;
  const second = Number(players?.[1]?.frames) || 0;
  return `${first}:${second}`;
}

function remainingTablePoints(gameState) {
  const balls = gameState?.balls || [];
  const reds = balls.filter((ball) => !ball.potted && ball.kind === BALL_KIND.RED).length;
  const colors = balls.filter((ball) => (
    !ball.potted
    && ball.kind !== BALL_KIND.CUE
    && ball.kind !== BALL_KIND.RED
  ));
  const colorSequencePoints = colors.reduce((sum, ball) => sum + ballValue(ball.kind), 0);
  const ruleState = gameState?.ruleState || {};

  if (reds > 0) {
    const colorAfterRedPoints = ruleState.phase === RULE_PHASE.COLOR_CHOICE
      ? ballValue(BALL_KIND.BLACK)
      : 0;
    return reds * (ballValue(BALL_KIND.RED) + ballValue(BALL_KIND.BLACK))
      + colorAfterRedPoints
      + 27;
  }
  if (ruleState.phase === RULE_PHASE.COLOR_CHOICE || ruleState.colorAfterLastRedDue) {
    return ballValue(BALL_KIND.BLACK) + colorSequencePoints;
  }
  return colorSequencePoints;
}

function overSnookeredPlayerId(gameState) {
  if (gameState?.frameOver || gameState?.activeShot) return null;
  const players = gameState?.players || [];
  if (players.length < 2) return null;
  return players.find(player => playerRequiresSnookers(gameState, player.id))?.id || null;
}

function canPlayerConcede(gameState, playerId) {
  return Boolean(playerId && overSnookeredPlayerId(gameState) === playerId);
}

function createRuleResultMessages(gameState, result) {
  const messages = [];
  if (!result) return messages;
  const ruleState = gameState?.ruleState || {};
  const foulAwardsFreeBall = Boolean(
    result.foul
    && (
      result.pendingDecision?.freeBallAvailableIfSelf
      || ruleState.pendingDecision?.freeBallAvailableIfSelf
      || ruleState.freeBallAvailable
    )
  );
  if (result.foul) {
    if (foulAwardsFreeBall) {
      messages.push(result.miss ? 'Foul and a Miss, free ball' : 'Foul, free ball');
    } else {
      const reasons = (result.foulDetails || [])
        .map((foul) => displayFoulCode(foul.code))
        .filter(Boolean);
      const reasonText = reasons.length ? reasons.join('、') : '犯规';
      messages.push(`${result.miss ? 'Foul and a Miss：' : '犯规：'}${reasonText}，罚 ${result.penalty || 4} 分`);
    }
  }
  if (result.overSnooker && !gameState?.frameOver) {
    messages.push('已超分');
  }

  if (gameState?.frameOver || result.frameOver) {
    messages.push(`本局结束，局分 ${frameScoreText(gameState?.players)}`);
  } else if (ruleState.phase === RULE_PHASE.RESPOTTED_BLACK) {
    messages.push('延分，争黑球');
  } else if (ruleState.requiresNomination) {
    messages.push(ruleState.nominationReason === 'snookered-color-choice' ? '请选择解球目标' : '请选择目标彩球');
  } else if (ruleState.freeBallAvailable && !foulAwardsFreeBall) {
    messages.push('自由球');
  } else if (
    !result.foul
    && ruleState.targetColorKind
    && ![
      RULE_PHASE.CLEARANCE,
      RULE_PHASE.FINAL_BLACK,
      RULE_PHASE.RESPOTTED_BLACK,
    ].includes(ruleState.phase)
  ) {
    messages.push(`目标球：${ballKindLabel(ruleState.targetColorKind)}`);
  }

  return messages;
}

function createPendingDecisionActions(gameState) {
  const pending = gameState?.ruleState?.pendingDecision;
  const decisions = [...(pending?.options || [])].sort((left, right) => {
    if (left === DECISION.RESTORE_PLAY_AGAIN) return -1;
    if (right === DECISION.RESTORE_PLAY_AGAIN) return 1;
    return 0;
  });
  return decisions.map((decision) => ({
    id: decision,
    type: 'decision',
    value: decision,
    label: decisionLabel(decision),
  }));
}

function createNominationActions(gameState) {
  if (!gameState?.ruleState?.requiresNomination) return [];
  const labels = {
    [BALL_KIND.YELLOW]: '黄',
    [BALL_KIND.GREEN]: '绿',
    [BALL_KIND.BROWN]: '棕',
    [BALL_KIND.BLUE]: '蓝',
    [BALL_KIND.PINK]: '粉',
    [BALL_KIND.BLACK]: '黑',
  };
  return COLOR_ORDER
    .filter((kind) => gameState.balls?.some((ball) => !ball.potted && ball.kind === kind))
    .map((kind) => ({
      id: kind,
      type: 'nomination',
      value: kind,
      label: labels[kind] || kind,
    }));
}

function createPostFrameActions(gameState) {
  if (!gameState?.frameOver) return [];
  return [{
    id: 'play-again',
    type: 'play-again',
    label: '再来一局',
  }];
}

module.exports = {
  ballKindLabel,
  canPlayerConcede,
  createNominationActions,
  createPendingDecisionActions,
  createPostFrameActions,
  createRuleResultMessages,
  decisionLabel,
  frameScoreText,
  overSnookeredPlayerId,
  remainingTablePoints,
};

}, {"../../config/constants":4,"../rules/rulesEngine":39,"../rules/scoring":40,"../rules/scoreAvailability":43}, "apps/three-game/src/core/match/intermission.js"],
39: [function(require, module, exports) {
const { BALL_KIND, COLOR_ORDER } = require('../../config/constants');
const { BALL_RADIUS_MM } = require('../model/ballSpec');
const { colorSpot } = require('../model/spotModel');
const { ballValue } = require('./scoring');
const {
  MISS_MODE,
  createDefaultRuleSettings,
} = require('./ruleSettingsAdapter');
const {
  findCueBallDPosition,
  findRespottedColorPosition,
  isColorBallKind,
  resetBallToTable,
  respotPottedColorBalls,
  respotPottedCueBallInD,
} = require('./respot');
const { restoreBallsFromSnapshot } = require('./ruleSnapshot');
const { anyPlayerRequiresSnookers } = require('./scoreAvailability');
const { isSnookered, effectiveSnookeringBalls } = require('./snookerGeometry');

const RULE_PHASE = {
  REDS: 'reds',
  COLOR_CHOICE: 'colorChoice',
  CLEARANCE: 'clearance',
  FINAL_BLACK: 'finalBlack',
  RESPOTTED_BLACK: 'respottedBlack',
  FRAME_OVER: 'frameOver',
};

const DECISION = {
  PLAY_SELF: 'play-self',
  PLAY_AGAIN: 'play-again',
  RESTORE_PLAY_AGAIN: 'restore-play-again',
};

const BREAK_POT_KINDS = [
  BALL_KIND.RED,
  BALL_KIND.YELLOW,
  BALL_KIND.GREEN,
  BALL_KIND.BROWN,
  BALL_KIND.BLUE,
  BALL_KIND.PINK,
  BALL_KIND.BLACK,
];

function createBreakPotCounts() {
  return Object.fromEntries(BREAK_POT_KINDS.map((kind) => [kind, 0]));
}

function createInitialRuleState() {
  return {
    phase: RULE_PHASE.REDS,
    targetColorKind: null,
    cueBallInHand: true,
    currentBreak: 0,
    currentBreakPots: createBreakPotCounts(),
    pendingDecision: null,
    freeBallAvailable: false,
    freeBallKind: null,
    requiresNomination: false,
    nominationReason: null,
    nominatedColorKind: null,
    touchingBallIds: [],
    touchingBalls: [],
    missSequence: {
      count: 0,
      originalShotId: null,
    },
    lastRuleResult: null,
  };
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function getRuleSettings(state) {
  state.ruleSettings = {
    ...createDefaultRuleSettings(),
    ...(state.ruleSettings || {}),
  };
  return state.ruleSettings;
}

function ensureRuleState(state) {
  if (!state.ruleState) {
    state.ruleState = createInitialRuleState();
  }
  state.ruleState.currentBreakPots = {
    ...createBreakPotCounts(),
    ...(state.ruleState.currentBreakPots || {}),
  };
  return state.ruleState;
}

function activeBalls(state) {
  return (state.balls || []).filter((ball) => !ball.potted);
}

function getCueBall(state) {
  return (state.balls || []).find((ball) => (
    ball.id === state.cueBallId || ball.kind === BALL_KIND.CUE
  ));
}

function findBallById(state, id) {
  return (state.balls || []).find((ball) => ball.id === id) || null;
}

function isRedKind(kind) {
  return kind === BALL_KIND.RED;
}

function isColorKind(kind) {
  return isColorBallKind(kind);
}

function redCount(state) {
  return activeBalls(state).filter((ball) => isRedKind(ball.kind)).length;
}

function remainingTablePoints(state, ruleState = ensureRuleState(state)) {
  const reds = redCount(state);
  const colors = activeBalls(state).filter((ball) => isColorKind(ball.kind));
  const colorSequencePoints = colors.reduce((sum, ball) => sum + ballValue(ball.kind), 0);
  if (reds > 0) {
    const colorAfterRedPoints = ruleState.phase === RULE_PHASE.COLOR_CHOICE
      ? ballValue(BALL_KIND.BLACK)
      : 0;
    return reds * (ballValue(BALL_KIND.RED) + ballValue(BALL_KIND.BLACK))
      + colorAfterRedPoints
      + 27;
  }
  if (ruleState.phase === RULE_PHASE.COLOR_CHOICE || ruleState.colorAfterLastRedDue) {
    return ballValue(BALL_KIND.BLACK) + colorSequencePoints;
  }
  return colorSequencePoints;
}

function anyPlayerRequiresPenaltyPoints(state, ruleState = ensureRuleState(state)) {
  const players = state.players || [];
  if (players.length < 2) return false;
  const remaining = remainingTablePoints(state, ruleState);
  const firstScore = Number(players[0].score) || 0;
  const secondScore = Number(players[1].score) || 0;
  return Math.abs(firstScore - secondScore) > remaining;
}

function firstActiveColorKind(state) {
  return COLOR_ORDER.find((kind) => activeBalls(state).some((ball) => ball.kind === kind)) || null;
}

function hasOnlyBlackObjectBall(state) {
  const objectBalls = activeBalls(state).filter((ball) => ball.kind !== BALL_KIND.CUE);
  return objectBalls.length === 1 && objectBalls[0].kind === BALL_KIND.BLACK;
}

function otherPlayerId(state, playerId) {
  return (state.players || []).find((player) => player.id !== playerId)?.id || playerId;
}

function findPlayer(state, playerId) {
  return (state.players || []).find((player) => player.id === playerId) || null;
}

function addPlayerScore(state, playerId, points) {
  const player = findPlayer(state, playerId);
  if (!player || points <= 0) return;
  player.score += points;
}

function addPlayerBreak(state, playerId, points) {
  const player = findPlayer(state, playerId);
  if (!player || points <= 0) return;
  player.break += points;
  ensureRuleState(state).currentBreak = player.break;
}

function addCurrentBreakPots(state, balls) {
  const ruleState = ensureRuleState(state);
  (balls || []).forEach((ball) => {
    if (!BREAK_POT_KINDS.includes(ball?.kind)) return;
    ruleState.currentBreakPots[ball.kind] = (ruleState.currentBreakPots[ball.kind] || 0) + 1;
  });
}

function resetBreak(state, playerId) {
  const player = findPlayer(state, playerId);
  if (player) player.break = 0;
  const ruleState = ensureRuleState(state);
  ruleState.currentBreak = 0;
  ruleState.currentBreakPots = createBreakPotCounts();
}

function getTargetColorKind(ruleState, state) {
  if (ruleState.targetColorKind) return ruleState.targetColorKind;
  return firstActiveColorKind(state);
}

function targetKindsForRule(ruleState, state) {
  if (ruleState.testFieldOpenTargets) return [...new Set(activeBalls(state)
    .filter(ball => ball.kind !== BALL_KIND.CUE).map(ball => ball.kind))];
  switch (ruleState.phase) {
    case RULE_PHASE.REDS:
      return [BALL_KIND.RED];
    case RULE_PHASE.COLOR_CHOICE:
      return COLOR_ORDER.filter((kind) => activeBalls(state).some((ball) => ball.kind === kind));
    case RULE_PHASE.CLEARANCE:
      return [getTargetColorKind(ruleState, state)].filter(Boolean);
    case RULE_PHASE.FINAL_BLACK:
    case RULE_PHASE.RESPOTTED_BLACK:
      return [BALL_KIND.BLACK];
    default:
      return [];
  }
}

function isKindOn(ruleState, state, kind) {
  return targetKindsForRule(ruleState, state).includes(kind);
}

function normalizeShotRecord(shotRecord) {
  return {
    playerId: shotRecord?.playerId,
    firstContactBallId: shotRecord?.firstContactBallId
      ?? shotRecord?.physicsResult?.firstContactBallId
      ?? null,
    pottedBallIds: shotRecord?.pottedBallIds
      || shotRecord?.physicsResult?.pottedBallIds
      || [],
    cueBallPotted: Boolean(
      shotRecord?.cueBallPotted ?? shotRecord?.physicsResult?.cueBallPotted,
    ),
    events: shotRecord?.events || [],
    preShotSnapshot: shotRecord?.preShotSnapshot || null,
    preShotRuleState: shotRecord?.preShotRuleState || shotRecord?.preShotSnapshot?.ruleState || null,
    shotInput: shotRecord?.shotInput || null,
  };
}

function isSnookeredOnTargets(state, ruleState) {
  return isSnookered(state, getCueBall(state), targetKindsForRule(ruleState, state),
    ruleState.cueBallInHand ?? state.ruleState?.cueBallInHand ?? false);
}

function isSnookeredByBallKind(state, ruleState, blockerKind) {
  return effectiveSnookeringBalls(state, getCueBall(state), targetKindsForRule(ruleState, state))
    .some(ball => ball.kind === blockerKind);
}

function detectTouchingBalls(state, ruleState, settings = getRuleSettings(state)) {
  const cueBall = getCueBall(state);
  if (!cueBall || cueBall.potted) return [];
  const tolerance = Math.max(2, Number(settings.touchingBallToleranceMm) || 0);
  return activeBalls(state)
    .filter((ball) => ball.id !== cueBall.id)
    .filter((ball) => (
      Math.hypot(ball.pos.x - cueBall.pos.x, ball.pos.y - cueBall.pos.y)
      <= (ball.radius || BALL_RADIUS_MM) + (cueBall.radius || BALL_RADIUS_MM) + tolerance
    ))
    .map((ball) => ({
      ballId: ball.id,
      kind: ball.kind,
      isOn: isKindOn(ruleState, state, ball.kind),
    }));
}

function prepareNextShotState(state) {
  const ruleState = ensureRuleState(state);
  const settings = getRuleSettings(state);
  const touching = detectTouchingBalls(state, ruleState, settings);
  ruleState.touchingBallIds = touching.map((entry) => entry.ballId);
  ruleState.touchingBalls = touching;
  // Only an obstructed open-colour escape needs an explicit target.
  // Free balls continue to be inferred from first contact.
  const needsTarget = !state.ruleSettings?.practiceAutoColorTarget
    && !state.frameOver && !ruleState.testFieldOpenTargets
    && !ruleState.pendingDecision && !ruleState.freeBallAvailable
    && ruleState.phase === RULE_PHASE.COLOR_CHOICE
    && isSnookered(state, getCueBall(state), targetKindsForRule(ruleState, state), ruleState.cueBallInHand);
  ruleState.requiresNomination = needsTarget && !ruleState.nominatedColorKind;
  ruleState.nominationReason = ruleState.requiresNomination ? 'snookered-color-choice' : null;
  return ruleState;
}

function inferShotTarget(state, ruleState, shot) {
  const firstContactBall = findBallById(state, shot.firstContactBallId);
  const firstKind = firstContactBall?.kind || null;
  const freeBallAvailable = Boolean(ruleState.freeBallAvailable);

  if (freeBallAvailable && firstKind && !isKindOn(ruleState, state, firstKind)) {
    const ballOnKinds = targetKindsForRule(ruleState, state);
    return {
      // The nominated physical ball is the legal first-contact target, but it
      // acquires the identity and value of the actual ball on. Keeping these
      // two concepts separate is essential in the colour clearance: a Blue
      // nominated for Yellow must score and display as Yellow, not Blue.
      targetKinds: [firstKind],
      targetKind: ballOnKinds[0] || null,
      freeBallKind: firstKind,
      source: 'free-ball-inferred',
    };
  }

  if (ruleState.phase === RULE_PHASE.COLOR_CHOICE) {
    const nominated = ruleState.nominatedColorKind;
    if (nominated) {
      return {
        targetKinds: [nominated],
        targetKind: nominated,
        freeBallKind: null,
        source: 'nominated-color',
      };
    }
    if (firstKind && isColorKind(firstKind)) {
      return {
        targetKinds: [firstKind],
        targetKind: firstKind,
        freeBallKind: null,
        source: 'color-choice-inferred',
      };
    }
  }

  const targetKinds = targetKindsForRule(ruleState, state);
  return {
    targetKinds,
    targetKind: targetKinds[0] || null,
    freeBallKind: null,
    source: 'rule-state',
  };
}

function wasTouchingTargetSatisfied(state, ruleState, shotTarget, shot) {
  return (ruleState.touchingBalls || []).some((entry) => (
    shotTarget.targetKinds.includes(entry.kind)
    && isShotPlayedAwayFromTouchingBall(state, shot, entry.ballId)
  ));
}

function cueInvolvedInBallHit(state, event) {
  return event?.type === 'ball-hit-ball'
    && (event.ballAId === state.cueBallId || event.ballBId === state.cueBallId);
}

function otherBallInCueHit(state, event) {
  if (!cueInvolvedInBallHit(state, event)) return null;
  return event.ballAId === state.cueBallId ? event.ballBId : event.ballAId;
}

function cueHitRail(event, cueBallId) {
  return (
    (event?.type === 'ball-hit-rail' || event?.type === 'ball-hit-pocket-jaw')
    && event.ballId === cueBallId
  );
}

function normalizedShotDirection(shot) {
  const direction = shot?.shotInput?.direction;
  const x = Number(direction?.x);
  const y = Number(direction?.y);
  const length = Math.hypot(x, y);
  if (!Number.isFinite(length) || length <= 0.000001) return null;
  return { x: x / length, y: y / length };
}

function preShotBallById(shot, ballId) {
  return (shot?.preShotSnapshot?.balls || []).find((ball) => ball.id === ballId) || null;
}

function isShotPlayedAwayFromTouchingBall(state, shot, touchingBallId) {
  const cueBefore = preShotBallById(shot, state.cueBallId) || getCueBall(state);
  const touchingBefore = preShotBallById(shot, touchingBallId) || findBallById(state, touchingBallId);
  const direction = normalizedShotDirection(shot);
  if (!cueBefore?.pos || !touchingBefore?.pos || !direction) {
    return !shot.firstContactBallId;
  }

  const toTouching = {
    x: touchingBefore.pos.x - cueBefore.pos.x,
    y: touchingBefore.pos.y - cueBefore.pos.y,
  };
  const distance = Math.hypot(toTouching.x, toTouching.y);
  if (distance <= 0.000001) return false;
  const towardTouching = (direction.x * toTouching.x + direction.y * toTouching.y) / distance;
  return towardTouching <= 0.05;
}

function directlyPushedTouchingBall(state, shot, touchingBallId) {
  if (isShotPlayedAwayFromTouchingBall(state, shot, touchingBallId)) {
    return false;
  }

  if (shot.firstContactBallId && shot.firstContactBallId !== touchingBallId) {
    return false;
  }

  const events = Array.isArray(shot.events) ? shot.events : [];
  for (const event of events) {
    if (cueHitRail(event, state.cueBallId)) {
      return false;
    }

    const hitBallId = otherBallInCueHit(state, event);
    if (!hitBallId) continue;
    return hitBallId === touchingBallId;
  }

  return !shot.firstContactBallId || shot.firstContactBallId === touchingBallId;
}

function detectMovedTouchingTarget(state, ruleState, shot) {
  const touchingIds = ruleState.touchingBallIds || [];
  if (!shot.preShotSnapshot || touchingIds.length === 0) return null;
  for (const ballId of touchingIds) {
    const before = shot.preShotSnapshot.balls.find((ball) => ball.id === ballId);
    const after = findBallById(state, ballId);
    if (!before || !after || after.potted) continue;
    if (
      Math.hypot(after.pos.x - before.pos.x, after.pos.y - before.pos.y) > 1.2
      && directlyPushedTouchingBall(state, shot, ballId)
    ) {
      return after;
    }
  }
  return null;
}

function pottedBalls(state, shot) {
  return shot.pottedBallIds
    .map((id) => findBallById(state, id))
    .filter(Boolean);
}

function detectFouls(state, ruleState, shot, shotTarget) {
  const fouls = [];
  const firstContactBall = findBallById(state, shot.firstContactBallId);
  const potted = pottedBalls(state, shot);
  const pottedObjectBalls = potted.filter((ball) => ball.kind !== BALL_KIND.CUE);
  const touchingMoved = detectMovedTouchingTarget(state, ruleState, shot);
  const touchingSatisfied = wasTouchingTargetSatisfied(state, ruleState, shotTarget, shot);

  if (!touchingSatisfied) {
    if (!firstContactBall) {
      fouls.push({ code: 'no-contact', kind: shotTarget.targetKind });
    } else if (!shotTarget.targetKinds.includes(firstContactBall.kind)) {
      fouls.push({ code: 'wrong-first-contact', kind: firstContactBall.kind });
    }
  }

  if (shot.cueBallPotted) {
    fouls.push({ code: 'cue-ball-potted', kind: shotTarget.targetKind });
  }

  pottedObjectBalls.forEach((ball) => {
    const isFreeBall = shotTarget.freeBallKind && ball.kind === shotTarget.freeBallKind;
    const isTarget = shotTarget.targetKinds.includes(ball.kind);
    if (ruleState.phase === RULE_PHASE.REDS && isTarget) {
      return;
    }
    if (shotTarget.freeBallKind && (isFreeBall || isKindOn(ruleState, state, ball.kind))) {
      return;
    }
    if (ruleState.phase === RULE_PHASE.COLOR_CHOICE && isTarget) {
      return;
    }
    if (
      [RULE_PHASE.CLEARANCE, RULE_PHASE.FINAL_BLACK, RULE_PHASE.RESPOTTED_BLACK].includes(ruleState.phase)
      && isTarget
    ) {
      return;
    }
    fouls.push({ code: 'non-target-potted', kind: ball.kind });
  });

  if (touchingMoved) {
    fouls.push({ code: 'touching-ball-moved', kind: touchingMoved.kind });
  }

  if (shotTarget.freeBallKind) {
    const pottedFreeOrTrueTarget = pottedObjectBalls.some((ball) => (
      ball.kind === shotTarget.freeBallKind || isKindOn(ruleState, state, ball.kind)
    ));
    const onlyPinkAndBlackRemain = activeBalls(state)
      .filter((ball) => ball.kind !== BALL_KIND.CUE)
      .every((ball) => ball.kind === BALL_KIND.PINK || ball.kind === BALL_KIND.BLACK);
    if (
      !pottedFreeOrTrueTarget
      && !onlyPinkAndBlackRemain
      && isSnookeredByBallKind(state, ruleState, shotTarget.freeBallKind)
    ) {
      fouls.push({ code: 'free-ball-snooker', kind: shotTarget.targetKind });
    }
  }

  return fouls;
}

function calculatePenalty(fouls, shotTarget) {
  const values = [4];
  if (shotTarget.targetKind) values.push(ballValue(shotTarget.targetKind));
  fouls.forEach((foul) => {
    if (foul.kind) values.push(ballValue(foul.kind));
  });
  return Math.max(...values);
}

function createTimeoutFoul(state, playerId = state.currentPlayerId) {
  const ruleState = ensureRuleState(state);
  const penalty = [RULE_PHASE.FINAL_BLACK, RULE_PHASE.RESPOTTED_BLACK].includes(ruleState.phase)
    ? Math.max(ballValue(BALL_KIND.BLACK), getRuleSettings(state).timeoutPenalty || 4)
    : Math.max(4, getRuleSettings(state).timeoutPenalty || 4);
  const nonOffenderId = otherPlayerId(state, playerId);
  addPlayerScore(state, nonOffenderId, penalty);
  resetBreak(state, playerId);
  if ([RULE_PHASE.FINAL_BLACK, RULE_PHASE.RESPOTTED_BLACK].includes(ruleState.phase)) {
    const events = [];
    if (ruleState.phase === RULE_PHASE.RESPOTTED_BLACK) {
      awardFrame(state, nonOffenderId, 'respotted-black-foul');
    } else {
      finishFinalBlack(state, playerId, true, events);
    }
    const winnerId = ruleState.lastRuleResult?.winnerId;
    const reason = ruleState.lastRuleResult?.reason;
    ruleState.lastRuleResult = {
      type: state.frameOver ? 'frame-over' : 'foul',
      foul: true,
      fouls: ['shot-clock-timeout'],
      foulDetails: [{ code: 'shot-clock-timeout', kind: null }],
      miss: false,
      points: 0,
      penalty,
      pottedBallIds: [],
      firstContactBallId: null,
      nextPlayerId: null,
      nextTarget: targetKindsForRule(ruleState, state),
      pendingDecision: ruleState.pendingDecision,
      events,
      frameOver: Boolean(state.frameOver),
      winnerId: state.frameOver ? winnerId : null,
      reason: state.frameOver ? reason : 'black-respotted',
    };
    prepareNextShotState(state);
    return { state, result: ruleState.lastRuleResult };
  }
  const nextRule = nextPhaseAfterFoul(state, ruleState);
  const pendingDecision = {
    type: 'foul',
    offenderId: playerId,
    nonOffenderId,
    penalty,
    fouls: ['shot-clock-timeout'],
    foulDetails: [{ code: 'shot-clock-timeout', kind: null }],
    miss: false,
    missMode: getRuleSettings(state).missMode,
    options: [DECISION.PLAY_AGAIN],
    nextRuleState: nextRule,
    restoreSnapshot: null,
    freeBallAvailableIfSelf: isSnookeredOnTargets(state, nextRule),
  };

  // Like an ordinary foul, the opponent owns the next shot immediately,
  // including while choosing whether to send the offender back.
  state.currentPlayerId = nonOffenderId;
  clearPostShotFlags(state);
  ruleState.pendingDecision = pendingDecision;
  ruleState.phase = nextRule.phase;
  ruleState.targetColorKind = nextRule.targetColorKind || null;
  ruleState.freeBallAvailable = false;
  ruleState.freeBallKind = null;
  ruleState.lastRuleResult = {
    foul: true,
    fouls: ['shot-clock-timeout'],
    foulDetails: pendingDecision.foulDetails,
    miss: false,
    points: 0,
    penalty,
    shotTarget: {
      targetKinds: targetKindsForRule(ruleState, state),
      targetKind: getTargetColorKind(ruleState, state),
      freeBallKind: null,
      source: 'timeout',
    },
    pottedBallIds: [],
    firstContactBallId: null,
    nextPlayerId: null,
    nextTarget: targetKindsForRule(ruleState, state),
    pendingDecision,
    events: [],
    frameOver: Boolean(state.frameOver),
  };
  prepareNextShotState(state);
  return { state, result: ruleState.lastRuleResult };
}

function displayFoulCode(code) {
  const labels = {
    'no-contact': '未碰到目标球',
    'wrong-first-contact': '先碰错球',
    'cue-ball-potted': '母球入袋',
    'non-target-potted': '非目标球入袋',
    'touching-ball-moved': '连击',
    'free-ball-snooker': '自由球形成斯诺克',
    'shot-clock-timeout': '超时',
  };
  return labels[code] || code;
}

function calculateLegalScore(state, ruleState, shot, shotTarget) {
  const potted = pottedBalls(state, shot).filter((ball) => ball.kind !== BALL_KIND.CUE);
  if (shotTarget.freeBallKind) {
    const pottedFreeBall = potted.some((ball) => ball.kind === shotTarget.freeBallKind);
    const pottedTrueTargets = potted.filter((ball) => isKindOn(ruleState, state, ball.kind));
    if (ruleState.phase === RULE_PHASE.REDS) {
      return potted.filter((ball) => ball.kind === BALL_KIND.RED || ball.kind === shotTarget.freeBallKind).length;
    }
    return pottedFreeBall || pottedTrueTargets.length > 0 ? ballValue(shotTarget.targetKind) : 0;
  }

  if (ruleState.phase === RULE_PHASE.REDS) {
    return potted.filter((ball) => ball.kind === BALL_KIND.RED).length;
  }

  return potted.some((ball) => ball.kind === shotTarget.targetKind)
    ? ballValue(shotTarget.targetKind)
    : 0;
}

function shouldRespotColorAfterLegalShot(ruleState, kind, shotTarget) {
  if (!isColorKind(kind)) return false;
  if (shotTarget.freeBallKind && kind === shotTarget.freeBallKind) return true;
  if ([RULE_PHASE.REDS, RULE_PHASE.COLOR_CHOICE].includes(ruleState.phase)) return true;
  return false;
}

function respotSelectedPottedColors(state, kinds, reason) {
  const events = [];
  kinds.forEach((kind) => {
    const ball = (state.balls || []).find((candidate) => candidate.potted && candidate.kind === kind);
    if (!ball) return;
    const from = {
      potted: Boolean(ball.potted),
      pos: ball.pos ? { ...ball.pos } : null,
      pocketMode: ball.pocketMode || null,
    };
    const pos = findRespottedColorPosition(state, ball);
    resetBallToTable(ball, pos);
    events.push({
      type: 'color-respotted',
      reason,
      ballId: ball.id,
      kind: ball.kind,
      from,
      pos: { ...pos },
    });
  });
  return events;
}

function scoreDifference(state) {
  const [a, b] = state.players || [];
  return (a?.score || 0) - (b?.score || 0);
}

function awardFrame(state, winnerId, reason) {
  const winner = findPlayer(state, winnerId);
  if (winner) winner.frames = (winner.frames || 0) + 1;
  state.frameOver = true;
  const ruleState = ensureRuleState(state);
  ruleState.phase = RULE_PHASE.FRAME_OVER;
  ruleState.pendingDecision = null;
  ruleState.lastRuleResult = {
    type: 'frame-over',
    winnerId,
    reason,
  };
}

function endFrame(state, winnerId, reason = 'manual') {
  awardFrame(state, winnerId, reason);
  return {
    state,
    result: ensureRuleState(state).lastRuleResult,
  };
}

function handleRespottedBlack(state, currentPlayerId, foul, blackPotted = false) {
  const otherId = otherPlayerId(state, currentPlayerId);
  if (foul) {
    awardFrame(state, otherId, 'respotted-black-foul');
    return;
  }

  if (blackPotted) {
    awardFrame(state, currentPlayerId, 'respotted-black-potted');
    return;
  }

  resetBreak(state, currentPlayerId);
  state.currentPlayerId = otherId;
  const ruleState = ensureRuleState(state);
  ruleState.phase = RULE_PHASE.RESPOTTED_BLACK;
  ruleState.targetColorKind = BALL_KIND.BLACK;
  ruleState.cueBallInHand = false;
  ruleState.pendingDecision = null;
  ruleState.missSequence = { count: 0, originalShotId: null };
}

function enterRespottedBlack(state) {
  const black = (state.balls || []).find((ball) => ball.kind === BALL_KIND.BLACK);
  if (black) {
    resetBallToTable(black, colorSpot(BALL_KIND.BLACK));
  }
  const cueBall = getCueBall(state);
  const cueEvents = [];
  if (cueBall) {
    const cuePos = findCueBallDPosition(state, cueBall);
    resetBallToTable(cueBall, cuePos);
    cueEvents.push({
      type: 'cue-ball-respotted',
      reason: 'respotted-black',
      ballId: cueBall.id,
      pos: { ...cuePos },
    });
  }
  const ruleState = ensureRuleState(state);
  ruleState.phase = RULE_PHASE.RESPOTTED_BLACK;
  ruleState.targetColorKind = BALL_KIND.BLACK;
  ruleState.cueBallInHand = true;
  ruleState.pendingDecision = {
    type: 'respotted-black-break-off',
    options: ['current-player-breaks', 'other-player-breaks'],
  };
  return [{
    type: 'black-respotted',
    kind: BALL_KIND.BLACK,
  }, ...cueEvents];
}

function finishFinalBlack(state, currentPlayerId, foul, events) {
  const diff = scoreDifference(state);
  if (diff === 0) {
    events.push(...enterRespottedBlack(state));
    return;
  }
  const winnerId = diff > 0 ? state.players[0].id : state.players[1].id;
  awardFrame(state, winnerId, foul ? 'final-black-foul' : 'final-black-potted');
}

function nextClearancePhase(state) {
  const nextColor = firstActiveColorKind(state);
  if (!nextColor) {
    return { phase: RULE_PHASE.FRAME_OVER, targetColorKind: null };
  }
  if (nextColor === BALL_KIND.BLACK && hasOnlyBlackObjectBall(state)) {
    return { phase: RULE_PHASE.FINAL_BLACK, targetColorKind: BALL_KIND.BLACK };
  }
  return { phase: RULE_PHASE.CLEARANCE, targetColorKind: nextColor };
}

function nextPhaseAfterLegalShot(state, ruleState, score) {
  if (ruleState.phase === RULE_PHASE.REDS) {
    return score > 0
      ? { phase: RULE_PHASE.COLOR_CHOICE, targetColorKind: null }
      : { phase: RULE_PHASE.REDS, targetColorKind: null };
  }

  if (ruleState.phase === RULE_PHASE.COLOR_CHOICE) {
    if (redCount(state) > 0) {
      return { phase: RULE_PHASE.REDS, targetColorKind: null };
    }
    return nextClearancePhase(state);
  }

  if (ruleState.phase === RULE_PHASE.CLEARANCE) {
    return score > 0
      ? nextClearancePhase(state)
      : { phase: RULE_PHASE.CLEARANCE, targetColorKind: ruleState.targetColorKind };
  }

  return { phase: ruleState.phase, targetColorKind: ruleState.targetColorKind };
}

function nextPhaseAfterFoul(state, ruleState) {
  if ([RULE_PHASE.FINAL_BLACK, RULE_PHASE.RESPOTTED_BLACK].includes(ruleState.phase)) {
    return { phase: ruleState.phase, targetColorKind: BALL_KIND.BLACK };
  }
  if (redCount(state) > 0) {
    return { phase: RULE_PHASE.REDS, targetColorKind: null };
  }
  return nextClearancePhase(state);
}

function canCallMiss(state, shot, fouls, options = {}) {
  const settings = getRuleSettings(state);
  if (settings.missMode === MISS_MODE.OFF) return false;
  if (options.anyPlayerRequiresPenaltyPoints) return false;
  if (!fouls.some((foul) => foul.code === 'no-contact' || foul.code === 'wrong-first-contact')) {
    return false;
  }
  if (settings.missMode === MISS_MODE.LIMITED_THREE) {
    const count = ensureRuleState(state).missSequence?.count || 0;
    return count < settings.missLimit;
  }
  return true;
}

function buildFoulDecision(state, shot, ruleState, penalty, fouls, nextRule, missCalled) {
  const offenderId = shot.playerId || state.currentPlayerId;
  const nonOffenderId = otherPlayerId(state, offenderId);
  // Playing the next shot is the implicit/default action.  Only choices that
  // hand control back to the offender need buttons in the HUD.
  const options = [DECISION.PLAY_AGAIN];
  if (missCalled && shot.preShotSnapshot) {
    options.push(DECISION.RESTORE_PLAY_AGAIN);
  }

  return {
    type: 'foul',
    offenderId,
    nonOffenderId,
    penalty,
    fouls: fouls.map((foul) => foul.code),
    foulDetails: fouls,
    miss: missCalled,
    missMode: getRuleSettings(state).missMode,
    options,
    nextRuleState: nextRule,
    restoreSnapshot: shot.preShotSnapshot || null,
    restoreShotInput: missCalled && shot.shotInput?.direction
      ? {
        direction: {
          x: Number(shot.shotInput.direction.x) || 0,
          y: Number(shot.shotInput.direction.y) || 0,
        },
        tipOffset: {
          x: Number(shot.shotInput.tipOffset?.x) || 0,
          y: Number(shot.shotInput.tipOffset?.y) || 0,
        },
      }
      : null,
    freeBallAvailableIfSelf: isSnookeredOnTargets(state, {
      ...nextRule,
      cueBallInHand: Boolean(shot.cueBallPotted),
    }),
  };
}

function applyRuleStatePatch(state, patch) {
  const ruleState = ensureRuleState(state);
  ruleState.phase = patch.phase;
  ruleState.targetColorKind = patch.targetColorKind || null;
  ruleState.freeBallAvailable = Boolean(patch.freeBallAvailable);
  ruleState.freeBallKind = patch.freeBallKind || null;
  ruleState.nominatedColorKind = null;
}

function applyFoulResult(state, shot, ruleState, shotTarget, fouls, events, options = {}) {
  const offenderId = shot.playerId || state.currentPlayerId;
  const nonOffenderId = otherPlayerId(state, offenderId);
  const penalty = calculatePenalty(fouls, shotTarget);
  const requiredPenaltyPointsBeforeFoul = anyPlayerRequiresPenaltyPoints(state, ruleState);
  addPlayerScore(state, nonOffenderId, penalty);
  resetBreak(state, offenderId);

  // A final-black foul ends the frame with the balls where the shot left them.
  // A tied score is the exception; finishFinalBlack handles that respot itself.
  if (ruleState.phase === RULE_PHASE.RESPOTTED_BLACK) {
    handleRespottedBlack(state, offenderId, true);
    return { penalty, pendingDecision: null, missCalled: false };
  }

  if (ruleState.phase === RULE_PHASE.FINAL_BLACK) {
    finishFinalBlack(state, offenderId, true, events);
    return { penalty, pendingDecision: null, missCalled: false };
  }

  if (options.respotColors !== false) {
    events.push(...respotPottedColorBalls(state, {
      includeBallIds: shot.pottedBallIds || [],
    }));
  }
  if (options.respotCueBall !== false) events.push(...respotPottedCueBallInD(state));

  const nextRule = nextPhaseAfterFoul(state, ruleState);
  const missCalled = canCallMiss(state, shot, fouls, {
    anyPlayerRequiresPenaltyPoints: (
      requiredPenaltyPointsBeforeFoul
      || anyPlayerRequiresPenaltyPoints(state, nextRule)
    ),
  });
  const pendingDecision = buildFoulDecision(
    state,
    shot,
    ruleState,
    penalty,
    fouls,
    nextRule,
    missCalled,
  );

  const currentRuleState = ensureRuleState(state);
  // The non-offender owns the default next shot while deciding whether to
  // play or send the offender back. Keeping the offender as current player
  // makes online turn indicators and private aim guides appear on the wrong
  // client while this decision is pending.
  state.currentPlayerId = nonOffenderId;
  clearPostShotFlags(state);
  currentRuleState.pendingDecision = pendingDecision;
  currentRuleState.phase = nextRule.phase;
  currentRuleState.targetColorKind = nextRule.targetColorKind;
  currentRuleState.freeBallAvailable = false;
  currentRuleState.freeBallKind = null;
  currentRuleState.cueBallInHand = Boolean(shot.cueBallPotted);
  if (missCalled) {
    currentRuleState.missSequence = {
      count: (currentRuleState.missSequence?.count || 0) + 1,
      originalShotId: shot.shotInput ? JSON.stringify(shot.shotInput) : null,
    };
  } else {
    currentRuleState.missSequence = { count: 0, originalShotId: null };
  }

  return { penalty, pendingDecision, missCalled };
}

function clearPostShotFlags(state) {
  const ruleState = ensureRuleState(state);
  ruleState.freeBallAvailable = false;
  ruleState.freeBallKind = null;
  ruleState.nominatedColorKind = null;
  ruleState.requiresNomination = false;
  ruleState.nominationReason = null;
}

function applyLegalResult(state, shot, ruleState, shotTarget, score, events, options = {}) {
  const playerId = shot.playerId || state.currentPlayerId;
  const potted = pottedBalls(state, shot).filter((ball) => ball.kind !== BALL_KIND.CUE);
  const respotKinds = [...new Set(
    potted
      .map((ball) => ball.kind)
      .filter((kind) => shouldRespotColorAfterLegalShot(ruleState, kind, shotTarget)),
  )];
  if (options.respotColors !== false) {
    events.push(...respotSelectedPottedColors(state, respotKinds, 'legal-shot'));
  }

  if (score > 0) {
    addPlayerScore(state, playerId, score);
    addPlayerBreak(state, playerId, score);
    let scoringPots = potted;
    if (shotTarget.freeBallKind) {
      if (ruleState.phase === RULE_PHASE.REDS) {
        scoringPots = potted
          .filter((ball) => (
            ball.kind === BALL_KIND.RED || ball.kind === shotTarget.freeBallKind
          ))
          .map((ball) => ({ ...ball, kind: BALL_KIND.RED }));
      } else {
        // On colours a free ball and the true ball on potted in the same
        // stroke score only once. The break strip therefore records one ball
        // on, irrespective of which physical ball(s) entered a pocket.
        scoringPots = shotTarget.targetKind ? [{ kind: shotTarget.targetKind }] : [];
      }
    }
    addCurrentBreakPots(state, scoringPots);
  }

  if (ruleState.phase === RULE_PHASE.RESPOTTED_BLACK) {
    handleRespottedBlack(state, playerId, false, score > 0);
    return;
  }

  if (ruleState.phase === RULE_PHASE.FINAL_BLACK && score > 0) {
    finishFinalBlack(state, playerId, false, events);
    return;
  }

  const next = nextPhaseAfterLegalShot(state, ruleState, score);
  applyRuleStatePatch(state, next);
  ensureRuleState(state).cueBallInHand = false;

  if (score <= 0) {
    resetBreak(state, playerId);
    state.currentPlayerId = otherPlayerId(state, playerId);
  }

  ensureRuleState(state).missSequence = { count: 0, originalShotId: null };
  clearPostShotFlags(state);
}

function resolveShot(state, shotRecord, options = {}) {
  const shot = normalizeShotRecord(shotRecord || state.activeShot);
  const preRuleState = cloneJson(shot.preShotRuleState || ensureRuleState(state));
  // Test-field layouts start with an open choice. Resolve the first scoring
  // stroke using normal red/colour rules, then retain normal progression.
  if (preRuleState.testFieldOpenTargets) {
    const first = findBallById(state, shot.firstContactBallId);
    const beforeBalls = shot.preShotSnapshot?.balls || (state.balls || []).filter(ball =>
      !ball.potted || shot.pottedBallIds.includes(ball.id));
    const hadReds = beforeBalls.some(ball => ball.kind === BALL_KIND.RED
      && (!ball.potted || !shot.preShotSnapshot));
    preRuleState.testFieldOpenTargets = false;
    preRuleState.phase = first?.kind === BALL_KIND.RED ? RULE_PHASE.REDS
      : !hadReds && first?.kind === BALL_KIND.YELLOW ? RULE_PHASE.CLEARANCE
        : RULE_PHASE.COLOR_CHOICE;
    preRuleState.targetColorKind = preRuleState.phase === RULE_PHASE.CLEARANCE ? BALL_KIND.YELLOW : null;
  }
  const snookersRequiredBeforeShot = anyPlayerRequiresSnookers(shot.preShotSnapshot || state);
  const events = [];
  const shotTarget = inferShotTarget(state, preRuleState, shot);
  const fouls = options.detectFouls === false
    ? []
    : detectFouls(state, preRuleState, shot, shotTarget);
  const score = fouls.length > 0 ? 0 : calculateLegalScore(state, preRuleState, shot, shotTarget);

  let penalty = 0;
  let pendingDecision = null;
  let missCalled = false;

  if (fouls.length > 0) {
    const foulResult = applyFoulResult(
      state,
      shot,
      preRuleState,
      shotTarget,
      fouls,
      events,
      options,
    );
    penalty = foulResult.penalty;
    pendingDecision = foulResult.pendingDecision;
    missCalled = foulResult.missCalled;
  } else {
    applyLegalResult(state, shot, preRuleState, shotTarget, score, events, options);
  }

  const ruleState = ensureRuleState(state);
  const frameResult = state.frameOver && ruleState.lastRuleResult?.type === 'frame-over'
    ? cloneJson(ruleState.lastRuleResult)
    : null;
  if (score > 0 && ruleState.testFieldOpenTargets) ruleState.testFieldOpenTargets = false;
  const result = {
    type: frameResult?.type || 'shot-result',
    foul: fouls.length > 0,
    fouls: fouls.map((foul) => foul.code),
    foulDetails: fouls,
    miss: missCalled,
    points: score,
    penalty,
    shotTarget,
    pottedBallIds: shot.pottedBallIds,
    firstContactBallId: shot.firstContactBallId,
    nextPlayerId: pendingDecision ? null : state.currentPlayerId,
    nextTarget: targetKindsForRule(ruleState, state),
    pendingDecision,
    events,
    frameOver: Boolean(state.frameOver),
    winnerId: frameResult?.winnerId || null,
    reason: frameResult?.reason || null,
    overSnooker: !snookersRequiredBeforeShot && anyPlayerRequiresSnookers(state),
  };

  ruleState.lastRuleResult = result;
  prepareNextShotState(state);
  if (shotRecord) {
    shotRecord.ruleResult = result;
  }

  return { state, shotRecord, result, events };
}

function applyPendingDecision(state, decision) {
  const ruleState = ensureRuleState(state);
  const pending = ruleState.pendingDecision;
  if (pending?.type === 'respotted-black-break-off') {
    if (!pending.options.includes(decision)) {
      return { state, applied: false, reason: 'decision-not-allowed' };
    }
    if (decision === 'other-player-breaks') {
      state.currentPlayerId = otherPlayerId(state, state.currentPlayerId);
    }
    ruleState.pendingDecision = null;
    ruleState.phase = RULE_PHASE.RESPOTTED_BLACK;
    ruleState.targetColorKind = BALL_KIND.BLACK;
    prepareNextShotState(state);
    return { state, applied: true };
  }

  if (!pending || pending.type !== 'foul') {
    return { state, applied: false, reason: 'no-pending-foul-decision' };
  }
  const implicitPlaySelf = decision === DECISION.PLAY_SELF && pending.type === 'foul';
  if (!implicitPlaySelf && !pending.options.includes(decision)) {
    return { state, applied: false, reason: 'decision-not-allowed' };
  }

  if (decision === DECISION.RESTORE_PLAY_AGAIN && pending.restoreSnapshot) {
    const restoredShotInput = pending.restoreShotInput?.direction
      ? cloneJson(pending.restoreShotInput)
      : null;
    const playersAfterPenalty = cloneJson(state.players || []);
    restoreBallsFromSnapshot(state, pending.restoreSnapshot);
    state.players = playersAfterPenalty;
    state.currentPlayerId = pending.offenderId;
    state.ruleState = {
      ...cloneJson(pending.restoreSnapshot.ruleState || createInitialRuleState()),
      pendingDecision: null,
      freeBallAvailable: false,
      freeBallKind: null,
      missSequence: ensureRuleState(state).missSequence,
    };
    // Keep the restored controls in the authoritative match state until the
    // replayed shot starts. This makes room-state reconciliation and reconnect
    // restore the same direction and cue-tip point, without restoring power.
    state.nextShotInput = restoredShotInput;
    prepareNextShotState(state);
    return { state, applied: true };
  }

  state.currentPlayerId = decision === DECISION.PLAY_SELF
    ? pending.nonOffenderId
    : pending.offenderId;
  // A clock foul does not move the balls or consume the saved 3D stance.
  // Keep it for either player; a physical shot foul still clears it.
  state.nextShotInput = pending.fouls?.includes('shot-clock-timeout') && state.nextShotInput?.direction
    ? { ...cloneJson(state.nextShotInput), power: 0 }
    : null;
  ruleState.pendingDecision = null;
  ruleState.phase = pending.nextRuleState.phase;
  ruleState.targetColorKind = pending.nextRuleState.targetColorKind || null;
  ruleState.freeBallAvailable = decision === DECISION.PLAY_SELF
    ? Boolean(pending.freeBallAvailableIfSelf)
    : false;
  ruleState.freeBallKind = null;
  // As in 2D, placement before choosing the next player is not a stroke.
  if (pending.fouls?.includes('cue-ball-potted')) {
    ruleState.cueBallInHand = true;
    state.cueBallInHandReminder = null;
  }
  prepareNextShotState(state);
  return { state, applied: true };
}

function setNominatedColor(state, kind) {
  const ruleState = ensureRuleState(state);
  if (!COLOR_ORDER.includes(kind)) {
    return { state, applied: false, reason: 'not-a-color' };
  }
  ruleState.nominatedColorKind = kind;
  ruleState.requiresNomination = false;
  ruleState.nominationReason = null;
  return { state, applied: true };
}

function createRulesEngine() {
  return {
    resolveShot,
    applyPendingDecision,
    endFrame,
    prepareNextShotState,
    setNominatedColor,
    createTimeoutFoul,
  };
}

module.exports = {
  DECISION,
  MISS_MODE,
  RULE_PHASE,
  applyPendingDecision,
  createDefaultRuleSettings,
  createInitialRuleState,
  createRulesEngine,
  createTimeoutFoul,
  detectTouchingBalls,
  displayFoulCode,
  endFrame,
  isSnookeredOnTargets,
  prepareNextShotState,
  resolveShot,
  setNominatedColor,
  targetKindsForRule,
};

}, {"../../config/constants":4,"../model/ballSpec":5,"../model/spotModel":6,"./scoring":40,"./ruleSettingsAdapter":41,"./respot":15,"./ruleSnapshot":42,"./scoreAvailability":43,"./snookerGeometry":44}, "apps/three-game/src/core/rules/rulesEngine.js"],
40: [function(require, module, exports) {
function ballValue(kind) {
  const values = {
    red: 1,
    yellow: 2,
    green: 3,
    brown: 4,
    blue: 5,
    pink: 6,
    black: 7,
  };

  return values[kind] || 0;
}

module.exports = {
  ballValue,
};

}, {}, "apps/three-game/src/core/rules/scoring.js"],
41: [function(require, module, exports) {
(function installRuleSettingsAdapter(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SnookerRuleSettingsAdapter = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this), function createRuleSettingsAdapter() {
const MISS_MODE = {
  OFF: 'off',
  LIMITED_THREE: 'limited3',
  UNLIMITED: 'unlimited',
};

function clampNumber(value, min, max, fallback = min) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, number));
}

function createDefaultRuleSettings(overrides = {}) {
  return {
    missMode: MISS_MODE.LIMITED_THREE,
    missLimit: 3,
    autoInferColorChoice: true,
    autoInferFreeBall: true,
    requireNominationWhenSnookered: true,
    touchingBallToleranceMm: 0.8,
    shotClockSeconds: 60,
    timeoutPenalty: 4,
    ...overrides,
  };
}

function normalizeRuleSettings(settings = {}) {
  const missMode = Object.values(MISS_MODE).includes(settings.missMode)
    ? settings.missMode
    : MISS_MODE.LIMITED_THREE;
  const missLimit = Math.max(1, Math.round(Number(settings.missLimit) || 3));
  return createDefaultRuleSettings({
    ...settings,
    missMode,
    missLimit: missMode === MISS_MODE.LIMITED_THREE
      ? missLimit
      : Math.max(1, Math.round(Number(settings.missLimit) || 3)),
  });
}

function missLimitModeFromRuleSettings(settings = {}) {
  const normalized = normalizeRuleSettings(settings);
  if (normalized.missMode === MISS_MODE.OFF) return 'off';
  if (normalized.missMode === MISS_MODE.UNLIMITED) return 'unlimited';
  return Number(normalized.missLimit) <= 1 ? 'one' : 'three';
}

function ruleSettingsFromRuleValues(values = {}) {
  const defaults = createDefaultRuleSettings();
  const missLimitMode = ['off', 'one', 'three', 'unlimited'].includes(values.missLimitMode)
    ? values.missLimitMode
    : 'three';
  return normalizeRuleSettings({
    matchRulesEnabled: Boolean(values.matchRulesEnabled),
    autoInferColorChoice: values.autoInferColorChoice !== false,
    illegalAimHintEnabled: values.illegalAimHintEnabled !== false,
    autoInferFreeBall: values.autoInferFreeBall !== false,
    requireNominationWhenSnookered: values.requireNominationWhenSnookered !== false,
    touchingBallToleranceMm: clampNumber(values.touchingBallToleranceMm, 0, 5, defaults.touchingBallToleranceMm),
    shotClockSeconds: clampNumber(values.shotClockSeconds, 8, 180, defaults.shotClockSeconds),
    timeoutPenalty: clampNumber(values.timeoutPenalty, 4, 7, defaults.timeoutPenalty),
    missMode: missLimitMode === 'off'
      ? MISS_MODE.OFF
      : missLimitMode === 'unlimited'
        ? MISS_MODE.UNLIMITED
        : MISS_MODE.LIMITED_THREE,
    missLimit: missLimitMode === 'one' ? 1 : 3,
  });
}

function ruleValuesFromRuleSettings(settings = {}, matchRulesEnabled = false) {
  const normalized = normalizeRuleSettings(settings);
  return {
    matchRulesEnabled: Boolean(matchRulesEnabled),
    autoInferColorChoice: Boolean(normalized.autoInferColorChoice),
    illegalAimHintEnabled: normalized.illegalAimHintEnabled !== false,
    autoInferFreeBall: Boolean(normalized.autoInferFreeBall),
    requireNominationWhenSnookered: Boolean(normalized.requireNominationWhenSnookered),
    missLimitMode: missLimitModeFromRuleSettings(normalized),
    touchingBallToleranceMm: normalized.touchingBallToleranceMm,
    shotClockSeconds: normalized.shotClockSeconds,
    timeoutPenalty: normalized.timeoutPenalty,
  };
}

return {
  MISS_MODE,
  createDefaultRuleSettings,
  missLimitModeFromRuleSettings,
  normalizeRuleSettings,
  ruleSettingsFromRuleValues,
  ruleValuesFromRuleSettings,
};
});

}, {}, "apps/three-game/src/core/rules/ruleSettingsAdapter.js"],
42: [function(require, module, exports) {
function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function sanitizeRestoreSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') return null;
  return {
    balls: cloneJson(snapshot.balls || []),
    players: cloneJson(snapshot.players || []),
    currentPlayerId: snapshot.currentPlayerId || null,
    targetMode: snapshot.targetMode || null,
    ruleState: sanitizeRuleStateSnapshot(snapshot.ruleState, { includePendingRestore: false }),
    frameOver: Boolean(snapshot.frameOver),
    matchOver: Boolean(snapshot.matchOver),
  };
}

function sanitizePendingDecision(pendingDecision, options = {}) {
  if (!pendingDecision || typeof pendingDecision !== 'object') return null;
  const { restoreSnapshot, ...rest } = pendingDecision;
  const sanitized = cloneJson(rest);
  if (options.includeRestore && restoreSnapshot) {
    sanitized.restoreSnapshot = sanitizeRestoreSnapshot(restoreSnapshot);
  } else if ('restoreSnapshot' in pendingDecision) {
    sanitized.restoreSnapshot = null;
  }
  return sanitized;
}

function sanitizeRuleStateSnapshot(ruleState, options = {}) {
  if (!ruleState || typeof ruleState !== 'object') return null;
  const {
    lastRuleResult,
    pendingDecision,
    ...rest
  } = ruleState;
  const sanitized = cloneJson(rest);
  sanitized.pendingDecision = sanitizePendingDecision(pendingDecision, {
    includeRestore: options.includePendingRestore === true,
  });
  if (lastRuleResult && typeof lastRuleResult === 'object') {
    const { pendingDecision: resultPendingDecision, ...resultRest } = lastRuleResult;
    sanitized.lastRuleResult = {
      ...cloneJson(resultRest),
      pendingDecision: sanitizePendingDecision(resultPendingDecision, { includeRestore: false }),
    };
  } else {
    sanitized.lastRuleResult = null;
  }
  return sanitized;
}

function createPreShotSnapshot(state) {
  return {
    balls: cloneJson(state.balls || []),
    players: cloneJson(state.players || []),
    currentPlayerId: state.currentPlayerId,
    targetMode: state.targetMode,
    // A pre-shot restore point must not retain older restore points. Without
    // this boundary every foul can embed the previous foul snapshot again,
    // causing exponential match:state payload growth and transport framing
    // failures after several fouls.
    ruleState: sanitizeRuleStateSnapshot(state.ruleState, { includePendingRestore: false }),
    frameOver: Boolean(state.frameOver),
    matchOver: Boolean(state.matchOver),
  };
}

function restoreBallsFromSnapshot(state, snapshot) {
  if (!snapshot || !Array.isArray(snapshot.balls)) {
    return;
  }

  state.balls = cloneJson(snapshot.balls);
}

module.exports = {
  createPreShotSnapshot,
  restoreBallsFromSnapshot,
  sanitizeRuleStateSnapshot,
};

}, {}, "apps/three-game/src/core/rules/ruleSnapshot.js"],
43: [function(require, module, exports) {
const { BALL_KIND } = require('../../config/constants');
const { ballValue } = require('./scoring');

// A colour owed after a red belongs only to the current visit. A player
// coming to the table starts on reds (or the clearance), without that colour.
function availablePointsForPlayer(state, playerId) {
  const balls = (state?.balls || []).filter(ball => !ball.potted);
  const reds = balls.filter(ball => ball.kind === BALL_KIND.RED).length;
  const colors = balls.filter(ball => ball.kind !== BALL_KIND.CUE && ball.kind !== BALL_KIND.RED);
  const base = reds > 0 ? reds * 8 + 27 : colors.reduce((sum, ball) => sum + ballValue(ball.kind), 0);
  const rule = state?.ruleState || {};
  const owesColor = rule.phase === 'colorChoice' || rule.colorAfterLastRedDue;
  return base + (owesColor && state.currentPlayerId === playerId ? 7 : 0);
}

function playerRequiresSnookers(state, playerId) {
  const player = state?.players?.find(player => player.id === playerId);
  const opponent = state?.players?.find(player => player.id !== playerId);
  return Boolean(player && opponent
    && Number(opponent.score) - Number(player.score) > availablePointsForPlayer(state, playerId));
}

function anyPlayerRequiresSnookers(state) {
  return (state?.players || []).some(player => playerRequiresSnookers(state, player.id));
}

module.exports = { availablePointsForPlayer, playerRequiresSnookers, anyPlayerRequiresSnookers };

}, {"../../config/constants":4,"./scoring":40}, "apps/three-game/src/core/rules/scoreAvailability.js"],
44: [function(require, module, exports) {
const { BALL_RADIUS_MM } = require('../model/ballSpec');
const { BAULK_LINE_X_MM, D_RADIUS_MM } = require('../model/tableModel');

const EPS = 1e-7;
// Ambiguous regions smaller than this are treated as a possible escape, never
// as grounds to award a free ball. Units are physical table millimetres.
const D_SEARCH_TOLERANCE_MM = 0.0001;
const radiusOf = ball => ball.radius || BALL_RADIUS_MM;
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

function segmentDistance(point, start, end) {
  const dx = end.x - start.x, dy = end.y - start.y;
  const lengthSq = dx * dx + dy * dy;
  const t = lengthSq > EPS * EPS
    ? Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSq))
    : 0;
  return Math.hypot(point.x - start.x - t * dx, point.y - start.y - t * dy);
}

// Tangents to the target expanded by the cue radius give the cue-centre paths
// for the two thinnest contacts. Stop at contact, not beyond the target.
function extremeContacts(pos, target, cueRadius) {
  const dx = pos.x - target.pos.x, dy = pos.y - target.pos.y;
  const d = Math.hypot(dx, dy), r = cueRadius + radiusOf(target);
  if (d <= r + EPS) return [pos, pos];
  const along = r * r / (d * d);
  const across = r * Math.sqrt(d * d - r * r) / (d * d);
  return [-1, 1].map(sign => ({
    x: target.pos.x + along * dx - sign * across * dy,
    y: target.pos.y + along * dy + sign * across * dx,
  }));
}

function edgeClearances(pos, target, cueRadius, blockers) {
  return extremeContacts(pos, target, cueRadius).map(end => (
    blockers.reduce((clearance, ball) => Math.min(clearance,
      segmentDistance(ball.pos, pos, end) - cueRadius - radiusOf(ball)), Infinity)
  ));
}

function hasBothEdgesClear(pos, target, cueRadius, blockers) {
  return edgeClearances(pos, target, cueRadius, blockers).every(value => value >= -EPS);
}

// Bound the motion of a tangent endpoint over a cell of radius h. Distance
// to the corresponding segment changes by no more than its moving endpoints.
function edgeMotionBound(pos, target, cueRadius, h) {
  const d = distance(pos, target.pos), r = cueRadius + radiusOf(target);
  if (d - h <= r) return Infinity;
  const angle = Math.acos(r / d);
  const angleChange = Math.asin(Math.min(1, h / d)) + Math.max(
    angle - Math.acos(r / (d - h)), Math.acos(r / (d + h)) - angle,
  );
  return Math.max(h, r * angleChange);
}

function hasEscapeInD(state, cue, targets, blockers, objects) {
  const markings = state.table?.markings?.dArea;
  const center = {
    x: state.table?.baulkLineMm ?? markings?.center?.x ?? BAULK_LINE_X_MM,
    y: markings?.center?.y ?? 0,
  };
  const radius = state.table?.dRadiusMm ?? markings?.radius ?? D_RADIUS_MM;
  const cueRadius = radiusOf(cue);
  const valid = pos => pos.x <= center.x + EPS
    && distance(pos, center) <= radius + EPS
    && objects.every(ball => distance(pos, ball.pos) >= cueRadius + radiusOf(ball) - EPS);
  const escape = pos => valid(pos)
    && targets.some(target => hasBothEdgesClear(pos, target, cueRadius, blockers));
  if ([cue.pos, center, { x: center.x, y: center.y - radius },
    { x: center.x, y: center.y + radius }, { x: center.x - radius, y: center.y }].some(escape)) return true;

  // Search the entire D, including its boundary. Prune only cells proved to
  // be outside it, occupied, or blocked for every target. This avoids a fixed
  // placement grid missing a narrow legal escape between obstruction shadows.
  const cells = [{ x: center.x - radius / 2, y: center.y, hx: radius / 2, hy: radius }];
  while (cells.length) {
    const cell = cells.pop();
    const pos = { x: cell.x, y: cell.y }, h = Math.hypot(cell.hx, cell.hy);
    const near = { x: Math.max(cell.x - cell.hx, Math.min(center.x, cell.x + cell.hx)),
      y: Math.max(cell.y - cell.hy, Math.min(center.y, cell.y + cell.hy)) };
    if (distance(near, center) > radius + EPS) continue;
    if (objects.some(ball => distance(pos, ball.pos) + h < cueRadius + radiusOf(ball) - EPS)) continue;
    if (escape(pos)) return true;
    if (targets.every(target => {
      const bound = edgeMotionBound(pos, target, cueRadius, h);
      return edgeClearances(pos, target, cueRadius, blockers).some(value => value + bound < -EPS);
    })) continue;
    if (h <= D_SEARCH_TOLERANCE_MM) return true;
    if (cell.hx >= cell.hy) {
      const hx = cell.hx / 2;
      cells.push({ ...cell, x: cell.x - hx, hx }, { ...cell, x: cell.x + hx, hx });
    } else {
      const hy = cell.hy / 2;
      cells.push({ ...cell, y: cell.y - hy, hy }, { ...cell, y: cell.y + hy, hy });
    }
  }
  return false;
}

function isSnookered(state, cue, targetKinds, inHand = false) {
  if (!cue || (cue.potted && !inHand)) return false;
  const objects = (state.balls || []).filter(ball => !ball.potted && ball.id !== cue.id);
  const targets = objects.filter(ball => targetKinds.includes(ball.kind));
  if (!targets.length) return false;
  // Other balls on and cushions do not count as snookering obstacles.
  const blockers = objects.filter(ball => !targetKinds.includes(ball.kind));
  if (inHand) return !hasEscapeInD(state, cue, targets, blockers, objects);
  return !targets.some(target => hasBothEdgesClear(cue.pos, target, radiusOf(cue), blockers));
}

function effectiveSnookeringBalls(state, cue, targetKinds) {
  if (!cue || cue.potted) return [];
  const objects = (state.balls || []).filter(ball => !ball.potted && ball.id !== cue.id);
  const targets = objects.filter(ball => targetKinds.includes(ball.kind));
  const blockers = objects.filter(ball => !targetKinds.includes(ball.kind));
  if (!targets.length) return [];
  let common = null;
  for (const target of targets) {
    const obstructing = blockers.filter(ball => !hasBothEdgesClear(cue.pos, target, radiusOf(cue), [ball]));
    if (!obstructing.length) return [];
    const nearest = Math.min(...obstructing.map(ball => distance(cue.pos, ball.pos)));
    const effective = obstructing.filter(ball => distance(cue.pos, ball.pos) <= nearest + EPS);
    // WPBSA 2.17: nearest obstructions (including ties) are effective. When
    // different reds have different effective obstacles, no ball is effective
    // for the snooker as a whole, even if a farther ball also blocks each red.
    common = common === null ? effective : common.filter(ball => effective.some(other => other.id === ball.id));
    if (!common.length) return [];
  }
  return common || [];
}

module.exports = { isSnookered, effectiveSnookeringBalls };

}, {"../model/ballSpec":5,"../model/tableModel":7}, "apps/three-game/src/core/rules/snookerGeometry.js"],
45: [function(require, module, exports) {
function createRuleToastQueue(options = {}) {
  const now = typeof options.now === 'function' ? options.now : Date.now;
  const slotMs = Number.isFinite(options.slotMs) ? options.slotMs : 5000;
  const dedupeMs = Number.isFinite(options.dedupeMs) ? options.dedupeMs : 600;
  const maxQueued = Number.isFinite(options.maxQueued) ? Math.max(1, Math.floor(options.maxQueued)) : 8;
  const replaceOnPush = options.replaceOnPush === true;
  let idSeq = 0;
  let activeToast = null;
  let queue = [];

  function clear() {
    activeToast = null;
    queue = [];
  }

  function push(text, pushOptions = {}) {
    const message = String(text || '').trim();
    if (!message) return null;
    const createdAt = now();
    const replaceKey = String(pushOptions.replaceKey || '').trim();
    const lastQueued = queue[queue.length - 1];
    if (!replaceOnPush && (activeToast?.text === message || (lastQueued?.text === message && createdAt - lastQueued.createdAt < dedupeMs))) {
      return null;
    }
    const toast = {
      ...pushOptions,
      id: idSeq += 1,
      text: message,
      tone: pushOptions.tone || 'info',
      createdAt,
    };
    if (replaceKey) {
      queue = queue.filter((queuedToast) => queuedToast.replaceKey !== replaceKey);
      if (activeToast?.replaceKey === replaceKey) {
        activeToast = {
          ...toast,
          startedAt: createdAt,
        };
        return toast;
      }
    }
    if (replaceOnPush) {
      queue = [];
      if (activeToast) {
        activeToast = {
          ...toast,
          startedAt: createdAt,
        };
      } else {
        queue = [toast];
      }
      return toast;
    }
    queue.push(toast);
    if (queue.length > maxQueued) queue = queue.slice(-maxQueued);
    return toast;
  }

  function pushMany(messages, pushOptions = {}) {
    return (messages || []).map((message) => push(message, pushOptions)).filter(Boolean);
  }

  function next(timestamp = now()) {
    if (activeToast && timestamp - activeToast.startedAt >= slotMs) {
      activeToast = null;
    }
    if (!activeToast && queue.length) {
      activeToast = {
        ...queue.shift(),
        startedAt: timestamp,
      };
    }
    return activeToast;
  }

  function hasQueued() {
    return queue.length > 0;
  }

  function snapshot() {
    return {
      activeToast: activeToast ? { ...activeToast } : null,
      queue: queue.map((toast) => ({ ...toast })),
    };
  }

  return {
    clear,
    hasQueued,
    next,
    push,
    pushMany,
    snapshot,
  };
}

module.exports = {
  createRuleToastQueue,
};

}, {}, "apps/three-game/src/game-client/ruleToastQueue.js"],
46: [function(require, module, exports) {
const defaults = require('../../../assets/three-trial/layout-defaults.json');
const Profiles = require('../../../assets/three-trial/layout-profiles.js');
function deviceType(nav) {
  return nav.userAgentData?.mobile || /Android|iPhone|iPad|iPod|Mobile/i.test(nav.userAgent || '')
    || (/Macintosh/i.test(nav.userAgent || '') && nav.maxTouchPoints > 1) ? 'mobile' : 'desktop';
}
async function createLayoutRuntime() {
  if(window.ThreeTrialPageLayout)return window.ThreeTrialPageLayout;
  const params=new URLSearchParams(location.search);
  const preview=window.parent!==window && params.has('layoutEditorPreview');
  const override=params.get('layoutEditorDevice');
  const device=preview && ['desktop','mobile'].includes(override) ? override : deviceType(navigator);
  // Product windows can become portrait without changing the browser user agent.
  const effectiveDevice=()=>!preview&&window.SnookerProduct&&innerHeight>innerWidth?'mobile':device;
  let config=Profiles.normalize(defaults);
  const apply=next=>{if(next?.devices?.[device]?.pages?.game) config=Profiles.normalize(next);};
  try {
    const response=await fetch(new URL('../layout-overrides.json',document.baseURI),{cache:'no-store'});
    if(response.ok)apply(await response.json());
  } catch(error){console.error('3D 布局载入失败',error);}
  const onMessage=event=>{
    if(event.origin===location.origin && event.source===window.parent && event.data?.type==='layout-editor-preview-layout') apply(event.data.layout);
  };
  if(preview)window.addEventListener('message',onMessage);
  window.addEventListener('pagehide',()=>window.removeEventListener('message',onMessage),{once:true});
  let cachedSource,cachedWidth,cachedHeight,cachedScreenEdge,cachedProfile;
  const profile=()=>{
    const source=preview?Profiles.get(config,params.get('layoutEditorLayout')||device):Profiles.select(config,effectiveDevice(),innerWidth,innerHeight);
    const screenSize=!preview&&effectiveDevice()==='mobile'?(device==='mobile'?{width:window.screen?.width||innerWidth,height:window.screen?.height||innerHeight}:{width:innerWidth,height:innerHeight}):undefined;
    const screenEdge=screenSize?`${screenSize.width}:${screenSize.height}`:'';
    if(screenEdge!==cachedScreenEdge||source!==cachedSource||cachedWidth!==innerWidth||cachedHeight!==innerHeight){
      cachedScreenEdge=screenEdge;cachedSource=source;cachedWidth=innerWidth;cachedHeight=innerHeight;
      cachedProfile=Profiles.fit(source,innerWidth,innerHeight,screenSize);
    }
    return cachedProfile;
  };
  const sourceProfile=()=>preview?Profiles.get(config,params.get('layoutEditorLayout')||device):Profiles.select(config,effectiveDevice(),innerWidth,innerHeight);
  return {physicalDevice:device,get device(){return effectiveDevice();},preview,profile,sourceProfile,page:(name='game')=>profile().pages[name],ready(){if(preview)window.parent.postMessage({type:'three-trial-layout-ready'},location.origin);}};
}
module.exports={createLayoutRuntime,deviceType};

}, {"../../../assets/three-trial/layout-defaults.json":47,"../../../assets/three-trial/layout-profiles.js":48}, "apps/three-game/trial/layout-runtime.cjs"],
47: [function(require, module, exports) {
module.exports = {"version":9,"devices":{"desktop":{"id":"desktop","name":"桌面端","width":1920,"height":1080,"pages":{"game":{"scoreboard":{"x":50,"y":960,"width":1680,"height":100,"opacity":1},"playerAvatarLeft":{"x":60,"y":970,"width":80,"height":80,"opacity":1},"playerNameLeft":{"x":150,"y":960,"width":270,"height":59,"fontSize":24,"color":"#f3ead6","opacity":1},"playerRatingLeft":{"x":520,"y":970,"width":70,"height":30,"fontSize":16,"color":"#ffe7a0","hidden":true,"opacity":1},"playerAvatarRight":{"x":1180,"y":970,"width":80,"height":80,"opacity":1},"playerNameRight":{"x":1270,"y":960,"width":270,"height":59,"fontSize":24,"color":"#f3ead6","opacity":1},"playerRatingRight":{"x":1630,"y":970,"width":70,"height":30,"fontSize":16,"color":"#ffe7a0","hidden":true,"opacity":1},"breakScoreboardLeft":{"x":150,"y":1020,"width":430,"height":40,"opacity":1},"breakScoreboardRight":{"x":1270,"y":1020,"width":420,"height":40,"opacity":1},"powerPull":{"x":1772,"y":290,"width":110,"height":356,"opacity":1,"horizontalAnchor":"right","sideInset":38},"tipPad":{"x":1740,"y":650,"size":175,"width":175,"height":175,"opacity":1,"horizontalAnchor":"right","sideInset":5},"toast":{"x":980,"y":12,"width":560,"height":50,"opacity":1,"anchor":"top","topInset":12},"decision":{"x":100,"y":880,"width":1450,"height":60,"opacity":1},"practiceBreakScoreboard":{"x":50,"y":996,"width":500,"height":68,"opacity":1,"anchor":"bottom","bottomInset":16,"backgroundOpacity":0.42,"fontSize":26.4},"practiceShapeSelector":{"x":696,"y":996,"width":220,"height":68,"opacity":1,"anchor":"bottom","bottomInset":16,"backgroundOpacity":0.42,"fontSize":26.4},"practiceFreePlacementToggle":{"x":932,"y":996,"width":210,"height":68,"opacity":1,"anchor":"bottom","bottomInset":16,"backgroundOpacity":0.42,"fontSize":26.4},"practiceResetButton":{"x":1634,"y":996,"width":220,"height":68,"opacity":1,"anchor":"bottom","bottomInset":16,"backgroundOpacity":0.42,"fontSize":26.4},"practiceViewButtons":{"x":1158,"y":996,"width":460,"height":68,"opacity":1,"anchor":"bottom","bottomInset":16,"backgroundOpacity":0.42,"fontSize":26.4},"practiceDifficultySelector":{"x":566,"y":996,"width":114,"height":68,"opacity":1,"anchor":"bottom","bottomInset":16,"backgroundOpacity":0.42,"fontSize":26.4},"effectivePowerBar":{"x":640,"y":911,"width":640,"height":57,"opacity":1,"anchor":"bottom","bottomInset":112}},"loading":{"title":{"x":115.19999999999999,"y":378,"width":1689.6,"height":90,"fontSize":56,"text":"斯诺石狮三剑克 3D 练球房","color":"#eee5cd","opacity":1},"guide":{"x":153.6,"y":488,"width":1612.8,"height":90,"fontSize":30,"text":"推荐使用系统浏览器横屏体验，可通过浏览器分享功能添加到桌面。","color":"#a7bcb0","opacity":1},"startButton":{"x":480,"y":648,"width":960,"height":90,"fontSize":36,"opacity":1}}},"ratio":"16:9","orientation":"landscape"},"mobile":{"id":"mobile","name":"移动端","width":1920,"height":1080,"pages":{"game":{"scoreboard":{"x":50,"y":960,"width":1680,"height":100,"opacity":1},"playerAvatarLeft":{"x":60,"y":970,"width":80,"height":80,"opacity":1},"playerNameLeft":{"x":150,"y":960,"width":270,"height":59,"fontSize":24,"color":"#f3ead6","opacity":1},"playerRatingLeft":{"x":520,"y":970,"width":70,"height":30,"fontSize":16,"color":"#ffe7a0","hidden":true,"opacity":1},"playerAvatarRight":{"x":1180,"y":970,"width":80,"height":80,"opacity":1},"playerNameRight":{"x":1270,"y":960,"width":270,"height":59,"fontSize":24,"color":"#f3ead6","opacity":1},"playerRatingRight":{"x":1630,"y":970,"width":70,"height":30,"fontSize":16,"color":"#ffe7a0","hidden":true,"opacity":1},"breakScoreboardLeft":{"x":150,"y":1020,"width":430,"height":40,"opacity":1},"breakScoreboardRight":{"x":1270,"y":1020,"width":420,"height":40,"opacity":1},"powerPull":{"x":1772,"y":290,"width":110,"height":356,"opacity":1,"horizontalAnchor":"right","sideInset":38},"tipPad":{"x":5,"y":650,"size":175,"width":175,"height":175,"opacity":1,"horizontalAnchor":"left","sideInset":5},"toast":{"x":510,"y":12,"width":900,"height":100,"opacity":1,"anchor":"top","topInset":12},"decision":{"x":100,"y":880,"width":1450,"height":60,"opacity":1},"practiceBreakScoreboard":{"x":50,"y":996,"width":500,"height":68,"opacity":1,"anchor":"bottom","bottomInset":16,"backgroundOpacity":0.42,"fontSize":26.4},"practiceShapeSelector":{"x":696,"y":996,"width":220,"height":68,"opacity":1,"anchor":"bottom","bottomInset":16,"backgroundOpacity":0.42,"fontSize":26.4},"practiceFreePlacementToggle":{"x":932,"y":996,"width":210,"height":68,"opacity":1,"anchor":"bottom","bottomInset":16,"backgroundOpacity":0.42,"fontSize":26.4},"practiceResetButton":{"x":1634,"y":996,"width":220,"height":68,"opacity":1,"anchor":"bottom","bottomInset":16,"backgroundOpacity":0.42,"fontSize":26.4},"practiceViewButtons":{"x":1158,"y":996,"width":460,"height":68,"opacity":1,"anchor":"bottom","bottomInset":16,"backgroundOpacity":0.42,"fontSize":26.4},"practiceDifficultySelector":{"x":566,"y":996,"width":114,"height":68,"opacity":1,"anchor":"bottom","bottomInset":16,"backgroundOpacity":0.42,"fontSize":26.4},"effectivePowerBar":{"x":640,"y":911,"width":640,"height":57,"opacity":1,"anchor":"bottom","bottomInset":112}},"loading":{"title":{"x":115.19999999999999,"y":378,"width":1689.6,"height":90,"fontSize":72,"text":"斯诺石狮三剑克 3D 练球房","color":"#eee5cd","opacity":1},"guide":{"x":153.6,"y":488,"width":1612.8,"height":130,"fontSize":32,"text":"推荐使用系统浏览器横屏体验，可通过浏览器分享功能添加到桌面。","color":"#a7bcb0","opacity":1},"startButton":{"x":480,"y":648,"width":960,"height":140,"fontSize":48,"opacity":1}}},"ratio":"16:9","orientation":"landscape","profiles":{"portrait":{"id":"portrait","name":"移动端竖屏","width":1080,"height":1920,"ratio":"16:9","orientation":"portrait","pages":{"game":{"scoreboard":{"x":-370,"y":787.6923076923076,"width":1680,"height":100,"opacity":1},"playerAvatarLeft":{"x":-360,"y":795.8974358974359,"width":80,"height":80,"opacity":1},"playerNameLeft":{"x":-270,"y":787.6923076923076,"width":270,"height":59,"fontSize":24,"color":"#f3ead6","opacity":1},"playerRatingLeft":{"x":100,"y":795.8974358974359,"width":70,"height":30,"fontSize":16,"color":"#ffe7a0","hidden":true,"opacity":1},"playerAvatarRight":{"x":760,"y":795.8974358974359,"width":80,"height":80,"opacity":1},"playerNameRight":{"x":850,"y":787.6923076923076,"width":270,"height":59,"fontSize":24,"color":"#f3ead6","opacity":1},"playerRatingRight":{"x":1210,"y":795.8974358974359,"width":70,"height":30,"fontSize":16,"color":"#ffe7a0","hidden":true,"opacity":1},"breakScoreboardLeft":{"x":-270,"y":836.9230769230769,"width":430,"height":40,"opacity":1},"breakScoreboardRight":{"x":850,"y":836.9230769230769,"width":420,"height":40,"opacity":1},"powerPull":{"x":942,"y":1004,"width":110,"height":356,"opacity":1,"horizontalAnchor":"right","sideInset":28,"anchor":"bottom","bottomInset":560},"tipPad":{"x":28,"y":1265,"size":175,"width":175,"height":175,"opacity":1,"horizontalAnchor":"left","sideInset":28,"anchor":"bottom","bottomInset":480},"toast":{"x":90,"y":24,"width":900,"height":100,"opacity":1,"anchor":"top","topInset":24},"decision":{"x":-320,"y":722.051282051282,"width":1450,"height":60,"opacity":1},"practiceBreakScoreboard":{"x":76,"y":1668,"width":480,"height":112,"opacity":1,"anchor":"bottom","bottomInset":140,"backgroundOpacity":0.42,"fontSize":36},"practiceShapeSelector":{"x":724,"y":1668,"width":280,"height":112,"opacity":1,"anchor":"bottom","bottomInset":140,"backgroundOpacity":0.42,"fontSize":36},"practiceFreePlacementToggle":{"x":548,"y":1796,"width":224,"height":112,"opacity":1,"anchor":"bottom","bottomInset":12,"backgroundOpacity":0.42,"fontSize":36},"practiceResetButton":{"x":784,"y":1796,"width":240,"height":112,"opacity":1,"anchor":"bottom","bottomInset":12,"backgroundOpacity":0.42,"fontSize":36},"practiceViewButtons":{"x":56,"y":1796,"width":480,"height":112,"opacity":1,"anchor":"bottom","bottomInset":12,"backgroundOpacity":0.42,"fontSize":36},"practiceDifficultySelector":{"x":568,"y":1668,"width":144,"height":112,"opacity":1,"anchor":"bottom","bottomInset":140,"backgroundOpacity":0.42,"fontSize":36},"effectivePowerBar":{"x":220,"y":1581,"width":640,"height":57,"opacity":1,"anchor":"bottom","bottomInset":282}},"loading":{"title":{"x":64.8,"y":672,"width":950.4,"height":131.28205128205127,"fontSize":52.51282051282051,"text":"斯诺石狮三剑克 3D 练球房","color":"#eee5cd","opacity":1},"guide":{"x":86.4,"y":819.6923076923076,"width":907.1999999999999,"height":260,"fontSize":34,"text":"推荐使用系统浏览器横屏体验，可通过浏览器分享功能添加到桌面。","color":"#a7bcb0","opacity":1},"startButton":{"x":270,"y":1152,"width":540,"height":114.87179487179486,"fontSize":39.38461538461539,"opacity":1}}}}}}}};
}, {}, "assets/three-trial/layout-defaults.json"],
48: [function(require, module, exports) {
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ThreeTrialLayoutProfiles=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const ratios={'16:9':16/9,'4:3':4/3,'19.5:9':19.5/9,'21:9':21/9};
  const orientations=['landscape','portrait'];
  const clone=value=>JSON.parse(JSON.stringify(value));
  const key=(ratio,orientation)=>`${ratio}-${orientation}`;
  function dimensions(ratio,orientation){const long=Math.round(1080*ratios[ratio]);return orientation==='portrait'?{width:1080,height:long}:{width:long,height:1080};}
  function loadingGuide(mobile,portrait){return {
    text:'推荐使用系统浏览器横屏体验，可通过浏览器分享功能添加到桌面。',
    height:portrait?260:mobile?130:90,fontSize:portrait?34:mobile?32:30,
  };}
  function loadingPage(width,height,mobile=false){
    const portrait=height>width;
    return {
      title:{x:width*.06,y:height*.35,width:width*.88,height:portrait?160:90,fontSize:portrait?64:mobile?72:56,text:'斯诺石狮三剑克 3D 练球房',color:'#eee5cd',opacity:1},
      guide:{x:width*.08,y:height*.35+(portrait?180:110),width:width*.84,...loadingGuide(mobile,portrait),color:'#a7bcb0',opacity:1},
      startButton:{x:width*.25,y:height*.60,width:width*.5,height:portrait||mobile?140:90,fontSize:portrait||mobile?48:36,opacity:1},
    };
  }
  function derived(base,ratio,orientation){
    const {width,height}=dimensions(ratio,orientation),game=clone(base.pages.game);
    for(const r of Object.values(game)){
      if(Number.isFinite(r.x))r.x+=(width-base.width)/2;
      if(r.anchor==='bottom')r.y=height-r.height-(r.bottomInset??16);
      if(r.horizontalAnchor)r.x=r.horizontalAnchor==='left'?(r.sideInset??5):width-r.width-(r.sideInset??5);
    }
    const footer=['practiceBreakScoreboard','practiceDifficultySelector','practiceShapeSelector','practiceFreePlacementToggle','practiceViewButtons','practiceResetButton'];
    for(const k of footer)if(game[k]){game[k].x=base.pages.game[k].x*width/base.width;game[k].width*=width/base.width;}
    if(orientation==='portrait'){
      const put=(k,x,bottom,w,h)=>{game[k]={...game[k],x,y:height-bottom-h,width:w,height:h,anchor:'bottom',bottomInset:bottom,fontSize:36};};
      put('practiceBreakScoreboard',76,140,480,112);
      put('practiceDifficultySelector',568,140,144,112);
      put('practiceShapeSelector',724,140,280,112);
      put('practiceViewButtons',56,12,480,112);
      put('practiceFreePlacementToggle',548,12,224,112);
      put('practiceResetButton',784,12,240,112);
      game.tipPad={...game.tipPad,x:28,y:height-740,width:260,height:260,size:260,sideInset:28,anchor:'bottom',bottomInset:480};
      game.powerPull={...game.powerPull,x:942,y:height-960,width:110,height:400,sideInset:28,anchor:'bottom',bottomInset:560};
      game.toast={...game.toast,x:90,y:24,width:900,height:100,topInset:24};
    }
    return {id:key(ratio,orientation),name:`${ratio} ${orientation==='portrait'?'竖屏':'横屏'}`,width,height,ratio,orientation,pages:{game,loading:loadingPage(width,height,base.id==='mobile')}};
  }
  const footerKeys=['practiceBreakScoreboard','practiceDifficultySelector','practiceShapeSelector','practiceFreePlacementToggle','practiceViewButtons','practiceResetButton'];
  const layouts={desktop:{name:'桌面端横屏',device:'desktop',orientation:'landscape'},mobile:{name:'移动端横屏',device:'mobile',orientation:'landscape'},mobilePortrait:{name:'移动端竖屏',device:'mobile',orientation:'portrait'}};
  function normalize(input){
    const config=clone(input);
    for(const id of ['desktop','mobile']){
      const base=config.devices?.[id];if(!base?.pages?.game)throw Error('必须包含桌面端和移动端的练球布局');
      base.pages.loading??=loadingPage(base.width,base.height,id==='mobile');
      base.ratio='16:9';base.orientation='landscape';
      if(id==='mobile'){
        // Keep the existing portrait design when migrating the former ratio profiles.
        let portrait=base.profiles?.portrait||base.profiles?.['19.5:9-portrait']||derived(base,'16:9','portrait');
        if(portrait.width!==1080||portrait.height!==1920)portrait=fit(portrait,1080,1920,{width:1080,height:1920});
        portrait.ratio='16:9';
        portrait.id='portrait';portrait.orientation='portrait';portrait.name='移动端竖屏';
        base.profiles={portrait};
      }else delete base.profiles;
    }
    if((input.version||1)<6){
      const portrait=config.devices.mobile.profiles.portrait;
      const initial=derived(config.devices.mobile,'16:9','portrait');
      for(const key of footerKeys)portrait.pages.game[key]={...portrait.pages.game[key],...Object.fromEntries(['x','y','width','height','anchor','bottomInset','fontSize'].map(field=>[field,initial.pages.game[key][field]]))};
    }
    if((input.version||1)<7){
      for(const id of Object.keys(layouts)){
        const profile=get(config,id);
        for(const key of footerKeys)if(profile.pages.game[key])profile.pages.game[key].fontSize=id==='mobilePortrait'?36:26.4;
      }
    }
    for(const id of Object.keys(layouts)){
      const profile=get(config,id);
      profile.pages.game.effectivePowerBar??={x:(profile.width-640)/2,y:profile.height-(id==='mobilePortrait'?320:150),width:640,height:(input.version||1)<9?38:57,opacity:1,anchor:'bottom',bottomInset:id==='mobilePortrait'?282:112};
    }
    if((input.version||1)<8){
      const landscape=config.devices.mobile, portrait=landscape.profiles.portrait;
      const from=portrait.pages.game.toast,to=landscape.pages.game.toast;
      if(from&&to){to.width=from.width;to.height=from.height;to.x=(landscape.width-to.width)/2;}
    }
    for(const id of Object.keys(layouts)){
      const profile=get(config,id),bar=profile.pages.game.effectivePowerBar;
      if((input.version||1)<9)bar.height*=1.5;
      bar.x=(profile.width-bar.width)/2;
      if(bar.anchor==='bottom')bar.y=profile.height-bar.height-bar.bottomInset;
    }
    for(const id of Object.keys(layouts)){
      const guide=get(config,id).pages.loading.guide;
      if(guide?.text==='添加至主屏幕，可获得更完整的游戏体验。')Object.assign(guide,loadingGuide(id!=='desktop',id==='mobilePortrait'));
    }
    syncMobileControlSizes(config,'mobile');
    config.version=9;return config;
  }
  function syncMobileControlSizes(config,sourceId){
    if(!['mobile','mobilePortrait'].includes(sourceId))return;
    const source=get(config,sourceId),target=get(config,sourceId==='mobile'?'mobilePortrait':'mobile');
    for(const key of ['tipPad','powerPull','toast']){
      const from=source.pages.game[key],to=target.pages.game[key];if(!from||!to)continue;
      const resized=from.width!==to.width||from.height!==to.height;
      for(const field of ['width','height','size']){if(from[field]!==undefined)to[field]=from[field];else delete to[field];}
      if(resized&&to.anchor==='bottom')to.y=target.height-to.height-(to.bottomInset??16);
      if(resized&&to.horizontalAnchor==='right')to.x=target.width-to.width-(to.sideInset??5);
    }
  }
  function get(config,layoutId){
    return layoutId==='mobilePortrait'?config.devices.mobile.profiles.portrait:config.devices[layoutId];
  }
  function select(config,device,width,height){
    return get(config,device==='mobile'&&height>width?'mobilePortrait':device);
  }
  function fit(profile,width,height,screenSize){
    const scale=screenSize?.width>0&&screenSize?.height>0?Math.min(Math.min(screenSize.width,screenSize.height)/1080,Math.max(screenSize.width,screenSize.height)/1920):Math.min(width/profile.width,height/profile.height),w=width/scale,h=height/scale;
    if(Math.abs(w-profile.width)<.01&&Math.abs(h-profile.height)<.01)return profile;
    const fx=w/profile.width,fy=h/profile.height,pages={};
    const footer=new Set(['practiceBreakScoreboard','practiceDifficultySelector','practiceShapeSelector','practiceFreePlacementToggle','practiceViewButtons','practiceResetButton']);
    for(const [page,elements]of Object.entries(profile.pages)){
      pages[page]={};
      for(const [key,r]of Object.entries(elements)){
        const next={...r};
        if(page==='loading'){
          next.x=r.x*fx;next.y=r.y*fy;next.width=r.width*fx;next.height=r.height*fy;next.fontSize=r.fontSize*Math.min(fx,fy);
        }else{
          if(Number.isFinite(r.x))next.x=r.x*fx;
          if(Number.isFinite(r.y))next.y=r.y*fy;
          if(footer.has(key)&&profile.orientation==='portrait'){next.x=r.x+(w-profile.width)/2;}
          else if(footer.has(key))next.width=r.width*fx;
          if(key==='effectivePowerBar')next.x=(w-r.width)/2;
          if(key==='toast')next.x=(w-r.width)/2+(r.x-(profile.width-r.width)/2);
          if(footer.has(key))next.fontSize=(r.fontSize||26.4)*Math.min(1,fx);
          if(r.anchor==='bottom')next.y=h-r.height-(r.bottomInset??16);
          if(r.anchor==='top')next.y=r.topInset??12;
          if(r.horizontalAnchor)next.x=r.horizontalAnchor==='left'?(r.sideInset??5):w-r.width-(r.sideInset??5);
        }
        pages[page][key]=next;
      }
    }
    return {...profile,width:w,height:h,pages};
  }
  return {ratios,orientations,key,dimensions,layouts,normalize,get,select,fit,syncMobileControlSizes};
});

}, {}, "assets/three-trial/layout-profiles.js"],
49: [function(require, module, exports) {
const keys=['practiceBreakScoreboard','practiceDifficultySelector','practiceShapeSelector','practiceFreePlacementToggle','practiceViewButtons','practiceResetButton'];
function fitFooter(layout,{width,height,left=0,right=0,preview=false}){
 const s=Math.min(width/1920,height/1080),ox=(width-1920*s)/2;
 const items=keys.map(k=>layout[k]).filter(r=>r&&!r.hidden);
 if(preview||!items.length)return {scale:1,x:0,y:0};
 const minX=Math.min(...items.map(r=>r.x)),maxX=Math.max(...items.map(r=>r.x+r.width));
 const bottom=Math.max(...items.map(r=>r.y+r.height));
 const margin=12;
 const scale=Math.max(1,width-left-right-margin*2)/(Math.max(1,maxX-minX)*s);
 return {scale,x:(left+margin-ox)/s-minX*scale,y:bottom*(1-scale)};
}
function mapFooterRect(r,t){return {...r,x:r.x*t.scale+t.x,y:r.y*t.scale+t.y,width:r.width*t.scale,height:r.height*t.scale};}
function anchorFooterBottom(layout,{height,scale,offsetY=0,safeBottom=0,margin=12}){
 const items=keys.map(key=>layout[key]).filter(r=>r&&!r.hidden);
 if(!items.length)return layout;
 const bottom=Math.max(...items.map(r=>r.y+r.height));
 const shift=(height-safeBottom-margin-offsetY)/scale-bottom;
 return Object.fromEntries(Object.entries(layout).map(([key,r])=>[key,keys.includes(key)?{...r,y:r.y+shift}:r]));
}
function distributeFooterRows(layout,{width,scale,offsetX=0,safeLeft=0,safeRight=0,margin=12,gap=12}){
 const result={...layout},rows=new Map();
 for(const key of keys){
  const r=layout[key];if(!r||r.hidden)continue;
  const row=rows.get(r.y)||[];row.push(key);rows.set(r.y,row);
 }
 for(const row of rows.values()){
  row.sort((a,b)=>layout[a].x-layout[b].x);
  const available=(width-safeLeft-safeRight-2*margin)/scale-gap*(row.length-1);
  const total=row.reduce((sum,key)=>sum+layout[key].width,0);
  let x=(safeLeft+margin-offsetX)/scale;
  for(const key of row){const r=layout[key],w=available*r.width/total;result[key]={...r,x,width:w};x+=w+gap;}
 }
 return result;
}
module.exports={fitFooter,mapFooterRect,anchorFooterBottom,distributeFooterRows,keys};

}, {}, "apps/three-game/trial/footer-layout.cjs"]
  };
  const cache = {};

  function load(id) {
    if (cache[id]) return cache[id].exports;
    const record = modules[id];
    if (!record) throw new Error('Module not found: ' + id);
    const [factory, deps, filename] = record;
    const module = { exports: {} };
    cache[id] = module;
    function localRequire(request) {
      if (typeof request === 'number') return load(request);
      if (!Object.prototype.hasOwnProperty.call(deps, request)) {
        throw new Error('Cannot require ' + request + ' from ' + filename);
      }
      return load(deps[request]);
    }
    factory(localRequire, module, module.exports);
    return module.exports;
  }

  load(0);
})();