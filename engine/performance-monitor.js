// Bounded, opt-in CPU/frame telemetry. Render submission is not GPU completion.
export function summarize(values) {
  if (!values.length) return { count: 0, mean: 0, p95: 0, max: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  return { count: values.length, mean: values.reduce((a, b) => a + b, 0) / values.length,
    p95: sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * .95))], max: sorted.at(-1) };
}

export function createPerformanceMonitor({ renderer, scene }) {
  const capacity = 1800;
  let enabled = false, previous = null, pendingInput = null, lastResourceAt = -Infinity;
  let samples = new Map(), counters = {}, resources = [], frameCount = 0, slowFrames = 0;
  let observer = null;
  const panel = document.createElement('pre');
  panel.id = 'three-performance-panel'; panel.hidden = true;
  panel.style.cssText = 'position:fixed;top:100px;left:8px;z-index:100;max-width:calc(100vw - 32px);max-height:65vh;overflow:auto;background:#07100eed;color:#c8ffd8;padding:12px;font:11px/1.5 monospace;pointer-events:none';
  document.body.append(panel);
  const button = document.createElement('button');
  button.type = 'button'; button.textContent = '性能'; button.setAttribute('aria-controls', panel.id);
  document.querySelector('.toolbar').append(button);
  function record(name, value) {
    if (!enabled || !Number.isFinite(value)) return;
    let ring = samples.get(name);
    if (!ring) { ring = { values: [], index: 0 }; samples.set(name, ring); }
    if (ring.values.length < capacity) ring.values.push(value);
    else { ring.values[ring.index] = value; ring.index = (ring.index + 1) % capacity; }
  }
  function count(name, amount = 1) { if (enabled) counters[name] = (counters[name] || 0) + amount; }
  function reset() { samples = new Map(); counters = {}; resources = []; frameCount = slowFrames = 0;
    previous = pendingInput = null; lastResourceAt = -Infinity; observer?.takeRecords(); }
  function setEnabled(value) {
    enabled = Boolean(value); previous = pendingInput = null; panel.hidden = !enabled;
    button.setAttribute('aria-pressed', String(enabled));
    observer?.disconnect(); observer = null;
    if (enabled && globalThis.PerformanceObserver?.supportedEntryTypes?.includes('longtask')) {
      observer = new PerformanceObserver(list => { for (const entry of list.getEntries()) {
        if (!document.hidden) { record('longTaskMs', entry.duration); count('longTasks'); }
      } });
      observer.observe({ type: 'longtask' });
    }
  }
  function snapshot() {
    return { enabled, sampleCapacity: capacity, frameCount, slowFrames33ms: slowFrames,
      metrics: Object.fromEntries([...samples].map(([name, ring]) => [name, summarize(ring.values)])),
      counters: { ...counters }, resources: [...resources],
      note: 'CPU timings; input latency ends at render submission, not physical display. Heap is browser-dependent. Samples bounded; counters cumulative since reset.' };
  }
  function beginFrame(now) {
    if (!enabled) return;
    if (document.hidden) { previous = pendingInput = null; return; }
    if (previous !== null) { const dt = now - previous; record('frameMs', dt); if (dt > 33.34) slowFrames++; }
    previous = now; frameCount++;
  }
  function endFrame(now) {
    if (!enabled || document.hidden) return;
    if (pendingInput !== null) { record('inputToRenderSubmitMs', performance.now() - pendingInput); pendingInput = null; }
    if (now - lastResourceAt < 1000) return;
    lastResourceAt = now;
    let objects = 0; scene.traverse(() => objects++);
    resources.push({ at: now, calls: renderer.info.render.calls, triangles: renderer.info.render.triangles,
      geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures, objects,
      heapBytes: performance.memory?.usedJSHeapSize ?? null });
    if (resources.length > 120) resources.shift();
    const s = snapshot(), m = s.metrics, r = resources.at(-1);
    const line = (label, key) => `${label}: ${(m[key]?.mean || 0).toFixed(2)} / ${(m[key]?.p95 || 0).toFixed(2)} ms`;
    panel.textContent = [
      `FPS ${(1000 / (m.frameMs?.mean || Infinity)).toFixed(0)} | 慢帧 >33ms ${slowFrames}/${frameCount}`,
      '阶段平均 / P95（CPU）', line('帧间隔', 'frameMs'), line('物理', 'physicsMs'),
      line('球杆避障', 'cueSolveMs'), line('场景更新', 'sceneMs'), line('瞄准更新', 'aimMs'), line('预测输入', 'predictionInputMs'),
      line('Worker 计算', 'workerComputeMs'), line('辅助层绘制', 'aimDrawMs'),
      line('UI', 'uiMs'), line('渲染提交', 'renderSubmitMs'), line('输入→提交', 'inputToRenderSubmitMs'),
      `Draw ${r.calls} | 三角形 ${r.triangles}`, `几何 ${r.geometries} | 纹理 ${r.textures} | 对象 ${r.objects}`,
      `JS 堆 ${r.heapBytes === null ? '不可用' : (r.heapBytes / 1048576).toFixed(1) + ' MiB'}`,
      `辅助层：几何 ${((m.aimGeometryBytes?.mean || 0) / 1024).toFixed(1)} KiB/次 | 纹理上传 ${counters.aimTextureUploads || 0} 次`,
      `预测发送 ${counters.predictionSent || 0} / 过期 ${counters.predictionStale || 0}`,
      '渲染耗时不包含 GPU 完成时间',
    ].join('\n');
  }
  const toggle = () => setEnabled(!enabled);
  const visibility = () => { previous = pendingInput = null; };
  button.addEventListener('click', toggle);
  document.addEventListener('visibilitychange', visibility);
  const api = { record, count, snapshot, reset, setEnabled, beginFrame, endFrame,
    measure(name, fn) { if (!enabled || document.hidden) return fn();
      const start = performance.now(); try { return fn(); } finally { record(name, performance.now() - start); } },
    input() { if (enabled && !document.hidden && pendingInput === null) pendingInput = performance.now(); },
    destroy() { setEnabled(false); button.removeEventListener('click', toggle);
      document.removeEventListener('visibilitychange', visibility); button.remove(); panel.remove(); },
  };
  setEnabled(new URLSearchParams(location.search).has('perf'));
  return api;
}
