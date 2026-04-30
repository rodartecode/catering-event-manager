# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability, please **do not open a public issue**. Instead, report it privately:

- **Preferred**: [Open a GitHub Security Advisory](https://github.com/rodartecode/catering-event-manager/security/advisories/new) — this keeps the report private until a fix is published.
- **Alternative**: email `jerodarte@gmail.com` with subject `[security] catering-event-manager: <short description>`.

Please include:

- A description of the vulnerability and its impact
- Steps to reproduce (proof-of-concept code, screenshots, or HTTP requests)
- Affected versions / commit SHAs if known
- Any suggested mitigation

You'll get an acknowledgment within **3 business days** and a status update within **7 days**. Coordinated disclosure is appreciated — please give a reasonable window for a fix to ship before public disclosure.

## Scope

In scope:

- The Next.js web app (`apps/web/`)
- The Go scheduling service (`apps/scheduling-service/`)
- Database schemas, migrations, and RLS policies in `packages/database/`
- Authentication, authorization, session handling
- The public demo deployment at `catering-event-manager.vercel.app`

Out of scope:

- Findings in third-party dependencies (please report upstream)
- Issues that require physical access or compromised developer machines
- Rate-limit bypasses on the demo deployment (it is intentionally lenient)
- Self-XSS that requires the user to paste attacker-controlled content into devtools

## Security Posture

This project is a personal portfolio piece, not a production deployment for a paying customer. That said, the following hardening is in place:

- Row Level Security on all 30 database tables
- CSRF protection (Next-Auth v5 double-submit cookies)
- CSP, X-Frame-Options, Permissions-Policy, and HSTS headers
- Rate limiting on auth endpoints and tRPC mutations (Upstash Redis in production, in-memory fallback locally)
- Secrets via environment variables only — no committed credentials
- Drizzle / SQLC for parameterized queries (no string concatenation)
- Zod input validation on every tRPC procedure

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for production deployment hardening details.
