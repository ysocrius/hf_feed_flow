import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts'],
    env: {
      ENCRYPTION_KEY: 'YWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXowMTIzNDU=', // base64 of "abcdefghijklmnopqrstuvwxyz012345" (32 bytes)
    },
  },
});
