/* ============================================================
   VoyageCare 全站共享脚本
   职责：header 滚动态 / 移动汉堡 / 滚动渐显 / 邀请条 / Cookie 条 /
        data-render 列表渲染（医生·故事·治疗项目·FAQ）/ 生成图库
   ============================================================ */
(function () {
  'use strict';
  const D = window.SITE_DATA;

  /* ---------- 生成图片库（规范：必须用 text_to_image 内联 URL，禁占位图） ---------- */
  const img = (prompt, size) =>
    'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=' +
    encodeURIComponent(prompt) + '&image_size=' + size;

  const IMG = {
    hero: img('modern hospital atrium interior in Shanghai China, warm morning sunlight through a glass facade, clean minimalist architecture with wooden accents, a few people softly blurred in the distance, architectural photography, photorealistic, warm tones', 'landscape_16_9'),
    'card-coordinator': img('friendly bilingual patient coordinator wearing a headset at a bright modern desk, warm smile, soft daylight, photorealistic', 'landscape_4_3'),
    'card-hospital': img('lobby of a premium international hospital in China, clean design, green plants, warm lighting, architectural photography, photorealistic', 'landscape_4_3'),
    'card-records': img('doctor and patient reviewing a bilingual medical report on a tablet, bright clinic, shallow depth of field, photorealistic', 'landscape_4_3'),
    'card-recovery': img('peaceful hotel recovery room with city view of Shanghai, soft morning light, cozy bed, photorealistic', 'landscape_4_3'),
    'dr-li-wei': img('professional headshot portrait of a Chinese male ophthalmologist in his 40s wearing a white coat, confident warm smile, studio lighting, clean light gray background, photorealistic', 'square'),
    'dr-zhang-yue': img('professional headshot of a Chinese female dentist in her 30s wearing a white coat, gentle reassuring smile, studio lighting, clean light gray background, photorealistic', 'square'),
    'dr-chen-jing': img('professional headshot of a Chinese female physician in her 40s wearing a white coat, warm confident expression, studio lighting, clean light background, photorealistic', 'square'),
    'dr-wang-hao': img('professional headshot of a Chinese male plastic surgeon in his 40s wearing a white coat, calm confident look, studio lighting, clean light background, photorealistic', 'square'),
    'dr-liu-yang': img('professional headshot of a senior Chinese male traditional Chinese medicine doctor in his 50s wearing a white coat, kind wise expression, studio lighting, warm light background, photorealistic', 'square'),
    'dr-zhao-min': img('professional headshot of a Chinese female geneticist in her 30s wearing a white coat over a blouse, friendly professional smile, studio lighting, clean light background, photorealistic', 'square'),
    'story-marcus': img('candid photo of a smiling American man in his early 30s wearing a casual shirt, outdoors in warm afternoon light, natural photography, photorealistic', 'square'),
    'story-aisha': img('candid photo of an elegant Middle Eastern woman wearing a beige hijab, soft warm smile, bright outdoor light, natural photography, photorealistic', 'square'),
    'story-david': img('candid photo of a friendly American man in his 50s with a light beard wearing a casual polo shirt, smiling, warm natural light, photorealistic', 'square'),
    'story-layla': img('candid photo of a Middle Eastern woman in a modest dark green dress and hijab, gentle smile, soft indoor window light, natural photography, photorealistic', 'square')
  };
  window.SITE_IMG = IMG;

  /* ---------- 治疗项目 stroke 图标 ---------- */
  const ICONS = {
    checkup:   '<path d="M3 12h4l2.5-6 4 12 2.5-6H21"/>',
    eye:       '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="3"/>',
    dental:    '<path d="M7.5 3.5C5 3.5 3.5 5.6 3.5 8c0 3.4 1.8 12.5 3.4 12.5 1.9 0 1.4-5.5 5.1-5.5s3.2 5.5 5.1 5.5c1.6 0 3.4-9.1 3.4-12.5 0-2.4-1.5-4.5-4-4.5-1.9 0-2.7 1-4.5 1s-2.6-1-4.5-1Z"/>',
    dna:       '<path d="M8.5 3c0 4.5 7 5.5 7 9s-7 4.5-7 9M15.5 3c0 4.5-7 5.5-7 9s7 4.5 7 9M9.8 7h4.4M9.8 17h4.4"/>',
    aesthetic: '<path d="M12 3.5 13.7 8.7 19 10.5 13.7 12.3 12 17.5 10.3 12.3 5 10.5 10.3 8.7Z"/><path d="M18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8Z"/>',
    tcm:       '<path d="M5 19C5 9.5 11.5 4 20 4c0 8.5-5.5 15-14 15"/><path d="M5 19c2.8-4.8 6.6-8.3 11-10"/>'
  };

  /* ---------- 小工具 ---------- */
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  /* 数字滚动动画（cost-explorer 复用） */
  const animRange = (el, to) => {
    const from = el._range || to;
    el._range = to;
    const t0 = performance.now(), dur = 600;
    const tick = now => {
      const p = Math.min((now - t0) / dur, 1), e = 1 - Math.pow(1 - p, 3);
      const a = Math.round(from[0] + (to[0] - from[0]) * e);
      const b = Math.round(from[1] + (to[1] - from[1]) * e);
      el.textContent = '$' + a.toLocaleString('en-US') + '–$' + b.toLocaleString('en-US');
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  window.VC = { animRange };

  /* ---------- data-render 渲染器 ---------- */
  const doctorCard = d => `
    <article class="doccard reveal">
      <div class="doccard__photo"><img src="${IMG[d.photo]}" alt="Portrait of ${d.name}, ${d.specialty}" loading="lazy"></div>
      <div class="doccard__body">
        <span class="doccard__spec">${d.specialty}</span>
        <h3 class="doccard__name">${d.name}</h3>
        <p class="doccard__title">${d.title}</p>
        <p class="doccard__focus">${d.focus}</p>
        <p class="doccard__hosp">${d.hospital} · ${d.langs.join(' / ')}</p>
      </div>
    </article>`;

  const storyCard = s => {
    const t = D.treatments.find(t => t.id === s.treatmentId);
    return `
    <article class="storycard reveal">
      <img src="${IMG[s.photo]}" alt="${s.name}" loading="lazy">
      <div class="storycard__veil"></div>
      <div class="storycard__body">
        <p class="storycard__quote">&ldquo;${s.quote}&rdquo;</p>
        <p class="storycard__who">${s.name} · ${s.from} · ${t ? t.short : ''}</p>
      </div>
    </article>`;
  };

  /* 治疗项目 → 原版 integration-item 结构 */
  const tItem = t => `
    <div class="integration-item reveal">
      <div class="item-content">
        <figure class="logo-wrapper"><svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[t.icon] || ICONS.checkup}</svg></figure>
        <span class="name">${t.short}${t.tag ? ` <span class="sample-tag" style="text-transform:none;">${t.tag}</span>` : ''}</span>
        <p class="description">${t.blurb}</p>
        <span class="price-line"><s>${D.fmtMoney(t.usPrice[0])}–${D.fmtMoney(t.usPrice[1])}</s> ${D.fmtMoney(t.cnPrice[0])}–${D.fmtMoney(t.cnPrice[1])}</span>
        <div class="card-footer">
          <span class="tag">${t.stayDays}</span>
          <a class="view" href="cost-explorer.html#${t.id}">View<span class="arrow" aria-hidden="true">&rarr;</span></a>
        </div>
      </div>
    </div>`;

  /* FAQ → 原版 c-faq 结构：白色大卡壳 + 问题卡矩阵；点卡隐去网格、显示解答面板 */
  const renderFaqs = mount => {
    const all = D.faqs.flatMap(cat => cat.items.map(it => ({ ...it, cat: cat.cat })));
    mount.innerHTML = `
      <div class="c-faq">
        <div class="-w">
          <div class="panel">
            <div class="basic-list">
              ${all.map((it, i) => `
                <div class="question" role="button" tabindex="0" data-i="${i}" aria-expanded="false">
                  <div><span>${it.q}</span></div>
                </div>`).join('')}
            </div>
            <div class="faq-answer" hidden>
              <span class="faq-cat mono"></span>
              <h3 class="faq-q"></h3>
              <p class="faq-a-text"></p>
              <button class="button -p -b faq-back" type="button"><span class="text"><span data-label="All questions"><span>Back to all questions</span></span></span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8-8-8z"/></svg></button>
            </div>
          </div>
        </div>
      </div>`;
    const list = $('.basic-list', mount);
    const answer = $('.faq-answer', mount);
    const show = i => {
      const it = all[i];
      $('.faq-cat', answer).textContent = it.cat;
      $('.faq-q', answer).textContent = it.q;
      $('.faq-a-text', answer).textContent = it.a;
      list.classList.add('-hidden');
      answer.hidden = false;
      answer.querySelectorAll('.question').forEach(q => q.setAttribute('aria-expanded', 'false'));
    };
    const back = () => {
      answer.hidden = true;
      list.classList.remove('-hidden');
    };
    $$('.question', mount).forEach(q => {
      const go = () => show(Number(q.getAttribute('data-i')));
      q.addEventListener('click', go);
      q.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
    });
    $('.faq-back', answer).addEventListener('click', back);
  };

  const renders = {
    doctors:    el => { el.innerHTML = D.doctors.map(doctorCard).join(''); },
    stories:    el => { el.innerHTML = D.stories.map(storyCard).join(''); },
    treatments: el => { el.innerHTML = D.treatments.map(tItem).join(''); },
    faqs:       renderFaqs
  };

  /* ---------- 滚动渐显（露头即触发，避免大区块滚到半屏才出现的"空白感"） ---------- */
  const io = new IntersectionObserver(entries => entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
  }), { threshold: 0, rootMargin: '0px 0px -8% 0px' });
  const watchReveals = () => $$('.reveal:not(.is-in)').forEach(el => io.observe(el));

  document.addEventListener('DOMContentLoaded', () => {
    /* 全站按钮注入光扫层（原版 eaf52118 辉光按钮的 .button-glow） */
    $$('.button').forEach(b => {
      if (!b.querySelector('.button-glow')) {
        const g = document.createElement('span');
        g.className = 'button-glow';
        g.setAttribute('aria-hidden', 'true');
        b.appendChild(g);
      }
    });

    /* header 滚动态（原版类名 .-scroll） */
    const header = $('#nav');
    const onNav = () => header && header.classList.toggle('-scroll', scrollY > 8);
    addEventListener('scroll', onNav, { passive: true });
    onNav();

    /* 移动汉堡 */
    const burger = $('#navBurger'), mobile = $('#navMobile');
    if (burger && mobile) {
      burger.addEventListener('click', () => {
        const open = burger.classList.toggle('is-open');
        mobile.classList.toggle('is-open', open);
        burger.setAttribute('aria-expanded', String(open));
      });
      $$('a', mobile).forEach(a => a.addEventListener('click', () => {
        burger.classList.remove('is-open'); mobile.classList.remove('is-open');
      }));
    }

    /* 当前页导航高亮 */
    const page = location.pathname.split('/').pop() || 'index.html';
    $$('.header .nav-items a').forEach(a => {
      if (a.getAttribute('href') === page) a.classList.add('is-active');
    });

    /* 背景光晕流动（原版机制：进视口加 .-inview 触发 randomizer 旋转+呼吸） */
    const bgIO = new IntersectionObserver(entries => entries.forEach(e => {
      if (e.isIntersecting) e.target.classList.add('-inview');
    }), { threshold: 0 });
    $$('.c-learn, .c-footer').forEach(el => bgIO.observe(el));

    /* data-render 挂载点渲染 */
    $$('[data-render]').forEach(el => {
      const fn = renders[el.getAttribute('data-render')];
      if (fn) fn(el);
    });
    /* HTML 内联图片占位：<img data-img="hero"> → 生成图 URL */
    $$('[data-img]').forEach(el => {
      const k = el.getAttribute('data-img');
      if (IMG[k]) el.src = IMG[k];
    });
    watchReveals();

    /* 兜底表单（MVP：无后端，打印 payload；上线接 Formspree / CRM Webhook） */
    $$('form[data-lead]').forEach(form => {
      form.addEventListener('submit', e => {
        e.preventDefault();
        console.log('[VoyageCare lead]', Object.fromEntries(new FormData(form)));
        /* 成功框可能在卡壳（.form-cta）内或其兄弟节点，向上两级兜底查找 */
        const scope = form.closest('.form-cta') ? form.closest('.form-cta').parentElement : form.parentElement;
        const ok = scope.querySelector('.form-ok');
        form.hidden = true;
        if (ok) {
          ok.hidden = false;
          ok.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
    });

    /* 滚动 50% 一次性邀请条（wizard 页除外） */
    if (!document.body.hasAttribute('data-no-invite') && !sessionStorage.getItem('vc_invite')) {
      const bar = document.createElement('div');
      bar.className = 'invitebar';
      bar.setAttribute('role', 'complementary');
      bar.innerHTML = `
        <p class="invitebar__text"><b>Free 2-min check</b> — see your care options &amp; real prices</p>
        <a class="button -p -b" style="min-width:0;min-height:2.4rem;" href="pre-assessment.html"><span class="text"><span data-label="2 minutes"><span>Start</span></span></span></a>
        <button class="invitebar__x" aria-label="Dismiss">&#10005;</button>`;
      document.body.appendChild(bar);
      const dismiss = () => {
        bar.classList.remove('is-in');
        sessionStorage.setItem('vc_invite', '1');
      };
      $('.invitebar__x', bar).addEventListener('click', dismiss);
      $('a', bar).addEventListener('click', dismiss);
      const onScroll = () => {
        const max = document.documentElement.scrollHeight - innerHeight;
        if (max > 0 && scrollY / max > .5) {
          bar.classList.add('is-in');
          removeEventListener('scroll', onScroll);
        }
      };
      addEventListener('scroll', onScroll, { passive: true });
    }

    /* Cookie 条（仅记录评估进度用途） */
    if (!localStorage.getItem('vc_cookie')) {
      const c = document.createElement('div');
      c.className = 'cookiebar';
      c.innerHTML = `
        <p>We use cookies only to remember your assessment progress on this device. No ad tracking.</p>
        <div class="cookiebar__row"><button class="button -p -b" style="min-width:0;min-height:2.2rem;" data-ok><span class="text"><span data-label="Thanks"><span>Got it</span></span></span></button></div>`;
      document.body.appendChild(c);
      setTimeout(() => c.classList.add('is-in'), 1400);
      $('[data-ok]', c).addEventListener('click', () => {
        localStorage.setItem('vc_cookie', '1');
        c.classList.remove('is-in');
      });
    }
  });
})();
