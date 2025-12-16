import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Minus, Sparkles } from "lucide-react";
import generatedBg from "@assets/generated_images/fantasy_tavern_interior_background_blurred.png";

const POINT_BUY_TOTAL = 27;
const BASE_STAT = 8;
const MIN_STAT = 8;
const MAX_STAT = 15;

const STAT_COSTS: Record<number, number> = {
  8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9
};

export default function CharacterCreation() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [gameState, setGameState] = useState<any>(null);
  
  const [name, setName] = useState("");
  const [race, setRace] = useState("");
  const [charClass, setCharClass] = useState("");
  const [stats, setStats] = useState({
    str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 8
  });

  useEffect(() => {
    loadGameState();
  }, []);

  const loadGameState = async () => {
    const gameId = localStorage.getItem("gameId");
    const sessionToken = localStorage.getItem("sessionToken");
    
    if (!gameId || !sessionToken) {
      toast({
        title: "Error",
        description: "No active game found. Returning to lobby...",
        variant: "destructive",
      });
      setTimeout(() => setLocation("/"), 2000);
      return;
    }

    try {
      const response = await fetch(`/api/games/${gameId}/state`);
      if (!response.ok) throw new Error("Failed to load game");
      
      const state = await response.json();
      setGameState(state);
      
      // Check if character already exists
      const myPlayer = state.players.find((p: any) => p.sessionToken === sessionToken);
      if (myPlayer) {
        const myCharacter = state.characters.find((c: any) => c.playerId === myPlayer.id);
        if (myCharacter) {
          // Character already created, go to game
          setLocation("/game");
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load game state",
        variant: "destructive",
      });
    }
  };

  const pointsSpent = Object.values(stats).reduce((sum, val) => sum + (STAT_COSTS[val] || 0), 0);
  const pointsRemaining = POINT_BUY_TOTAL - pointsSpent;

  const adjustStat = (stat: keyof typeof stats, delta: number) => {
    const newValue = stats[stat] + delta;
    if (newValue < MIN_STAT || newValue > MAX_STAT) return;
    
    const newStats = { ...stats, [stat]: newValue };
    const newCost = Object.values(newStats).reduce((sum, val) => sum + (STAT_COSTS[val] || 0), 0);
    
    if (newCost <= POINT_BUY_TOTAL) {
      setStats(newStats);
    }
  };

  const createCharacter = async () => {
    if (!name.trim() || !race.trim() || !charClass.trim()) {
      toast({
        title: "Incomplete",
        description: "Please fill in all character details",
        variant: "destructive",
      });
      return;
    }

    if (pointsRemaining !== 0) {
      toast({
        title: "Points Remaining",
        description: `You have ${pointsRemaining} points left to assign`,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const gameId = localStorage.getItem("gameId");
      const sessionToken = localStorage.getItem("sessionToken");
      
      // Get player ID
      const stateResponse = await fetch(`/api/games/${gameId}/state`);
      const state = await stateResponse.json();
      const myPlayer = state.players.find((p: any) => p.sessionToken === sessionToken);
      
      if (!myPlayer) throw new Error("Player not found");

      const response = await fetch("/api/characters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId: myPlayer.id,
          name: name.trim(),
          race: race.trim(),
          class: charClass.trim(),
          level: 1,
          hp: { current: 10 + stats.con, max: 10 + stats.con },
          mp: { current: 10 + stats.int, max: 10 + stats.int },
          stats,
          inventory: ["Adventurer's Pack", "50 Gold Coins"],
          status: "Healthy",
        }),
      });

      if (!response.ok) throw new Error("Failed to create character");

      toast({
        title: "Character Created!",
        description: `${name} is ready for adventure`,
      });

      // Go to game
      setTimeout(() => setLocation("/game"), 1000);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create character",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const statNames: Record<keyof typeof stats, string> = {
    str: "Strength",
    dex: "Dexterity",
    con: "Constitution",
    int: "Intelligence",
    wis: "Wisdom",
    cha: "Charisma"
  };

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden font-serif relative flex items-center justify-center p-4">
      {/* Background */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center pointer-events-none opacity-40 blur-sm scale-110"
        style={{ backgroundImage: `url(${generatedBg})` }}
      />

      <div className="relative z-10 w-full max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-fantasy text-primary tracking-wider drop-shadow-lg mb-2">
            Create Your Hero
          </h1>
          <p className="text-muted-foreground italic">Forge your legend in the Tavern Tales</p>
        </div>

        <Card className="bg-card/95 border-primary/20 p-8 backdrop-blur-xl">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Left: Basic Info */}
            <div className="space-y-6">
              <h2 className="text-2xl font-fantasy text-primary border-b border-primary/20 pb-2">Character Details</h2>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name" className="font-fantasy tracking-wide">Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter character name..."
                    className="bg-black/20 border-white/10 mt-2"
                    data-testid="input-character-name"
                  />
                </div>

                <div>
                  <Label htmlFor="race" className="font-fantasy tracking-wide">Race</Label>
                  <Input
                    id="race"
                    value={race}
                    onChange={(e) => setRace(e.target.value)}
                    placeholder="e.g., Human, Elf, Dwarf..."
                    className="bg-black/20 border-white/10 mt-2"
                    data-testid="input-character-race"
                  />
                </div>

                <div>
                  <Label htmlFor="class" className="font-fantasy tracking-wide">Class</Label>
                  <Input
                    id="class"
                    value={charClass}
                    onChange={(e) => setCharClass(e.target.value)}
                    placeholder="e.g., Warrior, Mage, Rogue..."
                    className="bg-black/20 border-white/10 mt-2"
                    data-testid="input-character-class"
                  />
                </div>
              </div>

              <div className="bg-primary/10 p-4 rounded-lg border border-primary/20 text-center">
                <div className="text-sm text-muted-foreground uppercase tracking-widest">Points Remaining</div>
                <div className="text-4xl font-fantasy text-primary mt-1" data-testid="text-points-remaining">
                  {pointsRemaining}
                </div>
                <div className="text-xs text-muted-foreground mt-1">of {POINT_BUY_TOTAL} total</div>
              </div>
            </div>

            {/* Right: Stats */}
            <div className="space-y-6">
              <h2 className="text-2xl font-fantasy text-primary border-b border-primary/20 pb-2">Ability Scores</h2>
              
              <div className="space-y-3">
                {(Object.keys(stats) as Array<keyof typeof stats>).map((stat) => (
                  <div key={stat} className="flex items-center justify-between bg-black/20 p-3 rounded-lg border border-white/10">
                    <div className="flex-1">
                      <div className="text-sm font-fantasy uppercase tracking-wider text-foreground">
                        {statNames[stat]}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Cost: {STAT_COSTS[stats[stat]]} pts
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => adjustStat(stat, -1)}
                        disabled={stats[stat] <= MIN_STAT}
                        className="h-8 w-8 rounded-full border-primary/30"
                        data-testid={`button-decrease-${stat}`}
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      
                      <div className="text-2xl font-fantasy text-primary w-12 text-center" data-testid={`text-stat-${stat}`}>
                        {stats[stat]}
                      </div>
                      
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => adjustStat(stat, 1)}
                        disabled={stats[stat] >= MAX_STAT || pointsRemaining < (STAT_COSTS[stats[stat] + 1] - STAT_COSTS[stats[stat]])}
                        className="h-8 w-8 rounded-full border-primary/30"
                        data-testid={`button-increase-${stat}`}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-white/10">
            <Button
              onClick={createCharacter}
              disabled={loading || !name.trim() || !race.trim() || !charClass.trim() || pointsRemaining !== 0}
              className="w-full h-14 text-lg font-fantasy bg-primary hover:bg-primary/90"
              data-testid="button-create-character"
            >
              {loading ? (
                <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Creating Character...</>
              ) : (
                <><Sparkles className="w-5 h-5 mr-2" /> Begin Adventure</>
              )}
            </Button>
          </div>
        </Card>

        {gameState && gameState.players.length > 1 && (
          <div className="mt-4 text-center text-sm text-muted-foreground">
            <span className="bg-primary/10 px-4 py-2 rounded-full border border-primary/20">
              {gameState.characters.length} / {gameState.players.length} heroes ready
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
