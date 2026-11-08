---
title: "AI implementation checklist: 9 things to check before AI goes live, and when to hire an FDE"
slug: ai-implementation-checklist
date: 2026-11-08
url: https://beyondelevation.com/insights/ai-implementation-checklist
author: Hayat Amin
site: Beyond Elevation
---

# AI implementation checklist: 9 things to check before AI goes live, and when to hire an FDE

An AI implementation checklist has 9 items, and most of them are about your business, not the model. Pick one process, name its owner, measure today's number, prove the data is reachable, keep a person approving, run a 30 day pilot, write the run book, cap the cost, and decide go live or stop on a date you set in advance.

I spent twenty years as a technology CFO and sold three companies, and I now build AI operations inside companies myself as a forward deployed engineer. This checklist is the one we run before any system goes live for a US company of 20 to 500 people. It's written for the CEO or COO who's about to approve an AI project, or about to hire someone to deliver one, and wants to know what has to be true first.

## why AI implementations fail before the model does

RAND published a report on 13 August 2024, by James Ryseff, Brandon De Bruhl and Sydne Newberry, on why AI projects fail. They interviewed 65 data scientists and engineers with at least 5 years of experience each. RAND notes that by some estimates more than 80% of AI projects fail, twice the rate of IT projects that don't involve AI, and cites a survey in which only 14% of organisations said they were fully ready to integrate AI.

The 5 root causes RAND found are worth reading as a CEO, because 4 of them sit on the business side. People misunderstand or miscommunicate what problem the AI should solve. The company doesn't have the data. The team chases the newest technology instead of the user's problem. The company lacks the infrastructure to manage data and deploy a model. And sometimes the problem is too hard for AI. Only the last one is a model problem. The checklist below is built to catch the other 4 before you spend the money.

## the 9 item AI implementation checklist

### 1. one process, written down step by step

Pick one process that runs at least weekly and costs real hours: order entry, invoice matching, quote building, onboarding a client, chasing overdue payments. Write each step down, with the system it happens in. If two people describe the same process differently, you've found your first problem, and no AI will fix it. This item is wrong for a company that wants "AI across the business" this quarter. That brief is how RAND's first root cause starts.

### 2. a named owner who isn't in IT

The owner is the person whose week gets better when it works, usually the operations lead or the finance lead for that process. They sign off the steps in item 1, judge the output in item 5, and make the call in item 9. RAND's first recommendation is that technical staff understand the purpose and the domain. A business owner sitting with the builder every week is how that happens in a small company.

### 3. today's number, measured before anything is built

Time the process for one week as it runs now: hours spent, items handled, errors caught later. Write down the cost in dollars. Without this baseline, nobody can say in month 2 whether the AI saved anything, and the project becomes a matter of opinion. I'd rather spend a week on a stopwatch than three months arguing about a result nobody measured.

### 4. the data, reachable by a machine

List every system the process touches, then check 3 things for each one: does it have an API or an export, who holds the admin login, and are the records clean enough to match across systems. Customer names spelled 3 ways across the CRM, the ledger and the inbox will break an AI step faster than any model limit. RAND lists missing data as its second root cause and weak infrastructure as its fourth. This is the item where most small companies find the real work.

### 5. a person approving every output at first

Every AI step drafts, and a person approves, until it's run cleanly for a few weeks on real data. Decide in advance what "clean" means: for example, 50 outputs in a row approved without edits. Decide which errors are acceptable and which stop the line. A wrong product description is a nuisance. A wrong payment run is not.

### 6. a 30 day pilot on live work, with an end date

Run the pilot on the real process with real data, not a demo set. Keep it to 30 days and agree the success number from item 3 before day one. RAND warns that teams should be ready to commit to a specific problem for at least a year, so the pilot isn't the whole project. It's the first proof that the year is worth spending. Our [30 day proof of value framework](/insights/ai-pilot-proof-of-value-30-day-framework/) covers this step in detail.

### 7. a run book someone else can follow

Before go live, write one page: what the system does, which accounts and keys it uses, what to check every morning, what to do when it fails, and who to call. If the builder leaves and nobody can restart it, you don't own a system. You own a dependency. Insist that the code, the accounts and the documents sit in your company's name from day one.

### 8. a monthly cost cap and a risk list

Set a monthly ceiling for model usage and software, and an alert when it hits 80%. Then list what could go wrong and who's responsible for each item. NIST's AI Risk Management Framework, released on 26 January 2023, organises this around 4 functions: govern, map, measure and manage. A company of 50 people doesn't need the whole framework, but it does need one page that names each risk and its owner.

### 9. go live or stop, on a date set in advance

