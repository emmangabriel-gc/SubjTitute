"use client";

import type { ChangeEvent, FormEvent, ReactNode } from "react";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { classRequests, teachers } from "@/lib/demo-data";
import { matchSubstitutes, overlaps } from "@/lib/matching";
import type { ClassRequest, MatchResult, Teacher } from "@/lib/matching/types";
import { parseTimetableCsv } from "@/lib/timetable-csv";

type View = "Overview" | "Absences" | "Teachers" | "Match results" | "Settings";
type TeacherLeaveSession = {
  id: number;
  subject: string;
  gradeLevel: number;
  section: string;
  date: string;
  startHour: string;
  endHour: string;
};
type TeacherLeaveApplication = {
  id: string;
  teacherId: string;
  sessions: TeacherLeaveSession[];
  status: "pending" | "approved" | "rejected";
  classRequestIds: string[];
};
type IconName =
  | "grid"
  | "calendar"
  | "users"
  | "sparkles"
  | "settings"
  | "search"
  | "bell"
  | "arrow"
  | "plus"
  | "check"
  | "clock"
  | "chart"
  | "chevron"
  | "x"
  | "filter"
  | "book"
  | "coin"
  | "trend"
  | "shield"
  | "menu"
  | "moon"
  | "sun";

const subjectOptions = [
  "General Mathematics",
  "Statistics and Probability",
  "Pre-Calculus",
  "Basic Calculus",
  "Earth Science",
  "Physics",
  "Chemistry",
  "Biology",
  "Oral Communication",
  "Reading and Writing",
  "Computer Systems Servicing",
  "Programming",
  "Empowerment Technologies",
];
const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const qualificationOptions = [
  "Bachelor's degree",
  "Bachelor's degree with professional education units",
  "Master's degree",
  "Doctorate",
];
const teacherColors = [
  "#d9ff91",
  "#ffe6b5",
  "#ffd9df",
  "#dceeff",
  "#e7e1ff",
  "#e4f9ec",
];
const DEFAULT_BUDGET_CAP = 200;
const DEFAULT_TEACHER_PASSWORD = "teacher";

const iconArtwork: Record<IconName, ReactNode> = {
  grid: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2.5" /><path d="M7 3v4M17 3v4M3 10h18" /></>,
  users: <><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="10" cy="7" r="4" /><path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
  sparkles: <><path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3Z" /><path d="m19 14 1.1 2.9L23 18l-2.9 1.1L19 22l-1.1-2.9L15 18l2.9-1.1L19 14ZM5 2l.8 2.2L8 5l-2.2.8L5 8l-.8-2.2L2 5l2.2-.8L5 2Z" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.7a8 8 0 0 1-1.8 1l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.8-1l-1.7.7-1.4-2.4L7.1 15a8 8 0 0 1 0-2l-1.4-1.1 1.4-2.4 1.7.7a8 8 0 0 1 1.8-1l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.8 1l1.7-.7 1.4 2.4-1.4 1.1a8 8 0 0 1-.1 2Z" /></>,
  search: <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>,
  arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
  plus: <><path d="M12 5v14M5 12h14" /></>,
  check: <path d="m5 12 4 4L19 6" />,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  chart: <><path d="M3 3v18h18M8 15l4-4 3 3 6-7" /></>,
  chevron: <path d="m9 18 6-6-6-6" />,
  x: <><path d="m18 6-12 12M6 6l12 12" /></>,
  filter: <><path d="M4 7h16M7 12h10M10 17h4" /><circle cx="8" cy="7" r="1.5" /><circle cx="15" cy="12" r="1.5" /></>,
  book: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H6.5A2.5 2.5 0 0 0 4 22V5.5Z" /><path d="M4 18a2.5 2.5 0 0 1 2.5-2.5H20M8 7h8" /></>,
  coin: <><ellipse cx="12" cy="6" rx="8" ry="3" /><path d="M4 6v5c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 11v5c0 1.7 3.6 3 8 3s8-1.3 8-3v-5" /></>,
  trend: <><path d="m3 17 6-6 4 4 8-8" /><path d="M15 7h6v6" /></>,
  shield: <><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" /><path d="m9 12 2 2 4-4" /></>,
  menu: <><path d="M4 6h16M4 12h16M4 18h16" /></>,
  moon: <path d="M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z" />,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" /></>,
};

function ThemeToggle({
  darkMode,
  onToggle,
  compact = false,
}: {
  darkMode: boolean;
  onToggle: () => void;
  compact?: boolean;
}) {
  return (
    <button
      className={`theme-toggle${compact ? " theme-toggle-compact" : ""}`}
      type="button"
      aria-label={`Switch to ${darkMode ? "light" : "dark"} mode`}
      aria-pressed={darkMode}
      onClick={onToggle}
    >
      <Icon name={darkMode ? "sun" : "moon"} size={16} />
      <span>{darkMode ? "Light mode" : "Dark mode"}</span>
    </button>
  );
}

function Icon({
  name,
  size = 20,
}: {
  name: IconName;
  size?: number;
}) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {iconArtwork[name]}
    </svg>
  );
}

