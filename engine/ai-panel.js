const STORAGE='snooker.3d-test-field.ai.v1';
const BALLS={red:'红球',yellow:'黄球',green:'绿球',brown:'棕球',blue:'蓝球',pink:'粉球',black:'黑球'};
const POCKETS={'middle-top':'上中袋','middle-bottom':'下中袋','corner-top-left':'左上袋','corner-top-right':'右上袋','corner-bottom-left':'左下袋','corner-bottom-right':'右下袋'};
export function createAiPanel({core,api}) {
  const settings=api.TestFieldAi;
  let stored={};try{stored=JSON.parse(localStorage.getItem(STORAGE)||'{}');}catch{}
  let values=settings.normalize(stored),root=document.createElement('div');root.className='ai-controls';
  root.innerHTML=`<p class="ai-note">从当前球局接管。每杆停稳后重新选杆；重置、手动击球或修改参数会停止自动模式。</p>
    <div class="ai-actions"><button type="button" id="ai-start">自动击球</button><button type="button" id="ai-single">只打一杆</button><button type="button" id="ai-stop" disabled>停止 AI</button></div>
    <p id="ai-status" role="status" aria-live="polite"></p><pre id="ai-result">尚未计算</pre>
    <label>能力预设<select id="ai-preset"><option value="custom">自定义</option></select></label>
    <label>接管范围<select id="ai-control"><option value="both">双方轮流 · 持续自动</option><option value="current">仅当前玩家 · 换手停止</option></select></label>
    <div id="ai-abilities"></div>
    <details><summary>搜索与运行参数</summary><div id="ai-search"></div></details>
    <p class="ai-note" id="ai-combinations"></p><button type="button" id="ai-defaults">恢复默认 AI 参数</button>
    <p class="ai-note">参数自动保存在当前浏览器。搜索有时间与次数上限；预计落点是无执行误差的核验结果。</p>`;
  const preset=root.querySelector('#ai-preset');settings.PRESETS.forEach(([id,label])=>preset.add(new Option(label,id)));
  const inputs=new Map();
  function row(key,label,min,max,step,description,container,slider=false){
    const node=document.createElement('label');node.className='ai-parameter';
    const title=document.createElement('span');title.textContent=label;title.title=description||label;
    const number=document.createElement('input');number.type='number';number.min=min;number.max=max;number.step=step;number.dataset.aiParameter=key;number.setAttribute('aria-label',label);number.value=values[key];
    node.append(title,number);
    let range=null;if(slider){range=document.createElement('input');range.type='range';range.min=min;range.max=max;range.step=step;range.value=values[key];range.setAttribute('aria-label',label+'滑块');node.append(range);}
    function update(element){if(element.value.trim()===''||!Number.isFinite(Number(element.value))){sync();return;}values=runner.configure({[key]:Number(element.value)});preset.value='custom';save();sync();}
    number.addEventListener('change',()=>update(number));range?.addEventListener('change',()=>update(range));
    range?.addEventListener('input',()=>{number.value=range.value;});inputs.set(key,{number,range});container.append(node);
  }
  const a=root.querySelector('#ai-abilities');for(const [key,label,note] of settings.ABILITIES)row(key,label,0,1,.05,note,a,true);
  const labels={powerSamples:'每条线路力度采样',spinSamples:'高低打点档数',sideSamples:'左右打点档数（1/3/5）',verifyShots:'每杆物理核验上限',searchMs:'每杆计算预算（毫秒）',delayMs:'选杆后等待（毫秒）',maxShots:'本次最多击球数',seed:'随机种子'};
  for(const [key,[lo,hi]] of Object.entries(settings.LIMITS))row(key,labels[key],lo,hi,key.endsWith('Ms')?250:1,'',root.querySelector('#ai-search'));
  function save(){try{localStorage.setItem(STORAGE,JSON.stringify(values));}catch{}}
  function sync(){for(const [key,entry] of inputs){entry.number.value=values[key];if(entry.range)entry.range.value=values[key];}root.querySelector('#ai-control').value=values.control;root.querySelector('#ai-combinations').textContent=`配置采样上限：每球每袋 ${values.powerSamples*values.spinSamples*values.sideSamples} 组；按杆法能力和可达性筛选。最多核验 ${values.verifyShots} 组。`;}
  function render(state){
    root.querySelector('#ai-start').disabled=state.running;
    root.querySelector('#ai-single').disabled=state.running;
    root.querySelector('#ai-stop').disabled=!state.running;
    root.querySelector('#ai-status').textContent=state.message;
    root.dataset.phase=state.phase;
    if(state.last?.ok){const r=state.last,t=r.shot.tipOffset,p=r.predictedLanding;
      root.querySelector('#ai-result').textContent=`${{attack:'进攻',safety:'防守',escape:'解球'}[r.kind]} · ${BALLS[r.targetKind]||r.targetKind}${r.pocketId?' → '+(POCKETS[r.pocketId]||r.pocketId):''}\n力度 ${r.shot.power.toFixed(1)}% · 左右 ${t.x.toFixed(2)} · 高低 ${t.y.toFixed(2)}\n抬杆 ${r.shot.verticalAngle.toFixed(1)}°\n预计白球 (${p.x.toFixed(0)}, ${p.y.toFixed(0)}) mm\n生成 ${r.generated} 组 · 核验 ${r.verified} 组 · ${r.elapsedMs} ms\n本次已击球 ${state.shots} 杆`;
    }else root.querySelector('#ai-result').textContent=state.last?.reason || (state.running?'正在计算…':'尚未计算');
  }
  const runner=api.createTestFieldAiController({core,settings:values,createWorker:()=>new Worker((window.SnookerTestFieldModels?.workerUrl('ai-worker.bundle.js', new URL('./ai-worker.bundle.js',import.meta.url)) ?? new URL('./ai-worker.bundle.js',import.meta.url))),onChange:render});
  root.querySelector('#ai-start').addEventListener('click',()=>runner.start());
  root.querySelector('#ai-single').addEventListener('click',()=>runner.start({oneShot:true}));
  root.querySelector('#ai-stop').addEventListener('click',()=>runner.stop());
  preset.addEventListener('change',()=>{if(preset.value==='custom')return;values=runner.configure(settings.preset(preset.value));save();sync();});
  root.querySelector('#ai-control').addEventListener('change',event=>{values=runner.configure({control:event.target.value});save();sync();});
  root.querySelector('#ai-defaults').addEventListener('click',()=>{values=runner.configure(settings.DEFAULTS);preset.value='custom';save();sync();});
  const visibility=()=>{if(document.hidden&&runner.getState().running)runner.stop('页面已隐藏，AI 已停止。');};
  document.addEventListener('visibilitychange',visibility);
  const dispose=()=>{runner.dispose();document.removeEventListener('visibilitychange',visibility);};
  window.addEventListener('pagehide',dispose,{once:true});
  sync();render(runner.getState());
  return {mount(container){container.replaceChildren(root);},runner,dispose};
}
