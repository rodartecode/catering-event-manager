import type { z } from 'zod';

/**
 * Formats Zod validation errors into a simple field-to-message mapping.
 * Extracts the first path segment as the field name.
 *
 * @param error - The ZodError from a failed validation
 * @returns A record mapping field names to error messages
 */
export function formatZodErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  error.issues.forEach((err) => {
    if (err.path[0]) {
      fieldErrors[err.path[0] as string] = err.message;
    }
  });
  return fieldErrors;
}
