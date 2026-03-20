/**
 * GigShield – Application Driver
 * Runs the entire UI: navigation, live data simulation, fraud analyzer, enrollment
 */

'use strict';

// ─── Navigation ───────────────────────────────────────────────────────────────
function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  const page = document.getElementById('page-' + name);
  const nav  = document.getElementById('nav-' + name);
  if (page) page.classList.add('active');
  if (nav)  nav.classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ─── Toast System ─────────────────────────────────────────────────────────────
function showToast(type, message, duration = 4000) {
  const container = document.getElementById('toast-container');
  const icons = { success:'✅', danger:'🚨', warning:'⚠️', info:'ℹ️' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type]||'•'}</span><div>${message}</div>`;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateX(30px)'; toast.style.transition = 'all 0.3s'; setTimeout(() => toast.remove(), 300); }, duration);
}

// ─── Mock Data ────────────────────────────────────────────────────────────────
const CLAIMS_DATA = [
  { id:'CLM-001', worker:'Rahul Sharma',   platform:'Swiggy',   city:'Mumbai', zone:'Bandra',       event:'extreme_rain',   amount:2500, fraudScore:5,  gpsspoof:false, status:'approved' },
  { id:'CLM-002', worker:'Arun Kumar',     platform:'Zomato',   city:'Mumbai', zone:'Andheri',      event:'extreme_rain',   amount:1800, fraudScore:12, gpsspoof:false, status:'approved' },
  { id:'CLM-003', worker:'Fake Actor A',   platform:'Swiggy',   city:'Mumbai', zone:'Dharavi',      event:'extreme_rain',   amount:3000, fraudScore:89, gpsspoof:true,  status:'rejected' },
  { id:'CLM-004', worker:'Priya Nair',     platform:'Zepto',    city:'Delhi',  zone:'South Delhi',   event:'severe_pollution',amount:2100,fraudScore:8,  gpsspoof:false, status:'approved' },
  { id:'CLM-005', worker:'Vikram Singh',   platform:'Amazon',   city:'Delhi',  zone:'North Delhi',  event:'extreme_heat',   amount:1600, fraudScore:31, gpsspoof:false, status:'approved_monitored' },
  { id:'CLM-006', worker:'Fraud Ring M1',  platform:'Blinkit',  city:'Mumbai', zone:'Dharavi',      event:'extreme_rain',   amount:2800, fraudScore:92, gpsspoof:true,  status:'rejected' },
  { id:'CLM-007', worker:'Sanjay Rao',     platform:'Dunzo',    city:'Bengaluru',zone:'Outer Ring',  event:'extreme_rain',   amount:3000, fraudScore:7,  gpsspoof:false, status:'approved' },
  { id:'CLM-008', worker:'Meena Devi',     platform:'Swiggy',   city:'Mumbai', zone:'Bandra',       event:'flood_alert',    amount:3000, fraudScore:4,  gpsspoof:false, status:'approved' },
  { id:'CLM-009', worker:'Review Case',    platform:'Zomato',   city:'Delhi',  zone:'East Delhi',   event:'severe_pollution',amount:1200,fraudScore:57, gpsspoof:false, status:'under_review' },
  { id:'CLM-010', worker:'Fraud Ring D2',  platform:'Amazon',   city:'Delhi',  zone:'South Delhi',  event:'extreme_heat',   amount:2500, fraudScore:86, gpsspoof:true,  status:'rejected' },
];

const ACTIVITY_FEED = [
  { type:'success', time:'2 min ago',  title:'Auto-Claim Triggered',   desc:'Extreme rainfall 68mm/3hr detected in Bandra, Mumbai. 38 claims auto-initiated.' },
  { type:'danger',  time:'5 min ago',  title:'Fraud Ring Detected',     desc:'12 workers submitting from identical GPS cluster in Dharavi. 35 claims blocked.' },
  { type:'success', time:'12 min ago', title:'UPI Payout Sent',         desc:'₹2,500 transferred to Rahul Sharma (Swiggy, Bandra) in 1.8 minutes.' },
  { type:'warning', time:'18 min ago', title:'Claim Under Review',      desc:'Worker CLM-009 flagged (FraudScore 57). Sent to human review queue.' },
  { type:'success', time:'31 min ago', title:'Policy Enrolled',         desc:'Priya Nair (Zepto, Delhi) enrolled in Full Shield — ₹69/week.' },
  { type:'danger',  time:'45 min ago', title:'AQI Alert – Delhi South', desc:'AQI reached 412 in South Delhi. 54 auto-claims initiated for eligible workers.' },
  { type:'success', time:'1hr ago',    title:'Weekly Premiums Collected',desc:'₹1.4L collected from 2,847 active policies across 6 cities.' },
];

const PLATFORM_STATS = [
  { name:'Swiggy',   policies:842, claims:287, premium:59, fraud:4.2, satisfaction:98 },
  { name:'Zomato',   policies:731, claims:241, premium:57, fraud:3.8, satisfaction:97 },
  { name:'Zepto',    policies:528, claims:189, premium:69, fraud:2.1, satisfaction:99 },
  { name:'Amazon',   policies:384, claims:98,  premium:42, fraud:1.9, satisfaction:96 },
  { name:'Blinkit',  policies:218, claims:67,  premium:65, fraud:5.3, satisfaction:95 },
  { name:'Dunzo',    policies:144, claims:51,  premium:55, fraud:3.1, satisfaction:97 },
];

// ─── Weather Strip ────────────────────────────────────────────────────────────
const WEATHER_ZONES = [
  { city:'Mumbai', zone:'Bandra',       status:'EXTREME RAIN', temp:38, rain:68, wind:52, aqi:142, cls:'triggered' },
  { city:'Mumbai', zone:'Andheri',      status:'HEAVY RAIN',   temp:37, rain:45, wind:40, aqi:138, cls:'warning-zone' },
  { city:'Mumbai', zone:'Thane',        status:'NORMAL',       temp:36, rain:12, wind:22, aqi:95,  cls:'' },
  { city:'Delhi',  zone:'South Delhi',  status:'HAZARDOUS AQI',temp:46, rain:0,  wind:15, aqi:412, cls:'triggered' },
  { city:'Delhi',  zone:'North Delhi',  status:'EXTREME HEAT', temp:45, rain:0,  wind:12, aqi:380, cls:'triggered' },
  { city:'BLR',    zone:'Outer Ring',   status:'HEAVY RAIN',   temp:32, rain:55, wind:35, aqi:88,  cls:'warning-zone' },
  { city:'BLR',    zone:'Central',      status:'NORMAL',       temp:30, rain:10, wind:20, aqi:70,  cls:'' },
];

function renderWeatherStrip() {
  const strip = document.getElementById('weather-strip');
  if (!strip) return;
  strip.innerHTML = WEATHER_ZONES.map(z => `
    <div class="weather-zone-card ${z.cls}">
      <div class="zone-name">${z.city} · ${z.zone}</div>
      <div class="zone-status" style="color:${z.cls==='triggered'?'var(--danger)':z.cls==='warning-zone'?'var(--warning)':'var(--success)'}">${z.status}</div>
      <div class="zone-metrics">
        <span class="zone-metric">🌡️${z.temp}°C</span>
        <span class="zone-metric">🌧️${z.rain}mm</span>
        <span class="zone-metric">💨${z.wind}km/h</span>
        <span class="zone-metric">🌫️AQI ${z.aqi}</span>
      </div>
    </div>
  `).join('');
}

function refreshWeather() {
  showToast('info', '🔄 Refreshing weather data from IMD & OpenWeatherMap APIs...');
  setTimeout(() => showToast('success', '✅ Weather data refreshed. 3 active triggers detected.'), 1500);
}

// ─── Activity Feed ────────────────────────────────────────────────────────────
function renderActivityFeed() {
  const feed = document.getElementById('activity-feed');
  if (!feed) return;
  feed.innerHTML = ACTIVITY_FEED.map(item => `
    <div class="timeline-item ${item.type}">
      <div class="timeline-time">${item.time}</div>
      <div class="timeline-title">${item.title}</div>
      <div class="timeline-desc">${item.desc}</div>
    </div>
  `).join('');
}

// ─── Claims Tables ────────────────────────────────────────────────────────────
function getStatusBadge(status) {
  const map = {
    approved:            '<span class="badge badge-success">✓ Approved</span>',
    approved_monitored:  '<span class="badge badge-warning">⚡ Approved+Monitor</span>',
    under_review:        '<span class="badge badge-info">👁 Under Review</span>',
    rejected:            '<span class="badge badge-danger">✗ Rejected</span>',
    pending_verification:'<span class="badge badge-neutral">⏳ Pending</span>',
  };
  return map[status] || status;
}

function getFraudBadge(score) {
  if (score < 20) return `<span class="badge badge-success">${score}</span>`;
  if (score < 50) return `<span class="badge badge-warning">${score}</span>`;
  return `<span class="badge badge-danger">${score}</span>`;
}

function renderRecentClaims() {
  const tbl = document.getElementById('recent-claims-table');
  if (!tbl) return;
  tbl.innerHTML = CLAIMS_DATA.slice(0,6).map(c => `
    <tr>
      <td class="font-mono text-xs">${c.id}</td>
      <td>${c.worker}</td>
      <td><span class="badge badge-neutral">${c.platform}</span></td>
      <td style="font-size:0.8rem;">${c.event.replace(/_/g,' ')}</td>
      <td style="font-weight:600;">₹${c.amount.toLocaleString()}</td>
      <td>${getFraudBadge(c.fraudScore)}</td>
      <td>${getStatusBadge(c.status)}</td>
      <td><button class="btn btn-sm btn-outline" onclick="showToast('info','Claim ${c.id}: FraudScore ${c.fraudScore}. ${c.status.toUpperCase()}.')">View</button></td>
    </tr>
  `).join('');
}

function renderAllClaims(filter = 'all') {
  const tbl = document.getElementById('all-claims-table');
  if (!tbl) return;
  const data = filter === 'all' ? CLAIMS_DATA : CLAIMS_DATA.filter(c => c.status === filter || (filter === 'approved' && c.status === 'approved_monitored'));
  tbl.innerHTML = data.map(c => `
    <tr>
      <td class="font-mono text-xs">${c.id}</td>
      <td>${c.worker}</td>
      <td style="font-size:0.8rem;">${c.city}/${c.zone}</td>
      <td style="font-size:0.8rem;">${c.event.replace(/_/g,' ')}</td>
      <td style="font-weight:600;">₹${c.amount.toLocaleString()}</td>
      <td>${getFraudBadge(c.fraudScore)}</td>
      <td>${c.gpsspoof ? '<span class="badge badge-danger">🚨 Spoofed</span>' : '<span class="badge badge-success">✓ Clean</span>'}</td>
      <td>${getStatusBadge(c.status)}</td>
    </tr>
  `).join('');
}

function filterClaims() {
  const filter = document.getElementById('claim-filter').value;
  renderAllClaims(filter);
}

function triggerAutoClaim() {
  showToast('warning', '⚡ Auto-claim scan initiated for all active policies in triggered zones...');
  setTimeout(() => showToast('success', '✅ 38 new parametric claims initiated for Bandra extreme rainfall event.'), 2000);
  setTimeout(() => showToast('danger', '🚨 12 claims blocked — fraud ring pattern detected in Dharavi cluster.'), 3500);
}

// ─── Analytics ───────────────────────────────────────────────────────────────
function renderCityBars() {
  const cities = [
    { name:'Delhi', risk:85, color:'var(--danger)' },
    { name:'Mumbai', risk:78, color:'var(--warning)' },
    { name:'Chennai', risk:62, color:'var(--warning)' },
    { name:'Hyderabad', risk:55, color:'var(--primary)' },
    { name:'Bengaluru', risk:48, color:'var(--primary)' },
    { name:'Pune', risk:35, color:'var(--success)' },
  ];
  const wrap = document.getElementById('city-bars');
  if (!wrap) return;
  wrap.innerHTML = cities.map(c => `
    <div style="margin-bottom:0.9rem;">
      <div class="flex items-center justify-between mb-1">
        <span style="font-size:0.85rem;font-weight:600;">${c.name}</span>
        <span style="font-size:0.8rem;color:var(--text-muted);">Risk Index: ${c.risk}/100</span>
      </div>
      <div class="progress-wrap"><div class="progress-bar" style="width:${c.risk}%;background:${c.color};"></div></div>
    </div>
  `).join('');
}

function renderDisruptionBreakdown() {
  const events = [
    { type:'Extreme Rain', count:892, pct:42, color:'var(--primary)' },
    { type:'Severe Pollution',count:534,pct:25, color:'var(--warning)' },
    { type:'Extreme Heat',  count:378, pct:18, color:'var(--danger)' },
    { type:'Flooding',      count:213, pct:10, color:'var(--accent)' },
    { type:'Strike/Curfew', count:107, pct:5,  color:'var(--text-muted)' },
  ];
  const wrap = document.getElementById('disruption-breakdown');
  if (!wrap) return;
  wrap.innerHTML = events.map(e => `
    <div style="margin-bottom:0.9rem;">
      <div class="flex items-center justify-between mb-1">
        <span style="font-size:0.85rem;font-weight:600;">${e.type}</span>
        <span style="font-size:0.8rem;color:var(--text-muted);">${e.count} claims (${e.pct}%)</span>
      </div>
      <div class="progress-wrap"><div class="progress-bar" style="width:${e.pct*2}%;background:${e.color};"></div></div>
    </div>
  `).join('');
}

function renderSeasonalBars() {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const multipliers = [1.0,1.0,1.1,1.3,1.4,1.6,1.8,1.7,1.5,1.2,1.1,1.0];
  const maxM = 1.8;
  const barsWrap = document.getElementById('seasonal-bars');
  const labelsWrap = document.getElementById('seasonal-labels');
  if (!barsWrap || !labelsWrap) return;
  const currentMonth = new Date().getMonth();
  barsWrap.innerHTML = multipliers.map((m, i) => {
    const h = Math.round((m / maxM) * 160);
    const isCurrentMonth = i === currentMonth;
    const col = m >= 1.6 ? 'var(--danger)' : m >= 1.3 ? 'var(--warning)' : 'var(--primary)';
    return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;">
      <span style="font-size:0.65rem;color:${col};font-weight:700;">${m}x</span>
      <div style="width:100%;height:${h}px;background:${col};border-radius:4px 4px 0 0;opacity:${isCurrentMonth?1:0.65};${isCurrentMonth?'box-shadow:0 0 12px '+col:''};transition:all 0.5s;"></div>
    </div>`;
  }).join('');
  labelsWrap.innerHTML = months.map((m, i) => `
    <div style="flex:1;text-align:center;font-size:0.65rem;color:var(--text-muted);font-weight:${i===currentMonth?700:400};color:${i===currentMonth?'var(--primary)':'var(--text-muted)'};">${m}</div>
  `).join('');
}