function formatTime(minutes: number): string {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${String(minute).padStart(2, "0")} ${hour < 12 ? "AM" : "PM"}`;
}

function formatPeriod(request: ClassRequest): string {
  return `${formatTime(request.slot.start)} – ${formatTime(request.slot.end)}`;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function formatDateRange(request: ClassRequest): string | null {
  const { dateFrom, dateTo } = request.slot;
  if (!dateFrom || !dateTo) return null;
  if (dateFrom === dateTo) {
    return new Intl.DateTimeFormat("en", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(`${dateFrom}T00:00:00Z`));
  }
  return `${formatDate(dateFrom)} – ${formatDate(dateTo)}`;
}

function weekdayForDate(date: string): string {
  const weekdayIndex = new Date(`${date}T00:00:00Z`).getUTCDay();
  return weekDays[(weekdayIndex + 6) % weekDays.length];
}

function nextClassRequestNumber(requests: ClassRequest[]): number {
  return requests.reduce((max, request) => {
    const number = Number(request.id.replace(/\D/g, ""));
    return Number.isFinite(number) ? Math.max(max, number) : max;
  }, 0) + 1;
}

function updateMatchResult(
  teachers: Teacher[],
  requests: ClassRequest[],
  previous: MatchResult,
): MatchResult {
  const pendingRequests = requests.filter((request) => request.status === "open");
  const pendingResult = matchSubstitutes(teachers, pendingRequests);
  const pinnedRequests = requests.filter(
    (request) => request.status === "confirmed" && previous.assignments[request.id],
  );
  return {
    assignments: {
      ...Object.fromEntries(
        pinnedRequests.map((request) => [
          request.id,
          previous.assignments[request.id],
        ]),
      ),
      ...pendingResult.assignments,
    },
    unfilled: pendingResult.unfilled,
    classRankings: {
      ...Object.fromEntries(
        pinnedRequests.map((request) => [
          request.id,
          previous.classRankings[request.id] ?? [],
        ]),
      ),
      ...pendingResult.classRankings,
    },
    explanations: {
      ...Object.fromEntries(
        pinnedRequests.map((request) => [
          request.id,
          previous.explanations[request.id] ?? {},
        ]),
      ),
      ...pendingResult.explanations,
    },
    candidateExplanations: {
      ...Object.fromEntries(
        pinnedRequests.map((request) => [
          request.id,
          previous.candidateExplanations[request.id] ?? {},
        ]),
      ),
      ...pendingResult.candidateExplanations,
    },
  };
}

function isTeacherTimetable(value: unknown): value is Teacher["timetable"] {
  return (
    Array.isArray(value) &&
    value.every(
      (slot: unknown) =>
        typeof slot === "object" &&
        slot !== null &&
        "day" in slot &&
        "start" in slot &&
        "end" in slot &&
        typeof slot.day === "string" &&
        typeof slot.start === "number" &&
        typeof slot.end === "number" &&
        (!("dateFrom" in slot) || typeof slot.dateFrom === "string") &&
        (!("dateTo" in slot) || typeof slot.dateTo === "string"),
    )
  );
}

export default function Home() {
  const [activeView, setActiveView] = useState<View>("Overview");
  const [requests, setRequests] = useState<ClassRequest[]>(classRequests);
  const [leaveApplications, setLeaveApplications] = useState<TeacherLeaveApplication[]>([]);
  const [teacherRecords, setTeacherRecords] = useState(teachers);
  const [search, setSearch] = useState("");
  const [hasRun, setHasRun] = useState(false);
  const [computeMillis, setComputeMillis] = useState(0);
  const [result, setResult] = useState<MatchResult>(() =>
    matchSubstitutes(teachers, classRequests),
  );
  const [confirmed, setConfirmed] = useState<string[]>([]);
  const [showAbsenceForm, setShowAbsenceForm] = useState(false);
  const [showTeacherForm, setShowTeacherForm] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [notice, setNotice] = useState("");
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [loginRole, setLoginRole] = useState<"admin" | "teacher">("admin");
  const [currentTeacherId, setCurrentTeacherId] = useState<string | null>(null);
  const [isLoginLoading, setIsLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("subjtitute-theme");
    const useDarkMode = savedTheme === "dark";
    document.documentElement.dataset.theme = useDarkMode ? "dark" : "light";
    if (useDarkMode) {
      window.requestAnimationFrame(() => setDarkMode(true));
    }
  }, []);

  function toggleTheme() {
    const nextDarkMode = !darkMode;
    setDarkMode(nextDarkMode);
    document.documentElement.dataset.theme = nextDarkMode ? "dark" : "light";
    window.localStorage.setItem("subjtitute-theme", nextDarkMode ? "dark" : "light");
  }

  const openRequests = requests.filter((request) => request.status === "open");
  const pendingLeaveApplications = leaveApplications.filter(
    (application) => application.status === "pending",
  );
  const filteredTeachers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return teacherRecords.filter(
      (teacher) =>
        !query ||
        teacher.name.toLowerCase().includes(query) ||
        teacher.specializations.some((subject) =>
          subject.toLowerCase().includes(query),
        ),
    );
  }, [search, teacherRecords]);

  function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const username = String(formData.get("username") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const matchedTeacher = loginRole === "teacher"
      ? teacherRecords.find((teacher) => teacher.id.toLowerCase() === username.toLowerCase())
      : undefined;
    const isValid = loginRole === "admin"
      ? username === "admin" && password === "adminaccess"
      : Boolean(matchedTeacher && password === DEFAULT_TEACHER_PASSWORD);

    if (!isValid) {
      setLoginError(
        loginRole === "admin"
          ? "The username or password is incorrect."
          : "The teacher ID or password is incorrect.",
      );
      return;
    }

    setLoginError("");
    setIsLoginLoading(true);
    const signedInTeacherId = matchedTeacher?.id ?? null;
    window.setTimeout(() => {
      setCurrentTeacherId(signedInTeacherId);
      setIsSignedIn(true);
      setIsLoginLoading(false);
    }, 2200);
  }

  function signOut() {
    setIsSignedIn(false);
    setCurrentTeacherId(null);
    setLoginRole("admin");
    setActiveView("Overview");
    setIsProfileMenuOpen(false);
  }

  function runMatching(nextTeachers = teacherRecords, navigateToResults = true) {
    const start = performance.now();
    const nextResult = updateMatchResult(nextTeachers, requests, result);
    const duration = Math.max(1, Math.round(performance.now() - start));
    setResult(nextResult);
    setComputeMillis(duration);
    setHasRun(true);
    if (navigateToResults) setActiveView("Match results");
    setNotice(`Matching complete · ${duration} ms`);
    window.setTimeout(() => setNotice(""), 3200);
  }

  function selectAlternative(requestId: string, teacherId: string) {
    const request = requests.find((item) => item.id === requestId);
    const teacher = teacherRecords.find((item) => item.id === teacherId);
    if (
      !request ||
      !teacher ||
      request.status !== "open" ||
      !result.classRankings[requestId]?.some(([candidateId]) => candidateId === teacherId)
    ) {
      setNotice("That teacher is no longer an eligible option. Run matching again.");
      window.setTimeout(() => setNotice(""), 3200);
      return;
    }

    const otherAssignments = requests.filter(
      (item) =>
        item.id !== requestId &&
        result.assignments[item.id] === teacherId,
    );
    const openLoad = otherAssignments.filter(
      (item) => item.status !== "confirmed",
    ).length;
    const hasScheduleConflict =
      teacher.timetable.some((slot) => overlaps(request.slot, slot)) ||
      otherAssignments.some((item) => overlaps(request.slot, item.slot));
    if (
      teacher.currentSubLoad + openLoad >= 3 ||
      hasScheduleConflict
    ) {
      setNotice(
        `${teacher.name} cannot take this class because of workload or a time conflict.`,
      );
      window.setTimeout(() => setNotice(""), 3200);
      return;
    }

    const breakdown = result.candidateExplanations[requestId]?.[teacherId];
    if (!breakdown) {
      setNotice("Run matching again to refresh this teacher’s score breakdown.");
      window.setTimeout(() => setNotice(""), 3200);
      return;
    }
    setResult((current) => ({
      ...current,
      assignments: { ...current.assignments, [requestId]: teacherId },
      explanations: { ...current.explanations, [requestId]: breakdown },
    }));
    setNotice(`${teacher.name} selected. Confirm the recommendation to assign.`);
    window.setTimeout(() => setNotice(""), 3200);
  }

  function confirmMatch(requestId: string) {
    const teacherId = result.assignments[requestId];
    const confirmedRequest = requests.find((request) => request.id === requestId);
    if (!teacherId || !confirmedRequest || confirmed.includes(requestId)) return;
    setConfirmed((current) =>
      current.includes(requestId) ? current : [...current, requestId],
    );
    setRequests((current) =>
      current.map((request) =>
        request.id === requestId
          ? { ...request, status: "confirmed" }
          : request,
      ),
    );
    setTeacherRecords((current) =>
      current.map((teacher) =>
        teacher.id === teacherId
          ? {
              ...teacher,
              currentSubLoad: teacher.currentSubLoad + 1,
              timetable: [...teacher.timetable, confirmedRequest.slot],
            }
          : teacher,
      ),
    );
    setNotice("Recommendation confirmed and saved.");
    window.setTimeout(() => setNotice(""), 3200);
  }

  function addAbsence(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const subject = String(formData.get("subject") ?? "").trim();
    const section = String(formData.get("section") ?? "").trim();
    const budgetCap = Number(formData.get("budgetCap"));
    const absentTeacher = String(formData.get("absentTeacher") ?? "").trim();
    const absenceDates = formData.getAll("absenceDate").map(String);
    const startHours = formData.getAll("startHour").map((hour) => Number(hour));
    const endHours = formData.getAll("endHour").map((hour) => Number(hour));
    const absentTeacherRecord = teacherRecords.find(
      (teacher) => teacher.id === absentTeacher,
    );
    if (
      !subject ||
      !section ||
      !absentTeacherRecord ||
      absenceDates.length === 0 ||
      absenceDates.some((date) => !date) ||
      new Set(absenceDates).size !== absenceDates.length ||
      startHours.length !== absenceDates.length ||
      endHours.length !== absenceDates.length ||
      startHours.some((start, index) =>
        !Number.isFinite(start) ||
        !Number.isFinite(endHours[index]) ||
        start < 0 ||
        endHours[index] > 24 ||
        endHours[index] <= start,
      ) ||
      !Number.isFinite(budgetCap) ||
      budgetCap < 0
    ) {
      setNotice("Choose a teacher, unique absence dates, valid class times, and a valid budget.");
      return;
    }

    const firstRequestNumber = nextClassRequestNumber(requests);
    const nextRequests: ClassRequest[] = absenceDates.map((date, index) => {
      const weekday = weekdayForDate(date);
      return {
        id: `C${String(firstRequestNumber + index).padStart(2, "0")}`,
        subject,
        slot: {
          day: weekday,
          start: startHours[index] * 60,
          end: endHours[index] * 60,
          dateFrom: date,
          dateTo: date,
        },
        gradeLevel: Number(formData.get("gradeLevel")),
        section,
        minutesUntilStart: 120,
        budgetCap,
        absentTeacherId: absentTeacherRecord.id,
        status: "open",
      };
    });
    setRequests((current) => [...current, ...nextRequests]);
    setShowAbsenceForm(false);
    setActiveView("Absences");
    setNotice(
      `${nextRequests.length} absence ${nextRequests.length === 1 ? "request" : "requests"} reported. Ready to be matched.`,
    );
    window.setTimeout(() => setNotice(""), 3200);
  }

  function submitLeaveApplication(teacherId: string, sessions: TeacherLeaveSession[]) {
    if (!teacherRecords.some((teacher) => teacher.id === teacherId)) return;
    const nextNumber = leaveApplications.reduce((max, application) => {
      const number = Number(application.id.replace(/\D/g, ""));
      return Number.isFinite(number) ? Math.max(max, number) : max;
    }, 0) + 1;
    setLeaveApplications((current) => [
      ...current,
      {
        id: `L${String(nextNumber).padStart(2, "0")}`,
        teacherId,
        sessions,
        status: "pending",
        classRequestIds: [],
      },
    ]);
  }

  function approveLeaveApplication(applicationId: string) {
    const application = leaveApplications.find(
      (item) => item.id === applicationId && item.status === "pending",
    );
    const absentTeacher = application
      ? teacherRecords.find((teacher) => teacher.id === application.teacherId)
      : undefined;
    if (!application || !absentTeacher) return;

    const firstRequestNumber = nextClassRequestNumber(requests);
    const nextRequests: ClassRequest[] = application.sessions.map((session, index) => ({
      id: `C${String(firstRequestNumber + index).padStart(2, "0")}`,
      subject: session.subject,
      slot: {
        day: weekdayForDate(session.date),
        start: Number(session.startHour) * 60,
        end: Number(session.endHour) * 60,
        dateFrom: session.date,
        dateTo: session.date,
      },
      gradeLevel: session.gradeLevel,
      section: session.section,
      minutesUntilStart: 120,
      budgetCap: DEFAULT_BUDGET_CAP,
      absentTeacherId: absentTeacher.id,
      status: "open",
    }));
    const updatedRequests = [...requests, ...nextRequests];
    const start = performance.now();
    const nextResult = updateMatchResult(teacherRecords, updatedRequests, result);
    const duration = Math.max(1, Math.round(performance.now() - start));

    setRequests(updatedRequests);
    setLeaveApplications((current) =>
      current.map((item) =>
        item.id === applicationId
          ? {
              ...item,
              status: "approved",
              classRequestIds: nextRequests.map((request) => request.id),
            }
          : item,
      ),
    );
    setResult(nextResult);
    setComputeMillis(duration);
    setHasRun(true);
    setActiveView("Match results");
    setNotice(
      `${nextRequests.length} class ${nextRequests.length === 1 ? "session" : "sessions"} approved and added to matching.`,
    );
    window.setTimeout(() => setNotice(""), 3200);
  }

  function rejectLeaveApplication(applicationId: string) {
    setLeaveApplications((current) =>
      current.map((application) =>
        application.id === applicationId && application.status === "pending"
          ? { ...application, status: "rejected" }
          : application,
      ),
    );
    setNotice("Leave application declined.");
    window.setTimeout(() => setNotice(""), 3200);
  }

  function saveTeacher(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    const specializations = formData
      .getAll("specializations")
      .map(String)
      .filter((subject) => subjectOptions.includes(subject));
    const status = String(formData.get("status") ?? "");
    const qualification = String(formData.get("qualification") ?? "").trim();
    const teachingLoad = editingTeacher?.teachingLoad ?? 20;
    const honorariumRate = Number(formData.get("honorariumRate"));
    const requiredPrepMinutes = Number(formData.get("requiredPrepMinutes"));
    let parsedTimetable: unknown;
    let subjectPreferences: string[];
    let preferredGrades: number[];
    let preferredPeriods: Teacher["preferredPeriods"];
    try {
      parsedTimetable = JSON.parse(String(formData.get("timetable") ?? "[]"));
      subjectPreferences = String(formData.get("subjectPreferences") ?? "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      preferredGrades = formData
        .getAll("preferredGrades")
        .map(Number)
        .filter((grade) => grade === 11 || grade === 12);
      preferredPeriods = formData
        .getAll("preferredPeriods")
        .map(String)
        .filter((period): period is "AM" | "PM" => period === "AM" || period === "PM");
    } catch (error) {
      if (error instanceof SyntaxError) {
        setNotice("Please check the teacher details and timetable.");
        return;
      }
      throw error;
    }
    if (
      !isTeacherTimetable(parsedTimetable) ||
      subjectPreferences.some((subject) => !subjectOptions.includes(subject))
    ) {
      setNotice("Use listed subjects in the preference order and enter valid timetable periods.");
      return;
    }
    const timetable = parsedTimetable;
    if (
      !name ||
      !qualification ||
      (!qualificationOptions.includes(qualification) &&
        qualification !== editingTeacher?.qualification) ||
      specializations.length === 0 ||
      (status !== "available" && status !== "on_leave" && status !== "inactive") ||
      !Number.isFinite(teachingLoad) ||
      teachingLoad < 0 ||
      teachingLoad > 30 ||
      !Number.isFinite(honorariumRate) ||
      honorariumRate < 0 ||
      !Number.isInteger(requiredPrepMinutes) ||
      requiredPrepMinutes < 0 ||
      timetable.some(
        (slot) =>
          !weekDays.includes(slot.day) ||
          !Number.isFinite(slot.start) ||
          !Number.isFinite(slot.end) ||
          slot.start < 0 ||
          slot.end > 24 * 60 ||
          slot.end <= slot.start,
      ) ||
      timetable.some((slot, index) =>
        timetable
          .slice(index + 1)
          .some((other) => overlaps(slot, other)),
      )
    ) {
      setNotice("Please check the teacher details and required fields.");
      return;
    }

    const initials = name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("");
    const nextNumber = teacherRecords.reduce((max, teacher) => {
      const number = Number(teacher.id.replace(/\D/g, ""));
      return Number.isFinite(number) ? Math.max(max, number) : max;
    }, 0) + 1;
    const savedTeacher: Teacher = {
      id: editingTeacher?.id ?? `T${String(nextNumber).padStart(2, "0")}`,
      name,
      initials,
      color: editingTeacher?.color ?? teacherColors[(nextNumber - 1) % teacherColors.length],
      status,
      specializations,
      timetable,
      qualification,
      teachingLoad,
      currentSubLoad: editingTeacher?.currentSubLoad ?? 0,
      honorariumRate,
      requiredPrepMinutes,
      subjectPreferences,
      preferredGrades,
      preferredPeriods,
    };
    const updatedTeachers = editingTeacher
      ? teacherRecords.map((teacher) =>
          teacher.id === editingTeacher.id ? savedTeacher : teacher,
        )
      : [...teacherRecords, savedTeacher];
    setTeacherRecords(updatedTeachers);
    runMatching(updatedTeachers, false);
    setShowTeacherForm(false);
    setEditingTeacher(null);
    setActiveView("Teachers");
    setNotice(
      editingTeacher
        ? `${name}’s details updated and open requests rematched.`
        : `${name} added with teacher ID ${savedTeacher.id}. Sign-in password: ${DEFAULT_TEACHER_PASSWORD}.`,
    );
    window.setTimeout(() => setNotice(""), 3200);
  }

  const navigation: Array<{ label: View; icon: IconName; badge?: number }> = [
    { label: "Overview", icon: "grid" },
    {
      label: "Absences",
      icon: "calendar",
      badge: openRequests.length + pendingLeaveApplications.length,
    },
    { label: "Teachers", icon: "users" },
    { label: "Match results", icon: "sparkles" },
  ];

  if (isLoginLoading) return <LoginLoading />;

  if (!isSignedIn) {
    return (
      <main className="login-shell">
        <section className="login-card" aria-labelledby="login-title">
          <div className="login-brand">
            <span className="brand-mark">
              <Image src="/subjtitute-logo.png" alt="" width={34} height={34} priority />
            </span>
            <span className="brand-name">subjtitute<span>.</span></span>
            <ThemeToggle darkMode={darkMode} onToggle={toggleTheme} compact />
          </div>
          <span className="eyebrow">{loginRole === "admin" ? "ADMINISTRATOR ACCESS" : "TEACHER ACCESS"}</span>
          <h1 id="login-title">{loginRole === "admin" ? "Welcome back, Admin" : "Teacher sign in"}</h1>
          <p className="login-copy">
            {loginRole === "admin"
              ? "Sign in to manage substitute teacher matching."
              : `Use your teacher ID and the shared password "${DEFAULT_TEACHER_PASSWORD}".`}
          </p>
          <div className="login-role-picker" role="group" aria-label="Account type">
            <button
              aria-pressed={loginRole === "admin"}
              className={loginRole === "admin" ? "active" : ""}
              onClick={() => {
                setLoginRole("admin");
                setLoginError("");
              }}
              type="button"
            >
              Administrator
            </button>
            <button
              aria-pressed={loginRole === "teacher"}
              className={loginRole === "teacher" ? "active" : ""}
              onClick={() => {
                setLoginRole("teacher");
                setLoginError("");
              }}
              type="button"
            >
              Teacher
            </button>
          </div>
          <form className="login-form" onSubmit={signIn}>
            <label className="login-field">
              {loginRole === "admin" ? "Username" : "Teacher ID"}
              <input
                autoComplete="username"
                name="username"
                placeholder={loginRole === "admin" ? "Enter your username" : "e.g. T01"}
                required
              />
            </label>
            <label className="login-field">
              Password
              <input
                autoComplete="current-password"
                name="password"
                placeholder="Enter your password"
                required
                type="password"
              />
            </label>
            {loginError && <p className="login-error" role="alert">{loginError}</p>}
            <button className="button button-primary login-submit" type="submit">
              Sign in <Icon name="arrow" size={17} />
            </button>
          </form>
          <p className="login-footnote">
            {loginRole === "admin"
              ? "Administrator sign-in for Senior High School"
              : "Teacher sign-in is available after the admin creates your account."}
          </p>
        </section>
      </main>
    );
  }

  const signedInTeacher = teacherRecords.find((teacher) => teacher.id === currentTeacherId);
  if (signedInTeacher) {
    return (
      <TeacherPortal
        teacher={signedInTeacher}
        teachers={teacherRecords}
        requests={requests}
        leaveApplications={leaveApplications}
        result={result}
        confirmed={confirmed}
        hasRun={hasRun}
        darkMode={darkMode}
        onToggleTheme={toggleTheme}
        onSignOut={signOut}
        onSubmitLeave={submitLeaveApplication}
      />
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a
          className="brand"
          href="#overview"
          onClick={(event) => {
            event.preventDefault();
            setActiveView("Overview");
          }}
        >
          <span className="brand-mark">
            <Image src="/subjtitute-logo.png" alt="" width={34} height={34} priority />
          </span>
          <span className="brand-name">subjtitute<span>.</span></span>
        </a>

        <div className="nav-caption">WORKSPACE</div>
        <nav className="primary-nav" aria-label="Main navigation">
          {navigation.map((item) => (
            <button
              className={`nav-item ${activeView === item.label ? "active" : ""}`}
              key={item.label}
              onClick={() => setActiveView(item.label)}
              aria-label={item.label}
              aria-current={activeView === item.label ? "page" : undefined}
              title={item.label}
            >
              <Icon name={item.icon} size={19} />
              <span>{item.label}</span>
              {item.badge ? <span className="nav-badge">{item.badge}</span> : null}
            </button>
          ))}
        </nav>

        <div className="nav-caption nav-caption-settings">PREFERENCES</div>
        <button
          className={`nav-item ${activeView === "Settings" ? "active" : ""}`}
          onClick={() => setActiveView("Settings")}
          aria-label="Settings"
          aria-current={activeView === "Settings" ? "page" : undefined}
          title="Settings"
        >
          <Icon name="settings" size={19} />
          <span>Settings</span>
        </button>

        <div className="sidebar-bottom">
          <div className="profile">
            <div className="profile-avatar">AD</div>
            <div className="profile-copy">
              <strong>Admin</strong>
              <span>Administrator</span>
            </div>
            <div
              className="profile-menu-wrapper"
              onBlur={(event) => {
                if (
                  !(event.relatedTarget instanceof Node) ||
                  !event.currentTarget.contains(event.relatedTarget)
                ) {
                  setIsProfileMenuOpen(false);
                }
              }}
            >
              <button
                className="profile-more"
                aria-label="Profile options"
                aria-expanded={isProfileMenuOpen}
                aria-haspopup="menu"
                onClick={() => setIsProfileMenuOpen((open) => !open)}
                type="button"
              >
                ···
              </button>
              {isProfileMenuOpen && (
                <div className="profile-menu" role="menu">
                  <button
                    onClick={signOut}
                    role="menuitem"
                    type="button"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="mobile-brand">
            <span className="brand-mark">
              <Image src="/subjtitute-logo.png" alt="" width={27} height={27} priority />
            </span>
            subjtitute.
          </div>
          <div
            className="profile-menu-wrapper mobile-profile-menu"
            onBlur={(event) => {
              if (
                !(event.relatedTarget instanceof Node) ||
                !event.currentTarget.contains(event.relatedTarget)
              ) {
                setIsProfileMenuOpen(false);
              }
            }}
          >
            <button
              className="profile-more"
              aria-label="Profile options"
              aria-expanded={isProfileMenuOpen}
              aria-haspopup="menu"
              onClick={() => setIsProfileMenuOpen((open) => !open)}
              type="button"
            >
              ···
            </button>
            {isProfileMenuOpen && (
              <div className="profile-menu" role="menu">
                <button
                  onClick={signOut}
                  role="menuitem"
                  type="button"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
          <div className="breadcrumb"><span>Workspace</span><Icon name="chevron" size={14} /><strong>{activeView}</strong></div>
          <button className="button button-secondary" onClick={signOut} type="button">
            Sign out
          </button>
        </header>

        <div className="page-content">
          {activeView === "Overview" && (
            <Overview
              teachers={teacherRecords}
              requests={requests}
              result={result}
              confirmed={confirmed}
              onReport={() => setShowAbsenceForm(true)}
              onRun={() => runMatching()}
              onConfirm={confirmMatch}
              onNavigate={setActiveView}
              hasRun={hasRun}
              computeMillis={computeMillis}
            />
          )}
          {activeView === "Absences" && (
            <Absences
              teachers={teacherRecords}
              requests={requests}
              result={result}
              confirmed={confirmed}
              pendingLeaveApplications={pendingLeaveApplications}
              onReport={() => setShowAbsenceForm(true)}
              onRun={() => runMatching()}
              onConfirm={confirmMatch}
              onApproveLeave={approveLeaveApplication}
              onRejectLeave={rejectLeaveApplication}
            />
          )}
          {activeView === "Teachers" && (
            <TeachersDirectory
              teachers={filteredTeachers}
              search={search}
              onSearch={setSearch}
              onAdd={() => {
                setEditingTeacher(null);
                setShowTeacherForm(true);
              }}
              onEdit={(teacher) => {
                setEditingTeacher(teacher);
                setShowTeacherForm(true);
              }}
            />
          )}
          {activeView === "Match results" && (
            <MatchResults
              teachers={teacherRecords}
              requests={requests}
              result={result}
              confirmed={confirmed}
              onConfirm={confirmMatch}
              onSelectAlternative={selectAlternative}
              onRun={() => runMatching()}
              computeMillis={computeMillis}
              hasRun={hasRun}
            />
          )}
          {activeView === "Settings" && (
            <Settings darkMode={darkMode} onToggleTheme={toggleTheme} />
          )}
        </div>
      </main>

      <nav className="mobile-nav" aria-label="Mobile navigation">
        {[...navigation, { label: "Settings" as const, icon: "settings" as const }].map((item) => (
          <button
            key={item.label}
            className={activeView === item.label ? "active" : ""}
            onClick={() => setActiveView(item.label)}
            aria-label={item.label}
            aria-current={activeView === item.label ? "page" : undefined}
          >
            <Icon name={item.icon} size={18} />
            <span>{item.label === "Match results" ? "Matches" : item.label}</span>
          </button>
        ))}
      </nav>

      {notice && <div className="toast"><span className="toast-check"><Icon name="check" size={15} /></span>{notice}</div>}
      {showAbsenceForm && (
        <AbsenceForm
          teachers={teacherRecords}
          onSubmit={addAbsence}
          onClose={() => setShowAbsenceForm(false)}
        />
      )}
      {showTeacherForm && (
        <TeacherForm
          teacher={editingTeacher}
          onSubmit={saveTeacher}
          onClose={() => {
            setShowTeacherForm(false);
            setEditingTeacher(null);
          }}
        />
      )}
    </div>
  );
}

function LoginLoading() {
  return (
    <main className="login-loading-shell" aria-live="polite">
      <section className="login-loading-card">
        <div className="login-loading-brand">
          <Image
            className="login-loading-animation"
            src="/loading-animation.gif"
            alt=""
            width={160}
            height={160}
            unoptimized
            priority
          />
          <span className="login-loading-wordmark">subjtitute<span>.</span></span>
        </div>
        <span className="eyebrow">SENIOR HIGH SCHOOL</span>
        <h1>Getting things ready</h1>
        <p>Your workspace is loading. This will only take a moment.</p>
        <div className="login-loading-track" role="progressbar" aria-label="Loading workspace">
          <span />
        </div>
      </section>
    </main>
  );
}

function TeacherPortal({
  teacher,
  teachers: teacherRecords,
  requests,
  leaveApplications,
  result,
  confirmed,
  hasRun,
  darkMode,
  onToggleTheme,
  onSignOut,
  onSubmitLeave,
}: {
  teacher: Teacher;
  teachers: Teacher[];
  requests: ClassRequest[];
  leaveApplications: TeacherLeaveApplication[];
  result: MatchResult;
  confirmed: string[];
  hasRun: boolean;
  darkMode: boolean;
  onToggleTheme: () => void;
  onSignOut: () => void;
  onSubmitLeave: (teacherId: string, sessions: TeacherLeaveSession[]) => void;
}) {
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const leaveRequests = requests.filter((request) => request.absentTeacherId === teacher.id);
  const teacherApplications = leaveApplications.filter(
    (application) => application.teacherId === teacher.id,
  );
  const assignedCount = leaveRequests.filter(
    (request) => request.status === "confirmed" || confirmed.includes(request.id),
  ).length;
  const recommendedCount = leaveRequests.filter(
    (request) =>
      request.status !== "confirmed" &&
      !confirmed.includes(request.id) &&
      Boolean(result.assignments[request.id]),
  ).length;
  const waitingCount = leaveRequests.length - assignedCount - recommendedCount;

  return (
    <div className="teacher-portal-shell">
      <header className="teacher-portal-topbar">
        <a className="teacher-portal-brand" href="#teacher-coverage">
          <Image src="/subjtitute-logo.png" alt="" width={34} height={34} priority />
          <span className="brand-name">subjtitute<span>.</span></span>
        </a>
        <div className="teacher-portal-actions">
          <span className="teacher-portal-identity">
            <span className="teacher-avatar" style={{ backgroundColor: teacher.color }}>
              {teacher.initials}
            </span>
            <span><strong>{teacher.name}</strong><small>{teacher.id}</small></span>
          </span>
          <ThemeToggle darkMode={darkMode} onToggle={onToggleTheme} />
          <button className="button button-secondary" onClick={onSignOut} type="button">
            Sign out
          </button>
        </div>
      </header>
      <main className="page-content teacher-portal-content" id="teacher-coverage">
        <PageHeading
          eyebrow="TEACHER PORTAL"
          title="Your leave coverage"
          description="Check the coverage status of classes reported during your leave."
          actions={
            <Button onClick={() => setShowLeaveForm(true)}>
              <Icon name="plus" size={17} /> File for leave
            </Button>
          }
        />
        <div className="subpage-stats teacher-portal-stats">
          <StatCard
            label="Classes reported"
            value={String(leaveRequests.length).padStart(2, "0")}
            change="Linked to your teacher ID"
            icon="calendar"
            tone="blue"
          />
          <StatCard
            label="Substitute assigned"
            value={String(assignedCount).padStart(2, "0")}
            change="Confirmed by admin"
            icon="check"
            tone="mint"
          />
          <StatCard
            label="Being arranged"
            value={String(recommendedCount + waitingCount).padStart(2, "0")}
            change="Awaiting confirmation or matching"
            icon="clock"
            tone="yellow"
          />
        </div>
        <section className="panel teacher-leave-panel">
          <div className="panel-heading">
            <div>
              <h2>Leave applications</h2>
              <p>Track admin approval and see which class sessions were sent to matching.</p>
            </div>
          </div>
          {teacherApplications.length ? (
            <div className="teacher-leave-list">
              {teacherApplications.map((application) => {
                const status = application.status === "pending"
                  ? "Pending review"
                  : application.status === "approved"
                    ? "Approved"
                    : "Not approved";
                const statusClass = application.status === "pending"
                  ? "is-pending"
                  : application.status === "approved"
                    ? "is-assigned"
                    : "is-unfilled";
                return (
                  <article className="teacher-leave-application" key={application.id}>
                    <div className="teacher-leave-application-heading">
                      <div>
                        <span className="eyebrow">{application.id}</span>
                        <h3>{application.sessions.length} class {application.sessions.length === 1 ? "session" : "sessions"}</h3>
                      </div>
                      <span className={`teacher-coverage-status ${statusClass}`}>{status}</span>
                    </div>
                    <div className="teacher-leave-sessions">
                      {application.sessions.map((session) => (
                        <div className="teacher-leave-session" key={session.id}>
                          <strong>{session.subject}</strong>
                          <span>Grade {session.gradeLevel} · {session.section}</span>
                          <span>
                            {weekdayForDate(session.date)} · {formatDate(session.date)} ·{" "}
                            {formatTime(Number(session.startHour) * 60)}–{formatTime(Number(session.endHour) * 60)}
                          </span>
                        </div>
                      ))}
                    </div>
                    <p className="teacher-leave-status-copy">
                      {application.status === "pending"
                        ? "Waiting for an administrator to review this leave application."
                        : application.status === "approved"
                          ? `${application.classRequestIds.length} class ${application.classRequestIds.length === 1 ? "session was" : "sessions were"} added to matching.`
                          : "This leave application was declined by the administrator."}
                    </p>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="teacher-coverage-empty">
              <span className="empty-icon"><Icon name="calendar" size={18} /></span>
              <strong>No leave applications yet</strong>
              <span>File a leave request to send your affected class sessions for admin review.</span>
            </div>
          )}
        </section>
        <section className="panel teacher-coverage-panel">
          <div className="panel-heading">
            <div>
              <h2>Class coverage</h2>
              <p>Substitute details appear after the administrator confirms the assignment.</p>
            </div>
          </div>
          {leaveRequests.length ? (
            <div className="teacher-coverage-list">
              {leaveRequests.map((request) => {
                const isAssigned =
                  request.status === "confirmed" || confirmed.includes(request.id);
                const hasRecommendation = Boolean(result.assignments[request.id]);
                const isUnfilled = hasRun && result.unfilled.includes(request.id);
                const assignedTeacher = isAssigned
                  ? teacherRecords.find((item) => item.id === result.assignments[request.id])
                  : undefined;
                const status = isAssigned
                  ? "Assigned"
                  : hasRecommendation
                    ? "Awaiting confirmation"
                    : isUnfilled
                      ? "No substitute found yet"
                      : "Waiting for matching";
                const statusClass = isAssigned
                  ? "is-assigned"
                  : hasRecommendation
                    ? "is-pending"
                    : isUnfilled
                      ? "is-unfilled"
                      : "is-waiting";
                const detail = isAssigned
                  ? assignedTeacher
                    ? `Substitute: ${assignedTeacher.name}`
                    : "The administrator confirmed class coverage."
                  : hasRecommendation
                    ? "A substitute is being considered. The administrator will confirm the assignment."
                    : isUnfilled
                      ? "No eligible substitute has been found yet. The administrator can review and rerun matching."
                      : "Waiting for the administrator to run matching.";

                return (
                  <article className="teacher-coverage-item" key={request.id}>
                    <span className="subject-badge">{request.subject.slice(0, 2).toUpperCase()}</span>
                    <div className="teacher-coverage-copy">
                      <span className="eyebrow">
                        {request.id} · GRADE {request.gradeLevel} · {request.section}
                      </span>
                      <h3>{request.subject}</h3>
                      <p>
                        {formatDateRange(request) ?? request.slot.day} · {formatPeriod(request)}
                      </p>
                      <span className="teacher-coverage-detail">{detail}</span>
                    </div>
                    <span className={`teacher-coverage-status ${statusClass}`}>{status}</span>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="teacher-coverage-empty">
              <span className="empty-icon"><Icon name="calendar" size={18} /></span>
              <strong>No absence requests yet</strong>
              <span>Requests reported under your teacher ID will appear here.</span>
            </div>
          )}
          <div className="table-note">
            <Icon name="shield" size={16} />
            Substitute names are only shown after the administrator confirms a match.
          </div>
        </section>
      </main>
      {showLeaveForm && (
        <TeacherLeaveForm
          teacher={teacher}
          onClose={() => setShowLeaveForm(false)}
          onSubmit={(sessions) => {
            onSubmitLeave(teacher.id, sessions);
            setShowLeaveForm(false);
          }}
        />
      )}
    </div>
  );
}

function TeacherLeaveForm({
  teacher,
  onSubmit,
  onClose,
}: {
  teacher: Teacher;
  onSubmit: (sessions: TeacherLeaveSession[]) => void;
  onClose: () => void;
}) {
  const [sessions, setSessions] = useState<TeacherLeaveSession[]>([
    {
      id: 0,
      subject: subjectOptions[0],
      gradeLevel: 11,
      section: "",
      date: "",
      startHour: "9",
      endHour: "10",
    },
  ]);
  const [nextSessionId, setNextSessionId] = useState(1);
  const [formError, setFormError] = useState("");
  const startHours = Array.from({ length: 10 }, (_, index) => index + 7);
  const endHours = Array.from({ length: 10 }, (_, index) => index + 8);

  function updateSession(
    id: number,
    property: keyof Omit<TeacherLeaveSession, "id">,
    value: string,
  ) {
    setSessions((current) =>
      current.map((session) =>
        session.id === id
          ? {
              ...session,
              [property]: property === "gradeLevel" ? Number(value) : value,
            }
          : session,
      ),
    );
    setFormError("");
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = sessions.map((session) => ({
      ...session,
      section: session.section.trim(),
    }));
    const sessionKeys = normalized.map((session) =>
      [
        session.subject,
        session.gradeLevel,
        session.section.toLowerCase(),
        session.date,
        session.startHour,
        session.endHour,
      ].join("|"),
    );
    const isInvalid = normalized.some(
      (session) =>
        !subjectOptions.includes(session.subject) ||
        (session.gradeLevel !== 11 && session.gradeLevel !== 12) ||
        !session.section ||
        !session.date ||
        Number.isNaN(Date.parse(`${session.date}T00:00:00Z`)) ||
        !Number.isFinite(Number(session.startHour)) ||
        !Number.isFinite(Number(session.endHour)) ||
        Number(session.startHour) < 0 ||
        Number(session.endHour) > 24 ||
        Number(session.endHour) <= Number(session.startHour),
    );
    if (isInvalid || new Set(sessionKeys).size !== sessionKeys.length) {
      setFormError("Enter valid class details, dates, and times without duplicate sessions.");
      return;
    }
    onSubmit(normalized);
  }

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <form className="absence-modal teacher-leave-form" onSubmit={submit}>
        <div className="modal-heading">
          <div>
            <span className="eyebrow">LEAVE APPLICATION · {teacher.id}</span>
            <h2>File for leave</h2>
          </div>
          <button type="button" className="icon-button" aria-label="Close dialog" onClick={onClose}>
            <Icon name="x" />
          </button>
        </div>
        <p className="modal-copy">
          Add each class session affected by your leave. An administrator must approve your application before sessions go to matching.
        </p>
        <div className="teacher-leave-form-sessions">
          {sessions.map((session, index) => (
            <fieldset className="teacher-leave-form-session" key={session.id}>
              <legend>
                <span>Class session {index + 1}</span>
                {sessions.length > 1 && (
                  <button
                    className="teacher-leave-remove"
                    onClick={() => setSessions((current) => current.filter((item) => item.id !== session.id))}
                    type="button"
                  >
                    Remove
                  </button>
                )}
              </legend>
              <label className="field-label">
                Subject
                <select
                  onChange={(event) => updateSession(session.id, "subject", event.target.value)}
                  required
                  value={session.subject}
                >
                  {subjectOptions.map((subject) => <option key={subject}>{subject}</option>)}
                </select>
              </label>
              <div className="form-grid">
                <label className="field-label">
                  Grade
                  <select
                    onChange={(event) => updateSession(session.id, "gradeLevel", event.target.value)}
                    value={session.gradeLevel}
                  >
                    <option value={11}>Grade 11</option>
                    <option value={12}>Grade 12</option>
                  </select>
                </label>
                <label className="field-label">
                  Section
                  <input
                    onChange={(event) => updateSession(session.id, "section", event.target.value)}
                    placeholder="STEM A"
                    required
                    value={session.section}
                  />
                </label>
              </div>
              <label className="field-label">
                Date
                <input
                  onChange={(event) => updateSession(session.id, "date", event.target.value)}
                  required
                  type="date"
                  value={session.date}
                />
              </label>
              <div className="form-grid">
                <label className="field-label">
                  Starts
                  <select
                    onChange={(event) => updateSession(session.id, "startHour", event.target.value)}
                    value={session.startHour}
                  >
                    {startHours.map((hour) => (
                      <option key={hour} value={hour}>{formatTime(hour * 60)}</option>
                    ))}
                  </select>
                </label>
                <label className="field-label">
                  Ends
                  <select
                    onChange={(event) => updateSession(session.id, "endHour", event.target.value)}
                    value={session.endHour}
                  >
                    {endHours.map((hour) => (
                      <option key={hour} value={hour}>{formatTime(hour * 60)}</option>
                    ))}
                  </select>
                </label>
              </div>
            </fieldset>
          ))}
        </div>
        <button
          className="add-period-button teacher-leave-add-session"
          onClick={() => {
            setSessions((current) => [
              ...current,
              {
                id: nextSessionId,
                subject: subjectOptions[0],
                gradeLevel: 11,
                section: "",
                date: "",
                startHour: "9",
                endHour: "10",
              },
            ]);
            setNextSessionId((id) => id + 1);
          }}
          type="button"
        >
          <Icon name="plus" size={15} /> Add another class session
        </button>
        {formError && <p className="login-error" role="alert">{formError}</p>}
        <div className="modal-footer">
          <button type="button" className="button button-quiet" onClick={onClose}>Cancel</button>
          <button type="submit" className="button button-primary">
            <Icon name="check" size={16} /> Submit leave request
          </button>
        </div>
      </form>
    </div>
  );
}

type AbsencePeriod = {
  id: number;
  date: string;
  startHour: string;
  endHour: string;
};

function AbsenceForm({
  teachers: teacherRecords,
  onSubmit,
  onClose,
}: {
  teachers: Teacher[];
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
}) {
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [teacherSearch, setTeacherSearch] = useState("");
  const [isTeacherPickerOpen, setIsTeacherPickerOpen] = useState(false);
  const [periods, setPeriods] = useState<AbsencePeriod[]>([
    { id: 0, date: "", startHour: "9", endHour: "10" },
  ]);
  const [nextPeriodId, setNextPeriodId] = useState(1);
  const matchingTeachers = teacherRecords.filter((teacher) =>
    teacher.name.toLowerCase().includes(teacherSearch.trim().toLowerCase()),
  );
  const startHours = Array.from({ length: 10 }, (_, index) => index + 7);
  const endHours = Array.from({ length: 10 }, (_, index) => index + 8);

  function updatePeriod(
    id: number,
    property: "date" | "startHour" | "endHour",
    value: string,
  ) {
    setPeriods((current) =>
      current.map((period) =>
        period.id === id ? { ...period, [property]: value } : period,
      ),
    );
  }

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <form className="absence-modal" onSubmit={onSubmit}>
        <div className="modal-heading">
          <div>
            <span className="eyebrow">NEW REQUEST</span>
            <h2>Report an absence</h2>
          </div>
          <button type="button" className="icon-button" aria-label="Close dialog" onClick={onClose}>
            <Icon name="x" />
          </button>
        </div>
        <p className="modal-copy">
          Select an absent teacher, then add each class date with its own start and end time.
        </p>
        <input type="hidden" name="absentTeacher" value={selectedTeacher?.id ?? ""} />
        <div className="field-label">
          Absent teacher
          <div className="teacher-picker">
            <button
              aria-expanded={isTeacherPickerOpen}
              aria-haspopup="listbox"
              className="teacher-picker-trigger"
              onClick={() => {
                setIsTeacherPickerOpen((open) => !open);
                setTeacherSearch("");
              }}
              type="button"
            >
              <span className={selectedTeacher ? "" : "teacher-picker-placeholder"}>
                {selectedTeacher?.name ?? "Select a teacher"}
              </span>
              <Icon name="chevron" size={16} />
            </button>
            {isTeacherPickerOpen && (
              <div className="teacher-picker-popover">
                <label className="teacher-picker-search">
                  <Icon name="search" size={16} />
                  <input
                    autoFocus
                    aria-label="Search teachers"
                    onChange={(event) => setTeacherSearch(event.target.value)}
                    placeholder="Search teachers..."
                    value={teacherSearch}
                  />
                </label>
                <div className="teacher-picker-options" role="listbox" aria-label="Teachers">
                  {matchingTeachers.map((teacher) => (
                    <button
                      aria-selected={selectedTeacher?.id === teacher.id}
                      key={teacher.id}
                      onClick={() => {
                        setSelectedTeacher(teacher);
                        setIsTeacherPickerOpen(false);
                      }}
                      role="option"
                      type="button"
                    >
                      <span>{teacher.name}</span>
                      <small>{teacher.specializations.join(", ")}</small>
                    </button>
                  ))}
                  {matchingTeachers.length === 0 && (
                    <p className="teacher-picker-empty">
                      {teacherRecords.length === 0
                        ? "No teachers yet. Add a teacher in the Teachers page first."
                        : "No teachers match your search."}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        <label className="field-label">
          Subject
          <select name="subject" defaultValue="Earth Science">
            {subjectOptions.map((subject) => <option key={subject}>{subject}</option>)}
          </select>
        </label>
        <div className="form-grid">
          <label className="field-label">
            Grade
            <select name="gradeLevel" defaultValue="11">
              <option value="11">Grade 11</option>
              <option value="12">Grade 12</option>
            </select>
          </label>
          <label className="field-label">
            Section
            <input required name="section" placeholder="STEM A" />
          </label>
        </div>
        <fieldset className="absence-period-list">
          <legend>Absent class days <span>Weekday is recognized from each date</span></legend>
          {periods.map((period, index) => (
            <div className="absence-period" key={period.id}>
              <label className="field-label">
                Date
                <input
                  required
                  name="absenceDate"
                  onChange={(event) => updatePeriod(period.id, "date", event.target.value)}
                  type="date"
                  value={period.date}
                />
              </label>
              <label className="field-label">
                Start
                <select
                  name="startHour"
                  onChange={(event) => updatePeriod(period.id, "startHour", event.target.value)}
                  value={period.startHour}
                >
                  {startHours.map((hour) => (
                    <option key={hour} value={hour}>{formatTime(hour * 60)}</option>
                  ))}
                </select>
              </label>
              <label className="field-label">
                End
                <select
                  name="endHour"
                  onChange={(event) => updatePeriod(period.id, "endHour", event.target.value)}
                  value={period.endHour}
                >
                  {endHours.map((hour) => (
                    <option key={hour} value={hour}>{formatTime(hour * 60)}</option>
                  ))}
                </select>
              </label>
              <div className="absence-period-meta">
                <span>{period.date ? weekdayForDate(period.date) : "Select date"}</span>
                {periods.length > 1 && (
                  <button
                    aria-label={`Remove absent day ${index + 1}`}
                    className="remove-period"
                    onClick={() =>
                      setPeriods((current) =>
                        current.filter((item) => item.id !== period.id),
                      )
                    }
                    type="button"
                  >
                    <Icon name="x" size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
          <button
            className="add-period-button"
            onClick={() => {
              setPeriods((current) => [
                ...current,
                { id: nextPeriodId, date: "", startHour: "9", endHour: "10" },
              ]);
              setNextPeriodId((id) => id + 1);
            }}
            type="button"
          >
            <Icon name="plus" size={14} /> Add another absent day
          </button>
        </fieldset>
        <label className="field-label">
          Honorarium budget per class
          <input required name="budgetCap" type="number" min="0" defaultValue={DEFAULT_BUDGET_CAP} />
        </label>
        <div className="modal-footer">
          <button type="button" className="button button-quiet" onClick={onClose}>Cancel</button>
          <button type="submit" className="button button-primary">
            <Icon name="plus" size={17} /> Create request
          </button>
        </div>
      </form>
    </div>
  );
}

function PageHeading({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: ReactNode;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {actions && <div className="heading-actions">{actions}</div>}
    </div>
  );
}

function Button({
  children,
  variant = "primary",
  onClick,
}: {
  children: ReactNode;
  variant?: "primary" | "secondary" | "quiet";
  onClick: () => void;
}) {
  return <button className={`button button-${variant}`} onClick={onClick}>{children}</button>;
}

function Overview({
  teachers: teacherRecords,
  requests,
  result,
  confirmed,
  onReport,
  onRun,
  onConfirm,
  onNavigate,
  hasRun,
  computeMillis,
}: {
  teachers: typeof teachers;
  requests: ClassRequest[];
  result: MatchResult;
  confirmed: string[];
  onReport: () => void;
  onRun: () => void;
  onConfirm: (requestId: string) => void;
  onNavigate: (view: View) => void;
  hasRun: boolean;
  computeMillis: number;
}) {
  const unconfirmed = requests.filter(
    (request) => result.assignments[request.id] && !confirmed.includes(request.id),
  );
  const openCount = requests.filter((request) => request.status === "open").length;
  const fillRate = requests.length
    ? Math.round((Object.keys(result.assignments).length / requests.length) * 100)
    : 0;
  const average = averageMatchScore(result);
  return (
    <>
      <PageHeading
        eyebrow="SENIOR HIGH SCHOOL · MONDAY SCHEDULE"
        title={<>Welcome back, Admin <span className="wave">✳</span></>}
        description="Here’s what’s happening across your senior high school today."
        actions={<><Button variant="secondary" onClick={onReport}><Icon name="plus" size={17} /> Report absence</Button><Button onClick={onRun}><Icon name="sparkles" size={17} /> Run matching</Button></>}
      />
      <section className="stats-grid" aria-label="Senior high school overview">
        <StatCard label="Open requests" value={String(openCount).padStart(2, "0")} change="For Monday" icon="calendar" tone="yellow" />
        <StatCard label="Available teachers" value={String(teacherRecords.filter((teacher) => teacher.status === "available").length)} change={`of ${teacherRecords.length} teachers`} icon="users" tone="mint" />
        <StatCard label="Classes covered" value={`${fillRate}%`} change={hasRun ? `${matchedCountLabel(result)} recommendations` : "Ready to match"} icon="chart" tone="blue" />
        <StatCard label="Avg. match score" value={average === null ? "—" : String(average)} suffix={average === null ? "" : "%"} change={average === null ? "Run matching to calculate" : "Based on current recommendations"} icon="trend" tone="pink" />
      </section>

      <section className="overview-grid">
        <div className="panel request-panel">
          <div className="panel-heading">
            <div><div className="panel-title-row"><h2>Today’s absences</h2><span className="count-pill">{requests.length}</span></div><p>Requests that need a subject-fit substitute.</p></div>
            <button className="text-link" onClick={() => onNavigate("Absences")}>View all <Icon name="arrow" size={15} /></button>
          </div>
          <RequestTable teachers={teacherRecords} requests={requests.slice(0, 4)} result={result} confirmed={confirmed} compact />
          <button className="panel-footer-link" onClick={() => onNavigate("Absences")}>See all absence requests <Icon name="arrow" size={16} /></button>
        </div>

        <div className="panel matching-panel">
          <div className="panel-heading">
            <div><div className="eyebrow">MATCH OVERVIEW</div><h2 className="matching-title">{hasRun ? "Looking good." : "Ready when you are."}</h2><p>{hasRun ? "Your latest run found a cover for every class." : "Run the algorithm to get explainable recommendations."}</p></div>
            <div className="match-orb"><Icon name="sparkles" size={21} /></div>
          </div>
          <div className="coverage-progress">
            <div className="coverage-label"><span>Coverage rate</span><strong>{fillRate}%</strong></div>
            <div className="progress-track"><span style={{ width: `${fillRate}%` }} /></div>
            <div className="progress-meta"><span>{Object.keys(result.assignments).length} classes matched</span><span>{result.unfilled.length} unfilled</span></div>
          </div>
          <div className="run-meta">
            <span className="run-status-dot" /> {hasRun ? `Last run just now · ${computeMillis} ms` : "No runs yet today"}
            <button className="round-arrow" aria-label="View match results" onClick={() => onNavigate("Match results")}><Icon name="arrow" size={17} /></button>
          </div>
        </div>
      </section>

      <section className="panel recommendations-panel">
        <div className="panel-heading">
          <div><div className="panel-title-row"><h2>Needs your approval</h2><span className="count-pill count-pill-coral">{unconfirmed.length}</span></div><p>Review and confirm recommended substitutes.</p></div>
          <button className="text-link" onClick={() => onNavigate("Match results")}>All recommendations <Icon name="arrow" size={15} /></button>
        </div>
        {unconfirmed.length ? (
          <div className="recommendation-list">
            {unconfirmed.slice(0, 3).map((request) => {
              const teacher = teacherRecords.find((item) => item.id === result.assignments[request.id]);
              return (
                <div className="recommendation-row" key={request.id}>
                  <div className="subject-badge">{request.subject.slice(0, 2).toUpperCase()}</div>
                  <div className="recommendation-class"><strong>{request.subject}</strong><span>Grade {request.gradeLevel} · {request.section} · {formatPeriod(request)}</span></div>
                  <div className="recommendation-arrow"><Icon name="arrow" size={16} /></div>
                  <div className="teacher-avatar" style={{ backgroundColor: teacher?.color }}>{teacher?.initials ?? "—"}</div>
                  <div className="recommendation-teacher"><strong>{teacher?.name ?? "No match"}</strong><span>{teacher?.specializations[0] ?? "Try another request"}</span></div>
                  <Score value={result.classRankings[request.id]?.find(([id]) => id === teacher?.id)?.[1] ?? 0} />
                  <Button variant="secondary" onClick={() => onConfirm(request.id)}><Icon name="check" size={16} /> Confirm</Button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty-state"><span className="empty-icon"><Icon name="check" size={20} /></span><strong>All caught up</strong><span>Run matching to see recommendations waiting for approval.</span></div>
        )}
      </section>

      <div className="bottom-grid">
        <div className="mini-panel mini-panel-tip"><div className="tip-icon"><Icon name="shield" size={19} /></div><div><strong>Fair, explainable matches</strong><p>Every recommendation considers expertise, workload, schedule, and preferences.</p></div><button aria-label="Learn about matching" onClick={() => onNavigate("Settings")}><Icon name="chevron" size={18} /></button></div>
        <div className="mini-panel mini-panel-color"><div className="mini-chart"><span /><span /><span /><span /><span /><span /><span /></div><div><strong>Smarter coverage, together</strong><p>Matching adapts to your senior high school’s current policies.</p></div><span className="mini-sparkle">✳</span></div>
      </div>
    </>
  );
}

function matchedCountLabel(result: MatchResult): string {
  const count = Object.keys(result.assignments).length;
  return `${count} ${count === 1 ? "match" : "matches"}`;
}

function averageMatchScore(result: MatchResult): number | null {
  const scores = Object.entries(result.assignments)
    .map(([requestId, teacherId]) =>
      result.classRankings[requestId]?.find(([rankedTeacherId]) => rankedTeacherId === teacherId)?.[1],
    )
    .filter((score): score is number => score !== undefined);
  if (scores.length === 0) return null;
  return Math.round((scores.reduce((total, score) => total + score, 0) / scores.length) * 100);
}

function StatCard({
  label,
  value,
  change,
  icon,
  tone,
  suffix,
}: {
  label: string;
  value: string;
  change: string;
  icon: IconName;
  tone: string;
  suffix?: string;
}) {
  return (
    <div className="stat-card">
      <div className="stat-top"><span>{label}</span><span className={`stat-icon ${tone}`}><Icon name={icon} size={18} /></span></div>
      <div className="stat-value">{value}<small>{suffix}</small></div>
      <div className={`stat-change ${tone === "pink" ? "neutral-change" : ""}`}>{tone === "pink" ? <Icon name="trend" size={13} /> : <span className="change-dot" />}{change}</div>
    </div>
  );
}

function Score({ value }: { value: number }) {
  return <div className="score-pill"><span className="score-dot" />{Math.round(value * 100)}<small>%</small></div>;
}

function RequestTable({
  teachers: teacherRecords,
  requests,
  result,
  confirmed,
  compact = false,
  onConfirm,
}: {
  teachers: typeof teachers;
  requests: ClassRequest[];
  result: MatchResult;
  confirmed: string[];
  compact?: boolean;
  onConfirm?: (requestId: string) => void;
}) {
  return (
    <div className={`table-wrap ${compact ? "compact-table" : ""}`}>
      <table className="request-table">
        <thead><tr><th>CLASS / SUBJECT</th><th>TIME</th><th>RECOMMENDED TEACHER</th><th>MATCH</th>{!compact && <th>STATUS</th>}</tr></thead>
        <tbody>
          {requests.map((request) => {
            const teacher = teacherRecords.find((item) => item.id === result.assignments[request.id]);
            const matchScore = result.classRankings[request.id]?.find(([id]) => id === teacher?.id)?.[1] ?? 0;
            const isConfirmed = confirmed.includes(request.id) || request.status === "confirmed";
            return (
              <tr key={request.id}>
                <td><div className="class-cell"><span className="subject-badge">{request.subject.slice(0, 2).toUpperCase()}</span><div><strong>{request.subject}</strong><small>Grade {request.gradeLevel} · {request.section}</small></div></div></td>
                <td><div className="time-cell-wrap"><span className="time-cell">{formatPeriod(request)}</span>{formatDateRange(request) && <small className="date-range">{formatDateRange(request)}</small>}</div></td>
                <td>{teacher ? <div className="table-teacher"><span className="teacher-avatar small-avatar" style={{ backgroundColor: teacher.color }}>{teacher.initials}</span><strong>{teacher.name}</strong></div> : <span className="muted">No eligible match</span>}</td>
                <td>{teacher ? <Score value={matchScore} /> : <span className="muted">—</span>}</td>
                {!compact && <td>{isConfirmed ? <span className="status-tag status-confirmed"><Icon name="check" size={13} /> Confirmed</span> : teacher ? <button className="status-tag status-pending" onClick={() => onConfirm?.(request.id)}>Needs review <Icon name="arrow" size={13} /></button> : <span className="status-tag status-unfilled">Unfilled</span>}</td>}
              </tr>
            );
          })}
          {requests.length === 0 && <tr><td className="no-results" colSpan={compact ? 4 : 5}>No requests found. Report an absence to get started.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function Absences({
  teachers: teacherRecords,
  requests,
  pendingLeaveApplications,
  result,
  confirmed,
  onReport,
  onRun,
  onConfirm,
  onApproveLeave,
  onRejectLeave,
}: {
  teachers: typeof teachers;
  requests: ClassRequest[];
  pendingLeaveApplications: TeacherLeaveApplication[];
  result: MatchResult;
  confirmed: string[];
  onReport: () => void;
  onRun: () => void;
  onConfirm: (requestId: string) => void;
  onApproveLeave: (applicationId: string) => void;
  onRejectLeave: (applicationId: string) => void;
}) {
  return (
    <>
      <PageHeading eyebrow="COVERAGE PLANNING" title="Absence requests" description="Keep every classroom covered with a qualified substitute." actions={<><Button variant="secondary" onClick={onReport}><Icon name="plus" size={17} /> Report absence</Button><Button onClick={onRun}><Icon name="sparkles" size={17} /> Run matching</Button></>} />
      <PendingLeaveApplications
        applications={pendingLeaveApplications}
        teachers={teacherRecords}
        onApprove={onApproveLeave}
        onReject={onRejectLeave}
      />
      <div className="subpage-stats"><StatCard label="All requests" value={String(requests.length).padStart(2, "0")} change="For Monday" icon="calendar" tone="yellow" /><StatCard label="Waiting for approval" value={String(requests.filter((request) => !confirmed.includes(request.id)).length).padStart(2, "0")} change="Recommendations ready" icon="clock" tone="pink" /><StatCard label="Confirmed" value={String(confirmed.length).padStart(2, "0")} change="Substitutes assigned" icon="check" tone="mint" /></div>
      <div className="panel directory-panel">
        <div className="panel-heading"><div><h2>All class requests</h2><p>Review the recommended teacher and match confidence.</p></div><button className="filter-button"><Icon name="filter" size={17} /> All requests <Icon name="chevron" size={14} /></button></div>
        <RequestTable teachers={teacherRecords} requests={requests} result={result} confirmed={confirmed} onConfirm={onConfirm} />
        <div className="table-note"><Icon name="shield" size={16} /> Match scores reflect subject fit, workload, schedule, notice time, cost, and preferences.</div>
      </div>
    </>
  );
}

function PendingLeaveApplications({
  applications,
  teachers: teacherRecords,
  onApprove,
  onReject,
}: {
  applications: TeacherLeaveApplication[];
  teachers: Teacher[];
  onApprove: (applicationId: string) => void;
  onReject: (applicationId: string) => void;
}) {
  if (applications.length === 0) return null;

  return (
    <section className="panel leave-approvals-panel">
      <div className="panel-heading">
        <div>
          <div className="panel-title-row">
            <h2>Teacher leave applications</h2>
            <span className="count-pill count-pill-coral">{applications.length}</span>
          </div>
          <p>Review class sessions before they are added to matching.</p>
        </div>
      </div>
      <div className="leave-approval-list">
        {applications.map((application) => {
          const teacher = teacherRecords.find((item) => item.id === application.teacherId);
          return (
            <article className="leave-approval-card" key={application.id}>
              <div className="leave-approval-heading">
                <span className="teacher-avatar" style={{ backgroundColor: teacher?.color ?? "#e6f4ff" }}>
                  {teacher?.initials ?? "T"}
                </span>
                <div>
                  <strong>{teacher?.name ?? application.teacherId}</strong>
                  <span>{application.id} · {application.sessions.length} class {application.sessions.length === 1 ? "session" : "sessions"}</span>
                </div>
              </div>
              <div className="leave-approval-sessions">
                {application.sessions.map((session) => (
                  <div className="leave-approval-session" key={session.id}>
                    <strong>{session.subject}</strong>
                    <span>Grade {session.gradeLevel} · {session.section}</span>
                    <span>
                      {weekdayForDate(session.date)} · {formatDate(session.date)} ·{" "}
                      {formatTime(Number(session.startHour) * 60)}–{formatTime(Number(session.endHour) * 60)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="leave-approval-actions">
                <Button variant="quiet" onClick={() => onReject(application.id)}>
                  Decline
                </Button>
                <Button onClick={() => onApprove(application.id)}>
                  <Icon name="check" size={15} /> Approve and add to matching
                </Button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function minutesToTime(minutes: number): string {
  const hour = String(Math.floor(minutes / 60)).padStart(2, "0");
  const minute = String(minutes % 60).padStart(2, "0");
  return `${hour}:${minute}`;
}

function timeToMinutes(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function TeacherForm({
  teacher,
  onSubmit,
  onClose,
}: {
  teacher: Teacher | null;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
}) {
  const [timetable, setTimetable] = useState<Teacher["timetable"]>(
    () => teacher?.timetable.map((slot) => ({ ...slot })) ?? [],
  );
  const [timetableImportMessage, setTimetableImportMessage] = useState("");
  const timetableFileInput = useRef<HTMLInputElement>(null);
  const selectedPreferences = teacher?.subjectPreferences.join(", ") ?? "";

  async function importTimetable(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    if (file.size > 1024 * 1024) {
      setTimetableImportMessage("The CSV file must be smaller than 1 MB.");
      return;
    }

    try {
      const importedSlots = parseTimetableCsv(await file.text());
      setTimetable(importedSlots);
      setTimetableImportMessage(
        `${importedSlots.length} periods imported. Saving this teacher will replace their existing regular periods.`,
      );
    } catch (error) {
      if (error instanceof Error) {
        setTimetableImportMessage(error.message);
        return;
      }
      throw error;
    }
  }

  function downloadTimetableTemplate() {
    const template = "day,start,end\nMon,9:00 AM,10:00 AM\nTue,13:00,14:00\n";
    const url = URL.createObjectURL(
      new Blob([template], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "timetable-template.csv";
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function updateSlot(
    index: number,
    property: "day" | "start" | "end",
    value: string,
  ) {
    setTimetable((current) =>
      current.map((slot, slotIndex) =>
        slotIndex === index
          ? {
              ...slot,
              [property]:
                property === "day"
                  ? value
                  : timeToMinutes(value),
            }
          : slot,
      ),
    );
  }

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <form className="absence-modal teacher-modal" onSubmit={onSubmit}>
        <div className="modal-heading">
          <div>
            <span className="eyebrow">TEACHER DIRECTORY</span>
            <h2>{teacher ? "Edit teacher details" : "Add a teacher"}</h2>
          </div>
          <button type="button" className="icon-button" aria-label="Close dialog" onClick={onClose}>
            <Icon name="x" />
          </button>
        </div>
        <p className="modal-copy">
          Update expertise, preferences, workload, and timetable. Changes refresh open match recommendations.
        </p>
        <label className="field-label">
          Teacher name
          <input required name="name" defaultValue={teacher?.name ?? ""} placeholder="e.g. Alex Rivera" />
        </label>
        <p className="field-hint">
          All teacher accounts use the shared login password <strong>{DEFAULT_TEACHER_PASSWORD}</strong>.
          {teacher ? ` Teacher ID: ${teacher.id}.` : " A teacher ID will be generated after saving."}
        </p>
        <fieldset className="subject-picker">
          <legend>Subject specializations <span>Choose at least one</span></legend>
          <div className="subject-check-grid">
            {subjectOptions.map((subject) => (
              <label key={subject}>
                <input
                  type="checkbox"
                  name="specializations"
                  value={subject}
                  defaultChecked={teacher?.specializations.includes(subject) ?? false}
                />
                <span>{subject}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="form-grid">
          <label className="field-label">
            Status
            <select name="status" defaultValue={teacher?.status ?? "available"}>
              <option value="available">Available</option>
              <option value="on_leave">On leave</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>
          <label className="field-label">
            Teacher&apos;s level / qualification
            <select
              required
              name="qualification"
              defaultValue={teacher?.qualification ?? ""}
            >
              <option value="" disabled>Select a qualification</option>
              {teacher?.qualification && !qualificationOptions.includes(teacher.qualification) && (
                <option value={teacher.qualification}>{teacher.qualification}</option>
              )}
              {qualificationOptions.map((qualification) => (
                <option key={qualification} value={qualification}>{qualification}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="form-grid">
          <label className="field-label">
            Honorarium per class
            <input required name="honorariumRate" type="number" min="0" step="1" defaultValue={teacher?.honorariumRate ?? 120} />
          </label>
          <label className="field-label">
            Prep time (minutes)
            <input required name="requiredPrepMinutes" type="number" min="0" step="1" defaultValue={teacher?.requiredPrepMinutes ?? 30} />
          </label>
        </div>
        <label className="field-label">
          Subject preference order
          <input
            name="subjectPreferences"
            defaultValue={selectedPreferences}
            placeholder="e.g. Physics, Chemistry"
          />
          <span className="field-hint">Separate subjects with commas; leave blank for no preference.</span>
        </label>
        <fieldset className="preference-picker">
          <legend>Preferred grades and periods <span>Optional</span></legend>
          <div className="preference-options">
            {[11, 12].map((grade) => (
              <label key={grade}>
                <input
                  type="checkbox"
                  name="preferredGrades"
                  value={grade}
                  defaultChecked={teacher?.preferredGrades.includes(grade) ?? false}
                />
                <span>Grade {grade}</span>
              </label>
            ))}
            {(["AM", "PM"] as const).map((period) => (
              <label key={period}>
                <input
                  type="checkbox"
                  name="preferredPeriods"
                  value={period}
                  defaultChecked={teacher?.preferredPeriods.includes(period) ?? false}
                />
                <span>{period}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className="schedule-picker">
          <legend>Regular timetable <span>{timetable.length} periods</span></legend>
          <input type="hidden" name="timetable" value={JSON.stringify(timetable)} />
          <input
            ref={timetableFileInput}
            accept=".csv,text/csv"
            className="visually-hidden"
            onChange={importTimetable}
            type="file"
          />
          <div className="timetable-import-actions">
            <button
              className="button button-secondary"
              onClick={() => timetableFileInput.current?.click()}
              type="button"
            >
              Import CSV
            </button>
            <button
              className="timetable-template-button"
              onClick={downloadTimetableTemplate}
              type="button"
            >
              Download template
            </button>
          </div>
          <p className="timetable-import-hint">
            CSV columns: <strong>day, start, end</strong>. Import replaces the periods shown below.
          </p>
          {timetableImportMessage && (
            <p className="timetable-import-message" role="status">{timetableImportMessage}</p>
          )}
          {timetable.length === 0 && <p className="empty-schedule">No regular busy periods added.</p>}
          {timetable.map((slot, index) => (
            <div className="schedule-period" key={`${index}-${slot.day}`}>
              <label className="field-label">
                Weekday
                <select
                  aria-label={`Timetable period ${index + 1} weekday`}
                  value={slot.day}
                  onChange={(event) => updateSlot(index, "day", event.target.value)}
                >
                  {weekDays.map((day) => <option key={day}>{day}</option>)}
                </select>
              </label>
              <label className="field-label">
                Busy from
                <input
                  aria-label={`Timetable period ${index + 1} start time`}
                  type="time"
                  value={minutesToTime(slot.start)}
                  onChange={(event) => updateSlot(index, "start", event.target.value)}
                />
              </label>
              <label className="field-label">
                Busy until
                <input
                  aria-label={`Timetable period ${index + 1} end time`}
                  type="time"
                  value={minutesToTime(slot.end)}
                  onChange={(event) => updateSlot(index, "end", event.target.value)}
                />
              </label>
              <button
                type="button"
                className="remove-period"
                aria-label={`Remove timetable period ${index + 1}`}
                onClick={() => setTimetable((current) => current.filter((_, slotIndex) => slotIndex !== index))}
              >
                <Icon name="x" size={16} />
              </button>
            </div>
          ))}
          <button
            type="button"
            className="add-period-button"
            onClick={() =>
              setTimetable((current) => [
                ...current,
                { day: "Mon", start: 9 * 60, end: 10 * 60 },
              ])
            }
          >
            <Icon name="plus" size={15} /> Add timetable period
          </button>
        </fieldset>
        <div className="modal-footer">
          <button type="button" className="button button-quiet" onClick={onClose}>Cancel</button>
          <button type="submit" className="button button-primary">
            <Icon name={teacher ? "check" : "plus"} size={17} />
            {teacher ? "Save changes" : "Add teacher"}
          </button>
        </div>
      </form>
    </div>
  );
}

function TeachersDirectory({
  teachers: visibleTeachers,
  search,
  onSearch,
  onAdd,
  onEdit,
}: {
  teachers: typeof teachers;
  search: string;
  onSearch: (value: string) => void;
  onAdd: () => void;
  onEdit: (teacher: Teacher) => void;
}) {
  function exportTeachers() {
    const header = ["Name", "Status", "Specializations", "Level / qualification", "Substitute load"];
    const rows = visibleTeachers.map((teacher) => [
      teacher.name,
      teacher.status,
      teacher.specializations.join("; "),
      teacher.qualification,
      String(teacher.currentSubLoad),
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((field) => `"${field.replaceAll('"', '""')}"`).join(","))
      .join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "subjtitute-teachers.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <PageHeading eyebrow="PEOPLE & AVAILABILITY" title="Your teachers" description="A clear view of subject expertise and current substitute capacity." actions={<><Button variant="secondary" onClick={exportTeachers}><Icon name="arrow" size={17} /> Export list</Button><Button onClick={onAdd}><Icon name="plus" size={17} /> Add teacher</Button></>} />
      <div className="subpage-stats"><StatCard label="Teachers shown" value={String(visibleTeachers.length).padStart(2, "0")} change={search ? "Matching your search" : "Across 4 departments"} icon="users" tone="blue" /><StatCard label="Available now" value={String(visibleTeachers.filter((teacher) => teacher.status === "available").length).padStart(2, "0")} change="Ready for matching" icon="check" tone="mint" /><StatCard label="Qualification levels" value={String(new Set(visibleTeachers.map((teacher) => teacher.qualification.trim()).filter(Boolean)).size)} change="Distinct levels recorded" icon="chart" tone="yellow" /></div>
      <div className="panel directory-panel">
        <div className="panel-heading"><div><div className="panel-title-row"><h2>Teacher directory</h2><span className="count-pill">{visibleTeachers.length}</span></div><p>Search by name or subject specialization.</p></div><label className="directory-search"><Icon name="search" size={17} /><input aria-label="Search teachers or subjects" placeholder="Search teachers..." value={search} onChange={(event) => onSearch(event.target.value)} /></label></div>
        <div className="table-wrap">
          <table className="request-table teacher-table">
            <thead><tr><th>TEACHER</th><th>SUBJECT SPECIALIZATIONS</th><th>LEVEL / QUALIFICATION</th><th>SUB LOAD</th><th>STATUS</th><th /></tr></thead>
            <tbody>{visibleTeachers.map((teacher) => <tr key={teacher.id}>
              <td><div className="table-teacher"><span className="teacher-avatar" style={{ backgroundColor: teacher.color }}>{teacher.initials}</span><div><strong>{teacher.name}</strong><small>{teacher.id}</small></div></div></td>
              <td><div className="subject-tags">{teacher.specializations.map((subject) => <span key={subject}>{subject}</span>)}</div></td>
              <td>{teacher.qualification}</td>
              <td><span className="sub-load">{teacher.currentSubLoad}<small> / 3</small></span></td>
              <td><span className={`status-tag ${teacher.status === "available" ? "status-confirmed" : "status-unfilled"}`}><span className="status-dot" />{teacher.status === "available" ? "Available" : teacher.status === "on_leave" ? "On leave" : "Inactive"}</span></td>
              <td><button className="edit-teacher-button" onClick={() => onEdit(teacher)} aria-label={`Edit ${teacher.name}`}><Icon name="settings" size={15} /> Edit</button></td>
            </tr>)}
            {visibleTeachers.length === 0 && <tr><td className="no-results" colSpan={6}>No teachers match “{search}”. Try another name or subject.</td></tr>}</tbody>
          </table>
        </div>
        <div className="table-note"><Icon name="shield" size={16} /> Eligibility checks include availability, timetable conflicts, expertise, prep time, budget, and workload.</div>
      </div>
    </>
  );
}

