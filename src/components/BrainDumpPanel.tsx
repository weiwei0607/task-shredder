'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Sparkles, Mic, MicOff, ChevronRight, Bot, ListChecks, MessagesSquare, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { BreakdownMode } from '@/types';

interface SpeechRecognitionEvent {
  results: { length: number; [i: number]: { [j: number]: { transcript: string } } };
}
interface SpeechRecognitionErrorEvent {
  error: string;
}
interface SpeechRecognitionInstance {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onstart: (() => void) | null;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: ((e: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}
interface WindowWithSpeech extends Window {
  SpeechRecognition?: new () => SpeechRecognitionInstance;
  webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
}

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
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-save draft to localStorage
  const DRAFT_KEY = 'ts_braindump_draft';
  useEffect(() => {
    const saved = localStorage.getItem(DRAFT_KEY);
    if (saved && !inputText) {
      setInputText(saved);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (inputText.trim()) {
      localStorage.setItem(DRAFT_KEY, inputText);
    } else {
      localStorage.removeItem(DRAFT_KEY);
    }
  }, [inputText]);

  useEffect(() => {
    const w = window as WindowWithSpeech;
    const SpeechRecognitionCtor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (SpeechRecognitionCtor) {
      recognitionRef.current = new SpeechRecognitionCtor();
      recognitionRef.current.lang = 'zh-TW';
      recognitionRef.current.interimResults = true;
      recognitionRef.current.continuous = true;

      recognitionRef.current.onstart = () => setIsRecording(true);

      recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
        let currentTranscript = '';
        for (let i = 0; i < event.results.length; ++i) {
          currentTranscript += event.results[i][0].transcript;
        }
        setInputText(currentTranscript);
      };

      recognitionRef.current.onerror = (event: SpeechRecognitionErrorEvent) => {
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

  // Clear draft on successful process
  const originalHandleProcess = handleProcess;
  const wrappedHandleProcess = useCallback(async () => {
    await originalHandleProcess();
    localStorage.removeItem(DRAFT_KEY);
  }, [originalHandleProcess]);

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

  const modes: { value: BreakdownMode; icon: React.ReactNode; label: string; desc: string }[] = [
    { value: 'auto', icon: <Bot size={16} />, label: 'AI 智能拆解', desc: '自動規劃執行步驟' },
    { value: 'none', icon: <ListChecks size={16} />, label: '僅列出待辦', desc: '不進行任何切割' },
    { value: 'ask', icon: <MessagesSquare size={16} />, label: '互動式釐清', desc: 'AI 提問幫你把任務具體化' },
  ];

  return (
    <section className="flex flex-col overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-3.5">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-indigo-500" />
          <h2 className="text-sm font-semibold text-zinc-800">Brain Dump 靈感傾印</h2>
        </div>
        <button
          onClick={toggleRecording}
          className={`rounded-full p-2 transition-all ${
            isRecording
              ? 'animate-pulse bg-red-50 text-red-500 ring-1 ring-red-200'
              : 'text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700'
          }`}
          title={isRecording ? '停止錄音' : '開始語音輸入'}
        >
          {isRecording ? <MicOff size={16} /> : <Mic size={16} />}
        </button>
      </div>
      <textarea
        ref={textareaRef}
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="把你的煩惱、開會紀錄、或者長篇大論貼在這裡，也可以按右上角的麥克風用語音輸入..."
        className="min-h-[200px] max-h-[500px] w-full resize-none bg-transparent p-5 text-[15px] leading-relaxed text-zinc-700 outline-none placeholder:text-zinc-400 focus-visible:outline-none"
      />

      <div className="flex items-center gap-1.5 px-5 pb-3 text-xs text-zinc-400">
        <kbd className="rounded border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 font-mono text-[10px] font-medium text-zinc-500">⌘ / Ctrl</kbd>
        <span>+</span>
        <kbd className="rounded border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 font-mono text-[10px] font-medium text-zinc-500">Enter</kbd>
        <span>快速送出</span>
      </div>

      <div className="border-t border-zinc-100 bg-zinc-50/70 p-4">
        <p className="mb-2.5 px-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">拆解模式</p>
        <div className="mb-4 flex flex-col gap-1.5">
          {modes.map((m) => {
            const isActive = breakdownMode === m.value;
            return (
              <label
                key={m.value}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition-all ${
                  isActive
                    ? 'border-indigo-200 bg-white shadow-sm ring-1 ring-indigo-100'
                    : 'border-transparent hover:bg-white/70'
                }`}
              >
                <input
                  type="radio"
                  name="mode"
                  value={m.value}
                  checked={isActive}
                  onChange={(e) => setBreakdownMode(e.target.value as BreakdownMode)}
                  className="sr-only"
                />
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
                    isActive ? 'bg-indigo-600 text-white' : 'bg-zinc-100 text-zinc-500'
                  }`}
                >
                  {m.icon}
                </span>
                <span className="min-w-0 leading-tight">
                  <span className={`block text-sm font-semibold ${isActive ? 'text-zinc-900' : 'text-zinc-600'}`}>
                    {m.label}
                  </span>
                  <span className="block text-xs text-zinc-400">{m.desc}</span>
                </span>
              </label>
            );
          })}
        </div>
        <button
          onClick={wrappedHandleProcess}
          disabled={isProcessing || !inputText.trim()}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 py-3.5 text-[15px] font-semibold text-white shadow-sm transition-all hover:bg-zinc-800 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isProcessing ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <>
              開始魔法解析 <ChevronRight size={18} />
            </>
          )}
        </button>
      </div>
    </section>
  );
}
