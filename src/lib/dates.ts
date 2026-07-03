const DEFAULT_TIME_ZONE = "America/New_York";

export function getAppTimeZone() {
  return process.env.APP_TIME_ZONE || DEFAULT_TIME_ZONE;
}

export function getTodayDate(timeZone = getAppTimeZone()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    throw new Error("Unable to resolve today's date.");
  }

  return `${year}-${month}-${day}`;
}

export function isDateOnly(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = parseDateOnly(value);
  return formatDateOnly(date) === value;
}

export function parseDateOnly(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function formatDateOnly(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function getSevenDayWindow(endDate: string) {
  const end = parseDateOnly(endDate);
  const start = addDays(end, -6);

  return {
    startDate: formatDateOnly(start),
    endDate,
    dates: Array.from({ length: 7 }, (_, index) =>
      formatDateOnly(addDays(start, index))
    )
  };
}

export function isWithinDateWindow(date: string, startDate: string, endDate: string) {
  return date >= startDate && date <= endDate;
}
