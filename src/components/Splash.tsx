'use client';

import { useEffect, useState } from 'react';

const COVER_HTML = `
<div class="ts-doc"><div class="t">// 重寫整份企劃＋簡報＋預算表？？</div><div class="l w1"></div><div class="l w2"></div><div class="l w3"></div><div class="l w4"></div></div>
<div class="ts-machine"></div>
<div class="ts-strip s1"><i></i><i></i><i></i></div><div class="ts-strip s2"><i></i><i></i></div><div class="ts-strip s3"><i></i><i></i><i></i></div><div class="ts-strip s4"><i></i><i></i></div><div class="ts-strip s5"><i></i></div>
<div class="ts-done"><div class="h">今天只要做</div><div class="ts-check c1"><b>&#10003;</b>先寫三行大綱</div><div class="ts-check c2"><b>&#10003;</b>找兩張參考圖</div><div class="ts-check c3"><b>&#10003;</b>傳訊息約時間</div></div>
<div class="ts-title"><div class="en">TASK SHREDDER</div><h2>任務<em>碎紙機</em></h2><p>巨大任務進去，可以動手的小事出來</p></div>
<div class="ts-cta">碎一個試試</div>
<div class="wms-hint">點擊任意處進入</div>
`;

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@700;900&family=IBM+Plex+Mono:wght@400;600&family=Noto+Sans+TC:wght@400;500;700;900&display=swap');
.wms-overlay{position:fixed;inset:0;z-index:99999;display:flex;align-items:stretch;justify-content:center;transition:opacity .55s ease;cursor:pointer;font-family:'Noto Sans TC',-apple-system,sans-serif;background:linear-gradient(180deg,#f8f4ea 0%,#f3ecdd 100%);}
.wms-cover{position:relative;width:100%;max-width:430px;height:100dvh;overflow:hidden;box-shadow:0 0 60px rgba(0,0,0,.15);background:linear-gradient(180deg,#f8f4ea 0%,#f3ecdd 100%);}
.wms-hint{position:absolute;left:0;right:0;bottom:16px;text-align:center;font-size:.68rem;letter-spacing:.24em;opacity:.55;z-index:5;pointer-events:none;color:#8f8266;}
.wms-skip{position:fixed;top:calc(env(safe-area-inset-top,0px) + 14px);right:16px;z-index:6;background:rgba(60,50,30,.14);color:#4a4436;border:none;border-radius:999px;padding:6px 15px;font-size:.78rem;font-weight:600;cursor:pointer;}
@media(prefers-reduced-motion:reduce){.wms-overlay *{animation:none !important;}}
.ts-doc{position:absolute;left:50%;top:56px;transform:translateX(-50%) rotate(-2deg);width:246px;background:#fff;border-radius:6px;box-shadow:0 14px 34px rgba(60,50,30,.18);padding:15px 18px 18px;animation:tsFeed 4.5s ease-in-out infinite;}
@keyframes tsFeed{0%,100%{translate:0 0}50%{translate:0 12px}}
.ts-doc .t{font-family:'IBM Plex Mono',monospace;font-weight:600;font-size:.78rem;color:#d0432e;letter-spacing:.06em;margin-bottom:10px;}
.ts-doc .l{height:7px;border-radius:4px;background:#d9d2c2;margin:8px 0;}
.ts-doc .l.w1{width:92%}.ts-doc .l.w2{width:78%}.ts-doc .l.w3{width:86%}.ts-doc .l.w4{width:60%}
.ts-machine{position:absolute;left:34px;right:34px;top:232px;height:60px;background:linear-gradient(180deg,#262b38,#1a1e29);border-radius:20px;box-shadow:0 18px 40px rgba(40,35,22,.35);}
.ts-machine::before{content:'';position:absolute;left:26px;right:26px;top:26px;height:8px;border-radius:6px;background:#0c0e15;box-shadow:0 0 18px 2px rgba(245,166,35,.65);}
.ts-strip{position:absolute;width:26px;height:80px;top:298px;background:#fffdf6;border-radius:3px;box-shadow:0 4px 10px rgba(60,50,30,.18);animation:tsFallS 2.8s cubic-bezier(.4,0,.8,1) infinite;opacity:0;}
.ts-strip i{display:block;height:5px;background:#e3dccb;border-radius:3px;margin:9px 5px 0;}
.ts-strip.s1{left:84px;animation-delay:0s}.ts-strip.s2{left:132px;animation-delay:.5s;height:78px}.ts-strip.s3{left:180px;animation-delay:1.1s}.ts-strip.s4{left:228px;animation-delay:1.7s;height:84px}.ts-strip.s5{left:276px;animation-delay:2.2s;height:70px}
@keyframes tsFallS{0%{translate:0 0;opacity:0}18%{opacity:1}100%{translate:0 118px;opacity:0;rotate:7deg}}
.ts-done{position:absolute;left:44px;right:44px;top:428px;background:#fff;border-radius:16px;padding:13px 16px;box-shadow:0 12px 30px rgba(60,50,30,.14);}
.ts-done .h{font-size:.72rem;font-weight:700;letter-spacing:.2em;color:#b3a487;margin-bottom:10px;}
.ts-check{display:flex;align-items:center;gap:10px;font-size:.84rem;color:#3d382e;font-weight:500;margin:7px 0;opacity:0;animation:tsTick .5s ease-out forwards;}
.ts-check.c1{animation-delay:.8s}.ts-check.c2{animation-delay:1.5s}.ts-check.c3{animation-delay:2.2s}
@keyframes tsTick{from{opacity:0;translate:-8px 0}to{opacity:1;translate:0 0}}
.ts-check b{width:20px;height:20px;border-radius:7px;background:#3f9d6b;color:#fff;display:inline-flex;align-items:center;justify-content:center;font-size:.75rem;flex-shrink:0;}
.ts-title{position:absolute;left:0;right:0;bottom:126px;text-align:center;}
.ts-title .en{font-family:'IBM Plex Mono',monospace;font-size:.65rem;letter-spacing:.4em;color:#b3a487;}
.ts-title h2{font-weight:900;font-size:2.4rem;color:#26221a;letter-spacing:.1em;margin:8px 0 6px;}
.ts-title h2 em{font-style:normal;background:linear-gradient(transparent 62%,#ffd28a 62%);}
.ts-title p{font-size:.83rem;color:#8f8266;}
.ts-cta{position:absolute;left:50%;bottom:56px;transform:translateX(-50%);background:#26221a;color:#ffd28a;font-weight:900;letter-spacing:.22em;font-size:.9rem;padding:13px 42px;border-radius:999px;box-shadow:0 8px 24px rgba(38,34,26,.35);}
`;

export default function Splash() {
  const [show, setShow] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    try {
      if (!sessionStorage.getItem('wms_seen_task-shredder')) setShow(true);
    } catch {
      setShow(true);
    }
  }, []);

  if (gone || !show) return null;

  const dismiss = () => {
    try {
      sessionStorage.setItem('wms_seen_task-shredder', '1');
    } catch {}
    const el = document.getElementById('wms');
    if (el) {
      el.style.opacity = '0';
      el.style.pointerEvents = 'none';
    }
    setTimeout(() => setGone(true), 560);
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div id="wms" className="wms-overlay" onClick={dismiss}>
        <div className="wms-cover" dangerouslySetInnerHTML={{ __html: COVER_HTML }} />
        <button className="wms-skip" type="button">跳過 &rsaquo;</button>
      </div>
    </>
  );
}
