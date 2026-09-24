/* ============================================================
   VoyageCare 预评估（极简版）
   用户逻辑：点击按钮 → 看到承诺 → 填联系方式 → 等回复。完事。
   单屏表单：一句话描述（可选）+ 姓名 + 联系方式 → 成功态。
   红旗症状仍优先拦截（提交时检测，命中跳紧急屏，无任何营销）。
   深度咨询走全站 orb 对话（共用 data.js 题纲）。
   ============================================================ */
(function () {
  'use strict';
  const D = window.SITE_DATA;
  const root = document.getElementById('wizard-root');
  if (!root) return;
  const bar = document.getElementById('wzBar');
  const barText = document.getElementById('wzText');
  if (bar) bar.parentElement.style.display = 'none';   /* 单屏无需进度条 */

  const esc = s => String(s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const ARR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8-8-8z"/></svg>';

  /* ---------- 单屏：承诺 + 表单 ---------- */
  const renderLead = () => {
    root.innerHTML = `
    <section class="wz-screen">
      <p class="eyebrow">Free pre-assessment</p>
      <h1 class="wz-title">Tell us what you need.<br>We call back with real numbers.</h1>
      <p class="wz-sub">A coordinator replies within 48 hours — exact quote, named doctor, travel dates. Free, no commitment.</p>

      <div class="wz-options">
        <div class="wz-option" style="cursor:default"><span class="wz-option__icon mono">2′</span><span><b>Two minutes, no account</b><span>One short form. We do the rest.</span></span></div>
        <div class="wz-option" style="cursor:default"><span class="wz-option__icon mono">!</span><span><b>Directions, not a diagnosis</b><span>Every plan is reviewed by a licensed specialist.</span></span></div>
        <div class="wz-option" style="cursor:default"><span class="wz-option__icon mono">$</span><span><b>Real prices, never invented</b><span>Package prices come from our database — not from the AI.</span></span></div>
      </div>

      <form class="leadform" data-leadform novalidate style="margin-top: 2.5rem;">
        <div class="field">
          <label for="wzNotes">What do you need? <span style="color: var(--text-tertiary); font-weight: 400;">(optional — one line is enough)</span></label>
          <textarea id="wzNotes" name="notes" rows="3" placeholder="e.g. Considering SMILE for -4.5 both eyes, or lower-back pain for months"></textarea>
        </div>
        <div class="field">
          <label for="wzName">Your name</label>
          <input id="wzName" name="name" required placeholder="e.g. Marcus Thompson">
        </div>
        <div class="field">
          <label for="wzContact">WhatsApp number or email</label>
          <input id="wzContact" name="contact" required placeholder="+1 … or you@email.com">
        </div>
        <button class="button -p -b" type="submit"><span class="text"><span data-label="48h reply"><span>Request my callback</span></span></span>${ARR}</button>
        <p class="form-note">Your details go to one coordinator, nowhere else. Not a medical diagnosis.</p>
      </form>
    </section>`;

    root.querySelector('[data-leadform]').addEventListener('submit', e => {
      e.preventDefault();
      const notes = root.querySelector('#wzNotes').value.trim();
      const name = root.querySelector('#wzName').value.trim();
      const contact = root.querySelector('#wzContact').value.trim();
      if (!name || !contact) return;

      /* 红旗检测：优先于一切 */
      const flag = D.detectRedFlag(notes);
      if (flag) { renderEmergency(flag); return; }

      /* MVP：无后端，打印线索；上线接 Formspree / CRM Webhook */
      console.log('[VoyageCare lead]', { name, contact, notes });
      renderDone(contact);
    });
  };

  /* ---------- 成功态 ---------- */
  const renderDone = contact => {
    root.innerHTML = `
    <section class="wz-screen">
      <div class="form-ok" style="max-width: 560px;">
        <b>Received — thank you.</b><br>
        We'll write to <b>${esc(contact)}</b> within 48 hours with your exact quote.
      </div>
      <div class="wz-options" style="margin-top: 2rem;">
        <div class="wz-option" style="cursor:default"><span class="wz-option__icon mono">01</span><span><b>A coordinator calls or messages you</b><span>Your language, your channel — WhatsApp or email.</span></span></div>
        <div class="wz-option" style="cursor:default"><span class="wz-option__icon mono">02</span><span><b>A specialist confirms your plan</b><span>Named doctor, exact price, before you commit to anything.</span></span></div>
        <div class="wz-option" style="cursor:default"><span class="wz-option__icon mono">03</span><span><b>You decide</b><span>No booking, no payment until you say yes.</span></span></div>
      </div>
      <div class="wz-actions">
        <a class="button -p -b" href="index.html"><span class="text"><span data-label="Home"><span>Back to site</span></span></span>${ARR}</a>
        <a class="wz-back" href="cost-explorer.html">Browse prices meanwhile</a>
      </div>
    </section>`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /* ---------- 紧急屏（红旗命中；无任何营销 CTA） ---------- */
  const renderEmergency = flag => {
    root.innerHTML = `
    <section class="wz-screen">
      <div class="emergency">
        <h2>Please seek urgent care now.</h2>
        <p>What you described (&ldquo;${esc(flag)}&rdquo;) can be a medical emergency. This service is not for emergencies, and we won't plan travel around one.</p>
        <div class="emergency__nums">
          <span class="emergency__num">US &middot; 911</span>
          <span class="emergency__num">China &middot; 120</span>
          <span class="emergency__num">UAE &middot; 999</span>
        </div>
        <p style="font-size: var(--text-secondary); font-size: .9rem; color: var(--text-secondary);">When you're safe and stable, you're welcome back to plan elective care.</p>
        <div class="wz-actions" style="justify-content:center;">
          <button class="button -p -b" type="button" data-restart><span class="text"><span data-label="Home"><span>Back to site</span></span></span>${ARR}</button>
        </div>
      </div>
    </section>`;
    root.querySelector('[data-restart]').addEventListener('click', () => { location.href = 'index.html'; });
  };

  renderLead();
})();
