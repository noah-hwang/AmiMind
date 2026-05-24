import fs from 'fs';
import path from 'path';
import { Document, DocumentChunk, Citation, ChatMessage } from '../src/types';

interface PersistedStore {
  documents: Document[];
  chunks: DocumentChunk[];
  messages: ChatMessage[];
}

export class VectorStore {
  private getStorePath(userEmail: string): string {
    const sanitized = encodeURIComponent(userEmail || 'anonymous').replace(/[*"\/\\<>:|?]/g, '_');
    const dir = path.join(process.cwd(), 'db_stores');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return path.join(dir, `store_${sanitized}.json`);
  }

  private loadStore(userEmail: string): PersistedStore {
    const storePath = this.getStorePath(userEmail);
    try {
      if (fs.existsSync(storePath)) {
        const fileContent = fs.readFileSync(storePath, 'utf-8');
        const data = JSON.parse(fileContent);
        const storeObj = {
          documents: data.documents || [],
          chunks: data.chunks || [],
          messages: data.messages || [],
        };

        // Seed template data if documents list is empty
        if (storeObj.documents.length === 0) {
          const templatePath = path.join(process.cwd(), 'db_store.json');
          if (fs.existsSync(templatePath)) {
            console.log(`[VectorStore] Seeding empty store back to template data for user: ${userEmail}`);
            const templateContent = fs.readFileSync(templatePath, 'utf-8');
            const templateData = JSON.parse(templateContent);
            storeObj.documents = templateData.documents || [];
            storeObj.chunks = templateData.chunks || [];
            fs.writeFileSync(storePath, JSON.stringify(storeObj, null, 2), 'utf-8');
          }
        }
        return storeObj;
      } else {
        // Create store and seed from db_store.json
        const templatePath = path.join(process.cwd(), 'db_store.json');
        if (fs.existsSync(templatePath)) {
          console.log(`[VectorStore] Seeding default template db_store.json to user store: ${userEmail}`);
          const fileContent = fs.readFileSync(templatePath, 'utf-8');
          const data = JSON.parse(fileContent);
          const seedStore = {
            documents: data.documents || [],
            chunks: data.chunks || [],
            messages: [],
          };
          fs.writeFileSync(storePath, JSON.stringify(seedStore, null, 2), 'utf-8');
          return seedStore;
        }
      }
    } catch (e) {
      console.error(`[VectorStore] Error loading store for ${userEmail}:`, e);
    }
    return { documents: [], chunks: [], messages: [] };
  }

  private saveStore(userEmail: string, data: PersistedStore) {
    const storePath = this.getStorePath(userEmail);
    try {
      fs.writeFileSync(storePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
      console.error(`[VectorStore] Error saving store for ${userEmail}:`, e);
    }
  }

  public getDocuments(userEmail: string): Document[] {
    return this.loadStore(userEmail).documents;
  }

  public getChunks(userEmail: string): DocumentChunk[] {
    return this.loadStore(userEmail).chunks;
  }

  /**
   * Insert a document entry and its chunks
   */
  public addDocument(userEmail: string, doc: Document, docChunks: DocumentChunk[]) {
    const store = this.loadStore(userEmail);
    
    // Remove existing if any
    store.documents = store.documents.filter((d) => d.id !== doc.id);
    store.chunks = store.chunks.filter((c) => c.docId !== doc.id);

    store.documents.push(doc);
    store.chunks.push(...docChunks);
    
    this.saveStore(userEmail, store);
  }

  /**
   * Delete document and relevant chunks
   */
  public deleteDocument(userEmail: string, docId: string): boolean {
    const store = this.loadStore(userEmail);
    const documentExists = store.documents.some((d) => d.id === docId);
    if (!documentExists) return false;

    store.documents = store.documents.filter((d) => d.id !== docId);
    store.chunks = store.chunks.filter((c) => c.docId !== docId);
    
    this.saveStore(userEmail, store);
    return true;
  }

  /**
   * Purge the entire storage configuration
   */
  public clearAll(userEmail: string) {
    const store = this.loadStore(userEmail);
    store.documents = [];
    store.chunks = [];
    store.messages = [];
    this.saveStore(userEmail, store);
  }

  /**
   * Get messages for user
   */
  public getMessages(userEmail: string): ChatMessage[] {
    return this.loadStore(userEmail).messages;
  }

  /**
   * Save messages for user
   */
  public saveMessages(userEmail: string, messages: ChatMessage[]) {
    const store = this.loadStore(userEmail);
    store.messages = messages;
    this.saveStore(userEmail, store);
  }

  /**
   * Compute cosine similarity between two float vectors
   */
  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) return 0;
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Find query similarity across chunks with scores
   */
  public query(userEmail: string, queryEmbedding: number[], topK: number = 4): Citation[] {
    const chunks = this.getChunks(userEmail);
    if (chunks.length === 0) return [];

    const scoredChunks = chunks
      .map((chunk) => {
        if (!chunk.embedding) return { chunk, score: 0 };
        const score = this.cosineSimilarity(queryEmbedding, chunk.embedding);
        return { chunk, score };
      })
      .filter((item) => item.score > 0.1) // Lower-bound filter 
      .sort((a, b) => b.score - a.score);

    // Pick TopK
    const results = scoredChunks.slice(0, topK);

    return results.map((item) => ({
      docName: item.chunk.docName,
      chunkId: item.chunk.id,
      score: item.score,
      snippet: item.chunk.content,
    }));
  }
}
