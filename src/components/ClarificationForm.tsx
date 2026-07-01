'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Lightbulb, ChevronRight } from 'lucide-react';
import type { ClarificationQuestion } from '@/types';

interface ClarificationFormProps {
  clarificationQuestions: ClarificationQuestion[];
  selectedAnswers: Record<number, string[]>;
  setSelectedAnswers: React.Dispatch<React.SetStateAction<Record<number, string[]>>>;
  customAnswers: Record<number, string>;
  setCustomAnswers: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  submitClarificationAnswers: () => void;
}

export default function ClarificationForm({
  clarificationQuestions,
  selectedAnswers,
  setSelectedAnswers,
  customAnswers,
  setCustomAnswers,
  submitClarificationAnswers,
}: ClarificationFormProps) {
  const toggleOption = (qIdx: number, opt: string) => {
    setSelectedAnswers((prev) => {
      const current = prev[qIdx] || [];
      const next = current.includes(opt)
        ? current.filter((x) => x !== opt)
        : [...current, opt];
      return { ...prev, [qIdx]: next };
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white p-7 shadow-sm"
    >
      <div className="mb-6 flex items-center gap-3 border-b border-zinc-100 pb-5">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
          <Lightbulb size={20} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-zinc-900">等一下，任務太模糊了！</h3>
          <p className="text-sm text-zinc-500">
            為了幫你切出最好的執行碎片，教練需要你先釐清這些問題：
          </p>
        </div>
      </div>

      <div className="mb-8 space-y-5">
        {clarificationQuestions.map((q, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="flex flex-col gap-3 rounded-xl border border-zinc-200/80 bg-zinc-50/60 p-5"
          >
            <div className="flex gap-3 text-[15px] font-bold text-zinc-900">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-bold text-indigo-600 ring-1 ring-indigo-100">
                {i + 1}
              </span>
              <span>{q.question}</span>
            </div>
            {q.options && q.options.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-2 pl-9">
                {q.options.map((opt, optIdx) => {
                  const isSelected = (selectedAnswers[i] || []).includes(opt);
                  return (
                    <button
                      key={optIdx}
                      onClick={() => toggleOption(i, opt)}
                      className={`rounded-lg border px-3 py-1.5 text-sm font-medium shadow-sm transition-all ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-600 text-white'
                          : 'border-zinc-200 bg-white text-zinc-700 hover:border-indigo-300 hover:text-indigo-700'
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            )}
            <div className="mt-1 pl-9">
              <input
                type="text"
                placeholder="補充其他想法..."
                value={customAnswers[i] || ''}
                onChange={(e) =>
                  setCustomAnswers((prev) => ({ ...prev, [i]: e.target.value }))
                }
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 outline-none transition-colors placeholder:text-zinc-400 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200"
              />
            </div>
          </motion.div>
        ))}
      </div>

      <button
        onClick={submitClarificationAnswers}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3.5 text-[15px] font-semibold text-white shadow-sm transition-all hover:bg-indigo-700 active:scale-[0.99]"
      >
        確認回答，開始生成碎片 <ChevronRight size={18} />
      </button>
    </motion.div>
  );
}
