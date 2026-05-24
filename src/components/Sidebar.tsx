import React from 'react';
import { Database, FileText, Cpu, Shield, Trash2, Layers, RefreshCw, Settings, Brain, Sparkles, LayoutDashboard } from 'lucide-react';
import { SystemStats } from '../types';

interface SidebarProps {
  stats: SystemStats | null;
  onReset: () => void;
  loadingReset: boolean;
  activeTab: 'portal' | 'rag' | 'docs' | 'config' | 'admin';
  setActiveTab: (tab: 'portal' | 'rag' | 'docs' | 'config' | 'admin') => void;
  currentUser: string | null;
  onAuthTrigger: () => void;
}

export default function Sidebar({
  stats,
  onReset,
  loadingReset,
  activeTab,
  setActiveTab,
  currentUser,
  onAuthTrigger,
}: SidebarProps) {
  const documentChunks = stats?.chunksCount || 0;

  const handleTabClick = (tab: 'portal' | 'rag' | 'docs' | 'config' | 'admin') => {
    if (tab !== 'portal' && !currentUser) {
      alert('请登录免费使用');
      onAuthTrigger();
      return;
    }
    setActiveTab(tab);
  };

  const handleAction = (callback: () => void) => {
    if (!currentUser) {
      alert('请登录免费使用');
      onAuthTrigger();
      return;
    }
    callback();
  };

  return (
    <aside className="w-72 border-r border-slate-100 bg-white flex flex-col h-full select-none" id="app-sidebar">
      {/* Brand Header inspired by the screenshot's 'f' blue logo and elegant layout */}
      <div className="p-5 border-b border-slate-100 flex items-center gap-3">
        <div className="w-9 h-9 bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-indigo-150 flex-shrink-0 relative overflow-hidden">
          <div className="absolute inset-0 bg-white/5 flex items-center justify-center">
            <Brain size={17} className="text-white drop-shadow-sm animate-pulse" />
          </div>
        </div>
        <div>
          <h1 className="font-bold text-sm tracking-tight text-slate-800">
            AmiMind 平台
          </h1>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[9px] uppercase tracking-wider bg-violet-50 text-indigo-600 px-1.5 py-0.5 rounded-full font-bold border border-indigo-100">
              Agent 工作流
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Buttons based on the sidebar layout in the image */}
      <nav className="p-5 space-y-5 flex-1 overflow-y-auto">
        
        <div>
          <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase px-3 mb-2.5">Agent 空间</p>
          <div className="space-y-1">
            <button
              onClick={() => handleTabClick('portal')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'portal'
                  ? 'bg-indigo-50/70 text-indigo-600 border border-indigo-100/70 shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
              }`}
              id="tab-project-portal"
            >
              <Sparkles size={15} className={`${activeTab === 'portal' ? 'text-indigo-600' : 'text-slate-400'}`} />
              <span>产品展示与价值门户</span>
            </button>

            <button
              onClick={() => handleTabClick('rag')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'rag'
                  ? 'bg-indigo-50/70 text-indigo-600 border border-indigo-100/70 shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
              }`}
              id="tab-rag-qa"
            >
              <Cpu size={15} className={`${activeTab === 'rag' ? 'text-indigo-600' : 'text-slate-400'}`} />
              <span>智能问答大工作区</span>
            </button>

            <button
              onClick={() => handleTabClick('docs')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'docs'
                  ? 'bg-indigo-50/70 text-indigo-600 border border-indigo-100/70 shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
              }`}
              id="tab-documents"
            >
              <FileText size={15} className={`${activeTab === 'docs' ? 'text-indigo-600' : 'text-slate-400'}`} />
              <span>知识文档管理中心</span>
            </button>

            {currentUser === 'admin@amimind.com' && (
              <button
                onClick={() => handleTabClick('config')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'config'
                    ? 'bg-indigo-50/70 text-indigo-600 border border-indigo-100/70 shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                }`}
                id="tab-llm-config"
              >
                <Settings size={15} className={`${activeTab === 'config' ? 'text-indigo-600' : 'text-slate-400'}`} />
                <span>大模型与供应商配置</span>
              </button>
            )}

            {currentUser === 'admin@amimind.com' && (
              <button
                onClick={() => handleTabClick('admin')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'admin'
                    ? 'bg-indigo-50/70 text-indigo-600 border border-indigo-100/70 shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                }`}
                id="tab-admin"
              >
                <LayoutDashboard size={15} className={`${activeTab === 'admin' ? 'text-indigo-600' : 'text-slate-400'}`} />
                <span>管理后台</span>
              </button>
            )}
          </div>
        </div>

        {/* Database Status Monitor Card */}
        <div className="pt-4 border-t border-slate-100">
          <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase px-3 mb-2.5">实时库 status指标</p>
          <div className="bg-slate-50/70 rounded-2xl border border-slate-200/50 p-3.5 space-y-3" id="metrics-card">
            <div className="flex justify-between items-center pb-2 border-b border-slate-150">
              <span className="text-[10px] text-slate-500 font-bold flex items-center gap-1">
                <Shield size={11} className="text-emerald-500" /> 向量节点状态
              </span>
              <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-bold uppercase ${
                stats?.vectorDbStatus === 'Healthy' 
                  ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                  : 'bg-amber-50 text-amber-600 border border-amber-100'
              }`}>
                {stats?.vectorDbStatus === 'Healthy' ? '健康就绪' : '静态空置'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              <div className="bg-white p-2 rounded-xl border border-slate-100 text-center shadow-xs">
                <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">已导文档</p>
                <p className="text-sm font-bold text-slate-800 mt-0.5">{stats?.documentsCount || 0}</p>
              </div>
              <div className="bg-white p-2 rounded-xl border border-slate-100 text-center shadow-xs">
                <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">向量切片</p>
                <p className="text-sm font-bold text-slate-800 mt-0.5">{stats?.chunksCount || 0}</p>
              </div>
            </div>

            <div className="space-y-1 text-[9px] text-slate-500 font-medium pt-1">
              <div className="flex justify-between">
                <span>向量维度:</span>
                <span className="font-mono text-slate-700 font-semibold font-bold">768 维</span>
              </div>
              <div className="flex justify-between">
                <span>覆盖字符:</span>
                <span className="font-mono text-slate-700 font-semibold font-bold">{(stats?.totalWords || 0).toLocaleString()} 字符</span>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Account Info and Upgrade Action Card matching the precise styling of the uploaded image */}
      <div className="p-4 border-t border-slate-105 bg-slate-50/50 space-y-3" id="sidebar-footer">
        <div className="space-y-2 px-1">
          <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold">
            <span>积分用量</span>
            <span className="font-mono text-slate-700">{documentChunks ? Math.min(100, documentChunks * 4) : 0} / 100</span>
          </div>
          <div className="w-full bg-slate-200/50 h-2 rounded-full overflow-hidden p-[1px]">
            <div 
              className="bg-indigo-600 h-full rounded-full transition-all duration-500 bg-gradient-to-r from-blue-500 to-indigo-600" 
              style={{ width: `${documentChunks ? Math.min(100, Math.max(12, documentChunks * 4)) : 12}%` }} 
            />
          </div>
          <p className="text-[10px] text-slate-500 flex justify-between items-center">
            <span>当前套餐: <span className="bg-indigo-50 text-indigo-600 px-1.5 py-0.2 rounded font-mono font-bold">免费版</span></span>
            <span className="text-[9px] text-slate-400">无限次问答</span>
          </p>
        </div>

        {/* Upgrade beautiful Button from mockup */}
        <button 
          onClick={() => handleAction(() => alert('已为您激活 AmiMind 卓越订阅：获得无限向量索引及毫秒级模型路由优先权！'))}
          className="w-full py-2.5 px-4 bg-gradient-to-r from-pink-500 via-rose-500 to-indigo-600 hover:opacity-95 text-white rounded-xl text-center font-bold text-xs shadow-md shadow-pink-100/50 transition-all flex items-center justify-center gap-1.5 cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0"
        >
          <span>⚡ 去升级</span>
        </button>

        {/* Danger Purge button */}
        <button
          onClick={() => handleAction(onReset)}
          disabled={loadingReset || !stats?.chunksCount}
          className="w-full flex items-center justify-center gap-1.5 py-2 text-slate-400 hover:text-rose-600 border border-transparent hover:bg-rose-50/40 rounded-xl text-[10px] font-semibold transition-all disabled:opacity-40 disabled:pointer-events-none"
        >
          {loadingReset ? (
            <RefreshCw size={12} className="animate-spin" />
          ) : (
            <Trash2 size={12} />
          )}
          <span>清空本地知识库</span>
        </button>
      </div>
    </aside>
  );
}
