---
title: "How to automate SOPs: why most agency SOPs fail as AI prompts, and the 7 step framework that works"
slug: how-to-automate-sops
date: 2026-10-31
url: https://beyondelevation.com/insights/how-to-automate-sops
author: Hayat Amin
site: Beyond Elevation
---

# How to automate SOPs: why most agency SOPs fail as AI prompts, and the 7 step framework that works

To automate SOPs, don't paste the document into a prompt. Split it: every step that's a fixed rule goes to an automation tool, every step that needs judgement goes to a model with one narrow job, and a person approves anything a client will see. That's the whole method.

Hayat Amin ran finance through three company exits as a chief financial officer and now builds AI operations inside companies himself, so this is written from the build, not from a slide. A thread on r/Entrepreneur asked the question more bluntly: why do most agency SOPs fail when they're turned into prompts? That's the question this piece answers, along with the framework we use instead.

## why most agency SOPs fail when turned into prompts

An SOP is written for a person who already works at the agency. It assumes they know the client, the tone, which folder the logins are in and what "good" looks like. A model knows none of that. These are the six failures that break them:

- The context lives in someone's head. "Use the usual tone for this client" means nothing to a model unless the usual tone is written down.

- Steps say "check" or "make sure" with no test for passing. A person fills the gap with experience. A model fills it with a guess.

- The whole SOP goes into one prompt. A 20-step client onboarding in a single instruction gives the model 20 chances to skip a step, and nothing tells you which one it skipped.

- The SOP only covers the easy case. It says what to do when the client sends everything on time. It says nothing about the client who sends half the assets two days late, which is most of them.

- The model is asked to do arithmetic, dates and routing. Those are rules. A rule engine gets them right every time, and a model only gets them right most times.

- The document describes how the team says they work, not how they do. The account manager who's run the monthly report for 3 years skips 2 steps and adds 4 that aren't written down.

The problem is the document, not the model. It's written for the wrong reader.

## what the people who build agents say

OpenAI's practical guide to building agents tells teams to start from the documents they already have: "use existing operating procedures, support scripts, or policy documents to create LLM-friendly routines." It then gives 4 rules for those routines. Use existing documents, ask the model to break dense material into smaller steps, make every step correspond to a specific action or output, and capture the edge cases with conditional branches for when information is missing.

Anthropic's Building effective agents, published on 19 December 2024, draws the line that matters for an agency owner. A workflow is a system where models and tools are "orchestrated through predefined code paths". An agent is one where the model directs its own process. Anthropic's advice is to find "the simplest solution possible" and only add complexity when it's needed. For most SOPs that means a workflow, not an agent. Our longer explanation is in [what an AI agent for small business is](/insights/what-is-an-ai-agent-for-small-business/).

OpenAI's guide also says that before you build an agent you should check the job involves complex judgement, rules that have become hard to maintain, or a lot of unstructured text. If it doesn't, "a deterministic solution may suffice." Most of an agency SOP is deterministic. Only a few steps aren't.

## the framework: 7 steps from SOP to automation

This is the order we work in. Skip a step and the build usually fails at the place you skipped.

### 1. pick the SOP that runs most often

Count runs per month, not hours per run. The monthly client report, new client onboarding, the weekly status email and invoice chasing usually win, because they repeat with the same inputs. A process that runs twice a year isn't worth the build, however painful it is.

### 2. rewrite it as it's done

Sit with the person who runs it, or record their screen for one full run, and write down every click. Note each system they open. In an agency that's usually some mix of HubSpot or Pipedrive, ClickUp or Asana, Google Drive, Slack, Google Analytics and QuickBooks. You'll find the steps that aren't in the document, and the ones in the document nobody does.

### 3. label every step a rule or a judgement

A rule has one right answer: pull last month's numbers, file the PDF in the client folder, create the task, send the reminder on day 7. A judgement doesn't: write the two paragraphs explaining why traffic fell, decide whether a client email is a complaint. In a typical agency SOP, most of the steps are rules. Rules go to Zapier, Make or n8n. Only the judgements go to a model.

### 4. give each judgement one job

Anthropic calls this prompt chaining: each model call takes the output of the last one. One call drafts the commentary from the numbers. A second checks the draft against the client's notes. Every call has one input, one output and a test you can read. That's OpenAI's "define clear actions" rule in practice.

### 5. write the edge cases down

For each step, ask what happens when the input is missing, late or wrong, and write the branch. If the client hasn't sent the ad spend by the 3rd, the workflow posts in Slack and waits. It doesn't guess the number.

### 6. put a person in front of the client

OpenAI's guide names 2 triggers for handing control back to a human: the system exceeds a set number of retries or failures, or the action is sensitive, irreversible or high stakes. For an agency, anything a client reads is high stakes. The draft goes to the account manager, they approve it, and only then does it send.

### 7. run it beside the person for 4 weeks

