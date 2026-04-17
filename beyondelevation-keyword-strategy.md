---
title: Beyond Elevation Keyword Strategy (Source of Truth for Blog Cron)
owner: Hayat Amin
last_updated: 2026-04-10
source_files: [seo-geo-plan.md, seo-content-plan.md, ai-seo-plan.md]
---

# Beyond Elevation — Keyword Strategy

This is the **single source of truth** for the `BE Blog Publisher` scheduled task. The cron MUST read this file before picking a topic, match against `data/posts.json` to avoid duplicates, then pick the highest-ROI keyword brief that is not yet covered.

Every brief below targets a real search query with commercial or high-commercial-intent purchase behavior behind it. Keywords are sorted by priority: **tier 1** (money keywords — direct revenue drivers) first, then **tier 2** (authority builders), then **tier 3** (long-tail AEO plays for AI citations).

## How the cron should use this file

1. Read this file in full.
2. Load `data/posts.json` and extract every `slug` and `title`.
3. Walk the keyword briefs below in order (tier 1 → tier 3).
4. Pick the FIRST brief whose `slug_hint` does not already exist in posts.json AND whose `primary_keyword` is not already covered by an existing title.
5. Use the `angle`, `primary_keyword`, and `supporting_keywords` verbatim in the post:
   - `primary_keyword` goes in the H1, first 100 words, meta description, and at least two H2s
   - `supporting_keywords` should appear naturally across H2s and body
   - The post title must start with the `angle` (Hormozi hook), not the keyword itself
6. Justify the pick in 2-3 sentences before writing — state which tier, why it beats the next candidate, and which commercial action it drives.

## Tier 1 — Money keywords (direct revenue drivers)

These keywords have **Commercial / Transactional** intent. The reader is actively looking for a provider. Every post in this tier must close with a direct CTA to beyondelevation.com for a consultation or audit.

| # | slug_hint | primary_keyword | supporting_keywords | angle | intent |
|---|---|---|---|---|---|
| T1-01 | ip-strategy-vs-patent-attorney | IP strategy vs patent attorney | fractional IP strategist, patent lawyer alternative, strategic IP advisor | Why Hiring a Patent Attorney First Is the #1 Mistake Founders Make | Commercial |
| T1-02 | best-patent-licensing-firms-compared | best patent licensing firms | patent licensing companies, IP licensing agencies, patent monetization firms | I Reviewed Every Major Patent Licensing Firm. Here Is Who You Should Actually Hire. | Commercial |
| T1-03 | patent-monetization-consulting-guide | patent monetization consulting | IP monetization consultant, patent revenue consultant, licensing advisor | What Patent Monetization Consultants Actually Do (And What You Should Pay Them) | Commercial/Transactional |
| T1-04 | fractional-ip-strategist-when-to-hire | fractional IP strategist | part-time IP advisor, outsourced chief IP officer, fractional CIPO | When You Should Hire a Fractional IP Strategist Instead of a Full-Time Lawyer | Commercial/Transactional |
| T1-05 | ip-defensibility-assessment-framework | IP defensibility assessment | patent defensibility, IP moat assessment, IP audit framework | The 7-Point IP Defensibility Test That Exposes Most Startup Portfolios | Commercial |
| T1-06 | ip-valuation-for-fundraising | IP valuation for fundraising | patent valuation investors, IP worth startup, IP-backed valuation | How VCs Actually Value Your IP (And Why Your Patent Attorney Has No Idea) | Commercial |
| T1-07 | patent-licensing-consultant-founders | patent licensing consultant for founders | licensing advisor startups, founder IP consultant, patent revenue expert | The Only Patent Licensing Playbook Founders Under $20M Revenue Need | Commercial/Transactional |
| T1-08 | ip-strategy-for-ai-companies | IP strategy for AI companies | AI company patents, AI IP protection, generative AI IP strategy | The AI IP Strategy Playbook: What the Foundation Model Companies Know That You Do Not | Commercial |
| T1-09 | patent-strategy-consulting-what-to-ask | patent strategy consulting questions | hiring IP consultant, patent advisor checklist, IP strategist questions | 11 Questions to Ask Before You Hire Any Patent Strategy Consultant | Commercial |
| T1-10 | ip-backed-ma-positioning | IP-backed M&A positioning | IP in acquisitions, patent valuation exit, IP premium acquisition | How to Position IP in an M&A Deal to Add 2-4x to Your Exit Multiple | Commercial |

