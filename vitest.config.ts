import {configDefaults, defineConfig} from 'vitest/config';

export default defineConfig({
  test: {
    // `build/` holds unpacked delivery bundles and prototype checkouts, not project sources.
    // Without this, `npm test` runs their suites and reports failures that belong to another tree.
    // `.claude/` holds other sessions' git worktrees, which are separate checkouts with their own tests.
    // The Stage B atlas needs the prepared `public/grid/` inputs, which are not committed; run
    // `npm run test:atlas` after `npm run prepareData -w @sz/snapshot-3d`.
    exclude: [...configDefaults.exclude, 'build/**', '.claude/**', 'apps/snapshot-3d/test/**'],
  },
});
