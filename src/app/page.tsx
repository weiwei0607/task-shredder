'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target } from 'lucide-react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { toast } from 'sonner';

import { useTaskProcessor } from '../hooks/useTaskProcessor';

import Header from '../components/Header';
import BrainDumpPanel from '../components/BrainDumpPanel';
import StickyNotesPanel from '../components/StickyNotesPanel';
import ClarificationForm from '../components/ClarificationForm';
import TaskBoard from '../components/TaskBoard';

export default function Home() {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <TaskShredderApp />
    </GoogleOAuthProvider>
  );
}

function TaskShredderApp() {
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
  } = useTaskProcessor();

  const [isSyncing, setIsSyncing] = useState(false);
  const [isSyncingGoogle, setIsSyncingGoogle] = useState(false);

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
        } else {
          throw new Error(data.error);
        }
      } else {
        toast.success('🎉 成功同步至 Notion！');
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Notion 同步失敗：' + err.message);
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
      />

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
                className="h-full flex flex-col items-center justify-center space-y-4"
              >
                <div className="flex gap-2">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="w-3 h-3 bg-black rounded-full"
                      animate={{ y: ['0%', '-100%', '0%'] }}
                      transition={{
                        duration: 0.6,
                        repeat: Infinity,
                        delay: i * 0.15,
                        ease: 'easeInOut',
                      }}
                    />
                  ))}
                </div>
                <p className="text-zinc-500 font-medium animate-pulse">
                  正在拆解任務、建構心智圖...
                </p>
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
              />
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
