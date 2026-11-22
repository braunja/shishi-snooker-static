(() => {
  const host = document.getElementById('room-config');
  if (!host) return;
  const defaults={difficulty:'进阶',opponentDifficulty:'进阶',reds:15,frames:'不限',clock:30};
  let settings={...defaults};try{settings={...settings,...JSON.parse(localStorage.getItem('snooker-product-room-options')||'{}')};}catch{}
  const frames=['不限',...Array.from({length:18},(_,i)=>1+i*2)];
  const groups=[['difficulty','你的难度',['新手','进阶','职业','大师','无线']],['opponentDifficulty','对手难度',['新手','进阶','职业','大师','无线']],['reds','红球数量',[6,10,15]],['frames','局数',frames],['clock','出杆限时',[0,60,45,30,20,15,10]]];
  for(const[key,,values]of groups)if(!values.includes(settings[key]))settings[key]=defaults[key];
  const save=()=>{try{localStorage.setItem('snooker-product-room-options',JSON.stringify(settings));}catch{}};
  function render(){
    host.innerHTML=groups.map(([key,label,values])=>key==='frames'?`<div class="room-option"><strong>${label}</strong><div class="room-stepper"><button type="button" data-frames="-1" aria-label="减少局数" ${frames.indexOf(settings.frames)===0?'disabled':''}>‹</button><output aria-live="polite">${settings.frames==='不限'?'不限局数':settings.frames+' 局 '+Math.ceil(settings.frames/2)+' 胜'}</output><button type="button" data-frames="1" aria-label="增加局数" ${frames.indexOf(settings.frames)===frames.length-1?'disabled':''}>›</button></div></div>`:`<div class="room-option"><strong>${label}</strong><div class="room-choice" role="group" aria-label="${label}">${values.map(v=>`<button type="button" data-option="${key}" data-value="${v}" aria-pressed="${settings[key]===v}" class="${settings[key]===v?'active':''}">${key==='clock'&&v===0?'不限':v}${key==='clock'&&v!==0?' 秒':key==='reds'?' 红球':''}</button>`).join('')}</div></div>`).join('');
    host.querySelectorAll('[data-option]').forEach(button=>button.onclick=()=>{settings[button.dataset.option]=['difficulty','opponentDifficulty'].includes(button.dataset.option)?button.dataset.value:Number(button.dataset.value);save();render();});
    host.querySelectorAll('[data-frames]').forEach(button=>button.onclick=()=>{settings.frames=frames[Math.max(0,Math.min(frames.length-1,frames.indexOf(settings.frames)+Number(button.dataset.frames)))];save();render();});
  }
  window.SnookerRoomOptions={read:()=>({...settings})};render();
})();
