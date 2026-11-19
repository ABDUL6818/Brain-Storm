/**
 * Jest configuration for all unit and integration tests matching *.test.ts and *.spec.ts.
 * This covers tests added by Issues #842, #843 and the module modularization
 * work (Issues #37, #38, #39, #40).
 */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.(test|spec)\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    '**/*.(t|j)s',
    // Explicitly target the refactored modules so the coverage gate reflects
    // the modularized service/repository code (Issues #37, #38, #39, #40).
    'users/**/*.ts',
    'courses/**/*.ts',
    'credentials/**/*.ts',
    'payments/**/*.ts',
    '!**/*.module.ts',
    '!**/*.dto.ts',
    '!**/index.ts',
    '!**/*.test.ts',
    '!**/*.spec.ts',
  ],
  coverageDirectory: '../coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  coverageThreshold: {
    // Issue #1023: 85% coverage threshold for core services
    global: {
      lines: 85,
      functions: 85,
      branches: 80,
      statements: 85,
    },
    // Enforce the 85% coverage gate for the refactored modules.
    './users/': {
      lines: 85,
      functions: 85,
      branches: 80,
      statements: 85,
    },
    './courses/': {
      lines: 85,
      functions: 85,
      branches: 80,
      statements: 85,
    },
    './credentials/': {
      lines: 85,
      functions: 85,
      branches: 80,
      statements: 85,
    },
    './payments/': {
      lines: 85,
      functions: 85,
      branches: 80,
      statements: 85,
    },
  },
  testEnvironment: 'node',
  testTimeout: 60000,
};