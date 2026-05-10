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
  // CYCLE 3 — 4 personnes, dette circulaire complexe
  it('4 personnes : 2 settlements minimum', () => {
    const result = simplifyDebts({ a: 30, b: -20, c: -10, d: 0 });
    expect(result).toHaveLength(2);
    expect(result).toContainEqual({ from: 'b', to: 'a', amount: 20 });
    expect(result).toContainEqual({ from: 'c', to: 'a', amount: 10 });
  });
  // CYCLE 4 — multi-créditeurs et multi-débiteurs
  it('multi-créditeurs : répartition optimale', () => {
    const result = simplifyDebts({ a: 10, b: 20, c: -15, d: -15 });
    expect(result).toHaveLength(3);
    const total = result.reduce((sum, s) => sum + s.amount, 0);
    expect(total).toBeCloseTo(30);
  });
  // CYCLE 5 — tout le monde est quitte
  it('tous les soldes à 0 → aucun settlement', () => {
    const result = simplifyDebts({ a: 0, b: 0, c: 0 });
    expect(result).toEqual([]);
  });
  // CYCLE 6 — un débiteur, plusieurs créditeurs
  it('1 débiteur, 2 créditeurs → 2 settlements', () => {
    const result = simplifyDebts({ a: 60, b: 40, c: -100 });
    expect(result).toHaveLength(2);
    expect(result).toContainEqual({ from: 'c', to: 'a', amount: 60 });
    expect(result).toContainEqual({ from: 'c', to: 'b', amount: 40 });
  });

});