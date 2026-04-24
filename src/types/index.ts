export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  deadline: string; // YYYY-MM-DD
  daysLeft: number;
  isUrgent: boolean;
  subtasks: Subtask[];
}

export interface StickyNote {
  id: string;
  text: string;
  deadline: string; // YYYY-MM-DD
  daysLeft: number;
  isUrgent: boolean;
  createdAt: number;
}

export interface ClarificationQuestion {
  question: string;
  options: string[];
}

export type BreakdownMode = 'auto' | 'none' | 'ask';
export type ActiveTab = 'todo' | 'summary' | 'mindmap';

export interface AnalyzeResponse {
  tasks?: Task[];
  summary?: string[];
  mindmap?: string;
  clarificationQuestions?: ClarificationQuestion[];
}
