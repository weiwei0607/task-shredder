"use client";

import React, { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

interface MermaidProps {
  chart: string;
}

export default function Mermaid({ chart }: MermaidProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chart || !containerRef.current) return;
    
    try {
      mermaid.initialize({
        startOnLoad: false,
        theme: 'default',
        securityLevel: 'loose',
        fontFamily: 'inherit',
      });
      
      const renderChart = async () => {
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
        try {
          const { svg } = await mermaid.render(id, chart);
          if (containerRef.current) {
            containerRef.current.innerHTML = svg;
          }
        } catch (error) {
          console.error("Mermaid Rendering Error:", error);
          if (containerRef.current) {
            containerRef.current.innerHTML = `<div class="text-red-500 p-4 border border-red-200 rounded-lg bg-red-50">心智圖渲染失敗，可能是 AI 生成的格式有誤。</div>`;
          }
        }
      };

      renderChart();
    } catch (e) {
      console.error(e);
    }
  }, [chart]);

  return <div ref={containerRef} className="w-full overflow-x-auto flex justify-center py-8" />;
}