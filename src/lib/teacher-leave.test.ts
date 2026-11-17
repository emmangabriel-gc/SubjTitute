import { describe, expect, it } from "vitest";
import {
  addConfirmedSubstitutionsToTimetables,
  addApprovedLeaveToTimetables,
  hasSubstitutionEnded,
  isSubstitutionInProgress,
  getTeacherStatusForDate,
} from "./teacher-leave";
import { DEFAULT_POLICY, isEligible } from "./matching";
import type { ClassRequest, Teacher } from "./matching/types";

const teacher: Teacher = {
  id: "T1",
  name: "Teacher One",
  initials: "TO",
  color: "#ffffff",
  status: "available",
  specializations: ["Physics"],
  timetable: [],
  qualification: "Bachelor's degree",
  teachingLoad: 20,
  currentSubLoad: 0,
  honorariumRate: 100,
  requiredPrepMinutes: 30,
  subjectPreferences: ["Physics"],
  preferredGrades: [],
  preferredPeriods: [],
};

const absenceRequest = (date: string): ClassRequest => ({
  id: "C1",
  subject: "Physics",
  slot: {
    day: "Mon",
    start: 9 * 60,
    end: 10 * 60,
    dateFrom: date,
    dateTo: date,
  },
  gradeLevel: 11,
  section: "STEM A",
  minutesUntilStart: 120,
  budgetCap: 200,
  absentTeacherId: teacher.id,
  status: "open",
});

describe("teacher leave", () => {
  it("shows leave only on its date and returns to the teacher's base status afterward", () => {
    const request = absenceRequest("2026-10-05");

    expect(getTeacherStatusForDate(teacher, [request], "2026-10-04")).toBe("available");
    expect(getTeacherStatusForDate(teacher, [request], "2026-10-05")).toBe("on_leave");
    expect(getTeacherStatusForDate(teacher, [request], "2026-10-06")).toBe("available");
  });

  it("shows a confirmed substitute only during its scheduled period", () => {
    const request = {
      ...absenceRequest("2026-10-05"),
      absentTeacherId: "T2",
      status: "confirmed" as const,
    };

    expect(isSubstitutionInProgress(request, new Date(2026, 9, 5, 8, 59))).toBe(false);
    expect(isSubstitutionInProgress(request, new Date(2026, 9, 5, 9, 0))).toBe(true);
    expect(isSubstitutionInProgress(request, new Date(2026, 9, 5, 10, 0))).toBe(false);
    expect(hasSubstitutionEnded(request, new Date(2026, 9, 5, 9, 59))).toBe(false);
    expect(hasSubstitutionEnded(request, new Date(2026, 9, 5, 10, 0))).toBe(true);
  });

  it("adds a confirmed assignment to matching only until its end time", () => {
    const request = {
      ...absenceRequest("2026-10-05"),
      absentTeacherId: "T2",
      status: "confirmed" as const,
    };
    const assignments = { [request.id]: teacher.id };
    const duringClass = addConfirmedSubstitutionsToTimetables(
      [teacher],
      [request],
      assignments,
      new Date(2026, 9, 5, 9, 30),
    );
    const afterClass = addConfirmedSubstitutionsToTimetables(
      [teacher],
      [request],
      assignments,
      new Date(2026, 9, 5, 10, 0),
    );

    expect(duringClass[0].timetable).toHaveLength(1);
    expect(afterClass[0]).toBe(teacher);
    expect(teacher.timetable).toHaveLength(0);
  });

  it("adds approved leave sessions as date-specific timetable conflicts", () => {
    const [teacherWithLeave] = addApprovedLeaveToTimetables([teacher], [{
      id: "L1",
      teacherId: teacher.id,
      status: "approved",
      classRequestIds: [],
      reasonDescription: "Medical appointment",
      proofs: [],
      sessions: [{
        id: 1,
        subject: "Physics",
        lessonPlan: "Vectors and their applications",
        textbookPdfs: [],
        gradeLevel: 11,
        section: "STEM A",
        date: "2026-10-05",
        startHour: "9",
        endHour: "10",
      }],
    }]);

    expect(teacherWithLeave.timetable).toEqual([{
      day: "Mon",
      start: 9 * 60,
      end: 10 * 60,
      subject: "Physics",
      dateFrom: "2026-10-05",
      dateTo: "2026-10-05",
    }]);

    const coverageRequest = (date: string): ClassRequest => ({
      ...absenceRequest(date),
      absentTeacherId: "T2",
    });
    expect(isEligible(teacherWithLeave, coverageRequest("2026-10-05"), DEFAULT_POLICY)).toBe(false);
    expect(isEligible(teacherWithLeave, coverageRequest("2026-10-12"), DEFAULT_POLICY)).toBe(true);
  });

  it("does not reserve sessions from pending leave applications", () => {
    const [teacherWithPendingLeave] = addApprovedLeaveToTimetables([teacher], [{
      id: "L1",
      teacherId: teacher.id,
      status: "pending",
      classRequestIds: [],
      reasonDescription: "Medical appointment",
      proofs: [],
      sessions: [{
        id: 1,
        subject: "Physics",
        lessonPlan: "Vectors and their applications",
        textbookPdfs: [],
        gradeLevel: 11,
        section: "STEM A",
        date: "2026-10-05",
        startHour: "9",
        endHour: "10",
      }],
    }]);

    expect(teacherWithPendingLeave).toBe(teacher);
  });
});
