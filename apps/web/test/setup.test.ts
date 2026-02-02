import { describe, expect, it } from 'vitest';

describe('Test Setup Verification', () => {
  it('should run a basic test', () => {
    expect(1 + 1).toBe(2);
  });

  it('should have access to DOM APIs via jsdom', () => {
    const div = document.createElement('div');
    div.textContent = 'Hello, Test!';
    expect(div.textContent).toBe('Hello, Test!');
  });

  it('should support async/await', async () => {
    const result = await Promise.resolve('async works');
    expect(result).toBe('async works');
  });
});
