(() => {
  if (location.pathname === '/battle') return;
  const currentRoom = location.pathname.match(/^\/(?:battle\/([0-9a-f]{32})(?:\/play)?|watch\/([0-9a-f]{32}))$/)?.slice(1).find(Boolean);
  const dismissed = new Set();
  const seenAccepted = new Set();
  try { JSON.parse(sessionStorage.getItem('dismissedBattleInvites') || '[]').forEach((id) => dismissed.add(id)); }
  catch { /* Notifications still work without session storage. */ }
  try { JSON.parse(sessionStorage.getItem('seenAcceptedBattleInvites') || '[]').forEach((id) => seenAccepted.add(id)); }
  catch { /* Accepted notices still work without session storage. */ }
  let toast = null;
  let shownId = '';
  let shownAccepted = false;
  let shownWatch = false;
  let polling = false;

  function show(invitation, accepted = false, watch = false) {
    if (!toast) {
      toast = document.createElement('aside');
      toast.className = 'invite-toast';
      toast.setAttribute('role', 'status');
      const title = document.createElement('strong');
      title.textContent = '好友对战邀请';
      const description = document.createElement('p');
      const actions = document.createElement('div');
      const join = document.createElement('a');
      join.textContent = '查看邀请';
      const later = document.createElement('button');
      later.type = 'button';
      later.textContent = '稍后';
      later.addEventListener('click', () => {
        dismissed.add(shownId);
        try { sessionStorage.setItem('dismissedBattleInvites', JSON.stringify([...dismissed])); }
        catch { /* Dismissing this toast still works. */ }
        toast.hidden = true;
      });
      actions.append(join, later);
      toast.append(title, description, actions);
      document.body.append(toast);
    }
    const key = watch ? `watch:${invitation.id}` : invitation.id;
    if (shownId === key && shownAccepted === accepted && shownWatch === watch && !toast.hidden) return;
    shownId = key;
    shownAccepted = accepted;
    shownWatch = watch;
    toast.querySelector('strong').textContent = watch ? '好友观战邀请' : accepted ? '好友已进房间' : '好友对战邀请';
    toast.querySelector('p').textContent = watch ? `${invitation.host} 邀请你观战` : accepted ? `${invitation.opponent} 已接受邀请，进入房间` : `${invitation.host} 邀请你对战`;
    toast.querySelector('a').href = watch ? `/watch/${encodeURIComponent(invitation.id)}` : `/battle/${encodeURIComponent(invitation.id)}`;
    toast.querySelector('a').textContent = watch ? '查看观战邀请' : accepted ? '查看房间' : '查看邀请';
    toast.hidden = false;
  }

  async function poll() {
    if (polling || document.hidden) return;
    polling = true;
    try {
      const response = await fetch('/api/battle/invitations', { credentials: 'same-origin', cache: 'no-store' });
      if (!response.ok) return;
      const data = await response.json();
      const next = (data.received || []).find((item) => item.status === 'invited' && item.id !== currentRoom && !dismissed.has(item.id));
      const nextWatch = (data.watchReceived || []).find((item) => item.id !== currentRoom && !dismissed.has(`watch:${item.id}`));
      const accepted = (data.sent || []).find((item) => item.status === 'waiting' && item.id !== currentRoom && (!seenAccepted.has(item.id) || shownAccepted && shownId === item.id && !toast?.hidden));
      if (next) show(next);
      else if (nextWatch) show(nextWatch, false, true);
      else if (accepted) {
        if (!seenAccepted.has(accepted.id)) {
          seenAccepted.add(accepted.id);
          try { sessionStorage.setItem('seenAcceptedBattleInvites', JSON.stringify([...seenAccepted])); }
          catch { /* This tab still shows the accepted notice once. */ }
        }
        show(accepted, true);
      }
      else if (toast) toast.hidden = true;
    } catch { /* A lost connection should not interrupt the game. */ }
    finally { polling = false; }
  }

  void poll();
  setInterval(poll, 5000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) void poll(); });
})();
