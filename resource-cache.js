(async () => {
  if(window.parent!==window && new URLSearchParams(location.search).get('layoutEditorPreview')==='loading')return;
  const base = new URL('./', document.currentScript.src);
  const status = window.threeResourceCache = { enabled: false, version: null, reason: 'development' };
  const local = ['localhost','127.0.0.1','::1','[::1]'].includes(location.hostname);
  const caption = document.querySelector('.loading__caption');
  try {
    if ((!local || new URL(location.href).searchParams.has('resourceCache')) && isSecureContext && 'serviceWorker' in navigator) {
      if (caption) caption.textContent = '检查更新…';
      const abort = new AbortController();
      const checkTimer = setTimeout(() => abort.abort(), 8000);
      let response;
      try { response = await fetch(new URL('resource-version.json', base), { cache: 'no-store', signal: abort.signal }); }
      finally { clearTimeout(checkTimer); }
      if (!response.ok) throw Error('Version check unavailable');
      const manifest = await response.json();
      const registration = await navigator.serviceWorker.register(new URL('resource-cache-sw.js', base), { scope: base.href, updateViaCache: 'none' });
      // The data manifest carries product versions; the worker itself is generic.
      const controller = await new Promise((resolve, reject) => {
        const done = () => { if (navigator.serviceWorker.controller?.scriptURL === new URL('resource-cache-sw.js', base).href) { cleanup(); resolve(navigator.serviceWorker.controller); } };
        const timer = setTimeout(() => { cleanup(); reject(Error('Cache startup timeout')); }, 8000);
        const cleanup = () => { clearTimeout(timer); navigator.serviceWorker.removeEventListener('controllerchange', done); };
        navigator.serviceWorker.addEventListener('controllerchange', done); done();
      });
      await new Promise((resolve, reject) => {
        const channel = new MessageChannel();
        const timer = setTimeout(() => { channel.port1.close(); reject(Error('Version binding timeout')); }, 8000);
        channel.port1.onmessage = ({ data }) => { clearTimeout(timer); channel.port1.close(); data.ok ? resolve() : reject(Error(data.error)); };
        controller.postMessage({ type: 'BIND_3D_VERSION', manifest }, [channel.port2]);
      });
      status.enabled = true; status.version = manifest.version; status.reason = 'ready';
      void registration;
    }
  } catch (error) { status.reason = error.message; console.warn('3D resource cache unavailable:', error.message); }
  if (caption) caption.textContent = '加载中';
  const load = path => new Promise((resolve, reject) => {
    const script = document.createElement('script'); script.src = new URL(path, base).href;
    script.onload = resolve; script.onerror = () => reject(Error('无法加载游戏文件，请刷新重试。')); document.body.append(script);
  });
  try {
    for (const path of ['engine/game-config.js','engine/game-core.bundle.js','trial-ui.bundle.js']) await load(path);
    await import(new URL('engine/preview-compat.bundle.js', base).href);
  } catch (error) { window.reportThreeLoadingError(error); }
})();
