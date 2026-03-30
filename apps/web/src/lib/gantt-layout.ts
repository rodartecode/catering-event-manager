export type TaskStatus = 'pending' | 'in_progress' | 'completed';
export type TaskCategory = 'pre_event' | 'during_event' | 'post_event';

export interface GanttTask {
  id: number;
  title: string;
  status: TaskStatus;
  category: TaskCategory;
  dueDate: Date | null;
  dependsOnTaskId: number | null;
  assignee: { name: string } | null;
}

export interface GanttBar {
  id: number;
  title: string;
  status: TaskStatus;
  category: TaskCategory;
  left: number;
  width: number;
  row: number;
  hasDueDate: boolean;
  isCriticalPath: boolean;
  assigneeName: string | null;
  dueDate: Date | null;
}

export interface GanttArrow {
  fromId: number;
  toId: number;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  isCriticalPath: boolean;
}

export interface DateColumn {
  date: Date;
  label: string;
  left: number;
  width: number;
  isEventDate: boolean;
}

export interface GanttLayout {
  bars: GanttBar[];
  arrows: GanttArrow[];
  criticalPathIds: Set<number>;
  columns: DateColumn[];
  totalWidth: number;
  totalHeight: number;
  eventDateX: number | null;
}

const DAY_WIDTH = 60;
const BAR_HEIGHT = 28;
const ROW_HEIGHT = 40;
const BAR_DEFAULT_WIDTH = 80;
const HEADER_HEIGHT = 32;

