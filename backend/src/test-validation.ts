import { validate, validationSchemas } from './middleware/validation';
import { Request, Response, NextFunction } from 'express';

// Mock Express objects for testing
const mockRequest = (body: any, params: any = {}, query: any = {}) => ({
  body,
  params,
  query,
}) as Request;

const mockResponse = () => {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mockNext = jest.fn() as NextFunction;

// Test validation middleware
console.log('Testing validation middleware...');

// Test 1: Valid user registration data
console.log('\n1. Testing valid user registration data:');
const validUserData = {
  email: 'test@example.com',
  password: 'password123',
  name: 'John Doe',
  phone: '+1234567890',
};

const req1 = mockRequest(validUserData);
const res1 = mockResponse();
const middleware1 = validate(validationSchemas.auth.register);

try {
  middleware1(req1, res1, mockNext);
  console.log('✅ Valid data passed validation');
  console.log('Parsed data:', req1.body);
} catch (error) {
  console.log('❌ Valid data failed validation:', error);
}

// Test 2: Invalid email
console.log('\n2. Testing invalid email:');
const invalidEmailData = {
  email: 'invalid-email',
  password: 'password123',
  name: 'John Doe',
};

const req2 = mockRequest(invalidEmailData);
const res2 = mockResponse();
const middleware2 = validate(validationSchemas.auth.register);

try {
  middleware2(req2, res2, mockNext);
  console.log('❌ Invalid email should have failed validation');
} catch (error) {
  console.log('✅ Invalid email correctly failed validation');
}

// Test 3: Test UUID validation
console.log('\n3. Testing UUID validation:');
const validUuid = '123e4567-e89b-12d3-a456-426614174000';
const invalidUuid = 'not-a-uuid';

const req3 = mockRequest({}, { id: validUuid });
const res3 = mockResponse();
const middleware3 = validate(validationSchemas.content.getById);

try {
  middleware3(req3, res3, mockNext);
  console.log('✅ Valid UUID passed validation');
} catch (error) {
  console.log('❌ Valid UUID failed validation:', error);
}

const req4 = mockRequest({}, { id: invalidUuid });
const res4 = mockResponse();
const middleware4 = validate(validationSchemas.content.getById);

try {
  middleware4(req4, res4, mockNext);
  console.log('❌ Invalid UUID should have failed validation');
} catch (error) {
  console.log('✅ Invalid UUID correctly failed validation');
}

console.log('\n✅ Validation middleware tests completed!');