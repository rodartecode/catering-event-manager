import type { NextConfig } from 'next';

/**
 * Content Security Policy (CSP) directives (SEC-005)
 *
 * This CSP is configured for Next.js + Tailwind CSS compatibility.
 * 'unsafe-inline' is required because:
 * - Next.js injects inline scripts for hydration and page transitions
 * - Tailwind generates inline styles for utility classes
 *
 * Future enhancement: Implement nonce-based CSP via middleware for stricter security
 */
const cspDirectives = {
  'default-src': ["'self'"],
  'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // unsafe-eval needed for Next.js dev mode
  'style-src': ["'self'", "'unsafe-inline'"], // Required for Tailwind CSS
  'img-src': ["'self'", 'data:', 'blob:'],
  'font-src': ["'self'"],
  'connect-src': ["'self'", 'http://localhost:8080'], // Go scheduling service
  'frame-ancestors': ["'none'"], // Equivalent to X-Frame-Options: DENY
  'form-action': ["'self'"],
  'base-uri': ["'self'"],
  'object-src': ["'none'"],
  'upgrade-insecure-requests': [],
};

// Build CSP header value from directives
const cspHeader = Object.entries(cspDirectives)
  .map(([directive, values]) => {
    if (values.length === 0) return directive;
    return `${directive} ${values.join(' ')}`;
  })
  .join('; ');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  transpilePackages: ['@catering-event-manager/database', '@catering-event-manager/types'],
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // CSP Header (SEC-005) - Primary XSS protection
          {
            key: 'Content-Security-Policy',
            value: cspHeader,
          },
          // Clickjacking protection (SEC-006)
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          // MIME sniffing prevention (SEC-006)
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          // Referrer information protection (SEC-006)
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // Feature policy restrictions
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
