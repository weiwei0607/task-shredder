'use client';

import React, { useState } from 'react';
import { Target, CalendarClock, Calendar, Sparkles, Trash2, AlertTriangle, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
  hasGoogle?: boolean;
}

function GoogleSyncButton({
  tasks,
  isDone,
  isSyncingGoogle,
  setIsSyncingGoogle,
}: {
  tasks: Task[];
  isDone: boolean;
  isSyncingGoogle: boolean;
  setIsSyncingGoogle: (val: boolean) => void;
}) {
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [pendingToken, setPendingToken] = useState<string | null>(null);

  const doSync = React.useCallback(async (accessToken: string) => {
    setIsSyncingGoogle(true);
    setGoogleError(null);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    try {
      const res = await fetch('/api/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks, accessToken }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Google 同步失敗');
      setPendingToken(null);
      toast.success('🎉 成功同步至 Google 日曆與 Google Tasks！');
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      const message = err instanceof Error ? err.message : String(err);
      if (err instanceof Error && err.name === 'AbortError') {
        setGoogleError('Google API 請求逾時，請點擊重試。');
      } else {
        setGoogleError(message);
      }
      setPendingToken(accessToken);
      console.error(err);
      toast.error('Google 同步失敗：' + message);
    } finally {
      setIsSyncingGoogle(false);
    }
  }, [tasks, setIsSyncingGoogle]);

  const loginAndSyncToGoogle = useGoogleLogin({
    scope: 'https://www.googleapis.com/auth/tasks https://www.googleapis.com/auth/calendar.events',
    onSuccess: async (tokenResponse) => {
      await doSync(tokenResponse.access_token);
    },
    onError: (error) => {
      console.error('Login Failed', error);
      setGoogleError('Google 登入失敗，請稍後再試。');
      toast.error('Google 登入失敗');
    },
  });

  return (
    <div className="flex items-center gap-2">
      {googleError && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5"
        >
          <AlertTriangle size={14} className="text-red-500 shrink-0" />
          <span className="text-xs text-red-700 font-medium max-w-[200px] truncate" title={googleError}>
            {googleError}
          </span>
          {pendingToken && (
            <button
              onClick={() => doSync(pendingToken)}
              disabled={isSyncingGoogle}
              className="text-xs font-bold text-red-700 hover:bg-red-100 px-2 py-0.5 rounded transition-colors flex items-center gap-1 disabled:opacity-50"
            >
              <RefreshCw size={12} className={isSyncingGoogle ? 'animate-spin' : ''} />
              重試
            </button>
          )}
        </motion.div>
      )}
      <button
        onClick={() => loginAndSyncToGoogle()}
        disabled={!isDone || isSyncingGoogle || tasks.length === 0}
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
    </div>
  );
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
  hasGoogle = false,
}: HeaderProps) {
  const [showConfirm, setShowConfirm] = useState(false);

  const handleResetClick = () => {
    if (!onReset) return;
    setShowConfirm(true);
  };

  const confirmReset = () => {
    setShowConfirm(false);
    onReset?.();
  };

  return (
    <>
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
              onClick={handleResetClick}
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
          {hasGoogle && (
            <GoogleSyncButton
              tasks={tasks}
              isDone={isDone}
              isSyncingGoogle={isSyncingGoogle}
              setIsSyncingGoogle={setIsSyncingGoogle}
            />
          )}
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

      {/* Confirm Reset Dialog */}
      <AnimatePresence>
        {showConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full space-y-4"
            >
              <div className="flex items-center gap-3 text-red-600">
                <AlertTriangle size={28} />
                <h3 className="font-bold text-lg">確定要重新開始？</h3>
              </div>
              <p className="text-zinc-600 text-sm leading-relaxed">
                這會清除目前所有的任務、便條紙與心智圖。歷史紀錄會保留，但當前進度將無法復原。
              </p>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 py-2.5 rounded-xl font-bold text-sm text-zinc-700 bg-zinc-100 hover:bg-zinc-200 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={confirmReset}
                  className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white bg-red-500 hover:bg-red-600 transition-colors"
                >
                  確認清除
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
