import { isEligible } from "./eligibility";
import { teacherChoice } from "./deferredAcceptance";
import { classSideScores, teacherSideScores } from "./scoring";
import type {
  ClassRequest,
  MatchResult,
  Policy,
  Teacher,
  Weights,
} from "./types";

export const DEFAULT_POLICY: Policy = {
  minExpertise: 0.6,
  maxSubsPerTeacher: 3,
  maxTeachingLoad: 30,
};

export const DEFAULT_WEIGHTS: Weights = {
  classSide: {
    subject_expertise: 0.3,
    current_sub_load: 0.15,
    teaching_load: 0.1,
    notice_time: 0.1,
    cost: 0.05,
    preference_list: 0.2,
    qualification: 0.1,
  },
  teacherSide: {
    subject_preference: 0.4,
    grade_level: 0.15,
    time_slot: 0.15,
    subject_fit: 0.2,
    honorarium: 0.1,
  },
};

function rounded(value: number): number {
  return Number(value.toFixed(4));
}

export function matchSubstitutes(
  teachers: Teacher[],
  requests: ClassRequest[],
  policy: Policy = DEFAULT_POLICY,
  weights: Weights = DEFAULT_WEIGHTS,
): MatchResult {
  const requestById = Object.fromEntries(
    requests.map((request) => [request.id, request]),
  );
  const eligible = Object.fromEntries(
    requests.map((request) => [
      request.id,
      teachers.filter((teacher) => isEligible(teacher, request, policy)),
    ]),
  );
  const breakdown: Record<string, Record<string, Record<string, number>>> = {};
  const classPreferences: Record<string, string[]> = {};
  const classRankings: MatchResult["classRankings"] = {};

  for (const request of requests) {
    const scores = classSideScores(
      request,
      eligible[request.id],
      policy,
      weights,
    );
    breakdown[request.id] = scores;
    const ranked = Object.entries(scores).sort(
      ([leftId, left], [rightId, right]) =>
        right.total - left.total || leftId.localeCompare(rightId),
    );
    classPreferences[request.id] = ranked.map(([teacherId]) => teacherId);
    classRankings[request.id] = ranked.map(([teacherId, score]) => [
      teacherId,
      rounded(score.total),
    ]);
  }

  const teacherScores: Record<string, Record<string, number>> = {};
  for (const teacher of teachers) {
    const listedRequests = requests.filter((request) =>
      eligible[request.id].some((candidate) => candidate.id === teacher.id),
    );
    teacherScores[teacher.id] = teacherSideScores(
      teacher,
      listedRequests,
      weights,
    );
  }

  const capacity = Object.fromEntries(
    teachers.map((teacher) => [
      teacher.id,
      Math.max(0, policy.maxSubsPerTeacher - teacher.currentSubLoad),
    ]),
  );
  const held: Record<string, string[]> = Object.fromEntries(
    teachers.map((teacher) => [teacher.id, []]),
  );
  const nextIndex: Record<string, number> = Object.fromEntries(
    requests.map((request) => [request.id, 0]),
  );
  const free = requests.map((request) => request.id);

  while (free.length > 0) {
    const requestId = free.shift();
    if (requestId === undefined) break;
    const preferences = classPreferences[requestId];
    if (nextIndex[requestId] >= preferences.length) continue;

    const teacherId = preferences[nextIndex[requestId]];
    nextIndex[requestId] += 1;
    const tentative = [...held[teacherId], requestId];
    const kept = teacherChoice(
      tentative,
      teacherScores[teacherId],
      requestById,
      capacity[teacherId],
    );
    for (const rejected of tentative) {
      if (!kept.includes(rejected)) free.push(rejected);
    }
    held[teacherId] = kept;
  }

  const assignments: Record<string, string> = {};
  for (const [teacherId, requestIds] of Object.entries(held)) {
    for (const requestId of requestIds) assignments[requestId] = teacherId;
  }
  const unfilled = requests
    .map((request) => request.id)
    .filter((requestId) => !(requestId in assignments));
  const explanations: MatchResult["explanations"] = Object.fromEntries(
    Object.entries(assignments).map(([requestId, teacherId]) => [
      requestId,
      Object.fromEntries(
        Object.entries(breakdown[requestId][teacherId]).map(
          ([criterion, score]) => [criterion, rounded(score)],
        ),
      ),
    ]),
  );
  const candidateExplanations: MatchResult["candidateExplanations"] =
    Object.fromEntries(
      Object.entries(breakdown).map(([requestId, teacherScores]) => [
        requestId,
        Object.fromEntries(
          Object.entries(teacherScores).map(([teacherId, scores]) => [
            teacherId,
            Object.fromEntries(
              Object.entries(scores).map(([criterion, score]) => [
                criterion,
                rounded(score),
              ]),
            ),
          ]),
        ),
      ]),
    );

  return {
    assignments,
    unfilled,
    classRankings,
    explanations,
    candidateExplanations,
  };
}

export {
  isEligible,
  overlaps,
  qualificationScore,
  subjectExpertise,
} from "./eligibility";
export type * from "./types";
