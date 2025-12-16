// Local storage utilities for game state persistence
export const STORAGE_KEYS = {
  SESSION_TOKEN: "sessionToken",
  GAME_ID: "gameId",
  CHAT_HISTORY: "chatHistory",
  CHARACTER_CACHE: "characterCache",
};

export interface ChatHistory {
  gameId: string;
  messages: any[];
  lastUpdated: number;
}

export const saveToLocalStorage = (key: string, data: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error("Failed to save to localStorage:", error);
  }
};

export const loadFromLocalStorage = (key: string) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch (error) {
    console.error("Failed to load from localStorage:", error);
    return null;
  }
};

export const clearGameData = () => {
  Object.values(STORAGE_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
};

// Save chat history for offline viewing
export const saveChatHistory = (gameId: string, messages: any[]) => {
  const history: ChatHistory = {
    gameId,
    messages,
    lastUpdated: Date.now(),
  };
  saveToLocalStorage(STORAGE_KEYS.CHAT_HISTORY, history);
};

// Load saved chat history
export const loadChatHistory = (gameId: string): any[] | null => {
  const history = loadFromLocalStorage(STORAGE_KEYS.CHAT_HISTORY);
  if (history && history.gameId === gameId) {
    return history.messages;
  }
  return null;
};
