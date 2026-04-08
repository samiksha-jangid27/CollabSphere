// ABOUTME: Jest configuration for the CollabSphere server test suite.
// ABOUTME: Uses ts-jest with mongodb-memory-server for isolated integration tests.

import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.test.json' }],
  },
  testTimeout: 30000,
  verbose: true,
};

export default config;
