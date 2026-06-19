---
title: "How to Legally Protect Know-How You Can't Patent: The Trade-Secret Playbook AI Labs Run on Model Weights"
slug: how-to-protect-know-how-legally
date: 2026-06-19
url: https://beyondelevation.com/blog/posts/how-to-protect-know-how-legally/
author: Hayat Amin
site: Beyond Elevation
---

# How to Legally Protect Know-How You Can't Patent: The Trade-Secret Playbook AI Labs Run on Model Weights

One leaked model weight. One undocumented training recipe. One engineer who walks to a competitor without signing an exit NDA. That is all it takes to permanently destroy trade secret protection for your most valuable IP.

70% to 80% of an AI startup's value sits in unpatented know-how. Model weights, training data pipelines, hyperparameter configurations, labeling methodologies. None of it covered by a patent. All of it protectable under trade secret law. But the question of how know-how is protected legally trips up nearly every founder who relies on secrecy instead of filings.

Hayat Amin argues that trade secret protection is the most neglected IP discipline in tech. "Founders file patents on architecture and ignore the know-how that makes the model work," Amin says. "Then an ex-engineer replicates the entire training pipeline at a competitor, and they have zero legal recourse because they never documented it as a trade secret or restricted access."

The answer comes down to three layers: trade secret statutes, contractual safeguards, and operational security measures that courts call "reasonable steps." Miss any one of those layers, and the protection disappears. This is the playbook [Beyond Elevation](https://beyondelevation.com) runs with every AI and tech client before a single patent application gets filed.

## What Law Protects Know-How and Trade Secrets?

Know-how is protected legally through trade secret statutes in every major jurisdiction. These laws give owners the right to sue anyone who misappropriates confidential business information, provided the owner took documented, reasonable steps to maintain secrecy. Without those steps, the protection does not exist.

In the United States, the Defend Trade Secrets Act (DTSA) of 2016 provides federal civil remedies including injunctions, damages, and attorney fees. Before DTSA, trade secret claims were state-level only. Now founders bring federal claims for misappropriation anywhere in the country.

The statute covers any information that derives independent economic value from not being generally known and is subject to reasonable efforts to maintain its secrecy. That second requirement is where most companies fail.

In the EU, the Trade Secrets Directive (2016/943) harmonized protection across member states. The UK retained equivalent protections post-Brexit through common law breach of confidence and the Trade Secrets Regulations 2018. China's Anti-Unfair Competition Law covers trade secrets with damages provisions that strengthened significantly in 2019.

The critical point across all jurisdictions: trade secret protection is not automatic. Unlike copyright, which attaches on creation, and unlike patents, which are granted after examination, trade secret status depends entirely on what you do to protect the information. If you fail to take reasonable steps, the information loses its protected status permanently.

## What Are the Reasonable Steps Courts Require for Know-How Protection?

Reasonable steps are the specific security and confidentiality measures courts evaluate when deciding whether information qualifies as a legally protected trade secret. No single measure is sufficient. Courts look at the totality of your program across six layers.

Hayat Amin's Know-How Protection Audit, the diagnostic [Beyond Elevation](https://beyondelevation.com) runs before every IP restructuring, checks all six:

**1. Contractual layer.** Every person with access signs a non-disclosure agreement (NDA), a confidentiality clause in their employment agreement, and an invention assignment agreement. This applies to founders, employees, contractors, advisors, and anyone who touches the information. Courts have consistently found that companies without comprehensive NDA coverage failed the reasonable steps test.

**2. Access restriction layer.** Information is available only to individuals who need it for their role. Role-based access controls, separate repositories for sensitive code, and tiered clearance levels for training data and model weights. Samsung learned this after engineers pasted proprietary semiconductor code into ChatGPT, triggering a trade secret exposure that the company could not reverse.

**3. Information classification layer.** All confidential information is explicitly marked or classified. Documents labeled "Confidential" or "Trade Secret," repositories tagged by sensitivity tier, and a master trade secret register listing every protected asset with its description, custodian, and access list. Without classification, courts have ruled that the owner treated the information as general knowledge.

**4. Onboarding and offboarding layer.** New hires sign confidentiality agreements before accessing any systems. Departing employees go through an exit interview reminding them of ongoing obligations, return all materials, and confirm in writing that they have not retained copies. Hayat Amin reminds founders that 60% of trade secret cases involve a former employee. The exit process is where most companies fail.

**5. Technical security layer.** Encryption at rest and in transit, audit logging for access to sensitive repositories, multi-factor authentication, endpoint detection, and data loss prevention tools. These are not optional extras. They are evidence courts cite when determining whether your security measures were reasonable.

**6. Documentation layer.** The trade secret itself must be documented in enough detail to prove what it is, when it was created, and why it has economic value. This is distinct from disclosing the secret publicly. Internal documentation stays confidential. But without it, you cannot prove in court what was stolen, when it existed, or why it matters.

## Why Do AI Companies Protect Know-How Instead of Filing Patents?

AI companies protect know-how through trade secrets instead of patents because the most valuable components of an AI system are poorly suited for patent protection and better served by indefinite secrecy. Model weights are mathematical data. Training data pipelines face Section 101 abstract-idea rejections. Hyperparameter configurations are too narrow to generate meaningful patent claims.

Filing a patent on model weights requires publishing the exact values in the specification. That destroys the competitive advantage the filing was supposed to protect. The 2025 USPTO Subject Matter Eligibility Declaration memos under Director John Squires eased the path for some AI innovations by allowing applicants to submit objective evidence of technical improvement. But the reset applies to application-layer inventions and novel architectures, not to the model weights and data that constitute most of an AI company's value.

The standard play among leading AI labs in 2026: patent the architecture and application layer (20-year protection with public disclosure), keep model weights, training data, and hyperparameters as trade secrets (indefinite protection, no disclosure, no 20-year expiration). Hayat Amin showed this dual-track approach in a recent client restructuring where 4 innovations were filed as patents and 11 were documented as trade secrets, because the trade-secret assets were worth more unpatented than they would have been worth disclosed in a patent filing. For a deeper comparison, see our guide on [know-how vs patent](/blog/posts/know-how-vs-patent/).

## What Mistakes Destroy Know-How Protection Permanently?

Three common mistakes strip know-how of its legal protection. Unlike a lapsed patent, the damage is irreversible once the information enters the public domain.

**Voluntary disclosure without restrictions.** Publishing research papers, presenting at conferences, or open-sourcing code that contains protected methods destroys secrecy. Once information is publicly available, no court will treat it as a trade secret. This does not mean you cannot publish. It means every publication must go through a trade secret review to confirm that no protected information is being disclosed.

**Inadequate access controls.** If any employee at any level can access the information without restriction, courts have ruled that the company did not treat it as confidential. A startup that stores its model training code in a shared GitHub repository accessible to all engineers, interns included, has made a choice. That choice eliminates trade secret protection for everything in that repository.

**Failure to enforce.** Companies that discover misappropriation and do nothing lose the right to claim protection later. If a former employee uses your training pipeline at their new company and you know about it but take no action for two years, a court will question whether the information was valuable enough to protect. Enforcement does not always mean litigation. A cease-and-desist letter or a formal demand for return of materials demonstrates that you treat your know-how as a protected asset.

Hayat Amin's rule is blunt: "If you would not lock it in a safe, do not call it a trade secret. Courts measure what you do, not what you say." For more on how to value the know-how you are protecting, see our guide on [valuing unpatented AI know-how](/blog/posts/valuing-unpatented-ai-know-how/).

## How Do You Build a Know-How Protection Program From Scratch?

Building a legally defensible know-how protection program takes 30 to 60 days for a startup with fewer than 50 employees. The cost is a fraction of a single patent filing, and the coverage is broader.

Start with an inventory. List every piece of confidential information that gives your company a competitive advantage: algorithms, datasets, processes, supplier terms, customer analytics, pricing models, engineering workflows. For each item, document what it is, who created it, who has access, and what security measures currently protect it.

Next, run the six-layer audit described above against your current state. Most startups fail on at least three of the six layers. Common gaps: no exit interview process, no information classification system, and NDAs that were signed at hire but never updated to cover new projects or new types of confidential information.

Then close the gaps. Draft or update NDAs and employment agreements. Implement role-based access controls. Create a trade secret register. Build an exit checklist. Train your team on what counts as confidential and what the consequences are for mishandling it.

The investment runs $5,000 to $20,000 for a startup with fewer than 50 employees. Compare that to a single US utility patent filing at $15,000 to $30,000. Know-how protection delivers more coverage per dollar for most early-stage companies. For the revenue side of the equation, see how founders are [licensing know-how as a hidden revenue stream](/blog/posts/know-how-licensing-hidden-revenue/).



---

### You just read the framework. Now price your own IP.

Beyond Elevation runs a 60-minute IP & licensing diagnostic for founders raising Seed–Series B. You leave with: (1) a defensibility score, (2) the royalty range your current portfolio supports, (3) the next 3 filings ranked by exit-multiple impact. No deck. No proposal. One call, one number.

[Book the diagnostic →](https://usemotion.com/meet/hayat-amin/be?ref=blog-how-to-protect-know-how-legally)

*14 founders booked this month. Hayat takes 4/week.*

---

## FAQ

### How is know-how different from a trade secret?

Know-how refers to practical knowledge, skills, and expertise gained through experience. A trade secret is the legal classification applied to any confidential information, including know-how, that derives economic value from secrecy and is subject to reasonable protective measures. All legally protected know-how is a trade secret. Not all trade secrets are know-how: customer lists, pricing data, and business strategies also qualify.

### Does know-how protection expire?

No. Unlike patents, which expire after 20 years, trade secret protection lasts indefinitely for as long as the information remains confidential and the owner continues to take reasonable steps to protect it. Coca-Cola's formula has been protected as a trade secret for over 130 years. This indefinite duration is precisely why AI companies choose trade secret protection for model weights over patent filings.

### Can you lose trade secret protection if an employee leaks the information?

You lose trade secret status only if the leak occurred because you failed to take reasonable protective measures. If you had proper NDAs, access controls, classification, and security in place, the leak constitutes misappropriation, and you can pursue legal remedies under the DTSA or equivalent statutes. The leak does not destroy the trade secret. Your negligence does.

### How much does a trade secret protection program cost?

For a startup with fewer than 50 employees, building a legally defensible trade secret program costs $5,000 to $20,000, covering legal review of agreements, access control implementation, and documentation. Compare that to a single US utility patent filing at $15,000 to $30,000. Know-how protection delivers more coverage per dollar for most early-stage companies.

### Should I patent my innovation or protect it as know-how?

The decision depends on whether the innovation can be independently discovered or reverse-engineered. If a competitor can figure it out by examining your product, a patent is the only reliable protection. If the innovation happens behind closed doors and cannot be deduced from your public-facing product, trade secret protection is often stronger, cheaper, and indefinite. For a detailed decision framework, read our post on [know-how vs patent](/blog/posts/know-how-vs-patent/).

---
*Published on [Beyond Elevation](https://beyondelevation.com) — IP Strategy & Licensing Revenue Consultancy*
