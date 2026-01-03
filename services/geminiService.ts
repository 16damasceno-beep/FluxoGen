
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

REGRAS ABSOLUTAS DE SINTAXE MERMAID:
1. SEM CARACTERES ESPECIAIS: O código Mermaid não deve conter caracteres como ﬂ, °, ¶, ß, ou símbolos estranhos. Use apenas ASCII padrão para a estrutura.
2. RÓTULOS SEGUROS: SEMPRE use aspas duplas em todos os textos de nós: ID["Texto do Nó"].
3. IDs SIMPLES: IDs devem ser curtos, sem acentos e sem espaços (ex: INICIO, T1, G1, FIM).
4. ESTILOS OBRIGATÓRIOS (COPIE EXATAMENTE):
   classDef task fill:#F4F7F9,stroke:#2B5797,stroke-width:2px,color:#333333;
   classDef gateway fill:#FFFAE6,stroke:#856404,stroke-width:2px,color:#333333;
   classDef event fill:#FFFFFF,stroke:#28A745,stroke-width:2px,color:#333333;
   classDef endEvent fill:#FFFFFF,stroke:#DC3545,stroke-width:2px,color:#333333;

5. APLICAÇÃO DE CLASSES: Use apenas 'class ID nomeDaClasse;' no final do código. NUNCA use ':::'.

ESTRUTURA TÉCNICA:
graph TD
  START["Início"] --> T1["Análise"]
  T1 --> FIM["Fim"]
  class START event;
  class T1 task;
  class FIM endEvent;

DIRETRIZES DE CONTEÚDO:
- Traduza para PT-BR se os arquivos/prompt estiverem em outro idioma.
- Retorne apenas o JSON.`;

  let textContent = `Gere um fluxograma BPMN em PT-BR para: "${prompt}"`;
  
  if (currentData) {
    textContent = `Refine este processo seguindo as novas regras rígidas de ASCII:
Título: ${currentData.title}
Mermaid: ${currentData.mermaidCode}
Alteração: "${prompt}"`;
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
  if (!text) throw new Error("Resposta vazia da IA.");
  
  try {
    return JSON.parse(text) as FlowchartData;
  } catch (e) {
    throw new Error("Erro ao processar dados da IA.");
  }
};
