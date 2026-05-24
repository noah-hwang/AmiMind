import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, Activity, Play, HelpCircle, Code, CheckCircle, Database, Calculator } from 'lucide-react';

const SIMULATOR_PRESETS = [
  {
    title: "高重合：Docker高可用部署",
    query: "如何使用 Docker 编排服务并启动 API 核心和容器网络？",
    doc: "Run 'docker-compose up -d --build' using the root orchestrator, dividing current structures into UI front-end, Express API core, and Qdrant DB clusters. All services are isolated on 'rag-net' network driver.",
    expectedScore: "极高匹配（~0.60）"
  },
  {
    title: "中等重合：端口及安全性咨询",
    query: "系统外网安全端口是多少？内部微服务用的什么接口？",
    doc: "Port 3000 is the primary externally routing port exposed via reverse-proxy, whereas inner microservices bind internally to port 8080 or other specific listener configs to prevent ingress leaks.",
    expectedScore: "中等匹配（~0.30）"
  },
  {
    title: "无相关：无关休闲话题",
    query: "今天的天气怎么样，你喜欢看足球比赛或者打游戏吗？",
    doc: "Files up to 10MB can be processed securely directly on standard server configurations. Standard listens standard parameters for high-performance Weighted Round Robin load balancing rules.",
    expectedScore: "几乎不匹配（<0.05）"
  }
];

