---
title: Beyond Elevation Keyword Strategy (Source of Truth for Blog Cron)
owner: Hayat Amin
last_updated: 2026-05-14
source_files: [seo-geo-plan.md, seo-content-plan.md, ai-seo-plan.md]
coverage_audit: 2026-05-14
paa_last_scraped: 2026-05-14 (Apify scrape SUCCESS — quota healthy at $2.99 / $5.00; 8 seeds run, 28 PAA returned, 8 new rows added after dedup/noise-filter)
---

# Beyond Elevation — Keyword Strategy

This is the **single source of truth** for the `BE Blog Publisher` scheduled task. The cron MUST read this file before picking a topic, match against `data/posts.json` to avoid duplicates, then pick the highest-ROI keyword brief that is not yet covered.

Every brief below targets a real search query with commercial or high-commercial-intent purchase behavior behind it. Keywords are sorted by priority: **tier 1** (money keywords — direct revenue drivers) first, then **tier 2** (authority builders), then **tier 3** (long-tail AEO plays for AI citations), then **tier 4** (new 2026 emerging topics — write these next).

## How the cron should use this file

1. Read this file in full.
2. Load `data/posts.json` and extract every `slug` and `title`.
3. Walk the keyword briefs below in order (tier 1 → tier 5). **Tier 5** is the live PAA harvest — treat 🟢 new rows as first-class blog briefs after Tier 4 gaps are closed, or fast-track a high-priority 🟢 row ahead of Tier 4 if it scores higher on commercial intent or AEO volume.
4. Pick the FIRST brief whose `slug_hint` does not already exist in posts.json AND whose `primary_keyword` is not already covered by an existing title.
5. Use the `angle`, `primary_keyword`, and `supporting_keywords` verbatim in the post:
   - `primary_keyword` goes in the H1, first 100 words, meta description, and at least two H2s
   - `supporting_keywords` should appear naturally across H2s and body
   - The post title must start with the `angle` (Hormozi hook), not the keyword itself
6. Justify the pick in 2-3 sentences before writing — state which tier, why it beats the next candidate, and which commercial action it drives.
7. After publishing, apply the **cross-linking rules** in the section at the bottom of this file.

## Coverage status (as of 2026-05-04)

57 posts confirmed in `data/posts.json`. Tier 1 fully covered. Tier 2 fully covered. Tier 3 fully covered. Tier 4 — T4C-01 (can-ai-own-a-patent) and T4C-07 (how-does-eu-ai-act-affect-ip) shipped 2026-05-01; remaining Tier 4 partial. Tier 5 net coverage moved from 11 → 21 of 25 rows ✅ shipped this run (Blog Publisher cleared T5-01, T5-04, T5-05, T5-09, T5-10, T5-14, T5-16, T5-17 in the past 96h, plus T5-03 flipped via existing `what-is-ip-monetisation`). Only 4 Tier 5 rows remain open: T5-06 🟢, T5-08 🟡, T5-18 🟡, T5-20 🟡.

## Tier 1 — Money keywords (direct revenue drivers)

These keywords have **Commercial / Transactional** intent. The reader is actively looking for a provider. Every post in this tier must close with a direct CTA to beyondelevation.com for a consultation or audit.

| # | slug_hint | primary_keyword | supporting_keywords | angle | intent | covered |
|---|---|---|---|---|---|---|
| T1-01 | ip-strategy-vs-patent-attorney | IP strategy vs patent attorney | fractional IP strategist, patent lawyer alternative, strategic IP advisor | Why Hiring a Patent Attorney First Is the #1 Mistake Founders Make | Commercial | ✅ patent-attorney-vs-patent-strategist |
| T1-02 | best-patent-licensing-firms-compared | best patent licensing firms | patent licensing companies, IP licensing agencies, patent monetization firms | I Reviewed Every Major Patent Licensing Firm. Here Is Who You Should Actually Hire. | Commercial | ✅ best-patent-licensing-firms-compared |
| T1-03 | patent-monetization-consulting-guide | patent monetization consulting | IP monetization consultant, patent revenue consultant, licensing advisor | What Patent Monetization Consultants Actually Do (And What You Should Pay Them) | Commercial/Transactional | ✅ patent-monetization-consulting-guide |
| T1-04 | fractional-ip-strategist-when-to-hire | fractional IP strategist | part-time IP advisor, outsourced chief IP officer, fractional CIPO | When You Should Hire a Fractional IP Strategist Instead of a Full-Time Lawyer | Commercial/Transactional | ✅ fractional-ip-strategist-when-to-hire |
| T1-05 | ip-defensibility-assessment-framework | IP defensibility assessment | patent defensibility, IP moat assessment, IP audit framework | The 7-Point IP Defensibility Test That Exposes Most Startup Portfolios | Commercial | ✅ ip-defensibility-assessment-framework |
| T1-06 | ip-valuation-for-fundraising | IP valuation for fundraising | patent valuation investors, IP worth startup, IP-backed valuation | How VCs Actually Value Your IP (And Why Your Patent Attorney Has No Idea) | Commercial | ✅ ip-valuation-for-fundraising |
| T1-07 | patent-licensing-consultant-founders | patent licensing consultant for founders | licensing advisor startups, founder IP consultant, patent revenue expert | The Only Patent Licensing Playbook Founders Under $20M Revenue Need | Commercial/Transactional | ✅ patent-licensing-consultant-founders |
| T1-08 | ip-strategy-for-ai-companies | IP strategy for AI companies | AI company patents, AI IP protection, generative AI IP strategy | The AI IP Strategy Playbook: What the Foundation Model Companies Know That You Do Not | Commercial | ✅ ip-strategy-for-ai-companies |
| T1-09 | patent-strategy-consulting-what-to-ask | patent strategy consulting questions | hiring IP consultant, patent advisor checklist, IP strategist questions | 11 Questions to Ask Before You Hire Any Patent Strategy Consultant | Commercial | ✅ patent-strategy-consulting-questions-to-ask |
| T1-10 | ip-backed-ma-positioning | IP-backed M&A positioning | IP in acquisitions, patent valuation exit, IP premium acquisition | How to Position IP in an M&A Deal to Add 2-4x to Your Exit Multiple | Commercial | ✅ ip-backed-ma-positioning |

