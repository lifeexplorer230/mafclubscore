export default {
  testEnvironment: 'node',
  transform: {},
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  testMatch: [
    "**/__tests__/**/*.js",
    "**/?(*.)+(spec|test).js"
  ],
  collectCoverageFrom: [
    "api/**/*.js",
    "rating_calculator.js",
    "!api/test.js",
    "!node_modules/**"
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "html"]
};