// Venue is presentation only. Every mode keeps the same released v2 table.
(() => {
  const key='shishi-snooker.venue.v1';
  const venues=Object.freeze([{id:'crucible-2026',name:'2026 克鲁斯堡'},{id:'crucible',name:'经典场馆'}]);
  const valid=id=>venues.some(v=>v.id===id);
  let saved;try{saved=localStorage.getItem(key);}catch{}
  const query=new URL(location.href).searchParams.get('venue');
  const initial=valid(query)?query:valid(saved)?saved:'crucible-2026';
  const resolve=(value={})=>({table:'v2',venue:valid(value.venue)?value.venue:initial,lighting:'r135',effectiveLighting:'r135',carpet:'world-final-2025'});
  const save=value=>{const id=typeof value==='string'?value:value.venue;if(!valid(id))throw Error('请选择已有场馆');try{localStorage.setItem(key,id);}catch{}window.dispatchEvent(new CustomEvent('standalone-venue-change',{detail:{id}}));};
  window.SnookerLocalLiteConfig={prefix:'/engine/local-lite/',preview:'/engine/product-preview.bundle.js',core:'/engine/game-core.bundle.js',selection:resolve({venue:initial}),presentation:{assets:'/engine/local-lite/presentation/',lighting:{mainAmount:1,roofHeight:3.5,whiteReflection:1.2,observationJoystickPitchRange:'-45,30',observationJoystickYawLimit:45,observationDesktopZoom:1,observationMobileZoom:1.5,observationZoomRange:'1,3'}},boundary:'local-table-892b5cb90e552ac1a09f-pockets-v2',legacyBoundary:'local-table-892b5cb90e552ac1a09f'};
  const config=window.SnookerLocalLiteConfig;
  window.SnookerProductLite={selection:{...config.selection},presentation:config.presentation,boundary:config.boundary,v2Assets:config.prefix+'table/',venueAssets:config.prefix+'venue/',workerUrl:name=>config.prefix+'runtime/'+name,resolve,save};
  let switching=false;
  window.StandaloneVenues={venues,get:()=>window.SnookerProductLite.selection.venue,name:id=>venues.find(v=>v.id===id)?.name||'2026 克鲁斯堡',
    async set(id){
      if(!valid(id))throw Error('请选择已有场馆');
      if(switching)throw Error('场馆正在切换，请稍候');
      const model=window.SnookerProductLite,game=window.threeGame?.core;
      if(game?.isBusy())throw Error('请等这一杆结束后切换场馆');
      if(model.selection.venue===id){save(id);return;}
      switching=true;
      try{if(model.switch)await model.switch({venue:id});else if(game)throw Error('场馆正在载入，请稍候再切换');else{Object.assign(model.selection,resolve({venue:id}));save(id);}}
      finally{switching=false;}
    }
  };
})();
