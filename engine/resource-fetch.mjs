import { resumableResponse } from "./resumable-response.mjs";

// Retry only read-only engine assets. Gameplay writes must never be repeated.
export function createResourceFetch(nativeFetch, baseURI, cacheStorage = globalThis.caches, versions = null, cdn = () => globalThis.SnookerAssetCDN) {
  const assetCache = cacheStorage?.open("snooker-netlify-engine-v1").catch(() => null);
  let priority = "high";
  let previewEnabled = true;
  let versionMap = null;
  const ready = Promise.resolve(versions).then(value => { versionMap = value; }).catch(() => {});
  const versionEntry = pathname => {
    const entry = versionMap?.[pathname];
    return entry && /^[a-f0-9]{64}$/.test(entry.version) &&
      entry.url?.match(/^\/_game-assets\/([a-f0-9]{64})\.[a-z0-9.]+$/)?.[1] === entry.version ? entry : null;
  };
  const localFallbacks = new Set(), alternateImages = new Set();
  const roots = () => {
    const root=cdn()?.root;
    if(!root)return [];
    if(/^https:\/\/(cdn|fastly)\.jsdelivr\.net\/gh\/braunja\/shishi-snooker-static@[a-f0-9]{40}\/$/.test(root))
      return [root,root.replace(/\/\/(cdn|fastly)\./,(_,host)=>'//'+(host==='cdn'?'fastly':'cdn')+'.')];
    const base=new URL(baseURI());
    if(base.hostname==='127.0.0.1' && [base.origin+'/__cdn/',base.origin+'/__cdn-fastly/'].includes(root))
      return [root,base.origin+(root.endsWith('/__cdn/')?'/__cdn-fastly/':'/__cdn/')];
    return [root];
  };
  const canonicalURL = input => {
    const url = new URL(input, baseURI());
    const root = roots().find(root=>url.href.startsWith(root));
    return root && url.href.startsWith(root) ? new URL('/' + url.href.slice(root.length), baseURI()) : url;
  };
  const transportURL = url => cdn()?.enabled && url.origin === new URL(baseURI()).origin && !localFallbacks.has(url.pathname) && (!cdn().files || cdn().files.has(url.pathname.slice(1)))
    ? (alternateImages.has(url.pathname) && roots()[1] || cdn().root) + url.pathname.slice(1) + url.search : url.href;
  const physicalURL = input => {
    const url = canonicalURL(input);
    const entry = url.origin === new URL(baseURI()).origin && versionEntry(url.pathname);
    return entry ? new URL(entry.url, url) : url;
  };
  const resolveURL = input => transportURL(physicalURL(input));
  const requestOptions = (target, options) => {
    if (!roots().some(root=>String(target).startsWith(root))) return {...options, priority};
    const headers = new Headers(options.headers);
    headers.delete('authorization');headers.delete('cookie');
    return {...options, headers, credentials:'omit', mode:'cors', referrerPolicy:'no-referrer', priority};
  };
  const fetchResource = async function fetchResource(input, options = {}) {
    const base = new URL(baseURI());
    const url = canonicalURL(typeof input === "string" || input instanceof URL ? input : input.url);
    const method = options.method || input?.method || "GET";
    const headers = new Headers(options.headers || input?.headers);
    const signal = options.signal || input?.signal;
    const fingerprint = url.pathname.match(/^\/_game-assets\/([a-f0-9]{64})\./)?.[1];
    if (method.toUpperCase() !== "GET" || url.origin !== base.origin || !url.pathname.startsWith("/engine/") && !fingerprint) {
      return nativeFetch(input, options);
    }
    if (headers.has("range")) return nativeFetch(resolveURL(url), requestOptions(resolveURL(url), {...options,headers}));
    await ready;
    const entry = versionEntry(url.pathname);
    const version = entry?.version || fingerprint;
    const cacheKey = physicalURL(url).href;
    const cache = await assetCache;
    const saved = cache && await cache.match(cacheKey).catch(() => null);
    if (version && saved?.headers.get("x-snooker-asset-version") === version) return saved;
    let target = resolveURL(url);
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await nativeFetch(target, requestOptions(target, {...options,headers,signal}));
        if (response.status >= 500 || response.status === 429) {
          await response.body?.cancel();
          throw new Error("资源暂不可用，请重试。");
        }
        if (!response.ok) { await response.body?.cancel();throw new Error('资源暂不可用，请重试。'); }
        const etag = response.headers.get("etag");
        if (!version && saved && saved.headers.get("etag") === etag && etag) {
          await response.body?.cancel().catch(() => {});
          return saved;
        }
        const assembled = await resumableResponse(response);
        const bytes = await assembled.arrayBuffer();
        const resultHeaders = new Headers(response.headers);
        if (version) resultHeaders.set("x-snooker-asset-version", version);
        const result = new Response(bytes, { status: response.status, headers: resultHeaders });
        if ((etag || version) && cache && response.status === 200) {
          await cache.put(cacheKey, result.clone()).catch(() => {});
        }
        return result;
      } catch (error) {
        if (signal?.aborted || attempt === 2) throw error;
        const alternate=cdn()?.enabled && roots()[1] && roots()[1]+new URL(cacheKey).pathname.slice(1)+new URL(cacheKey).search;
        target=alternate && target!==alternate && target!==cacheKey ? alternate : cacheKey;
      }
    }
  };
  fetchResource.ready = ready;
  fetchResource.resolveURL = resolveURL;
  fetchResource.hasPreview = input => {
    const url = canonicalURL(input);
    return previewEnabled && url.origin === new URL(baseURI()).origin && Boolean(versionEntry(url.pathname)?.preview);
  };
  fetchResource.resolveImageURL = input => {
    const url = canonicalURL(input);
    const entry = url.origin === new URL(baseURI()).origin && versionEntry(url.pathname);
    return previewEnabled && /^\/_game-assets\/[a-f0-9]{64}\.[a-z0-9.]+$/.test(entry?.preview || "")
      ? transportURL(new URL(entry.preview, url)) : resolveURL(url);
  };
  fetchResource.isSnookerAssetFetch = true;
  fetchResource.fallbackImage = input => {
    const url=canonicalURL(input);
    const paths=[physicalURL(url).pathname];
    const preview=versionEntry(url.pathname)?.preview;
    if(preview)paths.push(new URL(preview,url).pathname);
    const useLocal=!roots()[1] || paths.some(path=>alternateImages.has(path));
    for(const path of paths)(useLocal?localFallbacks:alternateImages).add(path);
  };
  fetchResource.background = () => { priority = "low"; previewEnabled = false; };
  return fetchResource;
}

