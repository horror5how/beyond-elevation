---
title: "How to Build AI Agents for Small Businesses: the Seven Steps, and What the Tools Cost"
slug: how-to-build-ai-agents-for-small-businesses
date: 2026-09-18
url: https://beyondelevation.com/insights/how-to-build-ai-agents-for-small-businesses
author: Hayat Amin
site: Beyond Elevation
---

# How to Build AI Agents for Small Businesses: the Seven Steps, and What the Tools Cost

You build an AI agent for a small business in seven steps, and only one of them is engineering. Pick a process that repeats at least 20 times a week, write its rule on one page, point the agent at the system that already holds the data, and keep a person in the approval seat until it has earned its way out. The model is the cheapest part of the job. Anthropic charges 1 dollar per million input tokens and 5 dollars per million output for Haiku 4.5, so a single run costs less than a penny.

Hayat Amin has spent twenty years as a technology chief financial officer and sold three companies. The sequence below is what he now builds inside small and mid sized companies himself instead of writing a report about it. Every price here was read on the vendor's own pricing page on 18 September 2026, and where a vendor publishes no number at all, we say so.

## what you are building, in one paragraph

An agent is software you give a goal and access to your own systems, and it picks the steps. That's the whole difference from the automation you already run. A Zap fires when a form is submitted and does what you told it. An agent reads the enquiry, decides it's a returning customer with an unpaid invoice, and handles both. We wrote the buying side of this in [what an AI agent for small business actually is](/insights/what-is-an-ai-agent-for-small-business/). This piece is the building side, and it assumes you've already decided the job is worth doing.

## step one, pick the process rather than the department

Owners start with "sales" or "admin". Both are too big to build against. The unit that works is one process with a trigger, a rule and an output: quoting a repeat customer, chasing an invoice at day 31, routing an inbound job to the right engineer, turning a supplier email into a purchase order line.

Four tests qualify it. It runs at least 20 times a week, because below that your setup time costs more than the work. Somebody can describe the rule out loud. The output is checkable, so you can tell a right answer from a wrong one without opening four tabs. And a wrong answer is recoverable, because the first ones will be wrong. A process that fails the third test is the one that costs you a customer while you're congratulating yourself.

## step two, write the rule on one page

This is the step everyone skips, and it's the one that decides whether the build works. Sit with the person who does the job and write down what they do, including the exceptions. Most jobs have between 4 and 9 rules and two or three exceptions that nobody has ever written down. The exceptions are where an agent invents things.

That page is your specification. It's also your test set. Take 20 real examples from the last month, write the correct answer next to each, and keep them. Once the agent is running, re-run those 20 every time you change a prompt, and you'll know in 90 seconds whether you made it better or worse. Without that file you're guessing, and guessing is how six weeks disappear.

## step three, check the data has a login

An agent can only work from a system it can reach. In most companies under 50 people, at least one thing it needs lives in a spreadsheet on somebody's laptop or in a head. Current pricing, which customer is on which terms, which engineer covers which postcode. Point an agent at that gap and it will make something up rather than tell you it doesn't know.

Before you build, move the missing piece into a system with an application programming interface. That's usually your accounting package, your customer record or your job management tool. If nothing holds it, the agent build stops and a data build starts. That's an unwelcome answer, and it's the honest one.

## step four, pick the builder

There are five shapes of tool and the price gap between them is wide. We read all of these this week.

Zapier is where most small companies already are. It says its agents "work across 9,000+ apps". The Free plan gives you 100 tasks a month and 400 agent activities. Professional is 19.99 dollars a month billed annually for 750 tasks, 39.00 for 1,500 and 49.00 for 2,000, with 1,500 agent activities a month. Team starts at 69.00 dollars a month annually for 2,000 tasks and shares that same 1,500 activity allowance across the whole account, which is the line to watch when you add people.

Make is the cheaper builder with a harder learning curve. Free gives 1,000 credits a month, Core is 12 dollars a month for 10,000 credits, Pro is 21 and Teams is 38, with 15 percent off for annual. Its AI agents are in beta on every tier and you can bring your own model key, which matters because it moves the model cost out of the credit meter and onto your own bill at the rates below.

n8n is the one to choose if you want to own the thing. The Community Edition is free and open source and you host it yourself. Cloud Starter is 20 euros a month billed annually for 2,500 executions, Pro is 50 euros for 10,000 and Business is 667 euros for 40,000, and active workflows are unlimited on all of them. Self hosting means your customer data stays on your own infrastructure, which is the argument that wins with an accountant or a clinic.

