export const BUSINESS_TIME_ZONE = "America/Los_Angeles";

type DateValue = string | number | Date;

function asDate(value: DateValue) {
  return value instanceof Date ? value : new Date(value);
}

function zonedParts(value: DateValue) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BUSINESS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(asDate(value));

  return Object.fromEntries(
    parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value])
  ) as Record<"year" | "month" | "day" | "hour" | "minute" | "second", string>;
}

export function businessDateKey(value: DateValue) {
  const parts = zonedParts(value);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function businessTimeInputValue(value: DateValue) {
  const parts = zonedParts(value);
  return `${parts.hour}:${parts.minute}`;
}

export function formatBusinessDate(
  value: DateValue,
  options: Omit<Intl.DateTimeFormatOptions, "timeZone"> = {}
) {
  return asDate(value).toLocaleDateString("en-US", {
    ...options,
    timeZone: BUSINESS_TIME_ZONE,
  });
}

export function formatBusinessTime(
  value: DateValue,
  options: Omit<Intl.DateTimeFormatOptions, "timeZone"> = {
    hour: "numeric",
    minute: "2-digit",
  }
) {
  return asDate(value).toLocaleTimeString("en-US", {
    ...options,
    timeZone: BUSINESS_TIME_ZONE,
  });
}

export function businessLocalDateTimeToIso(dateKey: string, time: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const intendedAsUtc = Date.UTC(year, month - 1, day, hour, minute);
  let timestamp = intendedAsUtc;

  // Intl exposes the wall-clock time but not the offset. Correct the UTC guess
  // until its Pacific wall-clock parts match the date and time the user entered.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const actual = zonedParts(timestamp);
    const actualAsUtc = Date.UTC(
      Number(actual.year),
      Number(actual.month) - 1,
      Number(actual.day),
      Number(actual.hour),
      Number(actual.minute)
    );
    timestamp += intendedAsUtc - actualAsUtc;
  }

  return new Date(timestamp).toISOString();
}
