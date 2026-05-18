import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/index.ts', 'src/test/**'],
      // Seuils minimaux pour `npm run test:coverage`. La CI peut être
      // configurée pour les rendre bloquants au fur et à mesure que la
      // couverture progresse (currently informative).
      thresholds: {
        // Modules à test : exiger une couverture sérieuse
        'src/lib/accountCodes.ts':              { lines: 80, functions: 90 },
        'src/lib/taxConstants.ts':              { lines: 80, functions: 80 },
        'src/modules/accounting/posting.helpers.ts': { lines: 80, functions: 90 },
        'src/modules/employees/payslip.ts':     { lines: 70, functions: 80 },
        'src/modules/fiscal/fiscal.helpers.ts': { lines: 80, functions: 90 },
      },
    },
  },
})
