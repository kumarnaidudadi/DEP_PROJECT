import type { Config } from 'jest';

const config: Config = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/src/__tests__'],
    testMatch: ['**/*.test.ts'],
    transform: {
        '^.+\\.tsx?$': ['ts-jest', {
            tsconfig: {
                strict: false,
                esModuleInterop: true,
            }
        }]
    },
    // Map ../../foo from inside src/__tests__/ to src/foo
    moduleNameMapper: {
        '^../../middleware/(.*)$': '<rootDir>/src/middleware/$1',
        '^../../services/(.*)$': '<rootDir>/src/services/$1',
        '^../../prisma$': '<rootDir>/src/prisma',
        '^../../repositories/(.*)$': '<rootDir>/src/repositories/$1',
        '^../../dtos/(.*)$': '<rootDir>/src/dtos/$1',
    },
    collectCoverageFrom: [
        'src/services/**/*.ts',
        'src/middleware/**/*.ts',
        '!src/services/I*.ts',
        '!src/services/pdfMappings.ts',
    ],
    coverageReporters: ['text', 'lcov'],
    clearMocks: true,
    verbose: true,
};

export default config;
