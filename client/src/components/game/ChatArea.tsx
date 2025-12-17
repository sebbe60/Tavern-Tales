import React, { useRef, useEffect, useState } from "react";
import { Message, TurnPhase } from "@/lib/game-types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Sparkles, User, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

// AI Game Master avatar
const GM_AVATAR = "https://static.wikia.nocookie.net/hearthstone_gamepedia/images/0/05/Medal_ranked_1.png/revision/latest?cb=20140426192156";

interface ChatAreaProps {
  messages: Message[];
  onSendMessage: (content: string) => void;
  turnPhase: TurnPhase;
  pendingPlayers: number;
  currentPlayerName: string;
  playerAvatars?: Record<string, string | null>; // Map of author name to avatar URL
}

export function ChatArea({ messages, onSendMessage, turnPhase, pendingPlayers, currentPlayerName, playerAvatars = {} }: ChatAreaProps) {
  const [input, setInput] = React.useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const lastMessageCount = useRef(messages.length);

  // Track if user is scrolling (not at bottom)
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

  // Only auto-scroll when new messages arrive AND user isn't scrolling
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

  // Add scroll listener
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
    setIsUserScrolling(false); // Reset so we scroll to the new message
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getPlayerAvatar = (authorName: string): string | null => {
    return playerAvatars[authorName] || null;
  };

  return (
    <div className="flex flex-col h-full bg-black/60 backdrop-blur-md rounded-xl border border-white/10 overflow-hidden shadow-2xl relative">
       <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/80 to-transparent pointer-events-none z-10" />
       
      {/* Header Stats */}
      <div className="absolute top-0 inset-x-0 z-20 p-4 flex justify-between items-start bg-gradient-to-b from-black/90 via-black/50 to-transparent">
        <div className="flex gap-4 text-xs font-mono text-muted-foreground">
          <div className="bg-black/40 px-3 py-1 rounded-full border border-white/10 backdrop-blur-sm">
            WORDS: <span className="text-primary">{messages.reduce((acc, m) => acc + m.content.split(' ').length, 0)}</span>
          </div>
          <div className="bg-black/40 px-3 py-1 rounded-full border border-white/10 backdrop-blur-sm">
             TURNS: <span className="text-primary">{Math.floor(messages.length / 2)}</span>
          </div>
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

      {/* Scroll to bottom indicator when user is scrolling */}
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
        <div className="space-y-8 max-w-3xl mx-auto pb-6">
          <AnimatePresence initial={false}>
            {messages.map((msg, index) => (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                key={msg.id}
                className={cn(
                  "flex gap-4 group",
                  msg.role === "assistant" ? "justify-start" : "justify-end"
                )}
              >
                {/* Avatar for Game Master */}
                {msg.role === "assistant" && (
                  <div className="w-12 h-12 shrink-0 mt-1">
                    <img 
                      src={GM_AVATAR} 
                      alt="Game Master"
                      className="w-full h-full object-contain"
                    />
                  </div>
                )}

                <div className={cn(
                  "relative max-w-[85%] rounded-2xl p-5 shadow-lg backdrop-blur-sm border",
                  msg.role === "assistant" 
                    ? "bg-black/40 border-amber-900/30 text-amber-50 rounded-tl-none" 
                    : "bg-primary/10 border-primary/20 text-foreground rounded-tr-none"
                )}>
                  <div className="flex items-baseline justify-between gap-4 mb-2 border-b border-white/5 pb-2">
                    <span className={cn(
                      "text-sm font-bold tracking-wide uppercase font-fantasy",
                      msg.role === "assistant" ? "text-amber-400" : "text-primary"
                    )}>
                      {msg.author}
                    </span>
                    <span className="text-[10px] text-muted-foreground opacity-50">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  
                  <div className={cn(
                    "text-base leading-relaxed whitespace-pre-wrap font-serif",
                    msg.role === "assistant" ? "text-lg text-amber-100/90" : "text-foreground/90"
                  )}>
                    {msg.content}
                  </div>
                </div>

                {/* Avatar for Player */}
                {msg.role !== "assistant" && (
                  <div className="w-10 h-10 rounded-full border-2 border-blue-500/30 flex items-center justify-center shrink-0 shadow-lg mt-1 overflow-hidden bg-gradient-to-br from-blue-900 to-slate-900">
                    {getPlayerAvatar(msg.author) ? (
                      <img 
                        src={getPlayerAvatar(msg.author)!} 
                        alt={msg.author}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-5 h-5 text-blue-200" />
                    )}
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
        <div className="max-w-4xl mx-auto relative flex gap-3 items-end">
          <div className="relative flex-1 group">
             <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 to-accent/20 rounded-lg blur opacity-20 group-hover:opacity-50 transition duration-500" />
             <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`What does ${currentPlayerName} do?`}
              className="relative min-h-[80px] bg-black/40 border-white/10 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 resize-none font-serif text-lg py-3 px-4 rounded-lg pr-24 shadow-inner"
            />
             <div className="absolute bottom-3 right-3 text-[10px] text-muted-foreground font-mono bg-black/60 px-2 py-1 rounded border border-white/5 pointer-events-none">
              ENTER to send
            </div>
          </div>
          
          <Button 
            onClick={handleSend}
            disabled={!input.trim() || turnPhase === "ai-processing"}
            className="h-[80px] w-[80px] rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg border border-white/10 hover:scale-105 active:scale-95 transition-all duration-200 flex flex-col items-center justify-center gap-1"
          >
            <Send className="w-6 h-6" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Act</span>
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