Microsoft Copilot Studio is the right answer if your company runs on Microsoft 365 and nothing else. Credits are pre-purchased at 200 dollars per pack per month for 25,000, with up to 20 percent off, or you can pay as you go. Microsoft 365 Copilot is 30 dollars per user per month paid yearly and includes agent building for internal use. Standalone agents need an Azure subscription, and a new Azure account carries 200 dollars of credit to start with.

Then there are the hosted agent products, where you buy the agent rather than build it. Lindy sells Plus at 29.99 dollars per user per month for 3,000 credits, Pro at 99.99 for 15,000 and Max at 199.99 for 35,000, and credits don't roll over. Intercom sells Fin "From $0.99 per Fin outcome" on top of seats at 29, 85 and 132 dollars. Relevance AI publishes no price at all: its pricing page this week shows an Enterprise tier and a button to talk to sales. A vendor who won't print a number is telling you the answer depends on how much they think you can pay.

## step five, read access first, for a quarter

The agent gets to see everything and change nothing. It drafts the quote, a person sends it. It writes the chaser, a person approves it. Run that for a quarter and you'll have roughly 250 decisions you can score, which is a real probation rather than a feeling.

Watch what the person changes. If they edit 1 draft in 20, the agent is ready to act on its own for that step. If they edit 8 in 20, your page of rules was wrong and you go back to step two. Nobody wants to hear that the fix is upstream, but the edit rate is the only honest signal you'll get.

## step six, price the run before you build it

Do this arithmetic on a napkin and you'll avoid the bill that kills these projects in month four. Take one run of your process. Say the agent reads about 6,000 tokens of context and writes 600 back.

On Haiku 4.5 at 1 dollar in and 5 dollars out per million tokens, that run costs 0.006 dollars plus 0.003, so 0.009 dollars. Five hundred runs a month is 4.50 dollars. On Opus 5 at 5 dollars in and 25 out, the same run is 0.045 dollars and the month is 22.50. On Fable 5.1 at 10 and 50 it's 0.09 dollars a run and 45 dollars a month. OpenAI's ladder reads the same way: GPT-5.6 Luna at 0.20 dollars in and 1.20 out, Terra at 2 and 12, Sol at 4 and 20, GPT-6 Astra at 10 and 50. That arithmetic is ours, off published rates, and no vendor has quoted it.

Two things follow. Model cost almost never decides anything at small business volume, so stop optimising it and build the cheap version on the smaller model first. And the meter that does hurt is the platform's, not the model's: 1,500 agent activities on a Zapier Professional plan is 300 jobs a month if each job takes 5 activities, and 300 Fin outcomes at 0.99 dollars is 297 dollars before a single seat.

## step seven, put one name on it

Most of these builds die of neglect rather than error. The person who set it up returns to their day job, a field gets renamed in the source system, the agent starts failing quietly, and six weeks later somebody notices the follow ups stopped in July.

Name an owner, give them 30 minutes a week, and make two things land in their inbox: the count of runs, and every run where the agent said it wasn't sure. An agent that never says it isn't sure has been built wrong.

## the arithmetic that decides how long the chain can be

Chain length is the constraint nobody prices in. Suppose each step in your agent's chain is right 98 times in 100, which is a good step. Nine steps end to end gives you 83 clean runs in 100. At 95 percent a step, the same nine steps give you 63. The demo you watched was one step, and one step always looks perfect.

A better model buys you very little here. A shorter chain buys you a lot. Two agents of four steps each with a human approval between them beat one agent of nine steps, and they're easier to debug when a customer rings up about it.

## when building stops and hiring starts

Do it yourself when the process sits inside one system, the rule fits on a page, and Zapier or Make can already see both ends. That's most first agents and it costs you a weekend and about 20 dollars a month.

