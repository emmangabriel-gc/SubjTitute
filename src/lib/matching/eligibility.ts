import type { ClassRequest, Policy, Teacher, TimeSlot } from "./types";

export const SUBJECT_CATEGORY: Record<string, string> = {
  "General Mathematics": "Math",
  "Statistics and Probability": "Math",
  "Pre-Calculus": "Math",
  "Basic Calculus": "Math",
  "Earth Science": "Science",
  Physics: "Science",
  Chemistry: "Science",
  Biology: "Science",
  "Oral Communication": "English",
  "Reading and Writing": "English",
  "Computer Systems Servicing": "TechVoc",
  Programming: "TechVoc",
  "Empowerment Technologies": "TechVoc",
};

export function qualificationScore(qualification: string): number {
  const scores: Record<string, number> = {
    "Bachelor's degree": 0.25,
    "Bachelor's degree with professional education units": 0.5,
    "Master's degree": 0.75,
    Doctorate: 1,
  };
  return scores[qualification] ?? 0;
}

export function overlaps(left: TimeSlot, right: TimeSlot): boolean {
  if (
    left.day !== right.day ||
    left.start >= right.end ||
    right.start >= left.end
  ) {
    return false;
  }
  if (left.dateFrom && right.dateTo && left.dateFrom > right.dateTo) {
    return false;
  }
  if (right.dateFrom && left.dateTo && right.dateFrom > left.dateTo) {
    return false;
  }
  return true;
}

export function subjectExpertise(teacher: Teacher, subject: string): number {
  if (teacher.specializations.includes(subject)) return 1;
  const category = SUBJECT_CATEGORY[subject];
  if (
    category &&
    teacher.specializations.some(
      (specialization) => SUBJECT_CATEGORY[specialization] === category,
    )
  ) {
    return 0.6;
  }
  return 0;
}

export function isEligible(
  teacher: Teacher,
  request: ClassRequest,
  policy: Policy,
): boolean {
  return (
    teacher.status === "available" &&
    teacher.id !== request.absentTeacherId &&
    !teacher.timetable.some((slot) => overlaps(request.slot, slot)) &&
    subjectExpertise(teacher, request.subject) >= policy.minExpertise &&
    request.minutesUntilStart >= teacher.requiredPrepMinutes &&
    teacher.honorariumRate <= request.budgetCap &&
    teacher.currentSubLoad < policy.maxSubsPerTeacher
  );
}
