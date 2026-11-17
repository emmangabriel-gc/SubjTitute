import { describe, expect, it } from "vitest";
import { parseTeachersCsv } from "./teacher-csv";

describe("parseTeachersCsv", () => {
  it("parses exported teacher columns, quoted names, and semicolon-separated subjects", () => {
    expect(
      parseTeachersCsv(
        '\uFEFFName,Status,Specializations,Level / qualification,Substitute load\r\n"Ana, Lee",Available,"Physics; Chemistry",Master\'s degree,1\r\n',
      ),
    ).toEqual([
      {
        line: 2,
        name: "Ana, Lee",
        status: "available",
        specializations: ["Physics", "Chemistry"],
        qualification: "Master's degree",
      },
    ]);
  });

  it("accepts On leave and header aliases", () => {
    expect(
      parseTeachersCsv("Teacher,Status,Subjects,Qualification\nJordan Lee,On leave,Biology,Bachelor's degree"),
    ).toEqual([
      {
        line: 2,
        name: "Jordan Lee",
        status: "on_leave",
        specializations: ["Biology"],
        qualification: "Bachelor's degree",
      },
    ]);
  });

  it.each([
    ["missing required headers", "name,subjects\nJordan Lee,Biology", /needs Name, Status/i],
    ["invalid status", "name,status,specializations,qualification\nJordan,substitute,Biology,Master's degree", /status on CSV row 2/i],
    ["missing name", "name,status,specializations,qualification\n,available,Biology,Master's degree", /name is missing on CSV row 2/i],
    ["missing specialization", "name,status,specializations,qualification\nJordan,available,,Master's degree", /specialization is required on CSV row 2/i],
    ["empty data", "name,status,specializations,qualification\n", /no teacher rows/i],
    ["unclosed quote", 'name,status,specializations,qualification\n"Jordan,available,Biology,Master\'s degree', /not closed/i],
  ])("rejects %s", (_case, input, error) => {
    expect(() => parseTeachersCsv(input)).toThrow(error);
  });
});
