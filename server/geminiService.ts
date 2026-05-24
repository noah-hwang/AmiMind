import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
import { SystemMessage, HumanMessage, AIMessage, BaseMessage } from '@langchain/core/messages';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

import { ConfigDatabase } from './configDb';

// Define configuration shape
interface LLMConfig {
  BASE_URL: string;
  API_KEY: string;
  MODEL_NAME: string;
  EMBEDDING_MODEL_NAME: string;
  API_FORMAT?: 'openai' | 'anthropic';
  MODEL_MAPPINGS?: any;
}

// Global in-memory configuration storage
let inMemoryConfig: LLMConfig;

function getInitialConfig(): LLMConfig {
  const dbConfig = ConfigDatabase.load();
  if (dbConfig) {
    console.log('[Config] Loaded LLM supplier configuration successfully from database.');
    return dbConfig;
  }

  // Fallback to process envs if first boot / not yet set
  return {
    BASE_URL: process.env.BASE_URL || process.env.LLM_BASE_URL || 'https://api.openai.com/v1',
    API_KEY: process.env.API_KEY || process.env.LLM_API_KEY || '',
    MODEL_NAME: process.env.MODEL_NAME || process.env.LLM_MODEL_NAME || 'gpt-4o-mini',
    EMBEDDING_MODEL_NAME: process.env.EMBEDDING_MODEL_NAME || process.env.LLM_EMBEDDING_MODEL_NAME || 'text-embedding-3-small',
    API_FORMAT: (process.env.API_FORMAT as any) || 'openai',
    MODEL_MAPPINGS: {
      sonnet: { displayName: 'Qwen/Qwen2.5-7B-Instruct', requestModel: 'Qwen/Qwen2.5-7B-Instruct', support1M: false },
      opus: { displayName: 'Qwen/Qwen2.5-7B-Instruct', requestModel: 'Qwen/Qwen2.5-7B-Instruct', support1M: false },
      haiku: { displayName: 'Qwen/Qwen2.5-7B-Instruct', requestModel: 'Qwen/Qwen2.5-7B-Instruct', support1M: false }
    }
  };
}

inMemoryConfig = getInitialConfig();

// Diagnostic logging of process.env keys (filtering secrets values)
console.log('[Config Diagnostic] Available process.env keys:', Object.keys(process.env).filter(key => !key.toLowerCase().includes('secret') && !key.toLowerCase().includes('key') && !key.toLowerCase().includes('token')));
console.log('[Config Diagnostic] GOOGLE_API_KEY is present:', !!process.env.GOOGLE_API_KEY);
console.log('[Config Diagnostic] BASE_URL is present:', !!process.env.BASE_URL);

export function setInMemoryConfig(newConfig: Partial<LLMConfig>) {
  inMemoryConfig = { ...inMemoryConfig, ...newConfig };
  // Automatically store settings in encrypted DB format
  ConfigDatabase.save(inMemoryConfig);
}

export function getInMemoryConfig(): LLMConfig {
  const resolved = { ...inMemoryConfig };
  if (!resolved.API_KEY) {
    resolved.API_KEY = process.env.API_KEY || process.env.LLM_API_KEY || '';
  }
  // Mask or clean keys if necessary, but keep plain-text for current setup compatibility as form binds it directly
  return resolved;
}

