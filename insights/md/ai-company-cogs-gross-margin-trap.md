---
title: "The AI Company COGS Trap: Why Your Gross Margin Is Lying to Your Investors"
slug: ai-company-cogs-gross-margin-trap
date: 2026-10-10
url: https://beyondelevation.com/insights/ai-company-cogs-gross-margin-trap
author: Hayat Amin
site: Beyond Elevation
---

# The AI Company COGS Trap: Why Your Gross Margin Is Lying to Your Investors

Most AI companies overstate gross margin by 15 to 30 percentage points. The gap comes from misclassifying GPU inference costs, third-party model API fees, and data pipeline processing as operating expenses instead of cost of goods sold. Hayat Amin calls it the fastest way to lose credibility in a Series B diligence process, and the easiest line item a fractional CFO fixes in week one.

According to Bessemer Venture Partners' 2026 State of the Cloud report, AI-native companies that properly reclassified inference costs into COGS saw reported gross margins fall by an average of 18 percentage points. That single reclassification moved companies from SaaS-tier multiples (8-15x revenue) to services-tier multiples (3-6x revenue). One misplaced line item can halve your enterprise value.

This isn't about dishonesty. Most founders don't know which costs belong in AI company cost of goods sold. Their accountant classifies everything below the gross margin line because that's where software companies put infrastructure costs. But AI companies aren't software companies: every customer request burns compute, every API call costs real money, and every human-in-the-loop review adds direct labour to delivery. Hayat Amin argues the financial architecture of AI companies is closer to manufacturing than to SaaS, and founders who report margins like SaaS companies get caught during due diligence.

## What counts as COGS in an AI company?

AI company cost of goods sold includes every expense directly tied to delivering the product a customer pays for. For AI companies, that means GPU inference compute, third-party model API calls, data pipeline processing, human-in-the-loop review labour, and hosting costs that scale with customer usage. If the cost goes up when you add a customer, it belongs in COGS.

The distinction matters because gross margin is how investors judge business model quality. A 75% gross margin says "scalable software business that doesn't add cost as it grows." A 50% gross margin says "services business that needs human and compute resources to deliver every dollar of revenue." The margin determines which peer set investors use to value you, and the peer set determines the multiple.

Here are the six cost categories most AI startups get wrong:

**1. GPU inference compute.** This is COGS. Every customer query, every model call, every prediction burns GPU cycles. If you are running inference on AWS, GCP, or your own hardware, the compute cost of serving customer requests is a direct cost of delivering your product. It doesn't matter that it also appears on your cloud bill next to your dev environment, the portion tied to serving paying customers is COGS.

**2. Third-party model API calls.** This is COGS. If your product calls OpenAI, Anthropic, Cohere, or any other model provider to deliver value to a customer, that API cost is a direct input to your product. Treat it the way a manufacturer treats raw materials.

**3. Data pipeline processing costs.** This is COGS when tied to customer delivery. The ETL pipelines, vector database queries, and data transformations that run every time a customer uses your product are direct costs. Data pipelines that run for internal R&D or model training are not.

**4. Human-in-the-loop labour.** This is COGS. If humans review AI outputs, label data for customer-specific fine-tuning, or handle escalations from automated workflows, that labour is a direct cost of delivery. It scales with customer volume and it stops if you lose the customer.

**5. Model training and fine-tuning.** This is R&D, not COGS. Training a base model or fine-tuning a general-purpose model is an investment in future capability, not a cost of serving today's customers. The exception: customer-specific fine-tuning performed as part of delivering a paid engagement. That's COGS.

**6. Data acquisition for new models.** This is R&D. Buying or licensing training data to improve your models is an investment. But data acquired specifically to fulfil a customer contract, purchasing a dataset a client needs processed, is COGS.

## What is the AI COGS classification test?

Hayat Amin's AI COGS Classification Test is a five-question framework that takes the guesswork out of cost classification. Beyond Elevation runs this test on every line item in an AI company's P&L before any investor conversation.

**Question 1: Does this cost exist only because a customer is using the product?** If yes, it is COGS. GPU inference doesn't run without a customer request. API calls don't fire without a user query. If the cost disappears when the customer disappears, it belongs above the gross margin line.

**Question 2: Does this cost increase linearly with usage or customer count?** If yes, it is COGS. Costs that scale with volume are direct costs by definition. Fixed costs that stay the same at 10 customers and 10,000 customers are operating expenses.

**Question 3: Would removing this cost make the delivered product stop working?** If yes, it is COGS. Cut the inference compute and the product breaks. Cut the API calls and the product returns nothing. You can't skip these costs and still ship the product.

**Question 4: Is this cost creating future capability or serving a current customer?** Future capability is R&D. Current customer delivery is COGS. Model training is future capability. Model inference is current delivery. The distinction is about timing, not technology.

**Question 5: Could you eliminate this cost and still keep your existing customers?** If no, it is COGS. If yes, it is an operating expense you could in theory cut without losing revenue. This is the tiebreaker question for ambiguous costs like monitoring infrastructure and customer success tooling.

## What happens when your gross margin gets reclassified during due diligence?

