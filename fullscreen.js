// Fullscreen is entered only from the explicit button, including legacy iPad Safari.
(function () {
  var root = document.documentElement;
  var button = document.getElementById('trial-fullscreen');
  if (!button) return;
  var request = root.requestFullscreen || root.webkitRequestFullscreen;
  var exit = document.exitFullscreen || document.webkitExitFullscreen;
  var pending = false;
  function active() { return Boolean(document.fullscreenElement || document.webkitFullscreenElement); }
  function sync() {
    pending = false;
    var label = active() ? '退出全屏' : '全屏';
    button.setAttribute('aria-label', label);
    button.setAttribute('aria-pressed', String(active()));
    button.title = label;
    button.disabled = !request || !exit;
    if (button.disabled) button.title = '当前浏览器不支持网页全屏';
  }
  button.addEventListener('click', function (event) {
    event.stopPropagation();
    if (pending || button.disabled) return;
    pending = true;
    try {
      var result = active() ? exit.call(document) : request.call(root);
      if (result && result.catch) result.catch(sync);
    } catch (_) { sync(); }
  });
  document.addEventListener('fullscreenchange', sync);
  document.addEventListener('webkitfullscreenchange', sync);
  document.addEventListener('fullscreenerror', sync);
  document.addEventListener('webkitfullscreenerror', sync);
  sync();
})();
