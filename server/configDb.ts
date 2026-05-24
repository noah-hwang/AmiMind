import fs from 'fs';
import path from 'path';
import { encrypt, decrypt } from './cryptoUtils';

export interface LLMConfig {
  BASE_URL: string;
  API_KEY: string;
  MODEL_NAME: string;
  EMBEDDING_MODEL_NAME: string;
  API_FORMAT?: 'openai' | 'anthropic';
  MODEL_MAPPINGS?: any;
}

const CONFIG_DB_PATH = path.join(process.cwd(), 'db_stores', 'system_config.json');

export class ConfigDatabase {
  private static ensureDirExists() {
    const dir = path.dirname(CONFIG_DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  public static load(): LLMConfig | null {
    try {
      this.ensureDirExists();
      if (!fs.existsSync(CONFIG_DB_PATH)) {
        return null;
      }
      const content = fs.readFileSync(CONFIG_DB_PATH, 'utf-8');
      const data = JSON.parse(content);

      if (data) {
        // Decrypt Base URL and API Key
        const decryptedBaseUrl = decrypt(data.encryptedBaseUrl);
        const decryptedApiKey = decrypt(data.encryptedApiKey);

        return {
          BASE_URL: decryptedBaseUrl,
          API_KEY: decryptedApiKey,
          MODEL_NAME: data.MODEL_NAME || 'gpt-4o-mini',
          EMBEDDING_MODEL_NAME: data.EMBEDDING_MODEL_NAME || 'text-embedding-3-small',
          API_FORMAT: data.API_FORMAT || 'openai',
          MODEL_MAPPINGS: data.MODEL_MAPPINGS || {}
        };
      }
    } catch (error) {
      console.error('[ConfigDB] Error loading configuration from database:', error);
    }
    return null;
  }

  public static save(config: LLMConfig) {
    try {
      this.ensureDirExists();

      // Encrypt Base URL and API Key
      const encryptedBaseUrl = encrypt(config.BASE_URL);
      const encryptedApiKey = encrypt(config.API_KEY);

      const dbData = {
        encryptedBaseUrl,
        encryptedApiKey,
        MODEL_NAME: config.MODEL_NAME,
        EMBEDDING_MODEL_NAME: config.EMBEDDING_MODEL_NAME,
        API_FORMAT: config.API_FORMAT,
        MODEL_MAPPINGS: config.MODEL_MAPPINGS,
        updatedAt: new Date().toISOString()
      };

      fs.writeFileSync(CONFIG_DB_PATH, JSON.stringify(dbData, null, 2), 'utf-8');
      console.log('[ConfigDB] Encrypted model URL and key successfully committed to database store.');
    } catch (error) {
      console.error('[ConfigDB] Error saving configuration to database:', error);
    }
  }
}