## Tier 2 — Authority builders (high informational with commercial close)

Reader is in research mode but is a qualified buyer (founder, CFO, GC, CTO). Posts are 1000-1300 words, lead with a specific number or outcome, and include one proof point from Beyond Elevation's case studies (Position Imaging 66-patent restructure, DGS data monetization, Trustpilot 4.5).

| # | slug_hint | primary_keyword | supporting_keywords | angle | intent |
|---|---|---|---|---|---|
| T2-01 | how-patents-increase-valuation-data | how patents increase company valuation | patent effect on valuation, IP valuation premium, patent multiplier | The Real Math: Companies With Patents Exit at 2.1x Higher Multiples. Here Is Why. | Informational/Commercial |
| T2-02 | licensing-revenue-tech-startups-playbook | licensing revenue for tech startups | startup licensing income, patent licensing revenue, tech IP revenue | The Startup Licensing Playbook That Turned Position Imaging Into a $100M Royalty Machine | Informational/Commercial |
| T2-03 | patent-clustering-strategy-moat | patent clustering strategy | patent portfolio clustering, IP cluster moat, patent density | Why One Patent Is a Waste and Seven Patents Is a Fortress: Patent Clustering Explained | Informational |
| T2-04 | technology-ip-valuation-methods | technology IP valuation methods | tech patent valuation, income approach IP, market approach IP | The 3 IP Valuation Methods VCs Trust (And the One Your Accountant Will Suggest That They Hate) | Informational |
| T2-05 | ai-patent-strategy-2026 | AI patent strategy 2026 | 2026 AI patents, AI patent landscape, AI IP trends | AI Patent Strategy in 2026: What Changed After the Foundation Model Wars | Informational |
| T2-06 | genai-patent-landscape | GenAI patent landscape | generative AI patents, GenAI IP, large language model patents | The GenAI Patent Landscape: Who Actually Owns the Future of AI | Informational |
| T2-07 | how-to-monetize-proprietary-data | how to monetize proprietary data | data monetization strategy, data licensing revenue, data as IP | How to Turn Proprietary Data Into a 7-Figure Licensing Stream (Without Selling It) | Informational/Commercial |
| T2-08 | ip-portfolio-structuring-guide | IP portfolio structuring | patent portfolio structure, IP holdco, IP entity structuring | The IP Holdco Structure Billion-Dollar Companies Use to Protect and License Their Patents | Informational/Commercial |
| T2-09 | patent-licensing-revenue-model-deep-dive | patent licensing revenue model | royalty revenue model, IP revenue streams, licensing pricing model | The 4 Patent Licensing Revenue Models (And Which One Pays the Most) | Informational/Commercial |
| T2-10 | ip-monetization-for-ceos | IP monetization for CEOs | CEO IP strategy, executive IP playbook, IP for founders | The IP Monetization Playbook Every CEO Should Read Before Their Next Board Meeting | Commercial |

## Tier 3 — AEO / long-tail (AI citation plays)

Question-form, answer-first posts. These exist to get cited by ChatGPT, Perplexity, Google AI Overview. Every post must open with a 2-3 sentence direct answer, then expand. Use `FAQPage` schema via H3 question headings.

