// Формат данных StuStu. Совместим с резервными копиями версии 2.0.

export type LessonType = 'LECTURE' | 'SEMINAR' | 'PRACTICE' | 'LAB' | 'LESSON' | 'CONSULT' | 'EXAM' | 'CREDIT' | 'OTHER';
export type EventKind = 'EXAM' | 'CREDIT' | 'DIFF_CREDIT' | 'TEST' | 'COLLOQ' | 'PROJECT' | 'OTHER';
export type Attach = 'GENERAL' | 'DATE' | 'LESSON' | 'RECURRING' | 'SUBJECT';
export type AttMark = 'p' | 'l' | 'a' | 'e';

export interface Settings {
  cycleWeeks: number;
  /** Понедельник (номер дня от 1970-01-01), с которого начинается неделя 1. */
  anchorMonday: number;
  weekNames: string[];
  showSaturday: boolean;
  showSunday: boolean;
  digestOn: boolean;
  digestTime: number;
  lessonRemindOn: boolean;
  lessonRemindMin: number;
  hwRemindDays: number;
  examRemindDays: number;
  /** 0 — как в системе, 1 — светлая, 2 — тёмная. */
  theme: number;
  hwDefaultMin: number;
  busyMin: number;
  attStart: number;
  lastBackup: number;
  installHintOff: boolean;
}

export interface Subject { id: number; name: string; teacher: string; color: number }
export interface Bell { start: number; end: number }
export interface Lesson {
  id: number; subjectId: number; type: LessonType; room: string; teacher: string;
  /** -1 — каждую неделю, иначе номер недели цикла с нуля. */
  week: number;
  /** 1 — понедельник … 7 — воскресенье. */
  day: number;
  bell: number; customStart: number; customEnd: number; note: string;
}
export interface Holiday { id: number; title: string; from: number; to: number }
export interface Homework {
  id: number; subjectId: number; text: string; created: number; dueDay: number; dueBell: number;
  dueLabel: string; remindDays: number; done: boolean; doneDay: number; estMin: number;
}
export interface StudyEvent {
  id: number; kind: EventKind; subjectId: number; title: string; day: number; bell: number; time: number;
  room: string; details: string; remindDays: number; prepGoalMin: number;
}
export interface Note {
  id: number; text: string; pinned: boolean; remind: boolean; attach: Attach; day: number; bell: number;
  week: number; weekday: number; subjectId: number; created: number;
}
export interface Cancel { day: number; lessonId: number }
export interface Prep { id: number; subjectId: number; eventId: number; hwId: number; day: number; min: number; note: string; ts: number }
export interface TimerState { target: string; start: number; acc: number; paused: boolean }

export interface Data {
  app: 'StuStu';
  version: 2;
  nextId: number;
  settings: Settings;
  subjects: Subject[];
  bells: Bell[];
  lessons: Lesson[];
  holidays: Holiday[];
  homework: Homework[];
  events: StudyEvent[];
  notes: Note[];
  cancels: Cancel[];
  attendance: Record<string, AttMark>;
  prep: Prep[];
  timer: TimerState | null;
}

/** Конкретная пара в конкретный день. */
export interface Occ {
  e: number; l: Lesson; start: number; end: number; cancelled: boolean; bell: number; sid: number; key: string;
}