function renderPlatformTable() {
  const tbl = document.getElementById('platform-table');
  if (!tbl) return;
  tbl.innerHTML = PLATFORM_STATS.map(p => `
    <tr>
      <td><span style="font-weight:700;">${p.name}</span></td>
      <td>${p.policies.toLocaleString()}</td>
      <td>${p.claims.toLocaleString()}</td>
      <td>₹${p.premium}/week</td>
      <td>${p.fraud}%</td>
      <td><span style="color:var(--success);font-weight:600;">${p.satisfaction}%</span></td>
    </tr>
  `).join('');
}

// ─── Premium Calculator ────────────────────────────────────────────────────────
const CITY_RISK = { mumbai:.78, delhi:.85, bengaluru:.48, hyderabad:.55, chennai:.62, pune:.35 };
const PLATFORM_F = { swiggy:.88, zomato:.90, zepto:.95, amazon:.60, dunzo:.85, blinkit:.92 };
const VEHICLE_F  = { bike:1.0, cycle:1.3, foot:1.2 };
const MONTHS = [1,1,1.1,1.3,1.4,1.6,1.8,1.7,1.5,1.2,1.1,1];

function updatePremium() {
  const city     = document.getElementById('f-city')?.value || 'mumbai';
  const platform = document.getElementById('f-platform')?.value || 'swiggy';
  const vehicle  = document.getElementById('f-vehicle')?.value || 'bike';
  const earn     = parseInt(document.getElementById('f-earnings')?.value) || 3500;

  const season   = MONTHS[new Date().getMonth()];
  const cityR    = CITY_RISK[city] || 0.6;
  const platF    = PLATFORM_F[platform] || 0.8;
  const vehF     = VEHICLE_F[vehicle]  || 1.0;

  const tiers = [
    { name:'Basic Shield',  icon:'🟢', pctPrem:0.008, covMult:1.5, cap:1000, triggers:'Rain, Flood' },
    { name:'Full Shield',   icon:'🔵', pctPrem:0.015, covMult:3,   cap:3000, triggers:'Rain + Heat + AQI + Strike', recommended:true },
    { name:'Elite Shield',  icon:'🟣', pctPrem:0.025, covMult:5,   cap:5000, triggers:'All Events + Curfew + Wind' },
  ];

  const tierColors = ['#4CAF50','#6C63FF','#9C27B0'];

  const planCards = document.getElementById('plan-cards');
  const premDisplay = document.getElementById('premium-display');
  const riskBreak = document.getElementById('risk-breakdown');
  if (!planCards) return;

  const cards = tiers.map((t, idx) => {
    const base = earn * t.pctPrem;
    const premium = Math.round(base * cityR * season * platF * vehF);
    const coverage = Math.min(earn * t.covMult, t.cap);
    return { ...t, premium, coverage, color: tierColors[idx] };
  });

  planCards.innerHTML = cards.map(c => `
    <div class="tier-card ${c.recommended?'recommended':''}" style="--tier-color:${c.color}">
      ${c.recommended ? '<div class="tier-recommended-badge">✦ Recommended</div>' : ''}
      <div class="tier-name">${c.icon} ${c.name}</div>
      <div class="tier-price">₹${c.premium}<span>/week</span></div>
      <div class="tier-coverage">Coverage up to <strong>₹${c.coverage.toLocaleString()}</strong></div>
      <ul class="tier-features">
        <li>${c.triggers}</li>
        <li>Automatic parametric claim</li>
        <li>Instant UPI payout</li>
        ${c.recommended ? '<li>AI fraud protection</li>' : ''}
        ${c.name === 'Elite Shield' ? '<li>Priority human review</li>' : ''}
      </ul>
      <button class="btn ${c.recommended?'btn-primary':'btn-outline'} w-full mt-3" onclick="selectPlan('${c.name}',${c.premium})">Select This Plan</button>
    </div>
  `).join('');

  if (riskBreak) {
    riskBreak.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:0.4rem;">
        <div class="flex justify-between"><span>City Risk (${city})</span><span>${Math.round(cityR*100)}%</span></div>
        <div class="flex justify-between"><span>Season Multiplier (${new Date().toLocaleString('en',{month:'short'})})</span><span>${season}x</span></div>
        <div class="flex justify-between"><span>Platform Factor (${platform})</span><span>${platF}x</span></div>
        <div class="flex justify-between"><span>Vehicle Factor (${vehicle})</span><span>${vehF}x</span></div>
      </div>
    `;
  }
}

function selectPlan(name, premium) {
  showToast('success', `✅ ${name} selected! ₹${premium}/week. Proceed to complete KYC on mobile app.`);
}

// ─── Worker Enrollment ────────────────────────────────────────────────────────
function enrollWorker() {
  const name = document.getElementById('f-name')?.value;
  const phone = document.getElementById('f-phone')?.value;
  if (!name || !phone) {
    showToast('warning', '⚠️ Please fill in name and phone number before enrolling.');
    return;
  }
  showToast('success', `🎉 ${name} enrolled! SMS sent to ${phone}. Complete video KYC on the GigShield app.`);
  setTimeout(() => showToast('info', '📱 Device fingerprinting and anti-spoofing baseline captured on first app login.'), 2000);
}

// ─── Fraud Analyzer ───────────────────────────────────────────────────────────
function runFraudAnalysis() {
  const gpsAcc     = parseInt(document.getElementById('an-gps-acc')?.value) || 45;
  const gpsStatic  = parseInt(document.getElementById('an-gps-static')?.value) || 5;
  const mockGPS    = document.getElementById('an-mock-gps')?.checked || false;
  const vpn        = document.getElementById('an-vpn')?.checked || false;
  const root       = document.getElementById('an-root')?.checked || false;
  const orders     = parseInt(document.getElementById('an-orders')?.value) || 2;
  const battery    = parseInt(document.getElementById('an-battery')?.value) || 65;

  let score = 0;
  const signals = [];

  if (gpsAcc > 100)    { score += 8;  signals.push({ label:'GPS accuracy poor', pts:8,  icon:'📍' }); }
  if (gpsStatic >= 30) { score += 10; signals.push({ label:'Location unchanged 30+ min', pts:10, icon:'🔒' }); }
  if (mockGPS)         { score += 20; signals.push({ label:'Mock Location enabled', pts:20, icon:'🚨' }); }
  if (vpn)             { score += 12; signals.push({ label:'VPN active', pts:12, icon:'🔐' }); }
  if (root)            { score += 18; signals.push({ label:'Rooted device', pts:18, icon:'⚠️' }); }
  if (orders === 0)    { score += 10; signals.push({ label:'No active orders', pts:10, icon:'📦' }); }
  if (battery > 90)    { score += 6;  signals.push({ label:'Battery too high (90%+)', pts:6,  icon:'🔋' }); }

  const cappedScore = Math.min(score, 100);
  let decision, decClass, decIcon;
  if (cappedScore < 20)      { decision='AUTO-APPROVED';  decClass='success'; decIcon='✅'; }
  else if (cappedScore < 50) { decision='SOFT FLAG';       decClass='warning'; decIcon='⚡'; }
  else if (cappedScore < 75) { decision='HUMAN REVIEW';    decClass='warning'; decIcon='👁'; }
  else                        { decision='REJECTED';        decClass='danger';  decIcon='❌'; }

  const resultCard = document.getElementById('fraud-result-content');
  if (!resultCard) return;

  resultCard.innerHTML = `
    <div style="text-align:center;padding:1rem 0 1.5rem;">
      <div style="font-size:3rem;margin-bottom:0.5rem;">${decIcon}</div>
      <div style="font-size:1.8rem;font-weight:800;color:var(--${decClass});font-family:'Space Grotesk',sans-serif;">${cappedScore} / 100</div>
      <div style="font-size:1rem;font-weight:700;color:var(--${decClass});margin-top:0.3rem;">${decision}</div>
    </div>
    <div class="fraud-meter mb-2">
      <div class="fraud-meter-bar"><div class="fraud-meter-fill" style="width:${cappedScore}%"></div></div>
      <div class="flex justify-between text-xs text-muted"><span>Clean (0)</span><span>Soft Flag (20)</span><span>Review (50)</span><span>Reject (75+)</span></div>
    </div>
    <div class="divider"></div>
    <div style="font-weight:600;font-size:0.8rem;margin-bottom:0.5rem;color:var(--text-secondary);">SIGNALS DETECTED</div>
    ${signals.length === 0 ? '<div class="text-sm text-muted">No fraud signals detected.</div>' :
      signals.map(s => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:0.4rem 0;border-bottom:1px solid var(--border);font-size:0.83rem;">
          <span>${s.icon} ${s.label}</span>
          <span class="badge badge-danger">+${s.pts}pts</span>
        </div>
      `).join('')
    }
    <div class="alert alert-${decClass} mt-2" style="margin-top:1rem;font-size:0.8rem;">
      ${decIcon} <div><strong>${decision}:</strong>
      ${cappedScore < 20 ? 'Claim passes all checks. Payout initiated automatically.' :
        cappedScore < 50 ? 'Claim approved with enhanced monitoring flag on account.' :
        cappedScore < 75 ? 'Claim held for human investigator review. Decision within 4 hours.' :
        'High-confidence fraud detected. Claim rejected. Worker may appeal within 24 hours.'}</div>
    </div>
  `;

  showToast(decClass === 'success' ? 'success' : decClass === 'warning' ? 'warning' : 'danger',
    `${decIcon} FraudScore: ${cappedScore}/100 — ${decision}`);
}

// ─── Syndicate Detail ─────────────────────────────────────────────────────────
function showSyndicateDetail() {
  showToast('danger', '🕵️ Ring #FR-001: 35 workers, Dharavi. All from same Telegram burst. ₹87,500 blocked.');
}

// ─── Counter Animation ────────────────────────────────────────────────────────
function animateCounter(id, value, prefix='', suffix='') {
  const el = document.getElementById(id);
  if (!el) return;
  let start = 0;
  const isFloat = typeof value === 'string' && value.includes('.');
  const numVal = parseFloat(value.replace(/[^0-9.]/g,''));
  const duration = 1200;
  const step = numVal / (duration / 16);
  let current = 0;
  const timer = setInterval(() => {
    current += step;
    if (current >= numVal) { current = numVal; clearInterval(timer); }
    el.textContent = prefix + (isFloat ? current.toFixed(1) : Math.round(current).toLocaleString()) + suffix;
  }, 16);
}

// ─── Simulated Live Updates ───────────────────────────────────────────────────
let liveCtr = 0;
function startLiveUpdates() {
  setInterval(() => {
    liveCtr++;
    if (liveCtr % 8 === 0) {
      const msgs = [
        ['success', '⚡ New auto-claim: Ravi Kumar (Blinkit, Andheri). ₹1,800. Score: 4. AUTO-APPROVED.'],
        ['danger',  '🚨 Fraud attempt blocked: 7 workers from GPS cluster in Dharavi. Scores 87–93.'],
        ['success', '💸 UPI Transfer: ₹3,000 to Priya M. (Zepto Delhi) — 1.6 min from trigger.'],
        ['warning', '⚠️ AQI Alert: Delhi East crossing threshold of 300. 23 policies eligibility activated.'],
      ];
      const m = msgs[liveCtr % msgs.length];
      showToast(m[0], m[1]);
      document.getElementById('nav-alert-text').textContent = `${3 + (liveCtr%3)} alerts live`;
    }
  }, 3000);
}

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  renderWeatherStrip();
  renderActivityFeed();
  renderRecentClaims();
  renderAllClaims();
  renderCityBars();
  renderDisruptionBreakdown();
  renderSeasonalBars();
  renderPlatformTable();
  updatePremium();
  startLiveUpdates();

  // Animate stats
  setTimeout(() => {
    animateCounter('stat-policies', 2847, '', '');
  }, 400);
});
