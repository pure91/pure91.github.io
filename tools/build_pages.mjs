// Search pages: fills index.html with English text and writes one page per language (/ko/, /ja/, …) with that
// language's text already in the HTML, so search robots that don't run JS (Naver) still read it. Also writes
// sitemap.xml, robots.txt, the IndexNow key file and /go/ (share link: phone → its store, else /ko/).
// index.html is the one template: edit it, then run
//   node tools/build_pages.mjs            (build)
//   node tools/build_pages.mjs --ping     (after the push is live: tell Bing / Naver / others via IndexNow)
// Re-run after changing index.html, i18n.js or STORE in main.js (e.g. when Google Play goes live).
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://acornlab.app';
const INDEXNOW_KEY = '4cf2d37594c0de42b5ec91700f8b8d31';
const YOUTUBE = 'https://www.youtube.com/@squirrelsheriff';
// Link-preview banner (1200x630) per language; the rest keep the English one. ko: Korean text on the same art (11-19, KakaoTalk shares)
const OG_IMAGE = { ko: 'og-ko.jpg' };
const ogImage = k => `${SITE}/assets/${OG_IMAGE[k] || 'og-v3.jpg'}`;
const OG_LOCALE = {
  en: 'en_US', ko: 'ko_KR', ja: 'ja_JP', 'zh-TW': 'zh_TW', 'zh-CN': 'zh_CN', de: 'de_DE', fr: 'fr_FR',
  es: 'es_ES', 'pt-BR': 'pt_BR', ru: 'ru_RU', id: 'id_ID', ms: 'ms_MY', th: 'th_TH', vi: 'vi_VN',
};

const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/\r\n/g, '\n');      // Windows checkout is CRLF (autocrlf)
const write = (f, s) => {
  fs.mkdirSync(path.dirname(path.join(ROOT, f)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, f), s.replace(/\r\n/g, '\n'));
};

const ctx = { window: {} };
vm.runInNewContext(read('i18n.js'), ctx);
const I18N = ctx.window.I18N;
const LANGS = Object.keys(I18N);
const STORE = vm.runInNewContext(read('main.js').match(/const STORE = \{[\s\S]*?\n\};/)[0] + '\nSTORE', {});

const slug = k => (k === 'en' ? '' : k.toLowerCase());
const pageUrl = k => `${SITE}/${slug(k) ? slug(k) + '/' : ''}`;
const pageFile = k => (slug(k) ? `${slug(k)}/index.html` : 'index.html');
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const attr = s => esc(s).replace(/"/g, '&quot;');
// Same title as main.js apply(): store name + one-line pitch (ko: '… - 알아서 싸우는 다람쥐 보안관')
const pageTitle = t => `${t.name} - ${t.subtitle}`;
const iosLink = k => (STORE.iosFront[k] ? STORE.ios.replace('.com/', `.com/${STORE.iosFront[k]}/`) : STORE.ios);

function jsonLd(k) {
  const t = I18N[k];
  const sameAs = [iosLink(k), YOUTUBE];
  if (STORE.live.play) sameAs.push(`${STORE.play}&hl=${k.replace('-', '_')}`);
  const other = [...new Set([I18N.en.name, I18N.ko.name])].filter(n => n !== t.name);
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'MobileApplication',
    name: t.name,
    alternateName: other,
    description: t.promo,
    url: pageUrl(k),
    inLanguage: k,
    operatingSystem: 'Android, iOS',
    applicationCategory: 'GameApplication',
    applicationSubCategory: 'Idle RPG',
    image: [ogImage(k), `${SITE}/assets/icon-192.png`],
    installUrl: iosLink(k),
    sameAs,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    publisher: {
      '@type': 'Organization', name: 'Acorn Lab Games', url: `${SITE}/`,
      email: 'acornlab.games@gmail.com', logo: `${SITE}/assets/icon-192.png`,
    },
  });
}

const alternates = () => LANGS.map(k => `<link rel="alternate" hreflang="${k}" href="${pageUrl(k)}">`)
  .concat(`<link rel="alternate" hreflang="x-default" href="${SITE}/">`).join('\n');

