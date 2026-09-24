/* ============================================================
   VoyageCare 单一数据源（Single Source of Truth）
   ------------------------------------------------------------
   防幻觉设计核心：价格、医生、医院信息一律来自本文件，
   AI / 规则引擎只产出"方向 + 置信度"，绝不生成价格与医生信息。
   Cost Explorer、Specialists、orb 结果卡、wizard 结果屏
   全部从此处取数。

   ⚠ 标注 [待替换] 的内容为概念期示例数据，上线前必须替换为
     已授权的真实资产（见《官网建设-Spec.md》§4）。
   ============================================================ */

(function () {
  'use strict';

  /* ---------- 工具 ---------- */
  const fmtMoney = n => '$' + n.toLocaleString('en-US');

  /* ---------- 治疗项目（价格口径：美国诊所挂牌均价 vs 中国合作医院套餐价，2026 估算区间） ---------- */
  const treatments = [
    {
      id: 'checkup',
      name: 'Full-Body Health Checkup',
      short: 'Health Checkup',
      icon: 'checkup',
      usPrice: [2500, 5000],
      cnPrice: [350, 800],
      stayDays: '1–2 days',
      recovery: 'None — fly home next day',
      blurb: 'Executive-grade screening: MRI/CT imaging, full blood panel, cardio & cancer markers — done in one morning.',
      includes: ['MRI / low-dose CT imaging', '60+ marker blood panel', 'Cardiology & ultrasound suite', 'English report within 48h'],
      doctorIds: ['chen-jing'],
      tag: 'Most booked'
    },
    {
      id: 'lasik',
      name: 'Laser Vision Correction (LASIK / SMILE)',
      short: 'Vision Correction',
      icon: 'eye',
      usPrice: [4000, 6000],
      cnPrice: [900, 1600],
      stayDays: '3–5 days',
      recovery: '24–48h initial, 1 week full',
      blurb: 'SMILE / LASIK with the same German laser platforms used in top US clinics, at a third of the price.',
      includes: ['Full pre-op eye mapping', 'SMILE / Femto-LASIK procedure, both eyes', 'Next-day + 1-week follow-ups', 'Meds & post-op kit included'],
      doctorIds: ['li-wei'],
      tag: null
    },
    {
      id: 'dental',
      name: 'Dental Implants & Care',
      short: 'Dental Care',
      icon: 'dental',
      usPrice: [3000, 5500],
      cnPrice: [800, 1500],
      stayDays: '5–7 days',
      recovery: 'Same-week soft diet',
      blurb: 'Swiss / Korean implant systems placed by chief physicians — per-tooth pricing with no hidden fees.',
      includes: ['3D cone-beam scan & plan', 'Straumann / Osstem implant, per tooth', 'Crown fitting & adjustment', 'English dental records for home dentist'],
      doctorIds: ['zhang-yue'],
      tag: null
    },
    {
      id: 'genetic',
      name: 'Genetic & Longevity Screening',
      short: 'Genetic Screening',
      icon: 'dna',
      usPrice: [800, 2000],
      cnPrice: [250, 600],
      stayDays: '1–2 days',
      recovery: 'None',
      blurb: 'Whole-genome or targeted panels with a physician-reviewed report — not a raw data dump.',
      includes: ['Whole-genome / targeted panel options', 'Physician-reviewed English report', '60-min results consultation', 'Secure data handling, deletion on request'],
      doctorIds: ['zhao-min'],
      tag: null
    },
    {
      id: 'aesthetic',
      name: 'Aesthetic & Cosmetic Care',
      short: 'Aesthetic Care',
      icon: 'aesthetic',
      usPrice: [8000, 15000],
      cnPrice: [2500, 5000],
      stayDays: '7–10 days',
      recovery: '5–7 days social downtime',
      blurb: 'Board-certified plastic surgeons at JCI-accredited hospitals, with English-speaking care teams.',
      includes: ['In-person surgical consult & plan', 'Procedure at accredited hospital', 'Daily nurse check-ins during stay', 'Remote follow-up after you fly home'],
      doctorIds: ['wang-hao'],
      tag: null
    },
    {
      id: 'tcm',
      name: 'TCM & Rehabilitation Program',
      short: 'TCM & Rehab',
      icon: 'tcm',
      usPrice: [4000, 8000],
      cnPrice: [1200, 2500],
      stayDays: '10–14 days',
      recovery: 'Gentle program, sightseeing-friendly',
      blurb: 'A structured two-week program: physician-led TCM, physio and rehab — the China-only experience.',
      includes: ['Chief TCM physician assessment', 'Daily acupuncture / physio sessions', 'Personalized herbal program', 'Take-home plan & remote check-ins'],
      doctorIds: ['liu-yang'],
      tag: null
    }
  ];

  /* ---------- 医生 [待替换：概念期示例数据，上线前需书面授权] ---------- */
  const doctors = [
    { id: 'li-wei',    name: 'Dr. Li Wei',    title: 'Chief Physician · Professor', specialty: 'Ophthalmology',      focus: 'Refractive surgery (SMILE/LASIK), 30,000+ cases', hospital: 'Partner Eye Hospital, Shanghai',   langs: ['English', 'Mandarin'], photo: 'dr-li-wei' },
    { id: 'zhang-yue', name: 'Dr. Zhang Yue', title: 'Professor · Doctoral Supervisor', specialty: 'Stomatology',    focus: 'Complex implant restoration, full-arch rehab',   hospital: 'Partner Dental Center, Beijing',   langs: ['English', 'Mandarin'], photo: 'dr-zhang-yue' },
    { id: 'chen-jing', name: 'Dr. Chen Jing', title: 'Chief Physician',               specialty: 'Health Management', focus: 'Executive screening & preventive medicine',     hospital: 'International Checkup Center, Shenzhen', langs: ['English', 'Mandarin', 'Arabic'], photo: 'dr-chen-jing' },
    { id: 'wang-hao',  name: 'Dr. Wang Hao',  title: 'Professor of Plastic Surgery',  specialty: 'Plastic Surgery',   focus: 'Facial aesthetic surgery, revision cases',       hospital: 'JCI-accredited Hospital, Shanghai', langs: ['English', 'Mandarin'], photo: 'dr-wang-hao' },
    { id: 'liu-yang',  name: 'Dr. Liu Yang',  title: 'Chief Physician, TCM',          specialty: 'TCM Rehabilitation', focus: 'Post-injury rehab, chronic pain programs',      hospital: 'TCM University Hospital, Hangzhou', langs: ['English', 'Mandarin'], photo: 'dr-liu-yang' },
    { id: 'zhao-min',  name: 'Dr. Zhao Min',  title: 'MD, PhD',                       specialty: 'Medical Genetics',   focus: 'Genomic screening, hereditary risk counseling', hospital: 'Genomics Institute, Guangzhou',    langs: ['English', 'Mandarin'], photo: 'dr-zhao-min' }
  ];

  /* ---------- 用户故事 [待替换：需真实内测反馈与授权] ---------- */
  const stories = [
    { id: 's1', name: 'Marcus T.', from: 'California, USA', treatmentId: 'lasik',  quote: 'My SMILE surgery cost less than my US insurance deductible — and I was back at my hotel the same afternoon.', photo: 'story-marcus' },
    { id: 's2', name: 'Aisha R.',  from: 'Dubai, UAE',       treatmentId: 'checkup', quote: 'The full-body checkup took one morning. My coordinator handled everything in Arabic over WhatsApp.',          photo: 'story-aisha' },
    { id: 's3', name: 'David K.',  from: 'Texas, USA',       treatmentId: 'dental',  quote: 'Two implants, a week in Shanghai, and I still saved over $6,000 compared to the quote back home.',        photo: 'story-david' },
    { id: 's4', name: 'Layla H.',  from: 'Riyadh, KSA',      treatmentId: 'tcm',     quote: 'Two weeks of TCM rehab for my back. Halal meals, a female coordinator, zero stress.',                      photo: 'story-layla' }
  ];

  /* ---------- FAQ（6 类，文案面向美国/中东用户） ---------- */
  const faqs = [
    { cat: 'Getting started', items: [
      { q: 'How does the process work?', a: 'Start with a free AI pre-assessment (2 minutes). Within 24–48 hours a human coordinator sends you a plan: recommended care, hospital, price range and travel dates. You decide — no commitment until you book.' },
      { q: 'Is the AI pre-assessment a medical diagnosis?', a: 'No. It organizes your information and points to directions worth discussing with a licensed doctor. Every paid plan is reviewed by a licensed Chinese specialist before you travel.' },
      { q: 'What does the free consultation include?', a: 'A coordinator reviews your AI assessment, answers questions on WhatsApp or email, and gives you a firm quote. Free, no card required.' }
    ]},
    { cat: 'Before you travel', items: [
      { q: 'Do I need a visa for China?', a: 'Most US and GCC passport holders need a tourist (L) visa. We provide the invitation documents and a step-by-step guide; many nationalities can also use 144-hour transit visa-free policies for short procedures.' },
      { q: 'How long should I plan to stay?', a: 'Checkups and genetic screening: 1–2 days. LASIK: 3–5 days. Dental implants: 5–7 days. Aesthetic surgery: 7–10 days. Your plan card shows the recommended stay before you book anything.' },
      { q: 'Can I bring a companion?', a: 'Yes — most clients travel with a partner or friend. We arrange adjoining hotel rooms and can add sightseeing days to the itinerary.' }
    ]},
    { cat: 'Cost & insurance', items: [
      { q: 'Why is it so much cheaper?', a: 'Lower facility and labor costs — not lower standards. We only partner with accredited hospitals using the same devices and implant systems as top US clinics. Prices shown are package prices: no surprise bills.' },
      { q: 'Can I use my US / travel insurance?', a: 'Most US insurance does not cover elective care abroad, but the self-pay price is often lower than a US deductible. We provide full English invoices and medical records for any reimbursement claim.' },
      { q: 'What payment methods do you accept?', a: 'International cards, wire transfer and Alipay/WeChat Pay. You pay the hospital directly for medical services — we never mark up medical bills.' }
    ]},
    { cat: 'Care in China', items: [
      { q: 'I don\'t speak Chinese. Is that a problem?', a: 'No. You get a bilingual coordinator (English; Arabic on request) who stays with you at every appointment, plus translated documents and English-speaking medical staff at all partner hospitals.' },
      { q: 'Are the hospitals internationally accredited?', a: 'We partner with JCI-accredited international hospitals and top-tier (Grade 3A) public hospitals. Accreditation details are listed on each recommendation.' },
      { q: 'What about food, prayer and cultural needs?', a: 'Halal meals, prayer arrangements and gender-matched coordinators are standard for our Middle East clients. Tell your coordinator any requirement — it goes into your itinerary.' }
    ]},
    { cat: 'Follow-up care', items: [
      { q: 'What happens after I fly home?', a: 'You leave with bilingual medical records, a home-care plan and a scheduled video follow-up with your treating doctor. Our coordinators stay reachable on WhatsApp for 12 months.' },
      { q: 'What if something goes wrong after I return?', a: 'Every plan includes a complication protocol: your doctor reviews any concern by video within 24h, and we coordinate with a local physician near you if hands-on care is needed.' }
    ]},
    { cat: 'Safety & emergencies', items: [
      { q: 'Is medical travel to China safe?', a: 'Elective procedures at accredited hospitals have safety profiles comparable to the US. We share the accreditation and outcome data for your specific procedure before you decide.' },
      { q: 'What if I have a medical emergency during the trip?', a: 'Your coordinator carries a 24/7 emergency line and your itinerary always names the nearest emergency department. Comprehensive travel insurance with medical evacuation is required for all clients.' }
    ]}
  ];

  /* ---------- 红旗症状词表（规则层，优先于任何 AI 判断） ---------- */
  const RED_FLAGS = [
    'chest pain', 'crushing pain', 'heart attack',
    'can\'t breathe', 'cant breathe', 'trouble breathing', 'shortness of breath', 'difficulty breathing',
    'unconscious', 'passed out', 'fainted',
    'heavy bleeding', 'bleeding heavily', 'won\'t stop bleeding',
    'stroke', 'face drooping', 'slurred speech', 'numb on one side', 'one side numb',
    'sudden severe pain', 'worst pain', 'sudden worst headache',
    'suicidal', 'suicide', 'hurt myself', 'end my life',
    'overdose', 'poisoning', 'seizure'
  ];

  const detectRedFlag = text => {
    const t = (text || '').toLowerCase();
    return RED_FLAGS.find(w => t.includes(w)) || null;
  };

  /* ---------- 症状关键词 → 方向映射（MVP 规则引擎；LLM 上线后同样只产出方向+置信度） ---------- */
  const SYMPTOM_MAP = [
    { keys: ['tooth', 'teeth', 'dental', 'crown', 'implant', 'gum'],            direction: 'Dental evaluation & treatment',            treatmentId: 'dental',  base: .85 },
    { keys: ['vision', 'eye', 'glasses', 'blurry', 'lasik', 'myopia', 'sight'], direction: 'Refractive / eye health assessment',      treatmentId: 'lasik',   base: .85 },
    { keys: ['skin', 'wrinkle', 'nose', 'aesthetic', 'cosmetic', 'scar'],       direction: 'Aesthetic medicine consultation',         treatmentId: 'aesthetic', base: .8 },
    { keys: ['back', 'neck', 'pain', 'joint', 'shoulder', 'knee', 'chronic'],   direction: 'Rehabilitation & pain program',           treatmentId: 'tcm',     base: .75 },
    { keys: ['checkup', 'screening', 'physical', 'annual', 'blood test'],       direction: 'Comprehensive health screening',          treatmentId: 'checkup', base: .8 },
    { keys: ['genetic', 'dna', 'gene', 'hereditary', 'family history'],         direction: 'Genetic risk screening',                  treatmentId: 'genetic', base: .8 },
    { keys: ['stomach', 'digest', 'sleep', 'fatigue', 'stress', 'weight'],      direction: 'General internal medicine / screening',   treatmentId: 'checkup', base: .6 }
  ];

  /* 症状文本 → 方向 + 置信度（不产出价格/医生） */
  const analyzeSymptoms = (text) => {
    const t = (text || '').toLowerCase();
    const hits = [];
    SYMPTOM_MAP.forEach(m => {
      const matched = m.keys.filter(k => t.includes(k));
      if (matched.length) hits.push({ direction: m.direction, treatmentId: m.treatmentId, matched, score: Math.min(m.base + matched.length * .05, .95) });
    });
    if (!hits.length) {
      return [{ direction: 'General health screening with a physician review', treatmentId: 'checkup', matched: [], score: .5 }];
    }
    return hits.sort((a, b) => b.score - a.score).slice(0, 3);
  };

  const confidenceLabel = s => s >= .8 ? 'High' : s >= .6 ? 'Medium' : 'Low';

  /* ---------- Wizard 题纲（独立页与 orb 共用） ---------- */
  const WIZARD_FLOW = {
    consumer: [
      { id: 'treatment', type: 'chips', q: 'What care are you planning?', why: 'So we can show you real package prices and the right specialists.',
        options: treatments.map(t => ({ value: t.id, label: t.short })) },
      { id: 'detail', type: 'text', q: 'Anything specific we should know?', why: 'E.g. your prescription for LASIK, or which tooth for an implant. Optional.',
        placeholder: 'Optional — e.g. “-4.5 both eyes, considering SMILE”', optional: true },
      { id: 'timing', type: 'chips', q: 'When would you like to travel?', why: 'Hospital schedules and flight prices depend on your window.',
        options: [{ value: 'within-1m', label: 'Within 1 month' }, { value: '1-3m', label: '1–3 months' }, { value: '3-6m', label: '3–6 months' }, { value: 'researching', label: 'Just researching' }] },
      { id: 'contact', type: 'contact', q: 'Where should we send your plan?', why: 'A coordinator sends the exact quote here. No spam, delete anytime.' }
    ],
    symptom: [
      { id: 'description', type: 'text', q: 'Describe what\'s going on, in your own words.', why: 'Free text works best — write like you\'d tell a friend.',
        placeholder: 'e.g. “My lower back has hurt for months, worse after sitting…”' },
      { id: 'confirm', type: 'confirm', q: 'Here\'s what I understood — right?', why: 'You can correct me before we go on.' },
      { id: 'duration', type: 'chips', q: 'How long has this been going on?', why: 'Duration changes which directions are worth discussing.',
        options: [{ value: 'days', label: 'A few days' }, { value: 'weeks', label: 'A few weeks' }, { value: 'months', label: 'Months' }, { value: 'years', label: 'Over a year' }] },
      { id: 'severity', type: 'chips', q: 'How much does it affect your day?', why: 'This sets the urgency level of your plan.',
        options: [{ value: 'mild', label: 'Mild — annoying' }, { value: 'moderate', label: 'Moderate — slows me down' }, { value: 'severe', label: 'Severe — stops me' }] },
      { id: 'contact', type: 'contact', q: 'Where should we send your plan?', why: 'A coordinator sends the exact quote here. No spam, delete anytime.' }
    ]
  };

  /* ---------- 结果计划构建（方向来自规则/AI，价格医生来自本文件） ---------- */
  const buildPlan = (path, answers) => {
    let directions = [];
    let treatmentId = null;

    if (path === 'consumer') {
      treatmentId = answers.treatment;
      const t = treatments.find(x => x.id === treatmentId);
      if (t) directions = [{ direction: t.name, treatmentId: t.id, score: .95 }];
    } else {
      directions = analyzeSymptoms(answers.description);
      treatmentId = directions[0] ? directions[0].treatmentId : 'checkup';
    }

    const treatment = treatments.find(t => t.id === treatmentId) || treatments[0];
    const doctor = doctors.find(d => treatment.doctorIds.includes(d.id)) || doctors[0];
    const saving = Math.round((1 - treatment.cnPrice[1] / treatment.usPrice[0]) * 100);

    /* 紧急度三档：症状路径按 severity，消费路径固定绿档 */
    let urgency = { level: 'plan', label: 'Good for planning ahead', tone: 'ok' };
    if (path === 'symptom') {
      if (answers.severity === 'severe') urgency = { level: 'review', label: 'Worth a specialist review soon', tone: 'warn' };
      else if (answers.severity === 'moderate') urgency = { level: 'review', label: 'Worth discussing with a doctor', tone: 'ok' };
      else urgency = { level: 'plan', label: 'Self-care & planning appropriate', tone: 'ok' };
    }

    return { path, answers, directions, treatment, doctor, saving, urgency };
  };

  /* ---------- boarding-pass 方案卡渲染（签名组件，全站共用） ---------- */
  const renderBoardingPass = (plan) => {
    const t = plan.treatment, d = plan.doctor;
    const bars = Array.from({ length: 28 }, (_, i) =>
      `<i style="height:${8 + ((i * 37) % 20)}px"></i>`).join(''); /* 伪条码，装饰 */
    return `
    <div class="bpass" role="article" aria-label="Your care plan">
      <div class="bpass__head">
        <span class="bpass__brand">VOYAGECARE</span>
        <span class="bpass__type">CARE PLAN · ${plan.path === 'consumer' ? 'ELECTIVE' : 'PRE-ASSESSMENT'}</span>
      </div>
      <div class="bpass__route">
        <div class="bpass__port"><b>HOME</b><span>Your city</span></div>
        <div class="bpass__plane" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none"><path d="M2 12h16m0 0-5-5m5 5-5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </div>
        <div class="bpass__port bpass__port--r"><b>CHINA</b><span>${d.hospital.split(',').pop().trim()}</span></div>
      </div>
      <div class="bpass__body">
        <div class="bpass__row">
          <span class="bpass__label">CARE</span>
          <b class="bpass__value">${t.name}</b>
        </div>
        <div class="bpass__row">
          <span class="bpass__label">SPECIALIST</span>
          <b class="bpass__value">${d.name} · ${d.specialty}</b>
        </div>
        <div class="bpass__row">
          <span class="bpass__label">RECOMMENDED STAY</span>
          <b class="bpass__value">${t.stayDays}</b>
        </div>
      </div>
      <div class="bpass__tear" aria-hidden="true"></div>
      <div class="bpass__price">
        <div class="bpass__price-col">
          <span class="bpass__label">CHINA PACKAGE</span>
          <b class="mono bpass__big">${fmtMoney(t.cnPrice[0])}–${fmtMoney(t.cnPrice[1])}</b>
        </div>
        <div class="bpass__price-col bpass__price-col--us">
          <span class="bpass__label">US TYPICAL</span>
          <b class="mono bpass__us">${fmtMoney(t.usPrice[0])}–${fmtMoney(t.usPrice[1])}</b>
        </div>
        <div class="bpass__save mono">SAVE ≈${plan.saving}%</div>
      </div>
      <div class="bpass__foot">
        <div class="bpass__barcode" aria-hidden="true">${bars}</div>
        <span class="bpass__stamp">${plan.urgency.label.toUpperCase()}</span>
      </div>
      <p class="bpass__note">Estimate from package list prices, 2026. Final quote after specialist review. Not a medical diagnosis.</p>
    </div>`;
  };

  /* ---------- 导出 ---------- */
  window.SITE_DATA = {
    treatments, doctors, stories, faqs,
    RED_FLAGS, detectRedFlag, WIZARD_FLOW,
    analyzeSymptoms, confidenceLabel, buildPlan, renderBoardingPass,
    fmtMoney
  };
})();