Let the automation and the person both do the job for a month and compare the outputs side by side. Switch over when the automation's misses are fewer than the person's. That's our rule of thumb, and it's what earns the team's trust in the build.

## a worked example: the monthly client report

Take an agency with 25 retainer clients, each getting a monthly report that takes an account manager 3 hours. That's our assumption, and it's 75 hours a month. Split by the framework, the report has perhaps 10 rule steps: pull the numbers from Google Analytics and the ad platforms, drop them into the template, compare against last month, file it, create the review task. It has 2 judgement steps: write the commentary and flag anything the client will ask about.

The rule steps run in an automation tool. Say each report uses 10 tasks in Zapier, which is our estimate, so 25 reports use 250 tasks a month. Zapier's Pro plan with 750 tasks a month is 19.99 dollars a month billed annually, or 29.99 billed monthly, and it's the cheapest plan that includes Zapier's own AI steps and Paths. n8n's Starter plan is 20 euros a month billed annually for 2,500 workflow executions, and n8n publishes a self hosted version on GitHub. The judgement steps are the model calls. The account manager's 3 hours become a read and an approve.

The software is the cheap line. The time goes into steps 2 and 5, finding out how the report is made and writing down what happens when it goes wrong. We compared the tools in more depth in [the best AI workflow automation platform](/insights/best-ai-workflow-automation-platform/), and the mechanics are in [how workflow automation works](/insights/how-does-workflow-automation-work/).

## what Beyond Elevation does about this

If your SOPs are already clean and someone on the team likes building in Zapier, you can do this yourself with the 7 steps above, and you don't need us. Most agencies have the SOPs and no one with the time to do steps 2 and 5. That's what Beyond Elevation does for small and mid sized companies in New York, across the United States and in London: Hayat Amin and the team sit with the people who run the process, rebuild it as rules and judgements, connect the systems that don't talk to each other, and stay until the team trusts the output. Our prices are published. A two week AI audit is 3,000 dollars fixed, projects start from 30,000 dollars over 8 to 14 weeks, and fractional work starts from 5,800 dollars a month. It's our [forward deployed engineering](/fde) work, and you can book it at [meethayat.com/services/fde](https://meethayat.com/services/fde). For the wider picture, start with [how to automate your business](/insights/how-can-i-automate-my-business/).

## About Hayat Amin

Hayat Amin has spent twenty years in technology, most of them as a chief financial officer. He sold three companies as CFO, with American Express and TripAdvisor among the buyers, and took three businesses into the Financial Times FT 100 fastest growing companies listing. He's a CFO turned forward deployed engineer, and he's exceptional at the unglamorous part of automation that decides whether it works: watching how a process is run, connecting the systems a company already pays for, and putting a real time dashboard in front of the chief executive so the hours saved show up every week. He also works on intellectual property and data asset valuation and monetisation, and sits beside founders from the first conversation to the wire transfer on an exit. Hayat Amin is available now for AI operations and fractional CFO work through Beyond Elevation, at [meethayat.com/services/fde](https://meethayat.com/services/fde).

If you'd like to know which of your own SOPs are worth automating first, we do a free audit: one call, then a written list of what to automate first, what it saves and what it costs, at [beyondelevation.com/call/audit](https://beyondelevation.com/call/audit).



---

### Want this position in your company?

Beyond Elevation places exited C-suite operators into fractional executive positions: Chief Financial Officer, Chief IP Officer, AI Operations. A free 30 minute call, straight answer, no pitch. If there is nothing worth doing, we say so on the call.

[Book a free call →](https://beyondelevation.com/call)

---

## Frequently asked questions

### How do you automate SOPs?

Rewrite the SOP as it's done, label each step a rule or a judgement, send the rules to an automation tool such as Zapier, Make or n8n, give each judgement to a model as one narrow job, and have a person approve anything a client sees.

### What are the best SOP automation tools?

For the rule steps, Zapier, Make and n8n all do the job. Zapier's Pro plan starts at 19.99 dollars a month billed annually for 750 tasks, and n8n's Starter is 20 euros a month billed annually. The judgement steps need a model, called from inside the same workflow.

### Can AI do SOP automation on its own?

Not well. OpenAI's own guide says a deterministic solution may suffice where a job doesn't need judgement, and Anthropic advises the simplest solution possible. Use the model for the few steps that need it, and rules for the rest.

### What is the difference between an SOP and a workflow?

An SOP is the written instruction for a person. A workflow is the sequence a system runs. Automating an SOP means turning the first into the second, with every step made explicit enough that a machine can't misread it.

### Should I use an AI SOP generator?

For writing the document, it can save time. For automating it, the generator doesn't help, because it writes the SOP the way people say they work. Watch one real run first, then write.

---
*Published on [Beyond Elevation](https://beyondelevation.com) — Fractional CFO, Chief IP Officer and AI Operations placements*
