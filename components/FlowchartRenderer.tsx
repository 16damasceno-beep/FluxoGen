
import React, { useEffect, useRef, useState } from 'react';

// Declaration to satisfy TypeScript for Mermaid global
declare const mermaid: any;

interface FlowchartRendererProps {
  code: string;
  id: string;
}

const FlowchartRenderer: React.FC<FlowchartRendererProps> = ({ code, id }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof mermaid !== 'undefined') {
      mermaid.initialize({
        startOnLoad: false,
        theme: 'neutral',
        themeVariables: {
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: '13px',
          mainBkg: '#ffffff',
          nodeBorder: '#2b5797',
          clusterBkg: '#f8f9fa',
          clusterBorder: '#ced4da',
          lineColor: '#2b5797',
          edgeLabelBackground: '#ffffff',
          tertiaryColor: '#ffffff'
        },
        securityLevel: 'loose',
        flowchart: {
          curve: 'linear',
          htmlLabels: true,
          useMaxWidth: false,
          padding: 40,
          rankSpacing: 60,
          nodeSpacing: 40,
          defaultRenderer: 'dagre-wrapper'
        }
      });
    }
  }, []);

  const sanitizeCode = (raw: string, stripStyles: boolean = false) => {
    if (!raw) return '';
    
    // 1. Remove markdown junk
    let clean = raw.replace(/```mermaid/g, '').replace(/```/g, '').trim();

    // 2. Strict ASCII Cleanup for technical parts
    // We allow standard Latin-1 supplements (accents) for text inside quotes later
    // but for styles and IDs, we need to be very aggressive.
    
    // Specifically target the corrupted characters reported: ﬂ, °, ¶, ß
    clean = clean.replace(/[^\x20-\x7E\n\r\xA0-\xFF]/g, ' '); 

    // 3. Fix corrupted style attributes (color: junk #hex)
    // This regex looks for color properties and ensures they only contain valid hex/css values
    clean = clean.replace(/(fill|stroke|color):\s*[^#\n;]*#?([a-fA-F0-9]{3,6})/gi, (match, prop, hex) => {
      return `${prop}:#${hex}`;
    });

    // 4. Force valid classDef lines if they look broken
    const lines = clean.split('\n');
    const processedLines: string[] = [];

    lines.forEach(line => {
      let l = line.trim();
      if (!l) return;

      // Detect and repair broken classDef lines
      if (l.toLowerCase().includes('classdef')) {
        if (stripStyles) return;
        
        // If it contains any of the forbidden characters or looks broken, use golden defaults
        if (l.match(/[^\x20-\x7E]/) || !l.includes('#')) {
          if (l.toLowerCase().includes('task')) l = 'classDef task fill:#F4F7F9,stroke:#2B5797,stroke-width:2px,color:#333333;';
          else if (l.toLowerCase().includes('gateway')) l = 'classDef gateway fill:#FFFAE6,stroke:#856404,stroke-width:2px,color:#333333;';
          else if (l.toLowerCase().includes('endevent')) l = 'classDef endEvent fill:#FFFFFF,stroke:#DC3545,stroke-width:2px,color:#333333;';
          else if (l.toLowerCase().includes('event')) l = 'classDef event fill:#FFFFFF,stroke:#28A745,stroke-width:2px,color:#333333;';
        }
      }

      // Final check to remove shorthand notation which often breaks
      l = l.replace(/\s*:::\s*[\w-]+/g, '');

      if (stripStyles && (l.toLowerCase().startsWith('class ') || l.toLowerCase().startsWith('classdef'))) {
        return;
      }

      processedLines.push(l);
    });

    if (!processedLines[0]?.toLowerCase().includes('graph')) {
      processedLines.unshift('graph TD');
    }

    return processedLines.join('\n');
  };

  useEffect(() => {
    const renderChart = async () => {
      if (!containerRef.current || !code) return;

      const renderId = `mermaid-${id.replace(/[^a-zA-Z0-9]/g, '-')}-${Math.random().toString(36).substr(2, 5)}`;

      try {
        setError(null);
        const cleanCode = sanitizeCode(code);
        const { svg: renderedSvg } = await mermaid.render(renderId, cleanCode);
        setSvg(renderedSvg);
      } catch (err: any) {
        console.warn("Render failed, trying fallback...", err);
        try {
          // Fallback removes all styling to ensure structure at least renders
          const fallbackCode = sanitizeCode(code, true);
          const { svg: fallbackSvg } = await mermaid.render(`${renderId}-fallback`, fallbackCode);
          setSvg(fallbackSvg);
        } catch (fallbackErr) {
          setError("Erro crítico de sintaxe. O arquivo anexado pode conter termos que confundiram a geração do código. Tente descrever o processo em texto.");
        }
      }
    };

    renderChart();
  }, [code, id]);

  if (error) {
    return (
      <div className="p-8 bg-red-50 text-red-900 border border-red-200 rounded-3xl">
        <div className="flex items-center gap-3 mb-3">
          <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
          <p className="font-bold">Erro de Renderização</p>
        </div>
        <p className="text-sm opacity-80">{error}</p>
        <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-bold">Tentar Novamente</button>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="mermaid-container flex justify-center p-4 bg-white rounded-lg overflow-auto min-h-[400px]"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
};

export default FlowchartRenderer;