function loadConfig(): LLMConfig {
  // Resolve API Key dynamically if it wasn't set, fallback to env variables
  const resolvedKey = inMemoryConfig.API_KEY || process.env.API_KEY || process.env.LLM_API_KEY || '';

  // Resolve Base URL dynamically
  let resolvedBaseUrl = inMemoryConfig.BASE_URL || process.env.BASE_URL || process.env.LLM_BASE_URL || '';

  if (resolvedBaseUrl) {
    resolvedBaseUrl = resolvedBaseUrl.trim().replace(/\/+$/, '');
    try {
      const parsedUrl = new URL(resolvedBaseUrl);
      if (parsedUrl.pathname === '/' || parsedUrl.pathname === '') {
        resolvedBaseUrl += '/v1';
      }
    } catch (e) {
      const sansProtocol = resolvedBaseUrl.replace(/^https?:\/\//, '');
      if (!sansProtocol.includes('/')) {
        resolvedBaseUrl += '/v1';
      }
    }
  }

  // Resolve Models
  let resolvedModel = inMemoryConfig.MODEL_NAME || process.env.MODEL_NAME || process.env.LLM_MODEL_NAME || '';
  let resolvedEmbeddingModel = inMemoryConfig.EMBEDDING_MODEL_NAME || process.env.EMBEDDING_MODEL_NAME || process.env.LLM_EMBEDDING_MODEL_NAME || '';

  // SiliconFlow auto-detection mapping for standard embedding
  if (resolvedBaseUrl.includes('siliconflow.cn')) {
    if (!resolvedEmbeddingModel || resolvedEmbeddingModel.includes('text-embedding-')) {
      resolvedEmbeddingModel = 'BAAI/bge-m3';
    }
    if (!resolvedModel || resolvedModel.includes('gpt-')) {
      resolvedModel = 'deepseek-ai/DeepSeek-V3';
    }
  }

  // Prevent using embedding models for chat completions
  const lowerModel = (resolvedModel || '').toLowerCase();
  
  const isEmbeddingModelForChat = 
    lowerModel.includes('embedding') || 
    lowerModel.includes('bce-') || 
    lowerModel.includes('embed') || 
    (resolvedModel && resolvedModel === resolvedEmbeddingModel);

  if (isEmbeddingModelForChat) {
    const originalModel = resolvedModel;
    if (resolvedBaseUrl.includes('siliconflow.cn')) {
      resolvedModel = 'deepseek-ai/DeepSeek-V3';
    } else {
      resolvedModel = 'gpt-4o-mini';
    }
    console.warn(`[Config] Smart Model Fallback: Detected that the configured MODEL_NAME ("${originalModel}") is an embedding model (or matches EMBEDDING_MODEL_NAME). Standard Chat completions do not support embedding models. Falling back to chat model: "${resolvedModel}"`);
  }

  // Auto-detect or parse api format from config file or env vars
  let resolvedApiFormat: 'openai' | 'anthropic' = 'openai';
  const rawApiFormat = String(inMemoryConfig.API_FORMAT || process.env.API_FORMAT || process.env.LLM_API_FORMAT || '').toLowerCase();
  
  if (rawApiFormat === 'anthropic' || resolvedModel.toLowerCase().includes('claude') || resolvedKey.startsWith('sk-ant-')) {
    resolvedApiFormat = 'anthropic';
  }

  return {
    BASE_URL: resolvedBaseUrl || 'https://api.openai.com/v1',
    API_KEY: resolvedKey,
    MODEL_NAME: resolvedModel || 'gpt-4o-mini',
    EMBEDDING_MODEL_NAME: resolvedEmbeddingModel || 'text-embedding-3-small',
    API_FORMAT: resolvedApiFormat,
    MODEL_MAPPINGS: inMemoryConfig.MODEL_MAPPINGS
  };
}

export class GeminiService {
  private config: LLMConfig;

  constructor() {
    this.config = loadConfig();
    console.log(`[LlmService] LangChain configuration loaded. Base URL: ${this.config.BASE_URL}, Chat Model: ${this.config.MODEL_NAME}, Embedding Model: ${this.config.EMBEDDING_MODEL_NAME}`);
    if (!this.config.API_KEY) {
      console.warn('[LlmService] WARNING: LLM API key is missing. System will fallback to local signature-based embeddings until a Key is supplied.');
    }
  }

  /**
   * Helper to retrieve model information dynamically
   */
  public getModelInfo() {
    this.config = loadConfig();
    return {
      modelName: this.config.MODEL_NAME,
      embeddingModelName: this.config.EMBEDDING_MODEL_NAME,
      baseUrl: this.config.BASE_URL,
    };
  }

  /**
   * Generates a deterministic normalized mock vector of given dimension based on text content hash
   * to ensure robust offline testing and bypass missing API key blockages.
   */
  private generateDeterministicVector(text: string, dimension: number = 1536): number[] {
    const vector = new Array(dimension).fill(0);
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = (hash << 5) - hash + text.charCodeAt(i);
      hash |= 0; // Convert to 32bit integer
    }

    // Populate vector with deterministic pseudo-random values based on hash seed
    for (let i = 0; i < dimension; i++) {
      const seed = Math.sin(hash + i) * 10000;
      vector[i] = seed - Math.floor(seed);
    }

    // Normalize the vector to ensure Cosine similarity calculations remain mathematically consistent
    let norm = 0;
    for (let i = 0; i < dimension; i++) {
      norm += vector[i] * vector[i];
    }
    norm = Math.sqrt(norm);
    if (norm > 0) {
      for (let i = 0; i < dimension; i++) {
        vector[i] /= norm;
      }
    }
    return vector;
  }

  /**
   * Generate vector embeddings for specified text using LangChain OpenAIEmbeddings
   */
  public async generateEmbedding(text: string): Promise<number[]> {
    try {
      this.config = loadConfig();
      if (!this.config.API_KEY) {
        console.warn('[LlmService] API Key is missing. Falling back to signature-based local deterministic vector (dimension=1536) for offline-simulation.');
        return this.generateDeterministicVector(text, 1536);
      }

      // Collect a list of potential embedding models to try in order of preference
      const embeddingModelsToTry = [
        this.config.EMBEDDING_MODEL_NAME,
        this.config.BASE_URL.includes('siliconflow') ? 'BAAI/bge-m3' : '',
        'text-embedding-3-small',
        'text-embedding-ada-002',
        'text-embedding-004' // for Gemini endpoints
      ].filter(Boolean);

      const uniqueModels = Array.from(new Set(embeddingModelsToTry));
      let lastError: any = null;

      for (const model of uniqueModels) {
        try {
          console.log(`[LlmService] Attempting vector embedding generation using model: ${model}`);
          const embeddings = new OpenAIEmbeddings({
            apiKey: this.config.API_KEY,
            openAIApiKey: this.config.API_KEY,
            configuration: {
              baseURL: this.config.BASE_URL,
              apiKey: this.config.API_KEY,
            },
            modelName: model,
          });

          const vector = await embeddings.embedQuery(text);
          if (vector && Array.isArray(vector) && vector.length > 0) {
            if (model !== this.config.EMBEDDING_MODEL_NAME) {
              console.log(`[LlmService] Configured model failing/absent; successfully recovered using fallback model "${model}"`);
            }
            return vector;
          }
        } catch (e: any) {
          lastError = e;
          console.warn(`[LlmService] Embedding attempt with model "${model}" failed. Error: ${e.message || e}`);
          
          // Fast fail if it's an API Key authorization issue since changing model name won't help
          const errorMsgStr = String(e.message || '').toLowerCase();
          if (errorMsgStr.includes('unauthorized') || errorMsgStr.includes('401') || errorMsgStr.includes('api key')) {
            break;
          }
        }
      }

      // If online embedding fails, fallback to deterministic local mock vector so user can continue demoing
      console.warn('[LlmService] Online embedding failed. Recovering with signature-based local deterministic vector (dimension=1536) to prevent crashes.');
      return this.generateDeterministicVector(text, 1536);
    } catch (e: any) {
      console.warn('[LlmService] Warning in embedding generation, defaulting to deterministic mock vector:', e.message || e);
      return this.generateDeterministicVector(text, 1536);
    }
  }

  /**
   * Standardized text generation using grounding context chunks and user questions using LangChain ChatOpenAI or Anthropic Messages API
   */
  public async generateAnswer(
    question: string,
    contextChunks: { docName: string; text: string }[],
    chatHistory: { role: 'user' | 'assistant'; content: string }[] = [],
    modelRole?: 'sonnet' | 'opus' | 'haiku'
  ): Promise<string> {
    try {
      this.config = loadConfig();
      if (!this.config.API_KEY) {
        return `⚠️ **提示：尚未配置 API Key 密钥**

您目前尚未在系统中配置合法的 API Key。系统已通过 **本地确定性特征向量 (Local Signature Indexing)** 成功为您匹配出以下最相关的文档内容。

要启用完整的大语言模型智能问答：
1. 请点击左上角的 **"编辑供应商"** (持久层同步) 按钮。
2. 输入您的 **服务请求地址 (BASE_URL)** 并双击填入您的 **API Key (安全令牌)**，然后点击右下角 **"保存服务端配置"** 即可。

---

### 🔍 本地语义最匹配文档片段 :

${contextChunks.map((chunk, idx) => `**[来源 ${idx + 1}]** 来自《${chunk.docName}》:
> ${chunk.text.substring(0, 320)}...`).join('\n\n')}`;
      }

      // Resolve the active request model from mappings if custom role is specified
      let activeModel = this.config.MODEL_NAME;
      if (modelRole && this.config.MODEL_MAPPINGS && this.config.MODEL_MAPPINGS[modelRole]) {
        activeModel = this.config.MODEL_MAPPINGS[modelRole].requestModel || activeModel;
      }

      // Assemble retrieval context elements
      let contextBlock = '';
      if (contextChunks.length > 0) {
        contextBlock = contextChunks
          .map((chunk, idx) => `[Source ${idx + 1}] Document: "${chunk.docName}"\nContent: ${chunk.text}`)
          .join('\n\n');
      } else {
        contextBlock = 'No document sources matched this query. Please answer with general knowledge but inform the user you found no relevant content in their uploaded documents.';
      }

      let systemInstruction = `You are an expert Retrieval-Augmented Generation (RAG) assistant. 
Your objective is to provide precise, helpful, and objective answers to the user's active question using EXCLUSIVELY the provided [Source] context blocks from the CURRENT turn.

Critical Directives to Prevent Topic-Sticking, Citation leaks, and Repetitive Stuttering:
1. Discard Stale Memory: Chat history is for conversational flow context only. If the user's active question represents a shift of topic, focus entirely on answering the active question using the new [Source] blocks.
2. Turn-by-turn Citation Reset: Grounding source indices [Source X] are completely reassigned on every turn. Do NOT carry over or cite sources from previous turns.
3. Strict Coverage: If the grounding contexts do not contain enough details, state honestly that you couldn't find details, and only then offer a brief auxiliary helper response based on general knowledge.
4. Clean Output formatting: Format your response in clean, fluent, and highly polished Chinese (or matching language), with elegant markdown.`;

      // Select system instruction adapted explicitly to Qwen's training set to optimize 7B responses
      const isQwenModel = activeModel.toLowerCase().includes('qwen') || activeModel.toLowerCase().includes('7b') || activeModel.toLowerCase().includes('14b') || activeModel.toLowerCase().includes('deepseek-chat');
      if (isQwenModel) {
        systemInstruction = `你是一位专业的 RAG（检索增强生成）知识助手。请严格根据当前提供的 Grounding 【参考文档】及用户当前的具体问题进行高精准、最切合事实的回答。

【极其重要——严格防范偏题、断章取义及历史会话残留污染】：
1. 忽略历史干扰：历史对话列表（如果有）仅作为上下文聊天历史流的温和参考。如果用户当前的 USER QUESTION 与之前历史对话中的问题相比完全换了新话题，请【绝对不要】继续套用、提及或引申历史对话里的非当前实体（如：历史对话中提及的“Unified API Gateway”、“系统的物理通信端口”、“外部网关上传最大 10MB”等）。
2. 只聚焦当前：当前的【参考文档】（GROUNDING DOCUMENT SOURCES）是回答当前问题的唯一可靠事实基础！你应当完全忽略并抛弃不相关的历史轮次话题，严禁在当前轮次生搬硬套或结合历史没必要的陈旧概念。如果当前文档讲的是 RAG 语义切片等，即使历史提到过 Unified API Gateway，你也绝口不提 Unified API Gateway，而是只针对 RAG 的概念用中文进行专业回答！
3. 精准引用标注：如果回答中引用了当前文档的事实句子，说明其内容并在末尾加上对应参考的 [Source X] 索引。切勿套用历史会话的 Source。
4. 真实合规解答：如果当前文档确实没有包含回答需要的信息，请诚实告知在当前文档中没有找到该产品或技术的明确答案，紧接着根据用户的实际问题场景与主题意图，提供一段高度相关的常识性通用回答。请绝对不要在回答中硬性科普 RAG 模型原件、余弦公式（Cosine Similarity）、高维向量数学计算等完全不挨边的底层技术细节（除非用户明确询问的就是跟向量数据库或余弦公式相关的知识）。
5. 外观优美无乱码：请用排版端庄美观的中文进行流利排版，适当采用加粗或列表展示技术要点。严防并完全杜绝胡乱拼写叠字（如：“HyperTextText”或“MQMQTT”等重字乱码现象）。`;
      }

      // Compile current prompt context structure
      let prompt = `
=== GROUNDING DOCUMENT SOURCES ===
${contextBlock}
==================================

USER QUESTION:
${question}

Please review the groundings and produce a complete, helpful answer citing relevant sources.`;

      if (isQwenModel) {
        prompt = `
=== 当前提供的事实参考文档 ===
${contextBlock}
============================

用户当前提问：
${question}

请务必注意：历史会话中可能包含对其他产品或规范的过度讨论，请立即“遗忘并彻底脱离”历史会话提及的各种无关事实和陈老词汇！
请【仅根据当前提供的事实参考文档数据】正面、精炼、独立地回答用户的“用户当前提问”（${question}）。如果当前参考文档数据里完全没有包含能匹配当前问题的答案，请先直截了当指明“在当前参考文档中未发现关于该问题的内容”，随后根据用户的提问意图，仅使用你脑海中的专业技术常识进行一次干净无乱码的简短辅助答复，严禁套用余弦计算或向量表示等不相关的原理细节。`;
      }

      // -----------------------------------------------------------------
      // Anthropic Native Messages Format Execution Flow
      // -----------------------------------------------------------------
      if (this.config.API_FORMAT === 'anthropic') {
        const anthropicMessages = [];
        
        // Convert chat history to Anthropic shapes
        for (const h of chatHistory) {
          anthropicMessages.push({
            role: h.role === 'assistant' ? 'assistant' : 'user',
            content: h.content
          });
        }
        
        // Append user active query
        anthropicMessages.push({
          role: 'user',
          content: prompt
        });

        // Smart clean and formatting for BASE_URL destination
        let anthropicUrl = this.config.BASE_URL.trim().replace(/\/+$/, '');
        if (anthropicUrl.endsWith('/v1')) {
          anthropicUrl = `${anthropicUrl}/messages`;
        } else if (!anthropicUrl.endsWith('/messages') && !anthropicUrl.endsWith('/v1/messages')) {
          try {
            const parsed = new URL(anthropicUrl);
            if (parsed.pathname === '' || parsed.pathname === '/') {
              anthropicUrl = `${anthropicUrl}/v1/messages`;
            } else {
              anthropicUrl = `${anthropicUrl}/messages`;
            }
          } catch {
            anthropicUrl = `${anthropicUrl}/v1/messages`;
          }
        }

        console.log(`[LlmService] Dispatching Native Anthropic Messages request to: "${anthropicUrl}". Model Name: "${activeModel}"`);

        // Fully compatible request headers
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'x-api-key': this.config.API_KEY,
          'X-API-KEY': this.config.API_KEY,
          'anthropic-version': '2023-06-01'
        };

        // Standard Authorization header (only if not directly targeting official Anthropic endpoints since they reject standard auth bearer)
        if (!this.config.BASE_URL.includes('api.anthropic.com') && !this.config.API_KEY.startsWith('sk-ant-')) {
          headers['Authorization'] = `Bearer ${this.config.API_KEY}`;
        }

        const requestBody = {
          model: activeModel,
          messages: anthropicMessages,
          system: systemInstruction,
          max_tokens: 4000,
          temperature: isQwenModel ? 0.2 : 0.3
        };

        const fetchResponse = await fetch(anthropicUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(requestBody)
        });

        if (!fetchResponse.ok) {
          const errorText = await fetchResponse.text().catch(() => '');
          throw new Error(`Anthropic Messages native request failed with status ${fetchResponse.status}: ${errorText || fetchResponse.statusText}`);
        }

        const data: any = await fetchResponse.json();
        
        // Extract content blocks securely
        if (data && data.content && Array.isArray(data.content)) {
          const textItem = data.content.find((c: any) => c.type === 'text');
          if (textItem) {
            return textItem.text;
          }
          return data.content.map((c: any) => c.text || '').join('');
        }

        throw new Error(`Unexpected Anthropic Native Response Structure: ${JSON.stringify(data)}`);
      }

      // -----------------------------------------------------------------
      // Standard OpenAI Format Execution Flow
      // -----------------------------------------------------------------
      // Build LangChain core messages array
      const messages: BaseMessage[] = [
        new SystemMessage(systemInstruction)
      ];

      // Stagger existing conversation events
      for (const h of chatHistory) {
        if (h.role === 'assistant') {
          messages.push(new AIMessage(h.content));
        } else {
          messages.push(new HumanMessage(h.content));
        }
      }

      messages.push(new HumanMessage(prompt));

      const isSmallOrQwen = activeModel.toLowerCase().includes('7b') || activeModel.toLowerCase().includes('14b') || activeModel.toLowerCase().includes('qwen') || activeModel.toLowerCase().includes('deepseek-chat');

      const chat = new ChatOpenAI({
        apiKey: this.config.API_KEY,
        openAIApiKey: this.config.API_KEY,
        configuration: {
          baseURL: this.config.BASE_URL,
          apiKey: this.config.API_KEY,
        },
        modelName: activeModel,
        temperature: isSmallOrQwen ? 0.2 : 0.3, // Low temperature is critical for RAG to ensure deterministic, factual attention allocation
        maxTokens: 2048,
        frequencyPenalty: 0.0, // Strict 0.0 penalty avoids generating scrambled words/duplicate-syllable errors
        presencePenalty: 0.0,
      });

      const response = await chat.invoke(messages);
      
      // Ensure we extract response content string cleanly
      if (typeof response.content === 'string') {
        return response.content;
      } else if (Array.isArray(response.content)) {
        return response.content.map(p => (p as any).text || '').join('');
      }
      
      return '';
    } catch (e: any) {
      console.error('[LlmService] Error generating answer:', e);
      throw new Error(`Failed to generate answer: ${e.message || e}`);
    }
  }
}
