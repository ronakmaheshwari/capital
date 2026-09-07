import path from "node:path";
import type { Config } from "jest";

// rootDir is the monorepo root (not packages/tests) because Jest's coverage
// instrumentation only scans files under `roots`, and collectCoverageFrom
// targets source files in sibling packages/apps (packages/notifications,
// packages/keygen, apps/http) — those must be reachable from rootDir.
const monorepoRoot = path.resolve(__dirname, "../..");
const testsDir = path.resolve(__dirname);

const config: Config = {
    // Use ts-jest to handle TypeScript
    preset: "ts-jest",
    testEnvironment: "node",
    rootDir: monorepoRoot,

    // Root directories that Jest scans for tests and coverage instrumentation
    roots: [testsDir, path.join(monorepoRoot, "packages/notifications"), path.join(monorepoRoot, "packages/keygen"), path.join(monorepoRoot, "apps/http")],

    // Test file patterns
    testMatch: [
        `${testsDir}/**/__tests__/**/*.ts`,
        `${testsDir}/**/*.test.ts`,
        `${testsDir}/**/*.spec.ts`,
    ],

    // Module name mapper for workspace packages
    moduleNameMapper: {
        "^@repo/notifications$": `${testsDir}/../notifications/src/index.ts`,
        "^@repo/keygen$": `${testsDir}/../keygen/src/index.ts`,
        "^@repo/cache$": `${testsDir}/mocks/redis.mock.ts`,
        "^@repo/db$": `${testsDir}/mocks/db.mock.ts`,
        "^node-fetch$": `${testsDir}/mocks/nodeFetch.mock.ts`,
    },

    // Transform config
    transform: {
        "^.+\\.tsx?$": [
            "ts-jest",
            {
                tsconfig: `${testsDir}/tsconfig.json`,
                diagnostics: false,
            },
        ],
    },

    // Global setup — runs before each test suite
    setupFiles: [`${testsDir}/jest.setup.ts`],

    // Coverage configuration
    collectCoverageFrom: [
        "packages/notifications/src/**/*.ts",
        "packages/keygen/src/**/*.ts",
        "apps/http/src/helper/**/*.ts",
        "apps/http/src/utils/encrypter.ts",
        "apps/http/src/middleware.ts",
        "!**/*.d.ts",
        "!**/node_modules/**",
    ],

    coverageThreshold: {
        global: {
            branches: 75,
            functions: 80,
            lines: 80,
            statements: 80,
        },
    },

    coverageReporters: ["text", "text-summary", "lcov", "html"],
    coverageDirectory: `${testsDir}/coverage`,

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
