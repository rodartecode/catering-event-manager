import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SkipLink } from './SkipLink';

describe('SkipLink', () => {
  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = '';
    // Mock scrollIntoView as it's not implemented in jsdom
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('renders with default text', () => {
    render(<SkipLink />);
    expect(screen.getByText('Skip to main content')).toBeInTheDocument();
  });

  it('renders with custom text', () => {
    render(<SkipLink>Skip to navigation</SkipLink>);
    expect(screen.getByText('Skip to navigation')).toBeInTheDocument();
  });

  it('has correct href for default target', () => {
    render(<SkipLink />);
    const link = screen.getByRole('link', { name: 'Skip to main content' });
    expect(link).toHaveAttribute('href', '#main-content');
  });

  it('has correct href for custom target', () => {
    render(<SkipLink targetId="nav-section" />);
    const link = screen.getByRole('link', { name: 'Skip to main content' });
    expect(link).toHaveAttribute('href', '#nav-section');
  });

  it('is visually hidden by default (has sr-only class)', () => {
    render(<SkipLink />);
    const link = screen.getByRole('link', { name: 'Skip to main content' });
    expect(link).toHaveClass('sr-only');
  });

  it('focuses target element on click', async () => {
    const user = userEvent.setup();

    // Create target element in document body
    const target = document.createElement('main');
    target.id = 'main-content';
    document.body.appendChild(target);

    render(<SkipLink />);
    const link = screen.getByRole('link', { name: 'Skip to main content' });

    await user.click(link);

    expect(target).toHaveFocus();
    expect(target).toHaveAttribute('tabindex', '-1');
  });

  it('adds tabindex to target if not present', async () => {
    const user = userEvent.setup();

    const target = document.createElement('main');
    target.id = 'main-content';
    document.body.appendChild(target);

    render(<SkipLink />);
    const link = screen.getByRole('link', { name: 'Skip to main content' });

    expect(target).not.toHaveAttribute('tabindex');

    await user.click(link);

    expect(target).toHaveAttribute('tabindex', '-1');
  });

  it('preserves existing tabindex on target', async () => {
    const user = userEvent.setup();

    const target = document.createElement('main');
    target.id = 'main-content';
    target.setAttribute('tabindex', '0');
    document.body.appendChild(target);

    render(<SkipLink />);
    const link = screen.getByRole('link', { name: 'Skip to main content' });

    await user.click(link);

    expect(target).toHaveAttribute('tabindex', '0');
  });

  it('calls scrollIntoView on target', async () => {
    const user = userEvent.setup();

    const target = document.createElement('main');
    target.id = 'main-content';
    target.scrollIntoView = vi.fn();
    document.body.appendChild(target);

    render(<SkipLink />);
    const link = screen.getByRole('link', { name: 'Skip to main content' });

    await user.click(link);

    expect(target.scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'start',
    });
  });

  it('handles missing target gracefully', async () => {
    const user = userEvent.setup();

    render(<SkipLink targetId="nonexistent" />);
    const link = screen.getByRole('link', { name: 'Skip to main content' });

    // Should not throw
    await expect(user.click(link)).resolves.not.toThrow();
  });
});
