import React, { useState, useRef, useEffect } from "react";
import { Character, StatusEffect, Ability } from "@/lib/game-types";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Shield, Zap, Backpack, Heart, ChevronDown, Sword, Star, Clock, Flame, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

// Stat descriptions for tooltips
const STAT_DESCRIPTIONS: Record<string, string> = {
  str: "Strength — Physical power and melee combat",
  dex: "Dexterity — Agility, reflexes, and finesse",
  con: "Constitution — Health, stamina, and endurance",
  int: "Intelligence — Reasoning and magical ability",
  wis: "Wisdom — Perception and intuition",
  cha: "Charisma — Force of personality",
  luck: "Luck — Fortune and chance",
  per: "Perception — Awareness and senses",
  agi: "Agility — Speed and nimbleness",
  end: "Endurance — Stamina and resilience",
};

// Infer an emoji icon from an inventory item name
function getItemIcon(item: string): string {
  const lower = item.toLowerCase();
  if (/sword|blade|dagger|knife|rapier|cutlass|saber/.test(lower)) return "⚔️";
  if (/bow|arrow|quiver|crossbow/.test(lower)) return "🏹";
  if (/shield|buckler|targe/.test(lower)) return "🛡️";
  if (/potion|elixir|flask|vial|brew|tonic/.test(lower)) return "🧪";
  if (/staff|wand|rod|scepter|orb/.test(lower)) return "🪄";
  if (/coin|gold|silver|copper|money|gem|jewel/.test(lower)) return "💰";
  if (/scroll|map|letter|tome|book|note|parchment/.test(lower)) return "📜";
  if (/helmet|armor|cloak|mail|plate|robe|gauntlet|boots/.test(lower)) return "🪖";
  if (/ring|amulet|necklace|pendant|bracelet|talisman/.test(lower)) return "💍";
  if (/torch|lantern|light|candle/.test(lower)) return "🔦";
  if (/key/.test(lower)) return "🗝️";
  if (/axe|hammer|mace|flail|spear|pike|lance/.test(lower)) return "🪓";
  if (/bomb|explosive|grenade/.test(lower)) return "💣";
  if (/food|ration|bread|meat|apple|cheese/.test(lower)) return "🍖";
  if (/rope|chain|net/.test(lower)) return "🪢";
  return "🎒";
}

interface CharacterPanelProps {
  character: Character;
  side: "left" | "right";
  isCurrentUser?: boolean;
  onAvatarClick?: () => void;
}

