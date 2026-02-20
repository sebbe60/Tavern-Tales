import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Character, Message, TurnPhase } from "@/lib/game-types";
import { CharacterPanel } from "@/components/game/CharacterPanel";
import { ChatArea } from "@/components/game/ChatArea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Share2, Copy, Camera, Heart, ChevronUp, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { saveChatHistory, loadChatHistory } from "@/lib/storage";
import { cn } from "@/lib/utils";
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

  const [showShare, setShowShare] = useState(false);
  const [showAvatarUpload, setShowAvatarUpload] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState("");

  // Mobile sheet for character stats
  const [mobileSheet, setMobileSheet] = useState<"mine" | "other" | null>(null);

  // Connection status tracking
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "connecting" | "error">("connecting");
  const lastPollRef = useRef<number>(Date.now());

  const [pollInterval, setPollInterval] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const gameId = localStorage.getItem("gameId");

    const cached = loadChatHistory(gameId || "");
    if (cached) {
      setMessages(cached.map((m: any) => ({
        ...m,
        timestamp: new Date(m.timestamp).getTime(),
      })));
    }

    loadGameState();

    const interval = setInterval(() => {
      loadGameState(true);
    }, 3000);

    setPollInterval(interval);

    // Check connection staleness
    const connCheck = setInterval(() => {
      const age = Date.now() - lastPollRef.current;
      if (age > 8000) setConnectionStatus("error");
      else if (age > 4000) setConnectionStatus("connecting");
    }, 1000);

    return () => {
      clearInterval(interval);
      clearInterval(connCheck);
    };
  }, []);

  const loadGameState = async (silent = false) => {
    const gameId = localStorage.getItem("gameId");
    const sessionToken = localStorage.getItem("sessionToken");

    if (!gameId || !sessionToken) {
      if (!silent) {
        toast({ title: "Error", description: "No active game found", variant: "destructive" });
        setLocation("/");
      }
      return;
    }

    try {
      const response = await fetch(`/api/games/${gameId}/state`);
      if (!response.ok) throw new Error("Failed to load game");

      const state = await response.json();
      setGameState(state);
      lastPollRef.current = Date.now();
      setConnectionStatus("connected");

      const player = state.players.find((p: any) => p.sessionToken === sessionToken);
      setMyPlayer(player);

      if (player) {
        const char = state.characters.find((c: any) => c.playerId === player.id);
        if (char) {
          setMyCharacter(char);
        } else if (!silent) {
          setLocation("/character-creation");
          return;
        }
      }

      const otherPlayer = state.players.find((p: any) => p.sessionToken !== sessionToken);
      if (otherPlayer) {
        const otherChar = state.characters.find((c: any) => c.playerId === otherPlayer.id);
        setOtherCharacter(otherChar || null);
      } else {
        setOtherCharacter(null);
      }

      const formattedMessages = state.messages.map((m: any) => ({
        ...m,
        timestamp: new Date(m.timestamp).getTime(),
      }));
      setMessages(formattedMessages);

      saveChatHistory(gameId, state.messages);
      setTurnPhase(state.game.turnPhase);

    } catch (error) {
      setConnectionStatus("error");
      if (!silent) console.error("Failed to load game state:", error);
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
        body: JSON.stringify({ sessionToken, content }),
      });
      if (!response.ok) throw new Error("Failed to send message");
      setTimeout(() => loadGameState(), 500);
    } catch (error) {
      toast({ title: "Error", description: "Failed to send message", variant: "destructive" });
    }
  };

  const rollDice = async (diceNotation: string) => {
    try {
      const response = await fetch("/api/dice/roll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dice: diceNotation }),
      });
      if (!response.ok) throw new Error("Invalid dice format");

      const result = await response.json();
      toast({
        title: `🎲 Rolled ${result.dice}`,
        description: `Result: ${result.result}${result.rolls.length > 1 ? ` (${result.rolls.join(", ")})` : ""}`,
      });

      const gameId = localStorage.getItem("gameId");
      const sessionToken = localStorage.getItem("sessionToken");

      await fetch(`/api/games/${gameId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionToken, content: `Rolled ${result.dice}`, diceRoll: result }),
      });

      setTimeout(() => loadGameState(), 500);
    } catch (error) {
      toast({ title: "Error", description: "Invalid dice format. Use format like '2d20+5'", variant: "destructive" });
    }
  };

  const copyShareLink = () => {
    if (!gameState) return;
    const url = `${window.location.origin}/?code=${gameState.game.shareCode}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Copied!", description: "Share link copied to clipboard" });
  };

  const updateAvatar = async () => {
    if (!myCharacter || !avatarUrl.trim()) return;
    try {
      const response = await fetch(`/api/characters/${myCharacter.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar: avatarUrl.trim() }),
      });
      if (!response.ok) throw new Error("Failed to update avatar");
      toast({ title: "Avatar Updated!", description: "Your new avatar is now visible to everyone" });
      setShowAvatarUpload(false);
      setAvatarUrl("");
      loadGameState();
    } catch (error) {
      toast({ title: "Error", description: "Failed to update avatar", variant: "destructive" });
    }
  };

  const playerAvatars: Record<string, string | null> = {};
  if (myCharacter) playerAvatars[myCharacter.name] = myCharacter.avatar || null;
  if (otherCharacter) playerAvatars[otherCharacter.name] = otherCharacter.avatar || null;

  // Build per-player status for ChatArea
  const sessionToken = localStorage.getItem("sessionToken");
  const playerStatuses = gameState?.players.map((p: any) => {
    const char = gameState.characters.find((c: any) => c.playerId === p.id);
    return {
      name: char?.name ?? "Unknown",
      hasActed: p.hasActed,
      isCurrentUser: p.sessionToken === sessionToken,
    };
  }) ?? [];

  const waitingForCompanion = gameState && gameState.players.length < 2 || (gameState && !otherCharacter && messages.length === 0);

  if (!gameState || !myCharacter) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-4xl font-fantasy text-primary animate-pulse">Loading...</div>
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
      <div className="relative z-10 h-screen flex p-4 gap-4 pb-safe">

        {/* Left Panel - My Character */}
        <div className="hidden lg:block h-full">
          <CharacterPanel character={myCharacter} side="left" isCurrentUser={true} onAvatarClick={() => setShowAvatarUpload(true)} />
        </div>

        {/* Center - Chat */}
        <div className="flex-1 min-w-0 flex flex-col h-full">
          <ChatArea
            messages={messages}
            onSendMessage={handlePlayerAction}
            onRollDice={rollDice}
            turnPhase={turnPhase}
            pendingPlayers={pendingCount}
            currentPlayerName={myCharacter.name}
            playerAvatars={playerAvatars}
            players={playerStatuses}
            myHasActed={myPlayer?.hasActed ?? false}
            waitingForCompanion={waitingForCompanion}
            otherPlayerName={otherCharacter?.name}
          />
        </div>

        {/* Right Panel - Other Character */}
        <div className="hidden lg:block h-full">
          {otherCharacter ? (
            <CharacterPanel character={otherCharacter} side="right" isCurrentUser={false} />
          ) : (
            <div className="w-80 h-full bg-card/95 border-x-4 border-y-2 border-sidebar-border rounded-l-xl flex items-center justify-center p-8 text-center backdrop-blur-sm">
              <div className="space-y-4">
                <div className="text-6xl animate-bounce">🪑</div>
                <div className="font-fantasy text-primary text-lg">Awaiting Companion</div>
                <div className="text-sm text-muted-foreground">The tavern has an empty seat...</div>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-primary/30 text-primary text-xs"
                  onClick={() => setShowShare(true)}
                >
                  <Share2 className="w-3 h-3 mr-1" /> Invite Companion
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile bottom bar — character HP chips (visible on < lg) */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-black/90 border-t border-white/10 backdrop-blur-xl px-4 py-2 flex gap-3 items-center">
        {/* My character chip */}
        <button
          onClick={() => setMobileSheet(mobileSheet === "mine" ? null : "mine")}
          className="flex-1 flex items-center gap-2 bg-black/40 border border-primary/20 rounded-lg px-3 py-1.5 text-xs"
        >
          <img
            src={myCharacter.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(myCharacter.name)}&background=random`}
            alt={myCharacter.name}
            className="w-6 h-6 rounded-full object-cover border border-primary/30"
          />
          <span className="font-fantasy text-primary truncate">{myCharacter.name}</span>
          <Heart className="w-3 h-3 text-red-400 ml-auto" />
          <span className="text-red-300">{myCharacter.hp.current}/{myCharacter.hp.max}</span>
          <ChevronUp className={cn("w-3 h-3 text-muted-foreground transition-transform", mobileSheet === "mine" && "rotate-180")} />
        </button>

        {/* Other character chip */}
        {otherCharacter ? (
          <button
            onClick={() => setMobileSheet(mobileSheet === "other" ? null : "other")}
            className="flex-1 flex items-center gap-2 bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-xs"
          >
            <img
              src={otherCharacter.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(otherCharacter.name)}&background=random`}
              alt={otherCharacter.name}
              className="w-6 h-6 rounded-full object-cover border border-white/20"
            />
            <span className="font-fantasy text-muted-foreground truncate">{otherCharacter.name}</span>
            <Heart className="w-3 h-3 text-red-400 ml-auto" />
            <span className="text-red-300">{otherCharacter.hp.current}/{otherCharacter.hp.max}</span>
            <ChevronUp className={cn("w-3 h-3 text-muted-foreground transition-transform", mobileSheet === "other" && "rotate-180")} />
          </button>
        ) : (
          <div className="flex-1 flex items-center justify-center gap-2 bg-black/20 border border-white/5 rounded-lg px-3 py-1.5 text-xs text-muted-foreground">
            🪑 Awaiting companion...
          </div>
        )}
      </div>

      {/* Mobile slide-up character sheet */}
      {mobileSheet && (
        <div className="lg:hidden fixed inset-x-0 bottom-14 z-50 bg-card/98 border-t border-primary/20 backdrop-blur-xl overflow-y-auto max-h-[70vh] rounded-t-2xl shadow-2xl">
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <span className="font-fantasy text-primary">
              {mobileSheet === "mine" ? myCharacter.name : otherCharacter?.name}
            </span>
            <button onClick={() => setMobileSheet(null)} className="text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-4">
            {mobileSheet === "mine" && (
              <CharacterPanel character={myCharacter} side="left" isCurrentUser={true} onAvatarClick={() => { setMobileSheet(null); setShowAvatarUpload(true); }} />
            )}
            {mobileSheet === "other" && otherCharacter && (
              <CharacterPanel character={otherCharacter} side="right" isCurrentUser={false} />
            )}
          </div>
        </div>
      )}

      {/* Floating Controls */}
      <div className="fixed top-4 right-4 z-50 flex gap-2 items-center">
        {/* Connection status dot */}
        <div
          className={cn(
            "w-2.5 h-2.5 rounded-full transition-all",
            connectionStatus === "connected" && "bg-green-400",
            connectionStatus === "connecting" && "bg-yellow-400 animate-pulse",
            connectionStatus === "error" && "bg-red-500 animate-pulse"
          )}
          title={connectionStatus === "connected" ? "Connected" : connectionStatus === "connecting" ? "Reconnecting..." : "Connection lost"}
        />

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

      {/* Avatar Upload Dialog */}
      <Dialog open={showAvatarUpload} onOpenChange={setShowAvatarUpload}>
        <DialogContent className="bg-card/95 border-primary/20 text-foreground backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="font-fantasy text-2xl text-primary">Change Your Avatar</DialogTitle>
            <DialogDescription>
              Enter a URL to an image to use as your character's avatar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="flex justify-center">
              <div className="w-24 h-24 rounded-full border-4 border-primary/50 overflow-hidden bg-black/40">
                <img
                  src={avatarUrl || myCharacter?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(myCharacter?.name || "")}&background=random`}
                  alt="Preview"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(myCharacter?.name || "")}&background=random`;
                  }}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="avatarUrl" className="font-fantasy">Image URL</Label>
              <Input
                id="avatarUrl"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://example.com/my-avatar.png"
                className="bg-black/20 border-white/10 mt-2"
                data-testid="input-avatar-url"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Tip: Use image hosting services like Imgur, Discord CDN, or any direct image URL.
            </p>
            <Button onClick={updateAvatar} disabled={!avatarUrl.trim()} className="w-full bg-primary font-fantasy" data-testid="button-save-avatar">
              <Camera className="w-4 h-4 mr-2" /> Save Avatar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
