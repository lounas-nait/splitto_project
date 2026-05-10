import { describe, it, expect } from 'vitest';
import { simplifyDebts } from '../../src/domain/simplify';

describe('simplifyDebts', () => {

  // CYCLE 1 — 2 personnes
  it('2 personnes : b doit 10 à a', () => {
    const result = simplifyDebts({ a: 10, b: -10 });
    expect(result).toEqual([{ from: 'b', to: 'a', amount: 10 }]);
  });
  // CYCLE 2 — 3 personnes en triangle
  it('3 personnes : c doit 10 à a, b est neutre', () => {
    const result = simplifyDebts({ a: 10, b: 0, c: -10 });
    expect(result).toEqual([{ from: 'c', to: 'a', amount: 10 }]);
  });

});