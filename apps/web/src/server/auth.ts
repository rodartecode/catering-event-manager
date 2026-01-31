import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { db } from '@catering-event-manager/database/client';
import { users, verificationTokens } from '@catering-event-manager/database/schema';
import { eq, and, gt } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import type { UserRole } from '@/types/next-auth';
import { rateLimitMagicLink } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

// Magic link token expiry (15 minutes)
const MAGIC_LINK_EXPIRY_MINUTES = 15;

// Generate a secure random token for magic links (Edge Runtime compatible)
export function generateMagicToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Result type for magic link creation
export interface MagicLinkResult {
  success: boolean;
  token?: string;
  error?: 'rate_limited' | 'user_not_found';
  retryAfter?: number;
}

// Create a magic link token for a user (with rate limiting)
export async function createMagicLinkToken(email: string): Promise<MagicLinkResult> {
  // Apply rate limiting for magic link requests (3/5min per email)
  const rateLimitResult = rateLimitMagicLink(email);

  if (!rateLimitResult.success) {
    logger.warn('Magic link rate limit exceeded', {
      email: `${email.substring(0, 3)}***`, // Partially masked for privacy
      reset: rateLimitResult.reset,
    });

    return {
      success: false,
      error: 'rate_limited',
      retryAfter: rateLimitResult.reset - Math.floor(Date.now() / 1000),
    };
  }

  // Verify the user exists and is a client
  const user = await db.query.users.findFirst({
    where: and(eq(users.email, email), eq(users.role, 'client'), eq(users.isActive, true)),
  });

  if (!user) {
    return { success: false, error: 'user_not_found' };
  }

  const token = generateMagicToken();
  const expires = new Date(Date.now() + MAGIC_LINK_EXPIRY_MINUTES * 60 * 1000);

  // Delete any existing tokens for this email
  await db.delete(verificationTokens).where(eq(verificationTokens.identifier, email));

  // Insert new token
  await db.insert(verificationTokens).values({
    identifier: email,
    token,
    expires,
  });

  return { success: true, token };
}

// Verify a magic link token and return the user if valid
export async function verifyMagicLinkToken(
  email: string,
  token: string
): Promise<{ id: string; email: string; name: string; role: UserRole; clientId: number | null } | null> {
  // Find the token
  const tokenRecords = await db
    .select()
    .from(verificationTokens)
    .where(
      and(
        eq(verificationTokens.identifier, email),
        eq(verificationTokens.token, token),
        gt(verificationTokens.expires, new Date())
      )
    )
    .limit(1);

  if (tokenRecords.length === 0) {
    return null;
  }

  // Delete the used token
  await db
    .delete(verificationTokens)
    .where(and(eq(verificationTokens.identifier, email), eq(verificationTokens.token, token)));

  // Get the user
  const user = await db.query.users.findFirst({
    where: and(eq(users.email, email), eq(users.role, 'client'), eq(users.isActive, true)),
  });

  if (!user) {
    return null;
  }

  return {
    id: user.id.toString(),
    email: user.email,
    name: user.name,
    role: user.role as UserRole,
    clientId: user.clientId,
  };
}

/**
 * NextAuth v5 Configuration
 *
 * CSRF Protection (SEC-004):
 * - NextAuth v5 includes built-in CSRF protection via double-submit cookie pattern
 * - All POST requests to /api/auth/* require a valid CSRF token
 * - Session cookies use SameSite=Lax, preventing cross-origin cookie submission
 * - HttpOnly flag prevents JavaScript access to session cookies
 * - Secure flag enabled in production (HTTPS only)
 *
 * Additional security measures:
 * - JWT strategy for stateless session management
 * - Session cookies are encrypted and signed
 * - Magic link tokens are single-use and time-limited (15 minutes)
 */
export const { handlers, signIn, signOut, auth } = NextAuth({
  // Cast needed to resolve version conflict between @auth/drizzle-adapter and @auth/core
  // biome-ignore lint/suspicious/noExplicitAny: DrizzleAdapter type mismatch
  adapter: DrizzleAdapter(db) as any,
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours total session lifetime
    updateAge: 4 * 60, // Refresh token every 4 minutes
  },
  providers: [
    // Staff login with username/password
    CredentialsProvider({
      id: 'credentials',
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await db.query.users.findFirst({
          where: eq(users.email, credentials.email as string),
        });

        if (!user || !user.isActive) {
          return null;
        }

        // Password is required for credential-based login (staff users)
        // Client users use magic links and don't have passwords
        if (!user.passwordHash) {
          return null;
        }

        const isValid = await bcrypt.compare(credentials.password as string, user.passwordHash);

        if (!isValid) {
          return null;
        }

        return {
          id: user.id.toString(),
          email: user.email,
          name: user.name,
          role: user.role,
          clientId: user.clientId,
        };
      },
    }),
    // Client login with magic link
    CredentialsProvider({
      id: 'magic-link',
      name: 'magic-link',
      credentials: {
        email: { label: 'Email', type: 'email' },
        token: { label: 'Token', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.token) {
          return null;
        }

        const user = await verifyMagicLinkToken(
          credentials.email as string,
          credentials.token as string
        );

        return user;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id;
        token.role = user.role as UserRole;
        token.clientId = user.clientId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
        session.user.clientId = token.clientId as number | null | undefined;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
});
