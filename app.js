// =====================================================
// SOFTLIFE – COMPLETE APPLICATION JAVASCRIPT
// =====================================================

// ── STATE ──
const SL = {
  currentUser: null,
  gender: 'default',
  habits: [],
  moods: [],
  activities: [],
  goals: [],
  journal: [],
  ttsActive: false,
  charts: {},
  chartsRendered: false,
};

// ── API CONFIG ──
// Auto-detects the correct API path — works on any XAMPP folder name
const API = (function() {
  const parts = window.location.pathname.split('/');
  // Find index.html position and build path up to /api
  const idx = parts.findIndex(p => p.toLowerCase() === 'index.html');
  const base = idx > -1 ? parts.slice(0, idx).join('/') : parts.slice(0, -1).join('/');
  return window.location.origin + base + '/api';
})();

// ── API HELPER ──
async function apiCall(endpoint, method = 'GET', body = null) {
  const token = localStorage.getItem('sl_token') || '';
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json', 'X-Token': token },
  };
  if (body) opts.body = JSON.stringify(body);
  try {
    const res = await fetch(API + endpoint, opts);
    const data = await res.json();
    if (!res.ok && data.error) console.warn('API:', data.error);
    return data;
  } catch(e) {
    console.error('Network error:', e);
    return { success: false, error: 'Cannot reach server.' };
  }
}

// ── SAVE STATE (no-op — data lives in DB now) ──
function saveState() {
  // Data is saved via individual API calls
  // localStorage only stores the auth token + gender
  localStorage.setItem('sl_gender', SL.gender);
}

// ── LOAD STATE FROM SERVER ──
async function loadState() {
  const token = localStorage.getItem('sl_token');
  if (!token) return; // not logged in

  const data = await apiCall('/load.php');
  if (!data.success) {
    // Token expired
    localStorage.removeItem('sl_token');
    return;
  }

  SL.currentUser = data.user;
  SL.gender = data.user.gender || localStorage.getItem('sl_gender') || 'default';

  // Map DB rows to frontend format
  SL.habits = (data.habits || []).map(h => ({
    id: h.id, name: h.name,
    done: !!parseInt(h.done),
    streak: h.streak || 1,
    date: new Date().toDateString(),  // today
  }));

  SL.moods = (data.moods || []).map(m => ({
    id: m.id, emoji: m.emoji, label: m.label, note: m.note,
    date: new Date(m.mood_date + 'T00:00:00').toDateString(),
    ts: new Date(m.logged_at).toLocaleTimeString(),
  }));

  SL.activities = (data.activities || []).map(a => ({
    id: a.id, name: a.name, type: a.type,
    duration: a.duration,
    date: new Date(a.activity_date + 'T00:00:00').toDateString(),
  }));

  SL.goals = (data.goals || []).map(g => ({
    id: g.id, title: g.title, cat: g.cat,
    progress: parseInt(g.progress) || 0,
    status: g.status,
    date: g.target_date || '',
  }));

  SL.journal = (data.journal || []).map(j => ({
    id: j.id, title: j.title, content: j.content,
    date: new Date(j.created_at).toLocaleDateString(),
    ts: new Date(j.created_at).toLocaleString(),
  }));
}

// ── CLOCK ──
function updateClock() {
  const now = new Date();
  const t = now.toLocaleTimeString('en-US', {hour:'2-digit', minute:'2-digit', second:'2-digit'});
  const d = now.toLocaleDateString('en-US', {weekday:'short', year:'numeric', month:'short', day:'numeric'});
  const c = document.getElementById('liveClock');
  const dt = document.getElementById('liveDate');
  if (c) { c.textContent = '🕐 ' + t; c.setAttribute('datetime', now.toISOString()); }
  if (dt) dt.textContent = '📅 ' + d;
}
updateClock();
setInterval(updateClock, 1000);

// ── PAGE ROUTING ──
function showPage(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const page = document.getElementById(pageId);
  if (page) {
    page.classList.add('active');
    window.scrollTo({top:0, behavior:'smooth'});
    updateFavicon(pageId);
  }
  if (pageId === 'dashPage') {
    applyTheme(SL.gender);
    refreshDashboard();
    // Set favicon to current section on dashboard load
    const activeSection = document.querySelector('.dash-section.active');
    if (activeSection) updateFavicon(activeSection.id);
    else updateFavicon('overview');
  }
  if (pageId === 'homePage' || pageId === 'aboutPage') {
    setTimeout(() => {
      initScrollReveal();
      animateCounters();
    }, 80);
  }
}

function updateFavicon(pageId) {
  const icons = {
    // Main pages
    homePage:    ['🏠', '%237c6ff7', 'SoftLife – Your Soft Life Starts Here'],
    aboutPage:   ['💜', '%237c6ff7', 'About Us – SoftLife'],
    loginPage:   ['🔑', '%235a52d4', 'Sign In – SoftLife'],
    signupPage:  ['🚀', '%23e8679a', 'Create Account – SoftLife'],
    dashPage:    ['🏡', '%233dba7a', 'Dashboard – SoftLife'],
    // Dashboard sections
    overview:    ['🏡', '%233dba7a', 'Dashboard – SoftLife'],
    habits:      ['✅', '%2322c55e', 'Habits – SoftLife'],
    mood:        ['😊', '%23f59e0b', 'Mood Log – SoftLife'],
    activities:  ['⚡', '%23ef4444', 'Activities – SoftLife'],
    goals:       ['🎯', '%233b82f6', 'Goals – SoftLife'],
    journal:     ['📓', '%238b5cf6', 'Journal – SoftLife'],
    milestones:  ['🏆', '%23f97316', 'Milestones – SoftLife'],
    analytics:   ['📊', '%230ea5e9', 'Analytics – SoftLife'],
    profile:     ['👤', '%236366f1', 'Profile – SoftLife'],
  };
  const [em, col, title] = icons[pageId] || ['🌱', '%237c6ff7', 'SoftLife'];
  document.getElementById('favicon').href = `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect width='64' height='64' rx='16' fill='${col}'/><text y='46' x='8' font-size='42'>${em}</text></svg>`;
  if (title) document.title = title;
}

// ── THEME / GENDER ──
function setGender(g) {
  SL.gender = g;
  applyTheme(g);
  document.getElementById('genderInput').value = g;
  document.getElementById('maleBtn').classList.toggle('active', g === 'male');
  document.getElementById('femaleBtn').classList.toggle('active', g === 'female');
  document.getElementById('maleBtn').setAttribute('aria-pressed', g === 'male');
  document.getElementById('femaleBtn').setAttribute('aria-pressed', g === 'female');
  // Profile buttons too
  const pm = document.getElementById('profileMaleBtn');
  const pf = document.getElementById('profileFemaleBtn');
  if (pm) { pm.classList.toggle('active', g === 'male'); pm.setAttribute('aria-pressed', g === 'male'); }
  if (pf) { pf.classList.toggle('active', g === 'female'); pf.setAttribute('aria-pressed', g === 'female'); }
  // Chip label
  const chip = document.getElementById('profileThemeChip');
  if (chip) chip.textContent = g === 'male' ? '💚 Green Theme' : g === 'female' ? '🌸 Pink Theme' : 'Default Theme';
  localStorage.setItem('sl_gender', g);
  saveState();
}

function applyTheme(g) {
  document.body.classList.remove('theme-male','theme-female');
  document.getElementById('htmlRoot').classList.remove('theme-male','theme-female');
  if (g === 'male') {
    document.body.classList.add('theme-male');
    document.getElementById('htmlRoot').classList.add('theme-male');
  } else if (g === 'female') {
    document.body.classList.add('theme-female');
    document.getElementById('htmlRoot').classList.add('theme-female');
  }
}

// ── DARK MODE ──
function toggleDark() {
  const on = document.getElementById('htmlRoot').classList.toggle('dark-mode');
  localStorage.setItem('sl_dark', on ? '1' : '0');
  document.getElementById('darkBtn').setAttribute('aria-pressed', on);
}

// ── HIGH CONTRAST ──
function toggleContrast() {
  const on = document.getElementById('htmlRoot').classList.toggle('high-contrast');
  localStorage.setItem('sl_hc', on ? '1' : '0');
  document.getElementById('contrastBtn').setAttribute('aria-pressed', on);
}

// ── TEXT SIZE ──
let textLevel = 0;
function increaseText() {
  if (textLevel < 2) textLevel++;
  applyTextSize();
}
function decreaseText() {
  if (textLevel > 0) textLevel--;
  applyTextSize();
}
function applyTextSize() {
  document.getElementById('htmlRoot').classList.remove('text-lg','text-xl');
  if (textLevel === 1) document.getElementById('htmlRoot').classList.add('text-lg');
  if (textLevel === 2) document.getElementById('htmlRoot').classList.add('text-xl');
  localStorage.setItem('sl_text', textLevel);
}

// ── TEXT-TO-SPEECH ──
function toggleTTS() {
  SL.ttsActive = !SL.ttsActive;
  document.getElementById('ttsBtn').setAttribute('aria-pressed', SL.ttsActive);
  if (SL.ttsActive) {
    readCurrentPage();
  } else {
    window.speechSynthesis.cancel();
  }
}

function readCurrentPage() {
  if (!SL.ttsActive) return;
  const main = document.querySelector('.dash-section.active') ||
               document.querySelector('.page.active');
  if (!main) return;
  const text = main.innerText || main.textContent;
  const utter = new SpeechSynthesisUtterance(text.replace(/\s+/g, ' ').trim().substring(0, 2000));
  utter.rate = 0.9;
  utter.onend = () => { SL.ttsActive = false; document.getElementById('ttsBtn').setAttribute('aria-pressed', false); };
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utter);
}

// ── A11Y PANEL ──
function toggleA11yPanel() {
  document.getElementById('a11yPanel').classList.toggle('open');
}

