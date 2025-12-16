import React from "react";
import { Character } from "@/lib/game-types";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Shield, Zap, Backpack, Heart } from "lucide-react";
import { cn } from "@/lib/utils";

interface CharacterPanelProps {
  character: Character;
  side: "left" | "right";
  isCurrentUser?: boolean;
}

export function CharacterPanel({ character, side, isCurrentUser }: CharacterPanelProps) {
  return (
    <div 
      className={cn(
        "flex flex-col h-full bg-card/95 border-x-4 border-y-2 border-sidebar-border shadow-2xl backdrop-blur-sm transition-all duration-500",
        "w-80 relative overflow-hidden group",
        side === "left" ? "rounded-r-xl border-l-0" : "rounded-l-xl border-r-0"
      )}
    >
      {/* Background Texture Overlay */}
      <div className="absolute inset-0 bg-[url('@assets/generated_images/aged_parchment_paper_texture.png')] opacity-10 pointer-events-none mix-blend-overlay" />

      {/* Header / Avatar Section */}
      <div className="relative p-6 text-center space-y-2 border-b-2 border-border/50">
        <div className="relative mx-auto w-24 h-24 rounded-full border-4 border-primary/50 shadow-inner overflow-hidden bg-black/40">
           {/* Placeholder Avatar if none provided */}
           <img 
             src={character.avatar || "https://ui-avatars.com/api/?name=" + character.name + "&background=random"} 
             alt={character.name}
             className="w-full h-full object-cover"
           />
        </div>
        <div>
          <h2 className="text-2xl font-fantasy text-primary tracking-wider">{character.name}</h2>
          <p className="text-sm font-serif italic text-muted-foreground">{character.class} • Lvl {character.level}</p>
        </div>
        
        {isCurrentUser && (
          <div className="absolute top-2 right-2">
            <span className="bg-primary/20 text-primary text-[10px] px-2 py-0.5 rounded-full border border-primary/30 uppercase tracking-widest">You</span>
          </div>
        )}
      </div>

      {/* Vitals */}
      <div className="p-4 space-y-4 bg-black/10">
        <div className="space-y-1">
          <div className="flex justify-between text-xs uppercase tracking-widest text-muted-foreground">
            <span className="flex items-center gap-1"><Heart className="w-3 h-3 text-red-500" /> Health</span>
            <span>{character.hp.current} / {character.hp.max}</span>
          </div>
          <Progress value={(character.hp.current / character.hp.max) * 100} className="h-2 bg-black/40 [&>div]:bg-red-600/80" />
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-xs uppercase tracking-widest text-muted-foreground">
            <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-blue-400" /> Mana</span>
            <span>{character.mp.current} / {character.mp.max}</span>
          </div>
          <Progress value={(character.mp.current / character.mp.max) * 100} className="h-2 bg-black/40 [&>div]:bg-blue-600/80" />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="p-4 grid grid-cols-3 gap-2 text-center border-b border-white/5">
        {Object.entries(character.stats).map(([stat, value]) => (
          <div key={stat} className="bg-black/20 p-2 rounded border border-white/5 hover:border-primary/30 transition-colors">
            <div className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider mb-1">{stat}</div>
            <div className="text-lg font-fantasy text-foreground">{value}</div>
          </div>
        ))}
      </div>

      {/* Inventory & Status */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-6">
          <div className="space-y-2">
            <h3 className="text-sm font-fantasy text-primary/80 flex items-center gap-2">
              <Shield className="w-4 h-4" /> Status Effects
            </h3>
            <div className="text-sm font-serif italic text-muted-foreground bg-black/10 p-2 rounded border border-white/5">
              {character.status || "No active effects"}
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-fantasy text-primary/80 flex items-center gap-2">
              <Backpack className="w-4 h-4" /> Inventory
            </h3>
            <ul className="space-y-1">
              {character.inventory.map((item, i) => (
                <li key={i} className="text-sm font-serif text-foreground/80 flex items-center gap-2 p-1 hover:bg-white/5 rounded cursor-help transition-colors">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent/50" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
