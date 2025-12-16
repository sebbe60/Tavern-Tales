import React, { useState, useEffect } from "react";
import { Character, Message, TurnPhase } from "@/lib/game-types";
import { CharacterPanel } from "@/components/game/CharacterPanel";
import { ChatArea } from "@/components/game/ChatArea";
import { generateAIResponse } from "@/lib/ai-service";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings, Share2, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import generatedBg from "@assets/generated_images/fantasy_tavern_interior_background_blurred.png";

// Mock Data Initialization
const INITIAL_PLAYER: Character = {
  id: "p1",
  name: "Kaelen Shadowstrider",
  class: "Rogue",
  level: 3,
  hp: { current: 24, max: 28 },
  mp: { current: 10, max: 15 },
  stats: { str: 12, dex: 18, con: 14, int: 10, wis: 12, cha: 14 },
  inventory: ["Dagger +1", "Thieves Tools", "Potion of Healing (2)", "Smoke Bomb"],
  avatar: "",
  status: "Stealthed"
};

const INITIAL_FRIEND: Character = {
  id: "p2",
  name: "Elara Moonweaver",
  class: "Cleric",
  level: 3,
  hp: { current: 32, max: 32 },
  mp: { current: 22, max: 30 },
  stats: { str: 10, dex: 12, con: 14, int: 14, wis: 18, cha: 12 },
  inventory: ["Mace of Light", "Holy Symbol", "Scroll of Revivify", "Rations"],
  avatar: "",
  status: "Blessing of Light"
};

const INITIAL_MESSAGES: Message[] = [
  {
    id: "system-1",
    role: "assistant",
    author: "Game Master",
    content: "Welcome, weary travelers. You find yourselves in 'The Rusty Tankard', a tavern known for its sour ale but excellent rumors. The air is thick with smoke and the smell of roasted boar. A cloaked figure in the corner beckons you over.",
    timestamp: Date.now()
  }
];