// ── COOKIE CONSENT ──
function initCookies() {
  if (!localStorage.getItem('sl_cookies_accepted')) {
    document.getElementById('cookieBanner').classList.add('show');
  }
}
function acceptCookies() {
  localStorage.setItem('sl_cookies_accepted', '1');
  document.getElementById('cookieBanner').classList.remove('show');
}
function manageCookies() {
  alert('Cookie preferences:\n\n✅ Essential cookies (cannot disable)\n✅ Preference cookies (theme, accessibility)\n\nNo tracking or advertising cookies are used.');
  acceptCookies();
}

// ── SEARCH ──
const SEARCH_ITEMS = [
  {icon:'🏡', label:'Dashboard', desc:'Overview & stats', page:'dashPage', section:'overview'},
  {icon:'✅', label:'Habits', desc:'Track daily habits', page:'dashPage', section:'habits'},
  {icon:'😊', label:'Mood Log', desc:'Log your feelings', page:'dashPage', section:'mood'},
  {icon:'🏃', label:'Activities', desc:'Log exercise & sports', page:'dashPage', section:'activities'},
  {icon:'🎯', label:'Goals', desc:'Set and achieve goals', page:'dashPage', section:'goals'},
  {icon:'📓', label:'Journal', desc:'Write journal entries', page:'dashPage', section:'journal'},
  {icon:'🏅', label:'Milestones', desc:'Streaks & achievements', page:'dashPage', section:'milestones'},
  {icon:'📊', label:'Analytics', desc:'Progress charts', page:'dashPage', section:'analytics'},
  {icon:'👤', label:'Profile', desc:'Settings & preferences', page:'dashPage', section:'profile'},
  {icon:'🔐', label:'Sign In', desc:'Login page', page:'loginPage'},
  {icon:'📝', label:'Sign Up', desc:'Create account', page:'signupPage'},
];

function openSearch() {
  document.getElementById('searchOverlay').classList.add('open');
  setTimeout(() => document.getElementById('searchInput').focus(), 60);
  renderSearch(SEARCH_ITEMS);
}
function closeSearch() {
  document.getElementById('searchOverlay').classList.remove('open');
  document.getElementById('searchInput').value = '';
}
function handleSearchOverlayClick(e) {
  if (e.target === document.getElementById('searchOverlay')) closeSearch();
}
function filterSearch(v) {
  const q = v.toLowerCase().trim();
  renderSearch(q ? SEARCH_ITEMS.filter(i => i.label.toLowerCase().includes(q) || i.desc.toLowerCase().includes(q)) : SEARCH_ITEMS);
}
function renderSearch(items) {
  const r = document.getElementById('searchResults');
  if (!items.length) { r.innerHTML = '<div style="padding:20px;text-align:center;color:var(--muted);">No results found</div>'; return; }
  r.innerHTML = '<div class="sr-cat">Pages & Sections</div>' +
    items.map(i => `<div class="sr-item" role="option" tabindex="0"
      onclick="searchGo('${i.page}','${i.section||''}')"
      onkeydown="if(event.key==='Enter')searchGo('${i.page}','${i.section||''}')">
      <span class="sr-icon" aria-hidden="true">${i.icon}</span>
      <div><div class="sr-label">${i.label}</div><div class="sr-desc">${i.desc}</div></div>
    </div>`).join('');
}
function searchGo(page, section) {
  closeSearch();
  showPage(page);
  if (section) setTimeout(() => showSection(section), 100);
}

document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); openSearch(); }
  if (e.key === 'Escape') {
    closeSearch();
    closeModal();
    document.getElementById('a11yPanel').classList.remove('open');
  }
});

// ── PASSWORD TOGGLE ──
function togglePw(fieldId, btn) {
  const f = document.getElementById(fieldId);
  const vis = f.type === 'password';
  f.type = vis ? 'text' : 'password';
  btn.textContent = vis ? '🙈' : '👁';
  btn.setAttribute('aria-label', vis ? 'Hide password' : 'Show password');
}

// ── FORM VALIDATION ──
function validateEmail(input) {
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value.trim());
  setFieldState(input, valid, input.value.length > 0);
  return valid;
}

function validatePassword(input, hintId) {
  const v = input.value;
  const hint = document.getElementById(hintId);
  if (v.length === 0) { setFieldState(input, false, false); if(hint) {hint.textContent='8–20 characters, letters + numbers required';hint.className='field-hint';} return false; }
  if (v.length < 8) { setFieldState(input, false, true); if(hint) {hint.textContent='Too short (min 8 characters)';hint.className='field-hint error';} return false; }
  if (v.length > 20) { setFieldState(input, false, true); if(hint) {hint.textContent='Too long (max 20 characters)';hint.className='field-hint error';} return false; }
  if (!/[a-zA-Z]/.test(v)) { setFieldState(input, false, true); if(hint) {hint.textContent='Must include letters';hint.className='field-hint error';} return false; }
  if (!/[0-9]/.test(v)) { setFieldState(input, false, true); if(hint) {hint.textContent='Must include numbers';hint.className='field-hint error';} return false; }
  setFieldState(input, true, true);
  if(hint) {hint.textContent='✓ Strong password!';hint.className='field-hint success';}
  return true;
}

function validateUsername(input) {
  const v = input.value;
  if (v.length < 4) { setFieldState(input, false, v.length > 0); return false; }
  if (v.length > 15) { setFieldState(input, false, true); return false; }
  setFieldState(input, true, true);
  return true;
}

function validateConfirmPw(input) {
  const pw = document.getElementById('signupPassword').value;
  const match = input.value === pw && pw.length > 0;
  const hint = document.getElementById('confirmPwHint');
  setFieldState(input, match, input.value.length > 0);
  if (hint) {
    hint.textContent = match ? '✓ Passwords match!' : input.value.length > 0 ? 'Passwords do not match' : '';
    hint.className = 'field-hint ' + (match ? 'success' : input.value.length > 0 ? 'error' : '');
  }
  return match;
}

function setFieldState(input, valid, touched) {
  input.classList.remove('valid','invalid');
  if (touched) input.classList.add(valid ? 'valid' : 'invalid');
}

// ── PASSWORD STRENGTH ──
function checkPwStrength(v) {
  const wrap = document.getElementById('pwStrength');
  const fill = document.getElementById('pwStrengthFill');
  const lbl = document.getElementById('pwStrengthLabel');
  if (!v) { if(wrap) wrap.style.display='none'; return; }
  if(wrap) wrap.style.display='block';
  let score = 0;
  if (v.length >= 8) score++;
  if (v.length >= 12) score++;
  if (/[A-Z]/.test(v)) score++;
  if (/[0-9]/.test(v)) score++;
  if (/[^a-zA-Z0-9]/.test(v)) score++;
  const levels = [
    {pct:'20%', color:'#e85d5d', label:'Weak'},
    {pct:'40%', color:'#f59e0b', label:'Fair'},
    {pct:'60%', color:'#f59e0b', label:'Good'},
    {pct:'80%', color:'#3dba7a', label:'Strong'},
    {pct:'100%', color:'#059669', label:'Very Strong'},
  ];
  const l = levels[Math.min(score, 4)];
  if(fill) { fill.style.width = l.pct; fill.style.background = l.color; }
  if(lbl) { lbl.textContent = l.label; lbl.style.color = l.color; }
}

// ── CAPTCHA ──
/* ══════════════════════════════════════════
   CUSTOM IMAGE CAPTCHA – no external keys
   ══════════════════════════════════════════ */
let signupCaptchaText = '';

function generateCaptchaText(len = 5) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I,O,0,1 (confusing)
  let s = '';
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

function drawSignupCaptcha() {
  const canvas = document.getElementById('signupCaptchaCanvas');
  if (!canvas) return;
  const ctx  = canvas.getContext('2d');
  const W    = canvas.width;
  const H    = canvas.height;

  signupCaptchaText = generateCaptchaText(5);

  // ── Background ──
  ctx.clearRect(0, 0, W, H);
  const isDark = document.getElementById('htmlRoot')?.classList.contains('dark-mode');
  ctx.fillStyle = isDark ? '#1e1b2e' : '#f0eeff';
  ctx.fillRect(0, 0, W, H);

  // ── Noise dots ──
  for (let i = 0; i < 60; i++) {
    ctx.beginPath();
    ctx.arc(Math.random() * W, Math.random() * H, Math.random() * 1.5, 0, Math.PI * 2);
    ctx.fillStyle = isDark
      ? `rgba(255,255,255,${Math.random() * .25})`
      : `rgba(0,0,0,${Math.random() * .18})`;
    ctx.fill();
  }

  // ── Noise lines ──
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(Math.random() * W, Math.random() * H);
    ctx.lineTo(Math.random() * W, Math.random() * H);
    ctx.strokeStyle = isDark
      ? `rgba(200,180,255,${Math.random() * .35})`
      : `rgba(100,80,200,${Math.random() * .25})`;
    ctx.lineWidth = Math.random() * 1.5 + 0.5;
    ctx.stroke();
  }

  // ── Characters (each individually rotated/coloured) ──
  const colors = isDark
    ? ['#c4b5fd','#a78bfa','#818cf8','#f0abfc','#67e8f9']
    : ['#6d28d9','#4f46e5','#7c3aed','#be185d','#0369a1'];

  const charW = W / (signupCaptchaText.length + 1);
  signupCaptchaText.split('').forEach((ch, i) => {
    ctx.save();
    const x = charW * (i + 0.9) + Math.random() * 6 - 3;
    const y = H / 2 + Math.random() * 8 - 4;
    ctx.translate(x, y);
    ctx.rotate((Math.random() - 0.5) * 0.55);
    ctx.font = `bold ${22 + Math.floor(Math.random() * 6)}px monospace`;
    ctx.fillStyle = colors[i % colors.length];
    ctx.shadowColor = isDark ? 'rgba(0,0,0,.6)' : 'rgba(0,0,0,.2)';
    ctx.shadowBlur  = 2;
    ctx.fillText(ch, 0, 7);
    ctx.restore();
  });

  // Reset input
  const inp = document.getElementById('signupCaptchaInput');
  if (inp) { inp.value = ''; inp.classList.remove('error'); }
  const hint = document.getElementById('signupCaptchaHint');
  if (hint) { hint.textContent = 'Enter the characters shown above'; hint.style.color = ''; }
}

