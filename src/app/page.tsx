'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { toast } from 'sonner';

import { useTaskProcessor } from '../hooks/useTaskProcessor';

import Header from '../components/Header';
import BrainDumpPanel from '../components/BrainDumpPanel';
import StickyNotesPanel from '../components/StickyNotesPanel';
import ClarificationForm from '../components/ClarificationForm';
import TaskBoard from '../components/TaskBoard';

export default function Home() {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const hasGoogle = !!clientId;

  const app = <TaskShredderApp hasGoogle={hasGoogle} />;

  if (!clientId) {
    return app;
  }

  return (
    <GoogleOAuthProvider clientId={clientId}>
      {app}
    </GoogleOAuthProvider>
  );
}

function TaskShredderApp({ hasGoogle }: { hasGoogle: boolean }) {
  const {
    tasks,
    setTasks,
    stickyNotes,
    addStickyNote,
    deleteStickyNote,
    updateStickyNoteDate,
    summary,
    mindmap,
    activeTab,
    setActiveTab,
    breakdownMode,
    setBreakdownMode,
    isDone,
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
    toggleTaskCompleted,
    completionRate,
    sessions,
    duplicateSuggestions,
    updateTaskTitle,
    updateSubtaskTitle,
    deleteTask,
    addSubtask,
    loadSession,
    setSessions,
  } = useTaskProcessor();

  const [isSyncing, setIsSyncing] = useState(false);
  const [isSyncingGoogle, setIsSyncingGoogle] = useState(false);
  const [notionError, setNotionError] = useState<string | null>(null);

  const PROCESSING_STEP_LABELS: Record<string, string> = {
    analyzing: '正在分析你的 Brain Dump...',
    'breaking-down': '正在將大任務切碎成可執行碎片...',
    syncing: '正在同步至 Notion...',
  };

  const allTasksForExport = [...tasks, ...stickyNotes.map((n) => ({
    id: n.id,
    title: n.text,
    deadline: n.deadline,
    daysLeft: n.daysLeft,
    isUrgent: n.isUrgent,
    subtasks: [] as { id: string; title: string; completed: boolean }[],
  }))];

  const syncToNotion = async () => {
    if (allTasksForExport.length === 0) return;
    setIsSyncing(true);
    setNotionError(null);
    try {
      const res = await fetch('/api/notion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks: allTasksForExport }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error?.includes('NOTION_TODO_DB_ID')) {
          toast.error(
            '尚未設定 NOTION_TODO_DB_ID 環境變數。請在 .env.local 中設定 Notion 待辦資料庫的 ID！'
          );
          setNotionError('尚未設定 NOTION_TODO_DB_ID 環境變數');
        } else {
          throw new Error(data.error);
        }
      } else {
        toast.success('🎉 成功同步至 Notion！');
      }
    } catch (err: unknown) {
      console.error(err);
      const message = err instanceof Error ? err.message : String(err);
      toast.error('Notion 同步失敗：' + message);
      setNotionError(message);
    } finally {
      setIsSyncing(false);
    }
  };

  const exportCalendar = () => {
    if (allTasksForExport.length === 0) return;

    import('ics').then((ics) => {
      const events = allTasksForExport.map((task) => {
        const [year, month, day] = task.deadline.split('-').map(Number);
        return {
          start: [year, month, day, 9, 0] as [number, number, number, number, number],
          end: [year, month, day, 18, 0] as [number, number, number, number, number],
          title: `[死線] ${task.title}`,
          description:
            '💡 執行碎片：\n' +
            (task.subtasks || []).map((s) => `[ ] ${s.title}`).join('\n'),
          status: 'CONFIRMED' as const,
          busyStatus: 'BUSY' as const,
        };
      });

      const { error, value } = ics.createEvents(events);

      if (error) {
        console.error(error);
        toast.error('匯出失敗：' + error.message);
        return;
      }

      if (value) {
        const blob = new Blob([value], { type: 'text/calendar;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'task-shredder-events.ics';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success('行事曆檔案下載成功！');
      }
    });
  };

  return (
    <div className="min-h-screen bg-[#fafafa] text-zinc-800 font-sans pb-20">
      <Header
        isDone={isDone}
        tasksLength={allTasksForExport.length}
        isSyncing={isSyncing}
        syncToNotion={syncToNotion}
        exportCalendar={exportCalendar}
        tasks={tasks}
        setIsSyncingGoogle={setIsSyncingGoogle}
        isSyncingGoogle={isSyncingGoogle}
        onReset={resetAll}
        hasGoogle={hasGoogle}
      />

      {/* Notion Sync Error Banner */}
      <AnimatePresence>
        {notionError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="max-w-5xl mx-auto mt-4 px-6"
          >
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <AlertCircle size={20} className="text-red-500 shrink-0" />
                <p className="text-sm text-red-700 font-medium truncate">
                  Notion 同步失敗：{notionError}
                </p>
              </div>
              <button
                onClick={() => {
                  setNotionError(null);
                  syncToNotion();
                }}
                disabled={isSyncing}
                className="shrink-0 text-sm font-bold text-red-700 hover:bg-red-100 px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
                重試
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="max-w-5xl mx-auto mt-8 px-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Brain Dump + Sticky Notes */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <BrainDumpPanel
            inputText={inputText}
            setInputText={setInputText}
            breakdownMode={breakdownMode}
            setBreakdownMode={setBreakdownMode}
            isProcessing={isProcessing}
            handleProcess={handleProcess}
          />
          <StickyNotesPanel
            notes={stickyNotes}
            onAdd={addStickyNote}
            onDelete={deleteStickyNote}
            onUpdateDate={updateStickyNoteDate}
          />
        </div>

        {/* Right Column: Output & Action */}
        <div className="lg:col-span-7 min-h-[400px]">
          <AnimatePresence mode="wait">
            {!isDone && !isProcessing && clarificationQuestions.length === 0 && (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="h-full flex flex-col items-center justify-center text-zinc-400 border-2 border-dashed border-zinc-200 rounded-2xl p-12 text-center"
              >
                <Target size={48} strokeWidth={1} className="mb-4 text-zinc-300" />
                <p className="text-lg font-medium text-zinc-500 mb-2">
                  準備好擊碎拖延症了嗎？
                </p>
                <p className="text-sm">
                  在左側輸入文字或用語音，AI 會自動幫你把巨大任務切成小碎片。
                </p>
              </motion.div>
            )}

            {isProcessing && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full flex flex-col items-center justify-center space-y-6"
              >
                {/* Shimmer Skeleton */}
                <div className="w-full max-w-md space-y-4">
                  <div className="h-4 bg-zinc-200 rounded animate-pulse w-3/4 mx-auto" />
                  <div className="space-y-3">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="space-y-2">
                        <div className="h-3 bg-zinc-200 rounded animate-pulse w-full" />
                        <div className="h-3 bg-zinc-200 rounded animate-pulse w-5/6" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Progress Steps */}
                <div className="flex flex-col items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Loader2 size={18} className="animate-spin text-zinc-600" />
                    <span className="text-zinc-700 font-medium">
                      {processingStep ? PROCESSING_STEP_LABELS[processingStep] : '處理中...'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {(['analyzing', 'breaking-down'] as const).map((step, idx) => (
                      <React.Fragment key={step}>
                        <div
                          className={`w-2.5 h-2.5 rounded-full transition-colors duration-500 ${
                            processingStep === step ||
                            (processingStep === 'syncing' && step === 'breaking-down') ||
                            (processingStep === null && idx === 0)
                              ? 'bg-black'
                              : processingStep &&
                                ['breaking-down', 'syncing'].includes(processingStep) &&
                                step === 'analyzing'
                              ? 'bg-green-500'
                              : 'bg-zinc-300'
                          }`}
                        />
                        {idx === 0 && <div className="w-6 h-0.5 bg-zinc-200 rounded-full" />}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {!isProcessing && clarificationQuestions.length > 0 && (
              <ClarificationForm
                clarificationQuestions={clarificationQuestions}
                selectedAnswers={selectedAnswers}
                setSelectedAnswers={setSelectedAnswers}
                customAnswers={customAnswers}
                setCustomAnswers={setCustomAnswers}
                submitClarificationAnswers={submitClarificationAnswers}
              />
            )}

            {isDone && !isProcessing && clarificationQuestions.length === 0 && (
              <TaskBoard
                tasks={tasks}
                setTasks={setTasks}
                summary={summary}
                mindmap={mindmap}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                toggleTaskCompleted={toggleTaskCompleted}
                completionRate={completionRate}
                sessions={sessions}
                duplicateSuggestions={duplicateSuggestions}
                updateTaskTitle={updateTaskTitle}
                updateSubtaskTitle={updateSubtaskTitle}
                deleteTask={deleteTask}
                addSubtask={addSubtask}
                loadSession={loadSession}
                setSessions={setSessions}
              />
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
