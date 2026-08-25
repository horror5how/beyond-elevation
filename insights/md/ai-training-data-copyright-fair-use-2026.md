---
title: "Three Courts Killed the Fair Use Defense for AI Training Data. Your Model Has the Same Exposure."
slug: ai-training-data-copyright-fair-use-2026
date: 2026-08-24
url: https://beyondelevation.com/insights/ai-training-data-copyright-fair-use-2026
author: Hayat Amin
site: Beyond Elevation
---

# Three Courts Killed the Fair Use Defense for AI Training Data. Your Model Has the Same Exposure.

In 2025 and 2026, three federal courts rejected the fair use defense for AI companies that trained models on copyrighted content. Statutory damages in US copyright law run up to $150,000 per willfully infringed work. If your training pipeline ingests 10,000 copyrighted articles, your theoretical exposure is $1.5 billion. That number is not hypothetical. It is on the complaint in NYT v. OpenAI.

Hayat Amin argues that fair use is a litigation defense, not a business strategy. "Founders treat fair use like a permission slip," Amin says. "It is not. It is an argument you make after you have already been sued, and in 2026, courts are rejecting it for AI training more often than they accept it." Beyond Elevation now runs an AI training data copyright audit on every AI company that walks through the door, because the exposure sits in the training pipeline, not the product.

## Is AI Training on Copyrighted Data Automatically Fair Use?

No. AI training on copyrighted data is not automatically fair use under US copyright law. The fair use doctrine requires a case by case analysis under four statutory factors, and recent rulings show courts applying those factors against AI companies more often than founders expect. The default assumption that ingesting copyrighted content to train a model is "transformative" enough to qualify as fair use collapsed in 2025 when Thomson Reuters v. ROSS Intelligence reached its final judgment.

The Thomson Reuters ruling was the first to squarely hold that copying copyrighted text to train an AI system is not fair use when the AI's output competes in the same market as the original. The court found that ROSS Intelligence copied Westlaw headnotes to train a competing legal research tool, and that the commercial purpose plus the direct market substitution effect outweighed any transformative argument.

Two additional rulings in the Southern District of New York reinforced the pattern. In Concord Music Group v. Anthropic, the court denied a motion to dismiss copyright claims based on AI training data ingestion. In NYT v. OpenAI, the court allowed the case to proceed past the pleading stage, rejecting OpenAI's argument that its use of Times articles was transformative because the outputs served a different purpose than the originals. The court noted that ChatGPT's ability to reproduce near verbatim excerpts of Times articles undermined any transformative use claim.

## How Does the Four Factor Fair Use Test Apply to AI Training Data Copyright?

The four factor test under 17 USC 107 weighs purpose and character of the use, nature of the copyrighted work, amount used, and market effect. For AI training, each factor now leans against the defendant in most commercial contexts. Here is how courts have analyzed each one in AI training data copyright cases.

**Factor 1: Purpose and character.** Courts ask whether the use is transformative. AI companies argue that training is transformative because the model learns patterns rather than copying expression. Courts have responded that when the model's outputs compete with the original works, the transformation is insufficient. Commercial purpose weighs against fair use, and every venture backed AI company is commercial by definition.

**Factor 2: Nature of the copyrighted work.** Creative and factual works receive different protection levels. Training on factual databases (court opinions, scientific papers) gives a stronger fair use argument than training on creative works (novels, journalism, music). Most AI training datasets contain both, which complicates the analysis.

**Factor 3: Amount and substantiality.** AI training typically ingests entire works. Courts have consistently held that copying the whole work weighs against fair use, even when the copying is for a different purpose. The "we only used it for training" argument does not overcome the fact that the entire work was reproduced in the process.

**Factor 4: Market effect.** This is where AI training data copyright cases have been decided. When an AI model's outputs compete with the original works or substitute for them in the market, factor four weighs heavily against fair use. Hayat Amin reminds founders that VCs now ask about training data provenance during due diligence. "An investor who discovers uncleared copyrighted material in your training set does not see a legal technicality," Amin says. "They see a balance sheet liability that could exceed your entire valuation."

## What Does AI Training Data Copyright Exposure Actually Cost a Startup?

The financial exposure from AI training data copyright infringement breaks into three categories, and each one alone can end a company. Statutory damages under US copyright law range from $750 to $30,000 per work infringed, increasing to $150,000 per work for willful infringement. A training dataset of 100,000 copyrighted works at the willful rate produces a $15 billion theoretical exposure.

Injunctive relief is the second risk. A court can order you to stop using the model entirely if it was trained on infringing material. In the music industry, courts have ordered the destruction of infringing recordings. The same logic applies to AI models trained on copyrighted data. Your model is the recording.

The third cost is deal death. [IP due diligence in AI acquisitions](/blog/posts/ai-due-diligence-ma-framework/) now includes a training data provenance review as a standard checklist item. Acquirers who find uncleared copyrighted material in the training pipeline either kill the deal or demand a 30 to 50 percent price reduction to cover indemnification risk. Beyond Elevation has seen three acquisition negotiations stall in 2026 over training data copyright questions that the seller could not answer.

