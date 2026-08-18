const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1_000;

type FriendlyDateOptions = {
  currentDate: string;
  locale?: string;
  timezone: string;
};

type CalendarDate = {
  day: number;
  month: number;
  year: number;
};

function parseCurrentDate(value: string): CalendarDate {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    throw new RangeError("currentDate must use the YYYY-MM-DD format");
  }

  const [, year, month, day] = match;
  const parsed = {
    year: Number(year),
    month: Number(month),
    day: Number(day),
  };
  const normalized = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day));

  if (
    normalized.getUTCFullYear() !== parsed.year ||
    normalized.getUTCMonth() + 1 !== parsed.month ||
    normalized.getUTCDate() !== parsed.day
  ) {
    throw new RangeError("currentDate must be a valid calendar date");
  }

  return parsed;
}

function calendarDateInTimezone(date: Date, locale: string, timezone: string): CalendarDate {
  const parts = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "numeric",
    timeZone: timezone,
    year: "numeric",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
  };
}

function dayNumber(date: CalendarDate) {
  return Date.UTC(date.year, date.month - 1, date.day) / MILLISECONDS_PER_DAY;
}

export function formatFriendlyDate(
  timestamp: string,
  { currentDate, locale = "en-US", timezone }: FriendlyDateOptions
) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    throw new RangeError("timestamp must be a valid ISO date and time");
  }

  const today = parseCurrentDate(currentDate);
  const target = calendarDateInTimezone(date, locale, timezone);
  const differenceInDays = dayNumber(target) - dayNumber(today);
  const time = new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone,
  }).format(date);

  if (differenceInDays === 0) return `today at ${time}`;
  if (differenceInDays === 1) return `tomorrow at ${time}`;
  if (differenceInDays === -1) return `yesterday at ${time}`;

  const weekday = new Intl.DateTimeFormat(locale, {
    timeZone: timezone,
    weekday: "long",
  }).format(date);

  if (differenceInDays > 1 && differenceInDays < 7) return `${weekday} at ${time}`;
  if (differenceInDays < -1 && differenceInDays > -7) return `last ${weekday} at ${time}`;

  const calendarDate = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    timeZone: timezone,
    weekday: "long",
    ...(target.year === today.year ? {} : { year: "numeric" as const }),
  }).format(date);

  return `${calendarDate} at ${time}`;
}
