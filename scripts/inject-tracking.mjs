#!/usr/bin/env node
// Inject tracking pixels site-wide, before </head>. Idempotent.
// PostHog: always (key hardcoded, already live). Meta/LinkedIn: only if env ID set.
//   META_PIXEL_ID=123... LI_PARTNER_ID=456... node scripts/inject-tracking.mjs
import fs from 'fs'; import path from 'path';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const PH_KEY = 'phc_CDKFjeVGfuEEid74UGx5CNwNFaqaijF8b6e9A6QhLruM';
const META = process.env.META_PIXEL_ID || '';
const LI = process.env.LI_PARTNER_ID || '';

const PH = fs.readFileSync(path.join(ROOT,'scripts/posthog.html'),'utf8').trim();
const metaSnip = id => `<!-- Meta Pixel -->
<script>!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script',
'https://connect.facebook.net/en_US/fbevents.js');fbq('init', '${id}');fbq('track', 'PageView');</script>
<noscript><img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${id}&ev=PageView&noscript=1"/></noscript>`;
const liSnip = id => `<!-- LinkedIn Insight Tag -->
<script type="text/javascript">_linkedin_partner_id = "${id}";window._linkedin_data_partner_ids=window._linkedin_data_partner_ids||[];window._linkedin_data_partner_ids.push(_linkedin_partner_id);</script>
<script type="text/javascript">(function(l){if(!l){window.lintrk=function(a,b){window.lintrk.q.push([a,b])};window.lintrk.q=[]}var s=document.getElementsByTagName("script")[0];var b=document.createElement("script");b.type="text/javascript";b.async=true;b.src="https://snap.licdn.com/li.lms-analytics/insight.min.js";s.parentNode.insertBefore(b,s)})(window.lintrk);</script>
<noscript><img height="1" width="1" style="display:none;" alt="" src="https://px.ads.linkedin.com/collect/?pid=${id}&fmt=gif"/></noscript>`;

const files=[];
(function walk(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);
  if(e.isDirectory()){if(!/node_modules|\.git/.test(e.name))walk(p);}
  else if(e.name.endsWith('.html')&&!/ 2\.html$/.test(e.name))files.push(p);}})(ROOT);

let ph=0,fb=0,li=0;
for(const f of files){
  let s=fs.readFileSync(f,'utf8'); let add='';
  if(!s.includes(PH_KEY)){add+='\n'+PH; ph++;}
  if(META && !s.includes("fbq('init'")){add+='\n'+metaSnip(META); fb++;}
  if(LI && !s.includes('_linkedin_partner_id')){add+='\n'+liSnip(LI); li++;}
  if(add){
    if(s.includes('</head>')) s=s.replace('</head>', add+'\n</head>');
    else s=add+'\n'+s;
    fs.writeFileSync(f,s);
  }
}
console.log(`Pages: ${files.length} | +PostHog ${ph} | +Meta ${fb} | +LinkedIn ${li}`);
console.log(META?'':'META_PIXEL_ID not set — Meta skipped'); console.log(LI?'':'LI_PARTNER_ID not set — LinkedIn skipped');
