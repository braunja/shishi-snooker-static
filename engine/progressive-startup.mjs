// Optional visual detail is independent of the authoritative match state.
export function createProgressiveStartup({ closed, idle, changed, concurrency = 2 }) {
  const jobs = [];
  const status = { started: false, complete: false, failed: 0, finished: 0, total: 0 };
  let running;
  const waitIdle = async () => {
    while (!closed() && !idle()) await new Promise(resolve => setTimeout(resolve, 150));
    return !closed();
  };
  return {
    status,
    add(work, priority = 10) { if (status.started) throw Error("startup_already_started"); jobs.push({work, priority}); },
    whenIdle: waitIdle,
    start() {
      if (running) return running;
      status.started = true;
      status.total = jobs.length;
      jobs.sort((a,b) => a.priority - b.priority);
      let cursor = 0;
      running = Promise.all(Array.from({ length: Math.min(concurrency, jobs.length) }, async () => {
        while (await waitIdle()) {
          const job = jobs[cursor++];
          if (!job) break;
          try { await job.work(); } catch (error) {
            status.failed++;
            console.warn("画面细节暂未就绪，可继续对战。", error?.message || error);
          }
          status.finished++;
          if (!closed()) changed();
        }
      })).then(() => { status.complete = !closed(); });
      return running;
    },
  };
}

function replaceImage(original, image, target) {
  original.image = image;
  original.needsUpdate = true;
  target?.traverse(node => {
    for (const material of [node.material].flat().filter(Boolean)) {
      const mark = texture => {
        if (texture?.isTexture && texture.source === original.source) texture.needsUpdate = true;
      };
      Object.values(material).forEach(mark);
      Object.values(material.uniforms || {}).forEach(uniform => mark(uniform.value));
    }
  });
}

export function installProgressiveTextures(TextureLoader, startup, fetchResource, target) {
  const original = TextureLoader.prototype.load;
  TextureLoader.prototype.load = function (url, onLoad, onProgress, onError) {
    const source = new URL((this.path || "") + url, document.baseURI).href;
    const preview = fetchResource.hasPreview(source);
    return original.call(this, url, texture => {
      if (preview && !startup.status.started) startup.add(async () => {
        const full = await new TextureLoader().loadAsync(source);
        try { if (await startup.whenIdle()) replaceImage(texture, full.image, target()); }
        finally { full.dispose(); }
      }, 20);
      onLoad?.(texture);
    }, onProgress, onError);
  };
}

export function deferTableTextures(startup, loaded, manifest, TextureLoader, target) {
  for (const [index, record] of Object.entries(loaded.parser.json.textures || [])) {
    const imageIndex = record.source ?? record.extensions?.EXT_texture_webp?.source;
    const upgrade = manifest.upgrades[String(imageIndex)];
    if (!upgrade) continue;
    startup.add(async () => {
      const original = await loaded.parser.getDependency("texture", Number(index));
      const full = await new TextureLoader().loadAsync(upgrade.url);
      try {
        if (await startup.whenIdle()) {
          replaceImage(original, full.image, target);
        }
      } finally { full.dispose(); }
    }, 20);
  }
}
