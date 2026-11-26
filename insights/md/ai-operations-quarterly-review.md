---
title: "How to Run an AI Operations Quarterly Review That Actually Saves Money"
slug: ai-operations-quarterly-review
date: 2026-11-24
url: https://beyondelevation.com/insights/ai-operations-quarterly-review
author: Hayat Amin
site: Beyond Elevation
---

# How to Run an AI Operations Quarterly Review That Actually Saves Money

Most companies run between eight and fifteen AI projects at any one time. Gartner's 2026 AI in the Enterprise survey found that 54% of AI initiatives that reach pilot never make it to production, and 31% of those stay funded for over six months after they stall. This is an operations problem. Hayat Amin argues the fix is a better review cadence. A single quarterly meeting, run properly, catches the dead projects before they burn through another quarter of budget.

An AI operations quarterly review is a structured 90-minute meeting that evaluates every active AI initiative against three criteria, impact, adoption, and cost trajectory, and forces a keep, scale, or kill decision on each one. Beyond Elevation runs this process for portfolio companies, and the median finding in the first review is three dead projects still drawing compute and headcount.

## Why do most companies skip the AI operations review?

Most companies skip the AI operations review because nobody owns the AI portfolio end to end. Engineering owns the models. Product owns the features. Finance owns the budget. Nobody owns the operational layer that connects all three, the layer that answers whether this AI project is working, adopted, and worth what it costs to run.

Without that owner, AI projects get reviewed the same way as software features: by shipping milestones. But an AI project that shipped is not necessarily an AI project that works. A model in production that nobody uses is a cost centre. A model with 90% accuracy that the operations team ignores because they do not trust it is a cost centre. The quarterly review catches what milestone tracking cannot.

Hayat Amin's view: skipping the quarterly AI review is a strategy failure. Companies that treat AI spend like R&D and never audit it operationally will spend twice what they should and ship half of what they could.

## What should an AI operations quarterly review cover?

An AI operations quarterly review should cover four categories for every active AI initiative: performance metrics, user adoption, cost trajectory, and strategic alignment. Each category gets a single score. The scores produce a decision.

**Performance metrics.** Is the model doing what it was built to do? Measure accuracy, latency, error rate, and drift since last quarter. A model that was 94% accurate at launch and is now 87% accurate has a drift problem that will not fix itself. Surface it now or pay for it in six months.

**User adoption.** Are the people who were supposed to use this AI using it? Measure daily active users, task completion rate, and manual override frequency. A procurement AI that gets overridden 60% of the time is acting as a suggestion engine rather than an automation. The quarterly review forces an honest conversation about why adoption stalled and whether the fix is training, UX, or cancellation.

**Cost trajectory.** What does this AI initiative cost per month, compute, API calls, data pipeline maintenance, and the human time spent feeding, monitoring, and correcting it? Plot the trend over three quarters. If cost is rising faster than value delivered, the project is on a path to negative ROI regardless of how impressive the demo was.

**Strategic alignment.** Does this project still serve a business objective that matters? Companies pivot. Priorities shift. An AI project that made sense in Q1 may be irrelevant by Q4. The quarterly review forces the question: if we were starting from scratch today, would we fund this?

## What is Hayat Amin's AI portfolio triage method?

Hayat Amin's AI Portfolio Triage Method is a scoring framework that sorts every active AI project into one of three buckets after the quarterly review: scale, maintain, or kill. The method was developed during Beyond Elevation's work with mid-market companies running between five and twenty concurrent AI initiatives, where the typical finding was that 25% to 35% of active projects should have been killed at least one quarter earlier.

