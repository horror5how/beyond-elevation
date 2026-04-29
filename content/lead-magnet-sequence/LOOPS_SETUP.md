# Loops setup — final 3 manual steps

Auto setup is complete. The form ships leads to Loops contacts. To start sending the 5-email nurture, do these three steps once.

## 1. Verify the sending domain (~10 min wall-clock)
Loops dashboard → Settings → Domain → "Add domain". Use `mail.beyondelevation.com`.
Loops will show 4-5 DNS records (CNAMEs + a TXT). Add them at Wix DNS (`https://www.wix.com/account/sites` → beyondelevation.com → DNS).
Click "Verify" in Loops once DNS propagates (Wix is fast, usually 2-5 min).

## 2. Create one Loop (drip automation)
Loops dashboard → Loops → New Loop:
- Trigger: "Contact added" with filter `userGroup is "lead-magnet"`
- Step 1 → email "Day 0" → paste body from `01.md` (subject + body)
- Step 2 → wait 2 days → email "Day 2" (`02.md`)
- Step 3 → wait 2 days → email "Day 4" (`03.md`)
- Step 4 → wait 3 days → email "Day 7" (`04.md`)
- Step 5 → wait 3 days → email "Day 10" (`05.md`)
Set From = `hayat@mail.beyondelevation.com`, Reply-to = `hayat@beyondelevation.com`.
Use Loops merge tags: `{{firstName}}`, plus add custom variables `pdfUrl` (https://beyondelevation.com/assets/resources/ip-leverage-audit.pdf) and `motionUrl` (https://usemotion.com/meet/hayat-amin/be) at Loop level.

## 3. Activate the Loop
Top right "Publish" button. New leads will get the sequence automatically.

## Where things live
- API key: `~/.config/agents/master.env` → `LOOPS_API_KEY` (also in Vercel env)
- Dashboard: https://app.loops.so/
- Form endpoint: https://beyondelevation.com/api/lead-magnet
- Thank-you: https://beyondelevation.com/resources/thank-you/
- PDF: https://beyondelevation.com/assets/resources/ip-leverage-audit.pdf
