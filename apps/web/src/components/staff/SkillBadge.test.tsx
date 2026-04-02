import { render, screen } from '../../../test/helpers/render';
import { SkillBadge } from './SkillBadge';

describe('SkillBadge', () => {
  it.each([
    ['food_safety_cert', 'Food Safety', 'bg-green-100'],
    ['bartender', 'Bartender', 'bg-purple-100'],
    ['sommelier', 'Sommelier', 'bg-red-100'],
    ['lead_chef', 'Lead Chef', 'bg-orange-100'],
    ['sous_chef', 'Sous Chef', 'bg-amber-100'],
    ['prep_cook', 'Prep Cook', 'bg-yellow-100'],
    ['pastry_chef', 'Pastry Chef', 'bg-pink-100'],
    ['server', 'Server', 'bg-blue-100'],
    ['event_coordinator', 'Event Coordinator', 'bg-indigo-100'],
    ['barista', 'Barista', 'bg-teal-100'],
  ] as const)('renders %s skill with label "%s" and class "%s"', (skill, expectedLabel, expectedClass) => {
    render(<SkillBadge skill={skill} />);

    const badge = screen.getByText(expectedLabel);
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass(expectedClass);
  });

  it('falls back to formatted skill name for unknown skills', () => {
    render(<SkillBadge skill="knife_skills" />);

    const badge = screen.getByText('knife skills');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('bg-gray-100');
    expect(badge).toHaveClass('text-gray-800');
  });

  it('renders with correct base styling', () => {
    render(<SkillBadge skill="bartender" />);

    const badge = screen.getByText('Bartender');
    expect(badge).toHaveClass('inline-flex');
    expect(badge).toHaveClass('items-center');
    expect(badge).toHaveClass('rounded-full');
    expect(badge).toHaveClass('text-xs');
    expect(badge).toHaveClass('font-medium');
  });
});