export default function TavernPage() {
  const { toast } = useToast();
  
  // State
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [turnPhase, setTurnPhase] = useState<TurnPhase>("waiting-for-players");
  const [playerMoves, setPlayerMoves] = useState<{ p1: boolean; p2: boolean }>({ p1: false, p2: false });
  const [apiKey, setApiKey] = useState<string>("");
  const [showSettings, setShowSettings] = useState(false);
  const [showShare, setShowShare] = useState(false);
  
  // For prototype: Toggle who is "acting" to simulate two players
  const [activePlayerId, setActivePlayerId] = useState<"p1" | "p2">("p1");

  // Load API key from storage
  useEffect(() => {
    const stored = localStorage.getItem("openrouter_key");
    if (stored) setApiKey(stored);
  }, []);

  const handleSaveSettings = (key: string) => {
    setApiKey(key);
    localStorage.setItem("openrouter_key", key);
    setShowSettings(false);
    toast({
      title: "Settings Saved",
      description: "API Key has been updated.",
    });
  };

  const handlePlayerAction = async (content: string) => {
    // Add player message
    const currentPlayer = activePlayerId === "p1" ? INITIAL_PLAYER : INITIAL_FRIEND;
    const newMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      author: currentPlayer.name,
      content,
      timestamp: Date.now()
    };
    
    setMessages(prev => [...prev, newMessage]);
    
    // Mark player as moved
    const newMoves = { ...playerMoves, [activePlayerId]: true };
    setPlayerMoves(newMoves);

    // Switch active player for prototype convenience (hotseat)
    if (!newMoves.p1 || !newMoves.p2) {
      setActivePlayerId(activePlayerId === "p1" ? "p2" : "p1");
      toast({
        title: "Turn Complete",
        description: `Waiting for ${activePlayerId === "p1" ? INITIAL_FRIEND.name : INITIAL_PLAYER.name} to act.`,
      });
    }

    // Check if both moved
    if (newMoves.p1 && newMoves.p2) {
      setTurnPhase("ai-processing");
      setPlayerMoves({ p1: false, p2: false }); // Reset for next turn
      
      // Trigger AI
      const responseContent = await generateAIResponse([...messages, newMessage], apiKey);
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        author: "Game Master",
        content: responseContent,
        timestamp: Date.now()
      };
      
      setMessages(prev => [...prev, aiMessage]);
      setTurnPhase("waiting-for-players");
      setActivePlayerId("p1"); // Reset to P1 start
    }
  };

  const pendingCount = (playerMoves.p1 ? 0 : 1) + (playerMoves.p2 ? 0 : 1);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden font-serif relative">
      {/* Background Image */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center pointer-events-none opacity-40 blur-sm scale-110"
        style={{ backgroundImage: `url(${generatedBg})` }}
      />
      
      {/* Noise Overlay */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-[0.03] bg-repeat bg-[length:128px_128px]" style={{ backgroundImage: "url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAMAAAD04JH5AAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyJpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+/Pp/mixwAABgZSURBVHjaYmBgYGBkZIQAUAHj///3/8///4888ohLHKq44f///x955JGPP/74+P///4888sgjjzzyCCMAAQYAvzkSc4s0lBMAAAAASUVORK5CYII=')" }} />

      {/* Main Content Grid */}
      <div className="relative z-10 h-screen flex p-4 gap-4">
        
        {/* Left Panel - Player 1 */}
        <div className="hidden lg:block h-full">
           <CharacterPanel character={INITIAL_PLAYER} side="left" isCurrentUser={true} />
        </div>

        {/* Center - Chat */}
        <div className="flex-1 min-w-0 flex flex-col h-full">
           <ChatArea 
             messages={messages} 
             onSendMessage={handlePlayerAction}
             turnPhase={turnPhase}
             pendingPlayers={pendingCount}
             currentPlayerName={activePlayerId === "p1" ? INITIAL_PLAYER.name : INITIAL_FRIEND.name}
           />
        </div>

        {/* Right Panel - Player 2 */}
        <div className="hidden lg:block h-full">
           <CharacterPanel character={INITIAL_FRIEND} side="right" isCurrentUser={false} />
        </div>
      </div>

      {/* Floating Controls */}
      <div className="fixed top-4 right-4 z-50 flex gap-2">
        <Dialog open={showShare} onOpenChange={setShowShare}>
          <DialogTrigger asChild>
            <Button variant="outline" size="icon" className="bg-black/40 border-primary/30 text-primary hover:bg-primary/20 backdrop-blur-md">
              <Share2 className="w-4 h-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card/95 border-primary/20 text-foreground backdrop-blur-xl">
            <DialogHeader>
              <DialogTitle className="font-fantasy text-2xl text-primary">Invite a Companion</DialogTitle>
              <DialogDescription>
                Share this magical rune (link) with your friend to join the adventure.
              </DialogDescription>
            </DialogHeader>
            <div className="flex gap-2 mt-4">
              <Input readOnly value="https://taverntales.replit.app/join/rune-7291" className="bg-black/20 border-white/10 font-mono text-xs" />
              <Button size="icon" variant="secondary" onClick={() => {
                toast({ title: "Copied!", description: "Link copied to clipboard." });
                setShowShare(false);
              }}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showSettings} onOpenChange={setShowSettings}>
          <DialogTrigger asChild>
            <Button variant="outline" size="icon" className="bg-black/40 border-primary/30 text-primary hover:bg-primary/20 backdrop-blur-md">
              <Settings className="w-4 h-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card/95 border-primary/20 text-foreground backdrop-blur-xl">
            <DialogHeader>
              <DialogTitle className="font-fantasy text-2xl text-primary">Game Master Settings</DialogTitle>
              <DialogDescription>
                Configure the AI storyteller. Enter your OpenRouter API key to enable real generation.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="apiKey" className="font-fantasy tracking-wide">OpenRouter API Key</Label>
                <Input 
                  id="apiKey" 
                  placeholder="sk-or-..." 
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="bg-black/20 border-white/10"
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty to use the "Mock GM" (simulated responses).
                  Key is stored locally in your browser.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => handleSaveSettings(apiKey)} className="bg-primary text-primary-foreground font-fantasy">
                Save Configuration
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Mobile Character Toggles (Visible only on small screens) */}
      <div className="lg:hidden fixed bottom-24 right-4 flex flex-col gap-2 z-40">
        {/* Simplified mobile controls could go here if needed */}
      </div>
    </div>
  );
}
