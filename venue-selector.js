(() => {
  const api=window.StandaloneVenues;if(!api)return;
  let dialog;
  api.open=()=>{
    if(!dialog){
      dialog=document.createElement('dialog');dialog.className='standalone-venue-dialog product-settings';
      dialog.innerHTML='<form method="dialog"><header><h2>选择场馆</h2><button class="venue-close" aria-label="关闭">×</button></header><p>换个环境，继续这一盘。</p><div class="venue-options"></div><p class="venue-status" role="status" aria-live="polite"></p></form>';
      const options=dialog.querySelector('.venue-options');
      for(const venue of api.venues){const b=document.createElement('button');b.type='button';b.dataset.venue=venue.id;b.textContent=venue.name;b.onclick=async()=>{const status=dialog.querySelector('.venue-status');options.querySelectorAll('button').forEach(x=>x.disabled=true);status.textContent='正在布置场馆…';try{await api.set(venue.id);dialog.close();}catch(error){status.textContent=error.message;}finally{options.querySelectorAll('button').forEach(x=>x.disabled=false);}};options.append(b);}
      document.body.append(dialog);
      const style=document.createElement('style');style.textContent='.standalone-venue-dialog{width:min(440px,calc(100vw - 32px));max-height:calc(100dvh - 48px);padding:24px;border:1px solid #8d7951;border-radius:16px;background:#13261d;color:#f3e7c2;box-shadow:0 20px 80px #0008;font:16px/1.6 system-ui,-apple-system,"PingFang SC",sans-serif}.standalone-venue-dialog::backdrop{background:#0008}.standalone-venue-dialog form{margin:0}.standalone-venue-dialog header{display:flex;align-items:center;justify-content:space-between}.standalone-venue-dialog h2{font-size:22px;margin:0}.standalone-venue-dialog p{margin:12px 0;color:#c4c7b8}.standalone-venue-dialog button{font:inherit;color:inherit;cursor:pointer;touch-action:manipulation}.standalone-venue-dialog .venue-close{border:0;background:none;font-size:28px;width:44px;height:44px}.venue-options{display:grid;gap:12px;margin:20px 0}.venue-options button{padding:16px;text-align:left;border:1px solid #586252;border-radius:10px;background:#1d3025;min-height:56px}.venue-options button[aria-pressed=true]{border-color:#dfc077;background:#3a3522}.venue-options button:disabled{opacity:.6}.venue-options button:focus-visible,.venue-close:focus-visible{outline:2px solid #e2c37c;outline-offset:3px}.standalone-venue-dialog .venue-status:empty{display:none}';document.head.append(style);
    }
    dialog.querySelector('.venue-status').textContent='';dialog.querySelectorAll('[data-venue]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.venue===api.get())));dialog.showModal();
  };
  const observed=new WeakSet();
  const scan=root=>{
    if(!observed.has(root)){observed.add(root);new MutationObserver(records=>{if(records.some(r=>[...r.addedNodes].some(n=>n.nodeType===1)))scan(root);}).observe(root,{childList:true,subtree:true});}
    root.querySelectorAll('.game-menu-items').forEach(menu=>{if(menu.querySelector('[data-standalone-venue]'))return;const b=document.createElement('button');b.type='button';b.dataset.standaloneVenue='';b.textContent='场馆选择';b.onclick=()=>{const details=menu.closest('details');if(details)details.open=false;api.open();};const settings=[...menu.children].find(n=>n.textContent==='游戏设置');settings?settings.after(b):menu.append(b);});
    root.querySelectorAll('*').forEach(node=>{if(node.shadowRoot)scan(node.shadowRoot);});
    root.querySelectorAll('select[name=venue]').forEach(select=>{if(select.dataset.boundVenue)return;select.dataset.boundVenue='';select.value=api.get();select.addEventListener('change',()=>void api.set(select.value));});
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>scan(document),{once:true});else scan(document);
})();