## Tier 2 — Authority builders (high informational with commercial close)

Reader is in research mode but is a qualified buyer (founder, CFO, GC, CTO). Posts are 1000-1300 words, lead with a specific number or outcome, and include one proof point from Beyond Elevation's case studies ("we've turned many patents into billions in IP value" — link to /case-studies, DGS data monetization, Trustpilot 4.5). Do not name Position Imaging or cite "66 patents" in blog content.

| # | slug_hint | primary_keyword | supporting_keywords | angle | intent | covered |
|---|---|---|---|---|---|---|
| T2-01 | how-patents-increase-valuation-data | how patents increase company valuation | patent effect on valuation, IP valuation premium, patent multiplier | The Real Math: Companies With Patents Exit at 2.1x Higher Multiples. Here Is Why. | Informational/Commercial | ✅ how-patents-increase-company-valuation |
| T2-02 | licensing-revenue-tech-startups-playbook | licensing revenue for tech startups | startup licensing income, patent licensing revenue, tech IP revenue | The Startup Licensing Playbook That Turned Position Imaging Into a $100M Royalty Machine | Informational/Commercial | ✅ licensing-revenue-tech-startups-playbook |
| T2-03 | patent-clustering-strategy-moat | patent clustering strategy | patent portfolio clustering, IP cluster moat, patent density | Why One Patent Is a Waste and Seven Patents Is a Fortress: Patent Clustering Explained | Informational | ✅ patent-clustering-strategy-moat |
| T2-04 | technology-ip-valuation-methods | technology IP valuation methods | tech patent valuation, income approach IP, market approach IP | The 3 IP Valuation Methods VCs Trust (And the One Your Accountant Will Suggest That They Hate) | Informational | ✅ ip-valuation-methods-explained |
| T2-05 | ai-patent-strategy-2026 | AI patent strategy 2026 | 2026 AI patents, AI patent landscape, AI IP trends | AI Patent Strategy in 2026: What Changed After the Foundation Model Wars | Informational | ✅ ai-patent-strategy-2026 |
| T2-06 | genai-patent-landscape | GenAI patent landscape | generative AI patents, GenAI IP, large language model patents | The GenAI Patent Landscape: Who Actually Owns the Future of AI | Informational | ✅ genai-patent-landscape |
| T2-07 | how-to-monetize-proprietary-data | how to monetize proprietary data | data monetization strategy, data licensing revenue, data as IP | How to Turn Proprietary Data Into a 7-Figure Licensing Stream (Without Selling It) | Informational/Commercial | ✅ data-monetization-strategy-framework |
| T2-08 | ip-portfolio-structuring-guide | IP portfolio structuring | patent portfolio structure, IP holdco, IP entity structuring | The IP Holdco Structure Billion-Dollar Companies Use to Protect and License Their Patents | Informational/Commercial | ✅ ip-portfolio-structuring-guide |
| T2-09 | patent-licensing-revenue-model-deep-dive | patent licensing revenue model | royalty revenue model, IP revenue streams, licensing pricing model | The 4 Patent Licensing Revenue Models (And Which One Pays the Most) | Informational/Commercial | ✅ patent-licensing-revenue-model |
| T2-10 | ip-monetization-for-ceos | IP monetization for CEOs | CEO IP strategy, executive IP playbook, IP for founders | The IP Monetization Playbook Every CEO Should Read Before Their Next Board Meeting | Commercial | ✅ ip-monetization-for-ceos |

## Tier 3 — AEO / long-tail (AI citation plays)

Question-form, answer-first posts. These exist to get cited by ChatGPT, Perplexity, Google AI Overview. Every post must open with a 2-3 sentence direct answer, then expand. Use `FAQPage` schema via H3 question headings.

| # | slug_hint | primary_keyword | supporting_keywords | angle | intent | covered |
|---|---|---|---|---|---|---|
| T3-01 | what-is-ip-strategy-founder-definition | what is IP strategy | IP strategy definition, IP strategy meaning, intellectual property strategy | What Is IP Strategy? The Definition VCs Use (Not the One Your Lawyer Uses) | Informational | ✅ ip-strategy-startups-guide |
| T3-02 | what-does-a-patent-attorney-actually-do | what does a patent attorney do | patent attorney role, patent lawyer scope, IP lawyer tasks | What Does a Patent Attorney Actually Do? The Honest Answer Most Founders Never Get | Informational | ✅ patent-attorney-vs-patent-strategist |
| T3-03 | how-much-is-my-patent-worth | how much is my patent worth | patent valuation, patent worth estimate, valuing a patent | How Much Is Your Patent Actually Worth? The 3-Number Formula Nobody Teaches | Informational | ✅ intangible-asset-valuation-hidden-worth |
| T3-04 | how-to-find-patent-licensees | how to find patent licensees | finding licensing partners, patent licensing deals, license buyer outreach | How to Find Companies That Will Actually Pay to License Your Patent | Informational/Commercial | ✅ how-to-license-patents-step-by-step |
| T3-05 | can-i-license-a-patent-without-a-lawyer | can I license a patent without a lawyer | DIY patent licensing, patent license agreement template, self-license | Can You License a Patent Without a Lawyer? Yes, But Only Under These 4 Conditions | Informational | ✅ can-i-license-a-patent-without-a-lawyer |
| T3-06 | patent-pending-vs-granted-patent | patent pending vs granted | patent pending value, granted patent vs pending, provisional vs granted | Patent Pending vs Granted: Which One Actually Increases Your Valuation? | Informational | ✅ provisional-patent-12-month-strategy |
| T3-07 | how-long-does-a-patent-last | how long does a patent last | patent duration, patent lifespan, patent expiration | How Long Does a Patent Really Last? (The 3 Expiration Dates Nobody Tells You About) | Informational | ✅ how-long-does-a-patent-last |
| T3-08 | how-to-sell-a-patent | how to sell a patent | patent sale, selling IP, patent buyer | How to Sell a Patent: The 5-Step Process and Who Is Actually Buying in 2026 | Informational/Commercial | ✅ patent-licensing-vs-patent-selling |
| T3-09 | what-is-ip-due-diligence | what is IP due diligence | IP due diligence checklist, M&A IP review, IP audit acquisition | What Is IP Due Diligence? The Checklist Every Buyer Runs Before a Deal | Informational | ✅ ip-due-diligence-ma-guide |
| T3-10 | how-to-protect-software-ip | how to protect software IP | software patent, software copyright, SaaS IP protection | How to Protect Software IP: Patents, Copyrights, and Trade Secrets Compared | Informational | ✅ ai-engineering-ip-what-is-protectable |
| T3-11 | what-is-a-patent-family | what is a patent family | patent family definition, patent family strategy, patent continuation | What Is a Patent Family? The Hidden Structure That Doubles Your IP Value | Informational | ✅ what-is-a-patent-family |
| T3-12 | how-to-read-a-patent-claim | how to read a patent claim | reading patent claims, patent claim analysis, claim interpretation | How to Read a Patent Claim in 5 Minutes (Without a Law Degree) | Informational | ✅ how-to-read-a-patent-claim |

