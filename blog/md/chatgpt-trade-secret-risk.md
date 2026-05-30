---
title: "The Samsung Trade Secret Leak Cost Them Millions — Here Are the 6 ChatGPT Rules Every AI Startup Must Enforce By Monday"
slug: chatgpt-trade-secret-risk
date: 2026-05-30
url: https://beyondelevation.com/blog/post.html?slug=chatgpt-trade-secret-risk
author: Beyond Elevation Team
site: Beyond Elevation
---

# The Samsung Trade Secret Leak Cost Them Millions — Here Are the 6 ChatGPT Rules Every AI Startup Must Enforce By Monday

Samsung engineers pasted proprietary semiconductor source code into ChatGPT. Three separate incidents in under a month. The result: millions in damage, a company-wide ban on generative AI tools, and a case study every AI startup founder should memorize before their next standup. Hayat Amin argues this was not an IT failure — it was a trade secret failure. The moment confidential information enters a public LLM, the legal protection around it evaporates. Not temporarily. Permanently.

Does using ChatGPT destroy your trade secrets? The short answer is yes — if you input confidential information into a public large language model without enterprise-grade contractual protections, you have likely made a voluntary disclosure under the Defend Trade Secrets Act. And voluntary disclosure is the one mistake trade secret law does not forgive.

## Does Using ChatGPT Destroy Your Trade Secrets?

Yes. Inputting confidential business information into a public AI tool constitutes voluntary disclosure under the DTSA (18 U.S.C. § 1836), which requires trade secret holders to maintain "reasonable measures" to preserve secrecy. Pasting proprietary code, algorithms, training data, or strategic documents into ChatGPT is the opposite of a reasonable measure — and courts have already ruled accordingly.

The legal standard is unforgiving. A trade secret derives its value from not being generally known. The holder must take active, documented steps to keep it secret. When an employee feeds proprietary information into a third-party AI service, two things happen simultaneously: the information is transmitted to a third party's servers, and it may be logged, stored, or used in future model training. Both actions undermine the secrecy requirement.

Hayat Amin's view on this is direct: "Founders treat ChatGPT like a private notebook. It is not. It is a third-party service with terms of service that give the provider broad data rights. Every prompt you type is a potential disclosure — and one disclosure is all it takes to void protection permanently."

## What Happened in the Samsung ChatGPT Leak?

Samsung's semiconductor division lost trade secret protection on proprietary source code after three engineers independently pasted confidential materials into ChatGPT in early 2023. The incidents were not coordinated — they were the predictable result of a company with no AI-tool usage policy.

One engineer pasted source code to debug an error. Another uploaded code to optimize a test sequence. A third pasted meeting notes to generate a summary. Each time, proprietary information was transmitted to OpenAI's servers — logged and potentially ingested into training data.

Samsung banned ChatGPT and all external generative AI tools. But the damage was done. Information disclosed to a third party cannot be "un-disclosed." The trade secret status of the leaked code was compromised the moment it hit OpenAI's API endpoint. Samsung's internal investigation estimated the exposure in the millions — not from direct theft, but from the permanent loss of legal protections that made the information valuable.

## What Is the DTSA Voluntary Disclosure Waiver?

The Defend Trade Secrets Act voluntary disclosure doctrine holds that a trade secret loses its protected status when the holder fails to maintain reasonable measures of secrecy. Voluntarily transmitting confidential information to a third-party service — without contractual protections ensuring confidentiality — is the textbook definition of a failure to maintain reasonable measures.

Courts have already applied this doctrine to AI tools. In multiple DTSA cases since 2024, courts dismissed trade secret claims where plaintiffs had fed allegedly proprietary frameworks, algorithms, or business methodologies to OpenAI or other LLM providers. The reasoning was consistent: if you voluntarily submitted the information to a third party's servers, you cannot later claim it was secret.