function MatchResults({
  teachers: teacherRecords,
  requests,
  result,
  confirmed,
  onConfirm,
  onSelectAlternative,
  onRun,
  computeMillis,
  hasRun,
}: {
  teachers: typeof teachers;
  requests: ClassRequest[];
  result: MatchResult;
  confirmed: string[];
  onConfirm: (requestId: string) => void;
  onSelectAlternative: (requestId: string, teacherId: string) => void;
  onRun: () => void;
  computeMillis: number;
  hasRun: boolean;
}) {
  return (
    <>
      <PageHeading eyebrow="DECISION SUPPORT" title="Match results" description="Recommended coverage, ranked alternatives, and the factors behind every score." actions={<Button onClick={onRun}><Icon name="sparkles" size={17} /> Run matching</Button>} />
      <div className="results-banner">
        <div className="results-banner-icon"><Icon name="sparkles" size={20} /></div>
        <div><strong>{hasRun ? "Matching run complete" : "Preview recommendations"}</strong><p>{hasRun ? `${Object.keys(result.assignments).length} of ${requests.length} classes matched in ${computeMillis} ms.` : "Add your senior high school data to generate recommendations. Run matching again after each change."}</p></div>
        <div className="banner-metric"><strong>{Object.keys(result.assignments).length}/{requests.length}</strong><span>classes covered</span></div>
      </div>
      <div className="results-list">
        {requests.map((request) => {
          const teacherId = result.assignments[request.id];
          const teacher = teacherRecords.find((item) => item.id === teacherId);
          const ranking = result.classRankings[request.id] ?? [];
          const topScore = ranking.find(([id]) => id === teacherId)?.[1] ?? 0;
          const explanation = result.explanations[request.id] ?? {};
          return (
            <article className="panel result-card" key={request.id}>
              <div className="result-card-head">              <div className="result-class"><span className="subject-badge">{request.subject.slice(0, 2).toUpperCase()}</span><div><span className="eyebrow">{request.id} · GRADE {request.gradeLevel} · {request.section}</span><h2>{request.subject}</h2><span className="muted"><Icon name="clock" size={14} /> {formatPeriod(request)}{formatDateRange(request) ? ` · ${formatDateRange(request)}` : ""}</span></div></div><span className={confirmed.includes(request.id) ? "status-tag status-confirmed" : "status-tag status-pending"}>{confirmed.includes(request.id) ? "Confirmed" : "Recommended"}</span></div>
              {teacher ? (
                <>
                  <div className="result-match">
                    <div className="result-teacher"><span className="teacher-avatar large-avatar" style={{ backgroundColor: teacher.color }}>{teacher.initials}</span><div><span className="eyebrow">BEST-FIT SUBSTITUTE</span><strong>{teacher.name}</strong><span>{teacher.specializations.join(" · ")}</span></div></div>
                    <div className="result-score"><strong>{Math.round(topScore * 100)}<small>%</small></strong><span>Class preference score</span></div>
                    {!confirmed.includes(request.id) && <Button variant="secondary" onClick={() => onConfirm(request.id)}><Icon name="check" size={16} /> Confirm match</Button>}
                  </div>
                  <div className="explanation-grid">
                    <div><span>Subject expertise</span><strong>{percent(explanation.subject_expertise)}</strong><small>Weight 35%</small></div>
                    <div><span>Teacher preference</span><strong>{percent(explanation.preference_list)}</strong><small>Weight 20%</small></div>
                    <div><span>Substitute workload</span><strong>{percent(explanation.current_sub_load)}</strong><small>Weight 15%</small></div>
                    <div><span>Teaching load</span><strong>{percent(explanation.teaching_load)}</strong><small>Weight 10%</small></div>
                    <div><span>Notice time</span><strong>{percent(explanation.notice_time)}</strong><small>Weight 10%</small></div>
                    <div><span>Honorarium fit</span><strong>{percent(explanation.cost)}</strong><small>Weight 10%</small></div>
                  </div>
                  <div className="alternates">
                    <span>TOP ALTERNATES</span>
                    {ranking.filter(([id]) => id !== teacherId).slice(0, 3).map(([id, score], index) => {
                      const alternate = teacherRecords.find((item) => item.id === id);
                      return alternate ? (
                        <button
                          className="alternate-chip"
                          key={id}
                          disabled={confirmed.includes(request.id)}
                          onClick={() => onSelectAlternative(request.id, id)}
                          aria-label={`Use ${alternate.name} instead, match score ${Math.round(score * 100)} percent`}
                        >
                          <i>{index + 2}</i>
                          {alternate.name}
                          <strong>{Math.round(score * 100)}%</strong>
                          {!confirmed.includes(request.id) && <span className="alternate-use">Use</span>}
                        </button>
                      ) : null;
                    })}
                    {ranking.length <= 1 && <span className="muted">No other eligible teachers for this class.</span>}
                    {!confirmed.includes(request.id) && ranking.length > 1 && <span className="alternate-hint">Choose an alternative, then confirm the match.</span>}
                  </div>
                </>
              ) : (
                <div className="unfilled-box"><Icon name="clock" size={18} /><div><strong>No eligible teacher found</strong><span>Every teacher was filtered out by schedule, subject expertise, preparation time, budget, or workload.</span></div></div>
              )}
            </article>
          );
        })}
      </div>
      <div className="algorithm-footnote"><Icon name="shield" size={16} /><span>Modified Gale–Shapley deferred acceptance · Class-proposing · Teacher capacity and timetable conflicts respected.</span><button onClick={onRun}>Re-run matching <Icon name="arrow" size={14} /></button></div>
    </>
  );
}

