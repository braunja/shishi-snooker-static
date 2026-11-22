// Asynchronous WebGL2 timer queries measure GPU work, independent of vsync/CPU.
export function createGpuTiming(gl, { capacity = 60, maxPending = 8 } = {}) {
  const ext = gl.getExtension('EXT_disjoint_timer_query_webgl2');
  let active = null, pending = [], samples = [], disposed = false, invalid = false;
  function clear() {
    for (const query of pending) gl.deleteQuery(query);
    pending = []; samples = [];
  }
  function poll() {
    if (!ext || disposed || gl.isContextLost()) return;
    if (gl.getParameter(ext.GPU_DISJOINT_EXT)) { clear(); invalid = true; return; }
    while (pending.length && gl.getQueryParameter(pending[0], gl.QUERY_RESULT_AVAILABLE)) {
      const query = pending.shift();
      const ms = gl.getQueryParameter(query, gl.QUERY_RESULT) / 1e6;
      gl.deleteQuery(query);
      if (ms > 0 && Number.isFinite(ms)) { samples.push(ms); if (samples.length > capacity) samples.shift(); invalid = false; }
    }
  }
  function begin() {
    poll();
    if (!ext || disposed || active || gl.isContextLost() || invalid && gl.getParameter(ext.GPU_DISJOINT_EXT) || pending.length >= maxPending) return false;
    // External benchmark tools may own the same timer target.
    if (gl.getQuery(ext.TIME_ELAPSED_EXT, gl.CURRENT_QUERY)) return false;
    active = gl.createQuery();
    if (!active) return false;
    gl.beginQuery(ext.TIME_ELAPSED_EXT, active); return true;
  }
  function end() {
    if (!active) return;
    if (!gl.isContextLost()) { gl.endQuery(ext.TIME_ELAPSED_EXT); pending.push(active); }
    else gl.deleteQuery(active);
    active = null;
  }
  function snapshot() {
    poll();
    const meanMs = samples.length ? samples.reduce((a,b)=>a+b,0)/samples.length : null;
    return { supported: !!ext, status: disposed ? 'stopped' : gl.isContextLost() ? 'lost' : !ext ? 'unsupported' : invalid ? 'disjoint' : meanMs === null ? 'waiting' : 'ready', samples: samples.length, meanMs, theoreticalFps: meanMs ? 1000/meanMs : null };
  }
  return { begin, end, snapshot, reset: clear, dispose() { end(); clear(); disposed = true; } };
}
export function formatGpuTiming(s) {
  if (s.status !== 'ready') return `GPU：${({unsupported:'不支持 GPU 计时',waiting:'等待 GPU 样本',disjoint:'计时失效，重新采样中',lost:'上下文丢失',stopped:'已停止'})[s.status] || '等待采样'}`;
  return `GPU ${s.meanMs.toFixed(2)} ms/帧 · 理论上限 ${s.theoreticalFps.toFixed(0)} FPS（近 ${s.samples} 帧均值）`;
}
