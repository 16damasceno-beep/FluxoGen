
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

  const sanitizeCode = (raw: string) => {
    if (!raw) return '';
    
    return raw
      // Remove markdown blocks
      .replace(/```mermaid/g, '')
      .replace(/```/g, '')
      // Remove non-printable and non-ASCII characters aggressively
      // This targets hallucinations like ﬂ, °, ¶, ß
      .replace(/[^\x20-\x7E\n\r]/g, '')
      // Fix cases where the model might put a colon inside classDef values inappropriately
      // but keep them for hex colors (e.g., fill:#FFF is okay, but color: junk #FFF is not)
      .split('\n')
      .map(line => {
        let l = line.trim();
        if (l.startsWith('classDef')) {
          // Ensure styles don't have illegal characters around colons
          return l.replace(/:\s*[^#a-zA-Z0-9\s,;]/g, ':');
        }
        return l;
      })
      .join('\n')
      .trim();
  };

  useEffect(() => {
    const renderChart = async () => {
      if (!containerRef.current || !code) return;

      try {
        setError(null);
        // Sanitize first
        const cleanCode = sanitizeCode(code);
        
        if (!cleanCode || !cleanCode.startsWith('graph')) {
          console.warn("Código Mermaid não parece começar com 'graph':", cleanCode);
        }

        const renderId = `mermaid-${id.replace(/[^a-zA-Z0-9]/g, '-')}-${Math.random().toString(36).substr(2, 5)}`;
        
        const { svg: renderedSvg } = await mermaid.render(renderId, cleanCode);
        setSvg(renderedSvg);
      } catch (err: any) {
        console.error("Erro ao renderizar Mermaid:", err);
        setError("Erro na estrutura técnica do modelo. Tente descrever o processo novamente de forma mais simples ou peça para remover estilos complexos.");
      }
    };

    renderChart();
  }, [code, id]);

  if (error) {
    return (
      <div className="p-6 bg-red-50 text-red-800 border border-red-200 rounded-2xl">
        <div className="flex items-center gap-2 mb-2">
          <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
          <p className="font-bold">Falha na Modelagem Técnica</p>
        </div>
        <p className="text-sm opacity-90">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-4 text-xs font-bold px-3 py-1 bg-red-100 hover:bg-red-200 rounded-lg transition-colors"
        >
          Reiniciar Interface
        </button>
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
