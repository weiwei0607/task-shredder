'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ListTodo, Lightbulb, Network, CheckCircle2, Clock, History, TrendingUp, Repeat, Pencil, Trash2, Plus, X, Search, ArrowUpDown, Copy, Check } from 'lucide-react';
import dynamic from 'next/dynamic';
import { toggleSubtaskInTasks, updateTaskDeadline } from '@/lib/utils';
import type { Task, ActiveTab, BrainDumpSession } from '@/types';
import { format, parseISO } from 'date-fns';

const Mermaid = dynamic(() => import('./Mermaid'), { ssr: false });

type FilterMode = 'all' | 'active' | 'completed' | 'overdue';

interface TaskBoardProps {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  summary: string[];
  mindmap: string;
  activeTab: ActiveTab;
  setActiveTab: (val: ActiveTab) => void;
  toggleTaskCompleted?: (taskId: string) => void;
  completionRate?: number;
  sessions?: BrainDumpSession[];
  setSessions?: React.Dispatch<React.SetStateAction<BrainDumpSession[]>>;
  duplicateSuggestions?: string[];
  updateTaskTitle?: (taskId: string, title: string) => void;
  updateSubtaskTitle?: (taskId: string, subtaskId: string, title: string) => void;
  deleteTask?: (taskId: string) => void;
  addSubtask?: (taskId: string, title: string) => void;
  loadSession?: (session: BrainDumpSession) => void;
}

function InlineEdit({ value, onSave, className = '' }: { value: string; onSave: (v: string) => void; className?: string }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const save = () => {
    onSave(editValue);
    setIsEditing(false);
  };

  const cancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === 'Enter') save();
          if (e.key === 'Escape') cancel();
        }}
        className={`bg-white border border-zinc-300 rounded px-2 py-0.5 text-sm outline-none focus:border-black ${className}`}
      />
    );
  }

  return (
    <span
      onClick={() => setIsEditing(true)}
      className={`cursor-text hover:bg-zinc-100 rounded px-1 -mx-1 transition-colors ${className}`}
      title="點擊編輯"
    >
      {value}
    </span>
  );
}

