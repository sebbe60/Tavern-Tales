export interface Stats {
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
}

export interface Skills {
  acrobatics: number;
  animalHandling: number;
  arcana: number;
  athletics: number;
  deception: number;
  history: number;
  insight: number;
  intimidation: number;
  investigation: number;
  medicine: number;
  nature: number;
  perception: number;
  performance: number;
  persuasion: number;
  religion: number;
  sleightOfHand: number;
  stealth: number;
  survival: number;
}

export interface SavingThrows {
  str: boolean;
  dex: boolean;
  con: boolean;
  int: boolean;
  wis: boolean;
  cha: boolean;
}

export interface Spell {
  name: string;
  level: number;
  school: string;
  description: string;
}

export interface Character {
  id: string;
  playerId: string;
  name: string;
  race: string;
  class: string;
  level: number;
  hp: { current: number; max: number };
  mp: { current: number; max: number };
  stats: Stats;
  skills?: Skills;
  savingThrows?: SavingThrows;
  proficiencies?: string[];
  inventory: string[];
  spells?: Spell[];
  avatar?: string | null;
  status: string;
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
  timestamp: number;
}

export type TurnPhase = 'waiting-for-players' | 'ai-processing';
