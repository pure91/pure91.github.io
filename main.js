// ---- Store links: flip `live` to true on launch day and the badges become real links. ----
const STORE = {
  live: false,
  play: 'https://play.google.com/store/apps/details?id=com.squirrelsheriff.idle',
  ios: 'https://apps.apple.com/app/id6825570982',
};

const VIDEO_REV = 5; // bump when the clips are re-rendered (5: en/ja/zh-TW = sticker anchor ad too)
const SHOT_REV = 4, SHOT_COUNT = 10; // screenshots: bump SHOT_REV when they are retaken (4: weekly boss board added as 5)
const VIDEO_LANGS = { ko: 'ko', ja: 'ja', 'zh-TW': 'zh_TW' }; // others fall back to English
const FONTS = {
  ko: 'Jua', ja: 'M+PLUS+Rounded+1c:wght@800', 'zh-TW': 'Noto+Sans+TC:wght@900',
  'zh-CN': 'Noto+Sans+SC:wght@900', th: 'Mitr:wght@600',
};
// Always open at the top: browsers restore the old scroll spot on reload, which landed mid-page (links with # still work)
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
const toTop = () => { if (!location.hash) scrollTo({ top: 0, behavior: 'instant' }); };
toTop(); addEventListener('load', toTop); addEventListener('pageshow', e => { if (e.persisted) toTop(); });
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const LANGS = Object.keys(I18N);

function pickLang() {
  const q = new URLSearchParams(location.search).get('lang');
  if (q && I18N[q]) return q;
  try { const s = localStorage.getItem('lang'); if (s && I18N[s]) return s; } catch (e) {}
  for (const nav of navigator.languages || [navigator.language]) {
    const l = (nav || '').toLowerCase();
    if (l.startsWith('zh')) return /tw|hk|mo|hant/.test(l) ? 'zh-TW' : 'zh-CN';
    if (l.startsWith('pt')) return 'pt-BR';
    const hit = LANGS.find(k => k.toLowerCase() === l.slice(0, 2));
    if (hit) return hit;
  }
  return 'en';
}

const ICON_PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#34A853" d="M3.6 2.3 13.5 12l-9.9 9.7c-.4-.2-.6-.6-.6-1.1V3.4c0-.5.2-.9.6-1.1Z"/><path fill="#FBBC04" d="m17 8.5-3.5 3.5L17 15.5l3.9-2.2c.8-.5.8-1.6 0-2.1L17 8.5Z"/><path fill="#4285F4" d="M3.6 21.7 13.5 12l3.5 3.5L5.2 22c-.6.3-1.2.2-1.6-.3Z"/><path fill="#EA4335" d="M3.6 2.3c.4-.5 1-.6 1.6-.3L17 8.5 13.5 12 3.6 2.3Z"/></svg>';
const ICON_APPLE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#fff" d="M16.4 12.7c0-2.6 2.1-3.8 2.2-3.9-1.2-1.8-3.1-2-3.7-2-1.6-.2-3.1.9-3.9.9s-2-.9-3.4-.9c-1.7 0-3.3 1-4.2 2.6-1.8 3.1-.5 7.7 1.3 10.2.9 1.2 1.9 2.6 3.2 2.6 1.3-.1 1.8-.8 3.3-.8 1.6 0 2 .8 3.4.8 1.4 0 2.3-1.3 3.1-2.5 1-1.4 1.4-2.8 1.4-2.9 0 0-2.7-1-2.7-4.1ZM13.9 5.1c.7-.9 1.2-2 1-3.2-1 0-2.3.7-3 1.6-.7.8-1.2 2-1.1 3.1 1.2.1 2.3-.6 3.1-1.5Z"/></svg>';

function badges(t, lang) {
  const hl = lang.replace('-', '_');
  const b = (href, icon, small, name) => STORE.live
    ? `<a class="badge" href="${href}" target="_blank" rel="noopener">${icon}<span><small>${small}</small><b>${name}</b></span></a>`
    : `<span class="badge off">${icon}<span><small>${small}</small><b>${name}</b></span><span class="soon">${t.soon}</span></span>`;
  const html = b(`${STORE.play}&hl=${hl}`, ICON_PLAY, 'GET IT ON', 'Google Play') + b(STORE.ios, ICON_APPLE, 'Download on the', 'App Store');
  $$('[data-badges]').forEach(el => { el.innerHTML = html; });
}

