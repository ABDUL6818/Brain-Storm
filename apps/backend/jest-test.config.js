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
    '!**/*.dto.ts',
    '!**/*.entity.ts',
    '!**/*.module.ts',
    '!**/*.interface.ts',
    '!**/*.spec.ts',
    '!**/*.test.ts',
    '!**/index.ts',
    '!main.ts',
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
    // Issue #1462: enforce 85% coverage on the modularized auth module
    // (service + repository). DTOs are excluded via collectCoverageFrom.
    './auth/auth.service.ts': {
      lines: 85,
      functions: 85,
      branches: 80,
      statements: 85,
    },
    './auth/auth.repository.ts': {
      lines: 85,
      functions: 85,
      branches: 80,
      statements: 85,
    },
  },
  testEnvironment: 'node',
  testTimeout: 60000,
};