'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ListTodo, Lightbulb, Network, CheckCircle2, Clock } from 'lucide-react';
import dynamic from 'next/dynamic';
import { toggleSubtaskInTasks, updateTaskDeadline } from '@/lib/utils';
import type { Task, ActiveTab } from '@/types';

const Mermaid = dynamic(() => import('./Mermaid'), { ssr: false });

interface TaskBoardProps {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  summary: string[];
  mindmap: string;
  activeTab: ActiveTab;
  setActiveTab: (val: ActiveTab) => void;
}

export default function TaskBoard({
  tasks,
  setTasks,
  summary,
  mindmap,
  activeTab,
  setActiveTab,
}: TaskBoardProps) {
  const handleToggleSubtask = (taskId: string, subtaskId: string) => {
    setTasks((prev) => toggleSubtaskInTasks(prev, taskId, subtaskId));
  };

  const handleDeadlineChange = (taskId: string, newDate: string) => {
    setTasks((prev) => updateTaskDeadline(prev, taskId, newDate));
  };

  const tabs: { key: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { key: 'todo', label: '執行碎片', icon: <ListTodo size={16} /> },
    { key: 'summary', label: '30秒重點', icon: <Lightbulb size={16} /> },
    { key: 'mindmap', label: '視覺心智圖', icon: <Network size={16} /> },
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
              {tasks.map((task) => {
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
                            isAllDone ? 'text-green-700 line-through opacity-70' : 'text-zinc-900'
                          }`}
                        >
                          {isAllDone && <CheckCircle2 size={20} className="text-green-500 flex-shrink-0" />}
                          <span className="break-words">{task.title}</span>
                        </h3>
                        <div className="flex items-center gap-3 mt-2 flex-wrap">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold ${
                              isAllDone
                                ? 'bg-zinc-100 text-zinc-400'
                                : task.daysLeft <= 2
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
                          <input
                            type="date"
                            value={task.deadline}
                            onChange={(e) => handleDeadlineChange(task.id, e.target.value)}
                            className="text-xs text-zinc-500 font-medium bg-transparent border border-zinc-200 rounded px-2 py-1 outline-none focus:border-black cursor-pointer hover:bg-white transition-colors"
                          />
                        </div>
                      </div>

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
                            className={`text-[15px] font-medium transition-all duration-300 ${
                              sub.completed ? 'line-through text-zinc-400' : 'text-zinc-700'
                            }`}
                          >
                            {sub.title}
                          </span>
                        </motion.label>
                      ))}
                    </div>
                  </motion.div>
                );
              })}
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
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
