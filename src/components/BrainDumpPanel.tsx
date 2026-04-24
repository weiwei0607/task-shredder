'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Sparkles, Mic, MicOff, ChevronRight, Keyboard } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import type { BreakdownMode } from '@/types';

interface BrainDumpPanelProps {
  inputText: string;
  setInputText: (val: string) => void;
  breakdownMode: BreakdownMode;
  setBreakdownMode: (val: BreakdownMode) => void;
  isProcessing: boolean;
  handleProcess: () => void;
}

export default function BrainDumpPanel({
  inputText,
  setInputText,
  breakdownMode,
  setBreakdownMode,
  isProcessing,
  handleProcess,
}: BrainDumpPanelProps) {
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.lang = 'zh-TW';
      recognitionRef.current.interimResults = true;
      recognitionRef.current.continuous = true;

      recognitionRef.current.onstart = () => setIsRecording(true);

      recognitionRef.current.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = 0; i < event.results.length; ++i) {
          currentTranscript += event.results[i][0].transcript;
        }
        setInputText(currentTranscript);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsRecording(false);
      };

      recognitionRef.current.onend = () => setIsRecording(false);
    }
  }, [setInputText]);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      recognitionRef.current?.stop();
    } else {
      if (!recognitionRef.current) {
        toast.error('您的瀏覽器不支援語音辨識，請使用 Chrome 或 Safari。');
        return;
      }
      setInputText('');
      recognitionRef.current.start();
    }
  }, [isRecording, setInputText]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 500)}px`;
  }, [inputText]);

  // Keyboard shortcut: Cmd/Ctrl + Enter
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && !isProcessing && inputText.trim()) {
        e.preventDefault();
        handleProcess();
      }
    },
    [handleProcess, isProcessing, inputText]
  );

  const modes: { value: BreakdownMode; emoji: string; label: string; desc: string }[] = [
    { value: 'auto', emoji: '🤖', label: 'AI 智能拆解', desc: '自動規劃執行步驟' },
    { value: 'none', emoji: '🛑', label: '僅列出待辦', desc: '不進行任何切割' },
    { value: 'ask', emoji: '💬', label: '互動式釐清', desc: 'AI 提問幫你把任務具體化' },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-1 flex flex-col">
      <div className="px-4 py-3 border-b border-zinc-100 flex items-center justify-between text-zinc-500 font-medium">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-amber-500" />
          <span>Brain Dump 靈感傾印</span>
        </div>
        <button
          onClick={toggleRecording}
          className={`p-1.5 rounded-full transition-all ${
            isRecording
              ? 'bg-red-100 text-red-500 animate-pulse'
              : 'hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700'
          }`}
          title={isRecording ? '停止錄音' : '開始語音輸入'}
        >
          {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
        </button>
      </div>
      <textarea
        ref={textareaRef}
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="把你的煩惱、開會紀錄、或者長篇大論貼在這裡，也可以按右上角的麥克風用語音輸入..."
        className="w-full min-h-[200px] max-h-[500px] p-4 resize-none outline-none text-zinc-700 leading-relaxed bg-transparent"
      />

      <div className="px-4 pb-2 flex items-center gap-1.5 text-xs text-zinc-400">
        <Keyboard size={12} />
        <span>Cmd / Ctrl + Enter 快速送出</span>
      </div>

      <div className="p-3 bg-zinc-50 rounded-b-xl border-t border-zinc-100">
        <div className="mb-4 px-2">
          <p className="text-xs font-bold text-zinc-400 mb-2 uppercase tracking-wider">選擇拆解模式</p>
          <div className="flex flex-col gap-2">
            {modes.map((m) => (
              <label
                key={m.value}
                className="flex items-center gap-2 text-sm font-medium text-zinc-700 cursor-pointer p-2 rounded-lg hover:bg-zinc-100 transition-colors border border-transparent has-[:checked]:border-black has-[:checked]:bg-white"
              >
                <input
                  type="radio"
                  name="mode"
                  value={m.value}
                  checked={breakdownMode === m.value}
                  onChange={(e) => setBreakdownMode(e.target.value as BreakdownMode)}
                  className="accent-black"
                />
                <span>
                  {m.emoji} {m.label}{' '}
                  <span className="text-zinc-400 text-xs font-normal">({m.desc})</span>
                </span>
              </label>
            ))}
          </div>
        </div>
        <button
          onClick={handleProcess}
          disabled={isProcessing || !inputText.trim()}
          className="w-full bg-black text-white rounded-xl py-3.5 font-bold text-[15px] flex justify-center items-center gap-2 hover:bg-zinc-800 transition-all disabled:opacity-50 active:scale-[0.98]"
        >
          {isProcessing ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
            >
              <Sparkles size={18} />
            </motion.div>
          ) : (
            <>
              開始魔法解析 <ChevronRight size={18} />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
