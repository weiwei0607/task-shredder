import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const getSystemPrompt = (mode: string) => {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei' }).format(new Date());
  
  let modeInstruction = "";
  let jsonFormat = "";

  if (mode === "none") {
    modeInstruction = "請【絕對不要】進行任何子任務拆解。僅忠實提取使用者提到的待辦事項。";
    jsonFormat = `
{
  "tasks": [
    {
      "id": "task_1",
      "title": "大任務標題 (字數少於 15 字)",
      "deadline": "YYYY-MM-DD", (預設今天)
      "daysLeft": 數字,
      "isUrgent": 布林值,
      "subtasks": []
    }
  ],
  "summary": ["重點總結1", "重點總結2"],
  "mindmap": "mindmap\\n  root((核心目標))"
}`;
  } else if (mode === "ask") {
    modeInstruction = "請不要急著拆解任務。使用者的計畫太過模糊。請扮演教練，針對使用者的計畫提出 2 到 3 個犀利、關鍵的【釐清問題】。每個問題請提供 2-3 個「建議選項(選擇題)」，讓使用者能快速點擊回答，並保留開放式的填答空間。";
    jsonFormat = `
{
  "clarificationQuestions": [
    {
      "question": "第一個犀利的問題，例如：你這份報告的具體受眾是誰？",
      "options": ["指導教授", "實驗室同學", "還不確定，需要討論"]
    },
    {
      "question": "這週末前你具體能擠出幾個小時處理這件事？",
      "options": ["1-2 小時", "半天", "幾乎沒空"]
    }
  ]
}`;
  } else {
    // 預設的 auto 模式
    modeInstruction = "你的任務是「無情地將巨大任務切碎」，讓任務看起來極度好執行。子任務的拆解必須「符合真實人類的執行邏輯」，要具體且有實質進展。例如「規劃旅行」應該是「列出餐廳清單」、「確認公休日與訂位」等能真正推進任務的合理步驟。每個步驟字數適中（10-25字），讓人一眼看懂。";
    jsonFormat = `
{
  "tasks": [
    {
      "id": "task_1",
      "title": "大任務標題 (字數少於 15 字)",
      "deadline": "YYYY-MM-DD", (預設今天)
      "daysLeft": 數字,
      "isUrgent": 布林值,
      "subtasks": [
        { "id": "sub_1", "title": "(今天) 第 1 步：具體、有實質進展的小動作", "completed": false }
      ]
    }
  ],
  "summary": ["重點總結1", "重點總結2"],
  "mindmap": "mindmap\\n  root((核心目標))\\n    分支1\\n      子分支"
}`;
  }
  
  return `
你是一位「拖延症終結教練」。使用者的輸入會是一段混亂的文字（可能是開會紀錄、待辦事項、抱怨等）。
今天是 ${today}。
${modeInstruction}

請將使用者的文字解析並輸出為以下格式的 JSON：
${jsonFormat}

要求：
1. 不要輸出 markdown 的 \`\`\`json 標籤，純粹輸出 JSON 格式字串。
2. summary 陣列必須包含 2-4 個句子（即使在 ask 模式不需要，也可輸出空陣列 []）。
3. mindmap 必須是有效的 Mermaid.js 心智圖語法 (mindmap v1.1.0 語法，首行必須是 mindmap，並且使用縮排表示層級，不可使用額外的 markdown 程式碼區塊標記)。
`;
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { text, mode = "auto" } = body;

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-lite',
      contents: text,
      config: {
        systemInstruction: getSystemPrompt(mode),
        responseMimeType: "application/json",
      }
    });

    const resultText = response.text || '{}';
    let data;
    try {
        data = JSON.parse(resultText);
    } catch(e) {
        console.error("JSON Parse Error:", resultText);
        throw new Error("AI did not return valid JSON");
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}