// The released visual layer and panels provide the original game menu and
// settings. Only persistence and the extra replay actions are local adapters.
(() => {
  const native = window.StandaloneNativeUI;
  // Released result markup and layout, with real local scores. Rewards have no
  // independent backend, so this presentation never calls product APIs.
  window.SnookerProduct.createPracticeResultUI = () => {
    const layer = native.createVisualLayer('product-practice-result');
    layer.host.style.zIndex = 175;
    layer.screen.innerHTML = '<div id="overlay" data-drawer="training-repeat"><section class="dialog" role="dialog" aria-modal="true" aria-labelledby="practice-result-title"><header class="dialog-head"><h2 id="practice-result-title"></h2></header><div class="dialog-body"><div class="replay-summary"></div><p class="replay-feedback field-error" role="status"></p></div><footer class="dialog-footer"><div class="actions replay-dialog-actions"></div></footer><button class="game-dialog-close" aria-label="关闭" hidden><svg viewBox="0 0 24 24"><path d="M7 7l10 10M17 7L7 17" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg></button></section></div><style>.replay-feedback:empty{display:none}.replay-feedback{margin:8px 0 0}#screen .dialog-footer .primary{order:1}</style>';
    const dialog = layer.screen.querySelector('.dialog'), title = dialog.querySelector('h2'), summary = dialog.querySelector('.replay-summary'), feedback = dialog.querySelector('.replay-feedback'), actions = dialog.querySelector('.actions');
    const close = dialog.querySelector('.game-dialog-close');
    Object.defineProperty(dialog, 'open', {get:() => !layer.host.hidden});
    dialog.showModal = dialog.show = () => {layer.host.hidden = false; layer.resize(); dialog.tabIndex = -1; dialog.focus({preventScroll:true});};
    dialog.close = () => {layer.host.hidden = true;};
    dialog.remove = () => {document.removeEventListener('keydown', keydown, true); layer.destroy();};
    const keydown = event => {if (dialog.open && event.key === 'Escape') {event.preventDefault(); event.stopPropagation(); if (!close.hidden) close.click();}};
    document.addEventListener('keydown', keydown, true);
    window.addEventListener('pagehide', () => document.removeEventListener('keydown', keydown, true), {once:true});
    const stat = (label, value, unit='', className='') => {
      const node = document.createElement('div'), caption = document.createElement('small'), amount = document.createElement('strong');
      caption.textContent = label; amount.textContent = String(value); amount.className = className;
      if (unit) {const suffix = document.createElement('span'); suffix.textContent = ` ${unit}`; amount.append(suffix);}
      node.append(caption, amount); return node;
    };
    return {dialog, title, summary, feedback, actions, prepareResult:async () => null, pendingResult:() => null, reset() {},
      renderResult({best, retries, shape, streak}) {
        const basic = streak !== null;
        layer.screen.querySelector('#overlay').dataset.drawer = basic ? 'practice-record' : 'training-repeat';
        const result = document.createElement('div'); result.className = 'challenge-result';
        const stats = document.createElement('div'); stats.className = `challenge-result-stats${basic ? '' : ' three-stats'}`;
        stats.append(stat('练习球型', native.practiceShapeLabel(shape), '', 'shape-name'));
        if (basic) stats.append(stat('连进数量', streak, '个'));
        else stats.append(stat('单杆最高分', best, '分'), stat('重打次数', retries, '次'));
        result.append(stats); summary.replaceChildren(result); layer.resize();
      },
      decorateAction(button, label) {button.classList.add('standard-action'); if (label === '再次挑战') button.classList.add('primary');},
      showReplayError(error) {
        document.getElementById('loading')?.remove(); document.getElementById('viewer')?.classList.remove('is-loading');
        const permanent = error.expired || error.invalid;
        layer.screen.querySelector('#overlay').dataset.drawer = 'replay-unavailable';
        dialog.classList.add('simple-dialog'); close.hidden = false; close.onclick = () => location.assign('/');
        title.textContent = permanent ? '回放不可用，比赛记录仍保留' : '录像加载失败，请重试';
        summary.replaceChildren(); feedback.textContent = ''; actions.replaceChildren();
        dialog.querySelector('.dialog-footer').hidden = Boolean(permanent);
        if (!permanent) {const retry = document.createElement('button'); retry.className = 'primary standard-action'; retry.textContent = '重试'; retry.onclick = () => location.reload(); actions.append(retry);}
        dialog.showModal();
      }
    };
  };
  const initialize = window.SnookerTrialUI.initialize;
  window.SnookerTrialUI.initialize = async options => {
    const shape = new URLSearchParams(location.search).get('shape');
    if (shape && !location.search.includes('replay=')) options.core.loadPracticeShape(shape);
    window.SnookerOnline?.bindPresentation?.(options);
    const ui = await initialize(options);
    if (window.SnookerOnline && !window.SnookerOnline.isLocalPractice?.()) return ui;
    const layer = native.createVisualLayer('product-game-menu');
    layer.host.style.zIndex = 35;
    layer.host.hidden = false;
    layer.screen.innerHTML = '<style>.game-menu{pointer-events:auto}:host([data-mobile-side-controls]) .game-menu{left:0}:host([data-mobile-side-controls]) .game-menu>summary{width:52.8px;height:52.8px}</style><details class="game-menu"><summary aria-label="游戏菜单" title="游戏菜单"><svg style="width:58%;height:58%" viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 2.5h19M2.5 12h19M2.5 21.5h19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></summary><div class="game-menu-items" aria-label="游戏操作"><button data-settings>游戏设置</button><button data-exit>返回大厅</button><button data-save>保存回放</button><button data-replays>我的回放</button><button data-saved hidden>查看已保存回放</button></div></details>';
    const menu = layer.screen.querySelector('details');
    const panels = native.createPanels({onlineSettings:false, preferences:window.SnookerPracticeSettings.read, notice:ui.notice,
      setPreference(key, value) {
        const result = window.SnookerPracticeSettings.set(key, value);
        if (!result.persisted) ui.notice('当前浏览器未能保存设置');
      }
    }, {legacyEnabled:false});
    const closeMenu = () => {menu.open = false;};
    layer.screen.querySelector('[data-settings]').onclick = () => {closeMenu(); panels.settings();};
    layer.screen.querySelector('[data-exit]').onclick = () => location.assign('/');
    layer.screen.querySelector('[data-replays]').onclick = () => location.assign('/#replays');
    const save = layer.screen.querySelector('[data-save]');
    save.hidden = location.pathname.includes('/battle/');
    save.onclick = () => {
      closeMenu();
      document.getElementById('save-replay').click();
    };
    const saved = layer.screen.querySelector('[data-saved]');
    const replaySaved = event => {
      saved.hidden = false;
      saved.onclick = () => location.assign(event.detail);
      ui.notice('回放已保存，可在菜单查看');
    };
    window.addEventListener('standalone-replay-saved', replaySaved);
    const status = document.getElementById('local-save-status');
    const statusObserver = new MutationObserver(() => {
      if (!status.querySelector('a') && status.textContent) ui.notice(status.textContent);
    });
    statusObserver.observe(status, {childList:true, characterData:true, subtree:true});
    const resize = () => {
      layer.host.toggleAttribute('data-mobile-side-controls', window.ThreeTrialPageLayout?.device === 'mobile');
      document.documentElement.style.setProperty('--product-ui-scale', String(Math.min(innerWidth/(innerHeight>innerWidth?540:960),innerHeight/(innerHeight>innerWidth?960:540))));
    };
    resize(); window.addEventListener('resize', resize);
    const outside = event => {if (!event.composedPath().includes(layer.host)) closeMenu();};
    document.addEventListener('pointerdown', outside, true);
    const update = ui.update;
    ui.update = (...args) => {layer.host.hidden = ui.isReplay(); return update(...args);};
    window.addEventListener('pagehide', () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('standalone-replay-saved', replaySaved);
      document.removeEventListener('pointerdown', outside, true);
      statusObserver.disconnect(); layer.destroy();
    }, {once:true});
    return ui;
  };
})();
