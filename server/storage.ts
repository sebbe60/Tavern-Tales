import { 
  type Game, 
  type InsertGame,
  type Player,
  type InsertPlayer,
  type Character,
  type InsertCharacter,
  type Message,
  type InsertMessage,
  games,
  players,
  characters,
  messages,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";
import { randomBytes } from "crypto";

export interface IStorage {
  // Game operations
  createGame(game: InsertGame): Promise<Game>;
  getGame(id: string): Promise<Game | undefined>;
  getGameByShareCode(shareCode: string): Promise<Game | undefined>;
  updateGameTurnPhase(gameId: string, phase: string, turn?: number): Promise<void>;
  updateGameActivity(gameId: string): Promise<void>;
  
  // Player operations
  createPlayer(player: InsertPlayer): Promise<Player>;
  getPlayer(id: string): Promise<Player | undefined>;
  getPlayerByToken(token: string): Promise<Player | undefined>;
  getPlayersByGame(gameId: string): Promise<Player[]>;
  updatePlayerActed(playerId: string, hasActed: boolean): Promise<void>;
  resetPlayersActed(gameId: string): Promise<void>;
  
  // Character operations
  createCharacter(character: InsertCharacter): Promise<Character>;
  getCharacter(id: string): Promise<Character | undefined>;
  getCharacterByPlayer(playerId: string): Promise<Character | undefined>;
  getCharactersByGame(gameId: string): Promise<Character[]>;
  updateCharacter(id: string, updates: Partial<Character>): Promise<Character>;
  
  // Message operations
  createMessage(message: InsertMessage): Promise<Message>;
  getMessagesByGame(gameId: string): Promise<Message[]>;
  
  // Utility
  generateShareCode(): string;
  generateSessionToken(): string;
}

export class DatabaseStorage implements IStorage {
  private database = db;

  generateShareCode(): string {
    return randomBytes(4).toString("hex").toUpperCase();
  }

  generateSessionToken(): string {
    return randomBytes(32).toString("hex");
  }

  async createGame(insertGame: InsertGame): Promise<Game> {
    const [game] = await this.database.insert(games).values(insertGame).returning();
    return game;
  }

  async getGame(id: string): Promise<Game | undefined> {
    const [game] = await this.database.select().from(games).where(eq(games.id, id));
    return game;
  }

  async getGameByShareCode(shareCode: string): Promise<Game | undefined> {
    const [game] = await this.database.select().from(games).where(eq(games.shareCode, shareCode));
    return game;
  }

  async updateGameTurnPhase(gameId: string, phase: string, turn?: number): Promise<void> {
    const updates: any = { turnPhase: phase, lastActivity: new Date() };
    if (turn !== undefined) updates.currentTurn = turn;
    await this.database.update(games).set(updates).where(eq(games.id, gameId));
  }

  async updateGameActivity(gameId: string): Promise<void> {
    await this.database.update(games).set({ lastActivity: new Date() }).where(eq(games.id, gameId));
  }

  async createPlayer(insertPlayer: InsertPlayer): Promise<Player> {
    const [player] = await this.database.insert(players).values(insertPlayer).returning();
    return player;
  }

  async getPlayer(id: string): Promise<Player | undefined> {
    const [player] = await this.database.select().from(players).where(eq(players.id, id));
    return player;
  }

  async getPlayerByToken(token: string): Promise<Player | undefined> {
    const [player] = await this.database.select().from(players).where(eq(players.sessionToken, token));
    return player;
  }

  async getPlayersByGame(gameId: string): Promise<Player[]> {
    return await this.database.select().from(players).where(eq(players.gameId, gameId));
  }

  async updatePlayerActed(playerId: string, hasActed: boolean): Promise<void> {
    await this.database.update(players).set({ hasActed }).where(eq(players.id, playerId));
  }

  async resetPlayersActed(gameId: string): Promise<void> {
    await this.database.update(players).set({ hasActed: false }).where(eq(players.gameId, gameId));
  }

  async createCharacter(insertCharacter: InsertCharacter): Promise<Character> {
    const [character] = await this.database.insert(characters).values(insertCharacter as any).returning();
    return character;
  }

  async getCharacter(id: string): Promise<Character | undefined> {
    const [character] = await this.database.select().from(characters).where(eq(characters.id, id));
    return character;
  }

  async getCharacterByPlayer(playerId: string): Promise<Character | undefined> {
    const [character] = await this.database.select().from(characters).where(eq(characters.playerId, playerId));
    return character;
  }

  async getCharactersByGame(gameId: string): Promise<Character[]> {
    const playersList = await this.getPlayersByGame(gameId);
    const playerIds = playersList.map(p => p.id);
    
    if (playerIds.length === 0) return [];
    
    return await this.database.select().from(characters).where(
      eq(characters.playerId, playerIds[0])
    );
  }

  async updateCharacter(id: string, updates: Partial<Character>): Promise<Character> {
    const [character] = await this.database
      .update(characters)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(characters.id, id))
      .returning();
    return character;
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const [message] = await this.database.insert(messages).values(insertMessage as any).returning();
    return message;
  }

  async getMessagesByGame(gameId: string): Promise<Message[]> {
    return await this.database
      .select()
      .from(messages)
      .where(eq(messages.gameId, gameId))
      .orderBy(messages.timestamp);
  }
}

export const storage = new DatabaseStorage();
