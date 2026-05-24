import { Pool } from 'pg';
import { Document, DocumentChunk, Citation, ChatMessage } from '../src/types';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export class VectorStore {
  async initSchema() {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id          TEXT PRIMARY KEY,
        user_email  TEXT NOT NULL,
        name        TEXT NOT NULL,
        type        TEXT NOT NULL,
        size        INTEGER NOT NULL,
        upload_date TEXT NOT NULL,
        chunk_count INTEGER NOT NULL,
        word_count  INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS chunks (
        id          TEXT PRIMARY KEY,
        doc_id      TEXT NOT NULL,
        user_email  TEXT NOT NULL,
        doc_name    TEXT NOT NULL,
        content     TEXT NOT NULL,
        embedding   TEXT,
        token_count INTEGER
      );
      CREATE TABLE IF NOT EXISTS messages (
        id         TEXT PRIMARY KEY,
        user_email TEXT NOT NULL,
        role       TEXT NOT NULL,
        content    TEXT NOT NULL,
        timestamp  TEXT NOT NULL,
        citations  TEXT
      );
    `);
    console.log('[VectorStore] PostgreSQL schema ready.');
  }

  async getDocuments(userEmail: string): Promise<Document[]> {
    const { rows } = await pool.query(
      `SELECT id, name, type, size,
              upload_date AS "uploadDate",
              chunk_count AS "chunkCount",
              word_count  AS "wordCount"
       FROM documents WHERE user_email=$1 ORDER BY upload_date DESC`,
      [userEmail]
    );
    return rows;
  }

  async getChunks(userEmail: string): Promise<DocumentChunk[]> {
    const { rows } = await pool.query(
      `SELECT id, doc_id AS "docId", doc_name AS "docName",
              content, embedding, token_count AS "tokenCount"
       FROM chunks WHERE user_email=$1`,
      [userEmail]
    );
    return rows.map(r => ({
      ...r,
      embedding: r.embedding ? JSON.parse(r.embedding) : undefined,
    }));
  }

  async addDocument(userEmail: string, doc: Document, docChunks: DocumentChunk[]) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM chunks WHERE doc_id=$1 AND user_email=$2', [doc.id, userEmail]);
      await client.query('DELETE FROM documents WHERE id=$1 AND user_email=$2', [doc.id, userEmail]);
      await client.query(
        `INSERT INTO documents (id, user_email, name, type, size, upload_date, chunk_count, word_count)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [doc.id, userEmail, doc.name, doc.type, doc.size, doc.uploadDate, doc.chunkCount, doc.wordCount]
      );
      for (const chunk of docChunks) {
        await client.query(
          `INSERT INTO chunks (id, doc_id, user_email, doc_name, content, embedding, token_count)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [
            chunk.id, chunk.docId, userEmail, chunk.docName, chunk.content,
            chunk.embedding ? JSON.stringify(chunk.embedding) : null,
            chunk.tokenCount ?? null,
          ]
        );
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async deleteDocument(userEmail: string, docId: string): Promise<boolean> {
    const { rowCount } = await pool.query(
      'DELETE FROM documents WHERE id=$1 AND user_email=$2',
      [docId, userEmail]
    );
    await pool.query('DELETE FROM chunks WHERE doc_id=$1 AND user_email=$2', [docId, userEmail]);
    return (rowCount ?? 0) > 0;
  }

  async clearAll(userEmail: string) {
    await pool.query('DELETE FROM documents WHERE user_email=$1', [userEmail]);
    await pool.query('DELETE FROM chunks    WHERE user_email=$1', [userEmail]);
    await pool.query('DELETE FROM messages  WHERE user_email=$1', [userEmail]);
  }

  async getMessages(userEmail: string): Promise<ChatMessage[]> {
    const { rows } = await pool.query(
      'SELECT id, role, content, timestamp, citations FROM messages WHERE user_email=$1 ORDER BY timestamp',
      [userEmail]
    );
    return rows.map(r => ({
      ...r,
      citations: r.citations ? JSON.parse(r.citations) : undefined,
    }));
  }

  async saveMessages(userEmail: string, messages: ChatMessage[]) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM messages WHERE user_email=$1', [userEmail]);
      for (const msg of messages) {
        if (msg.loading) continue;
        await client.query(
          `INSERT INTO messages (id, user_email, role, content, timestamp, citations)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [msg.id, userEmail, msg.role, msg.content, msg.timestamp,
           msg.citations ? JSON.stringify(msg.citations) : null]
        );
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async getAllUsers(): Promise<string[]> {
    const { rows } = await pool.query(`
      SELECT DISTINCT user_email FROM documents
      UNION
      SELECT DISTINCT user_email FROM messages
    `);
    return rows.map(r => r.user_email);
  }

  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) return 0;
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      dot += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  async query(userEmail: string, queryEmbedding: number[], topK: number = 4): Promise<Citation[]> {
    const chunks = await this.getChunks(userEmail);
    if (chunks.length === 0) return [];
    return chunks
      .map(chunk => ({
        chunk,
        score: chunk.embedding ? this.cosineSimilarity(queryEmbedding, chunk.embedding) : 0,
      }))
      .filter(x => x.score > 0.1)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .map(x => ({
        docName: x.chunk.docName,
        chunkId: x.chunk.id,
        score: x.score,
        snippet: x.chunk.content,
      }));
  }
}
