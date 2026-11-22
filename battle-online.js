(() => {
  const id = document.currentScript?.dataset.roomId;
  if (!id) return;
  const base = `/api/battle/rooms/${encodeURIComponent(id)}`;
  document.documentElement.classList.add('battle-observer');
  let core = null;
  let room = null;
  let audio = null;
  let localSeq = 0;
  let initialized = false;
  let pending = false;
  let polling = false;
  let packetLoading = false;
  let message = '正在连接球局…';
  let lastPacket = null;
  let appliedSnapshot = null;
  let remotePresent = null;
  let presenceSentAt = 0;
  let noticeTimer = null;
  let realtime = null, remotePreviewId = null, appliedDifficulty = null, confirmPanels = null;
  let roomReceivedAt = performance.now();
  let presenceTimer = null;
  const received = new Set();
  const queued = [];
  const hud = document.createElement('aside');
  hud.className = 'battle-hud';
  hud.setAttribute('aria-label', '好友对战状态');
  hud.innerHTML = '<div class="scoreline"><div class="seat" id="battle-seat-a"><span class="turn-pin" aria-hidden="true"></span><span class="name"><span id="battle-name-a">玩家 A</span><small id="battle-break-a" hidden></small></span><strong class="score" id="battle-score-a">0</strong><b class="frames" id="battle-frames-a" aria-label="已赢局数">0</b></div><div class="score-meta"><span>局数</span><strong id="battle-frame-label">第 1 局</strong></div><div class="seat" id="battle-seat-b"><b class="frames" id="battle-frames-b" aria-label="已赢局数">0</b><strong class="score" id="battle-score-b">0</strong><span class="name"><span id="battle-name-b">玩家 B</span><small id="battle-break-b" hidden></small></span><span class="turn-pin" aria-hidden="true"></span></div></div><div class="detail"><span id="battle-status">正在连接球局…</span><span id="battle-presence" role="status"></span><button id="battle-pause" type="button" hidden>暂停</button><a id="battle-room-link">房间</a><a id="battle-home-link" href="/">返回主页</a></div>';
  document.body.append(hud);
  const clock = document.createElement('span'); clock.id = 'battle-shot-clock'; clock.setAttribute('aria-label','出杆倒计时');
  hud.querySelector('.detail').prepend(clock);
  const concede = document.createElement('button'); concede.id='battle-concede'; concede.type='button'; concede.textContent='认输'; concede.hidden=true;
  hud.querySelector('.detail').append(concede);
  concede.onclick = async () => {
    const panels = confirmPanels ||= window.StandaloneNativeUI?.createPanels({preferences:window.SnookerPracticeSettings.read}, {legacyEnabled:false});
    if (panels && await panels.confirm('确认本局认输？', {id:'concede',confirm:'认输'})) await sendAction('concede');
  };
  hud.querySelector('#battle-room-link').href = `/battle/${encodeURIComponent(id)}`;
  const presenceBanner = document.createElement('aside');
  presenceBanner.className = 'battle-presence-banner';
  presenceBanner.setAttribute('role', 'status');
  presenceBanner.hidden = true;
  presenceBanner.innerHTML = '<strong></strong><span></span>';
  document.body.append(presenceBanner);
  const notice = document.createElement('div');
  notice.className = 'battle-notice';
  notice.setAttribute('role', 'status');
  notice.hidden = true;
  document.body.append(notice);
  const endPanel = document.createElement('section');
  endPanel.className = 'battle-end-panel';
  endPanel.setAttribute('aria-label', '比赛结束');
  endPanel.hidden = true;
  endPanel.innerHTML = '<p>本局结束</p><h2 id="battle-end-result"></h2><div><button id="battle-next-frame" type="button" hidden>下一局</button><button id="battle-rematch" type="button">再来一局</button><a href="/">返回主页</a></div>';
  document.body.append(endPanel);

  let matchLayer = null, presentation = null, presentationUnsubscribe = null;
  let presentationTimer = null, presentationPing = null, paintedView = '', lastFoulKey = '';
  const matchNodes = new Map();
  const matchNode = selector => {
    if (!matchLayer) return null;
    if (!matchNodes.has(selector)) matchNodes.set(selector, matchLayer.screen.querySelector(selector));
    return matchNodes.get(selector);
  };
  function matchText(selector, value) {
    const node = matchNode(selector), text = String(value ?? '');
    if (node && node.textContent !== text) node.textContent = text;
  }
  function ballLabel(kind) {
    return window.SnookerThreeCore?.Intermission?.ballKindLabel(kind) || ({red:'红球',yellow:'黄球',green:'绿球',brown:'棕球',blue:'蓝球',pink:'粉球',black:'黑球',cue:'母球'})[kind] || '目标球';
  }
  function foulExplanation(state, result) {
    if (!result?.foul) return '';
    const details = result.foulDetails || [];
    const codes = result.fouls?.length ? result.fouls : details.map(item => item.code);
    const first = state.balls?.find(ball => ball.id === result.firstContactBallId);
    const target = result.shotTarget?.targetKinds || (result.shotTarget?.targetKind ? [result.shotTarget.targetKind] : []);
    const expected = target.length ? `（应击${target.map(ballLabel).join(' / ')}）` : '';
    const reasons = codes.map(code => {
      const detail = details.find(item => item.code === code);
      if (code === 'wrong-first-contact') return first ? `首碰${ballLabel(first.kind)}${expected}` : `未先击中目标球${expected}`;
      return ({'no-contact':`未碰到目标球${expected}`,'cue-ball-potted':'母球入袋','non-target-potted':`${detail?.kind ? ballLabel(detail.kind) : '非目标球'}误入袋`,'touching-ball-moved':'推动贴球','free-ball-snooker':'利用自由球形成障碍','shot-clock-timeout':'出杆超时','shot-clock-expired':'出杆超时','timeout':'出杆超时'})[code];
    }).filter(Boolean);
    if (!reasons.length) {
      const original = window.SnookerThreeCore?.Intermission?.createRuleResultMessages(state, result)?.[0];
      if (original) reasons.push(original.replace(/[,，]?\s*罚\s*\d+\s*分/, ''));
    }
    if (first && !codes.includes('wrong-first-contact')) reasons.push(`首碰${ballLabel(first.kind)}`);
    return `犯规${result.miss ? '（无意识救球）' : ''} · ${reasons.join(' · ') || '违反击球规则'} · 罚 ${Number(result.penalty) || 4} 分`;
  }
  function paintMatchViews() {
    if (!matchLayer) return;
    const mode = presentation?.getView?.() || 'broadcast';
    for (const button of matchLayer.screen.querySelectorAll('[data-match-view]')) {
      const selected = button.dataset.matchView === mode;
      button.setAttribute('aria-pressed', String(selected));
      button.disabled = !presentation?.setView;
    }
    const canvas = matchNode('.match-view-art'), group = canvas?.parentElement;
    if (!canvas || !group || !window.StandaloneNativeUI?.drawPracticeViews) return;
    const width = group.clientWidth, height = group.clientHeight;
    const scale = group.getBoundingClientRect().width / Math.max(1, width);
    const dpr = Math.max(1, (window.devicePixelRatio || 1) * scale);
    const key = [mode,width,height,dpr].join(':');
    if (!width || !height || key === paintedView) return;
    paintedView = key;
    canvas.width = Math.ceil(width * dpr); canvas.height = Math.ceil(height * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr,0,0,dpr,0,0); ctx.clearRect(0,0,width,height);
    window.StandaloneNativeUI.drawPracticeViews(ctx,{x:0,y:0,width,height,fontSize:14,cornerRadius:6,backgroundOpacity:.42},mode);
  }
  function renderMatchPresentation(state = core?.networkPlaying() ? core.getState() : room?.snapshot) {
    if (!matchLayer || !room || !state) return;
    const players = state.players || [], turn = core?.networkPlaying() ? state.activeShot?.playerId || state.currentPlayerId : room.currentPlayerId;
    for (const seat of ['p1','p2']) {
      const suffix = seat === 'p1' ? 'a' : 'b', player = players.find(item => item.id === seat);
      matchText(`#match-name-${suffix}`,room.players?.[seat] || player?.name || (seat === 'p1' ? '玩家 A' : '玩家 B'));
      matchText(`#match-score-${suffix}`,Number(player?.score) || 0);
      matchText(`#match-frames-${suffix}`,Number(player?.frames) || 0);
      matchText(`#match-break-${suffix}`,Number(player?.break) || 0);
      const active = turn === seat && room.status === 'playing';
      matchNode(`#match-player-${suffix}`).classList.toggle('current',active);
      matchNode(`#match-arrow-${suffix}`).style.visibility = active ? 'visible' : 'hidden';
      matchNode(`#match-break-line-${suffix}`).hidden = !player?.break;
    }
    const options = room.options || state.battle?.options;
    matchText('#match-total-frames',options?.frames ?? 1);
    const active = players.find(player => player.id === turn) || players[0], other = players.find(player => player.id !== active?.id);
    const difference = (Number(active?.score) || 0) - (Number(other?.score) || 0);
    const remaining = window.SnookerThreeCore?.Intermission?.remainingTablePoints(state);
    matchText('#match-position',`${difference > 0 ? `领先 ${difference}` : difference < 0 ? `落后 ${-difference}` : '平分'} · 剩余 ${Number.isFinite(remaining) ? remaining : '—'}`);
    const avatar = matchNode('#match-current-avatar');
    avatar.alt = room.players?.[turn] || active?.name || '当前选手';
    const target = matchNode('#match-targets');
    const kinds = state.frameOver ? [] : window.SnookerThreeCore?.Rules?.targetKindsForRule(state.ruleState || {},state) || [];
    const targetKey = kinds.join(':');
    if (target.dataset.kinds !== targetKey) {
      target.dataset.kinds = targetKey;
      target.replaceChildren();
      for (const kind of kinds) {
        const ball = document.createElement('span'); ball.className = 'target-ball';
        ball.style.backgroundColor = state.balls?.find(item => item.kind === kind)?.color || ({red:'#d20b13',yellow:'#f1cb19',green:'#178751',brown:'#764428',blue:'#1e57c4',pink:'#ef8fae',black:'#101215'})[kind] || '#eee';
        ball.setAttribute('role','img'); ball.setAttribute('aria-label',ballLabel(kind)); ball.title = ballLabel(kind); target.append(ball);
      }
      target.setAttribute('aria-label',state.frameOver ? '本局结束' : `目标：${kinds.map(ballLabel).join(' / ') || '等待选择'}`);
    }
    matchText('#match-turn-status',hud.querySelector('#battle-status')?.textContent || '正在连接球局…');
    const rule = state.lastRuleResult || state.ruleState?.lastRuleResult;
    const explanation = !core?.networkPlaying() ? foulExplanation(state,rule) : '';
    const foulKey = explanation ? `${room.shotSeq}:${state.battle?.frameNumber || 1}:${JSON.stringify(rule)}` : '';
    const reason = matchNode('#battle-rule-reason');
    if (foulKey && foulKey !== lastFoulKey) {lastFoulKey=foulKey; reason.textContent=explanation; reason.hidden=false;}
    if (core?.networkPlaying() || !rule?.foul) reason.hidden=true;
    // A persistent away notice must not cover the actual foul explanation.
    if (!reason.hidden) presenceBanner.hidden=true;
    updateMatchMetrics();
  }
  function updateMatchMetrics() {
    if (!matchLayer) return;
    paintMatchViews();
    const fps = document.getElementById('trial-fps')?.textContent?.match(/\d+(?:\.\d+)?/)?.[0];
    matchText('#match-fps-value',fps ? Math.round(Number(fps)) : '—');
    matchText('#match-ping-value',Number.isFinite(presentationPing) ? `${Math.round(presentationPing)}ms` : '—');
    const deadline = room?.shotClock?.deadlineAt;
    const now = Number(room?.serverNow) + performance.now() - roomReceivedAt;
    for (const seat of ['p1','p2']) {
      const node = matchNode(`#match-clock-${seat === 'p1' ? 'a' : 'b'}`);
      node.hidden = !deadline || room.currentPlayerId !== seat;
      if (!node.hidden) node.textContent = `${Math.max(0,Math.ceil((deadline-now)/1000))}″`;
    }
  }
  function attachMatchPresentation(ui) {
    if (matchLayer || !window.StandaloneNativeUI?.createVisualLayer) return;
    const native = window.StandaloneNativeUI;
    matchLayer = native.createVisualLayer('product-match-hud');
    matchLayer.host.style.zIndex = 36;
    matchLayer.screen.innerHTML = `<style>
      #screen .match-tools-content{display:grid;gap:6px}#screen .match-view-art{z-index:0}
      #screen .match-target-status{display:flex;align-items:center;gap:5px;min-width:0}
      #screen .match-status-lines{display:grid;gap:0;min-width:0}#screen .match-status-lines>small{display:flex;align-items:center;gap:5px}
      #screen .match-targets{display:inline-flex;gap:3px;align-items:center}
      #screen .match-turn-status{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}
      #screen .table-system-message[hidden],#screen [hidden]{display:none!important}
      #screen .match-topbar>#battle-rule-reason{top:calc(var(--topbar-action-height,40px) + 24px);max-width:min(620px,calc(100% - 32px));margin-left:0;font-size:14px;line-height:1.4;padding:8px 14px}
      #screen .avatar img{width:100%;height:100%;object-fit:cover}
      #screen .duel-scoreboard{pointer-events:none}
      #screen .match-social-panel{width:230px;max-height:340px;overflow:auto}
      #screen .match-social-toast{position:absolute;inset:108px 20px auto;display:flex;justify-content:center;pointer-events:none}
    </style><header class="online-game-top match-topbar">
      <div class="online-game-tools"><details class="game-menu"><summary aria-label="游戏菜单" title="游戏菜单"><svg style="width:58%;height:58%" viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 2.5h19M2.5 12h19M2.5 21.5h19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></summary><div class="game-menu-items match-tools-content"><slot name="match-menu"></slot></div></details><details class="match-quick-chat"><summary aria-label="球局互动" title="鼓掌与快捷语"><svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d="M4 4h16v12H9l-5 4V4Z" fill="none" stroke="currentColor" stroke-width="1.8"/></svg></summary><div class="match-social-panel"><slot name="match-social"></slot></div></details></div>
      <div class="online-game-status"><span class="avatar"><img id="match-current-avatar" src="/assets/avatar-default.svg" alt="当前选手"/></span><div class="match-status-lines"><strong id="match-position" class="match-playing">正在连接球局…</strong><small class="target-label"><span>目标</span><span id="match-targets" class="match-targets"></span></small></div></div>
      <div class="online-game-actions"><div class="match-view-group" role="group" aria-label="球桌视角"><canvas class="match-view-art" aria-hidden="true"></canvas>${[['aim','击球'],['camera','观察'],['broadcast','直播'],['god','上帝']].map(([mode,label])=>`<button id="battle-view-${mode}" data-match-view="${mode}" type="button" aria-pressed="false">${label}</button>`).join('')}</div><button class="fullscreen-button" id="battle-fullscreen" type="button" aria-label="全屏"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 3H3v6m12-6h6v6M3 15v6h6m6 0h6v-6"/></svg></button><div class="game-metrics"><span class="ping-readout"><span>Ping:</span><span id="match-ping-value" class="metric-reading">—</span></span><span class="fps-readout"><span class="metric-label">FPS:</span><span id="match-fps-value" class="metric-value">—</span></span></div></div>
      <div id="battle-rule-reason" class="table-system-message persistent" role="status" aria-live="polite" hidden></div><span id="match-turn-status" class="match-turn-status" role="status"></span>
    </header><div class="match-social-toast"><slot name="match-toast"></slot></div>
    <footer class="duel-scoreboard" aria-label="球局比分"><div class="scoreboard-main">
      <div id="match-player-a" class="scoreboard-player"><span id="match-arrow-a" class="player-turn-arrow" aria-hidden="true">▶</span><span class="scoreboard-identity"><span class="avatar"><img src="/assets/avatar-default.svg" alt=""/></span><strong id="match-name-a">玩家 A</strong></span><span id="match-clock-a" class="player-clock" hidden></span><div id="match-break-line-a" class="floating-break" hidden><span class="break-label">单杆</span><b id="match-break-a">0</b></div></div>
      <div class="central-score"><span id="match-score-a" class="frame-points">0</span><span class="frame-tally"><b id="match-frames-a">0</b><span>(<span id="match-total-frames">1</span>)</span><b id="match-frames-b">0</b></span><span id="match-score-b" class="frame-points">0</span></div>
      <div id="match-player-b" class="scoreboard-player opponent"><span id="match-arrow-b" class="player-turn-arrow" aria-hidden="true">◀</span><span class="scoreboard-identity"><span class="avatar"><img src="/assets/avatar-default.svg" alt=""/></span><strong id="match-name-b">玩家 B</strong></span><span id="match-clock-b" class="player-clock" hidden></span><div id="match-break-line-b" class="floating-break" hidden><span class="break-label">单杆</span><b id="match-break-b">0</b></div></div>
    </div></footer>`;
    document.documentElement.classList.add('battle-native-match');
    hud.slot='match-menu'; hud.classList.add('battle-menu-hud'); matchLayer.host.append(hud);
    const social=document.createElement('div'); social.className='battle-hud battle-social-hud'; social.slot='match-social'; matchLayer.host.append(social);
    const toastHost=document.createElement('div'); toastHost.className='battle-hud battle-toast-hud'; toastHost.slot='match-toast'; matchLayer.host.append(toastHost);
    const moveSocial=()=>{for(const node of [...hud.children]) {if(node.classList.contains('battle-social-toast')) toastHost.append(node); else if(node.classList.contains('battle-social-controls')||node.classList.contains('battle-social-menu')||node.classList.contains('battle-social-roster')) social.append(node);}};
    moveSocial();
    const socialObserver=new MutationObserver(moveSocial); socialObserver.observe(hud,{childList:true});
    const settings=document.createElement('button'); settings.id='battle-settings';settings.type='button';settings.textContent='游戏设置';hud.querySelector('.detail').prepend(settings);
    settings.onclick=()=>{
      matchNode('.game-menu').open=false;
      const settingsStore=window.SnookerPracticeSettings;
      confirmPanels ||= native.createPanels({onlineSettings:false,preferences:()=>settingsStore?.read?.()||{},notice:ui?.notice||showNotice,setPreference(key,value){const result=settingsStore?.set?.(key,value);if(result&&!result.persisted)showNotice('当前浏览器未能保存设置');}},{legacyEnabled:false});
      confirmPanels.settings();
    };
    for(const button of matchLayer.screen.querySelectorAll('[data-match-view]')) button.onclick=()=>{presentation?.setView?.(button.dataset.matchView);presentation?.requestFrame?.();paintedView='';paintMatchViews();};
    matchNode('#battle-fullscreen').onclick=()=>document.getElementById('trial-fullscreen')?.click();
    document.getElementById('trial-hud')?.setAttribute('aria-label','球局击球辅助');
    const resize=()=>{matchNode('.match-topbar').classList.toggle('mobile-game-chrome',window.ThreeTrialPageLayout?.device==='mobile');paintedView='';paintMatchViews();};
    const outside=event=>{if(!event.composedPath().includes(matchLayer.host)){matchNode('.game-menu').open=false;matchNode('.match-quick-chat').open=false;}};
    document.addEventListener('pointerdown',outside,true); window.addEventListener('resize',resize);
    presentationUnsubscribe=core?.subscribe?.(event=>{if(['settled','shot-start','reset'].includes(event?.type)||event?.type==='physics'&&event.events?.some(item=>['ball-potted','cue-ball-potted'].includes(item.type)))renderMatchPresentation();});
    presentationTimer=setInterval(updateMatchMetrics,250);
    matchLayer.host.hidden=false; matchLayer.resize(); resize(); renderMatchPresentation();
    window.addEventListener('pagehide',()=>{clearInterval(presentationTimer);presentationUnsubscribe?.();socialObserver.disconnect();document.removeEventListener('pointerdown',outside,true);window.removeEventListener('resize',resize);matchLayer.destroy();},{once:true});
  }

  function showNotice(value) {
    notice.textContent = value;
    notice.hidden = false;
    clearTimeout(noticeTimer);
    noticeTimer = setTimeout(() => { notice.hidden = true; }, 5000);
  }

  function updatePresenceBanner(isPresent, otherName) {
    if (room.yourSeat === 'spectator') {
      presenceBanner.hidden = true;
      return;
    }
    if (room.status === 'finished') {
      presenceBanner.hidden = true;
      remotePresent = isPresent;
      return;
    }
    if (remotePresent === isPresent) return;
    const firstCheck = remotePresent === null;
    remotePresent = isPresent;
    clearTimeout(presenceTimer);
    presenceBanner.classList.toggle('is-away', !isPresent);
    presenceBanner.querySelector('strong').textContent = isPresent ? `${otherName} 已进入球桌` : firstCheck ? `${otherName} 尚未进入球桌` : `${otherName} 已离开球桌`;
    presenceBanner.querySelector('span').textContent = isPresent ? '好友已上线，可以继续对战' : '球局仍在，好友回来时会提示';
    presenceBanner.hidden = false;
    if (isPresent) presenceTimer = setTimeout(() => { presenceBanner.hidden = true; }, 6000);
  }

  function render() {
    if (!room) {
      hud.querySelector('#battle-status').textContent = message;
      return;
    }
    const state = core?.networkPlaying() ? core.getState() : room.snapshot;
    document.documentElement.classList.toggle('battle-observer', room.status !== 'playing' || room.currentPlayerId !== room.yourSeat || pending);
    const players = state?.players || [];
    for (const seat of ['p1', 'p2']) {
      const suffix = seat === 'p1' ? 'a' : 'b';
      const player = players.find((p) => p.id === seat);
      hud.querySelector(`#battle-name-${suffix}`).textContent = room.players?.[seat] || (seat === 'p1' ? '玩家 A' : '玩家 B');
      hud.querySelector(`#battle-score-${suffix}`).textContent = String(player?.score ?? 0);
      hud.querySelector(`#battle-frames-${suffix}`).textContent = String(player?.frames ?? 0);
      const currentBreak = hud.querySelector(`#battle-break-${suffix}`);
      currentBreak.textContent = `单杆 ${player?.break ?? 0}`;
      currentBreak.hidden = !player?.break;
      hud.querySelector(`#battle-seat-${suffix}`).classList.toggle('turn',room.currentPlayerId === seat && room.status === 'playing');
    }
    hud.querySelector('#battle-frame-label').textContent = `第 ${Math.max(1, players.reduce((total, player) => total + (Number(player.frames) || 0), 0) + (state?.frameOver ? 0 : 1))} 局`;
    const status = hud.querySelector('#battle-status');
    if (pending && core?.isNetworkPredicting()) status.textContent = '球正在运动…';
    else if (pending) status.textContent = '正在同步局面…';
    else if (core?.networkPlaying()) status.textContent = '球正在运动…';
    else if (room.awaitingPlayers) status.textContent = '等待双方进入球桌…';
    else if (room.status === 'paused') status.textContent = room.pausedBy === room.yourSeat ? '你已暂停比赛' : `${room.players[room.pausedBy]} 暂停了比赛`;
    else if (room.status === 'frame-ended') status.textContent = '本局结束，准备下一局';
    else if (room.status === 'finished') {
      const winnerId = state?.ruleState?.lastRuleResult?.winnerId || room.snapshot?.ruleState?.lastRuleResult?.winnerId || room.match?.matchWinnerId || state?.lastRuleResult?.winnerId;
      const winner = players.find((p) => p.id === winnerId);
      status.textContent = winner ? `${winner.name || room.players[winner.id]} 获胜` : '本局结束';
    } else if (room.status !== 'playing') status.textContent = '等待双方准备';
    else status.textContent = room.currentPlayerId === room.yourSeat ? '你的回合' : `${room.players[room.currentPlayerId]} 的回合`;
    if (message && /失败|错误|断开|暂不可用/.test(message)) { status.textContent = message; status.classList.add('error'); }
    else status.classList.remove('error');
    const spectator = room.yourSeat === 'spectator';
    const otherSeat = room.yourSeat === 'p1' ? 'p2' : 'p1';
    const otherName = room.players[otherSeat];
    hud.querySelector('#battle-presence').textContent = spectator ? '观战中 · 可鼓掌' : room.playPresence?.[otherSeat] ? `${otherName} 在线` : `${otherName} 暂离球桌`;
    hud.querySelector('#battle-presence').classList.toggle('present', spectator || Boolean(room.playPresence?.[otherSeat]));
    hud.querySelector('#battle-presence').classList.toggle('away', !spectator && !room.playPresence?.[otherSeat]);
    hud.querySelector('#battle-room-link').href = spectator ? `/watch/${encodeURIComponent(id)}` : `/battle/${encodeURIComponent(id)}`;
    hud.querySelector('#battle-room-link').textContent = spectator ? '观战席' : '房间';
    const pauseButton = hud.querySelector('#battle-pause');
    pauseButton.hidden = spectator || room.status !== 'playing' && !(room.status === 'paused' && room.pausedBy === room.yourSeat);
    pauseButton.disabled = pending || room.busy || Boolean(core?.networkPlaying());
    pauseButton.textContent = room.status === 'paused' ? '继续' : '暂停';
    concede.hidden = !room.availableActions?.includes('concede');
    concede.disabled = pending || Boolean(core?.networkPlaying());
    const ended = ['frame-ended','finished'].includes(room.status) && initialized && !pending && !core?.networkPlaying() && localSeq >= room.shotSeq;
    endPanel.hidden = !ended;
    endPanel.querySelector('#battle-rematch').hidden = spectator || room.status !== 'finished';
    endPanel.querySelector('#battle-next-frame').hidden = !room.availableActions?.includes('next-frame');
    if (ended) endPanel.querySelector('#battle-end-result').textContent = status.textContent;
    window.StandaloneBattleActions?.render({room, core, ready: Boolean(initialized && localSeq === room.shotSeq && !pending && !core?.networkPlaying())});
    renderMatchPresentation(state);
  }

  async function heartbeat() {
    const ready = initialized && window.threeGame?.core === core && !window.threeGame.diagnostics().introActive && document.querySelector('#viewer.is-playing:not(.is-loading)');
    if (!ready || document.hidden || !room || room.yourSeat === 'spectator' || !['playing', 'paused', 'frame-ended', 'finished'].includes(room.status) || Date.now() - presenceSentAt < 5500) return;
    presenceSentAt = Date.now();
    try { await request(`${base}/presence`, { method: 'POST' }); }
    catch { /* 下一轮重试，连接错误由房间轮询显示。 */ }
  }

  async function setPause() {
    if (!room || room.yourSeat === 'spectator' || pending || core?.networkPlaying() || room.busy) return;
    const action = room.status === 'playing' ? 'pause' : 'resume';
    const button = hud.querySelector('#battle-pause');
    button.disabled = true;
    try {
      const next = await request(`${base}/pause`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) });
      if (applyRoom(next)) showNotice(action === 'pause' ? '比赛已暂停，只有你可以继续' : '比赛继续');
      render();
    } catch (error) { showNotice(error.message); await refresh(); }
    finally { button.disabled = false; }
  }

  async function rematch() {
    if (!room || room.yourSeat === 'spectator' || room.status !== 'finished') return;
    const button = endPanel.querySelector('#battle-rematch');
    button.disabled = true;
    button.textContent = '正在邀请…';
    try {
      const opponent = room.players[room.yourSeat === 'p1' ? 'p2' : 'p1'];
      const next = await request('/api/battle/rooms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ opponent, options: room.options }) });
      location.assign(`/battle/${encodeURIComponent(next.id)}`);
    } catch (error) { showNotice(error.message); button.disabled = false; button.textContent = '再来一局'; }
  }
  hud.querySelector('#battle-pause').addEventListener('click', () => { void setPause(); });
  endPanel.querySelector('#battle-next-frame').onclick = () => {void sendAction('next-frame');};
  endPanel.querySelector('#battle-rematch').addEventListener('click', () => { void rematch(); });

  async function request(path, init) {
    const requestStartedAt = performance.now();
    const response = await fetch(path, { credentials: 'same-origin', cache: 'no-store', ...init });
    const value = await response.json().catch(() => ({}));
    if (path === base || path === `${base}/presence`) presentationPing = performance.now() - requestStartedAt;
    if (!response.ok) {
      const error = new Error(value.error || `请求失败（${response.status}）`);
      error.status = response.status;
      throw error;
    }
    return value;
  }

  function play(packet) {
    if (!core || !packet || packet.shotSeq <= localSeq || Number(packet.finalSnapshot?.battle?.frameNumber || 1) < Number(room?.snapshot?.battle?.frameNumber || 1)) return;
    if (core.networkPlaying() && !core.isNetworkPredicting()) { queued.push(packet); return; }
    lastPacket = packet;
    if (packet.beforeSnapshot && !core.isNetworkPredicting()) core.receiveSnapshot(packet.beforeSnapshot);
    audio?.crowdAuthority?.(packet);
    core.receiveShot(packet);
    render();
  }

  async function catchUp() {
    if (!room || !core || !initialized || pending || packetLoading || core.networkPlaying() && !core.isNetworkPredicting()) return;
    const next = localSeq + 1;
    if (next > room.latestShotSeq || received.has(next)) return;
    packetLoading = true;
    let changedWhileLoading = false;
    try {
      const frameNumber = room.snapshot?.battle?.frameNumber || 1;
      const packet = await request(`${base}/shots/${next}`);
      if ((room.snapshot?.battle?.frameNumber || 1) !== frameNumber) {changedWhileLoading=true;return;}
      if (!Array.isArray(packet.frames) || !packet.frames.length || !packet.finalSnapshot) throw new Error('球路数据不完整');
      received.add(next);
      play(packet);
    } catch (error) { message = `球局同步失败：${error.message}`; render(); }
    finally { packetLoading = false; if (changedWhileLoading) void catchUp(); }
  }

  function applyRoom(next) {
      const oldTurn = room?.currentPlayerId;
      const frame = Number(next.snapshot?.battle?.frameNumber || 1), previousFrame = Number(room?.snapshot?.battle?.frameNumber || 1);
      if (room && (frame < previousFrame || frame === previousFrame && (next.shotSeq < room.shotSeq || next.shotSeq === room.shotSeq && Number(next.updatedAt) < Number(room.updatedAt) || next.shotSeq === room.shotSeq && next.updatedAt === room.updatedAt && Number(next.serverNow) < Number(room.serverNow)))) return false;
      const changedFrame = Number(next.snapshot?.battle?.frameNumber || 1) > Number(room?.snapshot?.battle?.frameNumber || 1);
      room = next; roomReceivedAt = performance.now();
      const difficulty = room.difficultyIds?.[room.yourSeat];
      if (core && difficulty && difficulty !== appliedDifficulty) { core.updateTuning({aim:window.SnookerTrialTuning.aimValues(difficulty)}); appliedDifficulty=difficulty; }
      message = '';
      const otherSeat = room.yourSeat === 'p1' ? 'p2' : 'p1';
      const isPresent = Boolean(room.playPresence?.[otherSeat]);
      updatePresenceBanner(isPresent, room.players[otherSeat]);
      if (core && changedFrame && room.snapshot) {
        core.cancelNetworkPlayback(); queued.length=0; remotePreviewId=null;
        core.receiveSnapshot(room.snapshot); appliedSnapshot=JSON.stringify(room.snapshot); localSeq=room.shotSeq; initialized=true;
      } else if (core && !initialized && room.snapshot) {
        core.receiveSnapshot(room.snapshot);
        appliedSnapshot = JSON.stringify(room.snapshot);
        localSeq = room.shotSeq;
        initialized = true;
      } else if (core && initialized && !pending && !core.networkPlaying() && room.shotSeq === localSeq && room.snapshot) {
        const signature = JSON.stringify(room.snapshot);
        if (signature !== appliedSnapshot) {
          core.receiveSnapshot(room.snapshot);
          appliedSnapshot = signature;
        }
      }
      if (oldTurn && oldTurn !== room.currentPlayerId && room.currentPlayerId === room.yourSeat) audio?.turn?.();
      render();
      void heartbeat();
      void catchUp();
      return true;
  }
  function previewShot(preview) {
    if (!room || !core || !initialized || preview.playerId === room.yourSeat || preview.expectedSeq !== localSeq ||
        preview.previewId === remotePreviewId || core.networkPlaying()) return;
    const roomFrame=room.snapshot?.battle?.frameNumber;
    if (core.previewNetworkShot?.(preview.input, preview.shotSeq)) {
      remotePreviewId=preview.previewId;
      audio?.crowdShot?.({ roomId: room.id, shotSeq: preview.shotSeq });
      window.dispatchEvent(new CustomEvent('battle-preview-started',{detail:{shotSeq:preview.shotSeq,receivedAt:performance.now(),serverCreatedAt:preview.createdAt,roomFrame}}));
      render();
    }
  }
  function cancelPreview(value) {
    if (value.previewId !== remotePreviewId || !core?.isNetworkPredicting()) return;
    core.cancelNetworkPrediction(); remotePreviewId=null; appliedSnapshot=null;
    if (room?.snapshot) core.receiveSnapshot(room.snapshot);
    render();
  }
  async function refresh() {
    if (polling) return;
    polling = true;
    try {
      const next = await request(base);
      applyRoom(next);
    } catch (error) {
      if (error.status === 403 && room?.yourSeat === 'spectator') {
        location.replace(`/watch/${encodeURIComponent(id)}`);
        return;
      }
      message = `连接断开：${error.message}`;
      render();
    }
    finally { polling = false; }
  }

  async function sendShot(input) {
    if (!room || room.status !== 'playing' || room.yourSeat !== room.currentPlayerId || pending || localSeq !== room.shotSeq) return false;
    pending = true; message = ''; queueMicrotask(render);
    audio?.crowdShot?.({ roomId: room.id, shotSeq: room.shotSeq + 1 });
    try {
      const result = await request(`${base}/shot`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ input, expectedSeq: room.shotSeq }) });
      if (!Array.isArray(result.packet?.frames) || !result.packet.frames.length || !result.packet.finalSnapshot) throw new Error('球路数据不完整');
      received.add(result.packet.shotSeq);
      pending = false;
      applyRoom(result.room);
      play(result.packet);
      render();
    } catch (error) {
      pending = false;
      if (room?.snapshot) { core.cancelNetworkPlayback(); core.receiveSnapshot(room.snapshot); localSeq=room.shotSeq; appliedSnapshot=JSON.stringify(room.snapshot); queued.length=0; remotePreviewId=null; }
      message = `击球失败：${error.message}`;
      render();
      await refresh();
    }
    return true;
  }

  async function sendAction(type, value) {
    const turnAction = !['concede','next-frame'].includes(type);
    if (!room || (type==='next-frame' ? room.status!=='frame-ended' : room.status!=='playing') || room.yourSeat==='spectator' || turnAction && room.yourSeat!==room.currentPlayerId || pending || core?.networkPlaying() || localSeq!==room.shotSeq) return false;
    pending = true; render();
    let failureMessage='';
    try {
      const result = await request(`${base}/action`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, value, expectedSeq: room.shotSeq }) });
      applyRoom(result.room || result);
      message = '';
    } catch (error) { failureMessage = `操作失败：${error.message}`; appliedSnapshot = null; void refresh(); }
    finally { pending = false; if (room) applyRoom(room); if (failureMessage) message=failureMessage; render(); }
    return true;
  }

  const preferences = { scoreVoiceMode: 'en', soundEnabled: true, cueTrajectoryVisible: true, tipMagnifierEnabled: true };
  window.SnookerOnline = {
    createConfig(_api, config) { return window.StandaloneBattleConfig || config; },
    attach(game) {
      core = game;
      core.attachNetwork({
        predictShots: true,
        isPractice: () => false,
        canOperate: () => Boolean(room && initialized && room.status === 'playing' && room.currentPlayerId === room.yourSeat && localSeq === room.shotSeq && !pending && (!room.availableActions || room.availableActions.includes('shot'))),
        pending: () => pending,
        shoot(input) { core.getState().shotSeq = room.shotSeq + 1; void sendShot(input); return true; },
        action(type, value) { void sendAction(type, value); return true; },
        playbackTime: () => Date.now(),
        completed(packet) {
          if (Number(packet.finalSnapshot?.battle?.frameNumber || 1) < Number(room?.snapshot?.battle?.frameNumber || 1)) {render();return;}
          localSeq = Math.max(localSeq, packet.shotSeq);
          appliedSnapshot = JSON.stringify(packet.finalSnapshot);
          lastPacket = null;
          render();
          const next = queued.shift();
          if (next) play(next);
          else void catchUp();
        },
      });
      void refresh();
      realtime = window.StandaloneBattleRealtime?.connect({roomId:id,onRoom:applyRoom,onPreview:previewShot,onPreviewCancelled:cancelPreview});
    },
    bindPresentation(options) { presentation = options; paintedView = ''; if (matchLayer) paintMatchViews(); },
    attachUI(ui) { attachMatchPresentation(ui); },
    attachAudio(value) { audio = value; },
    preferences: () => ({...preferences, ...window.SnookerPracticeSettings?.read()}),
    difficulty: () => room?.difficultyIds?.[room.yourSeat] || 'novice',
    isLocalPractice: () => false,
    practiceChanged() {},
    sendMatchState(reason, state) {
      if (reason !== 'cue-ball-placement') return;
      const cue = state?.balls?.find((ball) => ball.id === state.cueBallId);
      if (cue?.pos) void sendAction('placement', { x: cue.pos.x, y: cue.pos.y });
    },
    isObserver() {
      if (pending || core?.isNetworkPredicting() || core?.networkPlaying() && lastPacket?.playerId === room?.yourSeat) return false;
      return !room || room.status !== 'playing' || room.currentPlayerId !== room.yourSeat;
    },
    scoreboardBounds: () => ({ y: innerHeight, x: 0, width: innerWidth, height: 0 }),
    presentationReady: () => Boolean(room && initialized),
    cuePresentationReady: () => Boolean(room && initialized),
    aimPresentationReady: () => Boolean(room && initialized && !pending && !core?.isBusy()),
    canChooseView: () => true,
    canUseAimView: () => Boolean(room && initialized && !room.snapshot?.frameOver),
    getState: () => ({
      room: room && {...room, roomId: room.id, matchState: room.snapshot,
        matchSequence: 1 + (room.snapshot?.players || []).reduce((n, p) => n + (Number(p.frames) || 0), 0)},
      self: {role: room?.yourSeat === 'spectator' ? 'spectator' : 'player', playerId: room?.yourSeat},
      recovering: !initialized,
    }),
  };
  setInterval(() => {if (!realtime?.connected) void refresh();}, 1100);
  setInterval(() => {
    const deadline=room?.shotClock?.deadlineAt;
    clock.hidden=!deadline;
    if (deadline) {const serverTime=Number(room.serverNow)+(performance.now()-roomReceivedAt); clock.textContent=`出杆 ${Math.max(0,Math.ceil((deadline-serverTime)/1000))} 秒`;}
  },100);
  setInterval(() => { void heartbeat(); }, 1000);
  window.addEventListener('online', refresh);
  function leaveTable() {
    if (!room || room.yourSeat === 'spectator' || !['playing', 'paused', 'frame-ended', 'finished'].includes(room.status)) return;
    void fetch(`${base}/presence`, { method: 'POST', body: 'leave', credentials: 'same-origin', cache: 'no-store', keepalive: true }).catch(() => {});
  }
  window.addEventListener('pagehide', () => {realtime?.close();leaveTable();});
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) leaveTable();
    else { presenceSentAt = 0; void heartbeat(); void refresh(); }
  });
})();
