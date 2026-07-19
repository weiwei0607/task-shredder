import { Client } from '@notionhq/client';
import { NextResponse } from 'next/server';
import { createRateLimiter, getClientIP } from '@/lib/rateLimit';
import type { Task, Subtask } from '@/types';

const notion = new Client({ auth: process.env.NOTION_TOKEN });

// Rate limit: 20 Notion sync requests per IP per minute
const rateLimit = createRateLimiter({ windowMs: 60_000, maxRequests: 20 });

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

async function withRetry<T>(
  operation: () => Promise<T>,
  operationName: string,
  retries = MAX_RETRIES
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await operation();
    } catch (error: unknown) {
      lastError = error;
      const isLast = attempt === retries;
      const errMsg = error instanceof Error ? error.message : String(error);
      // Don't retry on auth or validation errors
      if (
        errMsg.includes('unauthorized') ||
        errMsg.includes('validation_error') ||
        errMsg.includes('Incorrect request body') ||
        errMsg.includes('Not found')
      ) {
        throw error;
      }
      if (!isLast) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
        console.warn(
          `[Notion Retry] ${operationName} attempt ${attempt} failed, retrying in ${delay}ms...`,
          errMsg
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
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
        { error: 'Too many sync requests. Please try again later.' },
        { status: 429 }
      );
    }

    // Optional shared secret for personal deployments.
    // Set NOTION_ROUTE_SECRET in .env.local to require a matching token from the client.
    const routeSecret = process.env.NOTION_ROUTE_SECRET;
    if (routeSecret) {
      const authHeader = req.headers.get('authorization') || '';
      const provided = authHeader.replace(/^Bearer\s+/i, '').trim();
      if (provided !== routeSecret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const { tasks } = await req.json();
    const databaseId = process.env.NOTION_MOUSE_DB_ID;

    if (!databaseId) {
      return NextResponse.json(
        { error: '尚未設定 NOTION_TODO_DB_ID' },
        { status: 400 }
      );
    }

    if (!tasks || !Array.isArray(tasks)) {
      return NextResponse.json(
        { error: '無效的任務資料' },
        { status: 400 }
      );
    }

    // Hard cap to prevent abuse
    if (tasks.length > 100) {
      return NextResponse.json(
        { error: 'Too many tasks (max 100 per sync)' },
        { status: 400 }
      );
    }

    await Promise.all(
      (tasks as Task[]).map(async (task) => {
        const title = sanitizeString(task.title, 500);
        const deadline = sanitizeString(task.deadline, 20);
        const safeSubtasks = Array.isArray(task.subtasks)
          ? task.subtasks.slice(0, 50).map((sub: Subtask) => ({
              ...sub,
              title: sanitizeString(sub.title, 500),
            }))
          : [];

        const newPage = await withRetry(
          () =>
            notion.pages.create({
              parent: { database_id: databaseId },
              properties: {
                Name: { title: [{ text: { content: title || '未命名任務' } }] },
                Deadline: { date: { start: deadline || new Date().toISOString().slice(0, 10) } },
              },
            }),
          `create page for "${title}"`
        );

        if (safeSubtasks.length > 0) {
          await withRetry(
            () =>
              notion.blocks.children.append({
                block_id: newPage.id,
                children: safeSubtasks.map((sub: Subtask) => ({
                  object: 'block',
                  type: 'to_do',
                  to_do: {
                    rich_text: [
                      {
                        type: 'text',
                        text: { content: sub.title || '未命名子任務' },
                      },
                    ],
                    checked: sub.completed,
                  },
                })),
              }),
            `append subtasks for "${title}"`
          );
        }
      })
    );

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Notion API Error:', error);
    const msg = error instanceof Error ? error.message : 'Notion 同步失敗';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
