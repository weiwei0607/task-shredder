'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { StickyNote, Plus, Trash2, Clock, CheckCircle2, Keyboard } from 'lucide-react';
import { toast } from 'sonner';
import type { StickyNote as StickyNoteType } from '@/types';

interface StickyNotesPanelProps {
  notes: StickyNoteType[];
  onAdd: (text: string, deadline?: string) => void;
  onDelete: (id: string) => void;
  onUpdateDate: (id: string, newDate: string) => void;
}

export default function StickyNotesPanel({
  notes,
  onAdd,
  onDelete,
  onUpdateDate,
}: StickyNotesPanelProps) {
  const [input, setInput] = useState('');
  const [deadline, setDeadline] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [input]);

  const handleAdd = useCallback(() => {
    if (!input.trim()) {
      toast.error('請輸入待辦內容');
      return;
    }
    onAdd(input, deadline || undefined);
    setInput('');
    setDeadline('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  }, [input, deadline, onAdd]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleAdd();
      }
    },
    [handleAdd]
  );

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-1 flex flex-col">
      <div className="px-4 py-3 border-b border-zinc-100 flex items-center justify-between text-zinc-500 font-medium">
        <div className="flex items-center gap-2">
          <StickyNote size={18} className="text-amber-500" />
          <span>便條紙待辦</span>
          {notes.length > 0 && (
            <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">
              {notes.length}
            </span>
          )}
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* Input Area */}
        <div className="space-y-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="快速記下一件待辦事項..."
            className="w-full min-h-[60px] max-h-[160px] p-3 resize-none outline-none text-zinc-700 leading-relaxed bg-zinc-50 rounded-xl border border-zinc-200 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all text-sm"
          />
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="text-xs text-zinc-500 font-medium bg-zinc-50 border border-zinc-200 rounded-lg px-2 py-1.5 outline-none focus:border-amber-400 cursor-pointer"
            />
            <button
              onClick={handleAdd}
              disabled={!input.trim()}
              className="flex-1 bg-amber-500 text-white rounded-lg py-1.5 font-bold text-sm flex justify-center items-center gap-1.5 hover:bg-amber-600 transition-all disabled:opacity-50 active:scale-[0.98]"
            >
              <Plus size={16} />
              貼上便條紙
            </button>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-zinc-400">
            <Keyboard size={10} />
            <span>Cmd / Ctrl + Enter 快速新增</span>
          </div>
        </div>

        {/* Notes List */}
        <div className="space-y-2 max-h-[400px] overflow-y-auto scrollbar-hide">
          <AnimatePresence mode="popLayout">
            {notes.map((note) => (
              <motion.div
                key={note.id}
                layout
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, x: 50 }}
                transition={{ duration: 0.2 }}
                className="group relative bg-amber-50 border border-amber-200 rounded-xl p-3 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm text-zinc-800 leading-relaxed whitespace-pre-wrap break-words flex-1">
                    {note.text}
                  </p>
                  <button
                    onClick={() => onDelete(note.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-amber-200 text-amber-700 flex-shrink-0"
                    title="完成並移除"
                  >
                    <CheckCircle2 size={16} />
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                      note.daysLeft < 0
                        ? 'bg-red-100 text-red-700'
                        : note.daysLeft <= 2
                        ? 'bg-red-100 text-red-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    <Clock size={10} strokeWidth={3} />
                    {note.daysLeft < 0
                      ? `⚠️ 已逾期 ${Math.abs(note.daysLeft)} 天`
                      : note.daysLeft === 0
                      ? `🔥 今天到期`
                      : note.isUrgent
                      ? `🔥 倒數 ${note.daysLeft} 天`
                      : `⏳ 倒數 ${note.daysLeft} 天`}
                  </span>
                  <input
                    type="date"
                    value={note.deadline}
                    onChange={(e) => onUpdateDate(note.id, e.target.value)}
                    className="text-[10px] text-zinc-500 font-medium bg-white border border-amber-200 rounded px-1.5 py-0.5 outline-none focus:border-amber-500 cursor-pointer hover:bg-amber-50 transition-colors"
                  />
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {notes.length === 0 && (
            <div className="text-center py-6 text-zinc-400 text-sm">
              <StickyNote size={32} className="mx-auto mb-2 text-zinc-300" />
              <p>還沒有便條紙</p>
              <p className="text-xs mt-1">在上方快速新增待辦，做完就刪掉！</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