let installedFetch;
export function installResourceFetch() {
  if (globalThis.fetch.isSnookerAssetFetch) return globalThis.fetch;
  if (!installedFetch) {
    const nativeFetch = globalThis.fetch.bind(globalThis);
    const loadVersions = async () => {
      const cdn = globalThis.SnookerAssetCDN;
      const local = '/engine/asset-versions.json';
      if(cdn?.enabled) try {
        const response=await nativeFetch(cdn.root+'engine/asset-versions.json',{credentials:'omit',mode:'cors',signal:AbortSignal.timeout(5000)});
        if(response.ok)return await response.json();
      } catch {}
      return nativeFetch(local,{cache:'no-store',signal:AbortSignal.timeout(5000)}).then(r=>r.ok?r.json():null).catch(()=>null);
    };
    const versions=loadVersions();
    installedFetch = createResourceFetch(nativeFetch, () => document.baseURI, globalThis.caches, versions);
    // Three.js FileLoader also fetches EXR probes outside the preview module.
    globalThis.fetch = installedFetch;
  }
  return installedFetch;
}

export function installImageRetries(ImageLoader) {
  const original = ImageLoader.prototype.load;
  ImageLoader.prototype.load = function (url, onLoad, onProgress, onError) {
    let attempts = 0;
    const retry = error => {
      if (++attempts < 3) { globalThis.fetch.fallbackImage?.(url); original.call(this, url, onLoad, onProgress, retry); }
      else onError?.(error);
    };
    return original.call(this, url, onLoad, onProgress, retry);
  };
}

export function resolveStaticModule(input) {
  const local = new URL(input, document.baseURI);
  const cdn = globalThis.SnookerAssetCDN;
  return cdn?.enabled && local.origin === location.origin ? cdn.root + local.pathname.slice(1) : local.href;
}
