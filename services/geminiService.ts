
import { GoogleGenAI, Type } from "@google/genai";
import { FlowchartData } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export interface Attachment {
  data: string; // base64
  mimeType: string;
}

export const generateFlowchart = async (
  prompt: string, 
  currentData?: FlowchartData,
  attachments: Attachment[] = []
): Promise<FlowchartData> => {
  const modelName = 'gemini-3-flash-preview';
  
  const systemInstruction = `Você é um Consultor de Processos Sênior especialista em Bizagi e Modelagem BPMN.
Sua tarefa é criar diagramas de fluxo profissionais em Português do Brasil (PT-BR).

REGRAS CRÍTICAS DE SINTAXE MERMAID (PARA EVITAR ERROS DE PARSE):
1. CARACTERES: Use APENAS caracteres ASCII básicos no código Mermaid. 
   - NUNCA use caracteres como ﬂ, °, ¶, ß, ou acentos nos IDs dos nós.
   - IDs devem ser apenas letras e números (ex: INICIO, T1, T2, FIM).
2. RÓTULOS: SEMPRE coloque o texto dos nós entre aspas duplas: ID["Texto do Nó"].
3. ESTILOS: NUNCA use ':::' ou estilos inline.
   - Use apenas as classes pré-definidas no final do código:
     classDef task fill:#F4F7F9,stroke:#2B5797,stroke-width:2px,color:#333333;
     classDef gateway fill:#FFFAE6,stroke:#856404,stroke-width:2px,color:#333333;
     classDef event fill:#FFFFFF,stroke:#28A745,stroke-width:2px,color:#333333;
     classDef endEvent fill:#FFFFFF,stroke:#DC3545,stroke-width:2px,color:#333333;
4. APLICAÇÃO DE CLASSES: Use a sintaxe 'class ID nomeDaClasse;' em linhas separadas no final.

ESTRUTURA EXEMPLO:
graph TD
  START["Início"] --> T1["Análise de Crédito"]
  class START event;
  class T1 task;

DIRETRIZES DE CONTEÚDO:
- Se houver anexos (prints ou documentos), extraia a lógica de negócio fielmente.
- Todo o conteúdo visível (rótulos, títulos) DEVE ser em Português (PT-BR).
- Retorne apenas o JSON puro, sem markdown.`;

  let textContent = `Crie um fluxograma BPMN profissional (estilo Bizagi) em PT-BR para: "${prompt}"`;
  
  if (currentData) {
    textContent = `Atualize este processo seguindo as novas regras de sintaxe:
Título: ${currentData.title}
Mermaid: ${currentData.mermaidCode}
Alteração solicitada: "${prompt}"`;
  }

  const parts: any[] = [{ text: textContent }];
  
  attachments.forEach(att => {
    parts.push({
      inlineData: {
        data: att.data,
        mimeType: att.mimeType
      }
    });
  });

  const response = await ai.models.generateContent({
    model: modelName,
    contents: { parts },
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          mermaidCode: { type: Type.STRING },
          description: { type: Type.STRING }
        },
        required: ["title", "mermaidCode", "description"],
      },
    },
  });

  const text = response.text;
  if (!text) throw new Error("IA retornou vazio.");
  
  try {
    return JSON.parse(text) as FlowchartData;
  } catch (e) {
    console.error("Erro JSON:", text);
    throw new Error("Erro na resposta da IA.");
  }
};
