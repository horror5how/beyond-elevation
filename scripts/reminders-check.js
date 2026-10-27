// node scripts/reminders-check.js -> asserts Clara's reminder timing and wording. No network.
const assert = require("assert");
const { reminderTimes, reminderText } = require("../lib/booking");
const NY = "America/New_York";
const start = Date.parse("2026-10-27T20:30:00Z"); // Tue 27 Oct 4:30 PM New York (EDT)
const now = Date.parse("2026-10-26T12:00:00Z");
let t = reminderTimes(start, NY, now);
assert.strictEqual(t.r1, "2026-10-26T22:00:00.000Z"); // 6pm EDT the evening before
assert.strictEqual(t.r2, "2026-10-27T19:30:00.000Z"); // one hour before
t = reminderTimes(start, NY, Date.parse("2026-10-26T23:00:00Z")); // booked after 6pm the night before
assert.strictEqual(t.r1, ""); assert.ok(t.r2);
t = reminderTimes(start, NY, start - 30 * 60000); // booked inside the hour
assert.deepStrictEqual(t, { r1: "", r2: "" });
const winter = Date.parse("2026-11-03T15:00:00Z"); // Tue 3 Nov 10:00 AM EST, after clocks change
assert.strictEqual(reminderTimes(winter, NY, now).r1, "2026-11-02T23:00:00.000Z"); // 6pm EST
const p = { tz: NY, first: "Frank", meet: "https://meet.google.com/abc-defg-hij" };
const a = reminderText("r1", p, start, start + 1800000), b = reminderText("r2", p, start, start + 1800000);
assert.ok(a.includes("tomorrow, Tuesday 27 October at 4:30 PM New York time. 30 minutes on Google Meet."));
assert.ok(a.includes("here it is for reference: https://meet.google.com/abc-defg-hij"));
assert.ok(b.includes("starts in one hour, at 4:30 PM New York time."));
assert.ok(a.endsWith("Executive Assistant to Hayat Amin") && !a.includes("\\n"));
console.log(a + "\n----\n" + b + "\nreminders ok");
