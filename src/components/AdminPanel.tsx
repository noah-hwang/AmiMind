import React, { useState, useEffect, useCallback } from 'react';
import { Users, FileText, MessageSquare, RefreshCw, ChevronRight, Clock, Database, ArrowLeft } from 'lucide-react';
import { AdminUser, Document, ChatMessage } from '../types';

interface AdminPanelProps {
  currentUser: string | null;
}

type SubTab = 'users' | 'docs' | 'messages';

const ADMIN_HEADERS = (currentUser: string) => ({
  'Content-Type': 'application/json',
  'x-user-email': currentUser,
});

function formatBytes(bytes: number) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1024 / 1024).toFixed(1) + ' MB';
}

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('zh-CN', { dateStyle: 'short', timeStyle: 'short' });
}

export default function AdminPanel({ currentUser }: AdminPanelProps) {
  const [subTab, setSubTab] = useState<SubTab>('users');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<string>('');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [docsLoading, setDocsLoading] = useState(false);
  const [msgsLoading, setMsgsLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users', { headers: ADMIN_HEADERS(currentUser) });
      const data = await res.json();
      setUsers(data.users || []);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  const fetchDocuments = useCallback(async (email: string) => {
    if (!currentUser || !email) return;
    setDocsLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(email)}/documents`, {
        headers: ADMIN_HEADERS(currentUser),
      });
      const data = await res.json();
      setDocuments(data.documents || []);
    } finally {
      setDocsLoading(false);
    }
  }, [currentUser]);

  const fetchMessages = useCallback(async (email: string) => {
    if (!currentUser || !email) return;
    setMsgsLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(email)}/messages`, {
        headers: ADMIN_HEADERS(currentUser),
      });
      const data = await res.json();
      setMessages(data.messages || []);
    } finally {
      setMsgsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  useEffect(() => {
    if (selectedEmail && subTab === 'docs') fetchDocuments(selectedEmail);
    if (selectedEmail && subTab === 'messages') fetchMessages(selectedEmail);
  }, [selectedEmail, subTab, fetchDocuments, fetchMessages]);

  const handleUserClick = (email: string, target: SubTab) => {
    setSelectedEmail(email);
    setSubTab(target);
  };

  const tabBtn = (tab: SubTab, icon: React.ReactNode, label: string) => (
    <button
      onClick={() => setSubTab(tab)}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
        subTab === tab
          ? 'bg-indigo-600 text-white shadow-sm'
          : 'text-slate-500 hover:bg-slate-100'
      }`}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div className="h-full flex flex-col bg-slate-50/20 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-8 pt-8 pb-4 flex-shrink-0">
        <div>
          <h2 className="text-lg font-bold text-slate-800">管理后台</h2>
          <p className="text-xs text-slate-400 mt-0.5">查看用户、文档与聊天历史</p>
        </div>
        <button
          onClick={fetchUsers}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-slate-500 hover:bg-slate-100 transition-all disabled:opacity-50"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          刷新
        </button>
      </div>

      {/* Sub-tabs */}
      <div className="flex items-center gap-2 px-8 pb-4 flex-shrink-0">
        {tabBtn('users', <Users size={13} />, `用户列表 (${users.length})`)}
        {tabBtn('docs', <FileText size={13} />, '文档管理')}
        {tabBtn('messages', <MessageSquare size={13} />, '聊天历史')}
      </div>

      <div className="flex-1 overflow-y-auto px-8 pb-8">

        {/* ── USERS TAB ── */}
        {subTab === 'users' && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-16 text-slate-400 gap-2">
                <RefreshCw size={16} className="animate-spin" /> 加载中…
              </div>
            ) : users.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
                <Database size={28} className="opacity-30" />
                <span className="text-sm">暂无用户数据</span>
              </div>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="text-left px-5 py-3 font-semibold text-slate-500">邮箱</th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-500">文档</th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-500">向量块</th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-500">消息</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-500">最后活跃</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.email} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-3 font-medium text-slate-700">{u.email}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-bold">{u.docCount}</span>
                      </td>
                      <td className="px-4 py-3 text-center text-slate-500">{u.chunkCount}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="bg-violet-50 text-violet-600 px-2 py-0.5 rounded-full font-bold">{u.messageCount}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-400 flex items-center gap-1">
                        <Clock size={11} />
                        {formatDate(u.lastActive)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 justify-end">
                          <button
                            onClick={() => handleUserClick(u.email, 'docs')}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 transition-all"
                          >
                            文档 <ChevronRight size={10} />
                          </button>
                          <button
                            onClick={() => handleUserClick(u.email, 'messages')}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold text-slate-500 hover:bg-violet-50 hover:text-violet-600 transition-all"
                          >
                            消息 <ChevronRight size={10} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ── DOCUMENTS TAB ── */}
        {subTab === 'docs' && (
          <div className="space-y-4">
            {/* User selector */}
            <div className="flex items-center gap-3">
              <button onClick={() => setSubTab('users')} className="text-slate-400 hover:text-slate-600 transition-colors">
                <ArrowLeft size={16} />
              </button>
              <select
                value={selectedEmail}
                onChange={e => setSelectedEmail(e.target.value)}
                className="flex-1 max-w-sm text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              >
                <option value="">— 选择用户 —</option>
                {users.map(u => <option key={u.email} value={u.email}>{u.email}</option>)}
              </select>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
              {!selectedEmail ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
                  <FileText size={28} className="opacity-30" />
                  <span className="text-sm">请先选择用户</span>
                </div>
              ) : docsLoading ? (
                <div className="flex items-center justify-center py-16 text-slate-400 gap-2">
                  <RefreshCw size={16} className="animate-spin" /> 加载中…
                </div>
              ) : documents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
                  <FileText size={28} className="opacity-30" />
                  <span className="text-sm">该用户暂无文档</span>
                </div>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="text-left px-5 py-3 font-semibold text-slate-500">文档名</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-500">类型</th>
                      <th className="text-center px-4 py-3 font-semibold text-slate-500">大小</th>
                      <th className="text-center px-4 py-3 font-semibold text-slate-500">向量块</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-500">上传时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    {documents.map(doc => (
                      <tr key={doc.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                        <td className="px-5 py-3 font-medium text-slate-700 max-w-xs truncate">{doc.name}</td>
                        <td className="px-4 py-3">
                          <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">{doc.type}</span>
                        </td>
                        <td className="px-4 py-3 text-center text-slate-500">{formatBytes(doc.size)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-bold">{doc.chunkCount}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-400">{formatDate(doc.uploadDate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ── MESSAGES TAB ── */}
        {subTab === 'messages' && (
          <div className="space-y-4">
            {/* User selector */}
            <div className="flex items-center gap-3">
              <button onClick={() => setSubTab('users')} className="text-slate-400 hover:text-slate-600 transition-colors">
                <ArrowLeft size={16} />
              </button>
              <select
                value={selectedEmail}
                onChange={e => setSelectedEmail(e.target.value)}
                className="flex-1 max-w-sm text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              >
                <option value="">— 选择用户 —</option>
                {users.map(u => <option key={u.email} value={u.email}>{u.email}</option>)}
              </select>
              {selectedEmail && (
                <span className="text-xs text-slate-400">{messages.length} 条消息</span>
              )}
            </div>

            {!selectedEmail ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
                <MessageSquare size={28} className="opacity-30" />
                <span className="text-sm">请先选择用户</span>
              </div>
            ) : msgsLoading ? (
              <div className="flex items-center justify-center py-16 text-slate-400 gap-2">
                <RefreshCw size={16} className="animate-spin" /> 加载中…
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
                <MessageSquare size={28} className="opacity-30" />
                <span className="text-sm">该用户暂无聊天记录</span>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.filter(m => !m.loading).map(msg => (
                  <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-2xl rounded-2xl px-4 py-3 shadow-xs ${
                      msg.role === 'user'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white border border-slate-100 text-slate-700'
                    }`}>
                      <p className="text-xs whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                      {msg.citations && msg.citations.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-white/20 space-y-1">
                          {msg.citations.map(c => (
                            <div key={c.chunkId} className="text-[10px] opacity-80 flex items-center gap-1">
                              <FileText size={9} />
                              {c.docName}
                              <span className="opacity-60">· {(c.score * 100).toFixed(0)}%</span>
                            </div>
                          ))}
                        </div>
                      )}
                      <p className={`text-[10px] mt-1.5 ${msg.role === 'user' ? 'text-indigo-200' : 'text-slate-400'}`}>
                        {formatDate(msg.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
