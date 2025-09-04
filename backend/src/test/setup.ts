import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set test environment variables if not already set
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
}

if (!process.env.WORKOS_API_KEY) {
  process.env.WORKOS_API_KEY = 'test-workos-api-key';
}

if (!process.env.WORKOS_CLIENT_ID) {
  process.env.WORKOS_CLIENT_ID = 'test-workos-client-id';
}

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
}

// Mock console methods to reduce test output noise
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};