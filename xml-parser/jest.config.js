module.exports = {
    testEnvironment: 'jsdom', // For DOM testing
    setupFilesAfterEnv: ['@testing-library/jest-dom/extend-expect'], // Add custom matchers
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
    transform: {
      '^.+\\.(ts|tsx)$': 'ts-jest', // Transform TypeScript files
    },
    testMatch: ['**/?(*.)+(spec|test).[jt]s?(x)'], // Look for test files
  };