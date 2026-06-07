# Connecting your phone — WhatsApp (and Telegram as a rock-solid backup)

This connects your always-on VPS Claude to your phone so you can **text or send voice
notes** and it replies. Claude calls this feature **"Channels."**

You have two options. Read the honest trade-off, then pick.

---

## Option A — WhatsApp (what you asked for)

**Honest note:** WhatsApp is **not yet officially supported by Anthropic.** It works
through a **community-built plugin** (approved on the Claude plugin marketplace). It's
popular and works well, but because it's community code, treat it as slightly less
"official" than Telegram. It links to your **personal WhatsApp** the same way WhatsApp
Web does (scan a QR with your phone) — no bot, no API keys.

**How it works once set up:** you message your own linked number in WhatsApp → the
message goes into your running Claude session on the VPS → Claude does the work →
replies in the same chat. Voice notes are transcribed automatically.

**Setup (do this on the server, logged in as the `claude` user):**

1. Start a long-running Claude session inside tmux (so it survives you disconnecting):
   ```
   tmux new -s claude
   cd ~/beyond-elevation
   claude
   ```
2. Inside Claude, add the WhatsApp channel plugin from the marketplace:
   ```
   /plugin
   ```
   Search for the **WhatsApp channel** plugin and install it. (If you get stuck here,
   paste what you see to me on desktop and I'll finish the wiring with you — the exact
   plugin name/steps change as it updates.)
3. It will show a **QR code** in the terminal.
4. On your phone: **WhatsApp → Settings → Linked Devices → Link a Device → scan the QR.**
5. To leave the session running and disconnect safely: press **Ctrl+B**, then **D**.
   (To come back later: `tmux attach -t claude`.)

Done — message that linked chat from anywhere.

---

## Option B — Telegram (official, most reliable) ✅ recommended

Telegram is **officially supported** by Claude Code Channels, so it's the most stable
and best-documented. If you want zero fuss, use this. Setup is ~10 minutes:

1. In Telegram, message **@BotFather** → send `/newbot` → follow prompts → it gives you
   a **bot token** (a long string). Copy it.
2. On the server, add the token to your settings (I'll give you the exact snippet — or
   just paste the token to me on desktop and I'll wire it in).
3. Start the session in tmux as above and run the Telegram channel.
4. Message your new bot in Telegram. Voice notes are transcribed too.

Official docs: https://code.claude.com/docs/en/channels

---

## My recommendation

- Want the WhatsApp experience specifically → **Option A**, and I'll help finish the
  exact plugin step live.
- Want the most bullet-proof, set-and-forget version → **Option B (Telegram)**.

Either way, once it's linked you talk to your always-on Claude from your pocket — text
or voice — laptop on or off.
