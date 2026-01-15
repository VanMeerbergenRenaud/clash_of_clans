import { defineVitestConfig } from '@nuxt/test-utils/config'

export default defineVitestConfig({
    test: {
        environment: 'nuxt',
        environmentOptions: {
            nuxt: {
                domEnvironment: 'happy-dom',
                overrides: {
                    // Override Nuxt config for testing
                }
            }
        },
        // Load environment variables from .env file
        env: {
            NODE_ENV: 'test'
        },
        // Setup files for initializing test environment
        setupFiles: ['./tests/setup.ts'],
        // Timeout for each test (30 seconds for API calls)
        testTimeout: 30000,
        // Run tests sequentially to avoid rate limiting on CoC API
        pool: 'forks',
        poolOptions: {
            forks: {
                singleFork: true
            }
        },
        // Include test files
        include: ['tests/**/*.test.ts'],
    }
})