function sub(html, re, fn, what) {
  if (!re.test(html)) throw new Error(`template: no ${what}`);
  re.lastIndex = 0;
  return html.replace(re, fn);
}

function render(tpl, k) {
  const t = I18N[k];
  const [t1, ...rest] = t.name.split(/\s*[:：]\s*/);
  const vals = Object.assign({}, t, { title1: t1, title2: t.pill || rest.join(' ') });
  let h = tpl;
  // paths from the site root, so /ko/ finds the same files
  h = h.replace(/\b(src|href)="(assets\/|style\.css|i18n\.js|main\.js|squirrel-sheriff-legal\/)/g, '$1="/$2');
  // the root page keeps guessing the language from the browser; a language page is always its language
  h = sub(h, /<html\b[^>]*>/, () => (k === 'en' ? '<html lang="en">' : `<html lang="${k}" data-page="${k}">`), 'html');
  h = sub(h, /<title>[^<]*<\/title>/, () => `<title>${esc(pageTitle(t))}</title>`, 'title');
  h = sub(h, /<meta name="description" content="[^"]*">/, () => `<meta name="description" content="${attr(t.promo)}">`, 'description');
  h = sub(h, /<meta property="og:title" content="[^"]*">/, () => `<meta property="og:title" content="${attr(t.name)}">`, 'og:title');
  h = sub(h, /<meta property="og:description" content="[^"]*">/, () => `<meta property="og:description" content="${attr(t.promo)}">`, 'og:description');
  h = sub(h, /<meta property="og:url" content="[^"]*">/, () => `<meta property="og:url" content="${pageUrl(k)}">`, 'og:url');
  h = sub(h, /<meta property="og:image" content="[^"]*">/, () => `<meta property="og:image" content="${ogImage(k)}">`, 'og:image');
  h = sub(h, /<meta name="twitter:image" content="[^"]*">/, () => `<meta name="twitter:image" content="${ogImage(k)}">`, 'twitter:image');
  if (OG_IMAGE[k]) h = sub(h, /<meta property="og:image:alt" content="[^"]*">/, () => `<meta property="og:image:alt" content="${attr(t.name)}">`, 'og:image:alt');
  h = h.replace(/<meta property="og:locale" content="[^"]*">\n?/g, '');
  h = sub(h, /(<meta property="og:site_name" content="[^"]*">\n)/, m => `${m}<meta property="og:locale" content="${OG_LOCALE[k]}">\n`, 'og:site_name');
  h = h.replace(/<meta name="apple-itunes-app" content="[^"]*">\n?/g, '');
  h = sub(h, /(<meta name="theme-color" content="[^"]*">\n)/, m => `${m}<meta name="apple-itunes-app" content="app-id=${STORE.ios.match(/id(\d+)/)[1]}">\n`, 'theme-color');
  h = h.replace(/<link rel="alternate" hreflang="[^"]*" href="[^"]*">\n/g, '');
  h = sub(h, /<link rel="canonical" href="[^"]*">/, () => `${alternates()}\n<link rel="canonical" href="${pageUrl(k)}">`, 'canonical');
  h = sub(h, /(<script type="application\/ld\+json">)[\s\S]*?(<\/script>)/, (m, a, b) => `${a}${jsonLd(k)}${b}`, 'ld+json');
  // page text (same fields main.js apply() fills)
  h = h.replace(/(<(\w+)\b[^>]*?\sdata-t="(\w+)"[^>]*>)([^<]*)(<\/\2>)/g, (m, open, tag, key, inner, close) =>
    (vals[key] ? `${open}${esc(vals[key])}${close}` : m));
  h = h.replace(/(<span data-mode="(\d+)">)[^<]*(<\/span>)/g, (m, a, i, b) => `${a}${esc(t.modes[+i] || '')}${b}`);
  h = h.replace(/(<span data-chip="(\d+)">)[^<]*(<\/span>)/g, (m, a, i, b) => `${a}${esc(t.wbChips[+i] || '')}${b}`);
  h = sub(h, /(<span id="langCur">)[^<]*(<\/span>)/, (m, a, b) => `${a}${esc(t.native)}${b}`, 'langCur');
  // Korean blog /ko/blog/ (raccoon-sheriff tools/make_site_blog.py): footer link on /ko/ once a post exists
  if (k === 'ko' && fs.existsSync(path.join(ROOT, 'ko/blog/posts.json')))
    h = sub(h, /(<nav class="links">\n)/, m => `${m}    <a href="/ko/blog/">블로그</a>\n`, 'footer links');
  return h;
}

function sitemap() {
  const day = new Date().toISOString().slice(0, 10);
  const alt = LANGS.map(k => `    <xhtml:link rel="alternate" hreflang="${k}" href="${pageUrl(k)}"/>`)
    .concat(`    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE}/"/>`).join('\n');
  const urls = LANGS.map(k => `  <url>\n    <loc>${pageUrl(k)}</loc>\n    <lastmod>${day}</lastmod>\n${alt}\n  </url>`).join('\n');
  // blog posts (written by raccoon-sheriff tools/make_site_blog.py into ko/blog/posts.json) keep their lines here too
  let blog = '';
  if (fs.existsSync(path.join(ROOT, 'ko/blog/posts.json'))) {
    const posts = JSON.parse(read('ko/blog/posts.json'));
    const u = (loc, mod) => `  <url>\n    <loc>${SITE}${loc}</loc>\n    <lastmod>${mod}</lastmod>\n  </url>\n`;
    blog = (posts.length ? u('/ko/blog/', posts[0].date) : '') + posts.map(p => u(`/ko/blog/${p.id}/`, p.modified || p.date)).join('');
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls}\n${blog}</urlset>\n`;
}

// /go/: one link to share (KakaoTalk etc.). The preview reads the Korean OG tags here (scrapers don't run JS);
// a phone that opens it goes to its store, anything else to /ko/. No meta refresh: a scraper would follow it.
function goPage() {
  const k = 'ko', t = I18N[k];
  const pkg = STORE.play.match(/id=([\w.]+)/)[1];
  const play = `${STORE.play}&hl=ko`;
  const intent = `intent://details?id=${pkg}#Intent;scheme=market;package=com.android.vending;S.browser_fallback_url=${encodeURIComponent(play)};end`;
  const ios = iosLink(k);
  const url = `${SITE}/go/`;
  const img = ogImage(k);
  const ICON_PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#34A853" d="M3.6 2.3 13.5 12l-9.9 9.7c-.4-.2-.6-.6-.6-1.1V3.4c0-.5.2-.9.6-1.1Z"/><path fill="#FBBC04" d="m17 8.5-3.5 3.5L17 15.5l3.9-2.2c.8-.5.8-1.6 0-2.1L17 8.5Z"/><path fill="#4285F4" d="M3.6 21.7 13.5 12l3.5 3.5L5.2 22c-.6.3-1.2.2-1.6-.3Z"/><path fill="#EA4335" d="M3.6 2.3c.4-.5 1-.6 1.6-.3L17 8.5 13.5 12 3.6 2.3Z"/></svg>';
  const ICON_APPLE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#fff" d="M16.4 12.7c0-2.6 2.1-3.8 2.2-3.9-1.2-1.8-3.1-2-3.7-2-1.6-.2-3.1.9-3.9.9s-2-.9-3.4-.9c-1.7 0-3.3 1-4.2 2.6-1.8 3.1-.5 7.7 1.3 10.2.9 1.2 1.9 2.6 3.2 2.6 1.3-.1 1.8-.8 3.3-.8 1.6 0 2 .8 3.4.8 1.4 0 2.3-1.3 3.1-2.5 1-1.4 1.4-2.8 1.4-2.9 0 0-2.7-1-2.7-4.1ZM13.9 5.1c.7-.9 1.2-2 1-3.2-1 0-2.3.7-3 1.6-.7.8-1.2 2-1.1 3.1 1.2.1 2.3-.6 3.1-1.5Z"/></svg>';
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(t.name)}</title>
<meta name="description" content="${attr(t.promo)}">
<meta name="robots" content="noindex">
<meta name="theme-color" content="#F07A2A">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Acorn Lab Games">
<meta property="og:locale" content="ko_KR">
<meta property="og:title" content="${attr(t.name)}">
<meta property="og:description" content="${attr(t.promo)}">
<meta property="og:image" content="${img}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${attr(t.name)}">
<meta property="og:url" content="${url}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${attr(t.name)}">
<meta name="twitter:description" content="${attr(t.promo)}">
<meta name="twitter:image" content="${img}">
<link rel="icon" type="image/png" href="/assets/favicon.png">
<link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">
<script>
(function () {
  var ua = navigator.userAgent || '';
  var android = /Android/i.test(ua);
  var ios = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (android || ios) {
    // coming back from the store (back button / tab switch) shows the buttons instead of jumping to the store again
    try { if (sessionStorage.getItem('go-store')) return; sessionStorage.setItem('go-store', '1'); } catch (e) {}
  }
  if (android) location.replace(${JSON.stringify(intent)});
  else if (ios) location.replace(${JSON.stringify(ios)});
  else location.replace('/ko/');
})();
</script>
<style>
html, body { margin: 0; }
body {
  min-height: 100vh; display: grid; place-items: center; padding: 24px 16px; box-sizing: border-box;
  background: radial-gradient(120% 90% at 70% 30%, #ffe7a3 0%, #ffc44f 45%, #f59a3a 100%);
  color: #3b2414; text-align: center; word-break: keep-all;
  font-family: system-ui, -apple-system, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif; font-weight: 800;
}
main { width: min(100%, 520px); }
img.banner { width: 100%; height: auto; border-radius: 16px; box-shadow: 0 6px 0 rgba(59, 36, 20, .25); }
h1 { margin: 20px 0 6px; font-size: 26px; }
p { margin: 0 0 20px; font-size: 16px; font-weight: 700; }
.badges { display: flex; flex-wrap: wrap; gap: 12px; justify-content: center; }
.badge {
  display: inline-flex; align-items: center; gap: 10px; min-width: 178px; padding: 10px 16px; box-sizing: border-box;
  background: #111; color: #fff; text-decoration: none; text-align: left; border-radius: 14px; box-shadow: 0 4px 0 rgba(0, 0, 0, .35);
}
.badge svg { width: 26px; height: 26px; flex: none; }
.badge small { display: block; font-size: 11px; font-weight: 700; opacity: .8; line-height: 1.1; }
.badge b { display: block; font-size: 19px; font-weight: 900; line-height: 1.1; }
.site { display: inline-block; margin-top: 18px; color: #3b2414; font-size: 14px; }
</style>
</head>
<body>
<main>
<img class="banner" src="/assets/${OG_IMAGE[k]}" width="1200" height="630" alt="${attr(t.name)}">
<h1>${esc(t.name)}</h1>
<p>스토어로 이동하고 있어요. 안 열리면 아래 버튼을 눌러 주세요.</p>
<div class="badges">
<a class="badge" href="${attr(play)}">${ICON_PLAY}<span><small>GET IT ON</small><b>Google Play</b></span></a>
<a class="badge" href="${attr(ios)}">${ICON_APPLE}<span><small>Download on the</small><b>App Store</b></span></a>
</div>
<a class="site" href="/ko/">게임 소개 보기</a>
</main>
</body>
</html>
`;
}

async function ping() {
  const body = { host: 'acornlab.app', key: INDEXNOW_KEY, keyLocation: `${SITE}/${INDEXNOW_KEY}.txt`, urlList: LANGS.map(pageUrl) };
  const r = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify(body),
  });
  console.log('IndexNow', r.status, r.statusText, `${body.urlList.length} urls`);
}

if (process.argv.includes('--ping')) {
  await ping();
} else {
  const tpl = read('index.html');
  for (const k of LANGS) write(pageFile(k), render(tpl, k));
  write('go/index.html', goPage());
  write('sitemap.xml', sitemap());
  write('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
  write(`${INDEXNOW_KEY}.txt`, INDEXNOW_KEY);
  console.log(`pages: ${LANGS.map(pageFile).join(' ')}`);
}
