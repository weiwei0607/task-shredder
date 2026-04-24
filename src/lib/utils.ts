import { differenceInCalendarDays, parseISO, format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import type { Task, Subtask, StickyNote } from '@/types';

const TIMEZONE = 'Asia/Taipei';

export function getTaipeiToday(): string {
  return format(toZonedTime(new Date(), TIMEZONE), 'yyyy-MM-dd');
}

export function calculateDaysLeft(deadline: string): number {
  const today = getTaipeiToday();
  return differenceInCalendarDays(parseISO(deadline), parseISO(today));
}

export function generateId(prefix: 't' | 's' | 'n'): string {
  return `${prefix}_${Math.random().toString(36).substring(2, 11)}`;
}

export function createStickyNote(text: string, deadline?: string): StickyNote {
  const dl = deadline || getTaipeiToday();
  const daysLeft = calculateDaysLeft(dl);
  return {
    id: generateId('n'),
    text: text.trim(),
    deadline: dl,
    daysLeft,
    isUrgent: daysLeft <= 2 && daysLeft >= 0,
    createdAt: Date.now(),
  };
}

export function updateStickyNoteDeadline(notes: StickyNote[], noteId: string, newDate: string): StickyNote[] {
  const daysLeft = calculateDaysLeft(newDate);
  return notes.map((note) =>
    note.id === noteId
      ? { ...note, deadline: newDate, daysLeft, isUrgent: daysLeft <= 2 && daysLeft >= 0 }
      : note
  );
}

export function formatTasks(rawTasks: any[]): Task[] {
  return rawTasks.map((task) => {
    const deadline = task.deadline || getTaipeiToday();
    const daysLeft = typeof task.daysLeft === 'number' ? task.daysLeft : calculateDaysLeft(deadline);
    return {
      id: task.id || generateId('t'),
      title: task.title || '未命名任務',
      deadline,
      daysLeft,
      isUrgent: task.isUrgent ?? (daysLeft <= 2 && daysLeft >= 0),
      subtasks: (task.subtasks || []).map((sub: any) => ({
        id: sub.id || generateId('s'),
        title: sub.title || '未命名子任務',
        completed: sub.completed ?? false,
      })),
    };
  });
}

export function toggleSubtaskInTasks(tasks: Task[], taskId: string, subtaskId: string): Task[] {
  return tasks.map((task) => {
    if (task.id !== taskId) return task;
    return {
      ...task,
      subtasks: task.subtasks.map((sub) =>
        sub.id === subtaskId ? { ...sub, completed: !sub.completed } : sub
      ),
    };
  });
}

export function updateTaskDeadline(tasks: Task[], taskId: string, newDate: string): Task[] {
  const daysLeft = calculateDaysLeft(newDate);
  return tasks.map((task) =>
    task.id === taskId
      ? { ...task, deadline: newDate, daysLeft, isUrgent: daysLeft <= 2 && daysLeft >= 0 }
      : task
  );
}
