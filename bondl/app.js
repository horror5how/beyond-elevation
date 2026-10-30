/* Hayat Amin business canvas. Code only: every question, answer and number is loaded from an
   AES-256-GCM encrypted file on Hayat's Mac and kept in this browser's IndexedDB, encrypted. */
"use strict";
const $=id=>document.getElementById(id);
const esc=t=>String(t==null?"":t).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const fmt=n=>isFinite(n)?Math.round(n).toLocaleString("en-US"):"–";
const usd=n=>isFinite(n)?(n<0?"-$":"$")+Math.abs(Math.round(n)).toLocaleString("en-US"):"–";
const mny=n=>!isFinite(n)?"–":Math.abs(n)>=1e9?(n<0?"-":"")+"$"+(Math.abs(n)/1e9).toFixed(2)+"B":Math.abs(n)>=1e6?(n<0?"-":"")+"$"+(Math.abs(n)/1e6).toFixed(1)+"M":Math.abs(n)>=1e3?(n<0?"-":"")+"$"+Math.round(Math.abs(n)/1e3)+"k":usd(n);
const reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- storage + crypto ---------- */
function idb(){return new Promise((res,rej)=>{const r=indexedDB.open("hayat-canvas",1);r.onupgradeneeded=()=>r.result.createObjectStore("kv");r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
async function kv(op,k,v){const db=await idb();return new Promise((res,rej)=>{const tx=db.transaction("kv",op==="get"?"readonly":"readwrite"),st=tx.objectStore("kv");
  const rq=op==="get"?st.get(k):op==="del"?st.delete(k):st.put(v,k);rq.onsuccess=()=>res(rq.result);rq.onerror=()=>rej(rq.error)})}
const b64=u8=>{let s="";u8.forEach(b=>s+=String.fromCharCode(b));return btoa(s)};
const unb64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
let KEY=null,FH=null;
async function seal(obj){const iv=crypto.getRandomValues(new Uint8Array(12)),ct=await crypto.subtle.encrypt({name:"AES-GCM",iv},KEY,new TextEncoder().encode(JSON.stringify(obj)));
  return {v:1,alg:"AES-256-GCM",kdf:"PBKDF2-SHA256-310000",iv:b64(iv),ct:b64(new Uint8Array(ct))}}
async function open(env){const pt=await crypto.subtle.decrypt({name:"AES-GCM",iv:unb64(env.iv)},KEY,unb64(env.ct));return JSON.parse(new TextDecoder().decode(pt))}

/* ---------- state ---------- */
let D=null;let view="interview",cur={s:0,q:0},regTab="assumptions",streak=0,lastSaved=0;
const S=()=>D.S;
const ans=(sid,i)=>String((D.A[sid]||{})[i]||"").trim();
const cnt=sid=>{const s=S().find(x=>x.id===sid);return s?s.q.filter((_,i)=>ans(sid,i)).length:0};
const TOTAL=()=>S().reduce((n,s)=>n+s.q.length,0);
const answered=()=>S().reduce((n,s)=>n+cnt(s.id),0);
let saveT=null;
function touch(){$("lockpill").classList.add("saving");$("saveTxt").textContent="Encrypting";clearTimeout(saveT);saveT=setTimeout(persist,650)}
async function persist(){try{const env=await seal(D);await kv("put","blob",env);
    if(FH){try{if((await FH.queryPermission({mode:"readwrite"}))==="granted"){const w=await FH.createWritable();await w.write(JSON.stringify(env));await w.close();D._fileAt=Date.now()}}catch(e){}}
    lastSaved=Date.now();$("lockpill").classList.remove("saving");$("saveTxt").textContent=FH?"Saved to this Mac":"Saved in this browser";pulseOrb()}
  catch(e){$("saveTxt").textContent="Not saved"}}

/* ---------- boot ---------- */
(async function boot(){
  try{KEY=await kv("get","key")}catch(e){}
  if(!KEY){location.href="/bondl/logout";return}
  try{FH=await kv("get","fh")}catch(e){}
  let env=null;try{env=await kv("get","blob")}catch(e){}
  if(env){try{D=await open(env);return start()}catch(e){/* wrong key: ask for the file again */}}
  $("boot").hidden=true;$("gate").hidden=false;
  $("pick").onclick=async()=>{if(window.showOpenFilePicker){try{const [h]=await showOpenFilePicker({types:[{description:"Canvas file",accept:{"application/json":[".canvas",".json"]}}]});
        const perm=await h.requestPermission({mode:"readwrite"});const txt=await (await h.getFile()).text();await loadFile(txt,perm==="granted"?h:null)}catch(e){if(e.name!=="AbortError")$("gateMsg").textContent="Could not open that file."}}
    else $("fileIn").click()};
  $("fileIn").onchange=async e=>{const f=e.target.files[0];if(f)await loadFile(await f.text(),null)};
})();
async function loadFile(txt,h){try{D=await open(JSON.parse(txt))}catch(e){$("gateMsg").textContent="This file could not be unlocked with your password.";return}
  FH=h;if(h){try{await kv("put","fh",h)}catch(e){}}await kv("put","blob",await seal(D));$("gate").hidden=true;start()}

/* ---------- app ---------- */
const VIEWS=[["interview","Interview"],["canvas","Canvas"],["progress","Progress"],["finance","Finance"],["registers","Registers"]];
function start(){
  D.A=D.A||{};D.C=D.C||{};D.E=D.E||{};D.PG=D.PG||{};D.REG=D.REG||{};D.CALC=D.CALC||{};D.XP=D.XP||0;D.badges=D.badges||{};D.hist=D.hist||[];D.timers=D.timers||{};D.meta=D.meta||{};
  try{const t=localStorage.getItem("hc-theme");if(t)document.documentElement.dataset.theme=t}catch(e){}
  $("boot").hidden=true;$("app").hidden=false;
  $("tabs").innerHTML=VIEWS.map(([k,l])=>`<button data-v="${k}" aria-pressed="${k===view}">${l}</button>`).join("");
  $("mobilebar").innerHTML=VIEWS.map(([k,l])=>`<button data-v="${k}" aria-pressed="${k===view}">${l}</button>`).join("");
  document.querySelectorAll("[data-v]").forEach(b=>b.onclick=()=>show(b.dataset.v));
  $("cmdBtn").onclick=palette;$("xpBtn").onclick=badgeSheet;$("orb").onclick=badgeSheet;$("themeBtn").onclick=toggleTheme;$("lockBtn").onclick=lock;
  fxInit();keys();idle();refreshXP();show("interview",true);
  if(!D.meta.onboarded)setTimeout(onboard,900);
}
function show(v,first){view=v;document.querySelectorAll("[data-v]").forEach(b=>b.setAttribute("aria-pressed",b.dataset.v===v));
  const go=()=>{$("main").innerHTML="";stopMap();({interview:renderInterview,canvas:renderCanvas,progress:renderProgress,finance:renderFinance,registers:renderRegisters})[v]();if(!first)scrollTo({top:0,behavior:reduce?"auto":"smooth"})};
  go()}

/* ---------- hero (shared on interview) ---------- */
function hero(){const r=readiness(),pct=Math.round(answered()/TOTAL()*100),done=MS.filter(m=>(D.PG[m[0]]||{}).s==="done").length,facts=countConf("fact");
  return `<section class="hero"><div><div class="who"><img src="/bondl/img/hayat.jpg" alt="Hayat Amin"><h1><span>Hayat Amin's</span><span><em>business</em> canvas</span></h1></div>
   <div class="kpis">${[[pct,"Answered",histSpark("a"),"%"],[r.score,"Investor readiness",histSpark("r"),"%"],[done,"Milestones done","",""],[facts,"Answers backed as fact","",""]].map(k=>`<div class="kpi"><b data-count="${k[0]}" data-suffix="${k[3]}">0${k[3]}</b><span>${k[1]}</span>${k[2]}</div>`).join("")}</div></div>
   <div class="strip" aria-hidden="true">${["surgery","hands","pathology","vault","archive"].map(n=>`<figure><img src="/bondl/img/${n}.jpg" alt=""></figure>`).join("")}</div></section>`}

/* ---------- interview ---------- */
function renderInterview(){
  $("main").innerHTML=`<div class="wrap view">${hero()}<div class="rail" id="rail"></div>
   <div class="studio"><nav class="nav" id="nav" aria-label="Parts"></nav>
    <div style="min-width:0"><div class="timer"><span>Session</span><b id="tmAll">00:00</b><span>This part</span><b id="tmSec">00:00</b><button class="btn sm ghost" id="tmGo">Start timer</button><button class="btn sm ghost" id="focusBtn">Focus mode</button><span class="streak">Streak <b id="streak">0</b></span></div>
     <article class="qcard" id="qcard"></article></div>
    <aside class="side"><div class="mapcard"><h3>Taking shape <span id="mapPct">0%</span></h3><canvas id="map" aria-label="Live map of the canvas. Click a dot to open that part."></canvas>
      <div class="level"><div><b id="lvlName"></b><span id="lvlText"></span></div><span class="label" id="lvlNext"></span></div></div>
     <div class="donuts" id="donuts"></div></aside></div></div>`;
  countUps();renderNav();renderRail();renderQ();renderDonuts();startMap();tmBind();$("mapPct").textContent=Math.round(answered()/TOTAL()*100)+"%";refreshXP()}
function renderNav(){let h="",g="";S().forEach((s,i)=>{if(s.g!==g){g=s.g;h+=`<div class="grp">${esc(g)}</div>`}const c=cnt(s.id);
  h+=`<button data-s="${i}" aria-current="${i===cur.s}" class="${c===s.q.length?"full":""}"><span>${esc(s.t)}</span><span class="c">${c}/${s.q.length}</span></button>`});
  const n=$("nav");if(!n)return;n.innerHTML=h;n.querySelectorAll("button").forEach(b=>b.onclick=()=>goto(+b.dataset.s,0))}
function renderRail(){const r=$("rail");if(!r)return;r.innerHTML=S().map((s,i)=>{const c=cnt(s.id),p=Math.round(c/s.q.length*100);
  return `<button data-s="${i}" title="${esc(s.t)}: ${c}/${s.q.length}" class="${p===100?"full":p?"part":""} ${i===cur.s?"cur":""}" style="--p:${p}%"></button>`}).join("");
  r.querySelectorAll("button").forEach(b=>b.onclick=()=>goto(+b.dataset.s,0))}
const CONF=[["fact","Fact"],["belief","Belief"],["guess","Guess"]];
function renderQ(){const s=S()[cur.s],q=s.q[cur.q],cf=(D.C[s.id]||{})[cur.q]||"";
  $("qcard").innerHTML=`<div class="qhead"><img src="/bondl/img/${esc(s.img||"vault")}.jpg" alt=""><div class="lbl"><small>${esc(s.g)} · Part ${cur.s+1} of ${S().length}</small><b>${esc(s.t)}</b></div></div>
   <div class="qbody"><div class="qmeta"><span class="label">Question ${cur.q+1} of ${s.q.length}</span><span class="label" id="qmAll">${answered()} of ${TOTAL()} answered</span></div>
    <h2 class="q">${esc(q[0])}</h2><p class="why">${esc(q[1])}</p>
    ${q[2]?`<div class="known"><span class="label">What we already know</span>${esc(q[2])}</div>`:""}
    <div class="ansbox"><textarea class="ans" id="ans" aria-label="Answer" placeholder="Brian's answer, in his words.">${esc((D.A[s.id]||{})[cur.q]||"")}</textarea>
     ${("webkitSpeechRecognition" in window||"SpeechRecognition" in window)?`<button class="icon-btn mic" id="mic" aria-label="Dictate answer"><svg viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11"/><path d="M5 11a7 7 0 0014 0M12 18v3"/></svg></button>`:""}</div>
    <div class="coach" id="coach"></div>
    <div class="conf"><div class="seg" role="group" aria-label="How sure are we">${CONF.map(([k,l])=>`<button class="${k}" data-c="${k}" aria-pressed="${cf===k}">${l}</button>`).join("")}</div>
     <input class="field" id="evi" aria-label="Evidence" placeholder="Evidence: the document, contract, email or data that proves it" value="${esc((D.E[s.id]||{})[cur.q]||"")}"></div>
    <div class="qfoot"><button class="btn ghost" id="back" ${cur.s===0&&cur.q===0?"disabled":""}>Back</button><button class="btn primary" id="next">${cur.s===S().length-1&&cur.q===s.q.length-1?"Finish":"Next question"}</button>
     <span class="kbd"><b>⌘</b> <b>↵</b> next · <b>⌘K</b> search · <b>?</b> shortcuts</span></div>
    <div class="dots">${s.q.map((_,i)=>`<i data-q="${i}" class="${i===cur.q?"cur":ans(s.id,i)?"on":""}" title="Question ${i+1}"></i>`).join("")}</div></div>`;
  const ta=$("ans");let had=!!ans(s.id,cur.q);
  ta.oninput=()=>{(D.A[s.id]=D.A[s.id]||{})[cur.q]=ta.value;const now=!!ta.value.trim();if(now&&!had){gain(10,"Answer");streak++;mapBurst(cur.s)}if(!now&&had)gain(-10);had=now;touch();live();coach()};
  ta.onkeydown=e=>{if(e.key==="Enter"&&(e.metaKey||e.ctrlKey)){e.preventDefault();step(1)}};
  $("evi").oninput=e=>{const m=(D.E[s.id]=D.E[s.id]||{}),was=!!String(m[cur.q]||"").trim();m[cur.q]=e.target.value;const is=!!e.target.value.trim();if(is&&!was)gain(5,"Evidence");if(!is&&was)gain(-5);touch();coach()};
  $("qcard").querySelectorAll(".seg button").forEach(b=>b.onclick=()=>{const m=(D.C[s.id]=D.C[s.id]||{}),old=m[cur.q];m[cur.q]=old===b.dataset.c?"":b.dataset.c;
    if(m[cur.q]==="fact"&&old!=="fact")gain(5,"Fact");if(old==="fact"&&m[cur.q]!=="fact")gain(-5);touch();renderQ();checkBadges()});
  $("next").onclick=()=>step(1);$("back").onclick=()=>step(-1);
  $("qcard").querySelectorAll(".dots i").forEach(d=>d.onclick=()=>{cur.q=+d.dataset.q;renderQ()});
  if($("mic"))$("mic").onclick=dictate;coach();if($("streak"))$("streak").textContent=streak}
function coach(){const s=S()[cur.s],a=ans(s.id,cur.q),e=String((D.E[s.id]||{})[cur.q]||"").trim(),c=(D.C[s.id]||{})[cur.q];const w=a?a.split(/\s+/).length:0;
  const items=[[w>=12,`${w} words`],[/\d/.test(a),"Has a number"],[!!e||/Source:/.test(a),"Has a source"],[!!c,"Confidence tagged"]];
  const el=$("coach");if(el)el.innerHTML=items.map(([ok,t])=>`<span class="chip ${ok?"on":""}">${ok?"✓ ":""}${esc(t)}</span>`).join("")}
function step(d){const s=S()[cur.s];const prevS=cur.s,left=ans(s.id,cur.q);
  if(d>0){if(cur.q<s.q.length-1)cur.q++;else if(cur.s<S().length-1){cur.s++;cur.q=0}else{show("canvas");return}}
  else{if(cur.q>0)cur.q--;else if(cur.s>0){cur.s--;cur.q=S()[cur.s].q.length-1}}
  if(d>0&&!left)streak=0;
  if(prevS!==cur.s){renderNav();renderRail()}renderQ();tmPaint();try{$("ans").focus({preventScroll:true})}catch(e){}}
function goto(si,qi){cur={s:si,q:qi||0};if(view!=="interview")show("interview");else{renderNav();renderRail();renderQ();tmPaint()}}
function live(){const done=answered(),pct=Math.round(done/TOTAL()*100);if($("mapPct"))$("mapPct").textContent=pct+"%";if($("qmAll"))$("qmAll").textContent=`${done} of ${TOTAL()} answered`;
  const s=S()[cur.s],nb=document.querySelector(`#nav button[data-s="${cur.s}"] .c`);if(nb){nb.textContent=`${cnt(s.id)}/${s.q.length}`;nb.parentElement.classList.toggle("full",cnt(s.id)===s.q.length)}
  document.querySelectorAll("#qcard .dots i").forEach((d,i)=>{if(i!==cur.q)d.className=ans(s.id,i)?"on":""});
  renderRail();renderDonuts();orb();checkBadges();recordHist()}
function renderDonuts(){const el=$("donuts");if(!el)return;const groups=[...new Set(S().map(s=>s.g))];
  el.innerHTML=groups.map(g=>{const ss=S().filter(s=>s.g===g),t=ss.reduce((n,s)=>n+s.q.length,0),a=ss.reduce((n,s)=>n+cnt(s.id),0),p=Math.round(a/t*100);
   return `<div class="donut"><svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="24" fill="none" stroke="var(--line)" stroke-width="7"/><circle cx="32" cy="32" r="24" fill="none" stroke="${p===100?"var(--ink)":"var(--accent)"}" stroke-width="7" pathLength="100" stroke-dasharray="${p} 100" transform="rotate(-90 32 32)" style="transition:stroke-dasharray .9s"/><text x="32" y="36" text-anchor="middle" style="font:700 12px var(--sans);fill:var(--ink)">${p}%</text></svg><span>${esc(g)}</span></div>`}).join("")}

/* ---------- live map (canvas) ---------- */
let MAP=null;
function startMap(){const cv=$("map");if(!cv)return;const ctx=cv.getContext("2d");MAP={cv,ctx,t:0,parts:[],raf:0,hover:-1};
  const fit=()=>{const r=cv.getBoundingClientRect(),dpr=Math.min(2,devicePixelRatio||1);cv.width=r.width*dpr;cv.height=r.width*dpr;MAP.dpr=dpr};fit();MAP.fit=fit;addEventListener("resize",fit);
  cv.onmousemove=e=>{MAP.hover=hit(e)};cv.onmouseleave=()=>MAP.hover=-1;cv.onclick=e=>{const i=hit(e);if(i>=0)goto(i,0)};
  const tick=()=>{drawMap();MAP.raf=requestAnimationFrame(tick)};tick()}
function stopMap(){if(MAP){cancelAnimationFrame(MAP.raf);MAP=null}}
function nodePos(i,n){const W=MAP.cv.width,c=W/2,R=W*.38,a=-Math.PI/2+i*2*Math.PI/n+MAP.t*.0006;return [c+R*Math.cos(a),c+R*Math.sin(a)]}
function hit(e){if(!MAP)return -1;const r=MAP.cv.getBoundingClientRect(),x=(e.clientX-r.left)*MAP.dpr,y=(e.clientY-r.top)*MAP.dpr,n=S().length;
  for(let i=0;i<n;i++){const [px,py]=nodePos(i,n);if(Math.hypot(px-x,py-y)<14*MAP.dpr)return i}return -1}
function mapBurst(i){if(!MAP)return;const n=S().length;for(let k=0;k<14;k++){const [x,y]=nodePos(i,n);MAP.parts.push({x,y,i,p:0,s:.008+Math.random()*.02,o:(Math.random()-.5)*40*MAP.dpr})}}
function drawMap(){const {ctx,cv}=MAP,W=cv.width,c=W/2,dpr=MAP.dpr,n=S().length,cs=getComputedStyle(document.documentElement);
  const ink=cs.getPropertyValue("--ink").trim(),acc=cs.getPropertyValue("--accent").trim(),line=cs.getPropertyValue("--line2").trim(),paper=cs.getPropertyValue("--paper").trim(),mute=cs.getPropertyValue("--mute").trim();
  MAP.t++;ctx.clearRect(0,0,W,W);const pct=answered()/TOTAL();
  /* rings */
  for(let k=0;k<3;k++){const r=((MAP.t*.35+k*70)%210)*dpr+W*.12;ctx.strokeStyle=acc;ctx.globalAlpha=Math.max(0,.18*(1-(r-W*.12)/(210*dpr)));ctx.beginPath();ctx.arc(c,c,r,0,Math.PI*2);ctx.stroke()}
  ctx.globalAlpha=1;ctx.setLineDash([2*dpr,5*dpr]);ctx.strokeStyle=line;ctx.beginPath();ctx.arc(c,c,W*.38,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
  /* spokes + nodes */
  S().forEach((s,i)=>{const [x,y]=nodePos(i,n),k=cnt(s.id)/s.q.length;if(k>0){ctx.strokeStyle=k===1?ink:acc;ctx.globalAlpha=.25+k*.6;ctx.lineWidth=(k===1?1.6:1)*dpr;ctx.beginPath();ctx.moveTo(c,c);ctx.lineTo(x,y);ctx.stroke();ctx.globalAlpha=1}});
  S().forEach((s,i)=>{const [x,y]=nodePos(i,n),k=cnt(s.id)/s.q.length,r=(i===MAP.hover?10:7)*dpr*(i===cur.s?1.25:1);
    ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=k===1?ink:paper;ctx.fill();ctx.lineWidth=1.2*dpr;ctx.strokeStyle=k===1?ink:line;ctx.stroke();
    if(k>0&&k<1){ctx.beginPath();ctx.arc(x,y,r,-Math.PI/2,-Math.PI/2+k*Math.PI*2);ctx.strokeStyle=acc;ctx.lineWidth=3*dpr;ctx.stroke()}
    if(i===cur.s){ctx.beginPath();ctx.arc(x,y,r+5*dpr+Math.sin(MAP.t*.08)*2*dpr,0,Math.PI*2);ctx.strokeStyle=acc;ctx.lineWidth=1*dpr;ctx.stroke()}
    if(i===MAP.hover){ctx.font=`${12*dpr}px Inter Tight, sans-serif`;ctx.fillStyle=ink;ctx.textAlign=x<c?"right":"left";ctx.fillText(s.t,x+(x<c?-14:14)*dpr,y+4*dpr)}});
  /* particles flying to core */
  MAP.parts=MAP.parts.filter(p=>{p.p+=p.s;const [x0,y0]=nodePos(p.i,n),e=1-Math.pow(1-p.p,3),mx=(x0+c)/2+p.o,my=(y0+c)/2-p.o;
    const x=(1-e)*(1-e)*x0+2*(1-e)*e*mx+e*e*c,y=(1-e)*(1-e)*y0+2*(1-e)*e*my+e*e*c;ctx.fillStyle=acc;ctx.globalAlpha=1-p.p*.6;ctx.fillRect(x-1.5*dpr,y-1.5*dpr,3*dpr,3*dpr);ctx.globalAlpha=1;return p.p<1});
  if(MAP.t%40===0&&pct>0){const done=S().map((s,i)=>cnt(s.id)?i:-1).filter(i=>i>=0);if(done.length){const i=done[Math.floor(Math.random()*done.length)];MAP.parts.push({i,p:0,s:.01,o:(Math.random()-.5)*30*dpr})}}
  /* core */
  const R=W*.11*(1+.04*Math.sin(MAP.t*.04));const g=ctx.createRadialGradient(c,c,0,c,c,R*2.4);g.addColorStop(0,acc);g.addColorStop(1,"transparent");ctx.globalAlpha=.15+pct*.35;ctx.fillStyle=g;ctx.beginPath();ctx.arc(c,c,R*2.4,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
  ctx.beginPath();for(let k=0;k<6;k++){const a=Math.PI/6+k*Math.PI/3+MAP.t*.002;ctx[k?"lineTo":"moveTo"](c+R*Math.cos(a),c+R*Math.sin(a))}ctx.closePath();ctx.fillStyle=paper;ctx.fill();ctx.strokeStyle=ink;ctx.lineWidth=1.5*dpr;ctx.stroke();
  ctx.fillStyle=ink;ctx.textAlign="center";ctx.font=`${Math.round(W*.05)}px Instrument Serif, serif`;ctx.fillText(D.meta.company||"Canvas",c,c+2*dpr);
  ctx.font=`${10*dpr}px IBM Plex Mono, monospace`;ctx.fillStyle=mute;ctx.fillText(Math.round(pct*100)+"%",c,c+18*dpr)}

/* ---------- timer ---------- */
let tmOn=false,tick=null;const mmss=s=>String(Math.floor(s/60)).padStart(2,"0")+":"+String(s%60).padStart(2,"0");
function tmPaint(){if(!$("tmAll"))return;$("tmAll").textContent=mmss(D.timers._all||0);$("tmSec").textContent=mmss(D.timers[S()[cur.s].id]||0);$("tmGo").textContent=tmOn?"Pause timer":"Start timer"}
function tmBind(){tmPaint();$("tmGo").onclick=()=>{tmOn=!tmOn;clearInterval(tick);if(tmOn)tick=setInterval(()=>{D.timers._all=(D.timers._all||0)+1;const id=S()[cur.s].id;D.timers[id]=(D.timers[id]||0)+1;if(D.timers._all%30===0)touch();tmPaint()},1000);tmPaint()};
  $("focusBtn").onclick=focusMode}
function focusMode(){document.body.classList.toggle("focus");toast(document.body.classList.contains("focus")?"Focus mode on. Press F to leave.":"Focus mode off")}

/* ---------- readiness + history ---------- */
const MS=[["funded","Company formed and seed cash in the bank","Cash available to build"],["team","Core team contracted","Architecture, product, data and operations leads signed"],["site","Public presence","Website and basic credibility online"],["finance","Finance stack running","Accounting, bookkeeping, bank feed, monthly close"],["arch","Architecture locked","Final technical design agreed"],["mvp","MVP built","First working version of the platform"],["owner","First data owner signed","Commercial training rights in writing"],["data","First dataset ingested","De-identified data inside the enclave"],["security","Security and HIPAA review passed","A hospital security team has said yes"],["loi","First buyer letter of intent","A named buyer, a real number"],["paid","First paid deal","Cash received from a buyer"],["payout","First owner payout","An owner paid from a real sale"],["repeat","Repeat or second buyer","Proof it is not a one-off"],["raise","Next round closed","Raised on proof, at a higher valuation"]];
const LBL={todo:"Not started",doing:"In progress",done:"Done"};
function countConf(k){let n=0;S().forEach(s=>s.q.forEach((_,i)=>{if(ans(s.id,i)&&(D.C[s.id]||{})[i]===k)n++}));return n}
function readiness(){const an=answered();let backed=0;S().forEach(s=>s.q.forEach((_,i)=>{if(!ans(s.id,i))return;if((D.C[s.id]||{})[i]==="fact"||String((D.E[s.id]||{})[i]||"").trim())backed++}));
  const ms=MS.reduce((n,m)=>n+(((D.PG[m[0]]||{}).s==="done")?1:((D.PG[m[0]]||{}).s==="doing")?.4:0),0)/MS.length;
  const con=D.REG.contradictions||[],cr=con.length?con.filter(r=>r.status==="Resolved").length/con.length:0;
  const rk=D.REG.risks||[],ro=rk.length?rk.filter(r=>String(r.owner||"").trim()&&String(r.mitigation||"").trim()).length/rk.length:0;
  const parts=[["Answered",an/TOTAL(),.25],["Backed by evidence",an?backed/an:0,.2],["Milestones",ms,.25],["Contradictions resolved",cr,.15],["Risks owned",ro,.15]];
  return {score:Math.round(parts.reduce((n,p)=>n+p[1]*p[2],0)*100),parts}}
function recordHist(){const now=Date.now(),last=D.hist[D.hist.length-1],r=readiness().score,a=Math.round(answered()/TOTAL()*100);
  if(!last||now-last.t>60000){D.hist.push({t:now,r,a});if(D.hist.length>300)D.hist.shift()}else{last.r=r;last.a=a}}
function histSpark(k){const h=D.hist.slice(-40);if(h.length<2)return `<svg viewBox="0 0 100 28" preserveAspectRatio="none"><line x1="0" y1="26" x2="100" y2="26" stroke="var(--line2)"/></svg>`;
  const xs=h.map((p,i)=>i/(h.length-1)*100),ys=h.map(p=>26-p[k]/100*24);return `<svg viewBox="0 0 100 28" preserveAspectRatio="none"><polyline class="draw" pathLength="1" fill="none" stroke="var(--accent)" stroke-width="1.5" vector-effect="non-scaling-stroke" points="${xs.map((x,i)=>x.toFixed(1)+","+ys[i].toFixed(1)).join(" ")}"/></svg>`}
function countUps(){document.querySelectorAll("[data-count]").forEach(el=>{const to=+el.dataset.count,from=+(el.dataset.from||0);if(reduce){el.textContent=to+(el.dataset.suffix||"");return}const t0=performance.now();
  const f=t=>{const k=Math.min(1,(t-t0)/900),e=1-Math.pow(1-k,3);el.textContent=Math.round(from+(to-from)*e)+(el.dataset.suffix||"");if(k<1)requestAnimationFrame(f)};requestAnimationFrame(f)})}

/* ---------- canvas board ---------- */
function cmix(sid){const s=S().find(x=>x.id===sid);let f=0,b=0,g=0,u=0;s.q.forEach((_,i)=>{if(!ans(sid,i))return;const c=(D.C[sid]||{})[i];c==="fact"?f++:c==="belief"?b++:c==="guess"?g++:u++});return {f,b,g,u,n:s.q.length}}
function renderCanvas(){let h=`<div class="wrap view"><div class="head"><div><h2>${esc(D.meta.company||"The")} canvas</h2><p>The whole company on one board. Double-click any block to open its answers. The bar shows how much is fact, belief, guess or untagged.</p></div>
   <div class="acts"><div class="ckey"><span><i style="background:var(--ink)"></i>Fact</span><span><i style="background:var(--accent)"></i>Belief</span><span><i style="background:var(--mute)"></i>Guess</span><span><i style="background:var(--line2)"></i>Untagged</span></div>
   <button class="btn ghost sm" id="presBtn">Present</button><button class="btn ghost sm" id="mdBtn">Board pack (.md)</button><button class="btn primary sm" id="bkBtn">Encrypted backup</button></div></div>`;
  let g="",k=0;S().forEach((s,i)=>{if(s.g!==g){if(g)h+=`</div>`;g=s.g;const ss=S().filter(x=>x.g===g),a=ss.reduce((n,x)=>n+cnt(x.id),0),t=ss.reduce((n,x)=>n+x.q.length,0);h+=`<h3 class="gtitle">${esc(g)}<span>${a}/${t}</span></h3><div class="board">`}
    const c=cnt(s.id),first=s.q.map((_,q)=>ans(s.id,q)).find(Boolean)||"",m=cmix(s.id),w=x=>(x/m.n*100).toFixed(1)+"%";
    h+=`<div class="tile" data-id="${s.id}" tabindex="0" role="button" aria-label="${esc(s.t)}, open answers" style="animation-delay:${Math.min(k++*25,600)}ms"><div class="t"><span class="label">${String(i+1).padStart(2,"0")}</span><span class="label">${c}/${s.q.length}</span></div>
     <h4>${esc(s.t)}</h4><p class="${first?"":"empty"}">${first?esc(first.split("\n\nSource:")[0]):"Not answered yet."}</p>
     <div class="cbar"><i class="f" style="width:${w(m.f)}"></i><i class="b" style="width:${w(m.b)}"></i><i class="g" style="width:${w(m.g)}"></i><i class="u" style="width:${w(m.u)}"></i></div></div>`});
  $("main").innerHTML=h+`</div></div>`;
  $("main").querySelectorAll(".tile").forEach(t=>{t.ondblclick=()=>openModal(t.dataset.id,t);t.onkeydown=e=>{if(e.key==="Enter")openModal(t.dataset.id,t)}});
  $("presBtn").onclick=()=>present(0);$("mdBtn").onclick=()=>download("Board pack.md",packMd(),"text/markdown");$("bkBtn").onclick=backup}
function openModal(id,from){const s=S().find(x=>x.id===id),i=S().indexOf(s);
  $("layer").innerHTML=`<div class="scrim" id="scrim"><div class="modal" id="mdl" role="dialog" aria-modal="true" aria-label="${esc(s.t)}"><header><img src="/bondl/img/${esc(s.img||"vault")}.jpg" alt=""><b>${esc(s.t)}</b><button class="x" id="mx" aria-label="Close">×</button></header>
   <dl>${s.q.map((q,k)=>{const c=(D.C[id]||{})[k],e=String((D.E[id]||{})[k]||"").trim();return `<dt>${esc(q[0])}${c?`<i>${esc(c)}</i>`:""}</dt><dd class="${ans(id,k)?"":"empty"}">${ans(id,k)?esc(ans(id,k)):"Not answered yet."}${e?"\n\nEvidence: "+esc(e):""}</dd>`}).join("")}</dl>
   <div class="mfoot"><button class="btn primary" id="medit">Edit these answers</button></div></div></div>`;
  const m=$("mdl");if(from&&!reduce){const a=from.getBoundingClientRect(),b=m.getBoundingClientRect();m.animate([{transform:`translate(${a.left+a.width/2-(b.left+b.width/2)}px,${a.top+a.height/2-(b.top+b.height/2)}px) scale(${a.width/b.width},${a.height/b.height})`,opacity:.4},{transform:"none",opacity:1}],{duration:420,easing:"cubic-bezier(.2,.8,.2,1)"})}
  const close=()=>{$("layer").innerHTML="";document.removeEventListener("keydown",esck);if(from)from.focus()};function esck(e){if(e.key==="Escape")close()}
  $("mx").onclick=close;$("scrim").onclick=e=>{if(e.target.id==="scrim")close()};$("medit").onclick=()=>{close();goto(i,0)};document.addEventListener("keydown",esck);$("mx").focus()}
function present(i){const list=S();let k=i;const paint=()=>{const s=list[k],items=s.q.map((q,j)=>[q[0],ans(s.id,j)]).filter(x=>x[1]);
  $("layer").innerHTML=`<div class="present" role="dialog" aria-label="Presenter"><div class="pt"><span class="label">${esc(s.g)}</span><span class="label">${k+1} / ${list.length} · arrows to move · Esc to close</span></div>
   <div class="body" key="${k}"><h2>${esc(s.t)}</h2>${items.length?items.slice(0,3).map(x=>`<p><b>${esc(x[0])}</b><br>${esc(x[1].split("\n\nSource:")[0])}</p>`).join(""):`<p>Not answered yet.</p>`}</div>
   <div class="nav2"><button class="btn ghost" id="pp">Previous</button><button class="btn primary" id="pn">Next</button></div></div>`;
  $("pp").onclick=()=>{k=(k-1+list.length)%list.length;paint()};$("pn").onclick=()=>{k=(k+1)%list.length;paint()}};
  const kd=e=>{if(!$("layer").firstChild){document.removeEventListener("keydown",kd);return}if(e.key==="ArrowRight"){k=(k+1)%list.length;paint()}if(e.key==="ArrowLeft"){k=(k-1+list.length)%list.length;paint()}if(e.key==="Escape"){$("layer").innerHTML="";document.removeEventListener("keydown",kd)}};
  document.addEventListener("keydown",kd);paint()}

/* ---------- progress ---------- */
function renderProgress(){const st=id=>(D.PG[id]||{}).s||"todo",r=readiness(),d=MS.filter(m=>st(m[0])==="done").length,g=MS.filter(m=>st(m[0])==="doing").length;
  $("main").innerHTML=`<div class="wrap view"><div class="head"><div><h2>Where it really is</h2><p>${d} done, ${g} in progress, ${MS.length-d-g} not started. "Done" needs evidence an investor could see.</p></div></div>
   <div class="score"><div><span class="label">Investor readiness</span><b data-count="${r.score}" data-suffix="%">0%</b>${histSpark("r")}</div>${r.parts.map(p=>`<div><span class="label">${esc(p[0])}</span><b data-count="${Math.round(p[1]*100)}" data-suffix="%">0</b></div>`).join("")}</div>
   <div class="pgtrack">${MS.map((m,i)=>`<i class="${st(m[0])}" title="${esc(m[1])}" style="animation-delay:${i*40}ms"></i>`).join("")}</div>
   <div class="pglist">${MS.map((m,i)=>`<div class="pgrow" style="animation-delay:${i*30}ms"><span class="label">${String(i+1).padStart(2,"0")}</span><div><b>${esc(m[1])}</b><small>${esc(m[2])}</small></div>
    <div class="seg" role="group" aria-label="Status">${["todo","doing","done"].map(k=>`<button class="${k}" data-m="${m[0]}" data-k="${k}" aria-pressed="${st(m[0])===k}">${LBL[k]}</button>`).join("")}</div>
    <input class="field" id="pg-${m[0]}" data-m="${m[0]}" aria-label="Evidence for ${esc(m[1])}" placeholder="Evidence, owner or date" value="${esc((D.PG[m[0]]||{}).n||"")}"></div>`).join("")}</div><div style="height:96px"></div></div>`;
  countUps();
  $("main").querySelectorAll(".seg button").forEach(b=>b.onclick=()=>{const p=(D.PG[b.dataset.m]=D.PG[b.dataset.m]||{}),old=p.s;p.s=b.dataset.k;if(p.s==="done"&&old!=="done"){gain(20,"Milestone");confetti()}if(old==="done"&&p.s!=="done")gain(-20);touch();renderProgress();checkBadges()});
  $("main").querySelectorAll(".pgrow input").forEach(inp=>inp.oninput=()=>{(D.PG[inp.dataset.m]=D.PG[inp.dataset.m]||{}).n=inp.value;touch()})}

/* ---------- finance ---------- */
const GLOSS={"take rate":"The share of each sale Bondl keeps after paying the data owner.","margin":"What is left after direct costs, as a share of revenue.","runway":"How many months the cash lasts at the current spend.","pre-money":"What the company is valued at before new money comes in.","dilution":"How much smaller existing owners' share becomes when new shares are issued.","sell-through":"The share of available cases that are licensed at least once.","resale":"How many times the same case is licensed to different buyers.","reachable":"The part of the market we can actually sell to.","winnable":"The part of the reachable market we can realistically win."};
function gloss(label){const k=Object.keys(GLOSS).find(k=>label.toLowerCase().includes(k));return k?`<span class="tip" tabindex="0" data-t="${esc(GLOSS[k])}">?</span>`:""}
const RUN={
 deal(v){const gross=v.cases*v.price*(1+v.premium/100),owner=gross*v.share/100,cost=v.cases*v.compute,byBuyer=v.passthru==="Buyer",net=gross-owner-(byBuyer?0:cost);
  return {o:[["Buyer pays",gross+(byBuyer?cost:0),"$"],["Owners receive",owner,"$"],["Compute cost",cost,"$"],["Bondl keeps",net,"$"],["Margin on gross",gross?net/gross*100:0,"%"],["Margin if booked net",gross-owner>0?net/(gross-owner)*100:0,"%"]],
   chart:stack([["Owners",owner,"var(--ink2)"],["Compute",byBuyer?0:cost,"var(--mute)"],["Bondl",Math.max(net,0),"var(--ink)"]])}},
 centre(v){const usable=v.cases*v.recorded/100,lic=usable*v.sell/100*v.resale,gross=lic*v.price,net=gross*v.take/100;
  return {o:[["Usable cases",usable,"#"],["Licences sold",lic,"#"],["Gross sales",gross,"$"],["Bondl revenue",net,"$"],["Of the benchmark",v.bench?net/v.bench*100:0,"%"],["Owner income",gross-net,"$"]],chart:bars([["This centre",net],["Benchmark",v.bench]])}},
 runway(v){const burn=+v.burn,cases=[["No revenue",0,"var(--mute)"],["Half of plan",.5,"var(--accent)"],["Plan",1,"var(--ink)"]];
  const series=cases.map(([n,k,c])=>{let cash=v.cash,pts=[],out=null;for(let m=1;m<=24;m++){const r=m>=v.start?v.rev*k*Math.pow(1+v.growth/100,m-v.start):0;cash+=r-burn+(m===v.raiseM?v.raise:0);pts.push(cash);if(out===null&&cash<0)out=m}return {n,c,pts,out}});
  return {o:series.map(s=>[s.n,s.out?`Out of cash, month ${s.out}`:`${mny(s.pts[23])} at month 24`,"t"]),chart:lines(series)}},
 rounds(v){let f=v.fd0?v.founders/v.fd0:0;const rows=[["Before seed",f]];[["Seed",v.seedAmt,v.seedPre],["Series A",v.aAmt,v.aPre],["Series B",v.bAmt,v.bPre]].forEach(([n,a,p])=>{f=f*p/(p+a);rows.push([n,f])});
  return {o:rows.map(r=>[r[0]+" founders",r[1]*100,"%"]).concat([["Raised in total",v.seedAmt+v.aAmt+v.bAmt,"$"]]),chart:bars(rows.map(r=>[r[0],r[1]*100]),"%")}},
 tam(v){const tam=v.owners*v.casesPer*v.usable/100*v.price,sam=tam*v.sam/100,som=sam*v.som/100;return {o:[["Total market",tam,"$"],["Reachable",sam,"$"],["Winnable in 3 years",som,"$"]],chart:bars([["Total",tam],["Reachable",sam],["Winnable",som]])}}};
function stack(parts){const tot=parts.reduce((n,p)=>n+p[1],0)||1;let x=0,h=`<svg class="chart" viewBox="0 0 600 74">`;parts.forEach(([n,v,c],i)=>{const w=v/tot*600;if(w>0){h+=`<rect class="grow" style="animation-delay:${i*120}ms" x="${x}" y="8" width="${w}" height="34" fill="${c}"/>`;if(w>80)h+=`<text x="${x+6}" y="62">${esc(n)} ${Math.round(v/tot*100)}%</text>`;x+=w}});return h+`</svg>`}
function bars(rows,unit){const mx=Math.max(...rows.map(r=>Math.abs(r[1])),1);let h=`<svg class="chart" viewBox="0 0 600 ${rows.length*34+6}">`;rows.forEach(([n,v],i)=>{const w=Math.abs(v)/mx*390;h+=`<text x="0" y="${i*34+21}">${esc(n)}</text><rect class="grow" style="animation-delay:${i*100}ms" x="140" y="${i*34+8}" width="${w}" height="20" fill="${i===0?"var(--ink)":"var(--line2)"}"/><text x="${146+w}" y="${i*34+21}">${unit?v.toFixed(1)+unit:mny(v)}</text>`});return h+`</svg>`}
function lines(series){const all=series.flatMap(s=>s.pts).concat([0]),mx=Math.max(...all),mn=Math.min(...all),W=600,H=220,px=i=>48+i*(W-60)/23,py=v=>12+(mx-v)/(mx-mn||1)*(H-36);
  let h=`<svg class="chart" viewBox="0 0 ${W} ${H}"><line x1="48" x2="${W-12}" y1="${py(0)}" y2="${py(0)}" stroke="var(--ink)" stroke-width="1"/><text x="0" y="${py(0)+4}">$0</text><text x="0" y="${py(mx)+8}">${mny(mx)}</text>`;
  [1,6,12,18,24].forEach(m=>h+=`<text x="${px(m-1)-8}" y="${H-4}">M${m}</text>`);
  series.forEach(s=>{h+=`<polyline class="draw" pathLength="1" fill="none" stroke="${s.c}" stroke-width="2.2" points="${s.pts.map((v,i)=>px(i).toFixed(1)+","+py(v).toFixed(1)).join(" ")}"/>`});
  series.forEach((s,i)=>h+=`<rect x="${W-180}" y="${14+i*16}" width="12" height="3" fill="${s.c}"/><text x="${W-162}" y="${19+i*16}">${esc(s.n)}</text>`);return h+`</svg>`}
function renderFinance(){const defs=D.calcDefs||[];
  $("main").innerHTML=`<div class="wrap view"><div class="head"><div><h2>Finance workbench</h2><p>Five live models. Inputs marked example are placeholders to replace with real numbers in the session. Everything saves to this Mac.</p></div></div><div class="fin">${defs.map((c,ci)=>{const v=D.CALC[c.id]||{};
   return `<section class="calc ${c.wide?"wide":""}" style="animation-delay:${ci*70}ms"><h3>${esc(c.t)}</h3><p>${esc(c.d)}</p><div class="inputs">${c.f.map(([k,l,def,ex])=>{const id=`ci-${c.id}-${k}`;
    if(def&&def.o)return `<label for="${id}">${esc(l)}${gloss(l)}<select id="${id}" data-c="${c.id}" data-k="${k}">${def.o.map((o,i)=>`<option value="${esc(o)}" ${String(v[k]??def.o[0])===String(o)?"selected":""}>${esc(def.l?def.l[i]:o)}</option>`).join("")}</select></label>`;
    return `<label for="${id}"><span>${esc(l)}${gloss(l)} ${ex&&v[k]===undefined?'<span class="ex">example</span>':""}</span><input id="${id}" type="number" inputmode="decimal" data-c="${c.id}" data-k="${k}" value="${esc(v[k]??def)}"></label>`}).join("")}</div>
    <div class="outs" id="out-${c.id}"></div><div id="ch-${c.id}"></div></section>`}).join("")}</div></div>`;
  defs.forEach(c=>runCalc(c,true));
  $("main").querySelectorAll(".inputs input,.inputs select").forEach(el=>el.oninput=()=>{const first=!D.CALC._touched;(D.CALC[el.dataset.c]=D.CALC[el.dataset.c]||{})[el.dataset.k]=el.tagName==="SELECT"?el.value:+el.value;
    if(first){D.CALC._touched=1;gain(5,"Model input");checkBadges()}runCalc(defs.find(c=>c.id===el.dataset.c),false);touch()})}
const lastOut={};
function runCalc(c,draw){const v={};c.f.forEach(([k,,def])=>{const s=(D.CALC[c.id]||{})[k];v[k]=def&&def.o?(s??def.o[0]):+(s??def)});Object.assign(v,c.p||{});
  const r=RUN[c.id](v),prev=lastOut[c.id]||[];lastOut[c.id]=r.o.map(o=>o[1]);
  $("out-"+c.id).innerHTML=r.o.map(([l,x,u],i)=>`<div><b ${u!=="t"?`data-count="${Math.round(x)}" data-from="${Math.round(prev[i]||0)}" data-fmt="${u}"`:""}>${u==="t"?esc(x):"0"}</b><span>${esc(l)}</span></div>`).join("");
  $("out-"+c.id).querySelectorAll("[data-fmt]").forEach(el=>{const to=+el.dataset.count,from=+el.dataset.from,u=el.dataset.fmt,f=n=>u==="$"?mny(n):u==="%"?Math.round(n)+"%":fmt(n);
    if(reduce){el.textContent=f(to);return}const t0=performance.now();const st=t=>{const k=Math.min(1,(t-t0)/600),e=1-Math.pow(1-k,3);el.textContent=f(from+(to-from)*e);if(k<1)requestAnimationFrame(st)};requestAnimationFrame(st)});
  const ch=$("ch-"+c.id);if(draw||!ch.firstChild)ch.innerHTML=r.chart;else{ch.innerHTML=r.chart.replace(/class="(draw|grow)"/g,"")}}

/* ---------- registers ---------- */
const L5=["1","2","3","4","5"];
const REGS=[
 {id:"assumptions",t:"Assumptions",d:"Every number the model rests on, where it came from, and how sure we are.",cols:[["item","Assumption","ta",3],["value","Value","t",1.2],["source","Source","ta",2],["conf","Confidence","s",1,["Low","Medium","High"]],["owner","Owner","t",1]]},
 {id:"risks",t:"Risks",d:"Likelihood and impact from 1 to 5. A risk counts as owned once it has an owner and a mitigation.",cols:[["risk","Risk","ta",3],["l","Likelihood","s",.7,L5],["i","Impact","s",.7,L5],["mitigation","Mitigation","ta",2.4],["owner","Owner","t",1]],heat:true},
 {id:"contradictions",t:"Contradictions",d:"Places where the founder's own documents disagree. Resolve each one before diligence.",cols:[["claim","Statement A","ta",2.2],["counter","Statement B","ta",2.2],["source","Sources","ta",1.6],["status","Status","s",1,["Open","Resolved"]]]},
 {id:"competitors",t:"Competitors",d:"Who buyers will compare us with. Facts only, each with a source.",cols:[["name","Company","t",1.2],["what","What they do","ta",2.4],["money","Funding or scale","ta",1.6],["source","Source","ta",1.6],["threat","Threat","s",.8,["Low","Medium","High"]]]},
 {id:"kpis",t:"KPI dictionary",d:"One definition per number, agreed once, used in every board pack.",cols:[["kpi","KPI","t",1.4],["def","Definition","ta",3],["target","Target","t",1],["current","Current","t",1]]},
 {id:"decisions",t:"Decisions",d:"What was decided, when and by whom. Saves re-arguing.",cols:[["date","Date","t",.9],["decision","Decision","ta",3],["by","Decided by","t",1],["why","Why","ta",2]]},
 {id:"actions",t:"Actions",d:"Every follow-up with an owner and a date.",cols:[["action","Action","ta",3],["owner","Owner","t",1],["due","Due","t",.9],["status","Status","s",1,["Open","In progress","Done"]]]},
 {id:"okrs",t:"90-day goals",d:"Three to five goals for the next 90 days, each with a measurable result.",cols:[["objective","Goal","ta",2.4],["kr","Measurable result","ta",2.4],["owner","Owner","t",1],["pct","Progress %","t",.7]]}];
function renderRegisters(){const r=REGS.find(x=>x.id===regTab),rows=D.REG[r.id]||[],tw=r.cols.reduce((n,c)=>n+c[3],0);
  let h=`<div class="wrap view"><div class="head"><div><h2>Registers</h2><p>The working records behind the model and the board pack.</p></div></div>
   <div class="subtabs" role="group" aria-label="Register">${REGS.map(x=>`<button data-r="${x.id}" aria-pressed="${x.id===regTab}">${esc(x.t)}<span>${(D.REG[x.id]||[]).length}</span></button>`).join("")}</div><p class="regintro">${esc(r.d)}</p>`;
  if(r.heat)h+=`<div class="heatwrap">${heat(rows)}<p class="regintro" style="margin:0">Impact runs up, likelihood across. Darker cells are worse. Each number counts the risks in that cell. Give every risk an owner and a mitigation to lift the readiness score.</p></div>`;
  h+=`<div class="tblwrap"><table class="reg"><thead><tr>${r.cols.map(c=>`<th style="width:${(c[3]/tw*100).toFixed(1)}%">${esc(c[1])}</th>`).join("")}<th aria-label="Remove"></th></tr></thead><tbody>`;
  if(!rows.length)h+=`<tr><td colspan="${r.cols.length+1}" class="empty">Nothing here yet. Add the first entry below.</td></tr>`;
  rows.forEach((row,ri)=>{h+=`<tr style="animation-delay:${Math.min(ri*30,500)}ms">${r.cols.map(([k,l,t,w,opts])=>{const id=`rg-${r.id}-${ri}-${k}`,val=row[k]??"";
    if(t==="s")return `<td><select id="${id}" aria-label="${esc(l)}" data-i="${ri}" data-k="${k}"><option value=""></option>${opts.map(o=>`<option ${String(val)===o?"selected":""}>${esc(o)}</option>`).join("")}</select></td>`;
    if(t==="ta")return `<td><textarea id="${id}" aria-label="${esc(l)}" data-i="${ri}" data-k="${k}" rows="2">${esc(val)}</textarea></td>`;
    return `<td><input id="${id}" aria-label="${esc(l)}" data-i="${ri}" data-k="${k}" value="${esc(val)}"></td>`}).join("")}<td class="x"><button data-del="${ri}" aria-label="Remove row">×</button></td></tr>`});
  h+=`</tbody></table></div><div class="qfoot"><button class="btn primary" id="addRow">Add entry</button></div><div style="height:96px"></div></div>`;
  $("main").innerHTML=h;
  $("main").querySelectorAll(".subtabs button").forEach(b=>b.onclick=()=>{regTab=b.dataset.r;renderRegisters()});
  $("main").querySelectorAll("tbody input,tbody textarea,tbody select").forEach(el=>el.oninput=()=>{D.REG[r.id][+el.dataset.i][el.dataset.k]=el.value;touch();if(r.heat&&el.tagName==="SELECT"){renderRegisters()}checkBadges()});
  $("main").querySelectorAll("[data-del]").forEach(b=>b.onclick=()=>{const i=+b.dataset.del,row=D.REG[r.id].splice(i,1)[0];touch();renderRegisters();toast("Entry removed",{label:"Undo",fn:()=>{D.REG[r.id].splice(i,0,row);touch();renderRegisters()}})});
  $("addRow").onclick=()=>{(D.REG[r.id]=D.REG[r.id]||[]).push({});touch();renderRegisters();const t=$("main").querySelector("tbody tr:last-child textarea,tbody tr:last-child input");if(t)t.focus()}}
function heat(rows){const g={};rows.forEach(r=>{if(r.l&&r.i){const k=r.l+"-"+r.i;g[k]=(g[k]||0)+1}});
  let h=`<div class="heat" role="img" aria-label="Risk heat map">`;for(let i=5;i>=1;i--){h+=`<div class="ax">I${i}</div>`;for(let l=1;l<=5;l++){const n=g[l+"-"+i]||0,sev=(l*i)/25;
    h+=`<div style="background:color-mix(in srgb,var(--ink) ${Math.round(sev*75)}%,var(--paper));color:${sev>.42?"var(--bg)":"var(--ink)"};animation-delay:${(5-i)*60+l*30}ms">${n||""}</div>`}}
  return h+`<div class="ax"></div>${L5.map(l=>`<div class="ax">L${l}</div>`).join("")}</div>`}

/* ---------- gamification ---------- */
const LEVELS=["Blank page","First lines","Taking shape","Business model","Investor grade","Board ready","Complete picture"];
function level(){return Math.min(LEVELS.length,Math.floor(Math.sqrt(Math.max(0,D.XP)/60))+1)}
function nextAt(l){return l*l*60}
function gain(n,why){const before=level();D.XP=Math.max(0,D.XP+n);refreshXP();if(n>0&&level()>before){confetti();toast(`Level ${level()}: ${LEVELS[level()-1]}`)}}
function refreshXP(){const l=level();$("lv").textContent=l;$("xpNum").textContent=`${D.XP} XP`;$("lvName").textContent=LEVELS[l-1];
  if($("lvlName")){$("lvlName").textContent=LEVELS[l-1];$("lvlText").textContent=`Level ${l} · ${D.XP} XP`;$("lvlNext").textContent=l<LEVELS.length?`${nextAt(l)-D.XP} XP to next`:"Top level"}orb()}
const BADGES=[["first","First words","Answer the first question",()=>answered()>=1],["fact","Evidence first","Tag an answer as fact with evidence",()=>S().some(s=>s.q.some((_,i)=>(D.C[s.id]||{})[i]==="fact"&&String((D.E[s.id]||{})[i]||"").trim()))],
 ["part","Part complete","Finish every question in one part",()=>S().some(s=>cnt(s.id)===s.q.length)],["five","Five parts","Finish five parts",()=>S().filter(s=>cnt(s.id)===s.q.length).length>=5],
 ["half","Halfway","Answer half the canvas",()=>answered()>=TOTAL()/2],["model","Numbers person","Change a finance input",()=>!!D.CALC._touched],
 ["mile","First milestone","Mark a milestone done with evidence",()=>MS.some(m=>(D.PG[m[0]]||{}).s==="done"&&String((D.PG[m[0]]||{}).n||"").trim())],
 ["risk","Risks owned","Every risk has an owner and a mitigation",()=>{const r=D.REG.risks||[];return r.length&&r.every(x=>String(x.owner||"").trim()&&String(x.mitigation||"").trim())}],
 ["clean","Clean story","Resolve every contradiction",()=>{const r=D.REG.contradictions||[];return r.length&&r.every(x=>x.status==="Resolved")}],
 ["ready","Investor grade","Reach a readiness score of 70",()=>readiness().score>=70],["all","Complete picture","Answer every question",()=>answered()>=TOTAL()]];
function checkBadges(){BADGES.forEach(([id,name,,test])=>{if(!D.badges[id]&&test()){D.badges[id]=Date.now();gain(25);confetti();toast(`Badge earned: ${name}`);touch()}})}
function badgeSheet(){const r=readiness();$("layer").innerHTML=`<div class="scrim" id="scrim"><div class="sheet" role="dialog" aria-modal="true" aria-label="Progress"><span class="label">Level ${level()} · ${D.XP} XP · readiness ${r.score}%</span><h3>${esc(LEVELS[level()-1])}</h3>
  <div class="badges">${BADGES.map(([id,name,how])=>`<div class="badge ${D.badges[id]?"got":""}"><svg viewBox="0 0 40 40"><polygon points="20,3 35,11.5 35,28.5 20,37 5,28.5 5,11.5" fill="${D.badges[id]?"var(--ink)":"none"}" stroke="var(--ink)" stroke-width="1.5"/>${D.badges[id]?'<path d="M13 20l5 5 9-10" stroke="var(--bg)" stroke-width="2.5" fill="none"/>':""}</svg><b>${esc(name)}</b><span>${esc(how)}</span></div>`).join("")}</div>
  <div class="qfoot"><button class="btn primary" id="sx">Close</button></div></div></div>`;const c=()=>$("layer").innerHTML="";$("sx").onclick=c;$("scrim").onclick=e=>{if(e.target.id==="scrim")c()}}
function orb(){const p=Math.round(answered()/TOTAL()*100);$("orbArc").setAttribute("stroke-dasharray",`${p} 100`);$("orbTxt").textContent=p+"%"}
function pulseOrb(){const o=$("orb");o.classList.remove("pulse");void o.offsetWidth;o.classList.add("pulse")}

/* ---------- fx: confetti in monochrome + accent ---------- */
let FX=null;
function fxInit(){const cv=$("fx"),ctx=cv.getContext("2d");FX={cv,ctx,p:[],on:false};const fit=()=>{cv.width=innerWidth*Math.min(2,devicePixelRatio||1);cv.height=innerHeight*Math.min(2,devicePixelRatio||1)};fit();addEventListener("resize",fit)}
function confetti(){if(reduce||!FX)return;const cs=getComputedStyle(document.documentElement),cols=[cs.getPropertyValue("--ink").trim(),cs.getPropertyValue("--accent").trim(),cs.getPropertyValue("--mute").trim()],W=FX.cv.width,H=FX.cv.height;
  for(let i=0;i<140;i++)FX.p.push({x:W/2,y:H*.35,vx:(Math.random()-.5)*W*.018,vy:-Math.random()*H*.02-H*.005,r:Math.random()*Math.PI,vr:(Math.random()-.5)*.3,s:4+Math.random()*8,c:cols[i%3],l:1});
  if(!FX.on){FX.on=true;const f=()=>{const {ctx}=FX;ctx.clearRect(0,0,W,H);FX.p=FX.p.filter(p=>{p.vy+=H*.0006;p.x+=p.vx;p.y+=p.vy;p.r+=p.vr;p.l-=.008;ctx.save();ctx.globalAlpha=Math.max(0,p.l);ctx.translate(p.x,p.y);ctx.rotate(p.r);ctx.fillStyle=p.c;ctx.fillRect(-p.s/2,-p.s/4,p.s,p.s/2);ctx.restore();return p.l>0&&p.y<H+40});
    if(FX.p.length)requestAnimationFrame(f);else{FX.on=false;ctx.clearRect(0,0,W,H)}};f()}}

/* ---------- palette, keys, theme, idle lock, onboarding ---------- */
function palette(){const items=[...VIEWS.map(([k,l])=>({t:`Go to ${l}`,k:"View",fn:()=>show(k)})),
   {t:"Focus mode",k:"Action",fn:()=>{if(view!=="interview")show("interview");setTimeout(focusMode,50)}},{t:"Present the canvas",k:"Action",fn:()=>present(0)},{t:"Switch light or dark",k:"Action",fn:toggleTheme},
   {t:"Download board pack",k:"Action",fn:()=>download("Board pack.md",packMd(),"text/markdown")},{t:"Encrypted backup",k:"Action",fn:backup},{t:"Lock canvas",k:"Action",fn:lock},
   ...S().map((s,i)=>({t:s.t,k:s.g,fn:()=>goto(i,0)}))];
  $("layer").innerHTML=`<div class="scrim" id="scrim" style="align-items:flex-start"></div><div class="palette" role="dialog" aria-label="Search and commands"><input id="pq" placeholder="Search answers, parts and commands" aria-label="Search"><ul id="pl" role="listbox"></ul></div>`;
  let sel=0,list=[];const pq=$("pq");const paint=()=>{const t=pq.value.trim().toLowerCase();list=items.filter(x=>!t||x.t.toLowerCase().includes(t));
    if(t.length>1)S().forEach((s,si)=>s.q.forEach((q,qi)=>{const a=ans(s.id,qi);if((q[0]+" "+a+" "+(q[2]||"")).toLowerCase().includes(t))list.push({t:q[0],k:s.t,snip:(a||q[2]||"").slice(0,110),fn:()=>goto(si,qi)})}));
    list=list.slice(0,40);sel=Math.min(sel,Math.max(0,list.length-1));$("pl").innerHTML=list.length?list.map((x,i)=>`<li role="option" data-i="${i}" aria-selected="${i===sel}"><span>${esc(x.t)}${x.snip?`<span class="snip">${esc(x.snip)}</span>`:""}</span><small>${esc(x.k)}</small></li>`).join(""):`<li>No matches</li>`;
    $("pl").querySelectorAll("li[data-i]").forEach(li=>li.onclick=()=>run(+li.dataset.i))};
  const close=()=>{$("layer").innerHTML=""};const run=i=>{const x=list[i];close();if(x)x.fn()};
  pq.oninput=()=>{sel=0;paint()};pq.onkeydown=e=>{if(e.key==="ArrowDown"){sel=Math.min(list.length-1,sel+1);paint();e.preventDefault()}if(e.key==="ArrowUp"){sel=Math.max(0,sel-1);paint();e.preventDefault()}if(e.key==="Enter")run(sel);if(e.key==="Escape")close()};
  $("scrim").onclick=close;paint();pq.focus()}
function shortcuts(){$("layer").innerHTML=`<div class="scrim" id="scrim"><div class="sheet" role="dialog" aria-modal="true" aria-label="Shortcuts"><h3>Shortcuts</h3><dl>
  <dt>⌘ K</dt><dd>Search answers, parts and commands</dd><dt>⌘ ↵</dt><dd>Next question</dd><dt>F</dt><dd>Focus mode</dd><dt>P</dt><dd>Present the canvas</dd><dt>1 to 5</dt><dd>Switch view</dd><dt>T</dt><dd>Light or dark</dd><dt>L</dt><dd>Lock now</dd><dt>?</dt><dd>This sheet</dd><dt>Esc</dt><dd>Close any panel</dd></dl>
  <div class="qfoot"><button class="btn primary" id="sx">Close</button></div></div></div>`;const c=()=>$("layer").innerHTML="";$("sx").onclick=c;$("scrim").onclick=e=>{if(e.target.id==="scrim")c()}}
function keys(){document.addEventListener("keydown",e=>{const typing=/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);
  if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==="k"){e.preventDefault();palette();return}
  if(e.key==="Escape"&&$("layer").firstChild&&!$("layer").querySelector(".present")){$("layer").innerHTML="";return}
  if(typing||e.metaKey||e.ctrlKey||e.altKey)return;
  if(e.key==="?")shortcuts();else if(e.key==="f"||e.key==="F"){if(view==="interview")focusMode()}else if(e.key==="p"||e.key==="P")present(0);else if(e.key==="t"||e.key==="T")toggleTheme();else if(e.key==="l"||e.key==="L")lock();
  else if(/^[1-5]$/.test(e.key))show(VIEWS[+e.key-1][0])})}
function toggleTheme(){const r=document.documentElement,dark=r.dataset.theme?r.dataset.theme==="dark":matchMedia("(prefers-color-scheme: dark)").matches;r.dataset.theme=dark?"light":"dark";try{localStorage.setItem("hc-theme",r.dataset.theme)}catch(e){}}
async function lock(){clearTimeout(saveT);await persist();try{await kv("del","key")}catch(e){}location.href="/bondl/logout"}
function idle(){let t=Date.now();["pointermove","keydown","scroll","touchstart"].forEach(ev=>addEventListener(ev,()=>t=Date.now(),{passive:true}));setInterval(()=>{if(Date.now()-t>15*60*1000)lock()},30000)}
function onboard(){const steps=[["#qcard","Answer together","Ask Brian each question and type his words. What we already know from his emails and calls is shown in blue."],["#map","Watch it form","Every answer lights up this map and sends value to the core. Click a dot to jump to that part."],["#xpBtn","Earn as you go","Answers, evidence and milestones earn XP and badges. Tag answers as fact, belief or guess to lift the readiness score."]];let i=0;
  const paint=()=>{const [sel,h,p]=steps[i],el=document.querySelector(sel);if(!el){done();return}el.scrollIntoView({block:"center",behavior:reduce?"auto":"smooth"});setTimeout(()=>{const r=el.getBoundingClientRect();
    $("layer").innerHTML=`<div class="coachmark" style="top:${Math.min(innerHeight-220,Math.max(16,r.bottom+12))}px;left:${Math.min(innerWidth-360,Math.max(16,r.left))}px"><span class="label" style="color:inherit;opacity:.6">${i+1} of ${steps.length}</span><h4>${esc(h)}</h4><p>${esc(p)}</p><div class="row"><button id="cmSkip" style="background:none;color:inherit;opacity:.7">Skip</button><button id="cmNext">${i<steps.length-1?"Next":"Start"}</button></div></div>`;
    $("cmNext").onclick=()=>{i++;i<steps.length?paint():done()};$("cmSkip").onclick=done},reduce?0:350)};
  const done=()=>{$("layer").innerHTML="";D.meta.onboarded=true;touch()};paint()}

/* ---------- dictation ---------- */
let REC=null;
function dictate(){const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR)return;if(REC){REC.stop();return}
  REC=new SR();REC.lang="en-GB";REC.continuous=true;REC.interimResults=false;const ta=$("ans"),m=$("mic");m.classList.add("on");
  REC.onresult=e=>{for(let i=e.resultIndex;i<e.results.length;i++)if(e.results[i].isFinal){ta.value=(ta.value?ta.value.trimEnd()+" ":"")+e.results[i][0].transcript.trim();ta.dispatchEvent(new Event("input"))}};
  REC.onend=()=>{REC=null;if($("mic"))$("mic").classList.remove("on")};REC.onerror=()=>{toast("Dictation stopped")};REC.start();toast("Listening. Click the microphone to stop.")}

/* ---------- export ---------- */
function download(name,data,type){const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([data],{type}));a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500);toast(`Saved ${name} to Downloads`)}
async function backup(){download(`canvas-backup-${new Date().toISOString().slice(0,10)}.canvas`,JSON.stringify(await seal(D)),"application/json")}
function packMd(){const d=new Date().toISOString().slice(0,10),r=readiness();let m=`# ${D.meta.company||""} business canvas\n\nHayat Amin, Fractional CFO. ${d}.\n\nInvestor readiness: ${r.score}%. Answered ${answered()} of ${TOTAL()}.\n\n## Milestones\n\n`;
  MS.forEach(x=>{const p=D.PG[x[0]]||{};m+=`- ${x[1]}: ${LBL[p.s||"todo"]}${p.n?` (${p.n})`:""}\n`});
  let g="";S().forEach(s=>{if(s.g!==g){g=s.g;m+=`\n# ${g}\n`}m+=`\n## ${s.t}\n\n`;s.q.forEach((q,i)=>{const a=ans(s.id,i);if(!a)return;const c=(D.C[s.id]||{})[i],e=String((D.E[s.id]||{})[i]||"").trim();m+=`**${q[0]}**${c?` _(${c})_`:""}\n\n${a}\n${e?`\nEvidence: ${e}\n`:""}\n`})});
  REGS.forEach(rg=>{const rows=D.REG[rg.id]||[];if(!rows.length)return;m+=`\n## ${rg.t}\n\n| ${rg.cols.map(c=>c[1]).join(" | ")} |\n|${rg.cols.map(()=>"---").join("|")}|\n`;rows.forEach(row=>m+=`| ${rg.cols.map(c=>String(row[c[0]]??"").replace(/\n/g," ").replace(/\|/g,"/")).join(" | ")} |\n`)});return m}

/* ---------- toast ---------- */
function toast(t,action){const el=$("toast");el.innerHTML=`<span>${esc(t)}</span>${action?`<button id="tAct">${esc(action.label)}</button>`:""}`;el.classList.add("show");
  if(action)$("tAct").onclick=()=>{action.fn();el.classList.remove("show")};clearTimeout(el._t);el._t=setTimeout(()=>el.classList.remove("show"),action?6000:2600)}
