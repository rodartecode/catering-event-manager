'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Suspense, useEffect, useState } from 'react';
import { z } from 'zod';
import { trpc } from '@/lib/trpc';

const emailSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

function PortalLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get('token');
  const emailFromUrl = searchParams.get('email');

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const requestMagicLink = trpc.portal.requestMagicLink.useMutation({
    onSuccess: () => {
      setEmailSent(true);
    },
    onError: () => {
      setError('Something went wrong. Please try again.');
    },
  });

  // Handle magic link verification from URL
  useEffect(() => {
    if (tokenFromUrl && emailFromUrl) {
      setIsVerifying(true);
      signIn('magic-link', {
        email: emailFromUrl,
        token: tokenFromUrl,
        redirect: false,
      }).then((result) => {
        if (result?.error) {
          setError('Invalid or expired login link. Please request a new one.');
          setIsVerifying(false);
        } else {
          router.push('/portal');
          router.refresh();
        }
      });
    }
  }, [tokenFromUrl, emailFromUrl, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const validated = emailSchema.parse({ email });
      requestMagicLink.mutate({ email: validated.email });
    } catch (err) {
      if (err instanceof z.ZodError) {
        setError(err.issues[0]?.message || 'Invalid email');
      }
    }
  };

  // Show loading state while verifying token
  if (isVerifying) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Verifying your login link...</p>
        </div>
      </div>
    );
  }

  // Show success state after email sent
  if (emailSent) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Check your email</h2>
          <p className="text-gray-600 mb-6">
            We&apos;ve sent a login link to <strong>{email}</strong>. Click the link in the email to
            sign in to your portal.
          </p>
          <p className="text-sm text-gray-500">
            Didn&apos;t receive the email? Check your spam folder or{' '}
            <button
              type="button"
              onClick={() => setEmailSent(false)}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              try again
            </button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Client Portal</h1>
          <p className="mt-2 text-gray-600">Enter your email to receive a secure login link</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError('');
              }}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                error ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="you@company.com"
            />
            {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
          </div>

          <button
            type="submit"
            disabled={requestMagicLink.isPending}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {requestMagicLink.isPending ? 'Sending...' : 'Send Login Link'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Only clients with portal access enabled can sign in. Contact us if you need help accessing
          your account.
        </p>
      </div>
    </div>
  );
}

export default function PortalLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      }
    >
      <PortalLoginForm />
    </Suspense>
  );
}
