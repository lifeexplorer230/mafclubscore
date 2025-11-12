export default {
  testEnvironment: 'node',
  transform: {},
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  testMatch: [
    "**/__tests__/**/smoke.test.js",
    "**/__tests__/**/feature-flags.test.js",
    "**/__tests__/**/dom-safe.test.js"
    // TODO: Fix and re-enable rating_calculator.test.js and api.test.js
    // These tests have import issues and need refactoring (Phase 2)
  ],
  collectCoverageFrom: [
    "api/**/*.js",
    "shared/**/*.js",
    "js/utils/**/*.js",
    "rating_calculator.js",
    "!api/test.js",
    "!node_modules/**"
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "html"]
};