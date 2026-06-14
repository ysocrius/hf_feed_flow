import { describe, it, expect, vi } from 'vitest';
import { encryptToken, decryptToken } from '../lib/crypto';

describe('crypto', () => {
  it('encrypts and decrypts correctly', () => {
    const plaintext = 'test-session-data';
    const encrypted = encryptToken(plaintext);
    const decrypted = decryptToken(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it('produces different ciphertext for same plaintext', () => {
    const plaintext = 'same-data';
    const encrypted1 = encryptToken(plaintext);
    const encrypted2 = encryptToken(plaintext);
    expect(encrypted1).not.toBe(encrypted2);
    expect(decryptToken(encrypted1)).toBe(plaintext);
    expect(decryptToken(encrypted2)).toBe(plaintext);
  });

  it('throws on invalid encrypted format', () => {
    expect(() => decryptToken('invalid')).toThrow();
  });
});
