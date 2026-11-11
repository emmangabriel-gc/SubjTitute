import { overlaps } from "./eligibility";
import type { ClassRequest } from "./types";

export function teacherChoice(
  heldIds: string[],
  teacherScores: Record<string, number>,
  requestById: Record<string, ClassRequest>,
  capacity: number,
): string[] {
  const kept: string[] = [];
  const ranked = [...heldIds].sort(
    (left, right) =>
      teacherScores[right] - teacherScores[left] ||
      left.localeCompare(right),
  );
  for (const requestId of ranked) {
    if (kept.length >= capacity) break;
    if (
      kept.some((heldId) =>
        overlaps(requestById[requestId].slot, requestById[heldId].slot),
      )
    ) {
      continue;
    }
    kept.push(requestId);
  }
  return kept;
}
