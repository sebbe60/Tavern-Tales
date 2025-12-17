import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Minus, Sparkles } from "lucide-react";
import generatedBg from "@assets/generated_images/fantasy_tavern_interior_background_blurred.png";

// Stats start at 1, no limits
const BASE_STAT = 1;

// All available stats - core D&D stats plus extras
const ALL_STATS = {
  str: { name: "Strength", description: "Physical power and melee combat" },
  dex: { name: "Dexterity", description: "Agility, reflexes, and finesse" },
  con: { name: "Constitution", description: "Health, stamina, and endurance" },
  int: { name: "Intelligence", description: "Reasoning and magical ability" },
  wis: { name: "Wisdom", description: "Perception and intuition" },
  cha: { name: "Charisma", description: "Force of personality" },
  luck: { name: "Luck", description: "Fortune and chance" },
  per: { name: "Perception", description: "Awareness and senses" },
  agi: { name: "Agility", description: "Speed and nimbleness" },
  end: { name: "Endurance", description: "Stamina and resilience" },
};

type StatKey = keyof typeof ALL_STATS;

export default function CharacterCreation() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [gameState, setGameState] = useState<any>(null);
  
  const [name, setName] = useState("");
  const [race, setRace] = useState("");
  const [charClass, setCharClass] = useState("");
  
  // All stats start at 1, no limits
  const [stats, setStats] = useState<Record<StatKey, number>>({
    str: 1, dex: 1, con: 1, int: 1, wis: 1, cha: 1,
    luck: 1, per: 1, agi: 1, end: 1
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
      
      const myPlayer = state.players.find((p: any) => p.sessionToken === sessionToken);
      if (myPlayer) {
        const myCharacter = state.characters.find((c: any) => c.playerId === myPlayer.id);
        if (myCharacter) {
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

  const adjustStat = (stat: StatKey, delta: number) => {
    const newValue = stats[stat] + delta;
    if (newValue < 1) return; // Minimum is 1
    setStats(prev => ({ ...prev, [stat]: newValue }));
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

    setLoading(true);
    try {
      const gameId = localStorage.getItem("gameId");
      const sessionToken = localStorage.getItem("sessionToken");
      
      const stateResponse = await fetch(`/api/games/${gameId}/state`);
      const state = await stateResponse.json();
      const myPlayer = state.players.find((p: any) => p.sessionToken === sessionToken);
      
      if (!myPlayer) throw new Error("Player not found");

      // Calculate HP based on CON and class, MP based on INT
      const baseHp = 10 + stats.con * 2;
      const baseMp = 5 + stats.int * 2;

      const response = await fetch("/api/characters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId: myPlayer.id,
          name: name.trim(),
          race: race.trim(),
          class: charClass.trim(),
          level: 1,
          xp: 0,
          xpToNextLevel: 100,
          hp: { current: baseHp, max: baseHp },
          mp: { current: baseMp, max: baseMp },
          stats: {
            str: stats.str,
            dex: stats.dex,
            con: stats.con,
            int: stats.int,
            wis: stats.wis,
            cha: stats.cha,
            luck: stats.luck,
            per: stats.per,
            agi: stats.agi,
            end: stats.end,
          },
          statusEffects: [],
          abilities: [],
          inventory: [],
        }),
      });

      if (!response.ok) throw new Error("Failed to create character");

      toast({
        title: "Character Created!",
        description: `${name} is ready for adventure`,
      });

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

  const totalPoints = Object.values(stats).reduce((sum, val) => sum + val, 0);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden font-serif relative flex items-center justify-center p-4">
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center pointer-events-none opacity-40 blur-sm scale-110"
        style={{ backgroundImage: `url(${generatedBg})` }}
      />

      <div className="relative z-10 w-full max-w-5xl">
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
                <div className="text-sm text-muted-foreground uppercase tracking-widest">Total Stat Points</div>
                <div className="text-4xl font-fantasy text-primary mt-1" data-testid="text-total-points">
                  {totalPoints}
                </div>
                <div className="text-xs text-muted-foreground mt-1">No limits - assign freely!</div>
              </div>

              <div className="bg-black/20 p-4 rounded-lg border border-white/10 text-sm text-muted-foreground space-y-2">
                <p className="font-fantasy text-primary">How it works:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>All stats start at 1</li>
                  <li>No point limits - customize freely</li>
                  <li>The AI Game Master will adjust your HP, MP, XP, inventory, and skills during the adventure!</li>
                </ul>
              </div>
            </div>

            {/* Right: Stats */}
            <div className="space-y-6">
              <h2 className="text-2xl font-fantasy text-primary border-b border-primary/20 pb-2">Ability Scores</h2>
              
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                {(Object.keys(ALL_STATS) as StatKey[]).map((stat) => (
                  <div key={stat} className="flex items-center justify-between bg-black/20 p-3 rounded-lg border border-white/10">
                    <div className="flex-1">
                      <div className="text-sm font-fantasy uppercase tracking-wider text-foreground">
                        {ALL_STATS[stat].name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {ALL_STATS[stat].description}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => adjustStat(stat, -1)}
                        disabled={stats[stat] <= 1}
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
              disabled={loading || !name.trim() || !race.trim() || !charClass.trim()}
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
