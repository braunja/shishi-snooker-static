(() => {
  const id = document.currentScript?.dataset.roomId;
  const hud = document.querySelector('.battle-hud');
  if (!id || !hud) return;
  const roomPath = `/api/battle/rooms/${encodeURIComponent(id)}`;
  const path = `${roomPath}/social`;
  const muteKey = 'snooker.battle.mute-spectators';
  const spectatorPhrases = ['漂亮！', '好球！', '精彩解球！', '加油！', '👍', '🎉', '🤝'];
  const phrases = ['漂亮！', '好球！', '精彩解球！', '加油！', '可惜，下一杆！', '运气不错', '再来一局？'];
  const controls = document.createElement('div');
  controls.className = 'battle-social-controls';
  controls.hidden = true;
  controls.innerHTML = '<button id="battle-social-clap" type="button" aria-label="鼓掌">👏 鼓掌</button><button id="battle-social-phrases" type="button" aria-expanded="false">快捷语</button><button id="battle-social-roster" type="button" aria-expanded="false">观众</button><button id="battle-social-context" type="button" hidden></button>';
  const menu = document.createElement('div');
  menu.className = 'battle-social-menu';
  menu.setAttribute('aria-label', '快捷语');
  menu.hidden = true;
  const toast = document.createElement('div');
  toast.className = 'battle-social-toast';
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  toast.hidden = true;
  const roster = document.createElement('section');
  roster.className = 'battle-social-roster';
  roster.hidden = true;
  roster.setAttribute('aria-label', '观战名单');
  roster.innerHTML = '<strong>已加入的观众</strong><p aria-live="polite"></p><button type="button" role="switch" aria-checked="false">屏蔽观众消息</button>';
  hud.append(controls, menu, roster, toast);
  const clapButton = controls.querySelector('#battle-social-clap');
  const phrasesButton = controls.querySelector('#battle-social-phrases');
  const contextButton = controls.querySelector('#battle-social-context');
  const rosterButton = controls.querySelector('#battle-social-roster');
  const muteToggle = roster.querySelector('button');
  let muteSpectators = false;
  try { muteSpectators = localStorage.getItem(muteKey) === '1'; } catch {}
  muteToggle.setAttribute('aria-checked', String(muteSpectators));
  let seat = null;
  let sending = false;
  let phase = null;
  let contextPhrase = null;
  let cursor = null;
  let polling = false;
  let toastTimer = null;
  let clapCount = 0;
  const seen = new Set();

  function closeMenu() {
    menu.hidden = true;
    phrasesButton.setAttribute('aria-expanded', 'false');
  }

  function remember(eventId) {
    if (!Number.isSafeInteger(eventId)) return false;
    if (seen.has(eventId)) return true;
    seen.add(eventId);
    if (seen.size > 250) seen.delete(seen.values().next().value);
    return false;
  }

  function showEvent(event) {
    if (remember(Number(event.id)) || seat !== 'spectator' && muteSpectators && event.spectator) return;
    toast.dataset.spectator = String(event.spectator === true);
    const clap = event.kind === 'clap';
    clapCount = clap && !toast.hidden && toast.dataset.kind === 'clap' ? clapCount + 1 : clap ? 1 : 0;
    toast.dataset.kind = clap ? 'clap' : 'phrase';
    toast.textContent = clap ? (clapCount === 1 ? `${event.username} 👏` : `👏 ×${clapCount}`) : `${event.username}：${event.value}`;
    toast.hidden = false;
    toast.classList.remove('burst');
    if (clap) {
      void toast.offsetWidth;
      toast.classList.add('burst');
    }
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.hidden = true; }, 2300);
  }

  function showError(value) {
    clapCount = 0;
    toast.dataset.kind = 'error';
    delete toast.dataset.spectator;
    toast.textContent = value;
    toast.hidden = false;
    toast.classList.remove('burst');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.hidden = true; }, 3000);
  }

  async function request(after, payload) {
    const response = await fetch(payload ? path : `${path}?after=${after}`, {
      method: payload ? 'POST' : 'GET',
      headers: payload ? { 'Content-Type': 'application/json' } : undefined,
      body: payload ? JSON.stringify(payload) : undefined,
      credentials: 'same-origin', cache: 'no-store',
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `互动请求失败（${response.status}）`);
    return data;
  }

  async function send(kind, value = '') {
    if (sending || !['playing', 'paused', 'finished'].includes(phase)) return;
    sending = true;
    try {
      const result = await request(null, { kind, value });
      showEvent(result.event);
    } catch (error) { showError(error.message); }
    finally { sending = false; }
  }

  for (const value of new Set([...phrases, ...spectatorPhrases])) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = value;
    button.dataset.spectatorPhrase = String(spectatorPhrases.includes(value));
    button.dataset.playerPhrase = String(phrases.includes(value));
    button.addEventListener('click', () => { closeMenu(); void send('phrase', value); });
    menu.append(button);
  }
  clapButton.addEventListener('click', () => { void send('clap'); });
  phrasesButton.addEventListener('click', () => {
    closeRoster();
    menu.hidden = !menu.hidden;
    phrasesButton.setAttribute('aria-expanded', String(!menu.hidden));
  });
  function closeRoster() {
    roster.hidden = true;
    rosterButton.setAttribute('aria-expanded', 'false');
  }
  async function refreshRoster() {
    if (roster.hidden || !roster.getClientRects().length || document.hidden) return;
    const status = roster.querySelector('p');
    try {
      const response = await fetch(`${roomPath}/spectators`, { cache: 'no-store' });
      if (!response.ok) throw new Error();
      const { spectators } = await response.json();
      status.textContent = spectators.filter(entry => entry.status === 'accepted').map(entry => entry.username).join('、') || '暂无观众';
    } catch { status.textContent = '暂时无法读取观战名单'; }
  }
  rosterButton.addEventListener('click', () => {
    closeMenu();
    if (!roster.hidden) return closeRoster();
    roster.hidden = false;
    rosterButton.setAttribute('aria-expanded', 'true');
    roster.querySelector('p').textContent = '读取中…';
    void refreshRoster();
  });
  muteToggle.addEventListener('click', () => {
    muteSpectators = !muteSpectators;
    muteToggle.setAttribute('aria-checked', String(muteSpectators));
    try { localStorage.setItem(muteKey, muteSpectators ? '1' : '0'); } catch {}
    if (muteSpectators && toast.dataset.spectator === 'true') toast.hidden = true;
  });
  contextButton.addEventListener('click', () => {
    if (contextPhrase) void send('phrase', contextPhrase);
  });
  document.addEventListener('pointerdown', (event) => {
    const path = event.composedPath();
    if (!menu.hidden && !path.includes(menu) && !path.includes(phrasesButton)) closeMenu();
    if (!roster.hidden && !path.includes(roster) && !path.includes(rosterButton)) closeRoster();
  });

  function syncState() {
    const room = window.SnookerOnline?.getState?.()?.room;
    if (!room) return;
    if (seat === room.yourSeat && phase === room.status && controls.dataset.pausedBy === String(room.pausedBy)) return;
    seat = room.yourSeat;
    phase = room.status;
    controls.dataset.pausedBy = String(room.pausedBy);
    const active = ['playing', 'paused', 'finished'].includes(phase);
    controls.hidden = !active;
    for (const button of menu.querySelectorAll('button')) {
      button.hidden = (seat === 'spectator' ? button.dataset.spectatorPhrase : button.dataset.playerPhrase) !== 'true';
    }
    muteToggle.hidden = seat === 'spectator';
    contextPhrase = seat === 'spectator' ? null : phase === 'playing' ? '稍等一下' : phase === 'paused' && room.pausedBy === seat ? '我回来了' : phase === 'finished' ? '握手 🤝' : null;
    contextButton.hidden = !contextPhrase;
    if (contextPhrase) contextButton.textContent = contextPhrase === '握手 🤝' ? '🤝 握手' : `💬 ${contextPhrase}`;
    if (!active) {
      closeMenu();
      closeRoster();
    }
    if (active && cursor === null) void poll();
  }

  async function poll() {
    if (polling || document.hidden || !['playing', 'paused', 'finished'].includes(phase)) return;
    polling = true;
    try {
      const data = await request(cursor === null ? 'latest' : cursor);
      cursor = data.cursor;
      for (const event of data.events || []) showEvent(event);
    } catch { /* 比赛继续运行；下一次轮询重试。 */ }
    finally { polling = false; }
  }

  syncState();
  setInterval(syncState, 650);
  setInterval(() => { void refreshRoster(); }, 6000);
  setInterval(() => { void poll(); }, 1500);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { syncState(); void poll(); } });
})();
