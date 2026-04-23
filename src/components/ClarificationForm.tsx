"use client";

import React from "react";
import { motion } from "framer-motion";
import { Lightbulb, ChevronRight } from "lucide-react";

interface ClarificationFormProps {
  clarificationQuestions: {question: string, options: string[]}[];
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
  submitClarificationAnswers
}: ClarificationFormProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden p-8"
    >
      <div className="flex items-center gap-3 mb-6 border-b border-zinc-100 pb-4">
        <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center">
          <Lightbulb size={24} />
        </div>
        <div>
          <h3 className="font-bold text-xl text-zinc-900">等一下，任務太模糊了！</h3>
          <p className="text-zinc-500 text-sm">為了幫你切出最好的執行碎片，教練需要你先釐清這些問題：</p>
        </div>
      </div>
      
      <div className="space-y-6 mb-8">
        {clarificationQuestions.map((q, i) => (
          <div key={i} className="p-5 bg-indigo-50/50 rounded-xl border border-indigo-100/50 shadow-sm flex flex-col gap-3">
            <div className="text-indigo-900 font-bold text-lg flex gap-3">
              <span className="text-indigo-400">{i+1}.</span>
              {q.question}
            </div>
            {q.options && q.options.length > 0 && (
              <div className="flex flex-wrap gap-2 pl-7 mt-2">
                {q.options.map((opt, optIdx) => {
                  const isSelected = (selectedAnswers[i] || []).includes(opt);
                  return (
                    <button
                      key={optIdx}
                      onClick={() => {
                        setSelectedAnswers(prev => {
                          const current = prev[i] || [];
                          if (current.includes(opt)) {
                            return { ...prev, [i]: current.filter(x => x !== opt) };
                          } else {
                            return { ...prev, [i]: [...current, opt] };
                          }
                        });
                      }}
                      className={`px-3 py-1.5 border text-sm font-medium rounded-lg transition-all shadow-sm ${isSelected ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:border-indigo-300'}`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            )}
            <div className="pl-7 mt-2">
              <input 
                type="text" 
                placeholder="補充其他想法..." 
                value={customAnswers[i] || ""}
                onChange={(e) => setCustomAnswers(prev => ({ ...prev, [i]: e.target.value }))}
                className="w-full bg-white border border-indigo-200 rounded-lg px-3 py-2 text-sm text-indigo-900 placeholder:text-indigo-300 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>
        ))}
      </div>

      <button 
        onClick={submitClarificationAnswers}
        className="w-full bg-indigo-600 text-white rounded-xl py-3.5 font-bold text-[15px] flex justify-center items-center gap-2 hover:bg-indigo-700 transition-all active:scale-[0.98] shadow-sm"
      >
        確認回答，開始生成碎片 <ChevronRight size={18} />
      </button>
    </motion.div>
  );
}
