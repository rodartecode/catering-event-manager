import { describe, expect, it } from 'vitest';
import { computeGanttLayout, type GanttTask } from './gantt-layout';

function makeTask(overrides: Partial<GanttTask> & { id: number }): GanttTask {
  return {
    title: `Task ${overrides.id}`,
    status: 'pending',
    category: 'pre_event',
    dueDate: null,
    dependsOnTaskId: null,
    assignee: null,
    ...overrides,
  };
}

const EVENT_DATE = new Date('2026-04-15T00:00:00');

describe('computeGanttLayout', () => {
  it('returns empty layout for no tasks', () => {
    const layout = computeGanttLayout([], EVENT_DATE);
    expect(layout.bars).toHaveLength(0);
    expect(layout.arrows).toHaveLength(0);
    expect(layout.columns).toHaveLength(0);
    expect(layout.totalWidth).toBe(0);
    expect(layout.totalHeight).toBe(0);
    expect(layout.eventDateX).toBeNull();
  });

  it('positions a single task with due date', () => {
    const tasks = [makeTask({ id: 1, dueDate: new Date('2026-04-10') })];
    const layout = computeGanttLayout(tasks, EVENT_DATE);

    expect(layout.bars).toHaveLength(1);
    expect(layout.bars[0].id).toBe(1);
    expect(layout.bars[0].hasDueDate).toBe(true);
    expect(layout.bars[0].row).toBe(0);
    expect(layout.bars[0].left).toBeGreaterThanOrEqual(0);
    expect(layout.bars[0].width).toBeGreaterThan(0);
  });

  it('positions a task without due date using category heuristic', () => {
    const tasks = [
      makeTask({ id: 1, category: 'pre_event' }),
      makeTask({ id: 2, category: 'during_event' }),
      makeTask({ id: 3, category: 'post_event' }),
    ];
    const layout = computeGanttLayout(tasks, EVENT_DATE);

    expect(layout.bars).toHaveLength(3);
    // All should have hasDueDate = false
    for (const bar of layout.bars) {
      expect(bar.hasDueDate).toBe(false);
    }
    // Pre-event should be left of during, during left of post
    const preBar = layout.bars.find((b) => b.id === 1)!;
    const duringBar = layout.bars.find((b) => b.id === 2)!;
    const postBar = layout.bars.find((b) => b.id === 3)!;
    expect(preBar.left).toBeLessThan(duringBar.left);
    expect(duringBar.left).toBeLessThan(postBar.left);
  });

  it('sorts tasks by category then due date', () => {
    const tasks = [
      makeTask({ id: 1, category: 'post_event', dueDate: new Date('2026-04-20') }),
      makeTask({ id: 2, category: 'pre_event', dueDate: new Date('2026-04-10') }),
      makeTask({ id: 3, category: 'during_event', dueDate: new Date('2026-04-15') }),
      makeTask({ id: 4, category: 'pre_event', dueDate: new Date('2026-04-08') }),
    ];
    const layout = computeGanttLayout(tasks, EVENT_DATE);

    // Expected order: pre_event(4, 2), during_event(3), post_event(1)
    expect(layout.bars[0].id).toBe(4); // pre_event, earlier date
    expect(layout.bars[1].id).toBe(2); // pre_event, later date
    expect(layout.bars[2].id).toBe(3); // during_event
    expect(layout.bars[3].id).toBe(1); // post_event
  });

  it('generates date columns spanning the time range', () => {
    const tasks = [makeTask({ id: 1, dueDate: new Date('2026-04-15') })];
    const layout = computeGanttLayout(tasks, EVENT_DATE);

    expect(layout.columns.length).toBeGreaterThan(0);
    // Should have at least the event date column
    const eventCol = layout.columns.find((c) => c.isEventDate);
    expect(eventCol).toBeDefined();
  });

  it('computes event date X position', () => {
    const tasks = [makeTask({ id: 1, dueDate: new Date('2026-04-15') })];
    const layout = computeGanttLayout(tasks, EVENT_DATE);

    expect(layout.eventDateX).not.toBeNull();
    expect(layout.eventDateX).toBeGreaterThan(0);
  });

  it('generates dependency arrows', () => {
    const tasks = [
      makeTask({ id: 1, dueDate: new Date('2026-04-10') }),
      makeTask({ id: 2, dueDate: new Date('2026-04-12'), dependsOnTaskId: 1 }),
    ];
    const layout = computeGanttLayout(tasks, EVENT_DATE);

    expect(layout.arrows).toHaveLength(1);
    expect(layout.arrows[0].fromId).toBe(1);
    expect(layout.arrows[0].toId).toBe(2);
    expect(layout.arrows[0].fromX).toBeGreaterThan(0);
    expect(layout.arrows[0].toX).toBeGreaterThan(0);
  });

  it('skips arrow when dependency task is missing', () => {
    const tasks = [makeTask({ id: 2, dueDate: new Date('2026-04-12'), dependsOnTaskId: 999 })];
    const layout = computeGanttLayout(tasks, EVENT_DATE);

    expect(layout.arrows).toHaveLength(0);
  });

  it('detects critical path for chains of 2+ tasks', () => {
    const tasks = [
      makeTask({ id: 1, dueDate: new Date('2026-04-08') }),
      makeTask({ id: 2, dueDate: new Date('2026-04-10'), dependsOnTaskId: 1 }),
      makeTask({ id: 3, dueDate: new Date('2026-04-12'), dependsOnTaskId: 2 }),
      makeTask({ id: 4, dueDate: new Date('2026-04-14') }), // independent
    ];
    const layout = computeGanttLayout(tasks, EVENT_DATE);

    expect(layout.criticalPathIds.has(1)).toBe(true);
    expect(layout.criticalPathIds.has(2)).toBe(true);
    expect(layout.criticalPathIds.has(3)).toBe(true);
    expect(layout.criticalPathIds.has(4)).toBe(false);
  });

  it('does not mark critical path for single tasks', () => {
    const tasks = [makeTask({ id: 1, dueDate: new Date('2026-04-10') })];
    const layout = computeGanttLayout(tasks, EVENT_DATE);

    expect(layout.criticalPathIds.size).toBe(0);
  });

  it('marks critical path arrows', () => {
    const tasks = [
      makeTask({ id: 1, dueDate: new Date('2026-04-08') }),
      makeTask({ id: 2, dueDate: new Date('2026-04-10'), dependsOnTaskId: 1 }),
    ];
    const layout = computeGanttLayout(tasks, EVENT_DATE);

    expect(layout.arrows).toHaveLength(1);
    expect(layout.arrows[0].isCriticalPath).toBe(true);
  });

  it('calculates totalHeight based on number of tasks', () => {
    const tasks = [
      makeTask({ id: 1, dueDate: new Date('2026-04-10') }),
      makeTask({ id: 2, dueDate: new Date('2026-04-12') }),
      makeTask({ id: 3, dueDate: new Date('2026-04-14') }),
    ];
    const layout = computeGanttLayout(tasks, EVENT_DATE);

    // HEADER_HEIGHT (32) + 3 rows * ROW_HEIGHT (40)
    expect(layout.totalHeight).toBe(32 + 3 * 40);
  });

  it('preserves task metadata in bars', () => {
    const tasks = [
      makeTask({
        id: 1,
        title: 'Setup tables',
        status: 'in_progress',
        category: 'during_event',
        dueDate: new Date('2026-04-15'),
        assignee: { name: 'Alice' },
      }),
    ];
    const layout = computeGanttLayout(tasks, EVENT_DATE);

    const bar = layout.bars[0];
    expect(bar.title).toBe('Setup tables');
    expect(bar.status).toBe('in_progress');
    expect(bar.category).toBe('during_event');
    expect(bar.assigneeName).toBe('Alice');
    expect(bar.dueDate).toEqual(new Date('2026-04-15'));
  });

  it('handles mixed tasks with and without due dates', () => {
    const tasks = [
      makeTask({ id: 1, category: 'pre_event', dueDate: new Date('2026-04-10') }),
      makeTask({ id: 2, category: 'pre_event' }), // no due date
      makeTask({ id: 3, category: 'during_event', dueDate: new Date('2026-04-15') }),
    ];
    const layout = computeGanttLayout(tasks, EVENT_DATE);

    expect(layout.bars).toHaveLength(3);
    const barWithDate = layout.bars.find((b) => b.id === 1)!;
    const barWithout = layout.bars.find((b) => b.id === 2)!;
    expect(barWithDate.hasDueDate).toBe(true);
    expect(barWithout.hasDueDate).toBe(false);
  });

  it('handles circular dependency gracefully', () => {
    // Shouldn't happen in practice (router prevents it), but be safe
    const tasks = [
      makeTask({ id: 1, dueDate: new Date('2026-04-10'), dependsOnTaskId: 2 }),
      makeTask({ id: 2, dueDate: new Date('2026-04-12'), dependsOnTaskId: 1 }),
    ];
    // Should not infinite loop — visited set prevents it
    const layout = computeGanttLayout(tasks, EVENT_DATE);
    expect(layout.bars).toHaveLength(2);
    expect(layout.arrows).toHaveLength(2);
  });

  it('picks the longest chain as critical path', () => {
    // Chain A: 1 → 2 (length 2)
    // Chain B: 3 → 4 → 5 (length 3) — this should be critical
    const tasks = [
      makeTask({ id: 1, dueDate: new Date('2026-04-08') }),
      makeTask({ id: 2, dueDate: new Date('2026-04-10'), dependsOnTaskId: 1 }),
      makeTask({ id: 3, dueDate: new Date('2026-04-07') }),
      makeTask({ id: 4, dueDate: new Date('2026-04-09'), dependsOnTaskId: 3 }),
      makeTask({ id: 5, dueDate: new Date('2026-04-11'), dependsOnTaskId: 4 }),
    ];
    const layout = computeGanttLayout(tasks, EVENT_DATE);

    expect(layout.criticalPathIds.has(3)).toBe(true);
    expect(layout.criticalPathIds.has(4)).toBe(true);
    expect(layout.criticalPathIds.has(5)).toBe(true);
    expect(layout.criticalPathIds.has(1)).toBe(false);
    expect(layout.criticalPathIds.has(2)).toBe(false);
  });
});
