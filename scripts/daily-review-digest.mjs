#!/usr/bin/env node
/**
 * daily-review-digest.mjs
 *
 * Once per day, email Hayat the list of draft blog posts awaiting his approval.
 * Each draft shows title, slug, excerpt, word count, and a single command to
 * approve it from any terminal. Run by .github/workflows/daily-review-digest.yml.
 *
 * Env required:
 *   SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, SMTP_FROM
 *   BE_REVIEW_DIGEST_TO (defaults to hayat@beyondelevation.com)
 */

import fs from 'node:fs';
import path from 'node:path';
import nodemailer from 'nodemailer';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const POSTS_JSON = path.join(ROOT, 'data', 'posts.json');

const TO = process.env.BE_REVIEW_DIGEST_TO || 'hayat@beyondelevation.com';

function wordCount(html) {
  return (html || '').replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
}

const posts = JSON.parse(fs.readFileSync(POSTS_JSON, 'utf8'));
const pending = posts.filter(p => p.status === 'draft' || (p.status === 'published' && p.human_reviewed !== true));

if (!pending.length) {
  console.log('No drafts pending. Skipping digest email.');
  process.exit(0);
}

const rows = pending.map(p => `
  <tr>
    <td style="padding:12px;border-bottom:1px solid #e5e5e0;">
      <div style="font-weight:600;font-size:15px;color:#1a1a1a;margin-bottom:4px;">${escapeHtml(p.title)}</div>
      <div style="font-size:12px;color:#777;margin-bottom:8px;">slug: <code>${p.slug}</code> · ${wordCount(p.body)} words · category: ${escapeHtml(p.category || '-')}</div>
      <div style="font-size:13px;color:#444;line-height:1.5;margin-bottom:10px;">${escapeHtml(p.excerpt || '')}</div>
      <div style="font-family:Menlo,monospace;font-size:11px;color:#555;background:#f7f6f1;padding:8px 10px;border-radius:6px;">
        Approve: <span style="color:#0f6f3d;">node scripts/be-approve.mjs --slug ${p.slug}</span><br/>
        Reject:&nbsp; <span style="color:#a23f1d;">node scripts/be-approve.mjs --slug ${p.slug} --reject "reason"</span>
      </div>
    </td>
  </tr>`).join('');

const html = `
<!doctype html><html><body style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:#faf8f3;margin:0;padding:24px;">
  <div style="max-width:680px;margin:0 auto;background:#ffffff;border:1px solid #e5e5e0;border-radius:12px;overflow:hidden;">
    <div style="padding:20px 24px;background:#1a1a1a;color:#fff;">
      <div style="font-size:13px;color:#bdb9a8;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;">Beyond Elevation · blog gate</div>
      <div style="font-size:20px;font-weight:600;">${pending.length} draft${pending.length === 1 ? '' : 's'} awaiting your review</div>
    </div>
    <table style="width:100%;border-collapse:collapse;">${rows}</table>
    <div style="padding:16px 24px;background:#f7f6f1;font-size:12px;color:#666;">
      Interactive mode: <code>cd beyond-elevation && node scripts/be-approve.mjs</code>
    </div>
  </div>
</body></html>`;

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: String(process.env.SMTP_SECURE || 'false') === 'true',
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

await transporter.sendMail({
  from: process.env.SMTP_FROM || 'agent@beyondelevation.com',
  to: TO,
  subject: `Beyond Elevation — ${pending.length} draft${pending.length === 1 ? '' : 's'} awaiting approval`,
  html,
});

console.log(`Sent digest to ${TO} with ${pending.length} drafts.`);

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
