import type { ClassRequest, Teacher, TimeSlot } from "@/lib/matching/types";

export type TeacherLeaveSession = {
  id: number;
  subject: string;
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
          slot.dateFrom === leaveSlot.dateFrom &&
          slot.dateTo === leaveSlot.dateTo,
      );
      if (!alreadyExists) timetable.push(leaveSlot);
    }

    return { ...teacher, timetable };
  });
}
