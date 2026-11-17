import { resolve } from "node:path";
import { readSheet } from "read-excel-file/node";
import { describe, expect, it } from "vitest";
import { parseTimetableWorkbook } from "./timetable-workbook";

async function getTemplateRows() {
  return readSheet(resolve(process.cwd(), "public", "timetable_template.xlsx"), "Timetable");
}

describe("parseTimetableWorkbook", () => {
  it("maps filled weekday subject cells from the supplied Excel template", async () => {
    const rows = (await getTemplateRows()).map((row) => [...row]);
    rows[0][4] = "Jordan Lee";
    rows[5][4] = "Physics";
    rows[5][6] = "Chemistry";
    rows[6][10] = "English";

    expect(parseTimetableWorkbook(rows)).toEqual({
      teacherName: "Jordan Lee",
      slots: [
        { day: "Mon", start: 420, end: 480 },
        { day: "Tue", start: 420, end: 480 },
        { day: "Thu", start: 480, end: 540 },
      ],
    });
  });

  it("rejects a blank template instead of replacing the schedule with no periods", async () => {
    const rows = await getTemplateRows();
    expect(() => parseTimetableWorkbook(rows)).toThrow(/no scheduled classes/i);
  });

  it("rejects invalid and overlapping class periods", async () => {
    const invalidRows = (await getTemplateRows()).map((row) => [...row]);
    invalidRows[5][2] = "6:00";
    invalidRows[5][4] = "Physics";
    expect(() => parseTimetableWorkbook(invalidRows)).toThrow(/invalid time/i);

    const overlappingRows = (await getTemplateRows()).map((row) => [...row]);
    overlappingRows[5][4] = "Physics";
    overlappingRows[6][4] = "Chemistry";
    overlappingRows[6][0] = "7:30";
    overlappingRows[6][2] = "8:30";
    expect(() => parseTimetableWorkbook(overlappingRows)).toThrow(/overlapping/i);
  });
});
