const POWER_COLORS = ['#30b868', '#e2c52b', '#ed861f', '#d32029'];
// Equal intervals at effective power 0, 100/3, 200/3 and 100; one color for the whole fill.
export function effectivePowerColor(power) {
  const position = Math.max(0, Math.min(100, Number(power) || 0)) / 100 * (POWER_COLORS.length - 1);
  const index = Math.min(POWER_COLORS.length - 2, Math.floor(position));
  const fraction = position - index;
  const channels = color => [1, 3, 5].map(offset => parseInt(color.slice(offset, offset + 2), 16));
  const from = channels(POWER_COLORS[index]), to = channels(POWER_COLORS[index + 1]);
  return '#' + from.map((value, channel) => Math.round(value + (to[channel] - value) * fraction).toString(16).padStart(2, '0')).join('');
}

// Display only: raw pull power remains the sole input to the shot solver.
export function createEffectivePowerBar(anchor, control = null, onRelease = () => {}, options = {}) {
  const root = document.createElement('div');
  root.className = 'effective-power';
  root.hidden = true;
  root.innerHTML = `<div class="effective-power-track" role="meter" aria-label="有效力度" aria-valuemin="0" aria-valuemax="100">
      <div class="effective-power-fill"></div><div class="effective-power-loss"></div>
      <div class="effective-power-ticks" aria-hidden="true">${Array.from({length:9},(_,i)=>`<i style="left:${(i+1)*10}%"></i>`).join('')}</div>
    </div>`;
  const value=options.showValue?document.createElement('output'):null;
  if(value){value.className='effective-power-value';root.querySelector('.effective-power-track').append(value);}
  anchor.parentElement.append(root);
  // Track toolbar height/wrapping without reading layout on every render frame.
  const position = () => {
    const rect = anchor.getBoundingClientRect();
    root.style.bottom = `${Math.max(12, window.innerHeight - rect.top + 10)}px`;
  };
  const resizeObserver = new ResizeObserver(position);
  if(!options.layout)resizeObserver.observe(anchor);
  if(!options.layout){window.addEventListener('resize', position);position();}
  let layoutKey='';
  const track = root.querySelector('.effective-power-track');
  const fill = root.querySelector('.effective-power-fill');
  const loss = root.querySelector('.effective-power-loss');
  let last = '';
  let released = false;
  let pointerId = null;
  const hide = () => { pointerId = null; root.hidden = true; if(options.layout)root.style.display='none'; released = true; };
  const begin = event => {
    if (pointerId !== null || (event.button !== undefined && event.button !== 0 && event.button !== 2)) return;
    pointerId = event.pointerId; released = false;
  };
  const release = event => {
    if (pointerId === null || event.pointerId !== pointerId) return;
    pointerId = null;
    hide();
    onRelease();
  };
  // Capture release before any game/shot processing. A late UI frame must not
  // reopen the meter using the previous pull state.
  control?.addEventListener('pointerdown', begin, true);
  control?.addEventListener('lostpointercapture', release, true);
  window.addEventListener('pointerup', release, true);
  window.addEventListener('pointercancel', release, true);
  return {
    begin,
    hide,
    dispose() { control?.removeEventListener('pointerdown', begin, true); control?.removeEventListener('lostpointercapture', release, true); window.removeEventListener('pointerup', release, true); window.removeEventListener('pointercancel', release, true); resizeObserver.disconnect(); window.removeEventListener('resize', position); root.remove(); },
    update(rawPower, effectivePower, pulling = false) {
      if(value){
        const size=options.valueFontSize?.()||35.2;
        const fontSize=size+'px';if(value.style.fontSize!==fontSize)value.style.fontSize=fontSize;
      }
      const cap=Math.max(1,Math.min(100,Number(options.maxPower?.())||100));
      const baseRect=options.layout?.();
      const rect=baseRect?{...baseRect,width:baseRect.width*cap/100}:null;
      const ticks=root.querySelector('.effective-power-ticks');
      if(track.getAttribute('aria-valuemax')!==String(cap)){
        track.setAttribute('aria-valuemax',String(cap));
        ticks.innerHTML=Array.from({length:Math.max(0,Math.ceil(cap/10)-1)},(_,i)=>`<i style="left:${(i+1)*10/cap*100}%"></i>`).join('');
        if(!options.layout){root.style.width=cap===100?'':`calc(clamp(210px, 33vw, 600px) * ${cap/100})`;root.style.left='50%';root.style.transform='translateX(-50%)';}
      }
      const preview=Boolean(rect?.preview);
      if(value){const radius=(8*(rect?.height??57)/57)+'px';if(root.style.getPropertyValue('--power-corner-radius')!==radius)root.style.setProperty('--power-corner-radius',radius);}
      if(options.layout){
        const key=JSON.stringify(rect);
        if(key!==layoutKey&&rect){layoutKey=key;Object.assign(root.style,{left:'50%',top:rect.y+'px',bottom:'auto',width:rect.width+'px',height:rect.height+'px',maxWidth:'calc(100vw - 32px - env(safe-area-inset-left, 0px) - env(safe-area-inset-right, 0px))',transform:'translateX(-50%)',opacity:String(rect.opacity??1)});track.style.height='100%';track.style.boxSizing='border-box';}
        const hidden=Boolean(!rect||rect.hidden||(!preview&&(!pulling||released)));
        if(root.hidden!==hidden)root.hidden=hidden;
        const display=hidden?'none':'block';if(root.style.display!==display)root.style.display=display;
      }else {const hidden=!pulling||released;if(root.hidden!==hidden)root.hidden=hidden;}
      if(preview&&!pulling){rawPower=85;effectivePower=70;}
      const raw = Math.max(0, Math.min(cap, Number(rawPower) || 0));
      const effective = Math.max(0, Math.min(raw, Number(effectivePower) || 0));
      const key = `${cap}:${raw}:${effective}`;
      if (key === last) return;
      last = key;
      const label=String(Math.round(effective));
      if(value&&value.textContent!==label)value.textContent=label;
      fill.style.clipPath = `inset(0 ${100 - effective/cap*100}% 0 0)`;
      // The loss region has the same visual endpoints, without resizing a DOM
      // box on every fractional power/tip change. Match the fill's clip path.
      const lossClip=raw===effective?'inset(0 100% 0 0)':`inset(0 ${100-raw/cap*100}% 0 ${effective/cap*100}%)`;
      if(loss.style.clipPath!==lossClip)loss.style.clipPath=lossClip;
      fill.style.backgroundColor = effectivePowerColor(effective);
      track.setAttribute('aria-valuenow', String(effective));
      const description=`有效力度 ${label}，总损耗 ${Math.round(raw - effective)}`;
      if(track.getAttribute('aria-valuetext')!==description)track.setAttribute('aria-valuetext',description);
    },
  };
}
