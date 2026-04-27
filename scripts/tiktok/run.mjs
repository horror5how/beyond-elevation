#!/usr/bin/env node
// TikTok bot orchestrator: pick theme → write Hormozi script → Veo clips → Kokoro voice → render → post.
import Anthropic from '@anthropic-ai/sdk';
import { execSync, spawnSync } from 'node:child_process';
import { writeFileSync, readFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const SCRIPTS = join(ROOT, 'scripts/tiktok');
const WORK = join(ROOT, '.tiktok-work');
const LOG = join(ROOT, 'tiktok-post-log.md');
mkdirSync(WORK, { recursive: true });

const themes = JSON.parse(readFileSync(join(SCRIPTS, 'themes.json'), 'utf8')).rotation;

// Pick theme: rotate by hour-of-day to spread topics
const slot = Math.floor(Date.now() / (1000 * 60 * 60 * 4)); // 4-hour bucket
const theme = themes[slot % themes.length];
console.log(`[bot] theme: ${theme.id} — ${theme.topic}`);

// 1. Generate Hormozi-style 12-15s script via Claude
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const sys = `You are an aggressive growth-hacker copywriter for Beyond Elevation, a consultancy run by Hayat Amin that helps founders and CEOs monetize their patents, IP, and proprietary data.

Audience: tech CEOs, founders, VC partners.
Brand voice: founder-blunt, contrarian, results-obsessed. Specific numbers. No fluff. No emoji.
Framework (Hormozi): HOOK (scroll-stopper) → FOMO (loss/urgency) → VALUE (specific insight or number) → CTA (follow @itshayatamin).

Write a 12-15 second TikTok voiceover script (35-45 words MAX) on this topic:
Topic: ${theme.topic}
Angle: ${theme.angle}

Constraints:
- Open with a scroll-stopping line under 8 words.
- Use at least one specific number, dollar figure, or year.
- One sentence per beat. Short. Punchy. 4-6 sentences total.
- End with: "Follow." or "Follow at it's hayat amin."
- No hashtags in voice script. No quotation marks.
- Write only the spoken words.`;

const r = await anthropic.messages.create({
  model: 'claude-sonnet-4-6',
  max_tokens: 300,
  system: sys,
  messages: [{ role: 'user', content: 'Write the script now.' }],
});
const script = r.content[0].text.trim().replace(/^["']|["']$/g, '');
writeFileSync(join(WORK, 'script.txt'), script);
console.log(`[bot] script (${script.length} chars):\n${script}\n`);

// 2. Generate 2 Veo clips in parallel via inference.sh
const INFSH = process.env.INFSH_API_KEY;
if (!INFSH) throw new Error('INFSH_API_KEY missing');
process.env.INFSH_API_KEY = INFSH;

console.log('[bot] generating Veo clips...');
const clipPaths = [];
const promises = theme.veo_prompts.map((prompt, i) => {
  return new Promise((res, rej) => {
    const slot = `clip${i}`;
    const json = join(WORK, `${slot}.json`);
    const mp4 = join(WORK, `${slot}.mp4`);
    const payload = JSON.stringify({
      prompt,
      aspect_ratio: '9:16',
      duration: 8,
      generate_audio: false,
    });
    const r = spawnSync('infsh', [
      'app', 'run', 'google/veo-3-1-fast',
      '--input', payload, '--save', json, '--json',
    ], { stdio: 'inherit', env: process.env });
    if (r.status !== 0) return rej(new Error(`veo ${slot} failed`));
    const data = JSON.parse(readFileSync(json, 'utf8'));
    if (data.error) return rej(new Error(`veo ${slot}: ${data.error}`));
    const url = data.output?.videos?.[0];
    if (!url) return rej(new Error(`veo ${slot}: no video URL`));
    execSync(`curl -sSL "${url}" -o "${mp4}"`);
    clipPaths[i] = mp4;
    res();
  });
});
await Promise.all(promises);
console.log(`[bot] ${clipPaths.length} clips downloaded`);

// 3. Kokoro voice (am_michael)
console.log('[bot] generating voice...');
const py = process.env.PYTHON || 'python3';
const voicePath = join(WORK, 'voice.wav');
spawnSync(py, ['-c', `
from kokoro_onnx import Kokoro
import soundfile as sf
k = Kokoro('kokoro-v0_19.onnx', 'voices.bin')
text = open('${join(WORK, 'script.txt')}').read().strip()
samples, sr = k.create(text, voice='am_michael', speed=1.0, lang='en-us')
sf.write('${voicePath}', samples, sr)
print('voice:', len(samples)/sr, 's')
`], { stdio: 'inherit' });

// 4. Whisper SRT
console.log('[bot] transcribing...');
const srtPath = join(WORK, 'captions.srt');
spawnSync(py, ['-c', `
import whisper, re
m = whisper.load_model('base')
r = m.transcribe('${voicePath}', word_timestamps=True, fp16=False)
srt, i = [], 1
for seg in r['segments']:
    words = seg.get('words') or []
    for j in range(0, len(words), 2):
        chunk = words[j:j+2]
        if not chunk: continue
        s, e = chunk[0]['start'], chunk[-1]['end']
        text = ''.join(w['word'] for w in chunk).strip().upper()
        text = re.sub(r'[.,!?;:]+$', '', text)
        if not text: continue
        def fmt(t):
            h = int(t//3600); m_=int((t%3600)//60); s2=t%60
            return f"{h:02d}:{m_:02d}:{s2:06.3f}".replace('.',',')
        srt.append(f"{i}\\n{fmt(s)} --> {fmt(e)}\\n{text}\\n")
        i += 1
open('${srtPath}','w').write('\\n'.join(srt))
`], { stdio: 'inherit' });

// 5. Render
console.log('[bot] rendering...');
const finalPath = join(WORK, 'reel.mp4');
const renderRes = spawnSync(py, [
  join(SCRIPTS, 'render.py'),
  '--voice', voicePath,
  '--srt', srtPath,
  '--clips', ...clipPaths,
  '--chip', theme.chip,
  '--out', finalPath,
  '--inter-black', join(SCRIPTS, 'fonts/Inter-Black.ttf'),
  '--inter-bold', join(SCRIPTS, 'fonts/Inter-Bold.ttf'),
], { stdio: 'inherit' });
if (renderRes.status !== 0) throw new Error('render failed');

// 6. Build social caption (longer than voice, with hashtags)
const captionRes = await anthropic.messages.create({
  model: 'claude-haiku-4-5-20251001',
  max_tokens: 400,
  messages: [{
    role: 'user',
    content: `Write a TikTok caption (200-350 chars max, 3-5 line breaks) that pairs with this voice script:

"${script}"

Topic: ${theme.topic}.
Voice: founder, blunt, contrarian. Specific.
End with: "Follow @itshayatamin for the operator's playbook."
Hashtags on last line: #${theme.id.replace(/_/g,'')} #ipstrategy #fractional #beyondelevation #founders

Output ONLY the caption text.`,
  }],
});
const caption = captionRes.content[0].text.trim().replace(/^["']|["']$/g, '');
writeFileSync(join(WORK, 'caption.txt'), caption);

// 7. Post to TikTok
console.log('[bot] posting to TikTok...');
const postRes = spawnSync('node', [
  join(SCRIPTS, 'upload.mjs'),
  finalPath, caption,
], { stdio: 'inherit', env: process.env });

const success = postRes.status === 0;
const ts = new Date().toISOString();
const logEntry = `\n## ${ts} — ${theme.id}\n- Topic: ${theme.topic}\n- Status: ${success ? '✅ posted' : '❌ failed'}\n- Script: ${script.replace(/\n/g, ' ')}\n- File: ${(statSync(finalPath).size / 1024 / 1024).toFixed(1)}MB\n`;
writeFileSync(LOG, (existsSync(LOG) ? readFileSync(LOG, 'utf8') : '# TikTok Post Log\n') + logEntry);

if (!success) process.exit(1);
console.log('[bot] DONE ✅');