function refreshCaptcha() { drawSignupCaptcha(); } // legacy alias


// ── LOGIN ──
async function handleLogin(e) {
  e.preventDefault();
  const email  = document.getElementById('loginEmail').value.trim();
  const pw     = document.getElementById('loginPassword').value;
  const btn    = document.getElementById('loginBtn');
  const txt    = document.getElementById('loginBtnText');

  if (!validateEmail(document.getElementById('loginEmail'))) {
    showAuthAlert('loginAlert', '❌ Please enter a valid email address.', 'error'); return;
  }
  if (!pw || pw.length < 8) {
    showAuthAlert('loginAlert', '❌ Password must be at least 8 characters.', 'error'); return;
  }

  btn.disabled = true; txt.textContent = 'Signing in…';

  const data = await apiCall('/login.php', 'POST', { email, password: pw });
  if (data.success) {
    localStorage.setItem('sl_token', data.token);
    SL.currentUser = data.user;
    SL.gender = data.user.gender || 'default';
    showAuthAlert('loginAlert', '✅ Welcome back! Loading your dashboard…', 'success');
    await loadState();
    setTimeout(() => { applyTheme(SL.gender); showPage('dashPage'); }, 900);
  } else {
    showAuthAlert('loginAlert', '❌ ' + (data.error || 'Login failed.'), 'error');
    btn.disabled = false; txt.textContent = 'Sign In';
  }
}

// ── SIGNUP ──
async function handleSignup(e) {
  e.preventDefault();
  const username  = document.getElementById('signupUsername').value.trim();
  const email     = document.getElementById('signupEmail').value.trim();
  const pw        = document.getElementById('signupPassword').value;
  const confirmPw = document.getElementById('confirmPassword').value;
  const terms     = document.getElementById('termsCheck').checked;
  const gender    = document.getElementById('genderInput').value;

  if (!validateUsername(document.getElementById('signupUsername'))) {
    showAuthAlert('signupAlert', '❌ Username must be 4–15 characters.', 'error'); return;
  }
  if (!validateEmail(document.getElementById('signupEmail'))) {
    showAuthAlert('signupAlert', '❌ Please enter a valid email address.', 'error'); return;
  }
  if (!gender) {
    showAuthAlert('signupAlert', '❌ Please choose a theme (Male / Female).', 'error'); return;
  }
  if (!validatePassword(document.getElementById('signupPassword'), 'signupPwHint')) {
    showAuthAlert('signupAlert', '❌ Password must be 8–20 characters with letters and numbers.', 'error'); return;
  }
  if (!validateConfirmPw(document.getElementById('confirmPassword'))) {
    showAuthAlert('signupAlert', '❌ Passwords do not match.', 'error'); return;
  }
  if (!terms) {
    showAuthAlert('signupAlert', '❌ Please accept the Terms of Service.', 'error'); return;
  }

  // ── reCAPTCHA Verification ──
  if (!window.rcSignupVerified) {
    const h = document.getElementById('signupCaptchaHint');
    if (h) { h.style.display = 'block'; }
    showAuthAlert('signupAlert', '❌ Please verify that you are not a robot.', 'error');
    return;
  }

  const btn = document.getElementById('signupBtn');
  const txt = document.getElementById('signupBtnText');
  btn.disabled = true; txt.textContent = 'Creating account…';

  const data = await apiCall('/signup.php', 'POST', { username, email, password: pw, gender });
  if (data.success) {
    localStorage.setItem('sl_token', data.token);
    SL.currentUser = data.user;
    SL.gender = gender;
    showAuthAlert('signupAlert', '✅ Account created! Redirecting to your dashboard…', 'success');
    setTimeout(() => { applyTheme(SL.gender); showPage('dashPage'); }, 1200);
  } else {
    showAuthAlert('signupAlert', '❌ ' + (data.error || 'Signup failed.'), 'error');
    btn.disabled = false; txt.textContent = 'Create Account';
    drawSignupCaptcha();
  }
}

function showAuthAlert(id, msg, type) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.className = 'alert-box ' + type;
}

// ── LOGOUT ──
function handleLogout() {
  showModal('Log Out?', 'Are you sure you want to sign out of SoftLife?', async () => {
    await apiCall('/logout.php', 'POST');
    localStorage.removeItem('sl_token');
    SL.currentUser = null;
    SL.habits = []; SL.moods = []; SL.activities = []; SL.goals = []; SL.journal = [];
    showPage('loginPage');
  });
}

// ── DASHBOARD ──
function refreshDashboard() {
  updateOverview();
  updateHabitList();
  updateMoodHistory();
  updateActivityList();
  updateGoalList();
  updateJournalList();
  updateMilestones();
  updateProfile();
  if (SL.gender !== 'default') {
    setGender(SL.gender);
  }
  // Update overview date
  const now = new Date();
  const hour = now.getHours();
  let greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const name = SL.currentUser?.username || 'Friend';
  document.getElementById('overviewGreeting').textContent = `${greet}, ${name}! ${hour < 12 ? '🌅' : hour < 17 ? '🌤️' : '🌙'}`;
  document.getElementById('overviewDate').textContent = now.toLocaleDateString('en-US', {weekday:'long', year:'numeric', month:'long', day:'numeric'});
  // User display
  document.getElementById('sidebarUsername').textContent = name;
  document.getElementById('sidebarAvatar').textContent = name.charAt(0).toUpperCase();
  // Build streak calendar
  buildStreakCalendar();
  // Update section-specific favicon
  updateFavicon('dashPage');
}