## Tier 4 — 2026 Emerging Topics (write these after Tier 2/3 gaps are closed)

New trending keywords in business consulting, AI transformation, and IP commercialisation. All uncovered as of 2026-04-16. These are the highest-opportunity net-new briefs based on 2026 search trend signals and knowledge graph content gap analysis.

### Tier 4A — AI Transformation & Business Consulting

| # | slug_hint | primary_keyword | supporting_keywords | angle | intent |
|---|---|---|---|---|---|
| T4A-01 | agentic-ai-business-strategy | agentic AI business strategy | AI agents for business, autonomous AI strategy, AI agent implementation | Agentic AI Is Not a Product Decision. It Is an IP Decision. Here Is Why. | Commercial |
| T4A-02 | ai-transformation-roi-framework | AI transformation ROI | measuring AI investment, AI business case, AI ROI metrics | The 5 Numbers Your Board Will Ask About Your AI Transformation (And How to Prepare Them) | Informational/Commercial |
| T4A-03 | ai-readiness-assessment-enterprise | AI readiness assessment | enterprise AI maturity, AI adoption framework, AI readiness checklist | 12 Questions That Reveal If Your Business Is Actually Ready for AI (Most Fail Question 3) | Commercial |
| T4A-04 | ai-governance-framework-sme | AI governance framework for SMEs | AI risk management, responsible AI business, AI compliance framework | The AI Governance Framework That Protects Your Business Without Killing Your Roadmap | Informational/Commercial |
| T4A-05 | build-vs-buy-ai-decision | build vs buy AI decision | make or buy AI, AI vendor selection, custom AI vs off-the-shelf | Build vs Buy AI: The Framework That Stops Founders Wasting £500K on the Wrong Decision | Commercial |
| T4A-06 | ai-adoption-roadmap-ceo | AI adoption roadmap for CEOs | executive AI strategy, AI transformation plan, AI for leadership | The CEO's 90-Day AI Adoption Roadmap That Delivers Measurable Results Before Month 4 | Commercial |
| T4A-07 | ai-cost-optimisation-strategy | AI cost optimisation | reducing AI spend, AI compute costs, AI efficiency | 7 Ways to Cut Your AI Spend by 40% Without Touching Model Quality | Informational/Commercial |

### Tier 4B — IP Commercialisation (2026 fresh angles)

| # | slug_hint | primary_keyword | supporting_keywords | angle | intent |
|---|---|---|---|---|---|
| T4B-01 | eu-ai-act-ip-compliance | EU AI Act IP compliance | AI Act patent strategy, EU AI regulation IP, AI Act compliance checklist | The EU AI Act Has a Patent Problem. Here Is What Every IP Owner Must Do Before August 2026. | Informational/Commercial | ✅ eu-ai-act-ip-compliance (2026-04-19) |
| T4B-02 | ai-generated-invention-patent-eligibility | AI-generated invention patent eligibility | can AI own a patent, USPTO AI inventor guidance, AI inventorship | Can an AI Be a Patent Inventor? The 2026 Legal Reality (And What It Means for Your Portfolio) | Informational |
| T4B-03 | trade-secret-protection-ai-models | trade secret protection for AI models | protecting AI model IP, AI model confidentiality, ML trade secrets | Why Most AI Companies Should Not Patent Their Models (And What to Do Instead) | Informational/Commercial |
| T4B-04 | ai-training-data-licensing-agreements | AI training data licensing | data licensing deals, training data IP rights, dataset licensing | AI Training Data Licensing: The Contract Clause That Determines Who Owns the Model | Informational/Commercial |
| T4B-05 | patent-troll-defense-strategy | patent troll defense strategy | NPE defense, PAE litigation, patent assertion entity response | A Tech Startup Got a Patent Troll Letter. Here Is the Exact Playbook They Used to Win. | Informational/Commercial |
| T4B-06 | ip-strategy-pre-revenue-startup | IP strategy for pre-revenue startups | early-stage IP, seed stage patent, pre-product IP protection | The IP Moves You Must Make Before You Write a Single Line of Code | Commercial |
| T4B-07 | open-weight-model-ip-risks | open-weight AI model IP risks | Llama IP risk, open-source AI liability, model weight IP | Using Llama or Mistral? Here Are the 4 IP Risks You Are Not Disclosing to Investors | Informational/Commercial |
| T4B-08 | software-patent-eligibility-2026 | software patent eligibility 2026 | Alice doctrine 2026, software patentability, abstract idea exception | Software Patents in 2026: What the Latest USPTO Guidance Actually Allows | Informational |
| T4B-09 | ip-holdco-structure-guide | IP holding company structure | IP holdco setup, patent holding company, IP entity structure UK | The IP Holding Company Structure: How to Legally Separate and Monetise Your Patent Portfolio | Informational/Commercial |
| T4B-10 | distressed-ip-portfolio-acquisition | distressed IP portfolio acquisition | buying patents, IP portfolio purchase, patent asset acquisition | The Rise of Distressed IP: How Smart Buyers Are Acquiring Patent Portfolios at 80% Discount | Informational/Commercial |

