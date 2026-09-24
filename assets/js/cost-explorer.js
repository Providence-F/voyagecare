/* ============================================================
   Cost Explorer v2 —— Pick → Compare → Plan 三幕交互
   S1 chips 切换 → S2 大数字滚动（US 划线 / CHINA 绿色）+ SAVE 徽章
   → S3 方案卡淡入更新 + 包含项/医生/地面时间同步。
   价格与医生全部来自 SITE_DATA（防幻觉：本页不生成任何数字）。
   首页 mini 模式（无 us/cn 元素）自动降级。
   ============================================================ */
(function () {
  'use strict';
  const D = window.SITE_DATA;

  const init = root => {
    const chipsBox = root.querySelector('[data-ce-chips]');
    const passEl = root.querySelector('[data-ce-bpass]');
    const incEl = root.querySelector('[data-ce-includes]');
    const docEl = root.querySelector('[data-ce-doctor]');
    const stayEl = root.querySelector('[data-ce-stay]');
    const recEl = root.querySelector('[data-ce-recovery]');
    const usEl = root.querySelector('[data-ce-us]');
    const cnEl = root.querySelector('[data-ce-cn]');
    const saveEl = root.querySelector('[data-ce-save]');
    if (!chipsBox || !passEl) return;

    chipsBox.innerHTML = D.treatments.map(t =>
      `<button class="filter-pill" data-val="${t.id}">${t.short}</button>`).join('');

    const select = id => {
      const t = D.treatments.find(x => x.id === id) || D.treatments[0];
      chipsBox.querySelectorAll('.filter-pill').forEach(c =>
        c.classList.toggle('active', c.getAttribute('data-val') === t.id));

      const plan = D.buildPlan('consumer', { treatment: t.id });

      /* 面板标题联动（首页 Check 区） */
      const nameEl = root.querySelector('[data-ce-name]');
      if (nameEl) nameEl.textContent = t.name;

      /* S2 大数字滚动（元素存在时；首页 mini 模式跳过） */
      if (usEl && cnEl) {
        window.VC.animRange(usEl, t.usPrice);
        window.VC.animRange(cnEl, t.cnPrice);
      }
      if (saveEl) saveEl.textContent = 'SAVE ≈' +
        Math.round((1 - t.cnPrice[1] / t.usPrice[0]) * 100) + '%';

      /* S3 方案卡淡入更新 */
      passEl.innerHTML = D.renderBoardingPass(plan);
      passEl.classList.remove('ce-swap');
      void passEl.offsetWidth;
      passEl.classList.add('ce-swap');

      if (incEl) incEl.innerHTML = t.includes.map(i => `<li>${i}</li>`).join('');
      if (stayEl) stayEl.textContent = t.stayDays;
      if (recEl) recEl.textContent = t.recovery;
      if (docEl) {
        const d = plan.doctor;
        docEl.innerHTML = `
          <div class="summary__row"><span class="summary__k">Specialist</span><span class="summary__v">${d.name}</span></div>
          <div class="summary__row"><span class="summary__k">Title</span><span class="summary__v">${d.title}</span></div>
          <div class="summary__row"><span class="summary__k">Hospital</span><span class="summary__v">${d.hospital}</span></div>
          <div class="summary__row"><span class="summary__k">Languages</span><span class="summary__v">${d.langs.join(' / ')}</span></div>`;
      }
    };

    chipsBox.addEventListener('click', e => {
      const c = e.target.closest('.filter-pill');
      if (c) select(c.getAttribute('data-val'));
    });

    const hashId = location.hash.slice(1);
    select(D.treatments.some(t => t.id === hashId) ? hashId : D.treatments[0].id);
  };

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-ce]').forEach(init);
  });
})();