// ── HOME PAGE HELPERS ──
function scrollToHomeSection(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function toggleFaq(btn) {
  const item = btn.closest('.faq-item');
  const isOpen = item.classList.contains('open');
  // Close all
  document.querySelectorAll('.faq-item.open').forEach(i => {
    i.classList.remove('open');
    i.querySelector('.faq-q').setAttribute('aria-expanded', 'false');
  });
  if (!isOpen) {
    item.classList.add('open');
    btn.setAttribute('aria-expanded', 'true');
  }
}

function handleContactSubmit() {
  const email = document.getElementById('contactEmail').value.trim();
  const msg = document.getElementById('contactMsg');
  if (!email || !/^[^@]+@[^@]+\.[^@]+$/.test(email)) {
    msg.textContent = '❌ Please enter a valid email address.';
    msg.style.color = '#e85d5d';
    msg.style.display = 'block';
    return;
  }
  msg.textContent = '✅ Thank you! You\'re subscribed to SoftLife updates.';
  msg.style.color = '#3dba7a';
  msg.style.display = 'block';
  document.getElementById('contactEmail').value = '';
}

function showSection(id) {
  document.querySelectorAll('.dash-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const sec = document.getElementById(id);
  if (sec) sec.classList.add('active');
  const navItem = document.querySelector(`.nav-item[data-section="${id}"]`);
  if (navItem) navItem.classList.add('active');
  const titles = {overview:'Dashboard',habits:'Habits',mood:'Mood Log',activities:'Activities',goals:'Goals',journal:'Journal',milestones:'Milestones',analytics:'Analytics',profile:'Profile'};
  document.getElementById('topbarTitle').textContent = titles[id] || 'SoftLife';
  // Update favicon + tab title per section
  updateFavicon(id);
  // Mobile sidebar close
  if (window.innerWidth <= 900) closeMobileSidebar();
  // Lazy render charts
  if (id === 'analytics') renderCharts();
  // TTS
  if (SL.ttsActive) setTimeout(readCurrentPage, 300);
}

// ── HABITS ──
async function addHabit() {
  const input = document.getElementById('newHabitInput');
  const name = input.value.trim();
  if (!name) { input.focus(); return; }
  if (name.length > 100) { alert('Habit name too long (max 100 chars)'); return; }
  const today = new Date().toDateString();
  const data = await apiCall('/habits.php', 'POST', { action: 'add', name });
  if (data.success) {
    SL.habits.unshift({ id: data.id, name, done: false, date: today, streak: 1 });
    input.value = '';
    updateHabitList();
    updateOverview();
  }
}

async function toggleHabit(id) {
  const h = SL.habits.find(x => x.id === id);
  if (!h) return;
  h.done = !h.done;
  updateHabitList(); updateOverview(); // optimistic UI
  await apiCall('/habits.php', 'POST', { action: 'toggle', id, done: h.done ? 1 : 0 });
}

async function deleteHabit(id) {
  SL.habits = SL.habits.filter(x => x.id !== id);
  updateHabitList(); updateOverview(); // optimistic UI
  await apiCall('/habits.php?id=' + id, 'DELETE');
}

function updateHabitList() {
  const today = new Date().toDateString();
  const todayHabits = SL.habits.filter(h => h.date === today);
  const done = todayHabits.filter(h => h.done).length;
  const el = document.getElementById('habitList');
  const chip = document.getElementById('habitCompletedChip');
  const label = document.getElementById('habitDateLabel');
  if (label) label.textContent = "Today's Habits – " + new Date().toLocaleDateString('en-US', {weekday:'long'});
  if (chip) chip.textContent = `${done}/${todayHabits.length} done`;
  if (!el) return;
  if (!todayHabits.length) {
    el.innerHTML = '<div style="text-align:center;padding:24px;color:var(--muted);font-size:.9rem;">No habits yet. Add your first habit above! ✨</div>';
    return;
  }
  el.innerHTML = todayHabits.map(h => `
    <div class="habit-item" role="listitem">
      <button class="habit-check ${h.done?'done':''}" onclick="toggleHabit(${h.id})"
        aria-label="${h.done?'Mark incomplete':'Mark complete'}: ${h.name}"
        aria-pressed="${h.done}">${h.done?'✓':''}</button>
      <span class="habit-name ${h.done?'done':''}">${escHtml(h.name)}</span>
      <span class="habit-streak" aria-label="${h.streak} day streak">🔥 ${h.streak}</span>
      <button onclick="deleteHabit(${h.id})" aria-label="Delete habit ${h.name}"
        style="background:none;border:none;cursor:pointer;opacity:.4;font-size:.9rem;padding:2px 6px;"
        title="Delete">✕</button>
    </div>`).join('');
  document.getElementById('statHabits').textContent = `${done}/${todayHabits.length}`;
  document.getElementById('ms_habits').textContent = SL.habits.filter(h => h.done).length;
}

// ── MOOD ──
async function logMood(emoji, label) {
  const today = new Date().toDateString();
  const note = (document.getElementById('moodNote') || {}).value || '';
  // Optimistic update
  SL.moods = SL.moods.filter(m => m.date !== today);
  SL.moods.unshift({ emoji, label, note: note.substring(0,250), date: today, ts: new Date().toLocaleTimeString() });
  // Update UI
  document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('selected'));
  document.querySelectorAll('.mood-btn').forEach(b => {
    if (b.getAttribute('aria-label') === label || b.querySelector('.mood-label')?.textContent === label) b.classList.add('selected');
  });
  document.getElementById('statMood').textContent = emoji;
  document.getElementById('statMoodTrend').textContent = label;
  const fb = document.getElementById('moodFeedback');
  if (fb) fb.textContent = `Logged: ${emoji} ${label}`;
  updateMoodHistory();
  // Save to DB
  await apiCall('/moods.php', 'POST', { emoji, label, note: note.substring(0,250) });
}

function updateMoodHistory() {
  const el = document.getElementById('moodHistory');
  if (!el) return;
  if (!SL.moods.length) { el.innerHTML = '<div style="color:var(--muted);font-size:.88rem;text-align:center;padding:20px;">No mood entries yet</div>'; return; }
  el.innerHTML = SL.moods.slice(0,10).map(m => `
    <div class="note-card" role="article">
      <div class="note-date">${m.date} · ${m.ts}</div>
      <div style="font-size:1.4rem;">${m.emoji} <strong>${m.label}</strong></div>
      ${m.note ? `<div class="note-text">${escHtml(m.note)}</div>` : ''}
    </div>`).join('');
  const today = SL.moods.find(m => m.date === new Date().toDateString());
  if (today) { document.getElementById('statMood').textContent = today.emoji; }
}

// ── ACTIVITIES ──
async function addActivity() {
  const name = document.getElementById('newActivityName').value.trim();
  const dur  = parseInt(document.getElementById('newActivityDur').value) || 0;
  const type = document.getElementById('newActivityType').value;
  if (!name) { document.getElementById('newActivityName').focus(); return; }
  const today = new Date().toDateString();
  const data = await apiCall('/activities.php', 'POST', { name, type, duration: dur });
  if (data.success) {
    SL.activities.unshift({ id: data.id, name, duration: dur, type, date: today });
    document.getElementById('newActivityName').value = '';
    document.getElementById('newActivityDur').value = '';
    updateActivityList();
  }
}

async function deleteActivity(id) {
  SL.activities = SL.activities.filter(x => x.id !== id);
  updateActivityList();
  await apiCall('/activities.php?id=' + id, 'DELETE');
}

function updateActivityList() {
  const el = document.getElementById('activityList');
  if (!el) return;
  if (!SL.activities.length) {
    el.innerHTML = '<div style="text-align:center;padding:24px;color:var(--muted);font-size:.9rem;">No activities logged yet. Get moving! 🏃</div>';
    return;
  }
  el.innerHTML = SL.activities.slice(0,20).map(a => `
    <div class="activity-item" role="listitem">
      <div class="act-icon" aria-hidden="true">${a.type.split(' ')[0]}</div>
      <div class="act-info">
        <div class="act-name">${escHtml(a.name)} <span style="font-size:.75rem;color:var(--muted);">${a.type.split(' ').slice(1).join(' ')}</span></div>
        <div class="act-meta">${a.date}</div>
      </div>
      ${a.duration ? `<div class="act-dur">${a.duration} min</div>` : ''}
      <button onclick="deleteActivity(${a.id})" aria-label="Delete activity"
        style="background:none;border:none;cursor:pointer;opacity:.4;font-size:.9rem;padding:2px 6px;">✕</button>
    </div>`).join('');
}

// ── GOALS ──
async function addGoal() {
  const title = document.getElementById('newGoalInput').value.trim();
  const date  = document.getElementById('newGoalDate').value;
  const cat   = document.getElementById('newGoalCat').value;
  if (!title) { document.getElementById('newGoalInput').focus(); return; }
  const data = await apiCall('/goals.php', 'POST', { action: 'add', title, cat, target_date: date || null });
  if (data.success) {
    SL.goals.unshift({ id: data.id, title, date, cat, status: 'active', progress: 0 });
    document.getElementById('newGoalInput').value = '';
    document.getElementById('newGoalDate').value = '';
    updateGoalList();
    updateOverview();
  }
}

async function updateGoalProgress(id, val) {
  const g = SL.goals.find(x => x.id === id);
  if (!g) return;
  g.progress = parseInt(val);
  if (g.progress >= 100) g.status = 'completed';
  updateGoalList(); updateOverview();
  await apiCall('/goals.php', 'POST', { action: 'progress', id, progress: g.progress });
}

async function deleteGoal(id) {
  SL.goals = SL.goals.filter(x => x.id !== id);
  updateGoalList(); updateOverview();
  await apiCall('/goals.php?id=' + id, 'DELETE');
}

function updateGoalList() {
  const el = document.getElementById('goalList');
  if (!el) return;
  const active = SL.goals.filter(g => g.status !== 'completed');
  document.getElementById('statGoals').textContent = active.length;
  document.getElementById('ms_goals').textContent = SL.goals.filter(g => g.status === 'completed').length;
  if (!SL.goals.length) {
    el.innerHTML = '<div style="text-align:center;padding:24px;color:var(--muted);font-size:.9rem;">No goals yet. Set your first goal! 🎯</div>';
    return;
  }
  el.innerHTML = SL.goals.map(g => `
    <div class="goal-card" role="article">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
        <div class="goal-title">${escHtml(g.title)}</div>
        <div style="display:flex;align-items:center;gap:8px;">
          <span class="chip ${g.status==='completed'?'green':''}">${g.cat}</span>
          <button onclick="deleteGoal(${g.id})" aria-label="Delete goal"
            style="background:none;border:none;cursor:pointer;opacity:.4;font-size:.85rem;">✕</button>
        </div>
      </div>
      ${g.date ? `<div class="goal-date">Target: ${g.date}</div>` : ''}
      <div class="progress-wrap" style="margin-top:8px;">
        <div class="progress-label"><span>${g.status==='completed'?'✓ Completed':'Progress'}</span><span>${g.progress}%</span></div>
        <div class="progress-bar"><div class="progress-fill" style="width:${g.progress}%"></div></div>
      </div>
      ${g.status !== 'completed' ? `
        <input type="range" min="0" max="100" value="${g.progress}"
          onchange="updateGoalProgress(${g.id},this.value)"
          style="width:100%;margin-top:10px;accent-color:var(--primary);"
          aria-label="Goal progress for ${escHtml(g.title)}">` : ''}
    </div>`).join('');
}

// ── JOURNAL ──
// Journal content counter
const journalContent = document.getElementById('journalContent');
if (journalContent) {
  journalContent.addEventListener('input', function() {
    const c = document.getElementById('journalCounter');
    if (c) c.textContent = this.value.length + '/1000';
  });
}

async function addJournalEntry() {
  const title   = document.getElementById('journalTitle').value.trim();
  const content = document.getElementById('journalContent').value.trim();
  if (!title && !content) { document.getElementById('journalTitle').focus(); return; }
  const data = await apiCall('/journal.php', 'POST', {
    title: title.substring(0,100),
    content: content.substring(0,1000),
  });
  if (data.success) {
    SL.journal.unshift({
      id: data.id,
      title: title.substring(0,100),
      content: content.substring(0,1000),
      date: new Date().toLocaleDateString(),
      ts: new Date().toLocaleString(),
    });
    document.getElementById('journalTitle').value = '';
    document.getElementById('journalContent').value = '';
    const c = document.getElementById('journalCounter');
    if (c) c.textContent = '0/1000';
    updateJournalList();
    document.getElementById('ms_entries').textContent = SL.journal.length;
  }
}

async function deleteJournalEntry(id) {
  SL.journal = SL.journal.filter(x => x.id !== id);
  updateJournalList();
  await apiCall('/journal.php?id=' + id, 'DELETE');
}

function updateJournalList() {
  const el = document.getElementById('journalList');
  if (!el) return;
  document.getElementById('ms_entries').textContent = SL.journal.length;
  if (!SL.journal.length) {
    el.innerHTML = '<div style="text-align:center;padding:24px;color:var(--muted);font-size:.9rem;">No entries yet. Start writing! ✍️</div>';
    return;
  }
  el.innerHTML = SL.journal.map(e => `
    <div class="note-card" role="article">
      <div class="note-date">${e.ts}</div>
      ${e.title ? `<div style="font-weight:700;font-size:.9rem;color:var(--text);margin-bottom:4px;">${escHtml(e.title)}</div>` : ''}
      <div class="note-text">${escHtml(e.content).substring(0,200)}${e.content.length>200?'…':''}</div>
      <button onclick="deleteJournalEntry(${e.id})" aria-label="Delete entry"
        style="margin-top:6px;background:none;border:none;cursor:pointer;opacity:.4;font-size:.8rem;">Delete ✕</button>
    </div>`).join('');
}

// ── OVERVIEW ──
function updateOverview() {
  const today = new Date().toDateString();
  const todayHabits = SL.habits.filter(h => h.date === today);
  const done = todayHabits.filter(h => h.done).length;
  document.getElementById('statHabits').textContent = `${done}/${todayHabits.length}`;

  // Overview habits
  const oh = document.getElementById('overviewHabits');
  if (oh) {
    if (!todayHabits.length) {
      oh.innerHTML = '<div style="color:var(--muted);font-size:.88rem;padding:12px 0;">No habits yet. <span style="color:var(--primary);cursor:pointer;" onclick="showSection(\'habits\')">Add some →</span></div>';
    } else {
      oh.innerHTML = todayHabits.slice(0,5).map(h => `
        <div class="habit-item">
          <div class="habit-check ${h.done?'done':''}" style="pointer-events:none;">${h.done?'✓':''}</div>
          <span class="habit-name ${h.done?'done':''}">${escHtml(h.name)}</span>
          <span class="habit-streak">🔥 ${h.streak}</span>
        </div>`).join('') + (todayHabits.length>5 ? `<div style="font-size:.8rem;color:var(--muted);margin-top:8px;">+${todayHabits.length-5} more</div>` : '');
    }
  }

  // Overview goals
  const og = document.getElementById('overviewGoals');
  if (og) {
    const active = SL.goals.filter(g => g.status !== 'completed').slice(0,3);
    if (!active.length) {
      og.innerHTML = '<div style="color:var(--muted);font-size:.88rem;padding:12px 0;">No goals yet. <span style="color:var(--primary);cursor:pointer;" onclick="showSection(\'goals\')">Set a goal →</span></div>';
    } else {
      og.innerHTML = active.map(g => `
        <div class="goal-card">
          <div class="goal-title">${escHtml(g.title)}</div>
          <div class="progress-wrap"><div class="progress-bar"><div class="progress-fill" style="width:${g.progress}%"></div></div></div>
          <div style="font-size:.75rem;color:var(--muted);margin-top:4px;">${g.progress}% complete</div>
        </div>`).join('');
    }
  }

  // Stats
  document.getElementById('statGoals').textContent = SL.goals.filter(g => g.status !== 'completed').length;
}

// ── MILESTONES ──
function buildStreakCalendar() {
  const el = document.getElementById('streakCalendar');
  if (!el) return;
  const cells = [];
  const today = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const ds = d.toDateString();
    const active = SL.habits.some(h => h.date === ds && h.done) || SL.moods.some(m => m.date === ds);
    const isToday = i === 0;
    cells.push(`<div style="height:16px;border-radius:3px;background:${active ? 'var(--primary)' : 'var(--border)'};${isToday ? 'box-shadow:0 0 0 2px var(--primary-dark);' : ''}" title="${d.toLocaleDateString()}" aria-label="${d.toLocaleDateString()}: ${active?'Active':'Missed'}"></div>`);
  }
  el.innerHTML = cells.join('');
}

