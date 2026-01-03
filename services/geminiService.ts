
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
Sua tarefa é criar diagramas de fluxo de alta fidelidade que se pareçam com modelos feitos no Bizagi Modeler.

REGRAS DE MODELAGEM BIZAGI/BPMN:
1. RAIAS (Lanes): Use 'subgraph' para criar "Pools" ou "Lanes" (ex: "Solicitante", "Financeiro").
2. EVENTOS: Início ([Início]), Fim ([Fim]).
3. ATIVIDADES: Use [Nome da Atividade]. Verbos no infinitivo.
4. GATEWAYS: Use {Condição?}.
5. ESTILO VISUAL (CRÍTICO - SIGA EXATAMENTE):
   - NUNCA use caracteres especiais, símbolos ou emojis em classDef.
   - Use APENAS letras, números e pontuação básica ASCII.
   - Use EXCLUSIVAMENTE estas definições de estilo no final do código:
     classDef task fill:#F4F7F9,stroke:#2B5797,stroke-width:2px,color:#333333;
     classDef gateway fill:#FFFAE6,stroke:#856404,stroke-width:2px,color:#333333;
     classDef event fill:#FFFFFF,stroke:#28A745,stroke-width:2px,color:#333333;
     classDef endEvent fill:#FFFFFF,stroke:#DC3545,stroke-width:2px,color:#333333;
     classDef pool fill:#F8F9FA,stroke:#DEE2E6,stroke-width:1px,stroke-dasharray:5 5;
6. SINTAXE MERMAID:
   - Inicie com 'graph TD'.
   - NÃO use blocos de código markdown (\`\`\`mermaid) no JSON.
   - Certifique-se de que cada instrução esteja em uma nova linha.
7. O retorno deve ser EXCLUSIVAMENTE um JSON estruturado seguindo o schema.`;

  let textContent = `Crie um modelo de processo de negócio profissional seguindo os padrões do Bizagi/BPMN: "${prompt}"`;
  
  if (currentData) {
    textContent = `O processo atual é:
Título: ${currentData.title}
Código Mermaid:
${currentData.mermaidCode}

O usuário deseja estas alterações: "${prompt}"
Considere também os anexos para entender o fluxo de negócio.`;
  } else {
    textContent += `\nConsidere os anexos para extrair a lógica e campos necessários.`;
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
  if (!text) throw new Error("A IA não retornou dados.");
  
  try {
    return JSON.parse(text) as FlowchartData;
  } catch (e) {
    console.error("Erro ao parsear JSON:", text);
    throw new Error("Erro na resposta da IA.");
  }
};
