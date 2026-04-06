/**
 * jest.config.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Global Jest configuration for the AI Adaptive Browser test suite.
 *
 * Environments:
 *   - Default: "jsdom"  — used for content-script and popup tests that need a
 *     real DOM, window globals, and IntersectionObserver.
 *   - Individual test files can override with @jest-environment if needed.
 *
 * Setup file:
 *   - tests/setup/chrome-mock.js runs before every test file to install the
 *     global `chrome` API stub.
 */

/** @type {import('jest').Config} */
module.exports = {
  /* Use jsdom so all tests get a browser-like environment */
  testEnvironment: 'jest-environment-jsdom',

  /* Install Chrome API mocks before every test file */
  setupFiles: ['./tests/setup/chrome-mock.js'],

  /* Only pick up files inside the tests/ directory */
  testMatch: ['**/tests/unit/**/*.test.js'],

  /* Coverage — collected from the actual extension source files */
  collectCoverageFrom: [
    'extension/background/service-worker.js',
    'extension/content/tracker.js',
    'extension/content/scorer.js',
    'extension/content/adapter.js',
    'extension/popup/popup.js',
  ],
  coverageReporters: ['text', 'lcov', 'html'],
  coverageDirectory: 'coverage',

  /* Module path aliases for cleaner imports inside tests */
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/extension/$1',
  },

  /* Verbose output by default — easier to read pass/fail per it() */
  verbose: true,
};
