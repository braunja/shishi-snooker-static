// Capture before canvas/UI handlers so an opening gesture cannot cancel the
// presentation or become a partial drag when the presentation finishes.
export function installIntroInputLock(target, isLocked, allowEvent = () => false) {
  const pointers = new Set(), clicks = new Set(), keys = new Set();
  const types = ['pointerdown', 'pointermove', 'pointerup', 'pointercancel',
    'touchstart', 'touchmove', 'touchend', 'touchcancel',
    'mousedown', 'mousemove', 'mouseup', 'click', 'dblclick', 'contextmenu',
    'wheel', 'gesturestart', 'gesturechange', 'gestureend', 'keydown', 'keyup'];
  function intercept(event) {
    if (allowEvent(event)) return;
    let blocked = isLocked();
    const id = event.pointerId;
    if (event.type === 'pointerdown') {
      if (!blocked && pointers.size === 0) clicks.clear();
      else clicks.delete(id);
      if (blocked) { pointers.add(id); clicks.add(id); }
    } else if (event.type.startsWith('pointer')) {
      blocked ||= pointers.has(id);
      if (event.type === 'pointerup' || event.type === 'pointercancel') pointers.delete(id);
    } else if (event.type === 'click' || event.type === 'dblclick' || event.type === 'contextmenu') {
      blocked ||= clicks.has(id);
      // Older browsers emit MouseEvent clicks without a pointerId.
      blocked ||= id === undefined && clicks.size > 0 && event.detail > 0;
    } else if (event.type === 'keydown') {
      blocked ||= keys.has(event.code);
      if (blocked) keys.add(event.code);
    } else if (event.type === 'keyup') {
      blocked ||= keys.has(event.code);
      keys.delete(event.code);
    } else {
      blocked ||= pointers.size > 0;
    }
    if (blocked) {
      if (event.cancelable) event.preventDefault();
      event.stopImmediatePropagation();
    }
  }
  for (const type of types) target.addEventListener(type, intercept, {capture:true, passive:false});
  return () => {
    for (const type of types) target.removeEventListener(type, intercept, true);
    pointers.clear(); clicks.clear(); keys.clear();
  };
}
