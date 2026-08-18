import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("../src/mastra/tools/booking-tools.ts", import.meta.url),
  "utf8"
);

test("requires explicit approval only for the reschedule mutation", () => {
  const lookup = source.slice(
    source.indexOf("export const findBookingsForCustomer"),
    source.indexOf("export const rescheduleBooking")
  );
  const reschedule = source.slice(source.indexOf("export const rescheduleBooking"));

  assert.doesNotMatch(lookup, /requireApproval\s*:\s*true/);
  assert.match(reschedule, /requireApproval\s*:\s*true/);
  assert.ok(reschedule.indexOf("requireApproval: true") < reschedule.indexOf("execute:"));
});
