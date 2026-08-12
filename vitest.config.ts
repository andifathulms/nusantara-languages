import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  test: {
    // lib/newick, lib/tree and lib/geo are pure — they run in Node, no DOM.
    environment: 'node',
    include: ['tests/**/*.test.ts', 'lib/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('.', import.meta.url)),
    },
  },
})
