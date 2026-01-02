
export type ClueType = 'text' | 'image' | 'map';

export interface Clue {
  id: string;
  title: string;
  description: string;
  type: ClueType;
  content: string; // Text content or Base64/URL for images/maps
  timestamp: number;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
}

export interface Case {
  id: string;
  title: string;
  initialContext: string;
  fullScript: string; // 新增：完整的推理小说剧本
  location: string;
  status: 'active' | 'solved' | 'cold';
  truth?: string; // Hidden summary for the final reveal
  hints?: string[]; // Keywords for user to ask about
}

export interface AgentResponse {
  message: string;
  newClues?: Array<{
    title: string;
    description: string;
    type: ClueType;
    contentPrompt?: string; // If image, we use this to generate
    contentText?: string; // If text/map
  }>;
  isSolved?: boolean; // Flag to indicate case is solved
  solveSummary?: string; // Final summary of the case
}
