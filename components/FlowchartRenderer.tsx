
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
    
    // 1. Remover blocos de markdown e espaços inúteis
    let clean = raw.replace(/```mermaid/g, '').replace(/```/g, '').trim();

    // 2. Deep Clean: Remover caracteres alucinados específicos relatados nos erros
    // fl (corrompido), °, ¶, ß, e outros não-ASCII problemáticos em IDs e estilos
    clean = clean.replace(/[ﬂ°¶ß]/g, ''); 
    
    // 3. Normalizar cores hexadecimais (limpar lixo antes do #)
    clean = clean.replace(/color:\s*[^#\n;]*#([a-fA-F0-9]{3,6})/g, 'color:#$1');
    clean = clean.replace(/fill:\s*[^#\n;]*#([a-fA-F0-9]{3,6})/g, 'fill:#$1');
    clean = clean.replace(/stroke:\s*[^#\n;]*#([a-fA-F0-9]{3,6})/g, 'stroke:#$1');

    // 4. Remover shorthand problemático (:::) se ainda existir
    clean = clean.replace(/\s*:::\s*[\w-]+/g, '');

    const lines = clean.split('\n');
    const processedLines: string[] = [];

    lines.forEach(line => {
      let l = line.trim();
      if (!l) return;

      // Se stripStyles estiver ativo, ignoramos definições de classe e aplicações
      if (stripStyles && (l.startsWith('classDef') || l.startsWith('class ') || l.includes(':::'))) {
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
        // Tentativa 1: Código Completo
        const cleanCode = sanitizeCode(code);
        const { svg: renderedSvg } = await mermaid.render(renderId, cleanCode);
        setSvg(renderedSvg);
      } catch (err: any) {
        console.warn("Falha na renderização completa, tentando fallback sem estilos...", err);
        
        try {
          // Tentativa 2: Fallback (apenas estrutura, sem classes/estilos)
          const fallbackCode = sanitizeCode(code, true);
          const { svg: fallbackSvg } = await mermaid.render(`${renderId}-fallback`, fallbackCode);
          setSvg(fallbackSvg);
        } catch (fallbackErr) {
          console.error("Erro crítico no fallback:", fallbackErr);
          setError("O diagrama gerado contém erros estruturais que impedem a visualização. Por favor, tente descrever o processo de forma mais simples ou envie uma imagem mais clara.");
        }
      }
    };

    renderChart();
  }, [code, id]);

  if (error) {
    return (
      <div className="p-8 bg-red-50 text-red-900 border border-red-200 rounded-3xl animate-in fade-in zoom-in duration-300">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-red-200 rounded-full">
            <svg className="w-5 h-5 text-red-700" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
          </div>
          <p className="font-black uppercase tracking-tight">Erro de Processamento Visual</p>
        </div>
        <p className="text-sm font-medium opacity-80 leading-relaxed mb-6">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="text-xs font-black uppercase tracking-widest px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all shadow-lg shadow-red-900/20"
        >
          Reiniciar Sessão
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
