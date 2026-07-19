import { NextResponse } from 'next/server';
import { createRateLimiter, getClientIP } from '@/lib/rateLimit';
import type { Task, Subtask } from '@/types';

const headers = (accessToken: string) => ({
  Authorization: `Bearer ${accessToken}`,
  'Content-Type': 'application/json',
});

const API_TIMEOUT_MS = 15000;

// Rate limit: 10 Google sync requests per IP per minute
const rateLimit = createRateLimiter({ windowMs: 60_000, maxRequests: 10 });

async function fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Google API 請求逾時 (${API_TIMEOUT_MS / 1000}s)，請稍後再試。`);
    }
    throw error;
  }
}

function sanitizeString(value: unknown, maxLength = 2000): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength);
}

export async function POST(req: Request) {
  try {
    const ip = getClientIP(req);
    if (rateLimit(ip)) {
      return NextResponse.json(
        { error: 'Too many Google sync requests. Please try again later.' },
        { status: 429 }
      );
    }

    const { tasks, accessToken } = await req.json();

    if (!tasks || !accessToken) {
      return NextResponse.json(
        { error: 'Missing tasks or accessToken' },
        { status: 400 }
      );
    }

    if (!Array.isArray(tasks) || tasks.length > 100) {
      return NextResponse.json(
        { error: 'Invalid tasks (max 100 per sync)' },
        { status: 400 }
      );
    }

    const createdListRes = await fetchWithTimeout(
      'https://tasks.googleapis.com/tasks/v1/users/@me/lists',
      {
        method: 'POST',
        headers: headers(accessToken),
        body: JSON.stringify({ title: 'Task Shredder 任務' }),
      }
    );

    if (!createdListRes.ok) {
      const errData = await createdListRes.json().catch(() => ({}));
      throw new Error(errData.error?.message || '無法建立 Google Task 清單');
    }
    const taskList = await createdListRes.json();

    await Promise.all(
      (tasks as Task[]).map(async (task) => {
        const title = sanitizeString(task.title, 500);
        const deadline = sanitizeString(task.deadline, 20) || new Date().toISOString().slice(0, 10);
        const dueRFC3339 = `${deadline}T23:59:59+08:00`;
        const safeSubtasks = Array.isArray(task.subtasks)
          ? task.subtasks.slice(0, 50).map((s: Subtask) => ({
              ...s,
              title: sanitizeString(s.title, 500),
            }))
          : [];

        const [calRes, parentTaskRes] = await Promise.all([
          fetchWithTimeout(
            'https://www.googleapis.com/calendar/v3/calendars/primary/events',
            {
              method: 'POST',
              headers: headers(accessToken),
              body: JSON.stringify({
                summary: `🔥 [死線] ${title}`,
                description:
                  safeSubtasks.map((s: Subtask) => `[ ] ${s.title}`).join('\n') || '',
                start: { date: deadline },
                end: { date: deadline },
              }),
            }
          ),
          fetchWithTimeout(
            `https://tasks.googleapis.com/tasks/v1/lists/${taskList.id}/tasks`,
            {
              method: 'POST',
              headers: headers(accessToken),
              body: JSON.stringify({ title, due: dueRFC3339 }),
            }
          ),
        ]);

        if (!calRes.ok) {
          const errData = await calRes.json().catch(() => ({}));
          throw new Error(errData.error?.message || '無法寫入日曆行程');
        }
        if (!parentTaskRes.ok) {
          const errData = await parentTaskRes.json().catch(() => ({}));
          throw new Error(errData.error?.message || '無法寫入大任務');
        }

        if (safeSubtasks.length > 0) {
          await Promise.all(
            safeSubtasks.map((sub: Subtask) =>
              fetchWithTimeout(
                `https://tasks.googleapis.com/tasks/v1/lists/${taskList.id}/tasks`,
                {
                  method: 'POST',
                  headers: headers(accessToken),
                  body: JSON.stringify({
                    title: sub.title,
                    notes: `隸屬於大任務: ${title}`,
                  }),
                }
              )
            )
          );
        }
      })
    );

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Google API Error:', error);
    const msg = error instanceof Error ? error.message : 'Google 同步失敗';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