export default function InteractiveSimulator() {
  const [queryText, setQueryText] = useState(SIMULATOR_PRESETS[0].query);
  const [docText, setDocText] = useState(SIMULATOR_PRESETS[0].doc);
  const [simId, setSimId] = useState<number>(0);
  
  // Real Calculation indicators
  const [score, setScore] = useState<number>(0);
  const [dotProductVal, setDotProductVal] = useState<number>(0);
  const [magA, setMagA] = useState<number>(0);
  const [magB, setMagB] = useState<number>(0);
  const [allTokens, setAllTokens] = useState<string[]>([]);
  
  // Process step simulation for RAG workflow
  const [ragProgress, setRagProgress] = useState<number>(-1);
  const [ragLogs, setRagLogs] = useState<string[]>([]);

  // Calculate genuine cosine similarity in client
  const runCalculation = () => {
    if (!queryText.trim() || !docText.trim()) {
      setScore(0);
      setDotProductVal(0);
      setMagA(0);
      setMagB(0);
      setAllTokens([]);
      return;
    }

    // Standard word tokenizer regex
    const wordRegex = /[\u4e00-\u9fa5]+|[a-zA-Z0-9]+/g;
    const tokens1 = queryText.toLowerCase().match(wordRegex) || [];
    const tokens2 = docText.toLowerCase().match(wordRegex) || [];

    const freq1: Record<string, number> = {};
    const freq2: Record<string, number> = {};
    const wordsSet = new Set<string>();

    tokens1.forEach(w => {
      freq1[w] = (freq1[w] || 0) + 1;
      wordsSet.add(w);
    });

    tokens2.forEach(w => {
      freq2[w] = (freq2[w] || 0) + 1;
      wordsSet.add(w);
    });

    const uniqueWords = Array.from(wordsSet);
    setAllTokens(uniqueWords.slice(0, 12)); // Display top 12 vectors

    let dot = 0;
    let sum1 = 0;
    let sum2 = 0;

    uniqueWords.forEach(w => {
      const v1 = freq1[w] || 0;
      const v2 = freq2[w] || 0;
      dot += v1 * v2;
      sum1 += v1 * v1;
      sum2 += v2 * v2;
    });

    const magnitude1 = Math.sqrt(sum1);
    const magnitude2 = Math.sqrt(sum2);
    
    setDotProductVal(dot);
    setMagA(Number(magnitude1.toFixed(3)));
    setMagB(Number(magnitude2.toFixed(3)));

    if (magnitude1 === 0 || magnitude2 === 0) {
      setScore(0);
    } else {
      const result = dot / (magnitude1 * magnitude2);
      setScore(Number(result.toFixed(4)));
    }
  };

  useEffect(() => {
    runCalculation();
  }, [queryText, docText]);

  const selectPreset = (idx: number) => {
    setSimId(idx);
    setQueryText(SIMULATOR_PRESETS[idx].query);
    setDocText(SIMULATOR_PRESETS[idx].doc);
  };

  const triggerRagFlow = () => {
    setRagProgress(0);
    setRagLogs(["正在请求 智脑-embedding-2-preview 对查询进行高维特征转换...", "成功生成 768-D 向量表征 A。"]);
    
    setTimeout(() => {
      setRagProgress(1);
      setRagLogs(prev => [...prev, "执行向量空间 Cosine Similarity 计算...", `计算得出当前特征重合余弦距离为: ${score}`, score >= 0.1 ? "✅ 相似系数 > 0.10，触发相似段落检索！" : "⚠️ 相似度过低，已被余弦阈值拦截。"]);
    }, 1200);

    setTimeout(() => {
      setRagProgress(2);
      setRagLogs(prev => [...prev, "将匹配文档片段注入 System Prompt 系统上下文中...", "组装 Grounding 规约语料，防止大模型发生逻辑幻觉。"]);
    }, 2400);

    setTimeout(() => {
      setRagProgress(3);
      setRagLogs(prev => [...prev, "将规约后的提示词路由到 智脑-3.5-flash 会话生成计算子环...", "成功回复！已附带 [Source] 标准置信度引证。"]);
    }, 3600);
  };

  return (
    <div className="space-y-8 select-none" id="algorithm-playground-wrapper">
      
      {/* Selector tab buttons */}
      <div className="space-y-3">
        <label className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block">第一步：选择内置场景或输入您的专属测试语料</label>
        <div className="flex flex-wrap gap-2">
          {SIMULATOR_PRESETS.map((preset, idx) => (
            <button
              key={idx}
              onClick={() => selectPreset(idx)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer border transition-all ${
                simId === idx
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {preset.title}
            </button>
          ))}
        </div>
      </div>

      {/* Two Textboxes layout side-by-side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Left Input */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-xs font-bold text-slate-700">询问词 Query (A)</label>
            <span className="text-[9px] text-indigo-500 font-mono">矢量长度: {queryText.length}</span>
          </div>
          <textarea
            value={queryText}
            onChange={(e) => setQueryText(e.target.value)}
            className="w-full text-xs p-3.5 bg-slate-50 border border-slate-200 focus:bg-white focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400 rounded-2xl outline-none font-medium text-slate-800 transition-all h-24 resize-none leading-relaxed"
            placeholder="输入询问事实词，例如产品最大尺寸限制..."
          />
        </div>

        {/* Right Input */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-xs font-bold text-slate-700">语料文档段落 Document Segment (B)</label>
            <span className="text-[9px] text-indigo-500 font-mono">矢量长度: {docText.length}</span>
          </div>
          <textarea
            value={docText}
            onChange={(e) => setDocText(e.target.value)}
            className="w-full text-xs p-3.5 bg-slate-50 border border-slate-200 focus:bg-white focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400 rounded-2xl outline-none font-medium text-slate-800 transition-all h-24 resize-none leading-relaxed"
            placeholder="输入本地文档段落，作为检索的基础事实库..."
          />
        </div>

      </div>

      {/* Numerical Analysis Panel */}
      <div className="bg-slate-50/70 border border-slate-150 rounded-2xl p-5 space-y-4">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Calculator size={16} className="text-indigo-600 shrink-0" />
            <span className="text-xs font-black text-slate-700">余弦度量解析式:</span>
            <span className="font-mono text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded border border-indigo-100 font-bold">
              Cosine(A, B) = (A • B) / (||A|| * ||B||)
            </span>
          </div>
          
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-500">测得相似度：</span>
            <div className={`text-sm font-black px-3.5 py-1 rounded-xl shadow-xs font-mono select-all border ${
              score >= 0.3 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                : score >= 0.1 
                ? 'bg-amber-50 border-amber-200 text-amber-700' 
                : 'bg-rose-50 border-rose-250 text-rose-700'
            }`}>
              {score}
            </div>
          </div>
        </div>

        {/* Custom calculation steps breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
          <div className="bg-white p-3 rounded-xl border border-slate-200/50 flex flex-col justify-between">
            <span className="text-[9px] text-slate-400 font-bold uppercase">点积 Dot Product (A • B)</span>
            <span className="text-base font-black text-slate-800 font-mono mt-1">{dotProductVal}</span>
          </div>
          <div className="bg-white p-3 rounded-xl border border-slate-200/50 flex flex-col justify-between">
            <span className="text-[9px] text-slate-400 font-bold uppercase">模长 Query Vector ||A||</span>
            <span className="text-base font-black text-slate-800 font-mono mt-1">{magA}</span>
          </div>
          <div className="bg-white p-3 rounded-xl border border-slate-200/50 flex flex-col justify-between">
            <span className="text-[9px] text-slate-400 font-bold uppercase">模长 Doc Vector ||B||</span>
            <span className="text-base font-black text-slate-800 font-mono mt-1">{magB}</span>
          </div>
          <div className="bg-white p-3 rounded-xl border border-slate-200/50 flex flex-col justify-between">
            <span className="text-[9px] text-slate-400 font-bold uppercase">RAG 拦截评估 status</span>
            <span className={`text-[11px] font-black mt-1 font-sans ${score >= 0.1 ? 'text-emerald-600' : 'text-rose-500'}`}>
              {score >= 0.1 ? "✅ 高于0.1阈值：起用召回" : "❌ 低于阈值：拦截规避"}
            </span>
          </div>
        </div>

        {/* Mini token array visualization */}
        <div className="space-y-2 pt-1">
          <span className="text-[9px] text-slate-400 font-bold uppercase block">合并唯一特征向量词云 (A & B Elements):</span>
          <div className="flex flex-wrap gap-1.5">
            {allTokens.map((tok, i) => {
              const insideA = queryText.toLowerCase().includes(tok.toLowerCase());
              const insideB = docText.toLowerCase().includes(tok.toLowerCase());
              return (
                <span 
                  key={i} 
                  className={`text-[9px] font-sans px-2 py-0.5 rounded-md font-extrabold border ${
                    insideA && insideB 
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-xs' 
                      : 'bg-slate-100 border-slate-200 text-slate-500'
                  }`}
                >
                  {tok} {insideA && insideB ? '✦' : ''}
                </span>
              );
            })}
            {allTokens.length === 0 && (
              <span className="text-[9px] text-slate-300 font-semibold italic">暂未发现共有中文特征词。</span>
            )}
          </div>
        </div>

      </div>

      {/* RAG Pipeline simulation layout */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <label className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block">第二步：RAG 智能召回管线吞吐流程模拟</label>
            <p className="text-[10px] text-slate-400 font-medium">体验 RAG 在底层计算时是如何进行词向量映射及事实注入的。</p>
          </div>
          <button
            onClick={triggerRagFlow}
            className="px-4 py-2 bg-gradient-to-r from-[#524bf2] to-indigo-600 hover:opacity-95 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 transition-all"
          >
            <Play size={12} fill="white" />
            <span>执行完整的 RAG 语义计算流 &rarr;</span>
          </button>
        </div>

        {/* Process nodes progress bar */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          
          <div className={`p-4 rounded-xl border transition-all ${
            ragProgress >= 0 
              ? 'bg-indigo-50/40 border-indigo-200 text-indigo-850' 
              : 'bg-white border-slate-200 text-slate-400'
          }`}>
            <div className="flex items-center gap-2 mb-1.5">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono font-bold ${
                ragProgress >= 0 ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'
              }`}>1</span>
              <span className="text-xs font-bold tracking-tight">语义嵌入</span>
            </div>
            <p className="text-[9px] leading-relaxed">对搜索词Query生成768维数学矩阵，代表其特有的语义语境。</p>
          </div>

          <div className={`p-4 rounded-xl border transition-all ${
            ragProgress >= 1 
              ? 'bg-indigo-50/40 border-indigo-200 text-indigo-850' 
              : 'bg-white border-slate-200 text-slate-400'
          }`}>
            <div className="flex items-center gap-2 mb-1.5">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono font-bold ${
                ragProgress >= 1 ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'
              }`}>2</span>
              <span className="text-xs font-bold tracking-tight">余弦度量检索</span>
            </div>
            <p className="text-[9px] leading-relaxed">高速扫描向量库中的高维区间，匹配与当前 Query 相似度最高的切片。</p>
          </div>

          <div className={`p-4 rounded-xl border transition-all ${
            ragProgress >= 2 
              ? 'bg-indigo-50/40 border-indigo-200 text-indigo-850' 
              : 'bg-white border-slate-200 text-slate-400'
          }`}>
            <div className="flex items-center gap-2 mb-1.5">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono font-bold ${
                ragProgress >= 2 ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'
              }`}>3</span>
              <span className="text-xs font-bold tracking-tight">上下文格式化</span>
            </div>
            <p className="text-[9px] leading-relaxed">将高相似度片段组装为 Grounding 前置语料，并对其他字段进行剔除隔离。</p>
          </div>

          <div className={`p-4 rounded-xl border transition-all ${
            ragProgress >= 3 
              ? 'bg-indigo-50/40 border-indigo-200 text-indigo-850' 
              : 'bg-white border-slate-200 text-slate-400'
          }`}>
            <div className="flex items-center gap-2 mb-1.5">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono font-bold ${
                ragProgress >= 3 ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'
              }`}>4</span>
              <span className="text-xs font-bold tracking-tight">模型生成回答</span>
            </div>
            <p className="text-[9px] leading-relaxed">交付至智脑计算模块。限制其仅依据提供的 Grounding 进行回答，零幻觉。</p>
          </div>

        </div>

        {/* Simulation logs console */}
        {ragLogs.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 text-indigo-200 p-4 rounded-xl font-mono text-[9px] space-y-1 select-text">
            <span className="text-[#a5b4fc] font-bold block pb-1 border-b border-slate-800 mb-1.5 flex items-center gap-1.5">
              <Activity size={10} className="animate-pulse" /> SYSTEM LOGS (SIMULATED RAG ENGINE)
            </span>
            {ragLogs.map((log, index) => (
              <div key={index} className="flex gap-2">
                <span className="text-slate-500 font-bold whitespace-nowrap">[{new Date().toLocaleTimeString()}]</span>
                <span className="text-slate-300">{log}</span>
              </div>
            ))}
          </div>
        )}

      </div>

    </div>
  );
}
