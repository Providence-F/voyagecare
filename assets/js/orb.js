/* ============================================================
   Medical Orb —— opencall.ai EmotionOrbChat 交互移植
   DOM/状态机/status chip 与原版一致：
     .oc-orb-chat(.state-*) > .orb-glow(i.lobe.-cyan/-lime/-moss)
                           + .orb-btn > canvas.emotion-canvas
                           + .orb-status-indicator
   情绪球由 emotion-rig.js 驱动（原版 canvas rig 移植）。
   情绪注入规则同原版：connecting → surprise/joy/anticipation；
   bot 开口 → joy。
   首页挂 hero #orbMount（居中），其余页面右下角悬浮变体。
   面板：variable-collector 式逐题采集，题纲与 wizard 共用。
   ============================================================ */
(function () {
  'use strict';
  const D = window.SITE_DATA;

  /* ---------- DOM 注入（结构对齐原版） ---------- */
  const mount = document.getElementById('orbMount');
  const orb = document.createElement('div');
  orb.className = 'oc-orb-chat state-idle';
  orb.style.setProperty('--volume', '0');
  orb.innerHTML = `
    <span class="orb-glow" aria-hidden="true"><i class="lobe -cyan"></i><i class="lobe -lime"></i><i class="lobe -moss"></i></span>
    <button class="orb-btn" type="button" aria-label="Open care assistant" aria-expanded="false" aria-haspopup="dialog">
      <canvas class="emotion-canvas" aria-hidden="true"></canvas>
    </button>
    <div class="orb-status-indicator" aria-hidden="true">
      <div class="status-pointer"></div>
      <span class="status-label"><span class="status-dot"></span><span class="status-text">Try it out!</span></span>
    </div>
    <section class="orb-panel" role="dialog" aria-label="VoyageCare care assistant">
      <header class="orb-panel-head">
        <span class="mini-core" aria-hidden="true"></span>
        <div>
          <div class="orb-panel-title">VoyageCare Guide</div>
          <div class="orb-panel-sub">AI pre-assessment &middot; not a diagnosis</div>
        </div>
        <button class="orb-panel-close" aria-label="Close chat">&#10005;</button>
      </header>
      <div class="orb-panel-body" id="orbBody"></div>
      <footer class="orb-panel-foot">Directions by AI &middot; prices &amp; doctors from our database, never invented</footer>
    </section>`;
  (mount || document.body).appendChild(orb);
  if (!mount) orb.classList.add('oc-orb-chat--fixed');

  const btn = orb.querySelector('.orb-btn');
  const body = orb.querySelector('#orbBody');
  const closeBtn = orb.querySelector('.orb-panel-close');
  const statusText = orb.querySelector('.status-text');
  const rig = window.EmotionRig.create(orb.querySelector('.emotion-canvas'));
  if (rig && rig.fit) requestAnimationFrame(() => rig.fit());   /* 布局稳定后再校准 canvas */

  /* ---------- 状态机（原版类名 + alert） ---------- */
  const STATES = ['state-idle', 'state-connecting', 'state-human', 'state-active', 'state-bot', 'state-alert'];
  const CHIP = {
    'state-idle': 'Try it out!',
    'state-human': 'Listening…',
    'state-connecting': 'Thinking…',
    'state-bot': 'Here you go',
    'state-alert': 'Please read'
  };
  const setState = s => {
    orb.classList.remove(...STATES);
    orb.classList.add(s);
    /* 仅面板打开时显示状态文案；idle 态保持轮播的咨询问题 */
    if (open) statusText.textContent = CHIP[s] || CHIP['state-idle'];
    if (!rig) return;
    if (s === 'state-connecting') {
      /* 原版：进入 connecting 时注入好奇情绪 */
      rig.injectEmotion('surprise', .3);
      rig.injectEmotion('joy', .25);
      rig.injectEmotion('anticipation', .6);
    } else if (s === 'state-bot') {
      rig.injectEmotion('joy', .3);
    } else if (s === 'state-alert') {
      rig.injectEmotion('fear', .5);
      rig.injectEmotion('sadness', .45);
    }
    rig.setEngaged(s !== 'state-idle');
  };

  /* ---------- 面板开合 ---------- */
  let open = false;
  const setOpen = v => {
    open = v;
    orb.classList.toggle('is-open', v);
    btn.setAttribute('aria-expanded', String(v));
    if (v) {
      chipStop();                       /* 对话中停轮播（原版行为） */
      setState('state-human');
      if (!body.children.length) greet();
      body.scrollTop = body.scrollHeight;
    } else {
      setState('state-idle');
      chipShow(); chipCycle();          /* 关闭后恢复轮播 */
    }
  };
  btn.addEventListener('click', () => setOpen(!open));
  closeBtn.addEventListener('click', () => setOpen(false));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && open) setOpen(false); });

  /* ---------- status chip：客户咨询问题轮播（机制仿原版 idle 轮换） ----------
     首条 "Try it out!"，之后轮播高频咨询问题；点击带问题
     的 chip → 打开对话并获得速答，再引导进预评估 */
  const CHIP_QA = [
    { q: 'Try it out!', ask: null },
    { q: 'How much is LASIK in China?', ask: 'How much is LASIK in China?' },
    { q: 'Are the hospitals accredited?', ask: 'Are the hospitals accredited?' },
    { q: 'Do I need a visa?', ask: 'Do I need a visa?' },
    { q: 'What about halal meals?', ask: 'What about halal meals?' },
    { q: 'Can I bring my family?', ask: 'Can I bring my family?' },
    { q: 'What if something goes wrong after I fly home?', ask: 'What if something goes wrong after I fly home?' }
  ];
  /* FAQ 速答（规则层；答案与 faq.html 同口径） */
  const FAQ_ANSWERS = [
    { keys: ['lasik', 'laser', 'vision', 'eye', 'smile'],
      a: 'SMILE or LASIK at a partner eye hospital runs <b class="mono">$900–$1,600</b> for both eyes — same German laser platforms as top US clinics. Pre-op mapping and follow-ups are in the package.' },
    { keys: ['accredit', 'hospital', 'safe', 'jci', 'grade'],
      a: 'We only partner with <b>JCI-accredited or Grade 3A public hospitals</b>. Your plan card names the specialist and the hospital before you book anything.' },
    { keys: ['visa', 'passport', 'entry'],
      a: 'Most US and GCC passport holders need a tourist visa — we provide the <b>invitation documents</b> and a step-by-step guide. Short procedures can often use the 144-hour transit policy.' },
    { keys: ['halal', 'food', 'meal', 'prayer', 'arabic', 'muslim'],
      a: '<b>Halal meals, prayer arrangements</b> and a gender-matched coordinator are standard for our Middle East clients. Tell us once — it goes into your itinerary.' },
    { keys: ['family', 'companion', 'wife', 'husband', 'partner', 'children'],
      a: 'Yes — most clients bring someone. We arrange <b>adjoining hotel rooms</b> and can add sightseeing days to the itinerary.' },
    { keys: ['wrong', 'complication', 'goes wrong', 'after i fly', 'follow'],
      a: 'Every plan includes a <b>complication protocol</b>: your doctor reviews any concern by video within 24h, and we coordinate with a physician near you if hands-on care is needed.' }
  ];
  const answerFaq = text => {
    const t = (text || '').toLowerCase();
    const hit = FAQ_ANSWERS.find(f => f.keys.some(k => t.includes(k)));
    return hit ? hit.a : null;
  };

  const labelEl = orb.querySelector('.status-label');
  let chipIdx = 0, chipTimer = null;

  const chipShow = () => { labelEl.classList.remove('is-out'); void labelEl.offsetWidth; labelEl.classList.add('is-in'); };
  const chipHide = () => { labelEl.classList.remove('is-in'); labelEl.classList.add('is-out'); };
  const chipStop = () => { if (chipTimer) { clearTimeout(chipTimer); chipTimer = null; } chipHide(); };
  const chipNext = () => {
    chipHide();                               /* 先收缩（0.25s） */
    setTimeout(() => {                        /* 400ms 后换文案再弹出（原版节拍） */
      chipIdx = (chipIdx + 1) % CHIP_QA.length;
      statusText.textContent = CHIP_QA[chipIdx].q;
      labelEl.classList.toggle('has-q', !!CHIP_QA[chipIdx].ask);
      chipShow();
      chipCycle();
    }, 400);
  };
  /* 只调度下一次轮换；启动时不得收回刚弹出的 chip */
  const chipCycle = () => {
    if (chipTimer) clearTimeout(chipTimer);
    chipTimer = setTimeout(chipNext, 3800);   /* 展示 3.8s → 收缩 → 400ms 后换下一条（原版节奏） */
  };

  /* 点击 chip：带问题的 → 开面板并速答（先占位避免与问候语交错） */
  labelEl.addEventListener('click', () => {
    if (open) return;
    const ask = CHIP_QA[chipIdx].ask;
    if (ask) {
      body.appendChild(document.createElement('div'));   /* 占位：跳过 greet */
      setOpen(true);
      const ans = answerFaq(ask);
      if (ans) answerAndGuide(ask, ans);
    } else setOpen(true);
  });

  /* 速答 → 引导进预评估（防幻觉：价格口径与 data.js 一致） */
  const answerAndGuide = async (q, ans) => {
    await botReply(`You asked: &ldquo;<b>${esc(q)}</b>&rdquo;`);
    await botReply(`${ans}<div class="orbmsg__row">
      <button class="chip" data-goplan>Get my plan card</button>
      <button class="chip" data-more>Ask something else</button></div>
      <div class="orbmsg__why">Prices from our database — final quote after specialist review.</div>`);
    body.querySelector('[data-goplan]')?.addEventListener('click', () => { location.href = 'pre-assessment.html'; });
    body.querySelector('[data-more]')?.addEventListener('click', () => { f = { path: null, idx: 0, answers: {} }; greet(); });
  };

  /* 启动轮播：hero 1.2s 后出现；悬浮模式 8s 后开始 */
  setTimeout(() => {
    if (!open) { chipShow(); chipCycle(); }
  }, mount ? 1200 : 8000);

  /* ---------- 消息工具 ---------- */
  const esc = s => String(s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const scrollEnd = () => { body.scrollTop = body.scrollHeight; };

  const appendMsg = (kind, html, extraCls) => {
    const m = document.createElement('div');
    m.className = 'orbmsg' + (kind === 'user' ? ' orbmsg--user' : '') + (extraCls ? ' ' + extraCls : '');
    m.innerHTML = `<div class="orbmsg__bubble">${html}</div>`;
    body.appendChild(m);
    scrollEnd();
    return m;
  };

  /* Bot 消息：先 typing 再出内容；出内容时 rig 进入说话节奏 */
  const botReply = (html, extraCls, delay) => new Promise(res => {
    setState('state-connecting');
    const t = appendMsg('bot', '<span class="typing" aria-label="typing"><i></i><i></i><i></i></span>', extraCls);
    setTimeout(() => {
      t.querySelector('.orbmsg__bubble').innerHTML = html;
      setState('state-bot');
      scrollEnd();
      res(t);
    }, delay == null ? 650 : delay);
  });

  /* ---------- 对话流（variable-collector 式逐题） ---------- */
  let f = null;

  const greet = async () => {
    let hasProgress = false;
    try {
      const s = JSON.parse(sessionStorage.getItem('vc_wizard'));
      hasProgress = s && s.screen && s.screen !== 'intro' && Object.keys(s.answers || {}).length > 0;
    } catch (e) { /* 忽略 */ }

    f = { path: null, idx: 0, answers: {} };
    await botReply(`Hi — I'm the VoyageCare guide. In about 2 minutes I can sketch your care options and <b>real package prices</b>.<div class="orbmsg__row">
      <button class="chip" data-path="symptom">I have a symptom</button>
      <button class="chip" data-path="consumer">I know what I want</button></div>
      <div class="orbmsg__why">Directions + confidence, not a diagnosis. Human coordinators take over after.</div>`);
    if (hasProgress) {
      await botReply(`Looks like you started an assessment earlier. <a href="pre-assessment.html" style="font-weight:600; border-bottom:1px solid currentColor;">Continue where you left off &rarr;</a>`, null, 350);
    }
  };

  const askQ = () => {
    const flow = D.WIZARD_FLOW[f.path];
    const q = flow[f.idx];
    const step = `<div class="orbmsg__step">Question ${f.idx + 1} / ${flow.length}</div>`;

    if (q.type === 'chips') {
      botReply(`${step}${q.q}<div class="orbmsg__row">${q.options.map(o =>
        `<button class="chip" data-val="${o.value}" data-label="${esc(o.label)}">${o.label}</button>`).join('')}</div>
        <div class="orbmsg__why">${q.why}</div>`);
    } else if (q.type === 'text') {
      botReply(`${step}${q.q}<div class="orbmsg__input">
          <input type="text" data-qinput placeholder="${esc(q.placeholder || 'Type here…')}" aria-label="Your answer">
          <button data-qsend aria-label="Send">&rarr;</button></div>
        <div class="orbmsg__why">${q.why}${q.optional ? ' (optional — send “skip”)' : ''}</div>`);
      const input = body.querySelector('[data-qinput]');
      if (input) input.focus();
    } else if (q.type === 'confirm') {
      const desc = f.answers.description || '';
      const top = D.analyzeSymptoms(desc)[0];
      const excerpt = desc.length > 90 ? desc.slice(0, 90) + '…' : desc;
      botReply(`${step}Here's what I understood: &ldquo;<b>${esc(excerpt)}</b>&rdquo;<br>
        Sounds like <b>${top.direction}</b> (${D.confidenceLabel(top.score)} match). Right?
        <div class="orbmsg__row">
          <button class="chip" data-val="__yes" data-label="Yes, that's right">Yes, that's right</button>
          <button class="chip" data-val="__edit" data-label="Let me rewrite">Let me rewrite</button>
        </div>
        <div class="orbmsg__why">${q.why}</div>`);
    } else if (q.type === 'contact') {
      botReply(`${step}${q.q}
        <div class="orbmsg__input"><input type="text" data-cname placeholder="Your name" aria-label="Your name"></div>
        <div class="orbmsg__input">
          <input type="text" data-ccontact placeholder="WhatsApp or email" aria-label="WhatsApp or email">
          <button data-csend aria-label="Send">&rarr;</button></div>
        <div class="orbmsg__why">${q.why}</div>`);
      const input = body.querySelector('[data-cname]');
      if (input) input.focus();
    }
  };

  const nextQ = () => {
    const flow = D.WIZARD_FLOW[f.path];
    if (f.idx < flow.length - 1) { f.idx++; askQ(); }
    else runPlan();
  };

  /* 红旗 → alert 态 + 紧急面板（无营销 CTA） */
  const emergency = async (flag) => {
    setState('state-alert');
    await botReply(`<b>Please seek urgent care now.</b><br>
      &ldquo;${esc(flag)}&rdquo; can be a medical emergency — call local emergency services:
      <b>US 911 &middot; China 120 &middot; UAE 999</b>.
      <div class="orbmsg__why">This chat isn't for emergencies. When you're safe, I'm here to plan elective care.</div>
      <div class="orbmsg__row"><button class="chip" data-restart>Start over</button></div>`,
      'orbmsg--emergency', 400);
  };

  /* 结果：方向+置信度 → boarding-pass → CTA */
  const runPlan = async () => {
    setState('state-connecting');
    await new Promise(r => setTimeout(r, 900));
    const plan = D.buildPlan(f.path, f.answers);

    /* 同步给 wizard：跳转 pre-assessment 页可接力看完整结果 */
    sessionStorage.setItem('vc_wizard', JSON.stringify({
      screen: 'result', path: f.path, idx: 0, answers: f.answers, plan
    }));

    setState('state-bot');
    const d0 = plan.directions[0];
    await botReply(`Your direction: <b>${d0.direction}</b> — ${D.confidenceLabel(d0.score)} confidence.<br>
      Urgency: <b>${plan.urgency.label}</b>.
      <div class="orbmsg__why">Prices &amp; specialist below are from our database — never generated by me.</div>`, null, 500);

    const card = document.createElement('div');
    card.innerHTML = D.renderBoardingPass(plan);
    card.firstElementChild.classList.add('bpass--flat');
    body.appendChild(card.firstElementChild);

    const cta = document.createElement('div');
    cta.className = 'orb-panel-ctas';
    cta.innerHTML = `
      <a class="button -p -b" href="pre-assessment.html"><span class="text"><span data-label="Free &middot; 48h reply"><span>Get my exact quote</span></span></span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8-8-8z"/></svg></a>
      <a class="button -p -b" href="cost-explorer.html#${plan.treatment.id}"><span class="text"><span data-label="Real package prices"><span>Cost breakdown</span></span></span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8-8-8z"/></svg></a>`;
    body.appendChild(cta);
    scrollEnd();
  };

  /* ---------- 面板内交互（事件委托） ---------- */
  body.addEventListener('click', e => {
    const chip = e.target.closest('.chip');
    if (chip) {
      if (chip.hasAttribute('data-path')) {
        f.path = chip.getAttribute('data-path');
        f.idx = 0;
        appendMsg('user', esc(chip.textContent));
        askQ();
        return;
      }
      if (chip.hasAttribute('data-restart')) {
        f = { path: null, idx: 0, answers: {} };
        setState('state-human');
        greet();
        return;
      }
      if (chip.hasAttribute('data-val') && f && f.path) {
        const q = D.WIZARD_FLOW[f.path][f.idx];
        if (!q) return;
        const v = chip.getAttribute('data-val');
        if (q.type === 'confirm') {
          appendMsg('user', esc(chip.getAttribute('data-label')));
          if (v === '__edit') { f.idx = D.WIZARD_FLOW[f.path].findIndex(x => x.id === 'description'); askQ(); }
          else nextQ();
          return;
        }
        if (q.type !== 'chips') return;
        f.answers[q.id] = v;
        appendMsg('user', esc(chip.getAttribute('data-label') || chip.textContent));
        nextQ();
      }
      return;
    }
    /* 文本输入发送 */
    const sendBtn = e.target.closest('[data-qsend]');
    if (sendBtn && f && f.path) {
      const input = body.querySelector('[data-qinput]');
      const q = D.WIZARD_FLOW[f.path][f.idx];
      if (!input || !q) return;
      const v = input.value.trim();
      if (!v && !q.optional) { input.focus(); return; }
      const flag = D.detectRedFlag(v);
      f.answers[q.id] = v;
      appendMsg('user', v ? esc(v) : 'Skip');
      if (flag) { emergency(flag); return; }
      nextQ();
      return;
    }
    /* 联系方式发送 */
    const csend = e.target.closest('[data-csend]');
    if (csend && f && f.path) {
      const name = body.querySelector('[data-cname]');
      const contact = body.querySelector('[data-ccontact]');
      if (!name || !contact) return;
      if (!name.value.trim() || !contact.value.trim()) {
        (!name.value.trim() ? name : contact).focus();
        return;
      }
      f.answers.name = name.value.trim();
      f.answers.contact = contact.value.trim();
      appendMsg('user', esc(f.answers.name + ' · ' + f.answers.contact));
      nextQ();
    }
  });

  /* 回车发送 */
  body.addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    if (e.target.matches('[data-qinput]')) {
      e.preventDefault();
      const b = body.querySelector('[data-qsend]');
      if (b) b.click();
    } else if (e.target.matches('[data-ccontact], [data-cname]')) {
      e.preventDefault();
      const b = body.querySelector('[data-csend]');
      if (b) b.click();
    }
  });
})();