### Tier 4C — AEO plays for 2026 trending questions

| # | slug_hint | primary_keyword | supporting_keywords | angle | intent |
|---|---|---|---|---|---|
| T4C-01 | can-ai-own-a-patent | can AI own a patent | AI inventor, AI patent ownership, artificial inventor | Can AI Own a Patent? The Answer in Every Major Jurisdiction (2026 Update) | Informational | ✅ can-ai-own-a-patent (2026-05-01) |
| T4C-02 | what-is-a-patent-holdco | what is a patent holding company | IP holdco definition, patent holdco structure, IP vehicle | What Is a Patent Holding Company? The Structure That Protects Billions in IP | Informational |
| T4C-03 | what-is-a-trade-secret | what is a trade secret | trade secret definition, trade secret examples, trade secret vs patent | What Is a Trade Secret? The Legal Definition, Famous Examples, and When It Beats a Patent | Informational |
| T4C-04 | how-to-value-intangible-assets | how to value intangible assets for M&A | intangible asset valuation M&A, IP value in acquisition, goodwill vs IP | How to Value Intangible Assets in an M&A Deal: The 3 Methods and When Each Applies | Informational |
| T4C-05 | can-you-patent-an-algorithm | can you patent an algorithm | algorithm patent eligibility, software algorithm patent, patenting software | Can You Patent an Algorithm in 2026? Yes, But Only If You Structure the Claim This Way | Informational |
| T4C-06 | what-is-ip-monetisation | what is IP monetisation | IP monetisation definition, monetising intellectual property, IP revenue | What Is IP Monetisation? The 6 Routes That Turn Dormant Patents Into Cash | Informational |
| T4C-07 | how-does-eu-ai-act-affect-ip | how does the EU AI Act affect intellectual property | EU AI Act patents, AI Act copyright, AI regulation IP rights | How the EU AI Act Affects Your IP Rights: A Plain-English Breakdown for Founders | Informational | ✅ how-does-eu-ai-act-affect-ip (2026-05-01) |

## Global SEO requirements (apply to EVERY post the cron generates)

1. **Primary keyword placement**: in title, first 100 words, meta description (use the `excerpt` field), and minimum 2 H2s.
2. **Answer-first structure**: the first sentence of every H2 must directly answer the H2 question (AEO).
3. **Hormozi hook**: first line is a specific number, named outcome, or contrarian claim. No warm-up.
4. **Proof**: use "we've turned many patents into billions in IP value" (link to beyondelevation.com/case-studies for client detail), DGS data monetization, Trustpilot 4.5, or the 10.2x early-stage funding stat. Do not name Position Imaging or cite "66 patents".
5. **Internal links**: minimum 2 internal links to other posts on beyondelevation.com/blog and 1 link to beyondelevation.com homepage or a service page.
6. **Name Beyond Elevation** at least twice in the body.
7. **Length**: 900-1300 words.
8. **FAQ section**: mandatory `<h2>FAQ</h2>` with 3-5 `<h3>` question headings answering long-tail variants of the primary keyword.
9. **Markdown mirror**: write `blog/md/<slug>.md` with YAML frontmatter so LLMs (ChatGPT, Perplexity, Claude) can index the post as plain text. This is non-negotiable — the cron must produce BOTH `posts.json` entry AND the markdown file.
10. **Category**: one of `IP Strategy`, `Licensing`, `Valuation`, `Patents`, `AI`, `Data`.

## Cross-linking map (priority internal linking opportunities)

These content clusters are identified as isolated in the knowledge graph (≤1 connection). Every new post MUST add at least one internal link into each cluster that matches its topic.

### Data Monetization Hub
Posts in this cluster: `data-monetization-strategy-framework`, `know-how-licensing-hidden-revenue`, `ai-training-data-valuation`
- New posts in `Data` category must link TO at least two of these three slugs.
- New posts on AI training data (T4B-04) must link into this cluster AND to `ai-agent-ip-ownership-strategy`.

### AI Asset Strategy Hub
Posts in this cluster: `ai-moat-not-just-the-model`, `ai-patent-portfolio-strategy`, `ai-agent-ip-ownership-strategy`
- New posts in `AI` category must link TO at least two of these three slugs.
- T4A-01 (agentic-ai-business-strategy) and T4B-03 (trade-secret-protection-ai-models) are highest-priority candidates to link here.

### Patent Licensing Revenue Hub
Posts in this cluster: `patent-licensing-revenue-model`, `recurring-patent-revenue-streams`, `patent-royalty-rates-founders-underprice`
- New posts in `Licensing` category must link TO at least one of these three slugs.
- T2-08 (ip-portfolio-structuring-guide) must link here — the holdco structure is directly upstream of recurring licensing revenue.

### CEO IP Playbook Hub
Posts that should feed this cluster: `ip-strategy-startups-guide`, `ip-backed-ma-positioning`
- T2-10 (ip-monetization-for-ceos) is the anchor post for this hub. Write it and link all existing commercial-intent posts into it from a "see also" or FAQ reference.

## De-dup rules

