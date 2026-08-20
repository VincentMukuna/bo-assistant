import { expect, test } from "bun:test";
import { formatFriendlyDate } from "@/lib/format-date.ts";

const customerContext = {
  currentDate: "2026-08-18",
  timezone: "America/Los_Angeles",
};

function valueOf(result) {
  expect(result.status).toBe("ok");
  return result.value;
}

test("formats dates relative to the customer's calendar day", () => {
  expect(valueOf(formatFriendlyDate("2026-08-18T18:30:00.000Z", customerContext))).toBe(
    "today at 11:30 AM"
  );
  expect(valueOf(formatFriendlyDate("2026-08-19T23:00:00.000Z", customerContext))).toBe(
    "tomorrow at 4:00 PM"
  );
  expect(valueOf(formatFriendlyDate("2026-08-21T18:30:00.000Z", customerContext))).toBe(
    "Friday at 11:30 AM"
  );
});

test("uses an absolute date for appointments beyond the coming week", () => {
  expect(valueOf(formatFriendlyDate("2026-08-28T18:30:00.000Z", customerContext))).toBe(
    "Friday, August 28 at 11:30 AM"
  );
  expect(valueOf(formatFriendlyDate("2027-01-08T19:30:00.000Z", customerContext))).toBe(
    "Friday, January 8, 2027 at 11:30 AM"
  );
});

test("uses the requested timezone when determining today", () => {
  expect(valueOf(formatFriendlyDate("2026-08-19T01:30:00.000Z", customerContext))).toBe(
    "today at 6:30 PM"
  );
});

test("returns a typed failure for invalid booking timestamps", () => {
  const result = formatFriendlyDate("not-a-date", customerContext);
  expect(result.status).toBe("error");
  expect(result.error._tag).toBe("InvalidDatePresentation");
  expect(result.error.field).toBe("timestamp");
});