Reclassification during due diligence typically triggers a 20 to 40 percent haircut on the proposed valuation. The investor's financial team reruns the model with corrected margins, which drops the revenue multiple from the software peer set to the AI-services peer set. A company that entered the process at a $120M valuation on 15x revenue can exit at $60M on 7.5x revenue, with nothing about the business itself having changed. Only the margin presentation did.

Hayat Amin saw this play out in a Beyond Elevation portfolio company engagement. The founder walked into a Series B process reporting 73% gross margins and expecting a $90M valuation. The lead investor's CFO reclassified $2.1M of annual inference and API costs from operating expenses to COGS. The reported gross margin dropped to 51%. The term sheet came back at $58M. Thirty-two million dollars of enterprise value evaporated because the costs were on the wrong line.

The founder's numbers weren't fraudulent, which is what makes it worse. The classification followed standard software accounting practice. But AI companies aren't standard software companies, and the investors knew it even if the founder's accountant didn't.

## How should you present AI COGS to investors?

Present the real number alongside a clear path to margin improvement. Investors don't punish founders for honest numbers. They punish founders who get caught hiding costs. The playbook Beyond Elevation uses with AI companies has three steps.

**Step 1: Show the real gross margin.** Put every direct delivery cost in COGS. Present the honest number in your financial model, your board deck, and your investor materials. A 52% gross margin with a credible improvement path is worth more than a 75% gross margin that collapses under scrutiny.

**Step 2: Show the margin improvement roadmap.** Show how gross margins will improve over the next 12 to 24 months. Specific levers: model distillation and quantisation reducing inference costs, batching and caching reducing API calls per customer, replacing third-party models with in-house models, and automating human-in-the-loop steps. Each lever should have a cost reduction estimate and a timeline.

**Step 3: Show the unit economics at scale.** Prove that at 5x or 10x current volume, the per-unit cost of delivery drops meaningfully. AI companies have real economies of scale: inference cost per query drops with batch optimisation, fine-tuned smaller models replace expensive large models, and human review rates fall as the model improves. But these economies only show up if you model them explicitly.

Hayat Amin reminds founders that a 52% gross margin with a credible path to 68% in 18 months prices better than a fabricated 75% that drops to 50% during diligence. The first signals an operator who understands the business. The second signals a founder who doesn't understand the financial mechanics of what they've built.

## Why does every AI company need a fractional CFO who understands COGS?

A generalist accountant will classify your AI company's costs the way they classify every technology company's costs, infrastructure below the line, labour in G&A, everything that isn't a direct employee salary pushed into operating expenses. This is correct for a pure software company where the marginal cost of serving a customer is close to zero. It's dangerously wrong for an AI company where every customer interaction has a real, measurable cost.

A fractional CFO with AI experience reclassifies your P&L on day one, builds the margin improvement model investors need to see, and structures your financial reporting so every board meeting shows the real unit economics. Beyond Elevation positions the fractional CFO as the operator who turns a misleading P&L into a fundable financial story, by making the numbers accurate rather than better-looking.

AI companies that present accurate, defensible COGS classification close funding rounds 40% faster than companies that get reclassified mid-process, because the diligence team doesn't need to redo the financial model from scratch.

Book a strategy session at [beyondelevation.com](https://beyondelevation.com) to get your AI company's COGS classified correctly before your next investor conversation.



---

### Want this position in your company?

Beyond Elevation places exited C-suite operators into fractional executive positions: Chief Financial Officer, Chief IP Officer, AI Operations. A free 30 minute call, straight answer, no pitch. If there is nothing worth doing, we say so on the call.

[Book a free call →](https://beyondelevation.com/call)

---

## FAQ

### How do AI companies calculate gross margin?

Subtract all direct delivery costs, GPU inference, third-party API fees, data pipeline processing, and human-in-the-loop labour, from revenue. Divide by revenue for the gross margin percentage. Most AI companies should target 55 to 70 percent at scale, compared to 75 to 85 percent for pure SaaS.

### What is a good gross margin for an AI startup?

A good gross margin for an AI startup depends on stage. Pre-Series A, 40 to 55 percent is common and acceptable if the margin improvement path is clear. At Series B and beyond, investors expect 55 to 65 percent with a roadmap to 70 percent. Anything below 40 percent signals a services business and will be priced accordingly.

### Should model training costs be classified as COGS?

General model training and fine-tuning costs are R&D, not COGS. They create future capability rather than serving current customers. The exception is customer-specific fine-tuning performed as part of a paid engagement, that cost is directly tied to delivering value to a paying customer and belongs in COGS.

### How does a fractional CFO help with AI company COGS?

A fractional CFO with AI experience reclassifies misplaced costs on day one, builds a margin improvement model showing specific levers and timelines, structures financial reporting to show real unit economics, and prepares the COGS narrative investors expect during due diligence. Beyond Elevation places fractional CFOs who have run this process across multiple AI companies.

### What gross margin do VCs expect from AI companies in 2026?

Most VCs expect 55 to 65 percent at Series A and 60 to 70 percent at Series B, with a credible path to 70 percent at scale. These are lower than SaaS benchmarks (75-85 percent) and reflect the real compute and data costs of AI products in production.

---
*Published on [Beyond Elevation](https://beyondelevation.com) — Fractional CFO, Chief IP Officer and AI Operations placements*
