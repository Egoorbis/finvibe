import { expect, afterEach, beforeAll, afterAll, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

expect.extend(matchers);

const originalLog = console.log;
const originalError = console.error;

beforeAll(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
});

afterAll(() => {
  console.log.mockRestore();
  console.error.mockRestore();
  console.log = originalLog;
  console.error = originalError;
});
