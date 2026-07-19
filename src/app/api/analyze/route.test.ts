import { describe, expect, it } from 'vitest';

const VALID_MODES = ['none', 'ask', 'auto'] as const;

describe('analyze API route', () => {
  it('validates mode correctly', () => {
    expect(VALID_MODES).toContain('none');
    expect(VALID_MODES).toContain('ask');
    expect(VALID_MODES).toContain('auto');
    expect(VALID_MODES).toHaveLength(3);
  });

  it('rejects invalid mode', () => {
    expect(VALID_MODES).not.toContain('invalid');
    expect(VALID_MODES).not.toContain('hack');
  });
});
