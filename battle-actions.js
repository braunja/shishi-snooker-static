(() => {
  let latest = null;
  let panel = null;
  let visual = null;
  let controls = null;
  let feedback = null;
  let renderedKey = '';
  let submitting = false;

  function clear() {
    if (panel) {
      panel.hidden = true;
      if (visual) visual.host.hidden = true;
      controls.replaceChildren();
      feedback.textContent = '';
    }
    renderedKey = '';
    submitting = false;
  }

  function choices(context) {
    const { room, core, ready } = context || {};
    if (!ready || !room || !core || room.status !== 'playing' ||
        !['p1', 'p2'].includes(room.yourSeat) ||
        room.currentPlayerId !== room.yourSeat || core.isBusy?.() || core.networkPlaying?.()) return null;
    const state = core.getState();
    if (state.frameOver || state.currentPlayerId !== room.yourSeat) return null;
    const sdk = window.SnookerThreeCore;
    if (!sdk?.Intermission) return null;
    const pending = state.ruleState?.pendingDecision;
    const actions = sdk.Intermission.createPendingDecisionActions(state);
    const playSelf = sdk.Rules.DECISION.PLAY_SELF;
    if (pending?.type === 'foul' && !actions.some(action => action.value === playSelf)) {
      actions.unshift({ type: 'decision', value: playSelf, label: '自己打' });
    }
    const nominations = actions.length ? [] : sdk.Intermission.createNominationActions(state);
    const entries = actions.length ? actions.map(action => ({ ...action, type: 'decision' }))
      : nominations.map(action => ({ ...action, type: 'nomination', label: sdk.Intermission.ballKindLabel(action.value) }));
    if (!entries.length) return null;
    const key = JSON.stringify([room.id, room.shotSeq, room.yourSeat, pending?.type,
      entries.map(action => [action.type, action.value])]);
    return { core, state, entries, key,
      title: actions.length ? pending?.type === 'foul' ? '犯规后，请选择下一杆' : '请选择开球方' : '请选择目标彩球' };
  }

  function createPanel() {
    if (panel) return;
    panel = document.createElement('section');
    panel.id = 'standalone-battle-actions';
    visual = window.StandaloneNativeUI?.createVisualLayer('product-match-decisions');
    panel.className = visual ? 'table-decision standalone-battle-actions' : 'standalone-battle-actions';
    panel.setAttribute('aria-label', '球局规则操作');
    panel.hidden = true;
    const title = document.createElement('p');
    title.className = visual ? 'table-decision-caption' : 'standalone-battle-actions-title';
    controls = document.createElement('div');
    controls.className = visual ? 'table-decision-buttons' : 'standalone-battle-actions-controls';
    feedback = document.createElement('p');
    feedback.className = 'standalone-battle-actions-feedback';
    feedback.setAttribute('role', 'status');
    feedback.setAttribute('aria-live', 'polite');
    panel.append(title, controls, feedback);
    for (const name of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'click', 'dblclick', 'touchstart', 'touchend']) {
      panel.addEventListener(name, event => event.stopPropagation());
    }
    if (visual) {
      visual.host.style.zIndex = 170;
      const style = document.createElement('style');
      style.textContent = '.standalone-battle-actions[hidden]{display:none!important}.standalone-battle-actions-color::before{content:"";display:inline-block;width:17px;height:17px;vertical-align:middle;margin-right:7px;border:1px solid #ffffff80;border-radius:50%;background:var(--ball-color)}.standalone-battle-actions-feedback:empty{display:none}.standalone-battle-actions-feedback{color:#ffd2ad;background:#091d24ed;padding:4px 10px;pointer-events:none}';
      visual.screen.append(style, panel);
      window.addEventListener('pagehide', () => visual.destroy(), {once:true});
    } else document.body.append(panel);
  }

  function disableButtons(disabled) {
    for (const button of controls.children) button.disabled = disabled;
    panel.setAttribute('aria-busy', String(disabled));
  }

  function act(entry, key, core) {
    if (submitting) return;
    const current = choices(latest);
    if (!current || current.key !== key || current.core !== core ||
        !current.entries.some(action => action.type === entry.type && action.value === entry.value)) return;
    submitting = true;
    feedback.textContent = '';
    disableButtons(true);
    try {
      const accepted = entry.type === 'decision' ? core.decision(entry.value) : core.nominate(entry.value);
      if (accepted === false) throw new Error('当前无法操作，请等待球局同步后重试');
      // The existing network adapter renders ready=false while submitting and
      // renders the authoritative state once its action request completes.
    } catch (error) {
      submitting = false;
      if (renderedKey === key && choices(latest)) {
        disableButtons(false);
        feedback.textContent = error?.message || '操作未提交，请稍后重试';
      }
    }
  }

  function render(context) {
    latest = context;
    const current = choices(context);
    if (!current) { clear(); return; }
    createPanel();
    if (renderedKey !== current.key) {
      submitting = false;
      panel.firstElementChild.textContent = current.title;
      feedback.textContent = '';
      controls.replaceChildren();
      for (const entry of current.entries) {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = entry.label;
        button.dataset.action = entry.type;
        button.dataset.value = entry.value;
        if (entry.type === 'nomination') {
          button.className = 'standalone-battle-actions-color';
          button.style.setProperty('--ball-color', current.state.balls.find(ball => ball.kind === entry.value)?.color || '#ffffff');
        }
        button.addEventListener('click', () => act(entry, current.key, current.core));
        controls.append(button);
      }
      renderedKey = current.key;
    }
    disableButtons(submitting);
    panel.hidden = false;
    if (visual) {visual.host.hidden = false; visual.resize();}
  }

  window.StandaloneBattleActions = { render };
})();
