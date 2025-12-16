import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, jsonb, timestamp, boolean, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Game Sessions
export const games = pgTable("games", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  shareCode: text("share_code").notNull().unique(),
  systemPrompt: text("system_prompt").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastActivity: timestamp("last_activity").notNull().defaultNow(),
  turnPhase: text("turn_phase").notNull().default("waiting-for-players"),
  currentTurn: integer("current_turn").notNull().default(0),
});

export const insertGameSchema = createInsertSchema(games).omit({
  id: true,
  createdAt: true,
  lastActivity: true,
});
export type InsertGame = z.infer<typeof insertGameSchema>;
export type Game = typeof games.$inferSelect;

// Players in a game
export const players = pgTable("players", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  gameId: varchar("game_id").notNull().references(() => games.id, { onDelete: "cascade" }),
  sessionToken: text("session_token").notNull().unique(),
  hasActed: boolean("has_acted").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPlayerSchema = createInsertSchema(players).omit({
  id: true,
  createdAt: true,
});
export type InsertPlayer = z.infer<typeof insertPlayerSchema>;
export type Player = typeof players.$inferSelect;

// Character Sheets
export const statsSchema = z.object({
  str: z.number(),
  dex: z.number(),
  con: z.number(),
  int: z.number(),
  wis: z.number(),
  cha: z.number(),
});

export const skillsSchema = z.object({
  acrobatics: z.number(),
  animalHandling: z.number(),
  arcana: z.number(),
  athletics: z.number(),
  deception: z.number(),
  history: z.number(),
  insight: z.number(),
  intimidation: z.number(),
  investigation: z.number(),
  medicine: z.number(),
  nature: z.number(),
  perception: z.number(),
  performance: z.number(),
  persuasion: z.number(),
  religion: z.number(),
  sleightOfHand: z.number(),
  stealth: z.number(),
  survival: z.number(),
});

export const spellSchema = z.object({
  name: z.string(),
  level: z.number(),
  school: z.string(),
  description: z.string(),
});

export const characters = pgTable("characters", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  playerId: varchar("player_id").notNull().references(() => players.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  race: text("race").notNull(),
  class: text("class").notNull(),
  level: integer("level").notNull().default(1),
  hp: jsonb("hp").notNull().$type<{ current: number; max: number }>(),
  mp: jsonb("mp").notNull().$type<{ current: number; max: number }>(),
  stats: jsonb("stats").notNull().$type<z.infer<typeof statsSchema>>(),
  skills: jsonb("skills").$type<z.infer<typeof skillsSchema>>(),
  savingThrows: jsonb("saving_throws").$type<{ str: boolean; dex: boolean; con: boolean; int: boolean; wis: boolean; cha: boolean }>(),
  proficiencies: text("proficiencies").array().notNull().default(sql`ARRAY[]::text[]`),
  inventory: text("inventory").array().notNull().default(sql`ARRAY[]::text[]`),
  spells: jsonb("spells").$type<z.infer<typeof spellSchema>[]>(),
  avatar: text("avatar"),
  status: text("status").notNull().default("Healthy"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertCharacterSchema = createInsertSchema(characters).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertCharacter = z.infer<typeof insertCharacterSchema>;
export type Character = typeof characters.$inferSelect;

// Chat Messages
export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  gameId: varchar("game_id").notNull().references(() => games.id, { onDelete: "cascade" }),
  playerId: varchar("player_id").references(() => players.id, { onDelete: "set null" }),
  role: text("role").notNull(),
  author: text("author").notNull(),
  content: text("content").notNull(),
  diceRoll: jsonb("dice_roll").$type<{ dice: string; result: number; rolls: number[] }>(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  timestamp: true,
});
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;
