import { Client } from '@notionhq/client';
import { NextResponse } from 'next/server';

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

    for (const task of tasks) {
      // 建立主任務作為頁面
      const newPage = await notion.pages.create({
        parent: { database_id: databaseId },
        properties: {
          Name: {
            title: [
              {
                text: { content: task.title }
              }
            ]
          },
          Deadline: {
            date: { start: task.deadline }
          }
        }
      });
      
      // 將子任務加為頁面內的待辦事項區塊
      if (task.subtasks && task.subtasks.length > 0) {
        const children = task.subtasks.map((sub: any) => ({
           object: 'block',
           type: 'to_do',
           to_do: {
             rich_text: [{ type: 'text', text: { content: sub.title } }],
             checked: sub.completed
           }
        }));
        
        await notion.blocks.children.append({
           block_id: newPage.id,
           children: children as any
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Notion API Error:', error);
    return NextResponse.json({ error: error.message || 'Notion 同步失敗' }, { status: 500 });
  }
}