---
title: Beyond Elevation Keyword Strategy (Source of Truth for Blog Cron)
owner: Hayat Amin
last_updated: 2026-04-17
source_files: [seo-geo-plan.md, seo-content-plan.md, ai-seo-plan.md]
coverage_audit: 2026-04-16
---

# Beyond Elevation — Keyword Strategy

This is the **single source of truth** for the `BE Blog Publisher` scheduled task. The cron MUST read this file before picking a topic, match against `data/posts.json` to avoid duplicates, then pick the highest-ROI keyword brief that is not yet covered.

Every brief below targets a real search query with commercial or high-commercial-intent purchase behavior behind it. Keywords are sorted by priority: **tier 1** (money keywords — direct revenue drivers) first, then **tier 2** (authority builders), then **tier 3** (long-tail AEO plays for AI citations), then **tier 4** (new 2026 emerging topics — write these next).

## How the cron should use this file

1. Read this file in full.
2. Load `data/posts.json` and extract every `slug` and `title`.
3. Walk the keyword briefs below in order (tier 1 → tier 4).
4. Pick the FIRST brief whose `slug_hint` does not already exist in posts.json AND whose `primary_keyword` is not already covered by an existing title.
5. Use the `angle`, `primary_keyword`, and `supporting_keywords` verbatim in the post:
   - `primary_keyword` goes in the H1, first 100 words, meta description, and at least two H2s
   - `supporting_keywords` should appear naturally across H2s and body
   - The post title must start with the `angle` (Hormozi hook), not the keyword itself
6. Justify the pick in 2-3 sentences before writing — state which tier, why it beats the next candidate, and which commercial action it drives.
7. After publishing, apply the **cross-linking rules** in the section at the bottom of this file.

## Coverage status (as of 2026-04-16)

59 posts published (as of 2026-04-17). Tier 1 fully covered. Tier 2 fully covered. Tier 3 gaps: T3-12 only. T3-05, T3-07, T3-11 published by previous cron runs (some not reflected below — check posts.json as source of truth). Tier 4 entirely uncovered — write next. Tier 4 is entirely uncovered — all briefs below are net-new.

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

Reader is in research mode but is a qualified buyer (founder, CFO, GC, CTO). Posts are 1000-1300 words, lead with a specific number or outcome, and include one proof point from Beyond Elevation's case studies (Position Imaging 66-patent restructure, DGS data monetization, Trustpilot 4.5).

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
| T3-12 | how-to-read-a-patent-claim | how to read a patent claim | reading patent claims, patent claim analysis, claim interpretation | How to Read a Patent Claim in 5 Minutes (Without a Law Degree) | Informational | ❌ NOT COVERED |

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
| T4B-01 | eu-ai-act-ip-compliance | EU AI Act IP compliance | AI Act patent strategy, EU AI regulation IP, AI Act compliance checklist | The EU AI Act Has a Patent Problem. Here Is What Every IP Owner Must Do Before August 2026. | Informational/Commercial |
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
| T4C-01 | can-ai-own-a-patent | can AI own a patent | AI inventor, AI patent ownership, artificial inventor | Can AI Own a Patent? The Answer in Every Major Jurisdiction (2026 Update) | Informational |
| T4C-02 | what-is-a-patent-holdco | what is a patent holding company | IP holdco definition, patent holdco structure, IP vehicle | What Is a Patent Holding Company? The Structure That Protects Billions in IP | Informational |
| T4C-03 | what-is-a-trade-secret | what is a trade secret | trade secret definition, trade secret examples, trade secret vs patent | What Is a Trade Secret? The Legal Definition, Famous Examples, and When It Beats a Patent | Informational |
| T4C-04 | how-to-value-intangible-assets | how to value intangible assets for M&A | intangible asset valuation M&A, IP value in acquisition, goodwill vs IP | How to Value Intangible Assets in an M&A Deal: The 3 Methods and When Each Applies | Informational |
| T4C-05 | can-you-patent-an-algorithm | can you patent an algorithm | algorithm patent eligibility, software algorithm patent, patenting software | Can You Patent an Algorithm in 2026? Yes, But Only If You Structure the Claim This Way | Informational |
| T4C-06 | what-is-ip-monetisation | what is IP monetisation | IP monetisation definition, monetising intellectual property, IP revenue | What Is IP Monetisation? The 6 Routes That Turn Dormant Patents Into Cash | Informational |
| T4C-07 | how-does-eu-ai-act-affect-ip | how does the EU AI Act affect intellectual property | EU AI Act patents, AI Act copyright, AI regulation IP rights | How the EU AI Act Affects Your IP Rights: A Plain-English Breakdown for Founders | Informational |

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