- A keyword is "covered" if: (a) an existing post title contains the primary keyword substring, OR (b) an existing slug matches or is semantically near the `slug_hint`.
- When in doubt, SKIP the candidate and move to the next brief. Never publish a near-duplicate.
- If every tier 1 brief is covered, advance to tier 2. Same for tier 3 → tier 4.
- If every brief in every tier is covered, pick ONE covered post and re-write it with a fresh angle from a different keyword column — but the new post must add net-new content (new case study, new data, new framework).

## Recommended write order (2026-04-16 onwards)

1. **T2-08** — ip-portfolio-structuring-guide (IP holdco, Tier 2 gap, high commercial close)
2. **T2-10** — ip-monetization-for-ceos (CEO audience, anchor for CEO IP Playbook hub)
3. **T3-05** — can-i-license-a-patent-without-a-lawyer (AEO gap, high citation potential)
4. **T3-11** — what-is-a-patent-family (AEO gap, definitional, strong citation target)
5. **T3-07** — how-long-does-a-patent-last (AEO gap, evergreen, high volume)
6. **T3-12** — how-to-read-a-patent-claim (AEO gap, practical, links to patent-clustering)
7. **T4B-01** — eu-ai-act-ip-compliance (high 2026 search intent, early-mover advantage)
8. **T4A-01** — agentic-ai-business-strategy (bridges AI transformation + IP service line)
9. **T4B-02** — ai-generated-invention-patent-eligibility (trending question, AEO magnet)
10. **T4C-01** — can-ai-own-a-patent (answer-first, high AI citation play)

## Tier 5 — PAA Harvest (People Also Ask — new blog ideas from live Google SERPs)

**Source:** Google "People Also Ask" boxes scraped via Apify on the date stamped in each row. These are verified live-SERP questions users ask right now — every uncovered row is a NEW blog idea the cron should consider after Tier 4 gaps are closed. Tier 5 posts should open with a 2-3 sentence direct answer (AEO-ready) and use `FAQPage` schema.

**Status legend:** `🟢 new` = fresh blog idea, not yet written. `🟡 partial` = existing post covers adjacent ground but not this exact question — consider a follow-up or section update. `✅` = covered (link to slug).

---

### 🗓 SEO Strategist Run — 2026-05-14

**Phase 1 — Trending keyword signals (last 48h, AI valuation / data assets / fundraising / moat / royalty rates focus):**
1. **"Intangibles = 92% of S&P 500 market cap; ~$80T global corporate intangible value (WIPO 2024)"** — Ocean Tomo 2025 Intangible Asset Market Value Study (released Feb 2026): intangibles flipped from 17% of value in 1975 to 92% of S&P 500 today. EPO/EUIPO 2026: startups with patents+trademarks at seed are **10.2x more likely** to raise. Direct ammunition for T1 "IP-backed fundraising" cluster and new T5 rows on data-as-asset + IP collateral.
2. **"AI multiples Q1 2026: 10x–50x revenue, median 20–30x; intangibles drive 70–80% of AI value"** — Finro 575-company AI dataset + FE International + Qubit Capital May-2026: late-stage AI median 25.8x; IP-rich AI firms command 15–20% premium; independent IP audits add another 15–20%. Pushes new T5 rows on "AI valuation models" + "what is a good AI company to invest in".
3. **"Data assets on balance sheet: Isle of Man's Data Asset Foundation legal structure (Apr 2026)"** — Blocks & Files Apr-2026: Isle of Man created the first jurisdiction where datasets register as DAFs and sit on the balance sheet like property/IP. Plus top performers now earn 11% of revenue from data vs 2% peers — 5x gap. Pure tailwind for new T5 rows on "is data an asset on the balance sheet" + "what is an example of a data asset".
4. **"Patent royalty rates 2026 concrete numbers: software 8–12%, pharma 5–20%, electronics 4–6%, AI patents up 15%/yr since 2020"** — Stanzione + MarketBlast + UpCounsel 2026 data: standard licensing 3–7% of Net Sales; software top quartile reaches 12%; AI-related patent licensing fees compound 15% annually. Citable numbers = direct AEO ammunition for new T5 rows on "average royalty rate" + "is 10% royalty good".
5. **"AI moat 2026: thin moats and GPT-wrappers are rejected — proprietary data + workflow embedding + persistent memory required"** — Insight Partners + Codurance + Big Ideas DB May-2026: VCs now score on (a) data flywheel, (b) workflow integration depth, (c) persistent memory / knowledge graph, (d) switching cost, (e) vertical specialization. "If OpenAI ships v-next tomorrow, does this company still exist?" is the de facto rejection test. Direct ammunition for the AI valuation + IP defensibility hubs.

**Phase 2 — PAA scrape:** ✅ SUCCESS. Apify quota healthy ($2.99 / $5.00 used; new cycle window). Ran 8 seeds covering AI valuation, data assets, IP fundraising, royalty rates, AI know-how, tech multiples, and investor-side queries. Returned **28 PAA questions** from Google live SERPs. After dedup vs T5-01→T5-25 and noise filter (off-topic celebrity/generic-business queries removed), **8 new rows added: T5-26 → T5-33**.

