import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { tasks, accessToken } = await req.json();

    if (!tasks || !accessToken) {
      return NextResponse.json({ error: 'Missing tasks or accessToken' }, { status: 400 });
    }

    const createdListRes = await fetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title: 'Task Shredder 任務' })
    });
    
    if (!createdListRes.ok) {
        throw new Error('無法建立 Google Task 清單');
    }
    const taskList = await createdListRes.json();

    for (const task of tasks) {
      const [year, month, day] = task.deadline.split('-').map(Number);
      
      const calRes = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          summary: `🔥 [死線] ${task.title}`,
          description: task.subtasks.map((s: any) => `[ ] ${s.title}`).join('\n'),
          start: { date: task.deadline },
          end: { date: task.deadline }
        })
      });
      if (!calRes.ok) throw new Error('無法寫入日曆行程');

      const parentTaskRes = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${taskList.id}/tasks`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: task.title,
          due: new Date(year, month - 1, day, 23, 59, 59).toISOString()
        })
      });
      
      if (!parentTaskRes.ok) throw new Error('無法寫入大任務');
      
      if (task.subtasks && task.subtasks.length > 0) {
        for (const sub of task.subtasks) {
          await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${taskList.id}/tasks`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              title: sub.title,
              notes: `隸屬於大任務: ${task.title}`
            })
          });
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Google API Error:', error);
    return NextResponse.json({ error: error.message || 'Google 同步失敗' }, { status: 500 });
  }
}