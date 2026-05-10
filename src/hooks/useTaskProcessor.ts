'use client';

import { useState, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { useLocalStorage } from './useLocalStorage';
import { formatTasks, createStickyNote, updateStickyNoteDeadline } from '@/lib/utils';
import type { Task, StickyNote, ClarificationQuestion, BreakdownMode, ActiveTab, BrainDumpSession } from '@/types';

interface UseTaskProcessorReturn {
  tasks: Task[];
  setTasks: (val: Task[] | ((prev: Task[]) => Task[])) => void;
  stickyNotes: StickyNote[];
  setStickyNotes: (val: StickyNote[] | ((prev: StickyNote[]) => StickyNote[])) => void;
  addStickyNote: (text: string, deadline?: string) => void;
  deleteStickyNote: (id: string) => void;
  updateStickyNoteDate: (id: string, newDate: string) => void;
  summary: string[];
  setSummary: (val: string[] | ((prev: string[]) => string[])) => void;
  mindmap: string;
  setMindmap: (val: string | ((prev: string) => string)) => void;
  activeTab: ActiveTab;
  setActiveTab: (val: ActiveTab | ((prev: ActiveTab) => ActiveTab)) => void;
  breakdownMode: BreakdownMode;
  setBreakdownMode: (val: BreakdownMode | ((prev: BreakdownMode) => BreakdownMode)) => void;
  isDone: boolean;
  setIsDone: (val: boolean | ((prev: boolean) => boolean)) => void;
  inputText: string;
  setInputText: (val: string) => void;
  isProcessing: boolean;
  clarificationQuestions: ClarificationQuestion[];
  selectedAnswers: Record<number, string[]>;
  setSelectedAnswers: React.Dispatch<React.SetStateAction<Record<number, string[]>>>;
  customAnswers: Record<number, string>;
  setCustomAnswers: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  handleProcess: () => Promise<void>;
  submitClarificationAnswers: () => Promise<void>;
  resetAll: () => void;
  sessions: BrainDumpSession[];
  setSessions: (val: BrainDumpSession[] | ((prev: BrainDumpSession[]) => BrainDumpSession[])) => void;
  toggleTaskCompleted: (taskId: string) => void;
  completionRate: number;
  duplicateSuggestions: string[];
}

export function useTaskProcessor(): UseTaskProcessorReturn {
  const [tasks, setTasks] = useLocalStorage<Task[]>('ts_tasks', []);
  const [stickyNotes, setStickyNotes] = useLocalStorage<StickyNote[]>('ts_sticky_notes', []);
  const [summary, setSummary] = useLocalStorage<string[]>('ts_summary', []);
  const [mindmap, setMindmap] = useLocalStorage<string>('ts_mindmap', '');
  const [activeTab, setActiveTab] = useLocalStorage<ActiveTab>('ts_activeTab', 'todo');
  const [breakdownMode, setBreakdownMode] = useLocalStorage<BreakdownMode>('ts_breakdownMode', 'auto');
  const [isDone, setIsDone] = useLocalStorage<boolean>('ts_isDone', false);
  const [sessions, setSessions] = useLocalStorage<BrainDumpSession[]>('ts_sessions', []);

  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [clarificationQuestions, setClarificationQuestions] = useState<ClarificationQuestion[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string[]>>({});
  const [customAnswers, setCustomAnswers] = useState<Record<number, string>>({});

  const resetSession = useCallback(() => {
    setClarificationQuestions([]);
    setSelectedAnswers({});
    setCustomAnswers({});
  }, []);

  const resetAll = useCallback(() => {
    setTasks([]);
    setStickyNotes([]);
    setSummary([]);
    setMindmap('');
    setIsDone(false);
    setInputText('');
    resetSession();
  }, [setTasks, setStickyNotes, setSummary, setMindmap, setIsDone, resetSession]);

  const completionRate = useMemo(() => {
    const total = tasks.reduce((sum, t) => sum + t.subtasks.length, 0);
    const completed = tasks.reduce((sum, t) => sum + t.subtasks.filter(s => s.completed).length, 0);
    return total === 0 ? 0 : Math.round((completed / total) * 100);
  }, [tasks]);

  // Detect duplicate tasks (suggest habit tracking)
  const duplicateSuggestions = useMemo(() => {
    const titleCounts: Record<string, number> = {};
    sessions.forEach(s => {
      s.tasks.forEach(t => {
        const key = t.title.toLowerCase().trim();
        titleCounts[key] = (titleCounts[key] || 0) + 1;
      });
    });
    return Object.entries(titleCounts)
      .filter(([_, count]) => count >= 3)
      .map(([title]) => title);
  }, [sessions]);

  const toggleTaskCompleted = useCallback((taskId: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? { ...t, completed: !t.completed, completedAt: !t.completed ? new Date().toISOString() : undefined }
          : t
      )
    );
  }, [setTasks]);

  const addStickyNote = useCallback((text: string, deadline?: string) => {
    const note = createStickyNote(text, deadline);
    setStickyNotes((prev) => [note, ...prev]);
    toast.success('已新增便條紙待辦！');
  }, [setStickyNotes]);

  const deleteStickyNote = useCallback((id: string) => {
    setStickyNotes((prev) => prev.filter((n) => n.id !== id));
    toast.success('便條紙已完成並移除！');
  }, [setStickyNotes]);

  const updateStickyNoteDate = useCallback((id: string, newDate: string) => {
    setStickyNotes((prev) => updateStickyNoteDeadline(prev, id, newDate));
  }, [setStickyNotes]);

  const processResponse = useCallback((data: any) => {
    if (data.tasks && Array.isArray(data.tasks)) {
      const formatted = formatTasks(data.tasks);
      setTasks(formatted);
      // Save to history
      const session: BrainDumpSession = {
        id: crypto.randomUUID(),
        text: inputText,
        tasks: formatted,
        summary: data.summary || [],
        mindmap: data.mindmap || '',
        createdAt: new Date().toISOString(),
      };
      setSessions((prev) => [session, ...prev].slice(0, 50));
    }
    if (data.summary && Array.isArray(data.summary)) {
      setSummary(data.summary);
    }
    if (data.mindmap) {
      setMindmap(data.mindmap);
    }
  }, [setTasks, setSummary, setMindmap, setSessions, inputText]);

  const handleProcess = useCallback(async () => {
    if (!inputText.trim()) return;
    setIsProcessing(true);
    resetSession();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: inputText, mode: breakdownMode }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) throw new Error('AI 解析失敗');

      const data = await response.json();

      if (data.clarificationQuestions?.length > 0) {
        setClarificationQuestions(data.clarificationQuestions);
        setIsDone(false);
        return;
      }

      processResponse(data);
      setIsDone(true);
      setActiveTab('todo');
      toast.success('AI 解析完成！');
    } catch (error: any) {
      if (error.name === 'AbortError') {
        toast.error('請求逾時，請稍後再試。');
      } else {
        console.error(error);
        toast.error('處理失敗，請稍後再試。');
      }
    } finally {
      setIsProcessing(false);
    }
  }, [inputText, breakdownMode, resetSession, processResponse, setIsDone, setActiveTab]);

  const submitClarificationAnswers = useCallback(async () => {
    setIsProcessing(true);

    const combinedAnswers = clarificationQuestions
      .map((q, i) => {
        const selected = selectedAnswers[i] || [];
        const custom = customAnswers[i]?.trim();
        const parts = [
          ...selected,
          ...(custom ? [custom] : []),
        ];
        return `[問題 ${i + 1}] ${q.question}\n我的回答：${parts.join('、') || '（未回答）'}`;
      })
      .join('\n\n');

    const finalPrompt = `原計畫：\n${inputText}\n\n補充資訊：\n${combinedAnswers}`;
    setClarificationQuestions([]);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: finalPrompt, mode: 'auto' }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) throw new Error('AI 解析失敗');

      const data = await response.json();
      processResponse(data);
      setIsDone(true);
      setActiveTab('todo');
      setBreakdownMode('auto');
      toast.success('根據釐清資訊，AI 重組片段完成！');
    } catch (error: any) {
      if (error.name === 'AbortError') {
        toast.error('請求逾時，請稍後再試。');
      } else {
        console.error(error);
        toast.error('處理失敗，請稍後再試。');
      }
    } finally {
      setIsProcessing(false);
    }
  }, [clarificationQuestions, selectedAnswers, customAnswers, inputText, processResponse, setIsDone, setActiveTab, setBreakdownMode]);

  return {
    tasks,
    setTasks,
    stickyNotes,
    setStickyNotes,
    addStickyNote,
    deleteStickyNote,
    updateStickyNoteDate,
    summary,
    setSummary,
    mindmap,
    setMindmap,
    activeTab,
    setActiveTab,
    breakdownMode,
    setBreakdownMode,
    isDone,
    setIsDone,
    inputText,
    setInputText,
    isProcessing,
    clarificationQuestions,
    selectedAnswers,
    setSelectedAnswers,
    customAnswers,
    setCustomAnswers,
    handleProcess,
    submitClarificationAnswers,
    resetAll,
    sessions,
    setSessions,
    toggleTaskCompleted,
    completionRate,
    duplicateSuggestions,
  };
}
