export default {
  testEnvironment: 'node',
  transform: {},
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  testMatch: [
    "**/__tests__/**/smoke.test.js",
    "**/__tests__/**/feature-flags.test.js",
    "**/__tests__/**/dom-safe.test.js",
    "**/__tests__/**/game-validator.test.js",
    "**/__tests__/**/jwt-auth.test.js",
    "**/__tests__/**/utils.test.js",
    "**/__tests__/modules/api.test.js",
    "**/__tests__/modules/auth.test.js"
    // TODO: Fix and re-enable rating_calculator.test.js and api.test.js
    // These tests have import issues and need refactoring (Phase 2)
  ],
  collectCoverageFrom: [
    "api/**/*.js",
    "shared/**/*.js",
    "js/utils/**/*.js",
    "js/**/*.js",
    "rating_calculator.js",
    "!api/test.js",
    "!js/__tests__/**",
    "!node_modules/**",
    "!coverage/**"
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "html", "json-summary"],
  coverageThresholds: {
    global: {
      branches: 50,
      functions: 50,
      lines: 60,
      statements: 60
    }
  }
};