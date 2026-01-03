
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

IDIOMA OBRIGATÓRIO: 
- Todo o conteúdo (título, descrição e textos dentro do fluxograma) deve ser OBRIGATORIAMENTE em Português do Brasil (PT-BR).
- Se o usuário fornecer informações em outro idioma, traduza-as para PT-BR no resultado final.

REGRAS DE MODELAGEM BIZAGI/BPMN (SINTAXE RÍGIDA):
1. ESTRUTURA: Inicie com 'graph TD'.
2. RAIAS: Use 'subgraph "Nome da Raia"' ... 'end'.
3. DEFINIÇÃO DE NÓS (CRÍTICO): 
   - Defina os nós primeiro: ID[Texto em PT-BR] ou ID([Texto em PT-BR]).
   - NÃO use ':::' para aplicar classes.
   - IDs de nós devem ser simples (ex: S1, A1, G1, E1).
4. ESTILOS (DEFINA NO FINAL):
   - Use 'classDef' exatamente como abaixo:
     classDef task fill:#F4F7F9,stroke:#2B5797,stroke-width:2px,color:#333333;
     classDef gateway fill:#FFFAE6,stroke:#856404,stroke-width:2px,color:#333333;
     classDef event fill:#FFFFFF,stroke:#28A745,stroke-width:2px,color:#333333;
     classDef endEvent fill:#FFFFFF,stroke:#DC3545,stroke-width:2px,color:#333333;
     classDef pool fill:#F8F9FA,stroke:#DEE2E6,stroke-width:1px,stroke-dasharray:5 5;
5. APLICAÇÃO DE CLASSES (NO FINAL DO CÓDIGO):
   - Use a sintaxe: 'class ID_DO_NO nomeDaClasse' (ex: class S1 event; class A1 task;).
6. SIMBOLOGIA:
   - Eventos: ([Texto]) - Use a classe 'event' para início e 'endEvent' para fim.
   - Tarefas: [Texto] - Use a classe 'task'.
   - Gateways: {Texto?} - Use a classe 'gateway'.
7. SINTAXE LIMPA:
   - APENAS caracteres ASCII básicos no código Mermaid.
   - NÃO use blocos de código markdown (\`\`\`mermaid) dentro do JSON.
   - Cada instrução em uma nova linha.
   - SEM caracteres especiais ou acentos nos IDs dos nós.
8. O retorno deve ser EXCLUSIVAMENTE um JSON estruturado seguindo o schema.`;

  let textContent = `Crie um modelo de processo de negócio profissional em Português do Brasil (PT-BR) seguindo os padrões do Bizagi/BPMN: "${prompt}"`;
  
  if (currentData) {
    textContent = `O processo atual (em PT-BR) é:
Título: ${currentData.title}
Código Mermaid:
${currentData.mermaidCode}

O usuário deseja estas alterações (mantenha tudo em Português do Brasil): "${prompt}"
Considere também os anexos para entender o fluxo de negócio. Gere um código Mermaid LIMPO e VÁLIDO em PT-BR.`;
  } else {
    textContent += `\nConsidere os anexos para extrair a lógica e campos necessários. Gere todo o conteúdo em Português do Brasil (PT-BR).`;
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
