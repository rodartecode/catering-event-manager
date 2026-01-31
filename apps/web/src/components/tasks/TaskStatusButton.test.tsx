import { render, screen } from '../../../test/helpers/render';
import { TaskStatusButton } from './TaskStatusButton';

describe('TaskStatusButton', () => {
  it('renders Start button for pending status', () => {
    render(<TaskStatusButton taskId={1} currentStatus="pending" />);

    const button = screen.getByRole('button', { name: 'Start' });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('bg-blue-600', 'hover:bg-blue-700', 'text-white');
  });

  it('renders Complete button for in_progress status', () => {
    render(<TaskStatusButton taskId={1} currentStatus="in_progress" />);

    const button = screen.getByRole('button', { name: 'Complete' });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('bg-green-600', 'hover:bg-green-700', 'text-white');
  });

  it('renders Reopen button for completed status', () => {
    render(<TaskStatusButton taskId={1} currentStatus="completed" />);

    const button = screen.getByRole('button', { name: 'Reopen' });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('bg-gray-600', 'hover:bg-gray-700', 'text-white');
  });

  it('renders button with correct base styling', () => {
    render(<TaskStatusButton taskId={1} currentStatus="pending" />);

    const button = screen.getByRole('button', { name: 'Start' });
    expect(button).toHaveClass('px-3', 'py-1', 'text-sm', 'font-medium', 'rounded', 'transition');
  });

  it('does not show error message initially', () => {
    render(<TaskStatusButton taskId={1} currentStatus="pending" />);

    expect(screen.queryByText(/failed/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
  });

  it('renders button without onStatusChange callback', () => {
    // Should not throw when onStatusChange is not provided
    render(<TaskStatusButton taskId={1} currentStatus="pending" />);

    expect(screen.getByRole('button', { name: 'Start' })).toBeInTheDocument();
  });
});