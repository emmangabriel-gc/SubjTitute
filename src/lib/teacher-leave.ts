import type { ClassRequest, Teacher, TimeSlot } from "@/lib/matching/types";

export type TeacherLeaveSession = {
  id: number;
  subject: string;
  lessonPlan: string;
  textbookPdfs: File[];
  gradeLevel: number;
  section: string;
  date: string;
  startHour: string;
  endHour: string;
};

export type TeacherLeaveApplication = {
  id: string;
  teacherId: string;
  sessions: TeacherLeaveSession[];
  reasonDescription: string;
  proofs: File[];
  status: "pending" | "approved" | "rejected";
  classRequestIds: string[];
};

const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function getTeacherStatusForDate(
  teacher: Teacher,
  requests: ClassRequest[],
  date: string,
): Teacher["status"] {
  const isOnLeave = requests.some((request) => {
    if (request.absentTeacherId !== teacher.id) return false;
    const dateFrom = request.slot.dateFrom ?? request.slot.dateTo;
    const dateTo = request.slot.dateTo ?? request.slot.dateFrom;
    return Boolean(dateFrom && dateTo && dateFrom <= date && date <= dateTo);
  });

  return isOnLeave ? "on_leave" : teacher.status;
}

function getSubstitutionWindow(request: ClassRequest): { start: Date; end: Date } | undefined {
  const startDate = request.slot.dateFrom ?? request.slot.dateTo;
  const endDate = request.slot.dateTo ?? request.slot.dateFrom;
  if (!startDate || !endDate) return undefined;

  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return undefined;

  start.setMinutes(request.slot.start);
  end.setMinutes(request.slot.end);
  return { start, end };
}

export function isSubstitutionInProgress(request: ClassRequest, now: Date): boolean {
  const window = getSubstitutionWindow(request);
  return Boolean(window && window.start <= now && now < window.end);
}

export function hasSubstitutionEnded(request: ClassRequest, now: Date): boolean {
  const window = getSubstitutionWindow(request);
  return Boolean(window && now >= window.end);
}

export function addConfirmedSubstitutionsToTimetables(
  teachers: Teacher[],
  requests: ClassRequest[],
  assignments: Record<string, string>,
  now: Date,
): Teacher[] {
  const slotsByTeacher = new Map<string, TimeSlot[]>();

  for (const request of requests) {
    const teacherId = assignments[request.id];
    if (
      request.status !== "confirmed" ||
      !teacherId ||
      hasSubstitutionEnded(request, now)
    ) {
      continue;
    }

    slotsByTeacher.set(teacherId, [
      ...(slotsByTeacher.get(teacherId) ?? []),
      { ...request.slot, subject: request.subject },
    ]);
  }

  return teachers.map((teacher) => {
    const substitutionSlots = slotsByTeacher.get(teacher.id);
    if (!substitutionSlots?.length) return teacher;

    const timetable = [...teacher.timetable];
    for (const substitutionSlot of substitutionSlots) {
      const alreadyExists = timetable.some(
        (slot) =>
          slot.day === substitutionSlot.day &&
          slot.start === substitutionSlot.start &&
          slot.end === substitutionSlot.end &&
          slot.subject === substitutionSlot.subject &&
          slot.dateFrom === substitutionSlot.dateFrom &&
          slot.dateTo === substitutionSlot.dateTo,
      );
      if (!alreadyExists) timetable.push(substitutionSlot);
    }

    return { ...teacher, timetable };
  });
}

export function addApprovedLeaveToTimetables(
  teachers: Teacher[],
  applications: TeacherLeaveApplication[],
): Teacher[] {
  const approvedSlots = new Map<string, TimeSlot[]>();

  for (const application of applications) {
    if (application.status !== "approved") continue;
    const slots = application.sessions.map((session) => ({
      day: weekDays[new Date(`${session.date}T00:00:00Z`).getUTCDay()],
      start: Number(session.startHour) * 60,
      end: Number(session.endHour) * 60,
      subject: session.subject,
      dateFrom: session.date,
      dateTo: session.date,
    }));
    approvedSlots.set(application.teacherId, [
      ...(approvedSlots.get(application.teacherId) ?? []),
      ...slots,
    ]);
  }

  return teachers.map((teacher) => {
    const leaveSlots = approvedSlots.get(teacher.id);
    if (!leaveSlots?.length) return teacher;

    const timetable = [...teacher.timetable];
    for (const leaveSlot of leaveSlots) {
      const alreadyExists = timetable.some(
        (slot) =>
          slot.day === leaveSlot.day &&
          slot.start === leaveSlot.start &&
          slot.end === leaveSlot.end &&
          slot.subject === leaveSlot.subject &&
          slot.dateFrom === leaveSlot.dateFrom &&
          slot.dateTo === leaveSlot.dateTo,
      );
      if (!alreadyExists) timetable.push(leaveSlot);
    }

    return { ...teacher, timetable };
  });
}
