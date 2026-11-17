import type { Teacher } from "./matching/types";
import { normalizeCsvHeader, parseCsvRows } from "./csv";

export type ImportedTeacher = {
  line: number;
  name: string;
  status: Teacher["status"];
  specializations: string[];
  qualification: string;
};

function parseTeacherStatus(value: string, line: number): Teacher["status"] {
  const normalized = value.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (normalized === "available" || normalized === "on_leave" || normalized === "inactive") {
    return normalized;
  }
  throw new Error(`Invalid teacher status on CSV row ${line}. Use Available, On leave, or Inactive.`);
}

export function parseTeachersCsv(value: string): ImportedTeacher[] {
  const rows = parseCsvRows(value.replace(/^\uFEFF/, ""));
  const nonEmptyRows = rows
    .map((cells, index) => ({ cells, line: index + 1 }))
    .filter(({ cells }) => cells.some((cell) => cell.trim()));
  const headerRow = nonEmptyRows[0];
  if (!headerRow) throw new Error("The teacher CSV file is empty.");

  const headers = headerRow.cells.map(normalizeCsvHeader);
  const nameIndex = headers.findIndex((header) =>
    ["name", "teacher", "teachername"].includes(header),
  );
  const statusIndex = headers.indexOf("status");
  const specializationsIndex = headers.findIndex((header) =>
    ["specializations", "subjectspecializations", "subjects"].includes(header),
  );
  const qualificationIndex = headers.findIndex((header) =>
    ["qualification", "level", "levelqualification"].includes(header),
  );

  if ([nameIndex, statusIndex, specializationsIndex, qualificationIndex].some((index) => index < 0)) {
    throw new Error(
      "Teacher CSV needs Name, Status, Specializations, and Level / qualification columns.",
    );
  }

  const importedTeachers = nonEmptyRows.slice(1).map(({ cells, line }) => {
    const name = (cells[nameIndex] ?? "").trim();
    const qualification = (cells[qualificationIndex] ?? "").trim();
    const specializations = (cells[specializationsIndex] ?? "")
      .split(";")
      .map((subject) => subject.trim())
      .filter(Boolean);

    if (!name) throw new Error(`Teacher name is missing on CSV row ${line}.`);
    if (!qualification) throw new Error(`Qualification is missing on CSV row ${line}.`);
    if (specializations.length === 0) {
      throw new Error(`At least one specialization is required on CSV row ${line}.`);
    }

    return {
      line,
      name,
      status: parseTeacherStatus(cells[statusIndex] ?? "", line),
      specializations,
      qualification,
    };
  });

  if (importedTeachers.length === 0) {
    throw new Error("The teacher CSV has headers but no teacher rows.");
  }

  return importedTeachers;
}
