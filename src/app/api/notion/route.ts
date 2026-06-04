import { Client } from '@notionhq/client';
import { NextResponse } from 'next/server';
import type { Task, Subtask } from '@/types';

const notion = new Client({ auth: process.env.NOTION_TOKEN });

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
        console.warn(`[Notion Retry] ${operationName} attempt ${attempt} failed, retrying in ${delay}ms...`, errMsg);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

export async function POST(req: Request) {
  try {
    const { tasks } = await req.json();
    const databaseId = process.env.NOTION_MOUSE_DB_ID;

    if (!databaseId) {
      return NextResponse.json({ error: '尚未設定 NOTION_TODO_DB_ID' }, { status: 400 });
    }

    if (!tasks || !Array.isArray(tasks)) {
       return NextResponse.json({ error: '無效的任務資料' }, { status: 400 });
    }

    await Promise.all((tasks as Task[]).map(async (task) => {
      const newPage = await withRetry(
        () => notion.pages.create({
          parent: { database_id: databaseId },
          properties: {
            Name: { title: [{ text: { content: task.title } }] },
            Deadline: { date: { start: task.deadline } },
          },
        }),
        `create page for "${task.title}"`
      );

      if (task.subtasks?.length > 0) {
        await withRetry(
          () => notion.blocks.children.append({
            block_id: newPage.id,
            children: task.subtasks.map((sub: Subtask) => ({
              object: 'block',
              type: 'to_do',
              to_do: {
                rich_text: [{ type: 'text', text: { content: sub.title } }],
                checked: sub.completed,
              },
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
            })) as any,
          }),
          `append subtasks for "${task.title}"`
        );
      }
    }));

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Notion API Error:', error);
    const msg = error instanceof Error ? error.message : 'Notion 同步失敗';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
