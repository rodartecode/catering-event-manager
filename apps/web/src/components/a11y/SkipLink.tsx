'use client';

/**
 * Skip Link component for keyboard accessibility.
 * Allows keyboard users to skip repetitive navigation and jump to main content.
 * Visible only when focused, positioned at top of page.
 */

interface SkipLinkProps {
  /** Target element ID (without #). Defaults to 'main-content' */
  targetId?: string;
  /** Link text. Defaults to 'Skip to main content' */
  children?: React.ReactNode;
}

export function SkipLink({
  targetId = 'main-content',
  children = 'Skip to main content',
}: SkipLinkProps) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const target = document.getElementById(targetId);
    if (target) {
      // Set tabindex to make element focusable if not already
      if (!target.hasAttribute('tabindex')) {
        target.setAttribute('tabindex', '-1');
      }
      target.focus();
      // Scroll into view for visual users
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <a
      href={`#${targetId}`}
      onClick={handleClick}
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-lg focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
    >
      {children}
    </a>
  );
}
