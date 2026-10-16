import { defineConfig } from 'vitest/config';

/**
 * Existing `src/lib/*.test.js` files use node:test (assert + node:test).
 * Playwright specs live under tests/e2e. Vitest only runs the upload-queue
 * unit suites added for bulk-upload stability.
 */
export default defineConfig({
  test: {
    include: [
      'src/contexts/**/*.test.{js,ts}',
      'src/services/**/*.test.{js,ts}',
      'src/components/features/CollectionDashboard/Upload/**/*.test.{js,ts}',
      'src/__smoke.test.js',
      'src/components/admin/**/*.test.{js,ts}',
    ],
    exclude: ['**/node_modules/**', '**/dist/**', 'tests/e2e/**'],
  },
});
