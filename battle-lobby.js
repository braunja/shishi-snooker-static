(() => {
  const body = document.body;
  const view = body.dataset.battleView;
  const message = document.getElementById('battle-message');
  const setMessage = (value) => { if (message) message.textContent = value; };
  async function request(path, init) {
    const response = await fetch(path, { cache: 'no-store', credentials: 'same-origin', ...init });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || `请求失败（${response.status}）`);
    return result;
  }
  if (view === 'create') {
    const activeList = document.getElementById('active-list');
    const watchActiveList = document.getElementById('watch-active-list');
    const watchReceivedList = document.getElementById('watch-received-list');
    const receivedList = document.getElementById('received-list');
    const sentList = document.getElementById('sent-list');
    let inboxSignature = '';
    let inboxLoading = false;
    function activeItem(item) {
      const row = document.createElement('div');
      row.className = 'invite-item';
      const info = document.createElement('div');
      info.className = 'invite-item-info';
      const name = document.createElement('strong');
      name.textContent = `与 ${item.host === body.dataset.player ? item.opponent : item.host} 的对战`;
      const state = document.createElement('small');
      state.textContent = item.status === 'paused' ? '比赛已暂停 · 球局保留' : '比赛进行中 · 可继续进入';
      info.append(name, state);
      const link = document.createElement('a');
      link.href = `/battle/${encodeURIComponent(item.id)}/play`;
      link.textContent = '返回球桌';
      row.append(info, link);
      return row;
    }
    function watchItem(item, accepted) {
      const row = document.createElement('div');
      row.className = 'invite-item';
      const info = document.createElement('div');
      info.className = 'invite-item-info';
      const name = document.createElement('strong');
      name.textContent = `${item.host} 邀请你观战`;
      const state = document.createElement('small');
      state.textContent = accepted ? (['playing', 'paused'].includes(item.matchStatus) ? '球局进行中 · 可鼓掌' : '已接受 · 等待开赛') : '等待你接受 · 无法操作比赛';
      info.append(name, state);
      if (accepted) {
        const link = document.createElement('a');
        link.href = ['playing', 'paused'].includes(item.matchStatus) ? `/battle/${encodeURIComponent(item.id)}/play` : `/watch/${encodeURIComponent(item.id)}`;
        link.textContent = ['playing', 'paused'].includes(item.matchStatus) ? '进入观战' : '查看观战席';
        row.append(info, link);
      } else {
        const actions = document.createElement('div');
        actions.className = 'invite-item-actions';
        for (const [action, label] of [['accept', '接受观战'], ['decline', '谢绝']]) {
          const button = document.createElement('button');
          button.type = 'button';
          button.textContent = label;
          if (action === 'decline') button.className = 'secondary';
          button.addEventListener('click', async () => {
            actions.querySelectorAll('button').forEach((element) => { element.disabled = true; });
            try {
              await request(`/api/battle/rooms/${encodeURIComponent(item.id)}/spectators`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }),
              });
              if (action === 'accept') location.assign(`/watch/${encodeURIComponent(item.id)}`);
              else { setMessage('已谢绝观战邀请。'); void refreshInvitations(); }
            } catch (error) { setMessage(error.message); actions.querySelectorAll('button').forEach((element) => { element.disabled = false; }); void refreshInvitations(); }
          });
          actions.append(button);
        }
        row.append(info, actions);
      }
      return row;
    }
    function inviteItem(item, incoming) {
      const row = document.createElement('div');
      row.className = 'invite-item';
      const info = document.createElement('div');
      info.className = 'invite-item-info';
      const name = document.createElement('strong');
      name.textContent = incoming ? `${item.host} 邀请你对战` : `邀请 ${item.opponent}`;
      const state = document.createElement('small');
      state.textContent = item.status === 'invited' ? (incoming ? '等待你接受' : '等待好友接受') : '已接受 · 等待双方准备';
      info.append(name, state);
      const actions = document.createElement('div');
      actions.className = 'invite-item-actions';
      if (incoming && item.status === 'invited') {
        for (const [action, label] of [['accept', '接受'], ['decline', '谢绝']]) {
          const button = document.createElement('button');
          button.type = 'button';
          button.textContent = label;
          if (action === 'decline') button.className = 'secondary';
          button.addEventListener('click', async () => {
            actions.querySelectorAll('button').forEach((element) => { element.disabled = true; });
            try {
              await request(`/api/battle/rooms/${encodeURIComponent(item.id)}/invite`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }),
              });
              if (action === 'accept') location.assign(`/battle/${encodeURIComponent(item.id)}`);
              else { setMessage('已谢绝邀请。'); void refreshInvitations(); }
            } catch (error) { setMessage(error.message); actions.querySelectorAll('button').forEach((element) => { element.disabled = false; }); void refreshInvitations(); }
          });
          actions.append(button);
        }
      } else {
        const link = document.createElement('a');
        link.href = `/battle/${encodeURIComponent(item.id)}`;
        link.textContent = '查看房间';
        actions.append(link);
      }
      row.append(info, actions);
      return row;
    }
    async function refreshInvitations() {
      if (inboxLoading) return;
      inboxLoading = true;
      try {
        const data = await request('/api/battle/invitations');
        const signature = JSON.stringify(data);
        if (signature === inboxSignature) return;
        inboxSignature = signature;
        const received = data.received || [];
        const sent = data.sent || [];
        const active = data.active || [];
        const watchActive = data.watchActive || [];
        const watchReceived = data.watchReceived || [];
        activeList.replaceChildren(...active.map(activeItem));
        document.getElementById('active-section').hidden = !active.length;
        watchActiveList.replaceChildren(...watchActive.map((item) => watchItem(item, true)));
        document.getElementById('watch-active-section').hidden = !watchActive.length;
        watchReceivedList.replaceChildren(...watchReceived.map((item) => watchItem(item, false)));
        document.getElementById('watch-received-section').hidden = !watchReceived.length;
        receivedList.replaceChildren(...received.map((item) => inviteItem(item, true)));
        if (!received.length) receivedList.textContent = '暂时没有邀请';
        const count = document.getElementById('received-count');
        const pendingCount = received.filter((item) => item.status === 'invited').length;
        count.hidden = !pendingCount;
        count.textContent = String(pendingCount);
        sentList.replaceChildren(...sent.map((item) => inviteItem(item, false)));
        document.getElementById('sent-section').hidden = !sent.length;
      } catch { if (!inboxSignature) receivedList.textContent = '邀请读取失败，稍后重试'; }
      finally { inboxLoading = false; }
    }
    void refreshInvitations();
    setInterval(() => { if (!document.hidden) void refreshInvitations(); }, 5000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) void refreshInvitations(); });
    document.getElementById('create-room')?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const button = form.querySelector('button');
      button.disabled = true;
      setMessage('正在创建房间…');
      try {
        const opponent = form.elements.opponent.value;
        const room = await request('/api/battle/rooms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ opponent, options: window.SnookerRoomOptions?.read() }) });
        location.assign(`/battle/${encodeURIComponent(room.id)}`);
      } catch (error) { setMessage(error.message); button.disabled = false; }
    });
    return;
  }
  if (view === 'watch') {
    const id = body.dataset.roomId;
    const path = `/api/battle/rooms/${encodeURIComponent(id)}`;
    const accept = document.getElementById('watch-accept');
    const decline = document.getElementById('watch-decline');
    const enter = document.getElementById('watch-enter');
    let loading = false;
    async function refreshWatch() {
      if (loading) return;
      loading = true;
      try {
        const data = await request(`${path}/watch`);
        document.getElementById('watch-host').textContent = `房主 ${data.host}`;
        document.getElementById('watch-opponent').textContent = `对手 ${data.opponent}`;
        const canAccept = data.status === 'invited' && ['invited', 'waiting', 'playing', 'paused'].includes(data.matchStatus);
        const canEnter = data.status === 'accepted' && ['playing', 'paused', 'frame-ended', 'finished'].includes(data.matchStatus);
        accept.hidden = decline.hidden = !canAccept;
        enter.hidden = !canEnter;
        document.getElementById('watch-description').textContent = canAccept ? `${data.host} 邀请你观看与 ${data.opponent} 的比赛。` : canEnter ? '观战席已开放，可以进入球桌观看。' : data.status === 'accepted' ? '已接受观战邀请，等待双方开赛。' : data.status === 'revoked' ? '房主已取消你的观战资格。' : data.status === 'declined' ? '你已谢绝这次观战邀请。' : data.status === 'expired' ? '观战邀请已过期。' : '这局比赛已结束。';
      } catch (error) { setMessage(error.message); }
      finally { loading = false; }
    }
    for (const [button, action] of [[accept, 'accept'], [decline, 'decline']]) {
      button.addEventListener('click', async () => {
        accept.disabled = decline.disabled = true;
        try {
          await request(`${path}/spectators`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) });
          setMessage(action === 'accept' ? '已接受观战邀请。' : '已谢绝观战邀请。');
          await refreshWatch();
        } catch (error) { setMessage(error.message); }
        finally { accept.disabled = decline.disabled = false; }
      });
    }
    void refreshWatch();
    setInterval(() => { if (!document.hidden) void refreshWatch(); }, 3000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) void refreshWatch(); });
    return;
  }
  if (view !== 'room') return;
  const id = body.dataset.roomId;
  const path = `/api/battle/rooms/${encodeURIComponent(id)}`;
  let roomPresenceSentAt = 0;
  async function roomHeartbeat() {
    if (document.hidden || Date.now() - roomPresenceSentAt < 5500) return;
    roomPresenceSentAt = Date.now();
    try { await request(`${path}/presence`, { method: 'POST', body: 'room' }); }
    catch { /* 房间轮询会显示连接错误。 */ }
  }
  function leaveRoom() {
    void fetch(`${path}/presence`, { method: 'POST', body: 'room-leave', credentials: 'same-origin', cache: 'no-store', keepalive: true }).catch(() => {});
  }
  const invite = document.getElementById('invite-link');
  invite.value = location.href;
  document.getElementById('copy-invite')?.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(invite.value); setMessage('邀请链接已复制，发给房间指定的好友即可。'); }
    catch { invite.select(); setMessage('已选中邀请链接，请手动复制。'); }
  });
  const ready = document.getElementById('ready-room');
  const accept = document.getElementById('accept-invite');
  const decline = document.getElementById('decline-invite');
  const cancel = document.getElementById('cancel-invite');
  const pause = document.getElementById('pause-room');
  const rematch = document.getElementById('rematch-room');
  const notice = document.getElementById('room-notice');
  const spectatorSection = document.getElementById('spectator-section');
  const spectatorForm = document.getElementById('invite-spectator');
  const spectatorAccount = document.getElementById('spectator-account');
  const spectatorList = document.getElementById('spectator-list');
  let roomData = null;
  let previousStatus = null;
  let previousFriendPresence = null;
  let spectatorLoading = false;
  async function refreshSpectators() {
    if (spectatorLoading || !roomData) return;
    spectatorLoading = true;
    try {
      const data = await request(`${path}/spectators`);
      const active = ['invited', 'waiting', 'playing', 'paused'].includes(roomData.status);
      const visible = (data.spectators || []).filter((item) => ['invited', 'accepted'].includes(item.status));
      const isHost = roomData.yourSeat === 'p1';
      spectatorSection.hidden = !isHost && !visible.length;
      spectatorForm.hidden = !isHost || !active || !(data.candidates || []).length;
      const selected = spectatorAccount.value;
      spectatorAccount.replaceChildren(...(data.candidates || []).map((username) => {
        const option = document.createElement('option');
        option.value = username;
        option.textContent = username;
        return option;
      }));
      if ((data.candidates || []).includes(selected)) spectatorAccount.value = selected;
      spectatorList.replaceChildren(...visible.map((item) => {
        const row = document.createElement('div');
        row.className = 'invite-item';
        const info = document.createElement('div');
        info.className = 'invite-item-info';
        const name = document.createElement('strong');
        name.textContent = item.username;
        const status = document.createElement('small');
        status.textContent = item.status === 'accepted' ? '正在观战 · 可鼓掌' : '邀请已发出 · 等待接受';
        info.append(name, status);
        row.append(info);
        if (isHost) {
          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'secondary';
          button.textContent = item.status === 'accepted' ? '移出观战' : '取消邀请';
          button.addEventListener('click', async () => {
            button.disabled = true;
            try {
              await request(`${path}/spectators`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'revoke', username: item.username }) });
              setMessage(`已移出 ${item.username}。`);
              await refreshSpectators();
            } catch (error) { setMessage(error.message); button.disabled = false; }
          });
          row.append(button);
        }
        return row;
      }));
      if (!visible.length) spectatorList.textContent = '暂时没有观众。';
    } catch (error) { if (spectatorSection.hidden === false) spectatorList.textContent = `观战席读取失败：${error.message}`; }
    finally { spectatorLoading = false; }
  }
  spectatorForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = spectatorForm.querySelector('button');
    button.disabled = true;
    try {
      await request(`${path}/spectators`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'invite', username: spectatorAccount.value }) });
      setMessage(`已向 ${spectatorAccount.value} 发出观战邀请。`);
      await refreshSpectators();
    } catch (error) { setMessage(error.message); }
    finally { button.disabled = false; }
  });
  function showRoomNotice(value, away, pulse) {
    notice.textContent = value;
    notice.hidden = false;
    notice.classList.toggle('is-away', away);
    if (pulse) {
      notice.classList.remove('is-fresh');
      void notice.offsetWidth;
      notice.classList.add('is-fresh');
    }
  }
  for (const [button, action] of [[accept, 'accept'], [decline, 'decline'], [cancel, 'cancel']]) {
    button.addEventListener('click', async () => {
      accept.disabled = decline.disabled = cancel.disabled = true;
      try {
        await request(`${path}/invite`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) });
        await refresh();
      } catch (error) { setMessage(error.message); void refresh(); }
      finally { accept.disabled = decline.disabled = cancel.disabled = false; }
    });
  }
  let posting = false;
  ready.addEventListener('click', async () => {
    if (posting) return;
    posting = true; ready.disabled = true; setMessage('正在准备…');
    try { await request(`${path}/ready`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }); await refresh(); }
    catch (error) { setMessage(error.message); }
    finally { posting = false; ready.disabled = false; }
  });
  pause.addEventListener('click', async () => {
    if (!roomData || posting) return;
    const action = roomData.status === 'paused' ? 'resume' : 'pause';
    posting = true; pause.disabled = true;
    try {
      await request(`${path}/pause`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) });
      await refresh();
    } catch (error) { setMessage(error.message); }
    finally { posting = false; pause.disabled = false; }
  });
  rematch.addEventListener('click', async () => {
    if (!roomData || roomData.status !== 'finished' || posting) return;
    posting = true; rematch.disabled = true; setMessage('正在邀请好友再来一局…');
    try {
      const opponent = roomData.players[roomData.yourSeat === 'p1' ? 'p2' : 'p1'];
      const next = await request('/api/battle/rooms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ opponent, options: roomData.options }) });
      location.assign(`/battle/${encodeURIComponent(next.id)}`);
    } catch (error) { setMessage(error.message); posting = false; rematch.disabled = false; }
  });
  async function refresh() {
    try {
      const room = await request(path);
      const firstRoom = !roomData;
      roomData = room;
      if (firstRoom) void refreshSpectators();
      const friendSeat = room.yourSeat === 'p1' ? 'p2' : 'p1';
      const friend = room.players[friendSeat];
      const friendPresent = Boolean((room.status === 'invited' || room.status === 'waiting' ? room.roomPresence : room.playPresence)?.[friendSeat]);
      if (room.status === 'invited') showRoomNotice(room.yourSeat === 'p2' ? '✓ 你已进入房间，请处理邀请' : friendPresent ? `✓ ${friend} 已打开房间，等待回应` : `! 等待 ${friend} 打开邀请`, room.yourSeat === 'p1' && !friendPresent, previousStatus !== 'invited' || previousFriendPresence !== friendPresent);
      else if (room.status === 'waiting') showRoomNotice(friendPresent ? `✓ ${friend} 在房间，等待双方准备` : `! ${friend} 暂未在房间，等待返回`, !friendPresent, previousStatus !== 'waiting' || previousFriendPresence !== friendPresent);
      else if (room.status === 'playing' || room.status === 'paused') showRoomNotice(friendPresent ? `✓ ${friend} 已进入球桌` : `! ${friend} 暂时离开球桌，等待返回`, !friendPresent, previousStatus !== room.status || previousFriendPresence !== friendPresent);
      else notice.hidden = true;
      previousStatus = room.status;
      previousFriendPresence = friendPresent;
      document.querySelector('.panel h1').textContent = room.status === 'invited' ? (room.yourSeat === 'p2' ? '收到对战邀请' : '等待好友接受')
        : room.status === 'playing' ? '对战已开始' : room.status === 'paused' ? '对战已暂停' : room.status === 'finished' ? '对战已结束'
        : room.status === 'waiting' ? '等待双方准备' : '邀请已结束';
      const seatState = (seat) => room.status === 'invited' && seat === 'p2' ? (room.roomPresence?.p2 ? '正在查看邀请' : '等待接受') : room.status === 'waiting' ? `${room.roomPresence?.[seat] ? '房间在线' : '暂离房间'} · ${room.ready[seat] ? '已准备' : '未准备'}`
        : ['playing', 'paused', 'frame-ended', 'finished'].includes(room.status) ? (room.playPresence?.[seat] ? '在球桌' : '暂未在球桌') : '邀请已结束';
      document.getElementById('player-p1').innerHTML = `${escapeText(room.players.p1)} <span>${seatState('p1')}</span>`;
      document.getElementById('player-p2').innerHTML = `${escapeText(room.players.p2)} <span>${seatState('p2')}</span>`;
      document.getElementById('room-description').textContent = room.status === 'invited' ? (room.yourSeat === 'p2'
        ? `${room.players.p1} 邀请你打一局。接受后进入准备阶段。`
        : `已邀请 ${room.players.p2}。对方用自己的账号打开网站就能看到邀请。`)
        : room.status === 'playing' ? '双方已准备好，可以进入球桌。'
        : room.status === 'paused' ? `${room.players[room.pausedBy]} 已暂停比赛，暂停者点击“继续比赛”后恢复。`
        : room.status === 'waiting' ? (room.yourSeat === 'p1' ? `${friend} 已接受邀请，双方准备好后即可开赛。` : '你已接受邀请，双方准备好后即可开赛。')
        : room.status === 'finished' ? '这一局已结束，可以查看球桌结果，或邀请好友再来一局。'
        : '这张邀请已不能加入，可以返回好友对战重新邀请。';
      accept.hidden = room.status !== 'invited' || room.yourSeat !== 'p2';
      decline.hidden = accept.hidden;
      cancel.hidden = room.status !== 'invited' || room.yourSeat !== 'p1';
      ready.hidden = room.status !== 'waiting' || room.ready[room.yourSeat];
      pause.hidden = room.status !== 'playing' && !(room.status === 'paused' && room.pausedBy === room.yourSeat);
      pause.disabled = posting || room.busy;
      pause.textContent = room.status === 'paused' ? '继续比赛' : '暂停比赛';
      document.getElementById('enter-game').hidden = !['playing', 'paused', 'frame-ended', 'finished'].includes(room.status);
      rematch.hidden = room.status !== 'finished';
      if (room.status === 'invited') setMessage(room.yourSeat === 'p1' ? '邀请已保存，也可以复制链接发给好友。' : '点击接受邀请进入房间，或选择谢绝。');
      else if (room.status === 'waiting') setMessage(room.ready[room.yourSeat] ? '你已准备，等待好友。' : '点击准备，等待好友准备。');
      else if (room.status === 'playing') setMessage('对战已开始。');
      else if (room.status === 'paused') setMessage(room.pausedBy === room.yourSeat ? '你已暂停比赛，准备好后点击继续。' : `正在等待 ${friend} 继续比赛。`);
      else if (room.status === 'finished') setMessage('这一局已结束，可以再来一局或返回主页。');
      else setMessage(room.status === 'declined' ? '好友已谢绝邀请。' : room.status === 'cancelled' ? '邀请已取消。' : '邀请已过期。');
    } catch (error) { setMessage(error.message); }
  }
  function escapeText(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  }
  void roomHeartbeat();
  refresh();
  setInterval(refresh, 1500);
  setInterval(() => { if (!document.hidden) void refreshSpectators(); }, 5000);
  setInterval(() => { void roomHeartbeat(); }, 6000);
  window.addEventListener('pagehide', leaveRoom);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) leaveRoom();
    else { roomPresenceSentAt = 0; void roomHeartbeat(); void refresh(); }
  });
})();
