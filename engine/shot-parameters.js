import {cloneGameData} from './clone-game-data.js';
import {createToleranceClient} from './tolerance-client.js';
export function shotParameters(...args) { return window.SnookerThreeCore.shotParameters(...args); }
export function createShotParametersHUD(getGame){
 const anchor=document.querySelector('#toggle-calibration');if(!anchor)return null;
 const button=document.createElement('button');button.type='button';button.textContent='击球参数';button.id='toggle-shot-parameters';button.setAttribute('aria-pressed','false');anchor.after(button);
 const panel=document.createElement('aside');panel.id='shot-parameters-hud';panel.hidden=true;
 panel.style.cssText='position:fixed;left:12px;top:12px;z-index:80;width:min(420px,calc(100vw - 24px));box-sizing:border-box;padding:10px 12px;background:rgba(12,20,25,.88);color:#fff;border:1px solid #ffffff30;border-radius:10px;font:24px/1.6 system-ui;pointer-events:none;white-space:pre-line';
 document.body.append(panel);let frozen=null,last=0,timer=null,key=null,result=null;
 const client=createToleranceClient();
 function stop(){clearTimeout(timer);timer=null;client.cancel();}
 function request(p,game){
  if(!p.targetId||!Number.isFinite(p.idealAngle)||!(p.power>0)){stop();key=null;result=null;return;}
  const state=game.getState(),tip=p.tip,physics=game.getPhysicsParams(),verticalAngle=game.getCuePose()?.elevation||0;
  const next=JSON.stringify([p.power,p.heading,physics,p.targetId,p.pocket,state.balls.map(b=>[b.id,b.pos,b.potted]),tip,verticalAngle,game.getRevision()]);
  if(next===key)return;
  stop();key=next;result={status:'pending'};
  const {tableColliderSet,...dynamicState}=state;
  const input={state:{...cloneGameData(dynamicState),tableColliderSet},targetId:p.targetId,pocketId:p.pocket,idealAngle:p.idealAngle,aimAngle:p.heading,power:p.power,tip:{...tip},verticalAngle,physics};
  timer=setTimeout(()=>{timer=null;try{
   const requestedKey=next;
   client.request(input,value=>{if(requestedKey!==key)return;result=value;if(frozen?.searchKey===key)frozen.calculation=result;last=-Infinity;update();});
  }catch(e){result={status:'error'};}},200);
 }
 function parameters(game,power=game.getPower(),tip=game.getTip()){
  return shotParameters(game.getState(),power,tip,{physics:game.getPhysicsParams(),verticalAngle:game.getCuePose()?.elevation});
 }
 function applyResult(p,r){if(r?.status==='ok'){p.tolerance=r.tolerance;p.toleranceLowerBound=Boolean(r.lowerBound);if(!r.lowerBound&&Number.isFinite(r.center))p.aimError=((p.heading-r.idealAngle-r.center+540)%360)-180;}}


 const fmt=(v,suffix,digits=2)=>Number.isFinite(v)?v.toFixed(digits)+suffix:'—';
 function update(now=0){if(panel.hidden||now-last<100)return;last=now;const game=getGame();if(!game)return;
 const showingShot=Boolean(frozen && game.isBusy());
 const p=showingShot?frozen:parameters(game);
 if(!showingShot)request(p,game);
 const calculation=showingShot?frozen.calculation:result;applyResult(p,calculation);
 const status=!(p.power>0)?'请先拉杆':{pending:'计算中…',budget:'搜索超时',error:'计算失败','not-found':'未找到',unbounded:'未锁定边界',discontinuous:'区间不连续'}[calculation?.status]||'—';
 panel.textContent=['击球参数',
 `偏差　${fmt(p.aimError,'°',4)}`,
 `仿真容错　${Number.isFinite(p.tolerance)?(p.toleranceLowerBound?'≥ ':'')+fmt(p.tolerance,'°',4):status}`,
 `模型容错　${Number.isFinite(p.modelTolerance)?fmt(p.modelTolerance,'°',4)+(p.modelExtrapolated?'（外推）':p.modelInterpolated?'（插值）':''):({'no-power':'请先拉杆','unsupported-power':'未覆盖此力度','unsupported-pose':'未覆盖此杆法','configuration-mismatch':'配置未标定'}[p.modelStatus]||'—')}`].join('\n');}
 button.addEventListener('click',()=>{panel.hidden=!panel.hidden;if(panel.hidden){stop();key=null;result=null;}button.classList.toggle('is-active',!panel.hidden);button.setAttribute('aria-pressed',String(!panel.hidden));last=-Infinity;update();});
 return {update,capture(shot){const game=getGame();frozen=parameters(game,shot?.power??game.getPower(),shot?.tipOffset??game.getTip());request(frozen,game);frozen.calculation=result;frozen.searchKey=key;last=-Infinity;update();},reset(){stop();key=null;result=null;frozen=null;last=-Infinity;},dispose(){stop();client.dispose();button.remove();panel.remove();}};
}
