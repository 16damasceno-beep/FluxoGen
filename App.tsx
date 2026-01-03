
import React, { useState, useEffect, useRef } from 'react';
import { generateFlowchart, Attachment } from './services/geminiService';
import { FlowchartData, HistoryItem } from './types';
import FlowchartRenderer from './components/FlowchartRenderer';

interface FileAttachment extends Attachment {
  name: string;
  previewUrl?: string;
}

const App: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [mandatoryFields, setMandatoryFields] = useState('');
  const [refinementText, setRefinementText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [currentChart, setCurrentChart] = useState<FlowchartData | null>(null);
  const [currentIsPaid, setCurrentIsPaid] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  
  // Estado para anexos
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('flowchart_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Erro ao carregar histórico", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('flowchart_history', JSON.stringify(history));
  }, [history]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newAttachments: FileAttachment[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      
      const fileData = await new Promise<string>((resolve) => {
        reader.onload = (ev) => {
          const result = ev.target?.result as string;
          resolve(result.split(',')[1]); // remove prefixo data:mime/type;base64,
        };
        reader.readAsDataURL(file);
      });

      newAttachments.push({
        name: file.name,
        data: fileData,
        mimeType: file.type,
        previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
      });
    }

    setAttachments(prev => [...prev, ...newAttachments]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const resetToStart = () => {
    setCurrentChart(null);
    setCurrentId(null);
    setCurrentIsPaid(false);
    setPrompt('');
    setMandatoryFields('');
    setRefinementText('');
    setAttachments([]);
    setError(null);
  };

  const handleAction = async (isRefiningAction: boolean = false) => {
    const activePrompt = isRefiningAction ? refinementText : prompt;
    if (!activePrompt.trim() && attachments.length === 0 && !isLoading && !isRefining) return;

    if (isRefiningAction) setIsRefining(true);
    else setIsLoading(true);
    
    setError(null);

    try {
      const fullPrompt = !isRefiningAction && mandatoryFields.trim() 
        ? `${activePrompt}. Inclua estes elementos do processo: ${mandatoryFields}`
        : activePrompt;

      const data = await generateFlowchart(fullPrompt, isRefiningAction ? currentChart || undefined : undefined, attachments);
      
      if (isRefiningAction && currentId) {
        setHistory(prev => prev.map(item => 
          item.id === currentId ? { ...item, data: data } : item
        ));
        setCurrentChart(data);
        setRefinementText('');
      } else {
        const id = crypto.randomUUID();
        const newItem: HistoryItem = {
          id: id,
          prompt: activePrompt,
          timestamp: Date.now(),
          data: data,
          isPaid: false
        };
        setCurrentChart(data);
        setCurrentId(id);
        setCurrentIsPaid(false);
        setHistory(prev => [newItem, ...prev.slice(0, 9)]);
        setPrompt('');
        setMandatoryFields('');
        setAttachments([]); // Limpa anexos após gerar
      }
    } catch (err: any) {
      setError("Erro ao processar o fluxograma. Tente novamente.");
    } finally {
      setIsLoading(false);
      setIsRefining(false);
    }
  };

  const loadFromHistory = (item: HistoryItem) => {
    setCurrentChart(item.data);
    setCurrentId(item.id);
    setCurrentIsPaid(item.isPaid);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const simulatePayment = () => {
    setIsProcessingPayment(true);
    setTimeout(() => {
      setIsProcessingPayment(false);
      setShowPaymentModal(false);
      setCurrentIsPaid(true);
      if (currentId) {
        setHistory(prev => prev.map(item => 
          item.id === currentId ? { ...item, isPaid: true } : item
        ));
      }
    }, 2000);
  };

  const downloadSVG = () => {
    if (!currentIsPaid) {
      setShowPaymentModal(true);
      return;
    }
    const svgContent = document.querySelector('.mermaid-container svg');
    if (!svgContent) return;
    const svgData = new XMLSerializer().serializeToString(svgContent);
    const blob = new Blob([svgData], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${currentChart?.title || 'processo'}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#f0f2f5]">
      {/* Navigation Rail */}
      <aside className="w-full md:w-72 bg-[#1e293b] text-slate-300 p-5 flex-shrink-0 border-r border-slate-700 z-30 shadow-xl">
        <div className="flex items-center gap-3 mb-10 px-2 cursor-pointer" onClick={resetToStart}>
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/50">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
            </svg>
          </div>
          <div className="flex flex-col">
            <h1 className="text-lg font-black text-white leading-none tracking-tight">FLUXOGEN</h1>
            <span className="text-[10px] text-blue-400 font-bold uppercase tracking-widest mt-1">BPMN Modeler AI</span>
          </div>
        </div>

        <div className="space-y-6">
          <button 
            onClick={resetToStart}
            className="w-full flex items-center gap-3 p-4 bg-blue-600 text-white rounded-2xl font-black text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-900/30"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
            </svg>
            Novo Processo
          </button>

          <div>
            <h2 className="text-[10px] font-bold uppercase text-slate-500 tracking-[0.2em] mb-4 px-2">Histórico de Modelagem</h2>
            <div className="space-y-2 overflow-y-auto max-h-[50vh] pr-2 custom-scrollbar">
              {history.length === 0 && <p className="text-xs text-slate-600 px-2 italic">Nenhum processo salvo</p>}
              {history.map((item) => (
                <button
                  key={item.id}
                  onClick={() => loadFromHistory(item)}
                  className={`w-full text-left p-3 rounded-xl border transition-all duration-200 group ${
                    currentId === item.id 
                      ? 'bg-blue-600/10 border-blue-500/50 text-white' 
                      : 'bg-slate-800/40 border-transparent hover:bg-slate-800/80 hover:border-slate-600'
                  }`}
                >
                  <p className={`text-sm font-semibold truncate ${currentId === item.id ? 'text-blue-300' : 'text-slate-300 group-hover:text-white'}`}>
                    {item.data.title}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-[8px] px-1.5 py-0.5 rounded font-black tracking-tighter ${
                      item.isPaid 
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    }`}>
                      {item.isPaid ? 'PUBLICADO' : 'PRÉVIA BIZAGI'}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </aside>

      {/* Canvas Area */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <div className="flex-1 overflow-y-auto p-6 md:p-10">
          
          {!currentChart && !isLoading ? (
            <div className="h-full flex flex-col items-center justify-center max-w-2xl mx-auto text-center space-y-8 animate-in fade-in zoom-in duration-700">
               <div className="relative">
                 <div className="absolute -inset-4 bg-blue-500/10 rounded-full blur-2xl"></div>
                 <div className="relative p-6 bg-white shadow-2xl rounded-[2.5rem] border border-slate-200">
                    <svg className="w-16 h-16 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                 </div>
               </div>
               <div className="space-y-4">
                 <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight">
                   Modelagem de Processos <span className="text-blue-600">Enterprise.</span>
                 </h2>
                 <p className="text-slate-500 text-lg md:text-xl font-medium max-w-lg mx-auto">
                   Transforme descrições, prints ou documentos em diagramas padrão Bizagi.
                 </p>
               </div>
            </div>
          ) : (
            <div className="max-w-5xl mx-auto space-y-8 pb-20">
              {isLoading ? (
                <div className="bg-white p-20 rounded-[2.5rem] shadow-2xl border border-slate-200 text-center space-y-6">
                  <div className="flex justify-center">
                    <div className="relative w-16 h-16">
                      <div className="absolute inset-0 border-4 border-blue-100 rounded-full"></div>
                      <div className="absolute inset-0 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-2xl font-black text-slate-800 tracking-tight">Analisando Arquivos e Gerando BPMN...</p>
                    <p className="text-slate-400 text-sm font-medium">Extraindo lógica de negócio dos anexos.</p>
                  </div>
                </div>
              ) : currentChart && (
                <div className="animate-in fade-in slide-in-from-bottom-10 duration-700 space-y-8">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={resetToStart}
                        className="p-3 bg-white border border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-200 rounded-2xl transition-all shadow-sm group"
                        title="Voltar ao início"
                      >
                        <svg className="w-6 h-6 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                      </button>
                      <div>
                        <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">{currentChart.title}</h2>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Modelo de Processo Ativo</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Renderizador de Fluxo */}
                  <div className="relative group">
                    <div className={`bg-white rounded-[2rem] shadow-2xl border-2 transition-all duration-500 overflow-hidden ${
                      !currentIsPaid 
                        ? 'max-h-[500px] border-blue-100 ring-4 ring-blue-50 shadow-blue-100/50' 
                        : 'border-emerald-100 ring-4 ring-emerald-50 shadow-emerald-100/50'
                    }`}>
                      <div className="p-2 md:p-6 overflow-auto bg-[#f8f9fa] pattern-grid">
                        <FlowchartRenderer code={currentChart.mermaidCode} id={currentId || 'current'} />
                      </div>
                      
                      {!currentIsPaid && (
                        <>
                          <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-[0.03] overflow-hidden select-none">
                            <div className="whitespace-nowrap rotate-[-35deg] text-[15rem] font-black text-slate-900">
                              BIZAGI STYLE • BPMN MODELER • PRO
                            </div>
                          </div>
                          <div className="absolute bottom-0 inset-x-0 h-40 bg-gradient-to-t from-white via-white/95 to-transparent flex flex-col items-center justify-end pb-8">
                            <p className="text-slate-600 text-sm font-bold mb-4 flex items-center gap-2">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z" clipRule="evenodd" /></svg>
                              Modelo em Modo de Visualização Restrita
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 space-y-4">
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h7" /></svg>
                          Documentação do Processo
                        </h3>
                        <p className="text-slate-600 leading-relaxed text-sm font-medium">{currentChart.description}</p>
                      </div>

                      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 space-y-4">
                         <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                           <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 00-2 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                           Refinar Modelo
                         </h3>
                         <textarea 
                           value={refinementText}
                           onChange={(e) => setRefinementText(e.target.value)}
                           placeholder="Ex: 'Mova a tarefa X para a raia do Diretor Financeiro'..."
                           className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm focus:ring-4 focus:ring-blue-100 outline-none transition-all resize-none h-24 placeholder:text-slate-400 font-medium"
                           disabled={isRefining}
                         />
                         <button 
                           onClick={() => handleAction(true)}
                           disabled={(!refinementText.trim() && attachments.length === 0) || isRefining}
                           className="w-full py-4 bg-slate-900 text-white rounded-2xl text-sm font-black hover:bg-black disabled:opacity-30 transition-all flex items-center justify-center gap-3 shadow-xl shadow-slate-200"
                         >
                           {isRefining ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : null}
                           {isRefining ? "Processando..." : "Atualizar Modelo"}
                         </button>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="bg-blue-600 p-8 rounded-[2rem] shadow-2xl shadow-blue-200 text-white h-full flex flex-col justify-between overflow-hidden relative">
                         <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
                         <div className="relative z-10">
                           <h3 className="text-2xl font-black mb-2 italic">Exportar Modelo</h3>
                           <p className="text-blue-100 text-sm leading-relaxed font-medium">
                             {currentIsPaid 
                               ? "O modelo está pronto para uso corporativo." 
                               : "Obtenha o diagrama profissional em alta definição e sem marca d'água por apenas R$ 5."}
                           </p>
                         </div>
                         
                         <button 
                           onClick={currentIsPaid ? downloadSVG : () => setShowPaymentModal(true)}
                           className={`w-full py-5 mt-8 rounded-2xl font-black text-lg transition-all transform hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-3 shadow-2xl ${
                             currentIsPaid 
                               ? 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-emerald-900/20' 
                               : 'bg-white text-blue-600 hover:bg-slate-50 shadow-blue-900/20'
                           }`}
                         >
                           {currentIsPaid ? (
                             <>
                               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                               Download SVG Pro
                             </>
                           ) : (
                             <>
                               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                               Liberar Modelo • R$ 5
                             </>
                           )}
                         </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Floating Input Dock */}
        <div className={`p-8 bg-transparent transition-all duration-500 ${currentChart ? 'translate-y-full opacity-0 pointer-events-none' : 'z-40'}`}>
          {!currentChart && (
            <div className="max-w-4xl mx-auto">
              <div className="bg-white/80 backdrop-blur-2xl p-8 rounded-[3rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] border border-white/50 space-y-6">
                
                {/* Previews de Anexos */}
                {attachments.length > 0 && (
                  <div className="flex flex-wrap gap-3 px-2">
                    {attachments.map((att, idx) => (
                      <div key={idx} className="relative group">
                        <div className="w-16 h-16 rounded-xl border border-slate-200 overflow-hidden bg-slate-100 flex items-center justify-center">
                          {att.previewUrl ? (
                            <img src={att.previewUrl} className="w-full h-full object-cover" />
                          ) : (
                            <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          )}
                        </div>
                        <button 
                          onClick={() => removeAttachment(idx)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <form 
                  onSubmit={(e) => { e.preventDefault(); handleAction(false); }}
                  className="space-y-6"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                        Definição do Processo
                      </label>
                      <input
                        type="text"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Descreva o processo ou anexe um print..."
                        className="w-full bg-slate-50 border border-slate-100 px-6 py-5 rounded-[1.5rem] outline-none focus:ring-4 focus:ring-blue-100 focus:bg-white transition-all text-slate-800 shadow-inner placeholder:text-slate-400 font-medium"
                        disabled={isLoading}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-blue-300 rounded-full"></div>
                        Atores / Raias (Lanes)
                      </label>
                      <input
                        type="text"
                        value={mandatoryFields}
                        onChange={(e) => setMandatoryFields(e.target.value)}
                        placeholder="Ex: Cliente, Vendas, Financeiro..."
                        className="w-full bg-slate-50 border border-slate-100 px-6 py-5 rounded-[1.5rem] outline-none focus:ring-4 focus:ring-blue-100 focus:bg-white transition-all text-slate-800 shadow-inner placeholder:text-slate-400 font-medium"
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <div className="flex gap-4">
                    {/* Botão de Anexo */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-6 py-5 bg-slate-100 text-slate-600 rounded-[1.5rem] font-bold hover:bg-slate-200 transition-all flex items-center gap-2 border border-slate-200"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.414a4 4 0 00-5.656-5.656l-6.415 6.415a6 6 0 108.486 8.486L20.5 13" /></svg>
                      Anexar Prints/Files
                    </button>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      multiple 
                      accept="image/*,.pdf,.txt" 
                      onChange={handleFileUpload}
                    />

                    <button
                      type="submit"
                      disabled={(!prompt.trim() && attachments.length === 0) || isLoading}
                      className="flex-1 py-5 bg-blue-600 text-white rounded-[1.5rem] font-black text-xl hover:bg-blue-700 disabled:opacity-50 transition-all shadow-2xl shadow-blue-200 flex items-center justify-center gap-4"
                    >
                      {isLoading ? (
                        <>
                          <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                          Analisando e Modelando...
                        </>
                      ) : "Modelar Processo Agora"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>

        {/* Botão Flutuante de Anexo quando já tem gráfico */}
        {currentChart && !isLoading && (
          <div className="fixed bottom-8 right-8 z-40 flex flex-col items-end gap-3">
             {attachments.length > 0 && (
                <div className="bg-white p-3 rounded-2xl shadow-xl border border-slate-200 mb-2 flex gap-2">
                   {attachments.map((att, idx) => (
                      <div key={idx} className="w-10 h-10 rounded-lg overflow-hidden border border-slate-100">
                         {att.previewUrl ? <img src={att.previewUrl} className="w-full h-full object-cover" /> : <div className="bg-slate-100 w-full h-full flex items-center justify-center text-[10px] text-slate-400">DOC</div>}
                      </div>
                   ))}
                </div>
             )}
             <button 
               onClick={() => fileInputRef.current?.click()}
               className="bg-white text-slate-700 p-4 rounded-full shadow-2xl border border-slate-200 hover:bg-slate-50 transition-all flex items-center gap-2 font-bold"
             >
               <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
               Anexar Referência para Ajuste
             </button>
          </div>
        )}

        {/* Payment Modal */}
        {showPaymentModal && (
          <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-[3rem] w-full max-w-md overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.3)] animate-in zoom-in-95 duration-500">
              <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-10 text-white text-center relative overflow-hidden">
                <div className="relative z-10 space-y-4">
                  <div className="inline-block p-4 bg-white/10 rounded-[2rem] border border-white/20">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                  </div>
                  <h3 className="text-4xl font-black tracking-tighter uppercase italic">Desbloquear Pro</h3>
                  <p className="text-3xl text-white font-black">R$ 5,00</p>
                </div>
              </div>
              
              <div className="p-12 space-y-10">
                <div className="flex flex-col items-center space-y-6">
                  <div className="p-4 bg-slate-50 rounded-[3rem] border border-slate-200 shadow-inner">
                    <div className="w-48 h-48 flex items-center justify-center bg-white rounded-[2rem] shadow-xl relative border border-slate-100">
                       <svg className="w-16 h-16 text-blue-600" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em]">Pagamento via PIX</p>
                </div>

                <div className="space-y-4">
                  <button 
                    onClick={simulatePayment}
                    disabled={isProcessingPayment}
                    className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black text-xl hover:bg-blue-700 shadow-2xl shadow-blue-200 flex items-center justify-center gap-3"
                  >
                    {isProcessingPayment ? "Validando..." : "Confirmar Pagamento"}
                  </button>
                  <button onClick={() => setShowPaymentModal(false)} className="w-full text-xs font-bold text-slate-400 uppercase tracking-widest">Voltar</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
      
      <style>{`
        .pattern-grid {
          background-image: radial-gradient(#cbd5e1 0.5px, transparent 0.5px);
          background-size: 20px 20px;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #475569;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #64748b;
        }
      `}</style>
    </div>
  );
};

export default App;
