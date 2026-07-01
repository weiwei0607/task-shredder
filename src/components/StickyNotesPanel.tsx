'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { StickyNote, Plus, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import type { StickyNote as StickyNoteType } from '@/types';

interface StickyNotesPanelProps {
  notes: StickyNoteType[];
  onAdd: (text: string, deadline?: string) => void;
  onDelete: (id: string) => void;
  onUpdateDate: (id: string, newDate: string) => void;
}

function DeadlineBadge({ daysLeft, isUrgent }: { daysLeft: number; isUrgent: boolean }) {
  const overdue = daysLeft < 0;
  const critical = overdue || daysLeft <= 2;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold ${
        critical ? 'bg-red-50 text-red-600 ring-1 ring-red-100' : 'bg-amber-50 text-amber-700 ring-1 ring-amber-100'
      }`}
    >
      {overdue ? <AlertTriangle size={10} strokeWidth={2.5} /> : <Clock size={10} strokeWidth={2.5} />}
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
    <section className="flex flex-col overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-3.5">
        <div className="flex items-center gap-2">
          <StickyNote size={16} className="text-amber-500" />
          <h2 className="text-sm font-semibold text-zinc-800">便條紙待辦</h2>
          {notes.length > 0 && (
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-500">
              {notes.length}
            </span>
          )}
        </div>
      </div>

      <div className="space-y-4 p-4">
        {/* Input Area */}
        <div className="space-y-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="快速記下一件待辦事項..."
            className="min-h-[60px] max-h-[160px] w-full resize-none rounded-xl border border-zinc-200 bg-zinc-50/70 p-3 text-sm leading-relaxed text-zinc-700 outline-none transition-colors placeholder:text-zinc-400 focus:border-zinc-400 focus:bg-white focus-visible:outline-none"
          />
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="cursor-pointer rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-500 outline-none transition-colors focus:border-zinc-400"
            />
            <button
              onClick={handleAdd}
              disabled={!input.trim()}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-zinc-900 py-1.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-zinc-800 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Plus size={15} />
              新增便條
            </button>
          </div>
        </div>

        {/* Notes List */}
        <div className="scrollbar-hide max-h-[400px] space-y-2 overflow-y-auto">
          <AnimatePresence mode="popLayout">
            {notes.map((note) => (
              <motion.div
                key={note.id}
                layout
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, x: 50 }}
                transition={{ duration: 0.2 }}
                className="group relative rounded-xl border border-amber-200/70 bg-amber-50/60 p-3.5 transition-shadow hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="flex-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-zinc-800">
                    {note.text}
                  </p>
                  <button
                    onClick={() => onDelete(note.id)}
                    className="flex-shrink-0 rounded-md p-1 text-amber-600 opacity-0 transition-opacity hover:bg-amber-100 group-hover:opacity-100"
                    title="完成並移除"
                  >
                    <CheckCircle2 size={16} />
                  </button>
                </div>
                <div className="mt-2.5 flex items-center gap-2">
                  <DeadlineBadge daysLeft={note.daysLeft} isUrgent={note.isUrgent} />
                  <input
                    type="date"
                    value={note.deadline}
                    onChange={(e) => onUpdateDate(note.id, e.target.value)}
                    className="cursor-pointer rounded-md border border-amber-200/70 bg-white/70 px-1.5 py-0.5 text-[11px] font-medium text-zinc-500 outline-none transition-colors hover:bg-white focus:border-amber-400"
                  />
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {notes.length === 0 && (
            <div className="py-8 text-center">
              <StickyNote size={28} className="mx-auto mb-2 text-zinc-300" />
              <p className="text-sm font-medium text-zinc-400">還沒有便條紙</p>
              <p className="mt-1 text-xs text-zinc-400">在上方快速新增待辦，做完就刪掉！</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
