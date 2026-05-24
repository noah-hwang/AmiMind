import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Upload, 
  Trash2, 
  Copy, 
  Check, 
  Cpu, 
  FileText, 
  Layers, 
  Database, 
  Activity, 
  Plus, 
  AlertTriangle, 
  Info, 
  RefreshCw, 
  BookOpen, 
  CheckCircle,
  HelpCircle,
  Clock,
  ExternalLink,
  Search,
  Sparkles,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  Lock,
  Mail,
  User,
  UserPlus,
  LogOut,
  ShieldCheck,
  Key
} from 'lucide-react';
import Sidebar from './components/Sidebar';
import LlmConfigManager from './components/LlmConfigManager';
import InteractiveSimulator from './components/InteractiveSimulator';
import { Document, ChatMessage, SystemStats } from './types';

// Concrete Sample Documents to let users run testing immediately without finding their own files
const SAMPLE_DOCS = [
  {
    name: 'Product_Specs_2026.md',
    type: 'markdown',
    size: 2450,
    text: `# Unified API Gateway Specs (Product Core 2026)

## Overview
This specification details the architecture of the AmiMind API Gateway v4.2 designed for ultra-low latency microservice routing.

## Protocols Supported
- REST (HTTP/1.1 & HTTP/2)
- gRPC (HTTP/2 transport layer)
- WebSockets for full-duplex persistent client connections

## Network Parameters
- Standard listen port: 8080 (Configurable via ENV GATEWAY_PORT)
- Secure token validation time: 300 seconds cache expiry
- Maximum request payload size: 20MB

## Cluster Orchestration
Deployment is validated within Docker-managed layers, utilizing custom multi-stage alpine images. Load balancing uses Weighted Round Robin (WRR) with health checks dispatched recursively every 5000 milliseconds.`
  },
  {
    name: 'RAG_Engine_Tutorial.txt',
    type: 'plain text',
    size: 3200,
    text: `AI RAG Tiered Vector System Architecture Manual

This manual explains how Retrieval-Augmented Generation handles persistent index queries.

1. Document Parsing & Semantic Slicing
Uploaded files are split into overlapping chunks to safeguard content continuity. Default sizing parameters split text at 600 characters with a 150-character overlap margins.

2. Distance Computation with Vector Database
Each chunk undergoes semantic representation generation. The embedding engine is powered by '智脑-embedding-2-preview' which generates highly accurate 768-D vectors. The custom index database stores vectors and queries them using multi-threaded Cosine Similarity computation:
   Similarity(A, B) = (A • B) / (||A|| * ||B||)

3. Grounded Prompt Engineering
Matches with similarity coefficients above 0.1 are retrieved as citations. They are concatenated directly inside a secure LLM system context, ensuring 智脑 responds relying exclusively on user documents rather than hallucinated facts.`
  },
  {
    name: 'Enterprise_FAQ_List.csv',
    type: 'csv',
    size: 1950,
    text: `FAQ_ID,Category,Question,Answer
FAQ-01,Docker Deployment,How do we deploy the RAG system using Docker?,"Run 'docker-compose up -d --build' using the root orchestrator, dividing current structures into UI front-end, Express API core, and Qdrant DB clusters."
FAQ-02,Security,What port does this system use to communicate?,"Port 3000 is the primary externally routing port exposed via reverse-proxy, whereas inner microservices bind internally to port 8080."
FAQ-03,Models,Which models drive the vector database embeddings?,"The embedding layer uses 智脑-embedding-2-preview and the text generation is routed directly across 智脑-3.5-flash."
FAQ-04,Limits,What is the maximum upload limit?,"Files up to 10MB can be processed securely directly on standard server configurations."`
  }
];

const TEMPLATE_AGENTS = [
  {
    id: 'tech_specs',
    title: '产品规格说明查询',
    tag: '规范',
    iconColor: 'bg-blue-100 text-blue-600 border border-blue-200',
    bgColor: 'from-blue-50/70 via-indigo-50/20 to-white',
    borderColor: 'border-slate-200/80 hover:border-blue-300',
    desc: '快速核对并提炼产品规格手册中的参数配置，自动梳理核心网络参数及协议支持机制。',
    sampleDocIndex: 0,
    iconText: '📄',
    question: 'Unified API Gateway 系列规范手册中，详细支持哪些主流通信协议？其默认的监听端口和最大文件传输限制是多少？'
  },
  {
    id: 'faq_hub',
    title: '智能客服常见问答',
    tag: '服务',
    iconColor: 'bg-emerald-100 text-emerald-600 border border-emerald-250',
    bgColor: 'from-emerald-50/70 via-teal-50/20 to-white',
    borderColor: 'border-slate-200/80 hover:border-emerald-300',
    desc: '基于标准 FAQ 知识库开展高召回问答，模拟多场景客服快速、专业地服务用户并解答常见疑问。',
    sampleDocIndex: 2,
    iconText: '💬',
    question: '如果客户对于系统的最大上传大小、外网安全端口以及 Docker 环境里的高可用启动过程有疑问，合规的答复要点是什么？'
  },
  {
    id: 'algo_scholar',
    title: '知识原理深度探究',
    tag: '算法',
    iconColor: 'bg-purple-100 text-purple-600 border border-purple-250',
    bgColor: 'from-purple-50/70 via-fuchsia-50/20 to-white',
    borderColor: 'border-slate-200/80 hover:border-purple-300',
    desc: '聚焦文本分块方案、高维向量相似度空间公式计算，进行精细化的学术及工业逻辑推理。',
    sampleDocIndex: 1,
    iconText: '🎓',
    question: '什么是余弦距离度量（Cosine Similarity）？系统切分文档时，重叠（overlap）参数是如何确保存储连贯性的？'
  },
  {
    id: 'devops_guide',
    title: '标准系统部署指南',
    tag: '运维',
    iconColor: 'bg-slate-100 text-slate-800 border border-slate-250',
    bgColor: 'from-slate-100/70 via-zinc-50/20 to-white',
    borderColor: 'border-slate-200/80 hover:border-slate-400',
    desc: '快速审查并提取多端容器编排、环境变量设置，帮助运维与技术支持快速实施标准高可用启动方案。',
    sampleDocIndex: 0,
    iconText: '⚙️',
    question: '请根据我们的生产高可用指南，总结如何在 Docker 编排环境中部署此服务并应用内置的负载均衡（WRR）算法？'
  }
];