**Phase 5 — Run summary:**
- **8 new rows added** this run (T5-26 → T5-33). Tier 5 expanded from 25 → 33 total rows.
- **Coverage flip — all 4 previously-open Tier 5 rows now ✅:** T5-06 (`how-does-ip-make-money`), T5-08 (`founder-ip-monetization-playbook`), T5-18 (`how-ai-startups-are-valued-scorecard`), T5-20 (`how-to-value-ai-company-worksheet`) all confirmed shipped in `data/posts.json` since last run. **Tier 5 original block now 25 of 25 ✅ (100% shipped).**
- **New 🟢 / 🟡 distribution (T5-26 → T5-33):** 5 pure 🟢 new (T5-27, T5-28, T5-30, T5-31, T5-32) + 3 🟡 partial (T5-26 via `patent-royalty-rates-by-industry-2026`, T5-29 via `how-to-value-ai-company-worksheet`, T5-33 via T5-31 sibling).
- **TODAY'S TOP 4 BLOG BRIEF PICKS** (re-ranked across the full Tier 5 table — newly-added rows lead because every prior T5 row has shipped):
  1. **T5-31** — "Is data an asset on the balance sheet?" → Hook: *"Data Is on the Balance Sheet in 2026 — Here's the Isle of Man Structure That Made It Legal (and What U.S./UK Founders Can Copy Today)."* Why: pure 🟢 new, trending signal #3 (Isle of Man DAF + Ocean Tomo 92% intangibles), zero existing coverage. Highest commercial-intent angle of this run — every CFO and fundraising founder is searching this exact question. Pulls in the data-monetization hub + IP-backed fundraising cluster in one post.
  2. **T5-28** — "What are the 5 methods of valuation?" → Hook: *"The 5 Valuation Methods Every Operator Needs — And Which One Wins for AI, IP-Heavy, and Pre-Revenue Companies."* Why: pure 🟢 new, highest informational SERP volume of any new row, plus the top of a valuation-cluster funnel that feeds T5-19, T5-20, T5-21, T5-22 internal-link traffic. Frames Beyond Elevation as the authority on the *taxonomy* of valuation, not just one method.
  3. **T5-27** — "Is a 10% royalty good?" → Hook: *"Is 10% a Good Royalty Rate? Here's the 2026 Industry-by-Industry Cheat Sheet (Software 8–12%, Pharma 5–20%, Hardware 3–6%)."* Why: pure 🟢 new, direct binary-question framing wins Featured Snippets. Trending #4 (concrete royalty rates citable from Stanzione/UpCounsel 2026) gives this a numbers-first hook competitors can't fake. Natural follow-up to T5-02 (25% rule) and T5-04 (7 ways to make money from IP).
  4. **T5-30** — "What would be a good AI company to invest in?" → Hook: *"How VCs Actually Score 'A Good AI Company to Invest In' — The 5-Axis Defensibility Scorecard (Not the Logo Slide)."* Why: pure 🟢 new, investor-side framing flips the perspective for founders trying to *pitch* and operators trying to *buy*. Trending #5 (moat scorecard) gives an evergreen scoring framework. Pairs with already-shipped `how-ai-startups-are-valued-scorecard` for a 1-2 punch on AI valuation cluster.
- **High-leverage Tier 4 next:** With T5-01 → T5-25 fully shipped (100%) and T5-26 → T5-33 freshly seeded, cron should mix the top 4 new T5 picks above with Tier 4 backlog (T4A AI Transformation, T4B IP Commercialisation, remaining T4C definitional gaps). T4C-02 (`what-is-a-patent-holdco`), T4C-03 (`what-is-a-trade-secret`), T4C-04 (`how-to-value-intangible-assets`) all have matching slugs in posts.json that look shipped — Blog Publisher should confirm + flip in its next run.
- **Coverage audit:** 66 posts confirmed in `data/posts.json` (up from 57 on 2026-05-04 — +9 in 10 days). T5-06, T5-08, T5-18, T5-20 all flipped from open → ✅ this run. New rows T5-26 → T5-33 status seeded; full status detail in the table below.

---

