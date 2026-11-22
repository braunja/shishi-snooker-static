// Keep slider input cheap. Commit only the latest values after a short pause,
// or synchronously on release / before switching or saving a preset.
export function createTuningUpdateQueue({ apply, delayMs = 120, schedule = setTimeout, cancel = clearTimeout }) {
  let pending = {}, timer = null;
  function flush() {
    if (timer !== null) cancel(timer);
    timer = null;
    if (!Object.keys(pending).length) return true;
    const patch = pending;
    pending = {};
    return apply(patch);
  }
  return {
    values: () => pending,
    update(patch, continuous = false) {
      Object.assign(pending, patch);
      if (!continuous) return flush();
      if (timer !== null) cancel(timer);
      timer = schedule(flush, delayMs);
      return true;
    },
    flush,
  };
}
