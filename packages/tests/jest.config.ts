import type { Config } from "jest";

const config: Config = {
    // Use ts-jest to handle TypeScript
    preset: "ts-jest",
    testEnvironment: "node",

    // Root directories
    roots: ["<rootDir>"],

    // Test file patterns
    testMatch: [
        "**/__tests__/**/*.ts",
        "**/*.test.ts",
        "**/*.spec.ts",
    ],

    // Module name mapper for workspace packages
    moduleNameMapper: {
        "^@repo/notifications$": "<rootDir>/../notifications/src/index.ts",
        "^@repo/keygen$": "<rootDir>/../keygen/src/index.ts",
        "^@repo/cache$": "<rootDir>/mocks/redis.mock.ts",
        "^@repo/db$": "<rootDir>/mocks/db.mock.ts",
    },

    // Transform config
    transform: {
        "^.+\\.tsx?$": [
            "ts-jest",
            {
                tsconfig: "<rootDir>/tsconfig.json",
                diagnostics: false,
            },
        ],
    },

    // Global setup — runs before each test suite
    setupFiles: ["<rootDir>/jest.setup.ts"],

    // Coverage configuration
    collectCoverageFrom: [
        "../notifications/src/**/*.ts",
        "../keygen/src/**/*.ts",
        "../../apps/http/src/helper/**/*.ts",
        "../../apps/http/src/utils/encrypter.ts",
        "../../apps/http/src/middleware.ts",
        "!**/*.d.ts",
        "!**/node_modules/**",
    ],

    coverageThresholds: {
        global: {
            branches: 75,
            functions: 80,
            lines: 80,
            statements: 80,
        },
    },

    coverageReporters: ["text", "text-summary", "lcov", "html"],
    coverageDirectory: "<rootDir>/coverage",

    // Verbose output
    verbose: true,

    // Clear mocks between tests
    clearMocks: true,
    resetMocks: true,
    restoreMocks: true,

    // Timeout
    testTimeout: 15000,
};

export default config;
