import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, jsonb, timestamp, boolean } from "drizzle-orm/pg-core";
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

// Expanded stats schema - includes base D&D stats plus additional options
export const statsSchema = z.object({
  str: z.number().default(1),
  dex: z.number().default(1),
  con: z.number().default(1),
  int: z.number().default(1),
  wis: z.number().default(1),
  cha: z.number().default(1),
  // Additional stats
  luck: z.number().default(1).optional(),
  per: z.number().default(1).optional(), // Perception as separate stat
  agi: z.number().default(1).optional(), // Agility
  end: z.number().default(1).optional(), // Endurance
});

// Status effect schema - for conditions like poisoned, on fire, etc.
export const statusEffectSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  duration: z.number().optional(), // turns remaining, null = permanent until removed
  severity: z.enum(["minor", "moderate", "severe"]).optional(),
});

// Skill/Ability schema with cooldowns
export const abilitySchema = z.object({
  name: z.string(),
  description: z.string(),
  cooldown: z.number(), // total cooldown in turns
  currentCooldown: z.number().default(0), // remaining cooldown (0 = ready)
  power: z.enum(["weak", "moderate", "strong", "ultimate"]).optional(),
  type: z.string().optional(), // "attack", "heal", "buff", "debuff", etc.
});

// Character Sheets
export const characters = pgTable("characters", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  playerId: varchar("player_id").notNull().references(() => players.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  race: text("race").notNull(),
  class: text("class").notNull(),
  level: integer("level").notNull().default(1),
  
  // XP System
  xp: integer("xp").notNull().default(0),
  xpToNextLevel: integer("xp_to_next_level").notNull().default(100),
  
  // Resources
  hp: jsonb("hp").notNull().$type<{ current: number; max: number }>(),
  mp: jsonb("mp").notNull().$type<{ current: number; max: number }>(),
  
  // Stats (flexible, no limits)
  stats: jsonb("stats").notNull().$type<z.infer<typeof statsSchema>>(),
  
  // Dynamic status effects (managed by AI)
  statusEffects: jsonb("status_effects").$type<z.infer<typeof statusEffectSchema>[]>().default([]),
  
  // Dynamic abilities/skills with cooldowns (created by AI)
  abilities: jsonb("abilities").$type<z.infer<typeof abilitySchema>[]>().default([]),
  
  // Inventory (managed by AI)
  inventory: text("inventory").array().notNull().default(sql`ARRAY[]::text[]`),
  
  avatar: text("avatar"),
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
  // Character updates embedded in AI messages
  characterUpdates: jsonb("character_updates").$type<Record<string, any>>(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  timestamp: true,
});
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;
