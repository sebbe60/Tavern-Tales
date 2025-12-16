import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Character, Message, TurnPhase } from "@/lib/game-types";
import { CharacterPanel } from "@/components/game/CharacterPanel";
import { ChatArea } from "@/components/game/ChatArea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings, Share2, Copy, Dices } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import generatedBg from "@assets/generated_images/fantasy_tavern_interior_background_blurred.png";

export default function GamePage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [gameState, setGameState] = useState<any>(null);
  const [myCharacter, setMyCharacter] = useState<Character | null>(null);
  const [otherCharacter, setOtherCharacter] = useState<Character | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [turnPhase, setTurnPhase] = useState<TurnPhase>("waiting-for-players");
  const [myPlayer, setMyPlayer] = useState<any>(null);
  
  const [showSettings, setShowSettings] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showDice, setShowDice] = useState(false);
  const [diceInput, setDiceInput] = useState("1d20");
  
  const [pollInterval, setPollInterval] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadGameState();
    
    // Poll for updates every 3 seconds
    const interval = setInterval(() => {
      loadGameState(true); // silent refresh
    }, 3000);
    
    setPollInterval(interval);
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, []);

  const loadGameState = async (silent = false) => {
    const gameId = localStorage.getItem("gameId");
    const sessionToken = localStorage.getItem("sessionToken");
    
    if (!gameId || !sessionToken) {
      if (!silent) {
        toast({
          title: "Error",
          description: "No active game found",
          variant: "destructive",
        });
        setLocation("/");
      }
      return;
    }

    try {
      const response = await fetch(`/api/games/${gameId}/state`);
      if (!response.ok) throw new Error("Failed to load game");
      
      const state = await response.json();
      setGameState(state);
      
      // Find my player and character
      const player = state.players.find((p: any) => p.sessionToken === sessionToken);
      setMyPlayer(player);
      
      if (player) {
        const char = state.characters.find((c: any) => c.playerId === player.id);
        if (char) {
          setMyCharacter(char);
        } else if (!silent) {
          // No character yet, redirect to creation
          setLocation("/character-creation");
          return;
        }
      }
      
      // Find other character
      const otherPlayer = state.players.find((p: any) => p.sessionToken !== sessionToken);
      if (otherPlayer) {
        const otherChar = state.characters.find((c: any) => c.playerId === otherPlayer.id);
        if (otherChar) {
          setOtherCharacter(otherChar);
        }
      }
      
      // Update messages
      setMessages(state.messages.map((m: any) => ({
        ...m,
        timestamp: new Date(m.timestamp).getTime()
      })));
      
      // Update turn phase
      setTurnPhase(state.game.turnPhase);
      
    } catch (error) {
      if (!silent) {
        console.error("Failed to load game state:", error);
      }
    }
  };

  const handlePlayerAction = async (content: string) => {
    const gameId = localStorage.getItem("gameId");
    const sessionToken = localStorage.getItem("sessionToken");
    
    if (!gameId || !sessionToken) return;

    try {
      const response = await fetch(`/api/games/${gameId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionToken,
          content,
        }),
      });

      if (!response.ok) throw new Error("Failed to send message");
      
      // Refresh game state
      setTimeout(() => loadGameState(), 500);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    }
  };

  const rollDice = async () => {
    try {
      const response = await fetch("/api/dice/roll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dice: diceInput }),
      });

      if (!response.ok) throw new Error("Invalid dice format");
      
      const result = await response.json();
      
      toast({
        title: `🎲 Rolled ${result.dice}`,
        description: `Result: ${result.result} (${result.rolls.join(", ")})`,
      });

      // Send as message
      const gameId = localStorage.getItem("gameId");
      const sessionToken = localStorage.getItem("sessionToken");
      
      await fetch(`/api/games/${gameId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionToken,
          content: `Rolled ${result.dice}`,
          diceRoll: result,
        }),
      });

      setShowDice(false);
      setTimeout(() => loadGameState(), 500);
    } catch (error) {
      toast({
        title: "Error",
        description: "Invalid dice format. Use format like '2d20+5'",
        variant: "destructive",
      });
    }
  };

  const copyShareLink = () => {
    if (!gameState) return;
    const url = `${window.location.origin}/?code=${gameState.game.shareCode}`;
    navigator.clipboard.writeText(url);
    toast({
      title: "Copied!",
      description: "Share link copied to clipboard",
    });
  };

  if (!gameState || !myCharacter) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-4xl font-fantasy text-primary">Loading...</div>
          <div className="text-muted-foreground">Preparing your adventure</div>
        </div>
      </div>
    );
  }

  const pendingCount = gameState.players.filter((p: any) => !p.hasActed).length;

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden font-serif relative">
      {/* Background Image */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center pointer-events-none opacity-40 blur-sm scale-110"
        style={{ backgroundImage: `url(${generatedBg})` }}
      />
      
      {/* Noise Overlay */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-[0.03] bg-repeat bg-[length:128px_128px]" style={{ backgroundImage: "url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAMAAAD04JH5AAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyJpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+/Pp/mixwAABgZSFFydGGBkZIQAUAHj///3/8///4888ohLHKq44f///x955JGPP/74+P///4888sgjjzzyCCMAAQYAvzkSc4s0lBMAAAAASUVORK5CYII=')" }} />

      {/* Main Content Grid */}
      <div className="relative z-10 h-screen flex p-4 gap-4">
        
        {/* Left Panel - My Character */}
        <div className="hidden lg:block h-full">
           <CharacterPanel character={myCharacter} side="left" isCurrentUser={true} />
        </div>

        {/* Center - Chat */}
        <div className="flex-1 min-w-0 flex flex-col h-full">
           <ChatArea 
             messages={messages} 
             onSendMessage={handlePlayerAction}
             turnPhase={turnPhase}
             pendingPlayers={pendingCount}
             currentPlayerName={myCharacter.name}
           />
        </div>

        {/* Right Panel - Other Character */}
        <div className="hidden lg:block h-full">
           {otherCharacter ? (
             <CharacterPanel character={otherCharacter} side="right" isCurrentUser={false} />
           ) : (
             <div className="w-80 h-full bg-card/95 border-x-4 border-y-2 border-sidebar-border rounded-l-xl flex items-center justify-center p-8 text-center backdrop-blur-sm">
               <div className="space-y-4">
                 <div className="text-6xl">🪑</div>
                 <div className="font-fantasy text-primary text-lg">Awaiting Companion</div>
                 <div className="text-sm text-muted-foreground">The tavern has an empty seat...</div>
               </div>
             </div>
           )}
        </div>
      </div>

      {/* Floating Controls */}
      <div className="fixed top-4 right-4 z-50 flex gap-2">
        <Button 
          variant="outline" 
          size="icon" 
          className="bg-black/40 border-primary/30 text-primary hover:bg-primary/20 backdrop-blur-md"
          onClick={() => setShowDice(true)}
          data-testid="button-dice"
        >
          <Dices className="w-4 h-4" />
        </Button>

        <Dialog open={showShare} onOpenChange={setShowShare}>
          <Button 
            variant="outline" 
            size="icon" 
            className="bg-black/40 border-primary/30 text-primary hover:bg-primary/20 backdrop-blur-md"
            onClick={() => setShowShare(true)}
            data-testid="button-share"
          >
            <Share2 className="w-4 h-4" />
          </Button>
          <DialogContent className="bg-card/95 border-primary/20 text-foreground backdrop-blur-xl">
            <DialogHeader>
              <DialogTitle className="font-fantasy text-2xl text-primary">Invite a Companion</DialogTitle>
              <DialogDescription>
                Share this code with your friend to join the adventure.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="bg-black/40 p-4 rounded border border-primary/20 text-center">
                <div className="text-3xl font-mono font-bold text-primary tracking-[0.3em]">
                  {gameState?.game.shareCode}
                </div>
              </div>
              <Button onClick={copyShareLink} className="w-full bg-primary font-fantasy">
                <Copy className="w-4 h-4 mr-2" /> Copy Link
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Dice Roller Dialog */}
      <Dialog open={showDice} onOpenChange={setShowDice}>
        <DialogContent className="bg-card/95 border-primary/20 text-foreground backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="font-fantasy text-2xl text-primary">Roll the Dice</DialogTitle>
            <DialogDescription>
              Enter dice notation (e.g., 1d20, 2d6+3, 4d8-2)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="diceInput" className="font-fantasy">Dice Formula</Label>
              <Input
                id="diceInput"
                value={diceInput}
                onChange={(e) => setDiceInput(e.target.value)}
                placeholder="1d20"
                className="bg-black/20 border-white/10 text-center text-xl font-mono mt-2"
                data-testid="input-dice"
              />
            </div>
            <div className="grid grid-cols-4 gap-2">
              {["1d4", "1d6", "1d8", "1d10", "1d12", "1d20", "2d6", "1d100"].map((dice) => (
                <Button
                  key={dice}
                  variant="outline"
                  size="sm"
                  onClick={() => setDiceInput(dice)}
                  className="font-mono border-primary/30"
                  data-testid={`button-dice-${dice}`}
                >
                  {dice}
                </Button>
              ))}
            </div>
            <Button onClick={rollDice} className="w-full bg-primary font-fantasy" data-testid="button-roll">
              <Dices className="w-4 h-4 mr-2" /> Roll!
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
