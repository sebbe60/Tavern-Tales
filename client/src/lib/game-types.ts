export interface Stats {
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
}

export interface Character {
  id: string;
  name: string;
  class: string;
  level: number;
  hp: { current: number; max: number };
  mp: { current: number; max: number };
  stats: Stats;
  inventory: string[];
  avatar: string; // URL to avatar image
  status: string; // e.g., "Healthy", "Poisoned"
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  author: string; // "Game Master", "PlayerName"
  content: string;
  timestamp: number;
}

export type TurnPhase = 'waiting-for-players' | 'ai-processing';
