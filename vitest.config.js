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
      'src/printstore/printstoreCartBeta.test.js',
      'src/lib/galleryMediaType.test.ts',
      'src/lib/deliveryDuplicate.test.js',
      'src/lib/deliveryDashboardSeed.test.js',
      'src/lib/galleryBoardCache.test.js',
      'src/lib/albumsListCache.test.js',
      'src/lib/photoAiSearch.test.js',
      'src/lib/desktopOnly.test.js',
      'src/lib/deliveryDownload.test.js',
      'src/lib/deliveryCoverUpload.test.js',
      'src/lib/fileMime.test.js',
      'src/lib/starredFlag.test.js',
      'src/lib/photoDisplayUrl.grid.test.js',
      'src/lib/masonryColumnDistribution.test.ts',
      'src/lib/sanitizePhotographerHtml.test.js',
      'src/services/photographerQuota.service.test.js',
      'functions/crashQueryGate.test.js',
      'src/components/features/CollectionDashboard/Upload/**/*.test.{js,ts}',
      'src/__smoke.test.js',
      'src/components/admin/**/*.test.{js,ts}',
    ],
    exclude: ['**/node_modules/**', '**/dist/**', 'tests/e2e/**'],
  },
});
