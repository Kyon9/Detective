
export type ClueType = 'text' | 'archive';

export interface Clue {
  id: string;
  title: string;
  description: string;
  type: ClueType;
  content: string; 
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
  fullScript: string; 
  location: string;
  status: 'active' | 'solved' | 'cold';
  truth?: string;
  hints?: string[];
}

export interface AgentResponse {
  message: string;
  newClues?: Array<{
    title: string;
    description: string;
    type: ClueType;
    contentText?: string;
  }>;
  isSolved?: boolean;
  solveSummary?: string;
}
