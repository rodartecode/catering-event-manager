import { auth } from '@/server/auth';

export async function requireAuth() {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }
  return session;
}

export async function requireAdmin() {
  const session = await requireAuth();
  if (session.user.role !== 'administrator') {
    throw new Error('Forbidden: Administrator access required');
  }
  return session;
}

export function isAdministrator(role: string): boolean {
  return role === 'administrator';
}

export function isManager(role: string): boolean {
  return role === 'manager';
}