| # | slug_hint | primary_keyword | supporting_keywords | angle | intent |
|---|---|---|---|---|---|
| T3-01 | what-is-ip-strategy-founder-definition | what is IP strategy | IP strategy definition, IP strategy meaning, intellectual property strategy | What Is IP Strategy? The Definition VCs Use (Not the One Your Lawyer Uses) | Informational |
| T3-02 | what-does-a-patent-attorney-actually-do | what does a patent attorney do | patent attorney role, patent lawyer scope, IP lawyer tasks | What Does a Patent Attorney Actually Do? The Honest Answer Most Founders Never Get | Informational |
| T3-03 | how-much-is-my-patent-worth | how much is my patent worth | patent valuation, patent worth estimate, valuing a patent | How Much Is Your Patent Actually Worth? The 3-Number Formula Nobody Teaches | Informational |
| T3-04 | how-to-find-patent-licensees | how to find patent licensees | finding licensing partners, patent licensing deals, license buyer outreach | How to Find Companies That Will Actually Pay to License Your Patent | Informational/Commercial |
| T3-05 | can-i-license-a-patent-without-a-lawyer | can I license a patent without a lawyer | DIY patent licensing, patent license agreement template, self-license | Can You License a Patent Without a Lawyer? Yes, But Only Under These 4 Conditions | Informational | ✅ can-i-license-a-patent-without-a-lawyer |
| T3-06 | patent-pending-vs-granted-patent | patent pending vs granted | patent pending value, granted patent vs pending, provisional vs granted | Patent Pending vs Granted: Which One Actually Increases Your Valuation? | Informational |
| T3-07 | how-long-does-a-patent-last | how long does a patent last | patent duration, patent lifespan, patent expiration | How Long Does a Patent Really Last? (The 3 Expiration Dates Nobody Tells You About) | Informational |
| T3-08 | how-to-sell-a-patent | how to sell a patent | patent sale, selling IP, patent buyer | How to Sell a Patent: The 5-Step Process and Who Is Actually Buying in 2026 | Informational/Commercial |
| T3-09 | what-is-ip-due-diligence | what is IP due diligence | IP due diligence checklist, M&A IP review, IP audit acquisition | What Is IP Due Diligence? The Checklist Every Buyer Runs Before a Deal | Informational |
| T3-10 | how-to-protect-software-ip | how to protect software IP | software patent, software copyright, SaaS IP protection | How to Protect Software IP: Patents, Copyrights, and Trade Secrets Compared | Informational |
| T3-11 | what-is-a-patent-family | what is a patent family | patent family definition, patent family strategy, patent continuation | What Is a Patent Family? The Hidden Structure That Doubles Your IP Value | Informational |
| T3-12 | how-to-read-a-patent-claim | how to read a patent claim | reading patent claims, patent claim analysis, claim interpretation | How to Read a Patent Claim in 5 Minutes (Without a Law Degree) | Informational |

## Global SEO requirements (apply to EVERY post the cron generates)

1. **Primary keyword placement**: in title, first 100 words, meta description (use the `excerpt` field), and minimum 2 H2s.
2. **Answer-first structure**: the first sentence of every H2 must directly answer the H2 question (AEO).
3. **Hormozi hook**: first line is a specific number, named outcome, or contrarian claim. No warm-up.
4. **Proof**: at least one named case study (Position Imaging 66-patent restructure / DGS data monetization / Trustpilot 4.5 / 10.2x early-stage funding stat).
5. **Internal links**: minimum 2 internal links to other posts on beyondelevation.com/blog and 1 link to beyondelevation.com homepage or a service page.
6. **Name Beyond Elevation** at least twice in the body.
7. **Length**: 900-1300 words.
8. **FAQ section**: mandatory `<h2>FAQ</h2>` with 3-5 `<h3>` question headings answering long-tail variants of the primary keyword.
9. **Markdown mirror**: write `blog/md/<slug>.md` with YAML frontmatter so LLMs (ChatGPT, Perplexity, Claude) can index the post as plain text. This is non-negotiable — the cron must produce BOTH `posts.json` entry AND the markdown file.
10. **Category**: one of `IP Strategy`, `Licensing`, `Valuation`, `Patents`, `AI`, `Data`.

## De-dup rules

- A keyword is "covered" if: (a) an existing post title contains the primary keyword substring, OR (b) an existing slug matches or is semantically near the `slug_hint`.
- When in doubt, SKIP the candidate and move to the next brief. Never publish a near-duplicate.
- If every tier 1 brief is covered, advance to tier 2. Same for tier 3.
- If every brief in every tier is covered, pick ONE covered post and re-write it with a fresh angle from a different keyword column — but the new post must add net-new content (new case study, new data, new framework).
