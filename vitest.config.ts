import {configDefaults, defineConfig} from 'vitest/config';

export default defineConfig({
  test: {
    // `build/` holds unpacked delivery bundles and prototype checkouts, not project sources.
    // Without this, `npm test` runs their suites and reports failures that belong to another tree.
    // `.claude/` holds other sessions' git worktrees, which are separate checkouts with their own tests.
    exclude: [...configDefaults.exclude, 'build/**', '.claude/**'],
  },
});
