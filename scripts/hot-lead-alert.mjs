#!/usr/bin/env node
// Hot-lead alert. Queries PostHog for high-intent visitors and DMs Hayat on Slack.
// Hot = in the lookback window a person viewed >=3 blog posts OR hit a high-intent
// page (services / pricing / contact). Dedups so nobody is pinged twice in 7 days.
//
// Run:  node scripts/hot-lead-alert.mjs            (default 90-min lookback)
//       LOOKBACK_MIN=43200 node scripts/hot-lead-alert.mjs   (test: 30 days)
//       DRY=1 node scripts/hot-lead-alert.mjs       (no Slack, just print)
//
// Creds read from ~/.config/agents/master.env (never committed).

import fs from 'fs';
import os from 'os';
import path from 'path';

const ENV_FILE = path.join(os.homedir(), '.config/agents/master.env');
const SEEN_FILE = path.join(os.homedir(), '.config/agents/be-hot-leads-seen.json');
const LOOKBACK_MIN = Number(process.env.LOOKBACK_MIN || 90);
const DRY = process.env.DRY === '1';
const DEDUP_DAYS = 7;

function env(k) {
  for (const line of fs.readFileSync(ENV_FILE, 'utf8').split('\n')) {
    if (line.startsWith(k + '=')) return line.slice(k.length + 1).trim().replace(/^["']|["']$/g, '');
  }
  return '';
}

const PH_KEY = env('POSTHOG_PERSONAL_API_KEY');
const PH_PROJ = env('POSTHOG_PROJECT_ID') || '402600';
const PH_HOST = env('POSTHOG_HOST') || 'https://us.posthog.com';
const SLACK_TOKEN = env('SLACK_CLAUDE_BOT_TOKEN');
const SLACK_TO = env('SLACK_HAYAT_USER_ID');

async function ph(query) {
  const r = await fetch(`${PH_HOST}/api/projects/${PH_PROJ}/query/`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${PH_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: { kind: 'HogQLQuery', query } }),
  });
  if (!r.ok) throw new Error(`PostHog ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return (await r.json()).results || [];
}

async function slack(text) {
  const r = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: { Authorization: `Bearer ${SLACK_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ channel: SLACK_TO, text, unfurl_links: false }),
  });
  const j = await r.json();
  if (!j.ok) throw new Error(`Slack error: ${j.error}`);
}

const rows = await ph(`
  select
    person_id,
    argMax(distinct_id, timestamp) as did,
    countIf(match(properties.$pathname, '^/blog/posts/')) as blog_views,
    count(distinct properties.$pathname) as pages,
    countIf(
      properties.$pathname like '%/services%' or
      properties.$pathname like '%pricing%' or
      properties.$pathname like '%contact%' or
      properties.$pathname like '%/about%'
    ) as high_intent,
    max(properties.$geoip_city_name) as city,
    max(properties.$geoip_country_name) as country,
    argMax(coalesce(nullIf(properties.$referring_domain,''),'direct'), timestamp) as ref,
    max(timestamp) as last_seen
  from events
  where event = '$pageview' and timestamp > now() - interval ${LOOKBACK_MIN} minute
  group by person_id
  having pages >= 3 or high_intent > 0
  order by last_seen desc
  limit 50
`);

// dedup ledger
let seen = {};
try { seen = JSON.parse(fs.readFileSync(SEEN_FILE, 'utf8')); } catch {}
const nowMs = Date.parse(rows[0]?.[9] || '') || 0; // avoid Date.now in some sandboxes; fall back below
const cutoff = (Number.isFinite(nowMs) && nowMs ? nowMs : Date.parse(new Date().toISOString())) - DEDUP_DAYS * 864e5;
for (const k of Object.keys(seen)) if (seen[k] < cutoff) delete seen[k];

let alerted = 0;
for (const [pid, did, blog, pages, hi, city, country, ref, last] of rows) {
  if (seen[pid]) continue;
  const where = [city, country].filter(Boolean).join(', ') || 'unknown location';
  const reason = hi > 0
    ? `hit a high-intent page (services/pricing/contact)`
    : `read ${blog} blog posts (${pages} pages total)`;
  const link = `${PH_HOST}/project/${PH_PROJ}/person/${encodeURIComponent(did || pid)}`;
  const msg = `🔥 *Hot lead on beyondelevation.com*\n> ${reason}\n> From: ${where} · via ${ref}\n> <${link}|View full session in PostHog>`;
  if (DRY) console.log(msg, '\n');
  else await slack(msg);
  seen[pid] = Date.parse(last) || Date.parse(new Date().toISOString());
  alerted++;
}

if (!DRY) fs.writeFileSync(SEEN_FILE, JSON.stringify(seen));
console.log(`Scanned ${rows.length} candidate(s) in last ${LOOKBACK_MIN}min → ${alerted} new alert(s)${DRY ? ' (dry run)' : ''}.`);
