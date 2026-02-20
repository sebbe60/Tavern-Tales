import React, { useRef, useEffect, useState } from "react";
import { Message, TurnPhase } from "@/lib/game-types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Send, Sparkles, User, Users, Dices, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

// AI Game Master avatar
const GM_AVATAR = "https://static.wikia.nocookie.net/hearthstone_gamepedia/images/0/05/Medal_ranked_1.png/revision/latest?cb=20140426192156";

const QUICK_DICE = ["1d4", "1d6", "1d8", "1d10", "1d12", "1d20", "2d6", "1d100"];

interface PlayerStatus {
  name: string;
  hasActed: boolean;
  isCurrentUser: boolean;
}

interface ChatAreaProps {
  messages: Message[];
  onSendMessage: (content: string) => void;
  onRollDice?: (dice: string) => void;
  turnPhase: TurnPhase;
  pendingPlayers: number;
  currentPlayerName: string;
  playerAvatars?: Record<string, string | null>;
  players?: PlayerStatus[];
  myHasActed?: boolean;
  waitingForCompanion?: boolean;
  otherPlayerName?: string;
}

function CharacterUpdateBadges({ updates }: { updates: Record<string, any> }) {
  const badges: { icon: string; label: string; style: string }[] = [];

  for (const [charName, changes] of Object.entries(updates)) {
    if (changes.hp) {
      const hp = changes.hp as { current: number; max: number };
      badges.push({
        icon: "❤️",
        label: `${charName}: HP ${hp.current}/${hp.max}`,
        style: hp.current < hp.max / 2
          ? "bg-red-950/70 text-red-300 border-red-700/40"
          : "bg-green-950/70 text-green-300 border-green-700/40",
      });
    }
    if (changes.xp !== undefined) {
      badges.push({
        icon: "✨",
        label: `${charName} +${changes.xp} XP`,
        style: "bg-amber-950/70 text-amber-300 border-amber-700/40",
      });
    }
    if (changes.level !== undefined) {
      badges.push({
        icon: "⬆️",
        label: `${charName} LEVEL UP! → Level ${changes.level}`,
        style: "bg-purple-950/70 text-purple-200 border-purple-500/50 font-bold animate-pulse",
      });
    }
    if (changes.addInventory && changes.addInventory.length > 0) {
      badges.push({
        icon: "🎒",
        label: `${charName} found: ${(changes.addInventory as string[]).join(", ")}`,
        style: "bg-blue-950/70 text-blue-300 border-blue-700/40",
      });
    }
    if (changes.removeInventory && changes.removeInventory.length > 0) {
      badges.push({
        icon: "📦",
        label: `${charName} lost: ${(changes.removeInventory as string[]).join(", ")}`,
        style: "bg-slate-800/70 text-slate-400 border-slate-600/40",
      });
    }
    if (changes.addStatusEffect) {
      const effect = changes.addStatusEffect as { name: string };
      badges.push({
        icon: "🩸",
        label: `${charName}: ${effect.name}`,
        style: "bg-orange-950/70 text-orange-300 border-orange-700/40",
      });
    }
    if (changes.removeStatusEffect) {
      badges.push({
        icon: "💊",
        label: `${charName} cured: ${changes.removeStatusEffect}`,
        style: "bg-green-950/70 text-green-300 border-green-700/40",
      });
    }
  }

  if (badges.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 mt-2 ml-14">
      {badges.map((b, i) => (
        <span
          key={i}
          className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border",
            b.style
          )}
        >
          {b.icon} {b.label}
        </span>
      ))}
    </div>
  );
}

