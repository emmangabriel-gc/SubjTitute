import type { TimeSlot } from "./matching/types";
import { parseTimetableDay, parseTimetableTime } from "./timetable-csv";

export type ParsedTimetableWorkbook = {
  teacherName?: string;
  slots: TimeSlot[];
};

function normalizeCell(value: unknown): string {
  return typeof value === "string"
    ? value.trim().toLowerCase().replace(/[^a-z]/g, "")
    : "";
}

function parseWorkbookTime(value: unknown, period: unknown): number | undefined {
  if (value instanceof Date) {
    return value.getUTCHours() * 60 + value.getUTCMinutes();
  }
  if (typeof value === "number") {
    if (value < 0 || value >= 1) return undefined;
    return Math.round(value * 24 * 60);
  }
  if (typeof value !== "string" || !value.trim()) return undefined;

  const time = value.trim();
  const hasMeridiem = /\b(?:am|pm)\s*$/i.test(time);
  const suffix = typeof period === "string" ? period.trim() : "";
  return parseTimetableTime(hasMeridiem || !suffix ? time : `${time} ${suffix}`);
}

export function parseTimetableWorkbook(
  rows: readonly (readonly unknown[])[],
): ParsedTimetableWorkbook {
  const dayHeaderIndex = rows.findIndex(
    (row) =>
      row.some((cell) => normalizeCell(cell) === "time") &&
      row.some(
        (cell) =>
          typeof cell === "string" && parseTimetableDay(cell) !== undefined,
      ),
  );
  if (dayHeaderIndex < 0) {
    throw new Error('The workbook needs a weekday timetable header on the "Timetable" sheet.');
  }

  const timeHeader = rows[dayHeaderIndex + 1];
  if (
    normalizeCell(timeHeader?.[0]) !== "start" ||
    normalizeCell(timeHeader?.[2]) !== "end"
  ) {
    throw new Error('The "Timetable" sheet needs Start and End time columns.');
  }

  const dayColumns = rows[dayHeaderIndex]
    .map((cell, column) => ({
      day: typeof cell === "string" ? parseTimetableDay(cell) : undefined,
      column,
    }))
    .filter(
      (entry): entry is { day: string; column: number } =>
        entry.day !== undefined,
    );
  if (
    dayColumns.length === 0 ||
    dayColumns.some(
      ({ column }) => normalizeCell(timeHeader?.[column]) !== "subject",
    )
  ) {
    throw new Error('Each weekday in the "Timetable" sheet needs a Subject column.');
  }

  const teacherNameRow = rows.find((row) => normalizeCell(row[0]) === "teachername");
  const teacherNameCell = teacherNameRow
    ?.slice(1)
    .find((cell) => typeof cell === "string" && cell.trim());
  const teacherName =
    typeof teacherNameCell === "string" ? teacherNameCell.trim() : undefined;

  const slots: TimeSlot[] = [];
  for (let rowIndex = dayHeaderIndex + 2; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];
    if (!row) continue;

    for (const { day, column } of dayColumns) {
      const subject = row[column];
      if (typeof subject !== "string" || !subject.trim()) continue;

      const start = parseWorkbookTime(row[0], row[1]);
      const end = parseWorkbookTime(row[2], row[3]);
      if (start === undefined || end === undefined || end <= start) {
        throw new Error(`Invalid time on timetable row ${rowIndex + 1}.`);
      }
      if (slots.some((slot) => slot.day === day && start < slot.end && slot.start < end)) {
        throw new Error(`Overlapping periods found on timetable row ${rowIndex + 1}.`);
      }
      slots.push({ day, start, end, subject: subject.trim() });
    }
  }

  if (slots.length === 0) {
    throw new Error('No scheduled classes were found on the "Timetable" sheet. Fill in at least one subject.');
  }

  const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return {
    ...(teacherName ? { teacherName } : {}),
    slots: slots.sort(
      (first, second) =>
        weekdays.indexOf(first.day) - weekdays.indexOf(second.day) ||
        first.start - second.start,
    ),
  };
}
