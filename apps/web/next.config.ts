import type { NextConfig } from 'next';

/**
 * Content Security Policy (CSP) directives (SEC-005)
 *
 * This CSP is configured for Next.js + Tailwind CSS compatibility.
 * 'unsafe-inline' is required because:
 * - Next.js injects inline scripts for hydration and page transitions
 * - Tailwind generates inline styles for utility classes
 *
 * Environment-based security:
 * - Development: 'unsafe-eval' is allowed for Next.js HMR (hot module replacement)
 * - Production: 'unsafe-eval' is removed for stricter XSS protection
 *
 * Future enhancement: Implement nonce-based CSP via middleware for stricter security
 */
const isDev = process.env.NODE_ENV === 'development';

// Parse allowed origins from environment (comma-separated list)
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',').map((o) => o.trim()) || [];

// Build script-src based on environment
const scriptSrc = isDev
  ? ["'self'", "'unsafe-inline'", "'unsafe-eval'"] // Dev: allow eval for HMR
  : ["'self'", "'unsafe-inline'"]; // Prod: no eval for security

// Build connect-src with scheduling service and any additional allowed origins
const connectSrc = [
  "'self'",
  process.env.SCHEDULING_SERVICE_URL || 'http://localhost:8080',
  ...allowedOrigins,
];

const cspDirectives = {
  'default-src': ["'self'"],
  'script-src': scriptSrc,
  'style-src': ["'self'", "'unsafe-inline'"], // Required for Tailwind CSS
  'img-src': ["'self'", 'data:', 'blob:'],
  'font-src': ["'self'"],
  'connect-src': connectSrc,
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
