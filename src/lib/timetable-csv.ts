import type { TimeSlot } from "./matching/types";
import { normalizeCsvHeader, parseCsvRows } from "./csv";

const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const dayNames = [
  ["mon", "monday"],
  ["tue", "tues", "tuesday"],
  ["wed", "wednesday"],
  ["thu", "thur", "thurs", "thursday"],
  ["fri", "friday"],
  ["sat", "saturday"],
  ["sun", "sunday"],
];

export function parseTimetableDay(value: string): string | undefined {
  const normalized = value.trim().toLowerCase().replace(/\.$/, "");
  const index = dayNames.findIndex((names) => names.includes(normalized));
  return index < 0 ? undefined : weekDays[index];
}

export function parseTimetableTime(value: string): number | undefined {
  const normalized = value.trim();
  const twelveHour = /^(\d{1,2})(?::([0-5]\d))?\s*(AM|PM)$/i.exec(normalized);
  if (twelveHour) {
    const hour = Number(twelveHour[1]);
    if (hour < 1 || hour > 12) return undefined;
    const minute = Number(twelveHour[2] ?? "0");
    const hour24 = hour % 12 + (twelveHour[3].toUpperCase() === "PM" ? 12 : 0);
    return hour24 * 60 + minute;
  }

  const twentyFourHour = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(normalized);
  if (!twentyFourHour) return undefined;
  return Number(twentyFourHour[1]) * 60 + Number(twentyFourHour[2]);
}

export function parseTimetableCsv(value: string): TimeSlot[] {
  const rows = parseCsvRows(value.replace(/^\uFEFF/, ""));
  const nonEmptyRows = rows
    .map((cells, index) => ({ cells, line: index + 1 }))
    .filter(({ cells }) => cells.some((cell) => cell.trim()));
  const headerRow = nonEmptyRows[0];
  if (!headerRow) throw new Error("The CSV file is empty.");

  const headers = headerRow.cells.map(normalizeCsvHeader);
  const dayIndex = headers.findIndex((header) => ["day", "weekday"].includes(header));
  const startIndex = headers.findIndex((header) =>
    ["start", "starttime"].includes(header),
  );
  const endIndex = headers.findIndex((header) =>
    ["end", "endtime"].includes(header),
  );
  const subjectIndex = headers.findIndex((header) => header === "subject");
  if (dayIndex < 0 || startIndex < 0 || endIndex < 0) {
    throw new Error("CSV needs day, start, and end columns (weekday/start time/end time also work).");
  }

  const slots: TimeSlot[] = [];
  for (const { cells, line } of nonEmptyRows.slice(1)) {
    const day = parseTimetableDay(cells[dayIndex] ?? "");
    const start = parseTimetableTime(cells[startIndex] ?? "");
    const end = parseTimetableTime(cells[endIndex] ?? "");
    if (!day || start === undefined || end === undefined || end <= start) {
      throw new Error(`Invalid day or time on CSV row ${line}. Use a weekday and times such as 9:00 AM or 09:00.`);
    }
    if (slots.some((slot) => slot.day === day && start < slot.end && slot.start < end)) {
      throw new Error(`Overlapping periods found on CSV row ${line}. Resolve overlaps and import again.`);
    }
    const subject = subjectIndex < 0 ? "" : (cells[subjectIndex] ?? "").trim();
    slots.push({ day, start, end, ...(subject ? { subject } : {}) });
  }

  if (slots.length === 0) throw new Error("The CSV has headers but no timetable periods.");
  return slots.sort(
    (first, second) =>
      weekDays.indexOf(first.day) - weekDays.indexOf(second.day) ||
      first.start - second.start,
  );
}
