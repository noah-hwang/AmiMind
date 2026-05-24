/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Document {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadDate: string;
  chunkCount: number;
  wordCount: number;
}

export interface DocumentChunk {
  id: string;
  docId: string;
  docName: string;
  content: string;
  embedding?: number[];
  tokenCount?: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  citations?: Citation[];
  loading?: boolean;
}

export interface Citation {
  docName: string;
  chunkId: string;
  score: number;
  snippet: string;
}

export interface QueryResponse {
  answer: string;
  citations: Citation[];
}

export interface SystemStats {
  documentsCount: number;
  chunksCount: number;
  totalWords: number;
  vectorDbStatus: 'Idle' | 'Indexing' | 'Healthy' | 'Error';
  modelUsed: string;
  embeddingModel: string;
}

export interface ModelMappingItem {
  displayName: string;
  requestModel: string;
  support1M: boolean;
}

export interface AdminUser {
  email: string;
  docCount: number;
  chunkCount: number;
  messageCount: number;
  lastActive: string | null;
}

export interface LLMConfig {
  BASE_URL: string;
  API_KEY: string;
  MODEL_NAME: string;
  EMBEDDING_MODEL_NAME: string;
  API_FORMAT?: 'openai' | 'anthropic';
  AUTH_FIELD?: string;
  MODEL_MAPPINGS?: {
    sonnet: ModelMappingItem;
    opus: ModelMappingItem;
    haiku: ModelMappingItem;
  };
}

