'use client';

import React from 'react';
import { Target, CalendarClock, Calendar, Sparkles, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useGoogleLogin } from '@react-oauth/google';
import { toast } from 'sonner';
import type { Task } from '@/types';

interface HeaderProps {
  isDone: boolean;
  tasksLength: number;
  isSyncing: boolean;
  syncToNotion: () => void;
  exportCalendar: () => void;
  tasks: Task[];
  setIsSyncingGoogle: (val: boolean) => void;
  isSyncingGoogle: boolean;
  onReset?: () => void;
}

export default function Header({
  isDone,
  tasksLength,
  isSyncing,
  syncToNotion,
  exportCalendar,
  tasks,
  setIsSyncingGoogle,
  isSyncingGoogle,
  onReset,
}: HeaderProps) {
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
            accessToken: tokenResponse.access_token,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        toast.success('🎉 成功同步至 Google 日曆與 Google Tasks！');
      } catch (err: any) {
        console.error(err);
        toast.error('Google 同步失敗：' + err.message);
      } finally {
        setIsSyncingGoogle(false);
      }
    },
    onError: (error) => {
      console.error('Login Failed', error);
      toast.error('Google 登入失敗');
    },
  });

  return (
    <header className="bg-white border-b border-zinc-200 px-6 py-4 flex flex-wrap gap-4 items-center justify-between sticky top-0 z-10">
      <div className="flex items-center gap-2">
        <div className="bg-black text-white p-1.5 rounded-lg">
          <Target size={20} strokeWidth={2.5} />
        </div>
        <h1 className="font-bold text-xl tracking-tight">
          任務碎紙機 <span className="text-zinc-400 font-normal text-sm ml-2">Task Shredder</span>
        </h1>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {isDone && tasksLength > 0 && onReset && (
          <button
            onClick={onReset}
            className="text-sm font-bold text-red-500 hover:text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5"
            title="清除所有資料，重新開始"
          >
            <Trash2 size={16} />
            重新開始
          </button>
        )}
        <button
          onClick={exportCalendar}
          disabled={!isDone || tasksLength === 0}
          className="text-sm font-bold text-zinc-600 hover:text-black hover:bg-zinc-100 px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 disabled:opacity-50"
          title="匯出 iCal 檔案，可加入 Apple 或 Google 行事曆"
        >
          <CalendarClock size={16} />
          匯出行事曆
        </button>
        <button
          onClick={() => loginAndSyncToGoogle()}
          disabled={!isDone || isSyncingGoogle || tasksLength === 0}
          className="text-sm font-bold text-zinc-600 hover:text-black hover:bg-zinc-100 px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 disabled:opacity-50"
          title="同步至 Google 日曆與 Google Tasks"
        >
          {isSyncingGoogle ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
            >
              <Sparkles size={16} />
            </motion.div>
          ) : (
            <Calendar size={16} />
          )}
          同步至 Google
        </button>
        <button
          onClick={syncToNotion}
          disabled={!isDone || isSyncing || tasksLength === 0}
          className="text-sm font-bold text-zinc-600 hover:text-black hover:bg-zinc-100 px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 disabled:opacity-50"
        >
          {isSyncing ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
            >
              <Sparkles size={16} />
            </motion.div>
          ) : (
            <Calendar size={16} />
          )}
          同步至 Notion
        </button>
      </div>
    </header>
  );
}
