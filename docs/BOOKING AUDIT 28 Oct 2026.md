# Booking page and engine audit, 28 October 2026

Scope: the public booking page (`call/index.html`, `assets/book.js`), the engine (`lib/booking.js`, `api/slots.js`, `api/book.js`, `api/call.js`, `api/reminders.js`) and the settings side in Mail HQ (`src/lib/booking.ts`, `src/app/api/booking/route.ts`). One read-only code pass plus live checks: slots endpoint, page, redirects, the eight configured links, Google service-account delegation for every scope the engine uses (calendar read and write as hayat@, Gmail send as hayat@ and clara.hawkins@, Gmail read), freeBusy on all four calendars (no errors), and the real bookings on the calendar (Meet links present, Clara's reminders firing).

Google wiring verified live on 28 Oct 2026: every token minted, every calendar readable, Meet links on real bookings, reminders r1/r2/r3 sent on the Robert van Biljon call.

| # | Severity | Finding | Status |
|---|---|---|---|
| B1 | critical | Two guests racing for one slot both passed the slot check and both got an event; nothing locked the insert. | fixed: the event is inserted without the guest, a racing earlier event makes ours lose and be deleted (409 to the guest), only then is the guest added, which is what sends the invitation |
| B2 | high | Every slot request read up to 100 confirmation mails from Hayat's mailbox in parallel; a Gmail rate limit took the whole page down ("The diary is not answering"). | fixed: capped at 40 and a failure is ignored instead of killing the slot list |
| B3 | high | A fully booked horizon (200 with zero slots) showed the outage message instead of "no times". | fixed |
| B4 | high | After a 409 the widget wiped the typed form and kept the taken time selected, so it resubmitted into another 409. | fixed: time dropped, message kept, form values restored |
| B5 | high | Switching a link off in Mail HQ silently served the default link's hours to anyone on that URL. | fixed: Mail HQ answers inactive, engine returns no slots, page says "not taking bookings" |
| B6 | medium | Clara's reminders were fixed at booking time; a meeting Hayat moved was reminded at the old time. | fixed: due times come from the live event start every tick |
| B7 | medium | The Meet link can lag the insert; when absent the confirmation and reminders promised a link that never came. | fixed: the event is read once more; honest copy when the fallback path has no link |
| B8 | medium | An invalid guest time zone threw after the event was already created: invite out, no confirmation, no reminders. | fixed: validated before anything is written |
| B9 | medium | The link's intro line (set in Mail HQ) was never shown on the page. | fixed |
| B10 | medium | A link saved with only the personal Gmail calendar ticked dropped hayat@ from the busy check. | fixed: the host's primary is always included |
| B11 | medium | Fallback copy promised "the link follows by email" with nothing that sends it. | fixed: "Hayat will send the Google Meet link" |
| B12 | medium | Widget re-rendered the whole frame on every change, losing keyboard focus; day buttons were unlabelled for screen readers. | fixed: focus restored, aria labels and pressed state |
| B13 | medium | Page sold "a call with Georgina" while the invite, Meet and confirmation are Hayat's and reminders are Clara's. | fixed: copy says Georgina sets it up, the call is with Hayat Amin |
| B14 | medium | Honeypot field named `website` was autofilled by password managers, locking real guests out with "Network hiccup". | fixed: nonsense field name; a success without a start no longer crashes the widget |
| B15 | medium | Minimum notice re-checked at submit: a 6-minute form fill earned a 409. | fixed: 10-minute grace on the re-check only |
| B16 | low | Horizon stepped by 24 h and skipped a day across the spring-forward night. | fixed: one step per local calendar day |
| B17 | low | Max-per-day counted mailed confirmations, so a cancelled booking consumed the cap for 60 days. | open |
| B18 | low | Display names unquoted in To; "Smith, John" became two recipients. | fixed |
| B19 | low | Click tracker awaited PostHog with no timeout. | fixed: 1.5 s |
| B20 | low | IP time zone echoed unescaped; `esc()` missed the apostrophe. | fixed |
| B21 | low | Month navigation limit judged on the device clock, not the chosen zone. | fixed |
| B22 | low | Slot and submit read link settings separately; a Mail HQ blip between them re-validated against defaults. | open |

Open after this pass: B17, B22. Weekly follow-up: the `cto-weekly` robot in hayat-cloud-ops reads this file first.

## cto-weekly, first run (dry), 28 Oct 2026 12:31 UTC

Robot findings on this repo, fixed the same day: an Instagram token sat as a literal fallback in `.github/workflows/instagram-post.yml` of this PUBLIC repo since 24 June (moved to the `INSTAGRAM_TOKEN` secret; Hayat must revoke it in Meta and issue a fresh one); the reminders cron now fails closed with a timing-safe compare; the reminder claim carries the event's etag (`If-Match`), so two overlapping runs cannot both send.

Still open from that run: `/api/book` has no rate limit (honeypot and slot check only); the daily cap stops counting a meeting once it has started; switching off the default `call` link does not block slugs with no row of their own (they fall back to it by design, see B5).
