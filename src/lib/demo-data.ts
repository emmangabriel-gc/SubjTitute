import type { ClassRequest, Teacher } from "./matching/types";
import { builtInTeachers } from "./built-in-data";

export const teachers: Teacher[] = builtInTeachers;
export const classRequests: ClassRequest[] = [];
