import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserMenu } from './UserMenu';

// Mock next-auth
const mockSignOut = vi.fn();
vi.mock('next-auth/react', () => ({
  signOut: (options: unknown) => mockSignOut(options),
  useSession: () => ({
    data: {
      user: {
        name: 'John Doe',
        email: 'john@example.com',
        role: 'administrator',
      },
    },
    status: 'authenticated',
  }),
}));

describe('UserMenu', () => {
  beforeEach(() => {
    mockSignOut.mockClear();
  });

  describe('accessibility attributes', () => {
    it('has aria-expanded false when closed', () => {
      render(<UserMenu />);
      const trigger = screen.getByTestId('user-menu');
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
    });

    it('has aria-expanded true when open', async () => {
      const user = userEvent.setup();
      render(<UserMenu />);
      const trigger = screen.getByTestId('user-menu');

      await user.click(trigger);

      expect(trigger).toHaveAttribute('aria-expanded', 'true');
    });

    it('has aria-haspopup="menu"', () => {
      render(<UserMenu />);
      const trigger = screen.getByTestId('user-menu');
      expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    });

    it('menu has role="menu"', async () => {
      const user = userEvent.setup();
      render(<UserMenu />);

      await user.click(screen.getByTestId('user-menu'));

      expect(screen.getByRole('menu')).toBeInTheDocument();
    });

    it('menu item has role="menuitem"', async () => {
      const user = userEvent.setup();
      render(<UserMenu />);

      await user.click(screen.getByTestId('user-menu'));

      expect(screen.getByRole('menuitem', { name: /sign out/i })).toBeInTheDocument();
    });
  });

  describe('keyboard navigation', () => {
    it('opens menu on ArrowDown key', async () => {
      const user = userEvent.setup();
      render(<UserMenu />);
      const trigger = screen.getByTestId('user-menu');

      trigger.focus();
      await user.keyboard('{ArrowDown}');

      expect(screen.getByRole('menu')).toBeInTheDocument();
    });

    it('opens menu on ArrowUp key', async () => {
      const user = userEvent.setup();
      render(<UserMenu />);
      const trigger = screen.getByTestId('user-menu');

      trigger.focus();
      await user.keyboard('{ArrowUp}');

      expect(screen.getByRole('menu')).toBeInTheDocument();
    });

    it('opens menu on Space key', async () => {
      const user = userEvent.setup();
      render(<UserMenu />);
      const trigger = screen.getByTestId('user-menu');

      trigger.focus();
      await user.keyboard(' ');

      expect(screen.getByRole('menu')).toBeInTheDocument();
    });

    it('closes menu on Escape key', async () => {
      const user = userEvent.setup();
      render(<UserMenu />);

      await user.click(screen.getByTestId('user-menu'));
      expect(screen.getByRole('menu')).toBeInTheDocument();

      await user.keyboard('{Escape}');

      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    it('returns focus to trigger when closing with Escape', async () => {
      const user = userEvent.setup();
      render(<UserMenu />);
      const trigger = screen.getByTestId('user-menu');

      await user.click(trigger);
      await user.keyboard('{Escape}');

      expect(trigger).toHaveFocus();
    });

    it('focuses sign out button when menu opens', async () => {
      const user = userEvent.setup();
      render(<UserMenu />);

      await user.click(screen.getByTestId('user-menu'));

      await waitFor(() => {
        expect(screen.getByRole('menuitem', { name: /sign out/i })).toHaveFocus();
      });
    });

    it('closes menu on Tab key', async () => {
      const user = userEvent.setup();
      render(<UserMenu />);

      await user.click(screen.getByTestId('user-menu'));
      expect(screen.getByRole('menu')).toBeInTheDocument();

      await user.keyboard('{Tab}');

      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });
  });

  describe('click interactions', () => {
    it('toggles menu on click', async () => {
      const user = userEvent.setup();
      render(<UserMenu />);
      const trigger = screen.getByTestId('user-menu');

      await user.click(trigger);
      expect(screen.getByRole('menu')).toBeInTheDocument();

      await user.click(trigger);
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    it('closes menu when clicking outside', async () => {
      const user = userEvent.setup();
      render(
        <div>
          <UserMenu />
          <button data-testid="outside">Outside</button>
        </div>
      );

      await user.click(screen.getByTestId('user-menu'));
      expect(screen.getByRole('menu')).toBeInTheDocument();

      await user.click(screen.getByTestId('outside'));
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    it('calls signOut on sign out button click', async () => {
      const user = userEvent.setup();
      render(<UserMenu />);

      await user.click(screen.getByTestId('user-menu'));
      await user.click(screen.getByRole('menuitem', { name: /sign out/i }));

      expect(mockSignOut).toHaveBeenCalledWith({ callbackUrl: '/login' });
    });
  });

  describe('user display', () => {
    it('displays user name', () => {
      render(<UserMenu />);
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('displays user email', () => {
      render(<UserMenu />);
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
    });

    it('displays user initial in avatar', () => {
      render(<UserMenu />);
      expect(screen.getByText('J')).toBeInTheDocument();
    });

    it('displays user role when menu is open', async () => {
      const user = userEvent.setup();
      render(<UserMenu />);

      await user.click(screen.getByTestId('user-menu'));

      expect(screen.getByText('administrator')).toBeInTheDocument();
    });
  });
});
