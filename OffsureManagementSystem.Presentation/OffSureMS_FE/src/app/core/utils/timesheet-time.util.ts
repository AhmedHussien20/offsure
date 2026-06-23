const MINUTES_PER_DAY = 24 * 60;
const TIME_PATTERN = /^(\d{1,2}):(\d{2})$/;

export function timeToMinutes(time: string): number {
  const match = TIME_PATTERN.exec(time.trim());
  if (!match) return 0;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return 0;
  return Math.min(MINUTES_PER_DAY, Math.max(0, hours * 60 + minutes));
}

export function minutesToTime(totalMinutes: number): string {
  const clamped = Math.min(MINUTES_PER_DAY - 10, Math.max(0, totalMinutes));
  const hours = Math.floor(clamped / 60);
  const minutes = clamped % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function snapMinutesToStep(minutes: number, step = 10): number {
  const safeStep = Math.max(1, step);
  return Math.min(MINUTES_PER_DAY - safeStep, Math.max(0, Math.round(minutes / safeStep) * safeStep));
}

export function formatHourLabel(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`;
}

export function formatTime12h(time24: string): string {
  const match = TIME_PATTERN.exec(time24.trim());
  if (!match) return time24;

  const hours24 = Number(match[1]);
  const minute = Number(match[2]);
  const period = hours24 >= 12 ? 'PM' : 'AM';
  let hour12 = hours24 % 12;
  if (hour12 === 0) hour12 = 12;

  return `${hour12}:${String(minute).padStart(2, '0')} ${period}`;
}

export function formatTimeRange12h(start: string, end: string): string {
  return `${formatTime12h(start)} – ${formatTime12h(end)}`;
}

export function formatTotalLogged(totalHours: number): string {
  const totalMinutes = Math.round(totalHours * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${String(minutes).padStart(2, '0')}m`;
}

export function hoursBetween(start: string, end: string): number {
  const startMinutes = timeToMinutes(start);
  const endMinutes = timeToMinutes(end);
  if (endMinutes <= startMinutes) return 0;
  return Math.round(((endMinutes - startMinutes) / 60) * 100) / 100;
}

export function timelineBlockPercents(start: string, end: string): { topPercent: number; heightPercent: number } {
  const startMinutes = timeToMinutes(start);
  const endMinutes = timeToMinutes(end);
  const duration = Math.max(0, endMinutes - startMinutes);

  return {
    topPercent: (startMinutes / MINUTES_PER_DAY) * 100,
    heightPercent: (duration / MINUTES_PER_DAY) * 100,
  };
}

export function todayIsoDate(): string {
  return new Date().toISOString().split('T')[0];
}

export function isoDateFromApi(value: string | null | undefined): string | null {
  if (!value) return null;
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(value.trim());
  return match ? match[1] : null;
}

export function clampIsoDate(value: string, min: string, max: string): string {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

export function isTodayIsoDate(value: string): boolean {
  return value === todayIsoDate();
}

export function nowMinutesOfDay(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

export function parseIsoDate(value: string): { year: number; month: number; day: number } {
  const [year, month, day] = value.split('-').map(Number);
  return { year, month, day };
}

export function isoDateFromParts(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function startOfMonthIso(value: string): string {
  const { year, month } = parseIsoDate(value);
  return isoDateFromParts(year, month, 1);
}

export function endOfMonthIso(value: string): string {
  const { year, month } = parseIsoDate(value);
  const lastDay = new Date(year, month, 0).getDate();
  return isoDateFromParts(year, month, lastDay);
}

export function monthKeyFromIso(value: string): string {
  const { year, month } = parseIsoDate(value);
  return `${year}-${String(month).padStart(2, '0')}`;
}

export function formatMonthYearLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number);
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

export function shiftMonthKey(monthKey: string, delta: number): string {
  const [year, month] = monthKey.split('-').map(Number);
  const date = new Date(year, month - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export interface MonthCalendarCell {
  isoDate: string;
  day: number;
  inMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
}

export function buildMonthCalendarCells(monthKey: string, selectedDate: string): MonthCalendarCell[] {
  const [year, month] = monthKey.split('-').map(Number);
  const firstOfMonth = new Date(year, month - 1, 1);
  const startOffset = firstOfMonth.getDay();
  const gridStart = new Date(year, month - 1, 1 - startOffset);
  const today = todayIsoDate();
  const cells: MonthCalendarCell[] = [];

  for (let index = 0; index < 42; index++) {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    const isoDate = isoDateFromParts(date.getFullYear(), date.getMonth() + 1, date.getDate());
    cells.push({
      isoDate,
      day: date.getDate(),
      inMonth: date.getMonth() === month - 1,
      isToday: isoDate === today,
      isSelected: isoDate === selectedDate,
    });
  }

  return cells;
}

export function defaultRangeForHour(hour: number): { startTime: string; endTime: string; description: string } {
  const startTime = formatHourLabel(hour);
  const endMinutes = Math.min((hour + 1) * 60, MINUTES_PER_DAY - 10);
  return { startTime, endTime: minutesToTime(endMinutes), description: '' };
}
