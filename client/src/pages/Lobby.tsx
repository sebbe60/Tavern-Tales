import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Scroll, Copy, Check, Swords } from "lucide-react";
import generatedBg from "@assets/generated_images/fantasy_tavern_interior_background_blurred.png";

export default function Lobby() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [gameId, setGameId] = useState("");
  const [shareCode, setShareCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check if there's a game code in the URL
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (code) {
      setJoinCode(code);
    }
  }, []);

  const createNewGame = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      
      if (!response.ok) throw new Error("Failed to create game");
      
      const game = await response.json();
      setGameId(game.id);
      setShareCode(game.shareCode);
      
      // Join as first player
      const joinResponse = await fetch(`/api/games/${game.id}/join`, {
        method: "POST",
      });
      
      if (!joinResponse.ok) throw new Error("Failed to join game");
      
      const { sessionToken } = await joinResponse.json();
      localStorage.setItem("sessionToken", sessionToken);
      localStorage.setItem("gameId", game.id);
      
      toast({
        title: "Game Created!",
        description: "Share the code with your companion to begin.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create game. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const joinExistingGame = async () => {
    if (!joinCode.trim()) {
      toast({
        title: "Invalid Code",
        description: "Please enter a game code.",
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);
    try {
      // First get the game by share code
      const gameResponse = await fetch(`/api/games/${joinCode.toUpperCase()}`);
      if (!gameResponse.ok) throw new Error("Game not found");
      
      const game = await gameResponse.json();
      
      // Join the game
      const joinResponse = await fetch(`/api/games/${game.id}/join`, {
        method: "POST",
      });
      
      if (!joinResponse.ok) {
        const error = await joinResponse.json();
        throw new Error(error.error || "Failed to join game");
      }
      
      const { sessionToken } = await joinResponse.json();
      localStorage.setItem("sessionToken", sessionToken);
      localStorage.setItem("gameId", game.id);
      
      // Go to character creation
      setLocation("/character-creation");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to join game",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyShareCode = () => {
    const url = `${window.location.origin}/?code=${shareCode}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast({
      title: "Copied!",
      description: "Share link copied to clipboard",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const goToCharacterCreation = () => {
    setLocation("/character-creation");
  };

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden font-serif relative flex items-center justify-center">
      {/* Background */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center pointer-events-none opacity-40 blur-sm scale-110"
        style={{ backgroundImage: `url(${generatedBg})` }}
      />
      
      {/* Noise Overlay */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-[0.03]" />

      {/* Main Content */}
      <div className="relative z-10 w-full max-w-4xl p-8">
        <div className="text-center mb-12 space-y-4">
          <div className="flex justify-center mb-6">
            <Swords className="w-20 h-20 text-primary" />
          </div>
          <h1 className="text-6xl font-fantasy text-primary tracking-wider drop-shadow-lg">
            Tavern Tales
          </h1>
          <p className="text-xl text-muted-foreground font-serif italic">
            Gather your party and embark on an epic adventure
          </p>
        </div>

        {!gameId ? (
          <div className="grid md:grid-cols-2 gap-8">
            {/* Create New Game */}
            <Card className="bg-card/95 border-primary/20 p-8 backdrop-blur-xl space-y-6">
              <div className="text-center space-y-2">
                <Scroll className="w-12 h-12 text-primary mx-auto" />
                <h2 className="text-2xl font-fantasy text-primary">Start New Quest</h2>
                <p className="text-sm text-muted-foreground">
                  Create a new adventure and invite a companion
                </p>
              </div>
              
              <Button 
                onClick={createNewGame}
                disabled={loading}
                className="w-full h-14 text-lg font-fantasy bg-primary hover:bg-primary/90"
                data-testid="button-create-game"
              >
                {loading ? "Creating..." : "Create New Game"}
              </Button>
            </Card>

            {/* Join Existing Game */}
            <Card className="bg-card/95 border-primary/20 p-8 backdrop-blur-xl space-y-6">
              <div className="text-center space-y-2">
                <Swords className="w-12 h-12 text-accent mx-auto" />
                <h2 className="text-2xl font-fantasy text-primary">Join Quest</h2>
                <p className="text-sm text-muted-foreground">
                  Enter the code shared by your Game Master
                </p>
              </div>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="joinCode" className="font-fantasy tracking-wide">Game Code</Label>
                  <Input
                    id="joinCode"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="Enter code..."
                    className="bg-black/20 border-white/10 text-center text-2xl tracking-widest font-mono uppercase mt-2"
                    data-testid="input-join-code"
                  />
                </div>
                
                <Button 
                  onClick={joinExistingGame}
                  disabled={loading || !joinCode.trim()}
                  className="w-full h-14 text-lg font-fantasy bg-accent hover:bg-accent/90"
                  data-testid="button-join-game"
                >
                  {loading ? "Joining..." : "Join Adventure"}
                </Button>
              </div>
            </Card>
          </div>
        ) : (
          <Card className="bg-card/95 border-primary/20 p-8 backdrop-blur-xl space-y-8 max-w-2xl mx-auto">
            <div className="text-center space-y-4">
              <div className="inline-block p-4 bg-primary/10 rounded-full border-2 border-primary/30">
                <Scroll className="w-16 h-16 text-primary" />
              </div>
              <h2 className="text-3xl font-fantasy text-primary">Game Created!</h2>
              <p className="text-muted-foreground">
                Share this code with your companion to begin the adventure
              </p>
            </div>

            <div className="space-y-4">
              <div className="bg-black/40 p-6 rounded-lg border border-primary/20 text-center">
                <Label className="text-sm text-muted-foreground uppercase tracking-widest">Share Code</Label>
                <div className="text-5xl font-mono font-bold text-primary mt-3 tracking-[0.3em]" data-testid="text-share-code">
                  {shareCode}
                </div>
              </div>

              <div className="flex gap-4">
                <Button
                  onClick={copyShareCode}
                  variant="outline"
                  className="flex-1 h-12 font-fantasy border-primary/30 hover:bg-primary/10"
                  data-testid="button-copy-code"
                >
                  {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                  {copied ? "Copied!" : "Copy Link"}
                </Button>

                <Button
                  onClick={goToCharacterCreation}
                  className="flex-1 h-12 font-fantasy bg-primary hover:bg-primary/90"
                  data-testid="button-continue"
                >
                  Continue to Character Creation
                </Button>
              </div>
            </div>

            <div className="text-center text-sm text-muted-foreground pt-4 border-t border-white/5">
              Waiting for your companion to join...
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
