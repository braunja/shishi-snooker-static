// Block browser page magnification everywhere, including over HUD controls.
// Leave event propagation intact so the game's independent pointer controls work.
(function () {
  var options = { capture: true, passive: false };
  function nativeCopyTarget(node) {
    var target = node && (node.closest ? node : node.parentElement);
    return Boolean(target && target.closest('[data-native-copy]'));
  }
  function preventZoom(event) {
    if (['contextmenu', 'selectstart', 'dragstart'].indexOf(event.type) !== -1 && nativeCopyTarget(event.target)) return;
    if (event.cancelable) event.preventDefault();
  }
  ['contextmenu', 'selectstart', 'dragstart', 'gesturestart', 'gesturechange', 'gestureend'].forEach(function (type) {
    document.addEventListener(type, preventZoom, options);
  });
  function clearSelection() {
    var selection = document.getSelection && document.getSelection();
    if (nativeCopyTarget(document.activeElement) || nativeCopyTarget(selection && selection.anchorNode)) return;
    if (selection && !selection.isCollapsed) selection.removeAllRanges();
  }
  document.addEventListener('selectionchange', clearSelection, options);
  document.addEventListener('touchstart', function (event) {
    clearSelection();
    // Cancel native iPad text/image callouts before contextmenu fires.
    // Native button clicks retain fullscreen user activation; canvas controls
    // continue to use independent Pointer Events.
    var source = event.composedPath ? event.composedPath()[0] : event.target;
    var target = source && (source.closest ? source : source.parentElement);
    if (target && target.closest('button, a, input, select, textarea, summary, [role="button"], [data-native-scroll]')) return;
    preventZoom(event);
  }, options);
  document.addEventListener('wheel', function (event) {
    // Chromium/Firefox trackpad pinches are Ctrl+wheel. Ordinary scrolling
    // remains available to the game's own camera and aiming handlers.
    if (event.ctrlKey) preventZoom(event);
  }, options);
  function isGameDragTarget(node) {
    var target = node && (node.closest ? node : node.parentElement);
    return Boolean(target && target.closest('canvas, #power-track, #tip-pad'));
  }
  document.addEventListener('touchmove', function (event) {
    // Safari needs a non-passive Touch Events cancellation as well as
    // touch-action:none / Pointer Events. Single-finger power pulls must not
    // become native page/fullscreen pans. Keep propagation for game input.
    var touches = event.touches;
    var gameDrag = isGameDragTarget(event.target);
    for (var i = 0; touches && i < touches.length; i++) {
      // Touch.target remains the start element even after dragging outside it.
      if (isGameDragTarget(touches[i].target)) gameDrag = true;
    }
    if (gameDrag || (touches && touches.length > 1)) preventZoom(event);
  }, options);
})();