function loadFont(lang) {
  const fam = FONTS[lang];
  if (!fam || document.getElementById('font-' + lang)) return;
  const l = document.createElement('link');
  l.rel = 'stylesheet'; l.id = 'font-' + lang;
  l.href = `https://fonts.googleapis.com/css2?family=${fam}&display=swap`;
  document.head.appendChild(l);
}

function apply(lang) {
  const t = I18N[lang];
  const [t1, ...rest] = t.name.split(/\s*[:：]\s*/);
  const vals = Object.assign({}, t, { title1: t1, title2: t.pill || rest.join(' ') });  // pill: badge text when it differs from the store name (ko drops the repeated 보안관)
  document.documentElement.lang = lang;
  document.title = t.name;
  $('meta[name=description]').content = t.promo;
  loadFont(lang);
  $('#langCur').textContent = t.native;
  langBtn.setAttribute('aria-label', `Language: ${t.native}`);
  opts.forEach(o => o.setAttribute('aria-selected', String(o.dataset.lang === lang)));
  $$('[data-t]').forEach(el => { const v = vals[el.dataset.t]; if (v) el.textContent = v; });
  $$('[data-mode]').forEach(el => { el.textContent = t.modes[+el.dataset.mode]; });
  $$('[data-chip]').forEach(el => { el.textContent = t.wbChips[+el.dataset.chip]; });
  $$('[data-shot]').forEach(el => { el.src = `assets/shots/${t.shots}/${el.dataset.shot}.webp?v=${SHOT_REV}`; });
  $('#strip').innerHTML = Array.from({ length: SHOT_COUNT }, (_, i) => i + 1)
    .map(i => `<img src="assets/shots/${t.shots}/${i}.webp?v=${SHOT_REV}" alt="" loading="lazy" width="270" height="480">`).join('');
  badges(t, lang);
  setVideo(lang);
  try { localStorage.setItem('lang', lang); } catch (e) {}
}

// ---- language picker (button + listbox popover) ----
const langBtn = $('#langBtn'), langList = $('#langList');
const CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
langList.innerHTML = LANGS.map(k =>
  `<li role="option" id="opt-${k}" data-lang="${k}" lang="${k}" aria-selected="false"><span>${I18N[k].native}</span>${CHECK}</li>`).join('');
const opts = $$('li', langList);
let lang = pickLang();
let active = 0;

function setActive(i) {
  active = (i + opts.length) % opts.length;
  opts.forEach((o, j) => o.classList.toggle('active', j === active));
  langList.setAttribute('aria-activedescendant', opts[active].id);
  opts[active].scrollIntoView({ block: 'nearest' });
}
function openList() {
  langList.hidden = false;
  langBtn.setAttribute('aria-expanded', 'true');
  setActive(LANGS.indexOf(lang));
  langList.focus({ preventScroll: true });
}
function closeList(refocus) {
  if (langList.hidden) return;
  langList.hidden = true;
  langBtn.setAttribute('aria-expanded', 'false');
  if (refocus) langBtn.focus({ preventScroll: true });
}
function choose(k) {
  closeList(true);
  if (k === lang) return;
  lang = k; apply(lang);
  const u = new URL(location); u.searchParams.set('lang', lang); history.replaceState(null, '', u);
}
langBtn.addEventListener('click', () => (langList.hidden ? openList() : closeList(true)));
langBtn.addEventListener('keydown', e => {
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); openList(); }
});
langList.addEventListener('click', e => { const li = e.target.closest('li'); if (li) choose(li.dataset.lang); });
langList.addEventListener('mousemove', e => { const li = e.target.closest('li'); if (li) setActive(opts.indexOf(li)); });
langList.addEventListener('keydown', e => {
  const k = e.key;
  if (k === 'ArrowDown') setActive(active + 1);
  else if (k === 'ArrowUp') setActive(active - 1);
  else if (k === 'Home') setActive(0);
  else if (k === 'End') setActive(opts.length - 1);
  else if (k === 'Enter' || k === ' ') choose(LANGS[active]);
  else if (k === 'Escape') closeList(true);
  else if (k === 'Tab') { closeList(false); return; }
  else if (k.length === 1) { // type-ahead by native name
    const i = opts.findIndex((o, j) => j > active && o.textContent.toLowerCase().startsWith(k.toLowerCase()));
    const f = i >= 0 ? i : opts.findIndex(o => o.textContent.toLowerCase().startsWith(k.toLowerCase()));
    if (f >= 0) setActive(f);
  } else return;
  e.preventDefault();
});
document.addEventListener('pointerdown', e => { if (!e.target.closest('#langPicker')) closeList(false); });

