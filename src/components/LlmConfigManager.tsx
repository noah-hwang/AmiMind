import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Eye, 
  EyeOff, 
  Sparkles, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Link,
  Zap,
  Globe,
  Settings
} from 'lucide-react';
import { LLMConfig, ModelMappingItem } from '../types';

interface LlmConfigManagerProps {
  onBack: () => void;
  showNotification: (type: 'success' | 'error' | 'info', text: string) => void;
  onConfigSaved?: () => void;
}

export default function LlmConfigManager({
  onBack,
  showNotification,
  onConfigSaved
}: LlmConfigManagerProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [fetchingModels, setFetchingModels] = useState(false);
  
  // Accordion toggle for advanced options
  const [showAdvanced, setShowAdvanced] = useState(true);
  
  // Mask/unmask API Key
  const [showApiKey, setShowApiKey] = useState(false);

  // Available models fetched from provider (to populate actual request model select dropdown)
  const [availableModels, setAvailableModels] = useState<string[]>([]);

  // Local state aligned exactly with screenshot form representation
  const [providerUrl, setProviderUrl] = useState('https://siliconflow.cn');
  const [apiKey, setApiKey] = useState('');
  const [requestUrl, setRequestUrl] = useState('https://api.siliconflow.cn');
  const [isFullUrl, setIsFullUrl] = useState(false);
  const [apiFormat, setApiFormat] = useState<'openai' | 'anthropic'>('openai');
  const [authField, setAuthField] = useState('Authorization');

  // Multi-model role mapping states matching screenshot roles (Sonnet, Opus, Haiku)
  const [sonnetMapping, setSonnetMapping] = useState<ModelMappingItem>({
    displayName: 'Qwen/Qwen2.5-7B-Instruct',
    requestModel: 'Qwen/Qwen2.5-7B-Instruct',
    support1M: false
  });

  const [opusMapping, setOpusMapping] = useState<ModelMappingItem>({
    displayName: 'Qwen/Qwen2.5-7B-Instruct',
    requestModel: 'Qwen/Qwen2.5-7B-Instruct',
    support1M: false
  });

  const [haikuMapping, setHaikuMapping] = useState<ModelMappingItem>({
    displayName: 'Qwen/Qwen2.5-7B-Instruct',
    requestModel: 'Qwen/Qwen2.5-7B-Instruct',
    support1M: false
  });

  // Load existing configuration on mount
  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/config');
      if (res.ok) {
        const config: LLMConfig = await res.json();
        
        // Parse Request URL & Provider Ur
        if (config.BASE_URL) {
          setRequestUrl(config.BASE_URL);
          // Standard heuristics to map providerUrl
          try {
            const urlObj = new URL(config.BASE_URL);
            setProviderUrl(urlObj.origin.replace('api.', ''));
          } catch {
            setProviderUrl('https://siliconflow.cn');
          }
        }
        
        if (config.API_KEY) setApiKey(config.API_KEY);
        if (config.API_FORMAT) setApiFormat(config.API_FORMAT);
        if (config.AUTH_FIELD) setAuthField(config.AUTH_FIELD);

        // Map back role items
        if (config.MODEL_MAPPINGS) {
          if (config.MODEL_MAPPINGS.sonnet) setSonnetMapping(config.MODEL_MAPPINGS.sonnet);
          if (config.MODEL_MAPPINGS.opus) setOpusMapping(config.MODEL_MAPPINGS.opus);
          if (config.MODEL_MAPPINGS.haiku) setHaikuMapping(config.MODEL_MAPPINGS.haiku);
        } else {
          // Fallback to active chat model for display
          const activeChatModel = config.MODEL_NAME || 'gpt-4o-mini';
          setSonnetMapping({
            displayName: activeChatModel,
            requestModel: activeChatModel,
            support1M: false
          });
          setOpusMapping({
            displayName: activeChatModel,
            requestModel: activeChatModel,
            support1M: false
          });
          setHaikuMapping({
            displayName: activeChatModel,
            requestModel: activeChatModel,
            support1M: false
          });
        }
      }
    } catch (err: any) {
      showNotification('error', `载入配置文件失败: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  // Quick Preset Selector Auto Filler
  const handleQuickPreset = (preset: 'silicon' | 'openai' | 'deepseek') => {
    if (preset === 'silicon') {
      setProviderUrl('https://siliconflow.cn');
      setRequestUrl('https://api.siliconflow.cn');
      setApiFormat('openai');
      setAuthField('Authorization');
      setSonnetMapping({ displayName: 'Qwen/Qwen2.5-7B-Instruct', requestModel: 'Qwen/Qwen2.5-7B-Instruct', support1M: false });
      setOpusMapping({ displayName: 'Qwen/Qwen2.5-7B-Instruct', requestModel: 'Qwen/Qwen2.5-7B-Instruct', support1M: false });
      setHaikuMapping({ displayName: 'Qwen/Qwen2.5-7B-Instruct', requestModel: 'Qwen/Qwen2.5-7B-Instruct', support1M: false });
      showNotification('success', '已成功套用 SiliconFlow (硅基流动) 模版参数！');
    } else if (preset === 'openai') {
      setProviderUrl('https://openai.com');
      setRequestUrl('https://api.openai.com/v1');
      setApiFormat('openai');
      setAuthField('Authorization');
      setSonnetMapping({ displayName: 'gpt-4o-mini', requestModel: 'gpt-4o-mini', support1M: false });
      setOpusMapping({ displayName: 'gpt-4o', requestModel: 'gpt-4o', support1M: false });
      setHaikuMapping({ displayName: 'gpt-3.5-turbo', requestModel: 'gpt-3.5-turbo', support1M: false });
      showNotification('success', '已成功套用 OpenAI 官方模版参数！');
    } else if (preset === 'deepseek') {
      setProviderUrl('https://deepseek.com');
      setRequestUrl('https://api.deepseek.com/v1');
      setApiFormat('openai');
      setAuthField('Authorization');
      setSonnetMapping({ displayName: 'deepseek-chat', requestModel: 'deepseek-chat', support1M: true });
      setOpusMapping({ displayName: 'deepseek-reasoner', requestModel: 'deepseek-reasoner', support1M: false });
      setHaikuMapping({ displayName: 'deepseek-chat', requestModel: 'deepseek-chat', support1M: true });
      showNotification('success', '已成功套用 DeepSeek 官方模版参数！');
    }
  };

  // Save Settings handler
  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      // Formulate final configuration
      // We will map MODEL_NAME to sonnet requestModel as active chat engine default, or sonnet requestModel
      const primaryModel = sonnetMapping.requestModel || 'gpt-4o-mini';
      const embeddingModel = 'text-embedding-3-small'; // fallback vector embedder

      const payload: LLMConfig = {
        BASE_URL: requestUrl.trim(),
        API_KEY: apiKey.trim(),
        MODEL_NAME: primaryModel,
        EMBEDDING_MODEL_NAME: embeddingModel,
        API_FORMAT: apiFormat,
        AUTH_FIELD: authField,
        MODEL_MAPPINGS: {
          sonnet: sonnetMapping,
          opus: opusMapping,
          haiku: haikuMapping
        }
      };

      const response = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        showNotification('success', '供应商配置已成功更新并在当前平台实时生效！');
        if (onConfigSaved) {
          onConfigSaved();
        }
      } else {
        const data = await response.json();
        throw new Error(data.error || '保存失败');
      }
    } catch (err: any) {
      showNotification('error', `写入配置发生异常: ${err.message || err}`);
    } finally {
      setSaving(false);
    }
  };

  // Fetch remote list of models from backend proxy
  const handleFetchModels = async () => {
    setFetchingModels(true);
    try {
      const response = await fetch('/api/config/fetch-models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseUrl: requestUrl,
          apiKey: apiKey
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.models && Array.isArray(data.models) && data.models.length > 0) {
          setAvailableModels(data.models);
          showNotification('success', `成功从该端点拉取到 ${data.models.length} 个可用模型！已加载至下拉选项列表。`);
        } else {
          showNotification('info', '拉取成功，但该供应商没有返回任何公开模型代码。');
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to communicate with provider endpoints');
      }
    } catch (err: any) {
      showNotification('error', `获取模型列表失败: ${err.message || '请确认您的请求端点与 API Key 能够连通'}`);
    } finally {
      setFetchingModels(false);
    }
  };

  // Speed-test and Connectivity diagnostic check
  const handleTestConnection = async () => {
    setTesting(true);
    try {
      // Test URL formatting
      if (!requestUrl) {
        throw new Error('请输入服务端点请求地址');
      }
      
      const response = await fetch('/api/config/fetch-models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseUrl: requestUrl,
          apiKey: apiKey
        })
      });

      if (response.ok) {
        const data = await response.json();
        showNotification('success', `⚡ 链路连通测试极速通过！发现 ${data.models?.length || 0} 个计算引擎。`);
      } else {
        const text = await response.text();
        throw new Error(`端点握手失败并返回错误: ${response.status}`);
      }
    } catch (err: any) {
      showNotification('error', `💔 握手错误: ${err.message || err}. 请检查域名或安全令牌。`);
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50/25 h-full">
        <RefreshCw className="animate-spin text-indigo-600 mb-2" size={24} />
        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">正在初始化供应商配置数据库...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-[#fafbfe] p-8" id="config-manager-layout">
      {/* Header aligned exactly like mockup */}
      <div className="flex items-center justify-between mb-6 max-w-5xl">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack}
            className="w-10 h-10 rounded-full border border-slate-200/60 bg-white hover:bg-slate-50 text-slate-600 flex items-center justify-center transition-all cursor-pointer shadow-sm active:translate-y-px"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-base font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
              <span>编辑供应商</span>
              <span className="text-[10px] uppercase font-bold tracking-widest bg-violet-50 text-indigo-600 px-2 py-0.5 rounded-full border border-indigo-100">
                持久层同步
              </span>
            </h1>
            <p className="text-[11px] text-slate-400 font-medium">配置大语言模型底层路由、安全令牌以及参数矩阵。</p>
          </div>
        </div>

        {/* Quick Model Templates */}
        <div className="flex gap-2">
          <button
            onClick={() => handleQuickPreset('silicon')}
            className="px-3 py-1.5 bg-white border border-slate-200 hover:border-indigo-400 rounded-xl text-[10px] font-bold text-slate-600 transition-all cursor-pointer flex items-center gap-1 hover:text-indigo-600 active:translate-y-px"
          >
            <Zap size={11} className="text-amber-500" />
            <span>硅基流动 模板</span>
          </button>
          <button
            onClick={() => handleQuickPreset('deepseek')}
            className="px-3 py-1.5 bg-white border border-slate-200 hover:border-indigo-400 rounded-xl text-[10px] font-bold text-slate-600 transition-all cursor-pointer flex items-center gap-1 hover:text-indigo-600 active:translate-y-px"
          >
            <Globe size={11} className="text-blue-500" />
            <span>DeepSeek 模板</span>
          </button>
          <button
            onClick={() => handleQuickPreset('openai')}
            className="px-3 py-1.5 bg-white border border-slate-200 hover:border-indigo-400 rounded-xl text-[10px] font-bold text-slate-600 transition-all cursor-pointer flex items-center gap-1 hover:text-indigo-600 active:translate-y-px"
          >
            <Sparkles size={11} className="text-indigo-500 animate-pulse" />
            <span>OpenAI 官方 模板</span>
          </button>
        </div>
      </div>

      {/* Main Form Fields Container matching screenshot exactly */}
      <div className="max-w-5xl space-y-5 bg-white border border-slate-100 rounded-2xl p-6 shadow-xs">
        
        {/* Domain name field */}
        <div className="space-y-1.5">
          <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 font-sans">
            供应商全称 / 官方域名
          </label>
          <input
            type="text"
            value={providerUrl}
            onChange={(e) => setProviderUrl(e.target.value)}
            placeholder="例如 https://siliconflow.cn"
            className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-200/60 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500/25 focus:border-indigo-500 focus:bg-white transition-all font-mono"
            id="input-provider-domain"
          />
        </div>

        {/* API Key configuration with toggle */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 font-sans">
              API Key (安全认证令牌)
            </label>
            <a 
              href={providerUrl.includes('siliconflow') ? 'https://cloud.siliconflow.cn/account/ak' : 'https://platform.openai.com/api-keys'} 
              target="_blank" 
              rel="noreferrer"
              className="text-[10px] text-indigo-500 hover:text-indigo-700 font-bold decoration-0 tracking-tight flex items-center gap-0.5"
            >
              <span>获取 API Key</span>
              <span className="text-[8px]">&rarr;</span>
            </a>
          </div>
          <div className="relative">
            <input
              type={showApiKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="请输入供应商认证密钥 sk-..."
              className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50/50 border border-slate-200/60 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500/25 focus:border-indigo-500 focus:bg-white transition-all font-mono"
              id="input-api-key"
            />
            <button
              type="button"
              onClick={() => setShowApiKey(!showApiKey)}
              className="absolute right-3 top-2.5 p-1 text-slate-400 hover:text-slate-600 transition-colors border-0 bg-transparent cursor-pointer"
            >
              {showApiKey ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>

        {/* Endpoint address field */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 font-sans">请求地址 / BASE_URL</span>
              <div className="flex items-center gap-1 bg-slate-100 rounded-full px-2 py-0.5 scale-90 border border-slate-200">
                <span className="text-[8px] text-slate-500 font-bold">完整 URL</span>
                <input 
                  type="checkbox" 
                  checked={isFullUrl}
                  onChange={(e) => {
                    setIsFullUrl(e.target.checked);
                    if (e.target.checked && !requestUrl.endsWith('/chat/completions')) {
                      setRequestUrl(prev => prev.replace(/\/+$/, '') + '/chat/completions');
                    } else if (!e.target.checked && requestUrl.endsWith('/chat/completions')) {
                      setRequestUrl(prev => prev.replace(/\/chat\/completions$/, ''));
                    }
                  }}
                  className="w-3.5 h-3.5 text-indigo-600 rounded cursor-pointer border-slate-300"
                />
              </div>
            </div>

            <button
              onClick={handleTestConnection}
              disabled={testing}
              className="text-[10px] text-indigo-500 hover:text-indigo-700 font-bold flex items-center gap-1 cursor-pointer border-0 bg-transparent outline-none disabled:opacity-50"
            >
              {testing ? <RefreshCw size={11} className="animate-spin" /> : <Zap size={11} className="text-amber-500" />}
              <span>管理与测速</span>
            </button>
          </div>
          <input
            type="text"
            value={requestUrl}
            onChange={(e) => setRequestUrl(e.target.value)}
            placeholder="例如 https://api.siliconflow.cn/v1"
            className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-200/60 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500/25 focus:border-indigo-500 focus:bg-white transition-all font-mono"
            id="input-endpoint-url"
          />

          {/* Yellow styled help block from mockup */}
          <div className="p-3 bg-amber-50/40 border border-amber-200/40 rounded-xl flex items-start gap-2 text-[10px] text-amber-700 font-medium">
            <span className="text-xs">💡</span>
            <span>填写兼容 OpenAI / Claude API 的核心底层代理端点，请检查不要以斜杠结束（例如 SiliconFlow 端点请填写 "https://api.siliconflow.cn" 或 "/v1"）。</span>
          </div>
        </div>

        {/* Collapsable Advanced options accordion */}
        <div className="border border-slate-100 rounded-xl overflow-hidden shadow-xs">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100/50 text-left flex justify-between items-center border-b border-slate-100 cursor-pointer"
          >
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Settings size={13} className="text-slate-500" />
              <span>高级选项 (Advanced Configurations)</span>
            </span>
            {showAdvanced ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
          </button>

          {showAdvanced && (
            <div className="p-4 bg-white grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* API Form */}
              <div className="space-y-1">
                <label className="text-[9px] uppercase tracking-wider font-extrabold text-slate-450 font-sans">
                  API 格式 (Payload Format Schema)
                </label>
                <select
                  value={apiFormat}
                  onChange={(e) => setApiFormat(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="openai">OpenAI (兼容 / 原生)</option>
                  <option value="anthropic">Anthropic Messages (原生 Claude 端点)</option>
                </select>
                <p className="text-[8px] text-slate-400 font-medium mt-1">选择目标供应商 API 的协议解析形式。</p>
              </div>

              {/* API authentication field variable */}
              <div className="space-y-1">
                <label className="text-[9px] uppercase tracking-wider font-extrabold text-slate-450 font-sans">
                  认证字段 (Variable/Header Name)
                </label>
                <select
                  value={authField}
                  onChange={(e) => setAuthField(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="Authorization">Authorization (Bearer sk-...)</option>
                  <option value="x-api-key">X-API-KEY / x-api-key (Anthropic 格式规格)</option>
                  <option value="api-key">api-key (Azure OpenAI 格式规格)</option>
                </select>
                <p className="text-[8px] text-slate-400 font-medium mt-1">选择写入配置的 header 头域或者是注入环境变量命。</p>
              </div>
            </div>
          )}
        </div>

        {/* Model mappings layout aligned with mockup screenshot */}
        <div className="space-y-3 pt-2">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                模型映射 (Service Model Matrix Mappings)
              </h3>
              <p className="text-[9px] text-slate-400 font-medium mt-0.5">映射模型角色到具体底层 API model 命名空间。显示名称仅用于界面菜单标签显示。</p>
            </div>

            {/* Quick-fetch buttons */}
            <div className="flex gap-1.5">
              <button
                onClick={() => handleQuickPreset('silicon')}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200/70 border border-slate-200 rounded-lg text-[9px] font-bold text-slate-600 transition-all cursor-pointer flex items-center gap-1"
              >
                <CheckCircle size={10} className="text-indigo-500" />
                <span>一键设置</span>
              </button>
              <button
                onClick={handleFetchModels}
                disabled={fetchingModels}
                className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 text-slate-600 hover:text-indigo-600 rounded-lg text-[9px] font-bold transition-all cursor-pointer flex items-center gap-1 disabled:opacity-50"
              >
                {fetchingModels ? <RefreshCw size={10} className="animate-spin" /> : <span>🔄</span>}
                <span>获取模型列表</span>
              </button>
            </div>
          </div>

          {/* Table Header labels */}
          <div className="grid grid-cols-12 gap-3 text-[9px] font-extrabold text-slate-400 uppercase tracking-wider px-2 border-b border-slate-100 pb-1 font-sans">
            <div className="col-span-2">模型角色</div>
            <div className="col-span-5">显示名称</div>
            <div className="col-span-4">实际请求模型</div>
            <div className="col-span-1 text-center">1M 上下文</div>
          </div>

          {/* Table list rows based on the mockup screenshot */}
          <div className="space-y-2.5">
            
            {/* 1. Sonnet Role Mapping */}
            <div className="grid grid-cols-12 gap-3 items-center px-2 py-1 bg-slate-50/20 rounded-xl border border-slate-100/50 hover:border-slate-200 transition-all hover:bg-white">
              <div className="col-span-2">
                <span className="inline-flex px-2.5 py-1 rounded-lg text-[9px] font-extrabold uppercase bg-violet-50 text-violet-600 border border-violet-100 text-center justify-center w-20">
                  Sonnet
                </span>
              </div>
              <div className="col-span-5">
                <input
                  type="text"
                  value={sonnetMapping.displayName}
                  onChange={(e) => setSonnetMapping({ ...sonnetMapping, displayName: e.target.value })}
                  placeholder="请输入友好展示名称..."
                  className="w-full px-3 py-1.5 bg-white border border-slate-250 rounded-lg text-[11px] font-semibold text-slate-700"
                />
              </div>
              <div className="col-span-4 relative">
                {availableModels.length > 0 ? (
                  <select
                    value={sonnetMapping.requestModel}
                    onChange={(e) => setSonnetMapping({ ...sonnetMapping, requestModel: e.target.value })}
                    className="w-full px-3 py-1.5 bg-white border border-slate-250 rounded-lg text-[11px] font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                  >
                    {!availableModels.includes(sonnetMapping.requestModel) && (
                      <option value={sonnetMapping.requestModel}>{sonnetMapping.requestModel} (手动)</option>
                    )}
                    {availableModels.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={sonnetMapping.requestModel}
                    onChange={(e) => setSonnetMapping({ ...sonnetMapping, requestModel: e.target.value })}
                    placeholder="Qwen/Qwen2.5-72B-Instruct..."
                    className="w-full px-3 py-1.5 bg-white border border-slate-250 rounded-lg text-[11px] font-semibold text-slate-700 font-mono"
                  />
                )}
              </div>
              <div className="col-span-1 flex justify-center items-center gap-1 select-none">
                <input
                  type="checkbox"
                  checked={sonnetMapping.support1M}
                  onChange={(e) => setSonnetMapping({ ...sonnetMapping, support1M: e.target.checked })}
                  className="w-3.5 h-3.5 text-indigo-600 rounded cursor-pointer border-slate-300 focus:ring-indigo-500"
                />
                <span className="text-[9px] text-slate-500 font-bold font-mono">1M</span>
              </div>
            </div>

            {/* 2. Opus Role Mapping */}
            <div className="grid grid-cols-12 gap-3 items-center px-2 py-1 bg-slate-50/20 rounded-xl border border-slate-100/50 hover:border-slate-200 transition-all hover:bg-white">
              <div className="col-span-2">
                <span className="inline-flex px-2.5 py-1 rounded-lg text-[9px] font-extrabold uppercase bg-rose-50 text-rose-600 border border-rose-100 text-center justify-center w-20">
                  Opus
                </span>
              </div>
              <div className="col-span-5">
                <input
                  type="text"
                  value={opusMapping.displayName}
                  onChange={(e) => setOpusMapping({ ...opusMapping, displayName: e.target.value })}
                  placeholder="请输入友好展示名称..."
                  className="w-full px-3 py-1.5 bg-white border border-slate-250 rounded-lg text-[11px] font-semibold text-slate-700"
                />
              </div>
              <div className="col-span-4">
                {availableModels.length > 0 ? (
                  <select
                    value={opusMapping.requestModel}
                    onChange={(e) => setOpusMapping({ ...opusMapping, requestModel: e.target.value })}
                    className="w-full px-3 py-1.5 bg-white border border-slate-250 rounded-lg text-[11px] font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                  >
                    {!availableModels.includes(opusMapping.requestModel) && (
                      <option value={opusMapping.requestModel}>{opusMapping.requestModel} (手动)</option>
                    )}
                    {availableModels.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={opusMapping.requestModel}
                    onChange={(e) => setOpusMapping({ ...opusMapping, requestModel: e.target.value })}
                    placeholder="例如 deepseek-reasoner..."
                    className="w-full px-3 py-1.5 bg-white border border-slate-250 rounded-lg text-[11px] font-semibold text-slate-700 font-mono"
                  />
                )}
              </div>
              <div className="col-span-1 flex justify-center items-center gap-1 select-none">
                <input
                  type="checkbox"
                  checked={opusMapping.support1M}
                  onChange={(e) => setOpusMapping({ ...opusMapping, support1M: e.target.checked })}
                  className="w-3.5 h-3.5 text-indigo-600 rounded cursor-pointer border-slate-300 focus:ring-indigo-500"
                />
                <span className="text-[9px] text-slate-500 font-bold font-mono">1M</span>
              </div>
            </div>

            {/* 3. Haiku Role Mapping */}
            <div className="grid grid-cols-12 gap-3 items-center px-2 py-1 bg-slate-50/20 rounded-xl border border-slate-100/50 hover:border-slate-200 transition-all hover:bg-white">
              <div className="col-span-2">
                <span className="inline-flex px-2.5 py-1 rounded-lg text-[9px] font-extrabold uppercase bg-amber-50 text-amber-600 border border-amber-100 text-center justify-center w-20">
                  Haiku
                </span>
              </div>
              <div className="col-span-5">
                <input
                  type="text"
                  value={haikuMapping.displayName}
                  onChange={(e) => setHaikuMapping({ ...haikuMapping, displayName: e.target.value })}
                  placeholder="请输入友好展示名称..."
                  className="w-full px-3 py-1.5 bg-white border border-slate-250 rounded-lg text-[11px] font-semibold text-slate-700"
                />
              </div>
              <div className="col-span-4">
                {availableModels.length > 0 ? (
                  <select
                    value={haikuMapping.requestModel}
                    onChange={(e) => setHaikuMapping({ ...haikuMapping, requestModel: e.target.value })}
                    className="w-full px-3 py-1.5 bg-white border border-slate-250 rounded-lg text-[11px] font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                  >
                    {!availableModels.includes(haikuMapping.requestModel) && (
                      <option value={haikuMapping.requestModel}>{haikuMapping.requestModel} (手动)</option>
                    )}
                    {availableModels.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={haikuMapping.requestModel}
                    onChange={(e) => setHaikuMapping({ ...haikuMapping, requestModel: e.target.value })}
                    placeholder="Qwen/Qwen2.5-14B-Instruct..."
                    className="w-full px-3 py-1.5 bg-white border border-slate-250 rounded-lg text-[11px] font-semibold text-slate-700 font-mono"
                  />
                )}
              </div>
              <div className="col-span-1 flex justify-center items-center gap-1 select-none">
                <input
                  type="checkbox"
                  checked={haikuMapping.support1M}
                  onChange={(e) => setHaikuMapping({ ...haikuMapping, support1M: e.target.checked })}
                  className="w-3.5 h-3.5 text-indigo-600 rounded cursor-pointer border-slate-300 focus:ring-indigo-500"
                />
                <span className="text-[9px] text-slate-500 font-bold font-mono">1M</span>
              </div>
            </div>

          </div>
        </div>

        {/* Form Actions Footer Bar */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onBack}
            className="px-5 py-2.5 bg-[#f1f3f9] hover:bg-[#e4ebf5] text-slate-700 font-bold rounded-xl text-xs transition-all flex items-center justify-center hover:text-slate-900 cursor-pointer"
          >
            取消修改
          </button>
          
          <button
            type="button"
            onClick={handleSaveConfig}
            disabled={saving}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 hover:shadow-indigo-100/80 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-indigo-100/40 cursor-pointer flex items-center gap-1.5 disabled:opacity-50 select-none active:translate-y-px outline-none border-0"
          >
            {saving ? (
              <>
                <RefreshCw size={13} className="animate-spin" />
                <span>正在重组并保存持久层数据...</span>
              </>
            ) : (
              <>
                <span>✔ 保存服务供应商配置</span>
              </>
            )}
          </button>
        </div>

      </div>

      {/* Aesthetic helper badge */}
      <div className="mt-6 flex items-center gap-1.5 text-[10px] text-slate-400 max-w-5xl justify-center font-mono select-none">
        <span>AmiMind Platform Engine sync module v4.2 • Secure JSON storage active</span>
      </div>

    </div>
  );
}