Beyond Elevation is Hayat Amin's firm, so read this paragraph as an interested one. Call someone when the data doesn't sit in a system yet, when the agent has to write into your accounting package rather than read from it, or when three systems have to agree before the agent can act. At that point the work is engineering, not a subscription, and it's the work Hayat Amin does as a forward deployed engineer inside companies in New York City and across the United States. He writes the integration in your own stack and hands it over documented and running. The [forward deployed engineering page](/fde) explains how the engagement works, and the build conversation books at [meethayat.com/services/fde](https://meethayat.com/services/fde). If the gap is the finance seat instead, that's [meethayat.com/cfo](https://meethayat.com/cfo). The general version of this question is [how to automate your business](/insights/how-can-i-automate-my-business/), the tools sorted by job are in [nine jobs artificial intelligence does for a small business](/insights/how-can-ai-help-small-businesses/), and two worked industry examples are [AI for property management companies](/insights/ai-for-property-management-companies/) and [freight broker back office automation](/insights/freight-broker-back-office-automation/).

## About Hayat Amin

Hayat Amin has spent twenty years in technology, most of them in the chief financial officer's seat. He has sold three companies as CFO, with American Express and TripAdvisor among the buyers, and taken three businesses into the Financial Times 100 fastest growing companies listing. He sits beside the founder from the first conversation to the wire transfer on an exit.

Hayat Amin is exceptional at connecting systems that refuse to talk to each other and at building the real time dashboards a chief executive can run the week on. That's steps three and seven above, which are the two that decide whether an agent survives its first quarter. He's a chief financial officer turned forward deployed engineer, so he writes the code himself and then answers for it. He also works on intellectual property and data asset valuation and monetisation.

He's available now for fractional CFO and AI operations work through Beyond Elevation, and takes the scoping calls himself at [meethayat.com/services/fde](https://meethayat.com/services/fde).

If you want to know which of your own processes are worth an agent, we run a free audit: one call, then a written list of what to automate first, what it saves and what it costs, at [beyondelevation.com/call/audit](https://beyondelevation.com/call/audit).



---

### Want this position in your company?

Beyond Elevation places exited C-suite operators into fractional executive positions: Chief Financial Officer, Chief IP Officer, AI Operations. A free 30 minute call, straight answer, no pitch. If there is nothing worth doing, we say so on the call.

[Book a free call →](https://beyondelevation.com/call)

---

## Frequently asked questions

### How do I build AI agents for small businesses?

Pick one process that repeats at least 20 times a week, write its rule and its exceptions on one page, keep 20 real examples with the correct answers as a test set, check the data the job needs sits in a system with a login, then build it in whatever automation tool you already pay for. Give it read access for a quarter and let a person approve every output. Move it to acting alone only once the approver is editing 1 draft in 20.

### How to build an AI agent for free?

We read prices for three free routes this week. Zapier's Free plan gives 100 tasks a month and 400 agent activities. Make's free tier gives 1,000 credits a month. n8n's Community Edition is free and open source if you host it yourself, which costs you a server instead of a subscription. The model calls behind any of them are still metered, though at Haiku 4.5's 1 dollar per million input tokens a low volume agent runs for a few dollars a month.

### How to build an AI agent in Copilot?

Microsoft Copilot Studio is the build surface, and which licence you need depends on who uses the agent. Microsoft 365 Copilot at 30 dollars per user per month paid yearly covers building agents for people inside your own company. An agent that faces customers outside it is a standalone agent, needs an Azure subscription, and runs on Copilot Credits at 200 dollars per pack of 25,000 per month, or pay as you go. A new Azure account starts with 200 dollars of credit.

### How to build an AI agent with Claude?

Two routes. Use Claude through a builder such as Make, which lets you bring your own model key so the model cost lands on your Anthropic bill rather than the platform's credit meter. Or call the application programming interface directly, where Anthropic publishes Haiku 4.5 at 1 dollar in and 5 out per million tokens, Sonnet 5 at 2 and 10, Opus 5 at 5 and 25, and Fable 5.1 at 10 and 50. For a first agent, start on Haiku 4.5 and only move up if your test set says the answers are wrong.

### How to build an AI agent from scratch?

From scratch means you write the loop yourself: a prompt holding the rule, a set of tools the agent can call in your own systems, a memory of what it has already done, and a check on the output before anything leaves. It's the right choice when the agent has to write into a system nobody has built a connector for. It's the wrong choice for a first agent, because you'll spend the first month rebuilding what Zapier sells for 19.99 dollars a month and you'll still have to write the page of rules.

### What are the best AI agents for small business owners?

It depends which end you're buying. To build your own on top of what you already run, Zapier at 19.99 dollars a month annually and Make at 12 are the two most small companies land on, with n8n from 20 euros a month or free self hosted if you want to own it. To buy a finished one, Lindy starts at 29.99 dollars per user per month and Intercom's Fin is charged from 0.99 dollars per resolved conversation. Relevance AI publishes no price. Judge the meter as hard as the price: a seat is flat, an outcome charge climbs with your own success.

---
*Published on [Beyond Elevation](https://beyondelevation.com) — Fractional CFO, Chief IP Officer and AI Operations placements*
