// Production-only, independent of both the test-field configuration and 2D client.
(() => {
  if (!/^\/(snookermaster3d|snookermaster\/3D)\//.test(location.pathname)) return;
  const endpoint = '/snookermaster/api/analytics/event';
  const key = 'snooker.three-practice.visitor';
  const uuid = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  let visitorId = uuid();
  try { visitorId = localStorage.getItem(key) || visitorId; localStorage.setItem(key, visitorId); } catch (_) {}
  const source = (new URL(location.href).searchParams.get('source') || 'direct').replace(/[^a-zA-Z0-9_.:-]/g, '').slice(0,60) || 'direct';
  const pageId = uuid();
  const send = (event, extra = {}) => {
    const body = JSON.stringify({ product:'3d-practice', visitorId, source, durationVersion:2, trackingVersion:3, pageId, event, ...extra });
    return fetch(endpoint, {method:'POST',headers:{'Content-Type':'application/json'},body,keepalive:true}).catch(() => null);
  };
  // Order page registration ahead of play and duration events so sessions retain IP metadata.
  const registered = send('page_view', {eventKey:pageId});
  window.SnookerPracticeAnalytics={track(event,extra={}){
    if(!['challenge_started','replay_view_clicked','replay_share_clicked'].includes(event))return;
    registered.then(()=>send(event,{...extra,eventKey:uuid()}));
  }};
  let activeSince = document.visibilityState === 'visible' ? performance.now() : null;
  const flush = (final = false) => {
    if (activeSince === null) return;
    const activeMs = Math.max(0,Math.round(performance.now()-activeSince));
    activeSince = document.visibilityState === 'visible' && !final ? performance.now() : null;
    if(activeMs) registered.then(()=>send('heartbeat',{activeMs,final}));
  };
  const timer = setInterval(()=>flush(),30000);
  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='hidden') flush(true);
    else if(activeSince===null) activeSince=performance.now();
  });
  window.addEventListener('pagehide',()=>flush(true));
  window.addEventListener('pageshow',()=>{if(document.visibilityState==='visible'&&activeSince===null)activeSince=performance.now();});
  const readyTimer=setInterval(()=>{
    if(!window.threeGame || document.querySelector('#viewer')?.classList.contains('is-loading') || document.documentElement.dataset.practiceReplay==='true')return;
    clearInterval(readyTimer);
    registered.then(()=>send('game_started',{mode:'practice',eventKey:pageId}));
    window.SnookerPracticeAnalytics.track('challenge_started',{shapeId:window.threeGame.core?.getPracticeShape?.()||'unknown'});
  },500);
})();
