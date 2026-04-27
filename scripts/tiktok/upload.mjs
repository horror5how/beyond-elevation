#!/usr/bin/env node
// TikTok upload via Browserbase (residential IP) + cookie auth + modal handling.
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

const VIDEO = process.argv[2];
const CAPTION = process.argv[3];
const COOKIES_JSON = process.env.TIKTOK_COOKIES_JSON || readFileSync('tiktok_cookies.json', 'utf8');

const cookies = JSON.parse(COOKIES_JSON).map(c => ({
  name: c.name,
  value: c.value,
  domain: c.domain.startsWith('.') ? c.domain : '.' + c.domain.replace(/^www\./, ''),
  path: c.path || '/',
  secure: !!c.secure,
  httpOnly: false,
  expires: c.expires && c.expires > 0 ? c.expires : -1,
  sameSite: 'Lax',
}));

let browser, ctx, page;
const useBrowserbase = !!(process.env.BROWSERBASE_API_KEY && process.env.BROWSERBASE_PROJECT_ID);

if (useBrowserbase) {
  console.log('[tt] using Browserbase residential session…');
  const sessRes = await fetch('https://api.browserbase.com/v1/sessions', {
    method: 'POST',
    headers: {
      'X-BB-API-Key': process.env.BROWSERBASE_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      projectId: process.env.BROWSERBASE_PROJECT_ID,
      browserSettings: {
        fingerprint: { devices: ['desktop'], operatingSystems: ['macos'] },
      },
      proxies: true,
    }),
  });
  if (!sessRes.ok) throw new Error(`bb session: ${sessRes.status} ${await sessRes.text()}`);
  const sess = await sessRes.json();
  console.log(`[tt] bb session ${sess.id}`);
  browser = await chromium.connectOverCDP(sess.connectUrl);
  ctx = browser.contexts()[0] || await browser.newContext();
  await ctx.addCookies(cookies);
  page = ctx.pages()[0] || await ctx.newPage();
} else {
  console.log('[tt] using local headed Chromium…');
  browser = await chromium.launch({
    headless: false,
    args: ['--disable-blink-features=AutomationControlled', '--no-sandbox', '--disable-dev-shm-usage'],
  });
  ctx = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  });
  await ctx.addCookies(cookies);
  page = await ctx.newPage();
}
await page.addInitScript(() => {
  Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
});

async function killModals() {
  await page.evaluate(() => {
    const dialogs = document.querySelectorAll('[role="dialog"], .TUXModal, .common-modal-body');
    dialogs.forEach(d => {
      const btns = d.querySelectorAll('button, [role="button"]');
      const labels = ['got it', 'ok', 'continue', 'confirm', 'next', 'agree', 'i understand', 'close', 'dismiss', 'no thanks', 'skip', 'maybe later', 'cancel'];
      for (const b of btns) {
        const t = (b.innerText || '').trim().toLowerCase();
        if (labels.some(l => t === l || t.startsWith(l))) {
          try { b.click(); return; } catch {}
        }
      }
      const close = d.querySelector('[data-e2e="modal-close-inner-button"], [aria-label*="lose" i]');
      if (close) try { close.click(); } catch {}
    });
    document.querySelectorAll('div.TUXModal-overlay, div.common-modal-body, [data-floating-ui-portal]').forEach(el => {
      el.style.pointerEvents = 'none';
    });
  });
  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForTimeout(800);
}

console.log('[tt] navigating...');
await page.goto('https://www.tiktok.com/tiktokstudio/upload?from=upload&lang=en', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(5000);
await killModals();

let fileInput = page.locator('input[type="file"]').first();
if (await fileInput.count() === 0) {
  for (const f of page.frames()) {
    const fi = f.locator('input[type="file"]').first();
    if (await fi.count() > 0) { fileInput = fi; break; }
  }
}
console.log(`[tt] uploading ${VIDEO}`);
await fileInput.setInputFiles(VIDEO);
await page.waitForTimeout(8000);
await killModals();

console.log('[tt] caption...');
const editor = page.locator('[contenteditable="true"]').first();
try {
  await editor.click({ timeout: 8000, force: true });
  await page.keyboard.press('Meta+A');
  await page.keyboard.press('Backspace');
  await page.keyboard.type(CAPTION, { delay: 12 });
} catch (e) {
  console.log('[tt] caption failed:', e.message.split('\n')[0]);
}
await page.waitForTimeout(2000);

const start = Date.now();
while (Date.now() - start < 180000) {
  const proc = await page.evaluate(() => {
    const t = document.body.innerText.toLowerCase();
    return t.includes('uploading…') || t.includes('processing');
  }).catch(() => false);
  if (!proc) break;
  await page.waitForTimeout(2000);
}

await killModals();
let posted = false;
for (let attempt = 0; attempt < 8 && !posted; attempt++) {
  await killModals();
  const ok = await page.evaluate(() => {
    const cands = [
      ...document.querySelectorAll('button[data-e2e="post_video_button"]'),
      ...Array.from(document.querySelectorAll('button')).filter(b => /^post$/i.test((b.innerText || '').trim()) && !b.disabled),
    ];
    if (!cands.length) return { clicked: false };
    const btn = cands[0];
    btn.scrollIntoView({ block: 'center' });
    btn.click();
    btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
    return { clicked: true, disabled: btn.disabled };
  });
  if (ok.clicked && !ok.disabled) {
    await page.waitForTimeout(3000);
    const success = await page.evaluate(() => {
      const t = document.body.innerText.toLowerCase();
      return t.includes('your video is being uploaded') || t.includes('posted') || t.includes('successfully');
    });
    if (success || page.url().includes('content') || page.url().includes('manage')) {
      posted = true;
      break;
    }
  }
  await page.waitForTimeout(2000);
}

await page.waitForTimeout(5000);
console.log(`[tt] final URL: ${page.url()}`);
await browser.close();
console.log(posted ? '✅ POSTED' : '❌ FAILED');
process.exit(posted ? 0 : 1);