function updateMilestones() {
  document.getElementById('ms_habits').textContent = SL.habits.filter(h => h.done).length;
  document.getElementById('ms_goals').textContent = SL.goals.filter(g => g.status === 'completed').length;
  document.getElementById('ms_entries').textContent = SL.journal.length;
  buildStreakCalendar();
  buildBadges();
}

function buildBadges() {
  const el = document.getElementById('badgeList');
  if (!el) return;
  const badges = [];
  const totalHabitsDone = SL.habits.filter(h => h.done).length;
  const totalGoalsDone = SL.goals.filter(g => g.status === 'completed').length;
  const totalEntries = SL.journal.length;
  const totalMoods = SL.moods.length;

  if (totalHabitsDone >= 1) badges.push({e:'✅', label:'First Habit', desc:'Completed first habit'});
  if (totalHabitsDone >= 10) badges.push({e:'⭐', label:'10 Habits', desc:'Done 10 habits'});
  if (totalHabitsDone >= 50) badges.push({e:'💫', label:'50 Habits', desc:'Done 50 habits'});
  if (totalGoalsDone >= 1) badges.push({e:'🎯', label:'Goal Getter', desc:'Completed a goal'});
  if (totalEntries >= 1) badges.push({e:'📓', label:'Journaler', desc:'First journal entry'});
  if (totalEntries >= 10) badges.push({e:'✍️', label:'Story Teller', desc:'10 journal entries'});
  if (totalMoods >= 1) badges.push({e:'😊', label:'Mood Tracker', desc:'First mood log'});
  if (totalMoods >= 7) badges.push({e:'🌈', label:'Feeling Good', desc:'7 mood logs'});
  if (SL.activities.length >= 1) badges.push({e:'🏃', label:'Active Life', desc:'First activity logged'});
  if (SL.currentUser) badges.push({e:'🌱', label:'SoftLife Member', desc:'Joined SoftLife'});

  if (!badges.length) {
    el.innerHTML = '<div style="color:var(--muted);font-size:.88rem;">Complete habits, goals, and journal entries to earn badges!</div>';
    return;
  }
  el.innerHTML = badges.map(b => `
    <div style="display:flex;flex-direction:column;align-items:center;gap:4px;padding:12px;background:var(--bg);border-radius:var(--radius-sm);border:1px solid var(--border);min-width:80px;text-align:center;" title="${b.desc}" aria-label="${b.label} badge: ${b.desc}">
      <span style="font-size:1.8rem;">${b.e}</span>
      <span style="font-size:.7rem;font-weight:700;color:var(--text2);">${b.label}</span>
    </div>`).join('');
}

// ── PROFILE ──
function updateProfile() {
  if (!SL.currentUser) return;
  const name = SL.currentUser.username || 'User';
  document.getElementById('profileName').textContent = name;
  document.getElementById('profileEmail').textContent = SL.currentUser.email || '';
  document.getElementById('profileAvatar').textContent = name.charAt(0).toUpperCase();
  document.getElementById('editUsername').value = name;
  if (SL.currentUser.bio) document.getElementById('editBio').value = SL.currentUser.bio;
  setGender(SL.gender);
}

function saveProfile() {
  const name = document.getElementById('editUsername').value.trim();
  if (!validateUsername(document.getElementById('editUsername'))) {
    alert('Username must be 4–15 characters.'); return;
  }
  const bio = document.getElementById('editBio').value.substring(0,200);
  if (SL.currentUser) {
    SL.currentUser.username = name;
    SL.currentUser.bio = bio;
    SL.currentUser.gender = SL.gender;
    saveState();
    document.getElementById('profileName').textContent = name;
    document.getElementById('sidebarUsername').textContent = name;
    document.getElementById('sidebarAvatar').textContent = name.charAt(0).toUpperCase();
    document.getElementById('profileAvatar').textContent = name.charAt(0).toUpperCase();
    document.getElementById('overviewGreeting').textContent = `Welcome, ${name}! 🌱`;
    // Show success
    const saveBtn = document.querySelector('[onclick="saveProfile()"]');
    if (saveBtn) { const orig = saveBtn.textContent; saveBtn.textContent = '✓ Saved!'; setTimeout(() => saveBtn.textContent = orig, 1500); }
  }
}

// ── CLEAR DATA ──
function clearAllData() {
  showModal('Clear All Data?', '⚠️ This will permanently delete all your habits, moods, goals, and journal entries. This cannot be undone.', () => {
    SL.habits = []; SL.moods = []; SL.activities = []; SL.goals = []; SL.journal = [];
    saveState();
    refreshDashboard();
  });
}

