'use client';

import React, { useState } from 'react';
import { Target, CalendarClock, Calendar, Trash2, AlertTriangle, RefreshCw, Loader2 } from 'lucide-react';
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

const secondaryButtonClass =
  'inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 shadow-sm transition-colors hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-40';

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
      toast.success('成功同步至 Google 日曆與 Google Tasks！');
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
          className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5"
        >
          <AlertTriangle size={14} className="shrink-0 text-red-500" />
          <span className="max-w-[200px] truncate text-xs font-medium text-red-700" title={googleError}>
            {googleError}
          </span>
          {pendingToken && (
            <button
              onClick={() => doSync(pendingToken)}
              disabled={isSyncingGoogle}
              className="flex items-center gap-1 rounded px-2 py-0.5 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50"
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
        className={secondaryButtonClass}
        title="同步至 Google 日曆與 Google Tasks"
      >
        {isSyncingGoogle ? (
          <Loader2 size={15} className="animate-spin" />
        ) : (
          <Calendar size={15} />
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
      <header className="sticky top-0 z-10 border-b border-zinc-200/80 bg-white/85 px-6 py-3.5 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-950 text-white shadow-sm">
              <Target size={18} strokeWidth={2.5} />
            </div>
            <div className="leading-tight">
              <h1 className="text-[17px] font-bold tracking-tight text-zinc-900">任務碎紙機</h1>
              <p className="text-[11px] font-medium uppercase tracking-widest text-zinc-400">Task Shredder</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {isDone && tasksLength > 0 && onReset && (
              <button
                onClick={handleResetClick}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                title="清除所有資料，重新開始"
              >
                <Trash2 size={15} />
                重新開始
              </button>
            )}
            <button
              onClick={exportCalendar}
              disabled={!isDone || tasksLength === 0}
              className={secondaryButtonClass}
              title="匯出 iCal 檔案，可加入 Apple 或 Google 行事曆"
            >
              <CalendarClock size={15} />
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
              className={secondaryButtonClass}
            >
              {isSyncing ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Calendar size={15} />
              )}
              同步至 Notion
            </button>
          </div>
        </div>
      </header>

      {/* Confirm Reset Dialog */}
      <AnimatePresence>
        {showConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 p-4 backdrop-blur-sm"
            onClick={() => setShowConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
                  <AlertTriangle size={20} />
                </div>
                <h3 className="text-lg font-bold text-zinc-900">確定要重新開始？</h3>
              </div>
              <p className="text-sm leading-relaxed text-zinc-600">
                這會清除目前所有的任務、便條紙與心智圖。歷史紀錄會保留，但當前進度將無法復原。
              </p>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 rounded-xl border border-zinc-200 bg-white py-2.5 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
                >
                  取消
                </button>
                <button
                  onClick={confirmReset}
                  className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-700"
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
