# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
npm run dev        # Start dev server (tsx server.ts) — Express + Vite middleware on port 3000
npm run build      # Production build: Vite frontend + esbuild server bundle
npm run start      # Run production server from dist/server.cjs
npm run lint       # TypeScript type checking (tsc --noEmit)
npm run clean      # Remove dist/ and server.js
```

There are no tests in this repo.

## Architecture

AmiMind is a **RAG (Retrieval-Augmented Generation)** knowledge assistant with a single Express server that serves both the API and the React frontend.

### Backend Layer

- **`server.ts`** — Express server (port 3000, binds `0.0.0.0`). In dev, mounts Vite as middleware for HMR. In production, serves static files from `dist/`. Contains all REST API routes and the `chunkText()` utility (600-char chunks with 150-char overlap).
- **`server/vectorDb.ts`** — `VectorStore` class. JSON file-based storage per user (`db_stores/store_<encoded_email>.json`). On first access, seeds from `db_store.json` if it exists. Cosine similarity search with a 0.1 score threshold.
- **`server/geminiService.ts`** — `GeminiService` class. Despite the name, this uses **LangChain** (`ChatOpenAI`, `OpenAIEmbeddings`) with configurable base URL. Supports both OpenAI-compatible and Anthropic Messages API formats. Falls back to deterministic local embeddings when no API key or on API failure. Auto-detects SiliconFlow endpoints and adjusts models accordingly.
- **`server/configDb.ts`** — `ConfigDatabase` static class. Encrypts BASE_URL and API_KEY before writing to `db_stores/system_config.json`.
- **`server/cryptoUtils.ts`** — AES-256-CBC encryption with a key derived from `DB_ENCRYPTION_KEY` env var (has a hardcoded fallback).

### Frontend Layer

- **`src/App.tsx`** — Main app component with 3 built-in sample documents (`Product_Specs_2026.md`, `RAG_Engine_Tutorial.txt`, `Enterprise_FAQ_List.csv`) and agent templates for quick testing.
- **`src/components/Sidebar.tsx`** — Navigation sidebar with tabs: portal, RAG Q&A workspace, document management, and LLM config (admin only).
- **`src/components/InteractiveSimulator.tsx`** — Client-side cosine similarity demo with preset queries.
- **`src/components/LlmConfigManager.tsx`** — Full UI for configuring LLM provider (URL, API key, model mappings, API format).
- **`src/types.ts`** — Shared TypeScript interfaces (`Document`, `DocumentChunk`, `ChatMessage`, `Citation`, `LLMConfig`, etc.).

### Key Design Decisions

- **User scoping** is done via `x-user-email` header (defaults to `'anonymous'`). Each user gets a separate JSON store file.
- **Config persistence**: LLM settings are stored encrypted on disk via the `/api/config` endpoints. If no config exists, falls back to env vars (`BASE_URL`, `API_KEY`, `MODEL_NAME`, etc.).
- **The RAG pipeline** per query: embed question → cosine similarity against stored chunks → top-4 results → LangChain/Anthropic chat completion with context blocks injected into the prompt.
- **Docker support** exists (`Dockerfile.api`, `Dockerfile.web`, `docker-compose.yml`) for a 3-tier deployment (Nginx frontend, Express API, Qdrant), but the dev mode uses JSON file storage, not Qdrant.