The standard has teeth. A single act of voluntary disclosure can void protection for the specific information disclosed. This is not like a patent, where you can file and enforce selectively. [Trade secret protection is binary](https://beyondelevation.com/blog/posts/is-ai-a-trade-secret/) — either the information is secret, or it is not. There is no partial secrecy.

Hayat Amin reminds founders that the DTSA does not care about intent. An accidental paste into ChatGPT carries the same legal weight as a deliberate upload. "The statute protects secrets. If you stop keeping it secret — accidentally, negligently, or intentionally — the protection dies. Courts do not distinguish between a careless engineer and a malicious one when the result is the same: the information left the building."

## What Are the 6 ChatGPT Rules Every AI Startup Must Enforce?

Beyond Elevation developed Hayat Amin's Trade Secret Preservation Protocol after auditing 30+ AI startups and finding that 80% had no formal AI-tool usage policy. These six rules are the minimum defensible standard in 2026. Enforce them by Monday or accept the risk that your next ChatGPT prompt voids your most valuable IP.

**Rule 1: No proprietary materials in any public LLM.** This is the hard line. No source code, algorithms, training data, model weights, customer data, pricing models, internal strategies, or unpublished research enters ChatGPT, Claude, Gemini, or any other public AI service without an enterprise agreement that contractually guarantees data isolation. Write it into your acceptable-use policy in bold. Enforce it with technical controls — not just memos.

**Rule 2: Deploy self-hosted models for sensitive work.** Open-weight models like Llama, Mistral, and Qwen run on your own infrastructure. Data never leaves your environment. For sensitive engineering, legal, and strategic work, [self-hosted inference](https://beyondelevation.com/blog/posts/trade-secret-protection-ai-models/) is the only architecture that preserves trade secret status. The cost of running a 70B parameter model on-premises is under $5,000 per month. The cost of losing trade secret protection on your core IP is measured in millions.

**Rule 3: Classify and tag all trade secret materials.** Courts look for evidence that the holder treated the information as secret. That means formal classification: documents, repositories, databases, and codebases containing trade secrets must be tagged with "CONFIDENTIAL — Trade Secret" labels. Untagged information is harder to defend. Tagged information with access controls is the standard courts expect.

**Rule 4: Add AI-tool clauses to every NDA and employment agreement.** Standard NDAs drafted before 2023 do not address AI tools. Update every employee NDA, contractor agreement, and vendor contract to explicitly prohibit inputting confidential information into third-party AI services. Name the tools. Define the prohibition. Specify the consequences. Vague language like "maintain confidentiality" is not enough when the disclosure vector is a ChatGPT prompt bar.

**Rule 5: Run quarterly trade secret audits.** You cannot protect what you have not inventoried. Every quarter, audit which trade secrets exist, who has access, what tools employees are using, and whether any disclosures have occurred. Beyond Elevation runs these audits for AI startups as a core service — the output is a risk matrix that maps every trade secret to its current exposure level and the controls protecting it.

**Rule 6: Document your "reasonable measures" program.** The DTSA requires reasonable measures. Courts want a paper trail. Document your AI-tool usage policy, your classification system, your access controls, your training records, and your audit cadence. If litigation arrives, the first question opposing counsel asks is: "What measures did you take to protect this information?" A binder full of documented controls wins cases. A verbal policy loses them.

## Can Enterprise ChatGPT Agreements Save Your Trade Secrets?

Enterprise agreements with OpenAI, Anthropic, Google, and other LLM providers change the calculus — but only if the contractual terms explicitly guarantee data isolation. An enterprise tier that promises "your data is not used for training" is necessary but not sufficient. The agreement must also address data retention, deletion protocols, subprocessor access, and jurisdictional compliance.

Hayat Amin's checklist for evaluating enterprise AI agreements covers five non-negotiable terms: a contractual commitment that inputs are not used for training, a data retention policy with defined deletion timelines, subprocessor restrictions preventing third-party access, audit rights to verify compliance, and breach notification obligations. If an agreement lacks any of these five terms, it does not provide the contractual foundation required to maintain trade secret status under the DTSA.

The enterprise agreement is the minimum entry ticket — not a substitute for the six rules above. Companies that rely on contracts without operational controls build a defense courts will not trust.

## What Should You Do If a Trade Secret Was Already Disclosed to ChatGPT?

If proprietary information has already been entered into a public LLM, act within 48 hours. Document exactly what was disclosed, when, and by whom. Assess whether the information qualifies for trade secret protection under the DTSA's "derives independent economic value from not being generally known" standard. Contact the AI provider to request data deletion under their terms of service or applicable data protection law. Update your acceptable-use policy to prevent recurrence. And consult an IP strategist — not just a lawyer — to evaluate whether the disclosed information can be re-protected through alternative IP vehicles like patents or copyrights.

The hard truth: trade secret protection for the specific information disclosed is usually gone. [Beyond Elevation](https://beyondelevation.com) runs post-disclosure triage assessments that map the damage, identify surviving trade secrets, and recommend alternative IP vehicles for information that moved from the "secret" column to the "disclosed" column.

## FAQ

### Can you use ChatGPT with confidential data if you have an enterprise agreement?

An enterprise agreement that contractually prohibits using your data for model training and includes data isolation, deletion timelines, and audit rights can preserve trade secret status — but only if you also maintain operational controls (classification, access restrictions, employee training). The contract is necessary but not sufficient. Courts evaluate both contractual protections and operational practices when assessing "reasonable measures" under the DTSA.

### Does the DTSA voluntary disclosure rule apply outside the United States?

The DTSA is a U.S. federal statute. However, trade secret laws in the UK (Trade Secrets Regulations 2018), EU (Trade Secrets Directive 2016/943), and most other jurisdictions impose similar "reasonable measures" requirements. Voluntary disclosure to a third-party AI tool undermines trade secret protection under virtually every major trade secret regime globally. The Samsung ChatGPT incident triggered policy changes in South Korea, Japan, and the EU precisely because the legal risk is jurisdictionally universal.

### What happens if an employee accidentally pastes trade secrets into ChatGPT?

Accidental disclosure carries the same legal consequence as intentional disclosure under the DTSA. The statute does not distinguish between careless and malicious conduct — it asks only whether the holder maintained reasonable measures. If your company lacks an AI-tool usage policy, lacks classification protocols, and lacks technical controls preventing uploads, the "accidental" disclosure is evidence of insufficient reasonable measures. Prevent the accident with policies and controls, not apologies after the fact.

### Can you recover trade secret status after accidental disclosure?

In most cases, no. Once information is voluntarily disclosed to a third party without confidentiality protections, the secrecy element is destroyed. However, if the disclosure was limited in scope and you act immediately — requesting deletion, documenting the incident, and tightening controls — a court may consider the totality of circumstances. The best outcome is damage limitation, not full recovery. This is why prevention through the six rules above is non-negotiable.

### How does Beyond Elevation help AI startups protect trade secrets from ChatGPT risk?

Beyond Elevation runs trade secret audits that inventory every piece of protectable information, assess current exposure levels, evaluate AI-tool usage policies, and implement Hayat Amin's Trade Secret Preservation Protocol. The deliverable is a risk matrix with specific remediation actions — from policy drafts to technical controls to employee training programs. Startups that complete the audit close the gap between "we think our IP is protected" and "we can prove it in court." Book a consultation at [beyondelevation.com](https://beyondelevation.com).
