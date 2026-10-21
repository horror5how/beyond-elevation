---
title: "How much does it cost to build an AI system? The five lines on the bill, priced"
slug: how-much-does-it-cost-to-build-an-ai-system
date: 2026-10-21
url: https://beyondelevation.com/insights/how-much-does-it-cost-to-build-an-ai-system
author: Hayat Amin
site: Beyond Elevation
---

# How much does it cost to build an AI system? The five lines on the bill, priced

For a small or mid sized company, a custom AI system costs about 20,000 dollars in year one for the example in this piece. The build accounts for most of that. Model, database and hosting fees run from 50 to about 200 dollars a month. The engineer's time is the bill, and most quotes hide that.

Hayat Amin has spent twenty years as a technology chief financial officer and sold three companies, so he prices an AI system the way a buyer prices a business: line by line, with the assumptions written next to the numbers. He now builds these systems inside companies himself. Every price below was read on the vendor's own page on 21 October 2026. Where a figure is our arithmetic or our assumption, we say so.

## what counts as an AI system

An AI system here means software your company owns that reads your own records and does something with them. It answers a staff question from your contracts, drafts a reply from your order history, or reads a supplier invoice and writes it into QuickBooks. It's built for you, on your data, and it connects to the systems you already run.

That's different from a single automation. If you want one step joined to another in Zapier or Make, read [how much AI automation costs](/insights/how-much-does-ai-automation-cost/) instead, because the numbers are smaller and the platforms do most of the work. And it's different from buying seats in a tool like Microsoft 365 Copilot, which we price further down so you can compare.

## the five lines on the bill

Every custom AI system has five costs, whether the quote lists them or not:

- The build: an engineer's hours turning your process into working software.

- The model: a per use charge each time the system reads or writes.

- The search index: where your documents are stored so the system can find the right page.

- The hosting: the database and server the system runs on.

- The upkeep: hours each month when a document format, a system or a model changes.

Ask any supplier for all five on one page. If a quote shows only the build, you're about to find the other four on your card statement.

## the build, priced

The build is time, so price the time. The US Bureau of Labor Statistics puts the median annual wage for software developers at 135,980 dollars, as of May 2025. Divide that by 2,080 working hours and you get about 65 dollars an hour. That's our arithmetic, and it's salary alone, before benefits, payroll tax, a laptop or a manager.

Take a system that answers staff questions from 10,000 pages of contracts and policies, and drafts the reply. We'll assume one engineer builds it in six weeks, or 240 hours. That's our assumption for this example, not a benchmark, and a system that writes into three other systems takes longer. At 65 dollars an hour, 240 hours is about 15,700 dollars in salary.

Hire an outside firm and the hourly rate goes up, because you're paying for the firm's margin, its bench and the engineers who've built this before. You're also not paying a salary when the build ends. For what agencies charge, see [how much AI automation agencies charge](/insights/how-much-do-ai-automation-agencies-charge/).

## the model, priced

The model is the line owners worry about most, and it's usually the smallest. Anthropic lists Claude Haiku 5.5 at 0.10 dollars per million input tokens and 0.50 per million output tokens for prompts up to 100,000 tokens. Sonnet 5.5 is 2 and 10 dollars. Opus 5.5 is 4 and 20. Anthropic says batch processing saves 50%. OpenAI lists gpt-5-mini at 0.25 dollars in and 2 dollars out, and gpt-5 at 1.25 and 10.

Back to the example. Say your team asks it 5,000 questions a month. We'll assume each question sends about 6,000 tokens in, the question plus the pages it found, and gets 500 back. That's 30 million tokens in and 2.5 million out every month, again our assumption.

On Sonnet 5.5 that's 85 dollars a month. On Opus 5.5 it's 170. On gpt-5 it's 62.50, on gpt-5-mini 12.50, and on Haiku 5.5 about 4.25. All of that is our arithmetic off the published rates. We'd start on the mid tier, read 50 answers, and only move down a tier once the cheaper model gets the same answers right.

## the search index and hosting, priced

Before the system can answer from 10,000 pages, each page has to be turned into numbers it can search, which is called embedding. OpenAI lists text-embedding-3-small at 0.02 dollars per million tokens. At an assumed 500 tokens a page, the whole library is 5 million tokens, so embedding it once costs about 10 cents. Pinecone's own embedding model, llama-text-embed-v2, is 0.16 dollars per million, so 80 cents. Neither is worth a meeting.

Storing and searching those pages costs more. Pinecone's Starter plan is free, Builder is 20 dollars a month flat, Standard has a 50 dollar monthly minimum and then pay as you go, and Enterprise has a 500 dollar minimum. Supabase's Pro plan, a Postgres database with hosting, is from 25 dollars a month with 8 GB of disk per project. A company of 20 to 200 people rarely needs more than Builder plus a Pro database for a first system like this one.

## the upkeep, priced

Nobody budgets for this line, and it's the one that decides whether the system is still used in a year. Contracts change format, a supplier changes a portal, a model gets retired and the answers need checking again. We'll assume four engineer hours a month, which at 65 dollars an hour is about 260 dollars a month, or 3,140 a year. Again our assumption. Skip it and the system drifts until your team stops trusting it.