const CATEGORY_ORDER: TaskCategory[] = ['pre_event', 'during_event', 'post_event'];

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysBetween(a: Date, b: Date): number {
  const msPerDay = 86400000;
  return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / msPerDay);
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatDateLabel(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function computeTimeRange(tasks: GanttTask[], eventDate: Date): { start: Date; end: Date } {
  const dueDates = tasks.filter((t) => t.dueDate).map((t) => t.dueDate!.getTime());

  let earliest: Date;
  let latest: Date;

  if (dueDates.length > 0) {
    earliest = startOfDay(new Date(Math.min(...dueDates)));
    latest = startOfDay(new Date(Math.max(...dueDates)));
  } else {
    earliest = startOfDay(eventDate);
    latest = startOfDay(eventDate);
  }

  // Ensure event date is in range
  const eventStart = startOfDay(eventDate);
  if (eventStart < earliest) earliest = eventStart;
  if (eventStart > latest) latest = eventStart;

  // Add buffer: 7 days before and 7 days after
  earliest = addDays(earliest, -7);
  latest = addDays(latest, 7);

  return { start: earliest, end: latest };
}

function sortTasks(tasks: GanttTask[]): GanttTask[] {
  return [...tasks].sort((a, b) => {
    // Sort by category order first
    const catA = CATEGORY_ORDER.indexOf(a.category);
    const catB = CATEGORY_ORDER.indexOf(b.category);
    if (catA !== catB) return catA - catB;

    // Then by due date (nulls last)
    if (a.dueDate && b.dueDate) {
      return a.dueDate.getTime() - b.dueDate.getTime();
    }
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;

    // Finally by title
    return a.title.localeCompare(b.title);
  });
}

function estimateDateForTask(task: GanttTask, eventDate: Date): Date {
  const event = startOfDay(eventDate);
  switch (task.category) {
    case 'pre_event':
      return addDays(event, -3);
    case 'during_event':
      return event;
    case 'post_event':
      return addDays(event, 3);
  }
}

function computeCriticalPath(tasks: GanttTask[]): Set<number> {
  const taskMap = new Map<number, GanttTask>();
  for (const t of tasks) taskMap.set(t.id, t);

  // Build adjacency: dependsOnTaskId points "backward" (this task depends on that one)
  // We want the longest chain. Find leaf tasks (no one depends on them).
  const hasDependent = new Set<number>();
  for (const t of tasks) {
    if (t.dependsOnTaskId !== null && taskMap.has(t.dependsOnTaskId)) {
      hasDependent.add(t.dependsOnTaskId);
    }
  }

  const leafTasks = tasks.filter((t) => !hasDependent.has(t.id));

  // Walk backward from each leaf, measure chain length
  function chainLength(taskId: number, visited: Set<number>): number {
    if (visited.has(taskId)) return 0;
    visited.add(taskId);
    const task = taskMap.get(taskId);
    if (!task || task.dependsOnTaskId === null) return 1;
    const parent = taskMap.get(task.dependsOnTaskId);
    if (!parent) return 1;
    return 1 + chainLength(parent.id, visited);
  }

  function getChain(taskId: number, visited: Set<number>): number[] {
    if (visited.has(taskId)) return [];
    visited.add(taskId);
    const task = taskMap.get(taskId);
    if (!task) return [];
    if (task.dependsOnTaskId === null || !taskMap.has(task.dependsOnTaskId)) {
      return [taskId];
    }
    return [...getChain(task.dependsOnTaskId, visited), taskId];
  }

  let longestChain: number[] = [];
  for (const leaf of leafTasks) {
    const len = chainLength(leaf.id, new Set());
    if (len > longestChain.length) {
      longestChain = getChain(leaf.id, new Set());
    }
  }

  // Only highlight critical path if it has at least 2 tasks (a dependency exists)
  if (longestChain.length < 2) return new Set();
  return new Set(longestChain);
}

export function computeGanttLayout(tasks: GanttTask[], eventDate: Date): GanttLayout {
  if (tasks.length === 0) {
    return {
      bars: [],
      arrows: [],
      criticalPathIds: new Set(),
      columns: [],
      totalWidth: 0,
      totalHeight: 0,
      eventDateX: null,
    };
  }

  const { start, end } = computeTimeRange(tasks, eventDate);
  const totalDays = daysBetween(start, end) + 1;
  const totalWidth = totalDays * DAY_WIDTH;

  // Generate date columns
  const columns: DateColumn[] = [];
  const eventStart = startOfDay(eventDate);
  for (let i = 0; i < totalDays; i++) {
    const date = addDays(start, i);
    columns.push({
      date,
      label: formatDateLabel(date),
      left: i * DAY_WIDTH,
      width: DAY_WIDTH,
      isEventDate: date.getTime() === eventStart.getTime(),
    });
  }

  // Event date X position
  const eventDayOffset = daysBetween(start, eventDate);
  const eventDateX = eventDayOffset * DAY_WIDTH + DAY_WIDTH / 2;

  // Sort and assign rows
  const sorted = sortTasks(tasks);
  const criticalPathIds = computeCriticalPath(tasks);

  // Compute bars
  const bars: GanttBar[] = sorted.map((task, index) => {
    const effectiveDate = task.dueDate
      ? startOfDay(task.dueDate)
      : estimateDateForTask(task, eventDate);

    const dayOffset = daysBetween(start, effectiveDate);
    // Bar ends at the due date position, so left = position - width
    const barLeft = Math.max(0, dayOffset * DAY_WIDTH + DAY_WIDTH / 2 - BAR_DEFAULT_WIDTH);
    const barWidth = BAR_DEFAULT_WIDTH;

    return {
      id: task.id,
      title: task.title,
      status: task.status,
      category: task.category,
      left: barLeft,
      width: barWidth,
      row: index,
      hasDueDate: task.dueDate !== null,
      isCriticalPath: criticalPathIds.has(task.id),
      assigneeName: task.assignee?.name ?? null,
      dueDate: task.dueDate,
    };
  });

  // Build bar lookup for arrow computation
  const barMap = new Map<number, GanttBar>();
  for (const bar of bars) barMap.set(bar.id, bar);

  // Compute dependency arrows
  const arrows: GanttArrow[] = [];
  for (const task of tasks) {
    if (task.dependsOnTaskId !== null) {
      const sourceBar = barMap.get(task.dependsOnTaskId);
      const targetBar = barMap.get(task.id);
      if (sourceBar && targetBar) {
        arrows.push({
          fromId: sourceBar.id,
          toId: targetBar.id,
          fromX: sourceBar.left + sourceBar.width,
          fromY: HEADER_HEIGHT + sourceBar.row * ROW_HEIGHT + ROW_HEIGHT / 2,
          toX: targetBar.left,
          toY: HEADER_HEIGHT + targetBar.row * ROW_HEIGHT + ROW_HEIGHT / 2,
          isCriticalPath: criticalPathIds.has(sourceBar.id) && criticalPathIds.has(targetBar.id),
        });
      }
    }
  }

  const totalHeight = HEADER_HEIGHT + sorted.length * ROW_HEIGHT;

  return {
    bars,
    arrows,
    criticalPathIds,
    columns,
    totalWidth,
    totalHeight,
    eventDateX,
  };
}

// Re-export constants for use in components
export const GANTT_ROW_HEIGHT = ROW_HEIGHT;
export const GANTT_BAR_HEIGHT = BAR_HEIGHT;
export const GANTT_HEADER_HEIGHT = HEADER_HEIGHT;
