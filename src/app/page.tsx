"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Sparkles, Target, ListTodo, 
  ChevronRight, Lightbulb, Clock, CheckCircle2,
  Calendar, Mic, MicOff, Network, CalendarClock
} from "lucide-react";
import dynamic from 'next/dynamic';

import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google';

const Mermaid = dynamic(() => import('../components/Mermaid'), { ssr: false });

export default function Home() {
  return (
    <GoogleOAuthProvider clientId="c799111991622-m5hecfpoq1m5elkll9qk40a7sivjgn40.apps.googleusercontent.com">
      <TaskShredderApp />
    </GoogleOAuthProvider>
  );
}
function TaskShredderApp() {
  const [inputText, setInputText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDone, setIsDone] = useState(false);
  
  const [tasks, setTasks] = useState<any[]>([]);
  const [summary, setSummary] = useState<string[]>([]);
  const [mindmap, setMindmap] = useState<string>("");
  const [activeTab, setActiveTab] = useState("todo"); // 'todo', 'summary', 'mindmap'
  const [breakdownMode, setBreakdownMode] = useState("auto"); // 'none', 'auto', 'ask'
  const [clarificationQuestions, setClarificationQuestions] = useState<{question: string, options: string[]}[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string[]>>({});
  const [customAnswers, setCustomAnswers] = useState<Record<number, string>>({});

  const [isRecording, setIsRecording] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSyncingGoogle, setIsSyncingGoogle] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.lang = 'zh-TW';
      recognitionRef.current.interimResults = true;
      recognitionRef.current.continuous = true;

      recognitionRef.current.onstart = () => {
        setIsRecording(true);
      };

      recognitionRef.current.onresult = (event: any) => {
        let currentTranscript = "";
        for (let i = 0; i < event.results.length; ++i) {
          currentTranscript += event.results[i][0].transcript;
        }
        setInputText(currentTranscript);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setIsRecording(false);
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
      };
    }
  }, []);

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
    } else {
      if (!recognitionRef.current) {
        alert("您的瀏覽器不支援語音辨識，請使用 Chrome 或 Safari。");
        return;
      }
      setInputText("");
      recognitionRef.current.start();
    }
  };

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

      if (data.clarificationQuestions && Array.isArray(data.clarificationQuestions)) {
        setClarificationQuestions(data.clarificationQuestions);
        setIsDone(false);
        return;
      }
      
      if (data.tasks && Array.isArray(data.tasks)) {
        const formattedTasks = data.tasks.map((task: any) => ({
          ...task,
          id: 't_' + Math.random().toString(36).substr(2, 9),
          subtasks: (task.subtasks || []).map((sub: any) => ({
            ...sub,
            id: 's_' + Math.random().toString(36).substr(2, 9),
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
    } catch (error) {
      console.error(error);
      alert('處理失敗，請稍後再試。');
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
          id: 't_' + Math.random().toString(36).substr(2, 9),
          subtasks: (task.subtasks || []).map((sub: any) => ({
            ...sub,
            id: 's_' + Math.random().toString(36).substr(2, 9),
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
    } catch (error) {
      console.error(error);
      alert('處理失敗，請稍後再試。');
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleSubtask = (taskId: string, subtaskId: string) => {
    setTasks(prevTasks => prevTasks.map(task => {
      if (task.id === taskId) {
        const newSubtasks = task.subtasks.map((sub: any) => 
          sub.id === subtaskId ? { ...sub, completed: !sub.completed } : sub
        );
        return { ...task, subtasks: newSubtasks };
      }
      return task;
    }));
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
          alert("尚未設定 NOTION_TODO_DB_ID 環境變數。請在 .env.local 中加上您 Notion 待辦資料庫的 ID！");
        } else {
          throw new Error(data.error);
        }
      } else {
        alert("🎉 成功同步至 Notion！");
      }
    } catch (err: any) {
      console.error(err);
      alert("同步失敗：" + err.message);
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
          description: "💡 執行碎片：\n" + task.subtasks.map((s: any) => `[ ] ${s.title}`).join('\n'),
          status: 'CONFIRMED',
          busyStatus: 'BUSY'
        };
      });

      const { error, value } = ics.createEvents(events as any);

      if (error) {
        console.error(error);
        alert('匯出失敗：' + error.message);
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
      }
    });
  };

  const loginAndSyncToGoogle = useGoogleLogin({
    scope: 'https://www.googleapis.com/auth/tasks https://www.googleapis.com/auth/calendar.events',
    onSuccess: async (tokenResponse) => {
      setIsSyncingGoogle(true);
      try {
        const res = await fetch('/api/google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            tasks,
            accessToken: tokenResponse.access_token 
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        alert("🎉 成功同步至 Google 日曆與 Google Tasks！");
      } catch (err: any) {
        console.error(err);
        alert("Google 同步失敗：" + err.message);
      } finally {
        setIsSyncingGoogle(false);
      }
    },
    onError: error => console.error('Login Failed', error)
  });

  return (
    <div className="min-h-screen bg-[#fafafa] text-zinc-800 font-sans pb-20">
      {/* Header */}
      <header className="bg-white border-b border-zinc-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="bg-black text-white p-1.5 rounded-lg">
            <Target size={20} strokeWidth={2.5} />
          </div>
          <h1 className="font-bold text-xl tracking-tight">任務碎紙機 <span className="text-zinc-400 font-normal text-sm ml-2">Task Shredder</span></h1>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={exportCalendar}
            disabled={!isDone || tasks.length === 0}
            className="text-sm font-bold text-zinc-600 hover:text-black hover:bg-zinc-100 px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 disabled:opacity-50"
            title="匯出 iCal 檔案，可加入 Apple 或 Google 行事曆"
          >
            <CalendarClock size={16} />
            匯出行事曆
          </button>
          <button 
            onClick={() => loginAndSyncToGoogle()}
            disabled={!isDone || isSyncingGoogle || tasks.length === 0}
            className="text-sm font-bold text-zinc-600 hover:text-black hover:bg-zinc-100 px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 disabled:opacity-50"
            title="同步至 Google 日曆與 Google Tasks"
          >
            {isSyncingGoogle ? (
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                <Sparkles size={16} />
              </motion.div>
            ) : (
              <Calendar size={16} />
            )}
            同步至 Google
          </button>
          <button 
            onClick={syncToNotion}
            disabled={!isDone || isSyncing || tasks.length === 0}
            className="text-sm font-bold text-zinc-600 hover:text-black hover:bg-zinc-100 px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            {isSyncing ? (
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                <Sparkles size={16} />
              </motion.div>
            ) : (
              <Calendar size={16} />
            )}
            同步至 Notion
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto mt-8 px-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Brain Dump */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-1 flex flex-col">
            <div className="px-4 py-3 border-b border-zinc-100 flex items-center justify-between text-zinc-500 font-medium">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-amber-500" />
                <span>Brain Dump 靈感傾印</span>
              </div>
              <button 
                onClick={toggleRecording}
                className={`p-1.5 rounded-full transition-all ${isRecording ? 'bg-red-100 text-red-500 animate-pulse' : 'hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700'}`}
                title={isRecording ? "停止錄音" : "開始語音輸入"}
              >
                {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
              </button>
            </div>
            <textarea 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="把你的煩惱、開會紀錄、或者長篇大論貼在這裡，也可以按右上角的麥克風用語音輸入..."
              className="w-full h-[300px] p-4 resize-none outline-none text-zinc-700 leading-relaxed bg-transparent"
            />
            
            <div className="p-3 bg-zinc-50 rounded-b-xl border-t border-zinc-100">
              <div className="mb-4 px-2">
                <p className="text-xs font-bold text-zinc-400 mb-2 uppercase tracking-wider">選擇拆解模式</p>
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 cursor-pointer p-2 rounded-lg hover:bg-zinc-100 transition-colors border border-transparent has-[:checked]:border-black has-[:checked]:bg-white">
                    <input type="radio" name="mode" value="auto" checked={breakdownMode === 'auto'} onChange={(e) => setBreakdownMode(e.target.value)} className="accent-black" />
                    🤖 AI 智能拆解 <span className="text-zinc-400 text-xs font-normal">(自動規劃執行步驟)</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 cursor-pointer p-2 rounded-lg hover:bg-zinc-100 transition-colors border border-transparent has-[:checked]:border-black has-[:checked]:bg-white">
                    <input type="radio" name="mode" value="none" checked={breakdownMode === 'none'} onChange={(e) => setBreakdownMode(e.target.value)} className="accent-black" />
                    🛑 僅列出待辦 <span className="text-zinc-400 text-xs font-normal">(不進行任何切割)</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 cursor-pointer p-2 rounded-lg hover:bg-zinc-100 transition-colors border border-transparent has-[:checked]:border-black has-[:checked]:bg-white">
                    <input type="radio" name="mode" value="ask" checked={breakdownMode === 'ask'} onChange={(e) => setBreakdownMode(e.target.value)} className="accent-black" />
                    💬 互動式釐清 <span className="text-zinc-400 text-xs font-normal">(AI 提問幫你把任務具體化)</span>
                  </label>
                </div>
              </div>
              <button 
                onClick={handleProcess}
                disabled={isProcessing || !inputText}
                className="w-full bg-black text-white rounded-xl py-3.5 font-bold text-[15px] flex justify-center items-center gap-2 hover:bg-zinc-800 transition-all disabled:opacity-50 active:scale-[0.98]"
              >
                {isProcessing ? (
                  <motion.div 
                    animate={{ rotate: 360 }} 
                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                  >
                    <Sparkles size={18} />
                  </motion.div>
                ) : (
                  <>開始魔法解析 <ChevronRight size={18} /></>
                )}
              </button>
            </div>
          </div>
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
            )}

            {isDone && !isProcessing && clarificationQuestions.length === 0 && (
              <motion.div 
                key="result"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden"
              >
                {/* Tabs */}
                <div className="flex border-b border-zinc-200 bg-zinc-50/50 p-2 gap-2">
                  <button 
                    onClick={() => setActiveTab('todo')}
                    className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${activeTab === 'todo' ? 'bg-white shadow-sm text-black' : 'text-zinc-500 hover:bg-zinc-100'}`}
                  >
                    <ListTodo size={16} /> 執行碎片
                  </button>
                  <button 
                    onClick={() => setActiveTab('summary')}
                    className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${activeTab === 'summary' ? 'bg-white shadow-sm text-black' : 'text-zinc-500 hover:bg-zinc-100'}`}
                  >
                    <Lightbulb size={16} /> 30秒重點
                  </button>
                  <button 
                    onClick={() => setActiveTab('mindmap')}
                    className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${activeTab === 'mindmap' ? 'bg-white shadow-sm text-black' : 'text-zinc-500 hover:bg-zinc-100'}`}
                  >
                    <Network size={16} /> 視覺心智圖
                  </button>
                </div>

                <div className="p-6">
                  {/* To-Do Tab */}
                  {activeTab === 'todo' && (
                    <div className="space-y-6">
                      {tasks.map(task => {
                        const total = task.subtasks.length;
                        const completed = task.subtasks.filter((s: any) => s.completed).length;
                        const progress = total === 0 ? 0 : Math.round((completed / total) * 100);
                        const isAllDone = total > 0 && progress === 100;

                        return (
                          <motion.div 
                            key={task.id} 
                            layout
                            className={`bg-white border rounded-xl overflow-hidden transition-all duration-500 ${isAllDone ? 'border-green-200 bg-green-50/30' : 'border-zinc-200'}`}
                          >
                            <div className="p-4 border-b border-zinc-100 flex flex-wrap gap-y-3 justify-between items-start bg-zinc-50/50">
                              <div>
                                <h3 className={`font-bold text-lg flex items-center gap-2 transition-all duration-300 ${isAllDone ? 'text-green-700 line-through opacity-70' : 'text-zinc-900'}`}>
                                  {isAllDone && <CheckCircle2 size={20} className="text-green-500" />}
                                  {task.title}
                                </h3>
                                <div className="flex items-center gap-3 mt-2">
                                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold ${
                                    isAllDone ? 'bg-zinc-100 text-zinc-400' :
                                    task.daysLeft <= 2 ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                                  }`}>
                                    <Clock size={12} strokeWidth={3} />
                                    {task.daysLeft < 0 ? `⚠️ 已逾期 ${Math.abs(task.daysLeft)} 天` :
                                     task.daysLeft === 0 ? `🔥 今天到期` :
                                     task.isUrgent ? `🔥 倒數 ${task.daysLeft} 天死線` : 
                                     `⏳ 倒數 ${task.daysLeft} 天`}
                                  </span>
                                  <input 
                                    type="date"
                                    value={task.deadline}
                                    onChange={(e) => {
                                      const newDate = e.target.value;
                                      
                                      // 使用相同格式 (YYYY-MM-DD) 的字串來計算差距，避免跨時區問題
                                      const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei' }).format(new Date());
                                      const tDate = new Date(newDate + 'T00:00:00');
                                      const nDate = new Date(todayStr + 'T00:00:00');
                                      
                                      const timeDiff = tDate.getTime() - nDate.getTime();
                                      const daysLeft = Math.round(timeDiff / (1000 * 3600 * 24));
                                      
                                      setTasks(prev => prev.map(t => 
                                        t.id === task.id ? { 
                                          ...t, 
                                          deadline: newDate,
                                          daysLeft: daysLeft,
                                          isUrgent: daysLeft <= 2 && daysLeft >= 0
                                        } : t
                                      ));
                                    }}
                                    className="text-xs text-zinc-500 font-medium bg-transparent border border-zinc-200 rounded px-2 py-1 outline-none focus:border-black cursor-pointer hover:bg-white transition-colors"
                                  />
                                </div>
                              </div>
                              
                              <div className="w-full sm:w-32 flex flex-col gap-1.5">
                                <div className="flex justify-between text-xs font-bold text-zinc-400">
                                  <span>進度</span>
                                  <span className={isAllDone ? 'text-green-600' : 'text-black'}>{progress}%</span>
                                </div>
                                <div className="h-2.5 bg-zinc-100 rounded-full overflow-hidden">
                                  <motion.div 
                                    className={`h-full rounded-full ${isAllDone ? 'bg-green-500' : 'bg-black'}`}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progress}%` }}
                                    transition={{ duration: 0.5, ease: "easeOut" }}
                                  />
                                </div>
                              </div>
                            </div>

                            <div className="p-2 space-y-1">
                              {task.subtasks.map((sub: any) => (
                                <motion.label 
                                  layout
                                  key={sub.id}
                                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors hover:bg-zinc-50 ${sub.completed ? 'opacity-50' : ''}`}
                                >
                                  <div className="relative flex items-center justify-center">
                                    <input 
                                      type="checkbox" 
                                      checked={sub.completed}
                                      onChange={() => toggleSubtask(task.id, sub.id)}
                                      className="peer w-5 h-5 appearance-none border-2 border-zinc-300 rounded-md checked:border-black checked:bg-black transition-all cursor-pointer"
                                    />
                                    <CheckCircle2 size={14} className="absolute text-white opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" strokeWidth={3} />
                                  </div>
                                  <span className={`text-[15px] font-medium transition-all duration-300 ${sub.completed ? 'line-through text-zinc-400' : 'text-zinc-700'}`}>
                                    {sub.title}
                                  </span>
                                </motion.label>
                              ))}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}

                  {/* Summary Tab */}
                  {activeTab === 'summary' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                      <h3 className="font-bold text-lg text-zinc-900 border-b border-zinc-100 pb-2 mb-4">✨ AI 重點提煉</h3>
                      <ul className="space-y-3">
                        {summary.map((text, i) => (
                          <li key={i} className="flex items-start gap-3">
                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold mt-0.5">{i+1}</span>
                            <span className="text-zinc-700 leading-relaxed">{text}</span>
                          </li>
                        ))}
                      </ul>
                    </motion.div>
                  )}

                  {/* Mindmap Tab */}
                  {activeTab === 'mindmap' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                      <h3 className="font-bold text-lg text-zinc-900 border-b border-zinc-100 pb-2 mb-4">🧠 視覺心智圖</h3>
                      <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 min-h-[300px] flex items-center justify-center">
                        {mindmap ? (
                          <Mermaid chart={mindmap} />
                        ) : (
                          <p className="text-zinc-400">沒有生成心智圖資料。</p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}