function percent(value: number | undefined): string {
  return `${Math.round((value ?? 0) * 100)}%`;
}

function Settings({
  darkMode,
  onToggleTheme,
}: {
  darkMode: boolean;
  onToggleTheme: () => void;
}) {
  const criteria = [
    ["Subject expertise", 35, "#6BF178"],
    ["Teacher preference", 20, "#35A7FF"],
    ["Substitute workload", 15, "#FFE74C"],
    ["Teaching load", 10, "#FF5964"],
    ["Notice time", 10, "#bdb5ff"],
    ["Honorarium fit", 10, "#ffc98f"],
  ] as const;
  return (
    <>
      <PageHeading
        eyebrow="SENIOR HIGH SCHOOL CONFIGURATION"
        title="Matching settings"
        description="Tune the senior high school’s eligibility rules and preference weights."
        actions={<ThemeToggle darkMode={darkMode} onToggle={onToggleTheme} />}
      />
      <div className="settings-grid">
        <section className="panel settings-card"><div className="panel-heading"><div><h2>Eligibility policy</h2><p>Hard requirements used to screen candidates.</p></div><span className="settings-icon"><Icon name="shield" /></span></div>
          <div className="setting-row"><div><strong>Minimum subject expertise</strong><span>Exact specialization or same subject category</span></div><span className="setting-value">0.60 <small>/ 1.00</small></span></div>
          <div className="setting-row"><div><strong>Maximum substitute classes</strong><span>Per teacher, including current assignments</span></div><span className="setting-value">3 <small>classes</small></span></div>
          <div className="setting-row"><div><strong>Maximum teaching load</strong><span>Used to normalize workload preference</span></div><span className="setting-value">30 <small>hrs / week</small></span></div>
        </section>
        <section className="panel settings-card weights-card"><div className="panel-heading"><div><h2>Class preference weights</h2><p>How a class ranks eligible substitute teachers.</p></div><span className="weight-total">100%</span></div>
          <div className="weight-list">{criteria.map(([label, weight, color]) => <div className="weight-row" key={label}><div><span className="weight-color" style={{ backgroundColor: color }} /><strong>{label}</strong><b>{weight}%</b></div><div className="weight-track"><span style={{ width: `${weight * 2.5}%`, backgroundColor: color }} /></div></div>)}</div>
          <div className="settings-note"><Icon name="book" size={16} /> Weights should come from survey results. These are placeholder defaults for the prototype.</div>
        </section>
      </div>
      <section className="panel settings-card teacher-weights"><div className="panel-heading"><div><h2>Teacher preference weights</h2><p>How each teacher ranks the classes requesting coverage.</p></div><span className="weight-total">100%</span></div><div className="teacher-weight-grid"><div><span>Subject preference</span><strong>40%</strong></div><div><span>Subject fit</span><strong>20%</strong></div><div><span>Grade level</span><strong>15%</strong></div><div><span>Time slot</span><strong>15%</strong></div><div><span>Honorarium</span><strong>10%</strong></div></div><div className="settings-note"><Icon name="shield" size={16} /> Scores are normalized and explainable. A single eligible candidate receives a normalized score of 1.0.</div></section>
    </>
  );
}
