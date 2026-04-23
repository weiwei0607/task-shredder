"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Target } from "lucide-react";
import { GoogleOAuthProvider } from '@react-oauth/google';
import { toast } from "sonner";
import { useLocalStorage } from "../hooks/useLocalStorage";

import Header from "../components/Header";
import BrainDumpPanel from "../components/BrainDumpPanel";
import ClarificationForm from "../components/ClarificationForm";
import TaskBoard from "../components/TaskBoard";

export default function Home() {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "c799111991622-m5hecfpoq1m5elkll9qk40a7sivjgn40.apps.googleusercontent.com";

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <TaskShredderApp />
    </GoogleOAuthProvider>
  );
}

function TaskShredderApp() {
  const [tasks, setTasks] = useLocalStorage<any[]>("ts_tasks", []);
  const [summary, setSummary] = useLocalStorage<string[]>("ts_summary", []);
  const [mindmap, setMindmap] = useLocalStorage<string>("ts_mindmap", "");
  const [activeTab, setActiveTab] = useLocalStorage<string>("ts_activeTab", "todo");
  const [breakdownMode, setBreakdownMode] = useLocalStorage<string>("ts_breakdownMode", "auto");
  const [isDone, setIsDone] = useLocalStorage<boolean>("ts_isDone", false);

  const [inputText, setInputText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [clarificationQuestions, setClarificationQuestions] = useState<{question: string, options: string[]}[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string[]>>({});
  const [customAnswers, setCustomAnswers] = useState<Record<number, string>>({});

  const [isSyncing, setIsSyncing] = useState(false);
  const [isSyncingGoogle, setIsSyncingGoogle] = useState(false);

  const handleProcess = async () => {
    if (!inputText.trim()) return;
    setIsProcessing(true);
    setClarificationQuestions([]);
    setSelectedAnswers({});
    setCustomAnswers({});
    
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: inputText, mode: breakdownMode }),
      });

      if (!response.ok) throw new Error('AI 解析失敗');
      
      const data = await response.json();

      if (data.clarificationQuestions && Array.isArray(data.clarificationQuestions) && data.clarificationQuestions.length > 0) {
        setClarificationQuestions(data.clarificationQuestions);
        setIsDone(false);
        return;
      }
      
      if (data.tasks && Array.isArray(data.tasks)) {
        const formattedTasks = data.tasks.map((task: any) => ({
          ...task,
          id: 't_' + Math.random().toString(36).substring(2, 11),
          subtasks: (task.subtasks || []).map((sub: any) => ({
            ...sub,
            id: 's_' + Math.random().toString(36).substring(2, 11),
            completed: false
          }))
        }));
        setTasks(formattedTasks);
      }
      
      if (data.summary && Array.isArray(data.summary)) {
        setSummary(data.summary);
      }

      if (data.mindmap) {
        setMindmap(data.mindmap);
      }
      
      setIsDone(true);
      setActiveTab('todo');
      toast.success("AI 解析完成！");
    } catch (error) {
      console.error(error);
      toast.error('處理失敗，請稍後再試。');
    } finally {
      setIsProcessing(false);
    }
  };

  const submitClarificationAnswers = async () => {
    setIsProcessing(true);
    
    let combinedAnswers = "";
    clarificationQuestions.forEach((q, i) => {
      combinedAnswers += `\n[問題 ${i+1}] ${q.question}\n我的回答：`;
      const selected = selectedAnswers[i] || [];
      if (selected.length > 0) {
        combinedAnswers += selected.join("、");
      }
      const custom = customAnswers[i];
      if (custom && custom.trim() !== "") {
        combinedAnswers += (selected.length > 0 ? "，以及：" : "") + custom.trim();
      }
      combinedAnswers += "\n";
    });

    const finalPrompt = `原計畫：\n${inputText}\n\n補充資訊：\n${combinedAnswers}`;
    setClarificationQuestions([]);
    
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: finalPrompt, mode: "auto" }),
      });

      if (!response.ok) throw new Error('AI 解析失敗');
      
      const data = await response.json();
      
      if (data.tasks && Array.isArray(data.tasks)) {
        const formattedTasks = data.tasks.map((task: any) => ({
          ...task,
          id: 't_' + Math.random().toString(36).substring(2, 11),
          subtasks: (task.subtasks || []).map((sub: any) => ({
            ...sub,
            id: 's_' + Math.random().toString(36).substring(2, 11),
            completed: false
          }))
        }));
        setTasks(formattedTasks);
      }
      
      if (data.summary && Array.isArray(data.summary)) {
        setSummary(data.summary);
      }

      if (data.mindmap) {
        setMindmap(data.mindmap);
      }
      
      setIsDone(true);
      setActiveTab('todo');
      setBreakdownMode("auto");
      toast.success("根據釐清資訊，AI 重組片段完成！");
    } catch (error) {
      console.error(error);
      toast.error('處理失敗，請稍後再試。');
    } finally {
      setIsProcessing(false);
    }
  };

  const syncToNotion = async () => {
    if (tasks.length === 0) return;
    setIsSyncing(true);
    try {
      const res = await fetch('/api/notion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks })
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error && data.error.includes("NOTION_TODO_DB_ID")) {
          toast.error("尚未設定 NOTION_TODO_DB_ID 環境變數。請在 .env.local 中設定 Notion 待辦資料庫的 ID！");
        } else {
          throw new Error(data.error);
        }
      } else {
        toast.success("🎉 成功同步至 Notion！");
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Notion 同步失敗：" + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const exportCalendar = () => {
    if (tasks.length === 0) return;
    
    import('ics').then((ics) => {
      const events = tasks.map(task => {
        const [year, month, day] = task.deadline.split('-').map(Number);
        return {
          start: [year, month, day, 9, 0],
          end: [year, month, day, 18, 0],
          title: `[死線] ${task.title}`,
          description: "💡 執行碎片：\n" + (task.subtasks || []).map((s: any) => `[ ] ${s.title}`).join('\n'),
          status: 'CONFIRMED',
          busyStatus: 'BUSY'
        };
      });

      const { error, value } = ics.createEvents(events as any);

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
        toast.success("行事曆檔案下載成功！");
      }
    });
  };

  return (
    <div className="min-h-screen bg-[#fafafa] text-zinc-800 font-sans pb-20">
      <Header 
        isDone={isDone}
        tasksLength={tasks.length}
        isSyncing={isSyncing}
        syncToNotion={syncToNotion}
        exportCalendar={exportCalendar}
        tasks={tasks}
        setIsSyncingGoogle={setIsSyncingGoogle}
        isSyncingGoogle={isSyncingGoogle}
      />

      <main className="max-w-5xl mx-auto mt-8 px-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Brain Dump */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <BrainDumpPanel 
            inputText={inputText}
            setInputText={setInputText}
            breakdownMode={breakdownMode}
            setBreakdownMode={setBreakdownMode}
            isProcessing={isProcessing}
            handleProcess={handleProcess}
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
                <p className="text-lg font-medium text-zinc-500 mb-2">準備好擊碎拖延症了嗎？</p>
                <p className="text-sm">在左側輸入文字或用語音，AI 會自動幫你把巨大任務切成小碎片。</p>
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
                  {[0, 1, 2].map(i => (
                    <motion.div
                      key={i}
                      className="w-3 h-3 bg-black rounded-full"
                      animate={{ y: ["0%", "-100%", "0%"] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
                    />
                  ))}
                </div>
                <p className="text-zinc-500 font-medium animate-pulse">正在拆解任務、建構心智圖...</p>
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
              />
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}