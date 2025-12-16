import { useState, useEffect } from "react";
import { Message } from "./game-types";

const MOCK_STORY_FRAGMENTS = [
  "The tavern door creaks open, revealing a shadowy figure cloaked in mist...",
  "The bartender polishes a glass nervously, glancing at the strange amulet on your table.",
  "A sudden hush falls over the room as the bard stops playing mid-chord.",
  "You hear a scratching sound coming from beneath the floorboards...",
  "The old map on the table suddenly glows with a faint blue light.",
];

export async function generateAIResponse(
  messages: Message[], 
  apiKey: string | null
): Promise<string> {
  // If we had a real backend or allowed client-side calls:
  if (apiKey) {
    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": window.location.origin, // Required by OpenRouter
          "X-Title": "Tavern Tales Prototype",
        },
        body: JSON.stringify({
          model: "mistralai/mistral-7b-instruct:free", // Using a free model as requested
          messages: messages.map(m => ({
            role: m.role,
            content: `${m.author}: ${m.content}`
          })),
        })
      });
      
      const data = await response.json();
      if (data.choices && data.choices.length > 0) {
        return data.choices[0].message.content;
      }
    } catch (error) {
      console.error("AI Error:", error);
      return "The Game Master seems to be meditating (API Error).";
    }
  }

  // Fallback Mock Response
  await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate thinking
  return MOCK_STORY_FRAGMENTS[Math.floor(Math.random() * MOCK_STORY_FRAGMENTS.length)];
}
