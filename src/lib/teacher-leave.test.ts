import { describe, expect, it } from "vitest";
import {
  addApprovedLeaveToTimetables,
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

  it("adds approved leave sessions as date-specific timetable conflicts", () => {
    const [teacherWithLeave] = addApprovedLeaveToTimetables([teacher], [{
      id: "L1",
      teacherId: teacher.id,
      status: "approved",
      classRequestIds: [],
      sessions: [{
        id: 1,
        subject: "Physics",
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
      sessions: [{
        id: 1,
        subject: "Physics",
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