The triage runs on a simple matrix. Each project scores 1 to 5 on two axes: operational impact (measured by the four categories above) and strategic value (measured against the company's current top three priorities). Projects scoring 8 or above get scaled: more budget, more headcount, more integration. Projects scoring 5 to 7 get maintained at the same budget and scope, and come back for review next quarter. Projects scoring below 5 get killed outright, and the budget is reallocated within the same quarter.

The discipline is in the kill threshold. Hayat Amin reminds founders that most AI waste comes from projects nobody is willing to cancel. They sit in maintenance mode, drawing compute and engineering attention, and producing outputs nobody uses, because the sunk cost feels too high to write off. The triage method removes the emotion. A score below 5 is a kill, with no committee and no appeals process. The maths decides.

## How much dead AI spend does a quarterly review catch?

The numbers are consistent across the companies Beyond Elevation has run this process for. In a company spending between £200,000 and £1 million annually on AI initiatives, the first quarterly review typically identifies £50,000 to £250,000 in annual spend on projects that should be killed or consolidated. That is 15% to 30% of total AI spend recovered in a single meeting.

The savings compound. The first review catches the obvious dead projects, the ones everyone quietly knows are not working. The second review catches the slow decliners, projects where adoption peaked two quarters ago and has been falling since. By the third quarter, the review shifts from cleanup to optimisation: reallocating recovered budget into the projects that scored highest on the triage.

According to McKinsey's 2026 State of AI report, organisations with structured AI portfolio reviews achieve 2.3 times higher ROI from their AI investments than those without. The review doesn't improve the AI itself, only the portfolio around it. The maths is straightforward: killing a £80,000 per year dead project and moving that budget to a project generating £400,000 in annual savings is a five-to-one return on a decision that takes fifteen minutes in a meeting.

## Who should run the AI operations quarterly review?

The AI operations quarterly review should be run by whoever owns the operational layer of AI in the company, typically an AI operations lead, a fractional AI operations operator, or a chief technology officer with explicit AI portfolio ownership. The critical requirement is that the person running the review has visibility into engineering performance data, user adoption data, and financial cost data simultaneously. If those three datasets live in different departments with no single owner, the review will not work.

This is where most companies stall. They have engineers who can pull model metrics, product managers who can pull adoption numbers, and a finance team that can pull cost reports, but nobody who synthesises all three into a portfolio-level view. That synthesis role is exactly what an AI operations operator does. Hayat Amin showed this during one engagement where a mid-market SaaS company discovered that their three highest-cost AI projects had the lowest adoption rates. Nobody had connected the two datasets before because nobody's job description included both.

## What does the 90-minute meeting agenda look like?

The meeting runs quarterly, takes 90 minutes, and follows a fixed agenda that does not change.

**Minutes 1 to 10: portfolio overview.** The AI operations owner presents a one-page dashboard showing every active AI project with its current triage score, quarter-over-quarter trend, and total quarterly cost. No discussion yet, just data.

**Minutes 11 to 50: project-by-project review.** Each project gets three to five minutes. The project owner presents the four scores (performance, adoption, cost trajectory, strategic alignment). The AI operations owner presents the triage recommendation. The room confirms or challenges. Projects scoring below 5 get flagged for kill. This block covers eight to twelve projects in forty minutes.

**Minutes 51 to 70: kill and scale decisions.** The flagged projects get a final two-minute case from their project owner. If the score stays below 5, the project is killed and the budget is reassigned. Projects scoring 8 or above get a scale plan: what additional resources they need, what the expected return is, and who owns the expansion.

**Minutes 71 to 90: next-quarter pipeline.** Review any new AI initiatives proposed for the coming quarter. Each proposal must include a projected triage score at the 90-day mark. If the projected score is below 5, the project does not get funded. This prevents the portfolio from growing back to its pre-review size within a single quarter.



---

### Want this position in your company?

Beyond Elevation places exited C-suite operators into fractional executive positions: Chief Financial Officer, Chief IP Officer, AI Operations. A free 30 minute call, straight answer, no pitch. If there is nothing worth doing, we say so on the call.

[Book a free call →](https://beyondelevation.com/call)

---

## FAQ

### How often should you run an AI operations review?

Quarterly is the minimum cadence that catches declining projects before they waste a full budget cycle. Companies with more than fifteen active AI projects or monthly AI spend above £100,000 should consider monthly reviews using a lighter version of the same framework.

### What is the difference between an AI operations review and a sprint retrospective?

A sprint retrospective looks at how a team is building AI. An AI operations quarterly review looks at whether the AI is worth building at all. Retrospectives optimise execution, quarterly reviews optimise the portfolio, and you need both. Neither replaces the other.

### Can a CTO run the AI operations quarterly review?

Yes, if the CTO has access to adoption and cost data alongside engineering metrics. In practice, most CTOs are biased toward the technology and lack visibility into user adoption patterns and total cost of ownership. A dedicated AI operations lead or fractional AI operations operator produces better outcomes because the role is designed around the cross-functional view the review requires.

### What tools do you need for an AI operations quarterly review?

A single dashboard that shows model performance, user adoption, and cost per project is the minimum. Most companies build this in a spreadsheet for the first two quarters, then migrate to a monitoring tool like Datadog, Weights and Biases, or a custom internal dashboard once the review cadence is established. The tool matters less than the data. If you cannot pull all three datasets into one view, start there before you schedule the first meeting.

### How does Beyond Elevation help with AI operations reviews?

Beyond Elevation places fractional AI operations operators who own the full AI portfolio, from model performance to cost management to the quarterly review itself. The operator builds the dashboard, runs the triage, and makes the kill-or-scale recommendations. Book a call at [beyondelevation.com](https://beyondelevation.com) to see whether your AI portfolio has dead spend in it.

---
*Published on [Beyond Elevation](https://beyondelevation.com) — Fractional CFO, Chief IP Officer and AI Operations placements*