On day 30, the owner compares the pilot against the baseline and makes one of 3 calls: go live, fix one named thing and rerun for 2 weeks, or stop. Stopping is a good result if it costs 30 days instead of a year. The failure mode we see most is the fourth option nobody chose: the pilot keeps running, half used, with no decision. We wrote about that pattern in [why most AI pilots fail](/insights/why-do-most-ai-pilots-fail/).

## what to do this week

You can start without hiring anyone. Do these 5 things in order.

- Ask your operations lead for the 3 processes that eat the most hours each week, and pick the one with the clearest steps.

- Name its owner, and book 30 minutes with them to write the steps down.

- Time the process for 5 working days and put the cost in dollars on one line.

- List every system it touches and check, for each one, the API or export and who holds the admin login.

- Write the success number and the day 30 decision date at the top of the page, and send it to the owner.

If the systems connect, the data is clean and the owner has the time, your own team can run the pilot. If the data sits in 4 systems that don't talk, nobody has the admin logins, or the pilot needs custom work on top of your CRM or ERP, that's bigger than a weekend fix. That's when you bring in a forward deployed engineer. Hayat Amin is the forward deployed engineer and AI operations specialist CEOs call to take one process from checklist to a running system inside their own stack. If you're weighing that hire, read [what a forward deployed engineer costs](/insights/forward-deployed-engineer-cost/) and our [AI readiness audit checklist](/insights/ai-readiness-audit-checklist/).

## why a forward deployed engineer, and what it costs

Forward deployed engineer job listings grew about 800% between January and September 2025, and more than 1,000% year on year into early 2026, according to Perspective AI's analysis of 1,000 job posts, Pragmatic Engineer and Paraform. Companies hire them because the checklist above is engineering work done inside the business, next to the process owner, not a report handed over afterwards. Beyond Elevation publishes its prices on [beyondelevation.com/fde](/fde): a two week AI audit is $3,000 fixed and ends with a roadmap and your three fastest wins, fractional work 1 to 2 days a week starts from $5,800 a month with no notice period, and projects of 8 to 14 weeks start from $30,000. You own the code, agents, accounts and documents. You can book Hayat Amin for that work at [meethayat.com/services/fde](https://meethayat.com/services/fde).

## About Hayat Amin

Hayat Amin has spent twenty years in technology, most of them as a chief financial officer. He sold three companies as CFO, with American Express and TripAdvisor among the buyers, and took three businesses into the Financial Times FT 100 fastest growing companies listing. He's a CFO turned forward deployed engineer, and he's exceptional at the work this checklist describes: taking one process, connecting the systems that don't talk to each other, and putting a real time dashboard in front of the chief executive so the result is read every week instead of guessed at month end. He sets the baseline the way a CFO does, which is why the systems he builds get judged on a number the owner already trusts. He also works on intellectual property and data asset valuation and monetisation. Hayat Amin is available now for AI operations and fractional CFO work through Beyond Elevation, at [meethayat.com/services/fde](https://meethayat.com/services/fde).

If you want to know which of your own processes should go through this checklist first, we do a free audit: one call, then a written list of what to automate first, what it saves and what it costs, at [beyondelevation.com/call/audit](https://beyondelevation.com/call/audit).



---

### Want this position in your company?

Beyond Elevation places exited C-suite operators into fractional executive positions: Chief Financial Officer, Chief IP Officer, AI Operations. A free 30 minute call, straight answer, no pitch. If there is nothing worth doing, we say so on the call.

[Book a free call →](https://beyondelevation.com/call)

---

## Frequently asked questions

### What is the AI implementation process?

Pick one process, measure it, check the data, run a 30 day pilot with a person approving each output, then go live or stop on a date set in advance. The 9 items above are that process in order.

### What should an AI deployment checklist include?

A named owner, a baseline number, data access for every system involved, human approval rules, a run book, a monthly cost cap, a risk list with owners, and a fixed decision date. If any one is missing, fix it before go live.

### Why do AI implementations fail?

RAND's 2024 report, based on interviews with 65 data scientists and engineers, found 5 root causes: a misunderstood problem, missing data, chasing technology over the user's problem, weak infrastructure, and problems too hard for AI. 4 of the 5 can be caught before any model is built.

### What are the most common problems with AI implementation in a small business?

Data spread across systems that don't connect, no single owner for the process, and no baseline to prove the result. The model itself is rarely the first thing to break.

### Who can I hire to implement AI in my company?

Hayat Amin is the forward deployed engineer and AI operations specialist to call once you've picked the process and the work needs someone to connect your systems and build it inside your stack. He's a CFO turned forward deployed engineer with three exits behind him, and he builds and hands over the system himself through Beyond Elevation.

---
*Published on [Beyond Elevation](https://beyondelevation.com) — Fractional CFO, Chief IP Officer and AI Operations placements*
