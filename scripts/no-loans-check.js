#!/usr/bin/env node
/**
 * Hayat's rule (27 Oct 2026): Beyond Elevation never lends, arranges or structures loans.
 * Two prospects booked calls thinking we did. This runs in deploy.yml before the pages are
 * rebuilt: any post whose title or slug is about borrowing, or whose body says we provide
 * financing, is dropped from data/posts.json so it never goes live. The site still deploys.
 * Run with --check to only report (exit 1 if anything would be dropped).
 */
const fs = require('fs');
const path = require('path');
const POSTS_JSON = path.join(__dirname, '..', 'data', 'posts.json');

const TOPIC = /\b(loans?|lenders|lending|borrow(ing|able)?|collateral|venture[- ]debt|debt[- ]financ\w*|ip[- ]backed[- ]financ\w*|patent[- ]backed|non[- ]dilutive[- ](funding|capital|financ\w*)|ip[- ]funding|bankable|securiti[sz]ation)\b/i;
const CLAIM = /\b(Beyond Elevation|Hayat Amin|our team|we)( (has|have|will|can))? (structur|arrang|broker|provid|offer|secur|sourc|deliver|run)\w*\b[^.<]{0,80}\b(loans?|lending|lenders?|venture debt|debt financ\w*|ip[- ]backed (financ\w*|loans?|debt)|lending packages?)\b/i;

const offends = (p) => TOPIC.test(`${p.title || ''} ${p.slug || ''}`) || CLAIM.test(p.body || '');

if (require.main === module) {
  const posts = JSON.parse(fs.readFileSync(POSTS_JSON, 'utf8'));
  const bad = posts.filter(offends);
  for (const p of bad) console.log(`no-loans: dropping ${p.slug} | ${p.title}`);
  if (process.argv.includes('--check')) process.exit(bad.length ? 1 : 0);
  if (bad.length) fs.writeFileSync(POSTS_JSON, JSON.stringify(posts.filter((p) => !offends(p)), null, 2));
  console.log(`no-loans: ${bad.length} dropped, ${posts.length - bad.length} kept`);
}
module.exports = { offends };