## How Should AI Founders Handle Training Data Copyright Risk?

The founders who eliminate AI training data copyright risk do four things, in this order. Hayat Amin's AI Training Data Provenance Audit is the framework [Beyond Elevation](https://beyondelevation.com) runs on every AI client, and it catches the exposure before investors or acquirers find it.

**Step 1: Map every data source in your training pipeline.** Document where each dataset came from, what license or terms govern it, and whether the content is copyrighted. Most founders cannot answer this question for more than half their training data. That gap is the liability.

**Step 2: Classify each source by copyright status.** Public domain, Creative Commons licensed, commercially licensed, and uncleared copyrighted. The uncleared bucket is your risk. If it represents more than 20 percent of your training data by volume, your exposure is material and must be disclosed to investors.

**Step 3: License or replace the uncleared content.** [Data licensing agreements](/blog/posts/data-licensing-agreement-7-clauses-2026/) with content owners cost a fraction of litigation. A typical enterprise data licensing deal runs $200,000 to $2 million per year. Compare that to $150,000 per work in statutory damages. The economics are not close. For content you cannot license, replace it with [synthetic data](/blog/posts/synthetic-data-ip-ownership-2026/) or properly licensed alternatives.

**Step 4: Build a provenance record that survives due diligence.** Document every training data source, its license status, the date it was acquired, and the terms under which you use it. This record becomes the exhibit your lawyers hand to acquirers and the artifact VCs review before writing a term sheet. Hayat Amin calls this the "training data clean room record" and argues it is now as important as your cap table for AI companies raising Series A and beyond.

## What About Open Source and Creative Commons Training Data?

Open source code and Creative Commons content are not a free pass for AI training. Open source licenses like GPL and AGPL contain copyleft provisions that may require you to open source any derivative work, and courts have not definitively ruled whether an AI model trained on GPL code is a derivative work. The risk is real enough that cautious founders isolate GPL trained model components behind API boundaries.

Creative Commons licenses vary by type. CC0 (public domain dedication) is safe. CC BY (attribution) requires crediting the author, which is impractical in AI training contexts. CC BY NC (non commercial) prohibits commercial use entirely, and every venture backed AI company is commercial. [AI training data valuation](/blog/posts/ai-training-data-valuation/) depends on the license terms, and a dataset with mixed CC licenses is worth less than a cleanly licensed one.

Hayat Amin says the open source question will be the next major AI copyright battleground. "The companies that audit their training data provenance now, before a ruling forces them to, are the ones that will still have a defensible model in 2028," Amin argues. "The ones that wait will be retraining from scratch on licensed data while their competitors are already in market."



---

### Want this position in your company?

Beyond Elevation places exited C-suite operators into fractional executive positions: Chief Financial Officer, Chief IP Officer, AI Operations. A free 30 minute call, straight answer, no pitch. If there is nothing worth doing, we say so on the call.

[Book a free call →](https://beyondelevation.com/call)

---

## FAQ

### Can you train an AI model on copyrighted data without permission?

You can, but you bear the legal risk. There is no blanket permission or exemption for AI training under US copyright law. Whether your specific use qualifies as fair use depends on the four factor test applied to your particular facts. Recent court rulings have rejected the fair use defense for commercial AI training that competes with the original works.

### Does the EU AI Act address AI training data copyright?

The EU AI Act does not directly resolve copyright questions, but the EU Copyright Directive includes a text and data mining exception that allows training on lawfully accessed content for research purposes. Commercial AI training may not qualify for this exception, and the interaction between the AI Act transparency requirements and copyright obligations is still being litigated.

### How much does it cost to license training data instead of scraping it?

Enterprise data licensing deals typically run $200,000 to $2 million per year depending on volume, exclusivity, and use rights. Compare that to statutory damages of $750 to $150,000 per copyrighted work infringed. For a training set of 50,000 works, licensing is orders of magnitude cheaper than losing a copyright case.

### What happens if a court finds my AI model was trained on infringing data?

Potential outcomes include statutory damages up to $150,000 per work willfully infringed, an injunction requiring you to stop using the model, destruction of the infringing model, and payment of the plaintiff's attorney fees. In practice, most AI copyright cases settle, but the settlement amounts are substantial and typically include ongoing licensing fees.

### Should I disclose AI training data sources to investors?

Yes. Investors increasingly ask about training data provenance during due diligence. Undisclosed copyright risk in your training pipeline is a material liability that can reduce your valuation by 30 to 50 percent or kill the deal entirely. Proactive disclosure with a clean provenance record demonstrates operational maturity and reduces investor risk perception.

---
*Published on [Beyond Elevation](https://beyondelevation.com) — Fractional CFO, Chief IP Officer and AI Operations placements*
