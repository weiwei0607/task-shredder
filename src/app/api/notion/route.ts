import { Client } from '@notionhq/client';
import { NextResponse } from 'next/server';
import type { Task, Subtask } from '@/types';

const notion = new Client({ auth: process.env.NOTION_TOKEN });

export async function POST(req: Request) {
  try {
    const { tasks } = await req.json();
    const databaseId = process.env.NOTION_TODO_DB_ID;

    if (!databaseId) {
      return NextResponse.json({ error: '尚未設定 NOTION_TODO_DB_ID' }, { status: 400 });
    }

    if (!tasks || !Array.isArray(tasks)) {
       return NextResponse.json({ error: '無效的任務資料' }, { status: 400 });
    }

    await Promise.all((tasks as Task[]).map(async (task) => {
      const newPage = await notion.pages.create({
        parent: { database_id: databaseId },
        properties: {
          Name: { title: [{ text: { content: task.title } }] },
          Deadline: { date: { start: task.deadline } },
        },
      });

      if (task.subtasks?.length > 0) {
        await notion.blocks.children.append({
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
        });
      }
    }));

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Notion API Error:', error);
    const msg = error instanceof Error ? error.message : 'Notion 同步失敗';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
