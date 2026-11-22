const app = document.getElementById('app');
let session;
let roomTimer;
const el = (tag, text, cls) => {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (cls) node.className = cls;
  return node;
};
function link(text, href, cls = 'button secondary') {
  const a = el('a', text, cls); a.href = href; return a;
}
function button(text, action, cls = '') {
  const b = el('button', text, cls); b.type = 'button';
  b.addEventListener('click', async () => {
    b.disabled = true;
    try { await action(); } catch (error) { notice(error.message, true); }
    finally { if (b.isConnected) b.disabled = false; }
  });
  return b;
}
async function api(path, body) {
  const response = await fetch(path, {cache:'no-store', ...(body === undefined ? {} : {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body)})});
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || '暂时无法连接球房');
  return result;
}
function notice(text, error = false) {
  let node = document.getElementById('notice');
  if (!node) { node = el('p', '', 'local-notice'); node.id = 'notice'; node.setAttribute('role', 'status'); document.getElementById('screen').append(node); }
  node.textContent = text; node.classList.toggle('error', error); node.hidden = false;
  clearTimeout(notice.timer); notice.timer = setTimeout(() => {node.hidden = true;}, 5000);
}
function showPage(title) {
  const page = el('section', undefined, 'page local-page'), head = el('header', undefined, 'page-header');
  const back = link('‹', '/', 'page-back-icon'); back.setAttribute('aria-label', '返回大厅');
  head.append(back, el('h1', title)); const content = el('div', undefined, 'page-content');
  page.append(head, content); app.replaceChildren(page); return content;
}
function information(title, text) {
  const dialog = ProductViews.createDialog('local-information', {title, body:'<p></p>'});
  dialog.querySelector('.dialog-body p').textContent = text;
}
function editProfile() {
  const dialog = ProductViews.createDialog('local-profile', {title:'个人资料'});
  dialog.querySelector('.dialog-body').append(profile());
  if (session.isAdmin) dialog.querySelector('.dialog-body').append(link('账号管理', '/manage', 'standard-action'));
}
function profile() {
  const form = el('form', undefined, 'profile');
  const label = el('label', '球友昵称'); label.htmlFor = 'player-name';
  const input = el('input'); input.id = 'player-name'; input.value = session.name; input.maxLength = 24; input.required = true; input.autocomplete = 'nickname';
  const save = el('button', '保存', 'secondary'); save.type = 'submit';
  input.readOnly = Boolean(session.readOnly); save.hidden = Boolean(session.readOnly);
  form.append(label, input, save);
  form.addEventListener('submit', async event => {
    event.preventDefault(); save.disabled = true;
    if (session.readOnly) return;
    try {
      session = await api('/api/session', {name:input.value.trim()});
      const name = app.querySelector('.identity-name'); if (name) name.textContent = session.name;
      notice('昵称已保存');
    }
    catch (error) { notice(error.message, true); }
    finally { save.disabled = false; }
  });
  return form;
}
async function share(path) {
  const url = new URL(path, location.origin).href;
  try { await navigator.clipboard.writeText(url); notice('邀请链接已复制，发给好友即可加入'); }
  catch {
    const dialog = ProductViews.createDialog('local-invite', {title:'邀请好友'});
    const value = el('textarea'); value.value = url; value.readOnly = true;
    value.setAttribute('aria-label', '邀请链接');
    dialog.querySelector('.dialog-body').append(value); value.focus(); value.select();
  }
}
let homeTemplate;
async function home() {
  if (!homeTemplate) {
    const response = await fetch('/lobby-template.html');
    if (!response.ok) throw Error('大厅资源加载失败');
    homeTemplate = await response.text();
  }
  app.innerHTML = homeTemplate;
  app.querySelector('.identity-name').textContent = session.name;
  app.querySelector('[data-profile]').onclick = editProfile;
  app.querySelector('[data-game="0"]').onclick = () => location.assign('/practice');
  app.querySelector('[data-game="1"]').onclick = async event => {
    if (session.mode === 'hosted') { location.assign('/battle'); return; }
    const button = event.currentTarget; button.disabled = true;
    try {const room = await api('/api/battle/rooms', {}); location.assign(`/battle/${room.id}`);}
    catch(error) {notice(error.message, true); button.disabled = false;}
  };
  app.querySelector('[data-game="2"]').onclick = () => location.assign('/computer');
  app.querySelector('[data-roster]').onclick = records;
  app.querySelector('[data-network]').onclick = async () => {
    const started = performance.now();
    try {await api('/health'); information('网络状态', `连接正常 · 延时 ${Math.round(performance.now()-started)} ms`);}
    catch {information('网络状态', '连接已断开，请检查网络。');}
  };
  if (location.hash === '#replays') await records();
}
async function records() {
  const content = showPage('比赛记录');
  const roomPanel = el('section', undefined, 'panel'); roomPanel.append(el('h2', '我的球房'));
  const rooms = (await api('/api/battle/rooms')).rooms;
  for (const room of rooms) {
    const row = el('div', undefined, 'row'), name = el('div'); name.append(el('strong', `${room.players.p1} · ${room.players.p2 || '等待好友'}`), el('p', room.status === 'playing' ? '球局进行中' : room.status === 'finished' ? '球局已结束' : '等待双方准备'));
    const actions = el('div', undefined, 'actions'); actions.append(link('进入球房', `/battle/${room.id}`));
    if (room.inviteUrl && !room.ready.p2) actions.append(button('邀请好友', () => share(room.inviteUrl), 'secondary'));
    row.append(name, actions); roomPanel.append(row);
  }
  if (!rooms.length) roomPanel.append(el('p', '还没有球房，点击好友对战即可创建。', 'empty'));
  content.append(roomPanel);
  const replayPanel = el('section', undefined, 'panel'); replayPanel.id = 'replays'; replayPanel.append(el('h2', '我的回放'));
  const replays = (await api('/api/practice-replays')).replays;
  for (const replay of replays) {
    const row = el('div', undefined, 'row');
    row.append(el('span', `${new Date(replay.createdAt).toLocaleString('zh-CN')} · ${replay.shots} 杆`), link('查看回放', `/practice?replay=${replay.id}`)); replayPanel.append(row);
  }
  if (!replays.length) replayPanel.append(el('p', '练球后保存回放，就能在这里重温。', 'empty'));
  content.append(replayPanel);
  if (location.hash === '#replays') replayPanel.scrollIntoView();
}
async function room(id) {
  const state = await api(`/api/battle/rooms/${id}`);
  const content = showPage('好友球房');
  const panel = el('section', undefined, 'panel'), players = el('div', undefined, 'players');
  for (const [index, seat] of ['p1','p2'].entries()) {
    if (index) players.append(el('span', 'VS', 'vs'));
    const player = el('div', undefined, 'player');
    player.append(el('strong', state.players[seat] || '等待好友'), el('span', state.ready[seat] ? '已准备 ✓' : '未准备', 'muted')); players.append(player);
  }
  const actions = el('div', undefined, 'room-actions');
  if (['playing','paused','finished'].includes(state.status)) actions.append(link('进入球桌', `/battle/${id}/play`, 'button'));
  else {
    const ready = button(state.ready[state.yourSeat] ? '取消准备' : '准备好了', async () => {await api(`/api/battle/rooms/${id}/ready`, {ready:!state.ready[state.yourSeat]}); await room(id);});
    actions.append(ready);
  }
  panel.append(players, actions);
  if (state.inviteUrl) {
    const invite = el('div', undefined, 'invite'); invite.append(button('复制邀请链接', () => share(state.inviteUrl), 'secondary'), el('p', '把链接发给好友，在另一台设备打开后加入。')); panel.append(invite);
  }
  content.append(panel, el('p', state.status === 'playing' ? '双方已准备，可以进入球桌。' : '双方准备后，即可开始对战。', 'muted'));
}
async function join(id, invite) {
  const content = showPage('好友对战');
  const panel = el('section', undefined, 'panel centered'); panel.append(el('h1', '好友邀你来一局'), el('p', '设置昵称，加入私人球房。'), profile());
  panel.append(button('加入球房', async () => {
    const name = document.getElementById('player-name').value.trim();
    if (name !== session.name) session = await api('/api/session', {name});
    await api(`/api/battle/rooms/${id}/join`, {invite});
    location.replace(`/battle/${id}`);
  }));
  content.append(panel);
}
try {
  session = await api('/api/session');
  const match = /^\/(battle|join)\/([a-f0-9]{32})\/?$/.exec(location.pathname);
  if (match?.[1] === 'join') await join(match[2], new URLSearchParams(location.search).get('invite') || '');
  else if (match?.[1] === 'battle') {
    await room(match[2]); roomTimer = setInterval(() => room(match[2]).catch(error => notice(error.message, true)), 1800);
  } else await home();
} catch (error) { notice(error.message, true); }
window.addEventListener('pagehide', () => clearInterval(roomTimer), {once:true});