export function CharacterPanel({ character, side, isCurrentUser, onAvatarClick }: CharacterPanelProps) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    stats: true,
    abilities: true,
    statusEffects: true,
    inventory: true,
  });

  // HP flash animation when HP drops
  const prevHpRef = useRef(character.hp.current);
  const [hpFlash, setHpFlash] = useState<"damage" | "heal" | null>(null);
  useEffect(() => {
    const prev = prevHpRef.current;
    const curr = character.hp.current;
    if (curr < prev) {
      setHpFlash("damage");
      setTimeout(() => setHpFlash(null), 800);
    } else if (curr > prev) {
      setHpFlash("heal");
      setTimeout(() => setHpFlash(null), 800);
    }
    prevHpRef.current = curr;
  }, [character.hp.current]);

  // Level-up glow when level increases
  const prevLevelRef = useRef(character.level);
  const [levelGlow, setLevelGlow] = useState(false);
  useEffect(() => {
    if (character.level > prevLevelRef.current) {
      setLevelGlow(true);
      setTimeout(() => setLevelGlow(false), 2000);
    }
    prevLevelRef.current = character.level;
  }, [character.level]);

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const getModifier = (stat: number) => {
    const mod = Math.floor((stat - 10) / 2);
    return mod >= 0 ? `+${mod}` : `${mod}`;
  };

  const statNames: Record<string, string> = {
    str: "STR", dex: "DEX", con: "CON", int: "INT", wis: "WIS", cha: "CHA",
    luck: "LCK", per: "PER", agi: "AGI", end: "END",
  };

  const xpProgress = character.xpToNextLevel > 0
    ? (character.xp / character.xpToNextLevel) * 100
    : 0;

  const xpToNext = character.xpToNextLevel - character.xp;

  return (
    <div
      className={cn(
        "flex flex-col h-full bg-card/95 border-x-4 border-y-2 border-sidebar-border shadow-2xl backdrop-blur-sm transition-all duration-500",
        "w-80 relative overflow-hidden group",
        side === "left" ? "rounded-r-xl border-l-0" : "rounded-l-xl border-r-0"
      )}
    >
      <div className="absolute inset-0 bg-[url('@assets/generated_images/aged_parchment_paper_texture.png')] opacity-10 pointer-events-none mix-blend-overlay" />

      {/* Header / Avatar Section */}
      <div className="relative p-6 text-center space-y-2 border-b-2 border-border/50">
        <div
          className={cn(
            "relative mx-auto w-24 h-24 rounded-full border-4 border-primary/50 shadow-inner overflow-hidden bg-black/40",
            isCurrentUser && onAvatarClick && "cursor-pointer group/avatar hover:border-primary transition-all"
          )}
          onClick={isCurrentUser ? onAvatarClick : undefined}
        >
          <img
            src={character.avatar || "https://ui-avatars.com/api/?name=" + encodeURIComponent(character.name) + "&background=random"}
            alt={character.name}
            className="w-full h-full object-cover"
          />
          {isCurrentUser && onAvatarClick && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity">
              <span className="text-xs text-white font-bold">Change</span>
            </div>
          )}
        </div>
        <div>
          <h2 className={cn(
            "text-2xl font-fantasy text-primary tracking-wider transition-all duration-500",
            levelGlow && "drop-shadow-[0_0_12px_rgba(250,200,50,0.9)] text-yellow-300"
          )}>
            {character.name}
            {levelGlow && <span className="ml-2 text-sm text-yellow-400 animate-bounce">▲ LVL UP!</span>}
          </h2>
          <p className="text-sm font-serif italic text-muted-foreground">{character.race} {character.class} • Lvl {character.level}</p>
        </div>

        {isCurrentUser && (
          <div className="absolute top-2 right-2">
            <span className="bg-primary/20 text-primary text-[10px] px-2 py-0.5 rounded-full border border-primary/30 uppercase tracking-widest">You</span>
          </div>
        )}
      </div>

      {/* Vitals: HP, MP, XP */}
      <div className={cn(
        "p-4 space-y-3 bg-black/10 transition-all duration-300",
        hpFlash === "damage" && "bg-red-950/40",
        hpFlash === "heal" && "bg-green-950/30"
      )}>
        {/* HP */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs uppercase tracking-widest text-muted-foreground">
            <span className="flex items-center gap-1">
              <Heart className={cn("w-3 h-3", hpFlash === "damage" ? "text-red-400 animate-pulse" : "text-red-500")} /> Health
            </span>
            <span className={cn(hpFlash === "damage" && "text-red-400 font-bold", hpFlash === "heal" && "text-green-400 font-bold")}>
              {character.hp.current} / {character.hp.max}
            </span>
          </div>
          <Progress
            value={(character.hp.current / character.hp.max) * 100}
            className={cn("h-2 bg-black/40", hpFlash === "damage" ? "[&>div]:bg-red-400" : "[&>div]:bg-red-600/80")}
          />
        </div>

        {/* MP */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs uppercase tracking-widest text-muted-foreground">
            <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-blue-400" /> Mana</span>
            <span>{character.mp.current} / {character.mp.max}</span>
          </div>
          <Progress value={(character.mp.current / character.mp.max) * 100} className="h-2 bg-black/40 [&>div]:bg-blue-600/80" />
        </div>

        {/* XP Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs uppercase tracking-widest text-muted-foreground">
            <span className="flex items-center gap-1"><Star className="w-3 h-3 text-yellow-400" /> Experience</span>
            <span>{character.xp} / {character.xpToNextLevel}</span>
          </div>
          <Progress value={xpProgress} className="h-2 bg-black/40 [&>div]:bg-yellow-500/80" />
          <div className="text-[10px] text-muted-foreground/60 text-right">{xpToNext} XP to Level {character.level + 1}</div>
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
              <div className="grid grid-cols-5 gap-1 text-center">
                {Object.entries(character.stats).filter(([_, v]) => v !== undefined).map(([stat, value]) => (
                  <div
                    key={stat}
                    className="bg-black/20 p-1.5 rounded border border-white/5 hover:border-primary/30 transition-colors cursor-help"
                    title={STAT_DESCRIPTIONS[stat] || stat.toUpperCase()}
                  >
                    <div className="text-[9px] uppercase text-muted-foreground font-bold tracking-wider">{statNames[stat] || stat.toUpperCase()}</div>
                    <div className="text-sm font-fantasy text-foreground">{value}</div>
                    <div className="text-[10px] text-primary/70">{getModifier(value as number)}</div>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Skills/Abilities with Cooldowns */}
          <Collapsible open={openSections.abilities} onOpenChange={() => toggleSection("abilities")}>
            <CollapsibleTrigger className="w-full flex items-center justify-between p-2 bg-black/20 rounded hover:bg-black/30 transition-colors border border-white/5">
              <span className="text-sm font-fantasy text-primary/90 flex items-center gap-2">
                <Sparkles className="w-4 h-4" /> Skills & Abilities
                {character.abilities && character.abilities.length > 0 && (
                  <span className="text-xs bg-primary/20 px-1.5 py-0.5 rounded">{character.abilities.length}</span>
                )}
              </span>
              <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", openSections.abilities && "rotate-180")} />
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-2 max-h-48 overflow-y-auto">
              {(!character.abilities || character.abilities.length === 0) ? (
                <div className="text-xs text-muted-foreground italic text-center p-4 bg-black/10 rounded border border-white/5">
                  No abilities yet. The AI Game Master will grant you skills as you adventure!
                </div>
              ) : (
                character.abilities.map((ability: Ability, i: number) => {
                  const isReady = ability.currentCooldown === 0;
                  return (
                    <div
                      key={i}
                      className={cn(
                        "bg-black/10 p-2 rounded border space-y-1",
                        isReady ? "border-primary/30" : "border-white/5 opacity-70"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-fantasy text-foreground">{ability.name}</span>
                        <div className="flex items-center gap-1">
                          {ability.power && (
                            <span className={cn(
                              "text-[10px] px-1.5 py-0.5 rounded uppercase",
                              ability.power === "weak" && "bg-green-900/30 text-green-400",
                              ability.power === "moderate" && "bg-yellow-900/30 text-yellow-400",
                              ability.power === "strong" && "bg-orange-900/30 text-orange-400",
                              ability.power === "ultimate" && "bg-purple-900/30 text-purple-400",
                            )}>
                              {ability.power}
                            </span>
                          )}
                          <span className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1",
                            isReady ? "bg-green-900/30 text-green-400" : "bg-red-900/30 text-red-400"
                          )}>
                            <Clock className="w-3 h-3" />
                            {isReady ? "Ready" : `${ability.currentCooldown} turns`}
                          </span>
                        </div>
                      </div>
                      <div className="text-xs text-foreground/70 italic">{ability.description}</div>
                      {!isReady && (
                        <Progress
                          value={((ability.cooldown - ability.currentCooldown) / ability.cooldown) * 100}
                          className="h-1 bg-black/40 [&>div]:bg-red-700/60"
                        />
                      )}
                    </div>
                  );
                })
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Status Effects */}
          <Collapsible open={openSections.statusEffects} onOpenChange={() => toggleSection("statusEffects")}>
            <CollapsibleTrigger className="w-full flex items-center justify-between p-2 bg-black/20 rounded hover:bg-black/30 transition-colors border border-white/5">
              <span className="text-sm font-fantasy text-primary/90 flex items-center gap-2">
                <Flame className="w-4 h-4" /> Status Effects
                {character.statusEffects && character.statusEffects.length > 0 && (
                  <span className="text-xs bg-red-500/20 px-1.5 py-0.5 rounded text-red-400">{character.statusEffects.length}</span>
                )}
              </span>
              <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", openSections.statusEffects && "rotate-180")} />
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-1">
              {(!character.statusEffects || character.statusEffects.length === 0) ? (
                <div className="text-xs text-green-400 italic text-center p-3 bg-green-900/10 rounded border border-green-900/20">
                  No status effects — You're in good condition!
                </div>
              ) : (
                character.statusEffects.map((effect: StatusEffect, i: number) => (
                  <div
                    key={i}
                    className={cn(
                      "text-xs p-2 rounded border",
                      effect.severity === "minor" && "bg-yellow-900/10 border-yellow-900/20 text-yellow-400",
                      effect.severity === "moderate" && "bg-orange-900/10 border-orange-900/20 text-orange-400",
                      effect.severity === "severe" && "bg-red-900/10 border-red-900/20 text-red-400",
                      !effect.severity && "bg-purple-900/10 border-purple-900/20 text-purple-400"
                    )}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-medium">{effect.name}</span>
                      {effect.duration !== undefined && effect.duration !== null && (
                        <span className="text-[10px] bg-black/30 px-1.5 py-0.5 rounded">
                          {effect.duration} turn{effect.duration !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                    {effect.description && (
                      <p className="text-[10px] text-foreground/60">{effect.description}</p>
                    )}
                  </div>
                ))
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Inventory */}
          <Collapsible open={openSections.inventory} onOpenChange={() => toggleSection("inventory")}>
            <CollapsibleTrigger className="w-full flex items-center justify-between p-2 bg-black/20 rounded hover:bg-black/30 transition-colors border border-white/5">
              <span className="text-sm font-fantasy text-primary/90 flex items-center gap-2">
                <Backpack className="w-4 h-4" /> Inventory
                {character.inventory && character.inventory.length > 0 && (
                  <span className="text-xs bg-primary/20 px-1.5 py-0.5 rounded">{character.inventory.length}</span>
                )}
              </span>
              <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", openSections.inventory && "rotate-180")} />
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              {(!character.inventory || character.inventory.length === 0) ? (
                <div className="text-xs text-muted-foreground italic text-center p-4 bg-black/10 rounded border border-white/5">
                  Your pack is empty. Find items during your adventure!
                </div>
              ) : (
                <ul className="space-y-1">
                  {character.inventory.map((item, i) => (
                    <li key={i} className="text-sm font-serif text-foreground/80 flex items-center gap-2 p-1.5 hover:bg-white/5 rounded transition-colors">
                      <span className="text-base leading-none">{getItemIcon(item)}</span>
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </CollapsibleContent>
          </Collapsible>
        </div>
      </ScrollArea>
    </div>
  );
}