// ---- video: loads only when near the viewport ----
const vid = $('#vid'), phone = vid.parentElement, soundBtn = $('#sound');
let vidSeen = false;
function setVideo(l) {
  const v = VIDEO_LANGS[l] || 'en';
  if (vid.dataset.v === v) return;
  vid.dataset.v = v;
  vid.poster = `assets/video/poster_${v}.webp?v=${VIDEO_REV}`;
  vid.src = `assets/video/play_${v}.mp4?v=${VIDEO_REV}`;
  if (vidSeen && !reduced) vid.play().catch(() => {});
}
function syncPaused() { phone.classList.toggle('paused', vid.paused); }
vid.addEventListener('play', syncPaused);
vid.addEventListener('pause', syncPaused);
$('#play').addEventListener('click', () => vid.play());
vid.addEventListener('click', () => (vid.paused ? vid.play() : vid.pause()));
soundBtn.addEventListener('click', () => {
  vid.muted = !vid.muted;
  soundBtn.setAttribute('aria-pressed', String(!vid.muted));
  if (vid.paused) vid.play();
});
phone.classList.add('paused');
new IntersectionObserver(([e]) => {
  if (e.isIntersecting) {
    vidSeen = true;
    if (!reduced) vid.play().catch(syncPaused);
  } else if (!vid.paused) vid.pause();
}, { rootMargin: '200px' }).observe(phone);

apply(lang);

// ---- parade of crew & pets ----
const CREW = ['bandit', 'boomer', 'dori', 'hoochoo', 'judge', 'marshal_mo', 'nudge', 'rocky', 'sage', 'scarlet', 'tank', 'toto'];
const PETS = ['armadillo', 'bighorn', 'bison', 'black_bear', 'coyote', 'gila', 'hawk', 'jackrabbit', 'javelina', 'kangaroo_rat',
  'lizard', 'longhorn', 'moon_deer', 'mustang', 'phoenix', 'puma', 'quail', 'roadrunner', 'sand_beetle', 'slime',
  'spirit_horse', 'star_coyote', 'sun_eagle', 'thunderbird', 'tortoise', 'tumbleweed', 'wolf'];
const SKINS = ['hat_sheriff', 'hat_black', 'hat_cactus', 'hat_canyon', 'hat_cream', 'hat_gold', 'hat_red', 'hat_sky', 'hat_star', 'hat_straw'];
const row = list => { const h = list.map(s => `<img src="assets/${s}.webp" alt="" loading="lazy" width="96" height="96">`).join(''); return h + h; };
$('#trackA').innerHTML = row([...CREW.map(c => 'crew/' + c), ...SKINS.map(s => 'skins/' + s)]);
$('#trackB').innerHTML = row(PETS.map(p => 'pets/' + p));

// ---- pets orbit + skin swap ----
const orbitPets = ['phoenix', 'moon_deer', 'thunderbird', 'tortoise', 'spirit_horse', 'jackrabbit', 'star_coyote', 'black_bear'];
const orbit = document.createElement('div');
orbit.className = 'orbit';
orbit.innerHTML = orbitPets.map((p, i) => `<span style="--a:${i * 45}deg"><img src="assets/pets/${p}.webp" alt="" loading="lazy"></span>`).join('');
$('#ring').prepend(orbit);
const skin = $('#skin');
let si = 0;
if (!reduced) setInterval(() => {
  si = (si + 1) % SKINS.length;
  skin.classList.add('swap');
  skin.src = `assets/skins/${SKINS[si]}.webp`;
  void skin.offsetWidth;
  skin.classList.remove('swap');
}, 1600);

