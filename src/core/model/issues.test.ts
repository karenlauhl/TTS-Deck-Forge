import { describe, expect, it } from 'vitest';
import { describeOrigin, error } from './issues';

describe('issues', () => {
  it('prefixes messages with file and row/line', () => {
    expect(error('missing-field', 'text is empty', { origin: { type: 'file', file: 'a.csv', row: 4 } }).message).toBe(
      'a.csv row 4: text is empty',
    );
    expect(describeOrigin({ type: 'file', file: 'b.txt', line: 2 })).toBe('b.txt line 2');
    expect(describeOrigin({ type: 'manual' })).toBe('manually added card');
  });
});
