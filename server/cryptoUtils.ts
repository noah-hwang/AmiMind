import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const ENCRYPTION_KEY = process.env.DB_ENCRYPTION_KEY || 'a_very_secure_and_stable_32_byte_passphrase_for_llm_config!';
const HASH_KEY = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();

export function encrypt(text: string | null | undefined): string {
  if (!text) return '';
  try {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, HASH_KEY, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
  } catch (error) {
    console.error('[Crypto] Encryption error:', error);
    return '';
  }
}

export function decrypt(encryptedText: string | null | undefined): string {
  if (!encryptedText) return '';
  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 2) return '';
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const decipher = crypto.createDecipheriv(ALGORITHM, HASH_KEY, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.warn('[Crypto] Decryption error (could already be plaintext or using a different key):', error);
    return encryptedText || ''; // Return fallback to original if decryption fails (e.g. if already plaintext)
  }
}
