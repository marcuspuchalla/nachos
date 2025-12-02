import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      exclude: [
        // Pure re-export barrel files
        'src/parser/index.ts',
        'src/encoder/index.ts',
        // Test files
        '**/*.test.ts',
        '**/__tests__/**',
        // Config files
        '*.config.ts',
      ],
    },
  },
})
