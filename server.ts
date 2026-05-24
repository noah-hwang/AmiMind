import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { VectorStore } from './server/vectorDb';
import { GeminiService, getInMemoryConfig, setInMemoryConfig } from './server/geminiService';
import { Document, DocumentChunk, ChatMessage, SystemStats } from './src/types';

// Let's create a chunking utility
function chunkText(text: string, docName: string, docId: string, chunkSize: number = 600, overlap: number = 150): DocumentChunk[] {
  const chunks: DocumentChunk[] = [];
  if (!text) return chunks;

  let start = 0;
  let chunkIdx = 0;
  
  while (start < text.length) {
    let end = start + chunkSize;
    
    if (end < text.length) {
      // Look for natural boundary near the end
      const lastLine = text.substring(start, end).lastIndexOf('\n');
      const lastSpace = text.substring(start, end).lastIndexOf(' ');
      const boundary = Math.max(lastLine, lastSpace);
      
      if (boundary > chunkSize * 0.6) {
        end = start + boundary + 1;
      }
    }
    
    const content = text.substring(start, Math.min(end, text.length)).trim();
    if (content.length > 10) {
      chunks.push({
        id: `${docId}-chunk-${chunkIdx++}`,
        docId: docId,
        docName: docName,
        content: content,
      });
    }
    
    start = end - overlap;
    if (start >= text.length - overlap) break;
  }
  
  return chunks;
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

  // Enhance payload size parameters to handle extensive texts
  app.use(express.json({ limit: '20mb' }));
  app.use(express.urlencoded({ limit: '20mb', extended: true }));

  // Initialize modular backend services
  const vectorStore = new VectorStore();
  const geminiService = new GeminiService();

  console.log('[Backend] System layers initialized.');
  await vectorStore.initSchema();

  // === LLM Provider Configuration APIs ===

  // Fetch current LLM config
  app.get('/api/config', (req, res) => {
    try {
      const config = getInMemoryConfig();
      res.json(config);
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Failed to read config' });
    }
  });

  // Save new LLM config
  app.post('/api/config', (req, res) => {
    try {
      const newConfig = req.body;
      setInMemoryConfig(newConfig);
      res.json({ message: 'Configuration saved successfully.', config: newConfig });
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Failed to save config' });
    }
  });

  // Fetch models list from remote provider
  app.post('/api/config/fetch-models', async (req, res) => {
    try {
      let { baseUrl, apiKey } = req.body;
      if (!baseUrl) {
        return res.status(400).json({ error: 'Base URL is required' });
      }

      // Normalize URL
      let resolvedBaseUrl = baseUrl.trim().replace(/\/+$/, '');
      if (!resolvedBaseUrl.startsWith('http://') && !resolvedBaseUrl.startsWith('https://')) {
        resolvedBaseUrl = 'https://' + resolvedBaseUrl;
      }
      try {
        const parsedUrl = new URL(resolvedBaseUrl);
        if (parsedUrl.pathname === '/' || parsedUrl.pathname === '') {
          resolvedBaseUrl += '/v1';
        }
      } catch (e) {
        if (!resolvedBaseUrl.includes('/', 8)) {
          resolvedBaseUrl += '/v1';
        }
      }

      const modelsUrl = `${resolvedBaseUrl}/models`;
      console.log(`[Backend] Fetching models list from: ${modelsUrl}`);

      const headers: Record<string, string> = {
        'Accept': 'application/json'
      };
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
        headers['X-API-KEY'] = apiKey;
        headers['api-key'] = apiKey;
      }

      const response = await fetch(modelsUrl, {
        method: 'GET',
        headers: headers
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`Server returned status ${response.status}: ${text || response.statusText}`);
      }

      const data = await response.json();
      let models: string[] = [];
      if (data && Array.isArray(data.data)) {
        models = data.data.map((m: any) => m.id);
      } else if (Array.isArray(data)) {
        models = data.map((m: any) => m.id || m);
      } else if (data && typeof data === 'object') {
        if (Array.isArray(data.models)) {
          models = data.models.map((m: any) => m.id || m.name || m);
        } else {
          for (const key of Object.keys(data)) {
            if (Array.isArray(data[key])) {
              models = data[key].map((m: any) => m.id || m.name || m);
              break;
            }
          }
        }
      }

      models = Array.from(new Set(models.filter(m => typeof m === 'string')));
      models.sort();

      res.json({ models });
    } catch (e: any) {
      console.error('[Backend] Error fetching models list:', e);
      res.status(500).json({ error: e.message || 'Failed to fetch models from the specified provider.' });
    }
  });

  // === Presentation Layer REST APIs ===

  // 1. Fetch system statistics
  app.get('/api/stats', async (req, res) => {
    try {
      const userEmail = (req.headers['x-user-email'] as string) || 'anonymous';
      const documents = await vectorStore.getDocuments(userEmail);
      const chunks = await vectorStore.getChunks(userEmail);
      const totalWords = documents.reduce((acc, curr) => acc + curr.wordCount, 0);
      
      const modelInfo = geminiService.getModelInfo();
      const stats: SystemStats = {
        documentsCount: documents.length,
        chunksCount: chunks.length,
        totalWords: totalWords,
        vectorDbStatus: chunks.length > 0 ? 'Healthy' : 'Idle',
        modelUsed: `LangChain: ${modelInfo.modelName}`,
        embeddingModel: modelInfo.embeddingModelName,
      };
      
      res.json(stats);
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Failed to fetch stats' });
    }
  });

  // 2. Clear all document data from Vector Database
  app.post('/api/reset', async (req, res) => {
    try {
      const userEmail = (req.headers['x-user-email'] as string) || 'anonymous';
      await vectorStore.clearAll(userEmail);
      res.json({ message: 'Vector database and documents cleared successfully.' });
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Failed to reset store' });
    }
  });

  // 3. List uploaded documents
  app.get('/api/documents', async (req, res) => {
    try {
      const userEmail = (req.headers['x-user-email'] as string) || 'anonymous';
      res.json(await vectorStore.getDocuments(userEmail));
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Failed to retrieve documents list' });
    }
  });

  // 4. Delete specific document
  app.delete('/api/documents/:id', async (req, res) => {
    try {
      const userEmail = (req.headers['x-user-email'] as string) || 'anonymous';
      const docId = req.params.id;
      const success = await vectorStore.deleteDocument(userEmail, docId);
      if (success) {
        res.json({ message: 'Document and vectorized index elements removed.' });
      } else {
        res.status(404).json({ error: 'Document not found' });
      }
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Failed to delete doc' });
    }
  });

  // 5. Upload & Process/Vectorize Document
  app.post('/api/documents/upload', async (req, res) => {
    try {
      const userEmail = (req.headers['x-user-email'] as string) || 'anonymous';
      const { name, text, type, size } = req.body;
      
      if (!name || !text) {
        return res.status(400).json({ error: 'Missing name or text content.' });
      }

      console.log(`[Backend] Processing upload of "${name}" for ${userEmail} (${text.length} characters)`);

      const docId = `doc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      
      // Part 1: Semantic chunking
      const docChunks = chunkText(text, name, docId);
      const chunkCount = docChunks.length;
      const wordCount = text.split(/\s+/).filter(Boolean).length || Math.floor(text.length / 5);

      if (chunkCount === 0) {
        return res.status(400).json({ error: 'Document content is too brief to split.' });
      }

      console.log(`[Backend] Chunked "${name}" into ${chunkCount} segments.`);

      // Part 2: Vectorization (Embedding generation for all chunks)
      const embeddingPromises = docChunks.map(async (chunk) => {
        try {
          const vector = await geminiService.generateEmbedding(chunk.content);
          chunk.embedding = vector;
          return true;
        } catch (err) {
          console.error(`[Backend] Failed embedding generation for chunk: ${chunk.id}`, err);
          return false;
        }
      });

      const embeddingResults = await Promise.all(embeddingPromises);
      const successfullyEmbeddedChunks = docChunks.filter((_, idx) => embeddingResults[idx]);

      if (successfullyEmbeddedChunks.length === 0) {
        throw new Error('Could not vectorize any chunk of the document. Check Gemini API authorization.');
      }

      // Save collection
      const newDoc: Document = {
        id: docId,
        name: name,
        type: type || 'plaintext',
        size: size || Buffer.byteLength(text, 'utf-8'),
        uploadDate: new Date().toISOString(),
        chunkCount: successfullyEmbeddedChunks.length,
        wordCount: wordCount,
      };

      await vectorStore.addDocument(userEmail, newDoc, successfullyEmbeddedChunks);
      console.log(`[Backend] Document "${name}" vectorized and index store updated for ${userEmail}.`);

      res.status(201).json(newDoc);
    } catch (e: any) {
      console.error('[Backend] Upload error handler:', e);
      res.status(500).json({ error: e.message || 'Failed to process document upload' });
    }
  });

  // 6. Q&A Prompt Query API
  app.post('/api/query', async (req, res) => {
    try {
      const userEmail = (req.headers['x-user-email'] as string) || 'anonymous';
      const { question, history = [], modelRole } = req.body;
      if (!question) {
        return res.status(400).json({ error: 'Question parameter is missing.' });
      }

      console.log(`[Backend] Processing Q&A query: "${question}" with model role "${modelRole || 'default'}" for ${userEmail}`);

      // Part 1: Generate Embedding of the Question
      let queryEmbedding: number[];
      try {
        queryEmbedding = await geminiService.generateEmbedding(question);
      } catch (err: any) {
        return res.status(500).json({ error: `Could not embed question: ${err.message}` });
      }

      // Part 2: Query Vector DB for matching context chunks
      const topKMatches = await vectorStore.query(userEmail, queryEmbedding, 4);
      console.log(`[Backend] Vector query returned ${topKMatches.length} context matches.`);

      // Part 3: Formulate payload and request Gemini text summary output
      const contexts = topKMatches.map(cite => ({
        docName: cite.docName,
        text: cite.snippet
      }));

      const responseText = await geminiService.generateAnswer(question, contexts, history, modelRole);

      // Return unified response
      res.json({
        answer: responseText,
        citations: topKMatches,
      });
    } catch (e: any) {
      console.error('[Backend] Query execution error:', e);
      res.status(500).json({ error: e.message || 'Internal query processing failure' });
    }
  });

  // 7. Get messages (Q&A history) of specific user
  app.get('/api/messages', async (req, res) => {
    try {
      const userEmail = (req.headers['x-user-email'] as string) || 'anonymous';
      const messages = await vectorStore.getMessages(userEmail);
      res.json({ messages });
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Failed to retrieve messages' });
    }
  });

  // 8. Save messages (Q&A history) of specific user
  app.post('/api/messages', async (req, res) => {
    try {
      const userEmail = (req.headers['x-user-email'] as string) || 'anonymous';
      const { messages } = req.body;
      if (!Array.isArray(messages)) {
        return res.status(400).json({ error: 'Invalid messages body' });
      }
      await vectorStore.saveMessages(userEmail, messages);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Failed to save messages' });
    }
  });

  // === Admin APIs ===

  function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
    if ((req.headers['x-user-email'] as string) !== 'admin@amimind.com') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  }

  app.get('/api/admin/users', requireAdmin, async (req, res) => {
    try {
      const emails = await vectorStore.getAllUsers();
      const users = await Promise.all(emails.map(async email => {
        const docs = await vectorStore.getDocuments(email);
        const chunks = await vectorStore.getChunks(email);
        const messages = await vectorStore.getMessages(email);
        const timestamps = [
          ...docs.map(d => d.uploadDate),
          ...messages.map(m => m.timestamp),
        ].filter(Boolean).sort();
        return {
          email,
          docCount: docs.length,
          chunkCount: chunks.length,
          messageCount: messages.length,
          lastActive: timestamps.length ? timestamps[timestamps.length - 1] : null,
        };
      }));
      res.json({ users });
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Failed to list users' });
    }
  });

  app.get('/api/admin/users/:encodedEmail/documents', requireAdmin, async (req, res) => {
    try {
      const email = decodeURIComponent(req.params.encodedEmail);
      const docs = await vectorStore.getDocuments(email);
      res.json({ documents: docs });
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Failed to get documents' });
    }
  });

  app.get('/api/admin/users/:encodedEmail/messages', requireAdmin, async (req, res) => {
    try {
      const email = decodeURIComponent(req.params.encodedEmail);
      const messages = await vectorStore.getMessages(email);
      res.json({ messages });
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Failed to get messages' });
    }
  });

  // === Front-End Hosting integration ===
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('[Backend] Integrated Vite Middleware for live local development.');
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log('[Backend] Serving production dist static items.');
  }

  // Bind to 0.0.0.0 (Cloud Run / Docker Ingress requirements)
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] RAG Node stack active on: http://0.0.0.0:${PORT}`);
  });
}

startServer();
