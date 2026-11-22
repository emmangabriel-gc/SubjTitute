export type TimeSlot = {
  day: string;
  start: number;
  end: number;
  subject?: string;
  dateFrom?: string;
  dateTo?: string;
};

export type Teacher = {
  id: string;
  name: string;
  initials: string;
  color: string;
  status: "available" | "on_leave" | "inactive";
  specializations: string[];
  timetable: TimeSlot[];
  qualification: string;
  teachingLoad: number;
  currentSubLoad: number;
  honorariumRate: number;
  requiredPrepMinutes: number;
  subjectPreferences: string[];
  preferredGrades: number[];
  preferredPeriods: ("AM" | "PM")[];
};

export type ClassRequest = {
  id: string;
  subject: string;
  slot: TimeSlot;
  gradeLevel: number;
  section: string;
  minutesUntilStart: number;
  budgetCap: number;
  absentTeacherId: string;
  lessonPlan?: string;
  textbookPdfs?: File[];
  status: "open" | "matched" | "unfilled" | "confirmed";
};

export type Policy = {
  minExpertise: number;
  maxSubsPerTeacher: number;
  maxTeachingLoad: number;
};

export type ClassSideCriterion =
  | "subject_expertise"
  | "current_sub_load"
  | "teaching_load"
  | "notice_time"
  | "preference_list";

export type TeacherSideCriterion =
  | "subject_preference"
  | "grade_level"
  | "time_slot"
  | "subject_fit"
  | "honorarium";

export type Weights = {
  classSide: Record<ClassSideCriterion, number>;
  teacherSide: Record<TeacherSideCriterion, number>;
};

export type MatchResult = {
  assignments: Record<string, string>;
  unfilled: string[];
  classRankings: Record<string, Array<[string, number]>>;
  explanations: Record<string, Record<string, number>>;
  candidateExplanations: Record<
    string,
    Record<string, Record<string, number>>
  >;
};
