import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { insertGameSchema, insertPlayerSchema, insertCharacterSchema, insertMessageSchema } from "@shared/schema";

// Dice rolling utility
function rollDice(dice: string): { result: number; rolls: number[] } {
  const match = dice.match(/(\d+)d(\d+)([+-]\d+)?/i);
  if (!match) throw new Error("Invalid dice format");
  
  const [, numDice, sides, modifier] = match;
  const rolls: number[] = [];
  
  for (let i = 0; i < parseInt(numDice); i++) {
    rolls.push(Math.floor(Math.random() * parseInt(sides)) + 1);
  }
  
  const sum = rolls.reduce((a, b) => a + b, 0);
  const mod = modifier ? parseInt(modifier) : 0;
  
  return { result: sum + mod, rolls };
}

// OpenRouter AI call
async function callOpenRouter(messages: any[], apiKey: string): Promise<string> {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://taverntales.replit.app",
      "X-Title": "Tavern Tales",
    },
    body: JSON.stringify({
      model: "mistralai/mistral-7b-instruct:free",
      messages,
    }),
  });
  
  const data = await response.json();
  if (data.choices && data.choices.length > 0) {
    return data.choices[0].message.content;
  }
  throw new Error("AI response failed");
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Create a new game
  app.post("/api/games", async (req, res) => {
    try {
      const shareCode = storage.generateShareCode();
      const systemPrompt = `You are an experienced Dungeon Master for D&D 5e. You craft engaging narratives, describe vivid scenes, and respond to player actions with creativity and fairness. Keep responses immersive and story-focused.`;
      
      const game = await storage.createGame({
        shareCode,
        systemPrompt,
        turnPhase: "waiting-for-players",
        currentTurn: 0,
      });
      
      res.json(game);
    } catch (error) {
      res.status(500).json({ error: "Failed to create game" });
    }
  });

  // Get game by share code
  app.get("/api/games/:shareCode", async (req, res) => {
    try {
      const game = await storage.getGameByShareCode(req.params.shareCode);
      if (!game) {
        return res.status(404).json({ error: "Game not found" });
      }
      res.json(game);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch game" });
    }
  });

  // Join a game (create player)
  app.post("/api/games/:gameId/join", async (req, res) => {
    try {
      const { gameId } = req.params;
      const game = await storage.getGame(gameId);
      
      if (!game) {
        return res.status(404).json({ error: "Game not found" });
      }
      
      // Check if game is full (max 2 players)
      const existingPlayers = await storage.getPlayersByGame(gameId);
      if (existingPlayers.length >= 2) {
        return res.status(400).json({ error: "Game is full" });
      }
      
      const sessionToken = storage.generateSessionToken();
      const player = await storage.createPlayer({
        gameId,
        sessionToken,
        hasActed: false,
      });
      
      res.json({ player, sessionToken });
    } catch (error) {
      res.status(500).json({ error: "Failed to join game" });
    }
  });

  // Create character for a player
  app.post("/api/characters", async (req, res) => {
    try {
      const validated = insertCharacterSchema.parse(req.body);
      const character = await storage.createCharacter(validated);
      res.json(character);
    } catch (error) {
      res.status(400).json({ error: "Invalid character data" });
    }
  });

  // Get game state (messages, characters, game info)
  app.get("/api/games/:gameId/state", async (req, res) => {
    try {
      const { gameId } = req.params;
      const game = await storage.getGame(gameId);
      
      if (!game) {
        return res.status(404).json({ error: "Game not found" });
      }
      
      const gamePlayers = await storage.getPlayersByGame(gameId);
      const charactersData = await Promise.all(
        gamePlayers.map(p => storage.getCharacterByPlayer(p.id))
      );
      const messagesData = await storage.getMessagesByGame(gameId);
      
      res.json({
        game,
        players: gamePlayers,
        characters: charactersData.filter(Boolean),
        messages: messagesData,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch game state" });
    }
  });

  // Send a message (player action)
  app.post("/api/games/:gameId/messages", async (req, res) => {
    try {
      const { gameId } = req.params;
      const { sessionToken, content, diceRoll } = req.body;
      
      if (!sessionToken || !content) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      
      const player = await storage.getPlayerByToken(sessionToken);
      if (!player || player.gameId !== gameId) {
        return res.status(403).json({ error: "Unauthorized" });
      }
      
      const character = await storage.getCharacterByPlayer(player.id);
      if (!character) {
        return res.status(400).json({ error: "Character not found" });
      }
      
      // Create player message
      const message = await storage.createMessage({
        gameId,
        playerId: player.id,
        role: "user",
        author: character.name,
        content,
        diceRoll: diceRoll || null,
      });
      
      // Mark player as acted
      await storage.updatePlayerActed(player.id, true);
      
      // Check if all players have acted
      const allPlayers = await storage.getPlayersByGame(gameId);
      const allActed = allPlayers.every(p => p.hasActed || p.id === player.id);
      
      if (allActed) {
        // Trigger AI response
        await storage.updateGameTurnPhase(gameId, "ai-processing");
        
        // Get all messages for context
        const allMessages = await storage.getMessagesByGame(gameId);
        const currentGame = await storage.getGame(gameId);
        
        // Format for OpenRouter
        const aiMessages = [
          { role: "system", content: currentGame!.systemPrompt },
          ...allMessages.map(m => ({
            role: m.role === "assistant" ? "assistant" : "user",
            content: `${m.author}: ${m.content}${m.diceRoll ? ` [Rolled ${m.diceRoll.dice}: ${m.diceRoll.result}]` : ""}`
          }))
        ];
        
        try {
          const apiKey = process.env.OPENROUTER_API_KEY || "";
          let aiResponse = "";
          
          if (apiKey) {
            aiResponse = await callOpenRouter(aiMessages, apiKey);
          } else {
            // Fallback mock response
            const mockResponses = [
              "The ancient door creaks open, revealing a spiral staircase descending into darkness...",
              "A sudden gust extinguishes your torches. You hear footsteps echoing in the chamber ahead.",
              "The merchant eyes you suspiciously before sliding a worn map across the table.",
              "Roll for initiative! Three shadowy figures emerge from the fog, weapons drawn.",
            ];
            aiResponse = mockResponses[Math.floor(Math.random() * mockResponses.length)];
          }
          
          // Create AI message
          await storage.createMessage({
            gameId,
            playerId: null,
            role: "assistant",
            author: "Game Master",
            content: aiResponse,
            diceRoll: null,
          });
          
        } catch (aiError) {
          console.error("AI Error:", aiError);
          await storage.createMessage({
            gameId,
            playerId: null,
            role: "assistant",
            author: "Game Master",
            content: "The Game Master pauses to gather their thoughts...",
            diceRoll: null,
          });
        }
        
        // Reset turn
        await storage.resetPlayersActed(gameId);
        const latestGame = await storage.getGame(gameId);
        await storage.updateGameTurnPhase(gameId, "waiting-for-players", (latestGame?.currentTurn || 0) + 1);
      }
      
      res.json(message);
    } catch (error) {
      console.error("Message error:", error);
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  // Roll dice
  app.post("/api/dice/roll", async (req, res) => {
    try {
      const { dice } = req.body;
      if (!dice) {
        return res.status(400).json({ error: "Missing dice parameter" });
      }
      
      const result = rollDice(dice);
      res.json({ dice, ...result });
    } catch (error) {
      res.status(400).json({ error: "Invalid dice format. Use format like '2d20+5'" });
    }
  });

  // Update character
  app.patch("/api/characters/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const character = await storage.updateCharacter(id, updates);
      res.json(character);
    } catch (error) {
      res.status(500).json({ error: "Failed to update character" });
    }
  });

  return httpServer;
}
