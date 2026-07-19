# Task Shredder — AI 任務斷捨離助手

**Live Demo: [task-shredder-weiwei.vercel.app](https://task-shredder-weiwei.vercel.app)**

> **EN Summary**: Task Shredder turns a chaotic brain dump into an actionable task plan. Paste messy notes (or speak them), and Gemini AI extracts, categorizes, and breaks goals into concrete subtasks — or asks clarifying questions first when your plan is too vague. Local-first (no account needed), with one-click export to Google Tasks, Google Calendar, Notion, or `.ics`. Built with Next.js 16, React 19, TypeScript, and the Gemini API; deployed on Vercel with tests and CI.

---

## 解決什麼問題

大腦裡的待辦事項從來不是整齊的清單——它是一團混雜著焦慮、模糊目標和瑣事的思緒。傳統 to-do app 要求你先「整理好」才能輸入，但**整理的認知負擔正是拖延的根源**。Task Shredder 反過來做：你只管倒垃圾，AI 負責分類、拆解、排順序。

## 功能一覽

**倒進去就好**
- 文字自由傾倒：開會紀錄、抱怨、模糊願望，原樣貼上即可
- 語音輸入：用講的也可以（Web Speech API，支援中文）

**AI 幫你想清楚**
- 三種拆解模式：
  - `Auto 無情切碎` — 大目標直接拆成「今天就能做」的子任務
  - `Ask 先問清楚` — 目標太模糊時，AI 扮演教練提出 2-3 個犀利的釐清問題（附選擇題選項，點擊即答）
  - `None 只整理不拆` — 忠實提取待辦，不擅自展開
- 每次分析同時產出重點摘要與 Mermaid 心智圖

**留住成果，接回你的工作流**
- 任務板：子任務勾選、完成率追蹤、行內編輯/刪除/新增
- 便條紙面板：快速記下零散小事
- 歷史紀錄：自動保存最近 50 次 brain dump；同一任務出現 3 次以上會提示「這也許該變成習慣」
- 一鍵同步：Google Tasks + Google Calendar、Notion 資料庫，或下載 `.ics` 匯入任何行事曆

## 產品決策（為什麼是這樣設計）

- **為什麼有 Ask 模式**：模糊輸入直接拆解只會產出「看起來很忙的廢物任務」。與其讓 AI 瞎猜，不如讓它先當教練問對問題——用戶的回答會併入原始輸入重新拆解，產出的子任務品質完全不同。
- **為什麼 local-first**：所有任務、歷史、設定都存在瀏覽器 localStorage，無需註冊、零後端資料庫。第一次造訪就能用，也沒有「我的待辦被存在誰家伺服器」的隱私疑慮。跨分頁同步用 BroadcastChannel / storage event 處理。
- **為什麼選 Gemini 2.5 Flash Lite**：這是即時互動工具，用戶等不了 10 秒。Flash Lite 在結構化 JSON 輸出品質足夠的前提下，把延遲和成本壓到最低——對一個無營利的公開 demo 來說，成本直接決定它能不能一直開著。
- **為什麼不自己建任務生態**：拆解完的任務最終要活在用戶已有的工具裡。所以做的是匯出（Google Tasks / Calendar / Notion / .ics），而不是再造一個要他們每天回來打開的 app。
- **上線後才學到的**：公開部署後補上了每 IP 每分鐘 10 次 rate limit、15 秒逾時、輸入長度上限、prompt injection 防護（`<user_input>` 標籤隔離 + system prompt 最高指令）、Mermaid SVG 消毒（`securityLevel: 'antiscript'`），以及全站安全標頭（CSP、X-Frame-Options 等）。

## 技術棧

| 層 | 技術 |
|----|------|
| 框架 | Next.js 16 (App Router) + React 19 + TypeScript |
| AI | Google Gemini 2.5 Flash Lite（`@google/genai`，強制 JSON 輸出）|
| 樣式 / 動畫 | Tailwind CSS 4, Framer Motion, Sonner |
| 視覺化 | Mermaid.js 心智圖 |
| 整合 | Google Tasks/Calendar API（OAuth）、Notion API、`ics` |
| 儲存 | 瀏覽器 localStorage（local-first，無後端 DB）|
| 測試 / CI | Vitest + Testing Library，GitHub Actions |
| 部署 | Vercel（含 Vercel Analytics）|

## 架構

```
瀏覽器（React，localStorage 持久化）
   │  POST /api/analyze { text, mode }
   ▼
Next.js API Route ── rate limit / 驗證 / 15s timeout
   │  system prompt（依 mode 切換）+ <user_input> 隔離
   ▼
Gemini 2.5 Flash Lite ── 強制 application/json
   │  { tasks, summary, mindmap, clarificationQuestions }
   ▼
前端渲染：任務板 / 心智圖 / 釐清問卷
   └─（可選）POST /api/google → Google Tasks + Calendar
             POST /api/notion → Notion 資料庫
             或直接下載 .ics
```

API key 只存在 server-side route，前端永不接觸。

## 本地運行

```bash
git clone https://github.com/weiwei0607/task-shredder.git
cd task-shredder
npm install

cp .env.example .env
# 必填：GEMINI_API_KEY（https://aistudio.google.com/app/apikey）
# 選填：NOTION_TOKEN / NOTION_MOUSE_DB_ID（Notion 同步）
# 選填：NEXT_PUBLIC_GOOGLE_CLIENT_ID（Google Tasks/Calendar 同步）

npm run dev   # http://localhost:3000
```

## 測試與 CI

```bash
npx vitest run     # 單元測試（API route、utils）
npm run lint       # ESLint
npm run build      # production build
```

GitHub Actions（`.github/workflows/ci.yml`）在每次 push / PR 執行：lint → type check (`tsc --noEmit`) → vitest → build，全綠才合併。

## 誠實聲明

這是個人 side project，為解決自己（和家人）的拖延問題而建，目前使用者就是身邊的人。沒有成長數據可吹噓——但它是一個真實部署、持續維護、有測試和 CI 的完整產品。

## License

MIT © 2026 WeiWei