export default function TaskBoard({
  tasks,
  setTasks,
  summary,
  mindmap,
  activeTab,
  setActiveTab,
  toggleTaskCompleted,
  completionRate = 0,
  sessions = [],
  duplicateSuggestions = [],
  updateTaskTitle,
  updateSubtaskTitle,
  deleteTask,
  addSubtask,
  loadSession,
  setSessions,
}: TaskBoardProps) {
  const [filter, setFilter] = useState<FilterMode>('all');
  const [sortMode, setSortMode] = useState<'deadline' | 'urgency' | 'created'>('deadline');
  const [searchQuery, setSearchQuery] = useState('');
  const [addingToTask, setAddingToTask] = useState<string | null>(null);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [copied, setCopied] = useState(false);
  const addInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (addingToTask && addInputRef.current) {
      addInputRef.current.focus();
    }
  }, [addingToTask]);

  const handleToggleSubtask = (taskId: string, subtaskId: string) => {
    setTasks((prev) => toggleSubtaskInTasks(prev, taskId, subtaskId));
  };

  const handleToggleTask = (taskId: string) => {
    if (toggleTaskCompleted) toggleTaskCompleted(taskId);
  };

  const handleDeadlineChange = (taskId: string, newDate: string) => {
    setTasks((prev) => updateTaskDeadline(prev, taskId, newDate));
  };

  const filteredTasks = tasks.filter((task) => {
    if (filter === 'all') return true;
    const total = task.subtasks.length;
    const completed = task.subtasks.filter((s) => s.completed).length;
    const isAllDone = total > 0 && completed === total;
    if (filter === 'completed') return isAllDone || task.completed;
    if (filter === 'active') return !isAllDone && !task.completed;
    if (filter === 'overdue') return task.daysLeft < 0;
    return true;
  }).filter((task) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return task.title.toLowerCase().includes(q) || task.subtasks.some(s => s.title.toLowerCase().includes(q));
  }).sort((a, b) => {
    if (sortMode === 'deadline') return a.daysLeft - b.daysLeft;
    if (sortMode === 'urgency') return (b.isUrgent ? 1 : 0) - (a.isUrgent ? 1 : 0) || a.daysLeft - b.daysLeft;
    return 0;
  });

  const tabs: { key: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { key: 'todo', label: '執行碎片', icon: <ListTodo size={16} /> },
    { key: 'summary', label: '30秒重點', icon: <Lightbulb size={16} /> },
    { key: 'mindmap', label: '視覺心智圖', icon: <Network size={16} /> },
    { key: 'history', label: '歷史紀錄', icon: <History size={16} /> },
  ];

  const filters: { key: FilterMode; label: string }[] = [
    { key: 'all', label: '全部' },
    { key: 'active', label: '進行中' },
    { key: 'overdue', label: '已逾期' },
    { key: 'completed', label: '已完成' },
  ];

  return (
    <motion.div
      key="result"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden"
    >
      {/* Tabs */}
      <div className="flex border-b border-zinc-200 bg-zinc-50/50 p-2 gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
              activeTab === tab.key
                ? 'bg-white shadow-sm text-black'
                : 'text-zinc-500 hover:bg-zinc-100'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <div className="p-6">
        <AnimatePresence mode="wait">
          {/* To-Do Tab */}
          {activeTab === 'todo' && (
            <motion.div
              key="todo"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* Completion Rate Header */}
              {tasks.length > 0 && (
                <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-sm font-bold text-zinc-700">
                      <TrendingUp size={16} />
                      整體完成率
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => {
                          const lines = tasks.map(t => {
                            const total = t.subtasks.length;
                            const done = t.subtasks.filter(s => s.completed).length;
                            const check = t.completed || (total > 0 && done === total) ? '✅' : '⬜';
                            const subLines = t.subtasks.map(s => `  ${s.completed ? '✅' : '⬜'} ${s.title}`).join('\n');
                            return `${check} ${t.title} (${t.deadline})${subLines ? '\n' + subLines : ''}`;
                          }).join('\n\n');
                          navigator.clipboard.writeText(lines).then(() => {
                            setCopied(true);
                            setTimeout(() => setCopied(false), 2000);
                          });
                        }}
                        className="text-xs font-bold text-zinc-500 hover:text-black flex items-center gap-1 transition-colors"
                        title="複製任務清單"
                      >
                        {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                        {copied ? '已複製' : '複製'}
                      </button>
                      <span className="text-lg font-black text-black">{completionRate}%</span>
                    </div>
                  </div>
                  <div className="h-2.5 bg-zinc-200 rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${completionRate === 100 ? 'bg-green-500' : 'bg-black'}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${completionRate}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                </div>
              )}
              {/* Duplicate Suggestions */}
              {duplicateSuggestions.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-sm font-bold text-amber-800 mb-2">
                    <Repeat size={16} />
                    重複任務偵測 — 建議轉為習慣追蹤
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {duplicateSuggestions.map((title) => (
                      <span key={title} className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
                        「{title}」出現 3+ 次
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Search, Filter & Sort */}
              {tasks.length > 0 && (
                <div className="space-y-3">
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="搜尋任務或子任務..."
                      className="w-full bg-white border border-zinc-200 pl-9 pr-4 py-2 rounded-xl text-sm font-medium text-zinc-800 outline-none focus:border-black transition-all"
                    />
                  </div>
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider mr-1 shrink-0">篩選</span>
                    {filters.map((f) => (
                      <button
                        key={f.key}
                        onClick={() => setFilter(f.key)}
                        className={`px-3 py-1 rounded-full text-xs font-bold transition-all shrink-0 ${
                          filter === f.key
                            ? 'bg-black text-white'
                            : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                    <div className="ml-auto flex items-center gap-1.5">
                      <ArrowUpDown size={12} className="text-zinc-400" />
                      <select
                        value={sortMode}
                        onChange={(e) => setSortMode(e.target.value as typeof sortMode)}
                        className="text-xs font-bold text-zinc-600 bg-zinc-100 rounded-lg px-2 py-1 outline-none border-none cursor-pointer"
                      >
                        <option value="deadline">按死線</option>
                        <option value="urgency">按緊急度</option>
                        <option value="created">原始順序</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {filteredTasks.length === 0 && tasks.length > 0 && (
                <div className="text-center py-12 text-zinc-400">
                  <p className="text-sm">沒有符合篩選條件的任務</p>
                </div>
              )}

              {filteredTasks.map((task) => {
                const total = task.subtasks.length;
                const completed = task.subtasks.filter((s) => s.completed).length;
                const progress = total === 0 ? 0 : Math.round((completed / total) * 100);
                const isAllDone = total > 0 && progress === 100;

                return (
                  <motion.div
                    key={task.id}
                    layout
                    className={`border rounded-xl overflow-hidden transition-all duration-500 ${
                      isAllDone ? 'border-green-200 bg-green-50/30' : 'border-zinc-200 bg-white'
                    }`}
                  >
                    <div className="p-4 border-b border-zinc-100 flex flex-wrap gap-y-3 justify-between items-start bg-zinc-50/50">
                      <div className="min-w-0 flex-1">
                        <h3
                          className={`font-bold text-lg flex items-center gap-2 transition-all duration-300 ${
                            isAllDone || task.completed ? 'text-green-700 line-through opacity-70' : 'text-zinc-900'
                          }`}
                        >
                          {toggleTaskCompleted && (
                            <input
                              type="checkbox"
                              checked={!!task.completed}
                              onChange={() => handleToggleTask(task.id)}
                              className="w-5 h-5 accent-black cursor-pointer"
                              title="標記整個任務完成"
                            />
                          )}
                          {isAllDone && <CheckCircle2 size={20} className="text-green-500 flex-shrink-0" />}
                          <span className="break-words">
                            {updateTaskTitle ? (
                              <InlineEdit value={task.title} onSave={(v) => updateTaskTitle(task.id, v)} />
                            ) : (
                              task.title
                            )}
                          </span>
                        </h3>
                        <div className="flex items-center gap-3 mt-2 flex-wrap">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold ${
                              isAllDone
                                ? 'bg-zinc-100 text-zinc-400'
                                : task.daysLeft <= 2 && task.daysLeft >= 0
                                ? 'bg-red-100 text-red-700'
                                : task.daysLeft < 0
                                ? 'bg-red-100 text-red-700'
                                : 'bg-orange-100 text-orange-700'
                            }`}
                          >
                            <Clock size={12} strokeWidth={3} />
                            {task.daysLeft < 0
                              ? `⚠️ 已逾期 ${Math.abs(task.daysLeft)} 天`
                              : task.daysLeft === 0
                              ? `🔥 今天到期`
                              : task.isUrgent
                              ? `🔥 倒數 ${task.daysLeft} 天死線`
                              : `⏳ 倒數 ${task.daysLeft} 天`}
                          </span>
                          <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-medium bg-transparent border border-zinc-200 rounded px-2 py-1 hover:bg-white transition-colors">
                            <input
                              type="date"
                              value={task.deadline}
                              onChange={(e) => handleDeadlineChange(task.id, e.target.value)}
                              className="bg-transparent outline-none cursor-pointer"
                            />
                            <span className="text-zinc-400 shrink-0">
                              {format(parseISO(task.deadline), 'EEE')}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="w-full sm:w-32 flex flex-col gap-1.5">
                          <div className="flex justify-between text-xs font-bold text-zinc-400">
                            <span>進度</span>
                            <span className={isAllDone ? 'text-green-600' : 'text-black'}>{progress}%</span>
                          </div>
                          <div className="h-2.5 bg-zinc-100 rounded-full overflow-hidden">
                            <motion.div
                              className={`h-full rounded-full ${isAllDone ? 'bg-green-500' : 'bg-black'}`}
                              initial={{ width: 0 }}
                              animate={{ width: `${progress}%` }}
                              transition={{ duration: 0.5, ease: 'easeOut' }}
                            />
                          </div>
                        </div>
                        {deleteTask && (
                          <button
                            onClick={() => deleteTask(task.id)}
                            className="p-1.5 rounded-md hover:bg-red-100 text-zinc-400 hover:text-red-500 transition-colors"
                            title="刪除任務"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="p-2 space-y-1">
                      {task.subtasks.map((sub) => (
                        <motion.label
                          layout
                          key={sub.id}
                          className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors hover:bg-zinc-50 ${
                            sub.completed ? 'opacity-50' : ''
                          }`}
                        >
                          <div className="relative flex items-center justify-center flex-shrink-0">
                            <input
                              type="checkbox"
                              checked={sub.completed}
                              onChange={() => handleToggleSubtask(task.id, sub.id)}
                              className="peer w-5 h-5 appearance-none border-2 border-zinc-300 rounded-md checked:border-black checked:bg-black transition-all cursor-pointer"
                            />
                            <CheckCircle2
                              size={14}
                              className="absolute text-white opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity"
                              strokeWidth={3}
                            />
                          </div>
                          <span
                            className={`text-[15px] font-medium transition-all duration-300 flex-1 ${
                              sub.completed ? 'line-through text-zinc-400' : 'text-zinc-700'
                            }`}
                          >
                            {updateSubtaskTitle ? (
                              <InlineEdit value={sub.title} onSave={(v) => updateSubtaskTitle(task.id, sub.id, v)} />
                            ) : (
                              sub.title
                            )}
                          </span>
                        </motion.label>
                      ))}

                      {/* Add subtask */}
                      {addSubtask && (
                        <div className="px-3 py-2">
                          {addingToTask === task.id ? (
                            <div className="flex items-center gap-2">
                              <input
                                ref={addInputRef}
                                value={newSubtaskTitle}
                                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    addSubtask(task.id, newSubtaskTitle);
                                    setNewSubtaskTitle('');
                                    setAddingToTask(null);
                                  }
                                  if (e.key === 'Escape') {
                                    setAddingToTask(null);
                                    setNewSubtaskTitle('');
                                  }
                                }}
                                placeholder="輸入新子任務..."
                                className="flex-1 bg-white border border-zinc-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-black"
                              />
                              <button
                                onClick={() => {
                                  addSubtask(task.id, newSubtaskTitle);
                                  setNewSubtaskTitle('');
                                  setAddingToTask(null);
                                }}
                                className="p-1.5 rounded-md hover:bg-zinc-100 text-zinc-600"
                              >
                                <Plus size={16} />
                              </button>
                              <button
                                onClick={() => {
                                  setAddingToTask(null);
                                  setNewSubtaskTitle('');
                                }}
                                className="p-1.5 rounded-md hover:bg-zinc-100 text-zinc-400"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setAddingToTask(task.id)}
                              className="flex items-center gap-1.5 text-xs font-bold text-zinc-400 hover:text-zinc-700 transition-colors py-1"
                            >
                              <Plus size={14} />
                              新增子任務
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}

              {tasks.length === 0 && (
                <div className="text-center py-12 text-zinc-400">
                  <ListTodo size={48} className="mx-auto mb-4 text-zinc-300" />
                  <p className="text-lg font-medium text-zinc-500 mb-2">尚無任務</p>
                  <p className="text-sm">在左側輸入 Brain Dump，AI 會幫你拆解成可執行碎片。</p>
                </div>
              )}
            </motion.div>
          )}

          {/* Summary Tab */}
          {activeTab === 'summary' && (
            <motion.div
              key="summary"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <h3 className="font-bold text-lg text-zinc-900 border-b border-zinc-100 pb-2 mb-4">
                ✨ AI 重點提煉
              </h3>
              {summary.length > 0 ? (
                <ul className="space-y-3">
                  {summary.map((text, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold mt-0.5">
                        {i + 1}
                      </span>
                      <span className="text-zinc-700 leading-relaxed">{text}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-zinc-400">目前沒有總結資料。</p>
              )}
            </motion.div>
          )}

          {/* Mindmap Tab */}
          {activeTab === 'mindmap' && (
            <motion.div
              key="mindmap"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <h3 className="font-bold text-lg text-zinc-900 border-b border-zinc-100 pb-2 mb-4">
                🧠 視覺心智圖
              </h3>
              <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 min-h-[300px] flex items-center justify-center">
                {mindmap ? (
                  <Mermaid chart={mindmap} />
                ) : (
                  <p className="text-zinc-400">沒有生成心智圖資料。</p>
                )}
              </div>
            </motion.div>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <h3 className="font-bold text-lg text-zinc-900 border-b border-zinc-100 pb-2 mb-4">
                📜 Brain Dump 歷史紀錄
              </h3>
              {sessions.length === 0 ? (
                <p className="text-zinc-400">尚無歷史紀錄。</p>
              ) : (
                <div className="space-y-4 max-h-[500px] overflow-y-auto">
                  {sessions.map((session) => (
                    <div key={session.id} className="border border-zinc-200 rounded-xl p-4 bg-zinc-50/50 hover:bg-zinc-50 transition-colors group">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-zinc-400">
                          {new Date(session.createdAt).toLocaleString('zh-TW')}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded">
                            {session.tasks.length} 個任務
                          </span>
                          <button
                            onClick={() => {
                              if (typeof window !== 'undefined' && window.confirm('確定刪除此歷史紀錄？')) {
                                setSessions?.(prev => prev.filter(s => s.id !== session.id));
                              }
                            }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-100 text-zinc-400 hover:text-red-500"
                            title="刪除紀錄"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-zinc-700 line-clamp-2 mb-3">{session.text}</p>
                      <div className="flex flex-wrap gap-1 mb-3">
                        {session.tasks.slice(0, 5).map((t) => (
                          <span key={t.id} className="text-[10px] bg-white border border-zinc-200 px-2 py-0.5 rounded text-zinc-600">
                            {t.title}
                          </span>
                        ))}
                        {session.tasks.length > 5 && (
                          <span className="text-[10px] text-zinc-400">+{session.tasks.length - 5} more</span>
                        )}
                      </div>
                      {loadSession && (
                        <button
                          onClick={() => loadSession(session)}
                          className="w-full py-2 rounded-lg bg-black text-white text-xs font-bold hover:bg-zinc-800 transition-colors flex items-center justify-center gap-1.5"
                        >
                          <History size={14} />
                          載入此紀錄
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
