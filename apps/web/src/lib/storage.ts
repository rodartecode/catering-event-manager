import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Server-only — do not import from client components
// Lazy-initialized to avoid throwing at build time when env vars aren't set
let _storageClient: SupabaseClient | null = null;
let _initialized = false;

export function getStorageClient(): SupabaseClient | null {
  if (!_initialized) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    _storageClient =
      supabaseUrl && supabaseServiceKey
        ? createClient(supabaseUrl, supabaseServiceKey, {
            auth: { persistSession: false },
          })
        : null;
    _initialized = true;
  }
  return _storageClient;
}

export const DOCUMENTS_BUCKET = 'event-documents';

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
] as const;
