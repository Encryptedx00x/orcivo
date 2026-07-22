module.exports = {
  rootDir: '.',
  roots: ['<rootDir>/src'],
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  moduleFileExtensions: ['js', 'json', 'ts', 'tsx'],
  testMatch: [
    '<rootDir>/src/auth/auth.service.spec.ts',
    '<rootDir>/src/auth/guards/jwt-auth.guard.spec.ts',
    '<rootDir>/src/auth/guards/tenant.guard.spec.ts',
    '<rootDir>/src/company/company.service.spec.ts',
    '<rootDir>/src/customer/customer.service.spec.ts',
    '<rootDir>/src/quote/quote-pdf.service.spec.ts',
    '<rootDir>/src/quote/quote.service.spec.ts',
  ],
};
