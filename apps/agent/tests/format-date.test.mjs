import assert from "node:assert/strict";
import test from "node:test";
import { formatFriendlyDate } from "../tools/format-date.ts";

const customerContext = {
  currentDate: "2026-08-18",
  timezone: "America/Los_Angeles",
};

function valueOf(result) {
  assert.equal(result.status, "ok");
  return result.value;
}

test("formats dates relative to the customer's calendar day", () => {
  assert.equal(
    valueOf(formatFriendlyDate("2026-08-18T18:30:00.000Z", customerContext)),
    "today at 11:30 AM"
  );
  assert.equal(
    valueOf(formatFriendlyDate("2026-08-19T23:00:00.000Z", customerContext)),
    "tomorrow at 4:00 PM"
  );
  assert.equal(
    valueOf(formatFriendlyDate("2026-08-21T18:30:00.000Z", customerContext)),
    "Friday at 11:30 AM"
  );
});

test("uses an absolute date for appointments beyond the coming week", () => {
  assert.equal(
    valueOf(formatFriendlyDate("2026-08-28T18:30:00.000Z", customerContext)),
    "Friday, August 28 at 11:30 AM"
  );
  assert.equal(
    valueOf(formatFriendlyDate("2027-01-08T19:30:00.000Z", customerContext)),
    "Friday, January 8, 2027 at 11:30 AM"
  );
});

test("uses the requested timezone when determining today", () => {
  assert.equal(
    valueOf(formatFriendlyDate("2026-08-19T01:30:00.000Z", customerContext)),
    "today at 6:30 PM"
  );
});

test("returns a typed failure for invalid booking timestamps", () => {
  const result = formatFriendlyDate("not-a-date", customerContext);
  assert.equal(result.status, "error");
  assert.equal(result.error._tag, "InvalidDatePresentation");
  assert.equal(result.error.field, "timestamp");
});
