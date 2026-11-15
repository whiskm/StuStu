import type { Attach, AttMark, Bell, EventKind, LessonType } from './types';

export const TYPES: Record<LessonType, string> = {
  LECTURE: 'Лекция', SEMINAR: 'Семинар', PRACTICE: 'Практика', LAB: 'Лабораторная', LESSON: 'Урок',
  CONSULT: 'Консультация', EXAM: 'Экзамен', CREDIT: 'Зачёт', OTHER: 'Другое',
};
export const TO_TYPE: Record<LessonType, string> = {
  LECTURE: 'к лекции', SEMINAR: 'к семинару', PRACTICE: 'к практике', LAB: 'к лабораторной', LESSON: 'к уроку',
  CONSULT: 'к консультации', EXAM: 'к экзамену', CREDIT: 'к зачёту', OTHER: 'к занятию',
};
/** t — название, g — сколько минут подготовки предлагать по умолчанию. */
export const KIND: Record<EventKind, { t: string; g: number }> = {
  EXAM: { t: 'Экзамен', g: 600 }, CREDIT: { t: 'Зачёт', g: 240 }, DIFF_CREDIT: { t: 'Дифф. зачёт', g: 360 },
  TEST: { t: 'Контрольная', g: 180 }, COLLOQ: { t: 'Коллоквиум', g: 240 }, PROJECT: { t: 'Сдача работы', g: 300 },
  OTHER: { t: 'Событие', g: 60 },
};
export const ATTACH: Record<Attach, string> = {
  GENERAL: 'Без привязки', DATE: 'К дню (один раз)', LESSON: 'К паре (один раз)',
  RECURRING: 'Повторять по расписанию', SUBJECT: 'К предмету (на каждой паре)',
};
export const ATT: Record<AttMark, string> = { p: 'Был', l: 'Опоздал', a: 'Не был', e: 'Уважительная' };

/** Цвета предметов. Порядок менять нельзя: в данных хранится номер цвета. */
export const COLORS = ['#5461D6', '#E2573B', '#F0863A', '#C98A00', '#2E9E5B', '#12A594', '#2B74D9', '#7A56D0', '#D6409F', '#7D7D85', '#8D6E63'];
export const NO_SUBJECT_COLOR = '#9AA89F';

const bells = (list: number[][]): Bell[] => list.map(([start, end]) => ({ start, end }));
export const UNI_BELLS = () => bells([[540, 630], [640, 730], [760, 850], [860, 950], [960, 1050], [1060, 1150]]);
export const SCHOOL_BELLS = () => bells([[510, 555], [565, 610], [630, 675], [695, 740], [750, 795], [805, 850], [860, 905]]);

export const LVL_TXT = ['свободный день', 'обычный день', 'загруженный день', 'тяжёлый день'];
export const APP_VERSION = '3.0';
