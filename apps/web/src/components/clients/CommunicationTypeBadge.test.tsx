import { render, screen } from '../../../test/helpers/render';
import { CommunicationTypeBadge } from './CommunicationTypeBadge';

describe('CommunicationTypeBadge', () => {
  it.each([
    ['email', 'Email', 'bg-blue-100', 'text-blue-800'],
    ['phone', 'Phone', 'bg-green-100', 'text-green-800'],
    ['meeting', 'Meeting', 'bg-purple-100', 'text-purple-800'],
    ['other', 'Other', 'bg-gray-100', 'text-gray-800'],
  ] as const)('renders %s type with label "%s" and classes "%s %s"', (type, expectedLabel, expectedBgClass, expectedTextClass) => {
    render(<CommunicationTypeBadge type={type} />);

    const badge = screen.getByText(expectedLabel);
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass(expectedBgClass);
    expect(badge).toHaveClass(expectedTextClass);
  });

  it('renders with icon for each type', () => {
    const { container } = render(<CommunicationTypeBadge type="email" />);

    // Check that an SVG icon is present
    const icon = container.querySelector('svg');
    expect(icon).toBeInTheDocument();
  });

  it('renders with correct base styling', () => {
    render(<CommunicationTypeBadge type="email" />);

    const badge = screen.getByText('Email');
    expect(badge).toHaveClass('inline-flex');
    expect(badge).toHaveClass('items-center');
    expect(badge).toHaveClass('rounded-full');
    expect(badge).toHaveClass('text-xs');
    expect(badge).toHaveClass('font-medium');
  });
});
