export default {
  packageManager: 'npm',
  reporters: ['html', 'clear-text', 'progress'],
  testRunner: 'vitest',
  vitest: {
    configFile: 'vitest.unit.config.ts',
  },
  mutate: [
    'src/domain/balances.ts',
    'src/domain/simplify.ts',
  ],
  coverageAnalysis: 'perTest',
  timeoutMS: 30000,
  timeoutFactor: 2,
};