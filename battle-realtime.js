(() => {
  // A transport only: the game owns prediction, replay, and authoritative state.
  function connect({ roomId, onRoom, onPreview, onPreviewCancelled, onStatus }) {
    const base = `/api/battle/rooms/${encodeURIComponent(roomId)}/events`;
    let source = null;
    let closed = false;
    let connected = false;
    let polling = false;
    let pollTimer = null;
    let reopenTimer = null;
    let pollAbort = null;
    let lastMessageAt = 0;
    let lastRoom = null;
    let activePreview = null;
    const seenPreviews = new Set();

    const status = (transport, error) => onStatus?.({ connected, transport, ...(error ? { error } : {}) });
    function cancelPreview(value) {
      if (!activePreview || value.previewId !== activePreview.previewId) return;
      activePreview = null;
      onPreviewCancelled?.(value);
    }
    function receiveRoom(value) {
      if (!value || value.id !== roomId || !Number.isInteger(value.shotSeq)) return;
      // An in-flight fallback fetch can finish after the replacement stream.
      const frame=Number(value.snapshot?.battle?.frameNumber || 1), previousFrame=Number(lastRoom?.snapshot?.battle?.frameNumber || 1);
      if (lastRoom && (frame < previousFrame || frame === previousFrame && (value.shotSeq < lastRoom.shotSeq ||
        value.shotSeq === lastRoom.shotSeq && (Number(value.updatedAt) < Number(lastRoom.updatedAt) ||
          value.updatedAt === lastRoom.updatedAt && Number(value.serverNow) < Number(lastRoom.serverNow))))) return;
      lastRoom = value;
      if (activePreview && !value.busy && value.shotSeq < activePreview.shotSeq) {
        cancelPreview({ previewId: activePreview.previewId, shotSeq: activePreview.shotSeq, serverNow: value.serverNow });
      } else if (activePreview && value.shotSeq >= activePreview.shotSeq) activePreview = null;
      onRoom?.(value);
    }
    function receivePreview(value) {
      if (!value || value.roomId !== roomId || !value.previewId || seenPreviews.has(value.previewId) ||
        value.shotSeq !== value.expectedSeq + 1 || value.expiresAt <= value.serverNow ||
        lastRoom && value.expectedSeq < lastRoom.shotSeq) return;
      seenPreviews.add(value.previewId);
      if (seenPreviews.size > 100) seenPreviews.delete(seenPreviews.values().next().value);
      activePreview = value;
      onPreview?.(value);
    }
    function clearPolling() {
      clearTimeout(pollTimer);
      pollTimer = null;
      pollAbort?.abort();
      pollAbort = null;
    }
    async function poll() {
      if (closed || document.hidden || connected || polling) return;
      polling = true;
      const abort = new AbortController();
      pollAbort = abort;
      const timeout = setTimeout(() => abort.abort(), 6000);
      let nextDelay = 250;
      try {
        const response = await fetch(`${base}?poll=1`, {
          credentials: 'same-origin', cache: 'no-store', signal: abort.signal,
        });
        const value = await response.json();
        if (!response.ok) {
          if ([401, 403, 404].includes(response.status)) {
            status('polling', value.error || '房间访问权限已变化');
            close();
            return;
          }
          throw new Error(value.error || `同步失败（${response.status}）`);
        }
        if (!closed && !connected) {
          receivePreview(value.preview && { ...value.preview, serverNow: value.serverNow });
          if (!value.preview && activePreview && value.room?.shotSeq < activePreview.shotSeq && !value.room?.busy) {
            cancelPreview({ previewId: activePreview.previewId, shotSeq: activePreview.shotSeq, serverNow: value.serverNow });
          }
          receiveRoom(value.room);
          status('polling');
        }
      } catch (error) {
        if (!closed && !connected && error.name !== 'AbortError') {
          status('polling', error.message);
          nextDelay = 1000;
        }
      } finally {
        clearTimeout(timeout);
        if (pollAbort === abort) pollAbort = null;
        polling = false;
        if (!closed && !connected && !document.hidden) pollTimer = setTimeout(poll, nextDelay);
      }
    }
    const parse = (event, callback) => {
      try { callback(JSON.parse(event.data)); }
      catch (error) { console.warn('球局实时消息无效', error); }
    };
    function open() {
      clearTimeout(reopenTimer);
      if (closed || document.hidden) return;
      source?.close();
      if (typeof EventSource !== 'function') { void poll(); return; }
      let nextSource;
      try { nextSource = new EventSource(base, { withCredentials: true }); }
      catch { void poll(); return; }
      source = nextSource;
      const markReceived = () => {
        if (closed || source !== nextSource) return false;
        lastMessageAt = Date.now();
        connected = true;
        clearPolling();
        status('sse');
        return true;
      };
      source.addEventListener('shot-preview', (event) => { if (markReceived()) parse(event, receivePreview); });
      source.addEventListener('preview-cancelled', (event) => { if (markReceived()) parse(event, cancelPreview); });
      source.addEventListener('room', (event) => { if (markReceived()) parse(event, receiveRoom); });
      source.addEventListener('ping', markReceived);
      source.addEventListener('access-revoked', () => {
        connected = false;
        status('sse', '房间访问权限已变化');
        close();
      });
      source.addEventListener('error', () => {
        if (closed || source !== nextSource) return;
        connected = false;
        // Native EventSource reconnects with its last event id. Polling covers
        // disconnects and hosts/proxies that buffer event streams.
        void poll();
      });
      source.addEventListener('sync-error', () => {
        if (closed || source !== nextSource) return;
        connected = false;
        source?.close();
        void poll();
        reopenTimer = setTimeout(open, 1500);
      });
    }
    function visibility() {
      if (document.hidden) {
        source?.close();
        source = null;
        connected = false;
        clearPolling();
      } else {
        open();
        void poll();
      }
    }
    function close() {
      closed = true;
      connected = false;
      source?.close();
      source = null;
      clearTimeout(reopenTimer);
      clearPolling();
      clearInterval(watchdog);
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('online', reconnect);
      window.removeEventListener('pagehide', close);
    }
    function reconnect() { if (!closed) { open(); void poll(); } }
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('online', reconnect);
    window.addEventListener('pagehide', close);
    open();
    const watchdog = setInterval(() => {
      if (!closed && !document.hidden && connected && Date.now() - lastMessageAt > 2000) {
        connected = false;
        open();
        void poll();
      }
    }, 1000);
    // Give EventSource a short head start. A buffered/non-streaming proxy still
    // gets a bounded polling fallback instead of silently freezing the table.
    pollTimer = setTimeout(poll, 700);
    return { close, get connected() { return connected; } };
  }
  window.StandaloneBattleRealtime = { connect };
})();
