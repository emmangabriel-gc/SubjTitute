import { describe, expect, it } from "vitest";
import {
  DEFAULT_POLICY,
  isEligible,
  matchSubstitutes,
  overlaps,
  subjectExpertise,
} from "./index";
import type { ClassRequest, Teacher } from "./types";

const request = (
  id: string,
  subject = "Physics",
  start = 10 * 60,
  end = 11 * 60,
): ClassRequest => ({
  id,
  subject,
  slot: { day: "Mon", start, end },
  gradeLevel: 11,
  section: "STEM A",
  minutesUntilStart: 120,
  budgetCap: 200,
  absentTeacherId: "Absent teacher",
  status: "open",
});

const teacher = (id: string, overrides: Partial<Teacher> = {}): Teacher => ({
  id,
  name: id,
  initials: id,
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
  ...overrides,
});

describe("eligibility", () => {
  it("accepts an available teacher who meets every hard constraint", () => {
    expect(isEligible(teacher("T1"), request("C1"), DEFAULT_POLICY)).toBe(true);
  });

  it("does not assign the absent teacher to cover their own class", () => {
    expect(
      isEligible(
        teacher("T1"),
        { ...request("C1"), absentTeacherId: "T1" },
        DEFAULT_POLICY,
      ),
    ).toBe(false);
  });

  it.each([
    ["unavailable", { status: "on_leave" as const }],
    ["schedule conflict", { timetable: [{ day: "Mon", start: 10 * 60, end: 12 * 60 }] }],
    ["subject expertise floor", { specializations: ["Programming"] }],
    ["prep time", { requiredPrepMinutes: 121 }],
    ["budget cap", { honorariumRate: 201 }],
    ["workload cap", { currentSubLoad: 3 }],
  ])("rejects a teacher who fails the %s constraint", (_reason, overrides) => {
    expect(
      isEligible(teacher("T1", overrides), request("C1"), DEFAULT_POLICY),
    ).toBe(false);
  });

  it("uses the same-category expertise fallback", () => {
    expect(
      subjectExpertise(
        teacher("T1", { specializations: ["Chemistry"] }),
        "Physics",
      ),
    ).toBe(0.6);
  });

  it("allows same-time substitute classes when their date ranges do not overlap", () => {
    expect(
      overlaps(
        {
          day: "Mon",
          start: 9 * 60,
          end: 10 * 60,
          dateFrom: "2026-10-01",
          dateTo: "2026-10-10",
        },
        {
          day: "Mon",
          start: 9 * 60,
          end: 10 * 60,
          dateFrom: "2026-10-11",
          dateTo: "2026-10-20",
        },
      ),
    ).toBe(false);
  });

  it("keeps overlapping date ranges as schedule conflicts", () => {
    expect(
      overlaps(
        {
          day: "Mon",
          start: 9 * 60,
          end: 10 * 60,
          dateFrom: "2026-10-01",
          dateTo: "2026-10-15",
        },
        {
          day: "Mon",
          start: 9 * 60,
          end: 10 * 60,
          dateFrom: "2026-10-10",
          dateTo: "2026-10-20",
        },
      ),
    ).toBe(true);
  });
});

describe("deferred acceptance matching", () => {
  it("keeps the Python reference sample assignments", () => {
    const mon = (start: number, end: number) => ({
      day: "Mon",
      start: start * 60,
      end: end * 60,
    });
    const sampleTeachers = [
      teacher("T1", {
        name: "Reyes",
        specializations: ["Physics", "Chemistry"],
        timetable: [mon(7, 9)],
        teachingLoad: 24,
        honorariumRate: 150,
        requiredPrepMinutes: 30,
        subjectPreferences: ["Physics", "Chemistry"],
        preferredGrades: [11, 12],
        preferredPeriods: ["AM"],
      }),
      teacher("T2", {
        name: "Santos",
        specializations: ["General Mathematics"],
        timetable: [mon(13, 15)],
        teachingLoad: 20,
        currentSubLoad: 1,
        honorariumRate: 120,
        requiredPrepMinutes: 20,
        subjectPreferences: [
          "General Mathematics",
          "Statistics and Probability",
        ],
        preferredGrades: [11],
        preferredPeriods: ["AM", "PM"],
      }),
      teacher("T3", {
        name: "Cruz",
        specializations: ["Programming"],
        teachingLoad: 18,
        honorariumRate: 140,
        requiredPrepMinutes: 45,
        subjectPreferences: ["Programming"],
        preferredGrades: [12],
        preferredPeriods: ["PM"],
      }),
      teacher("T4", {
        name: "Lim",
        status: "on_leave",
        specializations: ["Physics"],
        honorariumRate: 100,
        requiredPrepMinutes: 10,
      }),
    ];
    const sampleRequests = [
      { ...request("C1", "Earth Science", 9 * 60, 10 * 60), minutesUntilStart: 90, budgetCap: 200 },
      { ...request("C2", "Statistics and Probability", 10 * 60, 11 * 60), minutesUntilStart: 120, budgetCap: 200 },
      { ...request("C3", "Programming", 10 * 60, 11 * 60), gradeLevel: 12, section: "ICT A", minutesUntilStart: 120, budgetCap: 200 },
    ];

    const result = matchSubstitutes(sampleTeachers, sampleRequests);
    expect(result.assignments).toEqual({
      C1: "T1",
      C2: "T2",
      C3: "T3",
    });
    expect(result.candidateExplanations.C1.T1).toMatchObject({
      subject_expertise: 0.6,
      total: expect.any(Number),
    });
  });

  it("rejects one of two same-time classes when the teacher has capacity one", () => {
    const requests = [request("C1"), request("C2")];
    const result = matchSubstitutes(
      [teacher("T1")],
      requests,
      { ...DEFAULT_POLICY, maxSubsPerTeacher: 1 },
    );
    expect(Object.keys(result.assignments)).toHaveLength(1);
    expect(result.unfilled).toHaveLength(1);
  });

  it("does not assign overlapping classes to the same teacher", () => {
    const requests = [request("C1"), request("C2")];
    const result = matchSubstitutes(
      [teacher("T1")],
      requests,
      { ...DEFAULT_POLICY, maxSubsPerTeacher: 3 },
    );
    expect(Object.keys(result.assignments)).toHaveLength(1);
    expect(result.unfilled).toHaveLength(1);
  });

  it("returns an unfilled result when no candidate is eligible", () => {
    const result = matchSubstitutes(
      [teacher("T1", { specializations: ["Programming"] })],
      [request("C1")],
    );
    expect(result.unfilled).toEqual(["C1"]);
    expect(result.classRankings.C1).toEqual([]);
  });

  it("breaks equal class-side scores by teacher id", () => {
    const result = matchSubstitutes(
      [teacher("T2"), teacher("T1")],
      [request("C1")],
    );
    expect(result.classRankings.C1[0][0]).toBe("T1");
  });
});
