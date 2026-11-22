'use strict';
window.ProductViews=(()=>{
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const iconPlaceholder="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32'/%3E";
 const coins=n=>'<span class="coin-amount"><img class="coin-icon" src="'+iconPlaceholder+'" alt="金币"><span>'+Number(n).toLocaleString()+'</span></span>';
 const icon=(name,color)=>['briefcase','trophy','clipboard-text','envelope-simple'].includes(name)?'<img class="game-illustration-icon" data-icon="'+name+'" src="'+(name==='trophy'?iconPlaceholder:'/assets/icons/game-'+name+'.svg')+'" alt="">':'<i class="ui-icon" style="--icon:url(/assets/icons/'+name+'.svg);color:'+color+'" aria-hidden="true"></i>';
 const names=['球杆','杆盒','皮头','巧粉','先角','加长把','擦杆布','杆油'],art=['cue','cue-case','cue-tip','chalk','ferrule','extension','cloth','cue-oil'];
 const upgradeLabel=()=> '升级';
 const variant={'0-upgrade':'cue-splice','0-2':'cue-splice','0-3':'cue-four','0-4':'cue-four','0-5':'cue-eight','1-upgrade':'cue-case-aluminum','1-3':'cue-case-tan','1-4':'cue-case-tan','4-upgrade':'ferrule-silver','4-2':'ferrule-titanium','4-3':'ferrule-carbon','5-upgrade':'extension-olive','5-2':'extension-ebony'};
 function image(x,overview=false){return '<img '+(x.category===0?'src="/assets/'+(overview?'cue-overview-detail':'cue-cards')+'/'+esc(x.appearance||'default')+'.webp'+'" loading="lazy" decoding="async" ':'src="/assets/equipment-real/'+esc(x.id)+'.webp" ')+'class="gear-art" data-equipment-category="'+x.category+'" alt="'+esc(x.name)+'">';}
 function render(data,view,category){const e=data.economy.equipped[4]==='4-3'?{...data.economy,equipped:{...data.economy.equipped,4:'4-basic'}}:data.economy;
  if(view==='home')return '<div class="topbar">'+(data.user.registered?'<button class="identity" data-profile><span class="avatar"><img src="'+esc(data.user.avatarSrc||'/assets/avatar-default.svg')+'" alt="头像"></span><span class="identity-name">'+esc(data.user.nickname)+'</span><span class="level-badge">Lv.'+(data.user.level||1)+'</span></button><button class="wallet-display" data-page="wallet" data-value="wallet">'+coins(e.available)+'</button>':'<button class="identity" data-login>登录</button>')+'<button data-page="equipment" data-value="equipment">'+icon('briefcase','#55bbec')+'我的装备</button><button data-page="leaderboard" data-value="leaderboard">'+icon('trophy','#ebbf58')+'排行榜</button><button data-page="records" data-value="records">'+icon('clipboard-text','#68c7c0')+'比赛记录</button><button data-page="messages" class="message-entry" aria-label="消息">'+icon('envelope-simple','#4C9EFF')+'</button><span class="network-control"><button data-network class="network" aria-label="查看网络状态" aria-expanded="false"><span class="signal-bars" aria-hidden="true"><i></i><i></i><i></i><i></i></span></button><span class="network-popover" role="status" hidden><strong>连接已断开</strong><span>延时 —</span></span></span><button data-fullscreen class="fullscreen-button" aria-label="全屏"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 3H3v6m12-6h6v6M3 15v6h6m6 0h6v-6"/></svg></button></div><section id="product-lobby-home" class="home"><button class="roster" data-roster aria-label="在线玩家，展开列表"><span class="roster-title">在线 0</span></button><div class="mode-nav"><button data-game="0">练球房</button><button data-game="1">好友对战</button><button data-game="2">排名赛</button></div><div class="home-activities">'+ProductActivities.home(data)+'</div><footer class="site-filings" aria-label="网站备案信息"><span>陕ICP备2026011004号-2</span><span>陕公网安备61011102000817号</span></footer></section>';
  const overview=()=>'<div class="gear-overview-grid">'+names.map((n,i)=>{const x=e.catalog.find(x=>x.id===e.equipped[i]);return '<button class="gear-overview-item'+(i<2?' gear-overview-long':'')+'" data-detail="'+x.id+'"><span class="gear-name-line"><strong>'+esc(x.name)+'</strong>'+([0,4,5].includes(i)?'<small class="gear-tier-tag">'+x.tier+'</small>':'')+'</span>'+(i===0?'<span class="overview-cue-art">'+image(x,true)+'</span>':image(x,true))+'</button>';}).join('')+'</div>';
  const cards=()=>'<div class="gear-grid '+(category===0?'gear-cue-grid':category===1?'gear-case-grid':'')+'">'+e.catalog.filter(x=>x.category===category&&x.id!=='4-3').sort((a,b)=>category===0?a.price-b.price:a.level-b.level).map(x=>{const heading='<span class="gear-name-line"><strong>'+esc(x.name)+'</strong>'+([0,4,5].includes(x.category)?'<small class="gear-tier-tag">'+x.tier+'</small>':'')+'</span>';const actions='<div class="gear-card-actions">'+(!x.owned?'<button data-purchase="'+x.id+'">购买</button>':'<button data-equip="'+x.id+'" '+(e.equipped[x.category]===x.id?'disabled':'')+'>'+(e.equipped[x.category]===x.id?'使用中':'使用')+'</button>'+([0,4,5].includes(x.category)?'<button class="primary" data-upgrade="'+x.id+'" data-level="'+x.level+'" '+(x.level===3?'disabled':'')+'>'+(x.level===3?'已满级':upgradeLabel(x.upgrade.cost))+'</button>':''))+'</div>';return '<article data-gear-id="'+x.id+'" class="gear-card '+(e.equipped[x.category]===x.id?'gear-equipped':'')+' '+(!x.owned?'gear-unowned':'')+'">'+(category===1?'<div class="gear-long-heading"><button class="gear-name-button" data-detail="'+x.id+'">'+heading+'</button><div class="gear-card-state">'+coins(x.price)+'</div>'+actions+'</div><button class="gear-preview" data-detail="'+x.id+'">'+image(x)+'</button>':'<button class="gear-preview" data-detail="'+x.id+'">'+image(x)+heading+'</button><div class="gear-card-state">'+coins(x.price)+'</div>'+actions)+'</article>';}).join('')+'</div>';
  return '<section class="page equipment-page '+(category==='overview'?'equipment-overview-page':'')+'"><header class="page-header">'+backButton()+'<h1>我的装备</h1><span class="equipment-header-power" title="球杆 '+e.power.base+' ＋ 配件 '+e.power.bonus+'">最大力度 <b>'+e.power.total+' / 100</b></span>'+coins(e.available)+'</header><div class="page-content"><div class="gear-layout"><nav class="gear-categories" aria-label="装备分类"><button data-category="overview" class="'+(category==='overview'?'active':'')+'">总览</button>'+names.map((n,i)=>'<button data-category="'+i+'" class="'+(category===i?'active':'')+'">'+n+'</button>').join('')+'</nav><section class="gear-content">'+(category==='overview'?overview():cards())+'</section></div></div></section>';
 }
 function backButton(page='home'){return '<button data-page="'+esc(page)+'" class="page-back-icon" aria-label="返回" title="返回"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m14 5-7 7 7 7"/></svg></button>';}
 const closeIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7l10 10M17 7L7 17" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>';
 // All lobby dialogs share canvas coordinates. Never opt an individual dialog
 // back into the browser top layer under the scaled #screen.
 const canvasDialogs=[],inertBefore=new Map();let modalObserver=null;
 function syncCanvasDialogs(){
  for(const d of [...canvasDialogs])if(!d.parentElement?.isConnected)d.close();
  const top=canvasDialogs.at(-1),screen=document.getElementById('screen');
  if(top){for(const el of screen.children){if(!inertBefore.has(el))inertBefore.set(el,el.inert);el.inert=el!==top.parentElement;}}
  else{for(const [el,inert]of inertBefore)el.inert=inert;inertBefore.clear();modalObserver?.disconnect();modalObserver=null;}
 }
 function createDialog(id,{title='',body='',actions='',simple=false,closable=true}={}){
 const wrapper=document.createElement('div');wrapper.id='overlay';wrapper.dataset.drawer=id;
 const d=document.createElement('section');d.className='dialog design-dialog'+(simple?' simple-dialog':'')+(closable?' corner-dismissible':'');
 d.innerHTML='<header class="dialog-head"><h2>'+title+'</h2></header><div class="dialog-body">'+body+'</div>'+(actions?'<footer class="dialog-footer"><div class="actions">'+actions+'</div></footer>':'')+(closable?'<button class="game-dialog-close auth-close" aria-label="关闭">'+closeIcon+'</button>':'');d.setAttribute('aria-label',d.querySelector('h2').textContent);wrapper.append(d);document.getElementById('screen').append(wrapper);d.tabIndex=-1;
 d.dataset.canvasModal='';d.setAttribute('role','dialog');d.setAttribute('aria-modal','true');d.open=true;d.setAttribute('open','');
 Object.assign(d.style,{position:'relative',transform:'none',zoom:'1',maxHeight:'100%'});
 const previous=document.activeElement;
 d.close=()=>{
  if(!d.open)return;d.open=false;d.removeAttribute('open');canvasDialogs.splice(canvasDialogs.indexOf(d),1);wrapper.remove();syncCanvasDialogs();
  const top=canvasDialogs.at(-1);if(top)top.focus({preventScroll:true});else if(previous?.isConnected&&!previous.closest('[inert]'))previous.focus({preventScroll:true});
  d.dispatchEvent(new Event('close'));
 };
 d.addEventListener('keydown',e=>{
  if(canvasDialogs.at(-1)!==d)return;
  if(e.key==='Escape'){
   e.preventDefault();e.stopPropagation();
   // Preserve native dialog cancellation semantics, including oncancel guards
   // while a purchase/upgrade is pending and feedback draft confirmation.
   if(d.dispatchEvent(new Event('cancel',{cancelable:true})))d.close();
  }else if(e.key==='Tab'){
   const items=[...d.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]')].filter(el=>el.getClientRects().length&&!el.closest('[hidden],[inert]'));
   if(!items.length){e.preventDefault();d.focus();return;}const first=items[0],last=items[items.length-1];
   if(e.shiftKey&&(document.activeElement===first||document.activeElement===d)){e.preventDefault();last.focus();}else if(!e.shiftKey&&(document.activeElement===last||document.activeElement===d)){e.preventDefault();first.focus();}
  }
 });
 canvasDialogs.push(d);if(!modalObserver){modalObserver=new MutationObserver(syncCanvasDialogs);modalObserver.observe(wrapper.parentElement,{childList:true});}syncCanvasDialogs();
 d.focus({preventScroll:true});if(closable)d.querySelector('.auth-close').onclick=()=>d.close();return d;
 }
 // Apply the exact component classes used by the approved prototype to dynamic content.
 function decorate(root){
 root.querySelectorAll('.actions button,.notice-actions button,.message-actions button,.challenge-entry button,.challenge-reward-entry button,.gear-card-actions button,.profile-relationship-actions button,.email-code-row button,.challenge-reward>button,.row>button').forEach(b=>{b.classList.add('standard-action');b.classList.toggle('long-action',b.textContent.trim().length>4);});
 root.querySelectorAll('.actions').forEach(group=>{const buttons=group.querySelectorAll('button');if(buttons.length===1&&!buttons[0].classList.contains('danger'))buttons[0].classList.add('primary');});
 root.querySelectorAll('.home-activities .activity').forEach(b=>{if(!b.querySelector('.activity-icon')){const challenge=b.textContent.includes('每日挑战');b.insertAdjacentHTML('afterbegin',icon(challenge?'target':'coins',challenge?'#FF7468':'#FFC34C').replace('ui-icon','ui-icon activity-icon'));}});
 }
 const decorationObserver=new MutationObserver(()=>decorate(document.getElementById('screen')));decorationObserver.observe(document.getElementById('screen'),{childList:true,subtree:true});addEventListener('pagehide',()=>decorationObserver.disconnect(),{once:true});
 // Real Safari 26.2 reports unzoomed client rects after layout zoom settles,
 // even when an immediate post-layout measurement looked correct. Use the
 // existing transform path for WebKit; retain crisp layout zoom in Chromium.
 const webKitLayoutZoom=/AppleWebKit\//.test(navigator.userAgent)&&!/Chrome\/|Chromium\/|Edg\//.test(navigator.userAgent);
 let nativeZoomCompatible=webKitLayoutZoom?false:undefined;
 function resize(){
 const viewport=window.ProductViewport?.measure()||{width:innerWidth,height:innerHeight,safe:{top:0,right:0,bottom:0,left:0}};
 const {safe}=viewport,width=viewport.width,height=viewport.height;
 const portrait=height>width,w=portrait?540:960,h=portrait?960:540,scale=Math.min(width/w,height/h),screen=document.getElementById('screen');
 // Safari's CSS zoom can retain the pre-rotation containing block. A transform
 // uses one coordinate system for layout and hit testing through every rotation.
 const nativeZoom=nativeZoomCompatible!==false&&CSS.supports('zoom','2')&&!matchMedia('(pointer:coarse)').matches;
 const geometry={width:(width/scale)+'px',height:(height/scale)+'px',left:'0px',top:'0px',transform:nativeZoom?'none':'scale('+scale+')',zoom:nativeZoom?String(scale):'1',contain:nativeZoom?'layout':'none'};
 for(const side of ['top','right','bottom','left'])screen.style.setProperty('--ui-safe-'+side,(safe[side]/scale)+'px');
 screen.style.setProperty('--ui-topbar-clearance',((parseFloat(document.documentElement.style.getPropertyValue('--product-iphone-topbar-clearance'))||0)/scale)+'px');
 screen.classList.toggle('portrait',portrait);
 if(window.ProductViewport?.applyLayout)window.ProductViewport.applyLayout(screen,geometry);else Object.assign(screen.style,geometry);
 // Safari 26 can paint layout zoom while reporting unzoomed client rects.
 // Button guards, native input and overlays must all use viewport coordinates.
 // Verify once against the real canvas rather than guessing from the UA.
 if(nativeZoom&&nativeZoomCompatible===undefined&&Math.abs(scale-1)>.001){
  const rect=screen.getBoundingClientRect();
  nativeZoomCompatible=Math.abs(rect.width-width)<1&&Math.abs(rect.height-height)<1;
  if(!nativeZoomCompatible){
   Object.assign(geometry,{transform:'scale('+scale+')',zoom:'1',contain:'none'});
   if(window.ProductViewport?.applyLayout)window.ProductViewport.applyLayout(screen,geometry);else Object.assign(screen.style,geometry);
  }
 }
 dispatchEvent(new Event('product-layout-resize'));
 }
 window.addEventListener('resize',resize);window.addEventListener('product-viewport-resize',resize);resize();
 addEventListener('pagehide',()=>{removeEventListener('resize',resize);removeEventListener('product-viewport-resize',resize);},{once:true});
 return {render,image,coins,upgradeLabel,esc,backButton,createDialog};
})();
