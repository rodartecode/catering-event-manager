/**
 * Server-side CSV generation, parsing, and import validation utilities.
 * RFC 4180 compliant.
 */

import type { z } from 'zod';

type CSVValue = string | number | boolean | Date | null | undefined;

/**
 * Escape a value for CSV output per RFC 4180.
 */
function escapeCSVValue(value: CSVValue): string {
  if (value === null || value === undefined) {
    return '';
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  const stringValue = String(value);

  if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

/**
 * Generate a CSV string from headers and rows.
 */
export function generateCSV(headers: string[], rows: CSVValue[][]): string {
  const lines = [
    headers.map(escapeCSVValue).join(','),
    ...rows.map((row) => row.map(escapeCSVValue).join(',')),
  ];
  return lines.join('\n');
}

/**
 * Parse a raw CSV string into headers and rows.
 * Handles quoted fields with embedded commas, newlines, and escaped quotes.
 */
export function parseCSV(raw: string): { headers: string[]; rows: string[][] } {
  // Strip BOM if present
  const cleaned = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;

  const records = parseCSVRecords(cleaned);
  if (records.length === 0) {
    return { headers: [], rows: [] };
  }

  return {
    headers: records[0],
    rows: records.slice(1),
  };
}

/**
 * Parse CSV text into an array of string arrays (records).
 * Handles RFC 4180 quoting rules.
 */
function parseCSVRecords(text: string): string[][] {
  const records: string[][] = [];
  let current: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < text.length && text[i + 1] === '"') {
          // Escaped quote
          field += '"';
          i += 2;
        } else {
          // End of quoted field
          inQuotes = false;
          i++;
        }
      } else {
        field += char;
        i++;
      }
    } else {
      if (char === '"' && field.length === 0) {
        // Start of quoted field
        inQuotes = true;
        i++;
      } else if (char === ',') {
        current.push(field);
        field = '';
        i++;
      } else if (char === '\r' && i + 1 < text.length && text[i + 1] === '\n') {
        current.push(field);
        field = '';
        records.push(current);
        current = [];
        i += 2;
      } else if (char === '\n') {
        current.push(field);
        field = '';
        records.push(current);
        current = [];
        i++;
      } else {
        field += char;
        i++;
      }
    }
  }

  // Handle last field/record
  if (field.length > 0 || current.length > 0) {
    current.push(field);
    records.push(current);
  }

  return records;
}

export interface ImportError {
  row: number;
  field: string;
  message: string;
}

/**
 * Validate import rows against a Zod schema with field mapping.
 * fieldMapping maps header names to row indices.
 */
export function validateImportRows<T>(
  rows: string[][],
  schema: z.ZodType<T>,
  fieldMapping: Record<string, number>
): { valid: { data: T; rowIndex: number }[]; errors: ImportError[] } {
  const valid: { data: T; rowIndex: number }[] = [];
  const errors: ImportError[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // 1-indexed, +1 for header

    // Build object from row using field mapping
    const obj: Record<string, string> = {};
    for (const [field, index] of Object.entries(fieldMapping)) {
      obj[field] = row[index]?.trim() ?? '';
    }

    const result = schema.safeParse(obj);
    if (result.success) {
      valid.push({ data: result.data, rowIndex: rowNum });
    } else {
      for (const issue of result.error.issues) {
        errors.push({
          row: rowNum,
          field: issue.path.join('.') || 'unknown',
          message: issue.message,
        });
      }
    }
  }

  return { valid, errors };
}

/**
 * Build a field mapping from CSV headers to expected column names.
 * Returns null with errors if required headers are missing.
 */
export function buildFieldMapping(
  headers: string[],
  requiredFields: string[],
  optionalFields: string[]
): { mapping: Record<string, number> | null; errors: string[] } {
  const normalized = headers.map((h) => h.trim().toLowerCase());
  const mapping: Record<string, number> = {};
  const errors: string[] = [];

  for (const field of requiredFields) {
    const index = normalized.indexOf(field.toLowerCase());
    if (index === -1) {
      errors.push(`Missing required column: ${field}`);
    } else {
      mapping[field] = index;
    }
  }

  for (const field of optionalFields) {
    const index = normalized.indexOf(field.toLowerCase());
    if (index !== -1) {
      mapping[field] = index;
    }
  }

  return { mapping: errors.length > 0 ? null : mapping, errors };
}
