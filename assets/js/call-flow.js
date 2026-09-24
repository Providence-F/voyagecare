/* ============================================================
   Call Flow Visualization —— opencall.ai hero 来电卡片动画移植
   主题换内容：患者咨询卡沿弧线飞向 orb（问题进 → 方案出）。
   结构/类名/状态机与原版一致：
     .call-flow-visualization > .arc-container > svg.flow-arc + .call-items
     .call-item(.incoming/.analyzing/.complete/.resolved)
       > .status-indicator(.status-icon|.status-dot) + .call-content
         (.primary-info / .info-line / .progress-bar > .progress)
   飞行 = 改 left/top 触发 CSS transition（原版同机制）；
   位置由 flow-arc 路径 getPointAtLength 采样。
   ============================================================ */
(function () {
  'use strict';

  const stage = document.querySelector('.call-flow-visualization');
  if (!stage) return;
  const items = stage.querySelector('.call-items');
  const arcPath = stage.querySelector('.flow-arc path');
  if (!items || !arcPath) return;

  /* 患者咨询内容池（防 AI 味：真实口语化问题） */
  const CARDS = [
    { phone: '+1 (512) 555-0147', q: 'Is LASIK in China safe?' },
    { phone: '+971 50 555 0182',  q: 'How much are dental implants?' },
    { phone: '+1 (415) 555-0193', q: 'Can I get a full checkup quote?' },
    { phone: '+966 55 555 0164',  q: 'Do you arrange halal meals?' },
    { phone: '+1 (305) 555-0127', q: 'How long do I need to stay?' },
    { phone: '+1 (206) 555-0171', q: 'What happens after I fly home?' }
  ];

  const PHONE_SVG = '<svg class="status-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6.6 3h3l1.6 4-2 1.4a12.5 12.5 0 0 0 5.4 5.4l1.4-2 4 1.6v3A2 2 0 0 1 18 18.4 15.4 15.4 0 0 1 5.6 6 2 2 0 0 1 6.6 3Z"/></svg>';
  const DOT = '<span class="status-dot"></span>';

  let cardIdx = 0;

  /* 沿弧线取点（t: 0-1）→ 百分比坐标；
     flight() 把飞行范围映射到 [0.14, 0.86]，保证卡片（半宽约 100px）
     全程留在 overflow:hidden 的舞台内，不产生边缘截断 */
  const flight = t => 0.14 + t * 0.72;
  const pointAt = t => {
    const len = arcPath.getTotalLength();
    const p = arcPath.getPointAtLength(len * flight(t));
    return { x: p.x / 10, y: p.y / 2.8 };   /* viewBox 1000x280 → % */
  };

  const buildCard = data => {
    const el = document.createElement('div');
    el.className = 'call-item incoming';
    el.innerHTML = `
      <div class="status-indicator">${PHONE_SVG}</div>
      <div class="call-content">
        <div class="primary-info"><span style="font-weight:600; font-size:.72em; letter-spacing:.02em;">${data.phone}</span></div>
        <div class="info-line">&ldquo;${data.q}&rdquo;</div>
        <div class="progress-bar"><div class="progress" style="width:0%"></div></div>
      </div>`;
    return el;
  };

  const place = (el, t) => {
    const p = pointAt(t);
    el.style.left = p.x + '%';
    el.style.top = p.y + '%';
  };

  const setState = (el, s) => {
    el.classList.remove('incoming', 'analyzing', 'complete', 'resolved');
    el.classList.add(s);
    const ind = el.querySelector('.status-indicator');
    if (s === 'incoming') ind.innerHTML = PHONE_SVG;
    else ind.innerHTML = DOT;
  };

  /* 单张卡生命周期：incoming(起点) → analyzing(弧顶) → complete(终点) → resolved */
  const runCard = (data, startT) => {
    const el = buildCard(data);
    place(el, startT);
    items.appendChild(el);
    const progress = el.querySelector('.progress');

    /* 进入：原版 enter 风格（blur+scale 淡入） */
    el.style.opacity = '0';
    el.style.filter = 'blur(5px)';
    requestAnimationFrame(() => requestAnimationFrame(() => {
      el.style.opacity = '';
      el.style.filter = '';
    }));

    setTimeout(() => {                                   /* → 弧顶：处理中 */
      setState(el, 'analyzing');
      place(el, .5);
      progress.style.width = '100%';
    }, 2000);

    setTimeout(() => {                                   /* → 终点：方案就绪 */
      setState(el, 'complete');
      place(el, .95);
    }, 3900);

    setTimeout(() => el.classList.add('resolved'), 5600);/* 淡出（CSS blur） */
    setTimeout(() => el.remove(), 6800);
  };

  /* 双卡交错循环（相位差 2.4s，起点错开避免重叠） */
  const loop = (delay, phase) => {
    setTimeout(() => {
      const tick = () => {
        const data = CARDS[cardIdx % CARDS.length];
        cardIdx++;
        runCard(data, phase);
      };
      tick();
      setInterval(tick, 7600);
    }, delay);
  };
  loop(1200, .04);
  loop(3600, .3);
})();
