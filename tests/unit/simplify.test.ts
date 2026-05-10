import { describe, it, expect } from 'vitest';
import { simplifyDebts } from '../../src/domain/simplify';

describe('simplifyDebts', () => {

  // CYCLE 1 — 2 personnes
  it('2 personnes : b doit 10 à a', () => {
    const result = simplifyDebts({ a: 10, b: -10 });
    expect(result).toEqual([{ from: 'b', to: 'a', amount: 10 }]);
  });

});