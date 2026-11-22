// Numeric comparison panel, independent of gameplay state and capture services.
export function mountCushionResponseLab(container, { api, core }) {
  const root = document.createElement('section');
  root.setAttribute('aria-label', '库边响应数值对照');
  root.innerHTML = `<h3>接触瞬间条件</h3>
    <label>入库球速（m/s）<input data-lab="speed" aria-label="对照入库球速" type="number" min="0.25" max="7" step="0.25" value="5"></label>
    <label>入库旋转倍数<select data-lab="spin" aria-label="对照旋转倍数">
      <option value="-1">一倍后旋</option><option value="0">斯登</option><option value="1" selected>自然滚动</option>
      <option value="1.5">1.5 倍前旋</option><option value="2">两倍前旋</option><option value="4">四倍前旋</option></select></label>
    <label>法线入射角<select data-lab="angle" aria-label="对照法线入射角"><option value="0">0° · 垂直</option>
      <option value="30">30° · 实验</option><option value="45">45° · 实验</option><option value="60">60° · 实验</option></select></label>
    <label>侧旋倍数<select data-lab="sideSpin" aria-label="对照侧旋倍数"><option value="-1">−1</option><option value="0" selected>0</option><option value="1">+1</option></select></label>
    <button type="button" data-lab="run">计算两种响应</button>
    <div data-lab="result" aria-live="polite"></div>`;
  container.append(root);
  const out = root.querySelector('[data-lab=result]');
  function run() {
    const inputs = {};
    for (const key of ['speed', 'spin', 'angle', 'sideSpin']) inputs[key] = Number(root.querySelector(`[data-lab=${key}]`).value);
    if (!Number.isFinite(inputs.speed) || inputs.speed < .25 || inputs.speed > 7) { out.textContent = '入库球速请输入 0.25–7 m/s。'; return; }
    const data = api.CushionResponseLab.compare(core.getPhysicsParams(), inputs);
    const fmt = value => Number.isFinite(value) ? value.toFixed(3) : '—';
    const rows = data.rows.map(r => `<tr><th>${r.mode === 'current' ? '当前' : '经验实验'}</th><td>${fmt(r.exit.speed)}</td><td>${fmt(r.exit.omegaNormal)}</td><td>${r.exit.energyLossPercent.toFixed(1)}%</td><td>${r.exit.angle.toFixed(2)}°</td><td>${fmt(r.exit.omega.z)}</td><td>${r.rolling ? r.rolling.angle.toFixed(2) + '°' : '未恢复'}</td><td>${r.maxDeviationMm.toFixed(1)}</td></tr>`).join('');
    out.innerHTML = `<p class="debug-note">${data.rows[1].fallback ? '此次碰撞回退当前模型。' : '经验模型已生效，斜入射不再回退。法向用经验曲线，切向及侧旋用当前摩擦；参数为工程试验值，尚未实测标定。'}</p>
      <div style="overflow-x:auto"><table style="width:100%;font-size:12px"><thead><tr><th>模式</th><th>球速 m/s</th><th>法向转速 rad/s</th><th>耗能</th><th>离库角</th><th>侧旋 rad/s</th><th>恢复滚动角</th><th>首秒偏移 mm</th></tr></thead><tbody>${rows}</tbody></table></div>
      <p class="debug-note">+ 转速沿离库法线滚动；− 转速朝库。<br>灰：当前；橙：经验。圆点为离库后 0.25 秒的位置。偏移为轨迹到初始出库直线的最大垂直距离。</p>
      <div data-lab="plot"></div><p class="debug-note">${data.note}</p>`;
    const points = data.rows.flatMap(r => r.points.map(p => ({ x: p.x, y: -p.y })));
    const minX = Math.min(-100, ...points.map(p => p.x)) - 30, maxX = Math.max(100, ...points.map(p => p.x)) + 30;
    const minY = Math.min(-100, ...points.map(p => p.y)) - 30, maxY = Math.max(100, ...points.map(p => p.y)) + 30;
    const ns = 'http://www.w3.org/2000/svg', svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', `${minX} ${minY} ${maxX - minX} ${maxY - minY}`);
    svg.setAttribute('width', '100%'); svg.setAttribute('height', '240');
    svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', '首库后前一秒自由台面轨迹对照');
    const rail = document.createElementNS(ns, 'path'); rail.setAttribute('d', `M ${minX} 0 H ${maxX}`);
    rail.setAttribute('stroke', '#669977'); rail.setAttribute('stroke-width', '3'); svg.append(rail);
    data.rows.forEach((r, i) => {
      const color = i ? '#e6a33b' : '#aab4bd', path = document.createElementNS(ns, 'path');
      path.setAttribute('d', r.points.map((p, j) => `${j ? 'L' : 'M'} ${p.x} ${-p.y}`).join(' '));
      path.setAttribute('fill', 'none'); path.setAttribute('stroke', color); path.setAttribute('stroke-width', '5');
      if (!i) path.setAttribute('stroke-dasharray', '12 8'); svg.append(path);
      const p = r.points.find(p => p.t >= .25);
      if (p) { const dot = document.createElementNS(ns, 'circle'); dot.setAttribute('cx', p.x); dot.setAttribute('cy', -p.y); dot.setAttribute('r', '12'); dot.setAttribute('fill', color); svg.append(dot); }
    });
    out.querySelector('[data-lab=plot]').append(svg);
  }
  root.querySelector('[data-lab=run]').addEventListener('click', run);
  run();
  return { run };
}
