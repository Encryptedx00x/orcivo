// Isolated unit suite: no database or application bootstrap required.
module.exports = {
  rootDir: '.',
  modulePaths: ['<rootDir>/node_modules'],
  testMatch: ['<rootDir>/appointment.spec.ts'],
  testEnvironment: 'node',
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        isolatedModules: true,
        tsconfig: {
          target: 'ES2022',
          module: 'commonjs',
          experimentalDecorators: true,
          esModuleInterop: true,
        },
      },
    ],
  },
};
