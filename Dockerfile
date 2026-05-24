# ==========================================
# Dockerfile for Hugging Face Spaces
# Single container: Vite frontend + Express API
# Port: 7860 (HF Spaces requirement)
# ==========================================

FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Build React frontend (Vite) + server bundle (esbuild)
RUN npm run build

# ---- Production image ----
FROM node:22-alpine

WORKDIR /app

# HF Spaces runs containers as UID 1000
RUN addgroup -S appgroup && adduser -S appuser -G appgroup --uid 1000

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

# Writable directory for JSON vector store
RUN mkdir -p db_stores && chown -R appuser:appgroup /app

USER appuser

EXPOSE 7860

ENV NODE_ENV=production
ENV PORT=7860

CMD ["node", "dist/server.cjs"]
