// Search pages: fills index.html with English text and writes one page per language (/ko/, /ja/, …) with that
// language's text already in the HTML, so search robots that don't run JS (Naver) still read it. Also writes
// sitemap.xml, robots.txt and the IndexNow key file. index.html is the one template: edit it, then run
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
const OG_LOCALE = {
  en: 'en_US', ko: 'ko_KR', ja: 'ja_JP', 'zh-TW': 'zh_TW', 'zh-CN': 'zh_CN', de: 'de_DE', fr: 'fr_FR',
  es: 'es_ES', 'pt-BR': 'pt_BR', ru: 'ru_RU', id: 'id_ID', ms: 'ms_MY', th: 'th_TH', vi: 'vi_VN',
};

const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
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
    image: [`${SITE}/assets/og-v3.jpg`, `${SITE}/assets/icon-192.png`],
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
  return h;
}

function sitemap() {
  const day = new Date().toISOString().slice(0, 10);
  const alt = LANGS.map(k => `    <xhtml:link rel="alternate" hreflang="${k}" href="${pageUrl(k)}"/>`)
    .concat(`    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE}/"/>`).join('\n');
  const urls = LANGS.map(k => `  <url>\n    <loc>${pageUrl(k)}</loc>\n    <lastmod>${day}</lastmod>\n${alt}\n  </url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls}\n</urlset>\n`;
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
  write('sitemap.xml', sitemap());
  write('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
  write(`${INDEXNOW_KEY}.txt`, INDEXNOW_KEY);
  console.log(`pages: ${LANGS.map(pageFile).join(' ')}`);
}
