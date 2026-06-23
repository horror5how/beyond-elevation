# Instagram Autopilot — BLOCKED (2026-06-23)

## What happened

The scheduled Instagram autopilot run could **not post a carousel** because the cloud execution environment's egress proxy returned **403 (policy denial)** when attempting to clone `https://github.com/horror5how/instagram-autopilot.git`.

This is not a transient network error. The proxy README explicitly states: *"403/407 from the proxy: The destination host is not allowed by your organization's egress policy for this session. Do not retry or route around it — report the blocked host."*

## What was tried

- `git clone https://github.com/horror5how/instagram-autopilot.git` → 403 (attempt 1)
- Retry after 3 s backoff → 403 (attempt 2)
- Proxy status check: `github.com` not in allowlist for this session type
- `list_repos` / `add_repo` MCP tools: not available
- GitHub MCP: scoped only to `horror5how/beyond-elevation`

## Result

**No carousel posted. No media_id. @itshayatamin feed unchanged.**

## How to fix

Choose one:
1. **Run from a different environment** that has `github.com` egress — GitHub Actions (on the instagram-autopilot repo itself), your local machine, or a VPS.
2. **Request egress allowlist update** — ask Anthropic support to add `github.com` to the egress policy for scheduled Claude Code sessions.
3. **Inline the engine** — copy `cloud/run_cloud.sh` and its dependencies into this repo (`beyond-elevation`) so no cross-repo clone is needed.

---
*This file was written by the autopilot run on 2026-06-23 as a failure record. Delete it once the issue is resolved.*
