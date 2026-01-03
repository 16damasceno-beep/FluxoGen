
export interface FlowchartData {
  title: string;
  mermaidCode: string;
  description: string;
}

export interface HistoryItem {
  id: string;
  prompt: string;
  timestamp: number;
  data: FlowchartData;
  isPaid: boolean;
}
