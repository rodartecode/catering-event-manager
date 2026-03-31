import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { buildFieldMapping, generateCSV, parseCSV, validateImportRows } from './csv';

describe('generateCSV', () => {
  it('generates a simple CSV', () => {
    const result = generateCSV(
      ['Name', 'Age'],
      [
        ['Alice', 30],
        ['Bob', 25],
      ]
    );
    expect(result).toBe('Name,Age\nAlice,30\nBob,25');
  });

  it('escapes values with commas', () => {
    const result = generateCSV(['Name'], [['Smith, John']]);
    expect(result).toBe('Name\n"Smith, John"');
  });

  it('escapes values with quotes', () => {
    const result = generateCSV(['Name'], [['She said "hello"']]);
    expect(result).toBe('Name\n"She said ""hello"""');
  });

  it('escapes values with newlines', () => {
    const result = generateCSV(['Notes'], [['Line 1\nLine 2']]);
    expect(result).toBe('Notes\n"Line 1\nLine 2"');
  });

  it('handles null and undefined values', () => {
    const result = generateCSV(['A', 'B'], [[null, undefined]]);
    expect(result).toBe('A,B\n,');
  });

  it('handles Date values', () => {
    const date = new Date('2026-01-15T00:00:00.000Z');
    const result = generateCSV(['Date'], [[date]]);
    expect(result).toBe('Date\n2026-01-15T00:00:00.000Z');
  });

  it('handles boolean values', () => {
    const result = generateCSV(['Active'], [[true]]);
    expect(result).toBe('Active\ntrue');
  });

  it('handles empty rows', () => {
    const result = generateCSV(['A'], []);
    expect(result).toBe('A');
  });
});

describe('parseCSV', () => {
  it('parses a simple CSV', () => {
    const result = parseCSV('Name,Age\nAlice,30\nBob,25');
    expect(result.headers).toEqual(['Name', 'Age']);
    expect(result.rows).toEqual([
      ['Alice', '30'],
      ['Bob', '25'],
    ]);
  });

  it('handles quoted fields', () => {
    const result = parseCSV('Name\n"Smith, John"');
    expect(result.rows).toEqual([['Smith, John']]);
  });

  it('handles escaped quotes in fields', () => {
    const result = parseCSV('Name\n"She said ""hello"""');
    expect(result.rows).toEqual([['She said "hello"']]);
  });

  it('handles embedded newlines in quoted fields', () => {
    const result = parseCSV('Notes\n"Line 1\nLine 2"');
    expect(result.rows).toEqual([['Line 1\nLine 2']]);
  });

  it('strips BOM', () => {
    const result = parseCSV('\uFEFFName\nAlice');
    expect(result.headers).toEqual(['Name']);
  });

  it('handles CRLF line endings', () => {
    const result = parseCSV('Name\r\nAlice\r\nBob');
    expect(result.headers).toEqual(['Name']);
    expect(result.rows).toEqual([['Alice'], ['Bob']]);
  });

  it('returns empty for empty input', () => {
    const result = parseCSV('');
    expect(result.headers).toEqual([]);
    expect(result.rows).toEqual([]);
  });
});

describe('validateImportRows', () => {
  const schema = z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Invalid email'),
  });

  it('validates valid rows', () => {
    const rows = [
      ['Alice', 'alice@test.com'],
      ['Bob', 'bob@test.com'],
    ];
    const mapping = { name: 0, email: 1 };
    const result = validateImportRows(rows, schema, mapping);

    expect(result.valid).toHaveLength(2);
    expect(result.errors).toHaveLength(0);
  });

  it('reports errors for invalid rows', () => {
    const rows = [['', 'invalid-email']];
    const mapping = { name: 0, email: 1 };
    const result = validateImportRows(rows, schema, mapping);

    expect(result.valid).toHaveLength(0);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].row).toBe(2); // 1-indexed + header offset
  });

  it('handles mixed valid and invalid rows', () => {
    const rows = [
      ['Alice', 'alice@test.com'],
      ['', 'bad'],
    ];
    const mapping = { name: 0, email: 1 };
    const result = validateImportRows(rows, schema, mapping);

    expect(result.valid).toHaveLength(1);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('handles missing columns gracefully', () => {
    const rows = [['Alice']]; // Only 1 column, mapping expects 2
    const mapping = { name: 0, email: 1 };
    const result = validateImportRows(rows, schema, mapping);

    // Empty string should fail email validation
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

describe('buildFieldMapping', () => {
  it('maps headers to indices', () => {
    const { mapping, errors } = buildFieldMapping(
      ['Name', 'Email', 'Phone'],
      ['name', 'email'],
      ['phone']
    );

    expect(errors).toHaveLength(0);
    expect(mapping).toEqual({ name: 0, email: 1, phone: 2 });
  });

  it('is case-insensitive', () => {
    const { mapping, errors } = buildFieldMapping(['NAME', 'Email'], ['name', 'email'], []);

    expect(errors).toHaveLength(0);
    expect(mapping).toEqual({ name: 0, email: 1 });
  });

  it('reports missing required fields', () => {
    const { mapping, errors } = buildFieldMapping(['Name'], ['name', 'email'], []);

    expect(mapping).toBeNull();
    expect(errors).toContain('Missing required column: email');
  });

  it('omits optional fields not in headers', () => {
    const { mapping, errors } = buildFieldMapping(['Name'], ['name'], ['phone']);

    expect(errors).toHaveLength(0);
    expect(mapping).toEqual({ name: 0 });
    expect(mapping?.phone).toBeUndefined();
  });
});
