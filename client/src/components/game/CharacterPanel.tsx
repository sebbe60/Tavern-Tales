import React, { useState } from "react";
import { Character } from "@/lib/game-types";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Shield, Zap, Backpack, Heart, ChevronDown, Sword, Book, CheckCircle2, Dices } from "lucide-react";
import { cn } from "@/lib/utils";

interface CharacterPanelProps {
  character: Character;
  side: "left" | "right";
  isCurrentUser?: boolean;
}

export function CharacterPanel({ character, side, isCurrentUser }: CharacterPanelProps) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    stats: true,
    skills: false,
    saves: false,
    proficiencies: false,
    spells: false,
    inventory: true,
  });

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Calculate ability modifiers
  const getModifier = (stat: number) => {
    const mod = Math.floor((stat - 10) / 2);
    return mod >= 0 ? `+${mod}` : `${mod}`;
  };

  // D&D Skills mapped to ability scores
  const skillAbilities: Record<string, keyof typeof character.stats> = {
    acrobatics: "dex", animalHandling: "wis", arcana: "int", athletics: "str",
    deception: "cha", history: "int", insight: "wis", intimidation: "cha",
    investigation: "int", medicine: "wis", nature: "int", perception: "wis",
    performance: "cha", persuasion: "cha", religion: "int", sleightOfHand: "dex",
    stealth: "dex", survival: "wis"
  };

  const skillNames: Record<string, string> = {
    acrobatics: "Acrobatics", animalHandling: "Animal Handling", arcana: "Arcana",
    athletics: "Athletics", deception: "Deception", history: "History",
    insight: "Insight", intimidation: "Intimidation", investigation: "Investigation",
    medicine: "Medicine", nature: "Nature", perception: "Perception",
    performance: "Performance", persuasion: "Persuasion", religion: "Religion",
    sleightOfHand: "Sleight of Hand", stealth: "Stealth", survival: "Survival"
  };

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
           <img 
             src={character.avatar || "https://ui-avatars.com/api/?name=" + encodeURIComponent(character.name) + "&background=random"} 
             alt={character.name}
             className="w-full h-full object-cover"
           />
        </div>
        <div>
          <h2 className="text-2xl font-fantasy text-primary tracking-wider">{character.name}</h2>
          <p className="text-sm font-serif italic text-muted-foreground">{character.race} {character.class} • Lvl {character.level}</p>
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

      <ScrollArea className="flex-1">
        <div className="space-y-2 p-4">
          {/* Ability Scores */}
          <Collapsible open={openSections.stats} onOpenChange={() => toggleSection("stats")}>
            <CollapsibleTrigger className="w-full flex items-center justify-between p-2 bg-black/20 rounded hover:bg-black/30 transition-colors border border-white/5">
              <span className="text-sm font-fantasy text-primary/90 flex items-center gap-2">
                <Sword className="w-4 h-4" /> Ability Scores
              </span>
              <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", openSections.stats && "rotate-180")} />
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <div className="grid grid-cols-3 gap-2 text-center">
                {Object.entries(character.stats).map(([stat, value]) => (
                  <div key={stat} className="bg-black/20 p-2 rounded border border-white/5 hover:border-primary/30 transition-colors">
                    <div className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">{stat}</div>
                    <div className="text-lg font-fantasy text-foreground">{value}</div>
                    <div className="text-xs text-primary/70">{getModifier(value)}</div>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Saving Throws */}
          {character.savingThrows && (
            <Collapsible open={openSections.saves} onOpenChange={() => toggleSection("saves")}>
              <CollapsibleTrigger className="w-full flex items-center justify-between p-2 bg-black/20 rounded hover:bg-black/30 transition-colors border border-white/5">
                <span className="text-sm font-fantasy text-primary/90 flex items-center gap-2">
                  <Shield className="w-4 h-4" /> Saving Throws
                </span>
                <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", openSections.saves && "rotate-180")} />
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 space-y-1">
                {Object.entries(character.savingThrows).map(([stat, proficient]) => {
                  const value = character.stats[stat as keyof typeof character.stats];
                  const modifier = Math.floor((value - 10) / 2) + (proficient ? 2 : 0);
                  return (
                    <div key={stat} className="flex items-center justify-between text-xs bg-black/10 p-2 rounded border border-white/5">
                      <span className="flex items-center gap-2">
                        {proficient && <CheckCircle2 className="w-3 h-3 text-primary" />}
                        <span className="uppercase text-muted-foreground">{stat}</span>
                      </span>
                      <span className="font-mono text-foreground">{modifier >= 0 ? '+' : ''}{modifier}</span>
                    </div>
                  );
                })}
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Skills */}
          {character.skills && (
            <Collapsible open={openSections.skills} onOpenChange={() => toggleSection("skills")}>
              <CollapsibleTrigger className="w-full flex items-center justify-between p-2 bg-black/20 rounded hover:bg-black/30 transition-colors border border-white/5">
                <span className="text-sm font-fantasy text-primary/90 flex items-center gap-2">
                  <Dices className="w-4 h-4" /> Skills
                </span>
                <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", openSections.skills && "rotate-180")} />
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 space-y-1 max-h-64 overflow-y-auto">
                {Object.entries(character.skills).map(([skill, bonus]) => {
                  const ability = skillAbilities[skill];
                  return (
                    <div key={skill} className="flex items-center justify-between text-xs bg-black/10 p-1.5 rounded border border-white/5">
                      <span className="text-muted-foreground text-[11px]">{skillNames[skill] || skill}</span>
                      <span className="font-mono text-foreground text-xs">{bonus >= 0 ? '+' : ''}{bonus}</span>
                    </div>
                  );
                })}
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Proficiencies */}
          {character.proficiencies && character.proficiencies.length > 0 && (
            <Collapsible open={openSections.proficiencies} onOpenChange={() => toggleSection("proficiencies")}>
              <CollapsibleTrigger className="w-full flex items-center justify-between p-2 bg-black/20 rounded hover:bg-black/30 transition-colors border border-white/5">
                <span className="text-sm font-fantasy text-primary/90 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Proficiencies
                </span>
                <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", openSections.proficiencies && "rotate-180")} />
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <div className="flex flex-wrap gap-1">
                  {character.proficiencies.map((prof, i) => (
                    <span key={i} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded border border-primary/20">
                      {prof}
                    </span>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Spells */}
          {character.spells && character.spells.length > 0 && (
            <Collapsible open={openSections.spells} onOpenChange={() => toggleSection("spells")}>
              <CollapsibleTrigger className="w-full flex items-center justify-between p-2 bg-black/20 rounded hover:bg-black/30 transition-colors border border-white/5">
                <span className="text-sm font-fantasy text-primary/90 flex items-center gap-2">
                  <Book className="w-4 h-4" /> Spells
                </span>
                <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", openSections.spells && "rotate-180")} />
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 space-y-2 max-h-64 overflow-y-auto">
                {character.spells.map((spell, i) => (
                  <div key={i} className="bg-black/10 p-2 rounded border border-white/5 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-fantasy text-foreground">{spell.name}</span>
                      <span className="text-xs text-primary">Lvl {spell.level}</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{spell.school}</div>
                    <div className="text-xs text-foreground/70 italic leading-relaxed">{spell.description}</div>
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Status Effects */}
          <div className="space-y-2">
            <h3 className="text-sm font-fantasy text-primary/80 flex items-center gap-2 p-2">
              <Shield className="w-4 h-4" /> Status
            </h3>
            <div className="text-sm font-serif italic text-muted-foreground bg-black/10 p-2 rounded border border-white/5">
              {character.status || "Healthy"}
            </div>
          </div>

          {/* Inventory */}
          <Collapsible open={openSections.inventory} onOpenChange={() => toggleSection("inventory")}>
            <CollapsibleTrigger className="w-full flex items-center justify-between p-2 bg-black/20 rounded hover:bg-black/30 transition-colors border border-white/5">
              <span className="text-sm font-fantasy text-primary/90 flex items-center gap-2">
                <Backpack className="w-4 h-4" /> Inventory
              </span>
              <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", openSections.inventory && "rotate-180")} />
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <ul className="space-y-1">
                {character.inventory.map((item, i) => (
                  <li key={i} className="text-sm font-serif text-foreground/80 flex items-center gap-2 p-1 hover:bg-white/5 rounded cursor-help transition-colors">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent/50" />
                    {item}
                  </li>
                ))}
              </ul>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </ScrollArea>
    </div>
  );
}
