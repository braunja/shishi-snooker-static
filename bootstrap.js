// This entry loads only local preserved files. Official authentication, social,
// telemetry and equipment loaders are deliberately not part of this application.
window.reportThreeLoadingError = error => {
  const host = document.getElementById('loading');
  if (!host) return;
  let message = document.getElementById('loading-error');
  if (!message) {
    message = document.createElement('p');
    message.id = 'loading-error';
    message.setAttribute('role', 'alert');
    host.append(message);
  }
  message.textContent = `加载失败：${error?.message || String(error)}`;
};
window.addEventListener('error', event => { if (event.message) window.reportThreeLoadingError(event); });
window.addEventListener('unhandledrejection', event => window.reportThreeLoadingError(event.reason));

function staticURL(src) {
  return window.SnookerAssetCDN?.enabled ? window.SnookerAssetCDN.root + src.replace(/^\//,'') : src;
}
async function chooseCDN() {
  try {
    const {root} = await fetch('/asset-cdn-runtime.json',{cache:'no-store',signal:AbortSignal.timeout(3500)}).then(r=>r.json());
    const trusted = /^https:\/\/(?:cdn|fastly)\.jsdelivr\.net\/gh\/braunja\/shishi-snooker-static@[a-f0-9]{40}\/$/.test(root) ||
      location.hostname === '127.0.0.1' && root === location.origin + '/__cdn/';
    if(!trusted)return;
    const response=await fetch(root+'ready.json',{credentials:'omit',mode:'cors',signal:AbortSignal.timeout(3500)});
    if(response.ok)window.SnookerAssetCDN={root,enabled:true};
  } catch {}
}
async function loadScript(src, fallback=false) {
  try { await new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = fallback ? src : staticURL(src);
    if(script.src.startsWith('https://cdn.jsdelivr.net/')||script.src.startsWith('https://fastly.jsdelivr.net/'))script.crossOrigin='anonymous';
    script.onload = resolve;
    script.onerror = () => reject(new Error(`无法加载 ${src}`));
    document.body.append(script);
  }); } catch(error) {
    if(!fallback && window.SnookerAssetCDN?.enabled){await loadScript(src,true);return;}
    throw error;
  }
}

try {
  await chooseCDN();
  let resourceModule;
  try { resourceModule = await import(staticURL('/engine/resource-fetch.mjs')); }
  catch(error) {
    if(!window.SnookerAssetCDN?.enabled)throw error;
    window.SnookerAssetCDN.enabled=false;
    resourceModule=await import('./engine/resource-fetch.mjs');
  }
  resourceModule.installResourceFetch();
  for (const src of ['/loading-ui.bundle.js','/engine/game-config.js','/engine/game-core.bundle.js','/product-trial-ui.bundle.js','/battle-config.js']) {
    const link=document.createElement('link');link.rel='preload';link.as='script';link.href=staticURL(src);link.crossOrigin='anonymous';document.head.append(link);
  }
  const previewPreload=document.createElement('link');previewPreload.rel='modulepreload';previewPreload.href=staticURL('/engine/product-preview.bundle.js');document.head.append(previewPreload);
  // A previous hosted release could have registered this resource-only worker.
  // Retire only that worker before loading the new engine; keep user records.
  if ('serviceWorker' in navigator) {
    const legacy = new URL('/resource-cache-sw.js', location.origin).href;
    const registrations = await navigator.serviceWorker.getRegistrations().catch(() => []);
    const stale = registrations.filter(item => (item.active || item.waiting || item.installing)?.scriptURL === legacy);
    if (stale.length) {
      await Promise.all(stale.map(item => item.unregister()));
      if (navigator.serviceWorker.controller?.scriptURL === legacy) {
        location.reload();
        await new Promise(() => {});
      }
    }
  }
  // A bookmark can enter practice directly, without first opening the lobby.
  // Establish only this server's local identity so its replay API works too.
  const identity = await fetch('/api/session', {cache:'no-store'}).then(response => response.json());
  window.SnookerProduct = {autoStart:true, user:{id:identity.id, nickname:identity.name}, cueAppearance:'black-through', ferruleEquipmentId:'4-basic'};
  await loadScript('/loading-ui.bundle.js');
  for (const src of ['/engine/game-config.js', '/engine/game-core.bundle.js', '/product-trial-ui.bundle.js', '/battle-config.js']) await loadScript(src);
  const response = await fetch('/tuning-snapshot.json');
  if (!response.ok) throw new Error('缺少本机规则参数');
  const tuning = await response.json();
  Object.assign(window.SnookerTrialTuning.snapshot, tuning);
  window.SnookerProduct.releasedTuningSnapshot = tuning;
  const syncPreferences = () => {
    window.SnookerProduct.preferences = window.SnookerPracticeSettings.read();
    window.dispatchEvent(new Event('product-quality-change'));
    window.dispatchEvent(new CustomEvent('product-audio-preference', {detail:window.SnookerProduct.preferences}));
  };
  syncPreferences();
  window.addEventListener('practice-settings-change', syncPreferences);
  await loadScript('/native-replay-icons.js');
  await loadScript('/practice-menu.js');
  await import('./venue-branding.js');
  try { await import(staticURL('/engine/product-preview.bundle.js')); }
  catch(error) {
    if(!window.SnookerAssetCDN?.enabled)throw error;
    window.SnookerAssetCDN.enabled=false;
    await import('./engine/product-preview.bundle.js');
  }
} catch (error) {
  window.reportThreeLoadingError(error);
  // A dropped native module must not leave an empty zero-percent screen.
  const host=document.getElementById('loading');
  if(host&&!host.querySelector('[data-bootstrap-retry]')){
    const retry=document.createElement('button');retry.dataset.bootstrapRetry='true';retry.textContent='重新加载';retry.onclick=()=>location.reload();host.append(retry);
  }
}

const button = document.getElementById('save-replay');
if (location.pathname.includes('/battle/') || window.SnookerOnline?.isComputerMatch) button.hidden = true;
button.addEventListener('click', async () => {
  const status = document.getElementById('local-save-status');
  button.disabled = true;
  try {
    const core = window.threeGame?.core;
    if (core?.isBusy()) throw new Error('请等这一杆结束后再保存');
    const record = core?.exportPracticeReplay() || core?.exportPracticeProgress();
    if (!record?.shots?.length) throw new Error('完成一杆后即可保存回放');
    if (!record.completed) record.localClip = true;
    const response = await fetch('/api/practice-replays', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(record) });
    if (!response.ok) throw new Error('回放保存失败');
    const { id } = await response.json();
    const link = document.createElement('a');
    link.href = `/practice?replay=${id}`;
    link.textContent = '已保存 · 查看回放';
    status.replaceChildren(link);
    window.dispatchEvent(new CustomEvent('standalone-replay-saved', {detail:link.href}));
  } catch (error) {
    status.textContent = error.message;
  } finally {
    button.disabled = false;
  }
});
