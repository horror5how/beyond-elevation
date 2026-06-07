# Your Always-On Claude — Setup Guide (DigitalOcean)

This folder sets up a **rented computer that never sleeps** (a "VPS") running Claude,
so you can message it from **WhatsApp** (text or voice) and it does your tasks 24/7 —
**even when your laptop is off.**

Everything technical is already written for you in this folder. Your job is about
**10 minutes of simple clicks.** Follow the steps in order.

---

## The big picture (in one minute)

```
   YOUR PHONE  📱  (WhatsApp — text or voice, anywhere)
         │
         ▼
   ┌──────────────────────────┐
   │  DigitalOcean server      │   ← always on, never sleeps
   │  ("the VPS")              │   ← Claude lives here 24/7
   └──────────────────────────┘
         │
         ▼
   Your GitHub  →  your blog + LinkedIn robots
```

- **Desktop Claude** = you keep using it as normal when you're at your laptop.
- **VPS Claude** = always on, reachable by WhatsApp, runs your routines.
- Both share the same GitHub, so your work stays in one place.

---

## What only YOU can do (about 10 minutes)

I (Claude) cannot rent a server with your money, log in for the first time, or hold
your phone to scan WhatsApp. So these three steps are yours. Everything else is
automatic.

### STEP 1 — Create the server on DigitalOcean (~5 min)

1. Go to **https://www.digitalocean.com** and sign up (or log in).
2. Click the green **Create** button (top right) → **Droplets**.
3. Choose these settings (just match them — don't overthink it):
   - **Region:** the one closest to you (e.g. London).
   - **Image:** **Ubuntu** → version **24.04 (LTS)**.
   - **Size:** *Basic* → *Regular* → the **$6/month** option (1 GB RAM). Plenty.
   - **Authentication:** choose **SSH Key** → **New SSH Key**.
       - On your Mac: open the **Terminal** app, paste this, press Enter:
         ```
         cat ~/.ssh/id_ed25519.pub 2>/dev/null || (ssh-keygen -t ed25519 -N "" -f ~/.ssh/id_ed25519 && cat ~/.ssh/id_ed25519.pub)
         ```
       - Copy the whole line it prints, paste it into DigitalOcean's box, give it any name.
   - **Hostname:** call it `claude-server` (or anything).
4. Click **Create Droplet**. Wait ~30 seconds.
5. Copy the server's **IP address** (looks like `164.92.x.x`). You'll need it next.

### STEP 2 — Run the one-command setup (~3 min, mostly waiting)

1. In your Mac **Terminal**, log into the new server (replace the IP):
   ```
   ssh root@PASTE_THE_IP_HERE
   ```
   Type `yes` if it asks. You're now "inside" the server.
2. Paste this single line and press Enter. It downloads and runs the setup script
   that does **all** the security + Claude install for you:
   ```
   curl -fsSL https://raw.githubusercontent.com/horror5how/beyond-elevation/claude/code-desktop-connection-EI8H6/vps-setup/setup.sh | bash
   ```
3. Wait for it to finish (a few minutes). It will print **"SETUP COMPLETE"** at the end.
4. When it asks you to **log in to Claude**, follow the link it shows and sign in with
   your normal Claude account (the same one you use on desktop).

### STEP 3 — Connect WhatsApp (~2 min)

See **`whatsapp.md`** in this folder. In short: the script prints a QR code in your
Terminal — open WhatsApp on your phone → **Settings → Linked Devices → Link a Device**
→ scan it. Done. Now you can message your server.

---

## After setup — how you use it day to day

- **At your laptop?** Use Claude on desktop as normal.
- **Want something to run forever (laptop off)?** Just tell Claude: *"Put this on the VPS."*
- **Out and about?** Open WhatsApp, type or send a voice note. Your server does it and replies.

---

## Is it safe? (yes — here's what's already done for you)

The setup script automatically builds the "safety fence" so Claude can run on its own
**without nagging you for approval**, while a mistake can't blow everything up:

- ✅ **Locked front door** — login by secure key only, passwords disabled, root login off.
- ✅ **Firewall** — only the doors you need are open.
- ✅ **Auto security updates** — the server patches itself.
- ✅ **Break-in blocker** (fail2ban) — bans anyone hammering the login.
- ✅ **Secrets locked down** — your `.env` is readable only by your account.
- ✅ **Autonomous mode ON** — Claude runs your tasks without per-action pop-ups.
- ✅ **Daily backup** of your important files.

**Your part of the safety fence (important):** put only the passwords the server
actually needs in `.env` — NOT your whole master list. Keep the master copy in your
password app. Use keys you can cancel in one click. See `.env.example`.

---

## Files in this folder

| File | What it is |
|---|---|
| `README.md` | This guide. |
| `setup.sh` | The one-command script that sets up the whole server. |
| `whatsapp.md` | How to connect WhatsApp (and Telegram as a backup). |
| `.env.example` | A template for the passwords/keys the server needs. |
| `backup.sh` | The daily backup script (installed automatically). |
| `claude-settings.example.json` | The autonomous-mode settings (installed automatically). |

---

## If something goes wrong

Just message me (Claude) on desktop and paste whatever the Terminal showed. I'll fix it.
You don't need to understand the error — that's my job.
