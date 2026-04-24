'use client';

import React, { useEffect, useRef, useId } from 'react';
import mermaid from 'mermaid';

interface MermaidProps {
  chart: string;
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
        securityLevel: 'loose',
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
          containerRef.current.innerHTML = svg;
        }
      } catch (error) {
        console.error('Mermaid Rendering Error:', error);
        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = `<div class="text-red-500 p-4 border border-red-200 rounded-lg bg-red-50">心智圖渲染失敗，可能是 AI 生成的格式有誤。</div>`;
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
