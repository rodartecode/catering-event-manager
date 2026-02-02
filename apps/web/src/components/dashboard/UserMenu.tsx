'use client';

import { signOut, useSession } from 'next-auth/react';
import { useCallback, useEffect, useRef, useState } from 'react';

export function UserMenu() {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const signOutRef = useRef<HTMLButtonElement>(null);
  const menuId = 'user-menu-dropdown';

  const closeMenu = useCallback(() => {
    setIsOpen(false);
    // Return focus to trigger button
    triggerRef.current?.focus();
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus first menu item when opening
  useEffect(() => {
    if (isOpen) {
      signOutRef.current?.focus();
    }
  }, [isOpen]);

  // Handle keyboard navigation
  const handleTriggerKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
      case 'ArrowUp':
      case ' ':
        e.preventDefault();
        setIsOpen(true);
        break;
      case 'Escape':
        if (isOpen) {
          e.preventDefault();
          closeMenu();
        }
        break;
    }
  };

  const handleMenuKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        closeMenu();
        break;
      case 'Tab':
        // Close menu on tab out
        closeMenu();
        break;
      case 'ArrowUp':
        e.preventDefault();
        // Only one menu item currently, but structured for expansion
        signOutRef.current?.focus();
        break;
      case 'ArrowDown':
        e.preventDefault();
        signOutRef.current?.focus();
        break;
    }
  };

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  if (!session?.user) {
    return null;
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        ref={triggerRef}
        data-testid="user-menu"
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleTriggerKeyDown}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-controls={isOpen ? menuId : undefined}
        className="flex items-center gap-3 w-full px-2 py-2 rounded-lg hover:bg-gray-800 transition"
      >
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-600 text-white font-medium">
          {session.user.name?.[0]?.toUpperCase() || session.user.email?.[0]?.toUpperCase() || 'U'}
        </div>
        <div className="flex-1 text-left overflow-hidden">
          <p className="text-sm font-medium truncate">{session.user.name}</p>
          <p className="text-xs text-gray-400 truncate">{session.user.email}</p>
        </div>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div
          id={menuId}
          role="menu"
          aria-label="User menu"
          onKeyDown={handleMenuKeyDown}
          className="absolute bottom-full left-0 right-0 mb-2 bg-gray-800 rounded-lg shadow-lg overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-gray-700" role="presentation">
            <p className="text-xs text-gray-400 uppercase">Role</p>
            <p className="text-sm font-medium capitalize">{session.user.role}</p>
          </div>
          <button
            ref={signOutRef}
            role="menuitem"
            onClick={handleSignOut}
            className="flex items-center gap-2 w-full px-4 py-3 text-left text-red-400 hover:bg-gray-700 focus:bg-gray-700 focus:outline-none transition"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
