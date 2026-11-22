import * as THREE from 'three';
export function replayDecision(data){
 if(data.frameOver)return '清台黑球';
 if(data.rails>=3)return '多库走位';
 if(['crowdGreat','crowdAmazing'].includes(data.reaction?.bankName))return '高难度进球';
 return null;
}
export function createReplayTest({game,scene,meshById,cue,world,renderer:mainRenderer,controls,syncBalls,createReturns,updateLighting,hideDuringReplay=[],beforeOpen=()=>{}}){
 const button=document.createElement('button');button.textContent='回放测试';button.type='button';document.querySelector('.toolbar').append(button);
 const host=document.createElement('section');host.hidden=true;host.style.cssText='position:fixed;inset:0;z-index:200;background:#101820;color:white;font:14px system-ui';
 host.innerHTML=`<div data-stage style="position:absolute;inset:0"></div><div data-wipe style="position:absolute;inset:0;background:#163d42;pointer-events:none;display:none;align-items:center;justify-content:center;font:bold 32px system-ui;letter-spacing:8px">精彩回放</div><div data-controls style="position:absolute;left:12px;top:12px;right:12px;display:flex;gap:8px;flex-wrap:wrap;align-items:center;padding:12px;background:#101820dd;border-radius:10px"><strong>回放测试</strong><select data-case><option value="corner">角袋进球</option><option value="three-rails">进球后三库走位</option><option value="final-black">最后黑球清台</option></select><select data-view><option value="auto">推荐机位</option><option value="broadcast">直播</option><option value="pocket">袋口跟随</option><option value="forward">顺球入袋</option><option value="follow">双球跟随</option></select><select data-transition><option value="diagonal">斜向滑屏</option><option value="circle">圆环扫屏</option><option value="none">无转场</option></select><select data-mode><option value="preview">效果预览</option><option value="flow">完整流程</option></select><button data-prev>上一个</button><button data-next>下一个</button><button data-play>播放 / 重播</button><button data-compare>对比转场</button><button data-close>退出测试</button><span data-status></span></div><div data-label style="position:absolute;left:20px;bottom:24px;pointer-events:none">点击画面跳过</div>`;
 document.body.append(host);const q=s=>host.querySelector(s),stage=q('[data-stage]'),wipe=q('[data-wipe]'),status=q('[data-status]');
 // Reuse the live scene, renderer, materials and environment. Only presentation
 // transforms are borrowed; fixture data never enters the game core.
 const meshes=meshById,replayCue=cue;
 let returns=null,returnTime=0,returnEvent=0,returnData=null,returnState=null;
 let savedObjects=[],canvasParent=null,canvasNext=null,controlsEnabled=false;
 function borrowScene(){
  savedObjects=[];scene.traverse(o=>savedObjects.push({o,visible:o.visible,position:o.position.clone(),quaternion:o.quaternion.clone(),scale:o.scale.clone(),pocketLight:o.userData.pocketLight}));
  for(const o of hideDuringReplay)if(o)o.visible=false;
  controlsEnabled=controls.enabled;controls.enabled=false;
  canvasParent=mainRenderer.domElement.parentNode;canvasNext=mainRenderer.domElement.nextSibling;
  stage.append(mainRenderer.domElement);
  returns=createReturns();returnData=null;
 }
 function restoreScene(){
  returns?.reset();returns=null;returnData=null;
  for(const v of savedObjects){v.o.visible=v.visible;v.o.position.copy(v.position);v.o.quaternion.copy(v.quaternion);v.o.scale.copy(v.scale);if(v.pocketLight!==undefined)v.o.userData.pocketLight=v.pocketLight;}
  savedObjects=[];controls.enabled=controlsEnabled;
  if(canvasParent)canvasParent.insertBefore(mainRenderer.domElement,canvasNext?.parentNode===canvasParent?canvasNext:null);
  syncBalls(null);updateLighting();
 }
 let renderer=null,data=null,phase='idle',start=0,index=0,request=0,wasPaused=false,comparison=false,second=false,transition='diagonal',activeView='broadcast',disposed=false;
 const camera=new THREE.PerspectiveCamera(36,1,.02,100),look=new THREE.Vector3();
 function resize(){if(!renderer)return;camera.aspect=innerWidth/innerHeight;camera.fov=THREE.MathUtils.radToDeg(2*Math.atan(Math.tan(Math.PI/10)/Math.min(1,camera.aspect)));camera.updateProjectionMatrix();}
 function broadcast(){camera.position.copy(world({x:0,y:0},0)).add(new THREE.Vector3(-8*Math.cos(25*Math.PI/180),8*Math.sin(25*Math.PI/180),0));look.copy(world({x:0,y:0},0));camera.lookAt(look);}
 // Seek the same 3D pocket simulation by recorded event time. Rebuild on
 // rewind so replay/repeat never inherits balls from a previous run.
 function syncReturns(t){
  const time=Math.max(0,t);
  if(returnData!==data || time<returnTime){
   returns.reset();returnTime=0;returnEvent=0;returnData=data;
   returnState={balls:data.initial.map(ball=>({...ball}))};
   for(const mesh of meshes.values())mesh.userData.pocketLight=1;
   syncBalls(data.initial,returns);
  }
  const events=data.events.filter(e=>['ball-potted','cue-ball-potted'].includes(e.type));
  while(returnTime<time || (events[returnEvent]&&events[returnEvent].t<=time)){
   const event=events[returnEvent];
   if(event&&event.t<=returnTime+1e-9){
    const ball=returnState.balls.find(b=>b.id===event.ballId);if(ball)ball.potted=true;
    returns.capture([event],returnState);returnEvent++;continue;
   }
   const next=Math.min(time,returnTime+1/120,event?.t??Infinity);
   returns.update(next-returnTime,returnState);returnTime=next;
  }
 }
 function draw(t,dt){
 const frames=data.frames;if(t<frames[index].t)index=0;while(index+1<frames.length&&frames[index+1].t<=t)index++;const a=frames[index],b=frames[Math.min(index+1,frames.length-1)],f=Math.max(0,Math.min(1,(t-a.t)/(b.t-a.t||1)));
 const interpolated=a.balls.map(ball=>{const next=b.balls.find(v=>v.id===ball.id)||ball;return {...ball,pos:{x:ball.pos.x+(next.pos.x-ball.pos.x)*f,y:ball.pos.y+(next.pos.y-ball.pos.y)*f}};});
 syncReturns(t);
 syncBalls(interpolated,returns);
 const cb=meshes.get(data.cueId),ob=meshes.get(data.targetId),mouth=world(data.pocket.openingDefinition.center,.08);
 replayCue.visible=t<0;
 if(t<0){const p=data.initial.find(b=>b.id===data.cueId),d=data.direction,gap=.012+Math.max(0,-t-.1)*.2;const back=new THREE.Vector3(d.x,.044,d.y).normalize();replayCue.position.copy(world(p.pos,p.radius/1000)).addScaledVector(back,.02625+gap);replayCue.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),back);}
 const view=phase==='live'?'broadcast':activeView;
 if(view==='broadcast')broadcast();else{
  const entry=data.events.find(e=>e.ballId===data.targetId&&e.type==='ball-potted');
  const target=entry&&t>=entry.t?world(entry.entryPosition||data.pocket.openingDefinition.center,.02625):ob.position.clone(),cuePos=cb.position.clone();
  if(view==='pocket'){const outward=mouth.clone().sub(world({x:0,y:0},.08)).normalize();camera.position.copy(mouth).addScaledVector(outward,.8);camera.position.y=mouth.y+.6;
   const hit=data.frames.find(fr=>(fr.events||[]).some(e=>e.type==='ball-hit-ball'))?.t??.3;const blend=THREE.MathUtils.smoothstep(t,hit-.15,hit+.2);look.lerpVectors(cuePos,target,blend);}
  else if(view==='forward'){const initial=world(data.initial.find(b=>b.id===data.targetId).pos,.08);camera.position.copy(initial).addScaledVector(initial.clone().sub(mouth).normalize(),1.4);camera.position.y=mouth.y+.9;look.copy(mouth).lerp(target,.35);}
  else{const midpoint=cuePos.clone().add(target).multiplyScalar(.5);const distance=Math.max(1.5,cuePos.distanceTo(target)*1.5);const desired=midpoint.clone().add(new THREE.Vector3(-distance,distance*.85,distance*.4));camera.position.lerp(desired,1-Math.exp(-dt*4));look.lerp(midpoint,1-Math.exp(-dt*5));}
  camera.lookAt(look);
 }
 updateLighting();
 }
 function mask(progress){wipe.style.display=transition==='none'?'none':'flex';const cover=progress<.5?progress*2:(1-progress)*2;
 if(transition==='circle'){wipe.style.transform='none';wipe.style.clipPath=`circle(${cover*150}% at 50% 50%)`;}
 else{wipe.style.transform='none';const edge=progress<.5?progress*240:(progress-.5)*240;wipe.style.clipPath=progress<.5?`polygon(0 0, ${edge}% 0, ${edge-20}% 100%, 0 100%)`:`polygon(${edge}% 0, 120% 0, 100% 100%, ${edge-20}% 100%)`;}}
 function beginReplay(now){phase='wipe';start=now;index=0;broadcast();status.textContent=`${second?'对比 2/2 · ':comparison?'对比 1/2 · ':''}${transition==='circle'?'圆环':transition==='none'?'无转场':'斜向'} · 回放`;}
 let previous=0;
 function loop(now){if(host.hidden||disposed)return;const dt=Math.min(.1,(now-previous)/1000||0);previous=now;
 if(data){const elapsed=(now-start)/1000,end=data.frames.at(-1).t;
  if(phase==='wipe'){const p=Math.min(1,elapsed/.35);mask(p);draw(p<.5?end:-.5,dt);if(p===1){wipe.style.display='none';phase='replay';start=now;index=0;}}
  else if(phase==='replay'||phase==='live'){const t=elapsed-.5;draw(t,dt);if(t>end+.5){if(phase==='live'){const reason=replayDecision(data);status.textContent=reason?`触发：${reason}`:'未触发：普通进球';if(reason)beginReplay(now);else phase='done';}else {phase='out';start=now;}}}
  else if(phase==='out'){const p=Math.min(1,elapsed/.35);mask(p);draw(end,dt);if(p>=.5){broadcast();updateLighting();}if(p===1){wipe.style.display='none';if(comparison&&!second){second=true;transition='circle';beginReplay(now);}else{phase='done';status.textContent=data.frameOver?'清台回放结束 · 保持直播视角':'播放结束';}}}
  else if(phase==='done'){broadcast();updateLighting();}
 }

 }
 async function play(compare=false){const token=++request;comparison=compare;second=false;phase='idle';wipe.style.display='none';status.textContent='加载用例…';
 try{const response=await fetch(new URL(`./replay-fixtures/${q('[data-case]').value}.json`,import.meta.url));if(!response.ok)throw Error('加载失败');const loaded=await response.json();if(token!==request||host.hidden)return;data=loaded;returnData=null;index=0;transition=compare?'diagonal':q('[data-transition]').value;activeView=q('[data-view]').value;if(activeView==='auto')activeView=data.rails>=3?'broadcast':'pocket';broadcast();start=performance.now();if(q('[data-mode]').value==='flow'&&!compare){phase='live';status.textContent='预设击球 · 等待结算';}else beginReplay(start);
 }catch(e){if(token===request)status.textContent='用例加载失败，请重试';}}
 function close(){if(host.hidden)return;request++;host.hidden=true;phase='idle';data=null;wipe.style.display='none';restoreScene();renderer=null;if(!wasPaused&&game.isPaused())game.togglePause();}
 button.onclick=()=>{if(game.isBusy()&&!game.isPaused()){button.title='请等待当前击球结束';return;}beforeOpen();wasPaused=game.isPaused();if(!wasPaused)game.togglePause();host.hidden=false;renderer=mainRenderer;borrowScene();resize();broadcast();previous=performance.now();play();};
 q('[data-play]').onclick=()=>play();q('[data-compare]').onclick=()=>play(true);q('[data-close]').onclick=close;
 for(const [selector,delta]of [['[data-prev]',-1],['[data-next]',1]])q(selector).onclick=()=>{const select=q('[data-case]');select.selectedIndex=(select.selectedIndex+delta+select.options.length)%select.options.length;play();};
 const skip=e=>{if(e.target.closest('[data-controls]'))return;e.preventDefault();e.stopImmediatePropagation();comparison=false;close();};host.addEventListener('pointerdown',skip,true);
 const block=e=>{if(!host.hidden&&!e.target.closest('[data-controls]')){e.stopImmediatePropagation();if(e.type==='keydown'&&e.key==='Escape')close();}};const events=['pointermove','pointerup','wheel','keydown'];for(const name of events)window.addEventListener(name,block,true);
 window.addEventListener('resize',resize);return {diagnostics:()=>({open:!host.hidden,time:returnTime,pocketReturns:returns?.diagnostics()??[]}),update:loop,camera:()=>camera,isOpen:()=>!host.hidden,dispose(){close();disposed=true;button.remove();host.remove();window.removeEventListener('resize',resize);for(const name of events)window.removeEventListener(name,block,true);}};
}