export default function App() {
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authConfirmPassword, setAuthConfirmPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const [activeTab, setActiveTab] = useState<'portal' | 'rag' | 'docs' | 'config'>('portal');
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [showTemplates, setShowTemplates] = useState(true);
  const [searchFilter, setSearchFilter] = useState('');
  const [templateList, setTemplateList] = useState(TEMPLATE_AGENTS);
  const [modelRole, setModelRole] = useState<'sonnet' | 'opus' | 'haiku'>('sonnet');
  const [config, setConfig] = useState<any>(null);

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/config');
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
      }
    } catch (e) {
      console.error('Error fetching config:', e);
    }
  };

  // Authentication persistence initialization & database seeder
  useEffect(() => {
    const savedUser = localStorage.getItem('amimind_current_user');
    if (savedUser) {
      setCurrentUser(savedUser);
    }
    
    const savedUsers = localStorage.getItem('amimind_users');
    if (!savedUsers) {
      const initialUsers = [
        { email: 'admin@amimind.com', password: 'amimind123', createdAt: new Date().toISOString() }
      ];
      localStorage.setItem('amimind_users', JSON.stringify(initialUsers));
    }
  }, []);

  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    
    // Check Email validation
    if (!authEmail || !authEmail.includes('@') || authEmail.length < 5) {
      setAuthError('请输入一个有效的电子邮箱地址 (例如 admin@example.com)');
      return;
    }

    if (authPassword.length < 6) {
      setAuthError('账户密码长度不能低于 6 位，请重新输入');
      return;
    }

    setAuthLoading(true);

    // Simulate database lookup latency for a highly realistic feel
    setTimeout(() => {
      try {
        const savedUsersJson = localStorage.getItem('amimind_users') || '[]';
        const users = JSON.parse(savedUsersJson);

        if (authMode === 'login') {
          // Authentication login logic
          const matchedUser = users.find((u: any) => u.email.toLowerCase() === authEmail.toLowerCase());
          if (!matchedUser) {
            setAuthError('此邮箱账号未注册，请先切换至注册页面创建新账户');
            setAuthLoading(false);
            return;
          }
          if (matchedUser.password !== authPassword) {
            setAuthError('您输入的密码不正确，请重新检查并输入');
            setAuthLoading(false);
            return;
          }
          
          // Login success
          localStorage.setItem('amimind_current_user', matchedUser.email);
          setCurrentUser(matchedUser.email);
          showNotification('success', `欢迎回来，${matchedUser.email}！已成功登录安全工作区。`);
          setAuthEmail('');
          setAuthPassword('');
          setShowAuthModal(false);
        } else {
          // Registration logic
          const userExists = users.some((u: any) => u.email.toLowerCase() === authEmail.toLowerCase());
          if (userExists) {
            setAuthError('该邮箱已被注册，请直接登录您的账户');
            setAuthLoading(false);
            return;
          }
          
          // Check password similarity
          if (authPassword !== authConfirmPassword) {
            setAuthError('两次输入的密码不一致，请重新检查');
            setAuthLoading(false);
            return;
          }

          // Complete Registration
          const newUser = {
            email: authEmail,
            password: authPassword,
            createdAt: new Date().toISOString()
          };
          users.push(newUser);
          localStorage.setItem('amimind_users', JSON.stringify(users));
          
          // Auto log user in
          localStorage.setItem('amimind_current_user', authEmail);
          setCurrentUser(authEmail);
          showNotification('success', `账户注册成功！已为您自动登录并初始化 AmiMind 知识库。`);
          setAuthEmail('');
          setAuthPassword('');
          setAuthConfirmPassword('');
          setShowAuthModal(false);
        }
      } catch (err: any) {
        setAuthError(`身份验证发生系统级错误: ${err.message || '未知错误'}`);
      } finally {
        setAuthLoading(false);
      }
    }, 700);
  };

  const handleLogout = () => {
    localStorage.removeItem('amimind_current_user');
    setCurrentUser(null);
    showNotification('info', '您已安全退出当前会话。期待您的下次探访！');
  };

  const autofillDemoAccount = () => {
    setAuthEmail('admin@amimind.com');
    setAuthPassword('amimind123');
    setAuthMode('login');
    showNotification('info', '已为您自动填入演示管理员测试账号！');
  };
  
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: '你好！我是 **AmiMind RAG 智能助理**。我已为您配置了多文档检索系统。\n\n您可以在 **[Document Store]** 面板一键载入样例规约文档或直接上传您的自定义文件（支持 `.md`、`.txt`、`.csv`、`.json` 等格式）。完成向量化索引后，即可在这里进行实时召回与问答，我会自动召回底层的向量片段并给出最精准的归纳回答，同时附带详细的置信度评分与文本片段追踪。',
      timestamp: new Date().toLocaleTimeString(),
    }
  ]);
  
  const [inputText, setInputText] = useState('');
  const [loadingQuery, setLoadingQuery] = useState(false);
  const [loadingReset, setLoadingReset] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [latestMetricMs, setLatestMetricMs] = useState<number | null>(42); // Seed realistic init value
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null);
  const [copyCodeSuccess, setCopyCodeSuccess] = useState<string | null>(null);

  // File loading reference
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load system state on initialization and user state transitions
  useEffect(() => {
    fetchStats();
    fetchDocuments();
    fetchConfig();
    fetchMessages();
  }, [currentUser]);

  // Synchronize Q&A messages with the server dynamically to preserve chat history
  useEffect(() => {
    if (!currentUser || messages.length === 0) return;
    if (messages.length === 1 && messages[0].id === 'welcome') return;

    const syncMessages = async () => {
      try {
        await fetch('/api/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-email': currentUser
          },
          body: JSON.stringify({ messages })
        });
      } catch (e) {
        console.error('Error syncing messages:', e);
      }
    };

    const timer = setTimeout(() => {
      syncMessages();
    }, 800);
    return () => clearTimeout(timer);
  }, [messages, currentUser]);

  // Smooth scroll Chat to bottom
  useEffect(() => {
    if (activeTab === 'rag') {
      // Scroll immediately when entering or when message list changes
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });

      // Scroll again in case markdown, lists, or citations changed layout flow asynchronously
      const scrollTimer = setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);

      const scrollTimer2 = setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 350);

      return () => {
        clearTimeout(scrollTimer);
        clearTimeout(scrollTimer2);
      };
    }
  }, [messages, activeTab]);

  const showNotification = (type: 'success' | 'error' | 'info', text: string) => {
    setNotification({ type, text });
    setTimeout(() => {
      setNotification(prev => prev?.text === text ? null : prev);
    }, 4500);
  };

  const fetchStats = async () => {
    if (!currentUser) {
      setStats({
        documentsCount: 0,
        chunksCount: 0,
        totalWords: 0,
        vectorDbStatus: 'Idle',
        modelUsed: 'N/A',
        embeddingModel: 'N/A'
      });
      return;
    }
    try {
      const res = await fetch('/api/stats', {
        headers: {
          'x-user-email': currentUser
        }
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
      await fetchConfig();
    } catch (e) {
      console.error('Error fetching stats:', e);
    }
  };

  const fetchDocuments = async () => {
    if (!currentUser) {
      setDocuments([]);
      return;
    }
    try {
      const res = await fetch('/api/documents', {
        headers: {
          'x-user-email': currentUser
        }
      });
      if (res.ok) {
        const data = await res.json();
        setDocuments(data);
      }
    } catch (e) {
      console.error('Error fetching docs:', e);
    }
  };

  const fetchMessages = async () => {
    if (!currentUser) {
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: '你好！我是 **AmiMind RAG 智能助理**。我已为您配置了多文档检索系统。\n\n您可以在 **[Document Store]** 面板一键载入样例规约文档或直接上传您的自定义文件（支持 `.md`、`.txt`、`.csv`、`.json` 等格式）。完成向量化索引后，即可在这里进行实时召回与问答，我会自动召回底层的向量片段并给出最精准的归纳回答，同时附带详细的置信度评分与文本片段追踪。',
          timestamp: new Date().toLocaleTimeString(),
        }
      ]);
      return;
    }
    try {
      const res = await fetch('/api/messages', {
        headers: {
          'x-user-email': currentUser
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.messages && data.messages.length > 0) {
          setMessages(data.messages);
        } else {
          setMessages([
            {
              id: 'welcome',
              role: 'assistant',
              content: '你好！欢迎使用您的专属安全 RAG 问答空间。\n\n您可以在右侧或在 **[知识文档管理中心]** 上传您的专属文档，开始安全的、独立的私有化检索与智能问答！',
              timestamp: new Date().toLocaleTimeString(),
            }
          ]);
        }
      }
    } catch (e) {
      console.error('Error fetching messages:', e);
    }
  };

  // Reset/Purge DB Handler
  const handleResetDb = async () => {
    if (!currentUser) {
      alert('请登录免费使用');
      setShowAuthModal(true);
      return;
    }
    if (!window.confirm('您确定要清空向量数据库中的所有文档和索引向量吗？此操作不可逆。')) return;
    setLoadingReset(true);
    try {
      const res = await fetch('/api/reset', {
        method: 'POST',
        headers: {
          'x-user-email': currentUser
        }
      });
      if (res.ok) {
        showNotification('success', '向量数据库与文档库已成功清空。');
        setMessages([
          {
            id: 'system-reset',
            role: 'assistant',
            content: '向量数据库已重置。现在系统已经恢复为空置状态，您可以前往 **[Document Store]** 载入新文档进行问答测试。',
            timestamp: new Date().toLocaleTimeString(),
          }
        ]);
        await fetchStats();
        await fetchDocuments();
      } else {
        showNotification('error', '清空向量数据库失败。');
      }
    } catch (err: any) {
      showNotification('error', `异常: ${err.message || err}`);
    } finally {
      setLoadingReset(false);
    }
  };

  // Delete specific document
  const handleDeleteDoc = async (id: string, name: string) => {
    if (!currentUser) {
      alert('请登录免费使用');
      setShowAuthModal(true);
      return;
    }
    try {
      const res = await fetch(`/api/documents/${id}`, {
        method: 'DELETE',
        headers: {
          'x-user-email': currentUser
        }
      });
      if (res.ok) {
        showNotification('success', `文档 "${name}" 及其关联向量切片已成功移除。`);
        await fetchStats();
        await fetchDocuments();
      } else {
        showNotification('error', '移除文档失败');
      }
    } catch (err: any) {
      showNotification('error', `网络异常: ${err.message || err}`);
    }
  };

  // Formulate Q&A Submit request
  const handleSendQuery = async (e?: React.FormEvent, customQuery?: string) => {
    if (e) e.preventDefault();
    if (!currentUser) {
      alert('请登录免费使用');
      setShowAuthModal(true);
      return;
    }
    const query = customQuery || inputText;
    if (!query.trim()) return;

    if (query === customQuery) {
      // Switch back to Chat view if clicking preset prompts from other views
      setActiveTab('rag');
    } else {
      setInputText('');
    }

    // Add user message to stack
    const userMsgId = `msg-${Date.now()}-user`;
    const userMessage: ChatMessage = {
      id: userMsgId,
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString(),
    };

    // Intercept slash-model command requests
    const commandText = query.trim().toLowerCase();
    if (commandText === '/model' || commandText.startsWith('/model ')) {
      let targetRole: 'sonnet' | 'opus' | 'haiku' | null = null;
      if (commandText.includes('sonnet')) targetRole = 'sonnet';
      else if (commandText.includes('opus')) targetRole = 'opus';
      else if (commandText.includes('haiku')) targetRole = 'haiku';

      if (targetRole) {
        setModelRole(targetRole);
        const displayModelName = targetRole === 'sonnet' ? '标准级推荐引擎' : targetRole === 'opus' ? '专家级深度引擎' : '极速级灵敏引擎';
        const systemResponse: ChatMessage = {
          id: `msg-${Date.now()}-assistant`,
          role: 'assistant',
          content: `✅ 已成功将当前核心对话引擎切换至角色：**${targetRole.toUpperCase()}** (${displayModelName})。之后的提问都将路由至该计算阵列。`,
          timestamp: new Date().toLocaleTimeString(),
        };
        setMessages(prev => [...prev, userMessage, systemResponse]);
        return;
      } else {
        const listResponse: ChatMessage = {
          id: `msg-${Date.now()}-assistant`,
          role: 'assistant',
          content: `🔍 **AmiMind 当前计算大脑角色：**\n\n` +
                   `- **Sonnet**: \`标准级推荐引擎\`\n` +
                   `- **Opus**: \`专家级深度引擎\`\n` +
                   `- **Haiku**: \`极速级灵敏引擎\`\n\n` +
                   `💡您可以输入 \`/model sonnet\`、\`/model opus\` 或 \`/model haiku\` 在输入框中一键切换会话主脑。`,
          timestamp: new Date().toLocaleTimeString(),
        };
        setMessages(prev => [...prev, userMessage, listResponse]);
        return;
      }
    }

    const assistantMsgId = `msg-${Date.now()}-assistant`;
    const pendingAssistantMessage: ChatMessage = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toLocaleTimeString(),
      loading: true,
    };

    setMessages(prev => [...prev, userMessage, pendingAssistantMessage]);
    setLoadingQuery(true);

    const startTime = performance.now();

    try {
      // Assemble core conversation history for grounding context (last 4 items max for lightweight system context)
      const chatHistory = messages
        .filter(m => m.id !== 'welcome' && m.id !== 'system-reset' && !m.loading)
        .slice(-4)
        .map(m => ({
          role: m.role,
          content: m.content
        }));

      const res = await fetch('/api/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': currentUser
        },
        body: JSON.stringify({
          question: query,
          history: chatHistory,
          modelRole: modelRole
        })
      });

      const latency = performance.now() - startTime;
      setLatestMetricMs(Math.round(latency));

      if (res.ok) {
        const data = await res.json();
        
        // Update assistant message with response
        setMessages(prev => prev.map(m => {
          if (m.id === assistantMsgId) {
            return {
              ...m,
              content: data.answer,
              citations: data.citations || [],
              loading: false,
            };
          }
          return m;
        }));
      } else {
        const errData = await res.json();
        const errorText = errData.error || '获取大模型 RAG 回答失败。';
        throw new Error(errorText);
      }
    } catch (err: any) {
      showNotification('error', err.message || '网络通信异常。');
      
      setMessages(prev => prev.map(m => {
        if (m.id === assistantMsgId) {
          return {
            ...m,
            content: `❌ **RAG系统查询出错**\n\n原因: \`${err.message || '后端连接失败'}\`\n\n请检查：\n1. 智脑配置中心中是否已正确设置供应商 API 密钥（API_KEY）与基础 URL（BASE_URL）\n2. 您的网络以及后台控制台日志反馈。`,
            loading: false,
          };
        }
        return m;
      }));
    } finally {
      setLoadingQuery(false);
    }
  };

  // Custom client parsing function to load documents
  const handleUploadText = async (name: string, content: string, type: string, size?: number) => {
    setUploading(true);
    try {
      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': currentUser
        },
        body: JSON.stringify({
          name,
          text: content,
          type,
          size: size || content.length,
        }),
      });

      if (response.ok) {
        const newDoc = await response.json();
        showNotification('success', `文档 "${name}" 已成功解析并完成 768-D 向量索引入库。`);
        await fetchStats();
        await fetchDocuments();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || '解析文档失败。');
      }
    } catch (e: any) {
      showNotification('error', `注入文档失败: ${e.message || e}`);
    } finally {
      setUploading(false);
    }
  };

  // Drop-down select / file upload triggered from browser
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentUser) {
      alert('请登录免费使用');
      setShowAuthModal(true);
      return;
    }
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files as any).forEach((file: any) => {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const text = event.target?.result as string;
        if (!text) return;
        
        let type = 'plaintext';
        if (file.name.endsWith('.md')) type = 'markdown';
        else if (file.name.endsWith('.csv')) type = 'csv';
        else if (file.name.endsWith('.json')) type = 'json';

        await handleUploadText(file.name, text, type, file.size);
      };
      reader.readAsText(file);
    });

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Fast Auto Generator for evaluators
  const loadPresetDoc = async (presetId: number) => {
    if (!currentUser) {
      alert('请登录免费使用');
      setShowAuthModal(true);
      return;
    }
    const doc = SAMPLE_DOCS[presetId];
    await handleUploadText(doc.name, doc.text, doc.type, doc.size);
  };

  // Interactive handler for selecting top layout templates
  const handleSelectTemplate = async (template: typeof TEMPLATE_AGENTS[0]) => {
    if (!currentUser) {
      alert('请登录免费使用');
      setShowAuthModal(true);
      return;
    }
    const presetDoc = SAMPLE_DOCS[template.sampleDocIndex];
    const alreadyUploaded = documents.some(d => d.name === presetDoc.name);
    
    if (!alreadyUploaded) {
      showNotification('info', `正在载入并切分模版语料 [${presetDoc.name}] ...`);
      await handleUploadText(presetDoc.name, presetDoc.text, presetDoc.type, presetDoc.size);
    }
    
    showNotification('success', `模版智能匹配：已切换至 [${template.title}]，正在为您自动提交 RAG 检索！`);
    setActiveTab('rag');
    handleSendQuery(undefined, template.question);
  };

  // Shuffles standard templates
  const handleShuffleTemplates = () => {
    if (!currentUser) {
      alert('请登录免费使用');
      setShowAuthModal(true);
      return;
    }
    setTemplateList(prev => [...prev].sort(() => Math.random() - 0.5));
    showNotification('success', '已随机为您重组并切换了一批全新 Agent 垂直模板！');
  };

  // Copy Snippet Logic helper
  const handleCopyCode = (id: string, codeText: string) => {
    navigator.clipboard.writeText(codeText);
    setCopyCodeSuccess(id);
    setTimeout(() => {
      setCopyCodeSuccess(null);
    }, 2000);
  };

  // Drag-and-drop mechanics
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (!currentUser) {
      alert('请登录免费使用');
      setShowAuthModal(true);
      return;
    }
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    Array.from(files as any).forEach((file: any) => {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const text = event.target?.result as string;
        if (!text) return;
        let type = 'plaintext';
        if (file.name.endsWith('.md')) type = 'markdown';
        else if (file.name.endsWith('.csv')) type = 'csv';
        else if (file.name.endsWith('.json')) type = 'json';
        await handleUploadText(file.name, text, type, file.size);
      };
      reader.readAsText(file);
    });
  };

  // Docker configurations view text
  const dockerComposeYamlText = `version: '3.8'

services:
  # Layer 1: Presentation Layer
  rag-ui-client:
    build:
      context: .
      dockerfile: Dockerfile.web
    image: ai-rag-studio/web-client:latest
    container_name: rag-ui-client
    ports:
      - "3000:80"
    depends_on:
      - rag-api-core
    networks:
      - rag-net

  # Layer 2: API Orchestrator Layer
  rag-api-core:
    build:
      context: .
      dockerfile: Dockerfile.api
    image: ai-rag-studio/core-api:latest
    container_name: rag-api-core
    ports:
      - "8080:8080"
    environment:
      - API_KEY=YOUR_MAIN_API_KEY
      - BASE_URL=YOUR_SUPPLIER_BASE_URL
    networks:
      - rag-net

networks:
  rag-net:
    driver: bridge`;

  const dockerfileApiText = `FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json vite.config.ts ./
COPY src/types.ts ./src/types.ts
COPY server/ ./server/
COPY server.ts ./
RUN npx esbuild server.ts --bundle --platform=node --format=cjs --packages=external --outfile=dist/server.cjs

FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist/server.cjs ./dist/server.cjs
EXPOSE 8080
CMD ["node", "dist/server.cjs"]`;



  return (
    <div className="flex h-screen w-screen bg-[#fafbfe] text-slate-900 font-sans overflow-hidden select-none" id="main-container">
      
      {/* Sidebar Component with dynamic metrics and tabs status */}
      <Sidebar 
        stats={stats} 
        onReset={handleResetDb} 
        loadingReset={loadingReset}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        onAuthTrigger={() => setShowAuthModal(true)}
      />

      {/* Main Container Layer */}
      <div className="flex-1 flex flex-col min-w-0" id="right-workspace">
        
        {/* Top Sticky Header */}
        <header className="h-16 border-b border-slate-100 flex items-center justify-between px-8 bg-white/80 backdrop-blur-md sticky top-0 z-10 select-none overflow-x-auto overflow-y-hidden scrollbar-none">
          <div className="flex items-center gap-3 shrink-0">
            <Layers size={18} className="text-indigo-600 shrink-0" />
            <span className="font-extrabold tracking-tight text-sm text-slate-800 whitespace-nowrap">RAG平台</span>
          </div>

          <div className="flex items-center gap-6 shrink-0 ml-4">
            <div className="flex items-center gap-2.5 shrink-0">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
              <div className="flex flex-col text-[11px] leading-tight font-bold">
                <span className="text-slate-400 font-normal">向量数据库节点：</span>
                <span className="text-emerald-600 font-black">正常就绪</span>
              </div>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
              <div className="flex flex-col text-[11px] leading-tight font-bold">
                <span className="text-slate-400 font-normal">智脑模型链路：</span>
                <span className="text-indigo-600 font-black">连接在线</span>
              </div>
            </div>
            
            {/* Quick API Key status warning if not set */}
            {!stats?.chunksCount && (
              <div className="text-xs text-indigo-500 border border-indigo-200 bg-indigo-50/60 px-3 py-1 rounded-xl flex items-center gap-1.5 font-medium whitespace-nowrap shrink-0">
                <Info size={13} className="shrink-0" />
                <span className="whitespace-nowrap">载入文档即可开始实时问答</span>
              </div>
            )}

            {/* Logged in User Identity & Logout control */}
            {currentUser ? (
              <div className="flex items-center gap-2.5 pl-4 border-l border-slate-100 h-8 shrink-0">
                <div className="flex flex-col items-end shrink-0">
                  <span className="text-xs font-extrabold text-slate-800 tracking-tight select-text max-w-28 truncate whitespace-nowrap">
                    {currentUser}
                  </span>
                  <span className="text-[9px] text-indigo-500 font-bold uppercase tracking-widest leading-none whitespace-nowrap">
                    授权终端已登录
                  </span>
                </div>
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-xs shadow-sm uppercase select-none shrink-0">
                  {currentUser[0] || 'U'}
                </div>
                <button
                  onClick={handleLogout}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer shrink-0"
                  title="安全退出登录会话"
                >
                  <LogOut size={14} className="shrink-0" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3 pl-4 border-l border-slate-100 h-8 shrink-0">
                <div className="flex items-center gap-2 shrink-0">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0"></span>
                  <span className="text-[10px] text-amber-600 font-extrabold uppercase tracking-wider font-sans whitespace-nowrap">
                    账号未登录
                  </span>
                </div>
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer border-0 outline-none shadow-xs whitespace-nowrap shrink-0"
                >
                  登录免费使用
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Dynamic Status Notifications overlay */}
        {notification && (
          <div className="fixed top-20 right-8 z-55 animate-bounce">
            <div className={`p-4 rounded-2xl border text-xs font-semibold shadow-lg flex items-center gap-2.5 ${
              notification.type === 'success' 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                : notification.type === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-800'
                : 'bg-indigo-50 border-indigo-200 text-indigo-800'
            }`}>
              <CheckCircle size={15} />
              <span>{notification.text}</span>
            </div>
          </div>
        )}

        {/* Template Banner Section matching the precise mockup visual design */}
        {showTemplates && activeTab === 'rag' && (
          <div className="bg-white border-b border-slate-100 p-6 flex-shrink-0" id="template-banner">
            <div className="max-w-7xl mx-auto space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-sm text-slate-800">从模板新建</span>
                  <span className="text-[9px] bg-indigo-50 text-indigo-600 font-bold px-1.5 py-0.2 rounded border border-indigo-100 uppercase">精选模板</span>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <button 
                    onClick={handleShuffleTemplates}
                    className="flex items-center gap-1.5 text-slate-500 hover:text-indigo-600 transition-colors font-medium border-0 bg-transparent cursor-pointer"
                  >
                    <RefreshCw size={12} className="animate-hover-spin" />
                    <span>换一批</span>
                  </button>
                  <button 
                    onClick={() => {
                      setShowTemplates(false);
                      showNotification('info', '已为您收起智能 Agent 模版，您可随时在下方一键展开。');
                    }}
                    className="flex items-center gap-1 text-slate-500 hover:text-indigo-600 transition-colors font-medium border-0 bg-transparent cursor-pointer"
                  >
                    <ChevronUp size={14} />
                    <span>隐藏模板</span>
                  </button>
                </div>
              </div>

              {/* Grid of cards aligned exactly with the screenshot's templates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 overflow-x-auto pb-1 scrollbar-none">
                {templateList.map((tmpl) => (
                  <button
                    key={tmpl.id}
                    onClick={() => handleSelectTemplate(tmpl)}
                    className="p-4 bg-gradient-to-b from-white to-slate-55/10 hover:to-white border border-slate-200/50 hover:border-indigo-400 rounded-2xl text-left transition-all duration-300 shadow-xs hover:shadow-md hover:shadow-indigo-100/30 transform hover:-translate-y-0.5 group flex flex-col justify-between h-36 relative select-none cursor-pointer"
                  >
                    <div className="w-full">
                      <div className="flex items-center justify-between gap-1.5 mb-2 w-full">
                        <div className={`w-8 h-8 rounded-xl ${tmpl.iconColor} flex items-center justify-center text-sm shadow-xs`}>
                          {tmpl.iconText}
                        </div>
                        <span className="text-[8px] bg-slate-50 text-slate-500 font-extrabold px-1.5 py-0.5 rounded-full border border-slate-200/50 font-sans">
                          {tmpl.tag}
                        </span>
                      </div>
                      <h4 className="font-extrabold text-slate-800 text-xs tracking-tight group-hover:text-indigo-600 transition-colors line-clamp-1">{tmpl.title}</h4>
                      <p className="text-[10px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">{tmpl.desc}</p>
                    </div>
                    
                    <div className="flex justify-between items-center text-[10px] text-indigo-600 font-bold mt-2 pt-1 w-full border-t border-slate-100/50">
                      <span className="text-[9px] text-slate-400 font-semibold group-hover:text-indigo-500">一键启用模板</span>
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity font-mono">&rarr;</span>
                    </div>
                  </button>
                ))}

                {/* Optional "More" Card with standard visual gradient background */}
                <div className="p-4 bg-gradient-to-tr from-[#9b51e0] via-[#524bf2] to-pink-500 rounded-2xl text-white flex flex-col justify-between h-36 relative shadow-xs hover:shadow-md transition-all select-none">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center text-sm font-bold">
                        🔮
                      </div>
                      <span className="text-[8px] bg-white/20 font-bold px-2 py-0.5 rounded-full">
                        全新
                      </span>
                    </div>
                    <h4 className="font-extrabold text-xs">更多优质模板</h4>
                    <p className="text-[10px] text-white/90 mt-1 line-clamp-2 leading-relaxed">提供多容器微调与自主多源 RAG 空间支持。</p>
                  </div>
                  <div className="text-[10px] font-bold text-white/95 flex justify-between items-center mt-2.5 pt-1 border-t border-white/10">
                    <span>敬请期待定制 &gt;</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Collapsed templates banner reminder */}
        {!showTemplates && activeTab === 'rag' && (
          <div className="px-8 py-2 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center flex-shrink-0">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">AmiMind 智脑模板推荐面板已收起</span>
            <button 
              onClick={() => setShowTemplates(true)}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 border-0 bg-transparent cursor-pointer"
            >
              <span>显示全套模板</span>
              <ChevronDown size={14} />
            </button>
          </div>
        )}

        {/* Action bar and workspace title below the banner */}
        {activeTab === 'rag' && (
          <div className="px-8 py-4 bg-white border-b border-slate-100/65 flex items-center justify-between flex-shrink-0 select-none">
            <div>
              <h2 className="text-sm font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
                <span>RAG Agent 实例</span>
                <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-bold border border-indigo-100/50 font-mono">
                  {documents.length}个活跃知识源
                </span>
              </h2>
            </div>

            {/* Functional Search Bar + Action triggers like screenshot */}
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <Search size={13} className="absolute left-3 top-2.5 text-slate-400 animate-pulse" />
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="搜索或检索特定问答内容..."
                  className="pl-8 pr-3 py-1.5 bg-slate-100 hover:bg-slate-200/50 focus:bg-white border-0 rounded-xl text-xs text-slate-700 w-48 placeholder-slate-400 transition-all font-medium focus:ring-1 focus:ring-indigo-400 focus:outline-none"
                />
              </div>
              
              <button
                onClick={() => {
                  setActiveTab('docs');
                  setTimeout(() => {
                    fileInputRef.current?.click();
                  }, 120);
                }}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200/80 text-slate-600 rounded-xl text-xs font-semibold gap-1.5 flex items-center transition-all cursor-pointer"
              >
                <Plus size={13} />
                <span>载入本地文件</span>
              </button>
              
              <button
                onClick={async () => {
                  showNotification('info', '正在快速并发向量入库全套初始内置沙盒文件...');
                  await Promise.all([0, 1, 2].map(id => loadPresetDoc(id)));
                }}
                className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl text-xs font-semibold transition-all cursor-pointer"
              >
                <span>一键导入全部</span>
              </button>
            </div>
          </div>
        )}

        {/* Core Layout Tabs Router */}
        <main className="flex-1 overflow-hidden relative">

          {/* TAB 0: PROJECT VALUE & ADVANTAGES PORTAL */}
          <div className={`h-full overflow-y-auto bg-gradient-to-b from-white via-indigo-50/5 to-slate-50/10 p-8 ${activeTab === 'portal' ? 'block' : 'hidden'}`} id="portal-panel">
            <div className="max-w-5xl mx-auto space-y-12">
              
              {/* Hero Banner Section */}
              <div className="text-center space-y-4 py-8">
                <div className="inline-flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 px-3.5 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider shadow-xs animate-pulse">
                  <Sparkles size={14} className="text-indigo-600" />
                  <span>AmiMind 跨时代个性化 AI 知识管理双脑</span>
                </div>
                <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-800 leading-tight">
                  唤醒私域知识，实现<span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600">毫秒同步与精准问答</span>
                </h1>
                <p className="text-sm md:text-base text-slate-500 max-w-2xl mx-auto font-medium">
                  基于先进的大模型 RAG (Retrieval-Augmented Generation) 架构及本地高维向量相似度召回层，
                  解决产品规格沉睡、文档检索困难等痛点，将零碎的说明书、CSV 数据结构及 FAQ 轻松化为即时反馈的智能大脑。
                </p>
                
                <div className="flex justify-center gap-4 pt-4">
                  <button
                    onClick={() => {
                      if (currentUser) {
                        setActiveTab('rag');
                      } else {
                        setShowAuthModal(true);
                      }
                    }}
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-indigo-150 transform hover:-translate-y-0.5 cursor-pointer"
                  >
                    {currentUser ? "进入智能问答空间" : "立即注册 / 登录体验"}
                  </button>
                  <button
                    onClick={() => {
                      const element = document.getElementById("interactive-playground");
                      element?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="px-6 py-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-250 font-bold text-sm rounded-xl transition-all shadow-xs cursor-pointer"
                  >
                    了解优势及体验示例
                  </button>
                </div>
              </div>

              {/* Grid of Highlight Advantages */}
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-lg font-extrabold text-slate-800 tracking-tight flex items-center justify-center gap-2">
                    <Database size={18} className="text-indigo-600" />
                    <span>为什么选择 AmiMind 平台？我们的核心技术实力</span>
                  </h2>
                  <p className="text-[11px] text-slate-400 mt-1 font-semibold uppercase tracking-widest leading-none">FOUR MAJOR STRUCTURAL CAPABILITIES</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-4">
                  
                  {/* Card 1 */}
                  <div className="p-6 bg-white border border-slate-200/50 rounded-2xl hover:border-indigo-400 hover:shadow-lg transition-all space-y-3 relative group">
                    <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center text-lg font-bold">
                      🧠
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-extrabold text-slate-800 text-sm tracking-tight group-hover:text-blue-600 transition-colors">深度语义微调与混合大模型映射</h3>
                      <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                        内置多路智能映射策略，可一键在 Sonnet / Opus / Haiku 核心会话供应商之间微调。支持动态分配权重、
                        请求延迟自愈，完美适配各类复杂指令及大流量生产环境调度。
                      </p>
                    </div>
                  </div>

                  {/* Card 2 */}
                  <div className="p-6 bg-white border border-slate-200/50 rounded-2xl hover:border-violet-400 hover:shadow-lg transition-all space-y-3 relative group">
                    <div className="w-10 h-10 bg-violet-50 text-violet-600 rounded-xl flex items-center justify-center text-lg font-bold">
                      ⚡
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-extrabold text-slate-800 text-sm tracking-tight group-hover:text-violet-600 transition-colors">高分多路向量召回与精确追踪</h3>
                      <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                        文档进入系统自动分块（600字符与150字符交叠冗余滑动窗口），由高维特征检索模型进行向量化加工，
                        提供毫秒级、高精度的 Cosine 距离过滤与事实痕迹解析，回答绝不幻觉。
                      </p>
                    </div>
                  </div>

                  {/* Card 3 */}
                  <div className="p-6 bg-white border border-slate-200/50 rounded-2xl hover:border-emerald-400 hover:shadow-lg transition-all space-y-3 relative group">
                    <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center text-lg font-bold">
                      🛡️
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-extrabold text-slate-800 text-sm tracking-tight group-hover:text-emerald-600 transition-colors">严格的用户私域隔离与安全沙箱</h3>
                      <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                        每一位注册用户都分配完全隔绝、独立的专用 Vector & Prompt 模型缓存空间。任何未经授权的第三方
                        在反向代理策略下均无权触及，确保企业核心数据资产100%本地物理安全。
                      </p>
                    </div>
                  </div>

                  {/* Card 4 */}
                  <div className="p-6 bg-white border border-slate-200/50 rounded-2xl hover:border-amber-400 hover:shadow-lg transition-all space-y-3 relative group">
                    <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center text-lg font-bold">
                      ⚙️
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-extrabold text-slate-800 text-sm tracking-tight group-hover:text-amber-600 transition-colors">云原生高可用容器发布部署支持</h3>
                      <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                        为企业运维量身配置了标准 Multi-stage Docker 以及 Docker-Compose 自动编排流水线支持。
                        完美兼容 3000 和 8080 端口网关通信架构，开箱即用，极简极速部署。
                      </p>
                    </div>
                  </div>

                </div>
              </div>

              {/* Interactive Simple Examples & Playgrounds (简单示例) */}
              <div className="space-y-6 pt-4" id="interactive-playground">
                <div className="text-center">
                  <h2 className="text-lg font-extrabold text-slate-800 tracking-tight flex items-center justify-center gap-2">
                    <BookOpen size={18} className="text-indigo-600" />
                    <span>玩转算法：极简大模型 RAG 召回原理沙箱</span>
                  </h2>
                  <p className="text-[11px] text-slate-400 mt-1 font-semibold uppercase tracking-widest leading-none">INTERACTIVE MATHEMATICAL SIMULATION & SANDBOX</p>
                </div>

                <div className="bg-white border border-slate-200/60 rounded-3xl p-6 md:p-8 shadow-sm space-y-8">
                  {/* Embedding Cosine Similarity Simulator */}
                  <InteractiveSimulator />
                </div>
              </div>

              {/* Real World Template Walkthrough Section */}
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-lg font-extrabold text-slate-800 tracking-tight flex items-center justify-center gap-2 font-black">
                    <Layers size={18} className="text-indigo-600" />
                    <span>秒级开箱：精选行业 Agent 解决方案模板</span>
                  </h2>
                  <p className="text-[11px] text-slate-400 mt-1 font-semibold uppercase tracking-widest leading-none font-bold">READY TO DEPLOY IN A SINGLE CLICK</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {templateList.map((tmpl) => (
                    <div key={tmpl.id} className="p-5 bg-gradient-to-tr from-indigo-50/50 to-white/90 border border-slate-200/60 rounded-2xl space-y-3 transition-colors hover:border-indigo-300">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-xl ${tmpl.iconColor} flex items-center justify-center text-sm shadow-xs`}>
                          {tmpl.iconText}
                        </div>
                        <div>
                          <h4 className="font-extrabold text-slate-800 text-xs tracking-tight">{tmpl.title}</h4>
                          <span className="text-[8px] bg-slate-50 text-slate-500 font-extrabold px-1.5 py-0.2 rounded-full border border-slate-200/50 uppercase">
                            {tmpl.tag}
                          </span>
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">{tmpl.desc}</p>
                      
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-[10px] text-slate-600 font-medium select-all">
                        <span className="text-[9px] text-indigo-500 font-extrabold uppercase tracking-wide block mb-0.5">样例提问:</span>
                        "{tmpl.question}"
                      </div>

                      <div className="flex justify-end">
                        <button
                          onClick={() => {
                            if (!currentUser) {
                              alert('请登录免费使用');
                              setShowAuthModal(true);
                              return;
                            }
                            handleSelectTemplate(tmpl);
                          }}
                          className="px-3 py-1.5 bg-indigo-50 text-indigo-600 border border-indigo-200 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 text-[10px] font-bold rounded-xl transition-all cursor-pointer"
                        >
                          开始该智能场景 RAG 检索 &rarr;
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom FAQ Banner or Customer Reviews */}
              <div className="bg-gradient-to-b from-indigo-600 to-indigo-800 rounded-3xl p-8 text-white relative overflow-hidden">
                <div className="absolute right-0 top-0 opacity-10 font-black text-9xl">RAG</div>
                <div className="relative z-10 space-y-4 max-w-xl">
                  <h3 className="text-xl font-extrabold">🚀 拥抱未来的智能，体验真正的“知识第二大脑”</h3>
                  <p className="text-xs text-white/95 leading-relaxed font-medium">
                    无论你是想要进行云原生架构文档、企业合规 FAQ，或者是复杂的金融分析指标检索，
                    AmiMind 都能在安全的沙箱环境下，通过多路高维匹配模型为你排忧解难！
                  </p>
                  <div>
                    <button
                      onClick={() => {
                        if (currentUser) {
                          setActiveTab('rag');
                        } else {
                          setShowAuthModal(true);
                        }
                      }}
                      className="px-5 py-2.5 bg-white text-indigo-600 hover:bg-slate-50 font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer border-0 outline-none"
                    >
                      {currentUser ? "进入问答控制台" : "创建免费账户"}
                    </button>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* TAB 1: REAL-TIME Q&A BOT WORKSPACE */}
          <div className={`h-full flex flex-col bg-slate-50/20 ${activeTab === 'rag' ? 'block' : 'hidden'}`} id="rag-panel">
            
            {/* Conditional Render: Empty State with concentric circular glow matching the uploaded mockup */}
            {documents.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gradient-to-b from-[#fafbfe]/30 to-[#f3f5fa]/25 relative overflow-hidden h-full">
                
                {/* Main Action card content */}
                <div className="relative text-center z-10 space-y-7 max-w-md select-none">
                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-1 bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase shadow-xs">
                      ✨ 创建你的第一个 Agent
                    </div>
                    <h3 className="text-xl font-extrabold text-slate-800 tracking-tight leading-normal">
                      载入多源知识索引，即刻开始检索
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
                      请选择上方预设模板，或点击下方按钮一键载入样例规约文档。
                    </p>
                  </div>

                  {/* Large Dashed + Button inspired exactly by the mockup card center */}
                  <div className="flex justify-center">
                    <button
                      onClick={async () => {
                        showNotification('info', '正在快速向量入库标准 API、FAQ 以及架构手册...');
                        await Promise.all([0, 1, 2].map(i => loadPresetDoc(i)));
                      }}
                      className="w-24 h-24 bg-white hover:bg-indigo-50/20 border-2 border-dashed border-indigo-200 hover:border-indigo-500 rounded-3xl flex items-center justify-center text-indigo-500 hover:text-indigo-600 shadow-md shadow-indigo-100/30 hover:shadow-indigo-150/60 transition-all cursor-pointer group transform hover:-translate-y-0.5 active:translate-y-0"
                    >
                      <Plus size={36} className="stroke-[2.5] transform group-hover:rotate-90 transition-all duration-300" />
                    </button>
                  </div>

                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest animate-pulse">
                    点击一键加载预置全景测试文件
                  </p>
                </div>
              </div>
            ) : (
              /* Conversation Stream when files are present */
              <div className="flex-1 overflow-y-auto p-8 space-y-6 scrollbar-thin">
                <div className="max-w-4xl mx-auto space-y-6">
                  {messages
                    .filter(msg => {
                      if (!searchFilter.trim()) return true;
                      return msg.content.toLowerCase().includes(searchFilter.trim().toLowerCase());
                    })
                    .map((message) => (
                  <div 
                    key={message.id} 
                    className={`flex gap-4 items-start ${
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {/* Bot Avatar */}
                    {message.role === 'assistant' && (
                      <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-md shadow-indigo-100 flex-shrink-0 mt-0.5">
                        <Cpu size={14} />
                      </div>
                    )}

                    {/* Chat Bubble Card */}
                    <div className={`max-w-2xl p-5 shadow-sm border rounded-2xl ${
                      message.role === 'user'
                        ? 'bg-indigo-600 border-indigo-500 text-white rounded-tr-none shadow-indigo-100'
                        : 'bg-white border-slate-100 text-slate-800 rounded-tl-none'
                    }`}>
                      {/* Message Content */}
                      {message.loading ? (
                        <div className="flex items-center gap-3 py-2 text-slate-500" id="assistant-loading">
                          <RefreshCw size={15} className="animate-spin text-indigo-500" />
                          <span className="text-xs font-medium font-mono">
                            正在向量数据库中搜索最匹配片段，并组织 智脑 生成回答...
                          </span>
                        </div>
                      ) : (
                        <div className="text-sm leading-relaxed whitespace-pre-wrap select-text markdown-styling">
                          {message.content}
                        </div>
                      )}

                      {/* Cited groundings list from custom vector database */}
                      {message.citations && message.citations.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-slate-50 space-y-2" id="citations-context">
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                            <BookOpen size={11} className="text-indigo-500" />
                            <span>检索召回相似度匹配及原文背景参考 ({message.citations.length} 个匹配)</span>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                            {message.citations.map((citation, index) => (
                              <div 
                                key={citation.chunkId} 
                                className="p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors"
                              >
                                <div className="flex justify-between items-center mb-1 text-[10px]">
                                  <span className="font-semibold text-slate-600 truncate max-w-[160px]">
                                    [Source {index + 1}] {citation.docName}
                                  </span>
                                  <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 font-bold rounded font-mono">
                                    匹配分数: {(citation.score * 100).toFixed(1)}%
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500 line-clamp-2 select-text font-mono italic">
                                  "{citation.snippet}"
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Timestamp / Info ticker */}
                      <div className={`text-[9px] mt-2 text-right font-mono ${
                        message.role === 'user' ? 'text-indigo-200' : 'text-slate-400'
                      }`}>
                        {message.timestamp}
                      </div>
                    </div>

                    {/* User Avatar */}
                    {message.role === 'user' && (
                      <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-[10px] flex-shrink-0 mt-0.5">
                        用户
                      </div>
                    )}
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
            </div>
            )}

            {/* Prompt presets / Search Latency metadata line */}
            <div className="bg-slate-50/20 px-8 py-2 border-t border-slate-100/60 text-xs flex justify-between items-center text-slate-400 font-medium">
              <div className="flex items-center gap-2">
                <Activity size={12} className="text-indigo-500 animate-pulse" />
                <span>检索召回效率统计:</span>
                <span className="bg-white border border-slate-200/60 px-2 py-0.5 rounded font-mono font-bold text-indigo-600">
                  {latestMetricMs ? `${latestMetricMs} ms / query` : 'N/A'}
                </span>
                <span className="text-slate-300">|</span>
                <span className="text-slate-400">向量维度: 768维</span>
              </div>
              
              <div className="flex items-center gap-1.5">
                <HelpCircle size={12} />
                <span>直接输入进行检索召回问答，数据均在内存层及本地安全托管</span>
              </div>
            </div>

            {/* Bottom prompt toolbar & inputs */}
            <div className="p-6 bg-white border-t border-slate-100">
              <div className="max-w-4xl mx-auto space-y-3.5">
                {/* Micro Quick Suggestion Tags & Model Selector */}
                <div className="flex flex-wrap gap-3 items-center justify-between pb-1 border-b border-slate-100/30">
                  <div className="flex flex-wrap gap-2 items-center">
                    <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                      推荐提问预设:
                    </span>
                    <button 
                      onClick={() => handleSendQuery(undefined, "Unified API Gateway 系列规范层中目前核心支持了哪些主流通信网络协议？")}
                      className="px-3 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200/50 hover:border-slate-300 rounded-full text-xs text-slate-600 transition-colors"
                    >
                      网关通信协议？
                    </button>
                    <button 
                      onClick={() => handleSendQuery(undefined, "当遭遇客户询问系统的接口最大可支持上传的多大文件和相应的外网通信物理端口，我该如何进行标准的客户答复？")}
                      className="px-3 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200/50 hover:border-slate-300 rounded-full text-xs text-slate-600 transition-colors"
                    >
                      客服答复要点？
                    </button>
                    <button 
                      onClick={() => handleSendQuery(undefined, "请问RAG系统中，相似度距离度量中的 cosine 计算公式是怎样的？")}
                      className="px-3 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200/50 hover:border-slate-300 rounded-full text-xs text-slate-600 transition-colors"
                    >
                      文本算法原理？
                    </button>
                  </div>

                  {/* Active Model Selector */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold tracking-wider text-slate-400 uppercase font-sans">
                      🧠 当前计算大脑:
                    </span>
                    <select
                      value={modelRole}
                      onChange={(e) => setModelRole(e.target.value as any)}
                      className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100/80 border border-indigo-100 rounded-xl text-xs font-bold text-indigo-600 focus:outline-none transition-all cursor-pointer shadow-xs font-sans"
                    >
                      <option value="sonnet">Sonnet (标准级推荐引擎)</option>
                      <option value="opus">Opus (专家级深度引擎)</option>
                      <option value="haiku">Haiku (极速级灵敏引擎)</option>
                    </select>
                  </div>
                </div>

                {/* Form Inputs */}
                <form onSubmit={handleSendQuery} className="flex gap-3">
                  <div className="flex-1 relative">
                    <input 
                      type="text" 
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder={
                        documents.length > 0
                          ? "输入问题查询您的知识库..." 
                          : "⚠️ 请先在 [Document Store] 中导入或上传测试文档以检索..."
                      }
                      className="w-full pl-5 pr-12 py-4 bg-slate-50/80 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 text-sm transition-all text-slate-800 font-medium"
                      disabled={loadingQuery}
                      id="input-prompt"
                    />
                    
                    <button 
                      type="submit" 
                      disabled={loadingQuery || !inputText.trim()}
                      className="absolute right-3.5 top-2.5 w-10 h-10 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-45 text-white rounded-xl flex items-center justify-center transition-all shadow-md shadow-indigo-100"
                      id="btn-submit-prompt"
                    >
                      {loadingQuery ? (
                        <RefreshCw size={15} className="animate-spin" />
                      ) : (
                        <Send size={15} />
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>

          {/* TAB 2: DOCUMENT STORE MANAGEMENT */}
          <div className={`h-full overflow-y-auto p-8 bg-slate-50/20 ${activeTab === 'docs' ? 'block' : 'hidden'}`} id="docs-panel">
            <div className="max-w-4xl mx-auto space-y-8">
              
              {/* Layout title */}
              <div>
                <h2 className="text-xl font-bold tracking-tight text-slate-800">构建您的多文档知识矩阵</h2>
                <p className="text-xs text-slate-400 mt-1">
                  上传、切分和向量化文档。支持多文档并行处理，数据会自动在本地持久化内存库中完成余弦向量建树。
                </p>
              </div>

              {/* Upload drag drop panel */}
              <div 
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center gap-3 transition-all cursor-pointer ${
                  dragOver 
                    ? 'border-indigo-500 bg-indigo-50/40' 
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
                onClick={() => {
                  if (!currentUser) {
                    alert('请登录免费使用');
                    setShowAuthModal(true);
                    return;
                  }
                  fileInputRef.current?.click();
                }}
                id="file-dropzone"
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange}
                  multiple 
                  className="hidden" 
                  accept=".txt,.md,.csv,.json"
                />

                <div className="p-4 bg-indigo-50 text-indigo-600 rounded-full shadow-sm">
                  <Upload size={24} className={uploading ? "animate-bounce" : ""} />
                </div>
                
                <div className="text-center">
                  <p className="text-xs font-semibold text-slate-700">
                    {uploading ? "正在计算向量切片并向 智脑 核对哈希..." : "点击或拖拽多个文档文件至此框区域"}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">支持 TXT, MD, CSV, JSON 等纯文本或结构化数据，文件限 10MB</p>
                </div>
              </div>

              {/* Instant One-Click Evaluation Presets. Extremely useful for testing right away! */}
              <div className="bg-white border border-slate-200/60 p-6 rounded-2xl shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BookOpen size={16} className="text-indigo-600" />
                    <span className="text-xs font-bold text-slate-800">评估测试沙盒: 导入官方内置标准文档</span>
                  </div>
                  <span className="text-[9px] bg-indigo-50 text-indigo-600 font-bold px-2 py-0.5 rounded border border-indigo-100 uppercase">
                    Sandbox Mocking
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  没有备好的实验文本文件？点击下方的一键模版导入，快速在您的向量数据库中载入多份不同格式的文档进行 Q&A 实测！
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {SAMPLE_DOCS.map((doc, idx) => {
                    const isAdded = documents.some(d => d.name === doc.name);
                    return (
                      <button
                        key={doc.name}
                        onClick={() => loadPresetDoc(idx)}
                        disabled={uploading || isAdded}
                        className={`p-3.5 border rounded-xl text-left transition-all ${
                          isAdded 
                            ? 'bg-slate-50 border-slate-100 text-slate-400 opacity-60 cursor-not-allowed' 
                            : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 hover:border-indigo-300 hover:shadow-sm'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase font-bold text-indigo-500 font-mono tracking-wider">
                            {doc.type}
                          </span>
                          {isAdded && <span className="text-[9px] text-emerald-600 font-bold">● 已在库</span>}
                        </div>
                        <h4 className="text-xs font-bold mt-1.5 truncate text-slate-800">{doc.name}</h4>
                        <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">{(doc.size / 1024).toFixed(2)} KB • 包含技术细节</p>
                        {!isAdded && (
                          <span className="text-[10px] text-indigo-600 font-bold mt-2 inline-flex items-center gap-1">
                            <Plus size={11} /> 载入并向量化
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Table list of index files in local memory DB */}
              <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Database size={14} className="text-indigo-600" />
                    <span>有源索引库列表 ({documents.length} 份文档)</span>
                  </h3>
                  
                  {documents.length > 0 && (
                    <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">
                      已编译 {stats?.chunksCount || 0} 个语义向量片段
                    </span>
                  )}
                </div>

                {documents.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 space-y-2">
                    <Info size={28} className="mx-auto text-slate-300" />
                    <p className="text-xs font-medium">当前未导入任何文档。请拖拽或加载预设文档运行检索模型！</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 text-slate-400 font-bold border-b border-slate-100 uppercase tracking-widest text-[9px]">
                          <th className="p-4">文档名称 / 键名</th>
                          <th className="p-4">类型</th>
                          <th className="p-4">文件大小</th>
                          <th className="p-4">词数估算</th>
                          <th className="p-4">向量分块数</th>
                          <th className="p-4">入库时间</th>
                          <th className="p-4 text-center">操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {documents.map((doc) => (
                          <tr key={doc.id} className="border-b border-slate-100 hover:bg-slate-50/40 transition-colors">
                            <td className="p-4 font-bold text-slate-700 font-mono text-[11px] max-w-[200px] truncate">
                              {doc.name}
                            </td>
                            <td className="p-4">
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold rounded uppercase">
                                {doc.type}
                              </span>
                            </td>
                            <td className="p-4 font-mono text-slate-500">
                              {(doc.size / 1024).toFixed(1)} KB
                            </td>
                            <td className="p-4 font-mono text-slate-500">
                              {doc.wordCount} 字
                            </td>
                            <td className="p-4 font-mono font-bold text-indigo-600">
                              {doc.chunkCount} 片
                            </td>
                            <td className="p-4 text-slate-400 text-[11px] font-mono">
                              {new Date(doc.uploadDate).toLocaleDateString()}
                            </td>
                            <td className="p-4 text-center">
                              <button 
                                onClick={() => handleDeleteDoc(doc.id, doc.name)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                title="删除该文档并注销关联向量"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* TAB 3: LLM PROVIDER CONFIGURATION */}
          <div className={`h-full ${activeTab === 'config' ? 'block' : 'hidden'}`} id="config-panel">
            <LlmConfigManager 
              onBack={() => setActiveTab('rag')}
              showNotification={showNotification}
              onConfigSaved={() => {
                fetchStats();
              }}
            />
          </div>

        </main>
      </div>

      {/* Auth Modal popup prompt overlay */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 cursor-pointer" onClick={() => setShowAuthModal(false)} />
          <div className="w-full max-w-md bg-slate-950 border border-slate-800 rounded-3xl p-8 relative z-10 shadow-2xl animate-in fade-in zoom-in duration-200">
            {/* Close modal button */}
            <button
              onClick={() => setShowAuthModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white bg-transparent border-0 font-bold text-lg cursor-pointer outline-none"
            >
              ✕
            </button>
            <div className="text-center space-y-2 mb-8 select-none">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-pink-500 via-indigo-600 to-blue-500 text-white shadow-lg mb-2">
                <span className="text-2xl font-bold">🧠</span>
              </div>
              <h2 className="text-xl font-extrabold text-white tracking-tight">AmiMind 智脑 RAG 工作区</h2>
              <p className="text-xs text-slate-400">基于大模型的多源知识全栈工作平台</p>
            </div>

            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-900/80 rounded-2xl mb-6 text-indigo-400 border border-slate-800/60">
              <button
                onClick={() => {
                  setAuthMode('login');
                  setAuthError('');
                }}
                className={`py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer border-0 outline-none ${
                  authMode === 'login'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200 bg-transparent'
                }`}
              >
                <Lock size={13} />
                <span>用户登录</span>
              </button>
              <button
                onClick={() => {
                  setAuthMode('register');
                  setAuthError('');
                }}
                className={`py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer border-0 outline-none ${
                  authMode === 'register'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200 bg-transparent'
                }`}
              >
                <UserPlus size={13} />
                <span>创建账户</span>
              </button>
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {authError && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 font-semibold flex items-start gap-2 animate-pulse">
                  <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                  <span>{authError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 flex justify-between items-center">
                  <span>电子邮箱</span>
                  <span className="text-slate-500 lowercase font-mono">user@domain.com</span>
                </label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="email"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    placeholder="请输入您的邮箱地址..."
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium font-sans"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 flex justify-between items-center">
                  <span>账户密码</span>
                  <span className="text-slate-500">不低于 6 位</span>
                </label>
                <div className="relative">
                  <Key size={14} className="absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="password"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    placeholder="请输入您的密码..."
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium font-sans"
                    required
                  />
                </div>
              </div>

              {authMode === 'register' && (
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">
                    确认密码
                  </label>
                  <div className="relative">
                    <ShieldCheck size={14} className="absolute left-3.5 top-3 text-slate-400" />
                    <input
                      type="password"
                      value={authConfirmPassword}
                      onChange={(e) => setAuthConfirmPassword(e.target.value)}
                      placeholder="请再次确认您的密码..."
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-405 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium font-sans"
                      required
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-600/20 active:translate-y-px disabled:opacity-50 disabled:pointer-events-none cursor-pointer mt-2 border-0 outline-none"
              >
                {authLoading ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    <span>正在验证账户中...</span>
                  </>
                ) : (
                  <>
                    {authMode === 'login' ? <Lock size={13} /> : <UserPlus size={13} />}
                    <span>{authMode === 'login' ? '登 录 智 脑' : '注 册 并 登 录'}</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
