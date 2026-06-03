'use client';

import { useState, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { useLocalStorage } from './useLocalStorage';
import { formatTasks, createStickyNote, updateStickyNoteDeadline, generateId } from '@/lib/utils';
import type { Task, StickyNote, ClarificationQuestion, BreakdownMode, ActiveTab, BrainDumpSession, AnalyzeResponse } from '@/types';

export type ProcessingStep = 'analyzing' | 'breaking-down' | 'syncing' | null;

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
  processingStep: ProcessingStep;
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
  // Inline editing
  updateTaskTitle: (taskId: string, title: string) => void;
  updateSubtaskTitle: (taskId: string, subtaskId: string, title: string) => void;
  deleteTask: (taskId: string) => void;
  addSubtask: (taskId: string, title: string) => void;
  loadSession: (session: BrainDumpSession) => void;
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
  const [processingStep, setProcessingStep] = useState<ProcessingStep>(null);
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
    if (total === 0) return 0;
    const completed = tasks.reduce((sum, t) => sum + t.subtasks.filter(s => s.completed).length, 0);
    return Math.round((completed / total) * 100);
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
      .filter(([, count]) => count >= 3)
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

  const updateTaskTitle = useCallback((taskId: string, title: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, title: title.trim() || t.title } : t))
    );
  }, [setTasks]);

  const updateSubtaskTitle = useCallback((taskId: string, subtaskId: string, title: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              subtasks: t.subtasks.map((s) =>
                s.id === subtaskId ? { ...s, title: title.trim() || s.title } : s
              ),
            }
          : t
      )
    );
  }, [setTasks]);

  const deleteTask = useCallback((taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    toast.success('任務已刪除');
  }, [setTasks]);

  const addSubtask = useCallback((taskId: string, title: string) => {
    if (!title.trim()) return;
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              subtasks: [
                ...t.subtasks,
                { id: generateId('s'), title: title.trim(), completed: false },
              ],
            }
          : t
      )
    );
  }, [setTasks]);

  const loadSession = useCallback((session: BrainDumpSession) => {
    setTasks(session.tasks);
    setSummary(session.summary);
    setMindmap(session.mindmap);
    setIsDone(true);
    setActiveTab('todo');
    setInputText(session.text);
    toast.success('已載入歷史紀錄');
  }, [setTasks, setSummary, setMindmap, setIsDone, setActiveTab, setInputText]);

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

  const processResponse = useCallback((data: AnalyzeResponse) => {
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

  const callAnalyzeAPI = useCallback(async (text: string, mode: string): Promise<AnalyzeResponse> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, mode }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `AI 解析失敗 (${response.status})`);
      }
      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('請求逾時，AI 伺服器回應過慢，請稍後再試。');
      }
      throw error;
    }
  }, []);

  const handleProcess = useCallback(async () => {
    if (!inputText.trim()) return;
    setIsProcessing(true);
    setProcessingStep('analyzing');
    resetSession();

    try {
      setProcessingStep('breaking-down');
      const data = await callAnalyzeAPI(inputText, breakdownMode);

      if ((data.clarificationQuestions?.length ?? 0) > 0) {
        setClarificationQuestions(data.clarificationQuestions!);
        setIsDone(false);
        return;
      }

      processResponse(data);
      setIsDone(true);
      setActiveTab('todo');
      toast.success('AI 解析完成！');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '處理失敗，請稍後再試。';
      console.error(error);
      toast.error(message);
    } finally {
      setIsProcessing(false);
      setProcessingStep(null);
    }
  }, [inputText, breakdownMode, resetSession, processResponse, setIsDone, setActiveTab, callAnalyzeAPI]);

  const submitClarificationAnswers = useCallback(async () => {
    setIsProcessing(true);
    setProcessingStep('analyzing');

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
      setProcessingStep('breaking-down');
      const data = await callAnalyzeAPI(finalPrompt, 'auto');
      processResponse(data);
      setIsDone(true);
      setActiveTab('todo');
      setBreakdownMode('auto');
      toast.success('根據釐清資訊，AI 重組片段完成！');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '處理失敗，請稍後再試。';
      console.error(error);
      toast.error(message);
    } finally {
      setIsProcessing(false);
      setProcessingStep(null);
    }
  }, [clarificationQuestions, selectedAnswers, customAnswers, inputText, processResponse, setIsDone, setActiveTab, setBreakdownMode, callAnalyzeAPI]);

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
    processingStep,
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
    updateTaskTitle,
    updateSubtaskTitle,
    deleteTask,
    addSubtask,
    loadSession,
  };
}