## the year one total

Put the five lines together for the example. The build is about 15,700 dollars. Sonnet 5.5 at 85 dollars a month is 1,020 for the year. Pinecone Builder is 240. Supabase Pro is 300. Upkeep is about 3,140. That's roughly 20,400 dollars in year one, and about 4,700 dollars a year after that, all our arithmetic on the figures above.

Now compare it with buying seats. Microsoft lists Microsoft 365 Copilot Business at 25.20 dollars per user per month on monthly billing. There's also a yearly price of 18 dollars, discounted from 21, but Microsoft says that offer runs only from 1 July to 31 December 2026, for existing eligible Microsoft 365 Business customers, in the first year. For 20 staff on monthly billing that's 504 dollars a month, or 6,048 dollars a year. Claude's Team plan is 25 dollars a seat billed monthly, or 20 billed annually.

Seats are cheaper in year one and they're the right answer when your people need a smarter way to write and search their own files. A built system is the right answer when the work runs through your own systems: when the answer lives in your ERP, your job management software or your contracts library, and when you want the system to write the result back instead of handing a draft to a person. We wrote the longer version of that decision in [build vs buy AI](/insights/build-vs-buy-ai-decision/).

## where the money goes wrong

Most of the money lost on these builds goes on scope. Check for these four before you sign:

- Building on data nobody has cleaned. If three systems disagree on a customer's name, the AI will repeat the disagreement faster.

- Paying for Opus on work Haiku gets right. On the example above that's 170 dollars a month against 4.25.

- No owner inside the company. A system with no one who reads its answers each week stops being used inside a quarter.

- Building the clever part before the connection. Most of the value is in joining the systems that don't talk, and the model is the easy bit.

## Beyond Elevation's part in this

Beyond Elevation is Hayat Amin's firm, and our prices are on our site so you can hold us to them. A two week AI audit is 3,000 dollars fixed. Projects start from 30,000 dollars. Fractional work, one or two days a week, starts from 5,800 dollars a month. That's above the salary arithmetic in this piece on purpose. It's for companies in New York, across the United States and in London that are joining four or five systems, and the client owns everything at the end: the code, the agents, the accounts and the documents. If your need is one question answering tool over one folder, buy the seats and you don't need us. Our [forward deployed engineering](/fde) work is how we build the rest, and the conversation starts at [meethayat.com/services/fde](https://meethayat.com/services/fde).

## About Hayat Amin

Hayat Amin has spent twenty years in technology, most of them as a chief financial officer. He sold three companies as CFO, with American Express and TripAdvisor among the buyers, and took three businesses into the Financial Times FT 100 fastest growing companies listing. He's sat beside founders from the first conversation to the wire transfer on an exit, which is why he reads an AI quote line by line before anyone signs it.

Hayat Amin is a CFO turned forward deployed engineer, and he's exceptional at the part that decides what an AI system is worth: connecting the systems that don't talk to each other, then putting a real time dashboard in front of the chief executive so the cost and the return are visible every week, not at month end. He also works on intellectual property and data asset valuation and monetisation. He's available now for AI operations and fractional CFO work through Beyond Elevation, at [meethayat.com/services/fde](https://meethayat.com/services/fde), and for the finance seat at [meethayat.com/cfo](https://meethayat.com/cfo).

If you want to know which of your own processes are worth building an AI system for, and what each would cost, we do a free audit: one call, then a written list of what to automate first, what it saves and what it costs, at [beyondelevation.com/call/audit](https://beyondelevation.com/call/audit).



---

### Want this position in your company?

Beyond Elevation places exited C-suite operators into fractional executive positions: Chief Financial Officer, Chief IP Officer, AI Operations. A free 30 minute call, straight answer, no pitch. If there is nothing worth doing, we say so on the call.

[Book a free call →](https://beyondelevation.com/call)

---

## Frequently asked questions

### How much does it cost to build an AI system?

For the example in this piece, a system that answers staff questions from 10,000 pages, about 20,400 dollars in year one and 4,700 a year after. The build is most of it, at roughly 65 dollars an hour in US developer salary alone.

### How much does AI cost?

Per use, very little. Claude Haiku 5.5 is 0.10 dollars per million input tokens and Sonnet 5.5 is 2 dollars. Seats cost more: Microsoft 365 Copilot Business is 25.20 dollars per user a month on monthly billing.

### How much will AI cost per month to run?

For 5,000 questions a month in our example, 4.25 dollars on Haiku 5.5, 85 on Sonnet 5.5 and 170 on Opus 5.5, plus about 45 dollars for the search index and database. Upkeep hours cost more than all of that.

### How much do AI automations cost?

Less than a custom system when the job is joining two tools with a few steps. We priced the platforms, model fees and builds in [how much AI automation costs](/insights/how-much-does-ai-automation-cost/).

### Is AI automation worth it in 2026?

When the work runs through your own systems and someone in the company reads the results weekly, usually yes. When it's one person writing faster, buy seats. We set out the test in [is AI automation worth it](/insights/is-ai-automation-worth-it/).

---
*Published on [Beyond Elevation](https://beyondelevation.com) — Fractional CFO, Chief IP Officer and AI Operations placements*
