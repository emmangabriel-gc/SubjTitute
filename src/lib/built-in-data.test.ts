import { describe, expect, it } from "vitest";
import { builtInTeachers } from "./built-in-data";

describe("built-in teacher data", () => {
  it("uses unique teacher IDs and names", () => {
    expect(new Set(builtInTeachers.map((teacher) => teacher.id)).size).toBe(
      builtInTeachers.length,
    );
    expect(new Set(builtInTeachers.map((teacher) => teacher.name)).size).toBe(
      builtInTeachers.length,
    );
  });

  it("keeps supplied timetable periods valid and aligned with teacher subjects", () => {
    for (const teacher of builtInTeachers) {
      for (const [index, slot] of teacher.timetable.entries()) {
        expect(slot.end).toBeGreaterThan(slot.start);
        expect(slot.start).toBeGreaterThanOrEqual(0);
        expect(slot.end).toBeLessThanOrEqual(24 * 60);
        expect(teacher.specializations).toContain(slot.subject);
        expect(
          teacher.timetable
            .slice(index + 1)
            .some(
              (other) =>
                other.day === slot.day &&
                slot.start < other.end &&
                other.start < slot.end,
            ),
        ).toBe(false);
      }
    }
  });
});
