import type { GanttArrow, GanttBar as GanttBarType } from '@/lib/gantt-layout';
import { render, screen } from '../../../test/helpers/render';
import { GanttBar } from './GanttBar';
import { GanttDependencyArrows } from './GanttDependencyArrows';

function makeBar(overrides: Partial<GanttBarType> & { id: number }): GanttBarType {
  return {
    title: `Task ${overrides.id}`,
    status: 'pending',
    category: 'pre_event',
    left: 100,
    width: 80,
    row: 0,
    hasDueDate: true,
    isCriticalPath: false,
    assigneeName: null,
    dueDate: new Date('2026-04-10'),
    ...overrides,
  };
}

describe('GanttBar', () => {
  it('renders task title', () => {
    const bar = makeBar({ id: 1, title: 'Setup tables' });
    render(<GanttBar bar={bar} onClick={() => {}} />);

    expect(screen.getByText('Setup tables')).toBeInTheDocument();
  });

  it('applies pending status colors', () => {
    const bar = makeBar({ id: 1, status: 'pending' });
    render(<GanttBar bar={bar} onClick={() => {}} />);

    const el = screen.getByRole('button');
    expect(el.className).toContain('bg-gray-200');
    expect(el.className).toContain('border-gray-400');
  });

  it('applies in_progress status colors', () => {
    const bar = makeBar({ id: 1, status: 'in_progress' });
    render(<GanttBar bar={bar} onClick={() => {}} />);

    const el = screen.getByRole('button');
    expect(el.className).toContain('bg-blue-200');
    expect(el.className).toContain('border-blue-500');
  });

  it('applies completed status colors', () => {
    const bar = makeBar({ id: 1, status: 'completed' });
    render(<GanttBar bar={bar} onClick={() => {}} />);

    const el = screen.getByRole('button');
    expect(el.className).toContain('bg-green-200');
    expect(el.className).toContain('border-green-500');
  });

  it('highlights critical path bars', () => {
    const bar = makeBar({ id: 1, isCriticalPath: true });
    render(<GanttBar bar={bar} onClick={() => {}} />);

    const el = screen.getByRole('button');
    expect(el.className).toContain('ring-amber-400');
  });

  it('applies dashed border for tasks without due date', () => {
    const bar = makeBar({ id: 1, hasDueDate: false });
    render(<GanttBar bar={bar} onClick={() => {}} />);

    const el = screen.getByRole('button');
    expect(el.className).toContain('border-dashed');
  });

  it('does not apply dashed border for tasks with due date', () => {
    const bar = makeBar({ id: 1, hasDueDate: true });
    render(<GanttBar bar={bar} onClick={() => {}} />);

    const el = screen.getByRole('button');
    expect(el.className).not.toContain('border-dashed');
  });

  it('calls onClick when clicked', async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    const onClick = vi.fn();
    const bar = makeBar({ id: 42 });
    render(<GanttBar bar={bar} onClick={onClick} />);

    await user.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledWith(42);
  });

  it('calls onClick on Enter key', async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    const onClick = vi.fn();
    const bar = makeBar({ id: 7 });
    render(<GanttBar bar={bar} onClick={onClick} />);

    screen.getByRole('button').focus();
    await user.keyboard('{Enter}');
    expect(onClick).toHaveBeenCalledWith(7);
  });

  it('has accessible aria-label with task info', () => {
    const bar = makeBar({
      id: 1,
      title: 'Prep food',
      status: 'in_progress',
      dueDate: new Date('2026-04-10'),
    });
    render(<GanttBar bar={bar} onClick={() => {}} />);

    const el = screen.getByRole('button');
    expect(el.getAttribute('aria-label')).toContain('Task: Prep food');
    expect(el.getAttribute('aria-label')).toContain('Status: In Progress');
  });

  it('shows "No date" in aria-label when due date is null', () => {
    const bar = makeBar({ id: 1, hasDueDate: false, dueDate: null });
    render(<GanttBar bar={bar} onClick={() => {}} />);

    const el = screen.getByRole('button');
    expect(el.getAttribute('aria-label')).toContain('No date');
  });

  it('positions bar using inline styles', () => {
    const bar = makeBar({ id: 1, left: 200, width: 100, row: 2 });
    render(<GanttBar bar={bar} onClick={() => {}} />);

    const el = screen.getByRole('button');
    expect(el.style.left).toBe('200px');
    expect(el.style.width).toBe('100px');
  });
});

describe('GanttDependencyArrows', () => {
  it('renders nothing when no arrows', () => {
    const { container } = render(<GanttDependencyArrows arrows={[]} width={500} height={200} />);
    expect(container.querySelector('svg')).toBeNull();
  });

  it('renders SVG with arrows', () => {
    const arrows: GanttArrow[] = [
      {
        fromId: 1,
        toId: 2,
        fromX: 100,
        fromY: 50,
        toX: 200,
        toY: 90,
        isCriticalPath: false,
      },
    ];
    const { container } = render(
      <GanttDependencyArrows arrows={arrows} width={500} height={200} />
    );

    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute('aria-hidden')).toBe('true');

    const paths = container.querySelectorAll('path');
    expect(paths).toHaveLength(1);
  });

  it('applies critical path styling to arrows', () => {
    const arrows: GanttArrow[] = [
      {
        fromId: 1,
        toId: 2,
        fromX: 100,
        fromY: 50,
        toX: 200,
        toY: 90,
        isCriticalPath: true,
      },
    ];
    const { container } = render(
      <GanttDependencyArrows arrows={arrows} width={500} height={200} />
    );

    const path = container.querySelector('path');
    expect(path?.classList.contains('stroke-amber-500')).toBe(true);
  });

  it('renders multiple arrows', () => {
    const arrows: GanttArrow[] = [
      { fromId: 1, toId: 2, fromX: 100, fromY: 50, toX: 200, toY: 90, isCriticalPath: false },
      { fromId: 2, toId: 3, fromX: 200, fromY: 90, toX: 300, toY: 130, isCriticalPath: true },
    ];
    const { container } = render(
      <GanttDependencyArrows arrows={arrows} width={500} height={200} />
    );

    const paths = container.querySelectorAll('path');
    expect(paths).toHaveLength(2);
  });

  it('has pointer-events-none to allow clicks through', () => {
    const arrows: GanttArrow[] = [
      { fromId: 1, toId: 2, fromX: 100, fromY: 50, toX: 200, toY: 90, isCriticalPath: false },
    ];
    const { container } = render(
      <GanttDependencyArrows arrows={arrows} width={500} height={200} />
    );

    const svg = container.querySelector('svg');
    expect(svg?.classList.contains('pointer-events-none')).toBe(true);
  });
});