export function ChatArea({ messages, onSendMessage, onRollDice, turnPhase, pendingPlayers, currentPlayerName, playerAvatars = {}, players, myHasActed, waitingForCompanion, otherPlayerName }: ChatAreaProps) {
  const [input, setInput] = React.useState("");
  const [dicePopoverOpen, setDicePopoverOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const lastMessageCount = useRef(messages.length);

  const handleScroll = () => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
        const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
        setIsUserScrolling(!isAtBottom);
      }
    }
  };

  useEffect(() => {
    const hasNewMessages = messages.length > lastMessageCount.current;
    lastMessageCount.current = messages.length;

    if (scrollRef.current && hasNewMessages && !isUserScrolling) {
      const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages, isUserScrolling]);

  useEffect(() => {
    const scrollContainer = scrollRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll);
      return () => scrollContainer.removeEventListener('scroll', handleScroll);
    }
  }, []);

  const handleSend = () => {
    if (!input.trim()) return;
    onSendMessage(input);
    setInput("");
    setIsUserScrolling(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleRollDice = (dice: string) => {
    setDicePopoverOpen(false);
    onRollDice?.(dice);
  };

  const getPlayerAvatar = (authorName: string): string | null => {
    return playerAvatars[authorName] || null;
  };

  return (
    <div className="flex flex-col h-full bg-black/60 backdrop-blur-md rounded-xl border border-white/10 overflow-hidden shadow-2xl relative">
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/80 to-transparent pointer-events-none z-10" />

      {/* Header Stats */}
      <div className="absolute top-0 inset-x-0 z-20 p-4 flex justify-between items-start bg-gradient-to-b from-black/90 via-black/50 to-transparent">
        <div className="flex flex-col gap-2">
          <div className="flex gap-3 text-xs font-mono text-muted-foreground">
            <div className="bg-black/40 px-3 py-1 rounded-full border border-white/10 backdrop-blur-sm">
              WORDS: <span className="text-primary">{messages.reduce((acc, m) => acc + m.content.split(' ').length, 0)}</span>
            </div>
            <div className="bg-black/40 px-3 py-1 rounded-full border border-white/10 backdrop-blur-sm">
              TURNS: <span className="text-primary">{Math.floor(messages.length / 2)}</span>
            </div>
          </div>
          {/* Per-player action status chips */}
          {players && players.length > 0 && turnPhase === "waiting-for-players" && (
            <div className="flex gap-2">
              {players.map((p) => (
                <div
                  key={p.name}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-mono backdrop-blur-sm transition-all",
                    p.hasActed
                      ? "bg-green-950/60 border-green-600/40 text-green-300"
                      : "bg-black/40 border-white/10 text-muted-foreground"
                  )}
                >
                  <span className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    p.hasActed ? "bg-green-400" : "bg-slate-500 animate-pulse"
                  )} />
                  {p.name}
                  {p.hasActed && <span className="text-green-400">✓</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={cn(
          "px-4 py-1.5 rounded-full border backdrop-blur-md text-xs font-bold uppercase tracking-widest shadow-lg transition-all duration-500",
          turnPhase === "waiting-for-players"
            ? "bg-blue-950/80 border-blue-500/50 text-blue-200"
            : "bg-amber-950/80 border-amber-500/50 text-amber-200 animate-pulse"
        )}>
          {turnPhase === "waiting-for-players"
            ? <span className="flex items-center gap-2"><Users className="w-3 h-3" /> Waiting for {pendingPlayers} Action{pendingPlayers !== 1 ? 's' : ''}</span>
            : <span className="flex items-center gap-2"><Sparkles className="w-3 h-3" /> GM is Narrating...</span>
          }
        </div>
      </div>

      {isUserScrolling && (
        <button
          onClick={() => {
            const scrollContainer = scrollRef.current?.querySelector('[data-radix-scroll-area-viewport]');
            if (scrollContainer) {
              scrollContainer.scrollTop = scrollContainer.scrollHeight;
              setIsUserScrolling(false);
            }
          }}
          className="absolute bottom-32 left-1/2 -translate-x-1/2 z-30 bg-primary/90 text-primary-foreground px-4 py-2 rounded-full text-xs font-bold shadow-lg hover:bg-primary transition-all animate-bounce"
        >
          ↓ New messages
        </button>
      )}

      {/* Messages Area */}
      <ScrollArea ref={scrollRef} className="flex-1 p-6 pt-20">
        <div className="space-y-6 max-w-3xl mx-auto pb-6">
          {/* Waiting for companion empty state */}
          {messages.length === 0 && waitingForCompanion && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-20 gap-6 text-center"
            >
              <div className="text-6xl animate-pulse">⚔️</div>
              <div className="space-y-2">
                <div className="font-fantasy text-xl text-primary/80">Your companion is preparing their hero...</div>
                <div className="text-sm text-muted-foreground italic">The adventure begins once both heroes are ready.</div>
              </div>
              <div className="flex gap-1.5">
                <span className="w-2 h-2 bg-amber-500/40 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="w-2 h-2 bg-amber-500/40 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="w-2 h-2 bg-amber-500/40 rounded-full animate-bounce" />
              </div>
            </motion.div>
          )}

          {messages.length === 0 && !waitingForCompanion && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-20 gap-4 text-center"
            >
              <div className="text-5xl">🍺</div>
              <div className="font-fantasy text-lg text-muted-foreground">The tavern awaits...</div>
            </motion.div>
          )}

          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                key={msg.id}
                className={cn(
                  "flex gap-4 group",
                  msg.role === "assistant" ? "flex-col" : "justify-end"
                )}
              >
                {msg.role === "assistant" ? (
                  // GM message with optional character update badges
                  <>
                    <div className="flex gap-4 justify-start">
                      <div className="w-12 h-12 shrink-0 mt-1">
                        <img src={GM_AVATAR} alt="Game Master" className="w-full h-full object-contain" />
                      </div>
                      <div className="relative max-w-[85%] rounded-2xl rounded-tl-none p-5 shadow-lg backdrop-blur-sm border bg-black/40 border-amber-900/30 text-amber-50">
                        <div className="flex items-baseline justify-between gap-4 mb-2 border-b border-white/5 pb-2">
                          <span className="text-sm font-bold tracking-wide uppercase font-fantasy text-amber-400">{msg.author}</span>
                          <span className="text-[10px] text-muted-foreground opacity-50">
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="text-base leading-relaxed whitespace-pre-wrap font-serif text-lg text-amber-100/90">
                          {msg.content}
                        </div>
                      </div>
                    </div>
                    {msg.characterUpdates && Object.keys(msg.characterUpdates).length > 0 && (
                      <CharacterUpdateBadges updates={msg.characterUpdates} />
                    )}
                  </>
                ) : (
                  // Player message — may include a dice roll card
                  <div className="flex gap-4 justify-end">
                    <div className="flex flex-col items-end gap-2 max-w-[85%]">
                      {/* Show dice roll card prominently if present */}
                      {msg.diceRoll ? (
                        <div className="rounded-2xl rounded-tr-none border border-yellow-500/50 bg-yellow-950/30 shadow-lg backdrop-blur-sm px-5 py-4 min-w-[160px]">
                          <div className="flex items-baseline justify-between gap-4 mb-2 border-b border-yellow-500/20 pb-2">
                            <span className="text-sm font-bold tracking-wide uppercase font-fantasy text-yellow-400">
                              {msg.author}
                            </span>
                            <span className="text-[10px] text-muted-foreground opacity-50">
                              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <Dices className="w-6 h-6 text-yellow-400 shrink-0" />
                            <div>
                              <div className="text-xs text-yellow-400/70 font-mono uppercase tracking-wider">{msg.diceRoll.dice}</div>
                              <div className="text-4xl font-bold text-yellow-300 leading-none">{msg.diceRoll.result}</div>
                              {msg.diceRoll.rolls.length > 1 && (
                                <div className="text-xs text-yellow-400/50 font-mono mt-0.5">
                                  [{msg.diceRoll.rolls.join(" + ")}]
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="relative rounded-2xl rounded-tr-none p-5 shadow-lg backdrop-blur-sm border bg-primary/10 border-primary/20 text-foreground">
                          <div className="flex items-baseline justify-between gap-4 mb-2 border-b border-white/5 pb-2">
                            <span className="text-sm font-bold tracking-wide uppercase font-fantasy text-primary">{msg.author}</span>
                            <span className="text-[10px] text-muted-foreground opacity-50">
                              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div className="text-base leading-relaxed whitespace-pre-wrap font-serif text-foreground/90">
                            {msg.content}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Player avatar */}
                    <div className="w-10 h-10 rounded-full border-2 border-blue-500/30 flex items-center justify-center shrink-0 shadow-lg mt-1 overflow-hidden bg-gradient-to-br from-blue-900 to-slate-900">
                      {getPlayerAvatar(msg.author) ? (
                        <img src={getPlayerAvatar(msg.author)!} alt={msg.author} className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-5 h-5 text-blue-200" />
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {turnPhase === "ai-processing" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-4 justify-start items-center ml-14"
            >
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-amber-500/50 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="w-2 h-2 bg-amber-500/50 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="w-2 h-2 bg-amber-500/50 rounded-full animate-bounce" />
              </div>
              <span className="text-xs text-amber-500/50 font-mono uppercase tracking-widest">The GM is thinking...</span>
            </motion.div>
          )}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="p-4 bg-black/80 border-t border-white/10 backdrop-blur-xl">
        {/* "You've acted" waiting overlay */}
        {myHasActed && turnPhase === "waiting-for-players" && (
          <div className="max-w-4xl mx-auto mb-3 px-4 py-2 rounded-lg bg-green-950/40 border border-green-700/30 text-xs text-green-300 font-mono flex items-center gap-2">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            ⚔️ Your action is ready — waiting for {otherPlayerName ?? "your companion"}...
          </div>
        )}
        <div className="max-w-4xl mx-auto relative flex gap-3 items-end">
          <div className="relative flex-1 group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 to-accent/20 rounded-lg blur opacity-20 group-hover:opacity-50 transition duration-500" />
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={myHasActed ? `Waiting for ${otherPlayerName ?? "companion"}...` : `What does ${currentPlayerName} do?`}
              disabled={myHasActed && turnPhase === "waiting-for-players"}
              className="relative min-h-[80px] bg-black/40 border-white/10 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 resize-none font-serif text-lg py-3 px-4 pl-12 rounded-lg pr-24 shadow-inner disabled:opacity-40 disabled:cursor-not-allowed"
            />
            {/* Dice button inside textarea */}
            {onRollDice && (
              <Popover open={dicePopoverOpen} onOpenChange={setDicePopoverOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="absolute bottom-3 left-3 text-muted-foreground hover:text-yellow-400 transition-colors p-1"
                    title="Roll dice"
                  >
                    <Dices className="w-5 h-5" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-3 bg-card/95 border-yellow-500/30 backdrop-blur-xl" side="top" align="start">
                  <div className="text-xs font-fantasy text-yellow-400 mb-2 uppercase tracking-wider">Roll Dice</div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {QUICK_DICE.map((dice) => (
                      <button
                        key={dice}
                        onClick={() => handleRollDice(dice)}
                        className="font-mono text-xs border border-yellow-500/30 rounded px-1.5 py-1 bg-black/40 hover:bg-yellow-950/50 hover:border-yellow-500/60 hover:text-yellow-300 transition-all text-muted-foreground"
                        data-testid={`button-dice-${dice}`}
                      >
                        {dice}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            )}
            <div className="absolute bottom-3 right-3 text-[10px] text-muted-foreground font-mono bg-black/60 px-2 py-1 rounded border border-white/5 pointer-events-none">
              ENTER to send
            </div>
          </div>

          <Button
            onClick={handleSend}
            disabled={!input.trim() || turnPhase === "ai-processing" || (myHasActed && turnPhase === "waiting-for-players")}
            className="h-[80px] w-[80px] rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg border border-white/10 hover:scale-105 active:scale-95 transition-all duration-200 flex flex-col items-center justify-center gap-1"
          >
            {myHasActed && turnPhase === "waiting-for-players"
              ? <><Clock className="w-6 h-6" /><span className="text-[10px] font-bold uppercase tracking-wider">Wait</span></>
              : <><Send className="w-6 h-6" /><span className="text-[10px] font-bold uppercase tracking-wider">Act</span></>
            }
          </Button>
        </div>
        <div className="max-w-4xl mx-auto mt-2 flex justify-between items-center text-[10px] text-muted-foreground font-mono">
          <span>Playing as: <span className="text-primary">{currentPlayerName}</span></span>
          <span className="opacity-50">Tavern Tales v0.1.0</span>
        </div>
      </div>
    </div>
  );
}
