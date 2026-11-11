import { subjectExpertise } from "./eligibility";
import type {
  ClassRequest,
  Policy,
  Teacher,
  Weights,
} from "./types";

function minMax(
  value: number,
  low: number,
  high: number,
  higherIsBetter: boolean,
): number {
  if (high === low) return 1;
  const normalized = (value - low) / (high - low);
  return higherIsBetter ? normalized : 1 - normalized;
}

function rankScore(item: string, ranked: string[]): number {
  if (ranked.length === 0) return 0.5;
  const index = ranked.indexOf(item);
  return index < 0 ? 0 : 1 - index / ranked.length;
}

export function classSideScores(
  request: ClassRequest,
  pool: Teacher[],
  policy: Policy,
  weights: Weights,
): Record<string, Record<string, number>> {
  if (pool.length === 0) return {};

  const raw: Record<string, Record<string, number>> = {
    subject_expertise: Object.fromEntries(
      pool.map((teacher) => [
        teacher.id,
        subjectExpertise(teacher, request.subject),
      ]),
    ),
    current_sub_load: Object.fromEntries(
      pool.map((teacher) => [teacher.id, teacher.currentSubLoad]),
    ),
    teaching_load: Object.fromEntries(
      pool.map((teacher) => [
        teacher.id,
        Math.min(teacher.teachingLoad, policy.maxTeachingLoad),
      ]),
    ),
    notice_time: Object.fromEntries(
      pool.map((teacher) => [
        teacher.id,
        request.minutesUntilStart - teacher.requiredPrepMinutes,
      ]),
    ),
    cost: Object.fromEntries(
      pool.map((teacher) => [teacher.id, teacher.honorariumRate]),
    ),
    preference_list: Object.fromEntries(
      pool.map((teacher) => [
        teacher.id,
        rankScore(request.subject, teacher.subjectPreferences),
      ]),
    ),
  };
  const higherIsBetter: Record<string, boolean> = {
    subject_expertise: true,
    current_sub_load: false,
    teaching_load: false,
    notice_time: true,
    cost: false,
    preference_list: true,
  };
  const normalized: Record<string, Record<string, number>> = Object.fromEntries(
    pool.map((teacher) => [teacher.id, {}]),
  );

  for (const [criterion, values] of Object.entries(raw)) {
    const numbers = Object.values(values);
    const low = Math.min(...numbers);
    const high = Math.max(...numbers);
    for (const [teacherId, value] of Object.entries(values)) {
      normalized[teacherId][criterion] =
        criterion === "subject_expertise" || criterion === "preference_list"
          ? value
          : minMax(value, low, high, higherIsBetter[criterion]);
    }
  }

  for (const teacher of pool) {
    const scores = normalized[teacher.id];
    scores.total = Object.entries(weights.classSide).reduce(
      (total, [criterion, weight]) => total + weight * scores[criterion],
      0,
    );
  }
  return normalized;
}

export function teacherSideScores(
  teacher: Teacher,
  requests: ClassRequest[],
  weights: Weights,
): Record<string, number> {
  return Object.fromEntries(
    requests.map((request) => {
      const period = request.slot.start < 12 * 60 ? "AM" : "PM";
      const scores: Record<string, number> = {
        subject_preference: rankScore(
          request.subject,
          teacher.subjectPreferences,
        ),
        grade_level:
          teacher.preferredGrades.length === 0 ||
          teacher.preferredGrades.includes(request.gradeLevel)
            ? 1
            : 0,
        time_slot:
          teacher.preferredPeriods.length === 0 ||
          teacher.preferredPeriods.includes(period)
            ? 1
            : 0,
        subject_fit: subjectExpertise(teacher, request.subject),
        honorarium: 1,
      };
      return [
        request.id,
        Object.entries(weights.teacherSide).reduce(
          (total, [criterion, weight]) => total + weight * scores[criterion],
          0,
        ),
      ];
    }),
  );
}
