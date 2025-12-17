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

// Calculate ability modifier
function getModifier(stat: number): string {
  const mod = Math.floor((stat - 10) / 2);
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

// Build character summary for AI context
function buildCharacterContext(characters: any[]): string {
  return characters.map(c => {
    const stats = c.stats;
    const abilities = c.abilities || [];
    const statusEffects = c.statusEffects || [];
    
    let context = `**${c.name}** (${c.race} ${c.class}, Level ${c.level})
  HP: ${c.hp.current}/${c.hp.max} | MP: ${c.mp.current}/${c.mp.max} | XP: ${c.xp}/${c.xpToNextLevel}
  STR: ${stats.str} | DEX: ${stats.dex} | CON: ${stats.con} | INT: ${stats.int} | WIS: ${stats.wis} | CHA: ${stats.cha}`;
    
    if (stats.luck) context += ` | LUCK: ${stats.luck}`;
    if (stats.per) context += ` | PER: ${stats.per}`;
    if (stats.agi) context += ` | AGI: ${stats.agi}`;
    if (stats.end) context += ` | END: ${stats.end}`;
    
    if (statusEffects.length > 0) {
      context += `\n  Status Effects: ${statusEffects.map((e: any) => e.name).join(", ")}`;
    } else {
      context += `\n  Status Effects: None`;
    }
    
    if (abilities.length > 0) {
      context += `\n  Abilities: ${abilities.map((a: any) => `${a.name} (CD: ${a.currentCooldown}/${a.cooldown})`).join(", ")}`;
    } else {
      context += `\n  Abilities: None yet`;
    }
    
    context += `\n  Inventory: ${c.inventory.length > 0 ? c.inventory.join(", ") : "Empty"}`;
    
    return context;
  }).join("\n\n");
}

// The strict D&D Game Master system prompt with character management
function buildSystemPrompt(characters: any[]): string {
  const characterContext = buildCharacterContext(characters);
  const characterNames = characters.map(c => c.name).join(", ");
  
  return `You are the Dungeon Master (DM) for a D&D campaign called "Tavern Tales."

THE PLAYERS:
${characterContext}

YOUR ABSOLUTE RULES:

1. **NEVER ACT FOR PLAYERS**: Do not write dialogue, actions, or decisions for the players. Only describe the environment, NPCs, and consequences of their actions.

2. **STOP AND WAIT**: After describing a scene or NPC response, STOP. Do not continue the story. Wait for the players to tell you what they do next.

3. **USE THEIR STATS**: When a player attempts something risky or uncertain, consider their ability scores. Ask them to roll dice when appropriate.

4. **BE CONCISE**: Keep descriptions to 2-4 paragraphs maximum.

5. **ACKNOWLEDGE BOTH PLAYERS**: Address actions from all players.

6. **FORMAT NICELY**: Use **bold** for NPC names and important items. Use *italics* for atmosphere.

7. **ASK FOR DICE ROLLS**: When outcomes are uncertain, ask players to roll.

CHARACTER MANAGEMENT - CRITICAL:

You control the characters' progression. After your narrative response, you MAY include a CHARACTER_UPDATES block to modify character stats. Use this format at the END of your response:

<<<CHARACTER_UPDATES>>>
{
  "CharacterName": {
    "hp": {"current": 15, "max": 20},
    "mp": {"current": 8, "max": 12},
    "xp": 25,
    "xpToNextLevel": 100,
    "level": 1,
    "addInventory": ["Iron Sword", "Health Potion"],
    "removeInventory": ["Rusty Dagger"],
    "addStatusEffect": {"name": "Poisoned", "description": "Losing HP each turn", "duration": 3, "severity": "moderate"},
    "removeStatusEffect": "Burning",
    "addAbility": {"name": "Power Strike", "description": "A mighty blow dealing extra damage", "cooldown": 3, "currentCooldown": 0, "power": "moderate", "type": "attack"},
    "useAbility": "Power Strike"
  }
}
<<<END_UPDATES>>>

WHEN TO UPDATE CHARACTERS:
- Grant XP when players overcome challenges (10-50 XP for minor, 50-100 for major)
- Level up when XP reaches xpToNextLevel (then set XP to 0 and increase xpToNextLevel)
- Add items to inventory when found or purchased
- Remove items when used, lost, or traded
- Apply status effects from combat, traps, or magic (poisoned, burning, frightened, blessed, etc.)
- Remove status effects when cured or expired
- Grant new abilities based on class and story progression
- Reduce HP from damage, restore from healing
- Reduce MP when casting spells
- Use "useAbility" to put an ability on cooldown

Only include CHARACTER_UPDATES when something actually changes. Most responses won't need it.

CURRENT SITUATION: Respond to what the players do and manage their characters appropriately.`;
}

// Opening story when both players are ready
function generateOpeningStory(characters: any[]): string {
  const names = characters.map(c => c.name).join(" and ");
  const classes = characters.map(c => `${c.name} the ${c.class}`).join(" and ");
  
  return `*The heavy oak door of The Rusty Tankard groans open, letting in a gust of cold night air and two weary travelers.*

The tavern falls momentarily silent as the regulars size up the newcomers: **${classes}**.

*Firelight flickers across rough-hewn wooden beams. The air is thick with pipe smoke, the smell of roasted boar, and the low hum of whispered conversations. A bard in the corner strums a melancholy tune on a lute missing two strings.*

The **Tavern Keeper**, a barrel-chested man with a magnificent beard and a scar running down his left cheek, looks up from polishing a tankard and nods toward an empty table near the hearth.

"Ye look like ye've traveled far," he rumbles. "Ale's two copper. Rooms are upstairs if ye need 'em. And if ye're looking for... *opportunity*..." He leans in, lowering his voice. "There's been strange happenings 'round these parts. Folks willing to pay good coin for brave souls."

*He slides two mugs across the bar and waits.*

---

**${names}**, what do you do?`;
}

// Parse character updates from AI response
function parseCharacterUpdates(response: string): { narrative: string; updates: Record<string, any> | null } {
  const updateMatch = response.match(/<<<CHARACTER_UPDATES>>>([\s\S]*?)<<<END_UPDATES>>>/);
  
  if (!updateMatch) {
    return { narrative: response.trim(), updates: null };
  }
  
  const narrative = response.replace(/<<<CHARACTER_UPDATES>>>[\s\S]*?<<<END_UPDATES>>>/, "").trim();
  
  try {
    const updates = JSON.parse(updateMatch[1].trim());
    return { narrative, updates };
  } catch (e) {
    console.error("Failed to parse character updates:", e);
    return { narrative, updates: null };
  }
}

// Apply character updates to the database
async function applyCharacterUpdates(gameId: string, updates: Record<string, any>, characters: any[]) {
  for (const [charName, changes] of Object.entries(updates)) {
    const character = characters.find(c => c.name.toLowerCase() === charName.toLowerCase());
    if (!character) continue;
    
    const updateData: any = {};
    
    // Direct field updates
    if (changes.hp) updateData.hp = changes.hp;
    if (changes.mp) updateData.mp = changes.mp;
    if (changes.xp !== undefined) updateData.xp = changes.xp;
    if (changes.xpToNextLevel !== undefined) updateData.xpToNextLevel = changes.xpToNextLevel;
    if (changes.level !== undefined) updateData.level = changes.level;
    
    // Inventory management
    let inventory = [...(character.inventory || [])];
    if (changes.addInventory) {
      inventory = [...inventory, ...changes.addInventory];
    }
    if (changes.removeInventory) {
      const toRemove = Array.isArray(changes.removeInventory) ? changes.removeInventory : [changes.removeInventory];
      inventory = inventory.filter(item => !toRemove.includes(item));
    }
    if (changes.addInventory || changes.removeInventory) {
      updateData.inventory = inventory;
    }
    
    // Status effects management
    let statusEffects = [...(character.statusEffects || [])];
    if (changes.addStatusEffect) {
      const effect = changes.addStatusEffect;
      if (!statusEffects.find(e => e.name === effect.name)) {
        statusEffects.push(effect);
      }
    }
    if (changes.removeStatusEffect) {
      const effectName = changes.removeStatusEffect;
      statusEffects = statusEffects.filter(e => e.name !== effectName);
    }
    if (changes.addStatusEffect || changes.removeStatusEffect) {
      updateData.statusEffects = statusEffects;
    }
    
    // Abilities management
    let abilities = [...(character.abilities || [])];
    if (changes.addAbility) {
      const ability = changes.addAbility;
      if (!abilities.find(a => a.name === ability.name)) {
        abilities.push(ability);
      }
    }
    if (changes.useAbility) {
      const abilityName = changes.useAbility;
      abilities = abilities.map(a => {
        if (a.name === abilityName) {
          return { ...a, currentCooldown: a.cooldown };
        }
        return a;
      });
    }
    if (changes.addAbility || changes.useAbility) {
      updateData.abilities = abilities;
    }
    
    // Apply updates if any
    if (Object.keys(updateData).length > 0) {
      await storage.updateCharacter(character.id, updateData);
    }
  }
}

// Decrement cooldowns for all abilities when turn advances
async function decrementCooldowns(gameId: string, characters: any[]) {
  for (const character of characters) {
    if (!character.abilities || character.abilities.length === 0) continue;
    
    const updatedAbilities = character.abilities.map((a: any) => ({
      ...a,
      currentCooldown: Math.max(0, (a.currentCooldown || 0) - 1)
    }));
    
    // Decrement status effect durations too
    let statusEffects = character.statusEffects || [];
    statusEffects = statusEffects.filter((e: any) => {
      if (e.duration === undefined || e.duration === null) return true;
      return e.duration > 1;
    }).map((e: any) => {
      if (e.duration !== undefined && e.duration !== null) {
        return { ...e, duration: e.duration - 1 };
      }
      return e;
    });
    
    await storage.updateCharacter(character.id, { 
      abilities: updatedAbilities,
      statusEffects
    });
  }
}

// OpenRouter AI call with better configuration
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
      max_tokens: 800,
      temperature: 0.8,
      stop: ["[/INST]", "[INST]", "###"],
    }),
  });
  
  const data = await response.json();
  if (data.choices && data.choices.length > 0) {
    let content = data.choices[0].message.content;
    content = content.replace(/\[\/INST\]/g, "").replace(/\[INST\]/g, "").trim();
    return content;
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
      
      const game = await storage.createGame({
        shareCode,
        systemPrompt: "",
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
      
      // Check if both players now have characters - if so, generate opening story
      const player = await storage.getPlayer(character.playerId);
      if (player) {
        const gamePlayers = await storage.getPlayersByGame(player.gameId);
        const allCharacters = await Promise.all(
          gamePlayers.map(p => storage.getCharacterByPlayer(p.id))
        );
        const validCharacters = allCharacters.filter(Boolean);
        
        if (validCharacters.length === 2) {
          const existingMessages = await storage.getMessagesByGame(player.gameId);
          if (existingMessages.length === 0) {
            const openingStory = generateOpeningStory(validCharacters);
            await storage.createMessage({
              gameId: player.gameId,
              playerId: null,
              role: "assistant",
              author: "Game Master",
              content: openingStory,
              diceRoll: null,
            });
          }
        }
      }
      
      res.json(character);
    } catch (error) {
      console.error("Character creation error:", error);
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
      
      if (allActed && allPlayers.length >= 2) {
        // Trigger AI response
        await storage.updateGameTurnPhase(gameId, "ai-processing");
        
        // Get all characters for context (fresh data)
        const allCharacters = await Promise.all(
          allPlayers.map(p => storage.getCharacterByPlayer(p.id))
        );
        const validCharacters = allCharacters.filter(Boolean) as any[];
        
        // Get all messages for context
        const allMessages = await storage.getMessagesByGame(gameId);
        
        // Build proper message format for the AI
        const systemPrompt = buildSystemPrompt(validCharacters);
        
        // Format conversation history properly
        const conversationHistory = allMessages.map(m => {
          if (m.role === "assistant") {
            // Strip out any character updates block for cleaner context
            const cleanContent = m.content.replace(/<<<CHARACTER_UPDATES>>>[\s\S]*?<<<END_UPDATES>>>/, "").trim();
            return { role: "assistant", content: cleanContent };
          } else {
            let msgContent = `**${m.author}**: ${m.content}`;
            if (m.diceRoll) {
              msgContent += ` *(Rolled ${m.diceRoll.dice}: **${m.diceRoll.result}** [${m.diceRoll.rolls.join(", ")}])*`;
            }
            return { role: "user", content: msgContent };
          }
        });
        
        // Combine consecutive user messages into one
        const consolidatedMessages: any[] = [];
        let currentUserMessages: string[] = [];
        
        for (const msg of conversationHistory) {
          if (msg.role === "user") {
            currentUserMessages.push(msg.content);
          } else {
            if (currentUserMessages.length > 0) {
              consolidatedMessages.push({
                role: "user",
                content: currentUserMessages.join("\n\n")
              });
              currentUserMessages = [];
            }
            consolidatedMessages.push(msg);
          }
        }
        if (currentUserMessages.length > 0) {
          consolidatedMessages.push({
            role: "user",
            content: currentUserMessages.join("\n\n")
          });
        }
        
        const aiMessages = [
          { role: "system", content: systemPrompt },
          ...consolidatedMessages
        ];
        
        try {
          const apiKey = process.env.OPENROUTER_API_KEY || "";
          let aiResponse = "";
          
          if (apiKey) {
            aiResponse = await callOpenRouter(aiMessages, apiKey);
          } else {
            // Fallback mock responses
            const names = validCharacters.map(c => c.name);
            const mockResponses = [
              `*The tavern keeper strokes his beard thoughtfully.*\n\n"Interesting..." he murmurs. "Very interesting indeed."\n\n*He leans in closer, checking that no one else is listening.*\n\n"If ye truly want to help, there's something ye should know. But first—can I trust ye?"\n\n**${names.join(" and ")}**, how do you respond?`,
              `*A cold draft sweeps through the tavern as the door swings open.*\n\nA cloaked figure enters, snow dusting their shoulders. They scan the room, and their gaze lingers on your table for just a moment too long.\n\n*The bard's music falters. Conversations quiet.*\n\n**${names.join(" and ")}**, what do you do?`,
              `The tavern keeper nods slowly.\n\n"Brave souls, the both of ye. Here's what I know—" He pulls out a *worn map* and spreads it on the bar.\n\n"The old mill, three miles east. Folk have been disappearing. The guard won't touch it. Too scared, if ye ask me."\n\n*He taps a spot on the map.*\n\n"Fifty gold pieces to whoever solves this mystery. Dead or alive... preferably alive."\n\n**${names.join(" and ")}**, do you accept this quest?`,
            ];
            aiResponse = mockResponses[Math.floor(Math.random() * mockResponses.length)];
          }
          
          // Parse for character updates
          const { narrative, updates } = parseCharacterUpdates(aiResponse);
          
          // Apply character updates if present
          if (updates) {
            await applyCharacterUpdates(gameId, updates, validCharacters);
          }
          
          // Decrement cooldowns for all characters (turn ended)
          await decrementCooldowns(gameId, validCharacters);
          
          // Create AI message with clean narrative
          await storage.createMessage({
            gameId,
            playerId: null,
            role: "assistant",
            author: "Game Master",
            content: narrative,
            diceRoll: null,
          });
          
        } catch (aiError) {
          console.error("AI Error:", aiError);
          await storage.createMessage({
            gameId,
            playerId: null,
            role: "assistant",
            author: "Game Master",
            content: "*The Game Master shuffles through their notes...*\n\nThe scene before you shimmers with possibility. What would you like to do next?",
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

  // Update character (for manual updates)
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

  // Start adventure (manually trigger opening story if not done yet)
  app.post("/api/games/:gameId/start", async (req, res) => {
    try {
      const { gameId } = req.params;
      
      const gamePlayers = await storage.getPlayersByGame(gameId);
      const allCharacters = await Promise.all(
        gamePlayers.map(p => storage.getCharacterByPlayer(p.id))
      );
      const validCharacters = allCharacters.filter(Boolean);
      
      if (validCharacters.length < 2) {
        return res.status(400).json({ error: "Not all players have created characters" });
      }
      
      const existingMessages = await storage.getMessagesByGame(gameId);
      if (existingMessages.length > 0) {
        return res.status(400).json({ error: "Adventure already started" });
      }
      
      const openingStory = generateOpeningStory(validCharacters);
      const message = await storage.createMessage({
        gameId,
        playerId: null,
        role: "assistant",
        author: "Game Master",
        content: openingStory,
        diceRoll: null,
      });
      
      res.json(message);
    } catch (error) {
      res.status(500).json({ error: "Failed to start adventure" });
    }
  });

  return httpServer;
}
