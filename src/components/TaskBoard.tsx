'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ListTodo, Lightbulb, Network, CheckCircle2, Clock, History, TrendingUp, Repeat, Trash2, Plus, X, Search, ArrowUpDown, Copy, Check, AlertTriangle } from 'lucide-react';
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
        className={`rounded border border-zinc-300 bg-white px-2 py-0.5 text-sm outline-none focus:border-zinc-500 ${className}`}
      />
    );
  }

  return (
    <span
      onClick={() => setIsEditing(true)}
      className={`-mx-1 cursor-text rounded px-1 transition-colors hover:bg-zinc-100 ${className}`}
      title="點擊編輯"
    >
      {value}
    </span>
  );
}

function DeadlineBadge({ daysLeft, isUrgent, muted }: { daysLeft: number; isUrgent: boolean; muted: boolean }) {
  if (muted) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-400">
        <CheckCircle2 size={12} strokeWidth={2.5} />
        已完成
      </span>
    );
  }
  const overdue = daysLeft < 0;
  const critical = overdue || daysLeft <= 2;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold ring-1 ${
        critical
          ? 'bg-red-50 text-red-600 ring-red-100'
          : 'bg-amber-50 text-amber-700 ring-amber-100'
      }`}
    >
      {overdue ? <AlertTriangle size={12} strokeWidth={2.5} /> : <Clock size={12} strokeWidth={2.5} />}
      {overdue
        ? `已逾期 ${Math.abs(daysLeft)} 天`
        : daysLeft === 0
        ? '今天到期'
        : isUrgent
        ? `倒數 ${daysLeft} 天`
        : `剩餘 ${daysLeft} 天`}
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
    { key: 'todo', label: '執行碎片', icon: <ListTodo size={15} /> },
    { key: 'summary', label: '30秒重點', icon: <Lightbulb size={15} /> },
    { key: 'mindmap', label: '視覺心智圖', icon: <Network size={15} /> },
    { key: 'history', label: '歷史紀錄', icon: <History size={15} /> },
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
      className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-sm"
    >
      {/* Tabs */}
      <div className="flex gap-1 border-b border-zinc-200/80 bg-zinc-50/70 p-1.5">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-semibold transition-all ${
              activeTab === tab.key
                ? 'bg-white text-zinc-900 shadow-sm ring-1 ring-zinc-200/70'
                : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700'
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
              className="space-y-5"
            >
              {/* Completion Rate Header */}
              {tasks.length > 0 && (
                <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/70 p-4">
                  <div className="mb-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-semibold text-zinc-700">
                      <TrendingUp size={15} className="text-indigo-500" />
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
                        className="flex items-center gap-1 text-xs font-semibold text-zinc-500 transition-colors hover:text-zinc-900"
                        title="複製任務清單"
                      >
                        {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                        {copied ? '已複製' : '複製'}
                      </button>
                      <span className="text-lg font-bold tabular-nums text-zinc-900">{completionRate}%</span>
                    </div>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-zinc-200">
                    <motion.div
                      className={`h-full rounded-full ${completionRate === 100 ? 'bg-emerald-500' : 'bg-indigo-600'}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${completionRate}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                </div>
              )}
              {/* Duplicate Suggestions */}
              {duplicateSuggestions.length > 0 && (
                <div className="rounded-xl border border-amber-200/70 bg-amber-50/70 p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-800">
                    <Repeat size={15} />
                    重複任務偵測 — 建議轉為習慣追蹤
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {duplicateSuggestions.map((title) => (
                      <span key={title} className="rounded-full bg-white px-3 py-1 text-xs font-medium text-amber-700 ring-1 ring-amber-200">
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
                      className="w-full rounded-xl border border-zinc-200 bg-white py-2 pl-9 pr-4 text-sm font-medium text-zinc-800 outline-none transition-colors placeholder:text-zinc-400 focus:border-zinc-400"
                    />
                  </div>
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {filters.map((f) => (
                      <button
                        key={f.key}
                        onClick={() => setFilter(f.key)}
                        className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                          filter === f.key
                            ? 'bg-zinc-900 text-white shadow-sm'
                            : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-700'
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
                        className="cursor-pointer rounded-lg border-none bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-600 outline-none"
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
                <div className="py-12 text-center text-zinc-400">
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
                    className={`overflow-hidden rounded-xl border transition-all duration-500 ${
                      isAllDone ? 'border-emerald-200/80 bg-emerald-50/30' : 'border-zinc-200/80 bg-white'
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-y-3 border-b border-zinc-100 bg-zinc-50/60 p-4">
                      <div className="min-w-0 flex-1">
                        <h3
                          className={`flex items-center gap-2 text-base font-bold transition-all duration-300 ${
                            isAllDone || task.completed ? 'text-emerald-700 line-through opacity-70' : 'text-zinc-900'
                          }`}
                        >
                          {toggleTaskCompleted && (
                            <input
                              type="checkbox"
                              checked={!!task.completed}
                              onChange={() => handleToggleTask(task.id)}
                              className="h-[18px] w-[18px] cursor-pointer accent-zinc-900"
                              title="標記整個任務完成"
                            />
                          )}
                          {isAllDone && <CheckCircle2 size={18} className="flex-shrink-0 text-emerald-500" />}
                          <span className="break-words">
                            {updateTaskTitle ? (
                              <InlineEdit value={task.title} onSave={(v) => updateTaskTitle(task.id, v)} />
                            ) : (
                              task.title
                            )}
                          </span>
                        </h3>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <DeadlineBadge daysLeft={task.daysLeft} isUrgent={task.isUrgent} muted={isAllDone} />
                          <div className="flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs font-medium text-zinc-500 transition-colors hover:border-zinc-300">
                            <input
                              type="date"
                              value={task.deadline}
                              onChange={(e) => handleDeadlineChange(task.id, e.target.value)}
                              className="cursor-pointer bg-transparent outline-none"
                            />
                            <span className="shrink-0 text-zinc-400">
                              {format(parseISO(task.deadline), 'EEE')}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex w-full flex-col gap-1.5 sm:w-32">
                          <div className="flex justify-between text-xs font-semibold text-zinc-400">
                            <span>進度</span>
                            <span className={`tabular-nums ${isAllDone ? 'text-emerald-600' : 'text-zinc-900'}`}>{progress}%</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
                            <motion.div
                              className={`h-full rounded-full ${isAllDone ? 'bg-emerald-500' : 'bg-indigo-600'}`}
                              initial={{ width: 0 }}
                              animate={{ width: `${progress}%` }}
                              transition={{ duration: 0.5, ease: 'easeOut' }}
                            />
                          </div>
                        </div>
                        {deleteTask && (
                          <button
                            onClick={() => deleteTask(task.id)}
                            className="rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-500"
                            title="刪除任務"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-0.5 p-2">
                      {task.subtasks.map((sub) => (
                        <motion.label
                          layout
                          key={sub.id}
                          className={`flex cursor-pointer items-center gap-3 rounded-lg p-3 transition-colors hover:bg-zinc-50 ${
                            sub.completed ? 'opacity-50' : ''
                          }`}
                        >
                          <div className="relative flex flex-shrink-0 items-center justify-center">
                            <input
                              type="checkbox"
                              checked={sub.completed}
                              onChange={() => handleToggleSubtask(task.id, sub.id)}
                              className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border-2 border-zinc-300 transition-all checked:border-indigo-600 checked:bg-indigo-600"
                            />
                            <CheckCircle2
                              size={14}
                              className="pointer-events-none absolute text-white opacity-0 transition-opacity peer-checked:opacity-100"
                              strokeWidth={3}
                            />
                          </div>
                          <span
                            className={`flex-1 text-[15px] font-medium transition-all duration-300 ${
                              sub.completed ? 'text-zinc-400 line-through' : 'text-zinc-700'
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
                                className="flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-zinc-400"
                              />
                              <button
                                onClick={() => {
                                  addSubtask(task.id, newSubtaskTitle);
                                  setNewSubtaskTitle('');
                                  setAddingToTask(null);
                                }}
                                className="rounded-md p-1.5 text-zinc-600 hover:bg-zinc-100"
                              >
                                <Plus size={16} />
                              </button>
                              <button
                                onClick={() => {
                                  setAddingToTask(null);
                                  setNewSubtaskTitle('');
                                }}
                                className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setAddingToTask(task.id)}
                              className="flex items-center gap-1.5 py-1 text-xs font-semibold text-zinc-400 transition-colors hover:text-zinc-700"
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
                <div className="py-12 text-center text-zinc-400">
                  <ListTodo size={44} className="mx-auto mb-4 text-zinc-300" />
                  <p className="mb-2 text-base font-semibold text-zinc-500">尚無任務</p>
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
              <div className="mb-4 flex items-center gap-2 border-b border-zinc-100 pb-3">
                <Lightbulb size={17} className="text-indigo-500" />
                <h3 className="text-base font-bold text-zinc-900">AI 重點提煉</h3>
              </div>
              {summary.length > 0 ? (
                <ul className="space-y-3">
                  {summary.map((text, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-bold text-indigo-600 ring-1 ring-indigo-100">
                        {i + 1}
                      </span>
                      <span className="leading-relaxed text-zinc-700">{text}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-zinc-400">目前沒有總結資料。</p>
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
              <div className="mb-4 flex items-center gap-2 border-b border-zinc-100 pb-3">
                <Network size={17} className="text-indigo-500" />
                <h3 className="text-base font-bold text-zinc-900">視覺心智圖</h3>
              </div>
              <div className="flex min-h-[300px] items-center justify-center rounded-xl border border-zinc-200/80 bg-zinc-50/70 p-4">
                {mindmap ? (
                  <Mermaid chart={mindmap} />
                ) : (
                  <p className="text-sm text-zinc-400">沒有生成心智圖資料。</p>
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
              <div className="mb-4 flex items-center gap-2 border-b border-zinc-100 pb-3">
                <History size={17} className="text-indigo-500" />
                <h3 className="text-base font-bold text-zinc-900">Brain Dump 歷史紀錄</h3>
              </div>
              {sessions.length === 0 ? (
                <p className="text-sm text-zinc-400">尚無歷史紀錄。</p>
              ) : (
                <div className="max-h-[500px] space-y-3 overflow-y-auto">
                  {sessions.map((session) => (
                    <div key={session.id} className="group rounded-xl border border-zinc-200/80 bg-zinc-50/60 p-4 transition-colors hover:bg-zinc-50">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-medium text-zinc-400">
                          {new Date(session.createdAt).toLocaleString('zh-TW')}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-500">
                            {session.tasks.length} 個任務
                          </span>
                          <button
                            onClick={() => {
                              if (typeof window !== 'undefined' && window.confirm('確定刪除此歷史紀錄？')) {
                                setSessions?.(prev => prev.filter(s => s.id !== session.id));
                              }
                            }}
                            className="rounded p-1 text-zinc-400 opacity-0 transition-opacity hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                            title="刪除紀錄"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      <p className="mb-3 line-clamp-2 text-sm text-zinc-700">{session.text}</p>
                      <div className="mb-3 flex flex-wrap gap-1">
                        {session.tasks.slice(0, 5).map((t) => (
                          <span key={t.id} className="rounded border border-zinc-200 bg-white px-2 py-0.5 text-[11px] text-zinc-600">
                            {t.title}
                          </span>
                        ))}
                        {session.tasks.length > 5 && (
                          <span className="text-[11px] text-zinc-400">+{session.tasks.length - 5} more</span>
                        )}
                      </div>
                      {loadSession && (
                        <button
                          onClick={() => loadSession(session)}
                          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-zinc-200 bg-white py-2 text-xs font-semibold text-zinc-700 shadow-sm transition-colors hover:border-zinc-300 hover:bg-zinc-50"
                        >
                          <History size={13} />
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
