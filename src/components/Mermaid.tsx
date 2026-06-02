'use client';

import React, { useEffect, useRef, useId } from 'react';
import mermaid from 'mermaid';

interface MermaidProps {
  chart: string;
}

// Lightweight SVG sanitizer: strips event handlers and dangerous URLs
function sanitizeSvg(svg: string): string {
  return svg
    .replace(/\s+on\w+=["'][^"']*["']/gi, '')
    .replace(/\s+on\w+=[^\s>]+/gi, '')
    .replace(/href=["']\s*javascript:/gi, 'href="blocked:')
    .replace(/xlink:href=["']\s*javascript:/gi, 'xlink:href="blocked:');
}

let isMermaidInitialized = false;

export default function Mermaid({ chart }: MermaidProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const uniqueId = useId().replace(/:/g, '');

  useEffect(() => {
    if (!isMermaidInitialized) {
      mermaid.initialize({
        startOnLoad: false,
        theme: 'default',
        securityLevel: 'antiscript',
        fontFamily: 'inherit',
      });
      isMermaidInitialized = true;
    }
  }, []);

  useEffect(() => {
    if (!chart || !containerRef.current) return;

    let cancelled = false;

    const renderChart = async () => {
      try {
        const id = `mermaid-${uniqueId}-${Math.random().toString(36).substring(2, 9)}`;
        const { svg } = await mermaid.render(id, chart);
        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = sanitizeSvg(svg);
        }
      } catch (error) {
        console.error('Mermaid Rendering Error:', error);
        if (!cancelled && containerRef.current) {
          const pre = document.createElement('pre');
          pre.className = 'text-xs text-slate-600 p-4 border border-amber-200 rounded-lg bg-amber-50 overflow-x-auto w-full text-left whitespace-pre-wrap';
          pre.textContent = chart;
          const label = document.createElement('p');
          label.className = 'text-amber-700 text-sm mb-2 font-medium';
          label.textContent = '心智圖渲染失敗，顯示原始內容：';
          const wrapper = document.createElement('div');
          wrapper.appendChild(label);
          wrapper.appendChild(pre);
          containerRef.current.innerHTML = '';
          containerRef.current.appendChild(wrapper);
        }
      }
    };

    renderChart();

    return () => {
      cancelled = true;
    };
  }, [chart, uniqueId]);

  return <div ref={containerRef} className="w-full overflow-x-auto flex justify-center py-8" />;
}
