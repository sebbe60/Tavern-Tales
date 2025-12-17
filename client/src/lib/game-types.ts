export interface Stats {
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
  luck?: number;
  per?: number;
  agi?: number;
  end?: number;
}

export interface StatusEffect {
  name: string;
  description?: string;
  duration?: number; // turns remaining
  severity?: "minor" | "moderate" | "severe";
}

export interface Ability {
  name: string;
  description: string;
  cooldown: number; // total cooldown in turns
  currentCooldown: number; // remaining cooldown (0 = ready)
  power?: "weak" | "moderate" | "strong" | "ultimate";
  type?: string;
}

export interface Character {
  id: string;
  playerId: string;
  name: string;
  race: string;
  class: string;
  level: number;
  xp: number;
  xpToNextLevel: number;
  hp: { current: number; max: number };
  mp: { current: number; max: number };
  stats: Stats;
  statusEffects: StatusEffect[];
  abilities: Ability[];
  inventory: string[];
  avatar?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Message {
  id: string;
  gameId: string;
  playerId: string | null;
  role: 'user' | 'assistant' | 'system';
  author: string;
  content: string;
  diceRoll?: { dice: string; result: number; rolls: number[] } | null;
  characterUpdates?: Record<string, any>;
  timestamp: number;
}

export type TurnPhase = 'waiting-for-players' | 'ai-processing';