// ---- merge loop: two of a grade become the next grade ----
const GRADES = ['D', 'C', 'B', 'A', 'S', '★1', '★2', '★3'];
const WEAPONS = ['revolver', 'shotgun', 'water', 'dynamite', 'rifle', 'flamer', 'gatling', 'cannon', 'railgun', 'comet'];
const merge = $('#merge');
const MERGE_MS = 2800, PAIR_SWAP_AT = .65; // pair is hidden from 44% to the end of each loop
let mi = 0;
// Each part is swapped only while it is invisible, so no old weapon flashes on screen.
function setPair(k) {
  $$('.slot.l img, .slot.r img', merge).forEach(i => { i.src = `assets/weapons/${WEAPONS[k % WEAPONS.length]}.webp`; });
  $$('.slot.l em, .slot.r em', merge).forEach(e => { e.textContent = GRADES[k % (GRADES.length - 1)]; });
}
function setResult(k) {
  $('.slot.out img', merge).src = `assets/weapons/${WEAPONS[(k + 1) % WEAPONS.length]}.webp`;
  $('.slot.out em', merge).textContent = GRADES[k % (GRADES.length - 1) + 1];
}
function schedulePair() {
  const a = $('.slot.out', merge).getAnimations()[0];
  const t = a && a.currentTime != null ? a.currentTime % MERGE_MS : 0;
  setTimeout(() => setPair(mi + 1), Math.max(0, MERGE_MS * PAIR_SWAP_AT - t));
}
setPair(0); setResult(0);
$('.slot.out', merge).addEventListener('animationiteration', () => { mi++; setResult(mi); schedulePair(); });
if (!reduced) schedulePair();
// preload weapons so swaps never flash
WEAPONS.forEach(w => { new Image().src = `assets/weapons/${w}.webp`; });

// ---- idle reward counters (golden acorns, acorns, gems) ----
const acornEl = $('#acorns'), goldEl = $('#gold'), gemEl = $('#gems');
const SUFFIX = ['', 'K', 'M', 'B', 'T', 'aa', 'ab', 'ac', 'ad'];
let acorns = 120, gold = 80, gems = 12;
function fmt(n) {
  let i = 0;
  while (n >= 1000 && i < SUFFIX.length - 1) { n /= 1000; i++; }
  return (i ? n.toFixed(n < 10 ? 2 : n < 100 ? 1 : 0) : Math.floor(n)) + SUFFIX[i];
}
const showRewards = () => { acornEl.textContent = fmt(acorns); goldEl.textContent = fmt(gold); gemEl.textContent = fmt(gems); };
showRewards();
if (!reduced) setInterval(() => {
  acorns *= 1.09 + Math.random() * .05;
  if (acorns > 9.9e26) acorns = 120;
  gold *= 1.06 + Math.random() * .04;
  if (gold > 9.9e26) gold = 80;
  if (Math.random() < .35) gems += 1 + (Math.random() * 3 | 0);
  if (gems > 99999) gems = 12;
  showRewards();
}, 120);

// ---- falling acorns in the hero sky ----
const sky = $('#sky');
const DROPS = ['icons/acorns', 'icons/acorns', 'icons/gems', 'icons/gold', 'icons/heart'];
function drop() {
  if (document.hidden || sky.childElementCount > 14) return;
  const img = document.createElement('img');
  img.className = 'acorn';
  img.src = `assets/${DROPS[Math.random() * DROPS.length | 0]}.webp`;
  img.alt = '';
  img.style.left = Math.random() * 100 + '%';
  img.style.width = 22 + Math.random() * 22 + 'px';
  img.style.setProperty('--dx', (Math.random() * 120 - 60) + 'px');
  img.style.setProperty('--rot', (Math.random() * 720 - 360) + 'deg');
  img.style.animationDuration = 5 + Math.random() * 5 + 's';
  img.addEventListener('animationend', () => img.remove());
  sky.appendChild(img);
}
if (!reduced) setInterval(drop, 700);

// ---- hero parallax (pointer devices only) ----
const stage = $('.stage');
if (!reduced && matchMedia('(pointer: fine)').matches) {
  addEventListener('pointermove', e => {
    const x = e.clientX / innerWidth - .5, y = e.clientY / innerHeight - .5;
    stage.style.transform = `translate(${x * -18}px, ${y * -12}px)`;
  }, { passive: true });
}

// ---- scroll reveal ----
const io = new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
}), { threshold: .15 });
$$('.reveal').forEach(el => io.observe(el));