// ── ANALYTICS CHARTS ──
function renderCharts() {
  if (SL.chartsRendered) {
    Object.values(SL.charts).forEach(c => c && c.destroy && c.destroy());
    SL.chartsRendered = false;
  }

  const color = SL.gender === 'female' ? '#e8679a' : SL.gender === 'male' ? '#3dba7a' : '#7c6ff7';
  const colorAlpha = SL.gender === 'female' ? 'rgba(232,103,154,0.14)' : SL.gender === 'male' ? 'rgba(61,186,122,0.14)' : 'rgba(124,111,247,0.14)';

  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    days.push(d.toLocaleDateString('en-US', {weekday:'short', month:'short', day:'numeric'}));
  }

  // Habit chart data
  const habitData = days.map((_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6-i));
    const ds = d.toDateString();
    const h = SL.habits.filter(x => x.date === ds);
    if (!h.length) return 0;
    return Math.round((h.filter(x => x.done).length / h.length) * 100);
  });

  // Mood chart data
  const moodMap = {'Amazing':5,'Happy':4,'Neutral':3,'Sad':2,'Rough':1};
  const moodData = days.map((_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6-i));
    const ds = d.toDateString();
    const m = SL.moods.find(x => x.date === ds);
    return m ? moodMap[m.label] || 3 : null;
  });

  // Activity chart data
  const activityData = days.map((_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6-i));
    const ds = d.toDateString();
    return SL.activities.filter(a => a.date === ds).reduce((sum, a) => sum + (a.duration || 0), 0);
  });

  const chartOpts = { font: { family: 'DM Sans', size: 11 } };

  // Habit Chart
  const hCtx = document.getElementById('habitChart');
  if (hCtx) {
    SL.charts.habit = new Chart(hCtx.getContext('2d'), {
      type: 'bar',
      data: { labels: days, datasets: [{ label: 'Completion %', data: habitData, backgroundColor: colorAlpha, borderColor: color, borderWidth: 2, borderRadius: 8 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: {
        y: { beginAtZero: true, max: 100, ticks: { callback: v => v+'%', font: chartOpts.font }, grid: { color: 'rgba(0,0,0,0.04)' } },
        x: { ticks: { font: chartOpts.font }, grid: { display: false } }
      }}
    });
  }

  // Mood Chart
  const mCtx = document.getElementById('moodChart');
  if (mCtx) {
    SL.charts.mood = new Chart(mCtx.getContext('2d'), {
      type: 'line',
      data: { labels: days, datasets: [{ label: 'Mood', data: moodData, borderColor: color, backgroundColor: colorAlpha, borderWidth: 2.5, pointBackgroundColor: color, pointRadius: 5, fill: true, tension: 0.4, spanGaps: true }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: {
        y: { min: 1, max: 5, ticks: { stepSize: 1, callback: v => ['','Rough','Sad','Neutral','Happy','Amazing'][v], font: chartOpts.font }, grid: { color: 'rgba(0,0,0,0.04)' } },
        x: { ticks: { font: chartOpts.font }, grid: { display: false } }
      }}
    });
  }

  // Activity Chart
  const aCtx = document.getElementById('activityChart');
  if (aCtx) {
    SL.charts.activity = new Chart(aCtx.getContext('2d'), {
      type: 'bar',
      data: { labels: days, datasets: [{ label: 'Minutes', data: activityData, backgroundColor: colorAlpha, borderColor: color, borderWidth: 2, borderRadius: 8 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: {
        y: { beginAtZero: true, ticks: { callback: v => v+'m', font: chartOpts.font }, grid: { color: 'rgba(0,0,0,0.04)' } },
        x: { ticks: { font: chartOpts.font }, grid: { display: false } }
      }}
    });
  }

  // Summary
  const el = document.getElementById('analyticsSummary');
  if (el) {
    const totalHabits = SL.habits.filter(h => h.done).length;
    const avgMood = SL.moods.length ? Math.round(SL.moods.slice(0,7).reduce((s,m) => s+(moodMap[m.label]||3), 0)/Math.min(SL.moods.length,7)*10)/10 : 0;
    const totalMins = SL.activities.reduce((s,a) => s+(a.duration||0), 0);
    el.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:12px;">
        <div style="padding:14px;background:var(--bg);border-radius:var(--radius-sm);">
          <div style="font-size:.72rem;font-weight:700;text-transform:uppercase;color:var(--muted);letter-spacing:.5px;">Total Habits Done</div>
          <div style="font-family:'DM Serif Display',serif;font-size:1.8rem;color:var(--primary);">${totalHabits}</div>
        </div>
        <div style="padding:14px;background:var(--bg);border-radius:var(--radius-sm);">
          <div style="font-size:.72rem;font-weight:700;text-transform:uppercase;color:var(--muted);letter-spacing:.5px;">Avg Mood (7 days)</div>
          <div style="font-family:'DM Serif Display',serif;font-size:1.8rem;color:var(--primary);">${avgMood || '—'}/5</div>
        </div>
        <div style="padding:14px;background:var(--bg);border-radius:var(--radius-sm);">
          <div style="font-size:.72rem;font-weight:700;text-transform:uppercase;color:var(--muted);letter-spacing:.5px;">Total Active Mins</div>
          <div style="font-family:'DM Serif Display',serif;font-size:1.8rem;color:var(--primary);">${totalMins}</div>
        </div>
      </div>`;
  }

  SL.chartsRendered = true;
}

// ── SIDEBAR ──
let sidebarCollapsed = false;
function toggleSidebar() {
  sidebarCollapsed = !sidebarCollapsed;
  document.getElementById('sidebar').classList.toggle('collapsed', sidebarCollapsed);
  document.getElementById('dashPage').classList.toggle('sidebar-collapsed', sidebarCollapsed);
  document.getElementById('topbar').classList.toggle('sidebar-collapsed', sidebarCollapsed);
  document.getElementById('sidebarToggleBtn').textContent = sidebarCollapsed ? '▶' : '◀';
  document.getElementById('sidebarToggleBtn').setAttribute('aria-label', sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar');
}
function openMobileSidebar() {
  document.getElementById('sidebar').classList.add('mobile-open');
  document.getElementById('sidebarOverlay').style.display = 'block';
  document.getElementById('hamburgerBtn').setAttribute('aria-expanded', 'true');
}
function closeMobileSidebar() {
  document.getElementById('sidebar').classList.remove('mobile-open');
  document.getElementById('sidebarOverlay').style.display = 'none';
  document.getElementById('hamburgerBtn').setAttribute('aria-expanded', 'false');
}

// ── FIX #9: SWIPE GESTURE — swipe right to open sidebar, left to close ──
(function() {
  var touchStartX = 0, touchStartY = 0;
  var SWIPE_THRESHOLD = 50;   // min px horizontal travel
  var EDGE_ZONE      = 30;    // px from left edge to trigger open swipe

  document.addEventListener('touchstart', function(e) {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  document.addEventListener('touchend', function(e) {
    if (!e.changedTouches.length) return;
    var dx = e.changedTouches[0].clientX - touchStartX;
    var dy = e.changedTouches[0].clientY - touchStartY;
    // Only count horizontal swipes (dx > dy to avoid scroll conflicts)
    if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    if (window.innerWidth > 900) return; // desktop: sidebar is always visible
    if (dx > 0 && touchStartX < EDGE_ZONE) {
      openMobileSidebar();
    } else if (dx < 0) {
      closeMobileSidebar();
    }
  }, { passive: true });
})();

// ── FIX #8: MOBILE SEARCH TOGGLE ──
function toggleMobileSearch() {
  var wrap = document.getElementById('topbarSearchWrap');
  var closeBtn = document.getElementById('mobileSearchClose');
  if (wrap.classList.contains('mobile-expanded')) {
    closeMobileSearch();
  } else {
    wrap.classList.add('mobile-expanded');
    if (closeBtn) closeBtn.style.display = 'inline-flex';
    setTimeout(function() {
      var inp = document.getElementById('topbarSearchInput');
      if (inp) inp.focus();
    }, 50);
  }
}
function closeMobileSearch() {
  var wrap = document.getElementById('topbarSearchWrap');
  var closeBtn = document.getElementById('mobileSearchClose');
  wrap.classList.remove('mobile-expanded');
  if (closeBtn) closeBtn.style.display = 'none';
}

// ── MODAL ──
let modalCallback = null;
function showModal(title, body, cb) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').textContent = body;
  document.getElementById('modalOverlay').classList.add('open');
  document.getElementById('modalConfirmBtn').onclick = () => { if(cb)cb(); closeModal(); };
  modalCallback = cb;
}
function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
  modalCallback = null;
}
function handleModalOverlayClick(e) {
  if (e.target === document.getElementById('modalOverlay')) closeModal();
}

// ── UTIL ──
function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── SCROLL REVEAL OBSERVER ──
function initScrollReveal() {
  // Add reveal class to section titles, cards, timeline items, etc.
  const revealSelectors = [
    '.home-section-tag',
    '.home-section-title',
    '.home-section-sub',
    '.feature-card',
    '.step-card',
    '.testi-card',
    '.value-card',
    '.team-card',
    '.timeline-item',
    '.faq-item',
    '.hstrip-item',
    '.mission-tile',
    '.about-mission-text',
    '.home-cta-banner h2',
    '.home-cta-banner p',
    '.home-cta-banner .cta-banner-btn',
  ];

  revealSelectors.forEach(sel => {
    document.querySelectorAll(sel).forEach((el, i) => {
      if (!el.classList.contains('reveal') && !el.classList.contains('reveal-left') && !el.classList.contains('reveal-right')) {
        el.classList.add('reveal');
        // stagger delay for grids
        if (el.parentElement && el.parentElement.classList.contains('stagger')) {
          el.style.transitionDelay = (i * 0.1) + 's';
        }
      }
    });
  });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale').forEach(el => {
    observer.observe(el);
  });
}

// ── COUNTER ANIMATION ──
function animateCounters() {
  const counters = [
    { el: document.querySelector('.hstrip-item:nth-child(1) .hstrip-num'), target: 12, suffix: 'K+', duration: 1800 },
    { el: document.querySelector('.hstrip-item:nth-child(2) .hstrip-num'), target: 98, suffix: 'K+', duration: 2000 },
    { el: document.querySelector('.hstrip-item:nth-child(4) .hstrip-num'), target: 100, suffix: '%', duration: 1600 },
  ];

  counters.forEach(({ el, target, suffix, duration }) => {
    if (!el) return;
    let start = 0;
    const step = (timestamp) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.floor(ease * target) + suffix;
      if (progress < 1) requestAnimationFrame(step);
    };
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        requestAnimationFrame(step);
        obs.disconnect();
      }
    }, { threshold: 0.5 });
    obs.observe(el);
  });
}

// ── INIT ANIMATIONS ON PAGE SHOW ──
// (animations called directly from showPage below)

// ── INIT ──
document.addEventListener('DOMContentLoaded', async () => {
  // Restore preferences
  if (localStorage.getItem('sl_dark') === '1') { document.getElementById('htmlRoot').classList.add('dark-mode'); }
  if (localStorage.getItem('sl_hc') === '1') { document.getElementById('htmlRoot').classList.add('high-contrast'); document.getElementById('contrastBtn').setAttribute('aria-pressed','true'); }
  textLevel = parseInt(localStorage.getItem('sl_text') || '0'); applyTextSize();

  // Cookie banner
  initCookies();

  // Auto-login: check if token exists in localStorage
  const token = localStorage.getItem('sl_token');
  if (token) {
    await loadState(); // fetch all data from server
    if (SL.currentUser) {
      applyTheme(SL.gender);
      showPage('dashPage');
    } else {
      // Token invalid/expired
      localStorage.removeItem('sl_token');
      applyTheme('default');
      showPage('homePage');
    }
  } else {
    applyTheme('default');
    showPage('homePage');
  }

  // Journal counter
  const jc = document.getElementById('journalContent');
  if (jc) jc.addEventListener('input', function() {
    const c = document.getElementById('journalCounter');
    if (c) c.textContent = this.value.length + '/1000';
  });


  // ── Load login captcha when login page becomes visible ──
  const origShowPage = showPage;
  window.showPage = function(page) {
    origShowPage(page);
    if (page === 'loginPage')  {} // no captcha to load
    if (page === 'signupPage') drawSignupCaptcha();
  };

  // Initial load
  drawSignupCaptcha();

  // ── Keyboard support for nav items ──
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault(); item.click();
      }
    });
  });
});

/* ══════════════════════════════════════════
   FEEDBACK MODAL
   ══════════════════════════════════════════ */
let fbRating = 0;

function openFeedbackModal() {
  document.getElementById('feedbackModal').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeFeedbackModal() {
  document.getElementById('feedbackModal').classList.remove('open');
  document.body.style.overflow = '';
  // Reset form
  setTimeout(() => {
    document.getElementById('fbMessage').value = '';
    document.getElementById('fbName').value = '';
    document.getElementById('fbCategory').value = '';
    document.getElementById('fbCharCount').textContent = '0 / 250';
    document.getElementById('fbCharCount').className = 'fb-char-count';
    document.getElementById('fbMessage').classList.remove('error');
    const al = document.getElementById('fbAlert');
    al.className = 'fb-alert'; al.textContent = '';
    fbRating = 0;
    document.querySelectorAll('.fb-star').forEach(s => s.classList.remove('active'));
    document.getElementById('fbSubmitBtn').disabled = false;
    document.getElementById('fbSubmitBtn').textContent = 'Send Feedback 🚀';
  }, 280);
}

function setFbRating(val) {
  fbRating = val;
  document.querySelectorAll('.fb-star').forEach(s => {
    s.classList.toggle('active', parseInt(s.dataset.v) <= val);
  });
}

function onFbInput() {
  const ta  = document.getElementById('fbMessage');
  const cnt = document.getElementById('fbCharCount');
  const len = ta.value.length;
  cnt.textContent = len + ' / 250';
  cnt.className   = 'fb-char-count' + (len >= 250 ? ' over' : len >= 220 ? ' warn' : '');
  ta.classList.toggle('error', len > 250);
}

async function submitFeedback() {
  const msg  = document.getElementById('fbMessage').value.trim();
  const name = document.getElementById('fbName').value.trim();
  const cat  = document.getElementById('fbCategory').value;
  const al   = document.getElementById('fbAlert');
  const btn  = document.getElementById('fbSubmitBtn');

  // ── Frontend validation ──
  if (!msg) {
    document.getElementById('fbMessage').classList.add('error');
    al.textContent = '⚠️ Please enter your feedback before submitting.';
    al.className   = 'fb-alert error';
    return;
  }
  // ── reCAPTCHA check ──
  if (!window.fbRcVerified) {
    document.getElementById('fbRcMsg').style.display = 'block';
    return;
  }
  if (msg.length > 250) {
    al.textContent = '⚠️ Feedback must be 250 characters or fewer.';
    al.className   = 'fb-alert error';
    return;
  }

  btn.disabled = true; btn.textContent = 'Sending…';

  const token = localStorage.getItem('sl_token') || '';
  try {
    const res = await fetch(API + '/feedback.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Token': token },
      body: JSON.stringify({ feedback_text: msg, name, category: cat, rating: fbRating || null })
    });
    const data = await res.json();
    if (data.success) {
      al.textContent = '✅ ' + (data.message || 'Thank you for your feedback!');
      al.className   = 'fb-alert success';
      btn.textContent = 'Sent ✓';
      setTimeout(() => closeFeedbackModal(), 2200);
    } else {
      al.textContent = '❌ ' + (data.error || 'Could not send feedback.');
      al.className   = 'fb-alert error';
      btn.disabled   = false; btn.textContent = 'Send Feedback 🚀';
    }
  } catch {
    al.textContent = '❌ Network error. Please try again.';
    al.className   = 'fb-alert error';
    btn.disabled   = false; btn.textContent = 'Send Feedback 🚀';
  }
}

/* ══════════════════════════════════════════
   CHATBOT
   ══════════════════════════════════════════ */
let chatOpen = false;
let cwFirstOpen = true;

function toggleChatbot() {
  chatOpen = !chatOpen;
  const win = document.getElementById('chatbotWindow');
  const fab = document.getElementById('chatbotFab');
  if (chatOpen) {
    win.classList.add('open');
    fab.classList.add('open');
    if (cwFirstOpen) {
      cwFirstOpen = false;
      setTimeout(function() {
        appendCwMsg("👋 Hello! I'm your SoftLife AI Assistant 🌱 Ask me anything about any feature!", "bot");
        cwShowQuickReplies();
      }, 300);
    }
    setTimeout(function() {
      var inp = document.getElementById('cwInput');
      if (inp) inp.focus();
    }, 350);
  } else {
    win.classList.remove('open');
    fab.classList.remove('open');
  }
}
// ═══════════════════════════════════════════════════
//  SOFTLIFE CHATBOT — Full Conversation Engine
// ═══════════════════════════════════════════════════

// ── Knowledge base using template literals (safe multiline) ──
const CB_KB = {
  greet: [
    "👋 Hello! I'm your SoftLife AI Assistant 🌱 Feel free to ask me anything about any feature!",
    "🌟 Hi there! Welcome to SoftLife. Ask me about Habits, Mood, Goals — I'm here to help!",
    "😊 Hey! How can I assist you today? Habits, Goals, Journal — just ask away!"
  ],
  bye: [
    "👋 Goodbye! Come back anytime if you have more questions 😊",
    "✨ See you later! Keep up those healthy habits and take care!",
    "🌙 Bye! Stay consistent with your habits — I'm always here when you need me!"
  ],
  thanks: [
    "😊 You're welcome! I'm always here to help.",
    "🌟 Happy to help! Feel free to ask if you have more questions.",
    "💜 Glad I could assist! Is there anything else you'd like to know?"
  ],
  habits: [
    "📋 To use Habits: Go to the Habits section → Click Add Habit → Enter a name → Pick an emoji. Complete your habit every day to build your STREAK! 🔥 A 7-day streak earns you a milestone badge!",
    "✅ Habit tracking steps: 1) Open the Habits page  2) Tap + New Habit  3) Set a name and time  4) Check it off daily. Don't worry if you miss a day — SoftLife gives you a 1-day grace period! 😊",
    "🎯 Daily habit ideas: Wake up on time (starter habit), Drink water (easy win), Read 10 mins (growth habit). Everything is tracked automatically on the Habits page!"
  ],
  mood: [
    "😊 Mood Log steps: 1) Click Mood Log in the Sidebar  2) Choose your emoji (Amazing/Happy/Neutral/Sad/Rough)  3) Add an optional note  4) Hit Log Mood ✅. Your weekly mood graph will appear in Analytics!",
    "💭 Why track your mood? Logging daily helps you spot patterns — when you feel great, when you don't. It builds self-awareness! 🧠 Sidebar → Mood Log → pick your emoji!",
    "🌈 5 mood options available: ⭐ Amazing, 😊 Happy, 😐 Neutral, 😢 Sad, 😤 Rough. You can also add a personal note with each entry!"
  ],
  goals: [
    "🎯 How to set a Goal: 1) Sidebar → Goals  2) Click + Add Goal  3) Enter title, category & deadline  4) Update progress from 0% to 100%. Complete a goal = 🏆 milestone unlocked!",
    "🏆 Goals come in 4 categories: 💪 Health & Fitness, 📚 Learning & Growth, 💼 Career & Work, 🌟 Personal. Each goal has a progress bar — update it a little every day!",
    "💡 How to set a great goal: ✅ Be specific (e.g. Walk 30 mins daily), ✅ Set a deadline, ✅ Break it into small steps. The Goals page tracks everything for you!"
  ],
  journal: [
    "📓 How to write a Journal entry: 1) Sidebar → Journal  2) Click New Entry  3) Write your thoughts (up to 1000 chars)  4) Hit Save ✅. It's completely private — just for you! 🔒",
    "✍️ Why journaling helps: It reduces stress, clears your thoughts, tracks your progress, and builds self-awareness. Even just 5 minutes a day makes a difference! 📖",
    "💭 What to write about: What happened today, what went well, what was challenging, your plans for tomorrow. You can also revisit old entries on the Journal page!"
  ],
  activities: [
    "🏃 How to log an Activity: 1) Sidebar → Activities  2) Tap + Log Activity  3) Choose activity type  4) Enter duration in minutes  5) Save! Your weekly summary will appear in Analytics 📊",
    "💪 Activities you can track: 🚶 Walking/Running, 🏋️ Gym/Strength, 🧘 Yoga/Meditation, 🚴 Cycling, 🏊 Swimming, ⚽ Sports. You can also add a custom activity!",
    "📊 Benefits of activity tracking: Estimated calorie burn, weekly reports, motivation boost, and spotting patterns. Log something every day — even a short walk counts! 🌟"
  ],
  analytics: [
    "📊 Analytics shows you: ✅ Weekly habit completion %, ✅ Mood graph (7/30 days), ✅ Activity summary, ✅ Streak history, ✅ Goals progress. Just click Analytics in the Sidebar!",
    "📈 Tips for using Analytics: Check it every Sunday, identify your weak areas, and plan for next week. Seeing your data makes self-improvement much easier! 💡",
    "🔍 Charts available in Analytics: Habits bar chart (daily completion), Mood line graph (ups & downs), Weekly activity duration, Goals progress overview. Find it all under Analytics in the Sidebar!"
  ],
  milestones: [
    "🏆 How to earn Milestones: 🔥 7-day streak → Fire badge, ⭐ First habit complete → Star badge, 🎯 First goal done → Trophy, 📓 10 journal entries → Writer badge, 💪 30-day streak → Champion! Check the Milestones page!",
    "🎖️ To unlock badges: Stay consistent with habits, complete your goals, and log your mood daily. The Milestones section shows your entire journey!"
  ],
  profile: [
    "👤 How to update your Profile: 1) Sidebar → Profile  2) Change your name or email  3) Switch theme (Male/Female)  4) Update your password  5) Click Save Changes ✅",
    "⚙️ What the Profile page offers: Update personal info, change theme (pink/purple), change password, view account stats, export data. Find the Profile link at the bottom of the Sidebar!"
  ],
  streak: [
    "🔥 A streak counts the consecutive days you've completed a habit! 7 days = Fire emoji 🔥, 30 days = Champion badge 🏆. Missing a day resets to 1 — but SoftLife forgives a 1-day gap!",
    "💪 Tips to keep your streak: Check habits at a fixed time each day, add easy habits like drinking water, and don't get discouraged if you miss — just start fresh tomorrow!"
  ],
  password: [
    "🔒 To change your password: 1) Sidebar → Profile  2) Go to the Change Password section  3) Enter your current password  4) Enter new password (8+ characters)  5) Confirm and hit Save ✅"
  ],
  feedback_q: [
    "💬 How to send Feedback: Click the Feedback option in the Sidebar, give a star rating (1–5), choose a category, write your message, and hit Send Feedback! We read every single one 💜"
  ],
  dashboard: [
    "🏠 Your Dashboard shows: Today's habit progress, today's mood, active goals count, current streak, weekly activity summary, and a quick mood log. It's your daily headquarters! 🚀"
  ],
  unknown: [
    "🤔 I don't have info on that just yet! Try typing Help — I'll walk you through all features. Or use the Feedback option in the Sidebar to let our team know!",
    "💭 I'm not sure about that one. Could you give me more detail? Or type Help for a full feature guide!",
    "🌱 I'm still learning! Use the Feedback option in the Sidebar to tell our team — we're always improving 💜"
  ]
};

// ── Typing indicator ──
function cwShowTyping() {
  const msgs = document.getElementById("cwMessages");
  const t = document.createElement("div");
  t.className = "cw-msg bot cw-typing"; t.id = "cwTyping";
  t.innerHTML = "<span></span><span></span><span></span>";
  msgs.appendChild(t); msgs.scrollTop = msgs.scrollHeight;
}
function cwHideTyping() {
  const t = document.getElementById("cwTyping");
  if (t) t.remove();
}

// ── Quick reply buttons ──
const CW_QUICK = ["📋 Habits", "😊 Mood", "🎯 Goals", "📓 Journal", "📊 Analytics", "🏆 Milestones"];

function cwShowQuickReplies() {
  const msgs = document.getElementById("cwMessages");
  const existing = document.getElementById("cwQuickRow");
  if (existing) existing.remove();
  const row = document.createElement("div");
  row.id = "cwQuickRow"; row.className = "cw-quick-row";
  CW_QUICK.forEach(function(q) {
    const b = document.createElement("button");
    b.className = "cw-quick-btn"; b.textContent = q;
    b.onclick = function() { row.remove(); cwSendMsg(q); };
    row.appendChild(b);
  });
  msgs.appendChild(row); msgs.scrollTop = msgs.scrollHeight;
}

// ── Pick random answer ──
function cwPick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// ── Get bot reply based on user message ──
function cwGetReply(msg) {
  const m = msg.toLowerCase().trim();
  if (!m) return cwPick(CB_KB.unknown);

  // Greetings
  if (/^(hi|hy|hello|hey|heyy|salam|assalam|aoa|helo|hii|heya|howdy|hola|wassup|yo|sup|good morning|good evening|good afternoon|subah|shaam|namaste|adaab)/.test(m))
    return cwPick(CB_KB.greet);
  // Bye
  if (/(bye|goodbye|khuda hafiz|allah hafiz|tata|farewell|band karo)/.test(m))
    return cwPick(CB_KB.bye);
  // Thanks
  if (/(thank|shukriya|shukar|shukria|jazakallah|meherbani|ty|thx)/.test(m))
    return cwPick(CB_KB.thanks);
  // Help
  if (/(help|kya kar|features|guide|tutorial|bata|madad|what can|sab kuch)/.test(m))
    return "🌟 I can help you with: 📋 Habits, 😊 Mood, 🎯 Goals, 📓 Journal, 🏃 Activities, 📊 Analytics, 🏆 Milestones, 👤 Profile. Just type any topic!";
  // Features
  if (/(habit)/.test(m))                                    return cwPick(CB_KB.habits);
  if (/(mood|feel|ehsas|feeling)/.test(m))                  return cwPick(CB_KB.mood);
  if (/(goal|target|maqsad)/.test(m))                       return cwPick(CB_KB.goals);
  if (/(journal|diary|likhna|write)/.test(m))               return cwPick(CB_KB.journal);
  if (/(activit|workout|exercise|walk|run|gym|yoga)/.test(m)) return cwPick(CB_KB.activities);
  if (/(analytic|chart|graph|stats|report|progress)/.test(m)) return cwPick(CB_KB.analytics);
  if (/(milestone|badge|achievement)/.test(m))              return cwPick(CB_KB.milestones);
  if (/(profile|account|setting|password|theme)/.test(m))   return cwPick(CB_KB.profile);
  if (/(streak|fire|consecutive|lagatar)/.test(m))          return cwPick(CB_KB.streak);
  if (/(feedback|review|suggestion|complain)/.test(m))      return cwPick(CB_KB.feedback_q);
  if (/(dashboard|home|main page|summary)/.test(m))         return cwPick(CB_KB.dashboard);
  // Chit-chat
  if (/(kaisa|kya haal|how are you|theek|ap kaisy|aap kaise)/.test(m))
    return "😊 I'm doing great, thanks for asking! How about you — what would you like to do in SoftLife today?";
  if (/(name|naam|kaun|kon ho|who are you|tum kaun)/.test(m))
    return "🤖 I'm the SoftLife AI Assistant — here to help with your personal wellness journey! Ask me about habits, goals, mood, and more 😊";
  if (/(love|pasand|acha laga|maza|zabardast|amazing|great|superb)/.test(m))
    return "💜 Thank you so much! If you have any suggestions, drop them in the Feedback section 🌟";
  if (/(bored|ugh|bakwas|useless|bad|bura|problem|issue|bug|kaam nahi)/.test(m))
    return "😔 Sorry to hear that! Could you tell me more about the issue? Or use the Feedback option in the Sidebar to report it — our team will look into it right away! 💜";

  return cwPick(CB_KB.unknown);
}

// ── Append message ──
function appendCwMsg(text, who) {
  const msgs = document.getElementById("cwMessages");
  const d = document.createElement("div");
  d.className = "cw-msg " + who;
  d.textContent = text;
  msgs.appendChild(d);
  msgs.scrollTop = msgs.scrollHeight;
}

// ── Send message ──
function cwSendMsg(text) {
  const inp = document.getElementById("cwInput");
  const t = (typeof text === "string" && text) ? text : inp.value.trim();
  if (!t) return;
  inp.value = "";
  appendCwMsg(t, "user");
  var qr = document.getElementById("cwQuickRow");
  if (qr) qr.remove();
  var delay = 700 + Math.floor(Math.random() * 500);
  cwShowTyping();
  setTimeout(function() {
    cwHideTyping();
    appendCwMsg(cwGetReply(t), "bot");
  }, delay);
}

// ── Alias for old code ──
function sendChatMessage() { cwSendMsg(); }


// ═══════════════════════════════════════════════════
//  reCAPTCHA VERIFICATION FUNCTIONS
// ═══════════════════════════════════════════════════
window.rcSignupVerified = false;
window.fbRcVerified = false;

function rcSignupVerify(el) {
  if (!el.checked) { window.rcSignupVerified = false; return; }
  el.disabled = true;
  // Hide checkbox row, show spinner
  document.getElementById('rcSignupRow').style.display = 'none';
  document.getElementById('rcSignupVerifying').style.display = 'flex';
  // Simulate verification (1.3s) — replace with real Google reCAPTCHA token if needed
  setTimeout(() => {
    document.getElementById('rcSignupVerifying').style.display = 'none';
    document.getElementById('rcSignupSuccess').style.display = 'flex';
    document.getElementById('signupCaptchaHint').style.display = 'none';
    window.rcSignupVerified = true;
  }, 1300);
}

function fbRcVerify(el) {
  if (!el.checked) { window.fbRcVerified = false; return; }
  window.fbRcVerified = true;
  document.getElementById('fbRcMsg').style.display = 'none';
}

// Reset reCAPTCHA state when modals close
const _origCloseFb = window.closeFeedbackModal;
if (typeof _origCloseFb === 'function') {
  window.closeFeedbackModal = function() {
    _origCloseFb();
    const cb = document.getElementById('fbRcCheck');
    if (cb) cb.checked = false;
    window.fbRcVerified = false;
    const msg = document.getElementById('fbRcMsg');
    if (msg) msg.style.display = 'none';
  };
}

/* ── Topbar Search Logic ── */
const SEARCH_INDEX = [
  { icon:'📊', label:'Dashboard',  sub:'Overview of your progress',    section:'overview'   },
  { icon:'✅', label:'Habits',     sub:'Track your daily habits',       section:'habits'     },
  { icon:'😊', label:'Mood',       sub:'Log and view your mood',        section:'mood'       },
  { icon:'🎯', label:'Goals',      sub:'Set and track goals',           section:'goals'      },
  { icon:'📓', label:'Journal',    sub:'Write journal entries',         section:'journal'    },
  { icon:'🏆', label:'Milestones', sub:'View achievements',             section:'milestones' },
  { icon:'📈', label:'Analytics',  sub:'Stats and trends',              section:'analytics'  },
  { icon:'👤', label:'Profile',    sub:'Your account settings',         section:'profile'    },
  { icon:'🌍', label:'Community',  sub:'World map & community',         section:'map'        },
  { icon:'💬', label:'Feedback',   sub:'Send us your feedback',         action: ()=>openFeedbackModal() },
];
function runTopbarSearch(q) {
  const res = document.getElementById('topbarSearchResults');
  q = q.trim().toLowerCase();
  if (!q) { res.classList.remove('open'); res.innerHTML=''; return; }
  const hits = SEARCH_INDEX.filter(i => i.label.toLowerCase().includes(q) || i.sub.toLowerCase().includes(q));
  res._hits = hits;
  res.innerHTML = hits.length
    ? hits.map((h,i)=>`<div class="tsw-result-item" role="option" tabindex="0"
         onclick="selectSearchResult(${i})" onkeydown="if(event.key==='Enter')selectSearchResult(${i})">
        <span class="tsw-result-icon">${h.icon}</span>
        <div><div class="tsw-result-label">${h.label}</div><div class="tsw-result-sub">${h.sub}</div></div>
      </div>`).join('')
    : `<div class="tsw-no-result">No results for "<b>${q}</b>"</div>`;
  res.classList.add('open');
}
function selectSearchResult(i) {
  const res = document.getElementById('topbarSearchResults');
  const hit = res._hits && res._hits[i];
  if (!hit) return;
  res.classList.remove('open');
  document.getElementById('topbarSearchInput').value = '';
  if (hit.action) { hit.action(); return; }
  if (hit.section) showSection(hit.section);
}
document.addEventListener('click', e => {
  const wrap = document.getElementById('topbarSearchWrap');
  const res  = document.getElementById('topbarSearchResults');
  if (wrap && !wrap.contains(e.target) && res && !res.contains(e.target)) res.classList.remove('open');
});

