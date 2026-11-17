import { describe, expect, it } from "vitest";
import { parseTimetableCsv } from "./timetable-csv";

describe("parseTimetableCsv", () => {
  it("parses 12-hour and 24-hour times, full weekdays, and sorts periods", () => {
    expect(
      parseTimetableCsv(
        "\uFEFFweekday,start time,end time\r\nTuesday,13:00,14:30\r\nMon,9:00 AM,10:00 AM\r\n",
      ),
    ).toEqual([
      { day: "Mon", start: 540, end: 600 },
      { day: "Tue", start: 780, end: 870 },
    ]);
  });

  it("supports quoted CSV fields and escaped quotes", () => {
    expect(parseTimetableCsv('day,start,end,note\r\n"Monday","9:00 AM","10:00 AM","Room ""A"""\r\n'))
      .toEqual([{ day: "Mon", start: 540, end: 600 }]);
  });

  it.each([
    ["missing required headers", "period,from,to\nMon,9:00,10:00", /needs day, start, and end columns/i],
    ["invalid weekday", "day,start,end\nFunday,9:00,10:00", /row 2/i],
    ["invalid time", "day,start,end\nMon,25:00,26:00", /row 2/i],
    ["end before start", "day,start,end\nMon,10:00,09:00", /row 2/i],
    ["overlapping periods", "day,start,end\nMon,9:00,10:00\nMonday,9:30,10:30", /overlapping periods/i],
    ["empty schedule", "day,start,end\n\n", /no timetable periods/i],
    ["unclosed quote", 'day,start,end\nMon,"9:00,10:00', /not closed/i],
  ])("rejects %s", (_case, input, error) => {
    expect(() => parseTimetableCsv(input)).toThrow(error);
  });
});