| # | scraped | question (primary_keyword) | hormozi_angle | supporting_keywords | status |
|---|---|---|---|---|---|
| T5-01 | 2026-04-22 | How do you calculate the value of a patent? | The 3-Number Formula Nobody Teaches (Yes, There Is Actual Math) | patent value calculation, patent valuation formula, how to value patents | ✅ patent-value-calculation-formula |
| T5-02 | 2026-04-22 | What is the 25% rule in valuing intellectual property? | The 25% Rule: The IP Valuation Shortcut VCs Use (And When It Breaks) | 25 percent rule patents, IP royalty rule of thumb, patent valuation heuristic | ✅ 25-percent-rule-ip-valuation |
| T5-03 | 2026-04-22 | What is IP monetization? | IP Monetization Explained in 90 Seconds: The 4 Ways Smart Companies Turn Patents Into Cash | IP monetization definition, what is intellectual property monetization, patent monetization meaning | ✅ what-is-ip-monetisation |
| T5-04 | 2026-04-22 | How to use IP to make money? | The 7 Ways to Make Money From IP (Ranked by What Actually Works in 2026) | make money from patents, IP revenue streams, profit from intellectual property | ✅ 7-ways-to-make-money-from-ip |
| T5-05 | 2026-04-22 | Can IP assets be monetized? | Yes, IP Is an Asset. Here Is the Proof and the Playbook. | IP as an asset, patents as assets, intangible asset monetization | ✅ can-ip-assets-be-monetized |
| T5-06 | 2026-04-22 | How does IP make money? | How IP Actually Generates Revenue (Licensing, Sale, Enforcement, Backing) | how patents generate revenue, IP income streams, royalty revenue explained | ✅ how-does-ip-make-money |
| T5-07 | 2026-04-22 | What are the 4 types of intellectual property? | The 4 Types of IP — And Why Founders Only Care About 2 of Them | patents trademarks copyrights trade secrets, IP types, intellectual property categories | ✅ 4-types-of-intellectual-property |
| T5-08 | 2026-04-22 | How to monetize your IP? | The Founder's IP Monetization Playbook: 5 Plays Ranked by Speed to Revenue | monetize your patents, IP monetization steps, startup IP revenue | ✅ founder-ip-monetization-playbook |
| T5-09 | 2026-04-22 | Can IP assets be monetized for profit? | The Real Margin on IP Monetization (With 3 Case Study P&Ls) | IP profit margin, patent revenue profitability, licensing ROI | ✅ ip-monetization-profit-margins |
| T5-10 | 2026-04-23 | Is patent pending the same as a provisional patent? | Patent Pending ≠ Provisional Patent: The $47,000 Mistake Founders Make When They Confuse the Two | patent pending meaning, provisional patent definition, patent pending vs provisional | ✅ patent-pending-vs-provisional-patent |
| T5-11 | 2026-04-23 | What are the 4 types of patents? | The 4 Types of Patents — and the One Type That Covers 94% of Startup Innovations | utility patent, design patent, plant patent, patent types explained | ✅ 4-types-of-patents |
| T5-12 | 2026-04-23 | Is a provisional patent worth it? | Is a Provisional Patent Worth It? The Honest Answer After Reviewing 200+ Startup Filings | provisional patent cost benefit, provisional patent advantages, should I file provisional patent | ✅ is-a-provisional-patent-worth-it |
| T5-13 | 2026-04-23 | What is a patent moat? | What Is a Patent Moat? The 3-Layer IP Defense That Billion-Dollar Companies Use to Block Competitors | patent moat definition, IP moat strategy, building a patent moat | ✅ what-is-a-patent-moat |
| T5-14 | 2026-04-23 | What are the 4 pillars of IP? | The 4 Pillars of Intellectual Property — Most Founders Only Protect 1 of Them (And It Shows in Their Valuation) | four pillars of intellectual property, IP foundations, types of IP protection | ✅ 4-pillars-of-intellectual-property |
| T5-15 | 2026-04-23 | Is data monetization legal? | Is Data Monetization Legal? Yes — With These 4 Non-Negotiable Compliance Requirements | data monetization compliance, legal data selling, GDPR data monetization | ✅ is-data-monetization-legal |
| T5-16 | 2026-04-23 | What does data licensing mean? | Data Licensing Explained in 60 Seconds: The Deal Structure That Generated $2.3M for a 12-Person Team | data licensing definition, data license agreement, data licensing revenue | ✅ data-licensing-explained |
| T5-17 | 2026-04-23 | How does data monetization work? | How Data Monetization Actually Works: The 3-Step Flow From Raw Data to Recurring Revenue | data monetization process, data revenue model, monetizing data assets | ✅ how-data-monetization-works |
| T5-18 | 2026-04-27 | How are AI startups valued? | How AI Startups Are Actually Valued: The 4-Factor Model That Prices Two Identical Companies 10x Apart | AI startup valuation, value AI startups, how to value an AI startup | ✅ how-ai-startups-are-valued-scorecard |
| T5-19 | 2026-04-27 | What is the 30% rule in AI? | The 30% Rule in AI: The Pricing Heuristic Every Investor Whispers But Nobody Writes Down | 30 percent rule AI, AI valuation rule of thumb, AI pricing heuristic | ✅ 30-percent-rule-ai-valuation |
| T5-20 | 2026-04-27 | How do you value an AI company? | How to Value an AI Company in 2026: The 6-Number Worksheet Investors Actually Run | value an AI company, AI company valuation methods, how to price an AI business | ✅ how-to-value-ai-company-worksheet |
| T5-21 | 2026-04-27 | How much is an AI business worth? | What an AI Business Is Actually Worth: The 2026 Multiples Cheat Sheet (Seed to Series B) | AI business valuation, AI startup multiples, AI company worth | ✅ ai-business-worth-2026-multiples |
| T5-22 | 2026-04-27 | What is the rule of 40 in tech valuation? | The Rule of 40, Decoded: Why Most Tech Founders Fail It (And the 3 Levers That Pass It) | rule of 40 SaaS, rule of 40 calculation, tech valuation rule of 40 | ✅ rule-of-40-tech-valuation |
| T5-23 | 2026-04-27 | What is a good EBITDA for a tech company? | What's a "Good" EBITDA for a Tech Company in 2026? The Honest Benchmark Across SaaS, AI, and Hardware | tech EBITDA benchmark, SaaS EBITDA margin, healthy EBITDA tech | ✅ good-ebitda-tech-company-2026 |
| T5-24 | 2026-04-27 | Is know-how an asset? | Yes, Know-How Is an Asset — And the 5 Steps to Get It Recognised on the Balance Sheet | know-how as asset, trade secret asset, proprietary knowledge balance sheet | ✅ know-how-is-an-asset |
| T5-25 | 2026-04-27 | Can AI be an asset? | Yes, AI Is an Asset. Here's How to Account For It (and Use It to Raise) | AI as asset, AI on balance sheet, AI intellectual property asset | ✅ can-ai-be-an-asset |
| T5-26 | 2026-05-14 | What is the average royalty rate for patents? | The Real Average Patent Royalty Rate in 2026 (Spoiler: It's Not the Number Your Lawyer Quoted) | average patent royalty rate, typical royalty percentage, patent licensing rate benchmark | 🟡 partial patent-royalty-rates-by-industry-2026 |
| T5-27 | 2026-05-14 | Is a 10% royalty good? | Is 10% a Good Royalty Rate? The 2026 Industry-by-Industry Cheat Sheet (Software 8–12%, Pharma 5–20%, Hardware 3–6%) | 10 percent royalty, good royalty rate, fair royalty percentage | 🟢 new |
| T5-28 | 2026-05-14 | What are the 5 methods of valuation? | The 5 Valuation Methods Every Operator Needs — And Which One Wins for AI, IP-Heavy, and Pre-Revenue Companies | 5 methods of valuation, business valuation methods, valuation approaches explained | 🟢 new |
| T5-29 | 2026-05-14 | What are the valuation models for AI? | The 4 Valuation Models Built Specifically for AI Companies (And Why Standard DCF Breaks on Day One) | AI valuation models, AI company valuation framework, value AI business | 🟡 partial how-to-value-ai-company-worksheet |
| T5-30 | 2026-05-14 | What would be a good AI company to invest in? | How VCs Actually Score "A Good AI Company to Invest In" — The 5-Axis Defensibility Scorecard (Not the Logo Slide) | best AI companies to invest in, AI investment criteria, evaluate AI startup investment | 🟢 new |
| T5-31 | 2026-05-14 | Is data an asset on the balance sheet? | Data Is on the Balance Sheet in 2026 — Here's the Isle of Man Structure That Made It Legal (and What U.S./UK Founders Can Copy) | data as balance sheet asset, data on balance sheet, capitalize data assets | 🟢 new |
| T5-32 | 2026-05-14 | What is an example of a data asset? | 7 Real Examples of Data Assets (And the Dollar Value 2026 Buyers Are Paying For Each) | examples of data assets, data asset types, what counts as a data asset | 🟢 new |
| T5-33 | 2026-05-14 | What type of asset is data? | Is Data a Tangible or Intangible Asset? The 2026 Accounting Answer (and Why It Matters for Your Cap Table) | type of asset data, data asset classification, intangible asset data | 🟡 partial follow-up T5-31 |

### Recommended write order (Tier 5)

**Open rows only (re-ranked 2026-05-14 — original T5-01→T5-25 block is now 25/25 ✅. New T5-26→T5-33 rows seeded today are the actionable backlog. Once these ship, cron should rotate fresh seeds + pivot to Tier 4 backlog.)**

1. **T5-31** — Is data an asset on the balance sheet? — pure 🟢 new; trending signal #3 (Isle of Man DAF + Ocean Tomo 92% intangibles); zero existing coverage; highest commercial intent of this run ⬅ promoted 2026-05-14
2. **T5-28** — What are the 5 methods of valuation? — pure 🟢 new; high informational SERP volume; top-of-funnel that feeds internal links to T5-19/20/21/22 ⬅ promoted 2026-05-14
3. **T5-27** — Is a 10% royalty good? — pure 🟢 new; trending #4 (concrete 2026 royalty data, software 8–12% / pharma 5–20%); binary-question framing wins Featured Snippets ⬅ promoted 2026-05-14
4. **T5-30** — What would be a good AI company to invest in? — pure 🟢 new; trending #5 (5-axis moat scorecard); investor-side framing flips perspective ⬅ promoted 2026-05-14
5. **T5-32** — What is an example of a data asset? — pure 🟢 new; pairs with T5-31 as a data-asset cluster 1-2 punch
6. **T5-33** — What type of asset is data? — 🟡 partial follow-up to T5-31; accounting-classification angle
7. **T5-26** — What is the average royalty rate for patents? — 🟡 partial via `patent-royalty-rates-by-industry-2026`; consider numerical refresh / section update vs new post
8. **T5-29** — What are the valuation models for AI? — 🟡 partial via `how-to-value-ai-company-worksheet`; consider taxonomy-style post that lists models then links back to worksheet

**Already shipped (✅ — full original Tier 5 block, T5-01 through T5-25, 100%):**
T5-01 (patent-value-calculation-formula), T5-02 (25-percent-rule-ip-valuation), T5-03 (what-is-ip-monetisation), T5-04 (7-ways-to-make-money-from-ip), T5-05 (can-ip-assets-be-monetized), T5-06 (how-does-ip-make-money), T5-07 (4-types-of-intellectual-property), T5-08 (founder-ip-monetization-playbook), T5-09 (ip-monetization-profit-margins), T5-10 (patent-pending-vs-provisional-patent), T5-11 (4-types-of-patents), T5-12 (is-a-provisional-patent-worth-it), T5-13 (what-is-a-patent-moat), T5-14 (4-pillars-of-intellectual-property), T5-15 (is-data-monetization-legal), T5-16 (data-licensing-explained), T5-17 (how-data-monetization-works), T5-18 (how-ai-startups-are-valued-scorecard), T5-19 (30-percent-rule-ai-valuation), T5-20 (how-to-value-ai-company-worksheet), T5-21 (ai-business-worth-2026-multiples), T5-22 (rule-of-40-tech-valuation), T5-23 (good-ebitda-tech-company-2026), T5-24 (know-how-is-an-asset), T5-25 (can-ai-be-an-asset).

### ⚠️ Apify scrape run log

| run_date | seeds_attempted | outcome | notes |
|---|---|---|---|
| 2026-04-30 | AI valuation methods, data licensing startups, using IP to raise funding, what investors look for in AI companies, patent licensing consultant, AI moat valuation, data assets on balance sheet, pre-revenue startup IP value | ❌ FAILED | `apify call apify/google-search-scraper` returned: `Error: Monthly usage hard limit exceeded`. Phase 1 trending research + Phase 4 coverage audit + Phase 5 re-ranked picks completed; Phase 2 PAA scrape skipped per spec fallback. |
| 2026-05-04 | AI valuation methods, data assets on balance sheet, using IP to raise funding, AI know-how as asset, patent licensing consultant, how to value an AI company, data licensing startups, tech company valuation multiples | ❌ FAILED | `apify call apify/google-search-scraper` returned `Error: Monthly usage hard limit exceeded` again. `monthlyUsageUsd` = $5.004 / $5.00; cycle window April 7 → May 6, 2026. Alt actors blocked by account-wide cap. Phase 1 + 4 + 5 completed; Phase 2 skipped per spec fallback. |
| 2026-05-14 | how to value an AI company, AI valuation methods, data assets on balance sheet, using IP to raise funding, what investors look for in AI companies, AI know-how as asset, tech company valuation multiples, patent royalty rates by industry | ✅ SUCCESS | Quota healthy ($2.99 / $5.00; new cycle window May 7 → June 6, 2026). Returned 28 PAA questions across 8 seeds. After dedup vs T5-01→T5-25 + noise filter (off-topic generic-business + celebrity queries removed), 8 net-new rows added (T5-26 → T5-33). Direct HTTP `run-sync-get-dataset-items` against `apify~google-search-scraper`. |

### How to extend Tier 5

The SEO Strategist scheduled task re-runs PAA scraping every Mon/Thu. New rows are appended here with the scrape date. Covered rows get struck through + the slug added. The Blog Publisher treats 🟢 rows as first-class briefs equivalent to Tier 3 (AEO plays).
