// Set test environment variables before any imports
process.env.NODE_ENV = 'test';
process.env.OTP_OVERRIDE = '123456';
process.env.JWT_SECRET = 'test-secret-do-not-use-in-production';
// No DATABASE_URL in tests — use in-memory store
delete process.env.DATABASE_URL;
